# DOMAIN_23_ROADMAP

## mål

Göra Domän 23 till en riktig operativ asset-, fleet- och maintenance-domän så att företag kan driva maskiner, fordon, verktyg och utrustning i samma plattform som ekonomi och leverans.

## varför domänen behövs

Utan denna domän måste företag med verkliga tillgångar fortfarande ha externa system för:
- utrustningsregister
- fordonsöversikt
- serviceintervall
- underhåll
- felanmälan
- tillgänglighet och reservation

## bindande tvärdomänsunderlag

- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör finansiell asset bridge, capitalization, avskrivning, impairment, disposal och skiljelinjen mellan operativ asset och finansiellt asset card.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör asset vouchers, serie `F`, kontrollkonton, correction chains och SIE4-vouchertruth.

## faser

- Fas 23.1 asset / fleet object-model / route truth
- Fas 23.2 assignment / location / lifecycle hardening
- Fas 23.3 maintenance plan / inspection / fault hardening
- Fas 23.4 vehicle / fleet / usage / compliance hardening
- Fas 23.5 reservation / booking / allocation hardening
- Fas 23.6 asset cost / depreciation / ledger bridge hardening
- Fas 23.7 vendor service / history / evidence hardening
- Fas 23.8 doc / runbook / legacy purge

## dependencies

- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` fÃ¶r ledger och verifikationskÃ¤rna.
- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` fÃ¶r avskrivning, impairment och disposal.

- Domän 3 för ledger och avskrivning.
- Domän 19 för delivery/work order-koppling.
- Domän 20 för reservdelar, lager och material.
- Domän 21 för tasks, approvals och exception center.

## vad som får köras parallellt

- 23.2 och 23.3 kan köras parallellt när asset root är låst.
- 23.4 och 23.5 kan köras parallellt när lifecycle-objekten finns.
- 23.6 kan påbörjas när både operativ asset och finansiell bridge är definierade.

## vad som inte får köras parallellt

- 23.2 får inte markeras klar före 23.1.
- 23.3 får inte markeras klar före 23.1.
- 23.5 får inte markeras klar före 23.2.
- 23.6 får inte markeras klar före 23.1 och 23.2.

## exit gates

- operational assets är first-class objects
- maintenance, inspections och faults är first-class lifecycle
- availability, assignment och booking är first-class runtime
- finansiell asset bridge till ledgern är tydlig men separerad från operativ asset truth

## test gates

- asset lifecycle tests
- maintenance and inspection tests
- vehicle/fleet compliance tests
- reservation/allocation tests
- asset-cost/ledger bridge tests

## delfaser

### Delfas 23.1 asset / fleet object-model / route truth
- [ ] bygg `OperationalAsset`, `FleetVehicle`, `EquipmentUnit`, `AssetLifecycleDecision`, `AssetFinancialLink`
- [ ] skapa canonical route family `/v1/assets/*`
- [ ] separera operativa assets från finansiella asset cards
- [ ] verifiera route truth lint och asset-to-ledger linkage

### Delfas 23.2 assignment / location / lifecycle hardening
- [ ] bygg `AssetAssignment`, `AssetLocation`, `AssetStatusReceipt`, `AssetAvailabilityWindow`
- [ ] stöd ansvarig, plats, status och tillgänglighet
- [ ] blockera oklara asset transfers utan receipt
- [ ] verifiera assignment, relocation och lifecycle transitions

### Delfas 23.3 maintenance plan / inspection / fault hardening
- [ ] bygg `MaintenancePlan`, `InspectionChecklist`, `FaultCase`, `MaintenanceOrder`, `MaintenanceCompletionReceipt`
- [ ] gör serviceintervall, inspektion och felanmälan first-class
- [ ] bind maintenance till asset, schedule och evidence
- [ ] verifiera plan generation, fault escalation och completion

### Delfas 23.4 vehicle / fleet / usage / compliance hardening
- [ ] bygg `VehicleProfile`, `UsageLog`, `FleetComplianceRecord`, `ServiceIntervalSignal`
- [ ] stöd fordonsspecifik compliance, usage och servicebehov
- [ ] blockera fordon som inte är compliance-klara från bokning där policy kräver det
- [ ] verifiera fleet compliance och usage lineage

### Delfas 23.5 reservation / booking / allocation hardening
- [ ] bygg `AssetReservation`, `EquipmentBooking`, `AllocationDecision`, `ConflictReceipt`
- [ ] stöd bokning av verktyg, fordon och utrustning till leverans- eller projektflöden
- [ ] blockera dubbelbokning och felaktig tilldelning
- [ ] verifiera reservation, allocation och conflict handling

### Delfas 23.6 asset cost / depreciation / ledger bridge hardening
- [ ] bygg `AssetCostSnapshot`, `AssetExpenseReceipt`, `AssetDepreciationBridge`, `AssetValuationSnapshot`
- [ ] länka operativa assets till finansiella asset cards där relevant
- [ ] skilj operativt asset-event från finansiell posting
- [ ] verifiera ledger bridge och avskrivningskoppling

### Delfas 23.7 vendor service / history / evidence hardening
- [ ] bygg `VendorServiceEvent`, `WarrantyProfile`, `AssetEvidenceRef`, `ExternalServiceReceipt`
- [ ] stöd extern servicehistorik, garanti och dokumentevidens
- [ ] bind vendor service till maintenance och cost lineage
- [ ] verifiera vendor history och evidence linkage

### Delfas 23.8 doc / runbook / legacy purge
- [ ] skriv explicit keep/rewrite/archive/remove-beslut för asset- och depreciation-docs
- [ ] skapa canonical runbooks för maintenance, fleet ops och equipment allocation
- [ ] håll fixed-assets-doc som finansiell consumer doc
- [ ] verifiera docs truth lint och legacy archive receipts
