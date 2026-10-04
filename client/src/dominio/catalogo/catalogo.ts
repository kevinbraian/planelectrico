import { z } from 'zod'
import { esquemaArtefacto } from '../modelo/esquema'
import { nuevaCarga, nuevoId } from '../modelo/fabrica'
import type { Carga, Id, Proyecto } from '../modelo/tipos'
import datos from './artefactos.base.json'
import type { ArtefactoCatalogo } from './tipos'

/**
 * Catálogo de aparatos. La base trae potencias orientativas; el usuario puede
 * corregirlas o sumar los suyos, y eso se guarda dentro del proyecto. Una
 * carga copia los valores al crearse: editar el catálogo después no la cambia.
 */

export const NOTA_DEL_CATALOGO = 'Las potencias del catálogo son orientativas. Lo que vale es la chapa de cada aparato.'

export const CATALOGO_BASE: ArtefactoCatalogo[] = z
  .array(esquemaArtefacto)
  .parse(datos.artefactos.map((a) => ({ ...a, origen: 'sistema' })))

/** La base con las correcciones del usuario encima, más los aparatos que agregó. */
export function catalogoEfectivo(p: Proyecto): ArtefactoCatalogo[] {
  const deLaBase = new Set(CATALOGO_BASE.map((a) => a.id))
  const base = CATALOGO_BASE.map((a) => p.catalogoPropio[a.id] ?? a)
  const propios = Object.values(p.catalogoPropio).filter((a) => !deLaBase.has(a.id))
  return [...base, ...propios]
}

export const esDeLaBase = (id: Id): boolean => CATALOGO_BASE.some((a) => a.id === id)

/** true si el usuario cambió un aparato de la base. */
export const estaCorregido = (p: Proyecto, id: Id): boolean => esDeLaBase(id) && p.catalogoPropio[id] !== undefined

export function nuevoArtefacto(): ArtefactoCatalogo {
  return {
    id: `propio-${nuevoId()}`,
    nombre: 'Aparato nuevo',
    categoria: 'Otros',
    tipo: 'artefacto',
    potencia: { valor: 100, unidad: 'W' },
    origen: 'usuario',
  }
}

/** Una carga con los valores del catálogo copiados: de ahí en más es independiente. */
export function cargaDesdeCatalogo(p: Proyecto, artefacto: ArtefactoCatalogo, conectadaA: Id): Carga {
  const carga: Carga = {
    ...nuevaCarga(p, conectadaA, artefacto.tipo),
    nombre: artefacto.nombre,
    catalogoId: artefacto.id,
    potencia: { ...artefacto.potencia },
  }
  if (artefacto.factorUso !== undefined) carga.factorUso = artefacto.factorUso
  if (artefacto.horasDia !== undefined) carga.horasDia = artefacto.horasDia
  return carga
}
