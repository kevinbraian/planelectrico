import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { cx } from './cx'

/** Etiqueta arriba y control abajo. En tablas se usa el control solo, con `aria-label`. */
export function Campo({ etiqueta, ayuda, children, className }: { etiqueta: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs font-medium text-tinta-suave">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-tinta-tenue">{ayuda}</span>}
    </label>
  )
}

interface PropsTexto extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  valor: string
  onCambio(valor: string): void
}

export function EntradaTexto({ valor, onCambio, className, ...resto }: PropsTexto) {
  return <input type="text" className={cx('control', className)} value={valor} onChange={(e) => onCambio(e.target.value)} {...resto} />
}

interface PropsNumero extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'step'> {
  valor: number | undefined
  /** Recibe undefined cuando el campo queda vacío. */
  onCambio(valor: number | undefined): void
  paso?: number | 'any'
}

export function EntradaNumero({ valor, onCambio, paso = 'any', className, ...resto }: PropsNumero) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={paso}
      className={cx('control tabular-nums', className)}
      value={valor ?? ''}
      onChange={(e) => {
        const n = e.target.valueAsNumber
        onCambio(Number.isNaN(n) ? undefined : n)
      }}
      {...resto}
    />
  )
}

export interface Opcion<T> {
  valor: T
  etiqueta: string
  deshabilitada?: boolean
}

interface PropsSelector<T> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'> {
  valor: T
  opciones: Opcion<T>[]
  onCambio(valor: T): void
}

/** Si el valor actual no está entre las opciones (un calibre no comercial importado), lo agrega para no mostrarlo vacío. */
export function Selector<T extends string | number>({ valor, opciones, onCambio, className, ...resto }: PropsSelector<T>) {
  const lista = opciones.some((o) => o.valor === valor) ? opciones : [...opciones, { valor, etiqueta: String(valor) }]
  return (
    <select
      className={cx('control', className)}
      value={lista.findIndex((o) => o.valor === valor)}
      onChange={(e) => {
        const elegida = lista[Number(e.target.value)]
        if (elegida) onCambio(elegida.valor)
      }}
      {...resto}
    >
      {lista.map((o, i) => (
        <option key={String(o.valor)} value={i} disabled={o.deshabilitada}>
          {o.etiqueta}
        </option>
      ))}
    </select>
  )
}
