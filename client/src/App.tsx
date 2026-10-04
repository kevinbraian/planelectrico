import { createBrowserRouter, Link, Navigate, Outlet, RouterProvider, useLoaderData, type LoaderFunctionArgs } from 'react-router-dom'
import { ProveedorAnalisis } from '@/estado/analisis'
import { abrirProyecto, cerrarProyecto, useProyectoStore } from '@/estado/proyectoStore'
import { repositorio } from '@/estado/repositorio'
import { AppShell } from '@/shell/AppShell'
import { VistaAmbientes } from '@/vistas/ambientes/VistaAmbientes'
import { VistaBiblioteca } from '@/vistas/biblioteca/VistaBiblioteca'
import { VistaCatalogo } from '@/vistas/catalogo/VistaCatalogo'
import { VistaCircuitos } from '@/vistas/circuitos/VistaCircuitos'
import { PaginaInicio } from '@/vistas/inicio/PaginaInicio'
import { VistaResumen } from '@/vistas/resumen/VistaResumen'
import { VistaTablero } from '@/vistas/tablero/VistaTablero'

type Carga = { ok: true } | { ok: false; errores: string[] }

/** Deja en el store el proyecto de la URL. Si ya está abierto no lo vuelve a leer, para no perder el historial de deshacer. */
function cargarProyecto({ params }: LoaderFunctionArgs): Carga {
  const id = params.proyectoId ?? ''
  if (useProyectoStore.getState().proyecto?.id === id) return { ok: true }
  const leido = repositorio.abrir(id)
  if (!leido) return { ok: false, errores: ['No hay ningún proyecto con ese identificador en este navegador.'] }
  if (!leido.ok) return leido
  abrirProyecto(leido.proyecto)
  return { ok: true }
}

function PaginaProyecto() {
  const carga = useLoaderData() as Carga
  const proyecto = useProyectoStore((s) => s.proyecto)

  if (!carga.ok) {
    return (
      <main className="mx-auto flex h-full max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-lg font-semibold">No se pudo abrir el proyecto</h1>
        <ul className="text-tinta-suave">
          {carga.errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
        <Link to="/" className="font-medium text-acento-fuerte hover:underline">
          Volver a mis proyectos
        </Link>
      </main>
    )
  }
  if (!proyecto) return null

  return (
    <ProveedorAnalisis proyecto={proyecto}>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProveedorAnalisis>
  )
}

const rutas = createBrowserRouter([
  {
    hydrateFallbackElement: <></>,
    children: [
      {
        path: '/',
        loader: () => {
          cerrarProyecto()
          return repositorio.listar()
        },
        element: <PaginaInicio />,
      },
      {
        path: '/p/:proyectoId',
        loader: cargarProyecto,
        element: <PaginaProyecto />,
        children: [
          { index: true, element: <Navigate to="ambientes" replace /> },
          { path: 'ambientes', element: <VistaAmbientes /> },
          { path: 'tablero', element: <VistaTablero /> },
          { path: 'circuitos', element: <VistaCircuitos /> },
          { path: 'resumen', element: <VistaResumen /> },
          { path: 'biblioteca', element: <VistaBiblioteca /> },
          { path: 'catalogo', element: <VistaCatalogo /> },
          { path: '*', element: <Navigate to="ambientes" replace /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={rutas} />
}
