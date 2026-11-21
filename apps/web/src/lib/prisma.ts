import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Em dev, evitamos `log: ["error"]` para não disparar o overlay de console.error do Next.js 15
    // quando o PostgreSQL local está desligado e o fallback em memória trata a falha graciosamente.
    log: process.env.NODE_ENV === "development" ? ["warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
