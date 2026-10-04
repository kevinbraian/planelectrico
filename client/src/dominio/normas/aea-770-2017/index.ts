import datos from './aea-770.json'
import { crearNormativaAea770 } from './adaptador'
import { esquemaAea770 } from './esquema'

/** AEA 90364-7-770, edición 2017. Si el JSON no respeta el esquema, falla al cargar. */
export const aea770 = crearNormativaAea770(esquemaAea770.parse(datos))
