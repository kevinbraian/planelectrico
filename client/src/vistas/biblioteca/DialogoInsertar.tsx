import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { bocasDe, circuitosOrdenados, codigoCircuito } from '@/dominio/modelo/consultas'
import { describirElemento } from '@/dominio/modelo/etiquetas'
import type { Id } from '@/dominio/modelo/tipos'
import { buscarPlantilla } from '@/dominio/plantillas/biblioteca'
import { resumirPlantilla } from '@/dominio/plantillas/etiquetas'
import type { PlantillaCircuito } from '@/dominio/plantillas/tipos'
import { formatear } from '@/dominio/util/numeros'
import { agregarCircuito, insertarPlantilla } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { useUiStore } from '@/estado/uiStore'
import { useAmbienteParaLoNuevo, useCircuitoActivo } from '@/shell/navegacion'
import { Boton } from '@/ui/Boton'
import { Campo, EntradaNumero, Selector } from '@/ui/Campos'
import { Dialogo } from '@/ui/Dialogo'
import { Insignia } from '@/ui/Insignia'
import { useOpcionesDeAmbiente } from '../circuitos/opciones'

const NUEVO = 'nuevo:'

function Formulario({ plantilla, alTerminar }: { plantilla: PlantillaCircuito; alTerminar(): void }) {
  const { proyecto, norma } = useAnalisis()
  const navegar = useNavigate()
  const activo = useCircuitoActivo()
  const ambientes = useOpcionesDeAmbiente()
  const ambientePorDefecto = useAmbienteParaLoNuevo()

  const [circuitos, setCircuitos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      plantilla.ranuras.map((r) => {
        const admitidos = circuitosOrdenados(proyecto).filter((c) => r.tiposAdmitidos.includes(c.tipo))
        const elegido = admitidos.find((c) => c.id === activo?.id) ?? admitidos[0]
        return [r.id, elegido?.id ?? `${NUEVO}${r.tiposAdmitidos[0] ?? ''}`]
      }),
    ),
  )
  const [parametros, setParametros] = useState<Record<string, number>>(() => Object.fromEntries(plantilla.parametros.map((x) => [x.id, x.porDefecto])))
  const [ambienteId, setAmbienteId] = useState(ambientePorDefecto ?? '')
  const [enlazar, setEnlazar] = useState<Record<string, Id[]>>({})
  const [errores, setErrores] = useState<string[]>([])

  const resumen = resumirPlantilla(plantilla, norma, parametros)

  /** Bocas del circuito elegido que podrían cumplir un rol, en vez de crear nuevas. */
  const candidatas = plantilla.roles.flatMap((rol) => {
    const elemento = rol.elemento
    const circuitoId = circuitos[rol.ranura] ?? ''
    if (elemento.clase !== 'boca' || circuitoId.startsWith(NUEVO)) return []
    const bocas = bocasDe(proyecto, circuitoId).filter((b) => b.uso === elemento.uso)
    return bocas.length > 0 ? [{ rol, bocas }] : []
  })

  const insertar = () => {
    const elegidos: Record<string, Id> = {}
    for (const r of plantilla.ranuras) {
      const valor = circuitos[r.id] ?? ''
      elegidos[r.id] = valor.startsWith(NUEVO) ? agregarCircuito(norma, valor.slice(NUEVO.length)) : valor
    }
    const resultado = insertarPlantilla(norma, plantilla, { circuitos: elegidos, parametros, ambienteId: ambienteId || null, enlazar })
    if (!resultado.ok) {
      setErrores(resultado.errores)
      return
    }
    const { elegirCircuito, resaltar } = useUiStore.getState()
    const primeraRanura = plantilla.ranuras[0]
    if (primeraRanura) elegirCircuito(elegidos[primeraRanura.id] ?? null)
    resaltar(Object.values(resultado.grupo.roles).flat()[0])
    navegar(`/p/${proyecto.id}/circuitos`)
    alTerminar()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-tinta-suave">{plantilla.descripcion}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {plantilla.ranuras.map((r) => (
          <Campo key={r.id} etiqueta={r.etiqueta ?? 'Circuito'}>
            <Selector
              valor={circuitos[r.id] ?? ''}
              opciones={[
                ...circuitosOrdenados(proyecto)
                  .filter((c) => r.tiposAdmitidos.includes(c.tipo))
                  .map((c) => ({ valor: c.id, etiqueta: `${codigoCircuito(proyecto, c.id)} · ${c.nombre}` })),
                ...r.tiposAdmitidos.map((tipo) => ({ valor: `${NUEVO}${tipo}`, etiqueta: `Crear un circuito ${tipo} nuevo` })),
              ]}
              onCambio={(v) => {
                setCircuitos({ ...circuitos, [r.id]: v })
                // Las bocas elegidas para combinar eran del circuito anterior.
                setEnlazar(Object.fromEntries(Object.entries(enlazar).filter(([rolId]) => plantilla.roles.find((x) => x.id === rolId)?.ranura !== r.id)))
              }}
            />
          </Campo>
        ))}
        {plantilla.parametros.map((x) => (
          <Campo key={x.id} etiqueta={x.etiqueta} ayuda={`Entre ${x.min} y ${x.max}`}>
            <EntradaNumero
              min={x.min}
              max={x.max}
              paso={1}
              valor={parametros[x.id]}
              onCambio={(v) => setParametros({ ...parametros, [x.id]: Math.min(x.max, Math.max(x.min, Math.round(v ?? x.min))) })}
            />
          </Campo>
        ))}
        <Campo etiqueta="Ambiente">
          <Selector valor={ambienteId} opciones={ambientes} onCambio={(v) => setAmbienteId(v)} />
        </Campo>
      </div>

      {candidatas.length > 0 && (
        <details className="group rounded-lg border border-borde">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-medium [&::-webkit-details-marker]:hidden">
            <span className="text-tinta-tenue transition-transform group-open:rotate-90">›</span>
            Combinar con bocas que ya están en el circuito
          </summary>
          <div className="flex flex-col gap-3 px-3 pb-3">
            <p className="text-xs text-tinta-suave">Si marcás alguna, la plantilla usa esas bocas para ese rol en vez de crear nuevas.</p>
            {candidatas.map(({ rol, bocas }) => (
              <fieldset key={rol.id} className="flex flex-col gap-1">
                <legend className="mb-1 text-xs font-medium text-tinta-suave">{rol.etiqueta}</legend>
                {bocas.map((b) => {
                  const marcadas = enlazar[rol.id] ?? []
                  return (
                    <label key={b.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="size-4 accent-acento"
                        checked={marcadas.includes(b.id)}
                        onChange={(e) =>
                          setEnlazar({ ...enlazar, [rol.id]: e.target.checked ? [...marcadas, b.id] : marcadas.filter((id) => id !== b.id) })
                        }
                      />
                      {describirElemento(proyecto, b)}
                    </label>
                  )
                })}
              </fieldset>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-2 rounded-lg bg-hundido p-3">
        <p className="text-xs font-medium text-tinta-suave">Va a quedar en el proyecto</p>
        <div className="flex flex-wrap gap-1.5">
          {resumen.elementos.map((e) => {
            const usadas = enlazar[e.rol]?.length ?? 0
            return (
              <Insignia key={e.rol} tono={e.esBoca ? 'acento' : 'neutro'} className="bg-panel">
                {usadas > 0 ? `${e.etiqueta}: usa ${usadas} que ya ${usadas === 1 ? 'existe' : 'existen'}` : `${e.cantidad} × ${e.etiqueta}`}
              </Insignia>
            )
          })}
        </div>
        <p className="text-xs text-tinta-suave">
          Conductores:{' '}
          {resumen.conductores
            .map((c) => `${c.cantidad} × ${c.etiqueta.toLowerCase()}${c.seccionMinimaMm2 !== undefined ? ` (mín. ${formatear(c.seccionMinimaMm2)} mm²)` : ''}`)
            .join(', ')}
          .
        </p>
      </div>

      {errores.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 rounded-lg bg-error-suave py-2 pl-7 pr-3 text-error">
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <Boton onClick={alTerminar}>Cancelar</Boton>
        <Boton variante="primario" onClick={insertar}>
          Insertar
        </Boton>
      </div>
    </div>
  )
}

/** Diálogo para insertar una plantilla: en qué circuito, con qué parámetros y combinada con qué. */
export function DialogoInsertar() {
  const { proyecto } = useAnalisis()
  const plantillaId = useUiStore((s) => s.plantillaAInsertar)
  const cerrar = () => useUiStore.getState().insertarPlantilla(null)
  const plantilla = plantillaId ? buscarPlantilla(proyecto, plantillaId) : undefined

  return (
    <Dialogo abierto={plantilla !== undefined} alCerrar={cerrar} titulo={plantilla ? `Insertar: ${plantilla.nombre}` : 'Insertar plantilla'}>
      {plantilla && <Formulario key={plantilla.id} plantilla={plantilla} alTerminar={cerrar} />}
    </Dialogo>
  )
}
