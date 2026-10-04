import { Plus } from 'lucide-react'
import { useState } from 'react'
import { bocasDe, circuitosOrdenados, mandosDe } from '@/dominio/modelo/consultas'
import { ETIQUETA_USO_BOCA } from '@/dominio/modelo/etiquetas'
import type { Circuito, TipoMando, UsoBoca } from '@/dominio/modelo/tipos'
import { advertenciasDeCircuito, contarPorSeveridad } from '@/dominio/reglas/filtros'
import { actualizarCircuito, agregarBoca, agregarCircuito, agregarMando } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { useAmbienteParaLoNuevo, useCircuitoActivo, useResaltado } from '@/shell/navegacion'
import { Boton } from '@/ui/Boton'
import { Campo, EntradaNumero, Selector } from '@/ui/Campos'
import { cx } from '@/ui/cx'
import { Vacio } from '@/ui/Dato'
import { Insignia } from '@/ui/Insignia'
import { Tarjeta } from '@/ui/Tarjeta'
import { TarjetaBoca } from './Bocas'
import { camposDeCircuito } from './camposCircuito'
import { FilaMando } from './Mandos'
import { TIPOS_MANDO, useOpcionesDeAmbiente } from './opciones'
import { PlantillasDelCircuito } from './PlantillasDelCircuito'
import { ResumenDelCircuito } from './ResumenDelCircuito'

const USOS_DE_BOCA: UsoBoca[] = ['iluminacion', 'tomacorriente', 'mixta', 'conexion_fija']

function BotonesDeCircuito() {
  const { norma } = useAnalisis()
  const { elegirCircuito } = useUiStore.getState()
  return norma.tiposCircuito().map((t) => (
    <Boton key={t.id} icono={<Plus size={16} />} title={`Agregar un circuito de ${t.nombre.toLowerCase()}`} onClick={() => elegirCircuito(agregarCircuito(norma, t.id))}>
      {t.id === 'ESPECIFICO' ? 'Específico' : t.id}
    </Boton>
  ))
}

/** Los circuitos como pestañitas, con un punto de color según su estado. */
function SelectorDeCircuito({ activo }: { activo: Circuito }) {
  const { proyecto, calculo, advertencias } = useAnalisis()
  const elegirCircuito = useUiStore((s) => s.elegirCircuito)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {circuitosOrdenados(proyecto).map((c) => {
        const { error, aviso } = contarPorSeveridad(advertenciasDeCircuito(proyecto, advertencias, c.id))
        const elegido = c.id === activo.id
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={elegido}
            onClick={() => elegirCircuito(c.id)}
            className={cx(
              'flex h-8 items-center gap-2 rounded-lg border px-2.5 font-medium transition-colors',
              elegido ? 'border-acento bg-acento text-white' : 'border-borde bg-panel hover:bg-hundido',
            )}
          >
            <span className={cx('size-2 rounded-full', error > 0 ? 'bg-error' : aviso > 0 ? 'bg-aviso' : 'bg-ok', elegido && 'ring-2 ring-white/70')} />
            {calculo.circuitos[c.id]?.codigo} · {c.nombre}
          </button>
        )
      })}
      <span className="mx-1 h-6 w-px bg-borde" />
      <BotonesDeCircuito />
    </div>
  )
}

function DetalleDeCircuito({ circuito: c }: { circuito: Circuito }) {
  const { proyecto, norma, calculo } = useAnalisis()
  const { resaltar, elegirAmbiente } = useUiStore.getState()
  const { ref, className } = useResaltado<HTMLDivElement>(c.id)
  const ambienteId = useAmbienteParaLoNuevo()
  const ambientes = useOpcionesDeAmbiente()
  const [mandoNuevo, setMandoNuevo] = useState<TipoMando>('interruptor')

  const r = calculo.circuitos[c.id]
  const tipo = r?.tipo?.valor
  const bocas = bocasDe(proyecto, c.id)
  const mandos = mandosDe(proyecto, c.id)

  return (
    <>
      <div ref={ref} className={cx('rounded-tarjeta', className)}>
        <Tarjeta
          titulo={
            <span className="flex flex-wrap items-center gap-2">
              {r?.codigo} · {c.nombre}
              <Insignia tono="acento">{c.tipo}</Insignia>
            </span>
          }
          descripcion={tipo ? [tipo.nombre, tipo.tomaTipo && `tomas ${tipo.tomaTipo}`, tipo.nota].filter(Boolean).join(' · ') : 'Tipo de circuito desconocido para la norma cargada.'}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {camposDeCircuito(c, norma, proyecto.tableros[c.tableroId]).map((campo) => (
              <Campo key={campo.clave} etiqueta={campo.etiqueta} className={campo.clave === 'nombre' || campo.clave === 'diferencial' ? 'col-span-2 xl:col-span-1' : undefined}>
                {campo.control}
              </Campo>
            ))}
            {tipo && !tipo.enAlcance && (
              <Campo etiqueta="Demanda (VA)" className="col-span-2 xl:col-span-1">
                <EntradaNumero
                  min={0}
                  placeholder="Carga conocida"
                  title="La define el proyectista. Vacío: se usa la suma de lo conectado."
                  valor={c.demandaManualVA}
                  onCambio={(v) =>
                    actualizarCircuito(c.id, (x) => {
                      if (v === undefined || v < 0) delete x.demandaManualVA
                      else x.demandaManualVA = v
                    })
                  }
                />
              </Campo>
            )}
          </div>
        </Tarjeta>
      </div>

      {r && <ResumenDelCircuito circuito={c} resumen={r} />}

      <Tarjeta
        titulo="Bocas y lo que tienen conectado"
        descripcion="Una boca es el punto donde se conecta un aparato: un punto de luz o una caja con tomacorrientes."
        acciones={
          <>
            <Selector
              aria-label="Ambiente para lo que se agregue"
              title="Ambiente que se le pone a lo que agregues"
              className="w-56"
              valor={ambienteId ?? ''}
              opciones={ambientes}
              onCambio={(v) => elegirAmbiente(v || null)}
            />
            {USOS_DE_BOCA.map((uso) => (
              <Boton key={uso} icono={<Plus size={16} />} title={`Agregar: ${ETIQUETA_USO_BOCA[uso]}`} onClick={() => resaltar(agregarBoca(norma, c.id, uso, ambienteId))}>
                {uso === 'iluminacion' ? 'Luz' : uso === 'tomacorriente' ? 'Toma' : uso === 'mixta' ? 'Mixta' : 'Fija'}
              </Boton>
            ))}
          </>
        }
      >
        {bocas.length === 0 ? (
          <Vacio titulo="Este circuito todavía no tiene bocas">Elegí el ambiente y agregá puntos de luz o tomacorrientes con los botones de arriba.</Vacio>
        ) : (
          <div className="flex flex-col gap-2">
            {bocas.map((b) => (
              <TarjetaBoca key={b.id} boca={b} />
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Interruptores y automatismos"
        descripcion="No cuentan como bocas. Indicá qué bocas maneja cada uno."
        acciones={
          <>
            <Selector aria-label="Tipo de mando a agregar" className="w-52" valor={mandoNuevo} opciones={TIPOS_MANDO} onCambio={(v) => setMandoNuevo(v)} />
            <Boton icono={<Plus size={16} />} onClick={() => resaltar(agregarMando(c.id, mandoNuevo, ambienteId))}>
              Agregar
            </Boton>
          </>
        }
      >
        {mandos.length === 0 ? (
          <p className="text-tinta-suave">Todavía no cargaste ninguno.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {mandos.map((m) => (
              <FilaMando key={m.id} mando={m} bocas={bocas} />
            ))}
          </div>
        )}
      </Tarjeta>

      <PlantillasDelCircuito circuitoId={c.id} />
    </>
  )
}

export function VistaCircuitos() {
  const circuito = useCircuitoActivo()
  if (!circuito) {
    return (
      <Tarjeta>
        <Vacio titulo="Todavía no hay circuitos">
          Agregá uno por cada térmica del tablero. Después le cargás sus bocas y lo que tiene conectado.
          <span className="flex flex-wrap justify-center gap-2">
            <BotonesDeCircuito />
          </span>
        </Vacio>
      </Tarjeta>
    )
  }
  return (
    <>
      <SelectorDeCircuito activo={circuito} />
      <DetalleDeCircuito key={circuito.id} circuito={circuito} />
    </>
  )
}
