export function Estado({ value, c }) {
  const etiquetas = {
    emessa: c.issued,
    bozza: c.draft,
    annullata: c.cancelled,
    risolto: c.resolved,
    parziale: c.partial,
    da_rifare: c.redo,
    vencido: c.overdueState,
    oggi: c.todayState,
    imminente: c.imminentState,
    prossimo: c.soonState,
    programmato: c.scheduled,
    pianificata: c.pianificata,
    eseguito: c.completed,
    sospeso: c.suspended,
    aperta: c.openTask,
    in_corso: c.inProgress,
    in_viaggio: c.onTheWay,
    completata: c.completed
  };
  const tonos = {
    emessa: 'good',
    risolto: 'good',
    completata: 'good',
    eseguito: 'good',
    programmato: 'good',
    pianificata: 'warn',
    bozza: 'warn',
    parziale: 'warn',
    in_corso: 'warn',
    in_viaggio: 'warn',
    imminente: 'warn',
    oggi: 'warn',
    prossimo: 'warn',
    aperta: 'warn',
    vencido: 'bad',
    sospeso: 'bad'
  };
  const etiqueta = etiquetas[value] ?? value;
  const tono = tonos[value] ?? 'bad';

  return <span className={`status ${tono}`}>{etiqueta}</span>;
}
