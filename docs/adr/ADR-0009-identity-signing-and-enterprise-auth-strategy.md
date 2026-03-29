> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0009 — Identity, signing and enterprise auth strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Produkten behöver stark svensk e-legitimation för känsliga actions, enterprise SSO för större kunder och ett signeringsspår för avtal, sign-off och vissa rapportflöden.
- Byggplanen kräver tydlig separation mellan sandbox och produktion samt en strategi som kan leverera snabbt utan att hårdkoda leverantörsberoenden i domänen.
- Adminflöden, betalningar, AGI/moms/HUS och close sign-off kräver högre assurance än vanlig inloggning.

## Decision

- V1 använder Signicat som BankID/eID-provider för svensk stark autentisering och Signicat Sign API v2 för e-signering.
- V1 använder WorkOS för enterprise federation mot kunders identitetsleverantörer via SAML eller OIDC.
- Produkten inför ett internt auth-broker-lager som normaliserar identiteter från Signicat, WorkOS och lokala konton till en intern sessionmodell.
- SCIM eller Directory Sync är inte krav i v1. Provisionering i v1 sker via just-in-time, domänmatchning och administrativ inbjudan. Directory Sync kan införas senare bakom samma brokerlager.
- Passkeys är förstahandskrav för interna administratörer och för externa administratörskonton som inte använder enterprise SSO. TOTP finns som fallback för kompatibilitet och break-glass.
- Enterprise-SSO-användare ska primärt lita på kundens IdP-MFA. Produkten kräver lokal step-up-autentisering bara för särskilt högrisksteg när policy eller regulatorisk tolkning kräver det.
- Signering av PDF-baserade dokument använder PAdES som standard. XAdES används endast när XML-baserad signering uttryckligen krävs av ett flöde.
- Sandbox och produktion hålls helt separerade: separata leverantörskonton/tenants, separata klient-id:n, callback-domäner, webhook-hemligheter, sessionscookies, testidentiteter och signeringsmiljöer.

## Why

- Signicat ger snabb åtkomst till svensk BankID och signering inom samma leverantörsram vilket minskar time-to-market och förenklar auditspår.
- WorkOS ger tydligt stöd för både SAML och OIDC och passar för enterprise-kunder som vill federera utan att produkten själv bygger all federation från grunden.
- Att skjuta SCIM till senare minskar scope och komplexitet i v1 utan att låsa bort framtida provisioning, eftersom identity broker-lagret redan införs.
- Passkeys minskar risken för phishing mot privilegierade lokala konton. TOTP behålls som pragmatisk backup när passkeys inte kan användas.
- Full miljöseparation minskar risken att testidentiteter, fel callback-URL:er eller testdata läcker in i produktion.

## Consequences

- Två identitetsleverantörer används samtidigt: Signicat för svensk stark identitet och WorkOS för enterprise federation. Detta kräver en tydlig intern identitetsmodell.
- Provisionering i v1 blir enklare men inte lika automatiserad som med SCIM. Enterprise-kunder som kräver automatisk deprovisionering i realtid får vänta till senare fas.
- Lokala admins måste hantera passkey-enrollment och backupflöden.
- All signering och stark autentisering måste loggas med assurance-nivå, provider, transaktions-id och använd session.
- Leverantörsbyte är fortfarande möjligt senare eftersom domänen inte pratar direkt med provider-protokoll utan via abstraherad auth/signing adapter.

## Out of scope

- Direktavtal direkt mot BankID i v1.
- Egen implementation av SAML/OIDC federation utan WorkOS.
- SCIM-krav i första externa pilot om inte specifik kund uttryckligen blockerar pilot utan det.

## Exit gate

- [ ] lokal admin kan logga in med passkey och fallback-TOTP
- [ ] svensk stark inloggning via BankID fungerar i sandbox och produktion med separata credentials
- [ ] enterprise SSO kan anslutas via SAML eller OIDC utan kodändring i kärndomänen
- [ ] signeringsflöde för PDF kan köras med PAdES och full audit
- [ ] sandbox- och prod-domäner, hemligheter och callback-URL:er är fysiskt separerade

