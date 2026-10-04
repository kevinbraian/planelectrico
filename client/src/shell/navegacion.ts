import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { circuitoDe, circuitosOrdenados } from '@/dominio/modelo/consultas'
import type { Circuito, Id } from '@/dominio/modelo/tipos'
import type { Advertencia } from '@/dominio/reglas/tipos'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'

/** Pestaña activa, según la URL: /p/:proyectoId/:pestana */
export function usePestanaActiva(): string {
  return useLocation().pathname.split('/')[3] ?? 'ambientes'
}

/** El circuito abierto en la pestaña Circuitos: el elegido, o el primero del tablero si no hay ninguno. */
export function useCircuitoActivo(): Circuito | undefined {
  const { proyecto } = useAnalisis()
  const elegido = useUiStore((s) => s.circuitoId)
  return (elegido ? proyecto.circuitos[elegido] : undefined) ?? circuitosOrdenados(proyecto)[0]
}

/** El ambiente que se le pone a lo que se agrega, si sigue existiendo. */
export function useAmbienteParaLoNuevo(): Id | null {
  const { proyecto } = useAnalisis()
  const elegido = useUiStore((s) => s.ambienteId)
  return elegido && proyecto.ambientes[elegido] ? elegido : null
}

/** A qué pestaña llevan las advertencias que hablan del proyecto entero. */
const PESTANA_DE_REGLA: Record<string, string> = { R01: 'ambientes', R02: 'tablero' }

/** Lleva a la pestaña donde está el objetivo de una advertencia y lo resalta. */
export function useIrAAdvertencia(): (a: Advertencia) => void {
  const navegar = useNavigate()
  const { proyecto } = useAnalisis()
  const { elegirCircuito, resaltar } = useUiStore.getState()

  return (a) => {
    const { tipo, id } = a.objetivo
    let pestana = PESTANA_DE_REGLA[a.reglaId] ?? 'resumen'
    if (tipo === 'ambiente') pestana = 'ambientes'
    if (tipo === 'tablero') pestana = 'tablero'
    if (tipo === 'circuito') {
      pestana = 'circuitos'
      elegirCircuito(id)
    }
    if (tipo === 'elemento') {
      pestana = 'circuitos'
      const elemento = proyecto.elementos[id]
      const circuitoId = elemento && circuitoDe(proyecto, elemento)
      if (circuitoId) elegirCircuito(circuitoId)
    }
    resaltar(tipo === 'proyecto' ? null : id)
    navegar(`/p/${proyecto.id}/${pestana}`)
  }
}

/** Para la fila o tarjeta de una entidad: la trae a la vista y la marca mientras esté resaltada. */
export function useResaltado<T extends HTMLElement>(id: Id) {
  const activo = useUiStore((s) => s.resaltadoId === id)
  const ref = useRef<T>(null)
  useEffect(() => {
    if (activo) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activo])
  return { ref, className: activo ? 'resaltado' : undefined }
}
