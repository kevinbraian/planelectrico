import {
  ArrowLeftRight,
  Bath,
  BedDouble,
  BookOpen,
  Cable,
  CircleDot,
  CircuitBoard,
  ClipboardList,
  Clock,
  CookingPot,
  DoorOpen,
  Fan,
  Fence,
  Footprints,
  Library,
  Lightbulb,
  Map,
  Plug,
  PlugZap,
  Power,
  Radar,
  Refrigerator,
  Server,
  Shuffle,
  SlidersHorizontal,
  Sofa,
  Sun,
  Timer,
  ToggleLeft,
  Unplug,
  Warehouse,
  WashingMachine,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TipoCarga, TipoContenedor, TipoMando, UsoBoca } from '@/dominio/modelo/tipos'

/** Íconos genéricos de lucide. La simbología eléctrica propia llega con el unifilar. */

export const ICONO_USO_BOCA: Record<UsoBoca, LucideIcon> = {
  iluminacion: Lightbulb,
  tomacorriente: Plug,
  mixta: PlugZap,
  conexion_fija: Cable,
}

export const ICONO_MANDO: Record<TipoMando, LucideIcon> = {
  interruptor: ToggleLeft,
  conmutador: ArrowLeftRight,
  cruzamiento: Shuffle,
  pulsador: CircleDot,
  atenuador: SlidersHorizontal,
  sensor_movimiento: Radar,
  fotocelula: Sun,
  temporizador: Timer,
  automatico_escalera: Clock,
}

export const ICONO_CARGA: Record<TipoCarga, LucideIcon> = {
  luminaria: Lightbulb,
  artefacto: Refrigerator,
  ventilador: Fan,
  motor: Power,
  fuente_mbt: Server,
}

export const ICONO_CONTENEDOR: Record<TipoContenedor, LucideIcon> = {
  regleta: Unplug,
  alargue: Cable,
  adaptador: Plug,
}

const ICONO_USO_AMBIENTE: Record<string, LucideIcon> = {
  sala_estar: Sofa,
  dormitorio: BedDouble,
  cocina: CookingPot,
  kitchinette: CookingPot,
  bano: Bath,
  toilette: Bath,
  vestibulo_garaje_hall: Warehouse,
  pasillo_cubierto: DoorOpen,
  lavadero: WashingMachine,
  balcon_galeria_semicubierto: Fence,
  escalera_rampa: Footprints,
}

export const iconoDeAmbiente = (uso: string): LucideIcon => ICONO_USO_AMBIENTE[uso] ?? DoorOpen

export interface Pestana {
  id: string
  etiqueta: string
  icono: LucideIcon
  /** Fase del plan en la que se habilita; sin fase, ya está disponible. */
  fase?: number
}

export const PESTANAS: Pestana[] = [
  { id: 'ambientes', etiqueta: 'Ambientes', icono: DoorOpen },
  { id: 'tablero', etiqueta: 'Tablero', icono: CircuitBoard },
  { id: 'circuitos', etiqueta: 'Circuitos', icono: Zap },
  { id: 'resumen', etiqueta: 'Resumen', icono: ClipboardList },
  { id: 'biblioteca', etiqueta: 'Biblioteca', icono: Library },
  { id: 'catalogo', etiqueta: 'Catálogo', icono: BookOpen },
  { id: 'unifilar', etiqueta: 'Unifilar', icono: Workflow, fase: 4 },
  { id: 'plano', etiqueta: 'Plano', icono: Map, fase: 5 },
]
