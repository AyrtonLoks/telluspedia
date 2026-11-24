import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Com `prisma.config.ts`, o Prisma deixa de carregar `.env` automaticamente.
// Carrega `.env` local quando existir sem sobrescrever variáveis já definidas (ex.: CI).
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
