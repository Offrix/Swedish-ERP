export interface VatDecision {
  readonly decisionCode: string;
  readonly declarationBoxCodes: readonly string[];
  readonly bookingTemplateCode: string;
  readonly explanation: string;
}

