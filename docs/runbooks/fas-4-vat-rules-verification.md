> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# FAS 4.2 VAT rules verification

## Syfte

Denna runbook verifierar att FAS 4.2 levererar scenariostyrd svensk momslogik med korrekta deklarationsboxar, speglade kreditnotor och dubbelbokning fÃ¶r import och omvÃ¤nd moms.

## NÃ¤r den anvÃ¤nds

- efter implementation av FAS 4.2
- fÃ¶re commit eller push av FAS 4.2
- vid regressionskontroll av svenska, EU-, import-, export- eller reverse-charge-flÃ¶den

## FÃ¶rkrav

- Docker-infra Ã¤r uppe om riktiga migrationer och seeds ska kÃ¶ras
- repo ligger pÃ¥ korrekt branch och arbetskatalog
- FAS 4.1 Ã¤r redan verifierad

## Steg fÃ¶r steg

1. KÃ¶r `node scripts/lint.mjs`.
2. KÃ¶r `node scripts/typecheck.mjs`.
3. KÃ¶r `node scripts/build.mjs`.
4. KÃ¶r `node scripts/run-tests.mjs unit`.
5. KÃ¶r `node scripts/run-tests.mjs integration`.
6. KÃ¶r `node scripts/run-tests.mjs e2e`.
7. KÃ¶r `powershell -ExecutionPolicy Bypass -File .\scripts\verify-phase4-vat-rules.ps1`.
8. KÃ¶r `node scripts/db-migrate.mjs --dry-run`.
9. KÃ¶r `node scripts/db-seed.mjs --dry-run`.
10. KÃ¶r `node scripts/db-seed.mjs --demo --dry-run`.
11. Om lokal infra Ã¤r tillgÃ¤nglig, kÃ¶r `node scripts/db-migrate.mjs`.
12. Om lokal infra Ã¤r tillgÃ¤nglig, kÃ¶r `node scripts/db-seed.mjs`.
13. Om lokal infra Ã¤r tillgÃ¤nglig, kÃ¶r `node scripts/db-seed.mjs --demo`.

## Verifiering

- svenska 25/12/6/0-scenarier returnerar deklarationsboxbelopp och bokfÃ¶ringspÃ¥verkan
- EU B2B-fÃ¶rsÃ¤ljning och reverse-charge-inkÃ¶p landar i rÃ¤tta rutor
- importmoms skapar bÃ¥de utgÃ¥ende och avdragsgill ingÃ¥ende moms nÃ¤r avdrag finns
- bygg-omvÃ¤nd moms krÃ¤ver korrekt fakturatextkrav och ger rÃ¤tt boxmappning
- kreditnota spegelvÃ¤nder originalbeslutets boxbelopp och bokfÃ¶ringsposter
- saknat original fÃ¶r kreditnota gÃ¥r till granskningskÃ¶ i stÃ¤llet fÃ¶r tyst auto-bokning

## Vanliga fel

- `candidate_conflicts_with_inputs`
  Kontrollera att `vat_code_candidate` inte motsÃ¤ger land, riktning, import/export eller reverse-charge-fakta.
- `original_vat_decision_missing`
  Kontrollera att kreditnotan skickar korrekt `original_vat_decision_id` inom samma bolag.
- `unsupported_domestic_vat_rate`
  Kontrollera att svensk standardfÃ¶rsÃ¤ljning anvÃ¤nder 25, 12, 6 eller explicit undantag.
- `unsupported_reverse_charge_vat_rate`
  Kontrollera att reverse-charge-scenariot anvÃ¤nder en stÃ¶dd svensk momssats.

## Ã…terstÃ¤llning

- skapa nytt underlag med nytt `source_id` om du behÃ¶ver kÃ¶ra samma scenario igen utan idempotent replay
- skapa nytt regelpaket i stÃ¤llet fÃ¶r att mutera befintligt om boxmappning mÃ¥ste Ã¤ndras
- skapa ny kreditnota med korrekt originalreferens i stÃ¤llet fÃ¶r att skriva Ã¶ver gammalt beslut

## Rollback

- Ã¥terstÃ¤ll commit om FAS 4.2 mÃ¥ste dras tillbaka
- behÃ¥ll migreringsordningen intakt; skapa kompensationsmigrering i stÃ¤llet fÃ¶r att redigera gammal migrering
- markera FAS 4.2 som ej verifierad i styrdokumenten om rollback gÃ¶rs

## Ansvarig

- huvudansvar: teknikgenomfÃ¶rare fÃ¶r repo
- granskningsansvar: moms- eller redovisningsansvarig fÃ¶r deklarationsboxar och kreditnotespegling

## Exit gate

- [ ] deklarationsboxar summerar rÃ¤tt
- [ ] kreditnota spegelvÃ¤nder moms korrekt
- [ ] importmoms och reverse charge dubbelbokas rÃ¤tt
- [ ] migration, seeds, tester och verifieringsscript Ã¤r grÃ¶na

