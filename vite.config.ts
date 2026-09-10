import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/serious-edits/',
  server: {
    host: true,
    port: 5173,
  },
})
