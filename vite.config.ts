import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      // 代理 DeepSeek API
      '/api-deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-deepseek/, '')
      },
      // 代理 OpenAI API
      '/api-openai': {
        target: 'https://api.openai.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-openai/, '')
      },
      // 代理 VIP API (api.vip.crond.dev) - 带 v1
      '/api-vip': {
        target: 'https://api.vip.crond.dev/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-vip/, '')
      },
      // 代理 VIP API (api.vip.crond.dev) - 不带 v1 (备用)
      '/api-vip-root': {
        target: 'https://api.vip.crond.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-vip-root/, '')
      }
    }
  }
})
