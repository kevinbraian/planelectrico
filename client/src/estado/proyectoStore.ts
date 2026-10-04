import { temporal } from 'zundo'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Proyecto } from '@/dominio/modelo/tipos'
import { repositorio } from './repositorio'

interface EstadoProyecto {
  proyecto: Proyecto | null
  abrir(proyecto: Proyecto): void
  cerrar(): void
  /** Único punto de escritura: recibe una receta de immer sobre el proyecto abierto. */
  editar(receta: (proyecto: Proyecto) => void): void
}

/** Ediciones separadas por menos de esto (tipear en un campo) son un solo paso de deshacer. */
const PAUSA_ENTRE_PASOS_MS = 700

export const useProyectoStore = create<EstadoProyecto>()(
  temporal(
    immer((set) => ({
      proyecto: null,
      abrir: (proyecto) => set({ proyecto }),
      cerrar: () => set({ proyecto: null }),
      editar: (receta) =>
        set((estado) => {
          if (!estado.proyecto) return
          receta(estado.proyecto)
          estado.proyecto.modificadoEn = new Date().toISOString()
        }),
    })),
    {
      partialize: (estado) => ({ proyecto: estado.proyecto }),
      equality: (a, b) => a.proyecto === b.proyecto,
      limit: 100,
      handleSet: (guardarPaso) => {
        let ultimo = 0
        return (...args) => {
          const ahora = Date.now()
          if (ahora - ultimo > PAUSA_ENTRE_PASOS_MS) (guardarPaso as (...a: typeof args) => void)(...args)
          ultimo = ahora
        }
      },
    },
  ),
)

export const editar = (receta: (proyecto: Proyecto) => void) => useProyectoStore.getState().editar(receta)

// --- Guardado automático -------------------------------------------------------

let pendiente: ReturnType<typeof setTimeout> | undefined

function guardarAhora(): void {
  clearTimeout(pendiente)
  pendiente = undefined
  const { proyecto } = useProyectoStore.getState()
  if (proyecto) repositorio.guardar(proyecto)
}

/** Guarda lo pendiente del proyecto anterior, abre el nuevo y arranca su historial de deshacer. */
export function abrirProyecto(proyecto: Proyecto): void {
  if (pendiente !== undefined) guardarAhora()
  useProyectoStore.getState().abrir(proyecto)
  useProyectoStore.temporal.getState().clear()
}

export function cerrarProyecto(): void {
  if (pendiente !== undefined) guardarAhora()
  useProyectoStore.getState().cerrar()
  useProyectoStore.temporal.getState().clear()
}

/** Guarda en el repositorio un rato después de cada cambio, y antes de cerrar la pestaña. */
export function activarGuardadoAutomatico(): void {
  useProyectoStore.subscribe((estado, anterior) => {
    if (!estado.proyecto || estado.proyecto === anterior.proyecto) return
    clearTimeout(pendiente)
    pendiente = setTimeout(guardarAhora, 400)
  })
  window.addEventListener('pagehide', () => {
    if (pendiente !== undefined) guardarAhora()
  })
}
