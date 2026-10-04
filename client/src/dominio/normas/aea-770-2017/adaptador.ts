import type {
  BloqueVerificacion,
  ClaseCircuito,
  Normativa,
  PuntosMinimos,
  Referencia,
  TipoCircuitoDef,
  UsoAmbienteDef,
} from '../contrato'
import { formatear, redondear } from '../../util/numeros'
import type { CeldaPmu, DatosAea770, FilaPmu } from './esquema'

/**
 * Cómo se relaciona cada tipo de circuito con las claves de las otras tablas.
 * Son nombres de claves del JSON, no valores normativos.
 */
const TIPOS: Record<
  string,
  { clase: ClaseCircuito; dpms?: string; dpmsConTomas?: string; seccion: string; seccionConTomas?: string }
> = {
  IUG: {
    clase: 'iluminacion',
    dpms: 'IUG_sin_tomas',
    dpmsConTomas: 'IUG_con_tomas',
    seccion: 'IUG',
    seccionConTomas: 'IUG_con_tomas_derivados',
  },
  TUG: { clase: 'tomacorriente', dpms: 'TUG', seccion: 'TUG' },
  TUE: { clase: 'tomacorriente', dpms: 'TUE', seccion: 'TUE' },
  ESPECIFICO: { clase: 'especifico', seccion: 'especifico' },
}

/**
 * Función de un conductor → fila de la tabla de secciones mínimas. Los viajeros
 * de una combinación no están: la tabla no los nombra y falta decidir si
 * cuentan como retornos.
 */
const FUNCIONES: Record<string, string> = {
  alimentacion_efecto: 'alimentacion_interruptores_efecto',
  retorno: 'retorno_interruptores_efecto',
  pe: 'PE',
}

const NOMBRES_BLOQUE: Record<string, string> = {
  alimentacion: 'Características de la alimentación',
  superficieComputable: 'Superficie computable',
  gradosElectrificacion: 'Grados de electrificación',
  circuitosMinimos: 'Cantidad mínima de circuitos',
  tiposCircuito: 'Tipos de circuito',
  conteoBocas: 'Conteo de bocas',
  pmu: 'Puntos mínimos de utilización',
  demanda: 'Demanda de potencia',
  conductores: 'Secciones mínimas',
  ampacidad: 'Corriente admisible y agrupamiento',
  proteccion: 'Protección y coordinación',
}

type RefDatos = { clausula?: string; tabla?: string; pagina?: number }

function enRango(m2: number, r: FilaPmu['m2']): boolean {
  if (!r) return true
  if (r.min !== undefined && (r.minInclusivo ? m2 < r.min : m2 <= r.min)) return false
  if (r.max !== undefined && (r.maxInclusivo ? m2 > r.max : m2 >= r.max)) return false
  return true
}

export function crearNormativaAea770(d: DatosAea770): Normativa {
  const norma = d._meta.norma
  const cita = (r: RefDatos): Referencia => ({ origen: 'norma', norma, ...r })

  const filas = d.pmu.ambientes
  const usoDeFila = (clave: string, fila: FilaPmu) => fila.uso ?? clave
  /** Una fila puede remitir a otra ("toilette" usa las celdas de "baño"). */
  const celdasDe = (fila: FilaPmu): FilaPmu => (fila.comoFila ? (filas[fila.comoFila] ?? fila) : fila)

  function celda(fila: FilaPmu, gradoId: string, tipo: string): CeldaPmu | null | undefined {
    const base = celdasDe(fila)
    const delGrado = base.porGrado?.[gradoId]
    if (delGrado && tipo in delGrado) return delGrado[tipo]
    return base.todos?.[tipo]
  }

  function bocasDeCelda(c: CeldaPmu | null | undefined, m2: number, largoM: number | undefined) {
    if (!c) return { bocas: 0, modulos: 0, faltaLargo: false }
    let bocas = 0
    let faltaLargo = false
    let exigeMinimo = true
    if (c.fijo !== undefined) {
      bocas = c.fijo
    } else if (c.porM2 !== undefined) {
      bocas = Math.ceil(m2 / c.porM2)
    } else if (c.porMetroLineal !== undefined) {
      if (largoM === undefined || !(largoM > 0)) {
        faltaLargo = true
      } else if (c.soloSiLargoMayorA !== undefined && largoM <= c.soloSiLargoMayorA) {
        exigeMinimo = false
      } else {
        bocas = Math.ceil(largoM / c.porMetroLineal)
      }
    }
    if (exigeMinimo && c.minimo !== undefined) bocas = Math.max(bocas, c.minimo)
    return { bocas, modulos: c.modulos ?? 0, faltaLargo }
  }

  const tiposDef: TipoCircuitoDef[] = Object.entries(d.tiposCircuito.tipos).map(([id, t]) => {
    const mapa = TIPOS[id]
    const clase = mapa?.clase ?? 'especifico'
    return {
      id,
      nombre: t.nombre,
      clase,
      enAlcance: clase !== 'especifico',
      admiteTomasDerivadas: mapa?.dpmsConTomas !== undefined,
      maxBocas: t.maxBocas,
      maxProteccionA: t.maxProteccionA,
      cargaUnitariaMaxA: t.cargaUnitariaMaxA,
      tomaTipo: t.tomaTipo,
      nota: t.nota,
    }
  })

  const usos: UsoAmbienteDef[] = []
  for (const [clave, fila] of Object.entries(filas)) {
    const id = usoDeFila(clave, fila)
    if (usos.some((u) => u.id === id)) continue
    const base = celdasDe(fila)
    const celdas = [
      ...Object.values(base.todos ?? {}),
      ...Object.values(base.porGrado ?? {}).flatMap((porTipo) => Object.values(porTipo)),
    ]
    const delUso = d.pmu.usos[id]
    usos.push({
      id,
      nombre: delUso?.nombre ?? fila.nombre,
      nombreCorto: delUso?.nombre ?? fila.nombreCorto ?? fila.nombre,
      pideLargo: celdas.some((c) => c?.porMetroLineal !== undefined),
      cerramientoPorDefecto: fila.cerramientoPorDefecto,
    })
  }

  return {
    id: d._meta.id,
    edicion: d._meta.edicion,
    nombre: norma,
    alcance: d._meta.alcance,

    alimentacion() {
      const a = d.alimentacion
      return {
        valor: {
          tensionFaseNeutroV: a.tensionFaseNeutroV,
          tensionLineaV: a.tensionLineaV,
          corrienteMaxOrigenA: a.corrienteMaxOrigenA,
        },
        ref: cita(a.ref),
      }
    },

    superficieComputable({ cubiertaM2, semicubiertaM2 }) {
      const s = d.superficieComputable
      const valor = redondear(cubiertaM2 * s.factorCubierta + semicubiertaM2 * s.factorSemicubierta)
      return {
        valor,
        ref: cita(s.ref),
        detalle: `${formatear(cubiertaM2)} m² cubiertos × ${formatear(s.factorCubierta)} + ${formatear(semicubiertaM2)} m² semicubiertos × ${formatear(s.factorSemicubierta)}`,
      }
    },

    grados() {
      return d.gradosElectrificacion.items.map(({ id, nombre }) => ({ id, nombre }))
    },

    grado(superficieM2) {
      if (!(superficieM2 > 0)) return undefined
      const g = d.gradosElectrificacion.items.find(
        (i) => superficieM2 > i.m2Min && (i.m2Max === null || superficieM2 <= i.m2Max),
      )
      if (!g) return undefined
      const rango = g.m2Max === null ? `más de ${g.m2Min} m²` : g.m2Min === 0 ? `hasta ${g.m2Max} m²` : `más de ${g.m2Min} y hasta ${g.m2Max} m²`
      return { valor: { id: g.id, nombre: g.nombre }, ref: cita(d.gradosElectrificacion.ref), detalle: rango }
    },

    circuitosMinimos(gradoId) {
      const m = d.circuitosMinimos.porGrado[gradoId]
      if (!m) return undefined
      return {
        valor: {
          total: m.total,
          variantes: m.variantes.map(({ id, libre, ...porTipo }) => ({ id, libre, porTipo })),
        },
        ref: cita(d.circuitosMinimos.ref),
      }
    },

    tiposCircuito() {
      return tiposDef
    },

    tipoCircuito(id) {
      const t = tiposDef.find((x) => x.id === id)
      return t && { valor: t, ref: cita(d.tiposCircuito.ref) }
    },

    usosDeAmbiente() {
      return usos
    },

    puntosMinimos({ uso, gradoId, superficieM2, largoM }) {
      const candidatas = Object.entries(filas).filter(([clave, fila]) => usoDeFila(clave, fila) === uso)
      const encontrada = candidatas.find(([, fila]) => enRango(superficieM2, fila.m2))
      if (!encontrada) return undefined
      const [clave, fila] = encontrada

      const notas: string[] = []
      let gradoEfectivo = gradoId
      if (fila.gradosAplicables && !fila.gradosAplicables.includes(gradoId) && fila.siGradoNoAplica) {
        gradoEfectivo = fila.siGradoNoAplica
        const nombreGrado = d.gradosElectrificacion.items.find((g) => g.id === gradoEfectivo)?.nombre ?? gradoEfectivo
        notas.push(`Por su superficie, a este ambiente se le aplican los puntos mínimos del grado ${nombreGrado}.`)
      }
      const base = celdasDe(fila)
      if (fila.nota) notas.push(fila.nota)

      const resultado: PuntosMinimos = {
        porTipo: {},
        modulosFijos: 0,
        tomaPuedeIrEnIluminacion: fila.tomaPuedeIrEnIluminacion ?? false,
        faltaLargo: false,
        notas,
      }
      const tipos = new Set([
        ...Object.keys(base.todos ?? {}),
        ...Object.values(base.porGrado ?? {}).flatMap((porTipo) => Object.keys(porTipo)),
      ])
      for (const tipo of tipos) {
        const r = bocasDeCelda(celda(fila, gradoEfectivo, tipo), superficieM2, largoM)
        resultado.porTipo[tipo] = r.bocas
        resultado.modulosFijos += r.modulos
        resultado.faltaLargo ||= r.faltaLargo
      }

      const refFila = fila.ref ?? base.ref
      return {
        valor: resultado,
        ref: cita(refFila ?? d.pmu.ref),
        detalle: filas[clave]?.nombre,
      }
    },

    tomasMaxPorCaja(caja) {
      const { ref: r, ...porCaja } = d.conteoBocas.tomasMaxPorCaja
      const valor = porCaja[caja]
      return valor === undefined ? undefined : { valor, ref: cita(r) }
    },

    tomasEnTableroPorBoca() {
      const t = d.conteoBocas.tomasEnTableroPorBoca
      return { valor: t.valor, ref: cita(t.ref) }
    },

    dpmsMinimaVA({ tipo, bocas, tieneTomasDerivadas }) {
      const mapa = TIPOS[tipo]
      const clave = tieneTomasDerivadas && mapa?.dpmsConTomas ? mapa.dpmsConTomas : mapa?.dpms
      const regla = clave ? d.demanda.dpmsMinimaPorCircuito[clave] : undefined
      if (!regla) return undefined
      const ref = cita(d.demanda.ref)
      if ('VA' in regla) return { valor: regla.VA, ref, detalle: `${formatear(regla.VA)} VA por circuito` }
      const [num, den] = regla.factor
      return {
        valor: redondear((num / den) * bocas * regla.VAporBoca),
        ref,
        detalle: `${num}/${den} × ${bocas} bocas × ${formatear(regla.VAporBoca)} VA`,
      }
    },

    coefSimultaneidad(gradoId) {
      const minimos = d.circuitosMinimos.porGrado[gradoId]
      if (!minimos) return undefined
      const c = d.demanda.coeficienteSimultaneidad
      const valor = c.porCantidadMinimaDeCircuitos[String(minimos.total)]
      return valor === undefined
        ? undefined
        : { valor, ref: cita(c.ref), detalle: `grado con ${minimos.total} circuitos como mínimo` }
    },

    seccionMinimaMm2({ tipo, tieneTomasDerivadas }) {
      const mapa = TIPOS[tipo]
      if (!mapa) return undefined
      const clave = tieneTomasDerivadas && mapa.seccionConTomas ? mapa.seccionConTomas : mapa.seccion
      const valor = d.conductores.seccionMinimaMm2[clave]
      return valor === undefined ? undefined : { valor, ref: cita(d.conductores.ref) }
    },

    seccionMinimaDeFuncion(funcion) {
      const clave = FUNCIONES[funcion]
      const valor = clave ? d.conductores.seccionMinimaMm2[clave] : undefined
      return valor === undefined ? undefined : { valor, ref: cita(d.conductores.ref) }
    },

    metodosInstalacion() {
      return Object.entries(d.ampacidad.metodos).map(([id, m]) => ({ id, nombre: m.nombre }))
    },

    seccionesMm2(metodo) {
      const m = d.ampacidad.metodos[metodo] ?? Object.values(d.ampacidad.metodos)[0]
      return m ? Object.keys(m['2x']).map(Number).sort((a, b) => a - b) : []
    },

    corrienteAdmisibleA({ seccionMm2, metodo, cargados, circuitosEnLaCaneria }) {
      const m = d.ampacidad.metodos[metodo]
      if (!m) return { ok: false, falta: 'metodo' }
      const tabla = cargados === 2 ? m['2x'] : m['3x']
      const fila = Object.entries(tabla).find(([s]) => Number(s) === seccionMm2)
      if (!fila) return { ok: false, falta: 'seccion' }
      const base = fila[1]
      const ref = cita(d.ampacidad.ref)
      if (circuitosEnLaCaneria <= 1) return { ok: true, valor: base, ref, base, factorAgrupamiento: 1 }

      // La tabla cargada solo trae los factores para circuitos monofásicos.
      const factor = cargados === 2 ? d.ampacidad.agrupamiento.monofasicos[String(circuitosEnLaCaneria)] : undefined
      if (factor === undefined) return { ok: false, falta: 'agrupamiento' }
      return {
        ok: true,
        valor: redondear(base * factor),
        ref,
        base,
        factorAgrupamiento: factor,
        refAgrupamiento: cita(d.ampacidad.agrupamiento.ref),
      }
    },

    calibresComerciales() {
      return d.proteccion.calibresPIAcomerciales
    },

    sensibilidadDiferencialMaxMa() {
      const dif = d.proteccion.diferencial
      return { valor: dif.sensibilidadMaMax, ref: cita(dif.ref) }
    },

    refCoordinacion() {
      return cita(d.proteccion.ref)
    },

    verificacion() {
      const bloques: BloqueVerificacion[] = []
      for (const [clave, nombre] of Object.entries(NOMBRES_BLOQUE)) {
        const b = d[clave as keyof DatosAea770] as { ref: RefDatos; verificado: boolean }
        bloques.push({ bloque: nombre, verificado: b.verificado, ref: cita(b.ref) })
      }
      for (const fila of Object.values(filas)) {
        if (fila.verificado === undefined) continue
        bloques.push({
          bloque: `Puntos mínimos: ${fila.nombreCorto ?? fila.nombre}`,
          verificado: fila.verificado,
          ref: cita(fila.ref ?? d.pmu.ref),
        })
      }
      return bloques
    },
  }
}
