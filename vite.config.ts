import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site from /naseeb-odds/ (the repo name); the dev server stays at /.
  base: command === 'build' ? '/naseeb-odds/' : '/',
  plugins: [react()],
}))
