import { r01Grado } from './r01-grado'
import { r02CircuitosMinimos } from './r02-circuitos-minimos'
import { r03MaxBocas } from './r03-max-bocas'
import { r04ProteccionMaxima } from './r04-proteccion-maxima'
import { r05Coordinacion } from './r05-coordinacion'
import { r06SeccionMinima } from './r06-seccion-minima'
import { r07PuntosMinimos } from './r07-puntos-minimos'
import { r08Demanda } from './r08-demanda'
import { r09Simultaneidad } from './r09-simultaneidad'
import { r10Capacidad } from './r10-capacidad'
import { r11TomasPorCaja } from './r11-tomas-por-caja'
import { r12Alcance } from './r12-alcance'
import { r13Tablero } from './r13-tablero'
import type { Regla } from './tipos'

/**
 * Reglas que se aplican con cualquier norma que implemente el contrato.
 * Una norma o una jurisdicción puede sumar las suyas pasándole otra lista al motor.
 */
export const REGLAS_BASE: Regla[] = [
  r01Grado,
  r02CircuitosMinimos,
  r03MaxBocas,
  r04ProteccionMaxima,
  r05Coordinacion,
  r06SeccionMinima,
  r07PuntosMinimos,
  r08Demanda,
  r09Simultaneidad,
  r10Capacidad,
  r11TomasPorCaja,
  r12Alcance,
  r13Tablero,
]
