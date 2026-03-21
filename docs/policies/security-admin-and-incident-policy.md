# Security admin and incident policy

Detta dokument definierar adminkrav, MFA-nivåer, sessionstid, IP/device-riskflaggor, incidentflöde, hotfix i produktion, nyckelrotation och granskningsintervall för auditloggar.

## Scope

- säkerhetsadministration, privilegierade roller, incidenthantering och produktionshotfixar
- hemligheter, nycklar, sessioner, riskflaggor och auditloggar

## Policy

### Admin- och MFA-krav

- Alla interna och privilegierade konton ska använda stark autentisering. Passkey är förstahandsval; TOTP är fallback där passkey inte är möjligt.
- Enterprise-SSO-konton ska ha MFA i IdP och step-up i produkten för särskilda högriskactions när policyn kräver det.
- Generella admins har högst 8 timmars absolut sessionstid och 30 minuters idle timeout. Break-glass har högst 60 minuter absolut och 15 minuter idle.
- Betalningsfrisläpp, BankID-liknande stark signering, AGI/moms/HUS och vissa security actions kräver färsk stark auth, högst 5 minuter gammal.

### IP- och device-riskflaggor

- Nytt land, ovanlig ASN, TOR/VPN-indikation, omöjlig resa, ny okänd enhet och många misslyckade inloggningar ska ge riskflagga.
- Riskflagga ska kunna leda till step-up, temporär spärr eller manuell review beroende på actionens känslighet.

### Incidentflöde

- Incidenter klassas minst som Sev1, Sev2, Sev3 eller Sev4.
- Personuppgiftsincident ska bedömas omedelbart och, när den är anmälningspliktig, anmälas inom 72 timmar från att organisationen fått vetskap.
- Vid Sev1 eller Sev2 ska deploy freeze införas tills incidentledaren släpper den.
- Bevis ska säkras före storskaliga databasingrepp eller loggrensning.

### Prod-hotfix

- Hotfix i produktion får bara ske med incidentnummer eller motsvarande riskärende.
- Minst en annan kvalificerad person ska granska hotfixen om inte absolut nödläge dokumenteras.
- Efter hotfix ska smoke tests köras och relevant runbook, test och dokumentation uppdateras.

### Nyckelrotation och audit

- Webhook-hemligheter och externa API-credentials roteras minst kvartalsvis eller omedelbart vid misstanke om kompromettering.
- Leverantörs- och signeringscertifikat förnyas minst 30 dagar före utgång.
- Auditloggar för högriskactions granskas veckovis och bredare access-/säkerhetslogg månadsvis.

## Undantag

- Nödvändigt prod-ingrepp utan full peer review kräver dokumenterad eftergranskning senast nästa arbetsdag.
- Tillfälliga undantag från normal rotation får endast beslutas av security owner och tidsbegränsas.

## Obligatoriska bevis och loggar

- MFA-status per privilegierat konto
- inloggningsloggar, riskflaggor och step-up-beslut
- incidentjournal, tidslinje och beslut
- rotationslogg för hemligheter och certifikat
- granskningsprotokoll för auditloggar

## Review cadence

- veckovis granskning av högrisk- och break-glass-loggar
- månatlig granskning av adminroller, sessionmönster och riskhändelser
- kvartalsvis genomgång av secrets och certifikat
