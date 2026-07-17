import "dotenv/config";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = new PrismaClient({
  adapter,
});

export async function ensureSubmissionStatusEnum() {
  await prisma.$executeRawUnsafe(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SubmissionsStatus'
  ) THEN
    EXECUTE 'ALTER TYPE "SubmissionsStatus" RENAME TO "SubmissionStatus"';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SubmissionStatus'
  ) THEN
    EXECUTE 'CREATE TYPE "SubmissionStatus" AS ENUM (''Processing'', ''Success'', ''Failure'')';
  END IF;
END $$;
`);
}