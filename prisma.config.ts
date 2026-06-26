import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use direct (non-pooled) connection for CLI operations
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
