export type BankAccountStatus = "active" | "blocked" | "archived";
export type PaymentProposalStatus =
  | "draft"
  | "approved"
  | "exported"
  | "submitted"
  | "accepted_by_bank"
  | "partially_executed"
  | "settled"
  | "failed"
  | "cancelled";
export type PaymentOrderStatus = "prepared" | "reserved" | "sent" | "accepted" | "booked" | "returned" | "rejected";
export type BankPaymentEventType = "booked" | "rejected" | "returned";

export interface BankAccount {
  readonly bankAccountId: string;
  readonly companyId: string;
  readonly bankAccountNo: string;
  readonly bankName: string;
  readonly ledgerAccountNumber: string;
  readonly currencyCode: string;
  readonly clearingNumber: string | null;
  readonly accountNumber: string | null;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly status: BankAccountStatus;
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PaymentOrder {
  readonly paymentOrderId: string;
  readonly companyId: string;
  readonly paymentProposalId: string;
  readonly apOpenItemId: string;
  readonly supplierInvoiceId: string;
  readonly supplierId: string;
  readonly status: PaymentOrderStatus;
  readonly payeeName: string;
  readonly bankgiro: string | null;
  readonly plusgiro: string | null;
  readonly iban: string | null;
  readonly bic: string | null;
  readonly paymentReference: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly dueDate: string;
  readonly lineageKey: string;
  readonly reservedJournalEntryId: string | null;
  readonly bookedJournalEntryId: string | null;
  readonly rejectedJournalEntryId: string | null;
  readonly returnedJournalEntryId: string | null;
  readonly bankEventId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PaymentProposal {
  readonly paymentProposalId: string;
  readonly companyId: string;
  readonly paymentProposalNo: string;
  readonly bankAccountId: string;
  readonly status: PaymentProposalStatus;
  readonly paymentDate: string;
  readonly currencyCode: string;
  readonly totalAmount: number;
  readonly sourceOpenItemSetHash: string;
  readonly exportFileName: string | null;
  readonly exportPayload: string | null;
  readonly exportPayloadHash: string | null;
  readonly approvedByActorId: string | null;
  readonly approvedAt: string | null;
  readonly exportedAt: string | null;
  readonly submittedAt: string | null;
  readonly acceptedByBankAt: string | null;
  readonly settledAt: string | null;
  readonly failedAt: string | null;
  readonly cancelledAt: string | null;
  readonly createdByActorId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly bankAccount?: BankAccount | null;
  readonly orders?: readonly PaymentOrder[];
}

export interface BankPaymentEvent {
  readonly bankPaymentEventId: string;
  readonly companyId: string;
  readonly paymentOrderId: string;
  readonly bankEventId: string;
  readonly eventType: BankPaymentEventType;
  readonly status: string;
  readonly journalEntryId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
