import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";

function apkDownloadPlugin(): Plugin {
  const handler = (req: any, res: any, next: any) => {
    const downloadPaths = [
      "/download/app-release.apk",
      "/download/kisanai.apk",
      "/download/kisanai-offline.apk",
      "/api/download-apk",
      "/kisanai.apk",
    ];
    const pathname = req.url ? req.url.split("?")[0] : "";
    if (downloadPaths.includes(pathname)) {
      const candidates = [
        path.resolve(process.cwd(), "android/app/build/outputs/apk/release/app-release.apk"),
        path.resolve(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk"),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const stat = fs.statSync(candidate);
          res.writeHead(200, {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": 'attachment; filename="kisanai-offline-ai.apk"',
            "Content-Length": stat.size,
            "Cache-Control": "public, max-age=3600",
          });
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          fs.createReadStream(candidate).pipe(res);
          return;
        }
      }
    }
    next();
  };

  return {
    name: "kisanai:apk-download",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
  server: {
    host: "::",
    port: 3000,
    watch: {
      ignored: ["**/.vercel/**", "**/.output/**", "**/android/**", "**/*.apk", "**/public/download/**"],
    },
  },
  plugins: [
    apkDownloadPlugin(),
    tanstackStart({
      server: { entry: "server" },
    }),
    tailwindcss(),
    command === "build"
      ? nitro({
          defaultPreset: process.env["VERCEL"] ? "vercel" : (process.env["NITRO_PRESET"] || "vercel"),
        })
      : undefined,
    viteReact(),
  ].filter(Boolean),
}));
