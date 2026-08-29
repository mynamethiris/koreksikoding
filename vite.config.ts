import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': `${__dirname}/src`,
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api/paste': {
        target: 'https://paste.rs',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/paste/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('codemirror') || id.includes('@codemirror') || id.includes('@uiw/react-codemirror') || id.includes('@uiw/codemirror')) {
            return 'codemirror';
          }
        },
      },
    },
  },
})
