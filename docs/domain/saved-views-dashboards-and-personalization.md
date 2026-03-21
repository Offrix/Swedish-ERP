# Saved views, dashboards and personalization

## Syfte

Detta dokument definierar privata vyer, delade vyer, standardvyer, dashboardpreferenser och personlig anpassning i produkten. Målet är att användaren ska kunna återanvända filter, kolumnval, sortering, favoriter och rollanpassade dashboards utan att affärslogik eller behörigheter flyttas ut i klienten.

## Scope

### Ingår

- privata vyer, delade vyer, bolagsstandard och systemstandard
- kolumnval, filteruppsättningar, sortering, gruppering, layout och favoritmarkering
- dashboardpreferenser per roll, bolag och användare
- versionshantering av sparade vyer, kompatibilitetskontroll och reparationsflöde för brutna vyer
- behörigheter för att skapa, dela, ändra och ersätta standardvyer

### Ingår inte

- domänspecifika affärsregler som avgör vilka objekt som får visas
- ändring av sökindex eller rapportdefinitioner; endast referens till dem
- godtycklig UI-scripting eller kundskriven kod i vyer

### Systemgränser

- vy-motorn äger saved view, dashboard layout, favorite pin och personalization policy
- respektive lista eller dashboard-källa äger datamodell, tillåtna fält och filterkatalog
- behörighetslagret avgör om delning och användning är tillåten
- dashboard rendering hämtar endast data via officiella queries och metric definitions

## Roller

- **Slutanvändare** äger sina privata vyer, favoriter och personliga dashboardpreferenser.
- **Company admin** får skapa och ändra bolagets standardvyer inom tillåtet scope.
- **Bureau manager** får skapa delade vyer för byråteam och portföljytor.
- **Product configuration admin** får uppdatera systemstandarder som gäller alla bolag.
- **Support admin** får endast diagnosticera eller reparera brutna vyer efter godkänd supportpolicy och får inte göra innehållsliga förändringar utan dokumenterat uppdrag.

## Begrepp

- **Saved view** — Versionsstyrd presentation av en lista eller arbetsyta.
- **Private view** — Vy som endast syns för skaparen.
- **Shared view** — Vy som delas med ett team, en roll eller ett bolag.
- **Default view** — Vy som öppnas automatiskt när ingen personlig override finns.
- **Favorite view** — Sparad vy som lyfts upp i snabbåtkomst.
- **View schema** — Lista över tillåtna kolumner, filter och sorteringsfält för en yta.
- **Broken view** — Vy vars definition inte längre är körbar mot aktuellt schema eller aktuellt behörighetsscope.
- **Dashboard profile** — Samling av kort, ordning, filterkontext och layout per användare eller roll.

## Objektmodell

### Saved view
- fält: `saved_view_id`, `surface_key`, `visibility`, `owner_user_id`, `owner_scope`, `title`, `description`, `columns`, `filters`, `sorts`, `grouping`, `density`, `frozen_columns`, `version_no`, `schema_version`, `is_default`, `is_favorite`, `archived_at`
- invariant: en vy får endast innehålla fält som finns i aktuell `view schema` för ytan

### Dashboard profile
- fält: `dashboard_profile_id`, `surface_key`, `owner_type`, `owner_id`, `layout_json`, `card_bindings`, `global_filters`, `role_template_version`, `personal_overrides`, `last_rendered_at`
- invariant: varje kort måste peka på godkänd metric definition, saved view eller query-källa

### View repair suggestion
- fält: `broken_reason`, `missing_fields`, `fallback_columns`, `blocked_filters`, `replacement_candidates`, `generated_at`
- invariant: reparationsförslag får inte förändra synlighet eller tillgänglighet till nya fält utan användarens bekräftelse

## State machine

### Saved view
- `draft -> active -> defaulted -> broken -> repaired -> archived`
- `active -> defaulted` när vyn utses till standard för ett scope
- `broken` när schema, fält eller behörighet gör definitionen ogiltig
- `repaired` skapar ny version; tidigare version ligger kvar läsbar i historiken
- `archived` döljer vyn från normal navigation men bevarar audit

### Dashboard profile
- `active -> outdated -> repaired -> replaced`
- `outdated` när rollmall eller metric-katalog ändrats men profilen fortfarande kan renderas med varning

### Favorite pin
- `pinned -> unpinned`
- favoritstatus är användarspecifik även för delade vyer

## Användarflöden

### Skapa privat vy
1. Användaren väljer kolumner, filter, sortering och namn.
2. Systemet validerar att alla fält är tillåtna på ytan.
3. Vyn sparas som `private`.
4. Användaren kan direkt markera den som favorit eller personlig standard.

### Dela och standardisera vy
1. Behörig administratör kopierar eller skapar vy med `shared` eller `default` visibility.
2. Systemet beräknar målgruppen, till exempel roll, bolag eller byråteam.
3. Mottagare får tillgång till vyn men kan bara ändra den genom egen kopia om de saknar edit-rättighet.
4. Om en standardvy ersätts ska tidigare standardversion finnas kvar för audit och snabb rollback.

### Reparera bruten vy
1. Kompatibilitetsskannern hittar vy med ogiltigt schema eller blockerade fält.
2. Vyn markeras `broken`.
3. Systemet genererar reparationsförslag, till exempel ersättningskolumner eller borttagna filter.
4. Behörig ägare godkänner reparationen eller skapar ny vyversion manuellt.

## Affärsregler

### Kolumnval och filteruppsättningar
- varje yta ska publicera en explicit katalog över tillåtna kolumner, filter, sorteringar och grupperingstyper
- kolumner som innehåller känslig information får bara sparas i vyer om användarens roll tillåter det
- filter ska serialiseras typat, till exempel datumintervall, numeriska intervall, enum-värden och relationer
- sortering på icke-indexerat eller förbjudet fält ska nekas vid sparande

### Default views
- prioritetsordning för standardvy är: användarens personliga standard, team/rollstandard, bolagsstandard, systemstandard
- en användare får alltid återgå till systemstandard
- byte av standardvy ska inte ändra användarens privata favoriter eller privata vyer

### Versionshantering
- varje ändring av delad eller standardiserad vy ska skapa ny version
- privat vy kan uppdateras in-place för användaren, men historik ska ändå bevaras logiskt för audit
- om en delad vy används som bas för en privat kopia ska kopian bära referens till ursprungsversionen

### Dashboardpreferenser
- dashboards kan ha kort för mått, listor, work items, kalender, favoriter och blockerande alerts
- rollanpassning sker genom mallar; användaren får bara göra överstyrningar inom mallens tillåtna zoner
- om ett korts datakälla blir ogiltig ska kortet markeras `repair required`, inte tyst tas bort

### Brutna vyer
- brutna vyer ska identifieras vid schemaändring, behörighetsändring och nattlig kompatibilitetsskanning
- reparation får inte utöka behörighet eller exponera nya fält
- om reparation inte är möjlig ska systemet skapa säker fallback till närmaste standardvy men samtidigt bevara brutna definitionen för analys

## Behörigheter

- alla användare får skapa privata vyer och favoriter inom ytor de redan får använda
- delning till team eller bolag kräver `share_view`
- ändring av bolagsstandard kräver `manage_company_defaults`
- ändring av systemstandard kräver `manage_product_defaults`
- användare får alltid kopiera en delad vy till privat vy om de har läsrätt till den
- support får inte göra en vy till standard utan uttrycklig administrativ beställning

## Fel- och konfliktfall

- vy som refererar till borttaget filterfält ska markeras `broken`
- vy med kolumn som blivit känslig enligt ny policy ska få `permissions_regression`
- delad vy vars målgrupp inte längre finns ska sättas i `broken` tills ny målgrupp väljs
- dashboardkort med saknad metric definition ska markeras `card_source_missing`
- om användaren saknar åtkomst till delad vy ska den inte visas i listan men auditspåret ska finnas kvar

## Notifieringar

- användaren får notis när delad favoritvy uppdaterats eller satts som ny standard
- ägare får notis när privat eller delad vy blivit `broken`
- teammedlemmar får notis när en bolagsstandard ersatts i en kritisk yta som close eller payments
- dashboard med blockerande kortfel ska visa varning direkt vid öppning

## Audit trail

- skapande, kopiering, delning, standardisering, favoritmarkering, reparation och arkivering ska auditloggas
- auditspåret ska spara gammal och ny view-definition i redigerad form så att känsliga filtervärden inte läcker
- systemet ska kunna visa vilken vyversion som användes när en export, review eller sign-off initierades
- supportdiagnostik på användarens vyer ska loggas separat från vanliga användarändringar

## API/events/jobs

- kommandon: `create_saved_view`, `update_saved_view`, `copy_saved_view`, `share_saved_view`, `set_default_view`, `repair_saved_view`, `archive_saved_view`, `update_dashboard_profile`
- query-API ska kunna returnera effektiv standardvy enligt prioriteringsordning
- events: `saved_view_created`, `saved_view_shared`, `saved_view_broken`, `saved_view_repaired`, `dashboard_profile_changed`
- jobb: `view_compatibility_scan`, `dashboard_template_migration`, `favorite_cleanup_repair`

## UI-krav

- vybyggaren ska visa tillåtna kolumner, filter och sorteringar med tydlig typinformation
- systemet ska skilja visuellt på privat, delad, standard och favorit
- brutna vyer ska visa exakt vilka delar som inte längre fungerar och erbjuda reparation eller kopiering
- dashboards ska kunna återställas till rollstandard eller systemstandard med ett explicit val
- användaren ska se om en vy är låst för redigering men tillgänglig för kopiering

## Testfall

1. skapa privat vy med kolumner, filter och sortering; förväntat utfall: aktiv vy och korrekt rendering
2. dela vy till team utan behörighet; förväntat utfall: blockering
3. byt bolagsstandard; förväntat utfall: tidigare version kvar i historik, ny default aktiv
4. gör fält otillåtet genom policyändring; förväntat utfall: vyn blir `broken`
5. reparera bruten vy med ersättningskolumn; förväntat utfall: ny version `repaired`
6. dashboardkort tappar metric definition; förväntat utfall: `repair required`-markering
7. favoritstatus följer användaren men inte hela teamet

## Exit gate

- [ ] privata, delade och standardiserade vyer följer en tydlig prioriteringsordning
- [ ] kolumnval, filter, sortering och dashboardkort valideras mot officiell schemakatalog
- [ ] delade och standardiserade vyer versionshanteras och kan repareras
- [ ] brutna vyer och dashboards upptäcks utan tyst fallback
- [ ] auditspåret visar vem som delat, ändrat eller standardiserat varje vy
