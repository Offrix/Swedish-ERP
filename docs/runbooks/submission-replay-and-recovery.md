# Submission replay and recovery

Detta runbook styr hur reglerade submissions replayas, korrigeras och återvinns utan att bryta receipt-kedjan eller skapa otillåtna dublettsändningar.

## När runbooken används

- tekniskt stoppad submission (`transport_failed` eller `technical_nack`)
- material reject (`business_nack`)
- saknad material receipt efter teknisk kvittens
- operator behöver avgöra om samma payload får replayas eller om correction krävs

## Förutsättningar

- submissionen har immutable payload hash och source object version
- canonical receipt trail går att läsa via submissiondetalj, reconciliation och evidence pack
- operator har rätt behörighet för regulated submissions

## Körordning

1. Läs submissionens reconciliation-sammanfattning.
2. Kontrollera technical receipt state och material receipt state.
3. Om submissionen är `domain_rejected` får replay inte användas för ny payload.
4. Om submissionen är `transport_failed` eller `technical_nack`, avgör om samma payloadversion får skickas igen.
5. Om materialfel finns, öppna correction path i källdomänen och skapa ny payloadversion.
6. Använd endast replay för samma payloadversion och endast när replay fortfarande är tillåtet.
7. Kontrollera att recovery-objekt, queue items och evidence pack uppdateras efter åtgärden.

## Tillåtna beslut

- `retry_same_payload`
  Används bara för tekniska stopp där samma payload fortfarande är giltig.

- `collect_more_data`
  Används när material reject kräver komplettering före correction.

- `open_correction`
  Används när ny payloadversion måste byggas.

- `manual_investigation_opened`
  Används när operator behöver ankra recovery till manuell utredning utan att mutera historiken.

## Förbjudna beslut

- skicka om materially rejected payload som replay
- mutera existerande payloadversion
- skriva över historiska receipts
- registrera recovery som “löst” utan operator- eller correction-spår

## Replay-regler

- replay av samma payload ska vara idempotent
- replay får aldrig skapa ny payloadversion i smyg
- materially rejected submission måste gå via correction
- finalized eller superseded submission får inte replayas

## Recovery-regler

- varje technical reject eller transport fail ska kunna ge recovery-spår
- varje material reject ska ge recovery-spår och correctionkrav
- recovery kan lösas manuellt eller auto-resolvas av retry/correction/final receipt
- recovery ska vara synlig i evidence pack

## Verifiering

- reconciliation visar korrekt technical vs material state
- replay blockeras efter material reject
- correction auto-resolvar öppen recovery
- evidence pack innehåller recovery refs och reconciliation summary

## Exit gate

Runbooken är klar när operator kan avgöra replay vs correction utan databasingrepp och varje recovery är spårbar från submissiondetalj till evidence pack.
