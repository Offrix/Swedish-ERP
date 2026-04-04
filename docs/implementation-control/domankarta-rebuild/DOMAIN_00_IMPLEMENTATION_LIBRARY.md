# DOMAIN_00_IMPLEMENTATION_LIBRARY

## Mål

Att definiera exakt hur Domän 0 ska byggas som en hård repo-sanerings- och sanningslåsningsfas, så att senare domäner startar från verifierad repo-reality och inte från gamla dokument, gamla verifieringsspår eller falsk completeness.

## Klassificeringsmodell

Två axlar ska alltid användas samtidigt:

1. Reality-klass
   - `verified reality`
   - `partial reality`
   - `legacy`
   - `dead`
   - `misleading`
   - `duplicate`

2. Åtgärdsstatus
   - `keep`
   - `harden`
   - `rewrite`
   - `replace`
   - `migrate`
   - `archive`
   - `remove`

Ingen fil, mapp eller kluster får bara ha en av axlarna.

## Beslutskriterier för docs

- `verified reality`: bara rebuild-dokument eller aktivt stöddokument som uttryckligen pekar på rebuild-sanningen
- `partial reality`: sakligt användbart råmaterial som fortfarande kräver migrering eller nedgradering
- `legacy`: historiskt material som får läsas men aldrig styra
- `misleading`: dokument som fortfarande bär bindande språk, fel ytor eller felaktiga paths
- `duplicate`: dokument som konkurrerar med ändra om samma styrning

## Beslutskriterier för kod

- `verified reality`: aktiv import-, route-, handler- eller migrationskoppling
- `partial reality`: shell, baseline eller aktiv kod som inte är protected/live-verifierad
- `legacy`: kvarlämnad kompatibilitets- eller övergångskod
- `dead`: saknar aktiv koppling och saknar retention-/legal-hold-behov
- `misleading`: kod som ger falsk produkt- eller runtime-signal
- `duplicate`: capability shadowing, parallella sanningar eller överlappande exports

## Beslutskriterier för tester

- `verified reality`: träffar verklig kodväg utan att maskera allt via demo-runtime
- `partial reality`: smoke, metadata eller demo/test-runtime
- `legacy`: gammal testfamilj som inte längre ska styra
- `misleading`: test som lätt misstas för bredare readiness-bevis än den är
- `stale`: lokal path, felaktiga antäganden eller känd miljölåsning som gör signalen opålitlig

## Beslutskriterier för scripts/runbooks

- `verified reality`: används aktivt och är portabelt, repo-relativt och sanningsmässigt rätt
- `partial reality`: användbart men med smalare bevisvärde än namnet antyder
- `legacy`: historiskt stödmaterial
- `misleading`: namn eller metadata antyder mer än scriptet/runbooken bevisar
- `stale`: lokal path, gammal yta eller gammal sanningskedja

## Fas 0

### Delfas 0.1 Documentation Truth Lock

**Vad som ska byggas**
- ett låst sanningslager i root:
  - `AGENTS.md`
  - `README.md`
  - `MASTER_DOMAIN_ROADMAP.md`
  - `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md`
  - `CODEX_SETTINGS_PROMPT.md`

**Objekt**
- `ActiveTruthDocument(path, role, precedence, allowedUse)`
- `LegacyRawMaterial(path, formerRole, migrationRequired)`

**Invariants**
- bara rebuild-dokument får ha aktiv styrningsroll
- root-dokument får inte peka på gammal sanning
- gamla docs får inte ligga kvar som implicit default-läsning

**Valideringar**
- grep på gamla styrdokument i root måste ge 0 aktiva sanningsträffar
- root-dokument måste peka på samma rebuild-filer

**Routes/API-kontrakt**
- inga

**Permissions/review-boundaries**
- docs-truth-förändringar måste göras i samma ändringsset för `AGENTS`, `README`, master-roadmap och master-library

**Audit/evidence**
- dokumentera exakt vilka gamla styrdokument som blev nedgraderade

**Tester**
- repo-sökning efter gamla styrdokument i root
- manuell stickprovsläsning av `README.md`
- kontroll att `scripts/lib/repo.mjs` inte håller gamla docs mandatory

### Delfas 0.2 Legacy Binding Downgrade

**Vad som ska byggas**
- en klusterbaserad nedgraderingsmodell för hela gamla docs-trädet

**Objekt**
- `DocCluster(clusterId, pathPattern, realityClass, actionStatus)`
- `BindingClaim(path, line, claimType, replacementPath)`

**Invariants**
- inga gamla docs-kluster får bära aktiv bindningsstatus efter sanering
- varje gammal bindningskälla måste få `migrate`, `archive`, `rewrite` eller `remove`

**Valideringar**
- alla `Status: Binding/Bindande` utanför rebuild måste matcha ett prune-beslut

**Audit/evidence**
- lista över bindningsanspråk per katalog

**Tester**
- rg över docs-trädet
- stickprov minst en fil per katalog

### Delfas 0.3 Surface Reality Map

**Vad som ska byggas**
- en canonical surface map som skiljer:
  - `verified runtime surface`
  - `verified shell surface`
  - `missing planned surface`
  - `historical imagined surface`

**Objekt**
- `SurfaceRecord(surfaceCode, actualPath, surfaceClass, truthStatus, notes)`
- `SurfaceReference(docPath, referencedSurface, actualExists)`

**Invariants**
- aktiv dokumentation får inte beskriva saknade appytor som verkliga
- shellar får inte kallas full produkt

**Valideringar**
- alla `apps/backoffice` och `apps/public-web`-referenser måste klassificeras
- faktiska `apps/*`-kataloger måste matcha surface map

**Tester**
- kataloginventering av `apps/`
- docs-sökning efter saknade surfaces

### Delfas 0.4 Code And Runtime Classification

**Vad som ska byggas**
- en kodkarta där varje större kluster får reality-klass + åtgärdsstatus

**Objekt**
- `CodeCluster(path, entrypointLinks, runtimeRole, realityClass, actionStatus)`
- `RuntimeDependency(path, dependencyType, proof)`

**Invariants**
- ingen kod får klassas som aktiv utan konkret koppling
- placeholderkod får inte ligga kvar som `required` utan särskild etikett

**Valideringar**
- importgraf från `apps/api/src/platform.mjs`
- worker-handlerkoppling från `apps/worker/src/worker.mjs`
- repo-manifestets required-lister måste spegla verkligheten

**Tester**
- importstickprov
- active vs placeholder-scan

### Delfas 0.5 Runtime Blocker Register

**Vad som ska byggas**
- ett blockerregister som bär vidare protected/live-hinder till senare domäner

**Objekt**
- `RuntimeBlocker(blockerCode, category, severity, fileRefs, remediation, domainImpact)`

**Invariants**
- inga senare domäner får ignorera öppna runtime-blockers som skär genom deras sanning
- blockerregistret ska bygga på honesty-scan och konkret kodreferens, inte åsikt

**Valideringar**
- blocker måste peka på honesty-scan finding + kodfil

**Tester**
- kör honesty-scan i production-läge
- kontrollera blockerklassning mot faktiska filer

### Delfas 0.6 Test Truth Classification

**Vad som ska byggas**
- ett test truth registry

**Objekt**
- `TestTruthRecord(testPath, truthClass, runtimeMode, environmentSensitivity, actionStatus)`
- `DemoRuntimeFamily(pattern, count, allowedUse, forbiddenUse)`

**Invariants**
- demo-runtime får aldrig räknas som protected/live-sanning
- stale path-tester får aldrig ligga i officiell readiness-kedja
- environment-blocked ska vara egen klass, inte samma som repo-fel

**Valideringar**
- alla demo-helpertester måste kunna identifieras maskinellt
- alla hårdkodade lokala path-tester måste vara karantänmärkta

**Tester**
- rg för demo-helper
- rg för lokala paths
- representativa testkörningar

### Delfas 0.7 Script And Runbook Truth Classification

**Vad som ska byggas**
- ett script/runbook truth registry

**Objekt**
- `ScriptTruthRecord(path, scriptFamily, evidenceLevel, portabilityClass, actionStatus)`
- `RunbookTruthRecord(path, runbookClass, pathPortability, truthStatus, actionStatus)`

**Invariants**
- namn får inte översälja bevisvärde
- aktiva runbooks måste vara repo-relativa
- PowerShell-only får inte smygas in som generisk verifieringsstandard

**Valideringar**
- alla verify-script måste märkas med faktisk bevisnivå
- alla runbooks med absoluta paths måste få rewrite/archive

**Tester**
- kör baseline-skript
- kontrollera runbookpaths

### Delfas 0.8 False Completeness Map

**Vad som ska byggas**
- en explicit karta över falska gröna signaler

**Objekt**
- `FalseCompletenessRecord(sourcePath, sourceType, illusionType, actualReality, requiredFix)`

**Invariants**
- varje falsk signal måste ha minst en konkret motåtgärd i roadmap eller prune-map

**Valideringar**
- docs, tests, scripts och kod måste alla kunna bidra till false-completeness-listan

**Tester**
- jämför green script outputs mot runtime blocker register

### Delfas 0.9 Repo Prune And Supersession Map

**Vad som ska byggas**
- den faktiska prune-mapen och supersession-kartan

**Objekt**
- `PruneDecisionRecord(path, pathClass, realityClass, actionStatus, why, riskIfLeft, targetIfMigrated)`
- `SupersessionRecord(oldPath, newPath, migrationNeeded, finalStatus)`

**Invariants**
- `remove` kräver starkare bevis än `archive`
- `migrate` kräver explicit målplats
- `archive` ska användas när historiskt värde finns kvar men aktiv sanning ska bort

**Valideringar**
- varje rad i prune-mapen ska kunna verkställas utan tolkning

**Tester**
- referenssökning före `remove`
- stickprov på `migrate`-mål

### Delfas 0.10 Low-Risk Cleanup Execution

**Vad som ska byggas**
- en låg-risk-cleanup-kedja som verkställer prune-mapens säkra beslut utan att tappa sanningsreferenser

**Objekt**
- `CleanupAction(actionCode, targetPath, cleanupClass, evidenceRefs, executionStatus)`
- `CleanupReceipt(receiptCode, actionCode, beforeRefs, afterRefs, reviewOutcome)`

**Invariants**
- inget får tas bort enbart på känsla eller antägande
- varje cleanup-åtgärd måste kunna härledas till prune-map eller konkret referensscan
- cleanup får inte skapa ny falsk sanning i root-manifest, README eller runbooks

**Valideringar**
- varje `CleanupAction` måste bära minst en evidensreferens
- `archive`, `rewrite` och `remove` måste hållas isär som olika cleanup-klasser

**Tester**
- före/efter-jämförelse av referenser för varje verkställd cleanup-åtgärd

### Delfas 0.11 Domain Input Export

**Vad som ska byggas**
- ett säkert startunderlag till Domän 1-17

**Objekt**
- `CapabilityCluster(clusterCode, evidencePaths, blockers, confidenceLevel)`
- `DomainInputRecord(domainCode, knownScope, mandatoryPrerequisites, openRisks)`

**Invariants**
- senare domäner får inte starta i gammal docs-sanning
- cluster-input måste bygga på kod, appar, routes, worker och migrations, inte bara gamla docs

**Valideringar**
- varje capability-kluster måste kunna härledas till faktisk kod

**Tester**
- stickprov per kluster mot `apps/api/src/platform.mjs` eller `apps/worker/src/worker.mjs`

### Delfas 0.12 External Audit Reconciliation

**Vad som ska byggas**
- en rekonsileringsmodell för externa auditpaket som skiljer stale claims från verkligt öppna blockers

**Objekt**
- `ExternalAuditPackage(packageCode, sourceFiles, reviewedAt, trustBoundary)`
- `AuditDirectClaim(claimCode, claimFamily, auditValue, currentValue, disposition, evidenceRefs)`
- `AuditIssueCarryForward(issueRef, mappedOwner, mappedPhase, mappedDelfas, disposition, notes)`
- `AuditDispositionReceipt(receiptCode, packageCode, staleClaimCount, openClaimCount, carryForwardCount)`

**Invariants**
- extern audit är alltid `verification_only`
- direkta corpusclaims får inte bli öppna blockers utan aktuell repomätning
- varje importerad `issue_ref` måste ha exakt en disposition
- stale auditclaims får inte återintroduceras som ny sanning i Domän 00

**Valideringar**
- `AuditDirectClaim` måste alltid ha både auditvärde och aktuellt värde
- BOM-, absoluta-path- och dokumentportabilitetsfynd får bara stå som öppna om de fortfarande är mätbara
- carry-forward-kluster för Domän 00, 03, 13, 15, 17, 27 och 28 måste vara explicit registrerade
- `BOKFORING_REBUILD_AUDIT_RECONCILIATION_2026-04-04.md` måste vara den aktuella rekonsileringskvittensen för delfasen

**Tester**
- jämför gamla auditcounts mot aktuell repomätning
- stickprov på dispositionerna `closed_stale`, `closed_already_implemented` och `open_doc_hygiene`

## Hur false completeness identifieras

- gröna scripts med för smalt innehåll
- docs som antar saknade ytor
- demo-runtime som ser ut som live
- placeholders som hålls required
- runbooks som ser körbara ut men inte är portabla

## Hur duplicate/overlap identifieras

- samma sakområde i flera docs-kluster
- samma operativa scenario i flera runbooks
- samma capability med shadowing i runtime

## Hur prune-map byggs

1. inventera pathen
2. samla aktiv repo-evidens
3. ge reality-klass
4. ge åtgärdsstatus
5. dokumentera risk om kvar
6. ange exakt mål om `migrate`

## Hur supersession-map byggs

1. fastställ om pathen var gammal styrning
2. bestäm om innehållet ska migreras, arkiveras eller tas bort
3. peka på ny sanningskälla eller ny målfil
4. dokumentera varför gammal path inte längre får styra

## Vilka bevis som krävs innan något märks som archive/remove

- `archive` kräver att aktiv styrroll är avlägsnad och att historiskt värde fortfarande kan finnas
- `remove` kräver att aktiv import, script, test, docs-koppling och retentionrisk saknas

## Vilka risker som kräver mänsklig bedömning

- juridisk/retentionmässig borttagning av äldre operationsdokument
- exakt vilka gamla compliance-/policydokument som ska migreras in i senare domänlibraries i stället för att bara arkiveras
- när backoffice/public-web ska byggas som separata appar kontra sektioner i annan yta
