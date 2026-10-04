import { create } from 'zustand'
import type { Id } from '@/dominio/modelo/tipos'

/** Estado de la interfaz que no forma parte del proyecto ni se guarda. */
interface EstadoUi {
  /** Circuito abierto en la pestaña Circuitos. */
  circuitoId: Id | null
  /** Ambiente que se le asigna a lo que se agrega desde la paleta. */
  ambienteId: Id | null
  /** Entidad resaltada: la recién creada o aquella a la que llevó una advertencia. */
  resaltadoId: Id | null
  panelAdvertencias: boolean
  /** Plantilla que se está por insertar; abre el diálogo de inserción. */
  plantillaAInsertar: string | null
  insertarPlantilla(id: string | null): void
  elegirCircuito(id: Id | null): void
  elegirAmbiente(id: Id | null): void
  resaltar(id: Id | null | undefined): void
  alternarAdvertencias(): void
}

const DURACION_RESALTADO_MS = 3500

export const useUiStore = create<EstadoUi>()((set, get) => ({
  circuitoId: null,
  ambienteId: null,
  resaltadoId: null,
  panelAdvertencias: window.matchMedia('(min-width: 1280px)').matches,
  plantillaAInsertar: null,
  insertarPlantilla: (plantillaAInsertar) => set({ plantillaAInsertar }),
  elegirCircuito: (circuitoId) => set({ circuitoId }),
  elegirAmbiente: (ambienteId) => set({ ambienteId }),
  resaltar: (id) => {
    set({ resaltadoId: id ?? null })
    if (!id) return
    setTimeout(() => {
      if (get().resaltadoId === id) set({ resaltadoId: null })
    }, DURACION_RESALTADO_MS)
  },
  alternarAdvertencias: () => set((s) => ({ panelAdvertencias: !s.panelAdvertencias })),
}))
