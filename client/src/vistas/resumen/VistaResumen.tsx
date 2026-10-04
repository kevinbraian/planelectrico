import { CircleCheck, Clock, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DIAS_POR_MES } from '@/dominio/calculo/potencia'
import { AVISO_LEGAL } from '@/dominio/modelo/archivo'
import { circuitosOrdenados, ordenar } from '@/dominio/modelo/consultas'
import { contarPorSeveridad } from '@/dominio/reglas/filtros'
import { REGLAS_BASE } from '@/dominio/reglas/indice'
import { FUERA_DE_LA_VERIFICACION } from '@/dominio/reglas/motor'
import { formatear } from '@/dominio/util/numeros'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { descargarProyecto } from '@/shell/archivos'
import { useIrAAdvertencia } from '@/shell/navegacion'
import { ItemAdvertencia } from '@/shell/PanelAdvertencias'
import { Boton } from '@/ui/Boton'
import { Dato, Desplegable, Vacio } from '@/ui/Dato'
import { Insignia } from '@/ui/Insignia'
import { Cita, ListaDePasos } from '@/ui/Pasos'
import { Tarjeta } from '@/ui/Tarjeta'
import { EstadoCircuito } from '../circuitos/EstadoCircuito'

export function VistaResumen() {
  const { proyecto, norma, normaEncontrada, calculo, advertencias } = useAnalisis()
  const navegar = useNavigate()
  const elegirCircuito = useUiStore((s) => s.elegirCircuito)
  const irA = useIrAAdvertencia()

  const r = calculo.proyecto
  const circuitos = circuitosOrdenados(proyecto)
  const cabecera = ordenar(Object.values(proyecto.tableros))[0]?.cabecera
  const cuenta = contarPorSeveridad(advertencias)
  const aCorregir = advertencias.filter((a) => a.severidad !== 'info')
  const informativas = advertencias.filter((a) => a.severidad === 'info')
  const bloques = norma.verificacion()
  const sinVerificar = bloques.filter((b) => !b.verificado).length
  const esRelevamiento = proyecto.modo === 'relevamiento'

  return (
    <>
      <Tarjeta
        titulo="Instalación"
        descripcion={`${esRelevamiento ? 'Relevamiento de una instalación existente' : 'Proyecto de una instalación nueva'} · suministro ${proyecto.suministro.sistema === 'trifasico' ? 'trifásico' : 'monofásico'} de ${r.tensionV} V`}
        acciones={
          <Boton icono={<Download size={16} />} onClick={() => descargarProyecto(proyecto)}>
            Exportar
          </Boton>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Dato etiqueta="Grado" valor={r.grado?.valor.nombre ?? '—'} detalle={`${formatear(r.superficie.valor)} m² computables`} />
            <Dato
              etiqueta="Circuitos"
              valor={circuitos.length}
              detalle={r.circuitosMinimos ? `mínimo ${r.circuitosMinimos.valor.total}` : undefined}
              tono={r.circuitosMinimos && circuitos.length < r.circuitosMinimos.valor.total ? 'error' : undefined}
            />
            <Dato etiqueta="Carga total" valor={formatear(r.cargaTotal.valor, 0)} unidad="VA" detalle={`coeficiente ${formatear(r.coeficienteAplicado)}`} />
            <Dato
              etiqueta="Corriente total"
              valor={formatear(r.corrienteTotal.valor)}
              unidad="A"
              detalle={cabecera ? `cabecera de ${cabecera.inA} A` : 'cabecera sin cargar'}
              tono={cabecera && r.corrienteTotal.valor > cabecera.inA ? 'aviso' : undefined}
            />
            <Dato
              etiqueta="Consumo estimado"
              valor={formatear(r.energiaMensualKWh, 0)}
              unidad="kWh/mes"
              detalle={r.energiaMensualKWh > 0 ? `cargas con horas de uso, ${DIAS_POR_MES} días` : 'cargá horas por día en las cargas'}
            />
          </div>
          <Desplegable titulo="Cómo se calcula">
            <ListaDePasos pasos={[...r.superficie.pasos, ...r.cargaTotal.pasos, ...r.corrienteTotal.pasos]} />
          </Desplegable>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Circuitos" descripcion="Tocá una fila para abrir el circuito." alBorde>
        {circuitos.length === 0 ? (
          <Vacio titulo="Todavía no hay circuitos" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left tabular-nums">
              <thead className="text-xs text-tinta-suave">
                <tr>
                  {['N.º', 'Nombre', 'Tipo', 'Bocas', 'Instalada (VA)', 'DPMS (VA)', 'Ib (A)', 'In (A)', 'Iz (A)', 'Sección (mm²)', 'kWh/mes', 'Estado'].map((titulo, i) => (
                    <th key={titulo} className={`py-2 font-medium ${i === 0 ? 'pl-4 pr-2' : 'px-2'}`}>
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {circuitos.map((c) => {
                  const rc = calculo.circuitos[c.id]
                  if (!rc) return null
                  const max = rc.tipo?.valor.maxBocas
                  return (
                    <tr
                      key={c.id}
                      className="cursor-pointer border-t border-borde transition-colors hover:bg-hundido"
                      onClick={() => {
                        elegirCircuito(c.id)
                        navegar(`/p/${proyecto.id}/circuitos`)
                      }}
                    >
                      <td className="py-2 pl-4 pr-2 font-semibold">{rc.codigo}</td>
                      <td className="px-2 py-2">{c.nombre}</td>
                      <td className="px-2 py-2">{c.tipo}</td>
                      <td className="px-2 py-2">
                        {rc.bocas}
                        {max !== undefined && <span className="text-tinta-tenue">/{max}</span>}
                      </td>
                      <td className="px-2 py-2">{formatear(rc.potenciaInstaladaVA, 0)}</td>
                      <td className="px-2 py-2">{formatear(rc.dpms.valor, 0)}</td>
                      <td className="px-2 py-2">{formatear(rc.ib.valor)}</td>
                      <td className="px-2 py-2">{formatear(rc.inA)}</td>
                      <td className="px-2 py-2">{rc.iz.ok ? formatear(rc.iz.valor) : '—'}</td>
                      <td className="px-2 py-2">{formatear(c.conductor.seccionMm2)}</td>
                      <td className="px-2 py-2">{rc.energiaMensualKWh > 0 ? formatear(rc.energiaMensualKWh, 0) : '—'}</td>
                      <td className="px-2 py-2">
                        <EstadoCircuito circuitoId={c.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Verificación"
        descripcion={esRelevamiento ? 'Lo marcado como error no cumple la reglamentación vigente, aunque la instalación sea anterior a ella.' : undefined}
        acciones={
          <>
            <Insignia tono={cuenta.error > 0 ? 'error' : 'neutro'}>{cuenta.error} errores</Insignia>
            <Insignia tono={cuenta.aviso > 0 ? 'aviso' : 'neutro'}>{cuenta.aviso} avisos</Insignia>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {aCorregir.length === 0 ? (
            <p className="flex items-center gap-2 text-ok">
              <CircleCheck size={18} />
              Las verificaciones que hace la app no encontraron observaciones.
            </p>
          ) : (
            <ul className="flex flex-col">
              {aCorregir.map((a) => (
                <li key={a.id}>
                  <ItemAdvertencia advertencia={a} alElegir={irA} />
                </li>
              ))}
            </ul>
          )}
          {informativas.length > 0 && (
            <Desplegable titulo={`Información (${informativas.length})`}>
              <ul className="flex flex-col gap-2">
                {informativas.map((a) => (
                  <li key={a.id}>
                    <ItemAdvertencia advertencia={a} />
                  </li>
                ))}
              </ul>
            </Desplegable>
          )}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Alcance de la verificación" descripcion="Que no haya observaciones no significa que la instalación cumpla la norma: la app revisa solo una parte.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-1.5 font-semibold">Lo que se verificó</h3>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-tinta-suave">
              {REGLAS_BASE.map((regla) => (
                <li key={regla.id}>{regla.titulo}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1.5 font-semibold">Lo que no se verifica</h3>
            <ul className="flex list-disc flex-col gap-0.5 pl-5 text-tinta-suave">
              {FUERA_DE_LA_VERIFICACION.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Datos de la norma"
        descripcion={`${norma.nombre}, edición ${norma.edicion}. ${norma.alcance}.`}
        acciones={<Insignia tono={sinVerificar > 0 ? 'aviso' : 'ok'}>{sinVerificar === 0 ? 'Todo verificado' : `${sinVerificar} de ${bloques.length} sin verificar`}</Insignia>}
      >
        <div className="flex flex-col gap-3">
          {!normaEncontrada && (
            <p className="rounded-lg bg-error-suave px-3 py-2 text-error">
              El proyecto se cargó con una norma ({proyecto.norma.id}, edición {proyecto.norma.edicion}) que esta versión de la app no trae. Se está
              verificando con {norma.nombre}.
            </p>
          )}
          <p className="text-tinta-suave">
            Los valores se transcribieron a mano. Un bloque figura como verificado recién cuando una persona lo contrastó contra el documento; el resto
            coincide con el texto del PDF, pero falta esa revisión. Corresponde también chequear adendas y corrigendas de la AEA.
          </p>
          <ul className="grid gap-x-6 gap-y-1.5 md:grid-cols-2">
            {bloques.map((b) => (
              <li key={b.bloque} className="flex items-start gap-2">
                {b.verificado ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-ok" /> : <Clock size={16} className="mt-0.5 shrink-0 text-aviso" />}
                <span className="flex flex-col">
                  {b.bloque}
                  <Cita referencia={b.ref} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Tarjeta>

      <p className="rounded-tarjeta border border-aviso/25 bg-aviso-suave px-4 py-3 text-aviso">{AVISO_LEGAL}</p>
    </>
  )
}
