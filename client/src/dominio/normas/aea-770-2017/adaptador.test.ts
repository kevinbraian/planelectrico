import { describe, expect, it } from 'vitest'
import datos from './aea-770.json'
import { esquemaAea770 } from './esquema'
import { aea770 as n } from './index'

// Los valores esperados salen de aea-770.json: si el archivo cambia, estos tests avisan.

describe('datos de la norma', () => {
  it('respetan el esquema', () => {
    expect(esquemaAea770.safeParse(datos).success).toBe(true)
  })

  it('rechazan una clave mal escrita en vez de ignorarla', () => {
    const roto = structuredClone(datos) as unknown as { pmu: { ambientes: { sala_estar: { todos: { IUG: object } } } } }
    roto.pmu.ambientes.sala_estar.todos.IUG = { porm2: 18 }
    expect(esquemaAea770.safeParse(roto).success).toBe(false)
  })

  it('toda respuesta lleva la cita de la norma', () => {
    const citas = [
      n.alimentacion().ref,
      n.superficieComputable({ cubiertaM2: 1, semicubiertaM2: 0 }).ref,
      n.grado(50)?.ref,
      n.circuitosMinimos('medio')?.ref,
      n.tipoCircuito('IUG')?.ref,
      n.puntosMinimos({ uso: 'cocina', gradoId: 'medio', superficieM2: 9 })?.ref,
      n.dpmsMinimaVA({ tipo: 'TUG', bocas: 3, tieneTomasDerivadas: false })?.ref,
      n.coefSimultaneidad('medio')?.ref,
      n.seccionMinimaMm2({ tipo: 'TUG', tieneTomasDerivadas: false })?.ref,
    ]
    for (const ref of citas) {
      expect(ref).toMatchObject({ origen: 'norma', norma: 'AEA 90364-7-770' })
    }
  })
})

describe('grado de electrificación', () => {
  it('suma la mitad de la superficie semicubierta', () => {
    expect(n.superficieComputable({ cubiertaM2: 80, semicubiertaM2: 20 }).valor).toBe(90)
  })

  it.each([
    [60, 'minimo'],
    [60.01, 'medio'],
    [130, 'medio'],
    [130.5, 'elevado'],
    [200, 'elevado'],
    [200.1, 'superior'],
  ])('%s m² → %s', (m2, grado) => {
    expect(n.grado(m2)?.valor.id).toBe(grado)
  })

  it('no hay grado sin superficie', () => {
    expect(n.grado(0)).toBeUndefined()
  })

  it('circuitos mínimos y variantes', () => {
    expect(n.circuitosMinimos('minimo')?.valor).toEqual({
      total: 2,
      variantes: [{ id: 'unica', libre: 0, porTipo: { IUG: 1, TUG: 1 } }],
    })
    expect(n.circuitosMinimos('superior')?.valor.variantes).toEqual([
      { id: 'a', libre: 1, porTipo: { IUG: 2, TUG: 3 } },
      { id: 'b', libre: 1, porTipo: { IUG: 3, TUG: 2 } },
    ])
  })
})

describe('tipos de circuito', () => {
  it('límites por tipo', () => {
    expect(n.tipoCircuito('IUG')?.valor).toMatchObject({ maxBocas: 15, maxProteccionA: 16, cargaUnitariaMaxA: 10, clase: 'iluminacion', admiteTomasDerivadas: true })
    expect(n.tipoCircuito('TUG')?.valor).toMatchObject({ maxBocas: 15, maxProteccionA: 20, clase: 'tomacorriente', admiteTomasDerivadas: false })
    expect(n.tipoCircuito('TUE')?.valor).toMatchObject({ maxProteccionA: 32, cargaUnitariaMaxA: 20 })
  })

  it('el uso específico queda fuera del alcance', () => {
    expect(n.tipoCircuito('ESPECIFICO')?.valor).toMatchObject({ enAlcance: false, clase: 'especifico' })
    expect(n.tipoCircuito('ESPECIFICO')?.valor.maxBocas).toBeUndefined()
  })
})

describe('puntos mínimos de utilización', () => {
  const pmu = (uso: string, gradoId: string, superficieM2: number, largoM?: number) =>
    n.puntosMinimos({ uso, gradoId, superficieM2, largoM })?.valor

  it('sala de estar: por superficie, con mínimo', () => {
    expect(pmu('sala_estar', 'medio', 25)?.porTipo).toEqual({ IUG: 2, TUG: 5 })
    expect(pmu('sala_estar', 'medio', 10)?.porTipo).toEqual({ IUG: 1, TUG: 2 })
    expect(pmu('sala_estar', 'medio', 36)?.porTipo).toEqual({ IUG: 2, TUG: 6 })
  })

  it('dormitorio: la fila depende de la superficie', () => {
    expect(pmu('dormitorio', 'medio', 9.9)?.porTipo).toEqual({ IUG: 1, TUG: 2 })
    expect(pmu('dormitorio', 'medio', 10)?.porTipo).toEqual({ IUG: 1, TUG: 3 })
    expect(pmu('dormitorio', 'medio', 36)?.porTipo).toEqual({ IUG: 1, TUG: 3 })
    expect(pmu('dormitorio', 'elevado', 36.5)?.porTipo).toEqual({ IUG: 2, TUG: 3 })
  })

  it('dormitorio de más de 36 m² en una vivienda chica: avisa que usa otro grado', () => {
    const r = pmu('dormitorio', 'medio', 40)
    expect(r?.porTipo).toEqual({ IUG: 2, TUG: 3 })
    expect(r?.notas).toHaveLength(1)
    expect(pmu('dormitorio', 'elevado', 40)?.notas).toHaveLength(0)
  })

  it('cocina: bocas y módulos por grado', () => {
    expect(pmu('cocina', 'minimo', 8)).toMatchObject({ porTipo: { IUG: 1, TUG: 3 }, modulosFijos: 2 })
    expect(pmu('cocina', 'medio', 8)).toMatchObject({ porTipo: { IUG: 2, TUG: 3 }, modulosFijos: 2 })
    expect(pmu('cocina', 'elevado', 8)).toMatchObject({ porTipo: { IUG: 2, TUG: 3 }, modulosFijos: 3 })
    expect(pmu('cocina', 'superior', 8)).toMatchObject({ porTipo: { IUG: 2, TUG: 4 }, modulosFijos: 3 })
  })

  it('vestíbulo: fijo en grado mínimo, por superficie en el resto', () => {
    expect(pmu('vestibulo_garaje_hall', 'minimo', 25)?.porTipo).toEqual({ IUG: 1, TUG: 1 })
    expect(pmu('vestibulo_garaje_hall', 'medio', 25)?.porTipo).toEqual({ IUG: 3, TUG: 3 })
  })

  it('pasillo: por metro lineal', () => {
    expect(pmu('pasillo_cubierto', 'minimo', 4, 6)?.porTipo).toEqual({ IUG: 2, TUG: 0 })
    expect(pmu('pasillo_cubierto', 'medio', 4, 6)?.porTipo).toEqual({ IUG: 2, TUG: 2 })
    expect(pmu('pasillo_cubierto', 'medio', 2, 2)?.porTipo).toEqual({ IUG: 1, TUG: 0 })
  })

  it('pasillo sin largo cargado: lo señala y exige el mínimo', () => {
    const r = pmu('pasillo_cubierto', 'medio', 4)
    expect(r?.faltaLargo).toBe(true)
    expect(r?.porTipo.IUG).toBe(1)
  })

  it('lavadero y baño', () => {
    expect(pmu('lavadero', 'minimo', 4)?.porTipo).toEqual({ IUG: 1, TUG: 1 })
    expect(pmu('lavadero', 'elevado', 4)?.porTipo).toEqual({ IUG: 1, TUG: 2 })
    expect(pmu('bano', 'medio', 4)?.porTipo).toEqual({ IUG: 1, TUG: 1 })
  })

  it('toilette: como el baño, y el toma puede ir en iluminación', () => {
    const r = pmu('toilette', 'medio', 2)
    expect(r?.porTipo).toEqual({ IUG: 1, TUG: 1 })
    expect(r?.tomaPuedeIrEnIluminacion).toBe(true)
    expect(pmu('bano', 'medio', 4)?.tomaPuedeIrEnIluminacion).toBe(false)
  })

  it('balcón, escalera y kitchinette', () => {
    expect(pmu('balcon_galeria_semicubierto', 'medio', 6, 7)?.porTipo).toEqual({ IUG: 2, TUG: 0 })
    expect(pmu('escalera_rampa', 'medio', 3, 4)?.porTipo).toEqual({ IUG: 1, TUG: 0 })
    expect(pmu('kitchinette', 'medio', 0)).toMatchObject({ porTipo: { IUG: 1, TUG: 2 }, modulosFijos: 1 })
  })

  it('los usos que ve el usuario agrupan las filas de dormitorio', () => {
    const usos = n.usosDeAmbiente()
    expect(usos.filter((u) => u.id.startsWith('dormitorio'))).toEqual([
      { id: 'dormitorio', nombre: 'Dormitorio', nombreCorto: 'Dormitorio', pideLargo: false },
    ])
    expect(usos.find((u) => u.id === 'pasillo_cubierto')?.pideLargo).toBe(true)
    expect(usos.find((u) => u.id === 'cocina')?.pideLargo).toBe(false)
  })

  it('uso desconocido', () => {
    expect(pmu('quincho', 'medio', 10)).toBeUndefined()
  })
})

describe('demanda', () => {
  it('mínimos por circuito', () => {
    expect(n.dpmsMinimaVA({ tipo: 'IUG', bocas: 15, tieneTomasDerivadas: false })?.valor).toBe(600)
    expect(n.dpmsMinimaVA({ tipo: 'IUG', bocas: 9, tieneTomasDerivadas: false })?.valor).toBe(360)
    expect(n.dpmsMinimaVA({ tipo: 'IUG', bocas: 9, tieneTomasDerivadas: true })?.valor).toBe(2200)
    expect(n.dpmsMinimaVA({ tipo: 'TUG', bocas: 1, tieneTomasDerivadas: false })?.valor).toBe(2200)
    expect(n.dpmsMinimaVA({ tipo: 'TUE', bocas: 1, tieneTomasDerivadas: false })?.valor).toBe(3300)
    expect(n.dpmsMinimaVA({ tipo: 'ESPECIFICO', bocas: 1, tieneTomasDerivadas: false })).toBeUndefined()
  })

  it.each([
    ['minimo', 1],
    ['medio', 0.8],
    ['elevado', 0.7],
    ['superior', 0.6],
  ])('coeficiente de simultaneidad del grado %s', (grado, coef) => {
    expect(n.coefSimultaneidad(grado)?.valor).toBe(coef)
  })
})

describe('conductores', () => {
  it('sección mínima por tipo', () => {
    expect(n.seccionMinimaMm2({ tipo: 'IUG', tieneTomasDerivadas: false })?.valor).toBe(1.5)
    expect(n.seccionMinimaMm2({ tipo: 'IUG', tieneTomasDerivadas: true })?.valor).toBe(2.5)
    expect(n.seccionMinimaMm2({ tipo: 'TUG', tieneTomasDerivadas: false })?.valor).toBe(2.5)
    expect(n.seccionMinimaMm2({ tipo: 'ESPECIFICO', tieneTomasDerivadas: false })?.valor).toBe(2.5)
  })

  it('sección mínima por función del conductor', () => {
    expect(n.seccionMinimaDeFuncion('alimentacion_efecto')?.valor).toBe(1)
    expect(n.seccionMinimaDeFuncion('retorno')?.valor).toBe(1)
    expect(n.seccionMinimaDeFuncion('pe')?.valor).toBe(2.5)
    // La tabla no nombra a los viajeros de una combinación: queda sin dato hasta decidirlo.
    expect(n.seccionMinimaDeFuncion('viajero')).toBeUndefined()
  })

  it('corriente admisible, con y sin agrupamiento', () => {
    const iz = (seccionMm2: number, circuitosEnLaCaneria = 1, cargados: 2 | 3 = 2) =>
      n.corrienteAdmisibleA({ seccionMm2, metodo: 'embutida_B1', cargados, circuitosEnLaCaneria })

    expect(iz(1.5)).toMatchObject({ ok: true, valor: 15, factorAgrupamiento: 1 })
    expect(iz(2.5)).toMatchObject({ ok: true, valor: 21 })
    expect(iz(2.5, 2)).toMatchObject({ ok: true, valor: 16.8, base: 21, factorAgrupamiento: 0.8 })
    expect(iz(2.5, 3)).toMatchObject({ ok: true, valor: 14.7 })
    expect(iz(2.5, 1, 3)).toMatchObject({ ok: true, valor: 18 })
  })

  it('dice qué dato falta cuando no puede responder', () => {
    const q = { seccionMm2: 2.5, metodo: 'embutida_B1', cargados: 2 as const, circuitosEnLaCaneria: 1 }
    expect(n.corrienteAdmisibleA({ ...q, seccionMm2: 3 })).toEqual({ ok: false, falta: 'seccion' })
    expect(n.corrienteAdmisibleA({ ...q, metodo: 'enterrado_D1' })).toEqual({ ok: false, falta: 'metodo' })
    expect(n.corrienteAdmisibleA({ ...q, circuitosEnLaCaneria: 4 })).toEqual({ ok: false, falta: 'agrupamiento' })
  })

  it('secciones disponibles, ordenadas', () => {
    expect(n.seccionesMm2('embutida_B1')).toEqual([1, 1.5, 2.5, 4, 6, 10, 16, 25])
  })
})

describe('alimentación y conteo de bocas', () => {
  it('tensión y tope de corriente', () => {
    expect(n.alimentacion().valor).toEqual({ tensionFaseNeutroV: 220, tensionLineaV: 380, corrienteMaxOrigenA: 63 })
  })

  it('tomas por caja y en tablero', () => {
    expect(n.tomasMaxPorCaja('rectangular')?.valor).toBe(2)
    expect(n.tomasMaxPorCaja('cuadrada')?.valor).toBe(4)
    expect(n.tomasMaxPorCaja('octogonal')).toBeUndefined()
    expect(n.tomasEnTableroPorBoca().valor).toBe(4)
  })
})

describe('verificación de los datos', () => {
  it('distingue lo verificado por una persona de lo que falta revisar', () => {
    const v = n.verificacion()
    expect(v.find((b) => b.bloque === 'Puntos mínimos de utilización')?.verificado).toBe(true)
    expect(v.find((b) => b.bloque === 'Características de la alimentación')?.verificado).toBe(false)
    expect(v.filter((b) => b.bloque.startsWith('Puntos mínimos: ')).map((b) => b.verificado)).toEqual([false, false, false])
  })
})
