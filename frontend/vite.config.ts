import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // 5173 은 기존 toy 게시판이 쓴다. strictPort 가 없으면 Vite 가 조용히
    // 다른 포트로 옮겨가서 어느 앱이 어디 떠 있는지 알 수 없게 된다.
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
    },
  },
});
