import { z } from 'zod'

/**
 * Esquema del archivo de datos. Los objetos son estrictos a propósito: el JSON
 * se mantiene a mano y una clave mal escrita ("porm2") tiene que romper el
 * test de carga en vez de desaparecer en silencio.
 */

const comentarios = {
  _nota: z.string().optional(),
  _control: z.string().optional(),
  _regla: z.string().optional(),
  _ojo: z.string().optional(),
}

const ref = z.strictObject({
  clausula: z.string().optional(),
  tabla: z.string().optional(),
  pagina: z.number().int().positive().optional(),
})

const bloque = { ref, verificado: z.boolean(), ...comentarios }

const celdaPmu = z.strictObject({
  fijo: z.number().int().nonnegative().optional(),
  porM2: z.number().positive().optional(),
  porMetroLineal: z.number().positive().optional(),
  minimo: z.number().int().nonnegative().optional(),
  modulos: z.number().int().nonnegative().optional(),
  soloSiLargoMayorA: z.number().nonnegative().optional(),
})

const celdasPorTipo = z.record(z.string(), celdaPmu.nullable())

const filaPmu = z.strictObject({
  nombre: z.string(),
  nombreCorto: z.string().optional(),
  /** Uso que elige el usuario; varias filas pueden compartirlo y diferenciarse por superficie. */
  uso: z.string().optional(),
  m2: z
    .strictObject({
      min: z.number().optional(),
      minInclusivo: z.boolean().optional(),
      max: z.number().optional(),
      maxInclusivo: z.boolean().optional(),
    })
    .optional(),
  gradosAplicables: z.array(z.string()).optional(),
  siGradoNoAplica: z.string().optional(),
  comoFila: z.string().optional(),
  tomaPuedeIrEnIluminacion: z.boolean().optional(),
  /** Ayuda para la interfaz, no es un valor normativo. */
  cerramientoPorDefecto: z.enum(['cubierto', 'semicubierto', 'descubierto']).optional(),
  /** Aclaración que se le muestra al usuario. Los `_nota` son comentarios de quien mantiene el archivo. */
  nota: z.string().optional(),
  ref: ref.optional(),
  verificado: z.boolean().optional(),
  todos: celdasPorTipo.optional(),
  porGrado: z.record(z.string(), celdasPorTipo).optional(),
  ...comentarios,
})

const varianteCircuitos = z
  .object({ id: z.string(), libre: z.number().int().nonnegative() })
  .catchall(z.number().int().nonnegative())

const tablaAmpacidad = z.record(z.string(), z.number().positive())

export const esquemaAea770 = z
  .strictObject({
    _meta: z.strictObject({
      id: z.string(),
      norma: z.string(),
      edicion: z.string(),
      alcance: z.string(),
      datosAl: z.string(),
      nota: z.string(),
    }),

    alimentacion: z.strictObject({
      ...bloque,
      tensionFaseNeutroV: z.number().positive(),
      tensionLineaV: z.number().positive(),
      frecuenciaHz: z.number().positive(),
      corrienteMaxOrigenA: z.number().positive(),
    }),

    superficieComputable: z.strictObject({
      ...bloque,
      factorCubierta: z.number().nonnegative(),
      factorSemicubierta: z.number().nonnegative(),
    }),

    gradosElectrificacion: z.strictObject({
      ...bloque,
      items: z
        .array(
          z.strictObject({
            id: z.string(),
            nombre: z.string(),
            m2Min: z.number().nonnegative(),
            m2Max: z.number().positive().nullable(),
          }),
        )
        .min(1),
    }),

    circuitosMinimos: z.strictObject({
      ...bloque,
      porGrado: z.record(
        z.string(),
        z.strictObject({ total: z.number().int().positive(), variantes: z.array(varianteCircuitos).min(1) }),
      ),
    }),

    tiposCircuito: z.strictObject({
      ...bloque,
      proteccion: z.string(),
      tipos: z.record(
        z.string(),
        z.strictObject({
          nombre: z.string(),
          maxBocas: z.number().int().positive().optional(),
          maxProteccionA: z.number().positive().optional(),
          cargaUnitariaMaxA: z.number().positive().optional(),
          tomaTipo: z.string().optional(),
          nota: z.string().optional(),
        }),
      ),
    }),

    conteoBocas: z.strictObject({
      ...bloque,
      tomasMaxPorCaja: z.strictObject({ ref }).catchall(z.number().int().positive()),
      tomasEnTableroPorBoca: z.strictObject({ ref, valor: z.number().int().positive() }),
    }),

    pmu: z.strictObject({
      ...bloque,
      _formato: z.string().optional(),
      _nota1: z.string().optional(),
      _nota2: z.string().optional(),
      usos: z.record(z.string(), z.strictObject({ nombre: z.string() })),
      ambientes: z.record(z.string(), filaPmu),
    }),

    demanda: z.strictObject({
      ...bloque,
      dpmsMinimaPorCircuito: z.record(
        z.string(),
        z.union([
          z.strictObject({ VA: z.number().positive() }),
          z.strictObject({
            VAporBoca: z.number().positive(),
            factor: z.tuple([z.number().positive(), z.number().positive()]),
          }),
        ]),
      ),
      coeficienteSimultaneidad: z.strictObject({
        ref,
        _clave: z.string().optional(),
        porCantidadMinimaDeCircuitos: z.record(z.string(), z.number().positive().max(1)),
      }),
      cargaTotal: z.string(),
    }),

    conductores: z.strictObject({
      ...bloque,
      seccionMinimaMm2: z.record(z.string(), z.number().positive()),
    }),

    ampacidad: z.strictObject({
      ...bloque,
      metodos: z.record(
        z.string(),
        z.strictObject({ nombre: z.string(), '2x': tablaAmpacidad, '3x': tablaAmpacidad }),
      ),
      agrupamiento: z.strictObject({
        ref,
        _nota: z.string().optional(),
        monofasicos: z.record(z.string(), z.number().positive().max(1)),
      }),
      _otrosMetodos: z.string().optional(),
    }),

    proteccion: z.strictObject({
      ...bloque,
      diferencial: z.strictObject({ ref, sensibilidadMaMax: z.number().positive(), nota: z.string().optional() }),
      calibresPIAcomerciales: z.array(z.number().positive()).min(1),
    }),
  })
  .superRefine((d, ctx) => {
    const grados = new Set(d.gradosElectrificacion.items.map((g) => g.id))
    const error = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })

    for (const [gradoId, minimos] of Object.entries(d.circuitosMinimos.porGrado)) {
      if (!grados.has(gradoId)) error(['circuitosMinimos', 'porGrado', gradoId], 'grado inexistente')
      const clave = String(minimos.total)
      if (d.demanda.coeficienteSimultaneidad.porCantidadMinimaDeCircuitos[clave] === undefined) {
        error(['demanda', 'coeficienteSimultaneidad'], `falta el coeficiente para ${clave} circuitos`)
      }
    }
    for (const g of grados) {
      if (!d.circuitosMinimos.porGrado[g]) error(['circuitosMinimos', 'porGrado'], `falta el grado "${g}"`)
    }

    for (const [clave, fila] of Object.entries(d.pmu.ambientes)) {
      const ruta = ['pmu', 'ambientes', clave]
      if (fila.comoFila !== undefined) {
        if (!d.pmu.ambientes[fila.comoFila]) error(ruta, `comoFila apunta a "${fila.comoFila}", que no existe`)
      } else if (!fila.todos && !fila.porGrado) {
        error(ruta, 'la fila no tiene celdas (todos / porGrado) ni comoFila')
      }
      for (const g of Object.keys(fila.porGrado ?? {})) {
        if (!grados.has(g)) error([...ruta, 'porGrado', g], 'grado inexistente')
      }
      for (const g of [...(fila.gradosAplicables ?? []), ...(fila.siGradoNoAplica ? [fila.siGradoNoAplica] : [])]) {
        if (!grados.has(g)) error(ruta, `grado inexistente: "${g}"`)
      }
    }
  })

export type DatosAea770 = z.infer<typeof esquemaAea770>
export type FilaPmu = z.infer<typeof filaPmu>
export type CeldaPmu = z.infer<typeof celdaPmu>
