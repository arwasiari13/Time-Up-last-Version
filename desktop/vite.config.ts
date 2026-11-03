import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // './' حتى تعمل الملفات عند فتحها من داخل Electron بعد البناء
  base: './',
  server: {
    port: 5190,
    strictPort: true,
    // مجلدات البناء تتغيّر أثناء صنع المثبّت — لا داعي لإعادة تحميل الواجهة بسببها
    watch: { ignored: ['**/release/**', '**/dist/**'] },
  },
  build: { outDir: 'dist' },
});
