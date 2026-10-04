import { Save, Trash } from 'lucide-react'
import { useState } from 'react'
import type { GrupoPlantilla, Id } from '@/dominio/modelo/tipos'
import { guardarGrupoComoPlantilla, quitarGrupoDePlantilla } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { Boton } from '@/ui/Boton'
import { EntradaTexto } from '@/ui/Campos'
import { Tarjeta } from '@/ui/Tarjeta'

function FilaDeGrupo({ grupo }: { grupo: GrupoPlantilla }) {
  const { proyecto } = useAnalisis()
  const [nombre, setNombre] = useState<string | null>(null)
  const creados = Object.values(proyecto.elementos).filter((e) => e.grupoId === grupo.id).length
  const enlazados = Object.values(grupo.roles).flat().length - creados

  return (
    <li className="flex flex-wrap items-center gap-2 border-t border-borde py-2 first:border-t-0 first:pt-0 last:pb-0">
      <span className="min-w-0 flex-1">
        <span className="font-medium">{grupo.nombre}</span>
        <span className="block text-xs text-tinta-suave">
          {creados} {creados === 1 ? 'elemento creado' : 'elementos creados'}
          {enlazados > 0 && `, combinada con ${enlazados} que ya ${enlazados === 1 ? 'existía' : 'existían'}`}
        </span>
      </span>
      {nombre === null ? (
        <Boton icono={<Save size={15} />} onClick={() => setNombre(`${grupo.nombre} (mía)`)}>
          Guardar como plantilla
        </Boton>
      ) : (
        <>
          <EntradaTexto aria-label="Nombre de la plantilla" className="w-56" valor={nombre} onCambio={setNombre} />
          <Boton
            variante="primario"
            disabled={nombre.trim() === ''}
            onClick={() => {
              guardarGrupoComoPlantilla(grupo.id, nombre.trim())
              setNombre(null)
            }}
          >
            Guardar
          </Boton>
          <Boton onClick={() => setNombre(null)}>Cancelar</Boton>
        </>
      )}
      <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Quitar ${grupo.nombre}`} title="Quitar la plantilla y borrar lo que creó" onClick={() => quitarGrupoDePlantilla(grupo.id)} />
    </li>
  )
}

/** Las plantillas insertadas que tocan un circuito: se pueden guardar como propias o quitar enteras. */
export function PlantillasDelCircuito({ circuitoId }: { circuitoId: Id }) {
  const { proyecto } = useAnalisis()
  const grupos = Object.values(proyecto.grupos).filter((g) => Object.values(g.circuitos).includes(circuitoId))
  if (grupos.length === 0) return null

  return (
    <Tarjeta titulo="Plantillas en este circuito" descripcion="Quitar una plantilla borra los elementos que creó; los que ya existían se quedan.">
      <ul className="flex flex-col">
        {grupos.map((g) => (
          <FilaDeGrupo key={g.id} grupo={g} />
        ))}
      </ul>
    </Tarjeta>
  )
}
