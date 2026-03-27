# Regulatory Change Calendar

## Purpose

Use the annual change calendar before any regulated rule pack or provider baseline is published to live runtime.

## Required sequence

1. Create a regulatory change entry for the target draft version.
2. Capture official source snapshot with URL, retrieval timestamp, source date and checksum.
3. Record diff review with impact summary and explicit breaking-change references.
4. Record sandbox verification with scenario refs and output checksum.
5. Collect dual approvals:
   - `domain_owner`
   - `compliance_owner`
6. Respect `stagedPublishAt` if set. Publish is forbidden before the staged time.
7. Publish the target version.
8. If regression is discovered, activate rollback with reason code, effective date and replay requirement.

## Preconditions

- Target draft exists in rule-pack governance or provider baseline registry.
- Official source material is available and checksummed.
- Sandbox scenarios cover the affected regulated flows.
- Two distinct actors are available for dual control.

## Evidence requirements

- Official source URL
- Source checksum
- Diff summary
- Impact summary
- Sandbox scenario refs
- Sandbox output checksum
- Approval refs
- Publish timestamp
- Rollback reason and effective date if rollback is used

## Operational rules

- Never publish directly from draft without source snapshot, diff review, sandbox verification and dual approvals.
- Never allow the same actor to satisfy both approval roles.
- Never bypass staged publish time in live process.
- Never use rollback without explicit reason code and replay decision.

## Verification after publish

- Confirm target version status is `published`.
- Confirm the regulatory change entry status is `published`.
- Confirm evidence is retrievable through the change entry.
- Confirm affected runtime objects resolve to the new version only on or after its effective date.

## Verification after rollback

- Confirm rollback record exists on the target registry.
- Confirm the change entry status is `rollback_activated`.
- Confirm replay requirement is visible to operators if set.
