# Projects budget, WIP and profitability

## Syfte

Detta dokument definierar projektbudget, WIP, projektmarginal, resursbelaggning och forecast at completion for projekt i desktop-web. Syftet ar att ge en deterministisk och sparbar modell for hur projektets utfall, fakturering och framtidsprognos raknas fram utan att lagga domanlogik i UI.

## Scope

### Ingar

- projekt med faktureringsmodell och intaktsforingsmodell
- versionerade projektbudgetar med kostnads- och intaktsrader
- resursallokering med planerade minuter, billable minuter, bill rate och cost rate
- actual cost snapshots byggda pa godkanda lonerelaterade utfall, formaner, pension och resor
- WIP snapshots som jamfor godkant varde mot fakturerat varde
- forecast snapshots med remaining budget och forecast at completion
- projektmarginal, resursbelaggning och audit trail

### Ingar inte

- dispatch, arbetsorder, serviceorder och faltmobil
- lager, materialreservation och kundsignatur
- byggspecifika regler for ATA, HUS, omvand moms och personalliggare

### Systemgranser

- `domain-projects` ager projekt, budgetversion, resursallokering och snapshot-objekt
- `domain-ar` ager kundfakturan men maste kunna peka fakturarader till projekt via `projectId`
- `domain-time` ager tidrader och arbetad tid
- `domain-payroll` ager godkanda lonelinjer och deras dimensioner
- `domain-benefits`, `domain-travel` och `domain-pension` levererar kostnadsunderlag via payrollkedjan
- UI visar endast projektioner och drilldown, aldrig egen kalkyl eller regelmotor

## Roller

- **Project manager** ansvarar for projektbudget, resursplan och uppfoljning.
- **Controller** granskar WIP, forecast och projektmarginal.
- **Billing operator** ansvarar for att fakturering och AR-koppling ar korrekt.
- **Payroll operator** ansvarar for att lon, forman, pension och reseunderlag ar godkanda innan projektsnapshot skapas.
- **Auditor** granskar snapshot-hash, budgetversion och tie-out mot fakturering.

## Begrepp

- **Project budget version** - Versionslast budget for ett projekt med kostnads- och intaktsrader per period.
- **Budget line** - En kostnads- eller intaktsrad i en budgetversion.
- **Resource allocation** - Planerad kapacitet och prissattning for en anstallning i en given period.
- **Actual cost** - Summerad faktisk projektkostnad per cutoffdatum.
- **Approved value** - Godkant varde for arbete som far raknas i WIP-modellen.
- **Billed revenue** - Nettofakturerat belopp pa issued eller senare kundfakturor som bar projektkoppling.
- **WIP** - Godkant varde minus fakturerat varde, aldrig negativt utan separat review- eller overrideflode.
- **Deferred revenue** - Fakturerat belopp som overstiger redovisat projektvarde enligt vald modell.
- **Forecast at completion** - Faktiskt utfall till cutoff plus kvarvarande budget efter cutoff.
- **Resource load** - Faktiskt arbetade minuter dividerat med planerade minuter till och med cutoff-perioden.

## Objektmodell

### Project
- falt: `projectId`, `companyId`, `projectCode`, `projectReferenceCode`, `customerId`, `projectManagerEmployeeId`, `startsOn`, `endsOn`, `billingModelCode`, `revenueRecognitionModelCode`, `contractValueAmount`, `status`
- invariant: aktivt projekt maste ha bade `billingModelCode` och `revenueRecognitionModelCode`

### Project budget version
- falt: `projectBudgetVersionId`, `projectId`, `versionNo`, `budgetName`, `validFrom`, `status`, `totals`, `lines`
- invariant: versionnummer ar monotona per projekt

### Project budget line
- falt: `projectBudgetLineId`, `lineKind`, `categoryCode`, `reportingPeriod`, `amount`, `employmentId`, `activityCode`, `note`
- invariant: `lineKind` ar `cost` eller `revenue`

### Project resource allocation
- falt: `projectResourceAllocationId`, `projectId`, `employmentId`, `reportingPeriod`, `plannedMinutes`, `billableMinutes`, `billRateAmount`, `costRateAmount`, `activityCode`, `status`
- invariant: en allokering maste vara knuten till en verklig anstallning i samma bolag

### Project cost snapshot
- falt: `projectCostSnapshotId`, `projectId`, `cutoffDate`, `reportingPeriod`, `actualCostAmount`, `actualMinutes`, `billedRevenueAmount`, `recognizedRevenueAmount`, `costBreakdown`, `sourceCounts`, `snapshotHash`
- invariant: samma `projectId + cutoffDate + snapshotHash` far inte skapas flera ganger

### Project WIP snapshot
- falt: `projectWipSnapshotId`, `projectId`, `cutoffDate`, `approvedValueAmount`, `billedAmount`, `wipAmount`, `deferredRevenueAmount`, `status`, `explanationCodes`, `snapshotHash`
- invariant: negativ WIP far inte auto-materialiseras som vanligt utfall

### Project forecast snapshot
- falt: `projectForecastSnapshotId`, `projectId`, `cutoffDate`, `actualCostAmount`, `remainingBudgetCostAmount`, `forecastCostAtCompletionAmount`, `billedRevenueAmount`, `remainingBudgetRevenueAmount`, `forecastRevenueAtCompletionAmount`, `currentMarginAmount`, `forecastMarginAmount`, `resourceLoadPercent`, `snapshotHash`
- invariant: forecast bygger alltid pa en definierad budgetversion och ett definierat cutoffdatum

## State machine

### Project
- `draft -> active -> on_hold -> closed -> archived`
- endast `active` projekt far ta emot nya budgetversioner, resursallokeringar och snapshots
- `closed` stoppar ny fakturering och ny uppfoljning men historik ligger kvar

### Project budget version
- `draft -> approved -> superseded`
- ny budgetversion far inte mutera tidigare approved version

### Project snapshot
- `materialized -> superseded`
- `materialized -> review_required` om forklaringskoder eller reviewkrav finns

## Anvandarfloden

### Skapa projekt och budget
1. Skapa projekt med kund, faktureringsmodell och intaktsforingsmodell.
2. Skapa baseline-budget med kostnads- och intaktsrader per rapportperiod.
3. Lagg till resursallokeringar for anstallda som ska arbeta i projektet.
4. Publicera ny budgetversion nar forecast eller avtal andras.

### Materialisera projektuppfoljning
1. Godkann tid, lon, forman, pension och reseunderlag i respektive doman.
2. Skapa projekt-cost snapshot for valt cutoffdatum.
3. Skapa WIP snapshot for samma cutoffdatum.
4. Skapa forecast snapshot for samma cutoffdatum.
5. Visa resultat i dashboard och drilldown till tid, payroll och faktura.

### Tie-out mot fakturering
1. Kundfakturor issueas i AR med `projectId` per rad.
2. Projektmotorn laster endast fakturor i status `issued`, `delivered`, `partially_paid`, `paid` eller `settled`.
3. Endast nettobelopp pa rader med projektkoppling raknas som `billedRevenueAmount`.
4. WIP snapshots jamfor `approvedValueAmount` mot `billedAmount`.

## Affarsregler

### Budgetversionering
- varje projekt har exakt en aktiv eller senast godkand budgetversion som styr forecast
- nya versioner skapas additivt och supersederar tidigare versioner utan att skriva om historik
- budgetlinjer efter cutoff-period raknas som `remaining budget`

### Faktisk projektkostnad
- `actualCostAmount` byggs fran approved payrollutfall till och med cutoffdatum
- kostnad ska kunna inkludera lon, formaner, pension och resor
- om en payrollrad har explicit `dimensionJson.projectId` som matchar projektet anvands full andel
- om payrollrad saknar explicit projektdimension men anstallningen har tid mot projekt i samma rapportperiod anvands implicit andel = projektminuter / total arbetad tid for anstallningen i perioden
- kostnadskategorier delas upp i `salaryAmount`, `benefitAmount`, `pensionAmount`, `travelAmount` och `otherAmount`

### Approved value
- for `time_and_material` = summa arbetade minuter per tidrad dividerat med 60 multiplicerat med gallande `billRateAmount` for anstallning och rapportperiod
- for `fixed_price` och `milestone` = budgetversionens current revenue amount till och med snapshot-perioden
- saknas resursallokering for T&M-tidrad blir det forklaringskod `rate_missing_review`

### Billed revenue
- bygger pa AR-fakturor med issue-date pa eller fore cutoffdatum
- endast projektrelaterade rader raknas
- krediter och andra AR-regler hanteras i AR, projektmotorn laster bara netto `lineAmount` som kvarstar i fakturans radmodell

### WIP och deferred revenue
- `wipAmount = max(0, approvedValueAmount - billedAmount)`
- `deferredRevenueAmount = max(0, billedAmount - recognizedRevenueAmount)`
- for `billing_equals_revenue` ar `recognizedRevenueAmount = billedAmount`
- for andra intaktsforingsmodeller ar `recognizedRevenueAmount = approvedValueAmount`
- negativt utfall omklassificeras till `deferredRevenueAmount` eller forklaringskod, inte till negativ WIP

### Forecast at completion
- `remainingBudgetCostAmount` = summa kostnadsbudget for perioder efter snapshot-perioden
- `remainingBudgetRevenueAmount` = summa intaktsbudget for perioder efter snapshot-perioden
- `forecastCostAtCompletionAmount = actualCostAmount + remainingBudgetCostAmount`
- `forecastRevenueAtCompletionAmount = recognizedRevenueAmount + remainingBudgetRevenueAmount`
- `currentMarginAmount = recognizedRevenueAmount - actualCostAmount`
- `forecastMarginAmount = forecastRevenueAtCompletionAmount - forecastCostAtCompletionAmount`

### Resursbelaggning
- `resourceLoadPercent = actualMinutes / plannedMinutesToDate * 100`
- `plannedMinutesToDate` ar summan av planerade minuter pa resursallokeringar i perioder fram till snapshot-perioden
- saknas planerade minuter blir `resourceLoadPercent = 0`

## Behorigheter

- `company.manage` kravs for att skapa projekt, budgetversioner, resursallokeringar och snapshots
- `company.read` kravs for att lasa projekt, snapshotar och audit events
- UI far aldrig kringga API-behorighet med lokal kalkyl eller dold fallback

## Fel- och konfliktfall

- projekt i `draft` far inte materialisera snapshots som forutsatter aktiv fakturerings- och intaktsmodell
- projekt med saknad budgetversion far skapa actual cost snapshot men forecast ska ge noll kvarvarande budget
- tidrader utan resursallokering skapar forklaringskod `rate_missing_review`
- WIP-overhang skapar `deferred_revenue_balance`
- projektalias maste vara unika per bolag over `projectId`, `projectCode` och `projectReferenceCode`

## Notifieringar

- controller eller projektledare ska kunna se reviewkrav nar forklaringskoder uppstar
- nya budgetversioner och snapshot-materialiseringar ska skapa auditbar handelse
- UI far visa statuskort men inte skapa egna berakningar

## Audit trail

- skapa projekt loggar `project.created`
- budgetversion loggar `project.budget.approved`
- resursallokering loggar `project.resource_allocation.created`
- cost snapshot loggar `project.cost_snapshot.materialized`
- WIP snapshot loggar `project.wip_snapshot.materialized`
- forecast snapshot loggar `project.forecast_snapshot.materialized`
- varje audit event ska bara snapshot-hash, actor, correlationId och forklaring

## API/events/jobs

- kommandon: `create_project`, `approve_project_budget_version`, `create_project_resource_allocation`, `materialize_project_cost_snapshot`, `materialize_project_wip_snapshot`, `materialize_project_forecast_snapshot`
- events: `project.created`, `project.budget.approved`, `project.resource_allocation.created`, `project.cost_snapshot.materialized`, `project.wip_snapshot.materialized`, `project.forecast_snapshot.materialized`
- jobb: inga egna async-jobb ar obligatoriska i 10.1; materialisering kan koras synkront via API

## UI-krav

- desktop-web ska kunna visa projektlista, projektdetalj, budgetversioner, resursallokeringar och snapshotar
- dashboard ska visa `budget vs utfall`, `marginal`, `WIP` och `belaggning`
- alla siffror ska kunna drilldownas till underlag eller tydligt markeras nar drilldown saknas
- alla projektmatt ska kunna filtreras pa period, bolag, projekt och kostnadsstalle
- UI far inte innehalla egen regelkod for WIP, forecast eller kostnadsfordelning

## Testfall

1. T&M-projekt med tid och bill rate ger approved value utifran arbetade minuter.
2. Actual cost inkluderar lon, forman, pension och resa i samma snapshot.
3. AR-faktura med `projectId` minskar WIP och kan tie-outas mot fakturering.
4. Future budget cost och revenue bygger forecast at completion utan att skriva om actuals.
5. Tidrader utan rate ger forklaringskod och reviewkrav.

## Exit gate

- [ ] projektkostnad inkluderar lon, formaner, pension och resor
- [ ] WIP kan stammas av mot fakturering
- [ ] forecast at completion fungerar
- [ ] budgetversioner skriver inte over historik
- [ ] UI visar bara projektioner och drilldown, aldrig egen domanlogik
