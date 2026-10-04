import { House, Plus, Trash, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link, useLoaderData, useNavigate, useRevalidator } from 'react-router-dom'
import { crearProyecto } from '@/dominio/modelo/fabrica'
import { NORMA_POR_DEFECTO } from '@/dominio/normas/registro'
import { repositorio, type EntradaIndice } from '@/estado/repositorio'
import { AvisoLegal } from '@/shell/AvisoLegal'
import { Importador } from '@/shell/Importador'
import { Boton } from '@/ui/Boton'
import { Vacio } from '@/ui/Dato'
import { Dialogo } from '@/ui/Dialogo'
import { Tarjeta } from '@/ui/Tarjeta'

const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })

/** Pantalla de entrada: los proyectos guardados en este navegador. */
export function PaginaInicio() {
  const proyectos = useLoaderData() as EntradaIndice[]
  const navegar = useNavigate()
  const { revalidate } = useRevalidator()
  const [aBorrar, setABorrar] = useState<EntradaIndice | null>(null)

  const crear = () => {
    const proyecto = crearProyecto({ norma: NORMA_POR_DEFECTO })
    repositorio.guardar(proyecto)
    navegar(`/p/${proyecto.id}`)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-borde bg-panel px-4 py-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-marca text-white">
          <House size={20} />
        </span>
        <div>
          <h1 className="text-base font-semibold">Plan Eléctrico</h1>
          <p className="text-xs text-tinta-suave">Instalaciones de viviendas según {NORMA_POR_DEFECTO.nombre}</p>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <Tarjeta
            titulo="Mis proyectos"
            descripcion="Se guardan en este navegador. Exportalos para tener una copia o llevarlos a otra computadora."
            acciones={
              <>
                <Importador>
                  {(elegir) => (
                    <Boton icono={<Upload size={16} />} onClick={elegir}>
                      Importar
                    </Boton>
                  )}
                </Importador>
                <Boton variante="primario" icono={<Plus size={16} />} onClick={crear}>
                  Nuevo proyecto
                </Boton>
              </>
            }
            alBorde
          >
            {proyectos.length === 0 ? (
              <Vacio titulo="Todavía no hay proyectos">
                Empezá por el tablero y los circuitos de tu casa: cargás los ambientes, cada térmica con sus bocas, y la app te dice qué cumple y qué
                no.
                <Boton variante="primario" icono={<Plus size={16} />} onClick={crear}>
                  Crear el primero
                </Boton>
              </Vacio>
            ) : (
              <ul>
                {proyectos.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 border-t border-borde px-4 py-2.5 first:border-t-0">
                    <Link to={`/p/${p.id}`} className="flex min-w-0 flex-1 flex-col rounded-md hover:text-acento-fuerte">
                      <span className="truncate font-medium">{p.nombre || 'Sin nombre'}</span>
                      <span className="text-xs text-tinta-suave">Modificado el {fecha.format(new Date(p.modificadoEn))}</span>
                    </Link>
                    <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${p.nombre}`} title="Borrar" onClick={() => setABorrar(p)} />
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>
      </main>

      <AvisoLegal />

      <Dialogo
        abierto={aBorrar !== null}
        alCerrar={() => setABorrar(null)}
        titulo="Borrar el proyecto"
        pie={
          <>
            <Boton onClick={() => setABorrar(null)}>Cancelar</Boton>
            <Boton
              variante="primario"
              className="bg-error hover:bg-error"
              onClick={() => {
                if (aBorrar) repositorio.borrar(aBorrar.id)
                setABorrar(null)
                revalidate()
              }}
            >
              Borrar
            </Boton>
          </>
        }
      >
        <p>
          Se va a borrar <strong className="font-semibold">{aBorrar?.nombre || 'Sin nombre'}</strong> de este navegador. Si no lo exportaste antes, no se
          puede recuperar.
        </p>
      </Dialogo>
    </div>
  )
}
