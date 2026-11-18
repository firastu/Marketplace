import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import { applyTestEnv } from "./test-env";

const DB_DIR = join(__dirname, "..", "..", "database");

/** Recreate the test database and load the real migrations + categories. */
export default async function globalSetup(): Promise<void> {
  applyTestEnv();
  const { POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD } =
    process.env;
  const dbName = process.env.POSTGRES_DB!;
  const base = {
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
  };

  const admin = new Client({ ...base, database: "postgres" });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const db = new Client({ ...base, database: dbName });
  await db.connect();
  const migrations = readdirSync(join(DB_DIR, "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of migrations) {
    await db.query(readFileSync(join(DB_DIR, "migrations", file), "utf8"));
  }
  await db.query(
    readFileSync(join(DB_DIR, "seeds", "001_seed_categories.sql"), "utf8"),
  );
  await db.end();
}
