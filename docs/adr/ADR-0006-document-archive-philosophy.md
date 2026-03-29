> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0006 — Document archive philosophy

Status: Accepted  
Date: 2026-03-21

## Context

Dokumentmotorn är inte ett filbibliotek utan bokföringssystemets beviskedja. Systemet måste kunna ta emot, lagra, hasha, versionera, koppla och återskapa dokument utan att förstöra original eller förlora revisionsspår.

## Decision

Vi inför följande principer:

1. Originalfilen är helig.
2. Alla derivat lagras separat från originalet.
3. OCR-text, renderad PDF, thumbnails och AI-klassning är derivat, inte original.
4. Inkommande mejl sparas i rå form när de används som underlag.
5. Varje dokumentversion får hash, storlek, MIME-typ, storage key och skapad tid.
6. Länkar mellan dokument och affärsobjekt är explicita och versionsoberoende.
7. Radering får aldrig ske tyst; endast policy-driven soft-delete eller legal deletion workflow.
8. Dokumentarkivet måste kunna exporteras bolagsvis, periodvis eller objektvis.
9. Skannade original får markeras som säkert överförda först när:
   - filen kan läsas
   - hash är sparad
   - dokumenttyp är bestämd eller satt till granskningskö
   - lagringskvittens finns
10. Dokumenttyper har egna retention- och åtkomstregler.

## Document states

- received
- virus_scanned
- stored
- ocr_done
- classified
- reviewed
- linked
- archived
- under_legal_hold
- deletion_pending
- deleted

## Verification

- [ ] Originalfil och derivat går att skilja åt i databasen.
- [ ] Samma dokument kan exporteras med komplett audit trail.
- [ ] Duplikat med samma hash upptäcks.
- [ ] Rått mejl med bilagor kan återskapas.

