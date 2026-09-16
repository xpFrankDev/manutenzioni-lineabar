import { crearApp } from './app.js';
import { entorno } from './configuracion/entorno.js';

const app = crearApp();

app.listen(entorno.puerto, () => console.log(`Linea Bar API in ascolto sulla porta ${entorno.puerto}`));
