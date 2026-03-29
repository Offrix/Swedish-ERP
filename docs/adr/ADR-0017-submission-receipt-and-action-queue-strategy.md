> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0017 — Submission receipt and action queue strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Myndighets- och partnerflöden har olika kvittensmodeller men produkten behöver en enhetlig operatörsmodell.
- Status måste särskilja tekniskt skickat, affärsmässigt accepterat och slutligt avslutat.
- Fel måste kunna återförsökas eller korrigeras utan att historiken förloras.

## Decision

- Vi inför ett generiskt submission envelope med receipt chain, action queue och normaliserad statusmodell.
- Receipts ska vara append-only och normaliseras från varje adapter till gemensamma receipt-typer.
- Transportfel och domänfel separeras explicit och leder till olika retry-regler.
- Manuell hantering ska ske via action queue och skapa nya attempts eller nya payloadversioner, inte ändra historiska submissions.
- Samma modell ska användas för AGI, moms, HUS, Peppol och årsflöden där det är tekniskt rimligt.

## Alternatives considered

- Domänspecifika receipt-tabeller avvisades eftersom operatörsarbete och testning då fragmenteras.
- Otydlig status som bara säger skickad/misslyckad avvisades eftersom den inte räcker för revision och support.
- Omleverans som skriver över tidigare försök avvisades eftersom det förstör historik.

## Consequences

- Alla adapters måste normalisera sina svar till gemensamma receipt-fält.
- Submission operator-vyer och runbooks blir tvärgående resurser.
- Payloadversionering och supersede-logik måste vara konsekvent över domäner.

## Verification

- [ ] submissions har enhetlig statuskedja och receiptmodell
- [ ] transportfel och domänfel ger olika operativa utfall
- [ ] action queue kan driva manuell komplettering och retry
- [ ] tidigare attempts och payloadversioner ligger kvar
- [ ] modellen fungerar för minst AGI, moms, HUS, Peppol och årsflöde

