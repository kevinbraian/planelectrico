import { CircleQuestionMark, Download, Redo2, Undo2, Upload, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { useAnalisis } from '@/estado/analisis'
import { useProyectoStore } from '@/estado/proyectoStore'
import { descargarProyecto } from './archivos'
import { DialogoAyuda } from './DialogoAyuda'
import { Importador } from './Importador'

function Accion({ icono: Icono, etiqueta, ...resto }: { icono: LucideIcon; etiqueta: string; onClick(): void; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      className="flex min-w-16 flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-tinta transition-colors enabled:hover:bg-acento-suave enabled:hover:text-acento-fuerte disabled:text-tinta-tenue"
      {...resto}
    >
      <Icono size={18} />
      {etiqueta}
    </button>
  )
}

const escribiendo = (objetivo: EventTarget | null) =>
  objetivo instanceof HTMLElement && (objetivo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(objetivo.tagName))

/** Barra flotante inferior. En la fase del plano suma las herramientas de dibujo. */
export function BarraFlotante() {
  const { proyecto } = useAnalisis()
  const [ayuda, setAyuda] = useState(false)
  const puedeDeshacer = useStore(useProyectoStore.temporal, (s) => s.pastStates.length > 0)
  const puedeRehacer = useStore(useProyectoStore.temporal, (s) => s.futureStates.length > 0)
  const { undo, redo } = useProyectoStore.temporal.getState()

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      // Dentro de un campo, Ctrl+Z es del navegador: deshace lo tipeado.
      if (!(e.ctrlKey || e.metaKey) || escribiendo(e.target)) return
      const tecla = e.key.toLowerCase()
      if (tecla === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (tecla === 'y' || (tecla === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [undo, redo])

  return (
    <>
      <div
        role="toolbar"
        aria-label="Acciones del proyecto"
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-borde bg-panel p-1.5 shadow-flotante"
      >
        <Accion icono={Undo2} etiqueta="Deshacer" title="Deshacer (Ctrl+Z)" disabled={!puedeDeshacer} onClick={() => undo()} />
        <Accion icono={Redo2} etiqueta="Rehacer" title="Rehacer (Ctrl+Y)" disabled={!puedeRehacer} onClick={() => redo()} />
        <span className="mx-1 h-8 w-px bg-borde" />
        <Importador>{(elegir) => <Accion icono={Upload} etiqueta="Importar" title="Abrir un archivo exportado" onClick={elegir} />}</Importador>
        <Accion icono={Download} etiqueta="Exportar" title="Descargar el proyecto como archivo" onClick={() => descargarProyecto(proyecto)} />
        <span className="mx-1 h-8 w-px bg-borde" />
        <Accion icono={CircleQuestionMark} etiqueta="Ayuda" onClick={() => setAyuda(true)} />
      </div>
      <DialogoAyuda abierto={ayuda} alCerrar={() => setAyuda(false)} />
    </>
  )
}
