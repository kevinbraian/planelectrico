import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boton } from '@/ui/Boton'
import { Dialogo } from '@/ui/Dialogo'
import { importarArchivo } from './archivos'

/**
 * Elegir un archivo exportado, validarlo y abrirlo. Quien lo usa dibuja el
 * botón; este componente abre el selector de archivos y muestra los errores.
 */
export function Importador({ children }: { children: (elegirArchivo: () => void) => ReactNode }) {
  const [errores, setErrores] = useState<string[] | null>(null)
  const navegar = useNavigate()

  const elegirArchivo = () => {
    const entrada = document.createElement('input')
    entrada.type = 'file'
    entrada.accept = '.json,application/json'
    entrada.onchange = async () => {
      const archivo = entrada.files?.[0]
      if (!archivo) return
      const resultado = await importarArchivo(archivo)
      if (resultado.ok) navegar(`/p/${resultado.proyecto.id}`)
      else setErrores(resultado.errores)
    }
    entrada.click()
  }

  return (
    <>
      {children(elegirArchivo)}
      <Dialogo
        abierto={errores !== null}
        alCerrar={() => setErrores(null)}
        titulo="No se pudo importar el archivo"
        pie={<Boton variante="primario" onClick={() => setErrores(null)}>Entendido</Boton>}
      >
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {errores?.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </Dialogo>
    </>
  )
}
