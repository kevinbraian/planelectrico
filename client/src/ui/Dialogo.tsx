import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Boton } from './Boton'

interface Props {
  abierto: boolean
  alCerrar(): void
  titulo: string
  children: ReactNode
  pie?: ReactNode
}

/** Diálogo modal sobre el <dialog> nativo: Escape y el foco los maneja el navegador. */
export function Dialogo({ abierto, alCerrar, titulo, children, pie }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (abierto && !dialogo.open) dialogo.showModal()
    if (!abierto && dialogo.open) dialogo.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      onClick={(e) => {
        if (e.target === ref.current) alCerrar()
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-tarjeta border border-borde bg-panel p-0 text-tinta shadow-flotante"
    >
      {abierto && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
            <h2 className="font-semibold">{titulo}</h2>
            <Boton variante="fantasma" icono={<X size={16} />} aria-label="Cerrar" onClick={alCerrar} />
          </header>
          <div className="overflow-y-auto p-4">{children}</div>
          {pie && <footer className="flex flex-wrap justify-end gap-2 border-t border-borde px-4 py-3">{pie}</footer>}
        </div>
      )}
    </dialog>
  )
}
