import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * Environment for the e2e suite. Tests always run against a dedicated
 * database whose name ends in "_test"; the suite drops and recreates it,
 * so it refuses to run against anything else.
 */
export function applyTestEnv(): void {
  const env = process.env;
  env.NODE_ENV = "test";
  env.POSTGRES_HOST ??= "localhost";
  env.POSTGRES_PORT ??= "5433";
  env.POSTGRES_USER ??= "marketplace";
  env.POSTGRES_PASSWORD ??= "marketplace_secret";
  env.POSTGRES_DB = env.TEST_POSTGRES_DB ?? "marketplace_test";
  env.JWT_SECRET = "e2e-test-secret";
  env.JWT_EXPIRES_IN = "1h";
  env.CORS_ORIGINS = "http://allowed.test";
  env.THROTTLE_DISABLED = "true";
  env.UPLOAD_DIR ??= mkdtempSync(join(tmpdir(), "marketplace-e2e-uploads-"));

  if (!env.POSTGRES_DB.endsWith("_test")) {
    throw new Error(
      `Refusing to run e2e tests against "${env.POSTGRES_DB}": the database name must end in _test`,
    );
  }
}
