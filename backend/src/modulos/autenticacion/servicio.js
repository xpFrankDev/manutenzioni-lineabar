import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { entorno } from '../../configuracion/entorno.js';
import { consultarUno } from '../../base-datos/pool.js';

export async function iniciarSesion(codigoUsuario, contrasena) {
  const usuario = await consultarUno(
    'SELECT u.id,u.nome,u.codice_usuario,u.password_hash,r.codice ruolo FROM utenti u JOIN ruoli r ON r.id=u.fk_ruolo WHERE u.codice_usuario=? AND u.stato="attivo"',
    [codigoUsuario]
  );
  if (!usuario || !(await bcrypt.compare(contrasena, usuario.password_hash))) return null;

  const token = jwt.sign(
    { sub: usuario.id, nome: usuario.nome, ruolo: usuario.ruolo },
    entorno.sesion.secreto,
    { expiresIn: `${entorno.sesion.minutosVigencia}m`, issuer: entorno.sesion.emisor }
  );

  return {
    token,
    utente: {
      id: usuario.id,
      nome: usuario.nome,
      codigo_usuario: usuario.codice_usuario,
      ruolo: usuario.ruolo
    },
    scadeInMinuti: entorno.sesion.minutosVigencia
  };
}
