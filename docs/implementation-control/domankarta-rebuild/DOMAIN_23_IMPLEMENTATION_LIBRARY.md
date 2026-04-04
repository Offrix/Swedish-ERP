# DOMAIN_23_IMPLEMENTATION_LIBRARY

## mål

Fas 23 ska bygga en riktig operativ asset-/fleet-/maintenance-domän där maskiner, fordon, verktyg och utrustning lever som first-class objects, inte som finans- eller HR-fragment.

## bindande tvärdomänsunderlag

- `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md` är overordnad canonical sanning för alla finansiella asset cards, capitalization decisions, depreciation plans, impairments och disposals i denna domän.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` är overordnad canonical sanning för asset vouchers, serie `F`, correction chains och SIE4-vouchertruth i denna domän.

## Fas 23

### Delfas 23.1 asset / fleet object-model / route truth

- bygg:
  - `OperationalAsset`
  - `FleetVehicle`
  - `EquipmentUnit`
  - `AssetLifecycleDecision`
  - `AssetFinancialLink`
- state machines:
  - `OperationalAsset: draft -> active -> in_service | under_maintenance | reserved | retired | disposed`
  - `FleetVehicle: active | blocked | under_service | retired`
- commands:
  - `registerOperationalAsset`
  - `registerFleetVehicle`
  - `linkOperationalAssetToAssetCard`
- invariants:
  - operativ asset och finansiellt asset card är separata objekt
  - canonical route family är `/v1/assets/*`
- tester:
  - asset root lifecycle
  - asset-financial link tests

### Delfas 23.2 assignment / location / lifecycle hardening

- bygg:
  - `AssetAssignment`
  - `AssetLocation`
  - `AssetStatusReceipt`
  - `AssetAvailabilityWindow`
- commands:
  - `assignAsset`
  - `moveAssetLocation`
  - `setAssetAvailability`
- invariants:
  - ansvarig, plats och status måste vara explicit
  - transfers och relocation kräver receipt
- tester:
  - assignment/location tests
  - lifecycle transition tests

### Delfas 23.3 maintenance plan / inspection / fault hardening

- bygg:
  - `MaintenancePlan`
  - `InspectionChecklist`
  - `FaultCase`
  - `MaintenanceOrder`
  - `MaintenanceCompletionReceipt`
- commands:
  - `createMaintenancePlan`
  - `openFaultCase`
  - `createMaintenanceOrder`
  - `completeMaintenanceOrder`
- invariants:
  - preventive maintenance, inspection och fault måste vara first-class
  - maintenance completion måste bära evidence och downtime-resultat
- tester:
  - maintenance lifecycle tests
  - inspection and fault tests

### Delfas 23.4 vehicle / fleet / usage / compliance hardening

- bygg:
  - `VehicleProfile`
  - `UsageLog`
  - `FleetComplianceRecord`
  - `ServiceIntervalSignal`
- commands:
  - `registerVehicleUsage`
  - `recordFleetCompliance`
  - `raiseServiceIntervalSignal`
- invariants:
  - vehicle compliance och usage måste blockera otillåten bokning där policy kräver det
- tester:
  - usage log tests
  - fleet compliance blocking tests

### Delfas 23.5 reservation / booking / allocation hardening

- bygg:
  - `AssetReservation`
  - `EquipmentBooking`
  - `AllocationDecision`
  - `ConflictReceipt`
- commands:
  - `reserveAsset`
  - `allocateAssetToDelivery`
  - `resolveAssetBookingConflict`
- invariants:
  - dubbelbokning och fel allokering måste blockeras
  - allocation till delivery eller project måste vara receipt-buren
- tester:
  - asset reservation tests
  - allocation conflict tests

### Delfas 23.6 asset cost / depreciation / ledger bridge hardening

- bygg:
  - `AssetCostSnapshot`
  - `AssetExpenseReceipt`
  - `AssetDepreciationBridge`
  - `AssetValuationSnapshot`
- commands:
  - `materializeAssetCostSnapshot`
  - `linkAssetToDepreciationBridge`
- invariants:
  - operativa asset-events får inte implicit skriva finansiell ledger
  - finansiell bridge måste vara explicit och auditbar
- tester:
  - asset cost snapshot tests
  - depreciation bridge tests

### Delfas 23.7 vendor service / history / evidence hardening

- bygg:
  - `VendorServiceEvent`
  - `WarrantyProfile`
  - `AssetEvidenceRef`
  - `ExternalServiceReceipt`
- commands:
  - `recordVendorServiceEvent`
  - `attachAssetEvidenceRef`
- invariants:
  - extern servicehistorik och garanti måste kunna länkas till maintenance och kostnad
- tester:
  - vendor service history tests
  - warranty and evidence tests

### Delfas 23.8 doc / runbook / legacy purge

- bygg:
  - `AssetDocTruthDecision`
  - `AssetLegacyArchiveReceipt`
  - `AssetRunbookExecution`
- dokumentbeslut:
  - harden: `docs/compliance/se/fixed-assets-and-depreciation-engine.md`
  - create: `docs/runbooks/asset-maintenance-operations.md`
  - create: `docs/runbooks/fleet-operations.md`
  - create: `docs/runbooks/equipment-allocation.md`
- invariants:
  - finansiella anläggningsdocs får inte fortsätta vara hela asset-domänen
- tester:
  - docs truth lint
  - runbook existence lint
