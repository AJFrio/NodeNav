import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.join(projectRoot, 'Headunit'),
  envDir: projectRoot,
  plugins: [
    react(),
    tailwindcss(),
  ],
})
