export type RoleCode =
  | "company_admin"
  | "approver"
  | "payroll_admin"
  | "field_user"
  | "bureau_user";

export interface AuthPrincipal {
  readonly userId: string;
  readonly companyId: string;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly string[];
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

