import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

const ESTILO: Record<Variante, string> = {
  primario: 'border-transparent bg-acento text-white hover:bg-acento-fuerte',
  secundario: 'border-borde bg-panel text-tinta hover:bg-hundido',
  fantasma: 'border-transparent bg-transparent text-tinta-suave hover:bg-hundido hover:text-tinta',
  peligro: 'border-transparent bg-transparent text-tinta-tenue hover:bg-error-suave hover:text-error',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  icono?: ReactNode
}

/** Sin `children` queda como botón de ícono cuadrado; en ese caso pasale `aria-label`. */
export function Boton({ variante = 'secundario', icono, children, className, type = 'button', ...resto }: Props) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-45',
        children ? 'px-3' : 'w-8',
        ESTILO[variante],
        className,
      )}
      {...resto}
    >
      {icono}
      {children}
    </button>
  )
}
