# Pension and salary exchange engine

Detta dokument definierar pensionsmotorn: tjänstepension, extra pension, kollektivavtalsstyrning, rapportering, avstämning, särskild löneskatt på pensionskostnader och löneväxling.

## Scope

- ordinarie tjänstepension
- ITP 1
- ITP 2
- SAF-LO/Fora
- extra arbetsgivarbetald pension
- engångspremier
- kompletterande premier
- premiebefrielsemarkering
- särskild löneskatt på pensionskostnader
- löneväxling
- bonusväxling om valt i scope
- rapporteringsunderlag och differenslogg

## Datamodell

Minst:
- `pension_plans`
- `employee_pension_enrollments`
- `pension_events`
- `pension_basis_snapshots`
- `salary_exchange_agreements`
- `pension_reports`
- `pension_report_lines`
- `pension_reconciliations`

## Kärnregler

1. Pensionsmedförande lön är ett eget fält, inte lika med bruttolön.
2. Löneväxling påverkar kontant lön och kan påverka pensionsunderlag på olika sätt beroende på avtal.
3. Extra pension ska kunna särbokföras.
4. Rapporterad pension ska kunna avstämmas mot leverantörsfaktura.
5. Särskild löneskatt på pensionskostnader ska kunna beräknas separat i bokslut och/eller löpande uppföljning.
6. Alla avtal och ändringar ska vara versions- och datumstyrda.

## 30. Pension, extra pension och löneväxling — byggspec

### 30.1 Grundmodell
Varje pensionshändelse ska ha:
- employee_id
- plan_type
- provider
- basis_period
- pensionable_salary
- contribution_rate
- contribution_amount
- supplementary_flag
- salary_exchange_flag
- employer_markup
- report_status
- invoice_reconciliation_status

### 30.2 ITP och Fora
- ITP 1: rapportera utbetald bruttolön varje månad
- ITP 2: rapportera pensionsmedförande årslön
- all rapportering ska gå via rapporteringslager/internetkontor eller fil/integration beroende leverantör
- Fora: arbetarnas löner rapporteras varje månad, senast sista dagen i månaden efter utbetalningsmånaden
- vissa lönetyper ska hänföras till annan månad där regelverket kräver det
- systemet ska kunna korrigera tidigare rapporterad lön och skapa differenslogg

### 30.3 Pensionsmedförande lön
Systemet måste kunna hålla isär:
- utbetald bruttolön
- pensionsmedförande lön
- underlag för kollektivavtalad premie
- underlag för extra arbetsgivarbetald pension
- underlag efter bruttolöneväxling
- underlag vid sjukdom/föräldraledighet när plan/regler påverkar

### 30.4 Extra pension
- extra pension ska kunna läggas som fast procent, fast belopp eller engångspremie
- ska kunna styras per anställd eller grupp
- ska kunna pausa/avsluta
- ska bokföras separat från grundpremie

### 30.5 Löneväxling
- löneväxling måste ha avtal startdatum
- löneväxling måste ha avtal belopp eller procentsats
- arbetsgivarens påslag måste kunna hanteras
- systemet ska kunna simulera effekten innan aktivering
- månadslönen efter löneväxling bör ligga över 56 087 kr under 2026
- systemet ska varna om inkomster vid sjukdom/föräldraledighet kan göra växlingen olämplig
- systemet ska stödja pause/resume/stop/restart
- växlingen ska vara synlig på lönebesked
- växlingen ska påverka bokföring, pension och netto korrekt

## Särskild löneskatt på pensionskostnader

Systemet ska kunna bära ett separat underlag för särskild löneskatt på pensionskostnader. Detta underlag ska:
- bygga på bokföringsmässiga grunder
- kunna avstämmas mot pensionsevents och leverantörsfakturor
- bokföras separat från premien
- kunna användas i boksluts- och deklarationsunderlag

## Löneväxlingsworkflow

1. skapa avtal
2. simulera effekter
3. godkänn avtal
4. aktivera från datum
5. kontrollera tröskel efter växling
6. hantera pause/resume/stop
7. visa på lönebesked
8. rapportera pension
9. bokför premie och eventuell särskild löneskatt

## Warnings som måste finnas

- lön efter växling under rekommenderad nivå
- inkomstbortfall vid sjukdom eller föräldraledighet
- saknat pensionsavtal
- okänd kollektivavtalstyp
- saknad leverantörsmappning
- differens mellan rapporterad premie och fakturerad premie

## Golden tests

- ITP 1 normal månad
- ITP 2 med ändrad årslön
- Fora månadsrapport
- extra pension fast belopp
- extra pension procent
- löneväxling med arbetsgivarpåslag
- löneväxling som pausar vid låg lön
- pensionsrapport med korrigering
- avstämning mot pensionsfaktura
- särskild löneskattunderlag

## Codex-prompt

```text
Read docs/compliance/se/pension-and-salary-exchange-engine.md and docs/compliance/se/payroll-engine.md.

Implement the pension engine with:
- plan enrollments
- pension basis snapshots
- ITP/Fora reporting adapters
- extra pension events
- salary exchange agreements
- reconciliation against provider invoices
- accounting intents
- warnings and simulations
- golden tests
```

## Exit gate

- [ ] Pensionsmedförande lön går att förklara.
- [ ] Löneväxling kan simuleras, aktiveras, pausas och stoppas.
- [ ] Rapporter går att generera och rätta.
- [ ] Pensionskostnader och särskild löneskatt kan avstämmas.
