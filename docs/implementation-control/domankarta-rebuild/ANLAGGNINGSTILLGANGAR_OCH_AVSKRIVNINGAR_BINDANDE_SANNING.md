# ANLÄGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela flödet för anläggningstillgangar, aktivering, avskrivningar, nedskrivningar, uppskrivningsblockers, utrangering och avyttring.

Detta dokument ska styra:
- asset capitalization
- klassning mellan kostnad och anläggningstillgang
- immateriella och materiella anläggningstillgangar
- byggnader, mark, maskiner, inventarier, installationer, transportmedel och datorer
- pågående nyanläggningar och överföring till färdig tillgang
- avskrivningsplaner
- komponent- eller avskrivningsenhetsregler beroende på tillämplat K-regelverk
- nedskrivning och eventuell återforing där regelverk tillater det
- utrangering, försäljning och realisationsresultat
- SIE4-, huvudboks- och notunderlag för anläggningstillgangar

Ingen kod, inget test, ingen asset-screen, ingen bokslutsrutin och ingen migrering får definiera avvikande truth för asset accounting utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela asset accounting-kedjan utan att gissa:
- när en utgift ska kostnadsforas direkt och när den ska aktiveras
- hur tillgangar delas upp i asset card, komponent eller avskrivningsenhet
- när avskrivning ska borja och vilka konton som ska användas
- hur mark skiljs från byggnad
- hur pågående nyanläggning hanteras innan tillgangen tas i bruk
- hur nedskrivning och utrangering ska bokföras
- hur operativa assets och finansiella asset cards ska hållas isär men bindas samman

## Omfattning

Detta dokument omfattar:
- aktivering av förvärvade immateriella anläggningstillgangar som produkten uttryckligen stödjer
- aktivering av materiella anläggningstillgangar
- direkt tillforbara tillkommande utgifter som får laggas till anskaffningsvarde
- pågående nyanläggningar och förskott
- överföring till färdig tillgang
- planenliga avskrivningar
- komponentregler eller avskrivningsenhetsregler enligt valt K-regelverk
- nedskrivning
- återforing av nedskrivning där regelverket tillater det
- utrangering och försäljning
- migrering av historiska asset cards och ackumulerade avskrivningar

Detta dokument omfattar inte:
- full lease accounting med skuldmodell och lease liability
- skattemassiga overavskrivningar som separat sanningslager
- lager eller förbrukningsinventarier som aldrig ska aktiveras
- operativ maintenance- och reservationstruth i sig

Kanonisk agarskapsregel:
- detta dokument äger finansiell asset-truth
- `DOMAIN_23_*` och framtida operativa assetsanningar äger maintenance, reservation, plats och brukande
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger voucherkarnan och exporten
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` äger ändra interim- och cutoff-logiker men inte planenlig avskrivning av anläggningstillgangar

## Absoluta principer

- en tillgang får aldrig aktiveras om den inte uppfyller kriterierna för anläggningstillgang enligt tillämplat regelverk
- mark får aldrig skrivas av
- pågående nyanläggning får aldrig skrivas av innan tillgangen är färdig att tas i bruk
- avskrivningsmetod får aldrig vara implicit; den måste vara explicit satt eller explicit defaultad enligt framework-regel
- avskrivning får aldrig baseras på betalningsdatum
- avskrivningsplan får aldrig ändras utan uttrycklig regel- och evidencegrund
- reparation och underhall får aldrig tyst aktiveras som anläggningstillgang
- tillkommande utgifter får aldrig kapitaliseras om de bara återstaller ursprunglig funktion utan att uppfylla aktiveringsvillkor
- utrangerad eller avyttrad tillgang får aldrig fortsatta skrivas av
- ackumulerad avskrivning och nedskrivning får aldrig blandas ihop
- operativ asset och finansiell asset card får aldrig förväxlas som samma objekt

## Bindande dokumenthierarki för anläggningstillgangar och avskrivningar

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- Sveriges riksdag: bokföringslag och årsredovisningslag
- Bokföringsnamndens K-regelverk och bokföringsvägledning

Detta dokument lutar på:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` endast för periodgranslogik runt closing
- `DOMAIN_23_ROADMAP.md` och `DOMAIN_23_IMPLEMENTATION_LIBRARY.md` för operativ asset-bridge
- `FAKTURAFLODET_BINDANDE_SANNING.md` och `LEVFAKTURAFLODET_BINDANDE_SANNING.md` endast som upstream source truth när asset förvärvas via vanliga inköps- eller säljflöden

Detta dokument får inte overstyras av:
- gamla anläggningsregister i excel
- gamla manuella avskrivningsjournaler
- gamla supportrader som klassar allt över ett visst belopp som asset utan regelprovning
- gamla kopplingar som blandar domain 23 operational asset med finansiell anläggningstillgang

## Kanoniska objekt

- `AssetCard`
  - finansiell huvudpost för en anläggningstillgang eller avskrivningsenhet

- `AssetComponent`
  - delpost för komponentredovisning eller separat avskrivningsenhet enligt policy

- `AssetCategoryPolicy`
  - binder asset class till konto, avskrivningskonto, ackumulerad avskrivning och regelprofil

- `CapitalizationDecision`
  - beslut om att utgift ska aktiveras eller kostnadsforas

- `ConstructionInProgressCard`
  - finansiell post för pågående nyanläggning

- `DepreciationPlan`
  - nyttjandeperiod, startdatum, metod, frekvens och komponentbas

- `DepreciationRunReceipt`
  - immutable receipt för en avskrivningskorning

- `ImpairmentDecision`
  - beslut om nedskrivning eller blockerad nedskrivning

- `AssetDisposalDecision`
  - utrangering eller försäljning med resultatberakning

- `AssetMigrationRecord`
  - migrerad historik inklusive anskaffningsvarde, ackumulerad avskrivning och bokfört värde

## Kanoniska state machines

### `AssetCard`

- `draft`
- `capitalization_pending`
- `active`
- `fully_depreciated`
- `impaired`
- `disposed`
- `retired`

### `ConstructionInProgressCard`

- `open`
- `capitalized_to_asset`
- `cancelled`

### `DepreciationPlan`

- `draft`
- `approved`
- `active`
- `revised_with_evidence`
- `closed`

### `AssetDisposalDecision`

- `draft`
- `review_pending`
- `approved`
- `posted`
- `cancelled`

## Kanoniska commands

- `AssessCapitalization`
- `CreateAssetCard`
- `CreateConstructionInProgressCard`
- `CapitalizeConstructionInProgress`
- `ApproveDepreciationPlan`
- `RunScheduledDepreciation`
- `PostImpairment`
- `PostImpairmentReversal`
- `DisposeAsset`
- `RetireAssetWithoutProceeds`
- `RegisterAssetMigration`

## Kanoniska events

- `CapitalizationAssessed`
- `AssetCardCreated`
- `ConstructionInProgressCapitalized`
- `DepreciationPlanApproved`
- `DepreciationPosted`
- `ImpairmentPosted`
- `ImpairmentReversalPosted`
- `AssetDisposed`
- `AssetRetired`
- `AssetMigrationRegistered`

## Kanoniska route-familjer

- `/v1/fixed-assets/cards/*`
- `/v1/fixed-assets/cip/*`
- `/v1/fixed-assets/depreciation/*`
- `/v1/fixed-assets/impairment/*`
- `/v1/fixed-assets/disposals/*`

Förbjudna route-monstrar:
- fri patch av bokfört värde
- direkt patch av ackumulerad avskrivning
- adminvag som markerar asset som disposed utan voucher chain

## Kanoniska permissions och review boundaries

- `fixed_assets.read`
- `fixed_assets.capitalization.prepare`
- `fixed_assets.capitalization.approve`
- `fixed_assets.depreciation.run`
- `fixed_assets.impairment.post`
- `fixed_assets.disposal.post`
- `fixed_assets.migration.register`

Review boundaries:
- kapitalisering över policytröskel krav er finance approval
- avskrivningsplan som avviker från kategoripolicy krav er dubbelreview
- nedskrivning, återforing och disposal krav er senior finance approval

## Nummer-, serie-, referens- och identitetsregler

- varje `AssetCard` måste ha immutable asset id
- varje `AssetComponent` måste ha eget component id under parent asset
- varje avskrivningskorning måste ha egen receipt id
- finansiella vouchers för assets ska defaulta till serie `F`
- migrerade asset vouchers ska defaulta till serie `M`

## Valuta-, avrundnings- och omräkningsregler

- asset accounting sker i redovisningsvaluta
- anskaffningsvarde i annan valuta ska omräknas enligt bokföringskarnans FX-regel vid initial recognition
- avskrivningsbelopp ska avrundas enligt canonical voucher rounding policy och får inte justeras manuellt utan evidence

## Replay-, correction-, recovery- och cutover-regler

- replay får aldrig skapa dubbel avskrivning för samma asset och period
- ändrad nyttjandeperiod efter start får bara skapa framtida omplanering, inte overwrite av historiska vouchers
- migrerade asset cards måste vara idempotenta över external asset id plus migration batch digest
- disposal efter migration får fortsatta på migrerat bokfört värde utan omräkning av historik

## Huvudflödet

1. utgift eller projekt identifieras
2. kapitaliseringsprovning kor mot kategori, syfte, nyttjandeperiod och beloppspolicy
3. antingen kostnadsforing eller skapande av CIP/AssetCard
4. när tillgangen är färdig att tas i bruk aktiveras den som `active`
5. avskrivningsplan aktiveras
6. planenliga avskrivningar kor periodiskt
7. vid indikator för vardenedgang provas nedskrivning
8. vid utrangering eller försäljning stoppas avskrivning och disposal voucher postas

## Bindande scenarioaxlar

- asset class:
  - immateriell
  - byggnad
  - mark
  - markanlaggning
  - maskin_teknisk_anlaggning
  - inventarie_verktyg_installation
  - transportmedel
  - datorer
  - pågående_nyanläggning

- framework:
  - K2
  - K3
  - simplified_profile_if_explicitly_supported

- acquisition mode:
  - purchased
  - self_constructed_supported_scope
  - migrated_opening_balance

- lifecycle event:
  - initial_capitalization
  - depreciation
  - impairment
  - impairment_reversal
  - disposal_sale
  - disposal_scrap

## Bindande policykartor

### Canonical BAS-kontofamiljer

- immateriella tillgangar -> `10xx`, canonical default `1010`
- byggnader och mark -> `11xx`, canonical defaults `1110` byggnader, `1130` mark
- maskiner och ändra tekniska anläggningar -> `1210`
- inventarier, verktyg och installationer -> `1220`
- datorer -> `1250`
- transportmedel -> `1240`
- pågående nyanläggningar -> `1180` eller `1280` beroende på klass, canonical default `1180`

### Canonical ackumulerade avskrivningskonton

- byggnader -> `1119`
- maskiner och ändra tekniska anläggningar -> `1219`
- inventarier, verktyg och installationer -> `1229`
- transportmedel -> `1249`
- datorer -> `1259`
- immateriella tillgangar -> `1019`

### Canonical kostnadskonton för planenlig avskrivning

- immateriella tillgangar -> `7810`
- byggnader -> `7820`
- maskiner och tekniska anläggningar -> `7831`
- inventarier, verktyg och installationer -> `7832`
- transportmedel -> `7834`
- datorer -> `7835`

### Bindande avskrivningsmetodkarta per framework

- `K2`
  - canonical metod: `linear`
  - annan metod är blockerad
  - tillkommande aktiverade utgifter är inte egen komponent om K2 inte uttryckligen kraver separat avskrivningsenhet

- `K3`
  - tillåtna metoder:
    - `linear`
    - `degressive`
    - `production_based`
  - vald metod måste bast återspegla forvantad förbrukning av framtida ekonomiska fördelar
  - om förbrukningsmonster inte kan visas med rimlig evidens ska canonical produktdefault vara `linear`
  - betydande komponenter med vasentligt skild förbrukning ska separeras

- `simplified_profile_if_explicitly_supported`
  - default `linear`
  - avvikelse får inte tillatas utan explicit ruleset-stöd

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `AST-P0001` inköpt inventarium aktiveras direkt
  - debet `1220` `100 000`
  - debet `2641` `25 000`
  - kredit `2440` `125 000`

- `AST-P0002` planenlig avskrivning inventarium
  - debet `7832` `20 000`
  - kredit `1229` `20 000`

- `AST-P0003` maskin inköpt och aktiverad
  - debet `1210` `250 000`
  - debet `2641` `62 500`
  - kredit `2440` `312 500`

- `AST-P0004` planenlig avskrivning maskin
  - debet `7831` `50 000`
  - kredit `1219` `50 000`

- `AST-P0005` bil/transportmedel inköpt
  - debet `1240` `300 000`
  - kredit `2440` `300 000`
  - note: VAT behandlas enligt separat momsregel, inte generellt avdragsbar

- `AST-P0006` planenlig avskrivning transportmedel
  - debet `7834` `60 000`
  - kredit `1249` `60 000`

- `AST-P0007` dator inköpt
  - debet `1250` `40 000`
  - debet `2641` `10 000`
  - kredit `2440` `50 000`

- `AST-P0008` planenlig avskrivning dator
  - debet `7835` `20 000`
  - kredit `1259` `20 000`

- `AST-P0009` byggnad inköpt eller aktiverad
  - debet `1110` `1 000 000`
  - kredit relevant motkonto

- `AST-P0010` planenlig avskrivning byggnad
  - debet `7820` `20 000`
  - kredit `1119` `20 000`

- `AST-P0011` mark inköpt
  - debet `1130` `500 000`
  - kredit relevant motkonto
  - no depreciation allowed

- `AST-P0012` pågående nyanläggning
  - debet `1180` `200 000`
  - kredit relevant motkonto

- `AST-P0013` överföring från pågående nyanläggning till aktiv maskin
  - debet `1210` `200 000`
  - kredit `1180` `200 000`

- `AST-P0014` nedskrivning inventarium
  - debet `7730` `15 000`
  - kredit `1228` `15 000`

- `AST-P0015` återforing av tidigare nedskrivning när tillatet
  - debet `1228` `5 000`
  - kredit `7730` `5 000`

- `AST-P0016` försäljning inventarium med vinst
  - debet `1930` `30 000`
  - debet `1229` `80 000`
  - kredit `1220` `100 000`
  - kredit `3973` `10 000`

- `AST-P0017` utrangering utan ersättning
  - debet `1229` ack avskr
  - debet `7973` restvarde
  - kredit `1220` anskaffningsvarde

- `AST-P0018` blocked depreciation of land
  - utfall: ingen voucher

- `AST-P0019` blocked depreciation before ready-för-use
  - utfall: ingen voucher

- `AST-P0020` blocked capitalization of ordinary repair
  - utfall: cost path required, ingen asset voucher

## Bindande rapport-, export- och myndighetsmappning

- asset vouchers ska synas i huvudbok, grundbok, provbalans och SIE4
- asset note-underlag ska kunna visa:
  - anskaffningsvarde
  - ackumulerade avskrivningar
  - ackumulerade nedskrivningar
  - bokfört värde
- disposal ska kunna visa realisationsvinst eller realisationsförlust separat

## Bindande scenariofamilj till proof-ledger och rapportspar

- `AST-A001` direct capitalization inventory -> `AST-P0001`
- `AST-A002` scheduled depreciation inventory -> `AST-P0002`
- `AST-A003` direct capitalization machine -> `AST-P0003`
- `AST-A004` scheduled depreciation machine -> `AST-P0004`
- `AST-A005` transportmedel acquisition -> `AST-P0005`
- `AST-A006` transportmedel depreciation -> `AST-P0006`
- `AST-A007` computer acquisition -> `AST-P0007`
- `AST-A008` computer depreciation -> `AST-P0008`
- `AST-A009` building acquisition -> `AST-P0009`
- `AST-A010` building depreciation -> `AST-P0010`
- `AST-A011` land acquisition -> `AST-P0011`
- `AST-A012` construction in progress -> `AST-P0012`
- `AST-A013` CIP capitalization -> `AST-P0013`
- `AST-B001` impairment -> `AST-P0014`
- `AST-B002` impairment reversal -> `AST-P0015`
- `AST-C001` sale with gain -> `AST-P0016`
- `AST-C002` retirement without proceeds -> `AST-P0017`
- `AST-D001` blocked land depreciation -> `AST-P0018`
- `AST-D002` blocked early depreciation -> `AST-P0019`
- `AST-D003` blocked capitalization of repair -> `AST-P0020`

## Tvingande dokument- eller indataregler

Varje asset decision måste ha:
- legal entity
- acquisition date
- ready-för-use date om relevant
- framework profile
- category policy id
- useful life
- evidence refs
- source voucher or source contract

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AST-R001` capitalized_purchase
- `AST-R002` capitalized_directly_attributable_cost
- `AST-R003` cip_transfer
- `AST-R004` scheduled_depreciation
- `AST-R005` impairment
- `AST-R006` impairment_reversal
- `AST-R007` disposal_sale
- `AST-R008` disposal_retirement
- `AST-R009` repair_not_capitalizable

## Bindande faltspec eller inputspec per profil

### Asset capitalization profile

Obligatoriska fält:
- `assetClass`
- `acquisitionDate`
- `readyForUseDate`
- `acquisitionCost`
- `usefulLifeMonths`
- `frameworkProfile`
- `evidenceRefs[]`

### CIP profile

Obligatoriska fält:
- `projectOrBuildRef`
- `accumulatedCost`
- `capitalizationTargetClass`
- `readyForUseDate`

### Disposal profile

Obligatoriska fält:
- `assetCardId`
- `disposalDate`
- `proceeds`
- `buyerOrScrapReason`
- `evidenceRefs[]`

## Scenariofamiljer som hela systemet måste tacka

- `AST-A001` direct_capitalization_inventory
- `AST-A002` scheduled_depreciation_inventory
- `AST-A003` direct_capitalization_machine
- `AST-A004` scheduled_depreciation_machine
- `AST-A005` transportmedel_acquisition
- `AST-A006` transportmedel_depreciation
- `AST-A007` computer_acquisition
- `AST-A008` computer_depreciation
- `AST-A009` building_acquisition
- `AST-A010` building_depreciation
- `AST-A011` land_acquisition
- `AST-A012` cip_creation
- `AST-A013` cip_transfer_to_active
- `AST-B001` impairment
- `AST-B002` impairment_reversal
- `AST-C001` disposal_sale
- `AST-C002` disposal_retirement
- `AST-D001` blocked_land_depreciation
- `AST-D002` blocked_early_depreciation
- `AST-D003` blocked_repair_capitalization
- `AST-D004` blocked_illegal_depreciation_method
- `AST-E001` migrated_asset_card

## Scenarioregler per familj

- `AST-A001-A010`
  - ska skapa asset voucher och asset card

- `AST-A011`
  - ska aldrig skapa avskrivningsplan

- `AST-A012-A013`
  - ska använda CIP until ready-för-use

- `AST-B001-B002`
  - ska bara kunna postas med documented value trigger

- `AST-C001-C002`
  - ska stoppa framtida avskrivning och stanga asset card

- `AST-D001-D004`
  - ska blockera och skapa finance review case

- `AST-E001`
  - ska vara idempotent över external asset id and migration batch digest

## Blockerande valideringar

- ready-för-use date saknas när avskrivning ska starta
- asset class mark försöker fa avskrivningsplan
- category policy saknas
- useful life saknas eller är orimlig enligt policy
- `K2` men annan metod an `linear`
- `K3` med `degressive` eller `production_based` utan evidens för förbrukningsmonster
- repair/maintenance flagged as capitalization utan explicit capitalization decision
- disposal attempts on already disposed asset
- duplicate depreciation run för same asset and period

## Rapport- och exportkonsekvenser

- varje asset card ska kunna redovisa anskaffningsvarde, ackumulerad avskrivning, ackumulerad nedskrivning och bokfört värde
- varje asset voucher ska exporteras i SIE4 med serie `F` eller `M`
- disposal ska kunna visas separat i resultatrapport

## Förbjudna förenklingar

- att alla tillgangar får samma nyttjandeperiod
- att mark och byggnad ligger på samma avskrivningsplan
- att underhall och reparationer bokas som asset bara för att beloppet är hogt
- att operativ asset automatiskt blir finansiell tillgang utan capitalization decision

## Fler bindande proof-ledger-regler för specialfall

- `AST-P0021` capitalization of directly attributable installation cost
  - debet relevant assetkonto
  - kredit relevant motkonto

- `AST-P0022` blocked impairment reversal where framework disallows it
  - utfall: ingen voucher

- `AST-P0023` migration opening balance för asset with accumulated depreciation
  - debet assetkonto
  - kredit ackumulerad avskrivning
  - kredit/debet eget kapital enligt balancing entry

- `AST-P0024` blocked illegal depreciation method
  - utfall: ingen voucher

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- asset vouchers får inte skapa ÄR eller AP i sig
- `AST-P0012-P0013` uppdaterar CIP-state
- `AST-P0016-P0017` stanger asset card och disposal state
- blocked proof-ledgers skapar endast review case

## Bindande verifikations-, serie- och exportregler

- live asset vouchers ska defaulta till serie `F`
- migrerade historical asset vouchers ska defaulta till serie `M`
- depreciation runs ska vara idempotenta per asset and period
- SIE4-export ska behalla asset voucher lineage

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- framework x asset class
- purchased x self_constructed x migrated
- active x cip x disposed
- depreciation x impairment x disposal

## Bindande fixture-klasser för anläggningstillgangar och avskrivningar

- `AST-FXT-001` standard inventory purchase and 5-year depreciation
- `AST-FXT-002` machine purchase and depreciation
- `AST-FXT-003` building and land split
- `AST-FXT-004` CIP then transfer to active asset
- `AST-FXT-005` impairment and disposal case
- `AST-FXT-006` migrated asset with accumulated depreciation

## Bindande expected outcome-format per scenario

Varje scenario måste skriva ut:
- scenario-id
- fixture class
- framework
- asset class
- proof-ledger ids
- expected asset state
- expected voucher series
- expected blocker eller success verdict

## Bindande canonical verifikationsseriepolicy

- asset live postings -> `F`
- migrated historical postings -> `M`
- manual finance-only reclass outside fixed-assets flow -> `D` och explicit cross-reference

## Bindande expected outcome per central scenariofamilj

### `AST-A001`

- fixture: `AST-FXT-001`
- expected:
  - `AST-P0001`
  - asset card active
  - depreciation plan active

### `AST-A011`

- fixture: `AST-FXT-003`
- expected:
  - `AST-P0011`
  - no depreciation plan

### `AST-C001`

- fixture: `AST-FXT-005`
- expected:
  - `AST-P0016`
  - asset card closed/disposed
  - no further depreciation

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `AST-A001` -> success -> `AST-P0001`
- `AST-A002` -> success -> `AST-P0002`
- `AST-A003` -> success -> `AST-P0003`
- `AST-A004` -> success -> `AST-P0004`
- `AST-A005` -> success -> `AST-P0005`
- `AST-A006` -> success -> `AST-P0006`
- `AST-A007` -> success -> `AST-P0007`
- `AST-A008` -> success -> `AST-P0008`
- `AST-A009` -> success -> `AST-P0009`
- `AST-A010` -> success -> `AST-P0010`
- `AST-A011` -> success -> `AST-P0011`
- `AST-A012` -> success -> `AST-P0012`
- `AST-A013` -> success -> `AST-P0013`
- `AST-B001` -> success -> `AST-P0014`
- `AST-B002` -> success_or_blocked -> `AST-P0015` or `AST-P0022`
- `AST-C001` -> success -> `AST-P0016`
- `AST-C002` -> success -> `AST-P0017`
- `AST-D001` -> blocked -> `AST-P0018`
- `AST-D002` -> blocked -> `AST-P0019`
- `AST-D003` -> blocked -> `AST-P0020`
- `AST-D004` -> blocked -> `AST-P0024`
- `AST-E001` -> success -> `AST-P0023`

## Bindande testkrav

- varje asset class ska ha minst en acquisition och depreciation fixture
- mark vs byggnad split ska testas explicit
- CIP to active transfer ska testas över period boundary
- duplicate depreciation runs ska blockeras i replay och concurrency
- disposal ska stoppa further depreciation i efterföljande runs

## Källor som styr dokumentet

- Sveriges riksdag: [Bokföringslag (1999:1078)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/bokforingslag-19991078_sfs-1999-1078/)
- Sveriges riksdag: [Årsredovisningslag (1995:1554)](https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/arsredovisningslag-19951554_sfs-1995-1554/)
- Bokföringsnamnden: [K-regelverk](https://www.bfn.se/redovisningsregler/vagledningar/k-regelverk/)
- BAS: [Kontoplaner](https://www.bas.se/kontoplaner/)
- BAS: [Kontoplan BAS 2025](https://www.bas.se/wp-content/uploads/2025/01/Kontoplan-BAS-2025.pdf)
