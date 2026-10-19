import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { entorno } from '../../configuracion/entorno.js';
import { consultar, consultarUno, pool } from '../../base-datos/pool.js';
import { generarCsrf } from '../../intermedios/cookies.js';
import { nuevoId } from '../../utilidades/identificadores.js';

/**
 * Hash ficticio con el mismo coste que los reales. Se compara siempre, incluso
 * cuando el código de usuario no existe, para no revelar por tiempo qué
 * cuentas son válidas.
 */
const HASH_FICTICIO = '$2b$12$lRGCm3DYtx5IYvCg9Wbbd.kUaXqSHXKK3LKuC0rfgugzRCNhai8O6';

function hashRefresco(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function firmarAcceso(usuario, csrf) {
  return jwt.sign(
    { sub: usuario.id, nome: usuario.nome, ruolo: usuario.ruolo, csrf },
    entorno.sesion.secreto,
    { expiresIn: `${entorno.sesion.minutosVigencia}m`, issuer: entorno.sesion.emisor, algorithm: 'HS256' }
  );
}

function respuestaSesion(usuario, token, refresco, csrf) {
  return {
    token,
    refresco,
    csrf,
    utente: {
      id: usuario.id,
      nome: usuario.nome,
      codigo_usuario: usuario.codice_usuario,
      ruolo: usuario.ruolo
    },
    scadeInMinuti: entorno.sesion.minutosVigencia,
    scadeInGiorni: entorno.sesion.refrescoDias
  };
}

async function crearRefresco(usuarioId, meta = {}) {
  const token = crypto.randomBytes(48).toString('base64url');
  await pool.execute(
    'INSERT INTO sesiones_refresco (id,fk_utente,token_hash,expira_at,agente,indirizzo_ip,utente_crea,utente_modifica) VALUES (?,?,?,DATE_ADD(NOW(), INTERVAL ? DAY),?,?,?,?)',
    [
      nuevoId(),
      usuarioId,
      hashRefresco(token),
      entorno.sesion.refrescoDias,
      meta.agente?.slice(0, 255) ?? null,
      meta.ip?.slice(0, 45) ?? null,
      usuarioId,
      usuarioId
    ]
  );
  return token;
}

export async function iniciarSesion(codigoUsuario, contrasena, meta = {}) {
  const usuario = await consultarUno(
    'SELECT u.id,u.nome,u.codice_usuario,u.password_hash,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.codice_usuario=? AND u.stato="attivo"',
    [codigoUsuario]
  );
  const coincide = await bcrypt.compare(contrasena, usuario?.password_hash ?? HASH_FICTICIO);
  if (!usuario || !coincide) return null;

  await pool.execute('DELETE FROM sesiones_refresco WHERE expira_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
  const csrf = generarCsrf();
  const token = firmarAcceso(usuario, csrf);
  const refresco = await crearRefresco(usuario.id, meta);
  return respuestaSesion(usuario, token, refresco, csrf);
}

/**
 * Rota el token de refresco. Si llega un token ya revocado se asume reuso
 * (posible robo) y se revocan todas las sesiones activas de ese usuario.
 */
export async function renovarSesion(refresco, meta = {}) {
  if (!refresco) return null;
  const hash = hashRefresco(refresco);
  const sesion = await consultarUno(
    'SELECT id,fk_utente,expira_at,revocado_at,(expira_at > NOW()) vigente FROM sesiones_refresco WHERE token_hash=?',
    [hash]
  );
  if (!sesion) return null;

  if (sesion.revocado_at) {
    await consultar('UPDATE sesiones_refresco SET revocado_at=IFNULL(revocado_at,NOW()),utente_modifica=? WHERE fk_utente=? AND revocado_at IS NULL', [
      sesion.fk_utente,
      sesion.fk_utente
    ]);
    return null;
  }
  if (!Number(sesion.vigente)) return null;

  const usuario = await consultarUno(
    'SELECT u.id,u.nome,u.codice_usuario,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.id=? AND u.stato="attivo"',
    [sesion.fk_utente]
  );
  if (!usuario) return null;

  const nuevo = await crearRefresco(usuario.id, meta);
  await consultar('UPDATE sesiones_refresco SET revocado_at=NOW(),sostituido_por=?,utente_modifica=? WHERE id=?', [
    hashRefresco(nuevo),
    usuario.id,
    sesion.id
  ]);
  const csrf = generarCsrf();
  return respuestaSesion(usuario, firmarAcceso(usuario, csrf), nuevo, csrf);
}

export async function cerrarSesion(refresco) {
  if (!refresco) return false;
  const [resultado] = await pool.execute(
    'UPDATE sesiones_refresco SET revocado_at=NOW() WHERE token_hash=? AND revocado_at IS NULL',
    [hashRefresco(refresco)]
  );
  return resultado.affectedRows > 0;
}
