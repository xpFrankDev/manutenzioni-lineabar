import { Building2, Coffee, Factory, Package, Palette, Settings, SlidersHorizontal, Users } from 'lucide-react';

export const RECURSOS_CONFIGURABLES = [
  ['fornitori', Factory, 'suppliers'],
  ['clienti', Building2, 'clients'],
  ['macchine', Coffee, 'machines'],
  ['marche', Palette, 'brands'],
  ['pezzi', Package, 'pieces'],
  ['caratteristiche', Settings, 'characteristics'],
  ['utenti', Users, 'users'],
  ['parametri', SlidersHorizontal, 'parameters']
];

export function metadatosDeRecurso(recurso) {
  const encontrado = RECURSOS_CONFIGURABLES.find(([clave]) => clave === recurso);
  return encontrado ? { Icono: encontrado[1], etiqueta: encontrado[2] } : null;
}

export function etiquetaDeRecurso(recurso, c) {
  const metadatos = metadatosDeRecurso(recurso);
  return metadatos ? c[metadatos.etiqueta] : recurso;
}
