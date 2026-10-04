import type { Id } from '@/dominio/modelo/tipos'
import { advertenciasDeCircuito, contarPorSeveridad } from '@/dominio/reglas/filtros'
import { useAnalisis } from '@/estado/analisis'
import { Insignia } from '@/ui/Insignia'

/** "Cumple", "2 errores" o "1 aviso": el estado de un circuito de un vistazo. */
export function EstadoCircuito({ circuitoId }: { circuitoId: Id }) {
  const { proyecto, advertencias } = useAnalisis()
  const { error, aviso } = contarPorSeveridad(advertenciasDeCircuito(proyecto, advertencias, circuitoId))
  if (error > 0) return <Insignia tono="error">{error === 1 ? '1 error' : `${error} errores`}</Insignia>
  if (aviso > 0) return <Insignia tono="aviso">{aviso === 1 ? '1 aviso' : `${aviso} avisos`}</Insignia>
  return <Insignia tono="ok">Cumple</Insignia>
}
