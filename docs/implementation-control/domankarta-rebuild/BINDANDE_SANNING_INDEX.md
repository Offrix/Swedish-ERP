# BINDANDE_SANNING_INDEX

## Status

Detta dokument är bindande index för hela sanningslagret under `docs/implementation-control/domankarta-rebuild/`.

Detta dokument styr:
- vilka `_BINDANDE_SANNING.md`-dokument som måste finnas
- i vilken ordning de ska byggas
- vilka som redan finns
- vilka som fortfarande är planerade
- att inget flöde får falla mellan stolarna

Ingen fas, delfas, domän, runbook, testsvit eller implementation får behandlas som komplett om den lutar på en bindande sanning som saknas i detta index.

## Syfte

Detta dokument finns för att:
- hela sanningslistan inte ska tappas bort i chatten
- master-roadmapen ska ha en läsbar källlista
- master-libraryt ska kunna spegla samma lista
- varje ny bindande bibel ska fa en tydlig plats i byggordningen

## Absoluta principer

- varje bindande sanning måste skrivas enligt `BINDANDE_SANNING_STANDARD.md`
- varje bindande sanning måste vara minst lika hard som `FAKTURAFLODET_BINDANDE_SANNING.md`
- ingen bindande sanning får hoppas över för att "vi kan ta det sen"
- om ett flöde inte har bindande sanning är flödet inte byggklart
- om en bindande sanning ändras måste alla lutande domäner och masterdokument uppdateras i samma ändringsset
- ingen ny bindande sanning får laggas till eller tas bort utan att detta index ändras

## Statuskoder

- `created`
- `planned`
- `rewrite_existing_if_found`

## Bindande byggordning

1. `FAKTURAFLODET_BINDANDE_SANNING.md`  
   status: `created`
2. `LEVFAKTURAFLODET_BINDANDE_SANNING.md`  
   status: `created`
3. `KVITTOFLODET_BINDANDE_SANNING.md`  
   status: `created`
4. `DOKUMENTSCANNING_OCR_OCH_KLASSNING_BINDANDE_SANNING.md`  
   status: `created`
5. `UTLAGG_OCH_VIDAREFAKTURERING_BINDANDE_SANNING.md`  
   status: `created`
6. `KUNDINBETALNINGAR_OCH_KUNDRESKONTRA_BINDANDE_SANNING.md`  
   status: `created`
7. `LEVERANTORSBETALNINGAR_OCH_LEVERANTORSRESKONTRA_BINDANDE_SANNING.md`  
   status: `created`
8. `BANKFLODET_OCH_BANKAVSTAMNING_BINDANDE_SANNING.md`  
   status: `created`
9. `MOMSFLODET_BINDANDE_SANNING.md`  
   status: `created`
10. `SKATTEKONTOFLODET_BINDANDE_SANNING.md`  
    status: `created`
11. `BOKFORINGSKARNAN_OCH_VERIFIKATIONER_BINDANDE_SANNING.md`  
    status: `created`
12. `PERIODISERING_OCH_BOKSLUTSOMFORINGAR_BINDANDE_SANNING.md`  
    status: `created`
13. `ANLAGGNINGSTILLGANGAR_OCH_AVSKRIVNINGAR_BINDANDE_SANNING.md`  
    status: `created`
14. `LAGER_VARUKOSTNAD_OCH_LAGERJUSTERINGAR_BINDANDE_SANNING.md`  
    status: `created`
15. `INKOP_VARUMOTTAG_OCH_LEVERANSMATCHNING_BINDANDE_SANNING.md`  
    status: `created`
16. `ORDER_OFFERT_AVTAL_TILL_FAKTURA_BINDANDE_SANNING.md`  
    status: `created`
17. `ABONNEMANG_OCH_ATERKOMMANDE_FAKTURERING_BINDANDE_SANNING.md`  
    status: `created`
18. `PROJEKT_WIP_INTAKTSAVRAKNING_OCH_LONSAMHET_BINDANDE_SANNING.md`  
    status: `created`
19. `ARBETSORDER_TID_MATERIAL_OCH_FAKTURERBARHET_BINDANDE_SANNING.md`  
    status: `created`
20. `LONEFLODET_BINDANDE_SANNING.md`  
    status: `created`
21. `LONEARTER_OCH_LONEKONTON_BINDANDE_SANNING.md`  
    status: `created`
22. `PRELIMINARSKATT_OCH_SKATTETABELLER_BINDANDE_SANNING.md`  
    status: `created`
23. `ARBETSGIVARAVGIFTER_OCH_SPECIALREGLER_BINDANDE_SANNING.md`  
    status: `created`
24. `FORMANER_OCH_FORMANSBESKATTNING_BINDANDE_SANNING.md`  
    status: `created`
25. `RESOR_TRAKTAMENTE_OCH_MILERSATTNING_BINDANDE_SANNING.md`  
    status: `created`
26. `PENSION_OCH_LONEVAXLING_BINDANDE_SANNING.md`  
    status: `created`
27. `SEMESTER_SEMESTERSKULD_OCH_SEMESTERERSATTNING_BINDANDE_SANNING.md`  
    status: `created`
28. `SJUKLON_KARENS_OCH_FRANVARO_BINDANDE_SANNING.md`  
    status: `created`
29. `LONEUTMATNING_OCH_ANDRA_MYNDIGHETSAVDRAG_BINDANDE_SANNING.md`  
    status: `created`
30. `NEGATIV_NETTOLON_OCH_EMPLOYEE_RECEIVABLE_BINDANDE_SANNING.md`  
    status: `created`
31. `LONEUTBETALNING_OCH_BANKRETURER_BINDANDE_SANNING.md`  
    status: `created`
32. `AGI_FLODET_BINDANDE_SANNING.md`  
    status: `created`
33. `AGI_FALTKARTA_OCH_RATTELSER_BINDANDE_SANNING.md`  
    status: `created`
34. `ROT_RUT_HUS_FLODET_BINDANDE_SANNING.md`  
    status: `created`
35. `GRON_TEKNIK_FLODET_BINDANDE_SANNING.md`  
    status: `created`
36. `ARSBOKSLUT_ARSREDOVISNING_OCH_INK2_BINDANDE_SANNING.md`  
    status: `created`
37. `AGARUTTAG_UTDELNING_KU31_OCH_KUPONGSKATT_BINDANDE_SANNING.md`  
    status: `created`
38. `SIE4_IMPORT_OCH_EXPORT_BINDANDE_SANNING.md`  
    status: `created`
39. `RAPPORTER_MOMS_AGI_RESKONTRA_HUVUDBOK_BINDANDE_SANNING.md`  
    status: `created`
40. `PEPPOL_EDI_OCH_OFFENTLIG_EFAKTURA_BINDANDE_SANNING.md`  
    status: `created`
41. `OCR_REFERENSER_OCH_BETALFORMAT_BINDANDE_SANNING.md`  
    status: `created`
42. `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md`  
    status: `created`
43. `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md`  
    status: `created`
44. `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md`  
    status: `created`
45. `AUDIT_EVIDENCE_OCH_APPROVALS_BINDANDE_SANNING.md`  
    status: `created`
46. `MIGRATION_PARALLELLKORNING_CUTOVER_OCH_ROLLBACK_BINDANDE_SANNING.md`  
    status: `created`
47. `SCENARIOPROOF_OCH_BOKFORINGSBEVIS_BINDANDE_SANNING.md`  
    status: `created`
48. `STRESS_CHAOS_RECOVERY_OCH_ADVERSARIAL_BINDANDE_SANNING.md`  
    status: `created`
49. `SEARCH_ACTIVITY_NOTIFICATIONS_OCH_WORKBENCHES_BINDANDE_SANNING.md`  
    status: `created`
50. `SUPPORT_BACKOFFICE_INCIDENTS_OCH_REPLAY_BINDANDE_SANNING.md`  
    status: `created`
51. `KONCERN_INTERCOMPANY_OCH_SHARED_SERVICES_BINDANDE_SANNING.md`  
    status: `created`
52. `PORTALER_SIGNERING_INTAKE_OCH_EXTERN_SELVSERVICE_BINDANDE_SANNING.md`  
    status: `created`
53. `BAS_KONTOPOLICY_BINDANDE_SANNING.md`  
    status: `created`
54. `BAS_LONEKONTOPOLICY_BINDANDE_SANNING.md`  
    status: `created`
55. `MOMSRUTEKARTA_BINDANDE_SANNING.md`  
    status: `created`
56. `SKATTEKONTOMAPPNING_BINDANDE_SANNING.md`  
    status: `created`
57. `VERIFIKATIONSSERIER_OCH_BOKFORINGSPOLICY_BINDANDE_SANNING.md`  
    status: `created`
58. `VALUTA_OMRAKNING_OCH_KURSDIFFERENS_BINDANDE_SANNING.md`  
    status: `created`
59. `LEGAL_REASON_CODES_OCH_SPECIALTEXTPOLICY_BINDANDE_SANNING.md`  
    status: `created`
60. `BAS_KONTOPLAN_SOKFRASER_OCH_BOKNINGSINTENTION_BINDANDE_SANNING.md`  
   status: `created`
61. `BOKFORINGSSIDA_OCH_FINANCIAL_WORKBENCH_BINDANDE_SANNING.md`  
   status: `created`
62. `DIMENSIONER_OBJEKT_OCH_SIE_MAPPNING_BINDANDE_SANNING.md`  
   status: `created`

## Hårda regler för indexet

- ingen av punkterna 1-62 får tappas bort ur master-roadmap eller master-library
- om ett nytt flöde identifieras måste det fa ett nytt indexnummer har innan arbete fortsatter
- om ett flöde delas i två biblar måste bada fa egna indexnummer har
- om ett dokument skapas måste dess status uppdateras från `planned` till `created`
- om ett dokument skrivs om från en gammal version utanför rebuild-tradet ska status vara `rewrite_existing_if_found` tills ny rebuildversion är skriven

## Tvärdomänskrav

- `MASTER_DOMAIN_ROADMAP.md` måste uttryckligen luta på detta index
- `MASTER_DOMAIN_IMPLEMENTATION_LIBRARY.md` måste uttryckligen luta på detta index
- varje domäns roadmap och library som lutar på en bindande sanning måste namnge den explicit

## Konsekvens

Om ett flöde, en route, en testfamilj, en importkedja, en exportkedja, en reviewkedja eller en bokföringsregel saknar motsvarande bindande sanning i detta index är den delen inte tillräckligt styrd och får inte betraktas som byggklar.




