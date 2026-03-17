import "dotenv/config";
import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl = "postgresql://user:password@localhost:5432/worktrack";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackDatabaseUrl,
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackDatabaseUrl,
  },
});
