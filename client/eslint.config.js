import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // El dominio es TypeScript puro: se tiene que poder mover a otro paquete
    // (o a una Cloud Function) sin arrastrar React, el store ni la interfaz.
    files: ['src/dominio/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-router-dom', 'zustand', 'zustand/*', 'zundo'],
              message: 'dominio/ no puede depender de React ni del store.',
            },
            {
              group: ['@/estado/**', '@/ui/**', '@/shell/**', '@/vistas/**', '**/estado/**', '**/shell/**', '**/vistas/**'],
              message: 'dominio/ no puede importar estado ni interfaz.',
            },
          ],
        },
      ],
    },
  },
])
