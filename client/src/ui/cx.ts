/** Une clases de CSS descartando las que vienen en false, null o undefined. */
export function cx(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ')
}
