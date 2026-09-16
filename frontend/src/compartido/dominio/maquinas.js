import { Coffee, Droplets, UtensilsCrossed } from 'lucide-react';

export const TIPOS_MAQUINA = ['macchina_caffe', 'produttore_ghiaccio', 'lavastoviglie', 'filtro', 'addolcitore'];

export const ICONOS_MAQUINA = {
  macchina_caffe: Coffee,
  produttore_ghiaccio: Droplets,
  lavastoviglie: UtensilsCrossed,
  filtro: Droplets,
  addolcitore: Droplets
};

const CLAVES_TIPO = {
  macchina_caffe: 'coffee',
  produttore_ghiaccio: 'ice',
  lavastoviglie: 'dishwasher',
  filtro: 'filter',
  addolcitore: 'softener'
};

export function nombreTipoMaquina(tipo, catalogo) {
  return catalogo[CLAVES_TIPO[tipo] ?? 'coffee'];
}
