import test from "node:test";
import assert from "node:assert/strict";
import {
  POSTGRES_CANONICAL_REPOSITORY_REQUIRED_MIGRATION_IDS,
  POSTGRES_CANONICAL_REPOSITORY_SCHEMA_CONTRACT,
  createPostgresCanonicalRepositoryStore,
  resolveCanonicalRepositoryConnectionString,
  verifyRuntimeCanonicalRepositorySchemaContract
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

test("Phase 2.5 canonical repository store publishes the bindande migration contract", () => {
  assert.deepEqual(POSTGRES_CANONICAL_REPOSITORY_REQUIRED_MIGRATION_IDS, [
    "20260326113000_phase2_core_canonical_repositories",
    "20260326120000_phase2_command_log_outbox_inbox"
  ]);
  assert.equal(POSTGRES_CANONICAL_REPOSITORY_SCHEMA_CONTRACT.schemaMigrationsTable, "schema_migrations");
});

test("Phase 2.5 canonical repository store schema contract covers repository and command log tables", () => {
  assert.deepEqual(Object.keys(POSTGRES_CANONICAL_REPOSITORY_SCHEMA_CONTRACT.tables), [
    "core_domain_records",
    "command_receipts",
    "command_inbox_messages",
    "command_domain_events",
    "command_evidence_refs",
    "outbox_events"
  ]);
  assert.deepEqual(POSTGRES_CANONICAL_REPOSITORY_SCHEMA_CONTRACT.tables.command_receipts.uniqueConstraints, [
    ["company_id", "command_type", "command_id"],
    ["company_id", "idempotency_key"]
  ]);
  assert.deepEqual(POSTGRES_CANONICAL_REPOSITORY_SCHEMA_CONTRACT.tables.command_inbox_messages.indexes, [
    "command_inbox_messages_company_received_idx"
  ]);
  assert.deepEqual(POSTGRES_CANONICAL_REPOSITORY_SCHEMA_CONTRACT.tables.outbox_events.foreignKeys, [
    {
      columns: ["command_receipt_id"],
      foreignTable: "command_receipts",
      foreignColumns: ["command_receipt_id"]
    }
  ]);
});

test("Phase 2.5 runtime canonical repository verifier reuses an injected store contract", async () => {
  let verificationCalls = 0;
  const verification = await verifyRuntimeCanonicalRepositorySchemaContract({
    store: {
      async verifySchemaContract() {
        verificationCalls += 1;
        return {
          ok: true,
          checkedTables: ["core_domain_records"]
        };
      }
    }
  });

  assert.equal(verificationCalls, 1);
  assert.deepEqual(verification, {
    ok: true,
    checkedTables: ["core_domain_records"]
  });
});
