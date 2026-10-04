import { describe, expect, it } from 'vitest'
import { construir, VA } from '../pruebas/constructor'

describe('R03 · máximo de bocas por circuito', () => {
  it('15 bocas: en el límite', () => {
    const t = construir()
    const c = t.circuito('IUG')
    t.bocas(c, 'iluminacion', 15)
    expect(t.advertencias('R03')).toEqual([])
  })

  it('16 bocas: se pasa', () => {
    const t = construir()
    const c = t.circuito('TUG')
    t.bocas(c, 'tomacorriente', 16)
    expect(t.advertencias('R03')[0]).toMatchObject({
      severidad: 'error',
      objetivo: { tipo: 'circuito', id: c },
      datos: { bocas: 16, maximo: 15 },
      referencia: { tabla: '770.6.I' },
    })
  })

  it('los interruptores no cuentan', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const luces = t.bocas(c, 'iluminacion', 15)
    for (const luz of luces.slice(0, 6)) t.mando(c, 'interruptor', [luz])
    expect(t.advertencias('R03')).toEqual([])
  })
})

describe('R04 · calibre máximo de la protección', () => {
  it.each([
    ['IUG', 16],
    ['TUG', 20],
    ['TUE', 32],
  ])('%s admite hasta %s A', (tipo, max) => {
    const t = construir()
    const c = t.circuito(tipo, { inA: max })
    expect(t.advertencias('R04')).toEqual([])
    t.p.circuitos[c]!.proteccion.inA = max + 1
    expect(t.advertencias('R04')[0]).toMatchObject({ severidad: 'error', datos: { inA: max + 1, maximoA: max } })
  })
})

describe('R05 · coordinación Ib ≤ In ≤ Iz', () => {
  it('1,5 mm² con térmica de 10 A: bien', () => {
    const t = construir()
    t.circuito('IUG', { inA: 10, seccionMm2: 1.5 })
    expect(t.advertencias('R05')).toEqual([])
  })

  it('1,5 mm² con térmica de 16 A: la térmica no protege al conductor', () => {
    const t = construir()
    t.circuito('IUG', { inA: 16, seccionMm2: 1.5 })
    const [a] = t.advertencias('R05')
    expect(a).toMatchObject({ severidad: 'error', datos: { inA: 16, izA: 15 }, referencia: { clausula: '770.15.2.1' } })
    expect(a?.id).toMatch(/:iz$/)
  })

  it('In igual a Iz: en el límite', () => {
    const t = construir()
    t.circuito('TUG', { inA: 21, seccionMm2: 2.5 })
    expect(t.advertencias('R05')).toEqual([])
  })

  it('2,5 mm² con 20 A deja de alcanzar si comparte la cañería', () => {
    const t = construir()
    const c = t.circuito('TUG', { inA: 20, seccionMm2: 2.5 })
    expect(t.advertencias('R05')).toEqual([])

    t.p.circuitos[c]!.conductor.circuitosEnLaCaneria = 2
    expect(t.advertencias('R05')[0]).toMatchObject({ datos: { inA: 20, izA: 16.8 } })

    t.p.circuitos[c]!.proteccion.inA = 16
    expect(t.advertencias('R05')).toEqual([])
  })

  it('la demanda supera a la térmica', () => {
    const t = construir()
    const c = t.circuito('TUG', { inA: 20, seccionMm2: 4 })
    t.carga(t.boca(c, 'tomacorriente'), VA(5000))
    const [a] = t.advertencias('R05')
    expect(a).toMatchObject({ severidad: 'error', datos: { ibA: 22.73, inA: 20 } })
    expect(a?.id).toMatch(/:ib$/)
  })

  it('Ib igual a In: en el límite', () => {
    const t = construir()
    t.circuito('TUG', { inA: 10, seccionMm2: 2.5 })
    expect(t.advertencias('R05')).toEqual([])
  })

  it('si la tabla no cubre el caso avisa que no pudo verificar', () => {
    const t = construir()
    t.circuito('TUG', { inA: 16, seccionMm2: 3 })
    t.circuito('TUG', { inA: 16, seccionMm2: 2.5, enLaCaneria: 4 })
    expect(t.advertencias('R05').map((a) => [a.severidad, a.datos.falta])).toEqual([
      ['aviso', 'seccion'],
      ['aviso', 'agrupamiento'],
    ])
  })
})

describe('R06 · sección mínima', () => {
  it('iluminación: 1,5 mm² alcanza, 1 mm² no', () => {
    const t = construir()
    const c = t.circuito('IUG', { inA: 10, seccionMm2: 1.5 })
    expect(t.advertencias('R06')).toEqual([])
    t.p.circuitos[c]!.conductor.seccionMm2 = 1
    expect(t.advertencias('R06')[0]).toMatchObject({
      severidad: 'error',
      datos: { seccionMm2: 1, minimoMm2: 1.5 },
      referencia: { tabla: '770.11.I' },
    })
  })

  it('iluminación con un toma derivado pide 2,5 mm²', () => {
    const t = construir()
    const c = t.circuito('IUG', { inA: 10, seccionMm2: 1.5 })
    t.boca(c, 'mixta')
    expect(t.advertencias('R06')[0]?.datos).toEqual({ seccionMm2: 1.5, minimoMm2: 2.5 })
  })

  it('tomas: 2,5 mm² como mínimo', () => {
    const t = construir()
    const c = t.circuito('TUG', { inA: 10, seccionMm2: 2.5 })
    expect(t.advertencias('R06')).toEqual([])
    t.p.circuitos[c]!.conductor.seccionMm2 = 1.5
    expect(t.advertencias('R06')).toHaveLength(1)
  })
})

describe('R08 · demanda del circuito', () => {
  const conCarga = (va: number) => {
    const t = construir()
    const c = t.circuito('TUG')
    t.carga(t.boca(c, 'tomacorriente'), VA(va))
    return t.advertencias('R08')
  }

  it('por debajo o igual al mínimo no dice nada', () => {
    expect(conCarga(1000)).toEqual([])
    expect(conCarga(2200)).toEqual([])
  })

  it('por encima del mínimo informa que usa la carga real', () => {
    expect(conCarga(3000)[0]).toMatchObject({ severidad: 'info', datos: { conocidaVA: 3000, minimaVA: 2200 } })
  })
})
