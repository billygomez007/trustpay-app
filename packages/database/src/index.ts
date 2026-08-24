import { PrismaClient } from '@prisma/client';

export { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as typeof globalThis & { trustPayPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.trustPayPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.trustPayPrisma = prisma;
}
