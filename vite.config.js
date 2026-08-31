import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/xendit': {
        target: 'https://api.xendit.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/xendit/, ''),
      },
    },
  },
})
