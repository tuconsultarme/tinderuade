import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { qrcode } from 'vite-plugin-qrcode'
import path from 'node:path'

export default defineConfig({
  // qrcode imprime en la terminal un QR con la URL de red, para abrir la app
  // en el celular sin tipear la IP a mano. Solo aparece si el server escucha
  // en la red (host: true).
  plugins: [react(), tailwindcss(), qrcode()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5180,
    // Escucha en toda la red local, no solo en localhost: es lo que permite
    // entrar desde el celular. El celular tiene que estar en el mismo WiFi.
    host: true,
  },
})
