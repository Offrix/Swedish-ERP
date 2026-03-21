# Payroll engine

Detta dokument definierar lönekärnan: löneperioder, lönearter, beräkningsordning, skatt, arbetsgivaravgifter, SINK, utbetalning, bokföring och slutlön.

## Scope

Lönemotorn ska klara:
- månadslön
- timlön
- rörliga ersättningar
- frånvaro
- semester
- sjuklön och karenslogik
- övertid, mertid, OB, jour, beredskap
- bonus och provision
- förmåner och traktamenten som påverkar lön
- bruttolöne- och nettolöneavdrag
- löneväxling
- pension
- slutlön
- extra körningar
- retroaktiva korrigeringar

## Körordning

### 27.1 Beräkningsordning i lönekörning
Följ exakt denna ordning:
1. hämta anställning och löneperiod
2. hämta schema, tid, frånvaro, saldon
3. skapa grundlön
4. lägg till rörliga lönearter
5. lägg till retroaktiva korrigeringar
6. lägg till förmåner
7. lägg till traktamente/utlägg som påverkar lön eller AGI
8. applicera bruttolöneavdrag
9. räkna pensionsmedförande lön
10. räkna skattepliktigt underlag
11. räkna preliminär skatt
12. räkna arbetsgivaravgifter
13. applicera nettolöneavdrag
14. räkna nettolön
15. skapa lönebesked
16. skapa AGI-underlag
17. skapa bokföringsunderlag
18. skapa betalningsunderlag

## Löneartsmodell

### 27.2 Obligatoriska löneartstyper
- månadslön
- timlön
- övertid
- mertid
- OB
- jour
- beredskap
- bonus
- provision
- semesterlön
- semestertillägg
- semesteravdrag
- sjuklön
- karens
- VAB
- föräldraledighet
- tjänstledighet
- traktamente skattefritt
- traktamente skattepliktigt
- milersättning skattefri
- milersättning skattepliktig
- förmån
- pensionspremie
- löneväxling bruttolöneavdrag
- nettolöneavdrag
- utmätning
- förskott
- återkrav
- slutlön
- korrigering

Varje löneart ska definiera:
- beskattning
- arbetsgivaravgift
- AGI-mappning
- bokföringskonto
- standarddimensioner
- om beloppet påverkar semestergrundande lön
- om beloppet påverkar pensionsmedförande lön
- om beloppet ingår i nettolön eller bara rapporteras

## Arbetsgivaravgifter

Systemet ska ha en tabellstyrd motor för arbetsgivaravgifter. För 2026 gäller minst:

- full arbetsgivaravgift: **31,42 %**
- reducerad avgift: **10,21 %** när reglerna för ålderspensionsavgift enbart gäller
- födda **1937 eller tidigare**: ingen arbetsgivaravgift
- särskilda nedsättningar ska kunna modelleras som separata regelpaket, inte som hårdkodade undantag

Reglerna ska vara styrda av:
- utbetalningsdatum
- personens födelseår eller annan regelparameter enligt gällande regelpaket
- eventuell nedsättning eller stöd
- om ersättningen utgör underlag för arbetsgivaravgift

## SINK

### 27.4 SINK
- särskild inkomstskatt för utomlands bosatta: 22,5 procent från 1 januari 2026, 15 procent för sjöinkomst enligt gällande regler
- SINK är definitiv skatt
- systemet ska stödja SINK-beslut, giltighetsperiod och särskild AGI-mappning
- vid vistelse i Sverige sex månader eller längre ska vanlig beskattning kunna ta över när reglerna kräver det

Intern representation för SINK ska stödja:
- beslutstyp
- giltighetsintervall
- skattesats
- sjöinkomstflagga
- bevis-/beslutsdokument
- fallback till vanlig beskattning när regelvillkoren inte längre är uppfyllda

## Lönebesked

### 27.7 Lönebesked
Lönebesked ska visa minst:
- person och anställning
- period
- lönearter
- timmar/dagar där relevant
- bruttolön
- skatt
- arbetsgivaravgifter visas normalt inte till anställd men ska kunna ses i admin
- förmåner
- pension/löneväxling
- nettolön
- utbetalningsdatum
- saldon: semester, flex, komp

## Slutlön

### 27.8 Slutlön
Systemet ska hantera:
- avslutsdatum
- kvarvarande semester
- förskottssemesteravräkning
- återlämning av utrustning påverkar inte lön direkt utan separat process
- slutlön ska kunna köras som egen typ
- AGI och bokföring ska märka slutlön

## Bokföring

Lönemotorn ska skapa posting intents för minst:
- bruttolön
- preliminärskatt
- arbetsgivaravgifter
- semesterlöneskuld och förändring
- förmåner
- pensionskostnad
- särskild löneskatt på pensionskostnader där relevant
- nettolöneavdrag
- utbetalning till bank

## Edge cases

- ingen kontant nettolön men skattepliktig förmån
- flera anställningar för samma individ samma period
- periodöverlapp vid retroaktiv rättelse
- anställning som slutar mitt i period
- byte av schema mitt i månad
- utländskt bankkonto
- skyddad identitet
- samordningsnummer
- SINK som upphör mitt i år
- ändrad löneväxling i samma period

## Golden tests

- månadslön med skattetabell
- timlön med övertid
- sjukfrånvaro över karens
- semesteruttag och semestertillägg
- slutlön med förskottssemesteravräkning
- bilförmån utan kontant lön
- SINK 22,5 %
- person med reducerad arbetsgivaravgift
- retroaktiv bonus
- två extra lönekörningar

## Codex-prompt

```text
Read docs/compliance/se/payroll-engine.md, docs/compliance/se/agi-engine.md and ADR-0005-rule-engine-philosophy.md.

Implement the payroll core:
- pay calendars
- pay runs
- pay lines
- pay item catalog
- employer contribution rule packs
- SINK support
- final pay
- posting intents
- bank payment payload
- golden tests

Do not put tax or contribution logic in UI.
```

## Exit gate

- [ ] Lön kan köras reproducerbart för samma underlag.
- [ ] Skatt och avgifter blir rätt enligt regelpaket.
- [ ] Slutlön, retro och extra körning fungerar.
- [ ] Bokföring skapas korrekt och spårbart.
