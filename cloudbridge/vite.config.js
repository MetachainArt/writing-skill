import { defineConfig } from 'vite';

// base './' 로 두면 루트 도메인(bridge.metacint.com)과 하위 경로 호스팅 모두에서 동작한다.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  server: { host: true, port: 5173 },
});
