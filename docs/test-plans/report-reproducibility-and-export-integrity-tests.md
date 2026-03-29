> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Report reproducibility and export integrity tests

## Mål

Målet är att verifiera att metric catalog, rapportdefinitioner och exportjobb ger historiskt reproducerbara resultat, att drilldown stämmer mot underlaget och att Excel/PDF-exporter är kompletta, spårbara och oförvanskade.

## Scope

- måttkatalog, metric definitioner, versionsstyrning och metric owners
- rapportdefinitioner, filter, drilldown och historisk reproducerbarhet
- async exportjobb, statuskedja, vattenmärkning, filgenerering och exportaudit
- effekten av sena underlagsändringar efter tidigare export

## Fixtures

- golden perioder med låsta ledger-, AR-, AP-, bank- och projektdata
- metric versioner med planerade ändringar och bakåtkompatibilitetsfall
- exportfixtures för Excel och PDF med olika språk, bolag och rollscope
- datasets där underlag rättas efter tidigare export för att testa obsolescence- och watermark-regler

## Testlager

1. Unit tests för metric-beräkning, rundning, versionsupplösning och watermark-regler.
2. Integrations- och komponenttester för rapportmotor, drilldown, exportjobb och objektlagring.
3. Contract tests för rapportdefinitioner, metric-schema och exportmetadata.
4. E2E-tester från rapportvisning till export och efterföljande auditgranskning.
5. Regressions- och replaytester när metric version eller underlag ändras.

## Golden data

- golden rapporter med fast resultat per period, per metricversion och per filteruppsättning
- golden exporter där filhash, radantal, sidantal eller centrala cellvärden är låsta
- golden scenarios där sen rättelse gör tidigare export “historically superseded” men fortfarande spårbar

## Kontraktstester

- verifiera att rapport-API exponerar metricversion, underlagscheckpoint och filterpayload
- verifiera att exportjobbet bär korrelations-id, ägare, scope och filmetadata
- verifiera att drilldown-API returnerar underlag som summerar till visat metricutfall
- verifiera att exportfiler bara innehåller data användaren har rätt att se

## E2E-scenarier

- generera P&L, balans, cashflow och portföljrapporter; verifiera reproducerbarhet över upprepade körningar
- ändra metricdefinition i ny version; verifiera att gamla perioder kan återskapas med tidigare version
- skapa Excel- och PDF-export, verifiera innehåll, watermark, filmetadata och auditpost
- gör sen rättelse i underlaget efter export; verifiera att ny export markeras korrekt och att tidigare export behåller sin historik
- följ drilldown från rapport till journal, dokument och källa

## Prestanda

- mäta exporttid, minnesanvändning och objektlagringsskrivningar för stora rapporter
- verifiera att parallella exportjobb inte förväxlar filer eller metadata
- mäta responslatens för interaktiv drilldown på stora dataset

## Felvägar

- samma rapport ger olika resultat utan ändrad metricversion eller underlag
- exportfil saknar rader, sidor eller förklaringsmetadata
- drilldown summerar inte till rapportvärdet
- sen rättelse gör att användaren tror gammal export fortfarande är aktuell fast den supersederats
- användare exporterar data utanför sitt scope

## Acceptanskriterier

- rapporter är historiskt reproducerbara med känd metricversion och underlagscheckpoint
- exportjobb producerar korrekta och spårbara Excel/PDF-filer
- drilldown förklarar samtliga centrala mått
- sena underlagsändringar hanteras utan att tidigare exporter eller auditspår förvanskas

## Exit gate

Testplanen är klar när rapporter, metrik och exporter kan granskas och återskapas med full spårbarhet trots versioner, rättelser och asynkron filgenerering.

