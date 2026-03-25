import test from "node:test";
import assert from "node:assert/strict";
import { createPostgresAsyncJobStore, resolvePostgresConnectionString } from "../../packages/domain-core/src/jobs-store-postgres.mjs";

test("postgres async job store uses explicit connection string when provided", () => {
  const connectionString = resolvePostgresConnectionString({
    connectionString: "postgres://user:pass@db.example.test:5433/jobs"
  });

  assert.equal(connectionString, "postgres://user:pass@db.example.test:5433/jobs");
});

test("postgres async job store accepts POSTGRES_URL and DATABASE_URL precedence", () => {
  assert.equal(
    resolvePostgresConnectionString({
      env: {
        POSTGRES_URL: "postgres://postgres-url",
        DATABASE_URL: "postgres://database-url"
      }
    }),
    "postgres://postgres-url"
  );
  assert.equal(
    resolvePostgresConnectionString({
      env: {
        DATABASE_URL: "postgres://database-url"
      }
    }),
    "postgres://database-url"
  );
});

test("postgres async job store returns null when no connection information exists", () => {
  assert.equal(resolvePostgresConnectionString({ env: {} }), null);
});

test("postgres async job store requires explicit credentials when POSTGRES_HOST is used", () => {
  assert.throws(
    () =>
      resolvePostgresConnectionString({
        env: {
          POSTGRES_HOST: "db.internal"
        }
      }),
    /Missing Postgres environment variables/u
  );
});

test("postgres async job store defaults host-based connections to the standard postgres port", () => {
  const connectionString = resolvePostgresConnectionString({
    env: {
      POSTGRES_HOST: "db.internal",
      POSTGRES_USER: "worker_user",
      POSTGRES_PASSWORD: "se:cret",
      POSTGRES_DB: "worker_jobs"
    }
  });

  assert.equal(connectionString, "postgres://worker_user:se%3Acret@db.internal:5432/worker_jobs");
});

test("postgres async job store constructor fails fast when host config is incomplete", () => {
  assert.throws(
    () =>
      createPostgresAsyncJobStore({
        env: {
          POSTGRES_HOST: "db.internal"
        }
      }),
    /Missing Postgres environment variables/u
  );
});
