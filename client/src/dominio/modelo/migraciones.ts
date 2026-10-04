import { ESQUEMA_ACTUAL } from './tipos'

type Dato = Record<string, unknown>

/**
 * MIGRACIONES[n] lleva un proyecto de la versión n a la n + 1. Cuando cambie
 * el formato: subir ESQUEMA_ACTUAL, agregar acá la función y un test con un
 * archivo de la versión anterior.
 */
const MIGRACIONES: Record<number, (dato: Dato) => Dato> = {}

export class ErrorDeVersion extends Error {}

export function migrar(dato: unknown): unknown {
  if (typeof dato !== 'object' || dato === null) return dato
  let actual = dato as Dato
  let version = typeof actual.esquema === 'number' ? actual.esquema : NaN
  if (!Number.isInteger(version) || version < 1) {
    throw new ErrorDeVersion('El archivo no indica la versión de su formato.')
  }
  if (version > ESQUEMA_ACTUAL) {
    throw new ErrorDeVersion(
      `El archivo es de una versión más nueva de la app (formato ${version}; esta versión lee hasta el ${ESQUEMA_ACTUAL}).`,
    )
  }
  while (version < ESQUEMA_ACTUAL) {
    const paso = MIGRACIONES[version]
    if (!paso) throw new ErrorDeVersion(`No hay migración desde el formato ${version}.`)
    actual = { ...paso(actual), esquema: version + 1 }
    version += 1
  }
  return actual
}
