# External adapter contract matrix

Detta dokument listar varje extern adapter, dess kontraktstest, sandboxmiljö, testdata, webhook-signatur, felkoder och acceptanskriterier.

## Översikt

- Kontraktstester ska köras i CI där sandbox finns och i manuell verifiering där leverantören begränsar automation.
- Varje adapter ska ha tydligt definierad request/response-shape, authmodell, idempotensnyckel, felöversättning och retry-regel.
- Varje adapteranslutning ska ha explicit credentials reference per miljö; tyst fallback till delad eller saknad credential är förbjuden.
- När en leverantör saknar stabil sandbox ska kontraktstester kompletteras med inspelade fixtures och strikta schemaassertioner.

## Adaptermatris

| Adapter | Sandbox och scope | Kärnkontrakt att testa | Webhook/verifiering | Typiska felkoder | Acceptanskriterier |
| --- | --- | --- | --- | --- | --- |
| Signicat auth/sign | Separat sandbox-tenant | login start, callback success, callback fail, sign start, sign complete, replay block | Verifiera callback-signatur, timestamp och replay-skydd | invalid_client, redirect_mismatch, user_cancelled, signature_invalid | stark auth och signering fungerar, fel mappas till produktens feltyper |
| WorkOS SSO | Sandbox/test-org | SAML/OIDC login, claim mapping, deprovisioning, kontoavstängning och gruppsynk, JIT provisioning | Verifiera state, nonce och issuer | invalid_assertion, issuer_mismatch, domain_not_allowed | SSO kan skapa intern session utan att kringgå rollmodellen |
| Enable Banking AIS | Sandbox + utvalda testbanker | account list, balances, transactions, consent refresh, duplicate transaction prevention | Verifiera event signatur om webhook används | consent_expired, access_denied, account_not_available | konto och transaktioner kan hämtas idempotent |
| Storecove Peppol | Sandbox-legal entity | send invoice, send credit, receive status, receive document, discovery | Verifiera webhook-signatur eller partnerns säkerhetsmodell | validation_error, recipient_not_found, auth_failed | sändning och mottagning fungerar med full kvittenskedja |
| AWS SES inbound | Staging-domän/inbound-subdomän | receive raw email, multiple attachments, invalid attachment, duplicate message-id | Verifiera att källan är SES och att bucket/event matchar | address_not_verified, rule_error, oversized_message | råmail lagras och routas utan förlust |
| Textract OCR | Sandbox/testkonto | expense extraction, line items, low confidence, rerun, timeout/retry | Ingen webhook i normalfallet; verifiera job-id och callback om async används | throttling, invalid_document, page_limit_exceeded | OCR-resultat kan versioneras och low-confidence går till review |
| Postmark outbound | Sandbox/server token | send transactional email, bounce webhook, delivery webhook | Verifiera message stream och webhook-signatur | inactive_recipient, bounce, api_token_invalid | utgående transaktionsmail är spårbara och kan knytas till domänhändelse |
| Cloudflare / DNS / WAF | Icke-kritisk testzon | DNS update, certificate state, WAF allow/deny for webhook paths | Verifiera auditlogg och token-scope | permission_denied, zone_not_found | kritiska domäner kan skyddas och uppdateras utan sidofel |

## Gemensamma kontraktstestregler

- Varje test ska spara rå request, rå response, tolkad response och intern domänhändelse.
- Fel från leverantör ska översättas till intern felkod med kategori: auth, validation, transport, rate_limit, provider_down eller unknown.
- Retries får bara ske på uttryckligen retrybara fel; kontraktstester ska bevisa att irreversibla actions inte dupliceras.

## Exit gate

- [ ] varje adapter har en sandbox- eller fixture-baserad kontraktstestsvit
- [ ] felkoder är mappade till intern taxonomi
- [ ] webhook-verifiering är testad med både giltig och ogiltig signatur
- [ ] idempotensfall är testade för inkommande och utgående events
