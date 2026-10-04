import { leerProyecto, type ResultadoLectura } from '@/dominio/modelo/archivo'
import type { Id, Proyecto } from '@/dominio/modelo/tipos'

export interface EntradaIndice {
  id: Id
  nombre: string
  modificadoEn: string
}

/**
 * Dónde viven los proyectos. Hoy es localStorage; cuando haya cuentas, otra
 * implementación de esta interfaz hablará con Firestore sin tocar la interfaz.
 */
export interface RepositorioProyectos {
  listar(): EntradaIndice[]
  /** undefined si no existe; un error de lectura si existe pero no se puede abrir. */
  abrir(id: Id): ResultadoLectura | undefined
  guardar(proyecto: Proyecto): void
  borrar(id: Id): void
}

const CLAVE_INDICE = 'planelectrico:indice'
const claveProyecto = (id: Id) => `planelectrico:proyecto:${id}`

export function crearRepositorioLocal(almacen: Storage): RepositorioProyectos {
  const leerIndice = (): EntradaIndice[] => {
    try {
      const crudo = JSON.parse(almacen.getItem(CLAVE_INDICE) ?? '[]')
      return Array.isArray(crudo) ? crudo : []
    } catch {
      return []
    }
  }
  const escribirIndice = (indice: EntradaIndice[]) => almacen.setItem(CLAVE_INDICE, JSON.stringify(indice))

  return {
    listar() {
      return leerIndice().sort((a, b) => b.modificadoEn.localeCompare(a.modificadoEn))
    },

    abrir(id) {
      const texto = almacen.getItem(claveProyecto(id))
      if (texto === null) return undefined
      try {
        return leerProyecto(JSON.parse(texto))
      } catch {
        return { ok: false, errores: ['Los datos guardados de este proyecto están dañados.'] }
      }
    },

    guardar(proyecto) {
      almacen.setItem(claveProyecto(proyecto.id), JSON.stringify(proyecto))
      const entrada = { id: proyecto.id, nombre: proyecto.nombre, modificadoEn: proyecto.modificadoEn }
      escribirIndice([...leerIndice().filter((e) => e.id !== proyecto.id), entrada])
    },

    borrar(id) {
      almacen.removeItem(claveProyecto(id))
      escribirIndice(leerIndice().filter((e) => e.id !== id))
    },
  }
}

export const repositorio = crearRepositorioLocal(window.localStorage)
