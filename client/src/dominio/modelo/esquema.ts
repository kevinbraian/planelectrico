import { z } from 'zod'
import type { ArtefactoCatalogo } from '../catalogo/tipos'
import type { PlantillaCircuito } from '../plantillas/tipos'
import { ESQUEMA_ACTUAL, type Elemento, type Proyecto } from './tipos'

/**
 * Validación de un proyecto que viene de afuera (archivo importado o
 * localStorage). Cada esquema está tipado contra la interfaz de tipos.ts, así
 * el compilador avisa si se desfasan.
 */

const id = z.string().min(1)
const positivo = z.number().positive()
const noNegativo = z.number().nonnegative()
const polos = z.union([z.literal(2), z.literal(4)])

const potencia = z.object({
  valor: noNegativo,
  unidad: z.enum(['W', 'VA']),
  fp: z.number().positive().max(1).optional(),
})

const tomas = z.object({ cantidad: z.number().int().positive(), corrienteA: positivo })
const usoBoca = z.enum(['iluminacion', 'tomacorriente', 'mixta', 'conexion_fija'])
const caja = z.enum(['rectangular', 'cuadrada', 'octogonal', 'en_tablero'])
const tipoMando = z.enum([
  'interruptor',
  'conmutador',
  'cruzamiento',
  'pulsador',
  'atenuador',
  'sensor_movimiento',
  'fotocelula',
  'temporizador',
  'automatico_escalera',
])
const tipoCarga = z.enum(['luminaria', 'artefacto', 'ventilador', 'motor', 'fuente_mbt'])
const funcionRed = z.enum(['linea', 'neutro', 'pe', 'alimentacion_efecto', 'retorno', 'viajero', 'mando'])

const elementoBase = {
  id,
  orden: z.number(),
  nombre: z.string().optional(),
  ambienteId: id.nullable(),
  grupoId: id.optional(),
  rol: z.string().optional(),
  posicion: z.object({ plantaId: id, x: z.number(), y: z.number() }).optional(),
}

const elemento: z.ZodType<Elemento> = z.discriminatedUnion('clase', [
  z.object({
    ...elementoBase,
    clase: z.literal('boca'),
    circuitoId: id,
    uso: usoBoca,
    tomas: tomas.optional(),
    caja: caja.optional(),
    alturaM: noNegativo.optional(),
  }),
  z.object({
    ...elementoBase,
    clase: z.literal('mando'),
    circuitoId: id,
    tipo: tipoMando,
    comanda: z.array(id),
    capacidadMax: potencia.optional(),
    consumoPropio: potencia.optional(),
  }),
  z.object({
    ...elementoBase,
    clase: z.literal('carga'),
    tipo: tipoCarga,
    conectadaA: id,
    catalogoId: id.optional(),
    potencia,
    cantidad: z.number().int().positive(),
    factorUso: z.number().min(0).max(1).optional(),
    horasDia: z.number().min(0).max(24).optional(),
  }),
  z.object({
    ...elementoBase,
    clase: z.literal('contenedor'),
    tipo: z.enum(['regleta', 'alargue', 'adaptador']),
    conectadaA: id,
    capacidadMax: z.union([potencia, z.object({ corrienteA: positivo })]),
  }),
])

const plantilla: z.ZodType<PlantillaCircuito> = z.object({
  id,
  version: z.number().int().positive(),
  origen: z.enum(['sistema', 'usuario']),
  nombre: z.string(),
  descripcion: z.string(),
  ranuras: z.array(z.object({ id, etiqueta: z.string().optional(), tiposAdmitidos: z.array(z.string()) })),
  parametros: z.array(
    z.object({ id, etiqueta: z.string(), min: z.number().int(), max: z.number().int(), porDefecto: z.number().int() }),
  ),
  roles: z.array(
    z.object({
      id,
      etiqueta: z.string(),
      ranura: z.string(),
      cantidad: z.union([z.number().int().positive(), z.object({ parametro: z.string() })]),
      elemento: z.discriminatedUnion('clase', [
        z.object({ clase: z.literal('boca'), uso: usoBoca, tomas: tomas.optional(), caja: caja.optional() }),
        z.object({ clase: z.literal('mando'), tipo: tipoMando }),
      ]),
      bornes: z.array(z.string()),
      serie: z.object({ funcion: funcionRed, pares: z.array(z.tuple([z.string(), z.string()])).min(1) }).optional(),
    }),
  ),
  redes: z.array(z.object({ id, funcion: funcionRed, une: z.array(z.string()).min(2) })),
})

const artefacto: z.ZodType<ArtefactoCatalogo> = z.object({
  id,
  nombre: z.string(),
  categoria: z.string(),
  tipo: tipoCarga,
  potencia,
  factorUso: z.number().min(0).max(1).optional(),
  horasDia: z.number().min(0).max(24).optional(),
  origen: z.enum(['sistema', 'usuario']),
})

export const esquemaProyecto: z.ZodType<Proyecto> = z.object({
  esquema: z.literal(ESQUEMA_ACTUAL),
  id,
  nombre: z.string(),
  creadoEn: z.string(),
  modificadoEn: z.string(),
  modo: z.enum(['proyecto_nuevo', 'relevamiento']),
  norma: z.object({ id: z.string(), edicion: z.string() }),
  suministro: z.object({ sistema: z.enum(['monofasico', 'trifasico']) }),
  superficieManual: z.object({ cubiertaM2: noNegativo, semicubiertaM2: noNegativo }).optional(),
  opciones: z.object({ aplicarSimultaneidad: z.boolean(), fpPorDefecto: z.number().positive().max(1) }),
  plantas: z.record(id, z.object({ id, nombre: z.string(), orden: z.number() })),
  ambientes: z.record(
    id,
    z.object({
      id,
      plantaId: id,
      nombre: z.string(),
      orden: z.number(),
      uso: z.string(),
      superficieM2: noNegativo,
      cerramiento: z.enum(['cubierto', 'semicubierto', 'descubierto']),
      largoM: noNegativo.optional(),
      geometria: z.object({ puntos: z.array(z.tuple([z.number(), z.number()])) }).optional(),
    }),
  ),
  tableros: z.record(
    id,
    z.object({
      id,
      nombre: z.string(),
      tipo: z.enum(['principal', 'seccional']),
      orden: z.number(),
      alimentadoDesdeTableroId: id.optional(),
      ambienteId: id.optional(),
      cabecera: z.object({ tipo: z.enum(['PIA', 'seccionador', 'diferencial']), inA: positivo, polos }).optional(),
      diferenciales: z.array(z.object({ id, inA: positivo, sensibilidadMa: positivo, polos })),
    }),
  ),
  circuitos: z.record(
    id,
    z.object({
      id,
      tableroId: id,
      orden: z.number(),
      nombre: z.string(),
      tipo: z.string(),
      proteccion: z.object({ inA: positivo, polos, curva: z.enum(['B', 'C', 'D']).optional(), diferencialId: id.optional() }),
      conductor: z.object({
        seccionMm2: positivo,
        seccionPEMm2: positivo.optional(),
        metodo: z.string(),
        circuitosEnLaCaneria: z.number().int().positive(),
        longitudM: noNegativo.optional(),
      }),
      fase: z.enum(['L1', 'L2', 'L3']).optional(),
      demandaManualVA: noNegativo.optional(),
      notas: z.string().optional(),
    }),
  ),
  elementos: z.record(id, elemento),
  grupos: z.record(
    id,
    z.object({
      id,
      plantillaId: z.string(),
      plantillaVersion: z.number().int().positive(),
      nombre: z.string(),
      parametros: z.record(z.string(), z.union([z.number(), z.string()])),
      circuitos: z.record(z.string(), id),
      roles: z.record(z.string(), z.array(id)),
    }),
  ),
  plantillasPropias: z.record(z.string(), plantilla),
  catalogoPropio: z.record(id, artefacto),
})

export const esquemaPlantilla = plantilla
export const esquemaArtefacto = artefacto
