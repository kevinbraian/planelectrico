import { describe, expect, it } from 'vitest'
import { construir, VA, W } from '../pruebas/constructor'

describe('R10 · capacidad de tomas, regletas y mandos', () => {
  it('carga unitaria de 10 A en un circuito de uso general: en el límite', () => {
    const t = construir()
    const c = t.circuito('TUG')
    t.carga(t.boca(c, 'tomacorriente'), VA(2200))
    expect(t.advertencias('R10')).toEqual([])
  })

  it('carga unitaria de más de 10 A en un circuito de uso general', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const carga = t.carga(t.boca(c, 'tomacorriente'), VA(2400))
    const avisos = t.advertencias('R10', carga)
    expect(avisos[0]).toMatchObject({
      severidad: 'error',
      datos: { corrienteA: 10.91, maximoA: 10 },
      referencia: { origen: 'norma', clausula: '770.6.6' },
    })
  })

  it('la misma carga entra en un circuito de uso especial', () => {
    const t = construir()
    const c = t.circuito('TUE')
    t.carga(t.boca(c, 'tomacorriente'), VA(2400))
    expect(t.advertencias('R10')).toEqual([])
  })

  it('varias unidades chicas no son una carga unitaria grande', () => {
    const t = construir()
    const c = t.circuito('IUG')
    t.carga(t.boca(c, 'iluminacion'), VA(60), { cantidad: 50 })
    expect(t.advertencias('R10')).toEqual([])
  })

  it('regleta sobrecargada: supera su capacidad y la del toma', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const regleta = t.regleta(t.boca(c, 'tomacorriente'), { corrienteA: 10 })
    for (let i = 0; i < 3; i++) t.carga(regleta, VA(1000))
    const avisos = t.advertencias('R10', regleta)
    expect(avisos.map((a) => a.id.split(':').at(-1))).toEqual(['capacidad', 'toma'])
    expect(avisos[0]).toMatchObject({
      severidad: 'error',
      datos: { corrienteA: 13.64, capacidadA: 10 },
      referencia: { origen: 'producto' },
    })
    expect(avisos[1]?.referencia).toMatchObject({ origen: 'norma' })
  })

  it('si una sola cosa enchufada ya supera al toma, no repite el aviso sobre la boca', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const boca = t.boca(c, 'tomacorriente')
    const regleta = t.regleta(boca, { corrienteA: 16 })
    t.carga(regleta, VA(1500))
    t.carga(regleta, VA(1500))
    expect(t.advertencias('R10', regleta).map((a) => a.id.split(':').at(-1))).toEqual(['toma'])
    expect(t.advertencias('R10', boca)).toEqual([])
  })

  it('regleta dentro de su capacidad', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const regleta = t.regleta(t.boca(c, 'tomacorriente'), { corrienteA: 10 })
    t.carga(regleta, VA(1100))
    t.carga(regleta, VA(1100))
    expect(t.advertencias('R10')).toEqual([])
  })

  it('la capacidad de la regleta también puede venir en watts', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const regleta = t.regleta(t.boca(c, 'tomacorriente'), W(1100))
    t.carga(regleta, VA(1200))
    expect(t.advertencias('R10', regleta)[0]?.datos).toEqual({ corrienteA: 5.45, capacidadA: 5 })
  })

  it('una regleta enchufada a un alargue carga a los dos', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const alargue = t.regleta(t.boca(c, 'tomacorriente'), { corrienteA: 6 })
    const regleta = t.regleta(alargue, { corrienteA: 10 })
    t.carga(regleta, VA(1000))
    t.carga(regleta, VA(1000))
    expect(t.advertencias('R10', regleta)).toEqual([])
    expect(t.advertencias('R10', alargue)[0]?.datos).toEqual({ corrienteA: 9.09, capacidadA: 6 })
  })

  it('boca con dos tomas: avisa si lo conectado supera la suma', () => {
    const t = construir()
    const c = t.circuito('TUG', { inA: 20, seccionMm2: 4 })
    const boca = t.boca(c, 'tomacorriente', null, { tomas: { cantidad: 2, corrienteA: 10 } })
    t.carga(boca, VA(2000))
    t.carga(boca, VA(2000))
    expect(t.advertencias('R10', boca)).toEqual([])
    t.carga(boca, VA(1000))
    expect(t.advertencias('R10', boca)[0]).toMatchObject({ severidad: 'aviso', datos: { corrienteA: 22.73, capacidadA: 20 } })
  })

  it('mando con capacidad propia', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const luz = t.boca(c, 'iluminacion')
    t.carga(luz, W(400))
    const sensor = t.mando(c, 'sensor_movimiento', [luz], { capacidadMax: W(300) })
    expect(t.advertencias('R10', sensor)[0]).toMatchObject({ severidad: 'error', datos: { cargaVA: 400, capacidadVA: 300 } })

    t.p.elementos[sensor] = { ...t.p.elementos[sensor]!, capacidadMax: W(400) } as never
    expect(t.advertencias('R10', sensor)).toEqual([])
  })
})

describe('R11 · tomacorrientes por caja', () => {
  const conCaja = (caja: 'rectangular' | 'cuadrada' | 'octogonal', cantidad: number) => {
    const t = construir()
    const c = t.circuito('TUG')
    t.boca(c, 'tomacorriente', null, { caja, tomas: { cantidad, corrienteA: 10 } })
    return t.advertencias('R11')
  }

  it('caja rectangular: hasta 2', () => {
    expect(conCaja('rectangular', 2)).toEqual([])
    expect(conCaja('rectangular', 3)[0]).toMatchObject({ severidad: 'error', datos: { tomas: 3, maximo: 2 } })
  })

  it('caja cuadrada: hasta 4', () => {
    expect(conCaja('cuadrada', 4)).toEqual([])
    expect(conCaja('cuadrada', 5)[0]?.referencia).toMatchObject({ clausula: '770.7.1 a)', pagina: 11 })
  })

  it('si la norma no fija un máximo para esa caja, no opina', () => {
    expect(conCaja('octogonal', 6)).toEqual([])
  })
})
