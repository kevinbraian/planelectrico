import { useAnalisis } from '@/estado/analisis'
import { actualizarProyecto } from '@/estado/acciones'
import { Boton } from '@/ui/Boton'
import { Campo, EntradaNumero, Selector } from '@/ui/Campos'
import { Dialogo } from '@/ui/Dialogo'

export function DialogoOpciones({ abierto, alCerrar }: { abierto: boolean; alCerrar(): void }) {
  const { proyecto, norma, calculo } = useAnalisis()
  const manual = proyecto.superficieManual

  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo="Opciones del proyecto" pie={<Boton variante="primario" onClick={alCerrar}>Listo</Boton>}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Tipo de trabajo">
            <Selector
              valor={proyecto.modo}
              opciones={[
                { valor: 'relevamiento', etiqueta: 'Relevamiento de una instalación existente' },
                { valor: 'proyecto_nuevo', etiqueta: 'Proyecto de una instalación nueva' },
              ]}
              onCambio={(modo) => actualizarProyecto((p) => void (p.modo = modo))}
            />
          </Campo>
          <Campo etiqueta="Suministro">
            <Selector
              valor={proyecto.suministro.sistema}
              opciones={[
                { valor: 'monofasico', etiqueta: 'Monofásico' },
                { valor: 'trifasico', etiqueta: 'Trifásico' },
              ]}
              onCambio={(sistema) => actualizarProyecto((p) => void (p.suministro.sistema = sistema))}
            />
          </Campo>
        </div>

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-acento"
            checked={proyecto.opciones.aplicarSimultaneidad}
            onChange={(e) => actualizarProyecto((p) => void (p.opciones.aplicarSimultaneidad = e.target.checked))}
          />
          <span>
            Aplicar el coeficiente de simultaneidad
            <span className="block text-xs text-tinta-suave">
              La norma lo permite, no lo exige. Reduce la demanda de los circuitos de uso general y especial según el grado.
            </span>
          </span>
        </label>

        <Campo
          etiqueta="Factor de potencia por defecto"
          ayuda="Se usa para pasar de W a VA en las cargas que no tienen el suyo. Con 1, los VA son iguales a los W."
          className="max-w-56"
        >
          <EntradaNumero
            valor={proyecto.opciones.fpPorDefecto}
            min={0.1}
            max={1}
            paso={0.05}
            onCambio={(v) => {
              if (v !== undefined && v > 0 && v <= 1) actualizarProyecto((p) => void (p.opciones.fpPorDefecto = v))
            }}
          />
        </Campo>

        <div className="flex flex-col gap-3 rounded-lg border border-borde p-3">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-acento"
              checked={manual !== undefined}
              onChange={(e) =>
                actualizarProyecto((p) => {
                  if (e.target.checked) {
                    p.superficieManual = { cubiertaM2: calculo.proyecto.cubiertaM2, semicubiertaM2: calculo.proyecto.semicubiertaM2 }
                  } else {
                    delete p.superficieManual
                  }
                })
              }
            />
            <span>
              Cargar la superficie de la vivienda a mano
              <span className="block text-xs text-tinta-suave">
                Útil si todavía no cargaste todos los ambientes. Mientras esté activo, el grado sale de estos valores.
              </span>
            </span>
          </label>
          {manual && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Superficie cubierta (m²)">
                <EntradaNumero
                  valor={manual.cubiertaM2}
                  min={0}
                  onCambio={(v) => actualizarProyecto((p) => void (p.superficieManual && (p.superficieManual.cubiertaM2 = v ?? 0)))}
                />
              </Campo>
              <Campo etiqueta="Superficie semicubierta (m²)">
                <EntradaNumero
                  valor={manual.semicubiertaM2}
                  min={0}
                  onCambio={(v) => actualizarProyecto((p) => void (p.superficieManual && (p.superficieManual.semicubiertaM2 = v ?? 0)))}
                />
              </Campo>
            </div>
          )}
        </div>

        <p className="text-xs text-tinta-suave">
          Norma: {norma.nombre}, edición {norma.edicion}. {norma.alcance}.
        </p>
      </div>
    </Dialogo>
  )
}
