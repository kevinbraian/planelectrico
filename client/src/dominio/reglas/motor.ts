import { calcular } from '../calculo/calcular'
import type { Calculo } from '../calculo/tipos'
import type { Proyecto } from '../modelo/tipos'
import type { Normativa } from '../normas/contrato'
import { REGLAS_BASE } from './indice'
import type { Advertencia, Regla, Severidad } from './tipos'

const ORDEN: Record<Severidad, number> = { error: 0, aviso: 1, info: 2 }

/** Función pura: mismo proyecto y misma norma, mismas advertencias. */
export function validar(
  proyecto: Proyecto,
  norma: Normativa,
  reglas: Regla[] = REGLAS_BASE,
  calculo: Calculo = calcular(proyecto, norma),
): Advertencia[] {
  const ctx = { proyecto, norma, calculo }
  return reglas
    .flatMap((r) => r.evaluar(ctx))
    .sort((a, b) => ORDEN[a.severidad] - ORDEN[b.severidad] || a.reglaId.localeCompare(b.reglaId))
}

export interface Analisis {
  calculo: Calculo
  advertencias: Advertencia[]
}

/** Cálculo y advertencias de una sola pasada, para la interfaz. */
export function analizar(proyecto: Proyecto, norma: Normativa, reglas: Regla[] = REGLAS_BASE): Analisis {
  const calculo = calcular(proyecto, norma)
  return { calculo, advertencias: validar(proyecto, norma, reglas, calculo) }
}

/** Lo que el motor no mira. Se muestra junto al resultado para no dar una falsa sensación de cumplimiento. */
export const FUERA_DE_LA_VERIFICACION = [
  'Puesta a tierra y conductor de protección',
  'Corrientes de cortocircuito y poder de corte de las protecciones',
  'Caída de tensión',
  'Cañerías, cajas y cantidad de cables por caño',
  'Baños, cocinas y lavaderos según AEA 90364-7-701',
  'Selectividad y coordinación entre diferenciales',
  'Requisitos de la distribuidora y de la autoridad de aplicación local',
]
