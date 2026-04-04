# LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för hela flödet för lager, lagervardering, lagerrakning, lagerdifferenser, inkurans, varukostnad och lagerjusteringar.

Detta dokument ska styra:
- lager som omsattningstillgang
- lagerkvantitet per artikel, variant, plats och ägandeprofil
- bokfört lagervarde
- varderingsmetod per profil
- arlig inventering, count sessions och differenshantering
- inkurans och nedskrivning till nettoforsäljningsvarde
- varukostnad och lagerminskning
- kopplingen mellan lagerbok, huvudbok, rapporter och cutover

Ingen kod, ingen testsvit, inget operativt warehouse-screen, ingen count-rutin och ingen bokslutsrutin får definiera avvikande truth för inventory accounting utan att detta dokument skrivs om först.

## Syfte

Detta dokument finns för att läsaren ska kunna bygga hela lager- och varukostnadskedjan utan att gissa:
- vad som är eget lager och vad som inte är det
- när lager ska tas upp som tillgang
- hur anskaffningsvarde bestams
- vilka varderingsmetoder som är tillåtna
- hur count, shrinkage, surplus, scrap och write-down ska bokföras
- hur periodisk och uttryckligt aktiverad perpetual bridge ska skiljas at
- hur inventory state ska kunna verifieras mot BAS, årsredovisning, inventering och SIE4

## Omfattning

Detta dokument omfattar:
- lager av ravaror
- lager av tillsatsmaterial och förnödenheter
- lager av färdiga varor
- lager av handelsvaror
- övriga lagertillgangar där produkten uttryckligen stödjer dem
- VMB-lager som lagertillgangsprofil i den man det paverkar inventering och carrying amount
- reservations-, transfer-, count- och adjustment-truth
- write-down till nettoforsäljningsvarde
- återforing av tidigare write-down upp till kosttak
- periodisk lagervardebrygga
- uttryckligt aktiverad perpetual bridge om och endast om upstream- och downstreambiblar explicit lutar på den
- migration av opening inventory och count-baseline

Detta dokument omfattar inte:
- AP-recognition av inköpta varor innan inventory ownership är verifierad
- order- eller fulfillment-dokumentens kommersiella truth
- WIP enligt projekt eller produktion där separata sanningslager äger intäktsavräkning eller manufacturing-WIP
- skattemassiga 97-procentsregler och INK2-optimering
- momslogik i sig

Kanonisk agarskapsregel:
- detta dokument äger inventory quantity truth och inventory carrying-value truth
- `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md` äger purchase receipt, ownership acceptance och 3-way-match-truth
- `FAKTURAFLODET_BINDANDE_SANNING.md` och `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md` äger sälj- och kundregleringstruth
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md` äger voucherkarnan
- `MOMSFLODET_BINDANDE_SANNING.md` äger momseffekt
- `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md` äger skattemassiga lagerjusteringar och INK2-effekter

## Absoluta principer

- lager får aldrig tas upp utan verifierad ownership eller annan legal kontroll som gör tillgangen till företagets
- vendor-owned consignment får aldrig bokas som eget lager
- customer-owned custödy stock får aldrig bokas som eget lager
- negativt lager är förbjudet i live path
- LIFO är förbjudet
- varderingsmetod får aldrig vara implicit
- inkurans får aldrig hoppas över för att quantity stammer
- write-down får aldrig ske till belopp under verifierat nettoforsäljningsvarde utan explicit evidence
- write-down får aldrig återforas över historiskt kosttak
- count surplus får aldrig ga direkt till intäkt
- count shortage får aldrig ga direkt till AP, payroll eller kundreskontra
- inventory transfer mellan egna platser får aldrig skapa resultat- eller momseffekt
- reservation får aldrig skapa huvudbokseffekt
- perpetual financial bridge får aldrig vara aktiv utan full movement lineage och replaybar kostkedja
- unknown ownership, unknown costing method eller unknown count reason måste blockeras

## Bindande dokumenthierarki för lager, varukostnad och lagerjusteringar

Bindande för detta dokument är:
- `MASTER_DOMAIN_ROADMAP.md`
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
- `BINDANDE_SANNING_STANDARD.md`
- `BINDANDE_SANNING_INDEX.md`
- detta dokument
- Sveriges riksdag: bokföringslag, årsredovisningslag och lag om inventering av varulager för inkomstbeskattningen
- Bokföringsnamndens K-regelverk och vägledning om varulager
- BAS 2025

Detta dokument lutar på:
- `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`
- `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md` endast för closing cutoff, inte för varderingsmetod
- `DOMAIN_20_ROADMAP.md`
- `DOMAIN_20_IMPLEMENTATION_LIBRARY.md`
- `DOMAIN_26_ROADMAP.md`
- `DOMAIN_26_IMPLEMENTATION_LIBRARY.md`

Detta dokument får inte overstyras av:
- gamla lagersaldon i excel
- gamla countlistor utan immutable evidens
- gamla AP-beskrivningar som låter leverantörsfakturan definiera lagervarde ensam
- gamla field- eller POS-modeller som låter artikelforbrukning justera lager utan canonical inventory ledger
- gamla UI-skarmar som visar saldo utan att kunna harleda det från ledgern

## Kanoniska objekt

- `InventoryItemProfile`
  - binder itemtyp, ownership profile, valuation category och tillåtna movements

- `InventoryLedgerEntry`
  - canonical quantity-truth för varje lagerandring

- `InventoryLocation`
  - fysisk eller logisk plats som kan bara count, reservation och ownership boundary

- `InventoryBalanceSnapshot`
  - immutable snapshot av quantity och carrying value per artikel och plats för kontroll, export och replay

- `InventoryCostLayer`
  - kostlager som bar historiskt kostunderlag för en post eller movement family

- `InventoryValuationDecision`
  - explicit beslut om valuation method, profile och tillatet bridge-lage

- `InventoryCountSession`
  - immutable count-session med baseline, recount och signoff

- `InventoryAdjustmentDecision`
  - explicit beslut om shrinkage, surplus, scrap, damage eller annan adjustment

- `InventoryWriteDownDecision`
  - explicit beslut om inkurans eller write-down till nettoforsäljningsvarde

- `InventoryOwnershipBoundary`
  - objekt som klassar stock som owned, vendor_owned, customer_owned eller blocked_unknown

- `InventoryMigrationRecord`
  - immutable importrecord för opening balances, opening value och opening evidence

## Kanoniska state machines

### `InventoryLedgerEntry`

- `draft`
- `posted`
- `reversed`
- `superseded_by_replay`

### `InventoryCountSession`

- `draft`
- `scheduled`
- `counting`
- `recount_required`
- `approved`
- `posted`
- `cancelled`

### `InventoryWriteDownDecision`

- `draft`
- `review_pending`
- `approved`
- `posted`
- `reversed`
- `rejected`

### `InventoryAdjustmentDecision`

- `draft`
- `review_pending`
- `approved`
- `posted`
- `rejected`

### `InventoryMigrationRecord`

- `draft`
- `validated`
- `posted`
- `replayed`
- `rejected`

## Kanoniska commands

- `CreateInventoryLedgerEntry`
- `ClassifyInventoryOwnership`
- `ApproveInventoryValuationMethod`
- `StartInventoryCountSession`
- `SubmitInventoryCount`
- `ApproveInventoryAdjustment`
- `PostInventoryAdjustment`
- `ApproveInventoryWriteDown`
- `PostInventoryWriteDown`
- `ReverseInventoryWriteDown`
- `RegisterInventoryMigration`
- `ReplayInventoryBalance`

## Kanoniska events

- `InventoryOwnershipClassified`
- `InventoryLedgerEntryPosted`
- `InventoryCountSessionStarted`
- `InventoryCountSubmitted`
- `InventoryCountApproved`
- `InventoryAdjustmentPosted`
- `InventoryWriteDownPosted`
- `InventoryWriteDownReversed`
- `InventoryMigrationPosted`
- `InventoryReplayCompleted`

## Kanoniska route-familjer

- `/v1/supply/items/*`
- `/v1/supply/inventory-ledger/*`
- `/v1/supply/inventory-balances/*`
- `/v1/supply/count-sessions/*`
- `/v1/supply/inventory-adjustments/*`
- `/v1/supply/inventory-write-downs/*`
- `/v1/supply/inventory-migrations/*`
- `/v1/supply/inventory-valuation/*`

Folkjande får inte skriva legal truth direkt:
- read models
- dashboards
- UI-inline edits
- import previews
- reporting routes

Högriskoperationer måste vara command-only:
- activation av perpetual financial bridge
- posting av count adjustment
- posting av write-down
- reversal av write-down
- migration av opening balances

## Kanoniska permissions och review boundaries

- `inventory.read`
  - läsa saldo, cost layers, count sessions och snapshots

- `inventory.manage`
  - skapa utkast, count sessions och adjustments utan legal posting

- `inventory.legal_issue`
  - posta count adjustment, write-down och migration

- `inventory.high_risk_review`
  - krävs för write-down, surplus över policygrans, backdated count och bridge profile changes

- `inventory.support_reveal`
  - får aldrig posta eller reklassificera ownership

- `finance.controller`
  - får godkänna valuation profile, write-down och year-end count close

## Nummer-, serie-, referens- och identitetsregler

- varje `InventoryLedgerEntry` ska ha immutable `inventory_ledger_entry_id`
- varje count session ska ha `count_session_id`
- varje write-down ska ha `inventory_write_down_id`
- varje migration record ska ha `inventory_migration_record_id`
- varje item/location valuation row ska ha deterministisk composite identity:
  - `item_id`
  - `variant_id`
  - `location_id`
  - `ownership_profile`
  - `valuation_profile`
  - `lot_or_serial_scope` när relevant
- varje count line ska ha `count_line_id`
- varje adjustment ska ha `reason_code`
- varje write-down ska ha `nrv_evidence_ref`

## Valuta-, avrundnings- och omräkningsregler

- carrying value ska alltid kunna uttryckas i bolagets functional currency
- quantity får ha egen precision enligt `InventoryItemProfile`
- weighted average får aldrig avrundas bara i UI; canonical carrying value ska spara intern precision
- externa rapporter och vouchers får avrundas enligt bolagets bokföringspolicy, men source precision måste bevaras
- inköp i annan valuta måste omsattas till functional currency enligt upstream ownership- och AP-truth; inventory doc får inte gissa kurs
- write-down till nettoforsäljningsvarde ska laggas i functional currency

## Replay-, correction-, recovery- och cutover-regler

- replay får bara bygga på immutable ledger entries, count evidence, migration records och approved write-down decisions
- count correction får aldrig overwritea tidigare count; den måste skapa ny recount eller ny adjustment decision
- migration får aldrig posta saldo utan evidence per item/location/category
- recovery får alltid kunna återskapa:
  - on_hand
  - reserved
  - available
  - blocked
  - carrying_value
  - valuation_method
- backdated inventory movement efter period lock är blockerad utan explicit reopen decision i bokföringskarnan
- cutover ska frysa opening quantity, opening value och ownership profile per artikel och plats

## Huvudflödet

1. item profile anger om artikeln är lagervara, ravara, färdig vara, handelsvara eller förnödenhet
2. ownership boundary klassas
3. valuation method och accounting bridge profile verifieras
4. upstream dokument genererar eller begar inventory movement
5. inventory ledger entry skrivs med quantityeffekt
6. cost layer uppdateras eller refereras
7. count, write-down eller annan adjustment kan förändra carrying value
8. inventory valuation snapshot byggs per closing profile
9. voucher bridge materialiseras enligt tillaten profile
10. rapporter, SIE4 och scenario proof lases mot snapshot och voucher chain

## Bindande scenarioaxlar

- item category
  - `raw_material`
  - `supplies`
  - `finished_goods`
  - `trade_goods`
  - `other_inventory`
  - `vmb_goods`

- ownership profile
  - `owned`
  - `vendor_owned_consignments`
  - `customer_owned_custody`
  - `blocked_unknown`

- valuation method
  - `fifo`
  - `weighted_average`
  - `specific_identification`
  - `fixed_quantity_constant_value`
  - `blocked_lifo`

- accounting bridge profile
  - `periodic_bridge_default`
  - `perpetual_bridge_if_explicit_enabled`

- movement family
  - `receipt`
  - `return_to_stock`
  - `shipment_out`
  - `scrap`
  - `count_surplus`
  - `count_shortage`
  - `write_down`
  - `write_down_reversal`
  - `transfer`
  - `reservation`
  - `migration_opening`

- period status
  - `open_period`
  - `closing_window`
  - `locked_period`

## Bindande policykartor

### Bindande kontokarta per inventory category

- `raw_material`
  - assetkonto `1410`
  - förändringskonto `4910`

- `supplies`
  - assetkonto `1420`
  - förändringskonto `4920`

- `finished_goods`
  - assetkonto `1450`
  - förändringskonto `4950`

- `trade_goods`
  - assetkonto `1460`
  - förändringskonto `4960`

- `vmb_goods`
  - assetkonto `1465`
  - write_down_contra `1466`
  - förändringskonto `4960`

- `other_inventory`
  - assetkonto `1490`
  - förändringskonto `4900`

### Bindande varderingsmetodkarta

- `fifo`
  - tillaten för alla vanliga owned inventory categories

- `weighted_average`
  - tillaten för alla vanliga owned inventory categories där average cost kan bevisas deterministiskt

- `specific_identification`
  - tillaten för unika poster, serialiserade eller annat explicit identifierbart lager

- `fixed_quantity_constant_value`
  - tillaten endast om samtliga villkor i 4 kap. 12 § ARL uppfylls
  - canonical produktdefault är blockerad tills explicit policy och evidence finns
  - får inte användas för handelsvaror eller färdiga varor som huvudregel

- `blocked_lifo`
  - förbjuden metod

### Bindande ownership-karta

- `owned`
  - får paverka inventory balance och carrying value

- `vendor_owned_consignments`
  - får synas operativt men aldrig bokas som eget lager

- `customer_owned_custody`
  - får synas operativt men aldrig bokas som eget lager

- `blocked_unknown`
  - får varken bokas, count-justeras eller användas för valuation

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `LGR-P0001` raw_material closing increase
  - debet `1410`
  - kredit `4910`

- `LGR-P0002` raw_material closing decrease
  - debet `4910`
  - kredit `1410`

- `LGR-P0003` supplies closing increase
  - debet `1420`
  - kredit `4920`

- `LGR-P0004` supplies closing decrease
  - debet `4920`
  - kredit `1420`

- `LGR-P0005` finished_goods closing increase
  - debet `1450`
  - kredit `4950`

- `LGR-P0006` finished_goods closing decrease
  - debet `4950`
  - kredit `1450`

- `LGR-P0007` trade_goods closing increase
  - debet `1460`
  - kredit `4960`

- `LGR-P0008` trade_goods closing decrease
  - debet `4960`
  - kredit `1460`

- `LGR-P0009` other_inventory closing increase
  - debet `1490`
  - kredit `4900`

- `LGR-P0010` other_inventory closing decrease
  - debet `4900`
  - kredit `1490`

- `LGR-P0011` trade_goods count shortage
  - debet `4960`
  - kredit `1460`

- `LGR-P0012` trade_goods count surplus
  - debet `1460`
  - kredit `4960`

- `LGR-P0013` trade_goods write_down_to_nrv
  - debet `4960`
  - kredit `1460`

- `LGR-P0014` trade_goods write_down_reversal_to_cost_cap
  - debet `1460`
  - kredit `4960`

- `LGR-P0015` raw_material write_down_to_nrv
  - debet `4910`
  - kredit `1410`

- `LGR-P0016` finished_goods write_down_to_nrv
  - debet `4950`
  - kredit `1450`

- `LGR-P0017` supplies write_down_to_nrv
  - debet `4920`
  - kredit `1420`

- `LGR-P0018` vmb_goods write_down
  - debet `4960`
  - kredit `1466`

- `LGR-P0019` vmb_goods write_down_reversal
  - debet `1466`
  - kredit `4960`

- `LGR-P0020` return_to_stock_trade_goods_periodic
  - debet `1460`
  - kredit `4960`

- `LGR-P0021` scrap_trade_goods
  - debet `4960`
  - kredit `1460`

- `LGR-P0022` internal_transfer_no_gl
  - utfall: ingen voucher

- `LGR-P0023` reservation_no_gl
  - utfall: ingen voucher

- `LGR-P0024` vendor_owned_consignments_blocked
  - utfall: ingen voucher

- `LGR-P0025` blocked_lifo_method
  - utfall: ingen voucher

- `LGR-P0026` blocked_negative_inventory
  - utfall: ingen voucher

- `LGR-P0027` blocked_unknown_ownership
  - utfall: ingen voucher

- `LGR-P0028` fixed_quantity_constant_value_profile
  - utfall: ingen automatisk voucher utan explicit approved profile

## Bindande rapport-, export- och myndighetsmappning

- lagerkonton `1410`, `1420`, `1450`, `1460`, `1465`, `1490` ska till huvudbok och balansrakning som omsattningstillgangar
- förändringskonton `4910`, `4920`, `4950`, `4960`, `4900` ska till resultatrapport
- SIE4 måste baera voucher lines och SRU-relevant kontoklass enligt BAS-mappning
- countlistor och valuation snapshots måste kunna underbygga inventering enligt lag om inventering av varulager för inkomstbeskattningen
- vendor-owned och customer-owned stock får aldrig rapporteras som eget bokfört varulager

## Bindande scenariofamilj till proof-ledger och rapportspar

- `LGR-A001` raw material increase at closing -> `LGR-P0001` -> balans `1410`, resultat `4910`
- `LGR-A002` raw material decrease at closing -> `LGR-P0002` -> balans `1410`, resultat `4910`
- `LGR-A003` supplies increase -> `LGR-P0003` -> balans `1420`, resultat `4920`
- `LGR-A004` supplies decrease -> `LGR-P0004` -> balans `1420`, resultat `4920`
- `LGR-A005` finished goods increase -> `LGR-P0005` -> balans `1450`, resultat `4950`
- `LGR-A006` finished goods decrease -> `LGR-P0006` -> balans `1450`, resultat `4950`
- `LGR-A007` trade goods increase -> `LGR-P0007` -> balans `1460`, resultat `4960`
- `LGR-A008` trade goods decrease -> `LGR-P0008` -> balans `1460`, resultat `4960`
- `LGR-A009` other inventory increase -> `LGR-P0009` -> balans `1490`, resultat `4900`
- `LGR-A010` other inventory decrease -> `LGR-P0010` -> balans `1490`, resultat `4900`
- `LGR-B001` trade goods count shortage -> `LGR-P0011`
- `LGR-B002` trade goods count surplus -> `LGR-P0012`
- `LGR-C001` trade goods write-down to nrv -> `LGR-P0013`
- `LGR-C002` trade goods reversal up to cost cap -> `LGR-P0014`
- `LGR-C003` raw material write-down -> `LGR-P0015`
- `LGR-C004` finished goods write-down -> `LGR-P0016`
- `LGR-C005` supplies write-down -> `LGR-P0017`
- `LGR-C006` vmb goods write-down -> `LGR-P0018`
- `LGR-C007` vmb goods write-down reversal -> `LGR-P0019`
- `LGR-D001` customer return to stock under periodic profile -> `LGR-P0020`
- `LGR-D002` scrap trade goods -> `LGR-P0021`
- `LGR-D003` internal transfer -> `LGR-P0022`
- `LGR-D004` reservation -> `LGR-P0023`
- `LGR-D005` vendor-owned consignment -> `LGR-P0024`
- `LGR-D006` blocked lifo -> `LGR-P0025`
- `LGR-D007` blocked negative inventory -> `LGR-P0026`
- `LGR-D008` blocked unknown ownership -> `LGR-P0027`
- `LGR-D009` fixed quantity constant value profile -> `LGR-P0028`

## Tvingande dokument- eller indataregler

- varje inventory-affecting event måste ha item, quantity, uom, location och ownership profile
- every write-down måste ha evidence för nettoforsäljningsvarde eller inkuransgrund
- count session måste ha baseline timestamp, count scope, counter identity och signoff
- migration måste ha opening quantity, opening carrying value, category och evidence reference
- supplier invoice ensam får aldrig skapa inventory ownership utan upstream acceptance
- shipment ensam får aldrig skapa negativt lager för att sedan "hamta ikapp"

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `OWNED_CONFIRMED`
- `VENDOR_OWNED_CONSIGNMENT`
- `CUSTOMER_OWNED_CUSTODY`
- `UNKNOWN_OWNERSHIP_BLOCK`
- `COUNT_SHORTAGE`
- `COUNT_SURPLUS`
- `SCRAP_DAMAGE`
- `SCRAP_OBSOLETE`
- `INKURANS_PRICE_DROP`
- `INKURANS_DAMAGE`
- `INKURANS_OBSOLETE`
- `FIXED_QUANTITY_CONSTANT_VALUE`
- `PERPETUAL_BRIDGE_EXPLICIT_ENABLE`
- `MIGRATION_OPENING_BALANCE`

## Bindande faltspec eller inputspec per profil

### periodic_bridge_default

- krav:
  - inventory category
  - valuation method
  - closing snapshot
  - count evidence där policy kraver det
  - value delta between current carrying value and closing carrying value

### perpetual_bridge_if_explicit_enabled

- krav:
  - same as periodic profile
  - full movement lineage
  - deterministic cost layers
  - explicit enable decision
  - reconciliation proof against closing snapshot

### fixed_quantity_constant_value

- krav:
  - explicit framework approval
  - bara ravaror eller förnödenheter
  - underordnad betydelse
  - quantity, value och sammansattning varierar inte vasentligt
  - evidence att +/-20-procentsintervall hallits enligt BFN-kommentar

## Scenariofamiljer som hela systemet måste tacka

- raw materials under fifo
- raw materials under weighted average
- supplies under weighted average
- finished goods under fifo
- trade goods under fifo
- trade goods under weighted average
- unique goods under specific identification
- count shortage
- count surplus
- scrap and damage
- obsolete stock
- write-down to nettoforsäljningsvarde
- reversal up to historical cost cap
- internal transfer
- reservation
- customer return to stock
- vendor-owned consignment
- customer-owned custödy stock
- blocked negative inventory
- blocked LIFO
- blocked unknown ownership
- migration opening balance
- fixed quantity constant value profile

## Scenarioregler per familj

- raw materials and supplies får använda `fixed_quantity_constant_value` endast om ARL 4 kap. 12 uppfylls
- trade goods och finished goods får inte använda `fixed_quantity_constant_value` som default
- LIFO får aldrig valjas
- specific identification får bara valjas när unikt kostunderlag kan sparas per enhet eller lot
- weighted average får bara användas när systemet kan omräkna deterministiskt efter varje cost-affecting movement
- write-down ska ske per post eller varderingsenhet enligt tillämplig redovisningslogik; broad percent cut utan evidence är förbjuden
- återforing av write-down får aldrig overskrida historiskt kosttak
- customer return to stock får bara oka lager om returdisposition tillater re-entry och kostbasen kan bevisas
- transfer mellan egna platser får inte paverka huvudbok
- reservation får inte paverka huvudbok
- vendor-owned consignment får aldrig oka bokfört lager

## Blockerande valideringar

- ownership profile = `blocked_unknown`
- valuation method saknas
- valuation method = `blocked_lifo`
- quantity skulle bli negativ efter movement
- count session postar utan approved recount där diff overstiger policy
- write-down saknar nrv evidence
- write-down reversal overskrider historical cost
- fixed quantity constant value används på handelsvaror eller färdiga varor
- perpetual bridge vald utan full movement lineage
- migration posting saknar evidence per item/location

## Rapport- och exportkonsekvenser

- balansrakning ska spegla carrying value per lagerkategori
- resultatrapport ska spegla förändring av lager via 49xx enligt kategori
- SIE4 ska ha voucher lines för alla postade proof-ledgers utom no_gl och blocked cases
- inventeringsunderlag ska kunna exporteras per balansdag
- blocked cases ska exporteras till audit trail men aldrig till huvudbok

## Förbjudna förenklingar

- att bokföra allt lager på `1460` utan kategori- eller policyprovning
- att anta FIFO i UI men weighted average i bakgrunden
- att lata AP-betalning definiera ownership
- att lata shipment skapa negativt lager som "temporar losning"
- att lagga in procentuell inkurans utan evidence
- att skriva upp lager över historiskt kosttak
- att anse vendor-owned stock som eget bara för att det ligger i samma lokal

## Fler bindande proof-ledger-regler för specialfall

- `LGR-P0029` raw material count shortage
  - debet `4910`
  - kredit `1410`

- `LGR-P0030` raw material count surplus
  - debet `1410`
  - kredit `4910`

- `LGR-P0031` supplies count shortage
  - debet `4920`
  - kredit `1420`

- `LGR-P0032` supplies count surplus
  - debet `1420`
  - kredit `4920`

- `LGR-P0033` finished goods count shortage
  - debet `4950`
  - kredit `1450`

- `LGR-P0034` finished goods count surplus
  - debet `1450`
  - kredit `4950`

- `LGR-P0035` migration opening trade goods
  - debet `1460`
  - kredit balancing account according to migration truth

- `LGR-P0036` migration opening raw materials
  - debet `1410`
  - kredit balancing account according to migration truth

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- `LGR-P0001-LGR-P0010`
  - ändrar carrying value och closing delta

- `LGR-P0011-LGR-P0017`
  - ändrar carrying value och valuation reason history

- `LGR-P0018-LGR-P0019`
  - ändrar VMB carrying value profile

- `LGR-P0020`
  - ändrar quantity upp, carrying value upp och links to return disposition

- `LGR-P0021`
  - ändrar quantity ned och carrying value ned

- `LGR-P0022-LGR-P0023`
  - ändrar quantity state utan huvudbok

- `LGR-P0024-LGR-P0028`
  - blocked eller no_gl state only

- `LGR-P0035-LGR-P0036`
  - skapar opening carrying value och opening migration lineage

## Bindande verifikations-, serie- och exportregler

- inventory vouchers ska ligga i inventory-serie eller annan explicit BAS-kompatibel serie enligt bokföringskarnans policy
- no_gl och blocked cases ska inte skapa huvudboksverifikation men måste skapa immutable audit receipt
- export till SIE4 får inte innehålla blocked cases
- migration vouchers får måste kunna separeras från ordinarie closing vouchers

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- kategori:
  - `raw_material`
  - `supplies`
  - `finished_goods`
  - `trade_goods`
  - `vmb_goods`

- valuation:
  - `fifo`
  - `weighted_average`
  - `specific_identification`
  - `fixed_quantity_constant_value`

- bridge:
  - `periodic_bridge_default`
  - `perpetual_bridge_if_explicit_enabled`

- ownership:
  - `owned`
  - `vendor_owned_consignments`
  - `customer_owned_custody`
  - `blocked_unknown`

- period:
  - `open_period`
  - `closing_window`
  - `locked_period`

## Bindande fixture-klasser för lager, varukostnad och lagerjusteringar

- `LGR-FXT-001`
  - enkel handelsvara, fifo, periodic

- `LGR-FXT-002`
  - handelsvara med weighted average

- `LGR-FXT-003`
  - ravara med fixed quantity constant value candidate

- `LGR-FXT-004`
  - finished goods med count shortage

- `LGR-FXT-005`
  - trade goods med write-down och senare reversal

- `LGR-FXT-006`
  - vendor-owned consignment block

- `LGR-FXT-007`
  - migration opening balances

## Bindande expected outcome-format per scenario

- scenario id
- fixture class
- item category
- ownership profile
- valuation method
- movement family
- expected quantity effect
- expected carrying value effect
- expected proof-ledger id
- expected voucher lines or `ingen voucher`
- expected blocked reason if applicable

## Bindande canonical verifikationsseriepolicy

- `INV`
  - ordinary inventory close, count adjustments and write-downs

- `INM`
  - opening migrations and replay-specific postings

- `none`
  - blocked eller no_gl cases

## Bindande expected outcome per central scenariofamilj

- `LGR-A007`
  - fixture minimum: `LGR-FXT-001`
  - expected quantity effect: ingen quantity change i closing snapshot, bara value reconciliation
  - expected carrying value effect: increase to verified closing carrying value
  - expected proof: `LGR-P0007`
  - expected voucher:
    - debet `1460`
    - kredit `4960`

- `LGR-B001`
  - fixture minimum: `LGR-FXT-001`
  - expected quantity effect: on_hand ned
  - expected carrying value effect: carrying value ned
  - expected proof: `LGR-P0011`

- `LGR-C001`
  - fixture minimum: `LGR-FXT-005`
  - expected quantity effect: oforandrad quantity
  - expected carrying value effect: ned till nrv
  - expected proof: `LGR-P0013`

- `LGR-D005`
  - fixture minimum: `LGR-FXT-006`
  - expected quantity effect: kan synas operativt men inte i owned balance
  - expected carrying value effect: ingen
  - expected proof: `LGR-P0024`

- `LGR-D009`
  - fixture minimum: `LGR-FXT-003`
  - expected quantity effect: enligt count profile
  - expected carrying value effect: endast tillatet efter explicit profile approval
  - expected proof: `LGR-P0028`

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `LGR-A001` -> `LGR-P0001`
- `LGR-A002` -> `LGR-P0002`
- `LGR-A003` -> `LGR-P0003`
- `LGR-A004` -> `LGR-P0004`
- `LGR-A005` -> `LGR-P0005`
- `LGR-A006` -> `LGR-P0006`
- `LGR-A007` -> `LGR-P0007`
- `LGR-A008` -> `LGR-P0008`
- `LGR-A009` -> `LGR-P0009`
- `LGR-A010` -> `LGR-P0010`
- `LGR-B001` -> `LGR-P0011`
- `LGR-B002` -> `LGR-P0012`
- `LGR-C001` -> `LGR-P0013`
- `LGR-C002` -> `LGR-P0014`
- `LGR-C003` -> `LGR-P0015`
- `LGR-C004` -> `LGR-P0016`
- `LGR-C005` -> `LGR-P0017`
- `LGR-C006` -> `LGR-P0018`
- `LGR-C007` -> `LGR-P0019`
- `LGR-D001` -> `LGR-P0020`
- `LGR-D002` -> `LGR-P0021`
- `LGR-D003` -> `LGR-P0022`
- `LGR-D004` -> `LGR-P0023`
- `LGR-D005` -> `LGR-P0024`
- `LGR-D006` -> `LGR-P0025`
- `LGR-D007` -> `LGR-P0026`
- `LGR-D008` -> `LGR-P0027`
- `LGR-D009` -> `LGR-P0028`

## Bindande testkrav

- fifo valuation suite
- weighted average valuation suite
- specific identification suite
- blocked lifo suite
- count shortage and surplus suite
- nrv write-down and capped reversal suite
- ownership boundary suite
- migration opening balance suite
- replay and closing snapshot suite
- SIE4 and main ledger reconciliation suite

## Källor som styr dokumentet

- Sveriges riksdag: Bokföringslag (1999:1078)
- Sveriges riksdag: Årsredovisningslag (1995:1554), sarskilt 4 kap. 9, 11 och 12 §§
- Sveriges riksdag: Lag (1955:257) om inventering av varulager för inkomstbeskattningen
- Bokföringsnamnden K2 och K3-vägledningar om varulager och anskaffningsvarde
- Bokföringsnamnden: yttrande om nettoforsäljningsvarde vid vardering av varulager
- BAS 2025 kontoplan
