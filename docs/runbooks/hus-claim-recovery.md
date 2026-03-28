# HUS Claim Recovery

Detta runbook beskriver den operativa kedjan för `13.1` HUS/ROT/RUT lifecycle.

## Syfte

Säkerställa att HUS-ärenden bara går från faktura och verifierad kundbetalning till claim, beslut, partial acceptance, payout och recovery när:

- köparallokering är låst
- fastighets-/bostadsprofil är komplett
- betald kundandel är verifierad
- claim-utrymmet respekterar årsgränser
- submission deadline inte har passerat
- partial acceptance och recovery har operatorstyrd upplösning

## Verifieringskedja

1. Skapa HUS-case med korrekt service type, work completion och fastighetsprofil.
2. Klassificera service lines och buyers.
3. Kontrollera att invoice gate är `passed` före betalningsregistrering.
4. Registrera elektroniskt verifierbar kundbetalning.
5. Läs `GET /v1/hus/cases/:husCaseId/readiness` och verifiera:
   - `paymentCapacities`
   - `buyerCapacities`
   - `claimableReductionAmount`
   - weekend-justerad deadline när 31 januari infaller på helg
6. Skapa claim med `transportType` `xml` eller `direct_api` när official path ska användas.
7. Verifiera att claimen fryser:
   - payment allocations
   - buyer allocations
   - transport profile
   - payload hash
8. Bekräfta att omklassificering eller fakturaändring blockeras när claim lifecycle är låst.
9. Submit claim.
10. Registrera authority decision.
11. Vid partial acceptance:
    - kontrollera att `husDecisionDifference` öppnas
    - lös differensen via `customer_reinvoice`, `internal_writeoff` eller `credit_note_issued`
    - payout får inte ske innan differensen är löst
12. Registrera payout.
13. Vid kredit/återkrav efter payout:
    - skapa recovery candidate
    - registrera recovery
    - kontrollera att case går till `closed` först när öppna differenser och recovery candidates är borta

## Operativa blockerare

- `hus_case_claim_fields_locked`
- `hus_invoice_gate_blocked`
- `hus_claim_not_ready`
- `hus_claim_buyer_capacity_exhausted`
- `hus_claim_submission_deadline_passed`
- `hus_claim_not_decidable`
- `hus_claim_difference_unresolved`
- `hus_recovery_candidate_missing`

## Evidence som måste kunna exporteras

- klassificeringsbeslut
- invoice gate snapshot
- verifierade betalningsreferenser / trace IDs
- claim payload hash
- buyer allocations
- authority decision och decision difference
- payout
- recovery candidate och recovery

## Driftanmärkningar

- `direct_api` och `xml` räknas som official-capable HUS transports.
- `json` får finnas kvar för legacy/testade interna flöden men är inte official-first path.
- Årlig HUS-kapacitet ska räknas per köpare och respektera både total HUS-cap och ROT-specifik cap.
- Deadline ska rulla fram till nästa vardag när 31 januari infaller på lördag eller söndag.
