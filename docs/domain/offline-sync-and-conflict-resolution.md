# Offline sync and conflict resolution

## Syfte

Detta dokument definierar offlinekö, lokal pending state, syncstatus, retry, konfliktregler och konflikt-UI för mobila och intermittenta klienter. Syftet är att tillåta säkra offlineflöden på utvalda objekt utan att skapa dubletter, tysta överskrivningar eller oförklarliga skillnader mellan lokal och serverbaserad version.

## Scope

### Ingår

- offlinekö för tillåtna skapanden och ändringar
- lokal pending state, sync status, retry och backoff
- konflikt mellan lokal och serverversion, merge-regler och manuell resolution
- regler för vilka objekt som får vara offline-redigerbara och vad som aldrig får skapas offline
- audit trail för offlineflöden och dubblettskapande

### Ingår inte

- generell offlineåtkomst till reglerade ekonomiobjekt som kräver omedelbar central validering
- peer-to-peer-synk mellan klienter utan server
- slumpmässig cache av hela databasen till klienten

### Systemgränser

- offline-domänen äger lokalt commit-log-kontrakt, sync envelope och konfliktmodell
- affärsdomänen äger om en viss objekttyp får vara offline-redigerbar och vilka fält som är tillåtna
- servern är slutlig sanningskälla för accepterad status och permanenta identifierare
- klienten får visa pending state men får inte låtsas att servern accepterat mutation innan kvittens

## Roller

- **Field user** skapar och uppdaterar tillåtna offlineobjekt i mobil eller fältklient.
- **Field manager** granskar konfliktfall som måste lösas manuellt.
- **Sync operator** övervakar konfliktfrekvens och fel i operatörsvy.
- **Security admin** styr vilka data som får lagras lokalt krypterat och under hur lång tid.
- **Support** får endast assistera med konfliktrepair genom officiella reparationsflöden.

## Begrepp

- **Offline queue** — Lokal kö av ännu ej synkade mutationer.
- **Pending state** — Klientens preliminära vy innan servern accepterat mutation.
- **Sync status** — `pending`, `synced`, `failed`, `conflicted`, `obsolete`.
- **Conflict** — Tillstånd där lokal och serverversion inte kan appliceras i given ordning utan regel.
- **Merge strategy** — Regeln `server_wins`, `local_wins` eller `manual_resolution`.
- **Client temporary id** — Lokalt genererad identifierare före serverns permanenta id.
- **Duplicate candidate** — Lokal skapelse som ser ut att motsvara redan existerande serverobjekt.

## Objektmodell

### Sync envelope
- fält: `client_mutation_id`, `client_device_id`, `client_user_id`, `object_type`, `local_object_id`, `server_object_id_optional`, `mutation_type`, `base_server_version`, `payload_hash`, `created_at`, `sync_status`
- invariant: samma `client_mutation_id` får bara appliceras en gång på servern

### Conflict record
- fält: `conflict_id`, `object_type`, `server_object_id`, `client_mutation_id`, `conflict_type`, `server_version`, `client_base_version`, `merge_strategy`, `resolution_status`
- invariant: konflikt måste peka på både lokal mutation och aktuell serverversion

### Offline capability policy
- fält: `object_type`, `allowed_mutations`, `offline_retention_days`, `merge_strategy`, `forbidden_fields`, `requires_online_create`
- invariant: policyversion ska följa med varje sync envelope

## State machine

### Sync envelope
- `queued -> sending -> acknowledged -> applied -> synced`
- `sending -> retry_wait -> queued`
- `sending -> conflicted`
- `sending -> failed_terminal`
- `applied -> obsolete` om senare serverversion ersatt pending representationen

### Conflict record
- `detected -> triaged -> resolved -> closed`
- `resolved -> replayed` när korrigerad mutation skickas på nytt

### Offline object
- `local_only -> pending_sync -> synced`
- `pending_sync -> conflicted` eller `pending_sync -> failed`

## Användarflöden

### Offline skapande
1. Klienten kontrollerar att objekttypen får skapas offline.
2. Lokalt tillfälligt id skapas och mutation läggs i offline queue.
3. UI visar pending state.
4. När nät finns skickas envelopen till servern som mappar till permanent id eller upptäcker dubblett.

### Offline uppdatering
1. Klienten lagrar serverns senaste version som `base_server_version`.
2. Användaren gör ändring offline.
3. Vid synk jämför servern basversion mot aktuell serverversion.
4. Om versionerna avviker används merge strategy eller manuell konflikt.

### Konfliktlösning
1. Konfliktpost skapas med jämförelse av fält och versionskedja.
2. Om policy är `server_wins` får klienten ny serverbild och lokal pending markeras avvisad.
3. Om policy är `local_wins` appliceras lokalt värde om servern fortfarande anser ändringen tillåten.
4. Vid `manual_resolution` öppnas konflikt-UI där användaren eller manager väljer version per konfliktregel.

## Affärsregler

### Tillåtna offlineobjekt
- fältaktivitet, tidrad, materialuttag, check-in/check-out, bilder/kommentarer och vissa arbetsorderanteckningar får vara offline-redigerbara
- rena läsobjekt kan cachas enligt policy men genererar inga mutationer
- leverantörsbetalning, kundfaktura, sign-off, close, submission, manuella journaler och behörighetsändringar får aldrig skapas offline
- objekt med starkt globalt nummerkrav ska få permanent nummer först efter serverkvittens

### Merge-regler
- `server_wins` används för statusfält, sign-off-fält, låsmarkeringar och centralt härledda summeringar
- `local_wins` får bara användas för fria anteckningar, bilder eller icke-kritiska metadatafält när policyn tillåter det
- `manual_resolution` används för tidposter, materialuttag eller andra fält där både lokal och serverversion kan vara giltiga men oförenliga
- merge får aldrig bryta auditkedja; både förlorande och vinnande värde ska sparas i konfliktposten

### Dubblettskapande
- skapande offline ska bära stark lokal idempotensnyckel
- servern ska jämföra med naturliga nycklar, tidsfönster och redan synkade objekt för att hitta duplicate candidates
- vid sannolik dubblett ska automatisk merge bara ske om policyn uttryckligen tillåter det; annars krävs manuell resolution

### Retry och backoff
- nätfel och temporära serverfel ska ge exponential backoff med lokalt lagrad retry-plan
- klienten får inte köra oändligt snabb retry-loop
- terminala valideringsfel ska stoppa automatisk retry och kräva mänsklig action

## Behörigheter

- endast användare med offline-aktiverad roll och registrerad enhet får skapa offline-mutationer
- konfliktlösning i `manual_resolution` kräver rätt att redigera objekttypen även online
- support får inte injicera lokala mutationer; endast assistera genom repairflöde
- security admin kan tvångsrevoke offline-cache eller enhetsåtkomst

## Fel- och konfliktfall

- saknad eller korrupt lokal köpost ska markeras och isoleras så att andra poster kan fortsätta
- mismatch mellan `client_user_id` och aktuell inloggad användare ska blockera synk
- serveravvisad mutation på förbjudet offlineobjekt ska ge terminalt fel
- konflikt som inte går att rendera i UI ska eskaleras till sync operator
- lokal pending state som överlever policyändring till förbjudet läge ska frysas och kräva online resolution

## Notifieringar

- användaren ska få tydlig synkstatus i klienten: väntar, skickar, konflikt, synkad
- field manager eller sync operator får notifiering när konfliktfrekvens eller terminala fel passerar tröskel
- klienten ska meddela när pending state blivit avvisad eller ersatt av serverversion

## Audit trail

- varje offline-mutation ska logga klientenhet, användare, lokalt tidsstämplad handling, servermottagning och slututfall
- konfliktposten ska spara lokal version, serverversion, vald merge-strategi och slutligt beslut
- byten från temporärt till permanent id ska vara spårbara
- stöd för borttagen lokal cache ska auditloggas som säkerhetsåtgärd

## API/events/jobs

- kommandon: `submit_sync_envelope`, `ack_sync_envelope`, `resolve_sync_conflict`, `request_offline_capabilities`, `revoke_device_offline_access`
- events: `offline_mutation_received`, `sync_conflict_detected`, `sync_conflict_resolved`, `offline_duplicate_candidate_found`
- jobb: `offline_sync_ingest_worker`, `offline_retry_scheduler`, `offline_conflict_cleanup`

## UI-krav

- klienten ska visa pending state utan att presentera det som slutligt servergodkänt
- konflikt-UI ska visa lokal och serverversion sida vid sida samt vilken strategi som gäller
- objekt som inte får skapas offline ska tydligt markeras som online-krävande
- synklogg ska gå att öppna per objekt från klienten

## Testfall

1. skapa tillåten fältaktivitet offline och synka senare; förväntat utfall: permanent id och `synced`
2. försök skapa förbjuden betalning offline; förväntat utfall: nekad direkt
3. uppdatera tidrad offline medan serverversionen ändras; förväntat utfall: konflikt
4. `server_wins` på låsstatus ersätter lokal pending
5. sannolik dubblett vid offline skapande ger duplicate candidate och manuell review
6. nätfel ger backoff, inte snabb loop

## Exit gate

- [ ] endast uttryckligen godkända objekttyper kan muteras offline
- [ ] pending state, retry och konfliktstatus är tydliga för användaren
- [ ] merge-regler är explicita och bryter inte auditkedjan
- [ ] dubblettskapande upptäcks och hanteras säkert
- [ ] offlineflöden kan granskas från lokal handling till serverutfall
