export function Estado({ value, c }) {
  const etiquetas = {
    emessa: c.issued,
    bozza: c.draft,
    annullata: c.cancelled,
    risolto: c.resolved,
    parziale: c.partial,
    da_rifare: c.redo
  };
  const tonos = {
    emessa: 'good',
    risolto: 'good',
    completata: 'good',
    bozza: 'warn',
    parziale: 'warn',
    in_corso: 'warn',
    programmato: 'warn'
  };
  const etiqueta = etiquetas[value] ?? value;
  const tono = tonos[value] ?? 'bad';

  return <span className={`status ${tono}`}>{etiqueta}</span>;
}
