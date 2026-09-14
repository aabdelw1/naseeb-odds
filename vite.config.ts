import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /ummah-odds/; the dev server stays at /.
  base: command === 'build' ? '/ummah-odds/' : '/',
  plugins: [react()],
}))
