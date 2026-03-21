# BankID provider setup

Detta runbook beskriver exakt hur BankID/eID-provider sätts upp i sandbox och produktion, hur certifikat och hemligheter lagras, vilka callback-URL:er som används, hur testidentiteter hanteras och hur fel verifieras.

## Förutsättningar

- separat sandbox- och produktionsavtal eller tenant hos vald provider
- egna DNS-namn för staging och prod, till exempel `auth-staging.<domän>` och `auth.<domän>`
- AWS Secrets Manager, Cloudflare och applikationsmiljöer färdiga
- incident- och rollback-rutin beslutad innan produktionsaktivering

## Berörda system

- Signicat tenant i sandbox
- Signicat tenant i produktion
- produktens auth-broker/API
- AWS Secrets Manager och KMS
- Cloudflare DNS/WAF

## Steg för steg

### Skapa tenants och applikationer

1. Skapa separat Signicat-konto eller tenant för sandbox respektive produktion. Dela aldrig klient-id eller hemligheter mellan miljöer.
2. I varje tenant, skapa en applikation för autentisering och en separat konfiguration för signering om leverantören skiljer dessa åt.
3. Aktivera svensk BankID/eID-funktion i respektive tenant och märk resurserna med miljönamn.

### Konfigurera redirect- och callback-URL:er

1. Registrera endast miljöspecifika redirect-URL:er. Exempel: staging callback går till staging-domän och prod callback går till prod-domän.
2. Registrera även logout- och error-URL:er om leverantören kräver det.
3. Sätt strikt allowlist så att inga lokala eller gamla testdomäner finns kvar i produktion.

### Lagra hemligheter och certifikat

1. Lägg klient-id, klienthemlighet, webhook-hemlighet och eventuella signeringsnycklar i AWS Secrets Manager under namnschema `/erp/<env>/auth/<name>`.
2. Om provider kräver certifikat eller privata nycklar, lagra dem krypterat och exportera dem aldrig till repo eller chattloggar.
3. Ge endast applikationsrollen rätt att läsa de hemligheter som hör till dess miljö.

### Konfigurera auth-broker

1. Sätt provider alias `signicat-bankid` i auth-brokern.
2. Mappa externa claims till intern identitet: provider subject, assurance level, personidentitet när sådan tillåts, namn, signeringsstatus och tenant.
3. Aktivera step-up-policy för högriskactions så att färsk stark autentisering kan krävas även efter vanlig session.

### Konfigurera signering

1. Välj PAdES som standardformat för PDF-signering och definiera signeringsprofiler per use case, till exempel årsredovisning, close-signoff eller avtal.
2. Se till att signeringscallback går till separat endpoint från autentisering om leverantören rekommenderar detta.
3. Lagra provider transaction id och sign-paketets interna id i auditloggen.

### Testidentiteter och verifiering

1. Hämta leverantörens officiella sandbox-identiteter och lägg dem i separat QA-vault, aldrig i repo.
2. Verifiera minst: lyckad inloggning, avbruten inloggning, misslyckad legitimering, timeout, felaktig callback-signatur och återanvänd callback.
3. Verifiera även att signering skapar fullständig audit med signatör, tidsstempel och dokumenthash.

### Go-live

1. Rensa gamla test-redirects, rotera eventuella tillfälliga hemligheter och verifiera att prod använder egna secrets.
2. Kör smoke test med produktionskonfigurerad men internt begränsad användargrupp innan extern pilot släpps på.
3. Dokumentera tenant-id, ägare, renewal-datum och supportväg i secrets- och incidentrunbooks.

## Verifiering

- sandbox och prod använder olika client ids och olika callback-domäner
- stark autentisering fungerar från start till färdig intern session
- avbruten eller felaktig callback avvisas och loggas
- signering går att slutföra och validera med auditspår
- alla hemligheter finns i rätt namespace och är läsbara endast för rätt miljö

## Rollback och återställning

- disable provider i auth-broker och återgå till lokal admin-inloggning för intern support om produktionen blockeras
- rotera klienthemlighet om fel tenant eller fel callback råkat exponeras
- återställ föregående fungerande redirect-allowlist om ny konfiguration blockerar legitima användare

## Vanliga fel och felsökning

### Vanliga autentiseringsfel

- redirect mismatch: kontrollera exakt callback-URL och trailing slashes
- invalid client: kontrollera att rätt miljös hemlighet används
- timeout eller avbruten legitimering: verifiera användarflödet och att sessionen städas korrekt
- signaturfel i callback: kontrollera webhook-hemlighet, tidsstämplar och replay-skydd

### Miljöseparation

- om testidentitet fungerar i produktion är konfigurationen fel och måste omedelbart stoppas
- om staging och prod delar samma secret eller tenant ska båda miljöerna roteras och omprovisioneras

## Exit gate

- [ ] sandbox och prod är helt separerade
- [ ] callback-URL:er, hemligheter och signeringsprofiler är verifierade
- [ ] testidentiteter hanteras säkert utanför repo
- [ ] smoke tests för login och signering är gröna
- [ ] driftansvarig och renewal-datum är dokumenterade
