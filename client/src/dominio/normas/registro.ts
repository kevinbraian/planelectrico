import { aea770 } from './aea-770-2017'
import type { Normativa } from './contrato'

const NORMAS: Normativa[] = [aea770]

export const NORMA_POR_DEFECTO = aea770

export function normasDisponibles(): Normativa[] {
  return NORMAS
}

/** Devuelve la norma con la que se cargó el proyecto, o undefined si esta versión de la app no la trae. */
export function buscarNorma(id: string, edicion: string): Normativa | undefined {
  return NORMAS.find((n) => n.id === id && n.edicion === edicion)
}
