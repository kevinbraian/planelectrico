import { bocaDe, esBoca, esCarga, esContenedor, esMando } from './consultas'
import type {
  Caja,
  Cerramiento,
  Elemento,
  Proyecto,
  TipoCarga,
  TipoContenedor,
  TipoMando,
  UsoBoca,
} from './tipos'

/** Nombres en castellano de los valores del modelo, para mensajes e interfaz. */

export const ETIQUETA_USO_BOCA: Record<UsoBoca, string> = {
  iluminacion: 'Punto de luz',
  tomacorriente: 'Tomacorriente',
  mixta: 'Mixta (interruptor + toma)',
  conexion_fija: 'Conexión fija',
}

export const ETIQUETA_MANDO: Record<TipoMando, string> = {
  interruptor: 'Interruptor',
  conmutador: 'Conmutador (combinación)',
  cruzamiento: 'Cruzamiento',
  pulsador: 'Pulsador',
  atenuador: 'Atenuador',
  sensor_movimiento: 'Sensor de movimiento',
  fotocelula: 'Fotocélula',
  temporizador: 'Temporizador',
  automatico_escalera: 'Automático de escalera',
}

export const ETIQUETA_CARGA: Record<TipoCarga, string> = {
  luminaria: 'Luminaria',
  artefacto: 'Artefacto',
  ventilador: 'Ventilador',
  motor: 'Motor',
  fuente_mbt: 'Fuente de muy baja tensión',
}

export const ETIQUETA_CONTENEDOR: Record<TipoContenedor, string> = {
  regleta: 'Regleta / zapatilla',
  alargue: 'Alargue',
  adaptador: 'Adaptador / triple',
}

export const ETIQUETA_CAJA: Record<Caja, string> = {
  rectangular: 'Rectangular (5×10)',
  cuadrada: 'Cuadrada (10×10)',
  octogonal: 'Octogonal',
  en_tablero: 'En el tablero',
}

export const ETIQUETA_CERRAMIENTO: Record<Cerramiento, string> = {
  cubierto: 'Cubierto',
  semicubierto: 'Semicubierto',
  descubierto: 'Descubierto',
}

export function etiquetaDeElemento(e: Elemento): string {
  if (e.nombre) return e.nombre
  if (esBoca(e)) return ETIQUETA_USO_BOCA[e.uso]
  if (esMando(e)) return ETIQUETA_MANDO[e.tipo]
  if (esCarga(e)) return ETIQUETA_CARGA[e.tipo]
  return ETIQUETA_CONTENEDOR[e.tipo]
}

/** "Tomacorriente (Cocina)": el elemento con el ambiente donde está. */
export function describirElemento(p: Proyecto, e: Elemento): string {
  const ambienteId = e.ambienteId ?? (esCarga(e) || esContenedor(e) ? bocaDe(p, e)?.ambienteId : null)
  const ambiente = ambienteId ? p.ambientes[ambienteId]?.nombre : undefined
  return ambiente ? `${etiquetaDeElemento(e)} (${ambiente})` : etiquetaDeElemento(e)
}
