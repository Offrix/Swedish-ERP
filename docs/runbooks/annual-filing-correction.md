# Annual filing correction

Detta runbook styr correction av annual filing och deklarationspaket efter signoff, dispatch eller mottagen receipt.

## När runbooken används

- ny annual package-version ersätter tidigare filingunderlag
- material reject på annual filing eller income tax declaration
- fel upptäcks efter signoff och kräver ny payloadversion

## Förutsättningar

- tidigare filingversion är immutable
- signoff hash och locked snapshot finns kvar
- correction skapar ny annual version eller nytt tax declaration package, aldrig mutation av gammal version

## Körordning

1. Läs tidigare submission, receipts, recovery och evidence pack.
2. Bekräfta att tidigare package/version inte ska muteras.
3. Skapa ny annual version eller nytt declaration package från korrekt source data.
4. Kör signoff på nytt om filingtypen kräver det.
5. Skapa correction-submission med ny payloadversion och ny source object version.
6. Kontrollera att tidigare submission blir `superseded` och att preserved prior receipts ligger kvar i nya evidence pack.
7. Skicka endast nya correction-submissionen vidare.

## Regler

- correction kräver ny payloadversion eller ny source object version
- gammal filing får aldrig ändras i efterhand
- gamla receipts ska bevaras i correctionkedjan
- replay är inte tillåtet när material reject redan kräver correction

## Operatörskontroller

- legal form profile och reporting obligation profile matchar fortfarande
- signatory chain är komplett för den nya versionen
- payload hash matchar signoff hash före dispatch
- evidence pack visar både ny och gammal kedja

## Verifiering

- tidigare submission är `superseded`
- correction link finns
- preserved prior receipts finns i nya evidence pack
- ny filing använder ny version och nytt payload hash

## Exit gate

Runbooken är klar när annual correction kan genomföras utan att någon historisk filing, signoff eller receipt skrivs över.
