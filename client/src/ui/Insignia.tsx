import type { ReactNode } from 'react'
import { cx } from './cx'

export type Tono = 'neutro' | 'acento' | 'ok' | 'error' | 'aviso' | 'info'

const ESTILO: Record<Tono, string> = {
  neutro: 'bg-hundido text-tinta-suave',
  acento: 'bg-acento-suave text-acento-fuerte',
  ok: 'bg-ok-suave text-ok',
  error: 'bg-error-suave text-error',
  aviso: 'bg-aviso-suave text-aviso',
  info: 'bg-info-suave text-info',
}

export function Insignia({ tono = 'neutro', children, className, title }: { tono?: Tono; children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums', ESTILO[tono], className)}
    >
      {children}
    </span>
  )
}
