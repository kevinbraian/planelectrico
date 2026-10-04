import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Proyecto } from '@/dominio/modelo/tipos'
import type { Normativa } from '@/dominio/normas/contrato'
import { buscarNorma, NORMA_POR_DEFECTO } from '@/dominio/normas/registro'
import { analizar, type Analisis } from '@/dominio/reglas/motor'

interface Contexto extends Analisis {
  proyecto: Proyecto
  norma: Normativa
  /** false si el proyecto pide una norma que esta versión de la app no trae. */
  normaEncontrada: boolean
}

const ContextoAnalisis = createContext<Contexto | null>(null)

/** Calcula y valida una sola vez por cambio del proyecto; las vistas leen de acá. */
export function ProveedorAnalisis({ proyecto, children }: { proyecto: Proyecto; children: ReactNode }) {
  const valor = useMemo<Contexto>(() => {
    const encontrada = buscarNorma(proyecto.norma.id, proyecto.norma.edicion)
    const norma = encontrada ?? NORMA_POR_DEFECTO
    return { proyecto, norma, normaEncontrada: encontrada !== undefined, ...analizar(proyecto, norma) }
  }, [proyecto])
  return <ContextoAnalisis.Provider value={valor}>{children}</ContextoAnalisis.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnalisis(): Contexto {
  const valor = useContext(ContextoAnalisis)
  if (!valor) throw new Error('useAnalisis se usa dentro de <ProveedorAnalisis>')
  return valor
}
