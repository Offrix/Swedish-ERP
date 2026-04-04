# SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för secrets, kryptering, KMS, HSM och envelope encryption.

## Syfte

Detta dokument ska låsa hur hemligheter, nycklar och krypterad data skyddas sa att plattformen inte bygger på plaintext, oklar key ownership eller svag rotationsmodell.

## Omfattning

Detta dokument omfattar:
- application secrets
- key encryption keys
- data encryption keys
- envelope encryption
- rotation, revocation och key lineage
- KMS- och HSM-boundaries

Detta dokument omfattar inte:
- auth policy i sig
- externa providerkonton i sig

## Absoluta principer

- plaintext secrets får aldrig lagras i domänstate, snapshots eller artifacts
- KEK får aldrig läsa KMS- eller HSM-boundary i plaintext
- DEK ska vara objektbunden eller kortlivad enligt envelope-principen
- rotation ska vara explicit och sparbar
- krypteringskontext ska användas där plattformen stödjer det
- hardkodade produktionshemligheter är förbjudna

## Bindande dokumenthierarki för secrets, KMS, HSM och kryptering

- `IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING.md` lutar på detta dokument för signing keys, session secrets och trust material
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` lutar på detta dokument för webhook signing keys och verifieringsmaterial
- Domän 2, 5, 7 och 27 får inte definiera avvikande secrets-, key-, KMS-, HSM- eller envelope-encryption-truth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `SecretRecord`
- `WrappedSecretValue`
- `KekBinding`
- `DekEnvelope`
- `CryptoKeyVersion`
- `RotationPlan`
- `CryptographicEvidence`

## Kanoniska state machines

- `SecretRecord`: `draft -> active -> rotated | revoked | destroyed`
- `CryptoKeyVersion`: `pending -> active -> deprecating | retired | destroyed`
- `RotationPlan`: `draft -> approved -> executing -> completed | failed`

## Kanoniska commands

- `CreateSecretRecord`
- `WrapSecretValue`
- `UnwrapSecretValue`
- `ActivateCryptoKeyVersion`
- `RotateCryptoKeyVersion`
- `RewrapCiphertexts`
- `RevokeSecretRecord`

## Kanoniska events

- `SecretRecordCreated`
- `SecretValueWrapped`
- `SecretValueUnwrapped`
- `CryptoKeyVersionActivated`
- `CryptoKeyVersionRotated`
- `CiphertextsRewrapped`
- `SecretRecordRevoked`

## Kanoniska route-familjer

- `/api/security/secrets/*`
- `/api/security/keys/*`
- `/api/security/rotation/*`
- `/api/security/crypto-evidence/*`

## Kanoniska permissions och review boundaries

- `security.manage` får skapa och rotera key bindings
- `security.decrypt` får endast utlosas i strikt runtime boundary
- `support` får aldrig se plaintext secrets
- destroy- och rotation operations ska vara high-risk approvals

## Nummer-, serie-, referens- och identitetsregler

- varje secret och key version har stabil canonical id
- key lineage måste bevaras över rotationer
- ciphertext artifacts ska peka på key version eller kek binding
- encryption-context ids ska vara stabila per object scope

## Valuta-, avrundnings- och omräkningsregler

EJ TILLÄMPLIGT. Krypteringslagret äger ingen valutalogik.

## Replay-, correction-, recovery- och cutover-regler

- decrypt operations ska vara attributable och context-bound
- rewrap får inte förändra cleartext semantics
- cutover mellan key versions måste bevara decryptability för historiska artifacts tills retirement policy tillater annat
- replay får inte återanvända obsolete keys utan explicit decryption policy

## Huvudflödet

1. runtime begar secret eller object protection
2. DEK genereras eller allokeras enligt policy
3. data krypteras lokalt med DEK
4. DEK wraps med KEK i KMS eller HSM
5. ciphertext och wrapped DEK lagras
6. rotation eller rewrap sker via explicit plan

## Bindande scenarioaxlar

- application secret vs data object encryption
- DEK vs KEK
- encryption vs signing key material
- active vs rotated vs retired key version
- decrypt vs rewrap vs destroy
- newly encrypted vs imported historical ciphertext
- ordinary decrypt vs high-risk decrypt with explicit reason
- single approval vs dual control destruction path
- full rewrap complete vs staged rewrap still open

## Bindande policykartor

- `SEC-POL-001`: envelope encryption mandatory för object protection under KMS or HSM
- `SEC-POL-002`: KEK never leaves KMS or HSM boundary in plaintext
- `SEC-POL-003`: plaintext DEK must not be stored
- `SEC-POL-004`: encryption context required where provider supports it
- `SEC-POL-005`: key rotation must preserve lineage and decryptability
- `SEC-POL-006`: destroy, disable or revoke of critical key material requires dual control and immutable approval evidence
- `SEC-POL-007`: imported historical ciphertext must preserve origin key lineage, trust class and migration provenance
- `SEC-POL-008`: high-risk decrypts require explicit reason, caller scope and evidence receipt
- `SEC-POL-009`: retired key may decrypt only under explicit recovery, migration or read-compatibility policy

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `SEC-P0001` secret wrapped under active KEK
- `SEC-P0002` object encrypted with DEK and wrapped DEK stored
- `SEC-P0003` decrypt only inside authorized runtime boundary
- `SEC-P0004` rotation with new key version activated
- `SEC-P0005` rewrap completed without plaintext persistence
- `SEC-P0006` revoke or destroy blocks further normal use
- `SEC-P0007` decrypt request checked against encryption context and caller authorization
- `SEC-P0008` staged rewrap remains non-green until open ciphertext population is zero or explicitly waived
- `SEC-P0009` imported historical ciphertext persisted with original lineage metadata
- `SEC-P0010` high-risk decrypt approved and evidenced before unwrap
- `SEC-P0011` key destroy or disable executed only after dual control approval

## Bindande rapport-, export- och myndighetsmappning

- security artifacts create audit evidence only
- no accounting or tax reporting originates here

## Bindande scenariofamilj till proof-ledger och rapportspar

- `SEC-A001` application secret wrap -> `SEC-P0001`
- `SEC-A002` object envelope encryption -> `SEC-P0002`
- `SEC-B001` authorized decrypt -> `SEC-P0003`
- `SEC-B002` decrypt with wrong context or caller -> `SEC-P0007`
- `SEC-C001` key rotation -> `SEC-P0004`,`SEC-P0005`
- `SEC-C002` staged rewrap still open -> `SEC-P0008`
- `SEC-D001` imported historical ciphertext -> `SEC-P0009`
- `SEC-Z001` revoked key usage -> `SEC-P0006`
- `SEC-Z002` high-risk decrypt without approval -> `SEC-P0010`
- `SEC-Z003` key destroy without dual control -> `SEC-P0011`

## Tvingande dokument- eller indataregler

- key id or key version required
- encryption context required where policy says so
- wrapped ciphertext and metadata required
- plaintext secret values may exist only in controlled runtime memory
- imported ciphertext requires lineage metadata and migration source binding
- high-risk decrypt requires explicit reason and actor scope

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `SEC-R001` missing_kek_binding
- `SEC-R002` plaintext_secret_persistence_forbidden
- `SEC-R003` missing_encryption_context
- `SEC-R004` unauthorized_decrypt
- `SEC-R005` retired_key_use
- `SEC-R006` missing_lineage_metadata
- `SEC-R007` high_risk_decrypt_without_approval
- `SEC-R008` destroy_without_dual_control
- `SEC-R009` staged_rewrap_incomplete

## Bindande faltspec eller inputspec per profil

- `envelope_encryption_object`: wrapped DEK, ciphertext, kek ref, encryption context
- `application_secret`: wrapped value, secret id, key version ref
- `rotation_plan`: old key version, new key version, scope, approval ref
- `historical_ciphertext_import`: ciphertext, original key lineage, trust class, migration source ref, new policy binding
- `high_risk_decrypt_request`: reason code, actor, scope, approval ref, target secret or object ref
- `key_destroy_plan`: key version, approval refs, dual-control actors, effective date, rollback policy if allowed

## Scenariofamiljer som hela systemet måste tacka

- wrap application secret
- encrypt object with envelope encryption
- decrypt in authorized runtime
- rotate KEK
- rewrap ciphertexts
- unauthorized decrypt
- use of retired key
- staged rewrap not complete
- import historical ciphertext
- high-risk decrypt
- key destroy without dual control

## Scenarioregler per familj

- application secret must be wrapped before persistence
- object encryption must store wrapped DEK and ciphertext together with key metadata
- decrypt allowed only in authorized runtime boundary
- retired key may support legacy decrypt only if explicit policy allows; new encrypt under retired key is forbidden
- rewrap must not expose plaintext persistence
- imported historical ciphertext must preserve lineage and may not be silently normalized away
- high-risk decrypt must create approval-linked evidence before plaintext is returned
- destroy or disable of key material may not proceed on single-actor approval

## Blockerande valideringar

- missing KEK binding
- plaintext persistence attempt
- missing encryption context when required
- unauthorized decrypt
- encrypt using retired key
- destroy action without approved policy
- missing lineage metadata on historical import
- high-risk decrypt without approval evidence
- staged rewrap still open when policy requires zero open ciphertexts för green status

## Rapport- och exportkonsekvenser

- all wraps, unwraps, rotations and rewraps must create immutable audit evidence

## Förbjudna förenklingar

- storing plaintext secret in database
- hardcoded production secrets
- long-term encryption under static root key without envelope policy where object protection is required
- hidden silent key rotation
- silent destroy or disable of active key version
- importing historical ciphertext without preserving origin lineage

## Fler bindande proof-ledger-regler för specialfall

- `SEC-P0007` decrypt request with wrong encryption context blocked
- `SEC-P0008` rotation plan partially executed remains non-green until full rewrap or explicit waiver
- `SEC-P0009` imported historical ciphertext must preserve original key lineage metadata
- `SEC-P0010` high-risk decrypt without approval remains blocked even if caller otherwise has runtime access
- `SEC-P0011` destroy request without dual control creates no state change and must emit violation evidence

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- security layer creates only security state and audit evidence
- no accounting legal effect originates here

## Bindande verifikations-, serie- och exportregler

- security layer owns no accounting series
- each cryptographic artifact must have stable evidence id and key lineage ref

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- secret vs object encryption
- wrap vs unwrap vs rewrap
- active vs rotated vs retired key
- with or without encryption context support
- imported historical vs newly encrypted
- ordinary decrypt vs high-risk decrypt
- dual control present vs absent

## Bindande fixture-klasser för secrets, KMS, HSM och kryptering

- `SEC-FXT-001` wrapped application secret
- `SEC-FXT-002` envelope-encrypted object
- `SEC-FXT-003` authorized decrypt
- `SEC-FXT-004` unauthorized decrypt
- `SEC-FXT-005` rotation and rewrap
- `SEC-FXT-006` retired key use
- `SEC-FXT-007` historical ciphertext import
- `SEC-FXT-008` high-risk decrypt request
- `SEC-FXT-009` destroy without dual control
- `SEC-FXT-010` staged rewrap incomplete

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- key profile
- expected crypto verdict
- expected authorization verdict
- expected audit artifacts

## Bindande canonical verifikationsseriepolicy

- security layer owns no accounting voucher series
- crypto evidence ids are security-local identifiers only

## Bindande expected outcome per central scenariofamilj

- `SEC-A001`: wrapped secret persisted, no plaintext at rest
- `SEC-A002`: ciphertext plus wrapped DEK stored with lineage
- `SEC-B001`: decrypt allowed only in authorized boundary
- `SEC-C001`: rotation and rewrap complete with lineage preserved
- `SEC-D001`: imported ciphertext retained with origin lineage and trust class intact
- `SEC-Z001`: retired or revoked key blocks new use
- `SEC-Z002`: high-risk decrypt denied without approval-linked evidence
- `SEC-Z003`: destroy denied without dual-control approval

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `SEC-A001` -> `SEC-P0001` -> secret wrapped
- `SEC-A002` -> `SEC-P0002` -> object encrypted
- `SEC-B001` -> `SEC-P0003` -> authorized decrypt
- `SEC-B002` -> `SEC-P0007` -> wrong context or caller blocked
- `SEC-C001` -> `SEC-P0004,P0005` -> rotation and rewrap
- `SEC-C002` -> `SEC-P0008` -> staged rewrap non-green
- `SEC-D001` -> `SEC-P0009` -> lineage preserved historical import
- `SEC-Z001` -> `SEC-P0006` -> blocked revoked or retired key use
- `SEC-Z002` -> `SEC-P0010` -> high-risk decrypt blocked without approval
- `SEC-Z003` -> `SEC-P0011` -> destroy blocked without dual control

## Bindande testkrav

- plaintext-persistence blocker test
- envelope-encryption roundtrip test
- encryption-context mismatch test
- unauthorized decrypt test
- key rotation and rewrap test
- retired-key-new-encrypt blocker test
- historical-ciphertext lineage preservation test
- high-risk decrypt approval-evidence test
- destroy-without-dual-control blocker test
- staged rewrap non-green test

## Källor som styr dokumentet

- NIST: [SP 800-57 Part 1 Rev. 5](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
- NIST: [FIPS 140-3](https://csrc.nist.gov/pubs/fips/140-3/final)
- Google Cloud: [Envelope encryption](https://cloud.google.com/kms/docs/envelope-encryption)
- AWS KMS: [Cryptography essentials](https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html)
