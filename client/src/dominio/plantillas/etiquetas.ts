import type { Normativa } from '../normas/contrato'
import { conductoresPorFuncion, cantidadesPorRol } from './insertar'
import { FUNCIONES_DE_RED, type FuncionRed, type PlantillaCircuito } from './tipos'

export const ETIQUETA_FUNCION: Record<FuncionRed, string> = {
  linea: 'Línea',
  neutro: 'Neutro',
  pe: 'Protección (PE)',
  alimentacion_efecto: 'Alimentación del mando',
  retorno: 'Retorno',
  viajero: 'Viajero',
  mando: 'Línea de pulsadores',
}

export interface ResumenDePlantilla {
  /** "2 × Punto de luz", "1 × Conmutador A"… */
  elementos: { rol: string; etiqueta: string; cantidad: number; esBoca: boolean }[]
  bocas: number
  mandos: number
  /** Conductores por función, con la sección mínima cuando la norma la fija para esa función. */
  conductores: { funcion: FuncionRed; etiqueta: string; cantidad: number; seccionMinimaMm2?: number }[]
}

/** Lo que una plantilla va a crear con ciertos parámetros, para mostrarlo antes de insertar. */
export function resumirPlantilla(plantilla: PlantillaCircuito, norma: Normativa, parametros: Record<string, number> = {}): ResumenDePlantilla {
  const cantidades = cantidadesPorRol(plantilla, parametros)
  const elementos = plantilla.roles.map((r) => ({
    rol: r.id,
    etiqueta: r.etiqueta,
    cantidad: cantidades[r.id] ?? 1,
    esBoca: r.elemento.clase === 'boca',
  }))
  const porFuncion = conductoresPorFuncion(plantilla, parametros)
  return {
    elementos,
    bocas: elementos.filter((e) => e.esBoca).reduce((n, e) => n + e.cantidad, 0),
    mandos: elementos.filter((e) => !e.esBoca).reduce((n, e) => n + e.cantidad, 0),
    conductores: FUNCIONES_DE_RED.flatMap((funcion) => {
      const cantidad = porFuncion[funcion]
      if (!cantidad) return []
      return [{ funcion, etiqueta: ETIQUETA_FUNCION[funcion], cantidad, seccionMinimaMm2: norma.seccionMinimaDeFuncion(funcion)?.valor }]
    }),
  }
}
