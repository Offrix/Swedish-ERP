import test from "node:test";
import assert from "node:assert/strict";
import {
  createPostgresCanonicalRepositoryStore,
  resolveCanonicalRepositoryConnectionString
} from "../../packages/domain-core/src/repositories-postgres.mjs";

test("Phase 2.1 canonical repository store prefers explicit connection strings", () => {
  assert.equal(
    resolveCanonicalRepositoryConnectionString({
      connectionString: "postgres://user:pass@db.example.test:5433/core"
    }),
    "postgres://user:pass@db.example.test:5433/core"
  );
});

test("Phase 2.1 canonical repository store accepts CANONICAL_REPOSITORY_URL before generic postgres env vars", () => {
  assert.equal(
    resolveCanonicalRepositoryConnectionString({
      env: {
        CANONICAL_REPOSITORY_URL: "postgres://canonical-url",
        POSTGRES_URL: "postgres://postgres-url",
        DATABASE_URL: "postgres://database-url"
      }
    }),
    "postgres://canonical-url"
  );
});

test("Phase 2.1 canonical repository store returns null when no connection information exists", () => {
  assert.equal(resolveCanonicalRepositoryConnectionString({ env: {} }), null);
});

test("Phase 2.1 canonical repository store requires explicit credentials for host-based config", () => {
  assert.throws(
    () =>
      resolveCanonicalRepositoryConnectionString({
        env: {
          POSTGRES_HOST: "db.internal"
        }
      }),
    /Missing Postgres environment variables for canonical repositories/u
  );
});

test("Phase 2.1 canonical repository store constructor fails fast on incomplete host config", () => {
  assert.throws(
    () =>
      createPostgresCanonicalRepositoryStore({
        env: {
          POSTGRES_HOST: "db.internal"
        }
      }),
    /Missing Postgres environment variables for canonical repositories/u
  );
});
