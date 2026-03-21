export interface SalaryExchangeAgreement {
  readonly agreementId: string;
  readonly employeeId: string;
  readonly startsOn: string;
  readonly endsOn?: string;
}

