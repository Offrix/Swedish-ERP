# DOMAIN_26_ROADMAP

## mål

Göra Domän 26 till plattformens tillverknings- och produktionskärna så att bolag med BOM, MRP, assemblies och quality kan driva verksamheten utan separat MRP/MES-light-system.

## varför domänen behövs

Utan denna domän klarar plattformen inte tillverkande, assemblerande eller kit-baserade verksamheter. Då måste kunden fortfarande ha separat system för:
- BOM
- produktionsorder
- work centers
- materialbehov
- kvalitetskontroller
- yield/scrap

## faser

- Fas 26.1 BOM / recipe / route truth
- Fas 26.2 MRP / material requirements / planning hardening
- Fas 26.3 manufacturing order / routing / work center hardening
- Fas 26.4 material issue / yield / scrap hardening
- Fas 26.5 quality / deviation / hold hardening
- Fas 26.6 production cost / WIP / ledger bridge hardening
- Fas 26.7 subcontracting / kitting / assembly hardening
- Fas 26.8 doc / runbook / legacy purge

## dependencies

- `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md` äger inventory ownership, valuation method, count, scrap inventory-value effect och carrying value för material och färdiga varor.

- Domän 20 för item master, inventory och cost layers.
- Domän 18 för sales demand och order-based production.
- Domän 19 för operationer, resource och maintenance-länkar.
- Domän 23 för equipment/fleet/work-center-asset-koppling.

## vad som får köras parallellt

- 26.2 och 26.3 kan köras parallellt när BOM root är låst.
- 26.4 och 26.5 kan köras parallellt när manufacturing orders finns.
- 26.7 kan påbörjas när BOM och inventory issue finns.

## vad som inte får köras parallellt

- 26.2 får inte markeras klar före 26.1.
- 26.3 får inte markeras klar före 26.1.
- 26.4 får inte markeras klar före 26.2 och 26.3.
- 26.6 får inte markeras klar före 26.4 och 26.5.

## exit gates

- BOM och recipes är first-class
- MRP och manufacturing orders är first-class
- quality, yield och scrap är first-class
- produktionskostnad och WIP kan härledas deterministiskt till ledgern

## test gates

- BOM/version tests
- MRP/planning tests
- manufacturing-order/work-center tests
- quality/yield/scrap tests
- production-cost/WIP tests

## delfaser

### Delfas 26.1 BOM / recipe / route truth
- [ ] bygg `BillOfMaterials`, `BomVersion`, `RecipeVariant`, `AssemblyProfile`
- [ ] skapa canonical route family `/v1/production/*`
- [ ] gör BOM och recipe till egen object family
- [ ] verifiera route truth lint och BOM lineage

### Delfas 26.2 MRP / material requirements / planning hardening
- [ ] bygg `MaterialRequirementPlan`, `DemandSignal`, `SupplyProposal`, `ProductionPlanningWindow`
- [ ] stöd demand-driven materialbehov och supplyförslag
- [ ] blockera produktion utan planerad material- och kapacitetsbas
- [ ] verifiera plan generation och rescheduling

### Delfas 26.3 manufacturing order / routing / work center hardening
- [ ] bygg `ManufacturingOrder`, `RoutingVersion`, `WorkCenter`, `ProductionOperation`
- [ ] gör manufacturing orders, routing och work centers first-class
- [ ] bind orderrelease till BOM-version, routing och materialplan
- [ ] verifiera MO lifecycle och routing execution

### Delfas 26.4 material issue / yield / scrap hardening
- [ ] bygg `ProductionMaterialIssue`, `YieldReceipt`, `ScrapDecision`, `ByproductReceipt`
- [ ] stöd issue, consumption, output och scrap i produktionen
- [ ] blockera close utan material/yield-redovisning där policy kräver det
- [ ] verifiera issue/yield/scrap lineage

### Delfas 26.5 quality / deviation / hold hardening
- [ ] bygg `QualityCheck`, `QualityDeviation`, `ProductionHold`, `ReleaseDecision`
- [ ] gör kvalitetskontroller och deviations first-class
- [ ] blockera release av batch eller order vid quality hold
- [ ] verifiera quality hold och release flow

### Delfas 26.6 production cost / WIP / ledger bridge hardening
- [ ] bygg `ProductionCostSnapshot`, `ProductionWipReceipt`, `ManufacturingLedgerBridge`, `VariancePostingReceipt`
- [ ] gör produktionskostnad, WIP och varians first-class
- [ ] bind produktion till inventory cost layers och ledger
- [ ] verifiera WIP/variance/ledger bridge

### Delfas 26.7 subcontracting / kitting / assembly hardening
- [ ] bygg `SubcontractingOrder`, `KitAssembly`, `AssemblyCompletionReceipt`, `ExternalProductionReceipt`
- [ ] stöd kitting, assembly och extern produktion
- [ ] förhindra att assembly löses som fria inventory writes
- [ ] verifiera subcontracting och kit completion

### Delfas 26.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för eventuella kalkyl-/materialdocs som felaktigt används som produktionstruth
- [ ] skapa canonical runbooks för MRP, shop floor, quality och production close
- [ ] verifiera docs truth lint och runbook existence lint
