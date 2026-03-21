export interface BenefitValuation {
  readonly benefitType: string;
  readonly taxableValue: number;
  readonly employeePaidValue: number;
  readonly explanation: string;
}

