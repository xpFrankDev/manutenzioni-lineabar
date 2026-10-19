import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { pool } from '../../src/base-datos/pool.js';
import { hoyIso, sumarMeses } from '../../src/modulos/calendario/servicio.js';
import { iniciarSesion, levantarServidor, pedir } from '../apoyo/servidor.js';

const ADMIN = {
  codigo_usuario: process.env.LINEABAR_TEST_ADMIN_USER || 'dev01',
  password: process.env.LINEABAR_TEST_ADMIN_PASSWORD || 'prueba-test-2026'
};

const SELLO = Date.now().toString(36).toUpperCase();
const HOY = hoyIso();
const PERIODO = HOY.slice(0, 7);
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('flujo completo de Linea Bar', async (t) => {
  const servidor = await levantarServidor();
  t.after(() => servidor.cerrar());
  t.after(() => pool.end());
  const { base } = servidor;

  let admin = null;
  let tecnico = null;
  let tecnico2 = null;
  let clienteId = null;
  let clienteCampoId = null;
  let maquinaId = null;
  let piezaId = null;
  let intervencionId = null;
  let boletaId = null;
  let scontrinoId = null;
  let entradaCalendarioId = null;

  await t.test('salud y autenticación', async () => {
    const salud = await pedir(base, '/salute');
    assert.equal(salud.estado, 200);
    assert.equal(salud.datos.stato, 'ok');

    const invalido = await pedir(base, '/auth/login', {
      metodo: 'POST',
      cuerpo: { codigo_usuario: 'nadie', password: 'contrasena-larga' }
    });
    assert.equal(invalido.estado, 401);

    admin = await iniciarSesion(base, ADMIN.codigo_usuario, ADMIN.password);
    assert.ok(admin.token);
    assert.ok(admin.refresco);
    assert.equal(admin.utente.ruolo, 'amministratore');

    const sesion = await pedir(base, '/auth/sessione', { token: admin.token });
    assert.equal(sesion.estado, 200);
    assert.equal(sesion.datos.utente.ruolo, 'amministratore');

    assert.equal((await pedir(base, '/auth/sessione')).estado, 401);
    assert.equal((await pedir(base, '/auth/sessione', { token: 'token-falso' })).estado, 401);
  });

  await t.test('sesión en cookie HttpOnly y CSRF en mutaciones', async () => {
    const acceso = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADMIN)
    });
    assert.equal(acceso.status, 200);
    const galletas = acceso.headers.getSetCookie();
    const cookie = galletas.map((valor) => valor.split(';')[0]).join('; ');
    const cuerpo = await acceso.json();
    const csrf = cuerpo.csrf;
    assert.ok(csrf, 'el CSRF debe viajar en la respuesta de login');
    assert.ok(
      galletas.some((valor) => valor.startsWith('lineabar_sesion=') && /HttpOnly/i.test(valor)),
      'la cookie de sesión debe ser HttpOnly'
    );
    assert.ok(
      !galletas.some((valor) => valor.startsWith('lineabar_csrf=')),
      'el CSRF no debe persistirse en una cookie legible'
    );

    const sinCsrf = await fetch(`${base}/parametros`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ parametros: [{ chiave: 'aviso_manutencion_dias', valore: '7' }] })
    });
    assert.equal(sinCsrf.status, 403);

    const conCsrf = await fetch(`${base}/parametros`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf },
      body: JSON.stringify({ parametros: [{ chiave: 'aviso_manutencion_dias', valore: '7' }] })
    });
    assert.equal(conCsrf.status, 200);

    const sesion = await fetch(`${base}/auth/sessione`, { headers: { Cookie: cookie } });
    assert.equal(sesion.status, 200);
    assert.equal((await sesion.json()).utente.ruolo, 'amministratore');
  });

  await t.test('rotación de refresh token y detección de reuso', async () => {
    const primera = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: admin.refresco } });
    assert.equal(primera.estado, 200);
    assert.ok(primera.datos.token);
    assert.notEqual(primera.datos.refresco, admin.refresco);

    // Un reuso inmediato se considera carrera del cliente: falla sin revocar la
    // cadena, así que el token rotado legítimo sigue siendo válido.
    const reuso = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: admin.refresco } });
    assert.equal(reuso.estado, 401);

    const segunda = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: primera.datos.refresco } });
    assert.equal(segunda.estado, 200);
    const tercera = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: segunda.datos.refresco } });
    assert.equal(tercera.estado, 200);

    // Fuera de la ventana de gracia, el reuso se trata como robo y revoca todo.
    const hashSegunda = crypto.createHash('sha256').update(segunda.datos.refresco).digest('hex');
    await pool.execute('UPDATE sesiones_refresco SET revocado_at=DATE_SUB(NOW(), INTERVAL 60 SECOND) WHERE token_hash=?', [
      hashSegunda
    ]);
    const robo = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: segunda.datos.refresco } });
    assert.equal(robo.estado, 401);
    const despues = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: tercera.datos.refresco } });
    assert.equal(despues.estado, 401);

    const refrescoInvalido = await pedir(base, '/auth/refresh', { metodo: 'POST', cuerpo: { refresco: 'inventado' } });
    assert.equal(refrescoInvalido.estado, 401);

    admin = await iniciarSesion(base, ADMIN.codigo_usuario, ADMIN.password);
  });

  await t.test('maestros: marcas, características, proveedores, clientes y usuarios', async () => {
    const marca = await pedir(base, '/configurazione/marche', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: { nome: `Marca ${SELLO}` }
    });
    assert.equal(marca.estado, 201);

    const caracteristica = await pedir(base, '/configurazione/caratteristiche', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: { codice_unico: `TENSION_${SELLO}`, nome: 'Tensione di prova', unita_misura: 'V' }
    });
    assert.equal(caracteristica.estado, 201);

    const proveedor = await pedir(base, '/configurazione/fornitori', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: { codice: `PRV${SELLO}`.slice(0, 30), nome: `Proveedor ${SELLO}` }
    });
    assert.equal(proveedor.estado, 201);

    const cliente = await pedir(base, '/configurazione/clienti', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: { nome: `Cliente Admin ${SELLO}`, indirizzo: 'Via Admin 1', citta: 'Milano', tipo_cliente: 'privato' }
    });
    assert.equal(cliente.estado, 201);
    assert.match(cliente.datos.codice, /^PRIV-\d{4,}$/);
    clienteId = cliente.datos.id;

    const usuario = await pedir(base, '/configurazione/utenti', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: {
        nome: `Tecnico ${SELLO}`,
        codice_usuario: `tec${SELLO}`.toLowerCase().slice(0, 40),
        email: `tec${SELLO}@lineabar.test`.toLowerCase(),
        ruolo: 'tecnico',
        password: 'TecnicoPrueba2026'
      }
    });
    assert.equal(usuario.estado, 201);

    const usuario2 = await pedir(base, '/configurazione/utenti', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: {
        nome: `Tecnico Dos ${SELLO}`,
        codice_usuario: `tec2${SELLO}`.toLowerCase().slice(0, 40),
        email: `tec2${SELLO}@lineabar.test`.toLowerCase(),
        ruolo: 'tecnico',
        password: 'TecnicoPrueba2026'
      }
    });
    assert.equal(usuario2.estado, 201);

    const listadoUsuarios = await pedir(base, '/configurazione/utenti', { token: admin.token });
    assert.equal(listadoUsuarios.estado, 200);
    assert.ok(listadoUsuarios.datos.length >= 3);
    for (const fila of listadoUsuarios.datos) {
      assert.equal(fila.password_hash, undefined);
      assert.equal(fila.password, undefined);
    }

    // El propio administrador no puede desactivarse.
    const autoDesactivar = await pedir(base, `/configurazione/utenti/${admin.utente.id}`, {
      metodo: 'DELETE',
      token: admin.token
    });
    assert.equal(autoDesactivar.estado, 400);

    const pieza = await pedir(base, '/configurazione/pezzi', {
      metodo: 'POST',
      token: admin.token,
      cuerpo: {
        nome: `Filtro prueba ${SELLO}`,
        codice_unico: `PZ-PRUEBA-${SELLO}`.slice(0, 60),
        tipo_macchina: 'macchina_caffe',
        prezzo: 12.5,
        intervallo_mesi: 5,
        caratteristiche: [{ tipoCaratteristicaId: caracteristica.datos.id, quantita: 230 }]
      }
    });
    assert.equal(pieza.estado, 201);
    piezaId = pieza.datos.id;

    const listadoPiezas = await pedir(base, '/configurazione/pezzi', { token: admin.token });
    const piezaCreada = listadoPiezas.datos.find((fila) => fila.id === piezaId);
    assert.ok(piezaCreada);
    assert.equal(piezaCreada.intervallo_mesi, 5);
    assert.equal(piezaCreada.caratteristiche, `${caracteristica.datos.id}:230`);
    assert.match(piezaCreada.caratteristiche_label, /Tensione di prova 230 V/);

    const parametros = await pedir(base, '/parametros', { token: admin.token });
    assert.equal(parametros.estado, 200);
    assert.equal(Number(parametros.datos.tarifa_mano_de_obra_hora), 65);

    const guardarParametros = await pedir(base, '/parametros', {
      metodo: 'PUT',
      token: admin.token,
      cuerpo: { parametros: [{ chiave: 'tarifa_mano_de_obra_hora', valore: '65' }] }
    });
    assert.equal(guardarParametros.estado, 200);
  });

  await t.test('el técnico puede dar de alta cliente y máquina desde el campo', async () => {
    tecnico = await iniciarSesion(base, `tec${SELLO}`.toLowerCase().slice(0, 40), 'TecnicoPrueba2026');

    // Sin sesión y con rol insuficiente no se toca la configuración.
    assert.equal((await pedir(base, '/configurazione/clienti')).estado, 401);
    assert.equal((await pedir(base, '/configurazione/clienti', { token: tecnico.token })).estado, 403);
    assert.equal((await pedir(base, '/reportes/riepilogo', { token: tecnico.token })).estado, 403);
    assert.equal(
      (await pedir(base, '/parametros', { metodo: 'PUT', token: tecnico.token, cuerpo: { parametros: [{ chiave: 'aviso_manutencion_dias', valore: '1' }] } })).estado,
      403
    );

    const cliente = await pedir(base, '/clienti', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: {
        nome: `Bar Campo ${SELLO}`,
        indirizzo: 'Via Campo 10',
        citta: 'Monza',
        tipo_cliente: 'privato'
      }
    });
    assert.equal(cliente.estado, 201);
    assert.match(cliente.datos.codice, /^PRIV-\d{4,}$/);
    clienteCampoId = cliente.datos.id;

    const marcas = await pedir(base, '/marche', { token: tecnico.token });
    assert.equal(marcas.estado, 200);
    assert.ok(marcas.datos.length > 0, 'debe existir al menos una marca');

    const maquina = await pedir(base, '/maquinas', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: {
        fk_cliente: clienteCampoId,
        codice_unico: `MC-PRUEBA-${SELLO}`.slice(0, 50),
        tipo_macchina: 'macchina_caffe',
        modello: 'Test 2000',
        fk_marca: marcas.datos[0].id
      }
    });
    assert.equal(maquina.estado, 201);
    maquinaId = maquina.datos.id;

    const maquinas = await pedir(base, '/maquinas', { token: tecnico.token });
    const creada = maquinas.datos.find((fila) => fila.id === maquinaId);
    assert.equal(creada.cliente_id, clienteCampoId);
    assert.equal(creada.cliente, `Bar Campo ${SELLO}`);
  });

  await t.test('ficha de máquina: acceso por usuario, fotos y autorización', async () => {
    tecnico2 = await iniciarSesion(base, `tec2${SELLO}`.toLowerCase().slice(0, 40), 'TecnicoPrueba2026');

    // El creador técnico y el administrador ven la ficha; otro técnico no.
    assert.equal((await pedir(base, `/maquinas/${maquinaId}`, { token: tecnico.token })).estado, 200);
    assert.equal((await pedir(base, `/maquinas/${maquinaId}`, { token: admin.token })).estado, 200);
    assert.equal((await pedir(base, `/maquinas/${maquinaId}`, { token: tecnico2.token })).estado, 403);
    assert.equal((await pedir(base, '/maquinas/no-es-uuid', { token: admin.token })).estado, 404);

    const ficha = await pedir(base, `/maquinas/${maquinaId}`, { token: admin.token });
    assert.equal(ficha.datos.cliente, `Bar Campo ${SELLO}`);
    assert.equal(Array.isArray(ficha.datos.foto), true);
    assert.equal(Array.isArray(ficha.datos.manutenzioni), true);

    // El administrador consulta y concede acceso explícito.
    const accesos = await pedir(base, `/maquinas/${maquinaId}/accesos`, { token: admin.token });
    assert.equal(accesos.estado, 200);
    const registroTecnico2 = accesos.datos.tecnici.find((fila) => fila.id === tecnico2.utente.id);
    assert.ok(registroTecnico2);
    assert.equal(Number(registroTecnico2.accesso), 0);

    const conAcceso = await pedir(base, `/maquinas/${maquinaId}/accesos`, {
      metodo: 'PUT',
      token: admin.token,
      cuerpo: { usuarios: [tecnico2.utente.id] }
    });
    assert.equal(conAcceso.estado, 200);
    assert.equal((await pedir(base, `/maquinas/${maquinaId}`, { token: tecnico2.token })).estado, 200);

    const sinAcceso = await pedir(base, `/maquinas/${maquinaId}/accesos`, {
      metodo: 'PUT',
      token: admin.token,
      cuerpo: { usuarios: [tecnico.utente.id] }
    });
    assert.equal(sinAcceso.estado, 200);
    assert.equal((await pedir(base, `/maquinas/${maquinaId}`, { token: tecnico2.token })).estado, 403);
    assert.equal((await pedir(base, `/maquinas/${maquinaId}`, { token: tecnico.token })).estado, 200);

    // El técnico autorizado sube una foto y otro usuario sin acceso no la ve.
    const subida = await pedir(base, `/maquinas/${maquinaId}/foto`, {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { immagine: PNG_1X1, nomeFile: 'macchina-prueba.png' }
    });
    assert.equal(subida.estado, 201);
    const fotoId = subida.datos.id;

    const imagen = await fetch(`${base}/maquinas/${maquinaId}/foto/${fotoId}`, {
      headers: { Authorization: `Bearer ${tecnico.token}` }
    });
    assert.equal(imagen.status, 200);
    assert.equal(imagen.headers.get('content-type'), 'image/png');

    const imagenAjena = await fetch(`${base}/maquinas/${maquinaId}/foto/${fotoId}`, {
      headers: { Authorization: `Bearer ${tecnico2.token}` }
    });
    assert.equal(imagenAjena.status, 403);

    const subidaInvalida = await pedir(base, `/maquinas/${maquinaId}/foto`, {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { immagine: 'data:text/plain;base64,SG9sYQ==' }
    });
    assert.equal(subidaInvalida.estado, 400);

    const eliminada = await pedir(base, `/maquinas/${maquinaId}/foto/${fotoId}`, {
      metodo: 'DELETE',
      token: admin.token
    });
    assert.equal(eliminada.estado, 204);
  });

  await t.test('intervención: horas, personas, ricambio y calendario', async () => {
    const creada = await pedir(base, '/interventi', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: {
        clienteId: clienteCampoId,
        macchinaId: maquinaId,
        data: HOY,
        ubicazione: 'cliente',
        note: 'Prueba automática de flujo',
        esito: 'risolto',
        ore: 1.5,
        persone: 2,
        ricambi: [{ pezzoId: piezaId, quantita: 2 }]
      }
    });
    assert.equal(creada.estado, 201);
    intervencionId = creada.datos.id;

    const detalle = await pedir(base, `/interventi/${intervencionId}`, { token: tecnico.token });
    assert.equal(detalle.estado, 200);
    assert.equal(Number(detalle.datos.ore), 1.5);
    assert.equal(Number(detalle.datos.persone), 2);
    assert.equal(detalle.datos.ricambi.length, 1);
    assert.equal(Number(detalle.datos.ricambi[0].quantita), 2);
    assert.equal(detalle.datos.prossime.length, 1);
    assert.equal(String(detalle.datos.prossime[0].prossima_manutenzione).slice(0, 10), sumarMeses(HOY, 5));

    const ficha = await pedir(base, `/maquinas/${maquinaId}`, { token: admin.token });
    assert.equal(ficha.estado, 200);
    const registro = ficha.datos.manutenzioni.find((fila) => fila.id === intervencionId);
    assert.ok(registro);
    assert.equal(registro.boleta_id, null);
    assert.equal(Number(registro.ore), 1.5);
    assert.equal(registro.ricambi.length, 1);
  });

  await t.test('calendario: la manutención se renueva según el intervalo del ricambio', async () => {
    const calendario = await pedir(base, '/calendario?estado=pendientes', { token: tecnico.token });
    assert.equal(calendario.estado, 200);
    const entrada = calendario.datos.find((fila) => fila.fk_macchina === maquinaId && fila.fk_pezzo === piezaId);
    assert.ok(entrada, 'la entrada de calendario debe existir');
    entradaCalendarioId = entrada.id;
    assert.equal(entrada.frequenza_mesi, 5);
    assert.equal(String(entrada.prossima_manutenzione).slice(0, 10), sumarMeses(HOY, 5));
    assert.equal(entrada.cliente, `Bar Campo ${SELLO}`);
    assert.ok(['vencido', 'oggi', 'imminente', 'prossimo', 'programmato'].includes(entrada.vencimiento));

    const resumen = await pedir(base, '/calendario/resumen', { token: admin.token });
    assert.equal(resumen.estado, 200);
    assert.ok(resumen.datos.pendientes >= 1);
    assert.equal(typeof resumen.datos.avisos, 'number');

    const dashboard = await pedir(base, '/dashboard', { token: admin.token });
    assert.equal(dashboard.estado, 200);
    assert.ok(dashboard.datos.metriche.manutenzioniProgrammate >= 1);
    assert.ok(dashboard.datos.scadenze.proximas.length >= 1);
  });

  await t.test('scontrino: análisis, alta de cliente desde la foto y deduplicación', async () => {
    const analisis = await pedir(base, '/scontrini/analisi', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { immagine: PNG_1X1, nomeFile: 'scontrino-prueba.png' }
    });
    assert.equal(analisis.estado, 201);
    scontrinoId = analisis.datos.id;
    assert.equal(analisis.datos.cliente, null);
    assert.equal(analisis.datos.analisi.proveedor, 'tesseract');

    const alta = await pedir(base, `/scontrini/${scontrinoId}/cliente`, {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { nome: `Bar Foto ${SELLO}`, indirizzo: 'Via Foto 3', citta: 'Como' }
    });
    assert.equal(alta.estado, 201);
    assert.equal(alta.datos.creado, true);
    assert.match(alta.datos.cliente.codice, /^PRIV-\d{4,}$/);

    const repetido = await pedir(base, `/scontrini/${scontrinoId}/cliente`, {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { nome: `bar foto ${SELLO}` }
    });
    assert.equal(repetido.estado, 200);
    assert.equal(repetido.datos.creado, false);
    assert.equal(repetido.datos.cliente.id, alta.datos.cliente.id);

    const imagen = await fetch(`${base}/scontrini/${scontrinoId}/immagine`, {
      headers: { Authorization: `Bearer ${tecnico.token}` }
    });
    assert.equal(imagen.status, 200);
    assert.equal(imagen.headers.get('content-type'), 'image/png');
    assert.ok((await imagen.arrayBuffer()).byteLength > 40);

    const invalido = await pedir(base, '/scontrini/analisi', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { immagine: 'data:text/plain;base64,SG9sYQ==' }
    });
    assert.equal(invalido.estado, 400);
  });

  await t.test('boleta: totales con mano de obra, vínculo al scontrino y detalle', async () => {
    const creada = await pedir(base, '/boletas', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: {
        clienteId: clienteCampoId,
        macchinaId: maquinaId,
        data: HOY,
        ubicazione: 'cliente',
        note: 'Boleta de prueba',
        esito: 'risolto',
        ore: 2,
        persone: 1,
        ricambi: [{ pezzoId: piezaId, quantita: 1 }],
        scontrinoId
      }
    });
    assert.equal(creada.estado, 201);
    boletaId = creada.datos.id;
    assert.match(creada.datos.codice, new RegExp(`^BL-${PERIODO.replace('-', '')}-\\d{4,}$`));
    assert.equal(creada.datos.prezzoTotale, 142.5);

    const detalle = await pedir(base, `/boletas/${boletaId}`, { token: tecnico.token });
    assert.equal(detalle.estado, 200);
    assert.equal(Number(detalle.datos.ore), 2);
    assert.equal(Number(detalle.datos.persone), 1);
    assert.equal(Number(detalle.datos.prezzo_totale), 142.5);
    assert.equal(detalle.datos.totales.manoDeObra, 130);
    assert.equal(detalle.datos.totales.total, 142.5);
    assert.equal(detalle.datos.fk_scontrino, scontrinoId);
    assert.equal(String(detalle.datos.prossime[0].prossima_manutenzione).slice(0, 10), sumarMeses(HOY, 5));

    const scontrino = await pedir(base, `/scontrini/${scontrinoId}`, { token: tecnico.token });
    assert.equal(scontrino.datos.stato_analisi, 'confermato');
    assert.equal(scontrino.datos.fk_cliente, clienteCampoId);

    const estadoInvalido = await pedir(base, `/boletas/${boletaId}`, {
      metodo: 'PUT',
      token: tecnico.token,
      cuerpo: { stato: 'inventado' }
    });
    assert.equal(estadoInvalido.estado, 422);

    const ficha = await pedir(base, `/maquinas/${maquinaId}`, { token: admin.token });
    const registro = ficha.datos.manutenzioni.find((fila) => fila.boleta_id === boletaId);
    assert.ok(registro, 'el historial debe relacionar la boleta con la máquina');
    assert.equal(registro.codice_boleta, creada.datos.codice);
  });

  await t.test('un técnico no accede a interventos ni boletas ajenos', async () => {
    tecnico2 = await iniciarSesion(base, `tec2${SELLO}`.toLowerCase().slice(0, 40), 'TecnicoPrueba2026');

    assert.equal((await pedir(base, `/interventi/${intervencionId}`, { token: tecnico2.token })).estado, 403);
    assert.equal((await pedir(base, `/boletas/${boletaId}`, { token: tecnico2.token })).estado, 403);
    assert.equal((await pedir(base, `/scontrini/${scontrinoId}`, { token: tecnico2.token })).estado, 403);
    const imagenAjena = await fetch(`${base}/scontrini/${scontrinoId}/immagine`, {
      headers: { Authorization: `Bearer ${tecnico2.token}` }
    });
    assert.equal(imagenAjena.status, 403);
    assert.equal(
      (await pedir(base, `/interventi/${intervencionId}`, { metodo: 'PUT', token: tecnico2.token, cuerpo: { note: 'intruso' } })).estado,
      403
    );
    assert.equal(
      (await pedir(base, `/boletas/${boletaId}`, { metodo: 'PUT', token: tecnico2.token, cuerpo: { stato: 'annullata' } })).estado,
      403
    );

    const listado = await pedir(base, '/interventi', { token: tecnico2.token });
    assert.ok(!listado.datos.some((fila) => fila.id === intervencionId));

    // El administrador sí conserva la visión completa.
    assert.equal((await pedir(base, `/interventi/${intervencionId}`, { token: admin.token })).estado, 200);
    assert.equal((await pedir(base, `/boletas/${boletaId}`, { token: admin.token })).estado, 200);
  });

  await t.test('el calendario genera tareas y permite reprogramar', async () => {
    const usuarios = await pedir(base, '/configurazione/utenti', { token: admin.token });
    const tecnicoUsuario = usuarios.datos.find((fila) => fila.codice_usuario === `tec${SELLO}`.toLowerCase().slice(0, 40));
    assert.ok(tecnicoUsuario);

    const programar = await pedir(base, `/calendario/${entradaCalendarioId}/programar`, {
      metodo: 'POST',
      token: admin.token,
      cuerpo: { tecnici: [tecnicoUsuario.id], priorita: 'alta' }
    });
    assert.equal(programar.estado, 201);
    assert.ok(programar.datos.attivitaId);

    // El técnico no puede programar tareas: es una acción de administración.
    const sinPermiso = await pedir(base, `/calendario/${entradaCalendarioId}/programar`, {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { tecnici: [tecnicoUsuario.id] }
    });
    assert.equal(sinPermiso.estado, 403);

    const tareas = await pedir(base, '/attivita', { token: admin.token });
    const tarea = tareas.datos.find((fila) => fila.id === programar.datos.attivitaId);
    assert.ok(tarea);
    assert.equal(tarea.cliente, `Bar Campo ${SELLO}`);
    assert.equal(tarea.stato_attivita, 'aperta');

    // Cerrar la tarea crea la manutención y guarda su UUID en la tarea.
    assert.equal(
      (await pedir(base, `/attivita/${programar.datos.attivitaId}/prendi`, { metodo: 'POST', token: tecnico.token })).estado,
      200
    );
    const cierre = await pedir(base, `/attivita/${programar.datos.attivitaId}/chiudi`, {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: { descrizione: 'Cierre de prueba desde integración', ore: 1, persone: 1, ricambi: [] }
    });
    assert.equal(cierre.estado, 200);
    assert.match(cierre.datos.manutenzioneId, /^[0-9a-f-]{36}$/i);

    // El calendario del técnico se limita a sus tareas o a lo aún sin asignar.
    const calendarioTecnico2 = await pedir(base, '/calendario?estado=pendientes', { token: tecnico2.token });
    assert.ok(!calendarioTecnico2.datos.some((fila) => fila.id === entradaCalendarioId));

    const suspender = await pedir(base, `/calendario/${entradaCalendarioId}`, {
      metodo: 'PUT',
      token: admin.token,
      cuerpo: { statoCalendario: 'sospeso', note: 'Pausa de prueba' }
    });
    assert.equal(suspender.estado, 200);

    const suspendidas = await pedir(base, `/calendario?estado=sospeso`, { token: admin.token });
    assert.ok(suspendidas.datos.some((fila) => fila.id === entradaCalendarioId));

    const reprogramar = await pedir(base, `/calendario/${entradaCalendarioId}`, {
      metodo: 'PUT',
      token: admin.token,
      cuerpo: { statoCalendario: 'programmato', prossimaManutenzione: sumarMeses(HOY, 6), frequenzaMesi: 6 }
    });
    assert.equal(reprogramar.estado, 200);

    const actualizada = await pedir(base, `/calendario?estado=pendientes`, { token: admin.token });
    const entrada = actualizada.datos.find((fila) => fila.id === entradaCalendarioId);
    assert.equal(String(entrada.prossima_manutenzione).slice(0, 10), sumarMeses(HOY, 6));
    assert.equal(entrada.frequenza_mesi, 6);
  });

  await t.test('reportes del período y exportación CSV', async () => {
    const reporte = await pedir(base, `/reportes/riepilogo?periodo=${PERIODO}`, { token: admin.token });
    assert.equal(reporte.estado, 200);
    assert.equal(reporte.datos.periodo, PERIODO);
    assert.ok(reporte.datos.boletas >= 1);
    assert.ok(reporte.datos.ricavi >= 142.5);
    assert.ok(reporte.datos.manodopera >= 0);
    assert.ok(Array.isArray(reporte.datos.clientes));
    assert.ok(reporte.datos.clientes.some((fila) => fila.nome === `Bar Campo ${SELLO}`));
    assert.ok(Array.isArray(reporte.datos.tipos));
    assert.ok(reporte.datos.tipos.some((fila) => fila.tipo_macchina === 'macchina_caffe'));
    assert.ok(Array.isArray(reporte.datos.ricambi));
    assert.ok(reporte.datos.ricambi.some((fila) => fila.id === piezaId));
    assert.ok(Array.isArray(reporte.datos.previsione));

    const csv = await fetch(`${base}/reportes/boletas.csv?periodo=${PERIODO}`, {
      headers: { Authorization: `Bearer ${admin.token}` }
    });
    assert.equal(csv.status, 200);
    assert.match(csv.headers.get('content-type'), /text\/csv/);
    const texto = await csv.text();
    assert.match(texto, /BL-\d{6}-\d{4}/);
    assert.match(texto, /Bar Campo/);

    assert.equal((await pedir(base, `/reportes/riepilogo?periodo=invalido`, { token: admin.token })).estado, 400);
  });

  await t.test('defensas: inyección SQL, parámetros inválidos y límite de acceso', async () => {
    const inyeccion = await pedir(base, '/auth/login', {
      metodo: 'POST',
      cuerpo: { codigo_usuario: `dev01' OR '1'='1`, password: 'loquesea123' }
    });
    assert.equal(inyeccion.estado, 401);

    const inyeccionId = await pedir(base, '/piezas?maquina_id=1%20OR%201=1', { token: tecnico.token });
    assert.equal(inyeccionId.estado, 422);

    const inyeccionRuta = await pedir(base, '/interventi/abc', { token: admin.token });
    assert.equal(inyeccionRuta.estado, 404);

    const cuerpoGrande = await pedir(base, '/interventi', {
      metodo: 'POST',
      token: tecnico.token,
      cuerpo: {
        clienteId: clienteCampoId,
        macchinaId: maquinaId,
        data: HOY,
        ubicazione: 'cliente',
        esito: 'risolto',
        ore: 1,
        persone: 1,
        ricambi: [],
        note: 'x'.repeat(3000)
      }
    });
    assert.equal(cuerpoGrande.estado, 422);

    let bloqueado = false;
    for (let intento = 0; intento < 12 && !bloqueado; intento += 1) {
      const respuesta = await pedir(base, '/auth/login', {
        metodo: 'POST',
        cuerpo: { codigo_usuario: ADMIN.codigo_usuario, password: `incorrecta-${intento}` }
      });
      bloqueado = respuesta.estado === 429;
    }
    assert.ok(bloqueado, 'el límite de intentos de acceso debe activarse');
  });
});
