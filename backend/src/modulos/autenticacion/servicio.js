import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { entorno } from '../../configuracion/entorno.js';
import { consultar, consultarUno, pool } from '../../base-datos/pool.js';
import { generarCsrf } from '../../intermedios/cookies.js';
import { nuevoId } from '../../utilidades/identificadores.js';
import { permisosDeRol } from '../permisos/servicio.js';

/**
 * Hash ficticio con el mismo coste que los reales. Se compara siempre, incluso
 * cuando el código de usuario no existe, para no revelar por tiempo qué
 * cuentas son válidas.
 */
const HASH_FICTICIO = '$2b$12$lRGCm3DYtx5IYvCg9Wbbd.kUaXqSHXKK3LKuC0rfgugzRCNhai8O6';

/** Segundos en que un reuso se considera carrera del cliente y no robo. */
const VENTANA_REUSO_SEGUNDOS = 10;

function hashRefresco(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function firmarAcceso(usuario, csrf) {
  return jwt.sign(
    {
      sub: usuario.id,
      nome: usuario.nome,
      ruolo: usuario.ruolo,
      empresaId: usuario.empresa_id,
      empresaNome: usuario.empresa_nome,
      empresaLogo: usuario.empresa_logo,
      csrf
    },
    entorno.sesion.secreto,
    { expiresIn: `${entorno.sesion.minutosVigencia}m`, issuer: entorno.sesion.emisor, algorithm: 'HS256' }
  );
}

function respuestaSesion(usuario, token, refresco, csrf, menus) {
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
    menus,
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

async function sesionDeUsuario(usuario, meta = {}) {
  await pool.execute('DELETE FROM sesiones_refresco WHERE expira_at < DATE_SUB(NOW(), INTERVAL 30 DAY)');
  const csrf = generarCsrf();
  const token = firmarAcceso(usuario, csrf);
  const refresco = await crearRefresco(usuario.id, meta);
  const menus = await permisosDeRol(usuario.ruolo);
  return respuestaSesion(usuario, token, refresco, csrf, menus);
}

export async function iniciarSesion(codigoUsuario, contrasena, meta = {}) {
  const usuario = await consultarUno(
    'SELECT u.id,u.nome,u.codice_usuario,u.password_hash,u.fk_azienda empresa_id,a.nome empresa_nome,a.logo_url empresa_logo,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo JOIN aziende a ON a.id=u.fk_azienda AND a.stato="attivo" WHERE u.codice_usuario=? AND u.stato="attivo"',
    [codigoUsuario]
  );
  const coincide = await bcrypt.compare(contrasena, usuario?.password_hash ?? HASH_FICTICIO);
  if (!usuario || !coincide) return null;
  return sesionDeUsuario(usuario, meta);
}

/**
 * Vincula una cuenta Google solo a un usuario previamente autorizado por email.
 * No crea usuarios: el alta sigue siendo una acción administrativa.
 */
export async function iniciarSesionGoogle(email, googleSub, meta = {}) {
  const usuario = await consultarUno(
    'SELECT u.id,u.nome,u.codice_usuario,u.google_sub,u.fk_azienda empresa_id,a.nome empresa_nome,a.logo_url empresa_logo,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo JOIN aziende a ON a.id=u.fk_azienda AND a.stato="attivo" WHERE u.email=? AND u.stato="attivo"',
    [email]
  );
  if (!usuario) return null;
  if (usuario.google_sub && usuario.google_sub !== googleSub) return null;
  if (!usuario.google_sub) {
    await pool.execute('UPDATE utenti SET google_sub=?,utente_modifica=? WHERE id=? AND google_sub IS NULL', [
      googleSub,
      usuario.id,
      usuario.id
    ]);
    usuario.google_sub = googleSub;
  }
  return sesionDeUsuario(usuario, meta);
}

/**
 * Rota el token de refresco. Si llega un token ya revocado se asume reuso
 * (posible robo) y se revocan todas las sesiones activas de ese usuario.
 */
export async function renovarSesion(refresco, meta = {}) {
  if (!refresco) return null;
  const hash = hashRefresco(refresco);
  const sesion = await consultarUno(
    `SELECT id,fk_utente,expira_at,revocado_at,sostituido_por,
            (expira_at > NOW()) vigente,
            TIMESTAMPDIFF(SECOND, revocado_at, NOW()) segundos_revocado
       FROM sesiones_refresco WHERE token_hash=?`,
    [hash]
  );
  if (!sesion) return null;

  if (sesion.revocado_at) {
    // Dentro de la ventana de gracia, el reuso puede ser una carrera del propio
    // cliente (dos peticiones simultáneas): no se revoca toda la cadena.
    const dentroDeVentana =
      Boolean(sesion.sostituido_por) && Number(sesion.segundos_revocado ?? 999) <= VENTANA_REUSO_SEGUNDOS;
    if (!dentroDeVentana) {
      await consultar('UPDATE sesiones_refresco SET revocado_at=IFNULL(revocado_at,NOW()),utente_modifica=? WHERE fk_utente=? AND revocado_at IS NULL', [
        sesion.fk_utente,
        sesion.fk_utente
      ]);
    }
    return null;
  }
  if (!Number(sesion.vigente)) return null;

  const usuario = await consultarUno(
    'SELECT u.id,u.nome,u.codice_usuario,u.fk_azienda empresa_id,a.nome empresa_nome,a.logo_url empresa_logo,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo JOIN aziende a ON a.id=u.fk_azienda AND a.stato="attivo" WHERE u.id=? AND u.stato="attivo"',
    [sesion.fk_utente]
  );
  if (!usuario) return null;

  // Reclamo atómico: solo una petición puede rotar este token.
  const [reclamo] = await pool.execute(
    'UPDATE sesiones_refresco SET revocado_at=NOW(),utente_modifica=? WHERE id=? AND revocado_at IS NULL AND expira_at>NOW()',
    [usuario.id, sesion.id]
  );
  if (reclamo.affectedRows !== 1) return null;

  const nuevo = await crearRefresco(usuario.id, meta);
  await consultar('UPDATE sesiones_refresco SET sostituido_por=? WHERE id=?', [hashRefresco(nuevo), sesion.id]);
  const csrf = generarCsrf();
  const menus = await permisosDeRol(usuario.ruolo);
  return respuestaSesion(usuario, firmarAcceso(usuario, csrf), nuevo, csrf, menus);
}

export async function cerrarSesion(refresco) {
  if (!refresco) return false;
  const [resultado] = await pool.execute(
    'UPDATE sesiones_refresco SET revocado_at=NOW() WHERE token_hash=? AND revocado_at IS NULL',
    [hashRefresco(refresco)]
  );
  return resultado.affectedRows > 0;
}
