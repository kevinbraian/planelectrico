import type { Paso } from '@/dominio/calculo/tipos'
import { citar, type Referencia } from '@/dominio/normas/contrato'
import { cx } from './cx'

/** La cita de una cláusula o tabla, en chico. */
export function Cita({ referencia, className }: { referencia: Referencia; className?: string }) {
  return <span className={cx('text-xs text-tinta-tenue', className)}>{citar(referencia)}</span>
}

/** "De dónde sale este número": los pasos de un cálculo, cada uno con su cita. */
export function ListaDePasos({ pasos, className }: { pasos: Paso[]; className?: string }) {
  return (
    <ol className={cx('flex flex-col gap-1.5', className)}>
      {pasos.map((paso, i) => (
        <li key={i} className="flex flex-col">
          <span>{paso.texto}</span>
          {paso.ref && <Cita referencia={paso.ref} />}
        </li>
      ))}
    </ol>
  )
}
