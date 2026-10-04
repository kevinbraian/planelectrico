# Plan Eléctrico

Web app para mapear y validar instalaciones eléctricas de viviendas en Argentina, según la reglamentación **AEA 90364-7-770 (edición 2017)**: viviendas unifamiliares hasta 63 A.

Cargás los ambientes, el tablero y cada circuito con sus bocas y lo que tienen conectado. La app calcula el grado de electrificación, la demanda y las corrientes, y avisa qué no cumple, citando la cláusula o la tabla de la norma de donde sale cada advertencia.

**Demo:** https://miplanelectrico.web.app

> **Es una ayuda de diseño.** No reemplaza el proyecto ni la verificación de un profesional matriculado. Que la app no muestre observaciones no significa que la instalación cumpla la norma: revisa solo una parte (ver [Alcance](#alcance-de-la-verificación)).

## Qué hace

- **Ambientes**: uso, superficie y cerramiento de cada ambiente. De ahí salen la superficie computable, el grado de electrificación y los puntos mínimos de utilización.
- **Tablero**: cabecera, interruptores diferenciales y la planilla de circuitos, con térmica, curva, sección y cuántos circuitos comparten la cañería.
- **Circuitos**: bocas (puntos de luz, tomacorrientes, bocas mixtas), interruptores y automatismos, y las cargas conectadas, incluidas regletas y alargues con su propio límite.
- **Resumen por circuito**: bocas, potencia instalada, demanda y la coordinación `Ib ≤ In ≤ Iz`, con los pasos del cálculo a la vista.
- **Advertencias**: cada una con severidad, mensaje, cita de la norma y un clic que lleva al elemento.
- **Biblioteca de plantillas**: punto y toma, combinación de dos puntos, cruzamiento, fotocélula, sensor de movimiento y automático de escalera. Se insertan en un circuito y se combinan con bocas ya cargadas.
- **Catálogo de aparatos**: potencias orientativas editables y consumo mensual estimado.
- **Proyectos**: se guardan en el navegador, con deshacer y rehacer, y se exportan e importan como JSON.

## Alcance de la verificación

Lo que revisa hoy:

| Regla | Qué verifica |
|---|---|
| R01 | Grado de electrificación según la superficie computable |
| R02 | Cantidad mínima de circuitos del grado |
| R03 | Máximo de bocas por circuito |
| R04 | Calibre máximo de la protección según el tipo de circuito |
| R05 | Coordinación `Ib ≤ In ≤ Iz`, con el factor de agrupamiento |
| R06 | Sección mínima del conductor |
| R07 | Puntos mínimos de utilización por ambiente |
| R08 | Demanda: la mayor entre la carga conocida y el mínimo de la norma |
| R09 | Coeficiente de simultaneidad |
| R10 | Capacidad de tomas, regletas, alargues y mandos |
| R11 | Tomacorrientes por caja |
| R12 | Alcance de la norma (cabecera de más de 63 A, circuitos de uso específico) |
| R13 | Protecciones del tablero (cabecera contra la carga total, sensibilidad de los diferenciales) |

Lo que **no** revisa: puesta a tierra, corrientes de cortocircuito, caída de tensión, cañerías y cajas, los requisitos de baños, cocinas y lavaderos de AEA 90364-7-701, la selectividad entre diferenciales, ni las exigencias de la distribuidora o de la autoridad local.

## Datos de la norma

Todos los valores normativos están en un solo archivo: [`client/src/dominio/normas/aea-770-2017/aea-770.json`](client/src/dominio/normas/aea-770-2017/aea-770.json). El código no tiene ningún número de la norma escrito.

- Cada bloque indica cláusula, tabla y página, y lleva una marca `verificado`.
- Los valores se transcribieron a mano. Hoy solo la tabla de puntos mínimos está verificada por una persona contra el documento; el resto coincide con el texto del PDF, pero falta esa revisión. La pestaña Resumen muestra el estado de cada bloque.
- Las normas son datos intercambiables: el motor consulta un contrato (`Normativa`) y cada respuesta viaja con su cita, así que se puede sumar otra norma o reglas locales sin tocarlo.

**El PDF de la norma no está en el repositorio**: tiene copyright de la Asociación Electrotécnica Argentina. La app guarda valores y referencias, no texto de la norma. Si tenés una copia, podés dejarla en `docs/norma/`, que git ignora.

Las potencias del catálogo de aparatos son orientativas y no salen de la norma ni de ningún fabricante.

## Cómo correrlo

Hace falta Node 22.12 o más nuevo.

```bash
git clone https://github.com/kevinbraian/planelectrico.git
cd planelectrico/client
npm install
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run test` | Tests del dominio |
| `npm run typecheck` | Chequeo de tipos |
| `npm run lint` | ESLint |
| `npm run build` | Chequeo de tipos y build de producción en `client/dist/` |
| `npm run deploy` | Build y publicación en Firebase Hosting |

`npm run deploy` necesita la [CLI de Firebase](https://firebase.google.com/docs/cli) instalada y una sesión iniciada con acceso al proyecto configurado en `.firebaserc`.

## Cómo está armado

React 19, TypeScript, Vite, Tailwind CSS, Zustand y Zod, con Vitest para los tests. No hay backend.

```
client/src/
├─ dominio/        TypeScript puro, sin React ni DOM
│  ├─ normas/      contrato Normativa; datos y adaptador de cada norma
│  ├─ modelo/      tipos del proyecto, validación de archivos, migraciones
│  ├─ calculo/     superficie, bocas, demanda y corrientes
│  ├─ reglas/      una regla por archivo; validar(proyecto, norma) devuelve las advertencias
│  ├─ plantillas/  circuitos prearmados como datos, y su inserción
│  └─ catalogo/    aparatos y consumo
├─ estado/         store con deshacer, guardado automático, repositorio de proyectos
├─ shell/          barra de proyecto, pestañas, paleta, panel de advertencias
├─ ui/             componentes base
└─ vistas/         una carpeta por pestaña
```

El dominio no depende de la interfaz: una regla de ESLint impide que `dominio/` importe React o el store. El motor de reglas es una función pura, y sus tests calculan los valores esperados a partir del JSON de la norma.

Los proyectos llevan un número de versión de formato (`esquema`); para cambiarlo se agrega una migración en `dominio/modelo/migraciones.ts`.

## Lo que viene

- Diagrama unifilar generado desde el modelo.
- Plano 2D para ubicar ambientes y elementos.
- Caída de tensión, otros métodos de instalación y AEA 90364-7-771.
- Cuentas, sincronización y memoria técnica en PDF.

## Licencia

[MIT](LICENSE). La licencia cubre el código de este repositorio, no la reglamentación de la AEA.
