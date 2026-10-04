import { exportarProyecto, importarProyecto, type ResultadoLectura } from '@/dominio/modelo/archivo'
import { nuevoId } from '@/dominio/modelo/fabrica'
import type { Proyecto } from '@/dominio/modelo/tipos'
import { repositorio } from '@/estado/repositorio'

const nombreDeArchivo = (nombre: string) =>
  `${
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'proyecto'
  }.planelectrico.json`

/** Descarga el proyecto como archivo JSON. */
export function descargarProyecto(proyecto: Proyecto): void {
  const url = URL.createObjectURL(new Blob([exportarProyecto(proyecto)], { type: 'application/json' }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreDeArchivo(proyecto.nombre)
  enlace.click()
  URL.revokeObjectURL(url)
}

/**
 * Lee un archivo exportado y lo guarda en este navegador. Si ya hay un
 * proyecto con el mismo id, entra como copia: importar nunca pisa lo que hay.
 */
export async function importarArchivo(archivo: File): Promise<ResultadoLectura> {
  const leido = importarProyecto(await archivo.text())
  if (!leido.ok) return leido

  let { proyecto } = leido
  if (repositorio.listar().some((e) => e.id === proyecto.id)) {
    proyecto = { ...proyecto, id: nuevoId(), nombre: `${proyecto.nombre} (importado)` }
  }
  repositorio.guardar(proyecto)
  return { ok: true, proyecto }
}
