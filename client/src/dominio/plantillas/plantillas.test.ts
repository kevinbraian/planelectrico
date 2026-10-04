import { describe, expect, it } from 'vitest'
import { exportarProyecto, importarProyecto } from '../modelo/archivo'
import { verificarIntegridad } from '../modelo/integridad'
import type { Elemento, Id, Proyecto } from '../modelo/tipos'
import { aea770 } from '../normas/aea-770-2017'
import { construir } from '../pruebas/constructor'
import { buscarPlantilla, PLANTILLAS_DEL_SISTEMA } from './biblioteca'
import { conductoresPorFuncion, guardarComoPropia, insertar, insertarEn, quitarGrupo } from './insertar'
import type { PlantillaCircuito } from './tipos'
import { validarPlantilla } from './validar'

const plantilla = (id: string): PlantillaCircuito => PLANTILLAS_DEL_SISTEMA.find((x) => x.id === id)!

const contar = (p: Proyecto, grupoId: Id) => {
  const propios = Object.values(p.elementos).filter((e) => e.grupoId === grupoId)
  return {
    bocas: propios.filter((e) => e.clase === 'boca').length,
    mandos: propios.filter((e) => e.clase === 'mando').length,
  }
}

const comandaDe = (e: Elemento | undefined) => (e?.clase === 'mando' ? e.comanda : undefined)

describe('biblioteca del sistema', () => {
  it('trae las plantillas pedidas', () => {
    expect(PLANTILLAS_DEL_SISTEMA.map((x) => x.id)).toEqual([
      'punto-y-toma',
      'punto-y-toma-misma-caja',
      'combinacion-2-puntos',
      'combinacion-cruzamiento',
      'fotocelula',
      'sensor-movimiento',
      'automatico-escalera',
    ])
  })

  it.each(PLANTILLAS_DEL_SISTEMA.map((x) => [x.id, x] as const))('%s es coherente', (_id, x) => {
    expect(validarPlantilla(x)).toEqual([])
  })

  it('detecta referencias rotas', () => {
    const rota = structuredClone(plantilla('combinacion-2-puntos'))
    rota.redes[0]!.une = ['@otro.L', 'conmA.X']
    rota.roles[0]!.cantidad = { parametro: 'no-existe' }
    const problemas = validarPlantilla(rota).join(' ')
    expect(problemas).toMatch(/ranura "otro"/)
    expect(problemas).toMatch(/borne "X"/)
    expect(problemas).toMatch(/parámetro "no-existe"/)
    expect(problemas).toMatch(/borne "C" de "conmA" no está conectado/)
  })
})

describe('insertar', () => {
  it('combinación de 2 puntos: una boca, dos conmutadores que la manejan y cuatro conductores de efecto', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const x = plantilla('combinacion-2-puntos')
    const r = insertarEn(t.p, aea770, x, { circuitos: { c } })
    if (!r.ok) throw new Error(r.errores.join(' '))

    expect(contar(t.p, r.grupo.id)).toEqual({ bocas: 1, mandos: 2 })
    const [luz] = r.grupo.roles.luz!
    expect(comandaDe(t.p.elementos[r.grupo.roles.conmA![0]!])).toEqual([luz])
    expect(comandaDe(t.p.elementos[r.grupo.roles.conmB![0]!])).toEqual([luz])
    expect(t.p.elementos[r.grupo.roles.conmA![0]!]?.nombre).toBe('Conmutador A')
    expect(conductoresPorFuncion(x)).toEqual({ alimentacion_efecto: 1, viajero: 2, retorno: 1, neutro: 1, pe: 1 })

    // El circuito se recalcula: los conmutadores no son bocas.
    expect(t.analizar().calculo.circuitos[c]).toMatchObject({ bocas: 1, mandos: 2 })
    expect(verificarIntegridad(t.p)).toEqual([])
  })

  it('cruzamiento: los viajeros crecen con cada punto intermedio', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const x = plantilla('combinacion-cruzamiento')
    const r = insertarEn(t.p, aea770, x, { circuitos: { c }, parametros: { luces: 2, cruces: 3 } })
    if (!r.ok) throw new Error(r.errores.join(' '))

    expect(contar(t.p, r.grupo.id)).toEqual({ bocas: 2, mandos: 5 })
    expect(conductoresPorFuncion(x, { cruces: 1 }).viajero).toBe(4)
    expect(conductoresPorFuncion(x, { cruces: 3 }).viajero).toBe(8)
    for (const id of [...r.grupo.roles.cruce!, ...r.grupo.roles.conmA!, ...r.grupo.roles.conmB!]) {
      expect(comandaDe(t.p.elementos[id])).toEqual(r.grupo.roles.luz)
    }
  })

  it('punto y toma: toca dos circuitos', () => {
    const t = construir()
    const luz = t.circuito('IUG')
    const toma = t.circuito('TUG')
    const r = insertarEn(t.p, aea770, plantilla('punto-y-toma'), { circuitos: { luz, toma } })
    if (!r.ok) throw new Error(r.errores.join(' '))

    const { circuitos } = t.analizar().calculo
    expect(circuitos[luz]).toMatchObject({ bocas: 1, mandos: 1, tieneTomasDerivadas: false })
    expect(circuitos[toma]).toMatchObject({ bocas: 1 })
    expect(comandaDe(t.p.elementos[r.grupo.roles.interruptor![0]!])).toEqual(r.grupo.roles.luz)
  })

  it('punto y toma en la misma caja: el circuito pasa a iluminación con tomas derivados', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const r = insertarEn(t.p, aea770, plantilla('punto-y-toma-misma-caja'), { circuitos: { c } })
    expect(r.ok).toBe(true)
    expect(t.analizar().calculo.circuitos[c]).toMatchObject({ bocas: 2, tieneTomasDerivadas: true })
    expect(t.advertencias('R06', c)).toHaveLength(1)
  })

  it('automático de escalera: pulsadores y automático manejan todas las luces', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const r = insertarEn(t.p, aea770, plantilla('automatico-escalera'), { circuitos: { c }, parametros: { luces: 3, pulsadores: 4 } })
    if (!r.ok) throw new Error(r.errores.join(' '))
    expect(contar(t.p, r.grupo.id)).toEqual({ bocas: 3, mandos: 5 })
    for (const id of [...r.grupo.roles.pulsador!, ...r.grupo.roles.automatico!]) {
      expect(comandaDe(t.p.elementos[id])).toEqual(r.grupo.roles.luz)
    }
  })

  it.each(['fotocelula', 'sensor-movimiento'])('%s: un mando y sus luces', (id) => {
    const t = construir()
    const c = t.circuito('IUG')
    const r = insertarEn(t.p, aea770, plantilla(id), { circuitos: { c }, parametros: { luces: 2 } })
    if (!r.ok) throw new Error(r.errores.join(' '))
    expect(contar(t.p, r.grupo.id)).toEqual({ bocas: 2, mandos: 1 })
  })

  it('el ambiente elegido se aplica a todo lo creado', () => {
    const t = construir()
    const escalera = t.ambiente('escalera_rampa', 4)
    const c = t.circuito('IUG')
    const r = insertarEn(t.p, aea770, plantilla('combinacion-2-puntos'), { circuitos: { c }, ambienteId: escalera })
    if (!r.ok) throw new Error(r.errores.join(' '))
    const creados = Object.values(t.p.elementos).filter((e) => e.grupoId === r.grupo.id)
    expect(creados.every((e) => e.ambienteId === escalera)).toBe(true)
  })
})

describe('combinar', () => {
  it('enlaza un rol a una boca que ya existe en vez de crear otra', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const luz = t.boca(c, 'iluminacion')
    const r = insertarEn(t.p, aea770, plantilla('sensor-movimiento'), { circuitos: { c }, enlazar: { luz: [luz] } })
    if (!r.ok) throw new Error(r.errores.join(' '))

    expect(t.analizar().calculo.circuitos[c]?.bocas).toBe(1)
    expect(comandaDe(t.p.elementos[r.grupo.roles.sensor![0]!])).toEqual([luz])
    expect(t.p.elementos[luz]?.grupoId).toBeUndefined()
  })

  it('dos plantillas en el mismo circuito suman sus bocas', () => {
    const t = construir()
    const c = t.circuito('IUG')
    insertarEn(t.p, aea770, plantilla('combinacion-2-puntos'), { circuitos: { c }, parametros: { luces: 2 } })
    insertarEn(t.p, aea770, plantilla('fotocelula'), { circuitos: { c }, parametros: { luces: 3 } })
    expect(t.analizar().calculo.circuitos[c]).toMatchObject({ bocas: 5, mandos: 3 })
    expect(Object.keys(t.p.grupos)).toHaveLength(2)
  })

  it('quitar un grupo borra lo que creó y deja lo enlazado', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const luz = t.boca(c, 'iluminacion')
    const r = insertarEn(t.p, aea770, plantilla('fotocelula'), { circuitos: { c }, enlazar: { luz: [luz] } })
    if (!r.ok) throw new Error(r.errores.join(' '))
    quitarGrupo(t.p, r.grupo.id)
    expect(Object.keys(t.p.elementos)).toEqual([luz])
    expect(t.p.grupos).toEqual({})
    expect(verificarIntegridad(t.p)).toEqual([])
  })
})

describe('errores de inserción', () => {
  it('no cambia el proyecto y dice qué falta', () => {
    const t = construir()
    const tomas = t.circuito('TUG')
    const antes = structuredClone(t.p)

    const sinCircuito = insertarEn(t.p, aea770, plantilla('combinacion-2-puntos'), { circuitos: {} })
    const tipoEquivocado = insertarEn(t.p, aea770, plantilla('combinacion-2-puntos'), { circuitos: { c: tomas } })
    const fueraDeRango = insertarEn(t.p, aea770, plantilla('combinacion-2-puntos'), { circuitos: { c: tomas }, parametros: { luces: 99 } })

    expect(sinCircuito).toMatchObject({ ok: false })
    expect(!tipoEquivocado.ok && tipoEquivocado.errores[0]).toMatch(/necesita un circuito IUG/)
    expect(!fueraDeRango.ok && fueraDeRango.errores.join(' ')).toMatch(/entre 1 y 6/)
    expect(t.p).toEqual(antes)
  })

  it('la versión pura no toca el proyecto original', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const antes = structuredClone(t.p)
    const r = insertar(t.p, aea770, plantilla('fotocelula'), { circuitos: { c } })
    expect(t.p).toEqual(antes)
    expect(r.ok && Object.keys(r.proyecto.elementos)).toHaveLength(2)
  })
})

describe('plantillas propias', () => {
  it('se guardan en el proyecto y sobreviven a exportar e importar', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const base = plantilla('automatico-escalera')
    const r = insertarEn(t.p, aea770, base, { circuitos: { c }, parametros: { luces: 4, pulsadores: 3 } })
    if (!r.ok) throw new Error(r.errores.join(' '))

    const propia = guardarComoPropia(t.p, base, r.grupo, 'Escalera de casa')
    expect(propia).toMatchObject({ origen: 'usuario', nombre: 'Escalera de casa' })
    expect(propia.parametros.map((x) => x.porDefecto)).toEqual([4, 3])
    expect(validarPlantilla(propia)).toEqual([])

    const leido = importarProyecto(exportarProyecto(t.p))
    expect(leido).toEqual({ ok: true, proyecto: t.p })
    if (!leido.ok) return
    const recuperada = buscarPlantilla(leido.proyecto, propia.id)!
    const otro = insertarEn(leido.proyecto, aea770, recuperada, { circuitos: { c } })
    expect(otro.ok && contar(leido.proyecto, otro.grupo.id)).toEqual({ bocas: 4, mandos: 4 })
  })
})
