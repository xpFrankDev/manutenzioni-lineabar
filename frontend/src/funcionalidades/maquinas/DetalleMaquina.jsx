import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  ImagePlus,
  MapPin,
  ShieldCheck,
  Trash2,
  Wrench
} from 'lucide-react';
import { llamarApi } from '../../compartido/api/cliente.js';
import { useAvisos } from '../../compartido/componentes/Avisos.jsx';
import { Estado } from '../../compartido/componentes/Estado.jsx';
import { nombreTipoMaquina } from '../../compartido/dominio/maquinas.js';
import { rutaMaquina } from '../../compartido/constantes.js';
import { formatearFecha, formatearHora } from '../../compartido/utilidades/formato.js';
import { comprimirImagen } from '../../compartido/utilidades/imagenes.js';
import { PantallaError } from '../errores/PantallaError.jsx';

const MIN_FOTO_BYTES = 20 * 1024;
const MAX_FOTO_BYTES = 6 * 1024 * 1024;
const MIN_FOTO_ANCHO = 640;
const MIN_FOTO_ALTO = 480;
const MAX_FOTO_LADO = 4096;

async function dimensionesImagen(archivo) {
  if (typeof window === 'undefined' || !('createImageBitmap' in window)) return null;
  try {
    const bitmap = await createImageBitmap(archivo);
    return { ancho: bitmap.width, alto: bitmap.height };
  } catch {
    return null;
  }
}

export function DetalleMaquina({ id, c, idioma, usuario, alVolver, alAbrirBoleta, alAbrirIntervento }) {
  const { confirmar, notificar } = useAvisos();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [indice, setIndice] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [accesos, setAccesos] = useState(null);
  const [guardandoAccesos, setGuardandoAccesos] = useState(false);
  const entradaFoto = useRef(null);
  const esAdministrador = usuario?.ruolo === 'amministratore';

  const cargar = useCallback(async () => {
    try {
      const detalle = await llamarApi(`/maquinas/${id}`);
      setDatos(detalle);
      setError(null);
      setIndice(0);
      if (esAdministrador) {
        const lista = await llamarApi(`/maquinas/${id}/accesos`).catch(() => null);
        if (lista) setAccesos(lista.tecnici);
      }
    } catch (e) {
      setError(e);
    }
  }, [id, esAdministrador]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error?.estado === 403) return <PantallaError tipo="403" c={c} alVolver={alVolver} />;
  if (error?.estado === 404) return <PantallaError tipo="404" c={c} alVolver={alVolver} />;
  if (error) {
    return (
      <main className="content">
        <p className="error">{error.message}</p>
      </main>
    );
  }
  if (!datos) return <main className="content loading">{c.loading}</main>;

  const fotos = datos.foto ?? [];
  const actual = fotos[indice] ?? null;
  const urlFoto = actual ? `/lineabar/api/maquinas/${id}/foto/${actual.id}` : null;
  const urlNfc = `${location.origin}${rutaMaquina(id)}`;

  function moverFoto(delta) {
    if (!fotos.length) return;
    setIndice((valor) => (valor + delta + fotos.length) % fotos.length);
  }

  async function subirFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    if (archivo.size < MIN_FOTO_BYTES) return setMensaje(c.photoTooSmall);
    if (archivo.size > MAX_FOTO_BYTES) return setMensaje(c.photoTooLarge);
    const dimensiones = await dimensionesImagen(archivo);
    if (dimensiones && (dimensiones.ancho < MIN_FOTO_ANCHO || dimensiones.alto < MIN_FOTO_ALTO || dimensiones.ancho > MAX_FOTO_LADO || dimensiones.alto > MAX_FOTO_LADO)) {
      return setMensaje(c.photoTooSmall);
    }
    setSubiendo(true);
    setMensaje('');
    try {
      const immagine = await comprimirImagen(archivo);
      await llamarApi(`/maquinas/${id}/foto`, {
        method: 'POST',
        body: JSON.stringify({ immagine, nomeFile: archivo.name, didascalia: '' })
      });
      setMensaje(c.saved);
      notificar(c.saved);
      await cargar();
    } catch (e) {
      setMensaje(e.message);
      notificar(e.message, 'error');
    } finally {
      setSubiendo(false);
    }
  }

  async function borrarFoto(fotoId) {
    const confirmado = await confirmar({
      titulo: c.deletePhoto,
      mensaje: c.confirmDeletePhoto,
      textoConfirmar: c.deletePhoto,
      textoCancelar: c.cancel,
      peligro: true
    });
    if (!confirmado) return;
    try {
      await llamarApi(`/maquinas/${id}/foto/${fotoId}`, { method: 'DELETE' });
      notificar(c.saved);
      await cargar();
    } catch (e) {
      setMensaje(e.message);
      notificar(e.message, 'error');
    }
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(urlNfc);
      setMensaje(c.linkCopied);
    } catch {
      setMensaje(urlNfc);
    }
  }

  async function guardarAccesos() {
    setGuardandoAccesos(true);
    setMensaje('');
    try {
      const lista = await llamarApi(`/maquinas/${id}/accesos`, {
        method: 'PUT',
        body: JSON.stringify({ usuarios: accesos.filter((fila) => fila.accesso).map((fila) => fila.id) })
      });
      setAccesos(lista.tecnici);
      setMensaje(c.accessSaved);
      notificar(c.accessSaved);
    } catch (e) {
      setMensaje(e.message);
      notificar(e.message, 'error');
    } finally {
      setGuardandoAccesos(false);
    }
  }

  return (
    <main className="content machine-detail">
      <header className="machine-detail-head">
        <button className="back-button" onClick={alVolver} aria-label={c.back}>
          <ArrowLeft size={20} />
          {c.back}
        </button>
        <div>
          <p className="eyebrow">{nombreTipoMaquina(datos.tipo_macchina, c)}</p>
          <h1>{datos.codice_unico}</h1>
          <p>
            {datos.marca ? `${datos.marca} · ` : ''}
            {datos.modello || '—'}
          </p>
        </div>
        <Estado value={datos.stato === 'attivo' ? 'risolto' : 'da_rifare'} c={c} />
      </header>

      {mensaje && <p className="status-message">{mensaje}</p>}

      <section className="machine-carousel" aria-roledescription="carousel" aria-label={c.photos}>
        <div className="machine-photo">
          {actual ? (
            <img src={urlFoto} alt={actual.didascalia || `${c.photoOf} ${indice + 1}`} loading="lazy" />
          ) : (
            <span className="machine-photo-empty">
              <Camera size={30} />
              {c.noPhotos}
            </span>
          )}
          {fotos.length > 1 && (
            <>
              <button className="carousel-arrow left" onClick={() => moverFoto(-1)} aria-label={c.previousPhoto}>
                <ChevronLeft size={20} />
              </button>
              <button className="carousel-arrow right" onClick={() => moverFoto(1)} aria-label={c.nextPhoto}>
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
        {fotos.length > 0 && (
          <div className="machine-thumbs">
            {fotos.map((fila, posicion) => (
              <button
                key={fila.id}
                className={posicion === indice ? 'active' : ''}
                onClick={() => setIndice(posicion)}
                aria-label={`${c.photoOf} ${posicion + 1}`}
              >
                <img src={`/lineabar/api/maquinas/${id}/foto/${fila.id}`} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        <button className="primary add-photo" onClick={() => entradaFoto.current?.click()} disabled={subiendo}>
          <ImagePlus size={17} />
          {subiendo ? c.photoUploading : c.addPhoto}
        </button>
        {(esAdministrador || actual?.utente_crea === usuario?.sub) && actual && (
          <button className="text-action danger" onClick={() => borrarFoto(actual.id)}>
            <Trash2 size={14} /> {c.deletePhoto}
          </button>
        )}
        <input
          ref={entradaFoto}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={subirFoto}
        />
        <small className="photo-hint">{c.photoHint}</small>
      </section>

      <section className="machine-grid">
        <article className="machine-card-block">
          <header>
            <Building2 size={18} />
            <h2>{c.clientData}</h2>
          </header>
          <b>{datos.cliente}</b>
          <small>{datos.cliente_codice} · {datos.cliente_tipo === 'fornitore' ? c.linked : c.private}</small>
          <p>
            <MapPin size={14} /> {datos.cliente_indirizzo}, {datos.cliente_citta}
          </p>
        </article>

        <article className="machine-card-block">
          <header>
            <Wrench size={18} />
            <h2>{c.machineData}</h2>
          </header>
          <dl>
            <div><dt>{c.machineCode}</dt><dd>{datos.codice_unico}</dd></div>
            <div><dt>{c.machineType}</dt><dd>{nombreTipoMaquina(datos.tipo_macchina, c)}</dd></div>
            <div><dt>{c.model}</dt><dd>{datos.modello || '—'}</dd></div>
            <div><dt>{c.brand}</dt><dd>{datos.marca || '—'}</dd></div>
            <div><dt>{c.supplierData}</dt><dd>{datos.fornitore || '—'}</dd></div>
            <div><dt>{c.lastMaintenance}</dt><dd>{datos.manutenzioni?.[0] ? formatearFecha(datos.manutenzioni[0].data, idioma) : '—'}</dd></div>
            <div><dt>{c.nextMaintenance}</dt><dd>{datos.prossime?.[0] ? formatearFecha(datos.prossime[0].prossima_manutenzione, idioma) : '—'}</dd></div>
          </dl>
        </article>
      </section>

      <section className="machine-section">
        <header className="machine-section-head">
          <ClipboardList size={18} />
          <h2>{c.maintenanceHistory}</h2>
        </header>
        {datos.manutenzioni.length ? (
          <div className="history-list">
            {datos.manutenzioni.map((fila) => (
              <article className="history-item" key={fila.id}>
                <header>
                  <b>{formatearFecha(fila.data, idioma)}{fila.ora ? ` · ${formatearHora(fila.ora)}` : ''}</b>
                  <Estado value={fila.esito} c={c} />
                </header>
                <small>
                  {fila.tecnico} · {fila.ubicazione === 'magazzino' ? c.warehouse : c.customerSite} · {Number(fila.ore)} h × {Number(fila.persone)}
                </small>
                <div className="history-actions">
                  <button className="text-action" onClick={() => alAbrirIntervento?.(fila.id)}>
                    {c.viewMaintenance}
                  </button>
                  {fila.boleta_id ? (
                    <button className="boleta-badge" onClick={() => alAbrirBoleta?.(fila.boleta_id)}>
                      {c.withBoleta} · {fila.codice_boleta}
                    </button>
                  ) : (
                    <span className="boleta-badge muted">{c.withoutBoleta}</span>
                  )}
                </div>
                {fila.note && <p>{fila.note}</p>}
                {fila.ricambi?.length > 0 && (
                  <ul>
                    {fila.ricambi.map((recambio) => (
                      <li key={recambio.codice_unico}>
                        {recambio.nome} × {Number(recambio.quantita)}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">{c.noMaintenanceHistory}</p>
        )}
      </section>

      {esAdministrador && (
        <section className="machine-section nfc-section">
          <header className="machine-section-head">
            <CalendarClock size={18} />
            <h2>{c.nfcLink}</h2>
          </header>
          <div className="nfc-row">
            <input readOnly value={urlNfc} aria-label={c.nfcLink} onFocus={(e) => e.target.select()} />
            <button className="primary" onClick={copiarEnlace}>
              <Copy size={16} /> {c.copyLink}
            </button>
          </div>
          <small>{c.accessHelp}</small>
        </section>
      )}

      {esAdministrador && accesos && (
        <section className="machine-section">
          <header className="machine-section-head">
            <ShieldCheck size={18} />
            <h2>{c.accessManagement}</h2>
          </header>
          <p className="muted">{c.accessHelp}</p>
          <p className="muted">{c.accessAuto}</p>
          {accesos.length ? (
            <>
              <div className="access-list">
                {accesos.map((fila) => (
                  <label key={fila.id} className="check-line">
                    <input
                      type="checkbox"
                      checked={Boolean(fila.accesso)}
                      onChange={(e) =>
                        setAccesos((actual) =>
                          actual.map((item) => (item.id === fila.id ? { ...item, accesso: e.target.checked ? 1 : 0 } : item))
                        )
                      }
                    />
                    <span>
                      {fila.nome} <small>{fila.codice_usuario}</small>
                    </span>
                  </label>
                ))}
              </div>
              <button className="primary" onClick={guardarAccesos} disabled={guardandoAccesos}>
                {c.saveAccess}
              </button>
            </>
          ) : (
            <p className="empty-state">{c.noTechnicians}</p>
          )}
        </section>
      )}
    </main>
  );
}
