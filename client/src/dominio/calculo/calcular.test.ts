import { describe, expect, it } from 'vitest'
import { construir, VA, W } from '../pruebas/constructor'

// Valores esperados calculados a mano con aea-770.json: 60 VA por boca, 2/3,
// 2200 VA por TUG, 3300 VA por TUE, 220 V y coeficientes 1 / 0,8 / 0,7 / 0,6.

describe('demanda de un circuito', () => {
  it('iluminación sin tomas: 2/3 de 60 VA por boca', () => {
    const t = construir()
    const c = t.circuito('IUG')
    t.bocas(c, 'iluminacion', 15)
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.bocas).toBe(15)
    expect(r.dpms.valor).toBe(600)
    expect(r.ib.valor).toBe(2.73)
    expect(r.tieneTomasDerivadas).toBe(false)
  })

  it('iluminación con una boca mixta pasa a "con tomas derivados"', () => {
    const t = construir()
    const c = t.circuito('IUG')
    t.bocas(c, 'iluminacion', 4)
    t.boca(c, 'mixta')
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.tieneTomasDerivadas).toBe(true)
    expect(r.bocas).toBe(5)
    expect(r.dpms.valor).toBe(2200)
    expect(r.seccionMinima?.valor).toBe(2.5)
  })

  it('tomas: el mínimo manda mientras la carga conocida sea menor', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const b = t.boca(c, 'tomacorriente')
    t.carga(b, VA(900))
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.cargaConocidaVA).toBe(900)
    expect(r.dpms.valor).toBe(2200)
    expect(r.ib.valor).toBe(10)
    expect(r.dpms.pasos).toHaveLength(3)
  })

  it('tomas: si la carga conocida supera el mínimo, se usa la carga', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const b = t.boca(c, 'tomacorriente')
    t.carga(b, VA(2000))
    t.carga(b, VA(1300))
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.dpms.valor).toBe(3300)
    expect(r.ib.valor).toBe(15)
  })

  it('uso especial: 3300 VA como mínimo', () => {
    const t = construir()
    const c = t.circuito('TUE')
    expect(t.analizar().calculo.circuitos[c]!.dpms.valor).toBe(3300)
  })

  it('uso específico: sin mínimo, vale la demanda cargada a mano', () => {
    const t = construir()
    const c = t.circuito('ESPECIFICO', { demandaManualVA: 3000 })
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.dpmsMinima).toBeUndefined()
    expect(r.dpms.valor).toBe(3000)
  })
})

describe('cargas', () => {
  it('pasa de W a VA con el factor de potencia y aplica el factor de uso solo a la demanda', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const b = t.boca(c, 'tomacorriente')
    t.carga(b, W(1000, 0.8), { factorUso: 0.5 })
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.potenciaInstaladaVA).toBe(1250)
    expect(r.cargaConocidaVA).toBe(625)
  })

  it('sin factor de potencia propio usa el del proyecto', () => {
    const t = construir()
    t.p.opciones.fpPorDefecto = 0.5
    const c = t.circuito('TUG')
    t.carga(t.boca(c, 'tomacorriente'), W(100))
    expect(t.analizar().calculo.circuitos[c]!.potenciaInstaladaVA).toBe(200)
  })

  it('multiplica por la cantidad y suma lo que cuelga de una regleta', () => {
    const t = construir()
    const c = t.circuito('TUG')
    const b = t.boca(c, 'tomacorriente')
    const regleta = t.regleta(b)
    t.carga(regleta, VA(100), { cantidad: 3 })
    t.carga(regleta, VA(200))
    const { cargas, circuitos } = t.analizar().calculo
    expect(cargas[regleta]).toEqual({ va: 500, a: 2.27 })
    expect(cargas[b]?.va).toBe(500)
    expect(circuitos[c]!.potenciaInstaladaVA).toBe(500)
  })

  it('un mando suma lo que hay en las bocas que comanda', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const [a, b] = t.bocas(c, 'iluminacion', 2)
    t.carga(a!, VA(50))
    t.carga(b!, VA(70))
    const m = t.mando(c, 'interruptor', [a!, b!])
    expect(t.analizar().calculo.cargas[m]?.va).toBe(120)
  })
})

describe('conteo de bocas', () => {
  it('los mandos no son bocas', () => {
    const t = construir()
    const c = t.circuito('IUG')
    const luces = t.bocas(c, 'iluminacion', 3)
    t.mando(c, 'interruptor', luces)
    t.mando(c, 'conmutador', luces)
    const r = t.analizar().calculo.circuitos[c]!
    expect(r.bocas).toBe(3)
    expect(r.mandos).toBe(2)
  })

  it('hasta 4 tomas en el tablero cuentan como una boca', () => {
    const t = construir()
    const c = t.circuito('TUG')
    t.boca(c, 'tomacorriente', null, { caja: 'en_tablero', tomas: { cantidad: 4, corrienteA: 10 } })
    t.boca(c, 'tomacorriente', null, { caja: 'en_tablero', tomas: { cantidad: 5, corrienteA: 10 } })
    expect(t.analizar().calculo.circuitos[c]!.bocas).toBe(3)
  })
})

describe('carga total', () => {
  it('grado medio: suma los circuitos y aplica 0,8', () => {
    const t = construir()
    t.ambiente('sala_estar', 100)
    const i1 = t.circuito('IUG')
    const i2 = t.circuito('IUG')
    t.bocas(i1, 'iluminacion', 5)
    t.bocas(i2, 'iluminacion', 5)
    t.circuito('TUG')
    const { proyecto } = t.analizar().calculo
    expect(proyecto.grado?.valor.id).toBe('medio')
    expect(proyecto.dpmsGeneralSinCoeficienteVA).toBe(2600)
    expect(proyecto.coeficienteAplicado).toBe(0.8)
    expect(proyecto.cargaTotal.valor).toBe(2080)
    expect(proyecto.corrienteTotal.valor).toBe(9.45)
    expect(proyecto.circuitosPorTipo).toEqual({ IUG: 2, TUG: 1 })
  })

  it('el coeficiente no toca los circuitos de uso específico y se puede desactivar', () => {
    const t = construir()
    t.ambiente('sala_estar', 100)
    t.circuito('TUG')
    t.circuito('ESPECIFICO', { demandaManualVA: 1000 })
    expect(t.analizar().calculo.proyecto.cargaTotal.valor).toBe(2760)

    t.p.opciones.aplicarSimultaneidad = false
    expect(t.analizar().calculo.proyecto.cargaTotal.valor).toBe(3200)
  })

  it('la superficie computable suma la mitad de lo semicubierto e ignora lo descubierto', () => {
    const t = construir()
    t.ambiente('sala_estar', 50)
    t.ambiente('balcon_galeria_semicubierto', 30)
    t.ambiente('balcon_galeria_semicubierto', 40, { cerramiento: 'descubierto' })
    const { proyecto } = t.analizar().calculo
    expect(proyecto.superficie.valor).toBe(65)
    expect(proyecto.grado?.valor.id).toBe('medio')
  })

  it('la superficie cargada a mano reemplaza a la de los ambientes', () => {
    const t = construir()
    t.ambiente('sala_estar', 50)
    t.p.superficieManual = { cubiertaM2: 180, semicubiertaM2: 0 }
    expect(t.analizar().calculo.proyecto.grado?.valor.id).toBe('elevado')
  })
})
