# AUTH_IDENTITY_SCOPE_AND_BACKOFFICE

Status: Bindande auth-, identity-, scope- och backoffice-specifikation.

Detta dokument definierar hur identitet, sessioner, scopes, supportåtkomst, impersonation och break-glass ska fungera. Syftet är att backend ska bära hela trust- och säkerhetsmodellen före UI.

## 1. Grundregler

1. All access är explicit scoped till tenant, roll, team, queue, objekt eller supportärende.
2. Read-only är default för support. Write-capable support är undantag.
3. Signering, submission, payment approval, period reopen, break-glass och write-capable impersonation kräver step-up.
4. BankID och passkeys är förstaklassiga starka faktorer; TOTP är fallback.
5. Enterprise SSO får ge inloggning men inte implicit affärsroll; roller mappas i org-auth.
6. Search, notifications, activity och object profiles får bara exponera data efter resolved permissions.
7. Backoffice är separat bounded context och separat surface; det är inte dold desktop-admin.
8. Service principals och OAuth clients får aldrig dela mänskliga roller.

## 2. Identitetsmodell

### 2.1 Kärnobjekt

- `IdentityAccount`
- `PersonIdentity`
- `TenantMembership`
- `TeamMembership`
- `RoleAssignment`
- `ObjectGrant`
- `QueueGrant`
- `Delegation`
- `ServicePrincipal`
- `OAuthClient`
- `SessionRevision`
- `ChallengeRequest`
- `PasskeyCredential`
- `TotpCredential`
- `BankIdLink`
- `FederationConnection`
- `FederatedIdentity`
- `DeviceTrustRecord`
- `ImpersonationSession`
- `BreakGlassSession`
- `AccessReviewBatch`

### 2.2 Identity linking

Varje mänsklig identitet kan ha flera autentiseringskällor:
- lokal/passkey
- TOTP
- BankID via auth broker
- enterprise federation via SAML/OIDC

Linking-regler:
- samma person kan ha flera factors
- en factor får inte länkas till flera identity accounts
- högrisk-linking kräver step-up och audit
- federation claims får inte skapa högprivilegierad roll utan explicit approval

## 3. Autentiseringsmetoder

### 3.1 Passkeys
- förstahandsval för lokala admins och frekventa användare
- WebAuthn resident keys där klientstöd finns
- enrollment kräver stark befintlig session
- credential loss recovery kräver separat challenge chain

### 3.2 TOTP
- fallback och recovery faktor
- TOTP får inte vara enda faktor för break-glass approval
- secret rotation och recovery codes måste vara auditerade

### 3.3 BankID
- standardmetod för svensk stark identitet och högtrust-signatur
- används för:
  - identity proofing
  - step-up vid filings, payouts, break-glass och andra högtrust-åtgärder
  - signering när providerflödet kräver det
- providerkedja går via auth broker och Signicat-baserad adapter eller likvärdig broker enligt ADR
- sandbox och prod är strikt separerade

### 3.4 Enterprise federation: SAML/OIDC
- används för enterprise login
- auth broker normaliserar claims
- tenant admin definierar mapping från IdP-grupper till roller, team och queue grants
- lokal step-up gäller fortfarande för högtrust-åtgärder även om IdP har MFA

## 4. Session trust

### 4.1 SessionRevision

Fält:
- `session_revision_id`
- `identity_account_id`
- `tenant_id`
- `auth_strength`
- `last_step_up_at`
- `device_trust_level`
- `risk_score`
- `impersonation_mode`
- `break_glass_flag`
- `expires_at`

### 4.2 Trustnivåer
- `low`
- `standard`
- `strong`
- `strong_signed`

### 4.3 Actions by trust level

**Standard**
- läs vanliga objekt
- skapa utkast
- claim/resolve vanliga work items

**Strong**
- godkänna pay run
- godkänna payment order
- aktivera kollektivavtal
- approve HUS signoff

**Strong_signed**
- submit AGI
- submit VAT
- submit annual filing
- final approve break-glass
- final approve write-capable impersonation

## 5. Device trust

### 5.1 Objekt
- `DeviceTrustRecord`
- `DeviceEnrollment`
- `DeviceChallenge`
- `DeviceRevocation`

### 5.2 Regler
- kiosk devices och backoffice-enheter måste vara explicit trusted
- trusted status är tenant- och purpose-bound
- en device kan vara trusted för field kiosk men inte för backoffice
- device revoke ska slå igenom omedelbart
- offline device trust måste ha kort TTL och signed attest

### 5.3 API
- `POST /v1/auth/devices/enroll`
- `POST /v1/auth/devices/:id/trust`
- `POST /v1/auth/devices/:id/revoke`
- `GET /v1/auth/devices`

## 6. Challenge center

Challenge center är egen backend-kategori och ska exponera:
- pending challenges
- required trust level
- supported challenge methods
- expiry and retry window
- signed completion receipt

API:
- `GET /v1/auth/challenges`
- `POST /v1/auth/challenges/:id/complete`
- `POST /v1/auth/challenges/:id/cancel`

## 7. Scope-modell

### 7.1 Scopetyper
- tenant scope
- company scope
- team scope
- queue scope
- object scope
- support case scope
- incident scope
- API client scope

### 7.2 Roller

#### Standard business roles
- finance operator
- finance approver
- payroll operator
- payroll approver
- project operator
- field operator
- compliance reviewer
- tenant admin

#### Support/backoffice roles
- support admin
- support lead
- security admin
- compliance admin
- incident commander
- audit reviewer

#### Integration roles
- integration admin
- API admin
- partner operator

### 7.3 Queue/work ownership
- queue grants måste vara explicita
- assignment får bara göras till user/team med queue grant
- support queue och customer-facing queue får inte blandas
- backoffice queue kan läsa action objects men inte affärsobjekt utanför scope

## 8. Visibility-regler

### 8.1 Search visibility
- search använder resolved permissions från org-auth
- search index får aldrig lagra egen ACL-sanning
- support/backoffice search kräver explicit support scope
- impersonation får inte utöka search utanför måltenant och sessionmode

### 8.2 Notification visibility
- notification recipient är user, team eller support queue
- notification visibility följer samma resolved permissions
- support notifications separeras från tenant notifications

### 8.3 Activity visibility
- activity feed är permission-trimmad
- backoffice activity och tenant activity är olika projections
- audit events visas endast i audit explorer med rätt scope

### 8.4 Review/work ownership
- review item visibility beror på queue grant och source object access
- claim/decide kräver både queue grant och action permission
- dual-control-fall måste tekniskt blockera samma person från båda stegen

## 9. Impersonation

### 9.1 Sessiontyper
- `read_only`
- `write_capable`

### 9.2 Regler
- all impersonation kräver support case
- read-only kräver support lead approval
- write-capable kräver support lead + security admin + färsk step-up
- support får aldrig signera, submitta eller godkänna ekonomiska beslut i kundens namn
- write-capable impersonation ska använda explicit allowlist av commands
- sessionerna är tidsbegränsade och vattenmärkta i backend context

### 9.3 API
- `POST /v1/backoffice/impersonations`
- `POST /v1/backoffice/impersonations/:id/approve`
- `POST /v1/backoffice/impersonations/:id/start`
- `POST /v1/backoffice/impersonations/:id/terminate`

## 10. Break-glass

### 10.1 Syfte
Används endast vid aktiv incident eller uppenbar driftskada när ordinarie väg inte räcker.

### 10.2 Regler
- kräver incident id
- kräver två-personersgodkännande
- kräver stark step-up
- har hård tidsgräns
- är sessionsbunden
- har särskild auditklass
- får endast öppna uttryckligen listade operations commands
- får aldrig ge direkt databasaccess i vanlig drift

### 10.3 API
- `POST /v1/backoffice/break-glass`
- `POST /v1/backoffice/break-glass/:id/approve`
- `POST /v1/backoffice/break-glass/:id/end`

## 11. Access attestation

### 11.1 Objekt
- `AccessReviewBatch`
- `AccessReviewFinding`
- `AttestationDecision`

### 11.2 Regler
- minst kvartalsvis access review för enterprise tenants
- support- och backoffice-roller ska alltid ingå
- avvikande queue grants och object grants ska flaggas
- stale delegations ska stängas

### 11.3 API
- `POST /v1/backoffice/access-reviews`
- `GET /v1/backoffice/access-reviews/:id`
- `POST /v1/backoffice/access-reviews/:id/decisions`

## 12. API-konsekvenser

Alla muterande API-rutter ska ha:
- `required_action_class`
- `required_trust_level`
- `required_scope_type`
- `idempotency_key`
- `expected_object_version` där tillämpligt

Alla read-rutter ska ha:
- permission-filtered result sets
- explicit `visibility_reason` på sensitive object profiles när access är begränsad
- support/backoffice route families separerade från ordinary tenant route families

## 13. Runtime enforcement

- permission resolution sker server-side före command execution
- every command binds actor, session revision and resolved scopes
- step-up freshness måste vara inom action-specific TTL
- impersonation mode följer med i command envelope
- break-glass commands använder separat allowlist och audit class
- service principals kan inte använda mänskliga approvals
- public API och partner API använder OAuth scopes, inte tenant business roles

## 14. Testkrav

- passkey enroll/revoke
- TOTP fallback and recovery
- BankID sandbox/prod isolation
- federation claim mapping
- JIT provisioning without privilege escalation
- step-up TTL expiration
- read-only impersonation write denial
- write-capable impersonation allowlist enforcement
- break-glass dual approval and timeout
- search permission trimming
- queue visibility trimming
- access review finding generation
- service principal scope isolation

## 15. Exit gate

Dokumentet är uppfyllt först när:
- BankID, passkeys, TOTP och enterprise federation fungerar i verklig providerkedja
- scopes, queue grants och object grants verkställs server-side
- support/backoffice är separerad bounded context
- impersonation och break-glass följer approvalkedja och audit
- search, notifications, activity och review respekterar resolved permissions
- API-rutter bär trust- och scope-krav
