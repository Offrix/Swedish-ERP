export interface OrganizationScope {
  readonly companyId: string;
  readonly roleCodes: readonly string[];
  readonly delegationIds: readonly string[];
}
