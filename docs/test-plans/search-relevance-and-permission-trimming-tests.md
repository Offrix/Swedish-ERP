# Search relevance and permission trimming tests

## Mål

Målet är att verifiera att global sökning returnerar rätt objekt i rätt ordning, att resultatsidor och snippets aldrig läcker otillåten information och att reindex/reparationsflöden bevarar sökkvaliteten.

## Scope

- global search, saved searches, filter, ranking och search-resultat i listor och drilldowns
- permissions trimming för bolag, objekt, sekretessklass, delegation och byråscope
- stale-data-regler, targeted reindex, tombstones och delete/update-semantik
- användarupplevelsen när objekt finns men inte får visas

## Fixtures

- dataset med kunder, leverantörer, fakturor, dokument, submissions, projekt, arbetsobjekt och klientportföljer med överlappande namn
- användarprofiler för intern admin, konsult, klientanvändare, attestant och support utan full åtkomst
- objekt med kända rankningssignaler: exakt id, exakt namn, prefix, fritext, taggar, senaste aktivitet
- tombstone- och stale-fixtures för borttagna eller nyligen ändrade objekt

## Testlager

1. Unit tests för rankningsfunktioner, normalisering, synonymregler och permissionbeslut.
2. Integrations- och komponenttester mot indexprojektion, querylager och cache.
3. Contract tests för indexschema, snippetfält och saved-search-payload.
4. E2E-tester genom UI, filter, klick från resultat till objekt och åtkomstnekning.
5. Operativa tester för full reindex, partiell reindex och schemauppgradering.

## Golden data

- golden queries per objekttyp med låst förväntad ranking
- golden permission-matriser som visar vilka träffar olika roller får se
- golden reindex-scenarier före och efter schemaändring
- golden dataset där objekt flyttar scope genom delegation eller statusändring

## Kontraktstester

- verifiera att varje indexdokument innehåller endast tillåtna fält och korrekt permissions payload
- verifiera att query-API stödjer fritext, filter och sortering utan att kringgå trimming
- verifiera att saved searches validerar schemaversion och returnerar begripligt fel när de är brutna
- verifiera att “träff finns men åtkomst saknas” inte läcker titel eller känsligt snippetfält när policy förbjuder det

## E2E-scenarier

- sök med exakt fakturanummer, kundnamn, dokument-id och delord; verifiera ranking och klickbarhet
- byt roll, bolag eller delegation och kör samma sökning; verifiera att resultatmängden ändras korrekt
- uppdatera ett objekt, vänta enligt stale-regel och verifiera att nytt värde syns; kör targeted reindex vid behov
- radera eller tombstone-markera objekt; verifiera att resultatet försvinner eller ersätts av policyenligt meddelande
- reparera brutet saved search eller saved view och verifiera att användaren får korrekt migration eller tydlig felväg

## Prestanda

- mäta söklatens för toppfrågor, breda frågor och filtertunga frågor
- mäta reindex-genomströmning per objekttyp och tenant
- verifiera att permissions trimming inte ger oacceptabel latensökning under normal och hög last

## Felvägar

- otillåten data visas i snippets eller filterchips
- exakt id rankas lägre än brusig fritext
- stale data ligger kvar efter tillåten tidsgräns
- saved search pekar mot borttaget fält utan att användaren får begriplig diagnos
- reindex skapar dubbletter eller tappar tombstones

## Acceptanskriterier

- topprankade golden queries matchar förväntad ordning
- ingen otillåten data läcker i UI eller API för någon rollprofil
- saved searches och views överlever schemaändringar eller blir tydligt trasiga med reparationsväg
- reindex kan köras utan att permissions trimming eller ranking kollapsar

## Exit gate

Testplanen är klar när sök, saved searches och permissions trimming beter sig deterministiskt över rollprofiler, schemaändringar och reindex-operationer.
