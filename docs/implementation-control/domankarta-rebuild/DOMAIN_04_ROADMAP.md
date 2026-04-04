# DOMAIN_04_ROADMAP

Datum: 2026-04-02  
Domän: Accounts Receivable, Customer Billing, Revenue Flows

## mål

Bygga om kundfakturering och kundreskontra till en verklig svensk produktionsdomän där kund, offert, avtal, billing triggers, faktura, kreditnota, kundförskott, kundkredit, refund, dunning, aging, ledger och VAT-bryggor håller ihop utan falsk reskontrasanning.

## varför domänen behövs

Utan en riktig ÄR-domän går det inte att lita på:

- att kundfordran är rätt efter issue, credit, payment, prepayment, overpayment, refund, write-off och senare recovery
- att moms och intäkt bokas rätt när affärshändelserna sker i annan ordning än lycklig väg
- att HUS-, project- och field-billing inte skapar dubbla eller tappade fakturor
- att dunning, påminnelseavgift, dröjsmålsränta och aging bygger på samma reskontrasanning som ledgern
- att cutover, parallel run, revision och support kan bevisa faktisk exponering per kund och per datum

## bindande tvärdomänsunderlag

- `FAKTURAFLODET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör issue, kundreskontra, kredit, betalallokering, kundförlust, refund och export.
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör utgående Peppol BIS Billing 3, offentlig e-faktura, endpoint binding, delivery receipts, outbound credit notes och blockerad PDF-fallback mot offentlig sektor.
- `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör OCR-referenser på kundfaktura, hard eller soft OCR-profil, variabel eller fast längd, checksiffra, customer-facing payment references och provider-bindning till incoming payment matching.
- `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör open items, incoming payments, overpayments, customer advances, PSP-fordringar, factoring, refunds och settlement after issue.
- `BAS_KONTOPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör canonical BAS-kontofamiljer, defaultkonton, control accounts och kontooverridegranser för ÄR.
- `MOMSRUTEKARTA_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör seller-side momsrutor, reverse-charge box mapping, replacement lineage och VAT-facing report truth.
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör voucher generation, seriesattning, kontrollkonton, correction chains, period locks, öppningsbalans och slutlig ledger-truth.
- `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör verifikationsserier, voucher identity, reservationsluckor, owner-flow-serier, correction policy och SIE4-serieparitet.
- `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör redovisningsvaluta, invoice-date conversion, settlement-date FX, rounding och blocked missing rate lineage.
- `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör 0%-anledningar, undantag från momsplikt, reverse-charge-texter, EU/exportreferenser, HUS-grundorsaker och blockerad issuance utan legal basis.

## faser

| Fas | Innehåll | Markering | Beroenden |
| --- | --- | --- | --- |
| Fas 4 | Kundfakturering, kundreskontra, billing triggers, settlement, dunning, bridges och evidence | rewrite / replace / migrate | Fas 1, Fas 3 |

## delfaser

### Delfas 4.1 Customer Masterdata Hardening
- markering: rewrite
- dependencies:
  - repository-grade persistence för ÄR
  - canonical company/customer identity policy
- vad som får köras parallellt:
  - delfas 4.2
  - design av delfas 4.11
- vad som inte får köras parallellt:
  - live merge av go-live-kunder
  - HUS/project-aktivering som förutsätter canonical kundidentitet
- konkreta ändringar:
  - inför `customer_party_identity` med normaliserat organisationsnummer, VAT-nummer och importalias
  - inför `customer_merge_record`, `customer_split_record` och blockerad hard delete
  - inför styrda kontaktroller för `billing`, `delivery`, `collections`, `refund`
  - inför verifierad leveranskanal och explicit kundstatus `active`, `hold_billing`, `hold_delivery`, `credit_review`
- konkreta verifikationer:
  - två kunder med samma organisationsnummer i samma bolag ska blockeras eller ge merge-förslag
  - import av samma kund via nytt `customerNo` ska återanvända samma canonical `customerId`
  - merge ska bevara historiska invoices, open items, allocations och audit trail
- konkreta tester:
  - unit: duplicate org no blocked
  - unit: import alias remaps to canonical customer
  - integration: merge updates dependent objects without changing invoice numbers
  - e2e: merge följt av issue, payment och dunning preview
- konkreta kontroller vi måste kunna utföra:
  - rapport över dublettkandidater per bolag
  - rapport över kunder utan verifierad billing-kanal
  - rapport över mergehistorik med gammal och ny identitet
- exit gate:
  - inga blockerande kunddubbletter kvar i go-live-population
  - alla fakturerbara kunder har verifierad kanal eller tydlig blockerflagga

### Delfas 4.2 Quote / Contract / Billing-Trigger Hardening
- markering: rewrite
- dependencies:
  - delfas 4.1
  - ÄR repository truth
- vad som får köras parallellt:
  - delfas 4.3
  - delfas 4.10 design
- vad som inte får köras parallellt:
  - live contract billing
  - live project-billing
- konkreta ändringar:
  - inför `billing_obligation`, `billing_obligation_line` och `billing_consumption`
  - lås varje issued invoice mot exakt konsumtion av en obligation line eller explicit `manual_ad_hoc`
  - skilj preview/simulation från legal-effect billing source
  - inför residual kvantitet, residual belopp och versionsnyckel per billing trigger
- konkreta verifikationer:
  - samma trigger-rad får inte kunna faktureras två gånger
  - partial invoice ska lämna spårbar residual
  - credit note ska inte återöppna mer residual än policyn tillåter
- konkreta tester:
  - unit: double consumption blocked
  - unit: partial consumption leaves residual
  - integration: invoice from accepted quote then second issue fails
  - e2e: contract plan issue, partial credit, residual update
- konkreta kontroller vi måste kunna utföra:
  - rapport per billing obligation med `planned`, `partially_consumed`, `consumed`, `cancelled`
  - diff mellan project readiness, contract plan och issued invoices
- exit gate:
  - ingen issued invoice saknar trigger eller explicit `manual_ad_hoc`-klassning
  - ingen trigger har dubbelkonsumtion i test, canary eller cutoverdata

### Delfas 4.3 Invoice Timing / Content / Delivery Hardening
- markering: rewrite
- dependencies:
  - delfas 4.2
  - rulepack för legal scenario classification
- vad som får köras parallellt:
  - delfas 4.4
  - delfas 4.9 design
- vad som inte får köras parallellt:
  - live provider dispatch
- konkreta ändringar:
  - separera `issue_date`, `tax_date`, `supply_date`, `delivery_date`, `prepayment_date`, `due_date`
  - separera legal completeness från commercial completeness
  - inför `invoice_delivery_evidence` med provider dispatch id, channel payload och acceptance status
  - inför explicit legal scenario code för export, reverse charge, EU, HUS, momsbefrielse och ändringsfaktura
- konkreta verifikationer:
  - fullständig svensk faktura utan `due_date` ska kunna vara lagligt komplett men policy-ofullständig
  - kreditnota ska bära otvetydig referens till ursprungsfakturan
  - exportfaktura utan exportstöd ska blockeras
  - `delivered` får inte sättas innan dispatch eller provider acceptance
- konkreta tester:
  - unit: due date absent -> legal complete, policy incomplete
  - unit: credit note requires explicit original reference
  - integration: prepare-only delivery remains non-delivered
  - e2e: bounced dispatch leaves invoice outside automated dunning
- konkreta kontroller vi måste kunna utföra:
  - lista över invoices with legal blockers
  - lista över invoices with policy blockers
  - lista över delivered invoices without provider evidence ska vara `0`
- exit gate:
  - legal och commercial completeness visas separat
  - delivery evidence är revisionsbar per faktura och kanal

### Delfas 4.4 Invoice Series And Lifecycle Hardening
- markering: rewrite / migrate
- dependencies:
  - ÄR repository truth
  - delfas 4.3
- vad som får köras parallellt:
  - delfas 4.5
- vad som inte får köras parallellt:
  - imported sequence cutover
  - live multi-node issue
- konkreta ändringar:
  - flytta nummerreservation till sequence-lager i samma transaktion som issue/open-item/journal
  - definiera separata statuskedjor för invoice, delivery, receivable och revenue
  - inför `invoice_status_history` och replay-säker idempotency key
  - inför imported sequence reservation med kollisionsregister
- konkreta verifikationer:
  - 100 samtidiga issue-försök mot samma serie ska ge exakt ett nytt nummer per lyckad faktura
  - imported history ska inte bryta nästa löpnummer
  - reversal ska aldrig återanvända eller radera originalnummer
- konkreta tester:
  - concurrency test för issue numbering
  - replay test across restart
  - integration: imported number then native issue
  - e2e: draft -> issue -> dispute -> resolution -> reversal
- konkreta kontroller vi måste kunna utföra:
  - rapport över serienummerluckor med orsakskod
  - rapport över imported sequence reservations och kollisioner
  - state transition audit per invoice
- exit gate:
  - numrering är deterministisk under replay
  - inga otillåtna state transitions passerar i canary

### Delfas 4.5 Credit-Note / Partial-Credit / Reversal Hardening
- markering: rewrite
- dependencies:
  - delfas 4.4
  - delfas 4.9 design
- vad som får köras parallellt:
  - delfas 4.6
- vad som inte får köras parallellt:
  - skarp HUS-kreditlogik
- konkreta ändringar:
  - inför `credit_adjustment`, `invoice_reversal` och `writeoff_reversal`
  - tillåt kredit av försäljning även när fakturan redan är betald
  - bygg residualkedja till kundkredit eller refund exposure
  - gör reversal till egen händelsekedja, inte overwrite
- konkreta verifikationer:
  - full kredit på redan betald faktura ska skapa kundkredit eller refund exposure
  - partial credit ska uppdatera revenue, VAT, open item och kundkredit deterministiskt
  - writeoff reversal ska kunna återöppna rätt receivable/recovery-path
- konkreta tester:
  - unit: full credit after full payment
  - unit: partial credit after partial payment
  - integration: reversal produces correct ledger/VAT delta
  - e2e: dispute settled by credit and låter refund
- konkreta kontroller vi måste kunna utföra:
  - rapport över credits med originalreferens och residualeffekt
  - rapport över reversals med reason code, approver och impacted objects
- exit gate:
  - alla credit/reversal-scenarier mappar till exakt revenue-, VAT- och receivable-effekt

### Delfas 4.6 Open-Item / Allocation / Prepayment / Overpayment / Refund Hardening
- markering: rewrite
- dependencies:
  - delfas 4.4
  - delfas 4.5
- vad som får köras parallellt:
  - delfas 4.7 design
- vad som inte får köras parallellt:
  - slutlig dunningaktivering
- konkreta ändringar:
  - inför `customer_prepayment`, `customer_credit_balance`, `refund_request`, `refund_execution`, `refund_reconciliation`
  - låt överbetalning mot känd kund skapa kundkredit, inte unmatched receipt
  - bygg refund approval och payout rail reference
  - håll open item och kundkredit som separata men kopplade sanningsobjekt
- konkreta verifikationer:
  - betalning före faktura ska skapa kundförskott utan open item
  - överbetalning mot känd kund ska skapa customer credit balance
  - refund ska minska kundkredit och länka till bankutbetalning och reconciliation
- konkreta tester:
  - unit: prepayment before invoice then application to issued invoice
  - unit: overpayment becomes customer credit
  - integration: refund approval + payout + reconciliation
  - e2e: overpayment -> customer credit -> refund -> zero residual
- konkreta kontroller vi måste kunna utföra:
  - rapport över customer credits per kund
  - rapport över öppna refund requests och utförda refunds
  - rapport över unmatched receipts med känd kund ska vara `0`
- exit gate:
  - open items + customer credits + refunds summerar till verklig nettoexponering mot kund

### Delfas 4.7 Payment-Link / Matching / Unmatched-Receipt Hardening
- markering: harden / rewrite
- dependencies:
  - delfas 4.6
  - delfas 4.3
- vad som får köras parallellt:
  - delfas 4.8
- vad som inte får köras parallellt:
  - live webhook settlement
- konkreta ändringar:
  - payment link ska vara betalinitiering, inte settlement
  - endast verifierat receipt-event får skapa allocation eller settlement
  - inför runtime-unikhet för aktiv länk per invoice och syfte
  - bygg matchningsmotor som väger OCR, belopp, valuta, kundhint, historik och review queue
- konkreta verifikationer:
  - payment link callback utan verifierat receipt ska inte ändra receivable state
  - flera aktiva länkar för samma faktura ska blockeras
  - felmatchad allocation ska kunna reverseras utan dataförlust
- konkreta tester:
  - unit: callback without receipt does not settle invoice
  - unit: active payment-link uniqueness enforced
  - integration: provider callback + bank receipt + allocation tie-out
  - e2e: ambiguous payment goes to review queue
- konkreta kontroller vi måste kunna utföra:
  - rapport över allocations without receipt evidence ska vara `0`
  - rapport över invoices med fler än en aktiv länk ska vara `0`
  - review queue SLA för osäkra matchningar
- exit gate:
  - ingen faktura blir betald utan verifierat settlement-event

### Delfas 4.8 Reminder-Fee / Late-Interest / Dunning / Aging Hardening
- markering: replace
- dependencies:
  - delfas 4.6
  - delfas 4.1
- vad som får köras parallellt:
  - delfas 4.11 design
- vad som inte får köras parallellt:
  - live collections automation
- konkreta ändringar:
  - bygg `dunning_rulepack`, `dunning_charge` och `late_interest_calculation`
  - effective-date-styr referensränta per halvår
  - reminder fee kräver verifierat avtalsstöd
  - B2B-förseningsersättning 450 kr ska vara explicit charge när lagvillkor och policy uppfylls
  - aging ska kunna visas brutto och netto efter kundkrediter och refunds
- konkreta verifikationer:
  - B2C utan avtalad påminnelseavgift ska få 0 kr fee
  - B2B med rätt villkor ska kunna få dröjsmålsränta och 450-kronorsersättning
  - referensräntebyte mellan halvår ska ge deterministiskt nytt ränteutfall
- konkreta tester:
  - unit: reminder fee blocked without prior agreement
  - unit: reference rate changes at half-year boundary
  - integration: dunning charge ties out to ledger and open item
  - e2e: disputed item excluded from dunning and aging
- konkreta kontroller vi måste kunna utföra:
  - dunning preview med legal basis och rulepack version
  - interest calculation trace per invoice
  - aging tie-out mot ledger och customer credits
- exit gate:
  - varje charge bär legal basis, rulepack version och evidence
  - aging tie-out diff mot ledger är `0` i test- och canarybolag

### Delfas 4.9 Revenue / Ledger / VAT Bridge Hardening
- markering: harden / replace
- dependencies:
  - delfas 4.4
  - delfas 4.5
  - delfas 4.6
- vad som får köras parallellt:
  - delfas 4.10 design
- vad som inte får köras parallellt:
  - skarp bokföringsautomation i live
- konkreta ändringar:
  - externalisera account mapping per bolag och regelpack
  - bygg explicita bryggor för prepayment, overpayment, customer credit, refund, bad-debt relief och bad-debt recovery
  - använd legal scenario code i stället för VAT-kodsubstrings
  - varje ÄR-händelse ska ge en journal context och ett VAT evidence trail eller explicit `not_applicable`
- konkreta verifikationer:
  - prepayment receipt ska ge rätt VAT timing enligt redovisningsmetod
  - senare betalning efter kundförlust ska återföra utgående moms i rätt period
  - refund ska boka bort customer credit och bank med korrekt motpartssamband
- konkreta tester:
  - unit: prepayment VAT on receipt
  - unit: låter payment after bad debt recovery
  - integration: foreign-currency invoice with SEK VAT amount
  - e2e: issue -> payment -> partial credit -> refund -> ledger/VAT tie-out
- konkreta kontroller vi måste kunna utföra:
  - ledger tie-out per receivable event type
  - VAT decision trace per invoice/open item
  - account mapping completeness report per company
- exit gate:
  - inga hårdkodade ÄR-konton kvar i domänkoden
  - alla ÄR-händelser har ledger- och VAT-brygga eller explicit `not_applicable`

### Delfas 4.10 Project / Field / HUS Invoice Bridge Hardening
- markering: rewrite
- dependencies:
  - delfas 4.2
  - delfas 4.6
  - delfas 4.9
- vad som får köras parallellt:
  - delfas 4.11
- vad som inte får köras parallellt:
  - live HUS-anspråk eller live project-billing
- konkreta ändringar:
  - project och field ska producera auktoritativa billing obligations
  - ÄR issue för HUS-tagad faktura ska kräva passerad HUS gate
  - HUS customer payment och credit adjustment ska skapa explicita ÄR-events
  - myndighetsutfall efter utbetalning ska kunna skapa recovery/refund/customer-share-justering i ÄR
- konkreta verifikationer:
  - project milestone får bara kunna konsumeras en gång
  - HUS customer payment ska påverka ÄR open item eller customer credit i samma sanningskedja
  - HUS-kredit efter myndighetshändelse ska skapa korrekt residual mot kund
- konkreta tester:
  - unit: project billing obligation consumed once
  - unit: HUS issue blocked until gate passed
  - integration: HUS customer payment updates ÄR exposure
  - e2e: HUS post-authority credit creates correct customer receivable or refund exposure
- konkreta kontroller vi måste kunna utföra:
  - diff mellan HUS customer share och ÄR customer exposure ska vara `0`
  - diff mellan project billing obligations och issued invoices ska vara `0`
- exit gate:
  - inga HUS- eller project-fakturor i canary får sakna bridge-evidence

### Delfas 4.11 Export / Evidence Hardening
- markering: replace / migrate
- dependencies:
  - delfas 4.1-4.10
- vad som får köras parallellt:
  - cutover-planering
- vad som inte får köras parallellt:
  - parallel-run sign-off
- konkreta ändringar:
  - bygg first-class exports för invoices, open items, allocations, unmatched receipts, customer credits, refunds, dunning charges, delivery evidence och aging
  - bygg cutoff-hash, included-ids-listor och ledger/VAT tie-out metadata
  - bygg deterministic export package för revision, inkasso, cutover och parallel run
  - bygg replay- och re-export-kedja som kan återskapa samma hash för samma cutoff
- konkreta verifikationer:
  - samma cutoff ska alltid ge samma export-hash
  - receivable export och ledger tie-out ska ge `0` differens i testbolag
  - parallel-run diff ska kunna peka ut exakt vilken post som avviker och varför
- konkreta tester:
  - unit: deterministic export hash
  - integration: export/import round-trip för cutover artifacts
  - e2e: parallel-run diff between imported legacy ÄR and native ÄR
- konkreta kontroller vi måste kunna utföra:
  - receivable cutoff package med hash, actor, source version och tie-out
  - daily delta export för revision och collections
- exit gate:
  - inga go-live-bolag saknar komplett ÄR evidence package

## dependencies

1. repository-grade ÄR truth måste byggas innan live-kritiska delfaser kan betraktas som färdiga
2. customer masterdata måste vara klar innan live dunning, refunds och HUS/customer-share-automation
3. billing triggers måste vara klara innan project/field/HUS kan anses faktureringsbara
4. open item/customer credit/refund-modellen måste vara klar innan dunning/aging får produktionsstatus
5. revenue/ledger/VAT-bryggan måste vara klar innan export/evidence får signeras som go-live-underlag

## vad som får köras parallellt

- delfas 4.1 och 4.2 efter att repository truth är låst
- delfas 4.3 och 4.4 när event- och repository-kontrakten är låsta
- delfas 4.7 och 4.11 när delfas 4.6 objektmodellen är låst
- designarbete för delfas 4.10 parallellt med delfas 4.9, men inte liveaktivering

## vad som inte får köras parallellt

- live issue-numrering och imported sequence cutover
- live dunning och ofärdig customer credit/refund-modell
- live HUS-automation och ofärdig ÄR-bridge
- parallel-run sign-off och ofärdig export/evidence-modell
- live settlementautomation och prepare-only delivery/payment-link-state

## exit gates

- ÄR-truth ligger i repository-grade persistens, inte i snapshotmutation
- kundreskontran kan visa nettofordran eller nettoskuld mot kund efter alla relevanta ÄR-händelser
- alla kritiska ÄR-scenarier har passerande unit-, integration- och E2E-test
- ledger- och VAT-tie-out är `0` för definierade canarybolag
- delivery, payment och refund bär verklig evidencekedja

## test gates

- samtliga nuvarande `phase5`-ÄR-tester är fortsatt gröna
- nya testsviter finns minst för:
  - prepayment before invoice
  - customer credit balance
  - refund
  - credit after full payment
  - låter payment after bad debt relief
  - invoice reversal
  - writeoff reversal
  - HUS payment backfeed into ÄR
  - project trigger double-consume prevention
  - payment-link callback without settlement
  - reference-rate change between halvår
  - imported invoice sequence collision
- concurrency- och replaytester finns för issue, allocation, refund och export

## ÄR gates

- inga issued invoices utan tydligt billing trigger eller explicit `manual_ad_hoc`
- inga open items utan definierad receivable origin
- inga customer credits utan explicit källa
- inga refunds utan approval chain, payout-reference och bank reconciliation evidence

## timing/content/delivery gates

- legal completeness och commercial completeness är separata
- `delivered` får inte sättas på prepare-only steg
- export-, reverse charge-, EU- och HUS-scenarier använder explicit legal scenario classification
- fakturor i främmande valuta med svensk moms visar momsbelopp i SEK med spårad kurskälla

## numbering/credit/payment gates

- issue-numrering är transaktionell
- kreditnota kan korrigera försäljning även när betalning redan skett
- överbetalning mot känd kund skapar customer credit, inte unmatched receipt
- payment link sätter inte betalstatus utan verifierat settlement-event

## receivable/dunning gates

- aging bygger på open items + customer credits + refunds
- påminnelseavgift kräver avtalad rätt
- dröjsmålsränta använder effective-dated referensränta
- 450-kronorsersättning kan bara genereras när lagvillkoren är uppfyllda
- disputed och held items dunnas inte automatiskt

## revenue-bridge gates

- varje ÄR-händelse har definierad ledger- och VAT-effekt eller explicit `not_applicable`
- senare betalning efter konstaterad kundförlust återför moms i rätt period
- prepayment receipt hanteras enligt vald redovisningsmetod
- refund bokar bort customer credit och bank korrekt

## markeringar: keep / harden / rewrite / replace / migrate / archive / remove

- keep: beteendet är verkligt och ska bevaras
- harden: beteendet finns men kräver hårdare constraints, bevis eller regelstyrning
- rewrite: modellen finns men är fel arkitekterad för go-live
- replace: nuvarande lösning ska ersättas av ny modell
- migrate: data/state måste flyttas från gammal modell till ny
- archive: dokument/spår ska avföras som bindande sanning men sparas som historik
- remove: kod, fält eller dokument ska bort när ersättningen finns
