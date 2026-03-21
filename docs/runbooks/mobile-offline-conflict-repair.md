# Mobile offline conflict repair

## Syfte

Detta runbook beskriver hur offlinekö, synkfel, konflikter och dubblettskapande i mobil- eller offline-klient repareras utan att användarens arbete tyst går förlorat.

## När den används

- när offline-redigerbart objekt fastnar i `pending_sync`, `sync_failed` eller `conflict`
- när lokalt skapade objekt inte blir serverobjekt eller skapar dubletter
- när användare rapporterar att lokal version skiljer sig från serverversion
- efter app-release som ändrat syncschema eller merge-regler

## Förkrav

1. Support eller operatör ska ha ärende-ID och tillgång till syncdiagnostik.
2. Berörd klientversion, användare, enhet och tenant ska vara identifierad.
3. Det ska vara känt om objektstypen är tillåten för offline-redigering.
4. För reglerade objekt ska det vara klarlagt om klienten endast får spara utkast eller full action.

## Steg för steg

1. Samla in fakta.
   - klientversion, enhets-id, lokal queue-längd, senaste sync-tid, objekt-id och lokal operation-logg
   - om möjligt export av lokalt diagnospaket utan att samla onödig persondata
2. Klassificera problemet.
   - `local_stuck`: operation ligger kvar utan försök
   - `retry_loop`: samma operation faller om och om igen
   - `conflict_detected`: serverversion och lokal version divergerar
   - `duplicate_created`: samma avsikt skapade flera serverobjekt
   - `unsupported_offline_action`: klient försökte göra action som aldrig får ske offline
3. Kontrollera serverstatus.
   - läs aktuell serverversion och eventuella redan genomförda side effects
   - kontrollera om idempotensnyckel redan förbrukats
   - kontrollera om objekt låsts eller stängts sedan lokal ändring gjordes
4. Välj reparationsspår.
   - lokal state kan återupptas: trigga ny sync med oförändrad operation
   - lokal state måste byggas om: töm endast den trasiga operationen och generera ny klientåtgärd från servern
   - konflikt kräver manuell resolution: öppna konflikt-UI eller supportledd merge
   - dublettfall: markera felaktig dublett och använd domänspecifik korrigering
5. Konfliktreparation.
   - visa serverversion, lokal version och konfliktfält sida vid sida
   - tillämpa regel: server wins, local wins eller manual resolution enligt objekttyp
   - skapa ny sammanslagen version med ny klientoperation, inte dold servermanipulation
6. Rensa lokalkö säkert.
   - ta aldrig bort lokala operationer innan deras effekt verifierats mot servern
   - om klientlagret korrupt: exportera diagnos, töm endast efter godkänd återställning och synka om från server
7. Bekräfta för användaren.
   - förklara om data vann från server, från lokal ändring eller via manuell merge
   - be användaren verifiera slutresultatet i objektets historik

## Verifiering

- objektet når `synced` eller dokumenterad terminal konfliktstatus
- ingen otillåten offlineaction finns kvar i kön
- dubletter är klassificerade och har owner för korrigering
- audit trail visar lokal operation, konfliktdetektion, vald merge-strategi och operatörsingripande där sådant skett

## Vanliga fel

- **Fel:** samma operation återkommer efter lokal rensning.  
  **Åtgärd:** kontrollera att klienten inte återläser gammal snapshot eller att en annan enhet replayar samma operation.
- **Fel:** användaren saknar konflikt-UI för objekttypen.  
  **Åtgärd:** använd supportledd resolution och skapa förbättringsuppgift om objekttypen borde ha UI-stöd.
- **Fel:** offline skapade objekt som aldrig får skapas offline.  
  **Åtgärd:** markera operationen `unsupported_offline_action`, skapa blockerande varning och informera användaren att göra om flödet online.
- **Fel:** lokal diagnostik saknas.  
  **Åtgärd:** använd serverns auditspår, eventlogg och idempotensnycklar för rekonstruktion.

## Återställning

- om fel merge tillämpats ska domänens ordinarie korrigeringskedja användas
- om enhetsdata är korrupt ska användaren få tydlig instruktion för att synka hem serverns senaste sanning efter säker export av diagnos
- vid utbredd klientbugg ska offlinefunktion för berörd objekttyp disable:as tills fix finns

## Rollback

- rollback av releaseinducerat syncfel sker genom att stoppa fortsatt rollout, återgå till senaste stabila klientversion där möjligt och låta servern förbli sanningskälla under mellanperioden
- redan skapade serverobjekt återställs inte via klientcache utan via domänspecifika korrigeringsflöden

## Ansvarig

Primärt ansvarig är mobil/offline-ansvarig tillsammans med support. Domänägare måste delta när konflikten påverkar reglerade objekt eller ekonomiskt utfall.

## Exit gate

Runbooken är klar när användarens objekt är åter i verifierat läge, offlinekön inte längre skapar fel och orsaken är dokumenterad för eventuell regressionsuppföljning.
