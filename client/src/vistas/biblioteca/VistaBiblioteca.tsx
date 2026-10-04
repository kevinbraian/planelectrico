import { Plus, Trash } from 'lucide-react'
import { PLANTILLAS_DEL_SISTEMA } from '@/dominio/plantillas/biblioteca'
import { resumirPlantilla } from '@/dominio/plantillas/etiquetas'
import type { PlantillaCircuito } from '@/dominio/plantillas/tipos'
import { formatear } from '@/dominio/util/numeros'
import { borrarPlantillaPropia } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { Boton } from '@/ui/Boton'
import { Insignia } from '@/ui/Insignia'
import { Tarjeta } from '@/ui/Tarjeta'

function TarjetaDePlantilla({ plantilla }: { plantilla: PlantillaCircuito }) {
  const { norma } = useAnalisis()
  const insertar = useUiStore((s) => s.insertarPlantilla)
  const resumen = resumirPlantilla(plantilla, norma)
  const esPropia = plantilla.origen === 'usuario'

  return (
    <article className="flex flex-col gap-3 rounded-tarjeta border border-borde bg-panel p-4 shadow-tarjeta">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{plantilla.nombre}</h3>
          <p className="mt-0.5 text-xs text-tinta-suave">{plantilla.descripcion}</p>
        </div>
        {esPropia && <Insignia tono="info">Propia</Insignia>}
      </header>

      <div className="flex flex-wrap gap-1.5">
        {resumen.elementos.map((e) => (
          <Insignia key={e.rol} tono={e.esBoca ? 'acento' : 'neutro'}>
            {e.cantidad} × {e.etiqueta}
          </Insignia>
        ))}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-tinta-suave">Circuitos</dt>
        <dd>{plantilla.ranuras.map((r) => r.tiposAdmitidos.join(' o ')).join(' + ')}</dd>
        <dt className="text-tinta-suave">Suma</dt>
        <dd>
          {resumen.bocas} {resumen.bocas === 1 ? 'boca' : 'bocas'}
          {resumen.mandos > 0 && `; ${resumen.mandos} ${resumen.mandos === 1 ? 'mando, que no cuenta' : 'mandos, que no cuentan'} como boca`}
        </dd>
        <dt className="text-tinta-suave">Conductores</dt>
        <dd>
          {resumen.conductores
            .map((c) => `${c.cantidad} × ${c.etiqueta.toLowerCase()}${c.seccionMinimaMm2 !== undefined ? ` (mín. ${formatear(c.seccionMinimaMm2)} mm²)` : ''}`)
            .join(', ')}
        </dd>
      </dl>

      <div className="mt-auto flex items-center justify-end gap-2">
        {esPropia && (
          <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${plantilla.nombre}`} title="Borrar la plantilla" onClick={() => borrarPlantillaPropia(plantilla.id)} />
        )}
        <Boton variante="primario" icono={<Plus size={16} />} onClick={() => insertar(plantilla.id)}>
          Insertar
        </Boton>
      </div>
    </article>
  )
}

export function VistaBiblioteca() {
  const { proyecto } = useAnalisis()
  const propias = Object.values(proyecto.plantillasPropias)

  return (
    <>
      <Tarjeta
        titulo="Biblioteca de circuitos"
        descripcion="Circuitos prearmados. Al insertar uno elegís el circuito, la cantidad de puntos y si se combina con bocas que ya están cargadas; bocas, demanda y advertencias se recalculan solas."
      >
        <p className="text-xs text-tinta-suave">
          Los mínimos de sección que se muestran salen de la tabla de la norma. Para los viajeros de una combinación la tabla no fija un valor propio,
          así que no se indica ninguno.
        </p>
      </Tarjeta>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLANTILLAS_DEL_SISTEMA.map((plantilla) => (
          <TarjetaDePlantilla key={plantilla.id} plantilla={plantilla} />
        ))}
      </div>

      <Tarjeta titulo="Mis plantillas" descripcion="Se guardan dentro del proyecto y viajan con él al exportarlo.">
        {propias.length === 0 ? (
          <p className="text-tinta-suave">
            Todavía no guardaste ninguna. En la pestaña Circuitos, cada plantilla insertada tiene un botón para guardarla con tus cantidades.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {propias.map((plantilla) => (
              <TarjetaDePlantilla key={plantilla.id} plantilla={plantilla} />
            ))}
          </div>
        )}
      </Tarjeta>
    </>
  )
}
