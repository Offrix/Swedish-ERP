# DOMAIN_06_ANALYSIS

## Scope

- Granskad prompt: `C:\Users\snobb\Desktop\Prompts_inspect\Prompts\DOMÄN 6.md`
- Granskade gamla underlag:
  - `C:\Users\snobb\Desktop\Domankarta_inspect\Domänkarta\Domän 6\DOMAIN_06_ANALYSIS.md`
  - `C:\Users\snobb\Desktop\Domankarta_inspect\Domänkarta\Domän 6\DOMAIN_06_ROADMAP.md`
  - `C:\Users\snobb\Desktop\Domankarta_inspect\Domänkarta\Domän 6\DOMAIN_06_IMPLEMENTATION_LIBRARY.md`
- Granskade paket:
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-tax-account\src\engine.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-tax-account\src\helpers.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-tax-account\src\constants.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-integrations\src\index.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-integrations\src\providers\enable-banking.mjs`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-integrations\src\providers\skatteverket-transport-provider-base.mjs`
- Granskade migrations:
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260321080000_phase4_vat_masterdata_rulepacks.sql`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260321100000_phase4_vat_reporting.sql`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260321160000_phase6_ap_attest_payments.sql`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324130000_phase14_tax_account.sql`
  - `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324240000_phase14_banking_runtime_statement_reconciliation.sql`
- Granskade tester:
  - `tests/unit/phase9-vat-decision-engine.test.mjs`
  - `tests/unit/phase14-tax-account.test.mjs`
  - `tests/unit/phase27-banking-runtime.test.mjs`
  - `tests/integration/phase14-tax-account-api.test.mjs`
  - `tests/integration/phase27-banking-runtime-api.test.mjs`
- Körda tester i denna rebuild-runda:
  - `node --test tests/unit/phase9-vat-decision-engine.test.mjs`
  - `node --test tests/unit/phase14-tax-account.test.mjs`
  - `node --test tests/unit/phase27-banking-runtime.test.mjs`
  - `node --test tests/integration/phase14-tax-account-api.test.mjs`
  - `node --test tests/integration/phase27-banking-runtime-api.test.mjs`
- Officiella källor använda vid verifiering:
  - Skatteverket om momsdeklaration i OSS: [Deklarera och betala moms i One Stop Shop](https://www.skatteverket.se/foretag/moms/deklareramoms/ansokomattredovisadistansforsaljningionestopshoposs/deklareraochbetalamomsionestopshop.4.40cab8f8197edf03e644dee.html)
  - Skatteverket om omräkningskurser och ECB-periodkurser: [Omräkningskurser när redovisningsvalutan är euro](https://www.skatteverket.se/foretag/drivaforetag/euronochskatterna/omrakningskurser/redovisningsperioder.4.2ef18e6a125660db8b080004155.html)
  - ISO 20022 med officiella message definitions för `pain.001` och cash-management-familjen: [ISO 20022 Message Definitions](https://www.iso20022.org/iso-20022-message-definitions?business-domain%5B0%5D=1)

## Verified Reality

- VAT-domänen har verkliga scenarioobjekt, review-kö, decision-livscykel och deklarationsbas.
- Tax-account-domänen har verkliga objekt för events, liabilities, reconciliation items, discrepancy cases och offsets.
- Banking-domänen har verkliga objekt för bankkonton, payment proposals, payment batches, payment orders, statement-import och explicit approval-gate för bankavgifter, räntor och settlements.
- Sekretessidan för bankkonton är verklig:
  - masking av kontodetaljer finns
  - secret refs används
  - vanliga API-svar exponerar inte råa bankdetaljer
- Grundläggande testtäcke finns för intern runtime:
  - VAT-deklarationsbas och periodlås
  - tax-account-import, offsetförslag och discrepancy cases
  - banking statement approval och statement-driven posting

## Partial Reality

- VAT scenario- och boxmotorn är verklig men inte full svensk sanning:
  - vissa scenarier blandas för brett
  - IOSS ligger i fel modellgren
  - ECB-kursmodell för OSS/IOSS är inte canonical
- Tax-account-mirror är verklig internt men inte verkligt myndighetssynkad.
- Banking-livscykeln är verklig internt men inte bankrail-riktig:
  - custom JSON/XML/CSV markeras som open banking / `pain.001` / Bankgiro
  - cut-off, bankdag och partial settlement är för grunda
- Statement import är verklig men identitetsmodellen är för tunn för go-live.
- Cross-domain datum- och FX-styrning saknar gemensam styrmodell.

## Legacy

- Gamla VAT-/banking-runbooks beskriver flera paths som om de vore bindande eller mer färdiga än runtime.
- Tidigare `FINAL`-dokument och äldre runbooks om VAT/tax-account/banking är inte bindande och ska inte användas som sanningskälla.

## Dead Code

- Ingen stor död kärnkod verifierades i de centrala VAT-, skattekonto- eller bankingfilerna.
- Det farliga i denna domän är inte död kod utan felklassad live-illusion och semantisk drift mellan namn, docs, runtime och schema.

## Misleading / False Completeness

### D6-001
- severity: critical
- kategori: VAT period/frequency governance
- exakt problem: Runtime saknar first-class modell för momsfrekvens månad/kvartal/år och saknar byte-/historikgovernance. Repo:t har periodlås och declaration runs, men inte svensk frekvenssanning.
- varför det är farligt: Fel frekvens ger fel perioder, fel deklarationsomfång, fel lås och fel historik.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: declaration runs `1031-1184`, period locks `908-1023`, ingen frekvensmodell hittad i VAT-domänen
- rekommenderad riktning: bygg `VatFrequencyElection`, `VatFrequencyChangeRequest`, `VatPeriodProfile` och `VatPeriodLockScope` som styr all periodisering
- status: rewrite

### D6-002
- severity: critical
- kategori: Skatteverket transport
- exakt problem: VAT-provider baseline antyder officiell API/XML-path, men runtime producerar bara prepared metadata.
- varför det är farligt: Operatören kan tro att momsrapportering går live fast ingen riktig dispatch, export-artefakt eller receiptkedja finns.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `110-133`
- rekommenderad riktning: klassificera nuvarande path som `prepared_only` och bygg därefter verklig `manual_controlled` eller riktig adapter
- status: replace

### D6-003
- severity: critical
- kategori: Tax-account sync
- exakt problem: `prepareTaxAccountSync` går via Enable Banking open-banking-provider.
- varför det är farligt: Skattekonto är inte open banking. Detta är falsk realism och fel domängräns.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-integrations\src\index.mjs`
- radreferens om möjligt: `877-880`
- rekommenderad riktning: ta bort tax-account från open-banking-profilen och bygg separat skattekonto-importmodell
- status: replace

### D6-004
- severity: critical
- kategori: Payment rails
- exakt problem: Rails med namn `open_banking`, `iso20022_file` och `bankgiro_file` genererar custom JSON, custom XML och enkel CSV, inte riktiga railformat.
- varför det är farligt: Felaktig rail-klassning gör att export kan godkännas eller säljas som bankredo fast den inte uppfyller standard eller leverantörskrav.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
- radreferens om möjligt: rail-koder `38-40`, export `2239-2287`
- rekommenderad riktning: märk nuvarande format som `custom_internal` och bygg verkliga railadapters separat
- status: replace

### D6-005
- severity: critical
- kategori: Statement identity / replay safety
- exakt problem: Statement identity key består av `companyId + bankAccountId + externalReference + bookingDate + amount`.
- varför det är farligt: Dubbletter, kolliderande radreferenser eller flera statementrader med samma värden kan felaktigt slå ihop eller dubbelverka.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
- radreferens om möjligt: `2695-2702`
- rekommenderad riktning: bygg `BankStatementLineIdentity` med filhash, line sequence, entry ref, structured remittance och provider source id
- status: rewrite

## VAT Code / Scenario Findings

### D6-006
- severity: high
- kategori: VAT code model
- exakt problem: `VAT_SE_EXEMPT` används som bred samlingskod för exempt eller zero-rated och mappar till ruta `42`.
- varför det är farligt: Undantag, export, utanför scope och 0 %-behandling blandas och riskerar fel box och fel legal förklaring.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `136-177`
- rekommenderad riktning: dela upp exempt, zero-rated export, outside scope och ändra no-VAT-scenarier i separata canonical scenarier
- status: harden

### D6-007
- severity: high
- kategori: IOSS / scenario derivation
- exakt problem: IOSS triggas under allmän EU B2C-gren i stället för explicit importdistansförsäljning.
- varför det är farligt: Vanlig EU B2C kan felaktigt klassas som IOSS eller tvärtom.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `2007-2014`
- rekommenderad riktning: skilj IOSS från EU B2C-OSS och kräv importflagga, goods-only, consignmentsgräns och tydlig rapporteringskanal
- status: rewrite

### D6-008
- severity: high
- kategori: Manual review compatibility
- exakt problem: Manuell resolution i VAT review queue kan välja stödd kod utan att använda samma kompatibilitetskontroll som ordinarie derivation.
- varför det är farligt: Fel VAT-kod kan forceras in med legitim auditspårning.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: resolution `691-709`, kompatibilitetskontroll `2496-2515`
- rekommenderad riktning: tvinga review-resolution genom samma scenario- och compatibility-motor och returnera 409 vid inkompatibilitet
- status: harden

## VAT Period / Frequency Governance / Lock Findings

### D6-009
- severity: high
- kategori: VAT period unlock
- exakt problem: Upplåsning av VAT-period kräver bara reason code och tar inte hänsyn till myndighetsreceipt, supersede chain eller signerad historik.
- varför det är farligt: Historik kan öppnas upp utan riktig correctionpolicy.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `991-1023`
- rekommenderad riktning: bind unlock till explicit approval, reason, evidence, receipt status och ny correctionkedja
- status: harden

## VAT Review Queue Findings

- VAT review queue är verklig.
- VAT review queue är inte tillräcklig för go-live så länge D6-008 kvarstår.
- Review queue ska behållas men härdas, inte raderas.

## VAT Declaration / Periodic Statement / Correction Findings

### D6-010
- severity: high
- kategori: Replacement declaration
- exakt problem: `previousSubmissionId` och `correctionReason` finns, men repo:t saknar hård immutable supersede-modell för full ersättningsdeklaration.
- varför det är farligt: Historik kan semantiskt rättas utan att full ersättningskedja, payload hash och authority receipt är first-class.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `1031-1083`, `1130-1184`, beslut markeras declared `3097-3098`
- rekommenderad riktning: bygg `VatSubmission`, `VatSubmissionVersion` och `VatSubmissionSupersedeLink` som immutable filing truth
- status: rewrite

## Skatteverket Transport Findings

- Nuvarande runtimeklassning måste nedgraderas från live-lik till `prepared_only`.
- Om riktig API-väg saknas ska momsflödet byggas som `manual_controlled` med export-artefakt, signeringsbevis, receipt capture och correction chain.

## VAT Clearing / Reversal Findings

### D6-011
- severity: medium
- kategori: VAT clearing
- exakt problem: VAT-clearingen är tekniskt bra men skyddar inte mot fel upstream-sanning i period, boxar eller filing chain.
- varför det är farligt: Ren ledger-clearing kan dölja att deklarationssidan fortfarande är fel.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-ledger\src\index.mjs`
- radreferens om möjligt: `1511-1615`
- rekommenderad riktning: lås clearing till finaliserad VAT submission-version och godkänd period/frekvenssanning
- status: harden

## Reverse Charge / Import / Export / EU / OSS / IOSS Findings

### D6-012
- severity: high
- kategori: OSS/IOSS FX
- exakt problem: När valuta inte är EUR kräver runtime att `ecb_exchange_rate_to_eur` skickas in från utsidan.
- varför det är farligt: Plattformen äger inte sin egen regelstyrda kurskälla och kan därför få olika kurslogik per indataflöde.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `3146-3168`
- rekommenderad riktning: bygg canonical `FxSource` och `FxRateLock` för OSS/IOSS med explicit periodslutskurs och correction chain
- status: rewrite

## Tax Account Event / Mirror Findings

### D6-013
- severity: critical
- kategori: Expected liabilities
- exakt problem: Tax-account kan spegla och reconcila events, men repo:t visar inte tillräckligt stark emission av expected liabilities från källdomänerna.
- varför det är farligt: Mirror och offset kan verka korrekta fast skuldsidan kommer från seedad eller indirekt input i stället för auktoritativ källdomän.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-tax-account\src\engine.mjs`
- radreferens om möjligt: reconciliation/expected-liability-flöden `413-529`, `750-850`
- rekommenderad riktning: bygg explicita liability-emission events från VAT, payroll och HUS till tax-account
- status: migrate

## Tax Account Reconciliation / Difference Case / Correction Findings

### D6-014
- severity: high
- kategori: Reconciliation matching
- exakt problem: Matching kan falla tillbaka till amount-only när source object och period key inte träffar.
- varför det är farligt: Fel händelse kan auto-matchas mot fel liability med samma belopp.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-tax-account\src\engine.mjs`
- radreferens om möjligt: `1320-1337`
- rekommenderad riktning: amount-only ska ge ambiguity/review, aldrig auto-match i production
- status: rewrite

## Tax Account Offset / Priority / Refund Findings

### D6-015
- severity: high
- kategori: Offset lifecycle
- exakt problem: Offset-statusar är i praktiken bara `approved`. Reversal- och supersede-kedja saknas.
- varför det är farligt: Felaktig kvittning kan inte rättas som first-class ekonomisk händelse.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-tax-account\src\constants.mjs`
- radreferens om möjligt: `7-8`
- rekommenderad riktning: bygg `TaxAccountOffsetReversal` och full offset-state machine
- status: rewrite

## Bank Account / Provider / Secret Findings

### D6-016
- severity: medium
- kategori: Bank account secrets
- exakt problem: Maskning och secret separation är bra, men provider capability claims översäljer verklig railnivå.
- varför det är farligt: Säker hantering av secrets räddar inte om operatören tror att en rail är live-fast den bara är prepared-only.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-integrations\src\providers\enable-banking.mjs`
- radreferens om möjligt: `12-24`
- rekommenderad riktning: bygg `ProviderCapabilityManifest` som skiljer security posture från legal/live readiness
- status: harden

## Payment Proposal / Batch / Order / SoD Findings

### D6-017
- severity: critical
- kategori: SoD
- exakt problem: Payment proposal/batch/order har statusar och actor-fält men ingen hård domänspärr som förhindrar att samma aktör skapar, godkänner, exporterar och signerar när policy kräver separation.
- varför det är farligt: Betalningskedjan saknar verklig duty segregation.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
- radreferens om möjligt: proposal/batch/order livscykel `1230-1779`, state transition map `2659-2672`
- rekommenderad riktning: bygg `PaymentApprovalPolicy`, `DutySeparationRule` och tekniskt blockerande transitions
- status: rewrite

## Payment Lifecycle / Cut-Off / Settlement Findings

### D6-018
- severity: critical
- kategori: Bank lifecycle realism
- exakt problem: Payment-livscykeln använder statusar som `accepted_by_bank`, `partially_executed` och `settled`, men saknar canonical execution window, bankdag, cut-off och line-level partial settlement-modell.
- varför det är farligt: Fel datum och fel residualer kan uppstå i skuld och likviditet trots gröna interna tester.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
- radreferens om möjligt: statuser `12-15`, transitions `1578-1614`, aggregator `1947-1950`
- rekommenderad riktning: bygg `PaymentExecutionWindow`, `PaymentExecutionEvent`, `PaymentSettlementEvent` och `PaymentReturnEvent`
- status: rewrite

## Statement Import / Reference Matching / Bank Reconciliation Findings

### D6-019
- severity: critical
- kategori: Schema/runtime drift
- exakt problem: Runtime använder statement categories som `bank_fee`, `interest_income`, `interest_expense`, `settlement`, men DB-check constraint tillåter bara `generic` och `tax_account`.
- varför det är farligt: Runtime och persistens bär olika sanning och samma state går inte att lita på efter persistens eller migration.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\db\migrations\20260324240000_phase14_banking_runtime_statement_reconciliation.sql`
- radreferens om möjligt: `26-49`
- rekommenderad riktning: harmonisera enum- och statusmängder mellan runtime, DB, tester och runbooks innan fler features byggs
- status: rewrite

### D6-020
- severity: high
- kategori: Structured references
- exakt problem: OCR, BG/PG, EndToEndId och camt entry refs är inte first-class i statement-eventmodellen.
- varför det är farligt: Deterministisk matchning mellan bank, ÄR, AP och payout blir omöjlig eller heuristisk.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
- radreferens om möjligt: normalisering `2865-2881`, identitet `2695-2702`
- rekommenderad riktning: bygg `StructuredPaymentReference` och `BankStatementLineIdentity`
- status: rewrite

## Fee / Interest / Settlement / Refund / Bridge Findings

### D6-021
- severity: medium
- kategori: Statement posting bridge
- exakt problem: Runtime har explicit approval-gate för bank fee, interest och settlement, men eftersom DB-kontraktet driver isär blir bridgekedjan inte fullt replay- och persistenssäker.
- varför det är farligt: Godkänd bankrad kan fungera i minne men inte vara samma sak på disk eller efter migration.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-banking\src\index.mjs`
- radreferens om möjligt: `2715-2863`
- rekommenderad riktning: lås statement categories, match statuses och journal links i både runtime och schema
- status: harden

## FX / Exchange Rate / Date Control Findings

### D6-022
- severity: critical
- kategori: Cross-domain date model
- exakt problem: VAT använder `tax_date`/`prepayment_date`/`invoice_date`, banking använder `bookingDate`, tax-account använder `eventDate`/`postingDate`, men ingen gemensam controlling-date-policy finns.
- varför det är farligt: Samma affärshändelse kan få olika periodisering och olika rapporteringsutfall i moms, skattekonto, bank och ledger.
- exakt filepath: `C:\Users\snobb\Desktop\Swedish ERP\packages\domain-vat\src\index.mjs`
- radreferens om möjligt: `2490-2497`; tax-account `helpers.mjs:308-315`; banking `2865-2881`
- rekommenderad riktning: bygg `DateControlProfile` och `CrossDomainDateTrace` som canonical styrning
- status: rewrite

## Transport / API / File / Manual Runtime Status Matrix

| capability | claimed runtime mode | actual runtime mode | proof in code/tests | blocker |
|---|---|---|---|---|
| VAT declaration transport | Skatteverket API med XML fallback | prepared_only | `domain-vat/src/index.mjs:110-133`, `skatteverket-transport-provider-base.mjs:44-76` | D6-002 |
| VAT periodic statement transport | provider-baseline-styrd myndighetstransport | prepared_only | `domain-vat/src/index.mjs:1130-1184`, provider base `44-76` | D6-002 |
| Tax-account sync | open banking-lik sync | fake_live / wrong_domain | `domain-integrations/src/index.mjs:877-880`, `enable-banking.mjs:24-29`, `52-61` | D6-003 |
| Open banking statement sync | provider-sync | partial_reality | `enable-banking.mjs:31-40`, runtime import `domain-banking/src/index.mjs:435-545` | D6-005 |
| ISO 20022 export | `pain.001` | custom_internal_xml | `domain-banking/src/index.mjs:2265-2276` | D6-004 |
| Bankgiro export | Bankgiro fil | custom_internal_csv | `domain-banking/src/index.mjs:2277-2284` | D6-004 |
| Statement file import | `camt.053` | named channel without parser-grade evidence | `domain-banking/src/index.mjs:40`, `80-82` | D6-020 |
| Statement posting of fees/interest | explicit approval bridge | partial_reality | `domain-banking/src/index.mjs:2715-2863`, runtime tests green | D6-019 |

## Concrete VAT-Tax-Banking Verification Matrix

| capability | claimed rule or control | actual runtime path | proof in code/tests | official source used where needed | status | blocker |
|---|---|---|---|---|---|---|
| VAT decision engine | stödda scenarier klassificeras | scenario-derivation finns men har review- och IOSS-gap | `domain-vat/src/index.mjs:1990-2035`, unit test green | Skatteverket OSS/IOSS, momsrutor | partial reality | D6-007, D6-008, D6-012 |
| Momsrutor | rätt boxar | många boxar finns men exempt/zero-rated blandas | `domain-vat/src/index.mjs:136-177` | Skatteverket momsdeklaration | partial reality | D6-006 |
| Momsfrekvens | månad/kvartal/år styr perioder | ingen first-class frekvensmodell | sökning i VAT-domänen, declaration code `1031-1184` | Skatteverket regler om deklarationsperioder | misleading | D6-001 |
| Ersättningsdeklaration | ny full deklaration för samma period | `previousSubmissionId` finns men immutable supersede saknas | `domain-vat/src/index.mjs:1031-1184` | Skatteverket rätta momsdeklaration | partial reality | D6-010 |
| VAT transport | live API/XML/manual path | prepared_only metadata | `domain-vat/src/index.mjs:110-133` | Skatteverket e-tjänst / filing reality | misleading | D6-002 |
| Tax-account mirror | deterministic mirror | intern mirror ja, authority sync nej | `domain-tax-account/src/engine.mjs:1093-1208`, integration test green | Skatteverket skattekonto | partial reality | D6-003, D6-013 |
| Offset priority | korrekt prioritet och correction | offset suggestions finns, reversal saknas | `engine.mjs:1268-1318`, `constants.mjs:7-8` | Skatteverket skattekonto | partial reality | D6-015 |
| Bank rails | riktiga rails | custom envelopes med officiella namn | `domain-banking/src/index.mjs:2239-2287` | ISO 20022, Bankgiro | misleading | D6-004 |
| SoD | tekniskt tvingande | statusyta utan hård segregation | `domain-banking/src/index.mjs:1230-1779`, `2659-2672` | bankpraxis / säkerhetskrav | misleading | D6-017 |
| Statement replay safety | dubbletter dubbelverkar inte | identity key för tunn | `domain-banking/src/index.mjs:2695-2702` | rail- och statement-format kräver stark identitet | partial reality | D6-005, D6-020 |
| Cross-domain dates | samma controlling-date-policy | olika lokala datumregler | `domain-vat/src/index.mjs:2490-2497`, `tax-account/helpers.mjs:308-315`, `domain-banking/src/index.mjs:2865-2881` | Skatteverket och bankstandarder | misleading | D6-022 |

## Critical Findings

- D6-001 momsfrekvensgovernance saknas
- D6-002 VAT-transport är prepared-only
- D6-003 skattekontosync är fake-live via open banking
- D6-004 payment rails använder falska formatnamn
- D6-005 statement identity är för tunn
- D6-013 expected liabilities är inte tillräckligt källdomänsäkra
- D6-017 SoD i betalningskedjan är inte tekniskt tvingande
- D6-018 cut-off/bankdag/partial settlement är inte riktigt modellerade
- D6-019 schema/runtime drift i banking statement-kärnan
- D6-022 gemensam datum- och FX-governance saknas

## High Findings

- D6-006 bred samlingskod för exempt/zero-rated
- D6-007 IOSS ligger i fel modellgren
- D6-008 review queue kan kringgå compatibility
- D6-010 ersättningsdeklaration är ofullständig
- D6-012 OSS/IOSS-kursmodell är inte canonical
- D6-014 tax-account-reconciliation kan falla tillbaka till beloppsmatchning
- D6-015 offset reversal saknas
- D6-020 strukturerade betalningsreferenser saknas som first-class modell

## Medium Findings

- D6-009 VAT unlock är för tillåtande
- D6-011 VAT-clearing behöver hårdare upstream-gates
- D6-016 provider claims blandar security posture och live-nivå
- D6-021 statement posting-bridge är bra men inte persistenssäker

## Low Findings

- Inga rena low-fynd med egen go-live-effekt verifierades i denna rebuild-runda.

## Cross-Domain Blockers

- VAT -> tax-account:
  - expected liabilities emitteras inte tillräckligt strikt från VAT till tax-account
- VAT -> ledger:
  - clearing kan se korrekt ut även när period/frekvens/filing är fel
- banking -> AP/ÄR/payroll:
  - svag reference model gör att korrekt residual och settlement inte kan litas på
- integrations -> VAT/banking/tax-account:
  - generiska prepared-only providers låtsas vara verkliga transportskikt
- ledger -> VAT/banking/tax-account:
  - ingen gemensam controlling-date- och FX-policy

## Go-Live Blockers

- Svensk momsfrekvens och periodgovernance måste byggas innan moms kan märkas go-live.
- VAT filing måste klassas om till `manual_controlled` eller få verklig adapter innan momsrapportering kan kallas verklig.
- Tax-account-sync måste tas bort från open banking och ersättas av riktig skattekonto-importmodell.
- Payment rails måste få verkliga railadapters eller märkas som interna exportartefakter utan live-anspråk.
- SoD måste bli tekniskt blockerande i payment-kedjan.
- Statement identity och structured references måste byggas om innan bankimport kan märkas replay-säker.
- Schema/runtime drift i banking måste bort innan persistent runtime kan litas på.
- Gemensam datum- och FX-modell måste införas för VAT/bank/tax-account/ledger.

## Repo Reality Vs Intended VAT-Tax-Banking Model

| område | intended model | actual repo reality | klassning |
|---|---|---|---|
| VAT decision truth | full svensk scenario-, box- och filing-sanning | bra intern motor, men inte full svensk governance | partial reality |
| VAT transport | verklig myndighetstransport | prepared-only metadata | misleading |
| VAT correction | immutable ersättningskedja | `previousSubmissionId` utan full supersede-model | partial reality |
| Tax-account mirror | myndighetsnära spegel | stark intern modell men fake-live sync och svag liability-emission | partial reality |
| Payment rails | riktiga bankrails | custom payloads med officiella namn | misleading |
| Statement import | replay-säker bankradssanning | tunn identity model och schema/runtime drift | partial reality |
| Payment SoD | tekniskt tvingande segregation | aktörskedja kan dokumenteras men inte blockeras tillräckligt | misleading |
| Cross-domain date/FX | canonical styrning | lokala regler per domän | partial reality |
