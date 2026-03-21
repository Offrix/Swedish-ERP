# Comments, mentions and collaboration

## Syfte

Detta dokument definierar kommentarer, mentions, trådar, läst/oläst, objektkoppling, intern/extern synlighet, notifieringar, assignments från kommentarer och historik. Målet är att samarbete ska vara spårbart och säkert även i reglerade flöden, utan att kommentarer blir en oreglerad sidokanal för beslut som borde ligga i audit- eller sign-off-spår.

## Scope

### Ingår

- kommentarer, mentions, trådar och read state
- objektkoppling till affärsobjekt, checklistor, supportcase och work items
- intern och extern synlighet
- notifieringar och assignments som skapas från kommentarer
- edit/delete-regler, historik och audit
- regler för vad som får och inte får uttryckas i reglerade flöden

### Ingår inte

- extern chatt eller realtidsmeddelandeplattform
- dokumentlagring utöver referenser eller tillåtna bilagor
- ersättning för formell attest, sign-off eller klientgodkännande

### Systemgränser

- collaboration-domänen äger comment, thread, mention, read state och comment-generated assignment
- källdomäner äger affärsobjektet som kommentaren sitter på
- notifieringsmotorn levererar mentions och tråduppdateringar
- auditmotorn loggar reglerade kommentarer och moderationsåtgärder

## Roller

- **User** kan skriva och läsa kommentarer inom sitt objektscope.
- **Moderator eller admin** kan dölja eller radera kommentarer enligt policy.
- **Client user** kan läsa eller skriva endast där extern synlighet uttryckligen tillåts.
- **Support** får kommentera interna supportspår men inte kundsynliga trådar utan policygrund.

## Begrepp

- **Comment** — Tidsstämplad textpost knuten till ett objekt.
- **Thread** — Huvudkommentar med svar.
- **Mention** — Hänvisning till användare eller grupp som ger notifiering.
- **Read state** — Om en användare läst eller ej läst en kommentar eller tråd.
- **Visibility** — `internal`, `external_shared`, `restricted_internal`.
- **Comment assignment** — Arbetsobjekt som skapats från kommentar eller mention.
- **Regulated flow** — Flöde där kommentarers roll är begränsad, till exempel close, sign-off, submission eller betalning.

## Objektmodell

### Comment
- fält: `comment_id`, `thread_id`, `object_type`, `object_id`, `visibility`, `author_user_id`, `body`, `redacted_body`, `created_at`, `edited_at`, `deleted_at`, `regulatory_flag`
- invariant: kommentar måste alltid ha koppling till objekt eller tråd

### Mention
- fält: `mention_id`, `comment_id`, `target_user_id_or_group`, `notified_at`, `acked_at`
- invariant: mention får bara peka på mottagare som har eller kan få läsa kommentaren

### Read state
- fält: `comment_id_or_thread_id`, `user_id`, `read_at`, `last_seen_version`
- invariant: read state är användarspecifik och får inte delas

### Comment assignment
- fält: `assignment_id`, `origin_comment_id`, `work_item_id`, `status`
- invariant: samma kommentar får inte skapa flera identiska assignments för samma mottagare och regel

## State machine

### Comment
- `created -> edited -> deleted`
- `created -> hidden` vid moderering
- historik ska finnas kvar även när kommentaren döljs eller raderas logiskt

### Thread
- `open -> resolved -> reopened`
- `resolved` är informativt och ersätter inte affärsbeslut

### Read state
- `unread -> read`
- `read -> unread` endast om ny kommentar eller ny redigering enligt policy återöppnar tråden

## Användarflöden

### Skriv kommentar
1. Användaren öppnar objektets kommentarsyta.
2. Systemet validerar synlighet, mottagare och att objektet tillåter kommentarer.
3. Kommentar sparas och eventuella mentions extraheras.
4. Notifieringar skickas och read state uppdateras för andra användare.

### Extern delning
1. Intern användare väljer extern synlighet där ytan tillåter det.
2. Systemet varnar om kommentaren ligger i reglerat flöde där extern synlighet är förbjuden eller begränsad.
3. Endast externa mottagare med rätt objektåtkomst får läsa kommentaren.

### Assignment från kommentar
1. Mention eller särskild kommentarsaction markerar att uppföljning krävs.
2. Work item skapas eller uppdateras.
3. Länken mellan kommentar och arbetsobjekt bevaras i båda riktningar.

## Affärsregler

### Edit/delete
- redigering ska skapa ny kommentarsversion; originaltexten ska bevaras i historik
- radering får normalt vara logisk, inte fysisk
- kommentarer i reglerade flöden som redan använts i sign-off, incident eller revision får inte permanent tas bort av vanlig användare
- adminmoderering ska skapa reason code och redigerad visningstext

### Intern/extern synlighet
- `internal` är standard
- `external_shared` får endast användas på ytor där klientsamverkan är godkänd
- `restricted_internal` används för support, incident eller känsligt administrativt innehåll
- synlighet får inte uppgraderas från restriktiv till vidare utan ny behörighetskontroll

### Reglerade flöden
- kommentar får aldrig ensam ersätta attest, sign-off, klientgodkännande eller submissionbeslut
- kritiska instruktioner som påverkar pengar, myndighetsrapportering eller låsta perioder måste speglas i formell action eller work item
- systemet ska kunna varna om användaren försöker skriva policyförbjudet innehåll i kundsynlig tråd, till exempel hemligheter eller fullständiga identiteter

### Lässtatus och notifieringar
- nya kommentarer sätter tråden till oläst för berörda mottagare
- mentions har högre notifieringsprioritet än vanliga trådsvar
- redigering som bara rättar stavfel behöver inte återmarkera tråden som oläst om policyn uttryckligen undantar det

## Behörigheter

- användare får kommentera objekt de får läsa och där kommentarsstöd är aktiverat
- extern användare får endast läsa och skriva i externa trådar som uttryckligen delats
- moderator/admin får dölja eller redigera synlighet men inte tyst ändra innehåll utan historik
- support får inte skriva i kundsynlig tråd om supportscope eller policy förbjuder det

## Fel- och konfliktfall

- mention till användare utan läsrätt ska nekas eller nedgraderas till vanlig text beroende på policy
- kommentar på stängt eller arkiverat objekt kan blockeras eller tillåtas som intern not beroende på objekttyp
- extern kommentar i reglerat flöde med förbjuden synlighet ska ge valideringsfel
- försök att permanent radera revisionsrelevant kommentar ska nekas

## Notifieringar

- mentions ska skapa riktad notifiering
- svar i tråd ska skapa trådnotifiering till prenumeranter och tidigare deltagare enligt policy
- kommentar som skapar assignment ska ge både samarbetsnotis och work item-notis
- moderation eller dölja kommentar ska notifiera berörd intern ägare när policyn kräver det

## Audit trail

- skapande, redigering, radering, moderering, synlighetsändring och mentions ska auditloggas
- auditspåret ska kunna visa vilken kommentarversion som var synlig vid en viss sign-off eller incident
- länken mellan kommentar och genererat arbetsobjekt ska vara spårbar
- lässtatus behöver normalt inte full audit på varje visning men viktiga kvittenser eller externa läsningar kan kräva det enligt policy

## API/events/jobs

- kommandon: `create_comment`, `edit_comment`, `delete_comment`, `change_comment_visibility`, `mark_thread_read`, `create_comment_assignment`
- events: `comment_created`, `comment_mentioned_user`, `comment_visibility_changed`, `comment_assignment_created`, `thread_resolved`
- jobb: `comment_notification_dispatch`, `comment_moderation_scan`, `comment_read_state_compaction`

## UI-krav

- trådar ska visa versionsindikator om kommentar redigerats
- intern och extern synlighet ska vara tydligt färg- eller etikettmarkerad
- användaren ska kunna se om mention skapade ett arbetsobjekt
- i reglerade flöden ska UI förklara att kommentar inte ersätter formellt godkännande eller sign-off

## Testfall

1. skapa intern kommentar med mention; förväntat utfall: notifiering och oläst status
2. skapa kommentar som genererar assignment; förväntat utfall: länkad work item
3. försök dela kommentar externt i förbjudet flöde; förväntat utfall: nekad
4. redigera kommentar; förväntat utfall: ny version, historik kvar
5. moderera revisionsrelevant kommentar; förväntat utfall: logisk dölja, ej fysisk borttagning

## Exit gate

- [ ] kommentarer, mentions och trådar följer tydliga synlighets- och versionsregler
- [ ] reglerade flöden skyddas mot att kommentarer ersätter formella beslut
- [ ] assignments från kommentarer är spårbara
- [ ] moderering och delete lämnar full historik
- [ ] notifieringar och read state fungerar utan att kringgå behörighet
