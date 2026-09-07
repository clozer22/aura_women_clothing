import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function localApiPlugin() {
  return {
    name: 'local-api-endpoints',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/create-order-invoice' || url === '/api/xendit-webhook') {
          if (!res.status) {
            res.status = function (code) {
              this.statusCode = code;
              return this;
            };
          }
          if (!res.json) {
            res.json = function (data) {
              this.setHeader('Content-Type', 'application/json');
              this.end(JSON.stringify(data));
              return this;
            };
          }

          let rawBody = '';
          req.on('data', (chunk) => {
            rawBody += chunk;
          });
          req.on('end', async () => {
            try {
              req.body = rawBody ? JSON.parse(rawBody) : {};
            } catch (e) {
              req.body = rawBody;
            }

            try {
              if (url === '/api/create-order-invoice') {
                const mod = await server.ssrLoadModule('./api/create-order-invoice.js');
                await mod.default(req, res);
              } else if (url === '/api/xendit-webhook') {
                const mod = await server.ssrLoadModule('./api/xendit-webhook.js');
                await mod.default(req, res);
              }
            } catch (err) {
              console.error('Local API route execution error:', err);
              if (!res.writableEnded) {
                res.status(500).json({ error: err.message || 'Internal Server Error' });
              }
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
