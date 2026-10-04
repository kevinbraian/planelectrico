/** Redondea para comparar y mostrar sin arrastrar ruido de coma flotante (21 × 0,8 = 16,800000000000001). */
export function redondear(valor: number, decimales = 2): number {
  const f = 10 ** decimales
  return Math.round((valor + Number.EPSILON) * f) / f
}

/** Número en formato rioplatense: coma decimal y sin ceros de relleno. */
export function formatear(valor: number, decimales = 2): string {
  return redondear(valor, decimales).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  })
}
