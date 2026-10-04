import type { ReactNode } from 'react'
import type { Circuito, Curva, Tablero } from '@/dominio/modelo/tipos'
import type { Normativa } from '@/dominio/normas/contrato'
import { formatear } from '@/dominio/util/numeros'
import { actualizarCircuito } from '@/estado/acciones'
import { EntradaNumero, EntradaTexto, Selector, type Opcion } from '@/ui/Campos'

export interface CampoCircuito {
  clave: string
  etiqueta: string
  ayuda?: string
  control: ReactNode
}

const CURVAS: Opcion<Curva | ''>[] = [
  { valor: '', etiqueta: '—' },
  { valor: 'B', etiqueta: 'B' },
  { valor: 'C', etiqueta: 'C' },
  { valor: 'D', etiqueta: 'D' },
]

/**
 * Los campos editables de un circuito. El tablero los muestra como celdas de
 * una planilla y la pestaña Circuitos como un formulario: son los mismos.
 */
export function camposDeCircuito(c: Circuito, norma: Normativa, tablero: Tablero | undefined): CampoCircuito[] {
  const cambiar = (receta: (x: Circuito) => void) => actualizarCircuito(c.id, receta)
  const diferenciales: Opcion<string>[] = [
    { valor: '', etiqueta: 'Sin asignar' },
    ...(tablero?.diferenciales ?? []).map((d, i) => ({ valor: d.id, etiqueta: `ID${i + 1} · ${d.inA} A · ${d.sensibilidadMa} mA` })),
  ]

  return [
    {
      clave: 'nombre',
      etiqueta: 'Nombre',
      control: <EntradaTexto aria-label="Nombre del circuito" valor={c.nombre} onCambio={(v) => cambiar((x) => void (x.nombre = v))} />,
    },
    {
      clave: 'tipo',
      etiqueta: 'Tipo',
      control: (
        <Selector
          aria-label="Tipo de circuito"
          valor={c.tipo}
          opciones={norma.tiposCircuito().map((t) => ({ valor: t.id, etiqueta: t.id }))}
          title={norma.tipoCircuito(c.tipo)?.valor.nombre}
          onCambio={(v) => cambiar((x) => void (x.tipo = v))}
        />
      ),
    },
    {
      clave: 'termica',
      etiqueta: 'Térmica',
      control: (
        <Selector
          aria-label="Calibre de la térmica"
          valor={c.proteccion.inA}
          opciones={norma.calibresComerciales().map((a) => ({ valor: a, etiqueta: `${a} A` }))}
          onCambio={(v) => cambiar((x) => void (x.proteccion.inA = v))}
        />
      ),
    },
    {
      clave: 'curva',
      etiqueta: 'Curva',
      control: (
        <Selector
          aria-label="Curva de la térmica"
          valor={c.proteccion.curva ?? ''}
          opciones={CURVAS}
          onCambio={(v) =>
            cambiar((x) => {
              if (v) x.proteccion.curva = v
              else delete x.proteccion.curva
            })
          }
        />
      ),
    },
    {
      clave: 'seccion',
      etiqueta: 'Sección',
      control: (
        <Selector
          aria-label="Sección del conductor"
          valor={c.conductor.seccionMm2}
          opciones={norma.seccionesMm2(c.conductor.metodo).map((s) => ({ valor: s, etiqueta: `${formatear(s)} mm²` }))}
          onCambio={(v) => cambiar((x) => void (x.conductor.seccionMm2 = v))}
        />
      ),
    },
    {
      clave: 'caneria',
      etiqueta: 'En la cañería',
      ayuda: 'Circuitos que comparten la cañería, contando este.',
      control: (
        <EntradaNumero
          aria-label="Circuitos que comparten la cañería, contando este"
          title="Circuitos que comparten la cañería, contando este"
          min={1}
          paso={1}
          valor={c.conductor.circuitosEnLaCaneria}
          onCambio={(v) => cambiar((x) => void (x.conductor.circuitosEnLaCaneria = Math.max(1, Math.round(v ?? 1))))}
        />
      ),
    },
    {
      clave: 'diferencial',
      etiqueta: 'Diferencial',
      control: (
        <Selector
          aria-label="Diferencial que protege al circuito"
          valor={c.proteccion.diferencialId ?? ''}
          opciones={diferenciales}
          onCambio={(v) =>
            cambiar((x) => {
              if (v) x.proteccion.diferencialId = v
              else delete x.proteccion.diferencialId
            })
          }
        />
      ),
    },
  ]
}
