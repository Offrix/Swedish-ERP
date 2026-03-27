> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_BIBLE.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# AGI engine

Detta dokument definierar AGI-motorn: hur individuppgifter byggs, hur frånvarouppgifter låses, hur submission-versioner skapas och hur kvittenser och rättelser hanteras.

## Scope

AGI-motorn ska:
- bygga huvuduppgift och individuppgifter per redovisningsperiod
- mappa lönearter, förmåner, skatt, pension och särskilda ersättningar till rätt AGI-fält
- samla frånvarouppgifter när reglerna kräver det
- skapa submission-paket
- spara kvittenser, signering och historik
- stödja rättelseversioner
- blockera utskick när nödvändigt underlag saknas

## Datamodell

Minst följande objekt ska finnas:

- `agi_periods`
- `agi_submissions`
- `agi_submission_versions`
- `agi_employees`
- `agi_employee_lines`
- `agi_absence_payloads`
- `agi_receipts`
- `agi_errors`
- `agi_signatures`

Fält per individ måste kunna bära:
- personidentifierare
- anställningsform där relevant
- skatteavdrag
- bruttolön
- förmåner
- ersättningar
- pensionsgrundande och rapporterade komponenter där formatet kräver
- frånvaromarkörer och frånvaroantal där sådant ska lämnas

## Submission state machine

- `draft`
- `validated`
- `ready_for_sign`
- `submitted`
- `accepted`
- `partially_rejected`
- `rejected`
- `superseded`

## Regler

1. En AGI byggs per bolag och redovisningsperiod.
2. Varje individuppgift ska vara härledd från exakta lönerader och förmånsrader.
3. Varje submission-version ska vara immutabel efter signering.
4. Rättelse bygger ny version och jämför mot föregående version.
5. Frånvarouppgifter får inte efterredigeras som om de alltid funnits; om underlaget saknades när AGI skickades ska systemet visa att perioden kräver manuell hantering och notering.
6. Signering måste loggas med vem, när och på vilken version.
7. Submission ska kunna simuleras i testläge.

## Valideringar före signering

- bolaget är arbetsgivarregistrerat
- lönekörningar för perioden är låsta
- alla berörda anställda har fullständiga identitets- och skatteuppgifter
- frånvaro som påverkar AGI är attesterad
- inga individer saknar mappning mellan löneart och AGI-fält
- inga blockerande differenser mot tidigare submission utan godkänd orsak
- huvuduppgiftens totalsummor stämmer med individuppgifterna

## Flöde

1. Välj period.
2. Hämta relevanta lönekörningar.
3. Bygg individdataset.
4. Lägg till förmåner och avdrag.
5. Lägg till frånvarouppgifter.
6. Validera.
7. Generera submission-version.
8. Signera.
9. Skicka via adapter.
10. Spara kvittens.
11. Öppna åtgärdskö vid fel.

## Frånvarouppgifter

Frånvarouppgifter ska behandlas som ett eget låst delpaket inom AGI. När submission-versionen gått till `ready_for_sign` ska frånvarodelen låsas för den versionen. Om chefen eller löneadministratören försöker ändra frånvaro därefter ska systemet kräva att en ny löne-/AGI-version byggs, eller markera att ändringen kom för sent.

## Skillnad mellan löneberäkning och AGI-beräkning

- löneberäkning avgör vad som ska betalas och bokföras
- AGI-beräkning avgör vad som ska rapporteras per individ och period
- de två ska vara spårbara till varandra men får vara olika datastrukturer

## XML/JSON och adapterstrategi

Systemet ska internt kunna skapa:
- normaliserad AGI-JSON
- revisionssnapshot av payload
- adapterpayload till faktisk inlämningskanal

Faktiskt sändningssätt ska isoleras i integrationslagret. Kärnmotorn får inte känna till transportprotokoll mer än genom en tydlig port/adapter.

## Rättelser

Vid rättelse ska systemet:

1. välja tidigare submission-version
2. skapa ny version med diff
3. visa vilka individer som ändrats
4. logga rättelseorsak
5. spara både tidigare och ny kvittens

## Relevanta delar från löne- och AGI-bygget

### 27.5 AGI
Systemet ska kunna:
- skapa huvuduppgift
- skapa individuppgifter
- mappa lönearter till rätt AGI-fält
- säkerställa att exakt en skatteruta fylls i per individuppgift där så krävs
- spara kvittens
- spara signeringstid
- skapa rättelseversioner
- visa differens mot tidigare inlämnad version

### 27.6 Frånvarouppgifter i AGI
- frånvarouppgifter ska lämnas när individuppgiften påverkats av frånvaro som kan ge rätt till föräldrapenning eller tillfällig föräldrapenning
- frånvarouppgifterna lämnas samtidigt med AGI
- arbetsgivaren ska kunna informera den anställde om vilka frånvarouppgifter som lämnats
- frånvarouppgifter kan inte rättas eller läggas till efter att AGI skickats
- därför ska systemet blockera AGI-signering om frånvarounderlag är ofullständigt eller oattesterat

## Golden tests

- normal månadslön
- timlön med övertid
- bilförmån utan kontant lön
- SINK-anställd
- retroaktiv rättelse
- slutlön
- frånvaro som ska rapporteras
- period med två lönekörningar
- rättelse av tidigare period

## Codex-prompt

```text
Read docs/compliance/se/agi-engine.md and docs/compliance/se/payroll-engine.md.

Implement the AGI engine with:
- versioned submissions
- immutable signed payloads
- employee-level mapping
- absence payloads
- receipts and error queues
- correction versions
- test-mode submission adapter

Create migrations, services, contract tests and golden datasets.
```

## Exit gate

- [ ] Varje individuppgift kan spåras till lönerader.
- [ ] Versioner och kvittenser sparas.
- [ ] Frånvarouppgifter blockeras om de inte är kompletta i tid.
- [ ] Rättelser bygger ny version utan att förstöra historik.

