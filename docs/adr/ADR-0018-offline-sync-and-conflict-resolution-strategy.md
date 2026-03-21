# ADR-0018 — Offline sync and conflict resolution strategy

Status: Accepted  
Date: 2026-03-21

## Context

- Fält- och mobila scenarier kräver arbete utan ständig nätuppkoppling.
- Samtidigt får offline-läge inte tillåta mutationer som äventyrar pengar, sign-off eller periodlås.
- Konflikter och dubbletter måste kunna förklaras och lösas utan dold dataförlust.

## Decision

- Vi tillåter offline-skrivning endast för uttryckligen godkända objekttyper och fält.
- Klienten skickar sync envelopes med lokal idempotensnyckel och basversion från servern.
- Servern är slutlig sanningskälla; merge-regler är explicita per objekttyp och fältklass.
- Konflikter normaliseras till konfliktposter med stöd för `server_wins`, `local_wins` eller `manual_resolution`.
- Reglerade ekonomi- och sign-off-objekt får aldrig skapas offline.

## Alternatives considered

- Full offline för alla objekt avvisades eftersom den centrala valideringen då undermineras.
- Tyst server-wins överallt avvisades eftersom lokal arbetsinsats då kan förloras utan förklaring.
- Peer-to-peer-synk avvisades eftersom produkten kräver central audit och permissionskontroll.

## Consequences

- Klienten måste visa pending state och konfliktstatus tydligt.
- Mobile-offline-runbook och testplan blir obligatoriska.
- Security och retention för lokal cache blir viktiga styrfrågor.

## Verification

- [ ] endast godkända objekt och fält kan muteras offline
- [ ] sync envelopes är idempotenta och versionsmedvetna
- [ ] konflikter blir synliga och lösbara
- [ ] dubblettskapande kan upptäckas
- [ ] auditspåret täcker lokal handling till serverutfall
