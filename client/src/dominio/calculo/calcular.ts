import { circuitosOrdenados, esBoca, esCarga, esContenedor, esMando } from '../modelo/consultas'
import type { Boca, Carga, Circuito, Contenedor, Id, Mando, Proyecto } from '../modelo/tipos'
import type { Normativa } from '../normas/contrato'
import { formatear, redondear } from '../util/numeros'
import { aVA, demandadaVA, energiaMensualKWh, instaladaVA } from './potencia'
import type { Calculo, CargaDeElemento, Magnitud, Paso, PmuAmbiente, ResumenCircuito, ResumenProyecto } from './tipos'

const RAIZ_DE_3 = Math.sqrt(3)

export const tieneTomas = (b: Boca): boolean => b.uso === 'tomacorriente' || b.uso === 'mixta'

/** Cuántas bocas cuenta la norma por esta boca del modelo. */
export function bocasQueCuenta(boca: Boca, norma: Normativa): number {
  if (boca.caja === 'en_tablero' && boca.tomas) {
    return Math.ceil(boca.tomas.cantidad / norma.tomasEnTableroPorBoca().valor)
  }
  return 1
}

/**
 * Calcula todas las magnitudes derivadas de un proyecto. Función pura: las
 * reglas y la interfaz leen de acá, nunca recalculan por su cuenta.
 */
export function calcular(p: Proyecto, norma: Normativa): Calculo {
  const fp = p.opciones.fpPorDefecto
  const alimentacion = norma.alimentacion()
  const tensionV = alimentacion.valor.tensionFaseNeutroV
  const tensionLineaV = alimentacion.valor.tensionLineaV

  const elementos = Object.values(p.elementos)
  const bocas = elementos.filter(esBoca)
  const mandos = elementos.filter(esMando)

  // --- Cargas: se suman subiendo desde cada carga hasta su boca ----------------
  const hijos = new Map<Id, (Carga | Contenedor)[]>()
  for (const e of elementos) {
    if (!esCarga(e) && !esContenedor(e)) continue
    const lista = hijos.get(e.conectadaA)
    if (lista) lista.push(e)
    else hijos.set(e.conectadaA, [e])
  }

  const cargas: Record<Id, CargaDeElemento> = {}
  const anotar = (id: Id, va: number) => {
    cargas[id] = { va: redondear(va), a: redondear(va / tensionV) }
  }

  function sumar(id: Id, visitados: Set<Id>): { instalada: number; demandada: number; energia: number } {
    let instalada = 0
    let demandada = 0
    let energia = 0
    for (const h of hijos.get(id) ?? []) {
      if (visitados.has(h.id)) continue
      visitados.add(h.id)
      if (esCarga(h)) {
        const i = instaladaVA(h, fp)
        anotar(h.id, i)
        instalada += i
        demandada += demandadaVA(h, fp)
        energia += energiaMensualKWh(h, fp)
      } else {
        const s = sumar(h.id, visitados)
        anotar(h.id, s.instalada)
        instalada += s.instalada
        demandada += s.demandada
        energia += s.energia
      }
    }
    return { instalada, demandada, energia }
  }

  const porCircuito = new Map<Id, { bocas: Boca[]; mandos: Mando[]; instalada: number; demandada: number; energia: number }>()
  const delCircuito = (id: Id) => {
    let c = porCircuito.get(id)
    if (!c) {
      c = { bocas: [], mandos: [], instalada: 0, demandada: 0, energia: 0 }
      porCircuito.set(id, c)
    }
    return c
  }

  for (const b of bocas) {
    const s = sumar(b.id, new Set([b.id]))
    anotar(b.id, s.instalada)
    const c = delCircuito(b.circuitoId)
    c.bocas.push(b)
    c.instalada += s.instalada
    c.demandada += s.demandada
    c.energia += s.energia
  }
  for (const m of mandos) {
    anotar(m.id, m.comanda.reduce((suma, bocaId) => suma + (cargas[bocaId]?.va ?? 0), 0))
    const c = delCircuito(m.circuitoId)
    c.mandos.push(m)
    const propio = m.consumoPropio ? aVA(m.consumoPropio, fp) : 0
    c.instalada += propio
    c.demandada += propio
  }

  // --- Circuitos ---------------------------------------------------------------
  const circuitos: Record<Id, ResumenCircuito> = {}
  const circuitosPorTipo: Record<string, number> = {}
  let dpmsGeneral = 0
  let dpmsEspecificos = 0
  let energiaTotal = 0

  circuitosOrdenados(p).forEach((c, i) => {
    const r = resumirCircuito(c, `C${i + 1}`)
    circuitos[c.id] = r
    circuitosPorTipo[c.tipo] = (circuitosPorTipo[c.tipo] ?? 0) + 1
    energiaTotal += r.energiaMensualKWh
    if (r.tipo?.valor.enAlcance) dpmsGeneral += r.dpms.valor
    else dpmsEspecificos += r.dpms.valor
  })

  function resumirCircuito(c: Circuito, codigo: string): ResumenCircuito {
    const propio = porCircuito.get(c.id)
    const susBocas = propio?.bocas ?? []
    const tipo = norma.tipoCircuito(c.tipo)
    const cantidadBocas = susBocas.reduce((n, b) => n + bocasQueCuenta(b, norma), 0)
    const tieneTomasDerivadas = (tipo?.valor.admiteTomasDerivadas ?? false) && susBocas.some(tieneTomas)
    const cargaConocidaVA = redondear(propio?.demandada ?? 0)
    const dpmsMinima = norma.dpmsMinimaVA({ tipo: c.tipo, bocas: cantidadBocas, tieneTomasDerivadas })

    const pasosDpms: Paso[] = []
    let dpmsVA: number
    if (dpmsMinima) {
      dpmsVA = Math.max(cargaConocidaVA, dpmsMinima.valor)
      pasosDpms.push(
        { texto: `Carga conocida: ${formatear(cargaConocidaVA)} VA (lo conectado, con su factor de uso).` },
        { texto: `Mínimo de la norma: ${formatear(dpmsMinima.valor)} VA (${dpmsMinima.detalle}).`, ref: dpmsMinima.ref },
        { texto: `Se toma el mayor: ${formatear(dpmsVA)} VA.`, ref: dpmsMinima.ref },
      )
    } else if (c.demandaManualVA !== undefined) {
      dpmsVA = c.demandaManualVA
      pasosDpms.push({ texto: `Demanda cargada a mano para este circuito: ${formatear(dpmsVA)} VA.` })
    } else {
      dpmsVA = cargaConocidaVA
      pasosDpms.push({ texto: `La norma no fija un mínimo para este tipo: se usa la carga conocida, ${formatear(dpmsVA)} VA.` })
    }

    const trifasico = c.proteccion.polos === 4
    const ibA = redondear(trifasico ? dpmsVA / (RAIZ_DE_3 * tensionLineaV) : dpmsVA / tensionV)
    const ib: Magnitud = {
      valor: ibA,
      pasos: [
        {
          texto: trifasico
            ? `Ib = DPMS / (√3 × ${tensionLineaV} V) = ${formatear(dpmsVA)} VA / (√3 × ${tensionLineaV} V) = ${formatear(ibA)} A.`
            : `Ib = DPMS / ${tensionV} V = ${formatear(dpmsVA)} VA / ${tensionV} V = ${formatear(ibA)} A.`,
          ref: alimentacion.ref,
        },
      ],
    }

    const cargados = trifasico ? 3 : 2
    return {
      circuitoId: c.id,
      codigo,
      tipo,
      tieneTomasDerivadas,
      bocas: cantidadBocas,
      mandos: propio?.mandos.length ?? 0,
      potenciaInstaladaVA: redondear(propio?.instalada ?? 0),
      energiaMensualKWh: redondear(propio?.energia ?? 0),
      cargaConocidaVA,
      dpmsMinima,
      dpms: { valor: redondear(dpmsVA), pasos: pasosDpms },
      ib,
      inA: c.proteccion.inA,
      cargados,
      iz: norma.corrienteAdmisibleA({
        seccionMm2: c.conductor.seccionMm2,
        metodo: c.conductor.metodo,
        cargados,
        circuitosEnLaCaneria: c.conductor.circuitosEnLaCaneria,
      }),
      seccionMinima: norma.seccionMinimaMm2({ tipo: c.tipo, tieneTomasDerivadas }),
    }
  }

  // --- Superficie y grado ------------------------------------------------------
  let cubiertaM2 = 0
  let semicubiertaM2 = 0
  let descubiertaM2 = 0
  for (const a of Object.values(p.ambientes)) {
    if (a.cerramiento === 'cubierto') cubiertaM2 += a.superficieM2
    else if (a.cerramiento === 'semicubierto') semicubiertaM2 += a.superficieM2
    else descubiertaM2 += a.superficieM2
  }
  const pasosSuperficie: Paso[] = []
  if (p.superficieManual) {
    cubiertaM2 = p.superficieManual.cubiertaM2
    semicubiertaM2 = p.superficieManual.semicubiertaM2
    pasosSuperficie.push({ texto: 'Superficies cargadas a mano en el proyecto (no se suman los ambientes).' })
  }
  const computable = norma.superficieComputable({ cubiertaM2, semicubiertaM2 })
  pasosSuperficie.push({ texto: `${computable.detalle} = ${formatear(computable.valor)} m².`, ref: computable.ref })
  const grado = norma.grado(computable.valor)

  // --- Puntos mínimos por ambiente ---------------------------------------------
  const ambientes: Record<Id, PmuAmbiente> = {}
  for (const a of Object.values(p.ambientes)) {
    const requerido = grado
      ? norma.puntosMinimos({ uso: a.uso, gradoId: grado.valor.id, superficieM2: a.superficieM2, largoM: a.largoM })
      : undefined
    const actual: Record<string, number> = {}
    const modulos: Record<string, number> = {}
    let tomasEnIluminacion = 0
    let modulosEnIluminacion = 0

    for (const b of bocas) {
      if (b.ambienteId !== a.id) continue
      const tipoId = p.circuitos[b.circuitoId]?.tipo
      const clase = tipoId ? norma.tipoCircuito(tipoId)?.valor.clase : undefined
      if (!tipoId || !clase) continue
      const n = bocasQueCuenta(b, norma)
      if (clase === 'iluminacion') {
        if (b.uso === 'iluminacion' || b.uso === 'conexion_fija') actual[tipoId] = (actual[tipoId] ?? 0) + n
        if (tieneTomas(b)) {
          tomasEnIluminacion += n
          modulosEnIluminacion += b.tomas?.cantidad ?? 0
        }
      } else if (clase === 'tomacorriente' && b.uso === 'tomacorriente') {
        actual[tipoId] = (actual[tipoId] ?? 0) + n
        modulos[tipoId] = (modulos[tipoId] ?? 0) + (b.tomas?.cantidad ?? 0)
      }
    }

    if (requerido?.valor.tomaPuedeIrEnIluminacion) {
      for (const tipoId of Object.keys(requerido.valor.porTipo)) {
        if (norma.tipoCircuito(tipoId)?.valor.clase !== 'tomacorriente') continue
        actual[tipoId] = (actual[tipoId] ?? 0) + tomasEnIluminacion
        modulos[tipoId] = (modulos[tipoId] ?? 0) + modulosEnIluminacion
      }
    }
    ambientes[a.id] = { ambienteId: a.id, requerido, actual, modulos }
  }

  // --- Carga total -------------------------------------------------------------
  const coeficiente = grado ? norma.coefSimultaneidad(grado.valor.id) : undefined
  const coeficienteAplicado = p.opciones.aplicarSimultaneidad && coeficiente ? coeficiente.valor : 1
  const totalVA = redondear(dpmsGeneral * coeficienteAplicado + dpmsEspecificos)

  const pasosTotal: Paso[] = [
    { texto: `Circuitos de uso general y especial: ${formatear(dpmsGeneral)} VA.` },
    coeficiente && p.opciones.aplicarSimultaneidad
      ? {
          texto: `Coeficiente de simultaneidad ${formatear(coeficiente.valor)} (${coeficiente.detalle}): ${formatear(dpmsGeneral * coeficiente.valor)} VA.`,
          ref: coeficiente.ref,
        }
      : { texto: 'Sin coeficiente de simultaneidad.' },
  ]
  if (dpmsEspecificos > 0) pasosTotal.push({ texto: `Circuitos de uso específico: ${formatear(dpmsEspecificos)} VA.` })
  pasosTotal.push({ texto: `Carga total: ${formatear(totalVA)} VA.` })

  const trifasico = p.suministro.sistema === 'trifasico'
  const corrienteA = redondear(trifasico ? totalVA / (RAIZ_DE_3 * tensionLineaV) : totalVA / tensionV)

  const proyecto: ResumenProyecto = {
    cubiertaM2: redondear(cubiertaM2),
    semicubiertaM2: redondear(semicubiertaM2),
    descubiertaM2: redondear(descubiertaM2),
    superficie: { valor: computable.valor, pasos: pasosSuperficie },
    grado,
    circuitosMinimos: grado ? norma.circuitosMinimos(grado.valor.id) : undefined,
    circuitosPorTipo,
    coeficiente,
    coeficienteAplicado,
    dpmsGeneralSinCoeficienteVA: redondear(dpmsGeneral),
    dpmsEspecificosVA: redondear(dpmsEspecificos),
    energiaMensualKWh: redondear(energiaTotal),
    cargaTotal: { valor: totalVA, pasos: pasosTotal },
    corrienteTotal: {
      valor: corrienteA,
      pasos: [
        {
          texto: trifasico
            ? `${formatear(totalVA)} VA / (√3 × ${tensionLineaV} V) = ${formatear(corrienteA)} A por fase, con las cargas equilibradas.`
            : `${formatear(totalVA)} VA / ${tensionV} V = ${formatear(corrienteA)} A.`,
          ref: alimentacion.ref,
        },
      ],
    },
    tensionV,
  }

  return { proyecto, circuitos, ambientes, cargas }
}
