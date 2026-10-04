import { z } from 'zod'
import { esquemaPlantilla } from '../../modelo/esquema'
import type { Proyecto } from '../../modelo/tipos'
import type { PlantillaCircuito } from '../tipos'
import datos from './plantillas.json'

/** Plantillas que trae la app. Si el JSON no respeta el esquema, falla al cargar. */
export const PLANTILLAS_DEL_SISTEMA: PlantillaCircuito[] = z.array(esquemaPlantilla).parse(datos)

/** Las del sistema y las que el usuario guardó en el proyecto. */
export function plantillasDisponibles(p: Proyecto): PlantillaCircuito[] {
  return [...PLANTILLAS_DEL_SISTEMA, ...Object.values(p.plantillasPropias)]
}

export function buscarPlantilla(p: Proyecto, id: string): PlantillaCircuito | undefined {
  return plantillasDisponibles(p).find((x) => x.id === id)
}
