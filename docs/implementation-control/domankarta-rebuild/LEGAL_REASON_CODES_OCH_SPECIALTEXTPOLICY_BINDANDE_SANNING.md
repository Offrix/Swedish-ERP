# LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för legal reason codes, mandatory special texts, references och display policy på dokument, structured exports, claims och ändra legala artefakter där lagkrav eller myndighetskrav styr exakt text.

## Syfte

Detta dokument ska låsa:
- vilka legal reason codes som får användas
- vilka scenarier som kraver synlig text eller strukturerad kod
- vilka dokument- och exportprofiler som måste baras av reason code
- vilka scenarier som ska blockeras om text eller kod saknas
- hur specialtexter kopplas till moms, HUS, grön teknik och correctionkedjor

## Omfattning

Detta dokument omfattar:
- seller-side invoice texts
- credit-note references
- legal 0%-anledningar
- reverse charge texts
- EU/export references
- HUS/ROT/RUT och grön teknik specialtexter
- structured reason-code payloads till Peppol eller ändra myndighets-/partnerformat när de krävs

Detta dokument omfattar inte:
- leverantörers layout på inkommande fakturor
- den underliggande bokföringen, som ägs av respektive owner flow

## Absoluta principer

- 0 % moms får aldrig visas utan explicit legal reason code och renderad eller serialiserad laglig förklaring
- omvänd betalningsskyldighet får aldrig utfardas utan exakt specialtext och relevant identitet
- HUS och grön teknik får aldrig utfardas utan claim-bara specialuppgifter
- legal text får aldrig hardkodas lokalt i UI utan bindning till canonical reason-code policy
- structured exports får aldrig tappa reason-code-lineage som behovs för mottagare eller myndighet

## Bindande dokumenthierarki för legal reason codes och specialtextpolicy

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- `DOMAIN_04_ROADMAP.md`
- `DOMAIN_04_IMPLEMENTATION_LIBRARY.md`
- `DOMAIN_11_ROADMAP.md`
- `DOMAIN_11_IMPLEMENTATION_LIBRARY.md`
- detta dokument

Detta dokument lutar på:
- `FAKTURAFLODET_BINDANDE_SANNING.md`
- `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md`
- `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md`
- `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md`
- `MOMSFLODET_BINDANDE_SANNING.md`

## Kanoniska objekt

- `LegalReasonCodeDefinition`
- `SpecialTextPolicy`
- `RenderedLegalTextReceipt`
- `StructuredReasonPayload`
- `ReasonCodeBlocker`
- `ReasonCodeLineageReceipt`

## Kanoniska state machines

- `LegalReasonCodeDefinition: draft -> approved -> active | superseded | retired`
- `SpecialTextPolicy: draft -> approved -> active | superseded`
- `RenderedLegalTextReceipt: draft -> rendered -> issued | blocked`
- `ReasonCodeBlocker: open -> resolved | waived`

## Kanoniska commands

- `PublishLegalReasonCodeDefinition`
- `PublishSpecialTextPolicy`
- `RenderLegalTextReceipt`
- `BuildStructuredReasonPayload`
- `BlockMissingLegalReasonCode`
- `BlockMissingSpecialText`

## Kanoniska events

- `LegalReasonCodeDefinitionPublished`
- `SpecialTextPolicyPublished`
- `LegalTextReceiptRendered`
- `StructuredReasonPayloadBuilt`
- `MissingLegalReasonCodeBlocked`
- `MissingSpecialTextBlocked`

## Kanoniska route-familjer

- `POST /v1/legal-reason-codes`
- `POST /v1/special-text-policies`
- `POST /v1/legal-text/render`
- `POST /v1/legal-text/structured-payloads`
- `POST /v1/legal-text/blockers`

## Kanoniska permissions och review boundaries

- `finance.legal_text.read`
- `finance.legal_text.publish`
- `finance.legal_text.override`
- `finance.legal_text.audit`

Support och backoffice får inte:
- redigera legal text på utfardad faktura eller claim
- ersätta canonical reason code med fri text
- avmarkera blocker för missing legal reason utan explicit finance/tax approval

## Nummer-, serie-, referens- och identitetsregler

- varje reason code ska ha stabil identitet `LR-NNN`
- varje rendered receipt ska ha `LTXT-NNN`
- varje structured payload ska peka på owner document id, reason code id och policy id
- credit note måste alltid referera originaldokument när lagkrav gäller

## Valuta-, avrundnings- och omräkningsregler

- reason-code-policy äger inte valutaberakning men får blockera issuance om svensk moms i utlandsk valuta saknar SEK-momsbelopp enligt fakturareglerna
- rendered special text måste kunna inkludera belopp och procentsats från owner flow utan att mutera dess bokföring

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig rendera ny legal text för redan utfardat dokument utan att exakt samma reason code och policyversion används
- correction får skapa ny reason-code-lineage bara via kredit/omfaktura eller claim-correction flow
- migration måste bevara source document reason text eller markera blocker om legal basis inte kan visas

## Huvudflödet

1. owner flow klassificerar scenario
2. legal reason code resolves
3. special text policy resolves
4. dokument eller payload renderas
5. blockerregler kor för obligatoriska identiteter, texter och referenser
6. issued artifact sparar lineage till reason code, text och owner scenario

## Bindande scenarioaxlar

- VAT basis: `standard_rate`, `zero_rate`, `exempt`, `reverse_charge`, `outside_scope`
- geography: `sweden`, `eu`, `third_country`
- claim overlay: `none`, `rot`, `rut`, `green_tech`
- document class: `invoice`, `credit_note`, `peppol_payload`, `claim_payload`
- correction state: `original`, `replacement`, `credit`, `claim_correction`

## Bindande policykartor

- `LR-POL-001 vat_zero_and_exempt_reason_codes`
- `LR-POL-002 reverse_charge_text_policy`
- `LR-POL-003 EU_export_reference_policy`
- `LR-POL-004 HUS_and_green_tech_special_text_policy`
- `LR-POL-005 credit_and_replacement_reference_policy`

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `LR-P0001` domestic exempt invoice -> reason code + rendered text required, no extra GL line
- `LR-P0002` domestic reverse charge invoice -> reason code + text `Omvänd betalningsskyldighet`, no seller VAT line
- `LR-P0003` EU goods sale without Swedish VAT -> buyer VAT id + reason code + rendered text required
- `LR-P0004` EU services sale without Swedish VAT -> buyer VAT id + reason code + rendered text required
- `LR-P0005` export outside EU -> export reason code + rendered text required
- `LR-P0006` small-turnover exemption -> exemption reason code + rendered text required
- `LR-P0007` HUS invoice -> HUS reason code + mandatory identity text fields required
- `LR-P0008` green-tech invoice -> green-tech reason code + mandatory identity and property fields required
- `LR-P0009` credit note -> original invoice reference required
- `LR-P0010` missing or unsupported legal reason -> blocked, no issue

## Bindande rapport-, export- och myndighetsmappning

- invoice PDF, HTML, print och Peppol payload ska visa eller serialisera samma legal basis
- HUS- och grön-teknik-claim payload ska kunna byggas direkt från reason-code-lineage
- audit ska visa exakt vilken legal basis som styrde att svensk moms inte togs ut

## Bindande scenariofamilj till proof-ledger och rapportspar

- `LR-A001` exempt domestic invoice -> `LR-P0001`
- `LR-A002` domestic reverse charge invoice -> `LR-P0002`
- `LR-A003` EU goods invoice -> `LR-P0003`
- `LR-A004` EU services invoice -> `LR-P0004`
- `LR-A005` export invoice -> `LR-P0005`
- `LR-A006` small-turnover invoice -> `LR-P0006`
- `LR-B001` ROT invoice -> `LR-P0007`
- `LR-B002` RUT invoice -> `LR-P0007`
- `LR-B003` green-tech invoice -> `LR-P0008`
- `LR-C001` credit note -> `LR-P0009`
- `LR-Z001` missing legal basis -> `LR-P0010`

## Tvingande dokument- eller indataregler

- zero/exempt/reverse-charge scenario måste ange legal basis id
- reverse charge måste ange relevant buyer identity enligt scenario, exempelvis VAT-nummer där lagkrav finns
- HUS måste ange personnummer, namn, arbetsplats/tjänststalle, arbetskostnad och fastighets-/boendeidentitet enligt scenario
- grön teknik måste ange kundidentitet, bostadsidentitet och split mellan arbets- och material/övriga delar enligt policy
- credit note måste ange originalfakturareferens

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `LR-001` undantag_fran_momsplikt
- `LR-002` momsbefrielse_liten_omsattning_18_4_ML
- `LR-003` omvänd_betalningsskyldighet_inrikes
- `LR-004` omvänd_betalningsskyldighet_bygg
- `LR-005` unionsintern_varuforsäljning
- `LR-006` unionsintern_tjänst_huvudregeln
- `LR-007` export_utanfor_EU
- `LR-008` HUS_ROT
- `LR-009` HUS_RUT
- `LR-010` grön_teknik
- `LR-011` kreditnota_hanvisning_till_ursprungsfaktura

## Bindande faltspec eller inputspec per profil

- reason code definition: `reason_code`, `legal_basis`, `display_text_sv`, `display_text_en?`, `structured_code?`
- special text policy: `document_class`, `required_fields[]`, `render_template_id`
- rendered receipt: `owner_document_id`, `reason_code`, `rendered_text`, `field_values[]`
- structured payload: `owner_document_id`, `reason_code`, `payload_fields[]`

## Scenariofamiljer som hela systemet måste tacka

- 0 % due to exemption
- 0 % due to small-turnover exemption
- domestic reverse charge
- EU goods and EU services without Swedish VAT
- export outside EU
- HUS ROT
- HUS RUT
- green tech
- credit notes and replacements
- unsupported legal basis

## Scenarioregler per familj

- 0 % invoice utan legal reason code är blockerad
- reverse charge utan text och relevanta buyer identifiers är blockerad
- HUS/grön teknik utan obligatoriska identitetsfalt är blockerad
- credit note utan originalreferens är blockerad
- structured payload får inte ha annan legal basis an rendered document

## Blockerande valideringar

- issue blocked om `reason_code` saknas i zero/exempt/reverse-charge scenario
- issue blocked om mandatory special text saknas
- issue blocked om HUS/grön-teknik-identiteter saknas
- issue blocked om structured payload och rendered text inte delar samma reason-code-lineage

## Rapport- och exportkonsekvenser

- invoice drilldown ska visa legal reason code och renderad textversion
- Peppol/export receipts ska visa vilken structured code eller vilken fri text som skickades
- audit ska kunna filtrera alla dokument med 0 % eller specialregim per reason code

## Förbjudna förenklingar

- fri text i stallet för canonical reason code
- generisk text `0% moms` utan legal förklaring
- samma reason code för HUS och grön teknik
- seller document utan reverse-charge-text i scenario där det krävs

## Fler bindande proof-ledger-regler för specialfall

- `LR-P0011` replacement invoice after wrong legal basis must reverse prior text lineage and issue new reason-code-lineage
- `LR-P0012` mixed ROT and RUT on same invoice requires separate rendered sections and separate claim-lineage
- `LR-P0013` public e-invoice payload must preserve legal basis in structured export if profile supports it

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- reason-code-policy skapar inte egen monetar effekt men är blockerande för invoice issue, claim build och credit-note issuance
- `LR-P0007-P0008` öppnar claim-capable state i HUS eller grön-teknikflow
- `LR-P0010` skapar `ReasonCodeBlocker`

## Bindande verifikations-, serie- och exportregler

- legal reason codes får aldrig ensamma skapa verifikation
- owner-flow-serien bevaras oforandrad; detta dokument styr bara text- och payloadlineage
- exports måste serialisera same reason code lineage som source document

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- VAT basis x geography
- document class x structured payload support
- original x replacement x credit
- HUS/grön overlay x payment/claim state

## Bindande fixture-klasser för legal reason codes och specialtextpolicy

- `LR-FXT-001` domestic exempt and reverse charge
- `LR-FXT-002` EU and export
- `LR-FXT-003` HUS and green tech
- `LR-FXT-004` credit notes and replacements
- `LR-FXT-005` missing legal basis blockers

## Bindande expected outcome-format per scenario

- `scenario_id`
- `fixture_class`
- `reason_code`
- `expected_rendered_text`
- `expected_required_fields[]`
- `expected_structured_payload_fields[]`
- `expected_blocker_or_success`

## Bindande canonical verifikationsseriepolicy

- legal reason code policy får aldrig skapa egen serie
- owner-flow-serie och verifikation styrs av respektive monetart flow
- missing legal reason blockerar issue innan owner flow får skapa slutlig voucher

## Bindande expected outcome per central scenariofamilj

### `LR-A002`

- fixture: `LR-FXT-001`
- expected:
  - reason code `LR-003` eller `LR-004` beroende på reverse-charge-fall
  - rendered text `Omvänd betalningsskyldighet` eller policygodkand engelsk parallelltext
  - relevant buyer identifier present
  - issue allowed only if all blockers pass

### `LR-B001`

- fixture: `LR-FXT-003`
- expected:
  - reason code `LR-008`
  - HUS-specific identity fields populated
  - invoice and claim payload share same lineage

### `LR-Z001`

- fixture: `LR-FXT-005`
- expected:
  - no issue
  - `ReasonCodeBlocker`
  - audit trail shows missing legal basis

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `LR-A001` -> `LR-P0001` -> exempt domestic text rendered
- `LR-A002` -> `LR-P0002` -> reverse-charge text rendered
- `LR-A003` -> `LR-P0003` -> EU goods legal basis rendered
- `LR-A004` -> `LR-P0004` -> EU services legal basis rendered
- `LR-A005` -> `LR-P0005` -> export legal basis rendered
- `LR-A006` -> `LR-P0006` -> small-turnover exemption rendered
- `LR-B001` -> `LR-P0007` -> ROT data rendered
- `LR-B002` -> `LR-P0007` -> RUT data rendered
- `LR-B003` -> `LR-P0008` -> green-tech data rendered
- `LR-C001` -> `LR-P0009` -> credit note references original
- `LR-Z001` -> `LR-P0010` -> blocked missing legal basis

## Bindande testkrav

- unit tests för every zero/exempt/reverse-charge reason code
- unit tests för mandatory field blockers in HUS and green tech
- integration tests proving rendered PDF/HTML and structured payload share same legal basis
- regression tests för credit-note original-reference requirement
- migration tests för preserved historical legal basis or blocked fallback

## Källor som styr dokumentet

- [Skatteverket: Momslagens regler om fakturering](https://www.skatteverket.se/foretag/moms/saljavarorochtjanster/momslagensregleromfakturering.4.58d555751259e4d66168000403.html)
- [Skatteverket: Omvänd betalningsskyldighet](https://www.skatteverket.se/foretag/moms/sarskildamomsregler/omvandbetalningsskyldighet.4.47eb30f51122b1aaad28000258292.html)
- [Skatteverket: Omvänd betalningsskyldighet inom byggsektorn](https://skatteverket.se/foretag/moms/sarskildamomsregler/byggverksamhet/omvandbetalningsskyldighetinombyggsektorn.4.47eb30f51122b1aaad28000545.html)
- [Skatteverket: Försäljning till ändra EU-lander](https://skatteverket.se/foretag/moms/saljavarorochtjanster/forsaljningtillandraeulander.4.18e1b10334ebe8bc80004737.html)
- [Skatteverket: Hur ska en faktura för rot- eller rutarbete vara utformad](https://www.skatteverket.se/privat/etjansterochblanketter/svarpavanligafragor/rotochrutarbete/privatrotochrutarbetefaq/hurskaenfakturaforrotellerrutarbetevarautformad.5.383cc9f31134f01c98a800016094.html)
- [Skatteverket: Grön teknik](https://www.skatteverket.se/foretag/skatterochavdrag/gronteknik.4.676f4884175c97df4192a42.html)
