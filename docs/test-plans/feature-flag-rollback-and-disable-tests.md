> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Feature flag rollback and disable tests

## Mål

Målet är att verifiera att feature flags, rollout och kill switches fungerar som säker driftmekanism, att emergency disable stoppar riskfyllda flöden och att rollback kan ske utan otydliga mellanlägen.

## Scope

- feature flags, rollout scope, entitlement-flaggor, ops-flaggor och kill switches
- admin backoffice för flaggändringar och audit
- integration mellan flaggor och kritiska server-/worker-vägar
- avveckling och städning av utgångna flaggor

## Fixtures

- flaggkatalog med låg-, medel- och högriskflaggor
- testmiljö med pilottenant, intern testtenant och produktionlik staging
- incidentscenarier där payment, submission, search eller workerfunktion måste disable:as
- fixtures för cachefördröjning och distribuerad konfigurationsspridning

## Testlager

1. Unit tests för flaggupplösning, prioritering och fallbackvärden.
2. Integrations- och komponenttester för flaggprovider, cache, admin backoffice och audit.
3. Contract tests för flaggmetadata, approvalkrav och miljöseparation.
4. E2E-tester av gradvis rollout, rollback och emergency disable.
5. Operativa tester av flaggstädning och utgångsdatum.

## Golden data

- golden flaggdefinitioner med metadata, owner, riskklass och slutdatum
- golden rolloutsekvenser där varje steg har definierad förväntad hälsobild
- golden disable-scenarier som visar stopp av nya side effects utan tyst dataförlust

## Kontraktstester

- verifiera att endast godkända roller kan ändra högriskflaggor
- verifiera att kill switches når både API, bakgrundsjobb och UI där så krävs
- verifiera att flaggändringar är miljöseparerade och inte läcker mellan staging och produktion
- verifiera att auditposter innehåller gammalt värde, nytt värde, scope, orsak och godkännande

## E2E-scenarier

- rulla ut funktion stegvis till pilottenant och verifiera hälsomått mellan varje steg
- aktivera emergency disable under pågående trafik och verifiera att nya side effects stoppas
- rulla tillbaka till föregående flaggstatus och verifiera cacheuppdatering samt normal funktion
- försök ändra högriskflagga utan rätt godkännande; verifiera blockering
- testa flagga som nått slutdatum och verifiera att städsignal eller blockerad fortsatt användning triggas

## Prestanda

- mäta propagationstid för flaggändring genom API, worker och klient
- verifiera att massdisable av flera flaggor inte ger kontrollförlust
- mäta overhead från flaggupplösning i kritiska anrop

## Felvägar

- kill switch stänger UI men inte bakgrundsjobb
- cache gör att gammal flaggstatus lever kvar för länge
- rollback lämnar blandat läge mellan instanser
- utgångna flaggor fortsätter användas utan varning
- högriskflagga kan ändras utan fyrögonsgodkännande

## Acceptanskriterier

- rolloutsteg, rollback och emergency disable beter sig deterministiskt
- audit trail för varje flaggändring är fullständig
- kritiska flöden kan stoppas snabbt utan att oklassificerade mellantillstånd uppstår
- gamla eller övergivna flaggor identifieras och kan avvecklas kontrollerat

## Exit gate

Testplanen är klar när feature-flag-lagret bevisligen stödjer säker rollout och snabb riskreducering utan att bli en dold källa till otestad affärslogik.

