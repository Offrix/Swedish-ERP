# DOMAIN_02_ROADMAP

- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör lokal auth, MFA, step-up, passkeys, OIDC, SAML, sessioner, permissions, support reveal och high-risk access.
- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` styr alla delfaser i denna domän som rör secrets, key lineage, KMS, HSM, envelope encryption, rotation, decrypt boundaries och cryptographic evidence.

## mål

Göra säkerhetskärnan verklig, bank-grade och produktionsmässig genom att:

- ta bort all fake-live-auth
- göra secrets, sessioner, factors, callbacks och privileged access deterministiskt säkra
- binda permissions, company boundaries och trust levels till verklig runtime enforcement
- göra BankID, federation och passkeys antingen riktiga eller uttryckligen blockerade
- stoppa att senare domäner bygger vidare på falsk auth- och security-completeness

## varför domänen behövs

Om Domän 2 inte är hård:

- faller alla senare `strong_mfa`-krav i praktiken
- får support, migration, banking, payroll och GA fel säkerhetsgrund
- blir regulatoriska och juridiska identitetsanspråk falska
- blir providerintegreringar, callbacks och incidentevidence opålitliga

## faser

- Fas 2.1 security truth lock and fake-live demotion
- Fas 2.2 secret inventory and classification
- Fas 2.3 secret storage, import and export hardening
- Fas 2.4 KMS/HSM/envelope and artifact-integrity hardening
- Fas 2.5 login root, session root and transport hardening
- Fas 2.6 TOTP, device trust and fresh-trust hardening
- Fas 2.7 passkey hardening
- Fas 2.8 BankID hardening
- Fas 2.9 federation hardening
- Fas 2.10 callback, webhook and provider-boundary hardening
- Fas 2.11 permission, boundary and privileged-access enforcement
- Fas 2.12 audit, evidence and production security gate

## dependencies

- Fas 0 och Fas 1 måste vara låsta nog för att bära persistent security state och ärlig diagnostics
- extern KMS/HSM, riktiga BankID-/OIDC-/SAML-konton och riktiga credentials är externa blockerare när implementationen når live-integrationssteget
- ingen senare domän får märkas live-klar på `strong_mfa` innan Fas 2.11 är klar

## vad som får köras parallellt

- 2.1 kan köras parallellt med 2.2
- 2.2 kan köras parallellt med delar av 2.3
- 2.7, 2.8 och 2.9 kan förberedas parallellt efter att 2.5 och 2.6 har låst ny auth-root
- 2.10 kan påbörjas parallellt med 2.7-2.9 när environment-boundary-modellen är låst

## vad som inte får köras parallellt

- riktig providergo-live får inte påbörjas innan 2.4 är klar
- privileged access får inte märkas säker innan 2.11 är klar
- BankID, federation eller passkeys får inte märkas live innan 2.5-2.6 är klara
- callback-go-live får inte ske innan persistent replay-ledger finns

## delfaser

### Fas 2.1 Security Truth Lock And Fake-Live Demotion

#### markering

- rewrite

#### mål

- göra säkerhetsstatus ärlig i docs, diagnostics, seeds och routemetadata
- stoppa att stub/fake-live fortsätter presenteras som produktionsmässig capability

#### arbete

- märk passkeys, BankID och federation som `stub`, `fake-live` eller `partial` där det är sant
- sänk alla go-live-claims som bygger på gamla phase6-markeringar
- för in Domän 2-blockers i master-roadmapens globala blockerlista
- märk OCR-provider-callback som operator collect path, inte verklig provider-callback

#### dependencies

- inga

#### konkreta verifikationer

- varje auth-provider och faktor ska ha sann klassning i diagnostics
- docs får inte kalla BankID/federation/passkeys `production-ready`
- route-/capabilitystatus ska stämma med verklig runtime

#### konkreta tester

- test som läser diagnostics/capabilitystatus och verifierar att fake-live inte rapporteras som live
- test som failar om providerstatus i seed eller docs säger `real` trots stub-runtime

#### konkreta kontroller vi måste kunna utföra

- visa en lista över alla auth capabilities med sann status och verklig bevispath
- visa att go-live gate vägrar authcapabilities markerade som stub/fake-live

### Fas 2.2 Secret Inventory And Classification

#### markering

- harden

#### mål

- klassificera alla securitykritiska objekt, refs och nycklar
- få full täckning för auth-, provider-, callback-, webhook-, signing- och recovery-hemligheter

#### arbete

- bygg komplett secret register med typ, ägare, klass, tillåten lagring, exportpolicy, rotationspolicy och revokeringspolicy
- sök igenom repo efter `secret`, `token`, `key`, `client_secret`, `refresh_token`, `otp`, `privateKey`, `certificate`, `callbackToken`, `signingKey`
- kartlägg vilka objekt som får bära rå data, vilken data som måste vara `secretRef`, och vilken data som måste ligga i extern KMS/HSM
- dokumentera vilka hemligheter som är blockerade på externa konton och därför inte får fake-implementeras

#### dependencies

- 2.1

#### konkreta verifikationer

- varje secret-typ i runtime ska ha klassificeringspost
- inga oklassificerade secretbärare får finnas i produktionskod
- varje high-risk faktor, callback eller provider credential ska ha definierad rotationsägare

#### konkreta tester

- test som failar om ny secret-typ introduceras utan registry-post
- test som serialiserar authstate och verifierar frånvaro av S4/S5-material i klartext

#### konkreta kontroller vi måste kunna utföra

- generera maskinläsbar secret inventory utan luckor
- peka ut exakt rotations- och revokeringsplan per hemlighet

### Fas 2.3 Secret Storage, Import And Export Hardening

#### markering

- replace

#### mål

- stänga alla vägar där rå hemlighet kan återintroduceras i state, snapshot, export eller import

#### arbete

- ta bort fallback till rå `snapshot.authBroker`
- flytta legacy secret sealer ur runtime
- blockera osanerad import av gamla auth snapshots
- blockera export av höga säkerhetsklasser utan extern KMS/HSM och explicit policy
- gör enrollment-, callback- och providerresponses non-loggable

#### dependencies

- 2.2

#### konkreta verifikationer

- raw `authBroker` får inte längre accepteras i runtime
- legacy sealer får inte längre aktiveras via normal bootstrap
- exports får bara innehålla refs, fingerprints, key-versioner och maskad metadata

#### konkreta tester

- regressionstest som serialiserar state efter TOTP-enrollment, passkey-registration, BankID-start, federation-start, callback setup och break-glass
- negativt test som försöker importera gammal rå broker-snapshot och får hårt fel
- negativt test som försöker exportera hög säkerhetsklass utan extern KMS/HSM

#### konkreta kontroller vi måste kunna utföra

- jämföra export före/efter secret-bearing operation och se att rå hemlighet aldrig lämnar processen
- visa att gamla osanerade snapshots stoppas innan state laddas

### Fas 2.4 KMS/HSM/Envelope And Artifact-Integrity Hardening

#### markering

- replace

#### mål

- göra extern KMS/HSM till obligatorisk root-of-trust
- skydda snapshot-, evidence- och export-artifacts med riktig integritet

#### arbete

- hard-faila bootstrap i `protected`, `pilot_parallel` och `production` om `providerKind` inte är extern
- separera envelope-, blind-index-, signing/MAC- och webhook-signing-nycklar
- inför key-version i posture, audit, exports och diagnostics
- inför signerad eller MAC:ad integritet för snapshot- och evidence-artifacts
- inför rotationsmodell med `current`, `previous`, staged activation och revocation

#### dependencies

- 2.2

#### konkreta verifikationer

- protected startup ska stoppas utan extern KMS/HSM
- artifacts ska vara kryptografiskt integritetsskyddade
- nyckelversion ska kunna spåras på varje relevant secret- och artifact-path

#### konkreta tester

- startup-test som verifierar hårt fel utan extern KMS/HSM
- test för key-rotation med läsbar gammal ciphertext och ny skrivning på ny version
- test som manipulerar snapshot/evidence-byte och får integritetsfel

#### konkreta kontroller vi måste kunna utföra

- köra diagnostics och se `startupAllowed: false` med software-kms i skyddad miljö
- peka ut exakt KMS/HSM-alias per environment

### Fas 2.5 Login Root, Session Root And Transport Hardening

#### markering

- replace

#### mål

- ersätta nuvarande login-root och göra sessionskedjan säker mot fixation, theft och fel trusteskalering

#### arbete

- ersätt `companyId + email -> sessionToken` med kortlivad auth transaction
- skapa eller rotera sessiontoken först efter verifierad första faktor
- inför `issuedAt`, `lastUsedAt`, `idleExpiresAt`, `absoluteExpiresAt` och `rotationCounter`
- rotera token vid första faktor, step-up och privileged access
- förbjud `body.sessionToken` på auth-känsliga och high-risk-routes
- bind `x-forwarded-for` till trusted-proxy-regel

#### dependencies

- 2.3
- 2.4

#### konkreta verifikationer

- `/v1/auth/login` får inte längre returnera användbar session från ren identifierare
- gammalt token blir ogiltigt efter faktorcompletion eller step-up
- auth-känsliga routes accepterar endast bearer-token

#### konkreta tester

- negativt test för login utan första faktor
- positivt test för tokenrotation efter faktorcompletion
- negativt test för stulen pending auth-transaction efter idle timeout
- negativt test för sessiontoken i body

#### konkreta kontroller vi måste kunna utföra

- följa exakt när sessiontoken uppstår, roteras och revokeras
- simulera klockflytt och se att idle- och absolute-TTL verkställs

### Fas 2.6 TOTP, Device Trust And Fresh-Trust Hardening

#### markering

- harden

#### mål

- göra TOTP, recovery, device trust och action-class-bunden fresh trust robusta

#### arbete

- inför persistent replay-ledger för TOTP timestep/counter
- inför rate limits och lockout på konto-, faktor- och device-nivå i delad persistent state
- inför riktig device trust-record med TTL, revocation och step-up policy
- knyt fresh-trust till action class och TTL med hård runtime enforcement

#### dependencies

- 2.5

#### konkreta verifikationer

- samma TOTP-kod får inte kunna användas två gånger inom tillåtet fönster
- fresh trust måste löpa ut och kräva ny verifiering
- lockout måste överleva restart och flera instanser

#### konkreta tester

- negativt TOTP-replaytest
- lockouttest över flera försök och efter restart
- test som visar att expired fresh-trust blockerar high-risk-route

#### konkreta kontroller vi måste kunna utföra

- slå upp faktor, timestep och replay-state i persistent ledger
- visa att device trust kan revokeras och omedelbart stoppar privileged operations

### Fas 2.7 Passkey Hardening

#### markering

- replace

#### mål

- ersätta kosmetisk passkey-närvaro med riktig WebAuthn serververifiering

#### arbete

- verifiera challenge, RP ID, origin, authenticatorData, signatur, user verification och signCount
- spara bara publika verifieringsmetadata och refs
- inför challenge-ledger med en-gångs-konsumtion och expiry
- definiera exakt när passkey räknas som stark faktor i policy

#### dependencies

- 2.5
- 2.6
- 2.4

#### konkreta verifikationer

- syntetiska `passkey:<credentialId>`-strängar får aldrig accepteras
- challenge får bara konsumeras en gång
- signCount-regression eller clone-signal måste flaggas

#### konkreta tester

- negativt test med falsk assertionsträng
- negativt test med fel origin/RP ID
- negativt test med återanvänd challenge
- positivt test med verifierad WebAuthn assertion

#### konkreta kontroller vi måste kunna utföra

- visa verifieringsbeslut och orsaken till accept eller avslag utan att exponera rå kryptodata

### Fas 2.8 BankID Hardening

#### markering

- replace

#### mål

- byta ut lokal stub/fake-live mot riktig BankID-kedja via broker/provider

#### arbete

- ersätt lokal `orderRef`/`completionToken`-generering med verklig Signicat/BankID-provider
- bygg environment-isolerad credentialmodell och callback/poll-transkript
- bygg receiptmodell som binder identity proof, actor, sessionrotation och legal-effect-klassning
- blockera live-path om riktiga providerkonton, certifikat eller secrets saknas

#### dependencies

- 2.4
- 2.5
- 2.6

#### konkreta verifikationer

- `supportsLegalEffectInProduction` får inte vara `false` när capabilityn märks som verklig
- BankID-svar ska komma från riktig providerkedja, inte lokalt fabricerad token
- sessiontrust ska bara höjas efter verifierad providerrespons

#### konkreta tester

- negativt test med fabricerat `completionToken`
- negativt test med fel environment eller fel callback/transkript
- positivt integrationstest mot riktig sandbox när konto finns

#### konkreta kontroller vi måste kunna utföra

- visa exakt vilket providerkonto, vilken credential-set och vilket environment som användes
- visa bindningen mellan BankID-transkript och sessionrotation

### Fas 2.9 Federation Hardening

#### markering

- replace

#### mål

- ersätta lokal authorization-code-simulering med verklig OIDC/SAML-federation

#### arbete

- inför riktig authorization request med state och nonce
- inför riktig code exchange mot token endpoint
- verifiera issuer, audience, nonce, expiry, signing keys/JWKS och eventuella hashclaims
- inför SAML-validering där sådan provider används
- separera identitetsbevis från affärsrollsmappning

#### dependencies

- 2.4
- 2.5
- 2.6

#### konkreta verifikationer

- fel issuer, audience, nonce, state eller JWKS ska ge avslag
- lokalt genererad authorization code får inte fungera
- federation ska inte kunna skapa session utan verkligt identitetsbevis

#### konkreta tester

- negativt test för fel issuer
- negativt test för fel audience
- negativt test för gammal state/nonce
- positivt integrationstest mot riktig provider-sandbox när konto finns

#### konkreta kontroller vi måste kunna utföra

- visa exakt vilken issuer, vilket JWKS-set och vilken redirect-URL som användes
- visa separat mapping från federation identity till intern principal och bolagsroll

### Fas 2.10 Callback, Webhook And Provider-Boundary Hardening

#### markering

- rewrite

#### mål

- göra provider-, callback- och webhook-spåren robusta mot spoofing, replay och environment-blandning

#### arbete

- separera operatörs-collect-routes från riktiga provider-callback-routes
- inför verifieringsmetod per provider: signatur, token exchange, JWT/JWS, SAML eller verifierad poll
- inför persistent replay-ledger för callback delivery ids och tokens
- bind callback-domain, path, providerEnvironmentRef och credential-set till environment
- definiera vilka callbacks som får vara manuella operatorflöden och märk dem sanningsenligt

#### dependencies

- 2.4
- 2.8
- 2.9

#### konkreta verifikationer

- callback från fel environment måste avvisas
- replay av samma delivery-id eller token måste blockeras
- OCR-provider-callback får inte längre låtsas vara extern provider route om den i praktiken är manuell collect

#### konkreta tester

- negativt replaytest på callback-delivery
- negativt test för fel callback-signatur
- negativt test för fel environment
- positivt test för signerad eller verifierad callback från riktig provider/sandbox

#### konkreta kontroller vi måste kunna utföra

- visa callback-verifieringskedjan och replay-state per provider
- lista alla callback-routes och deras verkliga verifieringsmetod

### Fas 2.11 Permission, Boundary And Privileged-Access Enforcement

#### markering

- replace

#### mål

- göra route contracts till verklig enforcement och stoppa för låg trust på high-risk-routes

#### arbete

- bygg central authz-gate före handlern som kombinerar:
  - principal
  - company boundary
  - permission
  - requiredTrustLevel
  - action class
  - fresh-trust
  - privileged session allowlist
- gör samma gate obligatorisk för impersonation, break-glass, access reviews och high-risk business writes
- blockera TOTP-only-approvers där policy kräver starkare faktor
- bind support/backoffice-routes till striktare trust än vanlig `company.manage`

#### dependencies

- 2.5
- 2.6
- 2.7
- 2.8
- 2.9

#### konkreta verifikationer

- varje route med `requiredTrustLevel` måste verkställas i runtime, inte bara i metadata
- rätt permission med fel trust ska ge avslag
- rätt trust med fel company boundary ska ge avslag
- privileged approvals ska kräva fresh strong trust där policy säger det

#### konkreta tester

- negativt test: TOTP-only-session får inte starta impersonation
- negativt test: session med rätt permission men fel trust får inte köra high-risk-route
- negativt test: session med rätt trust men fel bolag får inte nå objektet
- positivt test: riktig stark session får godkänd route när alla krav möts

#### konkreta kontroller vi måste kunna utföra

- fråga `/v1/authz/check` och verklig route med samma input och få samma beslut
- kunna spåra exakt varför en route avslogs eller godtogs

### Fas 2.12 Audit, Evidence And Production Security Gate

#### markering

- harden

#### mål

- göra securitykedjan driftbar, incidentbar och bevisbar

#### arbete

- inför signerad evidencekedja för securitykritiska events
- inför auditklassning för factor enrollment, factor verify, session revoke, provider callback, credential change, key rotation, impersonation och break-glass
- inför produktionsgate som blockerar live om:
  - extern KMS/HSM saknas
  - fake-live-provider finns kvar
  - route-trust enforcement inte är central
  - persistent replay-/lockout-state saknas
- dokumentera exakta externa blockerare där mänskliga konton/credentials krävs

#### dependencies

- 2.4 till 2.11

#### konkreta verifikationer

- security evidence måste vara signerad eller MAC:ad
- auditkedjan måste vara tillräcklig för incidentutredning
- production gate måste hårt vägra live om öppna critical blockers finns

#### konkreta tester

- test som verifierar signerad evidence-integritet
- test som verifierar att production diagnostics blockar unsafe startup
- test som verifierar att security-critical route inte kan märkas live med stub-provider aktiv

#### konkreta kontroller vi måste kunna utföra

- generera security readiness-rapport med exakt blockerlista
- visa full auditkedja för en verifierad high-risk operation från auth till receipt

## exit gates

- ingen användbar session skapas före verifierad första faktor
- protected runtime hard-failar utan extern KMS/HSM
- TOTP har replay-ledger
- passkeys är riktig WebAuthn eller uttryckligen inte-live
- BankID är riktig providerkedja eller uttryckligen inte-live
- federation är riktig providerkedja eller uttryckligen inte-live
- callbacks och webhooks har riktig verifiering och replay-skydd
- route contracts verkställs centralt på riktiga routes
- impersonation och break-glass kräver verklig strong trust där policy kräver det

## test gates

- green path, fail path och replay path måste finnas för sessions, factors och callbacks
- environment-blocked tester får inte tolkas som gröna; de ska märkas och tas vidare som blockerare om de bär livekrav
- inga authclaims får byggas på bara testsource utan minst en verklig runtime-path eller explicita externa blockerare

## security gates

- inga S4/S5-hemligheter i state, snapshots, logs eller exports
- inga software-kms-fallbacks i skyddad drift
- inga fake-live-claims kvar i diagnostics eller docs

## secret-handling gates

- secret inventory komplett
- legacy broker fallback borttagen
- legacy sealer bort från normal runtime

## identity-provider gates

- passkey, BankID och federation får inte märkas live utan verkliga verifieringskedjor
- alla externa providerkonton och credentials ska vara explicita blockerare tills de finns

## callback/webhook gates

- replay-ledger persistent
- signatur eller motsvarande verifieringsmetod verklig
- callback-domäner bundna till rätt environment

## permission/audit gates

- central route-enforcement aktiv
- privileged approvals kräver rätt trust
- audit/evidence signerad eller MAC:ad där policy kräver det

## markeringar: keep / harden / rewrite / replace / migrate / archive / remove

- keep:
  - secret stripping
  - blind-indexad sessionhash
  - backoffice SoD-logik
  - grundläggande lockout/fresh-trust-motor
- harden:
  - TOTP
  - tokentransport
  - IP/proxy-hantering
  - device trust
  - audit/evidence
  - provider environment isolation
- rewrite:
  - fake-live-status
  - callback/webhook boundary model
  - trustmodel för `strong_mfa`
- replace:
  - login-root
  - central route-enforcement
  - KMS/HSM fallbackmodell
  - passkey runtime
  - BankID runtime
  - federation runtime
  - persistent security state
- migrate:
  - legacy secret sealer
  - rå `snapshot.authBroker`
- archive:
  - gamla claims om live BankID/federation/passkeys när de ersätts av sann rebuild-dokumentation
- remove:
  - inga borttagningar får göras utan att motsvarande nya security-path är på plats
