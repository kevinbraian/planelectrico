import {
  nuevaBoca,
  nuevaCarga,
  nuevoAmbiente,
  nuevoCircuito,
  nuevoContenedor,
  nuevoDiferencial,
  nuevoMando,
} from '@/dominio/modelo/fabrica'
import { borrarAmbiente, borrarCircuito, borrarDiferencial, borrarElemento } from '@/dominio/modelo/operaciones'
import type {
  Ambiente,
  Boca,
  Carga,
  Circuito,
  Contenedor,
  Id,
  Mando,
  Proyecto,
  Tablero,
  TipoCarga,
  TipoContenedor,
  TipoMando,
  UsoBoca,
} from '@/dominio/modelo/tipos'
import { cargaDesdeCatalogo, catalogoEfectivo } from '@/dominio/catalogo/catalogo'
import type { ArtefactoCatalogo } from '@/dominio/catalogo/tipos'
import type { Normativa } from '@/dominio/normas/contrato'
import { buscarPlantilla } from '@/dominio/plantillas/biblioteca'
import { guardarComoPropia, insertarEn, quitarGrupo, type OpcionesDeInsercion, type ResultadoDeInsercion } from '@/dominio/plantillas/insertar'
import type { PlantillaCircuito } from '@/dominio/plantillas/tipos'
import { editar, useProyectoStore } from './proyectoStore'

/**
 * Lo que la interfaz puede hacerle al proyecto abierto. Cada función es un
 * paso de deshacer. Las que crean algo devuelven su id, para resaltarlo.
 */

function abierto(): Proyecto {
  const { proyecto } = useProyectoStore.getState()
  if (!proyecto) throw new Error('No hay un proyecto abierto.')
  return proyecto
}

export const actualizarProyecto = editar

// --- Ambientes -------------------------------------------------------------------

export function agregarAmbiente(norma: Normativa, uso: string): Id {
  const ambiente = nuevoAmbiente(abierto(), norma, uso)
  editar((p) => {
    p.ambientes[ambiente.id] = ambiente
  })
  return ambiente.id
}

export function actualizarAmbiente(id: Id, receta: (a: Ambiente) => void): void {
  editar((p) => {
    const a = p.ambientes[id]
    if (a) receta(a)
  })
}

export const quitarAmbiente = (id: Id) => editar((p) => borrarAmbiente(p, id))

// --- Tablero ---------------------------------------------------------------------

export function actualizarTablero(id: Id, receta: (t: Tablero) => void): void {
  editar((p) => {
    const t = p.tableros[id]
    if (t) receta(t)
  })
}

export function agregarDiferencial(norma: Normativa, tableroId: Id): void {
  const diferencial = nuevoDiferencial(norma)
  actualizarTablero(tableroId, (t) => {
    t.diferenciales.push(diferencial)
  })
}

export const quitarDiferencial = (tableroId: Id, diferencialId: Id) =>
  editar((p) => borrarDiferencial(p, tableroId, diferencialId))

// --- Circuitos -------------------------------------------------------------------

export function agregarCircuito(norma: Normativa, tipo: string, tableroId?: Id): Id {
  const circuito = nuevoCircuito(abierto(), norma, tipo, tableroId)
  editar((p) => {
    p.circuitos[circuito.id] = circuito
  })
  return circuito.id
}

export function actualizarCircuito(id: Id, receta: (c: Circuito) => void): void {
  editar((p) => {
    const c = p.circuitos[id]
    if (c) receta(c)
  })
}

export const quitarCircuito = (id: Id) => editar((p) => borrarCircuito(p, id))

// --- Elementos -------------------------------------------------------------------

export function agregarBoca(norma: Normativa, circuitoId: Id, uso: UsoBoca, ambienteId: Id | null): Id | undefined {
  const p = abierto()
  const circuito = p.circuitos[circuitoId]
  if (!circuito) return undefined
  const boca = nuevaBoca(p, norma, circuito, uso, ambienteId)
  editar((d) => {
    d.elementos[boca.id] = boca
  })
  return boca.id
}

/** Al pasar a tomacorriente o mixta la boca gana sus tomas; al volver a luz, los pierde. */
export function cambiarUsoDeBoca(norma: Normativa, id: Id, uso: UsoBoca): void {
  editar((p) => {
    const boca = p.elementos[id]
    const circuito = boca?.clase === 'boca' ? p.circuitos[boca.circuitoId] : undefined
    if (boca?.clase !== 'boca' || !circuito) return
    const modelo = nuevaBoca(p, norma, circuito, uso, boca.ambienteId)
    boca.uso = uso
    if (modelo.tomas) {
      boca.tomas ??= modelo.tomas
      boca.caja ??= modelo.caja
    } else {
      delete boca.tomas
      delete boca.caja
    }
  })
}

export function agregarMando(circuitoId: Id, tipo: TipoMando, ambienteId: Id | null): Id {
  const mando = nuevoMando(abierto(), circuitoId, tipo, ambienteId)
  editar((p) => {
    p.elementos[mando.id] = mando
  })
  return mando.id
}

export function agregarCarga(conectadaA: Id, tipo: TipoCarga): Id {
  const carga = nuevaCarga(abierto(), conectadaA, tipo)
  editar((p) => {
    p.elementos[carga.id] = carga
  })
  return carga.id
}

export function agregarContenedor(conectadaA: Id, tipo: TipoContenedor): Id {
  const contenedor = nuevoContenedor(abierto(), conectadaA, tipo)
  editar((p) => {
    p.elementos[contenedor.id] = contenedor
  })
  return contenedor.id
}

function actualizarElemento<T extends Boca | Mando | Carga | Contenedor>(clase: T['clase']) {
  return (id: Id, receta: (e: T) => void) =>
    editar((p) => {
      const e = p.elementos[id]
      if (e?.clase === clase) receta(e as T)
    })
}

export const actualizarBoca = actualizarElemento<Boca>('boca')
export const actualizarMando = actualizarElemento<Mando>('mando')
export const actualizarCarga = actualizarElemento<Carga>('carga')
export const actualizarContenedor = actualizarElemento<Contenedor>('contenedor')

export const quitarElemento = (id: Id) => editar((p) => borrarElemento(p, id))

// --- Plantillas ------------------------------------------------------------------

/** Inserta una plantilla en el proyecto abierto. Si hay errores, el proyecto no cambia. */
export function insertarPlantilla(norma: Normativa, plantilla: PlantillaCircuito, opciones: OpcionesDeInsercion): ResultadoDeInsercion {
  let resultado: ResultadoDeInsercion = { ok: false, errores: ['No hay un proyecto abierto.'] }
  editar((p) => {
    resultado = insertarEn(p, norma, plantilla, opciones)
  })
  return resultado
}

export const quitarGrupoDePlantilla = (grupoId: Id) => editar((p) => quitarGrupo(p, grupoId))

export function guardarGrupoComoPlantilla(grupoId: Id, nombre: string): void {
  editar((p) => {
    const grupo = p.grupos[grupoId]
    const plantilla = grupo && buscarPlantilla(p, grupo.plantillaId)
    if (grupo && plantilla) guardarComoPropia(p, plantilla, grupo, nombre)
  })
}

export const borrarPlantillaPropia = (id: string) =>
  editar((p) => {
    delete p.plantillasPropias[id]
  })

// --- Catálogo --------------------------------------------------------------------

/** Suma a una boca o a una regleta una carga con los valores del catálogo copiados. */
export function agregarCargaDelCatalogo(artefactoId: Id, conectadaA: Id): Id | undefined {
  const p = abierto()
  const artefacto = catalogoEfectivo(p).find((a) => a.id === artefactoId)
  if (!artefacto) return undefined
  const carga = cargaDesdeCatalogo(p, artefacto, conectadaA)
  editar((d) => {
    d.elementos[carga.id] = carga
  })
  return carga.id
}

/** Guarda un aparato propio o la corrección de uno de la base. No toca las cargas ya creadas. */
export const guardarArtefacto = (artefacto: ArtefactoCatalogo) =>
  editar((p) => {
    p.catalogoPropio[artefacto.id] = { ...artefacto, origen: 'usuario' }
  })

/** Borra un aparato propio, o deshace la corrección de uno de la base. */
export const quitarArtefacto = (id: Id) =>
  editar((p) => {
    delete p.catalogoPropio[id]
  })
