import { describe, expect, it } from 'vitest'
import { aW, energiaMensualKWh } from '../calculo/potencia'
import { exportarProyecto, importarProyecto } from '../modelo/archivo'
import { construir, VA, W } from '../pruebas/constructor'
import { cargaDesdeCatalogo, CATALOGO_BASE, catalogoEfectivo, estaCorregido, nuevoArtefacto } from './catalogo'

const heladera = () => CATALOGO_BASE.find((a) => a.id === 'heladera')!

describe('catálogo', () => {
  it('la base carga, con ids únicos y todo marcado como del sistema', () => {
    expect(CATALOGO_BASE.length).toBeGreaterThan(20)
    expect(new Set(CATALOGO_BASE.map((a) => a.id)).size).toBe(CATALOGO_BASE.length)
    expect(CATALOGO_BASE.every((a) => a.origen === 'sistema')).toBe(true)
  })

  it('las correcciones del usuario pisan a la base y sus aparatos se suman al final', () => {
    const t = construir()
    expect(catalogoEfectivo(t.p)).toEqual(CATALOGO_BASE)

    t.p.catalogoPropio.heladera = { ...heladera(), potencia: { valor: 220, unidad: 'W' }, origen: 'usuario' }
    const propio = { ...nuevoArtefacto(), nombre: 'Soldadora' }
    t.p.catalogoPropio[propio.id] = propio

    const efectivo = catalogoEfectivo(t.p)
    expect(efectivo).toHaveLength(CATALOGO_BASE.length + 1)
    expect(efectivo.find((a) => a.id === 'heladera')?.potencia.valor).toBe(220)
    expect(efectivo.at(-1)?.nombre).toBe('Soldadora')
    expect(estaCorregido(t.p, 'heladera')).toBe(true)
    expect(estaCorregido(t.p, 'freezer')).toBe(false)
  })

  it('una carga copia los valores: cambiar el catálogo después no la toca', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const toma = t.boca(c, 'tomacorriente')
    const carga = cargaDesdeCatalogo(t.p, heladera(), toma)
    t.p.elementos[carga.id] = carga
    expect(carga).toMatchObject({ nombre: heladera().nombre, catalogoId: 'heladera', conectadaA: toma, potencia: heladera().potencia })

    t.p.catalogoPropio.heladera = { ...heladera(), potencia: { valor: 999, unidad: 'W' }, origen: 'usuario' }
    const existente = t.p.elementos[carga.id]
    expect(existente?.clase === 'carga' && existente.potencia.valor).toBe(heladera().potencia.valor)

    const nueva = cargaDesdeCatalogo(t.p, catalogoEfectivo(t.p).find((a) => a.id === 'heladera')!, toma)
    expect(nueva.potencia.valor).toBe(999)
    // La copia es propia: editar la carga tampoco cambia el catálogo.
    nueva.potencia.valor = 1
    expect(t.p.catalogoPropio.heladera.potencia.valor).toBe(999)
  })

  it('el catálogo propio viaja con el proyecto', () => {
    const t = construir()
    const propio = nuevoArtefacto()
    t.p.catalogoPropio[propio.id] = propio
    expect(importarProyecto(exportarProyecto(t.p))).toEqual({ ok: true, proyecto: t.p })
  })
})

describe('consumo mensual', () => {
  it('potencia activa × cantidad × horas por día × 30 días', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const toma = t.boca(c, 'tomacorriente')
    const id = t.carga(toma, W(150), { horasDia: 8, cantidad: 2 })
    const carga = t.p.elementos[id]!
    expect(carga.clase === 'carga' && energiaMensualKWh(carga, 1)).toBe(72)
  })

  it('de VA a W usa el factor de potencia', () => {
    expect(aW(VA(1000), 0.8)).toBe(800)
    expect(aW({ valor: 1000, unidad: 'VA', fp: 0.5 }, 0.8)).toBe(500)
    expect(aW(W(1000), 0.8)).toBe(1000)
  })

  it('sin horas cargadas la carga no suma consumo, y el total sale por circuito y por proyecto', () => {
    const t = construir()
    const tomas = t.circuito('TUG')
    const luces = t.circuito('IUG')
    const toma = t.boca(tomas, 'tomacorriente')
    t.carga(toma, W(1000), { horasDia: 2 })
    t.carga(toma, W(2000))
    t.carga(t.regleta(toma), W(100), { horasDia: 10 })
    t.carga(t.boca(luces, 'iluminacion'), W(10), { horasDia: 5, cantidad: 4 })

    const { circuitos, proyecto } = t.analizar().calculo
    expect(circuitos[tomas]?.energiaMensualKWh).toBe(90)
    expect(circuitos[luces]?.energiaMensualKWh).toBe(6)
    expect(proyecto.energiaMensualKWh).toBe(96)
  })
})
