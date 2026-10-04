import type { ReactNode } from 'react'
import { cx } from './cx'

interface Props {
  titulo?: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
  className?: string
  /** Sin relleno interior, para tablas que llegan hasta el borde. */
  alBorde?: boolean
}

export function Tarjeta({ titulo, descripcion, acciones, children, className, alBorde }: Props) {
  return (
    <section className={cx('rounded-tarjeta border border-borde bg-panel shadow-tarjeta', className)}>
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-borde px-4 py-3">
          <div className="min-w-0">
            {titulo && <h2 className="font-semibold">{titulo}</h2>}
            {descripcion && <p className="mt-0.5 text-xs text-tinta-suave">{descripcion}</p>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={alBorde ? undefined : 'p-4'}>{children}</div>
    </section>
  )
}
