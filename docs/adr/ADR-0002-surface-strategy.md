# ADR-0002 - Surface strategy

Status: Accepted  
Date: 2026-03-21

## Context

Produkten ska inte byggas som en enda responsiv "allt-i-ett-app". Ekonomi, lon, bokslut och controllerarbete krav er tat, bred och snabb desktop-yta. Faltarbete krav er en enkel, talig och tumvanlig mobilupplevelse.

## Decision

Vi bygger tva produkt-ytor fran samma backend och samma domanmodell:

1. **desktop-web**  
   En enda fullstandig desktop-yta for alla roller. Guided flows, rollanpassade dashboards och operator-workbenches ligger i samma app och samma route-trad.

2. **field-mobile**  
   En separat mobilapp for tid, franvaro, resor, utlagg, arbetsorder, check-in, material, foto, signatur och personalliggare.

## Explicit non-decisions

- Ingen mobile-first strategi.
- Ingen uppdelning i flera desktop-varianter.
- Ingen tung ekonomifunktion i mobilappen.
- Ingen marknadswebb i MASTER BUILD PLAN. Produkt-UI ligger i separat UI-plan.

## Surface responsibilities

### desktop-web

- att-gora-lista
- dokumentinbox
- kundfakturor och leverantorsfakturor
- betalningsoversikt
- ledger, moms och bankavstamning
- lon, AGI, formaner, traktamente och pension
- projektanalys, byralage och close workbench
- guided startsidor och tat operatorarbete i samma yta

### field-mobile

- idag
- jobb
- tid
- resor och utlagg
- check-in
- material
- kundsignatur
- offline-sync

## UX outcome we want

- `desktop-web` ska kannas trygg, vagledd och samtidigt tat, snabb och keyboard-driven.
- `field-mobile` ska vara tumvanlig, felresistent och snabb i dalig uppkoppling.

## Verification

- [ ] UI-plan finns i separat fil.
- [ ] `desktop-web` deployas som en egen app.
- [ ] `field-mobile` deployas separat.
- [ ] Guided patterns ligger inuti samma `desktop-web`, inte i en separat app.
- [ ] `ui-core`, `ui-desktop` och `ui-mobile` finns som delade komponentlager.
