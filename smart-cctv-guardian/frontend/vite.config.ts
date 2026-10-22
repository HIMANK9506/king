import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces for mobile & PC access
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/video_feed': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/snapshots': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/recordings': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/faces': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
