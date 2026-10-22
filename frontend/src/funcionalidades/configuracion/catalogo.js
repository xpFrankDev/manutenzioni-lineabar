import { Boxes, Building2, Clock3, Coffee, Factory, Package, Palette, Settings, ShieldCheck, SlidersHorizontal, Truck, Users } from 'lucide-react';

export const RECURSOS_CONFIGURABLES = [
  ['fornitori', Factory, 'suppliers'],
  ['clienti', Building2, 'clients'],
  ['macchine', Coffee, 'machines'],
  ['marche', Palette, 'brands'],
  ['pezzi', Package, 'pieces'],
  ['modelli', Boxes, 'models'],
  ['furgoni', Truck, 'vehicles'],
  ['tipi_lavoro', Clock3, 'workTypes'],
  ['caratteristiche', Settings, 'characteristics'],
  ['utenti', Users, 'users'],
  ['parametri', SlidersHorizontal, 'parameters'],
  ['roles', ShieldCheck, 'roles']
];

export function metadatosDeRecurso(recurso) {
  const encontrado = RECURSOS_CONFIGURABLES.find(([clave]) => clave === recurso);
  return encontrado ? { Icono: encontrado[1], etiqueta: encontrado[2] } : null;
}

export function etiquetaDeRecurso(recurso, c) {
  const metadatos = metadatosDeRecurso(recurso);
  return metadatos ? c[metadatos.etiqueta] : recurso;
}
