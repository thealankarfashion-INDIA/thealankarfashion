import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

function spaRouteCopies() {
  return {
    name: "thealankar-spa-route-copies",
    apply: "build" as const,
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, "dist");
      const indexPath = path.join(distDir, "index.html");
      if (!fs.existsSync(indexPath)) return;

      const html = fs.readFileSync(indexPath, "utf8");
      const routes = [
        "404.html",
        "admin/login/index.html",
        "admin/forgot-password/index.html",
        "admin/reset-password/index.html",
      ];

      for (const route of routes) {
        const target = path.join(distDir, route);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, html);
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    spaRouteCopies(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    modulePreload: {
      resolveDependencies(_url, deps) {
        return deps.filter((dep) => !dep.includes("admin-pdf") && !dep.includes("AdminPanel"));
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Admin-only heavy libraries — never load for regular users
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'admin-pdf';
          }
          // Keep ALL Firebase in ONE chunk to avoid circular-dependency TDZ crash
          if (id.includes('firebase') || id.includes('@firebase')) {
            return 'firebase';
          }
          // Animation
          if (id.includes('framer-motion')) {
            return 'framer-motion';
          }
          // Carousel
          if (id.includes('embla-carousel')) {
            return 'embla';
          }
          // Core React vendor
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/wouter')) {
            return 'vendor-react';
          }
          // Radix UI and shadcn components
          if (id.includes('@radix-ui') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
        }
      }
    }
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
