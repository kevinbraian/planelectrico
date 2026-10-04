import { NavLink } from 'react-router-dom'
import { cx } from '@/ui/cx'
import { PESTANAS } from './iconos'

/** Pestañas del proyecto. Las de fases futuras se ven, deshabilitadas, para mostrar hacia dónde va la app. */
export function Pestanas() {
  return (
    <nav aria-label="Secciones del proyecto" className="border-b border-borde bg-panel px-3 py-1.5">
      <ul className="flex items-center gap-1 overflow-x-auto rounded-xl bg-hundido p-1">
        {PESTANAS.map(({ id, etiqueta, icono: Icono, fase }) => (
          <li key={id} className="shrink-0">
            {fase ? (
              <span
                title={`Llega en la fase ${fase}`}
                aria-disabled="true"
                className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-1.5 font-medium text-tinta-tenue"
              >
                <Icono size={16} />
                {etiqueta}
              </span>
            ) : (
              <NavLink
                to={id}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 font-medium transition-colors',
                    isActive ? 'bg-panel text-tinta shadow-tarjeta' : 'text-tinta-suave hover:text-tinta',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icono size={16} className={isActive ? 'text-acento' : undefined} />
                    <span className={cx('border-b-2 pb-px', isActive ? 'border-acento' : 'border-transparent')}>{etiqueta}</span>
                  </>
                )}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
