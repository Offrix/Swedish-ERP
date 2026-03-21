# ADR-0007 — Security baseline

Status: Accepted  
Date: 2026-03-21

## Baseline

- MFA för alla interna konton.
- Minst TOTP eller passkeys för externa administratörer.
- Roll- och objektbaserad åtkomst på serversidan.
- Inga hemligheter i repo.
- Secrets i AWS Secrets Manager eller motsvarande.
- Kryptering i transit överallt.
- Kryptering i vila för databaser och objektlagring.
- Audit log för:
  - inloggning
  - åtkomst till känsliga objekt
  - attest
  - betalningsinitiativ
  - AGI- och momsinlämning
  - HUS-ansökan
  - årsstängning
- IP- och session risk-flaggor för adminfunktioner.
- Servicekonton med minsta möjliga behörighet.
- Säkerhetsheaders och CSP i webbappar.
- WAF framför publika ingångar.
- Rate limits och anti-automation där relevant.
- Säker filuppladdning med malware scanning.
- Backup, återläsning och disaster recovery-test.
- Segregation of duties mellan utveckling, drift och produktion.

## Data classification

### Klass A — Högst känsligt
- personnummer
- löneinformation
- sjukfrånvaro
- BankID-identitetsdata
- bankkonton
- kunders bokföringsdata
- HUS-underlag

### Klass B — Känsligt
- fakturor
- avtal
- projektkalkyler
- leverantörspriser

### Klass C — Internt
- användarinställningar
- dashboardpreferenser
- supportärenden

## Verification

- [ ] Penetrationstest före extern pilot.
- [ ] Sårbarhetsscanning i CI.
- [ ] Secrets scanning i repo.
- [ ] Åtkomstloggar granskas.
- [ ] Återläsningstest körs minst kvartalsvis.
