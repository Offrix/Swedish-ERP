> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Pilot migration and cutover

## Syfte

Detta runbook beskriver hur pilotkunders migration planeras, parallellkörs, signeras av och förs över till produktionsdrift med kontrollerat cutover och definierad rollback.

## När den används

- inför första pilotmigrering från tidigare system
- inför generalrepetition före go-live
- vid omplanerat cutover efter avbruten eller misslyckad migration
- när diff report eller sign-off indikerar behov av omkörning

## Förkrav

1. Importmallar, mappingregler och diffkategorier ska vara fastställda.
2. Pilotkundens ansvariga kontakt, intern konsult, migreringsoperatör och sign-off chain ska vara utsedda.
3. Cutover-fönster, stopptid för gamla systemet och kommunikationsplan ska vara godkända.
4. Backup, restore-prov och rollbackordning ska vara verifierade.
5. Öppna blockerare i checklista eller data kvalitet ska vara klassificerade med owner och beslut.

## Steg för steg

1. Förbered migrationsbatch.
   - registrera källa, batch-id, tidsfönster, datamängder och ansvariga
   - importera provdata i staging eller pilotmiljö
   - kör mapping review och dokumentera manuella regler
2. Kör parallellkörning.
   - jämför utfall för definierade perioder mellan gammalt system och nya systemet
   - producera diff report för ledger, AR, AP, moms, bank, öppna poster, rapporter och nyckelmått
   - klassificera varje diff som `mapping`, `source_gap`, `rounding`, `timing`, `missing_document`, `manual_adjustment_required` eller `explained_difference`
3. Åtgärda differenser.
   - rätta mapping eller källa
   - kör om importbatch för berört scope
   - dokumentera varje manuell korrigering objekt för objekt
4. Go/no-go inför cutover.
   - verifiera att acceptansgrindar är gröna
   - säkerställ att sign-off evidence finns för varje blockerande diffklass
   - fastställ cutover-tidpunkt, fryspunkt och vem som får ge slutligt startbesked
5. Utför cutover.
   - sätt gammalt system i läsläge eller definierad fryspunkt
   - exportera slutdelta
   - kör slutimport med samma mappingversion som i godkänd repetition
   - verifiera antal objekt, hashade filpaket, öppna poster, saldon och rapporter
6. Aktivera produktion.
   - lås upp användare i nya systemet enligt plan
   - bekräfta att supportbemanning, runbooks och feature flags är redo
   - följ hypercare-checklista för första arbetsdagen
7. Efterkontroll.
   - kör post-cutover diff report
   - stäm av första bankfeed, första fakturaflöde, första close-uppgift och första export
   - markera batchen `completed`, `completed_with_followups` eller `rolled_back`

## Verifiering

- slutimportens objektantal och kritiska saldon matchar godkänd diff report
- öppna AR/AP-poster, bankbalanser och periodstatus är reproducerbara
- alla manuella korrigeringar har sign-off evidence
- support och audit explorer kan spåra varje importerat objekt tillbaka till källbatch och mappingversion

## Vanliga fel

- **Fel:** diff report växer efter slutdelta trots oförändrad mapping.  
  **Åtgärd:** kontrollera att gammalt system verkligen frysts och att rätt period eller bolag exporterats.
- **Fel:** vissa dokument saknar länkar efter import.  
  **Åtgärd:** validera dokumenthash, objektlagringsmanifest och importkedja; kör targeted dokumentreplay för saknade objekt.
- **Fel:** användare börjar arbeta i nya systemet innan alla sign-offs är klara.  
  **Åtgärd:** återställ åtkomst till read-only eller begränsat scope tills sign-off är komplett.
- **Fel:** manuell korrigering gjord direkt i produktion utan batchspår.  
  **Åtgärd:** stoppa fortsatt cutover, registrera korrigeringen i migration cockpiten och skapa ny diff/godkännande.

## Återställning

- om cutover stoppas före produktionsöppning ska användaråtkomst förbli stängd och senaste verifierade snapshot ligga kvar
- om produktionsöppning redan skett och kritiskt fel upptäcks ska rollbackordning följas: stoppa ny trafik, säkra nya transaktioner, återställ från backup eller återgå till gammalt system enligt beslutad punkt
- alla återställningar ska dokumentera vilka objekt som påverkats och om ny migration krävs

## Rollback

- rollback är tillåten endast om definierade trösklar för kritiska differenser, förlorad data, åtkomstfel eller rapportbrott passeras
- rollbackbeslut tas av utsedd cutover-ansvarig tillsammans med domänägare och kundansvarig
- rollback får inte lämna två system i parallell skrivning utan tydlig sanningskälla

## Ansvarig

Primärt ansvarig är migreringsledaren. Kundansvarig konsult, dataansvarig och driftansvarig måste vara tillgängliga under hela cutover-fönstret.

## Exit gate

Runbooken är klar när pilotkunden antingen är verifierat överflyttad med godkänd hypercare-plan eller är kontrollerat återställd till tidigare läge utan okända dataförluster.

