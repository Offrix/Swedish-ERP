> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# Phase 3.4 API Edge Hardening

## Syfte

Verifiera att API-edge följer bindande skyddskrav för body size, timeout, origin policy, säkerhetshuvuden, signerade webhookleveranser, anti-replay och abuse throttling.

## När den används

- efter implementation eller ändringar i `apps/api/src/server.mjs`
- efter ändringar i `apps/api/src/route-helpers.mjs`
- efter ändringar i webhook-signering eller dispatch i `packages/domain-integrations/src/public-api.mjs`
- före markering av `3.4` som klar i styrdokumenten

## Förkrav

- repo är bootstrapat
- lokala testkommandon fungerar
- KMS/secrets för föregående säkerhetsdelfaser är redan på plats

## Steg för steg

1. Kör `node --test tests/integration/phase3-api-edge-hardening.test.mjs`.
2. Kör `node --test tests/unit/phase13-public-api.test.mjs`.
3. Kör `node --test tests/integration/phase13-public-api-api.test.mjs`.
4. Kör `node --test tests/integration/phase1-org-auth-api.test.mjs`.
5. Kör `node --test tests/integration/phase2-ocr-review-api.test.mjs`.
6. Kör `node scripts/run-tests.mjs all`.
7. Kör `node scripts/lint.mjs`.
8. Kör `node scripts/typecheck.mjs`.
9. Kör `node scripts/build.mjs`.
10. Kör `node scripts/security-scan.mjs`.

## Verifiering

- alla JSON-svar bär centrala säkerhetshuvuden
- råa interna felmeddelanden läcker inte i 5xx-svar
- feature-disabled och andra avsiktliga operativa fel behåller förklarande publik text
- body size limit stoppar överstora förfrågningar med `request_body_too_large`
- stallade request bodies avbryts med `request_timeout`
- muterande routes utan tillåten origin blockeras med `origin_not_allowed`
- cookie-bunden mutation utan explicit bearerflöde blockeras med `cookie_transport_not_supported`
- abuse throttling returnerar `edge_rate_limited` och `retry-after`
- webhookleveranser signeras med versionsstyrd signaturschema
- webhooksignaturer faller på ogiltig signatur, ogiltig tidsstämpel och för gammalt replayfönster

## Vanliga fel

- `request_body_too_large`: klient eller reverse proxy skickar större payload än edge-policyn tillåter
- `request_timeout`: klient skickar för långsamt eller hänger halvöppen
- `origin_not_allowed`: muterande anrop kommer från origin som inte är tillåten i aktiv runtime
- `cookie_transport_not_supported`: muterande route försöker använda cookie-session utan uttryckligt bearerflöde
- `edge_rate_limited`: konto, IP eller routeprofil överskrider edgebudget
- `webhook_signature_invalid`: mottagare verifierar med fel hemlighet eller manipulerad body
- `webhook_signature_replay_window_expired`: webhook levereras eller återspelas utanför tillåtet fönster

## Återställning

- återställ senaste edge-policy- eller route-helper-ändring om kontrakt bryts
- sänk inte säkerhetshuvuden eller rate limits utan ny verifiering och säkerhetsägarbeslut
- skapa ny webhooksigneringsnyckel om signaturkedjan inte längre kan verifieras

## Rollback

- rulla tillbaka senaste commit som ändrade edge-policy, timeout eller signingkedja
- radera inte historiska webhookleveranser; skapa ny dispatch eller ny signing key version

## Ansvarig

- huvudagenten som levererar Phase 3.4

## Exit gate

- hela verifieringskedjan ovan är grön
- edgepolicy, signering och anti-replay beter sig deterministiskt
- inga API-kontrakt eller felenvelopes har brutits av säkerhetshärdningen
