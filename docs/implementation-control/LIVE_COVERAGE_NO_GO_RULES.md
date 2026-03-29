# Live Coverage No-Go Rules

Status: support document for `GO_LIVE_ROADMAP_FINAL.md` phase `0.4`.  
This document is not a new source of truth. It operationalizes the final roadmap rule that seeds, stubs, simulators and phasebucket surfaces may never count as live coverage.

## Absolute interpretation

The following may exist for development, tests, trial isolation or migration scaffolding, but they may never be presented as protected-runtime proof, go-live evidence, parity evidence or advantage evidence:

- demo seeds and scenario seeding
- stub providers
- simulated filing, receipt or callback outcomes
- adapters or providers that only expose `supportsLegalEffect=false`
- phasebucket route families
- shell/demo-only surfaces
- historical `[x]` markers in superseded documents

## Allowed versus forbidden use

| Category | Allowed non-live use | Forbidden as live coverage | Required live proof instead |
| --- | --- | --- | --- |
| Demo seeds / bootstrap scenarios | Trial setup, isolated test data, local development, hermetic fixtures | Production, pilot or parity evidence that depends on seeded tenants or scenario boot | Durable protected boot, explicit migration intake or controlled trial bootstrap with isolated credentials and evidence |
| Stub providers | Local unit tests and narrowly scoped adapter tests | Claiming legal-effect BankID, OCR, submission or delivery coverage from stub behavior | Real provider adapters, signed callbacks, contract tests and provider receipts |
| Simulated transport / receipt outcomes | Internal sandbox simulation and deterministic test harnesses | Treating simulated ACK/NACK/receipt paths as filing/runtime proof | Provider-backed transport, canonical receipts, evidence bundle and replay-safe recovery |
| `supportsLegalEffect=false` adapters | Trial and sandbox exploration with explicit watermarks | Advertising, validating or accepting them as production-capable coverage | Capability model where protected environments require real legal-effect support and live credential segregation |
| Phasebucket routes | Transitional development only until rewritten under final phase ordering | Using `/phase*` API composition as proof of canonical domain surface readiness | Domain-driven route families, typed contracts, idempotency keys, body limits and permission-resolved handlers |
| Shell/demo surfaces | Internal demos and exploratory workflows | Counting shells as production runtime, acceptance or operator readiness | Real runtime flows, workbenches, evidence packs and operator runbooks |

## Operational enforcement

Protected runtime must fail or warn through runtime diagnostics when the repo or composed platform still exposes:

- `seed_demo_forbidden`
- `demo_data_present_in_protected_mode`
- `stub_provider_present`
- `simulated_receipt_runtime`
- `forbidden_route_family_present`
- `phasebucket_route_runtime_present`

## No-go verdict

If any of the forbidden categories above are the only evidence for a capability, that capability is not live-ready and the relevant roadmap gate must stay red.
