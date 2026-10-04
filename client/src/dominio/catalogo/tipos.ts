import type { Id, Potencia, TipoCarga } from '../modelo/tipos'

/** Un aparato del catálogo. Sus potencias son orientativas, no normativas. */
export interface ArtefactoCatalogo {
  id: Id
  nombre: string
  categoria: string
  tipo: TipoCarga
  potencia: Potencia
  factorUso?: number
  horasDia?: number
  origen: 'sistema' | 'usuario'
}
