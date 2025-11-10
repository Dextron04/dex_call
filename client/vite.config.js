import { defineConfig } from 'vite'

export default defineConfig({
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
    allowedHosts: ['dex-call.dextron04.in', 'localhost']
  },
  server: {
    host: true
  }
})
