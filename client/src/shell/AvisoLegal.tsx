import { AVISO_LEGAL } from '@/dominio/modelo/archivo'

/** Queda siempre a la vista: la app ayuda a diseñar, no firma proyectos. */
export function AvisoLegal() {
  return (
    <footer className="border-t border-borde bg-panel px-4 py-1.5 text-center text-xs text-tinta-suave">{AVISO_LEGAL}</footer>
  )
}
