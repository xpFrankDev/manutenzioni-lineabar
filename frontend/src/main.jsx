import { createRoot } from 'react-dom/client';
import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/operaciones.css';
import './estilos/ios.css';
import { AvisosProvider } from './compartido/componentes/Avisos.jsx';
import { App } from './app/App.jsx';

createRoot(document.getElementById('root')).render(
  <AvisosProvider>
    <App />
  </AvisosProvider>
);
