> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Search index rebuild and repair

## Syfte

Detta runbook beskriver hur sökindex diagnostiseras, byggs om, repareras och verifieras utan att användarbehörigheter eller objektkonsistens bryts. Runbooken används när sökresultat saknas, är stale, visar fel titel eller när permissions trimming misstänks vara felaktig.

## När den används

- vid planerad full reindex efter schemauppgradering eller ny indexversion
- vid partiell reindex av bolag, objekttyp, period eller tenant efter datafel
- när användare rapporterar att objekt finns i systemet men inte hittas, eller hittas med fel metadata
- när tombstones, delete-semantik eller permissions trimming beter sig fel
- efter incident i kö, projektion eller indexlager

## Förkrav

1. Operatören ska ha adminbehörighet för sökdrift och läsbehörighet till audit explorer.
2. Pågående indexmigrering eller schemabyten ska vara kända och dokumenterade.
3. Baslinje ska tas ut före åtgärd:
   - totalt antal indexerade objekt per objekttyp
   - antal väntande indexjobb
   - antal felade indexjobb
   - senaste lyckade checkpoint per tenant
   - stickprov på minst fem kända objekt-id som ska vara sökbara
4. Om problemet kan vara behörighetsrelaterat ska testkonto med samma rollprofil finnas tillgängligt.
5. Om full reindex planeras ska driftansvarig verifiera att kapacitetsfönster, köstorlek och backfill-budget är godkända.

## Steg för steg

1. Klassificera felet.
   - `stale_index`: källdata är nyare än index men objektet finns.
   - `missing_document`: objekt finns i källa men inget indexdokument finns.
   - `permission_mismatch`: resultat syns för fel person eller döljs för rätt person.
   - `mapping_error`: fel snippet, fel titel eller fel filterfält.
   - `delete_mismatch`: borttaget objekt finns kvar eller aktivt objekt är tombstonat.
2. Avgränsa scope.
   - fastställ tenant, bolag, objekttyp och tidsintervall
   - identifiera källobjektets senaste versionsnummer och senaste projektionsevent
   - kontrollera om felet gäller enskilt objekt, delmängd eller hela indexet
3. Pausa endast relevanta backfill- eller replayjobb om de förstärker felet. Stoppa aldrig läsning globalt om endast delscope påverkas.
4. Kontrollera källdomänens projektion.
   - bekräfta att senaste godkända version finns i källsystemet
   - bekräfta att projektionsevent publicerats i korrekt ordning
   - bekräfta att permission payload innehåller rätt bolagsscope, objektscope och sekretessklass
5. Kontrollera indexlagret.
   - läs indexdokument för objekt-id
   - jämför versionsnummer, tombstone-status, permission payload och sökfält mot källprojektion
   - kontrollera alias/indexversion om nytt schema nyligen aktiverats
6. Välj reparationsåtgärd.
   - enstaka objektfel: kör targeted reindex för objekt-id
   - partiellt tenantfel: kör reindex per objekttyp och tenant
   - globalt schemafel: bygg nytt index parallellt och byt alias först efter verifiering
   - permissionsfel: kör om projectionskedjan från senaste säkra checkpoint för berört scope
7. Utför reindex.
   - skapa jobb med explicit `reason_code`
   - använd idempotensnyckel `search-reindex:{scope}:{schema_version}:{request_id}`
   - kör aldrig två fulla reindexjobb för samma indexalias samtidigt
   - vid full reindex: bygg nytt index, fyll det, kör verifiering och switcha alias atomärt
8. Reparera delete/update-semantik.
   - om objekt är borttaget i källa ska indexet bära tombstone eller fysiskt raderas enligt indexstrategin
   - om objekt återaktiverats ska tombstone ersättas av ny aktiv version
   - tombstone får aldrig återintroduceras efter nyare aktiv version
9. Verifiera permissions trimming.
   - sök med användare inom scope och utanför scope
   - bekräfta att objekt antingen visas korrekt eller ersätts med “träff finns men du saknar åtkomst” enligt produktregeln
   - säkerställ att snippets inte läcker dolda fält
10. Stäng åtgärden.
   - dokumentera root cause
   - länka incident eller supportärende
   - lämna indexstatus som `healthy`, `degraded` eller `monitoring`

## Verifiering

- antal indexerade dokument efter åtgärd matchar källdomänens projektioner inom definierad tolerans på noll för reglerade objekttyper
- stickprov på identifierade objekt-id ger korrekt träff, korrekta filterfält och korrekt permissions trimming
- inga felade reindexjobb återstår öppna utan owner
- audit trail innehåller vem som initierade reindex, exakt scope, orsak, start/sluttid, resultat och verifieringsutfall
- sökresponslatens och ködjup ligger tillbaka inom normal driftprofil

## Vanliga fel

- **Fel:** alias pekar fortfarande på gammalt index efter full rebuild.  
  **Åtgärd:** verifiera att backfill slutförts, kör kontroll av dokumentantal, byt alias manuellt enligt godkänd change och markera gammalt index som read-only tills stickprov passerat.
- **Fel:** objekt hittas via exakt id men inte via fritext.  
  **Åtgärd:** kontrollera analyserad tokenisering, normalisering och om fritextfältet verkligen ingår i mappningen för objekttypen.
- **Fel:** användare ser “träff finns men åtkomst saknas” för objekt som borde vara synligt.  
  **Åtgärd:** jämför källobjektets scope och delegeringar med indexets permission payload; kör targeted reindex när källan är korrekt.
- **Fel:** reindexjobbet går i dead-letter.  
  **Åtgärd:** följ runbook för async-jobb, rätta felorsak, replaya endast scope som saknas.

## Återställning

- om felaktig reindex redan bytt alias ska tidigare alias återställas endast om gamla indexet fortfarande är verifierat och komplett
- om targeted reindex skrivit fel metadata ska scope märkas `degraded`, felaktiga jobb stoppas och källdomänens projektion spelas om från senaste säkra checkpoint
- om permissionsläcka bekräftas ska sökfunktionen för berörd objekttyp disable:as med feature flag tills korrekt payload byggts om
- alla återställningar ska lämna spår i audit explorer och incidentloggen

## Rollback

- aliasbyte under full reindex kan rullas tillbaka till föregående indexversion om tidigare alias fortfarande finns kvar och verifierats
- partiell reindex rullas tillbaka genom ny targeted reindex från källprojektion, inte genom direkt editering i indexdokument
- om schemaändring orsakar systemiskt fel ska nytt schema avaktiveras, gammalt schema återtas och nytt försök planeras i eget change-fönster

## Ansvarig

Primärt ansvarig är sök-/plattformsteamets driftansvariga. Säkerhetsansvarig ska delta när permissions trimming eller möjlig informationsläcka utreds. Produktägare för berörd domän ansvarar för att validera affärsresultatet efter reparation.

## Exit gate

Runbooken är klar när indexet är verifierat, incident eller supportärende har tydlig root cause, eventuell reindex är auditloggad och inga oklassificerade sökfel återstår i action queue.

