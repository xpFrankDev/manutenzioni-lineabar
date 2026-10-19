import { Skeleton } from './SkeletonBase.jsx';

export { Skeleton };

function Lineas({ numero = 3, anchos = ['70%', '90%', '55%'] }) {
  return (
    <span className="skeleton-lines">
      {Array.from({ length: numero }).map((_, indice) => (
        <Skeleton key={indice} className="skeleton-line" style={{ width: anchos[indice % anchos.length] }} />
      ))}
    </span>
  );
}

export function SkeletonList({ filas = 4 }) {
  return (
    <div className="skeleton-page" aria-busy="true">
      <Skeleton className="skeleton-title" />
      {Array.from({ length: filas }).map((_, indice) => (
        <div className="skeleton-row" key={indice}>
          <Skeleton className="skeleton-avatar" />
          <Lineas numero={2} anchos={['58%', '82%']} />
          <Skeleton className="skeleton-pill" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ tarjetas = 4 }) {
  return (
    <div className="skeleton-page" aria-busy="true">
      <Skeleton className="skeleton-title" />
      <div className="skeleton-cards">
        {Array.from({ length: tarjetas }).map((_, indice) => (
          <div className="skeleton-card" key={indice}>
            <Skeleton className="skeleton-avatar" />
            <Lineas numero={3} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <main className="content skeleton-page" aria-busy="true">
      <Skeleton className="skeleton-title" />
      <div className="skeleton-metrics">
        {Array.from({ length: 4 }).map((_, indice) => (
          <Skeleton className="skeleton-metric" key={indice} />
        ))}
      </div>
      <div className="skeleton-panel">
        <Lineas numero={4} anchos={['40%', '90%', '75%', '60%']} />
      </div>
    </main>
  );
}

export function SkeletonMaquina({ c }) {
  return (
    <main className="content skeleton-page" aria-busy="true" aria-label={c?.loading}>
      <Skeleton className="skeleton-title" />
      <Skeleton className="skeleton-carousel" />
      <div className="skeleton-cards">
        <div className="skeleton-card"><Lineas numero={4} /></div>
        <div className="skeleton-card"><Lineas numero={5} /></div>
      </div>
      <div className="skeleton-panel"><Lineas numero={5} anchos={['35%', '85%', '65%', '90%', '50%']} /></div>
    </main>
  );
}

export function SkeletonSheet() {
  return (
    <div className="skeleton-page" aria-busy="true">
      <Lineas numero={5} anchos={['55%', '90%', '75%', '82%', '60%']} />
    </div>
  );
}

export function SkeletonReport() {
  return (
    <main className="content skeleton-page" aria-busy="true">
      <Skeleton className="skeleton-title" />
      <div className="skeleton-metrics">
        {Array.from({ length: 6 }).map((_, indice) => (
          <Skeleton className="skeleton-metric" key={indice} />
        ))}
      </div>
      <div className="skeleton-panel"><Lineas numero={6} anchos={['30%', '88%', '70%', '94%', '62%', '80%']} /></div>
    </main>
  );
}

export function SkeletonLogin() {
  return (
    <main className="login skeleton-login" aria-busy="true">
      <div className="skeleton-card skeleton-login-card">
        <Skeleton className="skeleton-title" />
        <Lineas numero={3} />
        <Skeleton className="skeleton-input" />
        <Skeleton className="skeleton-input" />
        <Skeleton className="skeleton-button" />
      </div>
    </main>
  );
}
