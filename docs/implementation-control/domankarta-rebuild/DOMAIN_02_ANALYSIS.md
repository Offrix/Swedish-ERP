# DOMAIN_02_ANALYSIS

## Scope

Domän 2 omfattar den faktiska säkerhetskedjan för:

- secrets, KMS, HSM och envelope-crypto
- login, sessioner, trust levels och step-up
- TOTP, passkeys, BankID och federation
- company boundaries, permissions, impersonation och break-glass
- callback-, webhook- och providerhemligheter
- audit, evidence och security-signaler

Verifieringen bygger på:

- prompt 2
- gamla `DOMAIN_02_ANALYSIS.md`
- gamla `DOMAIN_02_ROADMAP.md`
- gamla `DOMAIN_02_IMPLEMENTATION_LIBRARY.md`
- faktisk runtime i `apps/api/src/*`, `packages/auth-core/*`, `packages/domain-org-auth/*`, `packages/domain-core/*`, `packages/domain-integrations/*`
- faktiska tester i `tests/unit/*`, `tests/integration/*`, `tests/e2e/*`
- officiella källor för NIST SP 800-63B, RFC 6238, WebAuthn Level 3, OpenID Connect Core, AWS KMS, Signicat BankID och WorkOS SSO

Miljöstatus för testkörning:

- flera auth-/integrationstester kunde inte köras i denna miljö på grund av `spawn EPERM`
- detta klassas som `environment-blocked`
- kod, route-wiring och testsource användes därför som primär evidens

## Verified Reality

- sessiontoken lagras inte rått i sessionsstate; runtime använder blind-indexad tokenhash i `packages/domain-org-auth/src/index.mjs:338-341` och `1056-1058`
- authfaktorer och brokers har verklig secret-store-modell; publika svar strippar `secret`, `secretRef`, `publicKey` och `publicKeyRef` i `packages/domain-org-auth/src/index.mjs:5095-5122`
- lockout-, rate-limit-, fresh-trust- och recovery-mekanismer finns i runtime och i tester, särskilt `tests/unit/phase6-auth-hardening.test.mjs` och `tests/integration/phase6-auth-hardening-api.test.mjs`
- backoffice-domänen har verklig SoD-logik för impersonation, dual approval och break-glass-scope i `packages/domain-core/src/backoffice.mjs`
- utgående webhook-signering med HMAC och replay-fönster finns i `packages/domain-integrations/src/public-api.mjs:1466-1510`

## Partial Reality

- KMS/HSM/envelope finns som modell och adapter, men protected runtime hard-failar inte när extern KMS saknas
- sessiontrust, route contracts och trustnivåer finns, men central enforcement på verkliga routes saknas
- TOTP är verklig faktor, men saknar single-use/replay-ledger
- BankID och federation ser produktionslika ut i API och tester, men providerkedjan är fortfarande stub/fake-live
- passkeys finns i schema och API men assertion-verifieringen är inte riktig WebAuthn
- callback- och providerisolering finns i vissa spår men är inte konsekvent verifierad eller signerad

## Legacy

- legacy secret sealer finns kvar i `packages/domain-org-auth/src/index.mjs:5164-5196`
- legacy fallback till rå `snapshot.authBroker` finns kvar i `packages/domain-org-auth/src/index.mjs:5233-5257`
- software-kms som fallback är fortfarande faktisk runtime, inte bara migrationsstöd
- demo-TOTP/BankID-subjects och seeded auth-material finns i runtime-paketet

## Dead Code

Ingen auth-kritisk funktion kunde med hög säkerhet klassas som helt dead utan risk för falsk negativ. Däremot finns kod som ger falsk styrka utan att bära live-pathen:

- route contracts bär `requiredTrustLevel`, men den kontrollen används verifierat i `/v1/authz/check`, inte som central gate för alla riktiga mutationsroutes
- callbackprofiler och edge-profiler finns, men inkommande OCR-provider-callback är fortfarande användarautentiserad JSON-route och inte riktig providerverifiering

## Misleading / False Completeness

### D2-F001
- severity: critical
- kategori: false completeness / route enforcement
- exakt problem: route contracts kräver `strong_mfa` på många high-risk-routes, men faktisk route-kod använder i praktiken bara `authorizeCompanyAccess(...)`, som i sin tur bara utvärderar permissions
- varför det är farligt: systemet ser policyhårt ut i metadata samtidigt som verkliga writes kan nås med för låg trustnivå
- exakt filepath: `apps/api/src/route-contracts.mjs`, `apps/api/src/route-helpers.mjs`, `apps/api/src/phase14-backoffice-routes.mjs`, `apps/api/src/server.mjs`
- radreferens om möjligt: `route-contracts.mjs:265-288`, `route-helpers.mjs:214-240`, `server.mjs:1644-1715`
- rekommenderad riktning: bygg central authz-middleware som alltid verkställer `permission + company boundary + requiredTrustLevel + action class + fresh trust`
- status: rewrite

### D2-F002
- severity: high
- kategori: misleading provider realism
- exakt problem: BankID, federation och passkeys ser produktionslika ut i routes, tests och docs, men runtimekedjan accepterar syntetiska tokens och lokalt genererade providerresultat
- varför det är farligt: teamet kan tro att juridiskt stark identitet, WebAuthn och federation redan är live-redo
- exakt filepath: `packages/domain-integrations/src/providers/signicat-bankid.mjs`, `packages/domain-integrations/src/providers/workos-federation.mjs`, `packages/domain-org-auth/src/index.mjs`, `tests/integration/phase6-auth-hardening-api.test.mjs`
- radreferens om möjligt: `signicat-bankid.mjs:25`, `workos-federation.mjs:28`, `index.mjs:1534-1560`, `phase6-auth-hardening-api.test.mjs:244-295`
- rekommenderad riktning: märk capabilities som `stub` eller `fake-live` tills verkliga externa verifieringskedjor finns
- status: rewrite

## Secret Handling Findings

### D2-F003
- severity: high
- kategori: secret handling
- exakt problem: `readBrokerSnapshotFromDurableState(...)` kan fortfarande läsa rå `snapshot.authBroker` om secretRef saknas
- varför det är farligt: osanerade snapshots eller äldre exports kan återintroducera rå broker-state i vanlig domänstate
- exakt filepath: `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `5233-5257`
- rekommenderad riktning: ta bort fallback till rå snapshot och kräv migrerad secretRef-path
- status: migrate

### D2-F004
- severity: high
- kategori: legacy secret sealing
- exakt problem: legacy secret sealer härleder AES-nyckel direkt från apphemlighet via SHA-256 i applikationsprocessen
- varför det är farligt: root-of-trust ligger i appkonfiguration i stället för i extern KMS/HSM
- exakt filepath: `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `5164-5196`
- rekommenderad riktning: avveckla legacy sealer ur runtime; använd den endast i explicit offline-migration om den måste finnas kvar alls
- status: migrate

### D2-F005
- severity: medium
- kategori: seeded secrets
- exakt problem: demo-TOTP-hemligheter och demo-BankID-subjects finns hårdkodade i auth-paketet
- varför det är farligt: produktionspaketet bär med sig förutsägbara authfaktorer och demoidentiteter
- exakt filepath: `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `152-155`, `4405-4550`
- rekommenderad riktning: flytta all demoauth till strikt test/demo-artefakt utanför produktionsruntime
- status: harden

## Encryption / KMS / HSM Findings

### D2-F006
- severity: critical
- kategori: KMS/HSM/envelope
- exakt problem: `createConfiguredSecretStore(...)` försöker använda AWS KMS-backed runtime men faller tillbaka till software-kms om extern konfiguration saknas
- varför det är farligt: protected/pilot_parallel/production kan starta utan extern root-of-trust trots bank-grade-krav
- exakt filepath: `packages/domain-core/src/secret-runtime.mjs`, `packages/domain-core/src/secrets.mjs`
- radreferens om möjligt: `secret-runtime.mjs:172-198`, `secrets.mjs:97-136`
- rekommenderad riktning: hard-faila bootstrap i skyddade lägen om providerKind inte är extern KMS/HSM
- status: replace

### D2-F007
- severity: medium
- kategori: artifact integrity
- exakt problem: snapshot-artifacts skyddas med checksumma men inte med signerad eller MAC:ad autenticitet
- varför det är farligt: en angripare kan skriva om artifact och sedan räkna om checksumma utan att upptäckas
- exakt filepath: `packages/domain-core/src/state-snapshots.mjs`
- radreferens om möjligt: `97-98`, `148-152`, `238`
- rekommenderad riktning: signera eller MAC:a snapshot- och evidence-artifacts med separat integrity-nyckel
- status: harden

## Data At Rest Findings

### D2-F008
- severity: critical
- kategori: durable security state
- exakt problem: security runtime håller lockouts, failure series och riskobjekt i processlokala `Map`-strukturer; plattformen defaultar fortfarande critical security state till memory
- varför det är farligt: lockout, callback replay-ledger och incidentindikatorer blir inkonsistenta över instanser och efter restart
- exakt filepath: `packages/domain-core/src/security-runtime.mjs`, `apps/api/src/platform.mjs`
- radreferens om möjligt: `security-runtime.mjs:14-22`, `platform.mjs:1712-1724`
- rekommenderad riktning: gör delad persistent critical security state obligatorisk utanför ren test/demo
- status: replace

### D2-F009
- severity: medium
- kategori: secret export
- exakt problem: secret bundles kan exporteras även när runtime fortfarande är software-kms
- varför det är farligt: exports kan se produktionsmässiga ut trots att lagringsroten inte uppfyller bank-grade-krav
- exakt filepath: `packages/domain-core/src/secrets.mjs`
- radreferens om möjligt: `252-266`
- rekommenderad riktning: blockera export av höga säkerhetsklasser utan extern KMS/HSM och signerad exportpolicy
- status: harden

## Data In Transit Findings

### D2-F010
- severity: medium
- kategori: token transport
- exakt problem: `readSessionToken(...)` accepterar bearer-token eller `body.sessionToken`
- varför det är farligt: sessiontoken i JSON-body riskerar läckage via klientloggar, proxyloggar och debug dumps
- exakt filepath: `apps/api/src/route-helpers.mjs`
- radreferens om möjligt: `202-203`
- rekommenderad riktning: tillåt endast `Authorization: Bearer` på auth-känsliga och high-risk-routes
- status: harden

### D2-F011
- severity: medium
- kategori: proxy trust boundary
- exakt problem: `readClientAddress(...)` litar på första `x-forwarded-for` utan explicit trusted-proxy-kedja
- varför det är farligt: IP-baserad rate limit, risk scoring och audit kan spoofas
- exakt filepath: `apps/api/src/route-helpers.mjs`
- radreferens om möjligt: `206-211`
- rekommenderad riktning: bind headerupplösning till explicit trusted-proxy-lista och använd socket-adress annars
- status: harden

## Sensitive Runtime / Export / Log Handling Findings

### D2-F012
- severity: medium
- kategori: non-loggable handling
- exakt problem: TOTP-enrollment måste returnera rå secret och `otpauth://` till klienten, men runtime har ingen verifierad central non-loggable-markering för dessa responses
- varför det är farligt: hemligheten kan hamna i access logs, debug tooling eller support-exporter
- exakt filepath: `packages/domain-org-auth/src/index.mjs`, `apps/api/src/server.mjs`
- radreferens om möjligt: `index.mjs:1175-1217`, `server.mjs:1378-1395`
- rekommenderad riktning: märk enrollment-responses och provider-credential-responses som explicit non-loggable och blockera dem från standarddiagnostik
- status: harden

## Auth Flow Findings

### D2-F013
- severity: critical
- kategori: first-factor root
- exakt problem: `startLogin(...)` skapar pending session och returnerar `sessionToken` redan från `companyId + email`, innan verifierad första faktor
- varför det är farligt: auth-rooten bygger identitetssession på identifierare i stället för proof-of-possession
- exakt filepath: `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `955-1092`
- rekommenderad riktning: ersätt login-rooten med kortlivad auth transaction; sessiontoken får först skapas eller roteras efter verifierad första faktor
- status: replace

### D2-F014
- severity: high
- kategori: trust model drift
- exakt problem: `resolveSessionTrustLevel(...)` ger i praktiken `strong_mfa` bara när `amr` innehåller minst två faktorer och en av dem är `bankid`
- varför det är farligt: passkeys med user verification eller stark federation kan inte bli first-class stark faktor, samtidigt som BankID-fake-live blir överprivilegierad
- exakt filepath: `packages/auth-core/src/index.mjs`
- radreferens om möjligt: `139-152`
- rekommenderad riktning: definiera policy-driven trustklassificering per faktor, verifieringsstyrka och legal effect, inte hårdkodad BankID-specialregel
- status: rewrite

## Session / Challenge Findings

### D2-F015
- severity: high
- kategori: session lifetime
- exakt problem: sessionaktivitet kontrollerar `status` och `expiresAt`, men har ingen verifierad idle timeout / inactivity timeout
- varför det är farligt: stulna sessioner kan leva för länge trots inaktivitet
- exakt filepath: `packages/auth-core/src/index.mjs`
- radreferens om möjligt: `209-217`
- rekommenderad riktning: inför `lastUsedAt`, `idleExpiresAt`, absolut TTL och rotation vid trusteskalering
- status: harden

### D2-F016
- severity: high
- kategori: challenge/session binding
- exakt problem: flera verifieringsflöden använder `requireSession(... allowPending:true)` och accepterar pending session som auth-root
- varför det är farligt: pending session blir i praktiken en användbar auth-bärare i flera steg
- exakt filepath: `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `1236-1270`, `1534-1560`, `1873-1890`, `2846-2865`
- rekommenderad riktning: separera auth transaction från användbar session och rotera token när faktor verifieras
- status: replace

## BankID / Federation / Passkey / TOTP Findings

### D2-F017
- severity: critical
- kategori: passkey / WebAuthn
- exakt problem: passkey assertion verifieras genom strängjämförelse mot `passkey:<credentialId>` i stället för riktig WebAuthn-kedja
- varför det är farligt: det finns inget challenge-, origin-, RP ID-, signatur- eller signCount-skydd
- exakt filepath: `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `1534-1560`
- rekommenderad riktning: implementera full serververifiering av WebAuthn Level 3
- status: replace

### D2-F018
- severity: high
- kategori: TOTP replay
- exakt problem: `verifyTotpCode(...)` verifierar tidsfönster men registrerar inte använd timestep eller one-time-consumption
- varför det är farligt: samma kod kan återanvändas inom fönstret
- exakt filepath: `packages/auth-core/src/index.mjs`, `packages/domain-org-auth/src/index.mjs`
- radreferens om möjligt: `auth-core/src/index.mjs:277-285`, `domain-org-auth/src/index.mjs:1236-1270`
- rekommenderad riktning: bygg persistent replay-ledger per faktor och timestep/counter
- status: harden

### D2-F019
- severity: critical
- kategori: BankID provider realism
- exakt problem: Signicat-BankID-providern är explicit märkt `supportsLegalEffectInProduction: false` och fabricerar lokala `orderRef`, `completionToken` och QR-data
- varför det är farligt: juridiskt stark identitet ser live ut men är fortfarande lokal stub
- exakt filepath: `packages/domain-integrations/src/providers/signicat-bankid.mjs`
- radreferens om möjligt: `25`, `34-107`
- rekommenderad riktning: ersätt med verklig Signicat/BankID-kedja och märk nuvarande spår som stub tills riktiga credentials finns
- status: replace

### D2-F020
- severity: critical
- kategori: federation realism
- exakt problem: WorkOS-federation fabricerar lokala `state` och `authorizationCode` och verifierar bara lokal likhet, inte riktiga OIDC/SAML-assertions
- varför det är farligt: federation ser produktionsmässig ut men har ingen riktig issuer-, audience-, nonce-, token- eller JWKS-validering
- exakt filepath: `packages/domain-integrations/src/providers/workos-federation.mjs`
- radreferens om möjligt: `28`, `55-139`
- rekommenderad riktning: ersätt med riktig OIDC/SAML-flow mot provider och verifiera alla standardkrav
- status: replace

## Provider / Callback / Webhook Findings

### D2-F021
- severity: high
- kategori: fake provider callback
- exakt problem: OCR-provider-callback är i praktiken en användarautentiserad route som kräver `sessionToken`, `companyId`, `company.manage` och `callbackToken` i JSON-body
- varför det är farligt: detta är inte en riktig provider-callback-yta och skyddar inte mot samma hotmodell som externa providers
- exakt filepath: `apps/api/src/server.mjs`, `apps/api/src/route-contracts.mjs`, `packages/domain-integrations/src/providers/google-document-ai.mjs`
- radreferens om möjligt: `server.mjs:2865-2886`, `server.mjs:20130-20139`, `route-contracts.mjs:322`, `google-document-ai.mjs:178-220`
- rekommenderad riktning: separera riktiga providers från operatörs-collect-routes och kräv signatur/token exchange/replay-ledger per provider
- status: rewrite

### D2-F022
- severity: medium
- kategori: provider environment isolation
- exakt problem: providerprofiler och callback-domäner finns som metadata, men det finns ingen verifierad central regel som blockerar cross-environment callback-domäner eller credential-set-förväxling
- varför det är farligt: test-, pilot- och produktionsidentiteter kan blandas om fel providerkonfiguration går live
- exakt filepath: `packages/domain-tenant-control/src/index.mjs`, `packages/domain-integrations/src/providers/*.mjs`
- radreferens om möjligt: `domain-tenant-control/src/index.mjs:6965-6966`
- rekommenderad riktning: bygg environment-bound provider registry med explicit `providerEnvironmentRef`, callback-domain allowlist och credential-set binding
- status: harden

## Permission / Boundary Findings

### D2-F023
- severity: critical
- kategori: permission / trust coupling
- exakt problem: high-risk-routes över hela API:t annonserar `strong_mfa` i route contracts, men routinglagret verkställer inte detta generellt
- varför det är farligt: privileged mutationer i flera domäner kan nås med rätt permission men för låg trust
- exakt filepath: `apps/api/src/route-contracts.mjs`, `apps/api/src/route-helpers.mjs`, `apps/api/src/server.mjs`
- radreferens om möjligt: `route-contracts.mjs:202-420`, `route-helpers.mjs:214-240`, `server.mjs:1644-1715`
- rekommenderad riktning: centralisera route enforcement före domänhandlern och gör metadata till faktisk gate
- status: replace

## Impersonation / Break-Glass Findings

### D2-F024
- severity: high
- kategori: privileged access
- exakt problem: backoffice-domänens SoD-logik finns, men route-lagret tillåter verifierat TOTP-only-approvers i tester eftersom strong_mfa inte verkställs centralt
- varför det är farligt: dual approval och break-glass-policy ser starka ut i domänkoden men kan kringgås via för låg faktorstyrka
- exakt filepath: `tests/helpers/api-helpers.mjs`, `tests/integration/phase14-security-api.test.mjs`, `apps/api/src/phase14-backoffice-routes.mjs`
- radreferens om möjligt: `api-helpers.mjs:4-31`, `phase14-security-api.test.mjs:19-43`, `phase14-backoffice-routes.mjs:218-364`
- rekommenderad riktning: gör privileged approvals beroende av verklig `strong_mfa` med fresh-trust och action-class
- status: harden

## Audit / Evidence Findings

### D2-F025
- severity: medium
- kategori: evidence integrity
- exakt problem: audit- och evidencekedjan finns men snapshot/evidence-integriteten är inte signerad, och providerverifiering saknas i flera authflöden
- varför det är farligt: incidentutredning kan luta på artifacts som inte är kryptografiskt bevisbara
- exakt filepath: `packages/domain-core/src/state-snapshots.mjs`, `packages/domain-org-auth/src/index.mjs`, `packages/domain-integrations/src/providers/*.mjs`
- radreferens om möjligt: `state-snapshots.mjs:148-152`
- rekommenderad riktning: signera securitykritiska evidence-artifacts och bind providertranskript till immutable receipts
- status: harden

## Stub / Fake-Live / Partial / Real Classification Matrix

| capability | actual class | proof |
|---|---|---|
| secret refs / secret stripping | verified reality | `packages/domain-org-auth/src/index.mjs:3218-3382, 5095-5122` |
| external KMS/HSM in protected runtime | partial reality | `packages/domain-core/src/secret-runtime.mjs:172-198`, `packages/domain-core/src/secrets.mjs:97-136` |
| TOTP factor | partial reality | `packages/auth-core/src/index.mjs:277-285` |
| passkey assertion | fake-live | `packages/domain-org-auth/src/index.mjs:1534-1560` |
| BankID | stub / fake-live | `packages/domain-integrations/src/providers/signicat-bankid.mjs:25-107` |
| federation / OIDC / SAML | stub / fake-live | `packages/domain-integrations/src/providers/workos-federation.mjs:28-139` |
| route contract trust enforcement | misleading / partial | `apps/api/src/server.mjs:1644-1715`, `apps/api/src/route-helpers.mjs:214-240` |
| impersonation / break-glass domain logic | verified reality | `packages/domain-core/src/backoffice.mjs` |

## Concrete Security Verification Matrix

| capability | actual runtime path | official source used where needed | status |
|---|---|---|---|
| session lifecycle | `packages/auth-core/src/index.mjs`, `packages/domain-org-auth/src/index.mjs` | NIST SP 800-63B | partial reality |
| TOTP | `packages/auth-core/src/index.mjs:277-285` | RFC 6238 | partial reality |
| passkeys | `packages/domain-org-auth/src/index.mjs:1411-1560` | W3C WebAuthn Level 3 | fake-live |
| federation | `packages/domain-integrations/src/providers/workos-federation.mjs` | OpenID Connect Core, WorkOS docs | fake-live |
| BankID | `packages/domain-integrations/src/providers/signicat-bankid.mjs` | Signicat BankID docs | fake-live |
| KMS / envelope | `packages/domain-core/src/secret-runtime.mjs`, `packages/domain-core/src/secrets.mjs` | AWS KMS docs | partial reality |
| privileged route trust | `apps/api/src/route-contracts.mjs`, `apps/api/src/route-helpers.mjs`, `apps/api/src/server.mjs` | NIST SP 800-63B | misleading |

## Obligatory Answers

- Är allt som måste krypteras faktiskt krypterat: nej
- Är allt som borde ligga som secret ref faktiskt lyft ur vanlig state/snapshot: nej, legacy `snapshot.authBroker`-fallback finns kvar
- Är KMS/HSM/envelope encryption verklig, delvis eller bara modell: delvis verklig, men inte obligatorisk
- Är BankID verklig runtime, partial, fake-live eller stub: stub/fake-live
- Är federation/SAML/OIDC verklig runtime, partial, fake-live eller stub: stub/fake-live
- Är passkeys korrekt implementerade eller bara kosmetiskt närvarande: kosmetiskt/fake-live
- Är TOTP säkert hanterat: delvis; secret handling och lockout finns, replayskydd saknas
- Är sessioner säkra mot replay, fixation, theft och felaktig trust escalation: nej
- Finns rate limiting, lockout och attackskydd där det behövs: delvis
- Är company boundaries och permissions konsekventa över alla auth-känsliga ytor: nej
- Är impersonation och break-glass korrekt begränsade och auditade: domänlogiken ja, route enforcement nej
- Har support/backoffice för bred åtkomst: ja, i praktiken genom utebliven strong_mfa-enforcement
- Läcker securityklassad data i logs, snapshots, exports eller evidence: delvis risk; enrollment/callback/export-spår är inte fullhårdade
- Är webhook- och callback-verifiering verklig och robust: nej, inte konsekvent
- Är provider credentials och environment-isolation säkert hanterade: delvis
- Vilka säkerhetsbrister blockerar go-live för hela produkten: fake-live identitetsproviders, falsk trust-enforcement, software-kms-fallback, minnesbaserad lockout/replay-state och osäker auth-root

## Critical Findings

- D2-F001 route contracts verkställs inte som faktisk trust-gate
- D2-F006 protected runtime kräver inte extern KMS/HSM
- D2-F008 securitykritisk state ligger i memory
- D2-F013 login skapar pending session före verifierad första faktor
- D2-F017 passkey assertion är inte riktig WebAuthn
- D2-F019 BankID är stub/fake-live
- D2-F020 federation är stub/fake-live
- D2-F023 high-risk-routes saknar central `permission + trust + action class`-enforcement

## High Findings

- D2-F003 rå authBroker-fallback i snapshotimport
- D2-F004 legacy secret sealer med apphärledd nyckel
- D2-F014 trustmodell hårdkodar BankID som stark faktor
- D2-F015 ingen verifierad idle timeout
- D2-F016 pending session används som auth-bärare
- D2-F018 TOTP saknar replay-ledger
- D2-F021 OCR callback-route är inte riktig provider-callback
- D2-F024 privileged approvals kan i praktiken ske utan riktig strong_mfa

## Medium Findings

- D2-F005 hårdkodade demohemligheter i produktionspaket
- D2-F007 snapshot/evidence saknar signerad integritet
- D2-F009 secret export utan extern KMS-garanti
- D2-F010 sessiontoken i request body
- D2-F011 blind `x-forwarded-for`
- D2-F012 enrollment responses saknar verifierad non-loggable-gate
- D2-F022 environment-isolering för providers är inte hårt bevisad
- D2-F025 evidence-integriteten är inte kryptografiskt stark nog

## Low Findings

- Verified reality-spåren behöver breddas med fler regressionstester innan de får märkas produktionsmässiga

## Cross-Domain Blockers

- Domän 1 blockerar här: canonical runtime och persistent stores är ännu inte helt härdade
- alla senare domäner som kräver `strong_mfa` är idag falskt gröna tills Domän 2 route enforcement är verklig
- migration, payroll, banking, support och GA-domäner är beroende av att identitet och trustnivåer blir verkliga

## Go-Live Blockers

- ingen verklig extern KMS/HSM är obligatorisk i protected runtime
- BankID är inte verklig integration
- federation är inte verklig integration
- passkeys är inte verklig WebAuthn
- auth-rooten bygger session på `companyId + email`
- high-risk-routes verkställer inte deklarerad trustnivå centralt
- persistent replay-/lockout-/callback-state saknas i delad durable store

## Repo Reality Vs Intended Security Model

Repo:t har byggt en ganska stor säkerhetsyta, men den är fortfarande splittrad i tre lager:

- ett verkligt lager med secret refs, blind-indexade sessiontoken, lockouts, SoD-logik och viss webhook-signering
- ett partial-lager med sessiontrust, fresh-trust, KMS-adapter och security posture
- ett falskt produktionslager där passkeys, BankID, federation och route-trust ser mycket mer verkliga ut än de är

Det innebär att Domän 2 idag ska klassas som:

- total klassning: `partial reality`
- protected/live-klassning: `not go-live safe`

## Officiella källor

- NIST SP 800-63B: [nist.gov](https://www.nist.gov/publications/digital-identity-guidelines-authentication-and-lifecycle-management)
- RFC 6238: [IETF](https://datatracker.ietf.org/doc/html/rfc6238)
- WebAuthn Level 3: [W3C](https://www.w3.org/TR/webauthn-3/)
- OpenID Connect Core 1.0: [openid.net](https://openid.net/specs/openid-connect-core-1_0-18.html)
- AWS KMS: [AWS KMS concepts](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html)
- Signicat BankID: [developer.signicat.com](https://developer.signicat.com/)
- WorkOS SSO: [workos.com/docs/sso](https://workos.com/docs/sso)
