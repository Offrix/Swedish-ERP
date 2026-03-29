> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Client approval, deadline and escalation policy

## Syfte

Detta dokument definierar när klientunderlag, dokument och godkännanden ska begäras, hur deadlines härleds, när påminnelser och eskalering sker och vilka öppna klientbrister som blockerar close, rapportering eller submission.

## Gäller för

- byråportfölj, klientbegäranden, dokumentbegäranden, approval packages och blockerande klientbrister
- close, moms, AGI, HUS, Peppol och andra flöden där klientens underlag eller godkännande krävs
- interna byråroller och externa klientkontakter/approvers

## Hårda regler

1. Alla blockerande klientbegäranden ska kopplas till ett tydligt leveransobjekt och en intern deadline som ligger före den relevanta operativa eller regulatoriska deadlinen.
2. Intern deadline ska som huvudregel sättas med tillräcklig buffert före slutlig submission eller close enligt respektive regelprofil; bufferten får inte vara noll.
3. När ett underlag eller godkännande kräver namngiven approver får inget annat svar ersätta detta utan dokumenterad delegation.
4. Öppna klientbrister med blocker_scope `close`, `reporting` eller `submission` ska stoppa respektive steg om inte policygodkänt undantag finns.
5. Påminnelser och eskalering ska vara förutsägbara och lika för lika fall inom samma policyprofil.
6. Klientgodkännande gäller endast för det snapshot som klienten faktiskt har sett.
7. Om underlag ändras efter klientgodkännande ska nytt godkännande begäras när ändringen är materiell eller policy kräver det.

## Roller och ansvar

- **Responsible consultant** sätter initial request, följer upp och dokumenterar svar.
- **Bureau manager** äger eskalering när klient inte svarar i tid.
- **Client contact** levererar dokument och praktisk information.
- **Client approver** lämnar bindande godkännande.
- **Close signatory eller tax signatory** avgör om undantag kan godtas eller om stopp ska bestå.

## Tillåtna actions

- skapa klientbegäran med deadline, reminderprofil och blocker_scope
- skicka påminnelser enligt definierad kadens
- eskalera till byråmanager eller kundens högre kontakt enligt policy
- använda documented waiver när policyn uttryckligen tillåter det och rätt godkännare har signerat
- begära nytt godkännande när snapshot ändrats

## Förbjudna actions

- close eller submission trots blockerande öppen klientbegäran utan godkänt undantag
- godkännande från fel person där named approver krävs
- tyst förlängning av blockerande deadline utan audit och ny kommunikation
- återanvändning av gammalt godkännande på nytt snapshot utan ny bedömning

## Undantag

- lågmateriala ändringar efter godkännande kan i vissa profiltyper tillåtas utan nytt godkännande om policyn uttryckligen anger detta och ändringen dokumenteras
- temporärt undantag från blocker kan beslutas av rätt signatory-nivå, men undantaget måste vara tidsbegränsat och synligt i close- eller submission-paketet

## Godkännanden

- vanlig klientbegäran: responsible consultant
- ändrad blockerande deadline: responsible consultant plus bureau manager
- named-approver-delegation: documented customer-side delegation plus byråns godkännande
- waiver av blockerande klientbrist: close signatory eller tax signatory enligt domän
- nytt material efter godkännande: ny bedömning av responsible consultant, och nytt approval package om policyn kräver det

## Audit

- skapande av begäran, deadlines, reminders, eskaleringar, klientsvar, godkännanden och undantag ska auditloggas
- auditspåret ska visa vilket snapshot klienten såg och när det sågs
- blockerande klientbrister ska kunna följas från första begäran till slutlig lösning eller undantag

## Kontrollpunkter

- daglig bevakning av förfallna eller snart förfallna blockerande klientbegäranden
- veckovis genomgång av eskalerade klienter i byråportföljen
- månatlig kontroll att undantag och waivers stängs eller förnyas
- kontroll att nytt godkännande begärs när materiellt underlag ändrats

## Exit gate

- [ ] blockerande klientbegäranden har intern deadline med buffert före slutligt steg
- [ ] named approver-krav upprätthålls där det gäller
- [ ] påminnelse och eskalering följer fast kadens
- [ ] öppna klientbrister blockerar close eller submission där policy kräver det
- [ ] undantag och återanvända godkännanden är fullt spårbara

