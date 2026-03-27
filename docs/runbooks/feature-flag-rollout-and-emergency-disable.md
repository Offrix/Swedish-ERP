> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Feature flag rollout and emergency disable

## Syfte

Detta runbook beskriver hur feature flags rullas ut stegvis, verifieras, stängs av och används som nödbrytare vid incident. Syftet är att förändringar ska kunna aktiveras kontrollerat och avaktiveras omedelbart utan otydligt ansvar.

## När den används

- inför planerad aktivering av ny funktion eller integration
- vid gradvis rollout per tenant, roll, bolag eller procentandel
- vid akut behov av emergency disable eller kill switch
- när flaggar ska avvecklas efter stabilisering

## Förkrav

1. Flaggan ska finnas registrerad med owner, riskklass, målscope, rollbackstrategi och slutdatum.
2. Testbevis från dev/staging ska vara bifogat.
3. För högriskflagga i produktion ska fyrögonsgodkännande finnas.
4. Om flaggan påverkar submissions, betalningar, search, sync eller supportåtkomst ska relaterad runbook vara känd för operatören.

## Steg för steg

1. Bekräfta flaggmetadata.
   - namn, syfte, målgrupp, beroenden och kill-switch-scope
   - vilka domänobjekt eller köer som påverkas
   - om flaggan endast gömmer UI eller faktiskt stoppar side effects
2. Välj rolloutmodell.
   - intern testgrupp
   - pilottenant
   - bolagslista
   - rollbaserad aktivering
   - procentuell trafikaktivering för icke-reglerade flöden
3. Aktivera steg 1.
   - slå på flaggan i minsta möjliga scope
   - dokumentera aktiveringstid, operatör, motivering och change-ID
   - följ definierade hälsomått: felgrad, supportärenden, köstatus, submissionutfall, betalningsfel och användarsignaler
4. Bedöm utfallet.
   - om hälsomått är inom gräns: gå till nästa rolloutsteg
   - om avvikelse finns: frys rollout och utred
5. Emergency disable.
   - aktivera kill switch eller sätt flagga till av omedelbart
   - verifiera att nya side effects stoppas
   - kommunicera incidentstatus till berörda roller
   - skapa eller länka incident-ID
6. Efter disable.
   - identifiera om redan skapade objekt behöver korrigeras
   - använd respektive domänrunbook för replay, reversal eller reparation
   - dokumentera exakt tidsintervall då funktionen var aktiv
7. Avveckla flagga.
   - när funktionen varit stabil enligt policy ska flaggan tas bort ur konfiguration och kod
   - uppdatera dokumentation och testfall så att flaggan inte längre förväntas finnas

## Verifiering

- flaggstatus i admin backoffice matchar önskat läge i samtliga miljöer
- hälsomått, felgrad och supportsignaler är granskade mot rolloutbeslutet
- vid disable har nya side effects stoppats inom definierad målgräns
- audit trail visar vem som ändrade flaggan, tidigare värde, nytt värde, scope, skäl och godkännande

## Vanliga fel

- **Fel:** flaggan verkar vara av men funktion fortsätter köra.  
  **Åtgärd:** kontrollera cache-invalidiering, klientkonfiguration, edge-caching och om serverkod verkligen läser flaggan i den kritiska vägen.
- **Fel:** olika miljöer visar olika flaggstatus.  
  **Åtgärd:** jämför miljöseparerade konfigurationer och verifiera att rätt secret-set eller flaggprovider används.
- **Fel:** kill switch stoppar UI men inte bakgrundsjobb.  
  **Åtgärd:** lägg till serverside- och worker-skydd innan nästa rollout; använd async-job-runbook för att stoppa redan schemalagda jobb.

## Återställning

- om rollout skapat data i fel format ska flaggan disable:as och domänspecifik korrigering köras
- om disable bryter användbarhet för kritiska roller kan flaggan återaktiveras i begränsat scope endast efter nytt godkännande
- varje återställning ska dokumentera både teknisk och affärsmässig effekt

## Rollback

- återställning sker genom att sätta flaggan till tidigare verifierat värde och om nödvändigt återgå till tidigare release eller konfigurationssnapshot
- rollback av flaggstatus ska alltid följas av kontroll att klient- och servercache uppdaterats

## Ansvarig

Primärt ansvarig är flaggans owner. Vid emergency disable tar incident commander beslutsrätt tills incidenten stabiliserats. Security admin deltar för högriskflaggor.

## Exit gate

Runbooken är klar när flaggan är i avsett slutläge, incident eller change är dokumenterad och eventuella efterföljande korrigeringsåtgärder har owner och deadline.

