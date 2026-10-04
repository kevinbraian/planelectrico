import type { Capacidad, Carga, Potencia } from '../modelo/tipos'

/** Potencia aparente. De W a VA se divide por el factor de potencia. */
export function aVA(p: Potencia, fpPorDefecto: number): number {
  if (p.unidad === 'VA') return p.valor
  const fp = p.fp ?? fpPorDefecto
  return fp > 0 ? p.valor / fp : p.valor
}

/** VA de una carga a potencia plena, contando su cantidad. */
export function instaladaVA(c: Carga, fpPorDefecto: number): number {
  return aVA(c.potencia, fpPorDefecto) * c.cantidad
}

/** VA que la carga aporta a la demanda: potencia plena por su factor de uso. */
export function demandadaVA(c: Carga, fpPorDefecto: number): number {
  return instaladaVA(c, fpPorDefecto) * (c.factorUso ?? 1)
}

/** Potencia activa. De VA a W se multiplica por el factor de potencia. */
export function aW(p: Potencia, fpPorDefecto: number): number {
  return p.unidad === 'W' ? p.valor : p.valor * (p.fp ?? fpPorDefecto)
}

/** Días con los que se estima el consumo de un mes. Es una convención de la app, no de la norma. */
export const DIAS_POR_MES = 30

/**
 * kWh por mes de una carga: potencia activa × cantidad × horas por día × días.
 * Las horas son a potencia plena; sin horas cargadas, la carga no suma consumo.
 */
export function energiaMensualKWh(c: Carga, fpPorDefecto: number): number {
  return (aW(c.potencia, fpPorDefecto) * c.cantidad * (c.horasDia ?? 0) * DIAS_POR_MES) / 1000
}

export function capacidadEnA(c: Capacidad, tensionV: number, fpPorDefecto: number): number {
  return 'corrienteA' in c ? c.corrienteA : aVA(c, fpPorDefecto) / tensionV
}
