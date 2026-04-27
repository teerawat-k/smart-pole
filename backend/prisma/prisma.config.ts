import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: resolve(__dirname, "schema.prisma"),
  datasource: {
    url: connectionString,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
  migrations: {
    path: resolve(__dirname, "migrations"),
    seed: "bun prisma/seeds/index.ts",
  },
  // @ts-expect-error Prisma 7 migrate.adapter — runtime-supported แต่ยังไม่มี type definition
  migrate: {
    async adapter() {
      return new PrismaPg({ connectionString });
    },
  },
});
