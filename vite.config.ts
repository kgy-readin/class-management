import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
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
