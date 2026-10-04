import { Plus, RotateCcw, Trash } from 'lucide-react'
import { catalogoEfectivo, esDeLaBase, estaCorregido, NOTA_DEL_CATALOGO, nuevoArtefacto } from '@/dominio/catalogo/catalogo'
import type { ArtefactoCatalogo } from '@/dominio/catalogo/tipos'
import { guardarArtefacto, quitarArtefacto } from '@/estado/acciones'
import { useAnalisis } from '@/estado/analisis'
import { Boton } from '@/ui/Boton'
import { EntradaNumero, EntradaTexto, Selector } from '@/ui/Campos'
import { Insignia } from '@/ui/Insignia'
import { Tarjeta } from '@/ui/Tarjeta'
import { TIPOS_CARGA, UNIDADES } from '../circuitos/opciones'

function FilaDeArtefacto({ artefacto: a, categorias }: { artefacto: ArtefactoCatalogo; categorias: string[] }) {
  const { proyecto } = useAnalisis()
  const cambiar = (cambios: Partial<ArtefactoCatalogo>) => guardarArtefacto({ ...a, ...cambios })
  const deLaBase = esDeLaBase(a.id)
  const corregido = estaCorregido(proyecto, a.id)
  /** Un número opcional entre 0 y `max`; vacío o fuera de rango lo quita. */
  const opcional = (v: number | undefined, max: number) => (v === undefined || v < 0 || v > max ? undefined : v)

  return (
    <tr className="border-t border-borde">
      <td className="py-1.5 pl-4 pr-1.5">
        <EntradaTexto aria-label="Nombre del aparato" valor={a.nombre} onCambio={(nombre) => cambiar({ nombre })} />
      </td>
      <td className="px-1.5 py-1.5">
        <Selector aria-label="Categoría" valor={a.categoria} opciones={categorias.map((c) => ({ valor: c, etiqueta: c }))} onCambio={(categoria) => cambiar({ categoria })} />
      </td>
      <td className="px-1.5 py-1.5">
        <Selector aria-label="Tipo de carga" valor={a.tipo} opciones={TIPOS_CARGA} onCambio={(tipo) => cambiar({ tipo })} />
      </td>
      <td className="px-1.5 py-1.5">
        <EntradaNumero
          aria-label="Potencia"
          min={0}
          valor={a.potencia.valor}
          onCambio={(v) => v !== undefined && v >= 0 && cambiar({ potencia: { ...a.potencia, valor: v } })}
        />
      </td>
      <td className="px-1.5 py-1.5">
        <Selector
          aria-label="Unidad"
          valor={a.potencia.unidad}
          opciones={UNIDADES}
          onCambio={(unidad) => cambiar({ potencia: unidad === 'VA' ? { valor: a.potencia.valor, unidad } : { ...a.potencia, unidad } })}
        />
      </td>
      <td className="px-1.5 py-1.5">
        {a.potencia.unidad === 'W' ? (
          <EntradaNumero
            aria-label="Factor de potencia"
            min={0.1}
            max={1}
            paso={0.05}
            placeholder="—"
            valor={a.potencia.fp}
            onCambio={(v) => {
              const fp = opcional(v, 1)
              cambiar({ potencia: fp ? { ...a.potencia, fp } : { valor: a.potencia.valor, unidad: a.potencia.unidad } })
            }}
          />
        ) : (
          <span className="flex h-8 items-center text-tinta-tenue">—</span>
        )}
      </td>
      <td className="px-1.5 py-1.5">
        <EntradaNumero
          aria-label="Horas por día"
          min={0}
          max={24}
          placeholder="—"
          valor={a.horasDia}
          onCambio={(v) => {
            const siguiente = { ...a }
            const horasDia = opcional(v, 24)
            if (horasDia === undefined) delete siguiente.horasDia
            else siguiente.horasDia = horasDia
            guardarArtefacto(siguiente)
          }}
        />
      </td>
      <td className="px-1.5 py-1.5">
        {!deLaBase ? <Insignia tono="info">Propio</Insignia> : corregido ? <Insignia tono="aviso">Corregido</Insignia> : <Insignia>Base</Insignia>}
      </td>
      <td className="py-1.5 pl-1.5 pr-3 text-right">
        {!deLaBase && (
          <Boton variante="peligro" icono={<Trash size={15} />} aria-label={`Borrar ${a.nombre}`} title="Borrar del catálogo" onClick={() => quitarArtefacto(a.id)} />
        )}
        {corregido && (
          <Boton variante="fantasma" icono={<RotateCcw size={15} />} aria-label={`Restaurar ${a.nombre}`} title="Volver a los valores de la base" onClick={() => quitarArtefacto(a.id)} />
        )}
      </td>
    </tr>
  )
}

export function VistaCatalogo() {
  const { proyecto } = useAnalisis()
  const catalogo = catalogoEfectivo(proyecto)
  const categorias = [...new Set(catalogo.map((a) => a.categoria))]

  return (
    <Tarjeta
      titulo="Catálogo de aparatos"
      descripcion={`${NOTA_DEL_CATALOGO} Editarlo no cambia lo que ya cargaste: cada carga guarda su propia potencia.`}
      acciones={
        <Boton variante="primario" icono={<Plus size={16} />} onClick={() => guardarArtefacto(nuevoArtefacto())}>
          Agregar aparato
        </Boton>
      }
      alBorde
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[60rem] text-left">
          <thead className="text-xs text-tinta-suave">
            <tr>
              <th className="py-2 pl-4 pr-1.5 font-medium">Aparato</th>
              <th className="w-36 px-1.5 py-2 font-medium">Categoría</th>
              <th className="w-40 px-1.5 py-2 font-medium">Tipo</th>
              <th className="w-24 px-1.5 py-2 font-medium">Potencia</th>
              <th className="w-[4.5rem] px-1.5 py-2 font-medium">Unidad</th>
              <th className="w-20 px-1.5 py-2 font-medium" title="Factor de potencia, para pasar de W a VA">
                cos φ
              </th>
              <th className="w-24 px-1.5 py-2 font-medium" title="Horas por día a potencia plena, para estimar el consumo del mes">
                Horas/día
              </th>
              <th className="w-24 px-1.5 py-2 font-medium">Origen</th>
              <th className="w-12" />
            </tr>
          </thead>
          {categorias.map((categoria) => (
            <tbody key={categoria}>
              <tr className="border-t border-borde bg-hundido">
                <th colSpan={9} className="px-4 py-1.5 text-xs font-semibold">
                  {categoria}
                </th>
              </tr>
              {catalogo
                .filter((a) => a.categoria === categoria)
                .map((a) => (
                  <FilaDeArtefacto key={a.id} artefacto={a} categorias={categorias} />
                ))}
            </tbody>
          ))}
        </table>
      </div>
    </Tarjeta>
  )
}
