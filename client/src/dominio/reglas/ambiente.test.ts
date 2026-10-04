import { describe, expect, it } from 'vitest'
import { construir } from '../pruebas/constructor'

/** Vivienda de grado medio (70 m² de sala) con un circuito de luces y uno de tomas. */
function casaMedia() {
  const t = construir()
  t.ambiente('sala_estar', 70)
  return { t, luces: t.circuito('IUG'), tomas: t.circuito('TUG') }
}

describe('R07 · puntos mínimos de utilización', () => {
  it('cocina completa: 2 de luz, 3 bocas de tomas y 5 módulos', () => {
    const { t, luces, tomas } = casaMedia()
    const cocina = t.ambiente('cocina', 9)
    t.bocas(luces, 'iluminacion', 2, cocina)
    t.boca(tomas, 'tomacorriente', cocina, { tomas: { cantidad: 2, corrienteA: 10 } })
    t.boca(tomas, 'tomacorriente', cocina, { tomas: { cantidad: 2, corrienteA: 10 } })
    t.boca(tomas, 'tomacorriente', cocina)
    expect(t.advertencias('R07', cocina)).toEqual([])
  })

  it('cocina con las bocas justas pero sin los módulos para artefactos fijos', () => {
    const { t, luces, tomas } = casaMedia()
    const cocina = t.ambiente('cocina', 9)
    t.bocas(luces, 'iluminacion', 2, cocina)
    t.bocas(tomas, 'tomacorriente', 3, cocina)
    const [a] = t.advertencias('R07', cocina)
    expect(a).toMatchObject({ severidad: 'error', datos: { tipo: 'TUG', modulos: 3, modulosMinimos: 5 } })
    expect(t.advertencias('R07', cocina)).toHaveLength(1)
  })

  it('faltan bocas: dice cuántas y de qué tipo, y cita la tabla', () => {
    const { t, luces, tomas } = casaMedia()
    const cocina = t.ambiente('cocina', 9)
    t.boca(luces, 'iluminacion', cocina)
    t.boca(tomas, 'tomacorriente', cocina)
    const porTipo = Object.fromEntries(t.advertencias('R07', cocina).map((a) => [a.id.split(':').at(-1), a.datos]))
    expect(porTipo.IUG).toEqual({ tipo: 'IUG', tiene: 1, minimo: 2 })
    expect(porTipo.TUG).toEqual({ tipo: 'TUG', tiene: 1, minimo: 3 })
    expect(t.advertencias('R07', cocina)[0]?.referencia).toMatchObject({ tabla: '770.7.III', pagina: 16 })
  })

  it('una boca mixta no cuenta como boca de tomas ni de luz', () => {
    const { t, luces, tomas } = casaMedia()
    const dormitorio = t.ambiente('dormitorio', 12)
    t.boca(luces, 'iluminacion', dormitorio)
    t.bocas(tomas, 'tomacorriente', 2, dormitorio)
    t.boca(luces, 'mixta', dormitorio)
    expect(t.advertencias('R07', dormitorio)[0]?.datos).toEqual({ tipo: 'TUG', tiene: 2, minimo: 3 })
  })

  it('los tomas de un circuito de uso especial no cuentan para el mínimo de uso general', () => {
    const { t, luces } = casaMedia()
    const especial = t.circuito('TUE')
    const bano = t.ambiente('bano', 4)
    t.boca(luces, 'iluminacion', bano)
    t.boca(especial, 'tomacorriente', bano)
    expect(t.advertencias('R07', bano)[0]?.datos).toEqual({ tipo: 'TUG', tiene: 0, minimo: 1 })
  })

  it('toilette: el toma puede estar en el circuito de iluminación', () => {
    const { t, luces } = casaMedia()
    const toilette = t.ambiente('toilette', 2)
    t.boca(luces, 'iluminacion', toilette)
    expect(t.advertencias('R07', toilette)).toHaveLength(1)
    t.boca(luces, 'mixta', toilette)
    expect(t.advertencias('R07', toilette)).toEqual([])
  })

  it('pasillo sin largo: avisa que falta el dato', () => {
    const { t, luces } = casaMedia()
    const pasillo = t.ambiente('pasillo_cubierto', 4)
    t.boca(luces, 'iluminacion', pasillo)
    expect(t.advertencias('R07', pasillo).map((a) => a.severidad)).toEqual(['aviso'])

    t.p.ambientes[pasillo]!.largoM = 6
    expect(t.advertencias('R07', pasillo).map((a) => a.datos)).toEqual([
      { tipo: 'IUG', tiene: 1, minimo: 2 },
      { tipo: 'TUG', tiene: 0, minimo: 2 },
    ])
  })

  it('dormitorio de más de 36 m² en una vivienda chica: agrega la nota', () => {
    const { t, luces, tomas } = casaMedia()
    const dormitorio = t.ambiente('dormitorio', 40)
    t.bocas(luces, 'iluminacion', 2, dormitorio)
    t.bocas(tomas, 'tomacorriente', 3, dormitorio)
    expect(t.advertencias('R07', dormitorio).map((a) => a.severidad)).toEqual(['info'])
  })

  it('un uso que la norma no conoce se avisa y no se verifica', () => {
    const { t } = casaMedia()
    const quincho = t.ambiente('sala_estar', 20, { uso: 'quincho' })
    expect(t.advertencias('R07', quincho)[0]).toMatchObject({ severidad: 'aviso', datos: { uso: 'quincho' } })
  })

  it('sin superficie no hay grado, y sin grado no hay puntos mínimos', () => {
    const t = construir()
    t.ambiente('cocina', 0)
    expect(t.advertencias('R07')).toEqual([])
  })
})
