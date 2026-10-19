import { FileQuestion, ShieldAlert } from 'lucide-react';

export function PantallaError({ tipo = '404', c, alVolver }) {
  const esAccesoDenegado = tipo === '403';
  const Icono = esAccesoDenegado ? ShieldAlert : FileQuestion;
  return (
    <main className="content error-page">
      <section className="error-card" role="alert">
        <i className={esAccesoDenegado ? 'denied' : 'missing'}>
          <Icono size={34} />
        </i>
        <p className="eyebrow">Linea Bar</p>
        <h1>{esAccesoDenegado ? c.error403Title : c.error404Title}</h1>
        <p>{esAccesoDenegado ? c.error403Text : c.error404Text}</p>
        <button className="primary" onClick={alVolver}>
          {c.backHome}
        </button>
      </section>
    </main>
  );
}
