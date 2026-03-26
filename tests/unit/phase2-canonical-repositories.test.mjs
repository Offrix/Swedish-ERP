import test from "node:test";
import assert from "node:assert/strict";
import {
  CORE_CANONICAL_REPOSITORY_OBJECT_TYPES,
  CanonicalRepositoryConflictError,
  createBoundedContextCanonicalRepositories,
  createCoreCanonicalRepositories,
  createInMemoryCanonicalRepositoryStore
} from "../../packages/domain-core/src/repositories.mjs";

test("Phase 2.1 canonical repositories persist versioned core objects with optimistic concurrency", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const repositories = createCoreCanonicalRepositories({ store });

  const created = await repositories.portfolios.save({
    companyId: "bureau-1",
    objectId: "portfolio-1",
    payload: {
      portfolioId: "portfolio-1",
      bureauOrgId: "bureau-1",
      clientCompanyId: "client-1",
      status: "active"
    },
    actorId: "user-1",
    correlationId: "corr-1"
  });

  assert.equal(created.objectVersion, 1);
  assert.equal(created.objectType, CORE_CANONICAL_REPOSITORY_OBJECT_TYPES.portfolios);
  assert.equal(created.status, "active");

  const loaded = await repositories.portfolios.get({
    companyId: "bureau-1",
    objectId: "portfolio-1"
  });
  assert.equal(loaded.objectVersion, 1);
  assert.equal(loaded.payload.clientCompanyId, "client-1");

  const updated = await repositories.portfolios.save({
    companyId: "bureau-1",
    objectId: "portfolio-1",
    expectedObjectVersion: loaded.objectVersion,
    payload: {
      ...loaded.payload,
      status: "blocked",
      criticality: "high"
    },
    actorId: "user-2",
    correlationId: "corr-2"
  });

  assert.equal(updated.objectVersion, 2);
  assert.equal(updated.status, "blocked");
  assert.equal(updated.lastActorId, "user-2");
  assert.equal(updated.lastCorrelationId, "corr-2");

  await assert.rejects(
    repositories.portfolios.save({
      companyId: "bureau-1",
      objectId: "portfolio-1",
      expectedObjectVersion: 1,
      payload: {
        portfolioId: "portfolio-1",
        bureauOrgId: "bureau-1",
        clientCompanyId: "client-1",
        status: "active"
      }
    }),
    (error) =>
      error instanceof CanonicalRepositoryConflictError
      && error.details.expectedObjectVersion === 1
      && error.details.actualObjectVersion === 2
  );
});

test("Phase 2.1 canonical repositories support transactional rollback across multiple core repositories", async () => {
  const store = createInMemoryCanonicalRepositoryStore();

  await assert.rejects(
    store.withTransaction(async (transaction) => {
      const repositories = createCoreCanonicalRepositories({ transaction });
      await repositories.supportCases.save({
        companyId: "company-1",
        objectId: "case-1",
        payload: {
          supportCaseId: "case-1",
          companyId: "company-1",
          severity: "high",
          status: "open"
        }
      });
      await repositories.featureFlags.save({
        companyId: "company-1",
        objectId: "flag-1",
        payload: {
          featureFlagId: "flag-1",
          companyId: "company-1",
          flagKey: "trial_mode",
          status: "active"
        }
      });
      throw new Error("rollback_requested");
    }),
    /rollback_requested/u
  );

  const repositories = createCoreCanonicalRepositories({ store });
  assert.equal((await repositories.supportCases.list({ companyId: "company-1" })).length, 0);
  assert.equal((await repositories.featureFlags.list({ companyId: "company-1" })).length, 0);
});

test("Phase 2.1 canonical repositories delete only with the current expected object version", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const repositories = createCoreCanonicalRepositories({ store });

  const created = await repositories.mappingSets.save({
    companyId: "company-2",
    objectId: "mapping-1",
    payload: {
      mappingSetId: "mapping-1",
      companyId: "company-2",
      sourceSystem: "legacy_erp",
      status: "draft"
    }
  });

  await assert.rejects(
    repositories.mappingSets.delete({
      companyId: "company-2",
      objectId: "mapping-1",
      expectedObjectVersion: 99
    }),
    (error) =>
      error instanceof CanonicalRepositoryConflictError
      && error.details.action === "delete"
  );

  const deleted = await repositories.mappingSets.delete({
    companyId: "company-2",
    objectId: "mapping-1",
    expectedObjectVersion: created.objectVersion
  });
  assert.equal(deleted.objectId, "mapping-1");
  assert.equal(await repositories.mappingSets.get({ companyId: "company-2", objectId: "mapping-1" }), null);
});

test("Phase 2.1 canonical repositories can be scoped per bounded context without record collisions", async () => {
  const store = createInMemoryCanonicalRepositoryStore();
  const authRepositories = createBoundedContextCanonicalRepositories({
    store,
    boundedContextCode: "org_auth",
    objectTypes: {
      memberships: "membership_grant"
    }
  });
  const financeRepositories = createBoundedContextCanonicalRepositories({
    store,
    boundedContextCode: "ledger",
    objectTypes: {
      journals: "journal_entry"
    }
  });

  const authMembership = await authRepositories.memberships.save({
    companyId: "company-3",
    objectId: "shared-id",
    payload: {
      membershipGrantId: "shared-id",
      companyId: "company-3",
      userId: "user-1",
      status: "active"
    }
  });
  const journal = await financeRepositories.journals.save({
    companyId: "company-3",
    objectId: "shared-id",
    payload: {
      journalEntryId: "shared-id",
      companyId: "company-3",
      status: "draft"
    }
  });

  assert.equal(authMembership.objectType, "membership_grant");
  assert.equal(journal.objectType, "journal_entry");
  assert.equal(authMembership.objectId, journal.objectId);
  assert.equal((await authRepositories.memberships.list({ companyId: "company-3" })).length, 1);
  assert.equal((await financeRepositories.journals.list({ companyId: "company-3" })).length, 1);
});
