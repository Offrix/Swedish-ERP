# IDENTITET_AUTH_MFA_OCH_BEHORIGHET_BINDANDE_SANNING

## Status

Detta dokument är bindande sanning för identitet, autentisering, MFA och behörighet.

## Syfte

Detta dokument ska låsa authn/authz-lagret sa att protected runtime, admin-yta, support, high-risk mutationer och federerad inloggning inte drivs av lokala tolkningar.

## Omfattning

Detta dokument omfattar:
- lokal auth
- MFA
- passkeys/WebAuthn
- OIDC federation
- SAML federation
- sessioner
- risk- och step-up-granser
- behörigheter och high-risk approvals

Detta dokument omfattar inte:
- hemlighetshantering i sig
- provider-specifik produktionskoppling som saknar verkliga konton eller certifikat

## Absoluta principer

- ingen session får uppsta innan primär faktor verifierats
- high-risk mutationer ska kunna krava step-up
- MFA får inte degraderas tyst
- passkeys ska byggas på WebAuthn/FIDO
- federation ska vara standardsbaserad och versionsstyrd
- support/backoffice får aldrig fa bredare atkomst an policy uttryckligen tillater

## Bindande dokumenthierarki för identitet, auth, MFA och behörighet

- `SECRETS_KMS_HSM_OCH_KRYPTERING_BINDANDE_SANNING.md` ska agera overordnad sanning för signing keys, wrapping keys och trust material
- `PARTNER_API_WEBHOOKS_OCH_ADAPTERKONTRAKT_BINDANDE_SANNING.md` lutar på detta dokument för partner authn/authz boundaries
- Domän 2 och Domän 27 får inte definiera avvikande auth, session, MFA, passkey, OIDC, SAML eller permission truth utan att detta dokument skrivs om samtidigt

## Kanoniska objekt

- `Identity`
- `Credential`
- `MfaMethod`
- `AuthSession`
- `PrivilegeGrant`
- `FederationConnection`
- `StepUpChallenge`
- `PermissionPolicy`

## Kanoniska state machines

- `AuthSession`: `anonymous -> primary_verified -> step_up_verified -> active -> expired | revoked`
- `Credential`: `pending -> active -> rotated | revoked | compromised`
- `FederationConnection`: `draft -> validated -> active | blocked | revoked`
- `StepUpChallenge`: `issued -> satisfied | failed | expired`

## Kanoniska commands

- `RegisterCredential`
- `VerifyPrimaryFactor`
- `IssueAuthSession`
- `VerifyStepUpChallenge`
- `BindFederationConnection`
- `ActivateFederationConnection`
- `GrantPrivilege`
- `RevokePrivilege`

## Kanoniska events

- `CredentialRegistered`
- `PrimaryFactorVerified`
- `AuthSessionIssued`
- `StepUpChallengeVerified`
- `FederationConnectionBound`
- `FederationConnectionActivated`
- `PrivilegeGranted`
- `PrivilegeRevoked`

## Kanoniska route-familjer

- `/api/auth/*`
- `/api/sessions/*`
- `/api/mfa/*`
- `/api/federation/*`
- `/api/permissions/*`

## Kanoniska permissions och review boundaries

- identitetsadministration ska vara separat från vanlig verksamhetsadministration
- support får se maskad session- och identitetsinformation
- break-glass eller reveal actions ska vara egna high-risk flows
- high-risk finance, payroll, security och integration mutations kan krava step-up MFA

## Nummer-, serie-, referens- och identitetsregler

- varje identity har stabil canonical identity id
- credentials har egna ids och lineage vid rotation
- passkey credential ids måste behandlas som autentikatorbundna och RP-scopeade
- federation connections måste ha issuer/entity id, audience och metadata refs

## Valuta-, avrundnings- och omräkningsregler

EJ TILLÄMPLIGT. Authlagret äger ingen valutalogik.

## Replay-, correction-, recovery- och cutover-regler

- auth assertions får inte kunna replayas utanför tillatet fonstrer
- sessions ska kunna revokeras deterministiskt
- federation metadata rotation ska vara explicit och sparbar
- cutover får inte dela sessions eller credential state mellan trial och live

## Huvudflödet

1. identity identifieras
2. primär faktor verifieras
3. session kan utfardas
4. step-up MFA utfordras vid high-risk eller policykrav
5. federation assertions eller passkeys verifieras enligt standard
6. permissions resolver avgor tillåtna actions

## Bindande scenarioaxlar

- local vs federated auth
- password vs passkey vs TOTP vs federated MFA
- primary factor only vs step-up required
- human user vs service principal
- admin/support/high-risk user vs ordinary user
- active vs locked vs suspended identity
- fresh session vs stale session för high-risk action
- active vs revoked credential or session
- masked support read vs reveal approval vs reveal denied
- normal sign-in vs credential recovery or reset

## Bindande policykartor

- `AUTH-POL-001`: session only after primary factor verification
- `AUTH-POL-002`: step-up required för configured high-risk actions
- `AUTH-POL-003`: passkeys use WebAuthn/FIDO only
- `AUTH-POL-004`: OIDC validates issuer, audience, signature and nonce/state where applicable
- `AUTH-POL-005`: SAML validates issuer/entity id, signature and assertion conditions
- `AUTH-POL-006`: permissions are explicit grants, never implicit by UI role naming alone
- `AUTH-POL-007`: session id must rotate after successful primary auth and after successful step-up where session assurance changes
- `AUTH-POL-008`: revoked session, credential or federation binding must be denied on reuse even if cache still holds metadata
- `AUTH-POL-009`: support reveal requires explicit approval artifact, scope and duration boundary
- `AUTH-POL-010`: credential recovery may not bypass assurance level, permission checks or audit requirements

## Bindande canonical proof-ledger med exakta konton eller faltutfall

- `AUTH-P0001` primary factor verified before session
- `AUTH-P0002` step-up required and satisfied before high-risk action
- `AUTH-P0003` WebAuthn registration and assertion verified
- `AUTH-P0004` OIDC token validation with issuer, audience and signature checks
- `AUTH-P0005` SAML assertion validation with signature and conditions checks
- `AUTH-P0006` explicit permission check at action boundary
- `AUTH-P0007` support access masking and reveal boundary
- `AUTH-P0008` session rotated after auth or step-up assurance increase
- `AUTH-P0009` revoked session or credential denied on reuse
- `AUTH-P0010` support reveal approved, scoped and time-bounded before reveal
- `AUTH-P0011` credential recovery completed only after approved recovery assurance path

## Bindande rapport-, export- och myndighetsmappning

- auth receipts are audit evidence
- no regulatory filing generated directly from auth layer

## Bindande scenariofamilj till proof-ledger och rapportspar

- `AUTH-A001` local auth -> `AUTH-P0001`,`AUTH-P0006`
- `AUTH-A002` high-risk step-up -> `AUTH-P0002`,`AUTH-P0006`
- `AUTH-A003` revoked session reuse -> `AUTH-P0009`
- `AUTH-A004` credential recovery or reset -> `AUTH-P0011`
- `AUTH-B001` passkey registration or login -> `AUTH-P0003`
- `AUTH-C001` OIDC login -> `AUTH-P0004`
- `AUTH-D001` SAML login -> `AUTH-P0005`
- `AUTH-Z001` support reveal boundary -> `AUTH-P0007`
- `AUTH-Z002` support reveal with approval -> `AUTH-P0010`,`AUTH-P0007`
- `AUTH-Z003` support reveal denied without approval -> `AUTH-P0007`

## Tvingande dokument- eller indataregler

- OIDC issuer metadata or config required
- SAML metadata required
- RP ID or origin binding required för WebAuthn
- permission policy required för every protected route family
- session assurance policy required för every high-risk route family
- recovery profile and evidence policy required för every recoverable credential type

## Bindande legal reason-code-katalog eller specialorsakskatalog

- `AUTH-R001` missing_primary_factor
- `AUTH-R002` missing_step_up
- `AUTH-R003` invalid_webauthn_assertion
- `AUTH-R004` invalid_oidc_token
- `AUTH-R005` invalid_saml_assertion
- `AUTH-R006` unauthorized_action
- `AUTH-R007` revoked_session_or_credential
- `AUTH-R008` stale_session_for_high_risk_action
- `AUTH-R009` support_reveal_without_approval
- `AUTH-R010` invalid_recovery_assurance

## Bindande faltspec eller inputspec per profil

- `webauthn_passkey`: RP ID, challenge, credential id, public key, signature data
- `oidc_federation`: issuer, client id, audience expectations, jwks or metadata
- `saml_federation`: entity id, metadata, signing certs, ACS config
- `totp_mfa`: seed ref, algorithm profile, timestep profile
- `support_reveal`: approval ref, scope, reason, actor, duration limit
- `credential_recovery`: recovery method, assurance evidence, replacement credential ref, approval or policy ref

## Scenariofamiljer som hela systemet måste tacka

- local login
- local login with step-up
- passkey registration
- passkey authentication
- OIDC federation login
- SAML federation login
- revoked session
- unauthorized action
- support masked read
- support reveal with approval
- support reveal denied
- credential reset or recovery
- stale session för high-risk action

## Scenarioregler per familj

- local login får inte ge session före verified primary factor
- high-risk mutation får inte passera utan step-up när policy kraver det
- passkey auth måste verifiera challenge och RP binding
- OIDC måste verifiera issuer, audience och signature
- SAML måste verifiera signature och assertion conditions
- support reveal får aldrig ske utan explicit approval boundary
- stale session får inte accepteras för high-risk action där fresh auth eller ny step-up är krav
- revoked session eller credential får aldrig bli återanvändbar via cache eller stale projection
- credential recovery får inte ge bredare atkomst an vanlig auth path utan samma assurancekrav

## Blockerande valideringar

- missing primary factor
- missing or failed step-up
- invalid WebAuthn assertion
- invalid OIDC token
- invalid SAML assertion
- missing permission grant
- session expired or revoked
- locked or suspended identity
- stale session för high-risk action
- support reveal without approval artifact
- recovery flow without approved assurance path

## Rapport- och exportkonsekvenser

- all auth decisions must yield immutable audit evidence
- support reveal and admin overrides must be separately attributable

## Förbjudna förenklingar

- session before primary verification
- passkeys without WebAuthn semantics
- implicit admin by frontend role only
- federation without signature validation
- support superuser bypass
- reusing pre-step-up session id after assurance increase
- allowing revoked credential through stale cache or stale projection

## Fler bindande proof-ledger-regler för specialfall

- `AUTH-P0008` revoked session cannot be reactivated by cache residue
- `AUTH-P0009` stale federation metadata blocks activation
- `AUTH-P0010` risk-flagged action without step-up blocks hard
- `AUTH-P0011` support reveal without active approval blocks hard
- `AUTH-P0012` credential recovery without evidence creates no session and no replacement credential

## Bindande reskontraeffekt, subledger-effekt eller annan state-effekt per proof-ledger

- auth layer creates identity, session and audit evidence only
- no accounting or payroll legal effect originates here

## Bindande verifikations-, serie- och exportregler

- auth receipts have their own audit identities
- no accounting voucher identity originates here

## Bindande variantmatris som måste korsas mot varje scenariofamilj

- local vs federated
- passkey vs password vs TOTP
- ordinary vs high-risk action
- human vs service principal
- active vs revoked credential or session
- active vs locked or suspended identity
- fresh vs stale session
- masked support read vs approved reveal vs denied reveal

## Bindande fixture-klasser för identitet, auth, MFA och behörighet

- `AUTH-FXT-001` local login
- `AUTH-FXT-002` step-up challenge
- `AUTH-FXT-003` passkey registration and assertion
- `AUTH-FXT-004` OIDC token validation
- `AUTH-FXT-005` SAML assertion validation
- `AUTH-FXT-006` support reveal approval
- `AUTH-FXT-007` revoked session reuse
- `AUTH-FXT-008` stale session för step-up path
- `AUTH-FXT-009` credential recovery
- `AUTH-FXT-010` support reveal denied

## Bindande expected outcome-format per scenario

Varje scenario ska minst ange:
- scenario id
- fixture class
- auth profile
- expected verification verdict
- expected session verdict
- expected permission verdict
- expected audit artifacts

## Bindande canonical verifikationsseriepolicy

- auth layer owns no accounting series
- audit ids are auth-evidence ids only

## Bindande expected outcome per central scenariofamilj

- `AUTH-A001`: session active only after primary verification
- `AUTH-A002`: high-risk action allowed only after step-up success
- `AUTH-A003`: revoked session denied even if client presents previously valid token or session id
- `AUTH-A004`: credential recovery completes only after approved recovery assurance path
- `AUTH-B001`: passkey accepted only after valid WebAuthn assertion
- `AUTH-C001`: OIDC accepted only after issuer, audience and signature checks
- `AUTH-D001`: SAML accepted only after signature and condition checks
- `AUTH-Z002`: support reveal allowed only with active scoped approval
- `AUTH-Z003`: support reveal denied without approval and no unmasked data returned

## Bindande kompakt expected outcome-register för alla scenariofamiljer

- `AUTH-A001` -> `AUTH-P0001,P0006` -> local login allowed
- `AUTH-A002` -> `AUTH-P0002,P0006` -> high-risk action allowed
- `AUTH-A003` -> `AUTH-P0009` -> revoked session denied
- `AUTH-A004` -> `AUTH-P0011` -> recovery assurance enforced
- `AUTH-B001` -> `AUTH-P0003` -> passkey accepted
- `AUTH-C001` -> `AUTH-P0004` -> OIDC accepted
- `AUTH-D001` -> `AUTH-P0005` -> SAML accepted
- `AUTH-Z001` -> `AUTH-P0007` -> support reveal bounded
- `AUTH-Z002` -> `AUTH-P0010,P0007` -> support reveal approved and scoped
- `AUTH-Z003` -> `AUTH-P0007` -> support reveal denied

## Bindande testkrav

- session-before-primary-factor blocker test
- step-up required test för high-risk action
- WebAuthn challenge and RP binding test
- OIDC issuer, audience and signature validation test
- SAML signature and condition validation test
- permission boundary and support reveal test
- revoked session reuse blocker test
- stale session blocker test för high-risk action
- support reveal without approval blocker test
- credential recovery assurance and audit test

## Källor som styr dokumentet

- OpenID Foundation: [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-18.html)
- OASIS: [SAML 2.0 Core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
- W3C: [Web Authentication Level 2](https://www.w3.org/TR/webauthn-2/)
