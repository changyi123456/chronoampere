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
    rules: {
      'no-irregular-whitespace': ['error', { skipStrings: true, skipComments: true, skipTemplates: true }],
    },
  },
  {
    // R3F animation deliberately mutates Three.js objects inside useFrame.
    files: ['src/components/HubScene.tsx', 'src/components/IntroScene.tsx', 'src/rooms/MagnetRooms.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // These scene libraries intentionally export reusable geometry helpers beside components.
    files: ['src/components/lab.tsx', 'src/components/props.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
