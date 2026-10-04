import { ordenar } from '@/dominio/modelo/consultas'
import { ETIQUETA_CARGA, ETIQUETA_MANDO } from '@/dominio/modelo/etiquetas'
import type { TipoCarga, TipoMando } from '@/dominio/modelo/tipos'
import { useAnalisis } from '@/estado/analisis'
import type { Opcion } from '@/ui/Campos'

/** Arma las opciones de un selector a partir de un mapa valor → etiqueta. */
export const opcionesDe = <T extends string>(etiquetas: Record<T, string>): Opcion<T>[] =>
  (Object.keys(etiquetas) as T[]).map((valor) => ({ valor, etiqueta: etiquetas[valor] }))

export const TIPOS_MANDO = opcionesDe<TipoMando>(ETIQUETA_MANDO)
export const TIPOS_CARGA = opcionesDe<TipoCarga>(ETIQUETA_CARGA)
export const UNIDADES: Opcion<'W' | 'VA'>[] = [
  { valor: 'W', etiqueta: 'W' },
  { valor: 'VA', etiqueta: 'VA' },
]

/** Opciones de ambiente para una boca o un mando. */
export function useOpcionesDeAmbiente(): Opcion<string>[] {
  const { proyecto } = useAnalisis()
  return [
    { valor: '', etiqueta: 'Sin ambiente' },
    ...ordenar(Object.values(proyecto.ambientes)).map((a) => ({ valor: a.id, etiqueta: a.nombre })),
  ]
}
