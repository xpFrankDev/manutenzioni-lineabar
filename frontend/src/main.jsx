import { createRoot } from 'react-dom/client';
import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/operaciones.css';
import { App } from './app/App.jsx';

createRoot(document.getElementById('root')).render(<App />);
