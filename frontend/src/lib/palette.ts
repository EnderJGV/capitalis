/** Paleta curada para categorías: contraste ≥ 3:1 sobre las superficies clara y oscura. */
export const CATEGORY_COLORS = [
  { value: '#2E8B74', name: 'Verde azulado' },
  { value: '#3E9A55', name: 'Verde' },
  { value: '#768F2A', name: 'Oliva' },
  { value: '#B57A12', name: 'Ámbar' },
  { value: '#D0583F', name: 'Terracota' },
  { value: '#A8724F', name: 'Arcilla' },
  { value: '#C0508F', name: 'Ciruela' },
  { value: '#7E62C6', name: 'Violeta' },
  { value: '#3F74C4', name: 'Azul' },
  { value: '#64788F', name: 'Pizarra' },
] as const

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0].value
