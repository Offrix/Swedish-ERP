import crypto from "node:crypto";
import { createAuditEnvelopeFromLegacyEvent } from "../../events/src/index.mjs";
import { cloneValue as copy } from "../../domain-core/src/clone.mjs";
import {
  applyDurableStateSnapshot,
  serializeDurableState
} from "../../domain-core/src/state-snapshots.mjs";

export const LEDGER_STATES = Object.freeze(["draft", "validated", "posted", "reversed", "locked_by_period"]);
export const DEFAULT_LEDGER_CURRENCY = "SEK";
export const DEFAULT_CHART_TEMPLATE_ID = "DSAM-2026";
export const DEFAULT_VOUCHER_SERIES_CODES = Object.freeze("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
export const VOUCHER_SERIES_STATUSES = Object.freeze(["active", "paused", "archived"]);
export const LEDGER_ACCOUNT_STATUSES = Object.freeze(["active", "archived"]);
export const DIMENSION_VALUE_STATUSES = Object.freeze(["active", "archived"]);
export const DEFAULT_VOUCHER_SERIES_PURPOSE_MAP = Object.freeze({
  A: Object.freeze(["LEDGER_MANUAL", "LEDGER_CORRECTION"]),
  B: Object.freeze(["AR_INVOICE", "AR_DUNNING"]),
  C: Object.freeze(["AR_CREDIT_NOTE"]),
  D: Object.freeze(["AR_PAYMENT"]),
  E: Object.freeze(["AP_INVOICE", "AP_CREDIT_NOTE", "AP_PAYMENT"]),
  H: Object.freeze(["PAYROLL_RUN", "PAYROLL_CORRECTION", "PAYROLL_PAYOUT_MATCH"]),
  I: Object.freeze(["VAT_SETTLEMENT"]),
  V: Object.freeze(["LEDGER_REVERSAL", "AR_WRITEOFF"]),
  W: Object.freeze(["HISTORICAL_IMPORT"])
});
export const POSTING_SOURCE_TYPES = Object.freeze([
  "AR_INVOICE",
  "AR_CREDIT_NOTE",
  "AR_PAYMENT",
  "AP_INVOICE",
  "AP_CREDIT_NOTE",
  "AP_PAYMENT",
  "PAYROLL_RUN",
  "PAYROLL_CORRECTION",
  "BENEFIT_EVENT",
  "TRAVEL_CLAIM",
  "VAT_SETTLEMENT",
  "BANK_IMPORT",
  "MANUAL_JOURNAL",
  "ASSET_DEPRECIATION",
  "PERIOD_ACCRUAL",
  "YEAR_END_TRANSFER",
  "ROT_RUT_CLAIM",
  "PENSION_REPORT",
  "PROJECT_WIP"
]);
export const POSTING_JOURNAL_TYPES = Object.freeze([
  "operational_posting",
  "settlement_posting",
  "payroll_posting",
  "tax_account_posting",
  "year_end_adjustment",
  "reversal",
  "correction_replacement",
  "historical_import"
]);

export const POSTING_RECIPE_DEFINITIONS = Object.freeze([
  Object.freeze({
    recipeCode: "LEDGER_MANUAL_JOURNAL",
    version: "2026.1",
    sourceDomain: "ledger",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["MANUAL_JOURNAL"]),
    defaultVoucherSeriesPurposeCode: "LEDGER_MANUAL",
    fallbackVoucherSeriesCode: "A",
    defaultSignalCode: "ledger.manual_journal.created"
  }),
  Object.freeze({
    recipeCode: "AR_INVOICE",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AR_INVOICE"]),
    defaultVoucherSeriesPurposeCode: "AR_INVOICE",
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "ar.invoice.issued"
  }),
  Object.freeze({
    recipeCode: "AR_CREDIT_NOTE",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AR_CREDIT_NOTE"]),
    defaultVoucherSeriesPurposeCode: "AR_CREDIT_NOTE",
    fallbackVoucherSeriesCode: "C",
    defaultSignalCode: "ar.credit_note.issued"
  }),
  Object.freeze({
    recipeCode: "AR_PAYMENT_ALLOCATION",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AR_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AR_PAYMENT",
    fallbackVoucherSeriesCode: "D",
    defaultSignalCode: "ar.payment.allocated"
  }),
  Object.freeze({
    recipeCode: "AR_PAYMENT_REVERSAL",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AR_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AR_PAYMENT",
    fallbackVoucherSeriesCode: "D",
    defaultSignalCode: "ar.payment.reversed"
  }),
  Object.freeze({
    recipeCode: "AR_DUNNING_CHARGE",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AR_INVOICE"]),
    defaultVoucherSeriesPurposeCode: "AR_DUNNING",
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "ar.dunning.charge_booked"
  }),
  Object.freeze({
    recipeCode: "AR_WRITEOFF",
    version: "2026.1",
    sourceDomain: "ar",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["MANUAL_JOURNAL"]),
    defaultVoucherSeriesPurposeCode: "AR_WRITEOFF",
    fallbackVoucherSeriesCode: "V",
    defaultSignalCode: "ar.writeoff.posted"
  }),
  Object.freeze({
    recipeCode: "AP_INVOICE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AP_INVOICE"]),
    defaultVoucherSeriesPurposeCode: "AP_INVOICE",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.invoice.posted"
  }),
  Object.freeze({
    recipeCode: "AP_CREDIT_NOTE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "operational_posting",
    allowedSourceTypes: Object.freeze(["AP_CREDIT_NOTE"]),
    defaultVoucherSeriesPurposeCode: "AP_CREDIT_NOTE",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.credit_note.posted"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_RESERVE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.payment.reserved"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_RELEASE",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "ap.payment.released"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_SETTLEMENT",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "bank.payment_order.settled"
  }),
  Object.freeze({
    recipeCode: "AP_PAYMENT_RETURN",
    version: "2026.1",
    sourceDomain: "ap",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["AP_PAYMENT"]),
    defaultVoucherSeriesPurposeCode: "AP_PAYMENT",
    fallbackVoucherSeriesCode: "E",
    defaultSignalCode: "bank.payment_order.returned"
  }),
  Object.freeze({
    recipeCode: "PAYROLL_RUN",
    version: "2026.1",
    sourceDomain: "payroll",
    journalType: "payroll_posting",
    allowedSourceTypes: Object.freeze(["PAYROLL_RUN"]),
    defaultVoucherSeriesPurposeCode: "PAYROLL_RUN",
    fallbackVoucherSeriesCode: "H",
    defaultSignalCode: "payroll.run.posted"
  }),
  Object.freeze({
    recipeCode: "PAYROLL_CORRECTION",
    version: "2026.1",
    sourceDomain: "payroll",
    journalType: "payroll_posting",
    allowedSourceTypes: Object.freeze(["PAYROLL_CORRECTION"]),
    defaultVoucherSeriesPurposeCode: "PAYROLL_CORRECTION",
    fallbackVoucherSeriesCode: "H",
    defaultSignalCode: "payroll.run.posted"
  }),
  Object.freeze({
    recipeCode: "PAYROLL_PAYOUT_MATCH",
    version: "2026.1",
    sourceDomain: "payroll",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["PAYROLL_RUN"]),
    defaultVoucherSeriesPurposeCode: "PAYROLL_PAYOUT_MATCH",
    fallbackVoucherSeriesCode: "H",
    defaultSignalCode: "bank.payment_order.settled"
  }),
  Object.freeze({
    recipeCode: "BANK_STATEMENT_MATCH",
    version: "2026.1",
    sourceDomain: "banking",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["BANK_IMPORT"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "D",
    defaultSignalCode: "bank.statement.line.matched_and_approved"
  }),
  Object.freeze({
    recipeCode: "TAX_ACCOUNT_CLASSIFIED_EVENT",
    version: "2026.1",
    sourceDomain: "tax_account",
    journalType: "tax_account_posting",
    allowedSourceTypes: Object.freeze(["VAT_SETTLEMENT"]),
    defaultVoucherSeriesPurposeCode: "VAT_SETTLEMENT",
    fallbackVoucherSeriesCode: "I",
    defaultSignalCode: "tax_account.event.classified_and_approved"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_ACCEPTED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "hus.claim.accepted"
  }),
  Object.freeze({
    recipeCode: "HUS_CLAIM_PARTIALLY_ACCEPTED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "B",
    defaultSignalCode: "hus.claim.partially_accepted"
  }),
  Object.freeze({
    recipeCode: "HUS_RECOVERY_CONFIRMED",
    version: "2026.1",
    sourceDomain: "hus",
    journalType: "settlement_posting",
    allowedSourceTypes: Object.freeze(["ROT_RUT_CLAIM"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "V",
    defaultSignalCode: "hus.recovery.confirmed"
  }),
  Object.freeze({
    recipeCode: "YEAR_END_ADJUSTMENT",
    version: "2026.1",
    sourceDomain: "ledger_close",
    journalType: "year_end_adjustment",
    allowedSourceTypes: Object.freeze(["YEAR_END_TRANSFER"]),
    defaultVoucherSeriesPurposeCode: null,
    fallbackVoucherSeriesCode: "X",
    defaultSignalCode: "close.adjustment.approved"
  })
]);

const POSTING_RECIPES_BY_CODE = new Map(POSTING_RECIPE_DEFINITIONS.map((recipe) => [recipe.recipeCode, recipe]));

export const REQUIRED_ENGINE_ACCOUNTS = Object.freeze({
  customerInvoices: Object.freeze(["1210", "2610", "2620", "2630", "3010-3490", "2650"]),
  supplierInvoices: Object.freeze(["2410", "2640", "4010-6990", "2650"]),
  payroll: Object.freeze(["7010-7390", "2710", "2720", "2730", "2740", "7110-7160"]),
  pension: Object.freeze(["7130-7160", "2740", "2760"]),
  travel: Object.freeze(["5330_or_7310"]),
  rotRut: Object.freeze(["3070", "3080", "2560"]),
  projectCost: Object.freeze(["project_dimension_required"]),
  bank: Object.freeze(["1110", "1170", "1180", "1190"]),
  tax: Object.freeze(["1120", "2570", "2510-2590"])
});

const RAW_DSAM_ACCOUNTS = Object.freeze([
  {
    "accountNumber": "1000",
    "accountName": "Kassa",
    "accountClass": "1"
  },
  {
    "accountNumber": "1010",
    "accountName": "Kassaredovisning fält",
    "accountClass": "1"
  },
  {
    "accountNumber": "1030",
    "accountName": "Växelkassa",
    "accountClass": "1"
  },
  {
    "accountNumber": "1070",
    "accountName": "Digitala plånböcker",
    "accountClass": "1"
  },
  {
    "accountNumber": "1080",
    "accountName": "Internt clearingkonto kontanter",
    "accountClass": "1"
  },
  {
    "accountNumber": "1090",
    "accountName": "Kassatranseringar ej bokförda",
    "accountClass": "1"
  },
  {
    "accountNumber": "1100",
    "accountName": "Bank",
    "accountClass": "1"
  },
  {
    "accountNumber": "1110",
    "accountName": "Huvudbankkonto",
    "accountClass": "1"
  },
  {
    "accountNumber": "1120",
    "accountName": "Skattekonto spegling",
    "accountClass": "1"
  },
  {
    "accountNumber": "1130",
    "accountName": "Klientmedel ej tillåtet i kärnprodukt utan separat reglering",
    "accountClass": "1"
  },
  {
    "accountNumber": "1140",
    "accountName": "Valutakonto EUR",
    "accountClass": "1"
  },
  {
    "accountNumber": "1150",
    "accountName": "Valutakonto USD",
    "accountClass": "1"
  },
  {
    "accountNumber": "1160",
    "accountName": "Spärrat konto",
    "accountClass": "1"
  },
  {
    "accountNumber": "1170",
    "accountName": "Kortkonto clearing",
    "accountClass": "1"
  },
  {
    "accountNumber": "1180",
    "accountName": "Inbetalningar under utredning",
    "accountClass": "1"
  },
  {
    "accountNumber": "1190",
    "accountName": "Utbetalningar under utredning",
    "accountClass": "1"
  },
  {
    "accountNumber": "1200",
    "accountName": "Kundfordringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1210",
    "accountName": "Kundfordringar inrikes",
    "accountClass": "1"
  },
  {
    "accountNumber": "1220",
    "accountName": "Kundfordringar EU",
    "accountClass": "1"
  },
  {
    "accountNumber": "1230",
    "accountName": "Kundfordringar export",
    "accountClass": "1"
  },
  {
    "accountNumber": "1240",
    "accountName": "Osäkra kundfordringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1250",
    "accountName": "Nedskrivning kundfordringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1290",
    "accountName": "Reserverad AR-clearing",
    "accountClass": "1"
  },
  {
    "accountNumber": "1300",
    "accountName": "Övriga kortfristiga fordringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1310",
    "accountName": "Fordran kortutlägg anställda",
    "accountClass": "1"
  },
  {
    "accountNumber": "1320",
    "accountName": "Fordran kundkorttransaktioner",
    "accountClass": "1"
  },
  {
    "accountNumber": "1330",
    "accountName": "Fordran Swish/kortinlösen",
    "accountClass": "1"
  },
  {
    "accountNumber": "1340",
    "accountName": "Fordran moms",
    "accountClass": "1"
  },
  {
    "accountNumber": "1350",
    "accountName": "Fordran på leverantörer",
    "accountClass": "1"
  },
  {
    "accountNumber": "1360",
    "accountName": "Förskott till leverantörer",
    "accountClass": "1"
  },
  {
    "accountNumber": "1370",
    "accountName": "Interimsfordringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1380",
    "accountName": "Övriga fordringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1390",
    "accountName": "Valutakursdifferens fordran",
    "accountClass": "1"
  },
  {
    "accountNumber": "1400",
    "accountName": "Lager",
    "accountClass": "1"
  },
  {
    "accountNumber": "1410",
    "accountName": "Råvarulager",
    "accountClass": "1"
  },
  {
    "accountNumber": "1420",
    "accountName": "Handelsvarulager",
    "accountClass": "1"
  },
  {
    "accountNumber": "1430",
    "accountName": "Lager för projektmaterial",
    "accountClass": "1"
  },
  {
    "accountNumber": "1440",
    "accountName": "Pågående arbete material",
    "accountClass": "1"
  },
  {
    "accountNumber": "1450",
    "accountName": "Reserv lagerdifferenser",
    "accountClass": "1"
  },
  {
    "accountNumber": "1460",
    "accountName": "Inventarier småvärde i omsättning",
    "accountClass": "1"
  },
  {
    "accountNumber": "1490",
    "accountName": "Inkuransreserv",
    "accountClass": "1"
  },
  {
    "accountNumber": "1500",
    "accountName": "Förutbetalda kostnader och upplupna intäkter",
    "accountClass": "1"
  },
  {
    "accountNumber": "1510",
    "accountName": "Förutbetalda hyror",
    "accountClass": "1"
  },
  {
    "accountNumber": "1520",
    "accountName": "Förutbetalda försäkringar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1530",
    "accountName": "Övriga förutbetalda kostnader",
    "accountClass": "1"
  },
  {
    "accountNumber": "1540",
    "accountName": "Upplupna intäkter",
    "accountClass": "1"
  },
  {
    "accountNumber": "1550",
    "accountName": "Upplupna bidrag",
    "accountClass": "1"
  },
  {
    "accountNumber": "1590",
    "accountName": "Interimsfordringar övrigt",
    "accountClass": "1"
  },
  {
    "accountNumber": "1600",
    "accountName": "Anläggningstillgångar immateriella",
    "accountClass": "1"
  },
  {
    "accountNumber": "1610",
    "accountName": "Balanserade utvecklingsutgifter",
    "accountClass": "1"
  },
  {
    "accountNumber": "1620",
    "accountName": "Programvarulicenser",
    "accountClass": "1"
  },
  {
    "accountNumber": "1630",
    "accountName": "Patent/varumärken",
    "accountClass": "1"
  },
  {
    "accountNumber": "1690",
    "accountName": "Ackumulerade avskrivningar immateriella",
    "accountClass": "1"
  },
  {
    "accountNumber": "1700",
    "accountName": "Materiella anläggningstillgångar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1710",
    "accountName": "Mark",
    "accountClass": "1"
  },
  {
    "accountNumber": "1720",
    "accountName": "Byggnader",
    "accountClass": "1"
  },
  {
    "accountNumber": "1730",
    "accountName": "Förbättringsutgifter annans fastighet",
    "accountClass": "1"
  },
  {
    "accountNumber": "1740",
    "accountName": "Maskiner",
    "accountClass": "1"
  },
  {
    "accountNumber": "1750",
    "accountName": "Inventarier",
    "accountClass": "1"
  },
  {
    "accountNumber": "1760",
    "accountName": "Datorer/servrar",
    "accountClass": "1"
  },
  {
    "accountNumber": "1770",
    "accountName": "Fordon",
    "accountClass": "1"
  },
  {
    "accountNumber": "1780",
    "accountName": "Verktyg och utrustning",
    "accountClass": "1"
  },
  {
    "accountNumber": "1790",
    "accountName": "Ackumulerade avskrivningar materiella",
    "accountClass": "1"
  },
  {
    "accountNumber": "2000",
    "accountName": "Eget kapital",
    "accountClass": "2"
  },
  {
    "accountNumber": "2010",
    "accountName": "Aktiekapital/egen insättning beroende bolagsform",
    "accountClass": "2"
  },
  {
    "accountNumber": "2020",
    "accountName": "Reservfond/bundna reserver",
    "accountClass": "2"
  },
  {
    "accountNumber": "2030",
    "accountName": "Balanserat resultat",
    "accountClass": "2"
  },
  {
    "accountNumber": "2040",
    "accountName": "Årets resultat",
    "accountClass": "2"
  },
  {
    "accountNumber": "2050",
    "accountName": "Egna uttag",
    "accountClass": "2"
  },
  {
    "accountNumber": "2060",
    "accountName": "Egna insättningar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2090",
    "accountName": "Överföringar eget kapital",
    "accountClass": "2"
  },
  {
    "accountNumber": "2100",
    "accountName": "Obeskattade reserver",
    "accountClass": "2"
  },
  {
    "accountNumber": "2110",
    "accountName": "Periodiseringsfond",
    "accountClass": "2"
  },
  {
    "accountNumber": "2120",
    "accountName": "Överavskrivningar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2190",
    "accountName": "Obeskattade reserver övrigt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2200",
    "accountName": "Avsättningar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2210",
    "accountName": "Garantireserv",
    "accountClass": "2"
  },
  {
    "accountNumber": "2220",
    "accountName": "Tvister och åtaganden",
    "accountClass": "2"
  },
  {
    "accountNumber": "2290",
    "accountName": "Övriga avsättningar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2300",
    "accountName": "Långfristiga skulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2310",
    "accountName": "Banklån långfristigt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2320",
    "accountName": "Leasing skuld långfristig",
    "accountClass": "2"
  },
  {
    "accountNumber": "2330",
    "accountName": "Aktieägarlån",
    "accountClass": "2"
  },
  {
    "accountNumber": "2390",
    "accountName": "Övriga långfristiga skulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2400",
    "accountName": "Leverantörsskulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2410",
    "accountName": "Leverantörsskulder inrikes",
    "accountClass": "2"
  },
  {
    "accountNumber": "2420",
    "accountName": "Leverantörsskulder EU",
    "accountClass": "2"
  },
  {
    "accountNumber": "2430",
    "accountName": "Leverantörsskulder import",
    "accountClass": "2"
  },
  {
    "accountNumber": "2440",
    "accountName": "Leverantörskreditnotor",
    "accountClass": "2"
  },
  {
    "accountNumber": "2450",
    "accountName": "Ej utbetalda leverantörsbetalningar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2490",
    "accountName": "AP-clearing",
    "accountClass": "2"
  },
  {
    "accountNumber": "2500",
    "accountName": "Skatteskulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2510",
    "accountName": "Beräknad inkomstskatt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2520",
    "accountName": "Momsskuld",
    "accountClass": "2"
  },
  {
    "accountNumber": "2530",
    "accountName": "Personalskatt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2540",
    "accountName": "Arbetsgivaravgifter",
    "accountClass": "2"
  },
  {
    "accountNumber": "2550",
    "accountName": "Särskild löneskatt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2560",
    "accountName": "ROT/RUT-skuld/fordran mot Skatteverket",
    "accountClass": "2"
  },
  {
    "accountNumber": "2570",
    "accountName": "Skattekonto clearing",
    "accountClass": "2"
  },
  {
    "accountNumber": "2590",
    "accountName": "Övriga skatter",
    "accountClass": "2"
  },
  {
    "accountNumber": "2600",
    "accountName": "Utgående moms",
    "accountClass": "2"
  },
  {
    "accountNumber": "2610",
    "accountName": "Utgående moms 25",
    "accountClass": "2"
  },
  {
    "accountNumber": "2620",
    "accountName": "Utgående moms 12",
    "accountClass": "2"
  },
  {
    "accountNumber": "2630",
    "accountName": "Utgående moms 6",
    "accountClass": "2"
  },
  {
    "accountNumber": "2640",
    "accountName": "Ingående moms",
    "accountClass": "2"
  },
  {
    "accountNumber": "2650",
    "accountName": "Redovisningskonto moms",
    "accountClass": "2"
  },
  {
    "accountNumber": "2660",
    "accountName": "Moms EU-förvärv",
    "accountClass": "2"
  },
  {
    "accountNumber": "2670",
    "accountName": "Moms omvänd byggmoms",
    "accountClass": "2"
  },
  {
    "accountNumber": "2680",
    "accountName": "Moms import",
    "accountClass": "2"
  },
  {
    "accountNumber": "2690",
    "accountName": "Momsjusteringar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2700",
    "accountName": "Personalskulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2710",
    "accountName": "Avdragen preliminärskatt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2720",
    "accountName": "Utmätning/löneavdrag",
    "accountClass": "2"
  },
  {
    "accountNumber": "2730",
    "accountName": "Semesterskuld",
    "accountClass": "2"
  },
  {
    "accountNumber": "2740",
    "accountName": "Pension skuld kortfristig",
    "accountClass": "2"
  },
  {
    "accountNumber": "2750",
    "accountName": "Nettolöneavdrag skuld",
    "accountClass": "2"
  },
  {
    "accountNumber": "2760",
    "accountName": "Löneväxling skuld",
    "accountClass": "2"
  },
  {
    "accountNumber": "2790",
    "accountName": "Övriga personalrelaterade skulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2800",
    "accountName": "Upplupna kostnader och förutbetalda intäkter",
    "accountClass": "2"
  },
  {
    "accountNumber": "2810",
    "accountName": "Upplupna löner",
    "accountClass": "2"
  },
  {
    "accountNumber": "2820",
    "accountName": "Upplupna semesterlöner",
    "accountClass": "2"
  },
  {
    "accountNumber": "2830",
    "accountName": "Upplupna pensioner",
    "accountClass": "2"
  },
  {
    "accountNumber": "2840",
    "accountName": "Upplupna bonusar/provisioner",
    "accountClass": "2"
  },
  {
    "accountNumber": "2850",
    "accountName": "Förutbetalda intäkter abonnemang",
    "accountClass": "2"
  },
  {
    "accountNumber": "2860",
    "accountName": "Förutbetalda projektintäkter",
    "accountClass": "2"
  },
  {
    "accountNumber": "2890",
    "accountName": "Interimskulder övrigt",
    "accountClass": "2"
  },
  {
    "accountNumber": "2900",
    "accountName": "Övriga kortfristiga skulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "2910",
    "accountName": "Moms/avgifter under utredning",
    "accountClass": "2"
  },
  {
    "accountNumber": "2920",
    "accountName": "Depositionsskuld",
    "accountClass": "2"
  },
  {
    "accountNumber": "2930",
    "accountName": "Presentkort/skuld",
    "accountClass": "2"
  },
  {
    "accountNumber": "2940",
    "accountName": "Kundförskott",
    "accountClass": "2"
  },
  {
    "accountNumber": "2950",
    "accountName": "Ej allokerade inbetalningar",
    "accountClass": "2"
  },
  {
    "accountNumber": "2990",
    "accountName": "Övriga kortfristiga skulder",
    "accountClass": "2"
  },
  {
    "accountNumber": "3000",
    "accountName": "Försäljning huvudgrupp",
    "accountClass": "3"
  },
  {
    "accountNumber": "3010",
    "accountName": "Tjänsteförsäljning Sverige 25",
    "accountClass": "3"
  },
  {
    "accountNumber": "3020",
    "accountName": "Varuförsäljning Sverige 25",
    "accountClass": "3"
  },
  {
    "accountNumber": "3030",
    "accountName": "Försäljning Sverige 12",
    "accountClass": "3"
  },
  {
    "accountNumber": "3040",
    "accountName": "Försäljning Sverige 6",
    "accountClass": "3"
  },
  {
    "accountNumber": "3050",
    "accountName": "Försäljning utan moms Sverige",
    "accountClass": "3"
  },
  {
    "accountNumber": "3060",
    "accountName": "Byggtjänster omvänd moms",
    "accountClass": "3"
  },
  {
    "accountNumber": "3070",
    "accountName": "ROT-arbete",
    "accountClass": "3"
  },
  {
    "accountNumber": "3080",
    "accountName": "RUT-arbete",
    "accountClass": "3"
  },
  {
    "accountNumber": "3090",
    "accountName": "Övrig försäljning",
    "accountClass": "3"
  },
  {
    "accountNumber": "3100",
    "accountName": "Försäljning EU",
    "accountClass": "3"
  },
  {
    "accountNumber": "3110",
    "accountName": "Varor EU B2B",
    "accountClass": "3"
  },
  {
    "accountNumber": "3120",
    "accountName": "Tjänster EU B2B",
    "accountClass": "3"
  },
  {
    "accountNumber": "3130",
    "accountName": "Varor EU B2C",
    "accountClass": "3"
  },
  {
    "accountNumber": "3140",
    "accountName": "Tjänster EU B2C",
    "accountClass": "3"
  },
  {
    "accountNumber": "3150",
    "accountName": "OSS-försäljning",
    "accountClass": "3"
  },
  {
    "accountNumber": "3160",
    "accountName": "Trepartshandel",
    "accountClass": "3"
  },
  {
    "accountNumber": "3190",
    "accountName": "EU-försäljning övrigt",
    "accountClass": "3"
  },
  {
    "accountNumber": "3200",
    "accountName": "Export utanför EU",
    "accountClass": "3"
  },
  {
    "accountNumber": "3210",
    "accountName": "Varuexport",
    "accountClass": "3"
  },
  {
    "accountNumber": "3220",
    "accountName": "Tjänsteexport",
    "accountClass": "3"
  },
  {
    "accountNumber": "3230",
    "accountName": "Export övrigt",
    "accountClass": "3"
  },
  {
    "accountNumber": "3290",
    "accountName": "Exportjusteringar",
    "accountClass": "3"
  },
  {
    "accountNumber": "3300",
    "accountName": "Abonnemang och återkommande intäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3310",
    "accountName": "Abonnemang månadsvis",
    "accountClass": "3"
  },
  {
    "accountNumber": "3320",
    "accountName": "Serviceavtal",
    "accountClass": "3"
  },
  {
    "accountNumber": "3330",
    "accountName": "Supportavtal",
    "accountClass": "3"
  },
  {
    "accountNumber": "3340",
    "accountName": "Licensintäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3350",
    "accountName": "Transaktionsintäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3390",
    "accountName": "Abonnemang övrigt",
    "accountClass": "3"
  },
  {
    "accountNumber": "3400",
    "accountName": "Projektintäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3410",
    "accountName": "Fastprisprojekt",
    "accountClass": "3"
  },
  {
    "accountNumber": "3420",
    "accountName": "Löpande projekt",
    "accountClass": "3"
  },
  {
    "accountNumber": "3430",
    "accountName": "Milstolpsintäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3440",
    "accountName": "ÄTA-intäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3450",
    "accountName": "Vidarefakturering material",
    "accountClass": "3"
  },
  {
    "accountNumber": "3460",
    "accountName": "Vidarefakturering resor",
    "accountClass": "3"
  },
  {
    "accountNumber": "3490",
    "accountName": "Projektintäkter övrigt",
    "accountClass": "3"
  },
  {
    "accountNumber": "3500",
    "accountName": "Övriga rörelseintäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3510",
    "accountName": "Faktureringsavgifter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3520",
    "accountName": "Påminnelseavgifter",
    "accountClass": "3"
  },
  {
    "accountNumber": "3530",
    "accountName": "Ränteintäkter kundreskontra",
    "accountClass": "3"
  },
  {
    "accountNumber": "3540",
    "accountName": "Valutakursvinster rörelse",
    "accountClass": "3"
  },
  {
    "accountNumber": "3590",
    "accountName": "Övriga rörelseintäkter",
    "accountClass": "3"
  },
  {
    "accountNumber": "4000",
    "accountName": "Inköp huvudgrupp",
    "accountClass": "4"
  },
  {
    "accountNumber": "4010",
    "accountName": "Varuinköp Sverige",
    "accountClass": "4"
  },
  {
    "accountNumber": "4020",
    "accountName": "Varuinköp EU",
    "accountClass": "4"
  },
  {
    "accountNumber": "4030",
    "accountName": "Varuinköp import",
    "accountClass": "4"
  },
  {
    "accountNumber": "4040",
    "accountName": "Underentreprenörer",
    "accountClass": "4"
  },
  {
    "accountNumber": "4050",
    "accountName": "Inköpt material till projekt",
    "accountClass": "4"
  },
  {
    "accountNumber": "4060",
    "accountName": "Frakt och tull inköp",
    "accountClass": "4"
  },
  {
    "accountNumber": "4070",
    "accountName": "Lagerförändring",
    "accountClass": "4"
  },
  {
    "accountNumber": "4090",
    "accountName": "Direkta kostnader övrigt",
    "accountClass": "4"
  },
  {
    "accountNumber": "5000",
    "accountName": "Lokaler",
    "accountClass": "5"
  },
  {
    "accountNumber": "5010",
    "accountName": "Hyra",
    "accountClass": "5"
  },
  {
    "accountNumber": "5020",
    "accountName": "El/värme",
    "accountClass": "5"
  },
  {
    "accountNumber": "5030",
    "accountName": "Städning",
    "accountClass": "5"
  },
  {
    "accountNumber": "5040",
    "accountName": "Reparation lokaler",
    "accountClass": "5"
  },
  {
    "accountNumber": "5090",
    "accountName": "Lokal övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5100",
    "accountName": "Fastighetskostnader övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5200",
    "accountName": "Maskiner/fordon drift",
    "accountClass": "5"
  },
  {
    "accountNumber": "5210",
    "accountName": "Leasing fordon",
    "accountClass": "5"
  },
  {
    "accountNumber": "5220",
    "accountName": "Bränsle",
    "accountClass": "5"
  },
  {
    "accountNumber": "5230",
    "accountName": "Reparation fordon",
    "accountClass": "5"
  },
  {
    "accountNumber": "5240",
    "accountName": "Försäkring fordon",
    "accountClass": "5"
  },
  {
    "accountNumber": "5250",
    "accountName": "Trängsel/infrastruktur",
    "accountClass": "5"
  },
  {
    "accountNumber": "5260",
    "accountName": "Parkering",
    "accountClass": "5"
  },
  {
    "accountNumber": "5290",
    "accountName": "Fordon övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5300",
    "accountName": "Resor",
    "accountClass": "5"
  },
  {
    "accountNumber": "5310",
    "accountName": "Tjänsteresor",
    "accountClass": "5"
  },
  {
    "accountNumber": "5320",
    "accountName": "Logi",
    "accountClass": "5"
  },
  {
    "accountNumber": "5330",
    "accountName": "Traktamente kostnad",
    "accountClass": "5"
  },
  {
    "accountNumber": "5340",
    "accountName": "Taxi/kollektivtrafik",
    "accountClass": "5"
  },
  {
    "accountNumber": "5350",
    "accountName": "Milersättning kostnad",
    "accountClass": "5"
  },
  {
    "accountNumber": "5390",
    "accountName": "Resor övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5400",
    "accountName": "Förbrukningsinventarier",
    "accountClass": "5"
  },
  {
    "accountNumber": "5410",
    "accountName": "Förbrukningsmaterial",
    "accountClass": "5"
  },
  {
    "accountNumber": "5420",
    "accountName": "Arbetskläder",
    "accountClass": "5"
  },
  {
    "accountNumber": "5430",
    "accountName": "Verktyg småvärde",
    "accountClass": "5"
  },
  {
    "accountNumber": "5490",
    "accountName": "Förbrukning övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5500",
    "accountName": "Reparation och underhåll",
    "accountClass": "5"
  },
  {
    "accountNumber": "5600",
    "accountName": "Kostnader för IT och programvara",
    "accountClass": "5"
  },
  {
    "accountNumber": "5610",
    "accountName": "Programvara abonnemang",
    "accountClass": "5"
  },
  {
    "accountNumber": "5620",
    "accountName": "Molndrift",
    "accountClass": "5"
  },
  {
    "accountNumber": "5630",
    "accountName": "Tele/datakom",
    "accountClass": "5"
  },
  {
    "accountNumber": "5640",
    "accountName": "OCR/AI-tjänster",
    "accountClass": "5"
  },
  {
    "accountNumber": "5650",
    "accountName": "Konsultutveckling IT",
    "accountClass": "5"
  },
  {
    "accountNumber": "5690",
    "accountName": "IT övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5700",
    "accountName": "Frakter/post",
    "accountClass": "5"
  },
  {
    "accountNumber": "5800",
    "accountName": "Reklam/marknadsföring",
    "accountClass": "5"
  },
  {
    "accountNumber": "5810",
    "accountName": "Webb/SEO",
    "accountClass": "5"
  },
  {
    "accountNumber": "5820",
    "accountName": "Annonsering",
    "accountClass": "5"
  },
  {
    "accountNumber": "5830",
    "accountName": "Säljmaterial",
    "accountClass": "5"
  },
  {
    "accountNumber": "5890",
    "accountName": "Marknad övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "5900",
    "accountName": "Försäkringar och risk",
    "accountClass": "5"
  },
  {
    "accountNumber": "6000",
    "accountName": "Administration",
    "accountClass": "5"
  },
  {
    "accountNumber": "6010",
    "accountName": "Kontorsmaterial",
    "accountClass": "5"
  },
  {
    "accountNumber": "6020",
    "accountName": "Redovisningskonsult",
    "accountClass": "5"
  },
  {
    "accountNumber": "6030",
    "accountName": "Revisionskostnad",
    "accountClass": "5"
  },
  {
    "accountNumber": "6040",
    "accountName": "Juridik",
    "accountClass": "5"
  },
  {
    "accountNumber": "6050",
    "accountName": "Inkasso",
    "accountClass": "5"
  },
  {
    "accountNumber": "6060",
    "accountName": "Bankavgifter",
    "accountClass": "5"
  },
  {
    "accountNumber": "6070",
    "accountName": "Betalningsavgifter",
    "accountClass": "5"
  },
  {
    "accountNumber": "6080",
    "accountName": "Domän/hosting publika ytor",
    "accountClass": "5"
  },
  {
    "accountNumber": "6090",
    "accountName": "Admin övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "6100",
    "accountName": "KMA, utbildning och certifiering",
    "accountClass": "5"
  },
  {
    "accountNumber": "6200",
    "accountName": "Telekom och porto",
    "accountClass": "5"
  },
  {
    "accountNumber": "6300",
    "accountName": "Företagsförsäkringar",
    "accountClass": "5"
  },
  {
    "accountNumber": "6400",
    "accountName": "Representation",
    "accountClass": "5"
  },
  {
    "accountNumber": "6410",
    "accountName": "Intern representation",
    "accountClass": "5"
  },
  {
    "accountNumber": "6420",
    "accountName": "Extern representation",
    "accountClass": "5"
  },
  {
    "accountNumber": "6430",
    "accountName": "Gåvor till kunder",
    "accountClass": "5"
  },
  {
    "accountNumber": "6440",
    "accountName": "Personalvård ej löner",
    "accountClass": "5"
  },
  {
    "accountNumber": "6490",
    "accountName": "Representation övrigt",
    "accountClass": "5"
  },
  {
    "accountNumber": "6500",
    "accountName": "Övriga externa tjänster",
    "accountClass": "5"
  },
  {
    "accountNumber": "6600",
    "accountName": "Avdragsgilla/ej avdragsgilla avgifter",
    "accountClass": "5"
  },
  {
    "accountNumber": "6900",
    "accountName": "Övriga externa kostnader",
    "accountClass": "5"
  },
  {
    "accountNumber": "7000",
    "accountName": "Löner huvudgrupp",
    "accountClass": "6"
  },
  {
    "accountNumber": "7010",
    "accountName": "Månadslöner",
    "accountClass": "6"
  },
  {
    "accountNumber": "7020",
    "accountName": "Timlöner",
    "accountClass": "6"
  },
  {
    "accountNumber": "7030",
    "accountName": "Övertid",
    "accountClass": "6"
  },
  {
    "accountNumber": "7040",
    "accountName": "OB",
    "accountClass": "6"
  },
  {
    "accountNumber": "7050",
    "accountName": "Jour/beredskap",
    "accountClass": "6"
  },
  {
    "accountNumber": "7060",
    "accountName": "Bonus/provision",
    "accountClass": "6"
  },
  {
    "accountNumber": "7070",
    "accountName": "Semesterlön",
    "accountClass": "6"
  },
  {
    "accountNumber": "7080",
    "accountName": "Sjuklön",
    "accountClass": "6"
  },
  {
    "accountNumber": "7090",
    "accountName": "Lön övrigt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7100",
    "accountName": "Sociala avgifter",
    "accountClass": "6"
  },
  {
    "accountNumber": "7110",
    "accountName": "Arbetsgivaravgifter",
    "accountClass": "6"
  },
  {
    "accountNumber": "7120",
    "accountName": "Särskild löneskatt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7130",
    "accountName": "Pensionspremier",
    "accountClass": "6"
  },
  {
    "accountNumber": "7140",
    "accountName": "Extra pension",
    "accountClass": "6"
  },
  {
    "accountNumber": "7150",
    "accountName": "Fora/kollektivavtalade premier",
    "accountClass": "6"
  },
  {
    "accountNumber": "7160",
    "accountName": "Löneväxling arbetsgivarpåslag",
    "accountClass": "6"
  },
  {
    "accountNumber": "7190",
    "accountName": "Sociala kostnader övrigt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7200",
    "accountName": "Förmåner",
    "accountClass": "6"
  },
  {
    "accountNumber": "7210",
    "accountName": "Bilförmån kostnad",
    "accountClass": "6"
  },
  {
    "accountNumber": "7220",
    "accountName": "Drivmedelsförmån kostnad",
    "accountClass": "6"
  },
  {
    "accountNumber": "7230",
    "accountName": "Sjukvårdsförsäkring",
    "accountClass": "6"
  },
  {
    "accountNumber": "7240",
    "accountName": "Kostförmån",
    "accountClass": "6"
  },
  {
    "accountNumber": "7250",
    "accountName": "Telefonförmån",
    "accountClass": "6"
  },
  {
    "accountNumber": "7260",
    "accountName": "Gåvor till anställda",
    "accountClass": "6"
  },
  {
    "accountNumber": "7270",
    "accountName": "Friskvård",
    "accountClass": "6"
  },
  {
    "accountNumber": "7290",
    "accountName": "Förmåner övrigt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7300",
    "accountName": "Utlägg och ersättningar",
    "accountClass": "6"
  },
  {
    "accountNumber": "7310",
    "accountName": "Traktamente utbetalt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7320",
    "accountName": "Milersättning utbetald",
    "accountClass": "6"
  },
  {
    "accountNumber": "7330",
    "accountName": "Utlägg ersatta",
    "accountClass": "6"
  },
  {
    "accountNumber": "7390",
    "accountName": "Ersättningar övrigt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7400",
    "accountName": "Utbildning personal",
    "accountClass": "6"
  },
  {
    "accountNumber": "7500",
    "accountName": "Rekrytering",
    "accountClass": "6"
  },
  {
    "accountNumber": "7600",
    "accountName": "Personalförsäkringar",
    "accountClass": "6"
  },
  {
    "accountNumber": "7700",
    "accountName": "Nedlagd tid intern",
    "accountClass": "6"
  },
  {
    "accountNumber": "7780",
    "accountName": "Semesterskuld förändring",
    "accountClass": "6"
  },
  {
    "accountNumber": "7790",
    "accountName": "Personalkostnader övrigt",
    "accountClass": "6"
  },
  {
    "accountNumber": "7800",
    "accountName": "Avskrivningar immateriella",
    "accountClass": "7"
  },
  {
    "accountNumber": "7810",
    "accountName": "Avskrivningar byggnader",
    "accountClass": "7"
  },
  {
    "accountNumber": "7820",
    "accountName": "Avskrivningar maskiner",
    "accountClass": "7"
  },
  {
    "accountNumber": "7830",
    "accountName": "Avskrivningar inventarier",
    "accountClass": "7"
  },
  {
    "accountNumber": "7840",
    "accountName": "Avskrivningar fordon",
    "accountClass": "7"
  },
  {
    "accountNumber": "7890",
    "accountName": "Avskrivningar övrigt",
    "accountClass": "7"
  },
  {
    "accountNumber": "7900",
    "accountName": "Finansiella intäkter/kostnader",
    "accountClass": "7"
  },
  {
    "accountNumber": "7910",
    "accountName": "Räntekostnader",
    "accountClass": "7"
  },
  {
    "accountNumber": "7920",
    "accountName": "Leasingränta",
    "accountClass": "7"
  },
  {
    "accountNumber": "7930",
    "accountName": "Valutakursförluster",
    "accountClass": "7"
  },
  {
    "accountNumber": "7940",
    "accountName": "Valutakursvinster",
    "accountClass": "7"
  },
  {
    "accountNumber": "7950",
    "accountName": "Bankräntor",
    "accountClass": "7"
  },
  {
    "accountNumber": "7960",
    "accountName": "Dröjsmålsräntor",
    "accountClass": "7"
  },
  {
    "accountNumber": "7990",
    "accountName": "Finansiellt övrigt",
    "accountClass": "7"
  },
  {
    "accountNumber": "8800",
    "accountName": "Bokslutsdispositioner",
    "accountClass": "8"
  },
  {
    "accountNumber": "8810",
    "accountName": "Avsättning periodiseringsfond",
    "accountClass": "8"
  },
  {
    "accountNumber": "8820",
    "accountName": "Återföring periodiseringsfond",
    "accountClass": "8"
  },
  {
    "accountNumber": "8830",
    "accountName": "Överavskrivningar förändring",
    "accountClass": "8"
  },
  {
    "accountNumber": "8890",
    "accountName": "Dispositioner övrigt",
    "accountClass": "8"
  },
  {
    "accountNumber": "8900",
    "accountName": "Skatt",
    "accountClass": "8"
  },
  {
    "accountNumber": "8910",
    "accountName": "Skatt på årets resultat",
    "accountClass": "8"
  },
  {
    "accountNumber": "8920",
    "accountName": "Uppskjuten skatt",
    "accountClass": "8"
  },
  {
    "accountNumber": "8990",
    "accountName": "Årets resultat",
    "accountClass": "8"
  }
]);

export const DSAM_ACCOUNTS = Object.freeze(
  RAW_DSAM_ACCOUNTS.map((definition) =>
    Object.freeze({
      ...definition,
      accountClass: deriveTemplateAccountClass(definition.accountNumber, definition.accountClass)
    })
  )
);

const DEMO_LEDGER_COMPANY_ID = "00000000-0000-4000-8000-000000000001";
const DIMENSION_TYPES = Object.freeze(["projects", "costCenters", "businessAreas", "serviceLines"]);
const DIMENSION_KEYS = Object.freeze(["projectId", "costCenterCode", "businessAreaCode", "serviceLineCode"]);
const DIMENSION_KEY_TO_CATALOG_KEY = Object.freeze({
  projectId: "projects",
  costCenterCode: "costCenters",
  businessAreaCode: "businessAreas",
  serviceLineCode: "serviceLines"
});
const DIMENSION_TYPE_CONFIG = Object.freeze({
  projects: Object.freeze({ valueKey: "projectId", codePrefix: "PRJ" }),
  costCenters: Object.freeze({ valueKey: "costCenterCode", codePrefix: "CC" }),
  businessAreas: Object.freeze({ valueKey: "businessAreaCode", codePrefix: "BA" }),
  serviceLines: Object.freeze({ valueKey: "serviceLineCode", codePrefix: "SL" })
});
const LOCKED_PERIOD_STATUSES = Object.freeze(["soft_locked", "hard_closed"]);
const DEMO_DIMENSION_CATALOG = Object.freeze({
  projects: Object.freeze([
    { code: "project-demo-alpha", label: "Demo Project Alpha", status: "active" },
    { code: "project-demo-beta", label: "Demo Project Beta", status: "active" }
  ]),
  costCenters: Object.freeze([
    { code: "CC-100", label: "Operations", status: "active" },
    { code: "CC-200", label: "Projects", status: "active" }
  ]),
  businessAreas: Object.freeze([
    { code: "BA-SERVICES", label: "Services", status: "active" },
    { code: "BA-FIELD", label: "Field", status: "active" }
  ]),
  serviceLines: Object.freeze([
    { code: "SL-SERVICE", label: "Service work", status: "active" },
    { code: "SL-INSTALL", label: "Installation work", status: "active" },
    { code: "SL-ROT", label: "ROT labor", status: "active" }
  ])
});

export function createLedgerPlatform(options = {}) {
  return createLedgerEngine(options);
}

export function createLedgerEngine({
  clock = () => new Date(),
  bootstrapMode = "none",
  bootstrapScenarioCode = null,
  seedDemo = bootstrapMode === "scenario_seed" || bootstrapScenarioCode !== null,
  accountingMethodPlatform = null,
  fiscalYearPlatform = null
} = {}) {
  const state = {
    accounts: new Map(),
    accountIdsByCompanyNumber: new Map(),
    voucherSeries: new Map(),
    voucherSeriesIdsByCompanyCode: new Map(),
    accountingPeriods: new Map(),
    dimensionCatalogsByCompanyId: new Map(),
    journalEntries: new Map(),
    journalLinesByEntryId: new Map(),
    idempotencyKeys: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
    synchronizeLedgerPeriodsForCompany(DEMO_LEDGER_COMPANY_ID);
  }

  return {
    ledgerStates: LEDGER_STATES,
    postingSourceTypes: POSTING_SOURCE_TYPES,
    postingJournalTypes: POSTING_JOURNAL_TYPES,
    postingRecipes: POSTING_RECIPE_DEFINITIONS,
    defaultChartTemplateId: DEFAULT_CHART_TEMPLATE_ID,
    installLedgerCatalog,
    ensureAccountingYearPeriod,
    listPostingRecipes,
    getPostingRecipe,
    listLedgerAccounts,
    upsertLedgerAccount,
    listVoucherSeries,
    getVoucherSeries,
    upsertVoucherSeries,
    reserveImportedVoucherNumber,
    resolveVoucherSeriesForPurpose,
    listAccountingPeriods,
    listLedgerDimensions,
    upsertLedgerDimensionValue,
    lockAccountingPeriod,
    reopenAccountingPeriod,
    applyPostingIntent,
    createJournalEntry,
    validateJournalEntry,
    postJournalEntry,
    reverseJournalEntry,
    correctJournalEntry,
    getJournalEntry,
    snapshotLedger,
    exportDurableState,
    importDurableState
  };

  function installLedgerCatalog({
    companyId,
    chartTemplateId = DEFAULT_CHART_TEMPLATE_ID,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const now = nowIso();
    let installedAccounts = 0;
    let installedVoucherSeries = 0;

    for (const definition of DSAM_ACCOUNTS) {
      const key = toCompanyScopedKey(resolvedCompanyId, definition.accountNumber);
      if (state.accountIdsByCompanyNumber.has(key)) {
        continue;
      }
      const account = {
        accountId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        accountNumber: definition.accountNumber,
        accountName: definition.accountName,
        accountClass: definition.accountClass,
        status: "active",
        governanceVersion: 1,
        locked: true,
        systemManaged: true,
        allowManualPosting: true,
        requiredDimensionKeys: [],
        metadataJson: {
          chartTemplateId,
          seedSource: "accounting_foundation_24_2",
          chartGovernanceStatus: "published",
          lastChangeReasonCode: "chart_install"
        },
        createdAt: now,
        updatedAt: now
      };
      state.accounts.set(account.accountId, account);
      state.accountIdsByCompanyNumber.set(key, account.accountId);
      installedAccounts += 1;
    }

    for (const seriesCode of DEFAULT_VOUCHER_SERIES_CODES) {
      const key = toCompanyScopedKey(resolvedCompanyId, seriesCode);
      if (state.voucherSeriesIdsByCompanyCode.has(key)) {
        continue;
      }
      const voucherSeries = {
        voucherSeriesId: crypto.randomUUID(),
        companyId: resolvedCompanyId,
        seriesCode,
        description: defaultSeriesDescription(seriesCode),
        nextNumber: 1,
        status: "active",
        purposeCodes: defaultSeriesPurposeCodes(seriesCode),
        importedSequencePreservationEnabled: true,
        profileVersion: 1,
        locked: true,
        systemManaged: true,
        changeReasonCode: "chart_install",
        createdAt: now,
        updatedAt: now
      };
      state.voucherSeries.set(voucherSeries.voucherSeriesId, voucherSeries);
      state.voucherSeriesIdsByCompanyCode.set(key, voucherSeries.voucherSeriesId);
      installedVoucherSeries += 1;
    }

    ensureDimensionCatalog(resolvedCompanyId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ledger.catalog.installed",
      entityType: "ledger_catalog",
      entityId: `${resolvedCompanyId}:${chartTemplateId}`,
      explanation: `Installed DSAM chart and voucher series for ${resolvedCompanyId}.`
    });

    return {
      companyId: resolvedCompanyId,
      chartTemplateId,
      installedAccounts,
      installedVoucherSeries,
      totalAccounts: listLedgerAccounts({ companyId: resolvedCompanyId }).length,
      totalVoucherSeries: listVoucherSeries({ companyId: resolvedCompanyId }).length
    };
  }

  function listLedgerAccounts({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.accounts.values()]
      .filter((account) => account.companyId === resolvedCompanyId)
      .sort((left, right) => left.accountNumber.localeCompare(right.accountNumber))
      .map(copy);
  }

  function upsertLedgerAccount({
    companyId,
    accountNumber,
    accountName,
    accountClass,
    status = null,
    allowManualPosting = null,
    requiredDimensionKeys = null,
    locked = null,
    changeReasonCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedAccountNumber = normalizeAccountNumber(accountNumber);
    const now = nowIso();
    const key = toCompanyScopedKey(resolvedCompanyId, resolvedAccountNumber);
    const existingAccountId = state.accountIdsByCompanyNumber.get(key);
    const existing = existingAccountId ? state.accounts.get(existingAccountId) : null;
    const hasUsage = existing ? accountHasUsage({ companyId: resolvedCompanyId, accountId: existing.accountId }) : false;

    if (existing && hasUsage && !changeReasonCode) {
      throw httpError(
        409,
        "ledger_account_change_reason_required",
        `Ledger account ${resolvedAccountNumber} requires a change reason after it has been used in journals.`
      );
    }

    const record = existing || {
      accountId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      accountNumber: resolvedAccountNumber,
      createdAt: now,
      metadataJson: {}
    };

    const resolvedAccountClass = normalizeAccountClass(accountClass ?? existing?.accountClass);
    if (existing && hasUsage && resolvedAccountClass !== existing.accountClass) {
      throw httpError(
        409,
        "ledger_account_class_locked_after_use",
        `Ledger account ${resolvedAccountNumber} cannot change account class after it has been used in journals.`
      );
    }

    record.accountName = normalizeLedgerLabel(accountName ?? existing?.accountName, "account_name_required");
    record.accountClass = resolvedAccountClass;
    record.status = normalizeLedgerAccountStatus(status ?? existing?.status ?? "active");
    record.allowManualPosting = allowManualPosting == null ? existing?.allowManualPosting ?? true : allowManualPosting === true;
    record.requiredDimensionKeys = normalizeRequiredDimensionKeys(requiredDimensionKeys ?? existing?.requiredDimensionKeys ?? []);
    record.locked = locked == null ? existing?.locked ?? true : locked === true;
    record.systemManaged = existing?.systemManaged ?? false;
    record.governanceVersion = (existing?.governanceVersion || 0) + 1;
    record.metadataJson = {
      ...(existing?.metadataJson || {}),
      chartGovernanceStatus: "published",
      lastChangeReasonCode: changeReasonCode || existing?.metadataJson?.lastChangeReasonCode || (existing ? "governance_update" : "custom_account_create")
    };
    record.updatedAt = now;

    state.accounts.set(record.accountId, record);
    state.accountIdsByCompanyNumber.set(key, record.accountId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: existing ? "ledger.account.updated" : "ledger.account.created",
      entityType: "ledger_account",
      entityId: record.accountId,
      explanation: `${existing ? "Updated" : "Created"} ledger account ${record.accountNumber}.`
    });

    return copy(record);
  }

  function listVoucherSeries({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.voucherSeries.values()]
      .filter((voucherSeries) => voucherSeries.companyId === resolvedCompanyId)
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode))
      .map(copy);
  }

  function getVoucherSeries({ companyId, seriesCode } = {}) {
    return copy(requireVoucherSeries(requireText(companyId, "company_id_required"), seriesCode));
  }

  function upsertVoucherSeries({
    companyId,
    seriesCode,
    description = null,
    nextNumber = null,
    status = null,
    purposeCodes = null,
    importedSequencePreservationEnabled = null,
    locked = null,
    changeReasonCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedSeriesCode = normalizeSeriesCode(seriesCode, "voucher_series_code_required");
    const now = nowIso();
    const existing = findVoucherSeries(state, resolvedCompanyId, resolvedSeriesCode);
    const hasUsage = existing ? voucherSeriesHasUsage({ companyId: resolvedCompanyId, voucherSeriesId: existing.voucherSeriesId }) : false;
    const resolvedStatus = normalizeVoucherSeriesStatus(status ?? existing?.status ?? "active");
    const resolvedPurposeCodes = normalizeVoucherSeriesPurposeCodes(
      purposeCodes ?? existing?.purposeCodes ?? defaultSeriesPurposeCodes(resolvedSeriesCode)
    );

    if (existing && hasUsage) {
      if (!changeReasonCode) {
        throw httpError(
          409,
          "voucher_series_change_reason_required",
          `Voucher series ${resolvedSeriesCode} requires a change reason after it has been used in journals.`
        );
      }
      if (JSON.stringify(resolvedPurposeCodes) !== JSON.stringify(existing.purposeCodes || [])) {
        throw httpError(
          409,
          "voucher_series_purposes_locked_after_use",
          `Voucher series ${resolvedSeriesCode} cannot change purpose mapping after it has been used in journals.`
        );
      }
    }

    ensureVoucherSeriesPurposeAvailability({
      state,
      companyId: resolvedCompanyId,
      purposeCodes: resolvedPurposeCodes,
      currentVoucherSeriesId: existing?.voucherSeriesId || null,
      status: resolvedStatus
    });

    const record = existing || {
      voucherSeriesId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      seriesCode: resolvedSeriesCode,
      createdAt: now
    };
    record.description = normalizeVoucherSeriesDescription(
      description ?? existing?.description ?? defaultSeriesDescription(resolvedSeriesCode)
    );
    record.nextNumber = normalizePositiveInteger(
      nextNumber ?? existing?.nextNumber ?? 1,
      "voucher_series_next_number_invalid"
    );
    record.status = resolvedStatus;
    record.purposeCodes = resolvedPurposeCodes;
    record.importedSequencePreservationEnabled =
      importedSequencePreservationEnabled == null
        ? existing?.importedSequencePreservationEnabled ?? true
        : Boolean(importedSequencePreservationEnabled);
    record.profileVersion = (existing?.profileVersion || 0) + 1;
    record.locked = locked == null ? existing?.locked ?? true : locked === true;
    record.systemManaged = existing?.systemManaged ?? false;
    record.changeReasonCode = changeReasonCode || existing?.changeReasonCode || (existing ? "governance_update" : "series_create");
    record.updatedAt = now;

    state.voucherSeries.set(record.voucherSeriesId, record);
    state.voucherSeriesIdsByCompanyCode.set(toCompanyScopedKey(resolvedCompanyId, resolvedSeriesCode), record.voucherSeriesId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: existing ? "ledger.voucher_series.updated" : "ledger.voucher_series.created",
      entityType: "voucher_series",
      entityId: record.voucherSeriesId,
      explanation: `${existing ? "Updated" : "Created"} voucher series ${record.seriesCode}.`
    });

    return copy(record);
  }

  function reserveImportedVoucherNumber({
    companyId,
    seriesCode,
    importedVoucherNumber,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const series = requireVoucherSeries(resolvedCompanyId, seriesCode);
    const resolvedImportedVoucherNumber = normalizePositiveInteger(
      importedVoucherNumber,
      "imported_voucher_number_invalid"
    );
    if (series.importedSequencePreservationEnabled !== true) {
      throw httpError(
        409,
        "voucher_series_import_preservation_disabled",
        `Voucher series ${series.seriesCode} does not allow imported sequence preservation.`
      );
    }

    const nextNumberAdjusted = series.nextNumber <= resolvedImportedVoucherNumber;
    if (nextNumberAdjusted) {
      series.nextNumber = resolvedImportedVoucherNumber + 1;
      series.updatedAt = nowIso();
    }

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.voucher_series.imported_number_reserved",
      entityType: "voucher_series",
      entityId: series.voucherSeriesId,
      explanation: `Reserved imported voucher number ${resolvedImportedVoucherNumber} in series ${series.seriesCode}.`
    });

    return {
      voucherSeries: copy(series),
      nextNumberAdjusted
    };
  }

  function resolveVoucherSeriesForPurpose({
    companyId,
    purposeCode,
    preferredSeriesCode = null,
    includePaused = false
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedPurposeCode = normalizeVoucherSeriesPurposeCode(purposeCode, "voucher_series_purpose_code_required");

    if (preferredSeriesCode) {
      const preferredSeries = requireVoucherSeries(resolvedCompanyId, preferredSeriesCode);
      ensureVoucherSeriesUsable(preferredSeries, includePaused);
      if (!preferredSeries.purposeCodes.includes(resolvedPurposeCode)) {
        throw httpError(
          409,
          "voucher_series_purpose_mismatch",
          `Voucher series ${preferredSeries.seriesCode} is not configured for purpose ${resolvedPurposeCode}.`
        );
      }
      return copy(preferredSeries);
    }

    const candidates = listVoucherSeriesForPurpose({
      state,
      companyId: resolvedCompanyId,
      purposeCode: resolvedPurposeCode,
      includePaused
    });
    if (candidates.length === 0) {
      throw httpError(
        404,
        "voucher_series_purpose_not_configured",
        `No voucher series is configured for purpose ${resolvedPurposeCode}.`
      );
    }
    if (candidates.length > 1) {
      throw httpError(
        409,
        "voucher_series_purpose_ambiguous",
        `Multiple voucher series are active for purpose ${resolvedPurposeCode}.`
      );
    }
    return copy(candidates[0]);
  }

  function resolvePostingVoucherSeriesCode({
    companyId,
    explicitSeriesCode = null,
    purposeCode = null,
    fallbackSeriesCode = null
  } = {}) {
    if (explicitSeriesCode) {
      return normalizeSeriesCode(explicitSeriesCode, "voucher_series_code_required");
    }
    if (purposeCode) {
      try {
        return resolveVoucherSeriesForPurpose({
          companyId,
          purposeCode
        }).seriesCode;
      } catch (error) {
        if (!fallbackSeriesCode) {
          throw error;
        }
      }
    }
    return normalizeSeriesCode(fallbackSeriesCode, "voucher_series_code_required");
  }

  function listPostingRecipes() {
    return POSTING_RECIPE_DEFINITIONS.map(copy);
  }

  function getPostingRecipe({ recipeCode } = {}) {
    return copy(requirePostingRecipe(recipeCode));
  }

  function applyPostingIntent({
    companyId,
    journalDate,
    voucherSeriesCode = null,
    voucherSeriesPurposeCode = null,
    fallbackVoucherSeriesCode = null,
    recipeCode,
    postingSignalCode = null,
    sourceType,
    sourceId,
    sourceObjectVersion = null,
    description = null,
    actorId,
    idempotencyKey,
    lines,
    currencyCode = DEFAULT_LEDGER_CURRENCY,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const recipe = requirePostingRecipe(recipeCode);
    const resolvedSourceType = assertPostingSourceType(sourceType);
    const resolvedSourceObjectVersion = normalizeOptionalText(sourceObjectVersion);
    if (!resolvedSourceObjectVersion) {
      throw httpError(400, "source_object_version_required", "Posting intents must bind an explicit source object version.");
    }
    if (!recipe.allowedSourceTypes.includes(resolvedSourceType)) {
      throw httpError(
        409,
        "posting_recipe_source_type_invalid",
        `Posting recipe ${recipe.recipeCode} does not allow source type ${resolvedSourceType}.`
      );
    }
    const resolvedVoucherSeriesCode = resolvePostingVoucherSeriesCode({
      companyId,
      explicitSeriesCode: voucherSeriesCode,
      purposeCode: voucherSeriesPurposeCode || recipe.defaultVoucherSeriesPurposeCode,
      fallbackSeriesCode: fallbackVoucherSeriesCode || recipe.fallbackVoucherSeriesCode
    });
    const created = createJournalEntry({
      companyId,
      journalDate,
      voucherSeriesCode: resolvedVoucherSeriesCode,
      sourceType: resolvedSourceType,
      sourceId,
      description,
      actorId,
      idempotencyKey,
      lines,
      currencyCode,
      metadataJson: {
        ...copy(metadataJson || {}),
        journalType: recipe.journalType,
        postingRecipeCode: recipe.recipeCode,
        postingRecipeVersion: recipe.version,
        postingSignalCode: normalizeOptionalText(postingSignalCode) || recipe.defaultSignalCode,
        sourceDomain: recipe.sourceDomain,
        sourceObjectVersion: resolvedSourceObjectVersion
      },
      correlationId
    });
    const validated = validateJournalEntry({
      companyId,
      journalEntryId: created.journalEntry.journalEntryId,
      actorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId,
      correlationId
    });
    return {
      journalEntry: posted.journalEntry,
      postingRecipe: copy(recipe),
      idempotentReplay: created.idempotentReplay === true
    };
  }

  function listAccountingPeriods({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    return [...state.accountingPeriods.values()]
      .filter((period) => period.companyId === resolvedCompanyId)
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn))
      .map(copy);
  }

  function ensureAccountingYearPeriod({
    companyId,
    fiscalYear = new Date(clock()).getUTCFullYear(),
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    synchronizeLedgerPeriodsForCompany(resolvedCompanyId);
    const resolvedFiscalYear = String(fiscalYear);
    if (!/^\d{4}$/.test(resolvedFiscalYear)) {
      throw httpError(400, "fiscal_year_invalid", "Fiscal year must be a four-digit year.");
    }
    const startsOn = `${resolvedFiscalYear}-01-01`;
    const endsOn = `${resolvedFiscalYear}-12-31`;
    const existing = [...state.accountingPeriods.values()].find(
      (period) =>
        period.companyId === resolvedCompanyId
        && period.startsOn === startsOn
        && period.endsOn === endsOn
    );
    if (existing) {
      return copy(existing);
    }

    const accountingPeriod = {
      accountingPeriodId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      startsOn,
      endsOn,
      fiscalYearId: null,
      fiscalPeriodId: null,
      status: "open",
      lockReasonCode: null,
      lockedByActorId: null,
      lockedAt: null,
      reopenedByActorId: null,
      reopenedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId,
      correlationId,
      action: "ledger.accounting_period.seeded",
      entityType: "accounting_period",
      entityId: accountingPeriod.accountingPeriodId,
      explanation: `Ensured accounting period ${startsOn}..${endsOn}.`
    });

    return copy(accountingPeriod);
  }

  function listLedgerDimensions({ companyId } = {}) {
    return copy(ensureDimensionCatalog(requireText(companyId, "company_id_required")));
  }

  function upsertLedgerDimensionValue({
    companyId,
    dimensionType,
    code,
    label,
    status = null,
    locked = null,
    sourceDomain = "ledger",
    changeReasonCode = null,
    actorId = "system",
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedDimensionType = normalizeDimensionType(dimensionType);
    const catalog = ensureDimensionCatalog(resolvedCompanyId);
    const resolvedCode = normalizeDimensionValueCode(code, resolvedDimensionType);
    const existing = catalog[resolvedDimensionType].find((value) => value.code === resolvedCode) || null;
    const hasUsage = existing
      ? dimensionValueHasUsage({
          companyId: resolvedCompanyId,
          dimensionType: resolvedDimensionType,
          code: resolvedCode
        })
      : false;

    if (existing && hasUsage && !changeReasonCode) {
      throw httpError(
        409,
        "dimension_value_change_reason_required",
        `Dimension value ${resolvedCode} requires a change reason after it has been used in journals.`
      );
    }

    const now = nowIso();
    const record = existing || {
      dimensionValueId: crypto.randomUUID(),
      code: resolvedCode,
      dimensionType: resolvedDimensionType,
      createdAt: now
    };
    record.label = normalizeLedgerLabel(label ?? existing?.label, "dimension_label_required");
    record.status = normalizeDimensionValueStatus(status ?? existing?.status ?? "active");
    record.locked = locked == null ? existing?.locked ?? true : locked === true;
    record.sourceDomain = requireText(sourceDomain || existing?.sourceDomain || "ledger", "dimension_source_domain_required");
    record.dimensionType = resolvedDimensionType;
    record.version = (existing?.version || 0) + 1;
    record.updatedAt = now;
    record.changeReasonCode = changeReasonCode || existing?.changeReasonCode || (existing ? "catalog_update" : "catalog_create");

    if (existing) {
      const index = catalog[resolvedDimensionType].findIndex((value) => value.code === resolvedCode);
      catalog[resolvedDimensionType][index] = record;
    } else {
      catalog[resolvedDimensionType].push(record);
      catalog[resolvedDimensionType].sort((left, right) => left.code.localeCompare(right.code));
    }
    catalog.catalogVersion += 1;
    catalog.updatedAt = now;

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: existing ? "ledger.dimension_value.updated" : "ledger.dimension_value.created",
      entityType: "ledger_dimension_value",
      entityId: record.dimensionValueId,
      explanation: `${existing ? "Updated" : "Created"} ${resolvedDimensionType} value ${record.code}.`
    });

    return copy({
      catalogVersion: catalog.catalogVersion,
      dimensionType: resolvedDimensionType,
      dimensionValue: record
    });
  }

  function lockAccountingPeriod({
    companyId,
    accountingPeriodId,
    status = "soft_locked",
    actorId,
    reasonCode,
    approvedByActorId = null,
    approvedByRoleCode = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const accountingPeriod = requireAccountingPeriodForCompany(resolvedCompanyId, accountingPeriodId);
    const targetStatus = assertLockStatus(status);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedReasonCode = requireText(reasonCode, "reason_code_required");

    if (accountingPeriod.status === targetStatus) {
      return {
        accountingPeriod: copy(accountingPeriod),
        affectedJournalEntries: []
      };
    }

    if (accountingPeriod.status === "hard_closed" && targetStatus !== "hard_closed") {
      throw httpError(409, "accounting_period_transition_invalid", "A hard-closed period must be reopened before its lock status changes.");
    }

    if (targetStatus === "hard_closed") {
      assertSeniorFinanceApproval({
        actorId: resolvedActorId,
        approvedByActorId,
        approvedByRoleCode
      });
    }

    const now = nowIso();
    accountingPeriod.status = targetStatus;
    accountingPeriod.lockReasonCode = resolvedReasonCode;
    accountingPeriod.lockedByActorId = resolvedActorId;
    accountingPeriod.lockedAt = now;
    accountingPeriod.updatedAt = now;

    const affectedJournalEntries = toggleEntriesForLockedPeriod({
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      action: "lock"
    });

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.accounting_period.locked",
      entityType: "accounting_period",
      entityId: accountingPeriod.accountingPeriodId,
      explanation: `Locked accounting period ${accountingPeriod.startsOn}..${accountingPeriod.endsOn} as ${targetStatus}.`
    });

    return {
      accountingPeriod: copy(accountingPeriod),
      affectedJournalEntries: affectedJournalEntries.map((entry) => presentJournalEntry(entry))
    };
  }

  function reopenAccountingPeriod({
    companyId,
    accountingPeriodId,
    actorId,
    reasonCode,
    approvedByActorId,
    approvedByRoleCode = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const accountingPeriod = requireAccountingPeriodForCompany(resolvedCompanyId, accountingPeriodId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    requireText(reasonCode, "reason_code_required");
    assertSeniorFinanceApproval({
      actorId: resolvedActorId,
      approvedByActorId,
      approvedByRoleCode
    });

    if (accountingPeriod.status === "open") {
      return {
        accountingPeriod: copy(accountingPeriod),
        affectedJournalEntries: []
      };
    }

    const now = nowIso();
    accountingPeriod.status = "open";
    accountingPeriod.reopenedByActorId = resolvedActorId;
    accountingPeriod.reopenedAt = now;
    accountingPeriod.updatedAt = now;

    const affectedJournalEntries = toggleEntriesForLockedPeriod({
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      action: "unlock"
    });

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.accounting_period.reopened",
      entityType: "accounting_period",
      entityId: accountingPeriod.accountingPeriodId,
      explanation: `Reopened accounting period ${accountingPeriod.startsOn}..${accountingPeriod.endsOn}.`
    });

    return {
      accountingPeriod: copy(accountingPeriod),
      affectedJournalEntries: affectedJournalEntries.map((entry) => presentJournalEntry(entry))
    };
  }

  function createJournalEntry({
    companyId,
    journalDate,
    voucherSeriesCode,
    sourceType,
    sourceId,
    description = null,
    actorId,
    idempotencyKey,
    lines,
    importedFlag = false,
    currencyCode = DEFAULT_LEDGER_CURRENCY,
    metadataJson = {},
    correctionOfJournalEntryId = null,
    correctionKey = null,
    correctionType = null,
    correlationId = crypto.randomUUID()
  } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedIdempotencyKey = requireText(idempotencyKey, "idempotency_key_required");
    const resolvedSourceType = assertPostingSourceType(sourceType);
    const resolvedSourceId = requireText(sourceId, "source_id_required");
    const replayKey = toCompanyScopedKey(resolvedCompanyId, resolvedIdempotencyKey);

    if (state.idempotencyKeys.has(replayKey)) {
      const existingEntry = requireJournalEntry(resolvedCompanyId, state.idempotencyKeys.get(replayKey));
      if (existingEntry.sourceType !== resolvedSourceType || existingEntry.sourceId !== resolvedSourceId) {
        throw httpError(409, "idempotency_key_conflict", "Idempotency key already belongs to another posting source.");
      }
      return {
        journalEntry: presentJournalEntry(existingEntry),
        idempotentReplay: true
      };
    }

    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedVoucherSeries = requireVoucherSeries(resolvedCompanyId, voucherSeriesCode);
    const resolvedJournalDate = normalizeDate(journalDate, "journal_date_required");
    const accountingContext = resolveAccountingContext({
      companyId: resolvedCompanyId,
      journalDate: resolvedJournalDate
    });
    const accountingPeriod = accountingContext.accountingPeriod;
    const normalizedMetadata = normalizeMetadata(metadataJson, importedFlag);
    ensurePeriodAllowsEntryCreation(accountingPeriod, normalizedMetadata);
    const dimensionCatalog = ensureDimensionCatalog(resolvedCompanyId);

    const journalEntryId = crypto.randomUUID();
    const draftLines = normalizeJournalLines({
      companyId: resolvedCompanyId,
      journalEntryId,
      actorId: resolvedActorId,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      entryCurrencyCode: normalizeCurrencyCode(currencyCode),
      metadataJson: normalizedMetadata,
      dimensionCatalogVersion: dimensionCatalog.catalogVersion,
      lines
    });
    const totals = calculateTotals(draftLines);
    const now = nowIso();
    const voucherNumber = resolvedVoucherSeries.nextNumber;
    resolvedVoucherSeries.nextNumber += 1;
    resolvedVoucherSeries.updatedAt = now;

    const entry = {
      journalEntryId,
      companyId: resolvedCompanyId,
      voucherSeriesId: resolvedVoucherSeries.voucherSeriesId,
      voucherSeriesCode: resolvedVoucherSeries.seriesCode,
      voucherSeriesProfileVersion: resolvedVoucherSeries.profileVersion || 1,
      dimensionCatalogVersion: dimensionCatalog.catalogVersion,
      accountingPeriodId: accountingPeriod.accountingPeriodId,
      fiscalYearId: accountingContext.fiscalYear?.fiscalYearId || accountingPeriod.fiscalYearId || null,
      fiscalPeriodId: accountingContext.fiscalPeriod?.periodId || accountingPeriod.fiscalPeriodId || null,
      accountingMethodProfileId: accountingContext.accountingMethodProfile?.methodProfileId || null,
      journalDate: resolvedJournalDate,
      voucherNumber,
      description: description ? String(description).trim() : null,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      actorId: resolvedActorId,
      status: "draft",
      importedFlag: Boolean(importedFlag),
      currencyCode: normalizeCurrencyCode(currencyCode),
      idempotencyKey: resolvedIdempotencyKey,
      metadataJson: normalizedMetadata,
      createdAt: now,
      updatedAt: now,
      validatedAt: null,
      postedAt: null,
      reversalOfJournalEntryId: null,
      reversedByJournalEntryId: null,
      correctionOfJournalEntryId: correctionOfJournalEntryId ? requireText(correctionOfJournalEntryId, "correction_of_journal_entry_id_required") : null,
      correctionKey: correctionKey ? requireText(correctionKey, "correction_key_required") : null,
      correctionType: correctionType ? assertCorrectionType(correctionType) : null,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit
    };

    state.journalEntries.set(entry.journalEntryId, entry);
    state.journalLinesByEntryId.set(entry.journalEntryId, draftLines);
    state.idempotencyKeys.set(replayKey, entry.journalEntryId);

    pushAudit({
      companyId: resolvedCompanyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.journal_entry.created",
      entityType: "journal_entry",
      entityId: entry.journalEntryId,
      explanation: `Created draft voucher ${entry.voucherSeriesCode}${entry.voucherNumber}.`
    });

    return {
      journalEntry: presentJournalEntry(entry),
      idempotentReplay: false
    };
  }

  function validateJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const entry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    if (entry.status === "locked_by_period") {
      throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
    }
    if (entry.status === "posted") {
      return { journalEntry: presentJournalEntry(entry) };
    }
    if (entry.status !== "draft" && entry.status !== "validated") {
      throw httpError(409, "ledger_state_invalid", `Journal entry cannot be validated from state ${entry.status}.`);
    }

    const accountingPeriod = requireAccountingPeriod(entry.accountingPeriodId);
    ensurePeriodAllowsEntryMutation(accountingPeriod, entry);
    const lines = requireJournalLines(entry.journalEntryId);
    validateLines(entry, lines);

    entry.status = "validated";
    entry.validatedAt = nowIso();
    entry.updatedAt = entry.validatedAt;
    pushAudit({
      companyId: entry.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.journal_entry.validated",
      entityType: "journal_entry",
      entityId: entry.journalEntryId,
      explanation: `Validated voucher ${entry.voucherSeriesCode}${entry.voucherNumber}.`
    });

    return {
      journalEntry: presentJournalEntry(entry)
    };
  }

  function postJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    correlationId = crypto.randomUUID()
  } = {}) {
    const entry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    if (entry.status === "posted") {
      return { journalEntry: presentJournalEntry(entry) };
    }
    if (entry.status !== "validated") {
      throw httpError(409, "journal_entry_not_validated", "Journal entry must be validated before posting.");
    }

    const accountingPeriod = requireAccountingPeriod(entry.accountingPeriodId);
    ensurePeriodAllowsEntryMutation(accountingPeriod, entry);
    const now = nowIso();
    entry.status = "posted";
    entry.postedAt = now;
    entry.updatedAt = now;

    pushAudit({
      companyId: entry.companyId,
      actorId: requireText(actorId, "actor_id_required"),
      correlationId,
      action: "ledger.journal_entry.posted",
      entityType: "journal_entry",
      entityId: entry.journalEntryId,
      explanation: `Posted voucher ${entry.voucherSeriesCode}${entry.voucherNumber}.`
    });

    return {
      journalEntry: presentJournalEntry(entry)
    };
  }

  function reverseJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    reasonCode,
    correctionKey,
    journalDate = null,
    voucherSeriesCode = null,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const originalEntry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedReasonCode = requireText(reasonCode, "reason_code_required");
    const resolvedCorrectionKey = requireText(correctionKey, "correction_key_required");

    if (originalEntry.status !== "posted" && originalEntry.status !== "reversed") {
      throw httpError(409, "journal_entry_not_posted", "Only posted journal entries can be reversed.");
    }

    if (originalEntry.reversedByJournalEntryId) {
      const existingReversal = requireJournalEntry(originalEntry.companyId, originalEntry.reversedByJournalEntryId);
      if (existingReversal.correctionKey === resolvedCorrectionKey) {
        return {
          originalJournalEntry: presentJournalEntry(originalEntry),
          reversalJournalEntry: presentJournalEntry(existingReversal),
          idempotentReplay: true
        };
      }
      throw httpError(409, "journal_entry_already_reversed", "Journal entry already has a linked full reversal.");
    }

    const target = resolveCorrectionTargetDate({
      companyId: originalEntry.companyId,
      originalEntry,
      requestedJournalDate: journalDate
    });
    const resolvedVoucherSeriesCode = voucherSeriesCode
      ? normalizeSeriesCode(voucherSeriesCode, "voucher_series_code_required")
      : resolveVoucherSeriesForPurpose({
          companyId: originalEntry.companyId,
          purposeCode: "LEDGER_REVERSAL"
        }).seriesCode;
    const reversalCreate = createJournalEntry({
      companyId: originalEntry.companyId,
      journalDate: target.journalDate,
      voucherSeriesCode: resolvedVoucherSeriesCode,
      sourceType: "MANUAL_JOURNAL",
      sourceId: `reversal:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      description: `Reversal of ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}`,
      actorId: resolvedActorId,
      idempotencyKey: `reversal:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      lines: reverseLines(requireJournalLines(originalEntry.journalEntryId)),
      metadataJson: {
        ...mergeJournalPinningMetadata(originalEntry.metadataJson, metadataJson),
        originalJournalEntryId: originalEntry.journalEntryId,
        originalPeriodUntouched: target.originalPeriodUntouched,
        pipelineStage: "ledger_reversal",
        reasonCode: resolvedReasonCode
      },
      correctionOfJournalEntryId: originalEntry.journalEntryId,
      correctionKey: resolvedCorrectionKey,
      correctionType: "full_reversal",
      correlationId
    });

    const validated = validateJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: reversalCreate.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });

    const now = nowIso();
    originalEntry.status = "reversed";
    originalEntry.reversedByJournalEntryId = posted.journalEntry.journalEntryId;
    originalEntry.updatedAt = now;
    const storedReversal = state.journalEntries.get(posted.journalEntry.journalEntryId);
    storedReversal.reversalOfJournalEntryId = originalEntry.journalEntryId;
    storedReversal.updatedAt = now;

    pushAudit({
      companyId: originalEntry.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.journal_entry.reversed",
      entityType: "journal_entry",
      entityId: originalEntry.journalEntryId,
      explanation: `Created reversal ${storedReversal.voucherSeriesCode}${storedReversal.voucherNumber} for ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}.`
    });

    return {
      originalJournalEntry: presentJournalEntry(originalEntry),
      reversalJournalEntry: presentJournalEntry(storedReversal),
      idempotentReplay: reversalCreate.idempotentReplay === true
    };
  }

  function correctJournalEntry({
    companyId,
    journalEntryId,
    actorId,
    reasonCode,
    correctionKey,
    lines,
    journalDate = null,
    voucherSeriesCode = null,
    reverseOriginal = false,
    metadataJson = {},
    correlationId = crypto.randomUUID()
  } = {}) {
    const originalEntry = requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId);
    const resolvedActorId = requireText(actorId, "actor_id_required");
    const resolvedReasonCode = requireText(reasonCode, "reason_code_required");
    const resolvedCorrectionKey = requireText(correctionKey, "correction_key_required");

    if (originalEntry.status !== "posted" && originalEntry.status !== "reversed") {
      throw httpError(409, "journal_entry_not_posted", "Only posted journal entries can be corrected.");
    }

    const target = resolveCorrectionTargetDate({
      companyId: originalEntry.companyId,
      originalEntry,
      requestedJournalDate: journalDate
    });

    let reversalJournalEntry = null;
    if (reverseOriginal) {
      reversalJournalEntry = reverseJournalEntry({
        companyId: originalEntry.companyId,
        journalEntryId: originalEntry.journalEntryId,
        actorId: resolvedActorId,
        reasonCode: resolvedReasonCode,
        correctionKey: `${resolvedCorrectionKey}:reversal`,
        journalDate: target.journalDate,
        correlationId
      }).reversalJournalEntry;
    }

    const resolvedVoucherSeriesCode = voucherSeriesCode
      ? normalizeSeriesCode(voucherSeriesCode, "voucher_series_code_required")
      : resolveVoucherSeriesForPurpose({
          companyId: originalEntry.companyId,
          purposeCode: "LEDGER_CORRECTION"
        }).seriesCode;

    const correctionCreate = createJournalEntry({
      companyId: originalEntry.companyId,
      journalDate: target.journalDate,
      voucherSeriesCode: resolvedVoucherSeriesCode,
      sourceType: "MANUAL_JOURNAL",
      sourceId: `correction:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      description: `Correction of ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}`,
      actorId: resolvedActorId,
      idempotencyKey: `correction:${originalEntry.journalEntryId}:${resolvedCorrectionKey}`,
      lines,
      metadataJson: {
        ...mergeJournalPinningMetadata(originalEntry.metadataJson, metadataJson),
        originalJournalEntryId: originalEntry.journalEntryId,
        originalPeriodUntouched: target.originalPeriodUntouched,
        pipelineStage: "ledger_correction",
        reasonCode: resolvedReasonCode
      },
      correctionOfJournalEntryId: originalEntry.journalEntryId,
      correctionKey: resolvedCorrectionKey,
      correctionType: reverseOriginal ? "reversal_and_rebook" : "delta",
      correlationId
    });

    const validated = validateJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: correctionCreate.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });
    const posted = postJournalEntry({
      companyId: originalEntry.companyId,
      journalEntryId: validated.journalEntry.journalEntryId,
      actorId: resolvedActorId,
      correlationId
    });

    const storedCorrection = state.journalEntries.get(posted.journalEntry.journalEntryId);
    pushAudit({
      companyId: originalEntry.companyId,
      actorId: resolvedActorId,
      correlationId,
      action: "ledger.journal_entry.corrected",
      entityType: "journal_entry",
      entityId: originalEntry.journalEntryId,
      explanation: `Created correction ${storedCorrection.voucherSeriesCode}${storedCorrection.voucherNumber} for ${originalEntry.voucherSeriesCode}${originalEntry.voucherNumber}.`
    });

    return {
      originalJournalEntry: presentJournalEntry(originalEntry),
      reversalJournalEntry: reversalJournalEntry ? presentJournalEntry(state.journalEntries.get(reversalJournalEntry.journalEntryId)) : null,
      correctedJournalEntry: presentJournalEntry(storedCorrection),
      idempotentReplay: correctionCreate.idempotentReplay === true
    };
  }

  function getJournalEntry({ companyId, journalEntryId } = {}) {
    return presentJournalEntry(requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId));
  }

  function snapshotLedger() {
    return copy({
      accounts: [...state.accounts.values()],
      voucherSeries: [...state.voucherSeries.values()],
      accountingPeriods: [...state.accountingPeriods.values()],
      dimensionCatalogs: [...state.dimensionCatalogsByCompanyId.values()],
      journalEntries: [...state.journalEntries.values()].map((entry) => presentJournalEntry(entry)),
      auditEvents: state.auditEvents
    });
  }

  function exportDurableState() {
    return serializeDurableState(state);
  }

  function importDurableState(snapshot) {
    applyDurableStateSnapshot(state, snapshot);
  }

  function findVoucherSeries(runtimeState, companyId, seriesCode) {
    const normalizedCode = normalizeSeriesCode(seriesCode, "voucher_series_code_required");
    const voucherSeriesId = runtimeState.voucherSeriesIdsByCompanyCode.get(toCompanyScopedKey(companyId, normalizedCode));
    return voucherSeriesId ? runtimeState.voucherSeries.get(voucherSeriesId) : null;
  }

  function requireVoucherSeries(companyId, seriesCode) {
    const voucherSeries = findVoucherSeries(state, companyId, seriesCode);
    if (!voucherSeries) {
      const normalizedCode = normalizeSeriesCode(seriesCode, "voucher_series_code_required");
      throw httpError(404, "voucher_series_not_found", `Voucher series ${normalizedCode} was not found for the company.`);
    }
    return voucherSeries;
  }

  function ensureVoucherSeriesUsable(voucherSeries, includePaused) {
    if (!voucherSeries) {
      throw httpError(404, "voucher_series_not_found", "Voucher series was not found.");
    }
    if (voucherSeries.status === "archived" || (!includePaused && voucherSeries.status !== "active")) {
      throw httpError(409, "voucher_series_not_usable", `Voucher series ${voucherSeries.seriesCode} is not available for posting.`);
    }
  }

  function listVoucherSeriesForPurpose({ state: runtimeState, companyId, purposeCode, includePaused = false }) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedPurposeCode = normalizeVoucherSeriesPurposeCode(purposeCode, "voucher_series_purpose_code_required");
    return [...runtimeState.voucherSeries.values()]
      .filter((voucherSeries) => voucherSeries.companyId === resolvedCompanyId)
      .filter((voucherSeries) => Array.isArray(voucherSeries.purposeCodes) && voucherSeries.purposeCodes.includes(resolvedPurposeCode))
      .filter((voucherSeries) => (includePaused ? voucherSeries.status !== "archived" : voucherSeries.status === "active"))
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode));
  }

  function ensureVoucherSeriesPurposeAvailability({ state: runtimeState, companyId, purposeCodes, currentVoucherSeriesId = null, status }) {
    if (status !== "active" || purposeCodes.length === 0) {
      return;
    }
    for (const purposeCode of purposeCodes) {
      const conflictingSeries = listVoucherSeriesForPurpose({
        state: runtimeState,
        companyId,
        purposeCode
      }).find((voucherSeries) => voucherSeries.voucherSeriesId !== currentVoucherSeriesId);
      if (conflictingSeries) {
        throw httpError(
          409,
          "voucher_series_purpose_conflict",
          `Purpose ${purposeCode} is already assigned to active series ${conflictingSeries.seriesCode}.`
        );
      }
    }
  }

  function voucherSeriesHasUsage({ companyId, voucherSeriesId }) {
    return [...state.journalEntries.values()].some(
      (entry) => entry.companyId === companyId && entry.voucherSeriesId === voucherSeriesId
    );
  }

  function accountHasUsage({ companyId, accountId }) {
    for (const lines of state.journalLinesByEntryId.values()) {
      if (lines.some((line) => line.companyId === companyId && line.accountId === accountId)) {
        return true;
      }
    }
    return false;
  }

  function dimensionValueHasUsage({ companyId, dimensionType, code }) {
    const resolvedDimensionType = normalizeDimensionType(dimensionType);
    const valueKey = DIMENSION_TYPE_CONFIG[resolvedDimensionType].valueKey;
    for (const lines of state.journalLinesByEntryId.values()) {
      if (lines.some((line) => line.companyId === companyId && line.dimensionJson?.[valueKey] === code)) {
        return true;
      }
    }
    return false;
  }

  function resolveAccountingContext({ companyId, journalDate } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedJournalDate = normalizeDate(journalDate, "journal_date_required");
    const accountingMethodProfile = resolveActiveAccountingMethodProfile(resolvedCompanyId, resolvedJournalDate);
    const fiscalBinding = resolveFiscalBindingForDate(resolvedCompanyId, resolvedJournalDate);
    return {
      accountingMethodProfile,
      fiscalYear: fiscalBinding?.fiscalYear || null,
      fiscalPeriod: fiscalBinding?.fiscalPeriod || null,
      accountingPeriod: fiscalBinding?.accountingPeriod || resolveAccountingPeriod(resolvedCompanyId, resolvedJournalDate)
    };
  }

  function resolveActiveAccountingMethodProfile(companyId, journalDate) {
    if (!accountingMethodPlatform || typeof accountingMethodPlatform.getActiveMethodForDate !== "function") {
      return null;
    }
    return accountingMethodPlatform.getActiveMethodForDate({
      companyId,
      accountingDate: journalDate
    });
  }

  function resolveFiscalBindingForDate(companyId, journalDate) {
    if (!fiscalYearPlatform) {
      return null;
    }
    if (typeof fiscalYearPlatform.getActiveFiscalYearForDate !== "function" || typeof fiscalYearPlatform.getPeriodForDate !== "function") {
      return null;
    }
    const fiscalYear = fiscalYearPlatform.getActiveFiscalYearForDate({
      companyId,
      accountingDate: journalDate
    });
    const fiscalPeriod = fiscalYearPlatform.getPeriodForDate({
      companyId,
      accountingDate: journalDate
    });
    return {
      fiscalYear,
      fiscalPeriod,
      accountingPeriod: upsertAccountingPeriodFromFiscalPeriod({
        companyId,
        fiscalYear,
        fiscalPeriod
      })
    };
  }

  function synchronizeLedgerPeriodsForCompany(companyId) {
    if (!fiscalYearPlatform || typeof fiscalYearPlatform.listFiscalYears !== "function") {
      return;
    }
    const fiscalYears = fiscalYearPlatform.listFiscalYears({
      companyId
    });
    for (const fiscalYear of fiscalYears) {
      for (const fiscalPeriod of fiscalYear.periods || []) {
        upsertAccountingPeriodFromFiscalPeriod({
          companyId,
          fiscalYear,
          fiscalPeriod
        });
      }
    }
  }

  function findAccountingPeriodForDate(companyId, journalDate) {
    return [...state.accountingPeriods.values()].find(
      (candidate) => candidate.companyId === companyId && candidate.startsOn <= journalDate && candidate.endsOn >= journalDate
    );
  }

  function resolveAccountingPeriod(companyId, journalDate) {
    let accountingPeriod = findAccountingPeriodForDate(companyId, journalDate);
    if (!accountingPeriod) {
      const fiscalBinding = resolveFiscalBindingForDate(companyId, journalDate);
      accountingPeriod = fiscalBinding?.accountingPeriod || null;
    }
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "No accounting period covers the supplied journal date.");
    }
    return accountingPeriod;
  }

  function upsertAccountingPeriodFromFiscalPeriod({ companyId, fiscalYear, fiscalPeriod } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    const resolvedFiscalYearId = requireText(fiscalYear?.fiscalYearId, "fiscal_year_id_required");
    const resolvedFiscalPeriodId = requireText(fiscalPeriod?.periodId, "fiscal_period_id_required");
    const now = nowIso();
    const existing = [...state.accountingPeriods.values()].find(
      (candidate) =>
        candidate.companyId === resolvedCompanyId
        && (
          candidate.fiscalPeriodId === resolvedFiscalPeriodId
          || (candidate.startsOn === fiscalPeriod.startDate && candidate.endsOn === fiscalPeriod.endDate)
        )
    );
    if (existing) {
      existing.startsOn = fiscalPeriod.startDate;
      existing.endsOn = fiscalPeriod.endDate;
      existing.fiscalYearId = resolvedFiscalYearId;
      existing.fiscalPeriodId = resolvedFiscalPeriodId;
      existing.status = mergeAccountingPeriodStatus(existing.status, fiscalPeriod);
      existing.updatedAt = now;
      return existing;
    }

    const accountingPeriod = {
      accountingPeriodId: crypto.randomUUID(),
      companyId: resolvedCompanyId,
      startsOn: fiscalPeriod.startDate,
      endsOn: fiscalPeriod.endDate,
      fiscalYearId: resolvedFiscalYearId,
      fiscalPeriodId: resolvedFiscalPeriodId,
      status: mapLedgerStatusFromFiscalPeriod(fiscalPeriod),
      lockReasonCode: null,
      lockedByActorId: null,
      lockedAt: null,
      reopenedByActorId: null,
      reopenedAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);
    return accountingPeriod;
  }

  function mergeAccountingPeriodStatus(currentStatus, fiscalPeriod) {
    const fiscalStatus = mapLedgerStatusFromFiscalPeriod(fiscalPeriod);
    if (currentStatus === "hard_closed" || fiscalStatus === "hard_closed") {
      return "hard_closed";
    }
    if (currentStatus === "soft_locked" || fiscalStatus === "soft_locked") {
      return "soft_locked";
    }
    return "open";
  }

  function mapLedgerStatusFromFiscalPeriod(fiscalPeriod) {
    if (!fiscalPeriod) {
      return "open";
    }
    if (fiscalPeriod.closeState === "closed" || fiscalPeriod.lockState === "hard_locked") {
      return "hard_closed";
    }
    if (fiscalPeriod.lockState === "soft_locked") {
      return "soft_locked";
    }
    return "open";
  }

  function requireAccountingPeriod(accountingPeriodId) {
    const accountingPeriod = state.accountingPeriods.get(accountingPeriodId);
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "Accounting period was not found.");
    }
    return accountingPeriod;
  }

  function requireAccountingPeriodForCompany(companyId, accountingPeriodId) {
    const accountingPeriod = requireAccountingPeriod(requireText(accountingPeriodId, "accounting_period_id_required"));
    if (accountingPeriod.companyId !== companyId) {
      throw httpError(404, "accounting_period_not_found", "Accounting period was not found.");
    }
    return accountingPeriod;
  }

  function ensurePeriodAllowsEntryCreation(accountingPeriod, metadataJson) {
    if (accountingPeriod.status === "open") {
      return;
    }
    if (accountingPeriod.status === "soft_locked" && hasSoftLockOverride(metadataJson)) {
      return;
    }
    throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
  }

  function ensurePeriodAllowsEntryMutation(accountingPeriod, entry) {
    if (entry.status === "locked_by_period") {
      throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
    }
    ensurePeriodAllowsEntryCreation(accountingPeriod, entry.metadataJson);
  }

  function ensureDimensionCatalog(companyId) {
    if (!state.dimensionCatalogsByCompanyId.has(companyId)) {
      state.dimensionCatalogsByCompanyId.set(companyId, {
        companyId,
        catalogVersion: 1,
        projects: createCatalogEntries(DEMO_DIMENSION_CATALOG.projects, "projects"),
        costCenters: createCatalogEntries(DEMO_DIMENSION_CATALOG.costCenters, "costCenters"),
        businessAreas: createCatalogEntries(DEMO_DIMENSION_CATALOG.businessAreas, "businessAreas"),
        serviceLines: createCatalogEntries(DEMO_DIMENSION_CATALOG.serviceLines, "serviceLines"),
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    }
    return state.dimensionCatalogsByCompanyId.get(companyId);
  }

  function toggleEntriesForLockedPeriod({ accountingPeriodId, action }) {
    const now = nowIso();
    const affected = [];
    for (const entry of state.journalEntries.values()) {
      if (entry.accountingPeriodId !== accountingPeriodId) {
        continue;
      }
      if (action === "lock" && (entry.status === "draft" || entry.status === "validated")) {
        entry.metadataJson.lockedByPeriodPreviousState = entry.status;
        entry.status = "locked_by_period";
        entry.updatedAt = now;
        affected.push(entry);
      }
      if (action === "unlock" && entry.status === "locked_by_period") {
        const previousState = entry.metadataJson.lockedByPeriodPreviousState === "validated" ? "validated" : "draft";
        delete entry.metadataJson.lockedByPeriodPreviousState;
        entry.status = previousState;
        entry.updatedAt = now;
        affected.push(entry);
      }
    }
    return affected;
  }

  function resolveCorrectionTargetDate({ companyId, originalEntry, requestedJournalDate }) {
    const originalPeriod = requireAccountingPeriod(originalEntry.accountingPeriodId);
    if (requestedJournalDate) {
      const resolvedJournalDate = normalizeDate(requestedJournalDate, "journal_date_required");
      const targetPeriod = resolveAccountingPeriod(companyId, resolvedJournalDate);
      if (originalPeriod.status === "hard_closed" && targetPeriod.accountingPeriodId === originalPeriod.accountingPeriodId) {
        throw httpError(
          409,
          "period_hard_closed_requires_next_open_period",
          "Corrections for hard-closed periods must be posted in the next open period unless the period is reopened."
        );
      }
      return {
        journalDate: resolvedJournalDate,
        targetPeriod,
        originalPeriodUntouched: targetPeriod.accountingPeriodId !== originalPeriod.accountingPeriodId
      };
    }

    if (originalPeriod.status === "hard_closed") {
      const targetPeriod = findNextOpenAccountingPeriod(companyId, originalPeriod.endsOn);
      return {
        journalDate: targetPeriod.startsOn,
        targetPeriod,
        originalPeriodUntouched: true
      };
    }

    return {
      journalDate: originalEntry.journalDate,
      targetPeriod: originalPeriod,
      originalPeriodUntouched: false
    };
  }

  function findNextOpenAccountingPeriod(companyId, afterDate) {
    const candidate = [...state.accountingPeriods.values()]
      .filter((period) => period.companyId === companyId && period.status === "open" && period.startsOn > afterDate)
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn))[0];
    if (!candidate) {
      throw httpError(409, "next_open_period_not_found", "No next open accounting period was found for the correction.");
    }
    return candidate;
  }

  function requireJournalEntry(companyId, journalEntryId) {
    const entry = state.journalEntries.get(requireText(journalEntryId, "journal_entry_id_required"));
    if (!entry || entry.companyId !== companyId) {
      throw httpError(404, "journal_entry_not_found", "Journal entry was not found.");
    }
    return entry;
  }

  function requireJournalLines(journalEntryId) {
    const lines = state.journalLinesByEntryId.get(journalEntryId);
    if (!lines || lines.length === 0) {
      throw httpError(400, "journal_lines_missing", "Journal entry has no lines.");
    }
    return lines;
  }

  function validateLines(entry, lines) {
    if (lines.length < 2) {
      throw httpError(400, "journal_lines_invalid", "Journal entries require at least two lines.");
    }

    for (const line of lines) {
      const account = requireAccount(entry.companyId, line.accountNumber);
      if (!isPositiveMoney(line.debitAmount) && !isPositiveMoney(line.creditAmount)) {
        throw httpError(400, "journal_line_amount_required", "Each journal line requires a debit or credit amount.");
      }
      if (isPositiveMoney(line.debitAmount) && isPositiveMoney(line.creditAmount)) {
        throw httpError(400, "journal_line_single_sided_required", "Each journal line must be either debit or credit.");
      }
      if (line.currencyCode !== DEFAULT_LEDGER_CURRENCY && !(Number(line.exchangeRate) > 0)) {
        throw httpError(400, "journal_line_exchange_rate_required", "Foreign-currency lines require a positive exchange rate.");
      }
      ensureRequiredDimensions({
        account,
        catalog: ensureDimensionCatalog(entry.companyId),
        companyId: entry.companyId,
        accountNumber: line.accountNumber,
        dimensionJson: line.dimensionJson,
        sourceType: line.sourceType,
        metadataJson: entry.metadataJson
      });
    }

    const totals = calculateTotals(lines);
    if (totals.totalDebit <= 0 || totals.totalCredit <= 0 || totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "journal_entry_unbalanced", "Journal entry must balance debit and credit exactly.");
    }
    entry.totalDebit = totals.totalDebit;
    entry.totalCredit = totals.totalCredit;
  }

  function normalizeJournalLines({
    companyId,
    journalEntryId,
    actorId,
    sourceType,
    sourceId,
    entryCurrencyCode,
    metadataJson,
    dimensionCatalogVersion,
    lines
  }) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, "journal_lines_required", "Journal entry lines are required.");
    }

    const catalog = ensureDimensionCatalog(companyId);
    return lines.map((line, index) => {
      const account = requireAccount(companyId, line.accountNumber);
      const lineSourceType = line.sourceType ? assertPostingSourceType(line.sourceType) : sourceType;
      const debitAmount = normalizeMoney(line.debitAmount || 0);
      const creditAmount = normalizeMoney(line.creditAmount || 0);
      const currencyCode = normalizeCurrencyCode(line.currencyCode || entryCurrencyCode);
      const exchangeRate = line.exchangeRate == null ? null : normalizeRate(line.exchangeRate);
      if (currencyCode !== DEFAULT_LEDGER_CURRENCY && exchangeRate == null) {
        throw httpError(400, "journal_line_exchange_rate_required", "Foreign-currency lines require a positive exchange rate.");
      }
      const dimensionJson = normalizeDimensionJson({
        account,
        catalog,
        companyId,
        accountNumber: account.accountNumber,
        dimensionJson: line.dimensionJson || {},
        sourceType: lineSourceType,
        metadataJson
      });
      return {
        journalLineId: crypto.randomUUID(),
        journalEntryId,
        companyId,
        lineNumber: index + 1,
        accountId: account.accountId,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountVersion: account.governanceVersion || 1,
        debitAmount,
        creditAmount,
        currencyCode,
        exchangeRate,
        dimensionJson,
        dimensionCatalogVersion: dimensionCatalogVersion || 1,
        sourceType: lineSourceType,
        sourceId: requireText(line.sourceId || sourceId, "line_source_id_required"),
        actorId,
        createdAt: nowIso()
      };
    });
  }

  function requireAccount(companyId, accountNumber) {
    const key = toCompanyScopedKey(companyId, requireText(accountNumber, "account_number_required"));
    const accountId = state.accountIdsByCompanyNumber.get(key);
    if (!accountId) {
      throw httpError(404, "account_not_found", `Account ${accountNumber} was not found for the company.`);
    }
    const account = state.accounts.get(accountId);
    if (!account || account.status !== "active") {
      throw httpError(409, "ledger_account_not_active", `Ledger account ${accountNumber} is not active for new postings.`);
    }
    return account;
  }

  function presentJournalEntry(entry) {
    const lines = (state.journalLinesByEntryId.get(entry.journalEntryId) || []).map(copy);
    return copy({
      ...entry,
      fiscalYearId: entry.fiscalYearId || null,
      fiscalPeriodId: entry.fiscalPeriodId || null,
      accountingMethodProfileId: entry.accountingMethodProfileId || null,
      lines
    });
  }

  function pushAudit(event) {
    state.auditEvents.push(
      createAuditEnvelopeFromLegacyEvent({
        clock,
        auditClass: "ledger_action",
        event
      })
    );
  }

  function nowIso() {
    return new Date(clock()).toISOString();
  }
}

function seedDemoState(state, clock) {
  const now = new Date(clock()).toISOString();
  for (let month = 0; month < 12; month += 1) {
    const startsOn = new Date(Date.UTC(2026, month, 1)).toISOString().slice(0, 10);
    const endsOn = new Date(Date.UTC(2026, month + 1, 0)).toISOString().slice(0, 10);
    const accountingPeriod = {
      accountingPeriodId: crypto.randomUUID(),
      companyId: DEMO_LEDGER_COMPANY_ID,
      startsOn,
      endsOn,
      fiscalYearId: null,
      fiscalPeriodId: null,
      status: "open",
      lockReasonCode: null,
      lockedByActorId: null,
      lockedAt: null,
      reopenedByActorId: null,
      reopenedAt: null,
      createdAt: now,
      updatedAt: now
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);
  }
  state.dimensionCatalogsByCompanyId.set(DEMO_LEDGER_COMPANY_ID, {
    companyId: DEMO_LEDGER_COMPANY_ID,
    catalogVersion: 1,
    projects: createCatalogEntries(DEMO_DIMENSION_CATALOG.projects, "projects"),
    costCenters: createCatalogEntries(DEMO_DIMENSION_CATALOG.costCenters, "costCenters"),
    businessAreas: createCatalogEntries(DEMO_DIMENSION_CATALOG.businessAreas, "businessAreas"),
    serviceLines: createCatalogEntries(DEMO_DIMENSION_CATALOG.serviceLines, "serviceLines"),
    createdAt: now,
    updatedAt: now
  });
}

function defaultSeriesDescription(seriesCode) {
  const knownDescriptions = {
    A: "Manual journals",
    B: "Customer invoices",
    C: "Customer credit notes",
    D: "Customer payments and allocations",
    E: "Supplier invoices",
    H: "Payroll",
    I: "VAT",
    V: "Automated corrections and reversals",
    W: "Historical imports",
    X: "Audit and revision adjustments",
    Y: "Technical migration reserve",
    Z: "Blocked reserve series"
  };
  return knownDescriptions[seriesCode] || `Voucher series ${seriesCode}`;
}

function defaultSeriesPurposeCodes(seriesCode) {
  return copy(DEFAULT_VOUCHER_SERIES_PURPOSE_MAP[seriesCode] || []);
}

function requirePostingRecipe(recipeCode) {
  const resolvedRecipeCode = requireText(recipeCode, "posting_recipe_code_required").toUpperCase();
  const recipe = POSTING_RECIPES_BY_CODE.get(resolvedRecipeCode);
  if (!recipe) {
    throw httpError(404, "posting_recipe_not_found", `Posting recipe ${resolvedRecipeCode} is not configured.`);
  }
  return recipe;
}

function createCatalogEntries(values = [], dimensionType) {
  return values.map((value) => ({
    dimensionValueId: crypto.randomUUID(),
    code: value.code,
    label: value.label,
    status: value.status || "active",
    locked: true,
    sourceDomain: "ledger_seed",
    version: 1,
    changeReasonCode: "catalog_seed",
    dimensionType,
    createdAt: null,
    updatedAt: null
  }));
}

function assertPostingSourceType(sourceType) {
  const resolvedSourceType = requireText(sourceType, "source_type_required");
  if (!POSTING_SOURCE_TYPES.includes(resolvedSourceType)) {
    throw httpError(400, "posting_source_type_invalid", `Unsupported posting source type ${resolvedSourceType}.`);
  }
  return resolvedSourceType;
}

function normalizeDate(value, code) {
  const input = requireText(value, code);
  const normalized = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(normalized.getTime())) {
    throw httpError(400, code, "Date is invalid.");
  }
  return normalized.toISOString().slice(0, 10);
}

function normalizeSeriesCode(value, code) {
  const normalized = requireText(value, code).toUpperCase();
  if (!/^[A-Z0-9_-]{1,20}$/.test(normalized)) {
    throw httpError(400, code, "Series code must be 1-20 characters using A-Z, 0-9, underscore or hyphen.");
  }
  return normalized;
}

function normalizeVoucherSeriesDescription(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw httpError(400, "voucher_series_description_required", "Voucher series description is required.");
  }
  return normalized;
}

function normalizeVoucherSeriesStatus(value) {
  const normalized = requireText(value, "voucher_series_status_required");
  if (!VOUCHER_SERIES_STATUSES.includes(normalized)) {
    throw httpError(400, "voucher_series_status_invalid", `Unsupported voucher series status ${normalized}.`);
  }
  return normalized;
}

function normalizeVoucherSeriesPurposeCode(value, code = "voucher_series_purpose_code_required") {
  const normalized = requireText(value, code).toUpperCase();
  if (!/^[A-Z0-9_:-]{2,64}$/.test(normalized)) {
    throw httpError(400, code, "Voucher series purpose code format is invalid.");
  }
  return normalized;
}

function normalizeVoucherSeriesPurposeCodes(values) {
  if (!Array.isArray(values)) {
    throw httpError(400, "voucher_series_purpose_codes_invalid", "Voucher series purpose codes must be an array.");
  }
  return [...new Set(values.map((value) => normalizeVoucherSeriesPurposeCode(value)))].sort();
}

function normalizeAccountNumber(value) {
  const normalized = requireText(value, "account_number_required");
  if (!/^[1-8][0-9]{3}$/.test(normalized)) {
    throw httpError(400, "account_number_invalid", "Ledger account numbers must be four digits in BAS-style range 1000-8999.");
  }
  return normalized;
}

function normalizeAccountClass(value) {
  const normalized = requireText(value, "account_class_required");
  if (!/^[1-8]$/.test(normalized)) {
    throw httpError(400, "account_class_invalid", "Ledger account class must be a single digit between 1 and 8.");
  }
  return normalized;
}

function deriveTemplateAccountClass(accountNumber, fallbackAccountClass) {
  const normalizedAccountNumber = normalizeAccountNumber(accountNumber);
  const derivedAccountClass = normalizedAccountNumber.charAt(0);
  if (/^[1-8]$/.test(derivedAccountClass)) {
    return derivedAccountClass;
  }
  return normalizeAccountClass(fallbackAccountClass);
}

function normalizeLedgerAccountStatus(value) {
  const normalized = requireText(value, "ledger_account_status_required");
  if (!LEDGER_ACCOUNT_STATUSES.includes(normalized)) {
    throw httpError(400, "ledger_account_status_invalid", `Unsupported ledger account status ${normalized}.`);
  }
  return normalized;
}

function normalizeDimensionValueStatus(value) {
  const normalized = requireText(value, "dimension_value_status_required");
  if (!DIMENSION_VALUE_STATUSES.includes(normalized)) {
    throw httpError(400, "dimension_value_status_invalid", `Unsupported dimension value status ${normalized}.`);
  }
  return normalized;
}

function normalizeLedgerLabel(value, code) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw httpError(400, code, `${code} is required.`);
  }
  return normalized;
}

function normalizeRequiredDimensionKeys(values) {
  if (!Array.isArray(values)) {
    throw httpError(400, "required_dimension_keys_invalid", "Required dimension keys must be an array.");
  }
  return [...new Set(values.map((value) => {
    const normalized = requireText(value, "dimension_key_required");
    if (!DIMENSION_KEYS.includes(normalized)) {
      throw httpError(400, "dimension_key_invalid", `Unsupported ledger dimension ${normalized}.`);
    }
    return normalized;
  }))].sort();
}

function normalizeDimensionType(value) {
  const normalized = requireText(value, "dimension_type_required");
  if (!DIMENSION_TYPES.includes(normalized)) {
    throw httpError(400, "dimension_type_invalid", `Unsupported ledger dimension type ${normalized}.`);
  }
  return normalized;
}

function normalizeDimensionValueCode(value, dimensionType) {
  const resolvedDimensionType = normalizeDimensionType(dimensionType);
  const rawValue = requireText(value, "dimension_value_code_required");
  const normalized = resolvedDimensionType === "projects" ? rawValue : rawValue.toUpperCase();
  const prefix = DIMENSION_TYPE_CONFIG[resolvedDimensionType].codePrefix;
  if (!new RegExp(`^${prefix}-[A-Z0-9_-]{2,32}$`).test(normalized) && resolvedDimensionType !== "projects") {
    throw httpError(400, "dimension_value_code_invalid", `Dimension values for ${resolvedDimensionType} must use ${prefix}-prefixed codes.`);
  }
  if (resolvedDimensionType === "projects" && !/^[a-z0-9_-]{3,64}$/i.test(normalized)) {
    throw httpError(400, "dimension_value_code_invalid", "Project dimension codes must be 3-64 characters.");
  }
  return normalized;
}

function normalizePositiveInteger(value, code) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw httpError(400, code, "Value must be a positive integer.");
  }
  return number;
}

function normalizeCurrencyCode(value) {
  const code = requireText(value, "currency_code_required").toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw httpError(400, "currency_code_invalid", "Currency code must be a three-letter ISO-style code.");
  }
  return code;
}

function normalizeMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw httpError(400, "money_invalid", "Amounts must be numeric and non-negative.");
  }
  return Number(number.toFixed(2));
}

function normalizeRate(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw httpError(400, "exchange_rate_invalid", "Exchange rate must be a positive number.");
  }
  return Number(number.toFixed(8));
}

function calculateTotals(lines) {
  return {
    totalDebit: Number(lines.reduce((sum, line) => sum + Number(line.debitAmount), 0).toFixed(2)),
    totalCredit: Number(lines.reduce((sum, line) => sum + Number(line.creditAmount), 0).toFixed(2))
  };
}

function normalizeMetadata(metadataJson, importedFlag) {
  const normalized = copy(metadataJson || {});
  normalized.rulepackRefs = normalizeJournalRulepackRefs(normalized.rulepackRefs);
  normalized.providerBaselineRefs = normalizeJournalProviderBaselineRefs(normalized.providerBaselineRefs);
  normalized.decisionSnapshotRefs = normalizeJournalDecisionSnapshotRefs(normalized.decisionSnapshotRefs);
  if (importedFlag && !normalized.importSourceType) {
    normalized.importSourceType = "historical_import";
  }
  if (!normalized.pipelineStage) {
    normalized.pipelineStage = "ledger_posting";
  }
  return normalized;
}

function mergeJournalPinningMetadata(originalMetadata = {}, overrideMetadata = {}) {
  const original = normalizeMetadata(originalMetadata, false);
  const override = normalizeMetadata(overrideMetadata, false);
  return {
    ...original,
    ...override,
    rulepackRefs: mergeUniqueRefs(original.rulepackRefs, override.rulepackRefs, (candidate) => `${candidate.rulepackCode}:${candidate.rulepackVersion}`),
    providerBaselineRefs: mergeUniqueRefs(
      original.providerBaselineRefs,
      override.providerBaselineRefs,
      (candidate) => `${candidate.providerBaselineId || ""}:${candidate.baselineCode || ""}:${candidate.providerBaselineVersion || ""}`
    ),
    decisionSnapshotRefs: mergeUniqueRefs(original.decisionSnapshotRefs, override.decisionSnapshotRefs, (candidate) => candidate.decisionSnapshotId)
  };
}

function normalizeJournalRulepackRefs(values = []) {
  return mergeUniqueRefs([], values, (candidate) => `${candidate.rulepackCode}:${candidate.rulepackVersion}`, (candidate) => ({
    rulepackId: normalizeOptionalText(candidate.rulepackId),
    rulepackCode: requireText(candidate.rulepackCode, "ledger_rulepack_code_required"),
    rulepackVersion: requireText(candidate.rulepackVersion, "ledger_rulepack_version_required"),
    rulepackChecksum: normalizeOptionalText(candidate.rulepackChecksum),
    effectiveDate: normalizeOptionalText(candidate.effectiveDate)
  }));
}

function normalizeJournalProviderBaselineRefs(values = []) {
  return mergeUniqueRefs(
    [],
    values,
    (candidate) => `${candidate.providerBaselineId || ""}:${candidate.baselineCode || candidate.providerBaselineCode}:${candidate.providerBaselineVersion || ""}`,
    (candidate) => ({
      providerBaselineId: normalizeOptionalText(candidate.providerBaselineId),
      providerCode: normalizeOptionalText(candidate.providerCode),
      baselineCode: requireText(candidate.baselineCode || candidate.providerBaselineCode, "ledger_provider_baseline_code_required"),
      providerBaselineVersion: requireText(candidate.providerBaselineVersion, "ledger_provider_baseline_version_required"),
      providerBaselineChecksum: normalizeOptionalText(candidate.providerBaselineChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate)
    })
  );
}

function normalizeJournalDecisionSnapshotRefs(values = []) {
  return mergeUniqueRefs(
    [],
    values,
    (candidate) => normalizeOptionalText(candidate.decisionSnapshotId) || hashPayload(candidate),
    (candidate) => ({
      decisionSnapshotId: normalizeOptionalText(candidate.decisionSnapshotId) || hashPayload(candidate),
      snapshotTypeCode: requireText(candidate.snapshotTypeCode, "ledger_decision_snapshot_type_required"),
      sourceDomain: normalizeOptionalText(candidate.sourceDomain),
      sourceObjectId: normalizeOptionalText(candidate.sourceObjectId),
      sourceObjectVersion: normalizeOptionalText(candidate.sourceObjectVersion),
      employeeId: normalizeOptionalText(candidate.employeeId),
      employmentId: normalizeOptionalText(candidate.employmentId),
      decisionHash: normalizeOptionalText(candidate.decisionHash),
      rulepackId: normalizeOptionalText(candidate.rulepackId),
      rulepackCode: normalizeOptionalText(candidate.rulepackCode),
      rulepackVersion: normalizeOptionalText(candidate.rulepackVersion),
      rulepackChecksum: normalizeOptionalText(candidate.rulepackChecksum),
      effectiveDate: normalizeOptionalText(candidate.effectiveDate)
    })
  );
}

function mergeUniqueRefs(baseValues = [], overrideValues = [], keyResolver, mapper = (value) => copy(value)) {
  const refs = [];
  const seen = new Set();
  for (const candidate of [...(Array.isArray(baseValues) ? baseValues : []), ...(Array.isArray(overrideValues) ? overrideValues : [])]) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const mapped = mapper(candidate);
    const key = keyResolver(mapped);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push(mapped);
  }
  return refs;
}

function normalizeOptionalText(value) {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDimensionJson({ account, catalog, companyId, accountNumber, dimensionJson, sourceType, metadataJson }) {
  if (!dimensionJson || typeof dimensionJson !== "object" || Array.isArray(dimensionJson)) {
    throw httpError(400, "dimension_json_invalid", "Dimension data must be an object.");
  }

  const normalized = {};
  for (const key of Object.keys(dimensionJson)) {
    if (!DIMENSION_KEYS.includes(key)) {
      throw httpError(400, "dimension_key_invalid", `Unsupported ledger dimension ${key}.`);
    }
    const value = dimensionJson[key];
    if (value == null || String(value).trim().length === 0) {
      continue;
    }
    normalized[key] = String(value).trim();
  }

  ensureRequiredDimensions({
    account,
    catalog,
    companyId,
    accountNumber,
    dimensionJson: normalized,
    sourceType,
    metadataJson
  });
  return normalized;
}

function ensureRequiredDimensions({ account, catalog, companyId, accountNumber, dimensionJson, sourceType, metadataJson }) {
  if (dimensionJson.projectId) {
    requireDimensionValue(catalog.projects, "projectId", dimensionJson.projectId);
  }
  if (dimensionJson.costCenterCode) {
    requireDimensionValue(catalog.costCenters, "costCenterCode", dimensionJson.costCenterCode);
  }
  if (dimensionJson.businessAreaCode) {
    requireDimensionValue(catalog.businessAreas, "businessAreaCode", dimensionJson.businessAreaCode);
  }
  if (dimensionJson.serviceLineCode) {
    requireDimensionValue(catalog.serviceLines, "serviceLineCode", dimensionJson.serviceLineCode);
  }

  if (requiresProjectDimension({ accountNumber, sourceType, metadataJson }) && !dimensionJson.projectId) {
    throw httpError(400, "project_dimension_required", "Project-cost postings require a project dimension.");
  }

  for (const requiredDimensionKey of account?.requiredDimensionKeys || []) {
    if (!dimensionJson[requiredDimensionKey]) {
      throw httpError(
        400,
        "required_dimension_missing",
        `Ledger account ${account.accountNumber} requires dimension ${requiredDimensionKey} for new postings.`
      );
    }
  }
}

function requireDimensionValue(values, dimensionKey, code) {
  const value = values.find((candidate) => candidate.code === code);
  if (!value || value.status !== "active") {
    throw httpError(400, "dimension_value_not_found", `Dimension ${dimensionKey} value ${code} is not active for the company.`);
  }
}

function requiresProjectDimension({ accountNumber, sourceType, metadataJson }) {
  const dimensionRequiredByContext =
    sourceType === "PROJECT_WIP" || (metadataJson && metadataJson.dimensionRequirementCode === "project_cost");
  if (!dimensionRequiredByContext) {
    return false;
  }
  const normalizedAccountNumber = String(accountNumber || "");
  return /^[4-8]/.test(normalizedAccountNumber);
}

function reverseLines(lines) {
  return lines.map((line) => ({
    accountNumber: line.accountNumber,
    debitAmount: line.creditAmount,
    creditAmount: line.debitAmount,
    currencyCode: line.currencyCode,
    exchangeRate: line.exchangeRate,
    dimensionJson: copy(line.dimensionJson),
    sourceType: "MANUAL_JOURNAL",
    sourceId: line.sourceId
  }));
}

function hasSoftLockOverride(metadataJson) {
  return Boolean(
    metadataJson &&
      typeof metadataJson === "object" &&
      metadataJson.periodLockOverrideApprovedByActorId &&
      metadataJson.periodLockOverrideReasonCode
  );
}

function assertLockStatus(status) {
  const resolvedStatus = requireText(status, "accounting_period_status_required");
  if (!LOCKED_PERIOD_STATUSES.includes(resolvedStatus)) {
    throw httpError(400, "accounting_period_status_invalid", `Unsupported accounting period lock status ${resolvedStatus}.`);
  }
  return resolvedStatus;
}

function assertSeniorFinanceApproval({ actorId, approvedByActorId, approvedByRoleCode }) {
  const resolvedApprovedByActorId = requireText(approvedByActorId, "approved_by_actor_id_required");
  if (resolvedApprovedByActorId === actorId) {
    throw httpError(400, "dual_control_required", "Requester and approver must be different actors.");
  }
  const resolvedRoleCode = requireText(approvedByRoleCode, "approved_by_role_code_required").toLowerCase();
  if (!["close_signatory", "finance_manager", "company_admin"].includes(resolvedRoleCode)) {
    throw httpError(400, "senior_finance_role_required", "A senior finance approver is required for this operation.");
  }
}

function assertCorrectionType(correctionType) {
  const resolvedCorrectionType = requireText(correctionType, "correction_type_required");
  if (!["delta", "full_reversal", "reversal_and_rebook"].includes(resolvedCorrectionType)) {
    throw httpError(400, "correction_type_invalid", `Unsupported correction type ${resolvedCorrectionType}.`);
  }
  return resolvedCorrectionType;
}

function toCompanyScopedKey(companyId, value) {
  return `${companyId}:${value}`;
}

function requireText(value, code) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw httpError(400, code, `${code} is required.`);
  }
  return value.trim();
}

function isPositiveMoney(value) {
  return Number(value) > 0;
}

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

