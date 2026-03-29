import test from "node:test";
import assert from "node:assert/strict";
import {
  POSTGRES_ASYNC_JOB_REQUIRED_MIGRATION_IDS,
  POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT,
  createPostgresAsyncJobStore,
  resolvePostgresConnectionString
} from "../../packages/domain-core/src/jobs-store-postgres.mjs";

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

test("postgres async job store publishes the bindande migration contract", () => {
  assert.deepEqual(POSTGRES_ASYNC_JOB_REQUIRED_MIGRATION_IDS, [
    "20260322200500_phase14_job_runtime",
    "20260326124500_phase2_async_job_poison_and_failover",
    "20260326143000_phase2_async_job_attempt_lifecycle",
    "20260326083000_phase17_async_job_replay_lifecycle"
  ]);
  assert.equal(POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT.schemaMigrationsTable, "schema_migrations");
});

test("postgres async job store schema contract covers required async job tables, indexes and keys", () => {
  assert.deepEqual(Object.keys(POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT.tables), [
    "async_jobs",
    "async_job_attempts",
    "async_job_dead_letters",
    "async_job_replay_plans"
  ]);
  assert.deepEqual(POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT.tables.async_jobs.indexes, [
    "ux_async_jobs_idempotency",
    "ix_async_jobs_available",
    "ix_async_jobs_claim_expiry"
  ]);
  assert.deepEqual(POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT.tables.async_job_attempts.foreignKeys, [
    {
      columns: ["job_id"],
      foreignTable: "async_jobs",
      foreignColumns: ["job_id"]
    }
  ]);
  assert.deepEqual(POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT.tables.async_job_dead_letters.uniqueConstraints, [["job_id"]]);
  assert.deepEqual(POSTGRES_ASYNC_JOB_SCHEMA_CONTRACT.tables.async_job_replay_plans.indexes, ["ix_async_job_replay_plans_job"]);
});
