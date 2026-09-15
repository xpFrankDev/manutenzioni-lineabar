import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { z } from 'zod';

const app = express();
const porta = Number(process.env.PORT || 3001);
const segreto = process.env.JWT_SECRET;
if (!segreto && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET è obbligatorio in produzione.');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || false, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
const pool = mysql.createPool({ host:process.env.DB_HOST || 'mariadb', port:Number(process.env.DB_PORT || 3306), user:process.env.LINEABAR_DB_USER, password:process.env.LINEABAR_DB_PASSWORD, database:process.env.MARIADB_DATABASE, waitForConnections:true, connectionLimit:5 });

const loginSchema = z.object({ codigo_usuario:z.string().trim().min(5).max(40), password:z.string().min(8).max(128) });
const rigaSchema = z.object({ pezzoId:z.coerce.number().int().positive(), quantita:z.coerce.number().positive().max(100) });
const interventoSchema = z.object({ clienteId:z.coerce.number().int().positive().nullable().optional(), macchinaId:z.coerce.number().int().positive(), data:z.string().date(), ubicazione:z.enum(['cliente','magazzino']), note:z.string().trim().max(2000).optional().nullable(), esito:z.enum(['risolto','da_rifare','parziale']), ore:z.coerce.number().positive().max(24), persone:z.coerce.number().int().positive().max(20), ricambi:z.array(rigaSchema).default([]) });
const boletaSchema = interventoSchema.extend({ clienteId:z.coerce.number().int().positive(), ubicazione:z.literal('cliente'), ricambi:z.array(rigaSchema).min(1) });
const attivitaSchema = z.object({
  clienteId:z.coerce.number().int().positive(),
  macchinaId:z.coerce.number().int().positive(),
  osservazione:z.string().trim().min(5).max(3000),
  tecnici:z.array(z.coerce.number().int().positive()).min(1).max(20),
  scadenza:z.string().date(),
  priorita:z.enum(['bassa','normale','alta']),
  richiedeAppuntamento:z.boolean().default(false)
});
const chiusuraAttivitaSchema = z.object({
  descrizione:z.string().trim().min(5).max(3000),
  ore:z.coerce.number().positive().max(24),
  persone:z.coerce.number().int().positive().max(20),
  ricambi:z.array(rigaSchema).default([])
});
const adminRoles = ['amministratore'];

function richiediSessione(req,res,next) {
  const token = req.headers.authorization?.replace('Bearer ','');
  if (!token) return res.status(401).json({ errore:'Sessione richiesta' });
  try { req.utente = jwt.verify(token, segreto || 'solo-sviluppo', { issuer:'lineabar' }); next(); }
  catch { return res.status(401).json({ errore:'Sessione non valida o scaduta' }); }
}
function autorizza(...ruoli) { return (req,res,next) => ruoli.includes(req.utente.ruolo) ? next() : res.status(403).json({ errore:'Permesso insufficiente' }); }
function scopeTecnico(req, field='m.fk_tecnico') { return req.utente.ruolo === 'tecnico' ? { sql:' AND '+field+'=?', values:[req.utente.sub] } : { sql:'', values:[] }; }
function codiceBoleta(data, progressive) { return 'BL-'+data.slice(0,7).replace('-','')+'-'+String(progressive).padStart(4,'0'); }
async function prossimoCodice(connection,data) {
  const prefix = 'BL-'+data.slice(0,7).replace('-','')+'-';
  const [[row]] = await connection.execute('SELECT COUNT(*) totale FROM boletas WHERE codice_boleta LIKE ?',[prefix+'%']);
  return codiceBoleta(data, Number(row.totale)+1);
}
async function prezziRicambi(connection, righe) {
  if (!righe.length) return { totale:0, righe:[] };
  const ids = righe.map(r => r.pezzoId);
  const [pezzi] = await connection.query('SELECT id,prezzo FROM pezzi WHERE stato="attivo" AND id IN ('+ids.map(()=>'?').join(',')+')',ids);
  if (pezzi.length !== ids.length) throw new Error('Uno o più ricambi non sono disponibili');
  const map = new Map(pezzi.map(p => [p.id, Number(p.prezzo)]));
  return { totale:righe.reduce((sum,r) => sum + map.get(r.pezzoId)*Number(r.quantita), 0), righe:righe.map(r => ({ ...r, prezzo:map.get(r.pezzoId) })) };
}
async function creaIntervento(connection, input, tecnicoId, origineBoleta=false) {
  const clienteId = input.clienteId ?? (await connection.execute('SELECT fk_cliente FROM macchine WHERE id=?',[input.macchinaId]))[0][0]?.fk_cliente ?? null;
  const ricambi = await prezziRicambi(connection,input.ricambi);
  const [m] = await connection.execute('INSERT INTO manutenzioni (fk_cliente,fk_tecnico,data,ubicazione,note,esito,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?)',[clienteId,tecnicoId,input.data,input.ubicazione,input.note || null,input.esito,tecnicoId,tecnicoId]);
  await connection.execute('INSERT INTO macchine_manutenzioni (fk_macchina,fk_manutenzione,utente_crea,utente_modifica) VALUES (?,?,?,?)',[input.macchinaId,m.insertId,tecnicoId,tecnicoId]);
  for (const riga of ricambi.righe) await connection.execute('INSERT INTO pezzi_manutenzioni (fk_manutenzione,fk_pezzo,quantita,prezzo_unitario,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?)',[m.insertId,riga.pezzoId,riga.quantita,riga.prezzo,tecnicoId,tecnicoId]);
  return { id:m.insertId, clienteId, ricambi, origineBoleta };
}

app.get('/api/salute',(_,res) => res.json({ stato:'ok' }));
app.post('/api/auth/login',async(req,res) => {
  const input=loginSchema.safeParse(req.body);
  if(!input.success) return res.status(422).json({ errore:'Credenziali non valide' });
  const [rows]=await pool.execute('SELECT u.id,u.nome,u.codice_usuario,u.password_hash,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.codice_usuario=? AND u.stato="attivo"',[input.data.codigo_usuario]);
  const utente=rows[0];
  if(!utente || !(await bcrypt.compare(input.data.password,utente.password_hash))) return res.status(401).json({ errore:'Credenziali non valide' });
  const token=jwt.sign({ sub:utente.id,nome:utente.nome,ruolo:utente.ruolo },segreto,{ expiresIn:'10m',issuer:'lineabar' });
  res.json({ token,utente:{ id:utente.id,nome:utente.nome,codigo_usuario:utente.codice_usuario,ruolo:utente.ruolo }, scadeInMinuti:10 });
});
app.get('/api/auth/sessione',richiediSessione,(req,res) => res.json({ utente:req.utente }));

app.get('/api/dashboard',richiediSessione,async(req,res) => {
  const period = String(req.query.periodo || new Date().toISOString().slice(0,7));
  const tecnico = req.utente.ruolo === 'tecnico' ? ' AND m.fk_tecnico=?' : '';
  const values = req.utente.ruolo === 'tecnico' ? [period+'%',req.utente.sub] : [period+'%'];
  const [[metriche]] = await pool.execute('SELECT COUNT(*) interventi,COALESCE(SUM(b.prezzo_totale),0) ricavi,SUM(CASE WHEN m.esito="risolto" THEN 1 ELSE 0 END) risolti FROM manutenzioni m LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo" LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato="emessa" WHERE m.stato="attivo" AND m.data LIKE ?'+tecnico,values);
  const [[pendenti]] = await pool.execute('SELECT COUNT(*) totale FROM attivita WHERE stato="attivo" AND stato_attivita<>"completata"'+(req.utente.ruolo==='tecnico'?' AND fk_assegnato=?':''),req.utente.ruolo==='tecnico'?[req.utente.sub]:[]);
  const [recenti] = await pool.execute('SELECT m.id,m.data,m.ubicazione,m.esito,c.nome cliente,c.indirizzo,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca,b.codice_boleta,b.prezzo_totale FROM manutenzioni m LEFT JOIN clienti c ON c.id=m.fk_cliente JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo" LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato<>"annullata" WHERE m.stato="attivo"'+tecnico+' ORDER BY m.data DESC,m.id DESC LIMIT 6',req.utente.ruolo==='tecnico'?[req.utente.sub]:[]);
  res.json({ periodo:period, metriche:{ interventi:Number(metriche.interventi),ricavi:Number(metriche.ricavi),attivitaPendenti:Number(pendenti.totale),esito:Number(metriche.interventi)?Math.round(Number(metriche.risolti)*100/Number(metriche.interventi)):0 }, recenti });
});

app.get('/api/maquinas',richiediSessione,async(_,res) => { const [rows]=await pool.query('SELECT m.id,m.codice_unico,m.modello,m.tipo_macchina,c.id cliente_id,c.nome cliente,c.indirizzo,COALESCE(f.nome,ma.nome) marca FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE m.stato="attivo" ORDER BY c.nome,m.modello'); res.json(rows); });
app.get('/api/piezas',richiediSessione,async(req,res) => { const [rows]=await pool.execute('SELECT p.id,p.nome,p.codice_unico,CAST(p.prezzo AS DECIMAL(10,2)) prezzo FROM pezzi p JOIN macchine m ON m.id=? WHERE p.stato="attivo" AND (p.tipo_macchina=m.tipo_macchina OR p.tipo_macchina IN ("filtro","addolcitore")) ORDER BY p.nome',[Number(req.query.maquina_id)]); res.json(rows); });
app.get('/api/clienti',richiediSessione,async(_,res) => { const [rows]=await pool.query('SELECT id,codice,nome,citta FROM clienti WHERE stato="attivo" ORDER BY nome'); res.json(rows); });

app.get('/api/boletas',richiediSessione,async(req,res) => {
  const scope=scopeTecnico(req,'b.fk_tecnico');
  const [rows]=await pool.execute('SELECT b.id,b.codice_boleta,b.data,b.prezzo_totale,b.stato,c.nome cliente,c.indirizzo,u.nome tecnico,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca,m.esito FROM boletas b JOIN clienti c ON c.id=b.fk_cliente JOIN utenti u ON u.id=b.fk_tecnico JOIN boletas_manutenzioni bm ON bm.fk_boleta=b.id AND bm.stato="attivo" JOIN manutenzioni m ON m.id=bm.fk_manutenzione JOIN boletas_macchine bmq ON bmq.fk_boleta=b.id AND bmq.stato="attivo" JOIN macchine mq ON mq.id=bmq.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE b.stato<>"annullata"'+scope.sql+' ORDER BY b.data DESC,b.id DESC',scope.values);
  res.json(rows);
});
app.get('/api/boletas/:id',richiediSessione,async(req,res) => {
  const [rows]=await pool.execute('SELECT b.id,b.codice_boleta,b.data,b.prezzo_totale,b.stato,c.nome cliente,c.indirizzo,u.nome tecnico,m.id manutenzione_id,m.ubicazione,m.note,m.esito,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca FROM boletas b JOIN clienti c ON c.id=b.fk_cliente JOIN utenti u ON u.id=b.fk_tecnico JOIN boletas_manutenzioni bm ON bm.fk_boleta=b.id AND bm.stato="attivo" JOIN manutenzioni m ON m.id=bm.fk_manutenzione JOIN boletas_macchine bmq ON bmq.fk_boleta=b.id AND bmq.stato="attivo" JOIN macchine mq ON mq.id=bmq.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE b.id=?',[req.params.id]);
  if(!rows[0]) return res.status(404).json({errore:'Boleta non trovata'});
  const [ricambi]=await pool.execute('SELECT p.nome,p.codice_unico,pm.quantita,pm.prezzo_unitario FROM pezzi_manutenzioni pm JOIN pezzi p ON p.id=pm.fk_pezzo WHERE pm.fk_manutenzione=? AND pm.stato="attivo"',[rows[0].manutenzione_id]);
  res.json({...rows[0],ricambi});
});
app.post('/api/boletas',richiediSessione,async(req,res) => {
  const parsed=boletaSchema.safeParse(req.body); if(!parsed.success)return res.status(422).json({errore:'Dati boleta non validi',dettagli:parsed.error.flatten()});
  const db=await pool.getConnection();
  try { await db.beginTransaction(); const intervento=await creaIntervento(db,parsed.data,req.utente.sub,true); const codice=await prossimoCodice(db,parsed.data.data); const totale=intervento.ricambi.totale+parsed.data.ore*parsed.data.persone*65; const [b]=await db.execute('INSERT INTO boletas (fk_cliente,fk_tecnico,codice_boleta,data,prezzo_totale,utente_crea,utente_modifica,stato) VALUES (?,?,?,?,?,?,?,"emessa")',[intervento.clienteId,req.utente.sub,codice,parsed.data.data,totale,req.utente.sub,req.utente.sub]); await db.execute('INSERT INTO boletas_manutenzioni (fk_boleta,fk_manutenzione,utente_crea,utente_modifica) VALUES (?,?,?,?)',[b.insertId,intervento.id,req.utente.sub,req.utente.sub]); await db.execute('INSERT INTO boletas_macchine (fk_boleta,fk_macchina,utente_crea,utente_modifica) VALUES (?,?,?,?)',[b.insertId,parsed.data.macchinaId,req.utente.sub,req.utente.sub]); await db.execute('INSERT INTO boletas_operatori (fk_boleta,fk_operatore,utente_crea,utente_modifica) VALUES (?,?,?,?)',[b.insertId,req.utente.sub,req.utente.sub]); await db.commit(); res.status(201).json({id:b.insertId,codice,manutenzioneId:intervento.id,prezzoTotale:totale}); }
  catch(e){await db.rollback();res.status(400).json({errore:e.message||'Impossibile creare la boleta'});} finally {db.release();}
});
app.put('/api/boletas/:id',richiediSessione,async(req,res) => { const stato=z.enum(['bozza','emessa','annullata']).safeParse(req.body.stato); if(!stato.success)return res.status(422).json({errore:'Stato non valido'}); await pool.execute('UPDATE boletas SET stato=?,utente_modifica=? WHERE id=?',[stato.data,req.utente.sub,req.params.id]);res.json({id:Number(req.params.id),stato:stato.data}); });

app.get('/api/interventi',richiediSessione,async(req,res) => {
  const scope=scopeTecnico(req);
  const [rows]=await pool.execute('SELECT m.id,m.data,m.ubicazione,m.note,m.esito,m.stato,c.nome cliente,c.indirizzo,u.nome tecnico,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca,b.id boleta_id,b.codice_boleta FROM manutenzioni m LEFT JOIN clienti c ON c.id=m.fk_cliente JOIN utenti u ON u.id=m.fk_tecnico JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca LEFT JOIN boletas_manutenzioni bm ON bm.fk_manutenzione=m.id AND bm.stato="attivo" LEFT JOIN boletas b ON b.id=bm.fk_boleta AND b.stato<>"annullata" WHERE m.stato="attivo"'+scope.sql+' ORDER BY m.data DESC,m.id DESC',scope.values);
  res.json(rows);
});
app.get('/api/interventi/:id',richiediSessione,async(req,res) => { const [rows]=await pool.execute('SELECT m.*,c.nome cliente,c.indirizzo,mq.codice_unico,mq.modello,COALESCE(f.nome,ma.nome) marca FROM manutenzioni m LEFT JOIN clienti c ON c.id=m.fk_cliente JOIN macchine_manutenzioni mm ON mm.fk_manutenzione=m.id AND mm.stato="attivo" JOIN macchine mq ON mq.id=mm.fk_macchina LEFT JOIN fornitori f ON f.id=mq.fk_fornitore LEFT JOIN marche ma ON ma.id=mq.fk_marca WHERE m.id=?',[req.params.id]);if(!rows[0])return res.status(404).json({errore:'Intervento non trovato'});const[ricambi]=await pool.execute('SELECT p.nome,p.codice_unico,pm.quantita,pm.prezzo_unitario FROM pezzi_manutenzioni pm JOIN pezzi p ON p.id=pm.fk_pezzo WHERE pm.fk_manutenzione=? AND pm.stato="attivo"',[req.params.id]);res.json({...rows[0],ricambi}); });
app.post('/api/interventi',richiediSessione,async(req,res) => { const parsed=interventoSchema.safeParse(req.body);if(!parsed.success)return res.status(422).json({errore:'Dati intervento non validi',dettagli:parsed.error.flatten()});const db=await pool.getConnection();try{await db.beginTransaction();const created=await creaIntervento(db,parsed.data,req.utente.sub);await db.commit();res.status(201).json({id:created.id});}catch(e){await db.rollback();res.status(400).json({errore:e.message||'Impossibile creare l’intervento'});}finally{db.release();} });
app.put('/api/interventi/:id',richiediSessione,async(req,res) => { const parsed=interventoSchema.partial().safeParse(req.body);if(!parsed.success)return res.status(422).json({errore:'Dati intervento non validi'});const d=parsed.data;await pool.execute('UPDATE manutenzioni SET data=COALESCE(?,data),ubicazione=COALESCE(?,ubicazione),note=COALESCE(?,note),esito=COALESCE(?,esito),utente_modifica=? WHERE id=?',[d.data??null,d.ubicazione??null,d.note??null,d.esito??null,req.utente.sub,req.params.id]);res.json({id:Number(req.params.id)}); });
app.delete('/api/interventi/:id',richiediSessione,async(req,res) => { await pool.execute('UPDATE manutenzioni SET stato="inattivo",utente_modifica=? WHERE id=?',[req.utente.sub,req.params.id]);res.status(204).end(); });

function accessoAttivita(req,id) { return req.utente.ruolo==='tecnico' ? pool.execute('SELECT 1 FROM attivita_tecnici WHERE fk_attivita=? AND fk_tecnico=? AND stato="attivo"',[id,req.utente.sub]) : Promise.resolve([[{ok:1}]]); }
app.get('/api/tecnici',richiediSessione,autorizza(...adminRoles),async(_,res)=>{const[rows]=await pool.query('SELECT u.id,u.nome,u.codice_usuario FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.stato="attivo" AND r.codice IN ("tecnico","amministratore") ORDER BY u.nome');res.json(rows);});
app.get('/api/attivita',richiediSessione,async(req,res) => {
  const filtro=req.utente.ruolo==='tecnico'?' JOIN attivita_tecnici atf ON atf.fk_attivita=a.id AND atf.fk_tecnico=? AND atf.stato="attivo"':'';
  const values=req.utente.ruolo==='tecnico'?[req.utente.sub]:[];
  const [rows]=await pool.execute('SELECT a.id,a.titolo,a.osservazione,a.richiede_appuntamento,a.scadenza,a.priorita,a.stato_attivita,a.descrizione_chiusura,a.fk_manutenzione_chiusura,c.nome cliente,c.indirizzo,m.codice_unico,m.modello,COALESCE(f.nome,ma.nome) marca,GROUP_CONCAT(DISTINCT u.nome ORDER BY u.nome SEPARATOR ", ") tecnici FROM attivita a'+filtro+' LEFT JOIN clienti c ON c.id=a.fk_cliente LEFT JOIN macchine m ON m.id=a.fk_macchina LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca LEFT JOIN attivita_tecnici at ON at.fk_attivita=a.id AND at.stato="attivo" LEFT JOIN utenti u ON u.id=at.fk_tecnico WHERE a.stato="attivo" GROUP BY a.id ORDER BY FIELD(a.stato_attivita,"in_corso","aperta","completata"),a.scadenza,a.priorita',values);
  res.json(rows);
});
app.get('/api/attivita/contatore',richiediSessione,async(req,res)=>{
  const tecnico=req.utente.ruolo==='tecnico';
  const sql=tecnico
    ? 'SELECT COUNT(DISTINCT a.id) totale FROM attivita a JOIN attivita_tecnici atf ON atf.fk_attivita=a.id WHERE atf.fk_tecnico=? AND atf.stato="attivo" AND a.stato="attivo" AND a.stato_attivita<>"completata"'
    : 'SELECT COUNT(*) totale FROM attivita WHERE stato="attivo" AND stato_attivita<>"completata"';
  const[rows]=await pool.execute(sql,tecnico?[req.utente.sub]:[]);res.json({pendenti:Number(rows[0].totale)});
});
app.get('/api/attivita/:id',richiediSessione,async(req,res)=>{
  const[[allowed]]=await accessoAttivita(req,req.params.id);if(!allowed)return res.status(403).json({errore:'Attività non assegnata'});
  const[rows]=await pool.execute('SELECT a.*,c.nome cliente,c.indirizzo,m.codice_unico,m.modello,COALESCE(f.nome,ma.nome) marca FROM attivita a LEFT JOIN clienti c ON c.id=a.fk_cliente LEFT JOIN macchine m ON m.id=a.fk_macchina LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca WHERE a.id=?',[req.params.id]);if(!rows[0])return res.status(404).json({errore:'Attività non trovata'});
  const[tecnici]=await pool.execute('SELECT u.id,u.nome FROM attivita_tecnici at JOIN utenti u ON u.id=at.fk_tecnico WHERE at.fk_attivita=? AND at.stato="attivo"',[req.params.id]);res.json({...rows[0],tecnici});
});
app.post('/api/attivita',richiediSessione,autorizza(...adminRoles),async(req,res)=>{
  const parsed=attivitaSchema.safeParse(req.body);if(!parsed.success)return res.status(422).json({errore:'Dati attività non validi',dettagli:parsed.error.flatten()});const d=parsed.data,db=await pool.getConnection();
  try{await db.beginTransaction();const[r]=await db.execute('INSERT INTO attivita (fk_cliente,fk_macchina,fk_assegnato,titolo,osservazione,richiede_appuntamento,scadenza,priorita,utente_crea,utente_modifica) VALUES (?,?,?,?,?,?,?,?,?,?)',[d.clienteId,d.macchinaId,d.tecnici[0],'Manutenzione programmata',d.osservazione,d.richiedeAppuntamento?1:0,d.scadenza,d.priorita,req.utente.sub,req.utente.sub]);for(const tecnico of d.tecnici)await db.execute('INSERT INTO attivita_tecnici (fk_attivita,fk_tecnico,utente_crea,utente_modifica) VALUES (?,?,?,?)',[r.insertId,tecnico,req.utente.sub,req.utente.sub]);await db.commit();res.status(201).json({id:r.insertId});}catch(e){await db.rollback();res.status(400).json({errore:e.message||'Impossibile creare attività'});}finally{db.release();}
});
app.put('/api/attivita/:id',richiediSessione,autorizza(...adminRoles),async(req,res)=>{const parsed=attivitaSchema.safeParse(req.body);if(!parsed.success)return res.status(422).json({errore:'Dati attività non validi'});const d=parsed.data,db=await pool.getConnection();try{await db.beginTransaction();await db.execute('UPDATE attivita SET fk_cliente=?,fk_macchina=?,fk_assegnato=?,osservazione=?,richiede_appuntamento=?,scadenza=?,priorita=?,utente_modifica=? WHERE id=?',[d.clienteId,d.macchinaId,d.tecnici[0],d.osservazione,d.richiedeAppuntamento?1:0,d.scadenza,d.priorita,req.utente.sub,req.params.id]);await db.execute('UPDATE attivita_tecnici SET stato="inattivo",utente_modifica=? WHERE fk_attivita=?',[req.utente.sub,req.params.id]);for(const tecnico of d.tecnici)await db.execute('INSERT INTO attivita_tecnici (fk_attivita,fk_tecnico,utente_crea,utente_modifica,stato) VALUES (?,?,?,?, "attivo") ON DUPLICATE KEY UPDATE stato="attivo",utente_modifica=VALUES(utente_modifica)',[req.params.id,tecnico,req.utente.sub,req.utente.sub]);await db.commit();res.json({id:Number(req.params.id)});}catch(e){await db.rollback();res.status(400).json({errore:e.message||'Impossibile aggiornare attività'});}finally{db.release();}});
app.post('/api/attivita/:id/prendi',richiediSessione,async(req,res)=>{const[[allowed]]=await accessoAttivita(req,req.params.id);if(!allowed)return res.status(403).json({errore:'Attività non assegnata'});await pool.execute('UPDATE attivita SET stato_attivita="in_corso",utente_modifica=? WHERE id=? AND stato_attivita="aperta"',[req.utente.sub,req.params.id]);res.json({id:Number(req.params.id),stato:'in_corso'});});
app.post('/api/attivita/:id/chiudi',richiediSessione,async(req,res)=>{const parsed=chiusuraAttivitaSchema.safeParse(req.body);if(!parsed.success)return res.status(422).json({errore:'Dati chiusura non validi'});const[[allowed]]=await accessoAttivita(req,req.params.id);if(!allowed)return res.status(403).json({errore:'Attività non assegnata'});const[[task]]=await pool.execute('SELECT fk_cliente,fk_macchina FROM attivita WHERE id=? AND stato_attivita<>"completata"',[req.params.id]);if(!task)return res.status(409).json({errore:'Attività non disponibile'});const db=await pool.getConnection();try{await db.beginTransaction();const created=await creaIntervento(db,{clienteId:task.fk_cliente,macchinaId:task.fk_macchina,data:new Date().toISOString().slice(0,10),ubicazione:'cliente',note:parsed.data.descrizione,esito:'risolto',ore:parsed.data.ore,persone:parsed.data.persone,ricambi:parsed.data.ricambi},req.utente.sub);await db.execute('UPDATE attivita SET stato_attivita="completata",descrizione_chiusura=?,fk_manutenzione_chiusura=?,utente_modifica=? WHERE id=?',[parsed.data.descrizione,created.id,req.utente.sub,req.params.id]);await db.commit();res.json({id:Number(req.params.id),manutenzioneId:created.id});}catch(e){await db.rollback();res.status(400).json({errore:e.message||'Impossibile chiudere attività'});}finally{db.release();}});
app.delete('/api/attivita/:id',richiediSessione,autorizza(...adminRoles),async(req,res)=>{await pool.execute('UPDATE attivita SET stato="inattivo",utente_modifica=? WHERE id=?',[req.utente.sub,req.params.id]);res.status(204).end();});

const configurazioni = {
  fornitori:{ colonne:['codice','nome','stato'],lista:'SELECT id,codice,nome,stato FROM fornitori ORDER BY stato DESC,nome',valida:d=>({codice:z.string().trim().min(2).max(30).parse(d.codice).toUpperCase(),nome:z.string().trim().min(2).max(120).parse(d.nome),stato:d.stato==='inattivo'?'inattivo':'attivo'}) },
  clienti:{ colonne:['fk_fornitore','tipo_cliente','codice','nome','indirizzo','citta','stato'],lista:'SELECT c.id,c.codice,c.nome,c.tipo_cliente,c.indirizzo,c.citta,c.fk_fornitore,c.stato,f.nome fornitore FROM clienti c LEFT JOIN fornitori f ON f.id=c.fk_fornitore ORDER BY c.stato DESC,c.nome',valida:d=>({fk_fornitore:d.fk_fornitore?z.coerce.number().int().positive().parse(d.fk_fornitore):null,tipo_cliente:d.tipo_cliente==='fornitore'?'fornitore':'privato',codice:d.codice?z.string().trim().min(5).max(45).parse(d.codice).toUpperCase():null,nome:z.string().trim().min(2).max(160).parse(d.nome),indirizzo:z.string().trim().min(3).max(255).parse(d.indirizzo),citta:z.string().trim().min(2).max(120).parse(d.citta),stato:d.stato==='inattivo'?'inattivo':'attivo'}) },
  macchine:{ colonne:['fk_cliente','fk_fornitore','codice_unico','tipo_macchina','modello','stato'],lista:'SELECT m.id,m.codice_unico,m.tipo_macchina,m.modello,m.fk_cliente,m.fk_fornitore,m.stato,c.nome cliente,c.indirizzo,COALESCE(f.nome,ma.nome) fornitore FROM macchine m JOIN clienti c ON c.id=m.fk_cliente LEFT JOIN fornitori f ON f.id=m.fk_fornitore LEFT JOIN marche ma ON ma.id=m.fk_marca ORDER BY m.stato DESC,c.nome,m.modello',valida:d=>({fk_cliente:z.coerce.number().int().positive().parse(d.fk_cliente),fk_fornitore:d.fk_fornitore?z.coerce.number().int().positive().parse(d.fk_fornitore):null,codice_unico:z.string().trim().min(4).max(50).parse(d.codice_unico).toUpperCase(),tipo_macchina:z.enum(['macchina_caffe','produttore_ghiaccio','lavastoviglie','filtro','addolcitore']).parse(d.tipo_macchina),modello:z.string().trim().max(100).optional().parse(d.modello||'')||null,stato:d.stato==='inattivo'?'inattivo':'attivo'}) },
  pezzi:{ colonne:['nome','codice_unico','tipo_macchina','prezzo','intervallo_mesi','stato'],lista:'SELECT p.id,p.nome,p.codice_unico,p.tipo_macchina,CAST(p.prezzo AS DECIMAL(10,2)) prezzo,p.intervallo_mesi,p.stato,ma.nome fornitore FROM pezzi p LEFT JOIN marche ma ON ma.id=p.fk_marca ORDER BY p.stato DESC,p.nome',valida:d=>({nome:z.string().trim().min(2).max(150).parse(d.nome),codice_unico:z.string().trim().min(4).max(60).parse(d.codice_unico).toUpperCase(),tipo_macchina:z.enum(['macchina_caffe','produttore_ghiaccio','lavastoviglie','filtro','addolcitore']).parse(d.tipo_macchina),prezzo:z.coerce.number().min(0).max(99999).parse(d.prezzo),intervallo_mesi:d.intervallo_mesi===''||d.intervallo_mesi==null?null:z.coerce.number().int().min(1).max(120).parse(d.intervallo_mesi),stato:d.stato==='inattivo'?'inattivo':'attivo'}) },
  caratteristiche:{ colonne:['codice_unico','nome','unita_misura','stato'],lista:'SELECT id,codice_unico,nome,unita_misura,stato FROM tipi_caratteristiche ORDER BY stato DESC,nome',valida:d=>({codice_unico:z.string().trim().min(2).max(50).parse(d.codice_unico).toUpperCase(),nome:z.string().trim().min(2).max(120).parse(d.nome),unita_misura:z.string().trim().max(30).optional().parse(d.unita_misura||'')||null,stato:d.stato==='inattivo'?'inattivo':'attivo'}) }
};
const spec=r=>configurazioni[r];
async function codiceCliente(db,d){if(d.codice)return d.codice;const prefix=d.tipo_cliente==='privato'?'PRIV':(await db.execute('SELECT codice FROM fornitori WHERE id=?',[d.fk_fornitore]))[0][0]?.codice;if(!prefix)throw new Error('Seleziona un fornitore per il cliente collegato');const[[count]]=await db.execute('SELECT COUNT(*) totale FROM clienti WHERE codice LIKE ?',[prefix+'-%']);return prefix+'-'+String(Number(count.totale)+1).padStart(4,'0');}
async function idMarcaPerFornitore(db,id){if(!id)return 1;const[[f]]=await db.execute('SELECT nome FROM fornitori WHERE id=?',[id]);if(!f)throw new Error('Fornitore non trovato');await db.execute('INSERT IGNORE INTO marche (nome) VALUES (?)',[f.nome]);return (await db.execute('SELECT id FROM marche WHERE nome=?',[f.nome]))[0][0].id;}
app.get('/api/configurazione/:risorsa',richiediSessione,autorizza(...adminRoles),async(req,res)=>{const s=spec(req.params.risorsa);if(!s)return res.status(404).json({errore:'Risorsa non configurabile'});const[rows]=await pool.query(s.lista);res.json(rows);});
app.post('/api/configurazione/:risorsa',richiediSessione,autorizza(...adminRoles),async(req,res)=>{try{const risorsa=req.params.risorsa,s=spec(risorsa);if(!s)return res.status(404).json({errore:'Risorsa non configurabile'});const d=s.valida(req.body);if(risorsa==='clienti')d.codice=await codiceCliente(pool,d);if(risorsa==='macchine'){const marca=await idMarcaPerFornitore(pool,d.fk_fornitore);const[r]=await pool.execute('INSERT INTO macchine (fk_cliente,fk_marca,fk_fornitore,codice_unico,tipo_macchina,modello,utente_crea,utente_modifica,stato) VALUES (?,?,?,?,?,?,?,?,?)',[d.fk_cliente,marca,d.fk_fornitore,d.codice_unico,d.tipo_macchina,d.modello,req.utente.sub,req.utente.sub,d.stato]);return res.status(201).json({id:r.insertId});}const tabella=risorsa==='fornitori'?'fornitori':risorsa==='clienti'?'clienti':risorsa==='pezzi'?'pezzi':'tipi_caratteristiche';const fields=[...s.colonne,'utente_crea','utente_modifica'];const[r]=await pool.execute('INSERT INTO '+tabella+' ('+fields.join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')',[...s.colonne.map(c=>d[c]),req.utente.sub,req.utente.sub]);res.status(201).json({id:r.insertId});}catch(e){res.status(e instanceof z.ZodError?422:400).json({errore:e.message||'Dati non validi'});}});
app.put('/api/configurazione/:risorsa/:id',richiediSessione,autorizza(...adminRoles),async(req,res)=>{try{const risorsa=req.params.risorsa,s=spec(risorsa);if(!s)return res.status(404).json({errore:'Risorsa non configurabile'});const d=s.valida(req.body),id=z.coerce.number().int().positive().parse(req.params.id);if(risorsa==='clienti')d.codice=await codiceCliente(pool,d);if(risorsa==='macchine'){const marca=await idMarcaPerFornitore(pool,d.fk_fornitore);await pool.execute('UPDATE macchine SET fk_cliente=?,fk_marca=?,fk_fornitore=?,codice_unico=?,tipo_macchina=?,modello=?,utente_modifica=?,stato=? WHERE id=?',[d.fk_cliente,marca,d.fk_fornitore,d.codice_unico,d.tipo_macchina,d.modello,req.utente.sub,d.stato,id]);}else{const tabella=risorsa==='fornitori'?'fornitori':risorsa==='clienti'?'clienti':risorsa==='pezzi'?'pezzi':'tipi_caratteristiche';await pool.execute('UPDATE '+tabella+' SET '+s.colonne.map(c=>c+'=?').join(',')+',utente_modifica=? WHERE id=?',[...s.colonne.map(c=>d[c]),req.utente.sub,id]);}res.json({id});}catch(e){res.status(e instanceof z.ZodError?422:400).json({errore:e.message||'Dati non validi'});}});
app.delete('/api/configurazione/:risorsa/:id',richiediSessione,autorizza(...adminRoles),async(req,res)=>{const s=spec(req.params.risorsa);if(!s)return res.status(404).json({errore:'Risorsa non configurabile'});const table=req.params.risorsa==='fornitori'?'fornitori':req.params.risorsa==='clienti'?'clienti':req.params.risorsa==='macchine'?'macchine':req.params.risorsa==='pezzi'?'pezzi':'tipi_caratteristiche';await pool.execute('UPDATE '+table+' SET stato="inattivo",utente_modifica=? WHERE id=?',[req.utente.sub,Number(req.params.id)]);res.status(204).end();});
app.use((err,_,res,__)=>{console.error(err);res.status(500).json({errore:'Errore interno'});});
app.listen(porta,()=>console.log('Linea Bar API in ascolto sulla porta '+porta));
