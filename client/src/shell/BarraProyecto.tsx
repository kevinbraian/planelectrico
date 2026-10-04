import { CircleCheck, House, Settings, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatear } from '@/dominio/util/numeros'
import { actualizarProyecto } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { Boton } from '@/ui/Boton'
import { cx } from '@/ui/cx'
import { DialogoOpciones } from './DialogoOpciones'

/** Barra superior: nombre del proyecto, datos vivos y acceso a las advertencias. */
export function BarraProyecto() {
  const { proyecto, calculo, advertencias } = useAnalisis()
  const [opciones, setOpciones] = useState(false)
  const panelAbierto = useUiStore((s) => s.panelAdvertencias)
  const alternarPanel = useUiStore((s) => s.alternarAdvertencias)

  const errores = advertencias.filter((a) => a.severidad === 'error').length
  const avisos = advertencias.filter((a) => a.severidad === 'aviso').length
  const circuitos = Object.keys(proyecto.circuitos).length
  const { grado, superficie } = calculo.proyecto

  const subtitulo = [
    grado ? `Grado ${grado.valor.nombre.toLowerCase()}` : 'Sin grado todavía',
    `${formatear(superficie.valor)} m²`,
    `${circuitos} ${circuitos === 1 ? 'circuito' : 'circuitos'}`,
    proyecto.modo === 'relevamiento' ? 'Relevamiento' : 'Proyecto nuevo',
  ].join(' · ')

  return (
    <header className="flex items-center gap-3 border-b border-borde bg-panel px-4 py-2">
      <Link
        to="/"
        title="Mis proyectos"
        aria-label="Mis proyectos"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca text-white transition-opacity hover:opacity-90"
      >
        <House size={20} />
      </Link>

      <div className="min-w-0 flex-1">
        <input
          aria-label="Nombre del proyecto"
          className="-ml-1.5 block w-full max-w-md truncate rounded-md border border-transparent bg-transparent px-1.5 text-base font-semibold hover:border-borde focus:border-acento focus:outline-none"
          value={proyecto.nombre}
          onChange={(e) => actualizarProyecto((p) => void (p.nombre = e.target.value))}
        />
        <p className="truncate text-xs text-tinta-suave">{subtitulo}</p>
      </div>

      <button
        type="button"
        onClick={alternarPanel}
        aria-pressed={panelAbierto}
        title={panelAbierto ? 'Ocultar advertencias' : 'Ver advertencias'}
        className={cx(
          'flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 font-medium tabular-nums transition-colors',
          errores > 0
            ? 'border-error/25 bg-error-suave text-error'
            : avisos > 0
              ? 'border-aviso/25 bg-aviso-suave text-aviso'
              : 'border-ok/25 bg-ok-suave text-ok',
        )}
      >
        {errores + avisos > 0 ? <TriangleAlert size={16} /> : <CircleCheck size={16} />}
        {errores > 0 && <span>{errores === 1 ? '1 error' : `${errores} errores`}</span>}
        {errores > 0 && avisos > 0 && <span className="opacity-50">·</span>}
        {avisos > 0 && <span className={errores > 0 ? 'hidden sm:inline' : undefined}>{avisos === 1 ? '1 aviso' : `${avisos} avisos`}</span>}
        {errores + avisos === 0 && <span className="hidden sm:inline">Sin observaciones</span>}
      </button>

      <Boton variante="fantasma" icono={<Settings size={18} />} aria-label="Opciones del proyecto" title="Opciones del proyecto" onClick={() => setOpciones(true)} />
      <DialogoOpciones abierto={opciones} alCerrar={() => setOpciones(false)} />
    </header>
  )
}
