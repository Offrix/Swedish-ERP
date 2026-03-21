# Accounting close, correction and lock policy

Detta dokument definierar hur perioder låses, vem som får öppna eller låsa perioder, när rättelse respektive reversal används, regler för manuella verifikationer och hur close-signoff sker.

## Scope

- periodlåsning, reopen, rättelser, reverseringar och close-signoff
- alla manuella verifikationer och close-justeringar som påverkar stängda eller på väg att stängas perioder

## Policy

### Periodstatus

- `open` innebär att ordinarie bokningar och subledgerflöden är tillåtna.
- `soft_locked` innebär att operativ bokning stängs för stora delar av verksamheten men att godkända justeringar kan fortsätta.
- `hard_closed` innebär att inga nya bokningar får göras i perioden utan formell reopen.

### Vem får låsa och öppna

- soft lock initieras av close_preparer eller finance manager.
- hard close kräver sign-off av close_signatory och vid behov andra domänsignatärer.
- reopen kräver minst två personer: den som begär och den som godkänner. Minst en av dem ska vara senior finance-roll.

### Rättelse vs reversal

- Före hard close används i första hand vanlig korrigering eller reversal inom samma period.
- Efter hard close används i första hand reversal eller korrigering i nästa öppna period om felet inte kräver ändring av redan externrapporterad period.
- Reopen används när felet är materiellt, påverkar extern rapportering eller annars gör nästa-period-rättelse olämplig.

### Manuella verifikationer

- Manual journals i close-period kräver reason code, underlag och attest.
- Journal mot kontrollkonto eller skattekonto kräver högriskgranskning.
- Alla close-justeringar ska länkas till difference item eller checklist-item i close-paketet.

### Sign-off

- Sign-off får ske först när bank, AR, AP, moms, suspense och close-checklistor är klara eller uttryckligen waivade.
- Varje sign-off är kopplad till snapshot-version av underlaget.
- Om perioden reopenas måste berörd sign-off göras om.

## Undantag

- Akut reopen efter incident kräver incidentnummer och eftergodkännande om beslutsfattare inte kan nås i realtid.
- Undantag från close-kalender ska dokumenteras i periodens close-paket.

## Obligatoriska bevis och loggar

- logg över lås- och öppningshändelser
- reopen request med orsak, påverkan och godkännare
- lista över manuella verifikationer i perioden och deras underlag
- close-signoff med snapshot-hash

## Review cadence

- månatlig close-review per bolag
- kvartalsvis kontroll av reopen-historik och orsaker
