import type { ReactNode } from 'react'
import { useUiStore } from '@/estado/uiStore'
import { DialogoInsertar } from '@/vistas/biblioteca/DialogoInsertar'
import { AvisoLegal } from './AvisoLegal'
import { BarraFlotante } from './BarraFlotante'
import { BarraProyecto } from './BarraProyecto'
import { usePestanaActiva } from './navegacion'
import { PanelAdvertencias } from './PanelAdvertencias'
import { PanelLateral } from './PanelLateral'
import { Pestanas } from './Pestanas'

/**
 * Marco de un proyecto abierto: barra de proyecto, pestañas, paleta a la
 * izquierda, la vista en el centro, advertencias a la derecha y la barra
 * flotante abajo.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const panelAdvertencias = useUiStore((s) => s.panelAdvertencias)
  const pestana = usePestanaActiva()
  return (
    <div className="flex h-full flex-col">
      <BarraProyecto />
      <Pestanas />
      <div className="relative flex min-h-0 flex-1">
        <PanelLateral />
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* La clave por pestaña hace que cada una arranque desde arriba. */}
          <main key={pestana} className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4">
            <div className="mx-auto flex max-w-6xl flex-col gap-4">{children}</div>
          </main>
          <BarraFlotante />
        </div>
        {panelAdvertencias && <PanelAdvertencias />}
      </div>
      <DialogoInsertar />
      <AvisoLegal />
    </div>
  )
}
