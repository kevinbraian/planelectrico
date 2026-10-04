import type { ReactNode } from 'react'
import { cx } from './cx'
import type { Tono } from './Insignia'

const COLOR: Partial<Record<Tono, string>> = { ok: 'text-ok', error: 'text-error', aviso: 'text-aviso' }

/** Un número con su etiqueta, para las filas de resumen. */
export function Dato({ etiqueta, valor, unidad, detalle, tono }: { etiqueta: string; valor: ReactNode; unidad?: string; detalle?: ReactNode; tono?: Tono }) {
  return (
    <div className="flex min-w-24 flex-col rounded-lg bg-hundido px-3 py-2">
      <span className="text-xs text-tinta-suave">{etiqueta}</span>
      <span className={cx('text-lg font-semibold tabular-nums leading-tight', tono && COLOR[tono])}>
        {valor}
        {unidad && <span className="ml-1 text-xs font-medium text-tinta-suave">{unidad}</span>}
      </span>
      {detalle && <span className="text-xs text-tinta-suave">{detalle}</span>}
    </div>
  )
}

/** Bloque plegable "Cómo se calcula". */
export function Desplegable({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details className="group text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-medium text-acento-fuerte [&::-webkit-details-marker]:hidden">
        <span className="transition-transform group-open:rotate-90">›</span>
        {titulo}
      </summary>
      <div className="mt-2 rounded-lg border border-borde p-3">{children}</div>
    </details>
  )
}

/** Mensaje para una lista que todavía no tiene nada. */
export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <p className="font-medium">{titulo}</p>
      {children && <div className="flex max-w-md flex-col items-center gap-3 text-tinta-suave">{children}</div>}
    </div>
  )
}
