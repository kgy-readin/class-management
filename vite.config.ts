import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const gasUrl = env.VITE_GAS_WEB_APP_URL || process.env.VITE_GAS_WEB_APP_URL || '';

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'gas-proxy-plugin',
        configureServer(server) {
          server.middlewares.use('/api/gas', (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const targetUrl = gasUrl;
                  if (!targetUrl) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'GAS_URL not configured' }));
                  }
                  const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body
                  });
                  const data = await response.text();
                  res.statusCode = response.status;
                  res.setHeader('Content-Type', 'application/json; charset=utf-8');
                  res.end(data);
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Proxy Error' }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end('Method Not Allowed');
            }
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.SITE_PASSWORD': JSON.stringify(env.SITE_PASSWORD || env.VITE_SITE_PASSWORD || ''),
      'process.env.QUICK_TASKS_LINK': JSON.stringify(env.QUICK_TASKS_LINK || env.VITE_QUICK_QUICK_TASKS_LINK || env.VITE_QUICK_TASKS_LINK || ''),
      'process.env.QUICK_WRITING_LINK': JSON.stringify(env.QUICK_WRITING_LINK || env.VITE_QUICK_WRITING_LINK || ''),
      'process.env.QUICK_NEWSLETTERS_LINK': JSON.stringify(env.QUICK_NEWSLETTERS_LINK || env.VITE_QUICK_NEWSLETTERS_LINK || ''),
      'process.env.QUICK_MEETING_LINK': JSON.stringify(env.QUICK_MEETING_LINK || env.VITE_QUICK_MEETING_LINK || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
