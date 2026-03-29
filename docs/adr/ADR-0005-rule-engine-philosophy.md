> Statusnotis: Detta dokument är inte primär sanning. Bindande styrning före UI ligger endast i `docs/implementation-control/GO_LIVE_ROADMAP_FINAL.md` och `docs/implementation-control/PHASE_IMPLEMENTATION_LIBRARY_FINAL.md`. Detta dokument är historiskt input- eller stöddokument och får inte överstyra dem.
# ADR-0005 — Rule engine philosophy

Status: Accepted  
Date: 2026-03-21

## Context

Svenska regler för moms, AGI, arbetsgivaravgifter, traktamente, förmåner, pension, HUS, personalliggare och årsredovisning ändras över tid. Hårdkodade if-satser utspridda i tjänster och UI gör systemet obrukbart.

## Decision

Alla regler ska modelleras som **versionerade regelpaket**.

Ett regelpaket måste innehålla:

- `rule_pack_id`
- `domain`
- `jurisdiction`
- `effective_from`
- `effective_to`
- `version`
- `checksum`
- `source_snapshot_date`
- `semantic_change_summary`
- `machine_readable_rules`
- `human_readable_explanation`
- `test_vectors`
- `migration_notes`

## Rule resolution order

1. jurisdiktion
2. bolagstyp eller registrering
3. domän
4. datum
5. eventuell anställdgrupp/avtalstyp
6. specialundantag

## Implementation rules

- UI får aldrig själv avgöra moms, skatt eller HUS-utfall.
- Controllers får inte innehålla regelkunskap.
- Regelmotorn ska kunna förklara **varför** ett beslut togs.
- Varje beslut ska ge ett `explanation_object` som kan visas i UI och sparas i audit log.
- Historiska körningar ska använda regelpaketet som gällde då.
- Nytt regelpaket kräver testvektorer innan det får aktiveras.

## Decision object

Varje regelbeslut ska returnera:

```json
{
  "decision_code": "VAT_SE_DOMESTIC_25",
  "inputs_hash": "sha256...",
  "rule_pack_id": "vat-se-2026.1",
  "effective_date": "2026-05-31",
  "outputs": {},
  "warnings": [],
  "explanation": [
    "seller_country=SE",
    "buyer_country=SE",
    "supply_type=domestic_goods",
    "vat_rate=25%"
  ]
}
```

## Verification

- [ ] Alla regelpaket har snapshotdatum.
- [ ] Alla regelpaket har golden tests.
- [ ] Ett historiskt dokument kan återberäknas med dåtidens regelpaket.
- [ ] UI kan visa mänsklig förklaring för varje regelbeslut.

