import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
    // CSP 정책에 맞춰 글꼴 인라인 처리 비활성화
    assetsInlineLimit: 0,
  },
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: { environment: 'node' },
})
