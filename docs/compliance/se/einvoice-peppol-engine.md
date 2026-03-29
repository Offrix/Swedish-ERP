> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# E-invoice and Peppol engine

Detta dokument definierar e-faktura- och Peppolmotorn för inkommande och utgående elektroniska fakturor.

## Scope

- utgående Peppol
- inkommande Peppol
- invoice och credit note
- validering
- mottagar- och avsändaridentiteter
- buyer reference och order reference
- felhantering och kvittenser
- koppling till AR och AP
- lagring av payload och affärsresultat

## Grundprinciper

1. PDF är inte e-faktura; PDF kan vara bilaga men inte själva affärspayloaden.
2. Inkommande elektroniska fakturor ska valideras innan de skapar AP-objekt.
3. Utgående elektroniska fakturor ska skapas från intern fakturamodell, inte från PDF-rendering.
4. Peppol-payload, kvittens och alla tekniska händelser ska sparas.
5. Kreditnotor ska behandlas som separata affärsdokument, inte negativa standardfakturor om formatet kräver särskild typ.
6. Access point-adaptern ska vara isolerad från kärndomänen.

## Datamodell

Minst:
- `einvoice_parties`
- `einvoice_party_identifiers`
- `peppol_messages`
- `peppol_message_versions`
- `peppol_delivery_events`
- `peppol_validation_results`
- `peppol_attachments`
- `einvoice_errors`

## 34. E-faktura och Peppol — byggspec

### 34.1 Grundregler
- PDF är inte e-faktura
- e-faktura till offentlig sektor ska vara strukturerad elektronisk faktura
- Peppol BIS Billing 3 ska vara primär standard
- kreditnota ska stödjas
- negativa fakturor ska stödjas
- systemet ska kunna skicka och ta emot via accesspunktspartner eller egen accesspunktstrategi

### 34.2 Tekniska krav
- spara dokumenttyp/version
- spara Peppol-ID
- spara transportprofil
- spara kvittenser
- spara valideringsresultat
- spara buyer reference och/eller purchase order reference
- stöd för projektreferens, avtal, kontering och faktureringsobjekt där mottagare kräver det
- stöd för AS4-normalfallet i transportprofil via partner

### 34.3 Inkommande Peppol
- mottagarbehörighet
- adressbok/SMP-data
- schema-validering
- business rule-validering
- duplicate detection
- supplier match
- AP invoice creation

### 34.4 Utgående Peppol
- kundens mottagar-id
- kanalstyrning
- fallback till PDF/mejl när Peppol ej stöds
- validering före sändning
- felkö med återförsök
- spårbar status

## Inbound flow

1. ta emot meddelande från access point
2. validera transport och signatur enligt valt upplägg
3. validera affärspayload
4. skapa intern invoice snapshot
5. avgör om dokumentet går till AP-kö eller felkö
6. spara rå payload och kvittenser

## Outbound flow

1. skapa intern faktura
2. validera att mottagaren kan ta emot elektronisk faktura
3. bygg affärspayload
4. validera payload
5. skicka via access point-adapter
6. spara kvittens och status
7. uppdatera AR med teknisk leveransstatus

## Valideringslager

- schemavalidering
- affärsregler
- partidentifierare
- fakturadatum/förfallodatum
- summor per rad och total
- momsrad och valutakonsistens
- kreditnotelogik
- buyer reference/order reference där krav finns

## Golden tests

- standardfaktura till Peppol-mottagare
- kreditnota
- mottagare utan giltig identifierare
- public sector invoice med buyer reference
- inkommande faktura med flera momssatser
- felaktig payload till felkö
- kvittens och leveransstatusändringar

## Codex-prompt

```text
Read docs/compliance/se/einvoice-peppol-engine.md, docs/compliance/se/vat-engine.md, docs/compliance/se/accounting-foundation.md and docs/compliance/se/rot-rut-engine.md.

Implement the e-invoice/Peppol engine with:
- party identifiers
- inbound and outbound message storage
- validation layers
- adapter boundaries
- AR/AP mapping
- status events
- golden tests

Persist every payload and every delivery event.
```

## Exit gate

- [ ] Utgående elektroniska fakturor validerar innan sändning.
- [ ] Inkommande elektroniska fakturor kan skapa AP-objekt.
- [ ] Kreditnotor fungerar i båda riktningar.
- [ ] Tekniska händelser och payloads kan spåras fullt ut.

