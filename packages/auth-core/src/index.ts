export type RoleCode =
  | "company_admin"
  | "approver"
  | "payroll_admin"
  | "field_user"
  | "bureau_user";

export type PermissionCode =
  | "company.read"
  | "company.manage"
  | "company_user.read"
  | "company_user.write"
  | "delegation.manage"
  | "object_grant.manage"
  | "attest_chain.manage"
  | "approval.approve"
  | "onboarding.manage"
  | "auth.session.revoke"
  | "auth.factor.manage";

export interface AuthPrincipal {
  readonly userId: string;
  readonly companyId: string;
  readonly companyUserId: string;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly PermissionCode[];
}

export interface AuthContext {
  readonly principal: AuthPrincipal;
  readonly issuedAt: string;
  readonly correlationId: string;
  readonly delegationId?: string;
}

export interface AuthorizationResult {
  readonly allowed: boolean;
  readonly reasonCode: string;
  readonly explanation: string;
}

export interface AuthorizationResource {
  readonly companyId: string;
  readonly objectType?: string;
  readonly objectId?: string;
  readonly ownerCompanyUserId?: string;
  readonly scopeCode?: string;
}

export interface AuthSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly companyId: string;
  readonly companyUserId: string;
  readonly status: "pending" | "active" | "revoked";
  readonly requiredFactorCount: number;
  readonly amr: readonly string[];
}
