import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base 設為 '/chronoampere/' 讓 GitHub Pages（網址含 repo 名）能正確載入資源。
export default defineConfig({
  base: '/chronoampere/',
  plugins: [react()],
})
