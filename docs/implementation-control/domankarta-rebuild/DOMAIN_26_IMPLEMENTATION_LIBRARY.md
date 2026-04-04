# DOMAIN_26_IMPLEMENTATION_LIBRARY

## mål

Fas 26 ska bygga plattformens tillverknings- och produktionskärna så att BOM, materialbehov, shop floor, quality och WIP blir first-class och inte lämnas till externa system.

## bindande tvärdomänsunderlag

- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger inventory ownership, valuation method, count, scrap inventory-value effect och carrying value för material och färdiga varor.

## Fas 26

### Delfas 26.1 BOM / recipe / route truth

- bygg:
  - `BillOfMaterials`
  - `BomVersion`
  - `RecipeVariant`
  - `AssemblyProfile`
- state machines:
  - `BomVersion: draft -> approved -> active | superseded | retired`
- commands:
  - `createBillOfMaterials`
  - `publishBomVersion`
- invariants:
  - BOM måste vara versionerat och immutable efter publication
  - canonical route family är `/v1/production/*`
- tester:
  - BOM version tests
  - route truth suite

### Delfas 26.2 MRP / material requirements / planning hardening

- bygg:
  - `MaterialRequirementPlan`
  - `DemandSignal`
  - `SupplyProposal`
  - `ProductionPlanningWindow`
- commands:
  - `generateMaterialRequirementPlan`
  - `publishSupplyProposal`
  - `rescheduleProductionWindow`
- invariants:
  - MRP måste bygga på demand signals, BOM och inventory state
  - planering utan material- eller kapacitetsbas är förbjuden
- tester:
  - MRP generation tests
  - planning window reschedule tests

### Delfas 26.3 manufacturing order / routing / work center hardening

- bygg:
  - `ManufacturingOrder`
  - `RoutingVersion`
  - `WorkCenter`
  - `ProductionOperation`
- state machines:
  - `ManufacturingOrder: draft -> released -> in_progress -> completed | blocked | cancelled`
  - `ProductionOperation: planned -> started -> completed | failed | blocked`
- commands:
  - `releaseManufacturingOrder`
  - `startProductionOperation`
  - `completeProductionOperation`
- invariants:
  - released MO måste vara låst mot BOM-version, routing och plan
  - work center-kapacitet måste vara first-class
- tester:
  - MO lifecycle tests
  - routing/work-center tests

### Delfas 26.4 material issue / yield / scrap hardening

- bygg:
  - `ProductionMaterialIssue`
  - `YieldReceipt`
  - `ScrapDecision`
  - `ByproductReceipt`
- commands:
  - `issueProductionMaterial`
  - `recordProductionYield`
  - `recordScrapDecision`
- invariants:
  - material issue måste skriva inventory lineage
  - yield och scrap måste vara explicit i stället för att döljas i lagerjustering
- tester:
  - material issue tests
  - yield/scrap tests

### Delfas 26.5 quality / deviation / hold hardening

- bygg:
  - `QualityCheck`
  - `QualityDeviation`
  - `ProductionHold`
  - `ReleaseDecision`
- commands:
  - `recordQualityCheck`
  - `raiseQualityDeviation`
  - `placeProductionHold`
  - `releaseProductionHold`
- invariants:
  - quality hold blockerar release där policy kräver det
  - deviations måste vara first-class och auditbara
- officiella källor:
  - [Odoo Quality](https://www.odoo.com/app/quality)
- tester:
  - quality hold tests
  - deviation lifecycle tests

### Delfas 26.6 production cost / WIP / ledger bridge hardening

- bygg:
  - `ProductionCostSnapshot`
  - `ProductionWipReceipt`
  - `ManufacturingLedgerBridge`
  - `VariancePostingReceipt`
- commands:
  - `materializeProductionCostSnapshot`
  - `postProductionWipReceipt`
  - `postProductionVariance`
- invariants:
  - produktionens kostnad och WIP måste kunna härledas till supply core och ledgern
  - inga fria manuella WIP-postningar utan production lineage
- tester:
  - production cost tests
  - WIP/variance ledger tests

### Delfas 26.7 subcontracting / kitting / assembly hardening

- bygg:
  - `SubcontractingOrder`
  - `KitAssembly`
  - `AssemblyCompletionReceipt`
  - `ExternalProductionReceipt`
- commands:
  - `createSubcontractingOrder`
  - `completeKitAssembly`
  - `recordExternalProductionReceipt`
- invariants:
  - kitting och assembly får inte reduceras till fria inventory writes
  - extern produktion måste ha explicit receipt och quality bridge
- officiella källor:
  - [Odoo Manufacturing](https://www.odoo.com/app/manufacturing)
  - [Odoo Bill of Materials](https://www.odoo.com/app/bill-of-materials)
- tester:
  - subcontracting tests
  - kit assembly tests

### Delfas 26.8 doc / runbook / legacy purge

- bygg:
  - `ProductionDocTruthDecision`
  - `ProductionLegacyArchiveReceipt`
  - `ProductionRunbookExecution`
- dokumentbeslut:
  - create: `docs/runbooks/mrp-operations.md`
  - create: `docs/runbooks/shop-floor-operations.md`
  - create: `docs/runbooks/production-quality-and-close.md`
- invariants:
  - kalkyl- eller field-docs får inte fortsätta låtsas vara produktionsdomän
- tester:
  - docs truth lint
  - runbook existence lint
