import { describe, expect, it } from 'vitest'
import { construir, VA } from '../pruebas/constructor'
import { AVISO_LEGAL, exportarProyecto, importarProyecto, leerProyecto } from './archivo'
import { verificarIntegridad } from './integridad'
import { borrarAmbiente, borrarCircuito, borrarElemento } from './operaciones'
import { ESQUEMA_ACTUAL } from './tipos'

/** Un proyecto con un poco de todo: ambiente, dos circuitos, mando, regleta y cargas. */
function proyectoCompleto() {
  const t = construir()
  const cocina = t.ambiente('cocina', 9)
  const luces = t.circuito('IUG')
  const tomas = t.circuito('TUG')
  const luz = t.boca(luces, 'iluminacion', cocina)
  const interruptor = t.mando(luces, 'interruptor', [luz])
  t.carga(luz, VA(20))
  const toma = t.boca(tomas, 'tomacorriente', cocina)
  const regleta = t.regleta(toma)
  const pava = t.carga(regleta, VA(2000))
  return { t, cocina, luces, tomas, luz, interruptor, toma, regleta, pava }
}

describe('exportar e importar', () => {
  it('ida y vuelta devuelve el mismo proyecto', () => {
    const { t } = proyectoCompleto()
    const leido = importarProyecto(exportarProyecto(t.p))
    expect(leido).toEqual({ ok: true, proyecto: t.p })
  })

  it('el archivo exportado lleva el aviso legal', () => {
    const { t } = proyectoCompleto()
    expect(JSON.parse(exportarProyecto(t.p)).aviso).toBe(AVISO_LEGAL)
  })

  it('también lee un proyecto suelto, sin sobre', () => {
    const { t } = proyectoCompleto()
    expect(importarProyecto(JSON.stringify(t.p)).ok).toBe(true)
  })

  it('rechaza lo que no es JSON', () => {
    expect(importarProyecto('{ esto no es json')).toEqual({ ok: false, errores: ['El archivo no es un JSON válido.'] })
  })

  it('rechaza un archivo de un formato más nuevo', () => {
    const { t } = proyectoCompleto()
    const r = leerProyecto({ ...t.p, esquema: ESQUEMA_ACTUAL + 1 })
    expect(r.ok).toBe(false)
    expect(!r.ok && r.errores[0]).toMatch(/versión más nueva/)
  })

  it('rechaza un proyecto con un campo inválido y dice cuál', () => {
    const { t, tomas } = proyectoCompleto()
    const roto = structuredClone(t.p)
    roto.circuitos[tomas]!.proteccion.inA = -5
    const r = leerProyecto(roto)
    expect(!r.ok && r.errores[0]).toContain(`circuitos.${tomas}.proteccion.inA`)
  })

  it('rechaza referencias rotas entre colecciones', () => {
    const { t, pava } = proyectoCompleto()
    const roto = structuredClone(t.p)
    const carga = roto.elementos[pava]!
    if (carga.clase === 'carga') carga.conectadaA = 'no-existe'
    const r = leerProyecto(roto)
    expect(r.ok).toBe(false)
  })
})

describe('integridad', () => {
  it('un proyecto armado con la fábrica es coherente', () => {
    expect(verificarIntegridad(proyectoCompleto().t.p)).toEqual([])
  })

  it('detecta una conexión en círculo', () => {
    const { t, regleta } = proyectoCompleto()
    const r = t.p.elementos[regleta]!
    if (r.clase === 'contenedor') r.conectadaA = regleta
    expect(verificarIntegridad(t.p).join(' ')).toMatch(/círculo/)
  })
})

describe('borrado en cascada', () => {
  it('borrar una boca se lleva lo que tiene enchufado y la saca de sus mandos', () => {
    const { t, toma, regleta, pava, luz, interruptor } = proyectoCompleto()
    borrarElemento(t.p, toma)
    expect([toma, regleta, pava].map((id) => id in t.p.elementos)).toEqual([false, false, false])

    borrarElemento(t.p, luz)
    const mando = t.p.elementos[interruptor]
    expect(mando?.clase === 'mando' && mando.comanda).toEqual([])
    expect(verificarIntegridad(t.p)).toEqual([])
  })

  it('borrar un circuito borra sus bocas, mandos y cargas', () => {
    const { t, luces, tomas, toma } = proyectoCompleto()
    borrarCircuito(t.p, luces)
    expect(Object.keys(t.p.circuitos)).toEqual([tomas])
    expect(Object.values(t.p.elementos).every((e) => e.clase !== 'mando')).toBe(true)
    expect(toma in t.p.elementos).toBe(true)
    expect(verificarIntegridad(t.p)).toEqual([])
  })

  it('borrar un ambiente deja sus elementos sin ambiente, no los pierde', () => {
    const { t, cocina, luz } = proyectoCompleto()
    const cantidad = Object.keys(t.p.elementos).length
    borrarAmbiente(t.p, cocina)
    expect(Object.keys(t.p.elementos)).toHaveLength(cantidad)
    expect(t.p.elementos[luz]?.ambienteId).toBeNull()
    expect(verificarIntegridad(t.p)).toEqual([])
  })
})
