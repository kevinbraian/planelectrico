import { describe, expect, it } from 'vitest'
import { nuevoDiferencial } from '../modelo/fabrica'
import { aea770 } from '../normas/aea-770-2017'
import { construir, VA } from '../pruebas/constructor'

describe('R01 · grado de electrificación', () => {
  it('sin superficie avisa que no puede determinarlo', () => {
    const [a] = construir().advertencias('R01')
    expect(a).toMatchObject({ severidad: 'aviso', id: expect.stringContaining('sin-superficie') })
  })

  it('en el límite de 60 m² sigue siendo mínimo', () => {
    const t = construir()
    t.ambiente('sala_estar', 60)
    expect(t.advertencias('R01')[0]).toMatchObject({ severidad: 'info', datos: { grado: 'minimo', superficieM2: 60 } })
  })

  it('apenas pasa de 60 m² es medio, y cita la tabla', () => {
    const t = construir()
    t.ambiente('sala_estar', 60.5)
    const [a] = t.advertencias('R01')
    expect(a?.datos.grado).toBe('medio')
    expect(a?.referencia).toMatchObject({ origen: 'norma', tabla: '770.7.I' })
  })
})

describe('R02 · cantidad mínima de circuitos', () => {
  const conCircuitos = (m2: number, tipos: string[]) => {
    const t = construir()
    t.ambiente('sala_estar', m2)
    for (const tipo of tipos) t.circuito(tipo)
    return t.advertencias('R02')
  }

  it('grado mínimo: un IUG y un TUG alcanzan', () => {
    expect(conCircuitos(50, ['IUG', 'TUG'])).toEqual([])
  })

  it('grado mínimo: falta el de tomacorrientes', () => {
    expect(conCircuitos(50, ['IUG'])[0]).toMatchObject({ severidad: 'error', datos: { minimo: 2, total: 1 } })
  })

  it('grado medio: valen las dos variantes', () => {
    expect(conCircuitos(100, ['IUG', 'IUG', 'TUG'])).toEqual([])
    expect(conCircuitos(100, ['IUG', 'TUG', 'TUG'])).toEqual([])
  })

  it('grado medio: tres circuitos que no forman ninguna variante', () => {
    expect(conCircuitos(100, ['IUG', 'IUG', 'IUG'])).toHaveLength(1)
    expect(conCircuitos(100, ['IUG', 'TUG'])).toHaveLength(1)
  })

  it('grado superior: el sexto circuito es de libre elección', () => {
    const cinco = ['IUG', 'IUG', 'TUG', 'TUG', 'TUG']
    expect(conCircuitos(250, cinco)).toHaveLength(1)
    expect(conCircuitos(250, [...cinco, 'TUE'])).toEqual([])
    expect(conCircuitos(250, [...cinco, 'ESPECIFICO'])).toEqual([])
  })

  it('sin superficie no opina', () => {
    const t = construir()
    t.circuito('IUG')
    expect(t.advertencias('R02')).toEqual([])
  })
})

describe('R09 · coeficiente de simultaneidad', () => {
  it('informa el coeficiente aplicado', () => {
    const t = construir()
    t.ambiente('sala_estar', 100)
    t.circuito('TUG')
    expect(t.advertencias('R09')[0]).toMatchObject({ severidad: 'info', datos: { coeficiente: 0.8, aplicado: 'sí' } })
  })

  it('informa cuando está desactivado', () => {
    const t = construir()
    t.ambiente('sala_estar', 100)
    t.circuito('TUG')
    t.p.opciones.aplicarSimultaneidad = false
    expect(t.advertencias('R09')[0]?.datos.aplicado).toBe('no')
  })

  it('sin circuitos no hay nada que informar', () => {
    const t = construir()
    t.ambiente('sala_estar', 100)
    expect(t.advertencias('R09')).toEqual([])
  })
})

describe('R12 · alcance de la norma', () => {
  const tablero = (t: ReturnType<typeof construir>) => Object.values(t.p.tableros)[0]!

  it('cabecera de 63 A: dentro del alcance', () => {
    const t = construir()
    tablero(t).cabecera = { tipo: 'PIA', inA: 63, polos: 2 }
    expect(t.advertencias('R12')).toEqual([])
  })

  it('cabecera de más de 63 A: fuera del alcance', () => {
    const t = construir()
    tablero(t).cabecera = { tipo: 'PIA', inA: 80, polos: 2 }
    expect(t.advertencias('R12')[0]).toMatchObject({ severidad: 'error', datos: { inA: 80, maximoA: 63 } })
  })

  it('un circuito de uso específico se informa, no se valida', () => {
    const t = construir()
    const c = t.circuito('ESPECIFICO', { inA: 40 })
    expect(t.advertencias('R12', c)[0]).toMatchObject({ severidad: 'info' })
    expect(t.advertencias('R04', c)).toEqual([])
    expect(t.advertencias('R03', c)).toEqual([])
  })

  it('un tipo que la norma no conoce es un error', () => {
    const t = construir()
    const c = t.circuito('TUG')
    t.p.circuitos[c]!.tipo = 'XYZ'
    expect(t.advertencias('R12', c)[0]).toMatchObject({ severidad: 'error', datos: { tipo: 'XYZ' } })
  })
})

describe('R13 · protecciones del tablero', () => {
  const tablero = (t: ReturnType<typeof construir>) => Object.values(t.p.tableros)[0]!

  it('avisa si la carga total supera la cabecera', () => {
    const t = construir()
    t.ambiente('sala_estar', 50)
    const c = t.circuito('TUG')
    t.carga(t.boca(c, 'tomacorriente'), VA(6600))
    tablero(t).cabecera = { tipo: 'PIA', inA: 25, polos: 2 }
    expect(t.advertencias('R13')[0]).toMatchObject({ severidad: 'aviso', datos: { corrienteA: 30, inA: 25 } })

    tablero(t).cabecera = { tipo: 'PIA', inA: 32, polos: 2 }
    expect(t.advertencias('R13')).toEqual([])
  })

  it('un diferencial de más de 30 mA no cuenta como protección complementaria', () => {
    const t = construir()
    const dif = { ...nuevoDiferencial(aea770), id: 'dif1' }
    tablero(t).diferenciales.push(dif)
    const c = t.circuito('TUG', { diferencialId: 'dif1' })
    expect(dif.sensibilidadMa).toBe(30)
    expect(t.advertencias('R13', c)).toEqual([])

    dif.sensibilidadMa = 300
    expect(t.advertencias('R13', c)[0]).toMatchObject({ severidad: 'aviso', datos: { sensibilidadMa: 300, maximaMa: 30 } })
  })
})
