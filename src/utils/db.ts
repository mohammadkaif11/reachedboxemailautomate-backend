import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.VERCEL_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.VERCEL_ENV !== "production") globalForPrisma.prisma = db;
