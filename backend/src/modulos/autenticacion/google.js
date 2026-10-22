import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { entorno } from '../../configuracion/entorno.js';
import { establecerCookiesSesion } from '../../intermedios/cookies.js';
import { iniciarSesionGoogle } from './servicio.js';

export const rutasGoogle = Router();

const COOKIE_ESTADO = 'lineabar_google_estado';
const SCOPE = 'openid email profile';

function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: entorno.cookies.secure,
    path: entorno.cookies.ruta,
    maxAge: 10 * 60 * 1000
  };
}

function destinoSeguro(valor) {
  const destino = String(valor ?? '');
  return destino.startsWith('/lineabar/') && !destino.startsWith('/lineabar/login')
    ? destino
    : '/lineabar/dashboard';
}

function basePublica() {
  return (entorno.origenesPermitidos[0] || '').replace(/\/$/, '');
}

rutasGoogle.get('/auth/google/disponibile', (_req, res) => {
  res.json({ disponibile: Boolean(entorno.google.clientId && entorno.google.redirectUri) });
});

rutasGoogle.get('/auth/google', (req, res) => {
  if (!entorno.google.clientId || !entorno.google.clientSecret || !entorno.google.redirectUri) {
    return res.status(503).json({ errore: 'Accesso Google non configurato' });
  }

  const state = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const payload = jwt.sign(
    { state, verifier, next: destinoSeguro(req.query.next) },
    entorno.sesion.secreto,
    { expiresIn: '10m', issuer: entorno.sesion.emisor, algorithm: 'HS256' }
  );
  res.cookie(COOKIE_ESTADO, payload, opcionesCookie());

  const parametros = new URLSearchParams({
    client_id: entorno.google.clientId,
    redirect_uri: entorno.google.redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${parametros.toString()}`);
});

rutasGoogle.get('/auth/google/callback', async (req, res) => {
  const fallo = () => res.redirect(`${basePublica()}/lineabar/login?google=error`);
  const cookie = req.cookies?.[COOKIE_ESTADO];
  if (!cookie || !req.query.code || !req.query.state) return fallo();

  let estado;
  try {
    estado = jwt.verify(cookie, entorno.sesion.secreto, {
      issuer: entorno.sesion.emisor,
      algorithms: ['HS256']
    });
  } catch {
    return fallo();
  }
  if (!estado || estado.state !== req.query.state) return fallo();
  res.clearCookie(COOKIE_ESTADO, opcionesCookie());

  try {
    const respuestaToken = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(req.query.code),
        client_id: entorno.google.clientId,
        client_secret: entorno.google.clientSecret,
        redirect_uri: entorno.google.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: estado.verifier
      })
    });
    if (!respuestaToken.ok) return fallo();
    const tokens = await respuestaToken.json();
    if (!tokens.access_token) return fallo();

    const respuestaPerfil = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!respuestaPerfil.ok) return fallo();
    const perfil = await respuestaPerfil.json();
    if (!perfil.email || (perfil.email_verified !== true && perfil.email_verified !== 'true')) return fallo();

    const sesion = await iniciarSesionGoogle(String(perfil.email).toLowerCase(), String(perfil.sub), {
      agente: req.headers['user-agent'],
      ip: req.ip
    });
    if (!sesion) return fallo();

    establecerCookiesSesion(res, { token: sesion.token, refresco: sesion.refresco });
    return res.redirect(`${basePublica()}${estado.next}`);
  } catch {
    return fallo();
  }
});
