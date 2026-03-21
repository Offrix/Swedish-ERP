import crypto from "node:crypto";

export const LEDGER_STATES = Object.freeze(["draft", "validated", "posted", "reversed", "locked_by_period"]);
export const DEFAULT_LEDGER_CURRENCY = "SEK";
export const DEFAULT_CHART_TEMPLATE_ID = "DSAM-2026";
export const DEFAULT_VOUCHER_SERIES_CODES = Object.freeze("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
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

export const REQUIRED_ENGINE_ACCOUNTS = Object.freeze({
  customerInvoices: Object.freeze(["1210", "2610", "2620", "2630", "3010-3490", "2650"]),
  supplierInvoices: Object.freeze(["2410", "2640", "4010-6990", "2650"]),
  payroll: Object.freeze(["7010-7390", "2710", "2730", "2740", "7110-7160"]),
  pension: Object.freeze(["7130-7160", "2740", "2760"]),
  travel: Object.freeze(["5330_or_7310"]),
  rotRut: Object.freeze(["3070", "3080", "2560"]),
  projectCost: Object.freeze(["project_dimension_required"]),
  bank: Object.freeze(["1110", "1170", "1180", "1190"]),
  tax: Object.freeze(["1120", "2570", "2510-2590"])
});

export const DSAM_ACCOUNTS = Object.freeze([
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

const DEMO_LEDGER_COMPANY_ID = "00000000-0000-4000-8000-000000000001";

export function createLedgerPlatform(options = {}) {
  return createLedgerEngine(options);
}

export function createLedgerEngine({ clock = () => new Date(), seedDemo = true } = {}) {
  const state = {
    accounts: new Map(),
    accountIdsByCompanyNumber: new Map(),
    voucherSeries: new Map(),
    voucherSeriesIdsByCompanyCode: new Map(),
    accountingPeriods: new Map(),
    journalEntries: new Map(),
    journalLinesByEntryId: new Map(),
    idempotencyKeys: new Map(),
    auditEvents: []
  };

  if (seedDemo) {
    seedDemoState(state, clock);
  }

  return {
    ledgerStates: LEDGER_STATES,
    postingSourceTypes: POSTING_SOURCE_TYPES,
    defaultChartTemplateId: DEFAULT_CHART_TEMPLATE_ID,
    installLedgerCatalog,
    listLedgerAccounts,
    listVoucherSeries,
    createJournalEntry,
    validateJournalEntry,
    postJournalEntry,
    getJournalEntry,
    snapshotLedger
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
        metadataJson: {
          chartTemplateId,
          seedSource: "accounting_foundation_24_2"
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
        createdAt: now,
        updatedAt: now
      };
      state.voucherSeries.set(voucherSeries.voucherSeriesId, voucherSeries);
      state.voucherSeriesIdsByCompanyCode.set(key, voucherSeries.voucherSeriesId);
      installedVoucherSeries += 1;
    }

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

  function listVoucherSeries({ companyId } = {}) {
    const resolvedCompanyId = requireText(companyId, "company_id_required");
    return [...state.voucherSeries.values()]
      .filter((voucherSeries) => voucherSeries.companyId === resolvedCompanyId)
      .sort((left, right) => left.seriesCode.localeCompare(right.seriesCode))
      .map(copy);
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
    const accountingPeriod = resolveAccountingPeriod(resolvedCompanyId, resolvedJournalDate);
    ensurePeriodOpen(accountingPeriod);

    const journalEntryId = crypto.randomUUID();
    const draftLines = normalizeJournalLines({
      companyId: resolvedCompanyId,
      journalEntryId,
      actorId: resolvedActorId,
      sourceType: resolvedSourceType,
      sourceId: resolvedSourceId,
      entryCurrencyCode: normalizeCurrencyCode(currencyCode),
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
      accountingPeriodId: accountingPeriod.accountingPeriodId,
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
      metadataJson: normalizeMetadata(metadataJson, importedFlag),
      createdAt: now,
      updatedAt: now,
      validatedAt: null,
      postedAt: null,
      reversalOfJournalEntryId: null,
      reversedByJournalEntryId: null,
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
    ensurePeriodOpen(accountingPeriod);
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
    ensurePeriodOpen(accountingPeriod);
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

  function getJournalEntry({ companyId, journalEntryId } = {}) {
    return presentJournalEntry(requireJournalEntry(requireText(companyId, "company_id_required"), journalEntryId));
  }

  function snapshotLedger() {
    return copy({
      accounts: [...state.accounts.values()],
      voucherSeries: [...state.voucherSeries.values()],
      accountingPeriods: [...state.accountingPeriods.values()],
      journalEntries: [...state.journalEntries.values()].map((entry) => presentJournalEntry(entry)),
      auditEvents: state.auditEvents
    });
  }

  function requireVoucherSeries(companyId, seriesCode) {
    const normalizedCode = requireText(seriesCode, "voucher_series_code_required").toUpperCase();
    const key = toCompanyScopedKey(companyId, normalizedCode);
    const voucherSeriesId = state.voucherSeriesIdsByCompanyCode.get(key);
    if (!voucherSeriesId) {
      throw httpError(404, "voucher_series_not_found", `Voucher series ${normalizedCode} was not found for the company.`);
    }
    return state.voucherSeries.get(voucherSeriesId);
  }

  function resolveAccountingPeriod(companyId, journalDate) {
    const accountingPeriod = [...state.accountingPeriods.values()].find(
      (candidate) => candidate.companyId === companyId && candidate.startsOn <= journalDate && candidate.endsOn >= journalDate
    );
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "No accounting period covers the supplied journal date.");
    }
    return accountingPeriod;
  }

  function requireAccountingPeriod(accountingPeriodId) {
    const accountingPeriod = state.accountingPeriods.get(accountingPeriodId);
    if (!accountingPeriod) {
      throw httpError(404, "accounting_period_not_found", "Accounting period was not found.");
    }
    return accountingPeriod;
  }

  function ensurePeriodOpen(accountingPeriod) {
    if (accountingPeriod.status !== "open") {
      throw httpError(409, "period_locked", "Journal entry belongs to a locked accounting period.");
    }
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
      requireAccount(entry.companyId, line.accountNumber);
      if (!isPositiveMoney(line.debitAmount) && !isPositiveMoney(line.creditAmount)) {
        throw httpError(400, "journal_line_amount_required", "Each journal line requires a debit or credit amount.");
      }
      if (isPositiveMoney(line.debitAmount) && isPositiveMoney(line.creditAmount)) {
        throw httpError(400, "journal_line_single_sided_required", "Each journal line must be either debit or credit.");
      }
      if (line.currencyCode !== DEFAULT_LEDGER_CURRENCY && !(Number(line.exchangeRate) > 0)) {
        throw httpError(400, "journal_line_exchange_rate_required", "Foreign-currency lines require a positive exchange rate.");
      }
    }

    const totals = calculateTotals(lines);
    if (totals.totalDebit <= 0 || totals.totalCredit <= 0 || totals.totalDebit !== totals.totalCredit) {
      throw httpError(400, "journal_entry_unbalanced", "Journal entry must balance debit and credit exactly.");
    }
    entry.totalDebit = totals.totalDebit;
    entry.totalCredit = totals.totalCredit;
  }

  function normalizeJournalLines({ companyId, journalEntryId, actorId, sourceType, sourceId, entryCurrencyCode, lines }) {
    if (!Array.isArray(lines) || lines.length === 0) {
      throw httpError(400, "journal_lines_required", "Journal entry lines are required.");
    }

    return lines.map((line, index) => {
      const account = requireAccount(companyId, line.accountNumber);
      const debitAmount = normalizeMoney(line.debitAmount || 0);
      const creditAmount = normalizeMoney(line.creditAmount || 0);
      const currencyCode = normalizeCurrencyCode(line.currencyCode || entryCurrencyCode);
      const exchangeRate = line.exchangeRate == null ? null : normalizeRate(line.exchangeRate);
      if (currencyCode !== DEFAULT_LEDGER_CURRENCY && exchangeRate == null) {
        throw httpError(400, "journal_line_exchange_rate_required", "Foreign-currency lines require a positive exchange rate.");
      }
      return {
        journalLineId: crypto.randomUUID(),
        journalEntryId,
        companyId,
        lineNumber: index + 1,
        accountId: account.accountId,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        debitAmount,
        creditAmount,
        currencyCode,
        exchangeRate,
        dimensionJson: copy(line.dimensionJson || {}),
        sourceType: line.sourceType ? assertPostingSourceType(line.sourceType) : sourceType,
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
    return state.accounts.get(accountId);
  }

  function presentJournalEntry(entry) {
    const lines = (state.journalLinesByEntryId.get(entry.journalEntryId) || []).map(copy);
    return copy({
      ...entry,
      lines
    });
  }

  function pushAudit({ companyId, actorId, correlationId, action, entityType, entityId, explanation }) {
    state.auditEvents.push({
      auditEventId: crypto.randomUUID(),
      companyId,
      actorId,
      correlationId,
      action,
      result: "success",
      entityType,
      entityId,
      explanation,
      recordedAt: nowIso()
    });
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
      status: "open",
      createdAt: now,
      updatedAt: now
    };
    state.accountingPeriods.set(accountingPeriod.accountingPeriodId, accountingPeriod);
  }
}

function defaultSeriesDescription(seriesCode) {
  const knownDescriptions = {
    A: "Manual journals",
    B: "Customer invoices",
    E: "Supplier invoices",
    H: "Payroll",
    I: "VAT"
  };
  return knownDescriptions[seriesCode] || `Voucher series ${seriesCode}`;
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
  if (importedFlag && !normalized.importSourceType) {
    normalized.importSourceType = "historical_import";
  }
  if (!normalized.pipelineStage) {
    normalized.pipelineStage = "ledger_posting";
  }
  return normalized;
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

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}
