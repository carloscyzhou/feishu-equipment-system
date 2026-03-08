import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const apiHost = process.env.VITE_API_HOST || '192.168.0.101'
const apiPort = process.env.VITE_API_PORT || '8001'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8000,
    host: '0.0.0.0',
    allowedHosts: ['wulianxx.com','192.168.0.101'],
    proxy: {
      // 代理所有 /api 请求到后端 8001 端口
      '/api': {
        target: `http://${apiHost}:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
