# Plan Eléctrico

Web app para mapear y validar instalaciones eléctricas de viviendas según AEA 90364-7-770 (edición 2017). Es una ayuda de diseño: no reemplaza el proyecto ni la verificación de un profesional matriculado.

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm run test        # tests del dominio (Vitest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # typecheck + build de producción en dist/
```

## Cómo está organizado

- `src/dominio/`: TypeScript puro, sin React ni DOM (lo fuerza una regla de ESLint).
  - `normas/`: el contrato `Normativa` y, por cada norma, sus datos y su adaptador.
  - `modelo/`: tipos del proyecto, validación de archivos, migraciones, operaciones.
  - `calculo/`: superficie, bocas, demanda, corrientes. Cada magnitud guarda los pasos que la explican.
  - `reglas/`: una regla por archivo; `validar(proyecto, norma)` devuelve las advertencias.
  - `plantillas/`: circuitos prearmados como datos (`biblioteca/plantillas.json`) y la función que los inserta y combina.
- `src/estado/`: store (Zustand con deshacer), guardado automático y repositorio de proyectos.
- `src/shell/`, `src/ui/`, `src/vistas/`: la interfaz.

## Datos de la norma

`src/dominio/normas/aea-770-2017/aea-770.json` es la única fuente de valores normativos. Ningún número de la norma se escribe en el código.

- Cada bloque lleva `ref` (cláusula, tabla y página impresa) y `verificado`.
- `verificado` pasa a `true` recién cuando una persona contrastó el bloque contra el documento. La app muestra en Resumen cuáles faltan.
- El esquema (`esquema.ts`) es estricto: una clave mal escrita rompe el test de carga.
- Si se cambia un valor, los tests de `adaptador.test.ts` y de `reglas/` avisan qué esperaba cada uno.

El PDF de la norma tiene copyright: vive en `docs/norma/`, fuera de `public/`, y git lo ignora. No se publica ni se versiona.

## Formato de los proyectos

Los proyectos se guardan en `localStorage` y se exportan como JSON. El campo `esquema` es la versión del formato; al cambiarlo hay que sumar una migración en `modelo/migraciones.ts`.
