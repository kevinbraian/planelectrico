import { esquemaProyecto } from './esquema'
import { verificarIntegridad } from './integridad'
import { ErrorDeVersion, migrar } from './migraciones'
import type { Proyecto } from './tipos'

export const AVISO_LEGAL =
  'Ayuda de diseño. No reemplaza el proyecto ni la verificación de un profesional matriculado.'

const APP = 'planelectrico'

interface Sobre {
  app: typeof APP
  exportadoEn: string
  aviso: string
  proyecto: Proyecto
}

/** Texto del archivo que se descarga. Lleva el aviso legal adentro. */
export function exportarProyecto(proyecto: Proyecto, ahora: Date = new Date()): string {
  const sobre: Sobre = { app: APP, exportadoEn: ahora.toISOString(), aviso: AVISO_LEGAL, proyecto }
  return JSON.stringify(sobre, null, 2)
}

export type ResultadoLectura = { ok: true; proyecto: Proyecto } | { ok: false; errores: string[] }

/** Valida un proyecto que viene de afuera: versión, forma y referencias internas. */
export function leerProyecto(dato: unknown): ResultadoLectura {
  let migrado: unknown
  try {
    migrado = migrar(dato)
  } catch (e) {
    if (e instanceof ErrorDeVersion) return { ok: false, errores: [e.message] }
    throw e
  }

  const resultado = esquemaProyecto.safeParse(migrado)
  if (!resultado.success) {
    const errores = resultado.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || 'proyecto'}: ${i.message}`)
    return { ok: false, errores }
  }

  const problemas = verificarIntegridad(resultado.data)
  if (problemas.length > 0) return { ok: false, errores: problemas.slice(0, 8) }
  return { ok: true, proyecto: resultado.data }
}

/** Lee el texto de un archivo exportado (o un proyecto suelto, sin sobre). */
export function importarProyecto(texto: string): ResultadoLectura {
  let dato: unknown
  try {
    dato = JSON.parse(texto)
  } catch {
    return { ok: false, errores: ['El archivo no es un JSON válido.'] }
  }
  if (typeof dato !== 'object' || dato === null) {
    return { ok: false, errores: ['El archivo no contiene un proyecto.'] }
  }
  const conSobre = dato as Partial<Sobre>
  return leerProyecto(conSobre.app === APP && conSobre.proyecto ? conSobre.proyecto : dato)
}
