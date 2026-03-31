> Statusnotis: Detta dokument ar inte primar sanning. Bindande styrning fore UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument ar historiskt input- eller stoddokument och far inte overstyra dem.
# Support backoffice and audit review

## Syfte

Detta runbook beskriver hur support och admin backoffice anvands for felsokning, access review, impersonation, break-glass och auditgranskning utan att behorighetsregler eller sparbarhet bryts.

## Nar den anvands

- vid supportarende dar vanliga anvandarvyer inte racker for diagnos
- vid incident som kraver audit explorer, admin diagnostics eller begransad impersonation
- vid planerad access review eller SoD-granskning
- nar operator maste replaya eller retrya tillatna tekniska actions i backoffice

## Forkrav

1. Arendet ska ha support-id eller incident-id.
2. Operatoren ska ha ratt roll for support eller admin diagnostics.
3. Policyn for supportatkomst, impersonation och break-glass ska vara accepterad.
4. Om arendet galler reglerat flode ska kall-domanens owner vara kand innan andring gors.
5. Break-glass far endast anvandas nar ordinarie accessvag inte racker och maste dokumenteras separat.

## Steg for steg

1. Registrera arbetet.
   - oppna eller lanka supportarende
   - beskriv mal, scope, tenant, bolag, objekt och anvandare
   - valj om atgarden ar lasning, diagnos, impersonation, replay/retry eller access review
2. Utfor diagnos.
   - anvand audit explorer for att folja objektets historik
   - anvand admin diagnostics for att lasa kostatus, integrationsstatus, feature flags och senaste fel
   - las endast minsta nodvandiga data
   - verifiera att standardvyn fortfarande ar maskad innan impersonation eller break-glass aktiveras
3. Impersonation.
   - kontrollera att policyn tillater impersonation for arendetypen
   - kontrollera att eventuell limited-write actionlista bara innehaller uttryckligen allowlistade tekniska actions
   - starta tidsbegransad session med tydligt vattenmarkt bannerlage
   - anvand write-block om full skrivatkomst inte uttryckligen kravs
   - avsluta sessionen direkt efter verifiering
4. Break-glass vid behov.
   - registrera incident-id, orsak, forvantad varaktighet och godkannare
   - verifiera att requested actions ar uttryckligen allowlistade
   - aktivera minsta mojliga forhojda atkomst
   - utfor endast den specifika atgard som kravs
   - avsluta och aterkalla atkomsten omedelbart efter anvandning
5. Access review och attestation.
   - generera review batch for scope
   - behandla varje finding med godkant beslut eller remediation
   - batchen ar inte klar forran separat sign-off gjorts av annan person an den som skapade eller behandlade reviewn
   - sign-off-note ska beskriva att minsta behorighet ar verifierad
6. Tillatna operatorsatgarder.
   - retry/replay av tekniska jobb enligt tillhorande runbook
   - aterstallning av fastnad UI-status nar kall-domanen uttryckligen tillater det
   - uppdatering av supportklassning, owner eller tekniskt sparningsfalt
   - ingen supportoperator far andra affarsbeslut, sign-off, bokforingsutfall eller godkannande utan domanens definierade process
7. Avsluta arendet.
   - dokumentera vad som observerades och vad som andrades
   - lanka auditposter
   - markera eventuell uppfoljande access review eller incidentatgard

## Verifiering

- supportarendet innehaller orsak, scope, utforda steg och resultat
- all impersonation och break-glass syns i audit trail med start/slut, operator, allowlist policy och motivering
- inga otillatna domanandringar har gjorts genom supportvagen
- eventuella replay/retry-atgarder lankar till respektive jobb- eller submissionkedja
- access review batches ar signerade av separat attestant innan de betraktas som klara

## Vanliga fel

- **Fel:** support behover andra business data som policyn forbjuder.  
  **Atgard:** stoppa atgarden och skapa uppgift till ratt domanroll eller anvand officiellt korrigeringsflode.
- **Fel:** anvandaren vill att support ska godkanna at dem.  
  **Atgard:** avvisa begaran och hanvisa till ordinarie attest- eller sign-off-chain.
- **Fel:** impersonation visar inte samma vy som anvandaren beskriver.  
  **Atgard:** kontrollera feature flags, cache, klientkonfiguration och om problemet ar tids- eller datarelaterat.
- **Fel:** break-glass anvands utan incident-id eller efterfoljande dokumentation.  
  **Atgard:** stoppa sessionen, skapa incidentuppfoljning och access review omedelbart.

## Aterstallning

- felaktiga supportatgarder aterstalls genom domanspecifik korrigering, inte genom att dolja auditsparet
- om forhojd atkomst rakat ligga kvar ska sessioner aterkallas, tokens roteras vid behov och incident oppnas
- om supportatgard startat replay eller andrat tekniskt state felaktigt anvands respektive runbook for korrigering

## Rollback

- rollback av supportverktygsforandring sker genom att avsluta sessioner, aterstalla flaggstatus och aterkalla temporar atkomst
- redan skapade auditposter rullas inte tillbaka utan kompletteras med forklarande poster

## Ansvarig

Primart ansvarig ar supportansvarig eller incident commander beroende pa arendetyp. Security admin ansvarar for break-glass och efterfoljande granskning.

## Exit gate

Runbooken ar klar nar arendet ar lost eller korrekt eskalerat, alla forhojda atkomster ar stangda, access reviews ar signerade och auditsparet ar komplett for eftergranskning.
