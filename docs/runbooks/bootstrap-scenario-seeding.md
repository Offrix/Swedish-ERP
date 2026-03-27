> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Bootstrap Scenario Seeding

## Purpose

Keep demo and trial seed data explicit so that no core domain autoseeds by accident.

## Canonical rule

Core domains default to:

- `bootstrapMode = none`
- no seeded demo state

Seeded demo state is only allowed through an explicit scenario, for example:

- `bootstrapMode = scenario_seed`
- `bootstrapScenarioCode = test_default_demo`

## Allowed use

- unit and integration tests that require canonical demo fixtures
- trial/demo scenarios that are explicitly marked as non-live
- controlled onboarding or sales scenarios that are isolated from legal effect

## Forbidden use

- production startup
- pilot startup
- any starter that has not declared a bootstrap scenario

## Validation

Run:

```powershell
node --test tests/unit/phase1-bootstrap-mode.test.mjs
node --test tests/unit/phase1-runtime-mode.test.mjs
```

Then run the full verification suite before moving to the next roadmap subphase.

