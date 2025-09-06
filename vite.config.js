import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          socket: ['socket.io-client']
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
