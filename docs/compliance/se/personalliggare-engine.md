# Personalliggare engine

Detta dokument definierar personalliggarmotorn för bygg och andra framtida reglerade miljöer där elektronisk närvarologg krävs.

## Scope

- byggarbetsplatsregister
- uppskattad totalkostnad och tröskelbedömning
- check-in / check-out
- kiosk-läge
- mobil registrering
- offline-cache och synk
- rättelser och audit trail
- kontrollrapporter
- export för revision och myndighetskontroll

## Principer

1. Personalliggaren är ett separat domänobjekt, inte en bieffekt av tidrapportering.
2. Check-in/check-out ska vara tidsstämplad och spårbar till identitet, arbetsgivare och plats.
3. Offline-registrering ska vara möjlig men markeras som offline-skapad tills synk skett.
4. Rättelser får aldrig skriva över originalhändelsen; de ska skapa korrigeringshändelser.
5. Personalliggare och tidrapportering kan dela källdata men får inte blandas ihop i logik eller UI.

## Datamodell

Minst:
- `construction_sites`
- `construction_site_registrations`
- `attendance_events`
- `attendance_corrections`
- `kiosk_devices`
- `attendance_exports`
- `attendance_audit_events`

## 32. Personalliggare bygg — byggspec

### 32.1 När ska den användas
- byggverksamhet på byggarbetsplats i Sverige
- elektronisk personalliggare krävs enligt lag
- byggherren ska anmäla byggarbetsplatsen till Skatteverket innan byggverksamheten påbörjas
- byggherren ska tillhandahålla utrustning för elektronisk personalliggare när skyldighet finns
- entreprenörer som bedriver byggverksamhet på platsen ska föra liggare där sådan utrustning finns

### 32.2 Undantag
- byggherren behöver inte tillhandahålla utrustning förrän den sammanlagda kostnaden för byggverksamheten på byggarbetsplatsen kan antas uppgå till mer än fyra prisbasbelopp
- i den sammanlagda kostnaden ingår materialkostnader och arbetskostnader exklusive moms samt kostnader för stödverksamhet
- systemet ska därför ha site_estimated_total_cost_ex_vat och threshold_flag

### 32.3 Data som måste sparas
- site_id
- site_name
- site_address
- builder_org_no
- site_registration_status
- start_date
- end_date
- worker_identity
- employer_org_no
- contractor_org_no
- shift_start
- shift_end
- created_at
- created_by
- source: kiosk/mobile/import
- correction history

### 32.4 Funktioner
- byggarbetsplatsregister
- anmälan-stöd/checklista
- check-in/check-out
- kiosk-läge
- mobil registrering
- offline cache
- daglig översikt
- export för kontroll
- spärr för saknade identiteter
- audit trail för rättningar

## Arbetsplatsflöde

1. skapa byggarbetsplats
2. ange uppskattad kostnad exklusive moms
3. avgör om tröskel passerats
4. skapa registrerings- och checklistestatus
5. aktivera kiosk eller mobilregistrering
6. logga närvaro
7. synka offline-händelser
8. exportera kontrollunderlag

## Fält per attendance event

- site_id
- worker_identity_type
- worker_identity_value
- full_name_snapshot
- employer_org_no
- contractor_org_no
- event_type (`check_in`, `check_out`, `correction`)
- event_timestamp
- source_channel (`kiosk`, `mobile`, `admin`)
- device_id
- offline_flag
- geo_context when available
- created_by
- created_at

## Korrigeringar

Korrigering ska kräva:
- orsak
- vem som gjorde korrigeringen
- när korrigeringen gjordes
- vilken originalhändelse som korrigeras

Originalet ska ligga kvar i audit trail.

## Exporter

Systemet ska kunna skapa:
- dagsrapport per site
- personrapport per site
- arbetsgivarrapport
- full audit export
- PDF för kontrollbesök
- CSV/JSON för intern analys

## Golden tests

- kostnad under tröskel
- kostnad över tröskel
- check-in/check-out normalt
- glömd checkout och administrativ korrigering
- offline-registrering och senare synk
- flera entreprenörer på samma plats
- person utan fullständig identitet blockeras
- export av dagsrapport

## Codex-prompt

```text
Read docs/compliance/se/personalliggare-engine.md and docs/compliance/se/travel-and-traktamente-engine.md.

Implement the personalliggare engine with:
- construction sites
- threshold evaluation
- attendance events
- kiosk and mobile flows
- offline sync model
- correction events
- control exports
- golden tests

Keep personalliggare separate from ordinary time tracking.
```

## Exit gate

- [ ] Närvaro kan registreras i kiosk och mobil.
- [ ] Offline-händelser synkar utan att tappa audit trail.
- [ ] Korrigeringar sparar original och diff.
- [ ] Kontrollrapport kan tas ut per byggarbetsplats.
