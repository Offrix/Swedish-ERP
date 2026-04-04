import csv
import re
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(r"C:\Users\snobb\Desktop\Swedish ERP\docs\implementation-control\domankarta-rebuild")
XLSX_PATH = ROOT / "sources" / "BAS_kontoplan_2026.xlsx"
OUT_PATH = ROOT / "BAS_KONTOPLAN_2026_STODFRASER_OCH_SOKINTENTIONER.tsv"

STOP = {
    "och",
    "for",
    "med",
    "utan",
    "mot",
    "samt",
    "m",
    "mm",
    "ej",
    "i",
    "pa",
    "av",
    "till",
    "vid",
    "de",
    "det",
    "den",
    "ett",
    "en",
    "ovriga",
    "ovrigt",
    "annat",
    "andra",
    "respektive",
    "inkl",
    "mfl",
    "ftgsledare",
    "gruppkonto",
}

CLASS_HINTS = {
    "1": ["balans", "tillgangskonto"],
    "2": ["balans", "skuld eller eget kapital"],
    "3": ["intakt", "forsaljning eller rorelseintakt"],
    "4": ["inkop eller varukostnad"],
    "5": ["extern kostnad"],
    "6": ["extern kostnad"],
    "7": ["personalkostnad eller lonekoppling"],
    "8": ["finansiell post eller bokslutsdisposition eller skatt"],
}

NAME_PACKS = [
    (re.compile(r"kundfordringar"), ["obetald kundfaktura", "oppen kundreskontra", "kund ska betala"]),
    (re.compile(r"leverantorsskulder"), ["obetald leverantorsfaktura", "skuld till leverantor", "faktura att betala"]),
    (re.compile(r"kontraktsfordringar"), ["upparbetad ej fakturerad intakt", "kontraktsfordran", "upparbetat arbete att fakturera"]),
    (re.compile(r"bankmedel|bankkonto|bank"), ["bankkonto foretaget", "pengar pa banken", "likvida medel bank"]),
    (re.compile(r"skattekonto"), ["skattekonto skatteverket", "konto hos skatteverket", "skattekonto clearing"]),
    (re.compile(r"utgaende moms"), ["moms att redovisa", "sales vat", "utgaende vat"]),
    (re.compile(r"ingaende moms"), ["avdragsgill moms", "input vat", "ingaende vat"]),
    (re.compile(r"programvaror|programvara"), ["inkopt programvara", "kop mjukvara", "installerad programvara"]),
    (re.compile(r"kontorsmateriel|kontorsmaterial"), ["papper och pennor", "toner och kuvert", "kontorsmaterial", "kopieringspapper"]),
    (re.compile(r"forbrukningsmaterial"), ["kaffe till kontoret", "te till kontoret", "mjolk till fikarum", "engangsartiklar kontor"]),
    (re.compile(r"arbetsklader"), ["varselklader", "skyddsklader", "skyddsskor", "arbetsjacka"]),
    (re.compile(r"telekommunikation"), ["telefonabonnemang", "telefonkostnad", "foretagstelefoni"]),
    (re.compile(r"mobiltelefon"), ["mobilabonnemang", "mobiltelefonkostnad", "foretagstelefon"]),
    (re.compile(r"datakommunikation"), ["bredband", "internetabonnemang", "fiber till kontoret", "uppkoppling kontor"]),
    (re.compile(r"porto"), ["frimarken", "brevporto", "paketporto"]),
    (re.compile(r"foretagsforsakringar"), ["foretagsforsakring", "ansvarsforsakring", "egendomsforsakring"]),
    (re.compile(r"tidningar|facklitteratur"), ["branschtidning", "fackbok", "yrkeslitteratur"]),
    (re.compile(r"foreningsavgifter"), ["medlemsavgift", "foreningsavgift", "branschforening"]),
    (re.compile(r"utlandsk moms"), ["vat utomlands", "foreign vat", "utlandsk vat"]),
    (re.compile(r"lokalhyra"), ["hyra kontor", "hyra lokal", "hyresfaktura lokal"]),
    (re.compile(r"(^| )el($| )|el for drift"), ["elrakning", "stromfaktura", "elkostnad"]),
    (re.compile(r"varme|uppvarmning|fjarrvarme"), ["varmerakning", "uppvarmningskostnad", "fjarrvarme"]),
    (re.compile(r"vatten och avlopp|vatten for drift"), ["vattenfaktura", "avloppsavgift", "va avgift"]),
    (re.compile(r"stadning"), ["lokalstadning", "kontorsstadning", "stadbolag"]),
    (re.compile(r"reparation och underhall"), ["servicekostnad", "reparationskostnad", "underhallsarbete"]),
    (re.compile(r"frakter och transporter"), ["fraktkostnad", "transportkostnad", "leveransfrakt"]),
    (re.compile(r"tull"), ["tullavgift", "importtull"]),
    (re.compile(r"biljetter"), ["tagbiljett", "flygbiljett", "resbiljett"]),
    (re.compile(r"hyrbilskostnader"), ["hyrbil tjansteresa", "hyrbil i arbetet"]),
    (re.compile(r"kost och logi"), ["hotell", "overnattning", "logi", "frukost pa hotell"]),
    (re.compile(r"annonsering"), ["annonser", "annonskostnad", "platsannons"]),
    (re.compile(r"internetreklam|tv och internetreklam|film radio tv och internetreklam"), ["google ads", "facebook ads", "meta ads", "linkedin ads"]),
    (re.compile(r"reklamtrycksaker"), ["broschyrer", "flyers", "tryckt reklam"]),
    (re.compile(r"varuprover|reklamgavor|presentreklam"), ["giveaway", "profilprodukt", "reklamgava"]),
    (re.compile(r"sponsring"), ["sponsoravtal", "sponsring", "sponsorpaket"]),
    (re.compile(r"ersattningar till revisor|revision"), ["revisor", "arsrevision", "revisionsarvode"]),
    (re.compile(r"skatteradgivning"), ["skatteradgivning", "tax advice"]),
    (re.compile(r"arsredovisning"), ["arsredovisning", "delarsrapport"]),
    (re.compile(r"bolagsstamma"), ["stammokostnad", "arsstamma", "foreningsstamma"]),
    (re.compile(r"redovisningstjanster"), ["redovisningsbyra", "bokforingsbyra", "bokslutshjalp"]),
    (re.compile(r"it tjanster"), ["saas", "molntjanst", "hosting", "driftavtal", "microsoft 365", "google workspace"]),
    (re.compile(r"konsultarvoden"), ["konsultfaktura", "konsultarvode", "extern konsult"]),
    (re.compile(r"bankkostnader"), ["bankavgift", "bankgiroavgift", "transaktionsavgift bank"]),
    (re.compile(r"advokat|rattegangskostnader"), ["advokatkostnad", "juridiskt ombud", "rattegangskostnad"]),
    (re.compile(r"traktamenten"), ["traktamente", "dagtraktamente", "resetraktamente"]),
    (re.compile(r"bilersattningar"), ["milersattning", "korsattning med egen bil"]),
    (re.compile(r"trangselskatt"), ["trangselskatt", "trangselskatt passage"]),
    (re.compile(r"fri bostad"), ["bostadsforman", "fri bostad"]),
    (re.compile(r"fria eller subventionerade maltider"), ["matforman", "kostforman", "frukostforman", "lunchforman", "middagforman"]),
    (re.compile(r"fri bil"), ["bilforman", "formansbil"]),
    (re.compile(r"lanedatorer"), ["lanedator", "hemdatorforman"]),
    (re.compile(r"hushallsnara tjanster"), ["rut forman", "hushallsnara forman"]),
    (re.compile(r"sjuk och halsovard"), ["sjukvard", "halsovard", "vardkostnad"]),
    (re.compile(r"personalrepresentation"), ["personalfest", "kickoff mat", "julbord personal", "fika med personal"]),
    (re.compile(r"personalrekrytering"), ["rekryteringskostnad", "headhunter", "jobbannons"]),
    (re.compile(r"drivmedel"), ["bransle", "bensin", "diesel", "tankning"]),
    (re.compile(r"leasing"), ["leasingavgift", "leasingkostnad"]),
    (re.compile(r"kontokortsavgifter"), ["kortinlosenavgift", "kortavgift", "card fee"]),
    (re.compile(r"factoringavgifter"), ["factoringavgift", "avgift for factoring"]),
    (re.compile(r"inkasso"), ["inkassoavgift", "kronofogdeavgift"]),
    (re.compile(r"garantikostnader"), ["garantiarbete", "garantikostnad"]),
    (re.compile(r"valutakursvinster"), ["fx vinst", "kursvinst valuta"]),
    (re.compile(r"valutakursforluster"), ["fx forlust", "kursforlust valuta"]),
]

CODE_PACKS = {
    "5460": ["kaffe till kontoret", "kontorskaffe", "te till kontoret", "mjolk till fikarum", "fikarumsinkop"],
    "6071": ["kaffe med kund", "fika med kund", "kundlunch", "kundmiddag", "representation kund avdragsgill"],
    "6072": ["kaffe med kund ej avdragsgill", "kundmiddag ej avdragsgill", "representation kund ej avdragsgill"],
    "7631": ["personalfika avdragsgill", "intern representation avdragsgill", "kickoff fika"],
    "7632": ["personalfest ej avdragsgill", "julbord personal", "kickoff middag ej avdragsgill"],
    "6992": ["p bot bolaget star for", "felparkeringsavgift", "parkeringsbot", "ej avdragsgill sanktionsavgift"],
    "7319": ["arbetsgivaren betalade p bot", "ersatt privat avgift via lon", "kontant ersattning for privat kostnad"],
    "6212": ["mobilabonnemang", "mobiloperator", "telefonkostnad mobil", "sim abonnemang"],
    "6230": ["bredband", "internet till kontoret", "fiberanslutning", "datalinje"],
    "6540": ["saas abonnemang", "molnprogramvara", "crm abonnemang", "erp abonnemang", "webbhotell", "microsoft 365", "google workspace", "dropbox business", "adobe creative cloud"],
    "5420": ["kop programvara", "engangskopt programvara", "lokal installerad mjukvara"],
    "5410": ["billig dator", "skarm", "tangentbord", "headset", "dockningsstation", "skrivarinkop under gransen"],
    "1224": ["dator som anlaggningstillgang", "arbetsdator over gransen", "kapitaliserad dator"],
    "5611": ["bensin personbil", "diesel personbil", "tankning personbil"],
    "5616": ["trangselskatt personbil", "passageavgift personbil"],
    "5621": ["bensin lastbil", "diesel lastbil", "tankning lastbil"],
    "5820": ["hyrbil tjansteresa", "hyrbil arbete"],
    "5831": ["hotell sverige", "overnattning sverige", "logi sverige"],
    "5832": ["hotell utlandet", "overnattning utlandet", "logi utlandet"],
    "6981": ["medlemsavgift avdragsgill", "branschforening avdragsgill"],
    "6982": ["medlemsavgift ej avdragsgill", "foreningsavgift ej avdragsgill"],
    "6530": ["redovisningsbyra", "bokforingshjalp", "bokslutshjalp"],
    "6421": ["revision", "revisor", "arsrevision"],
    "6570": ["bankavgift", "bankgiroavgift", "banktransaktionsavgift"],
    "6040": ["kortavgift", "kortinlosenavgift", "stripe fee", "klarna avgift", "nets avgift"],
    "6998": ["utlandsk moms", "vat utomlands", "foreign vat"],
    "2641": ["ingaende moms sverige", "avdragsgill moms sverige", "input vat domestic"],
    "2611": ["utgaende moms 25", "sales vat 25", "moms 25 pa forsaljning"],
    "2440": ["obetald leverantorsfaktura", "skuld leverantor", "leverantorsreskontra skuld"],
    "1510": ["obetald kundfaktura", "kund ska betala", "kundreskontra oppen post"],
    "1930": ["foretagskonto bank", "bankkonto foretaget", "driftkonto bank"],
    "1630": ["skattekonto skatteverket", "skattekonto hos myndighet", "authority clearing skatt"],
    "7382": ["kostforman", "fri lunch", "subventionerad lunch", "frukostforman"],
    "7385": ["bilforman", "fri bil", "formansbil"],
    "7391": ["trangselskatteforman", "forman trangselskatt"],
    "5960": ["reklamgava", "giveaway", "profilprodukt", "goodiebag"],
    "5910": ["google ads", "annonsering online", "meta ads", "linkedin ads"],
    "5011": ["hyra kontor", "kontorshyra"],
    "5061": ["kontorsstadning", "stadfirma kontor"],
    "5020": ["el kontor", "strom kontor"],
    "5310": ["driftel", "el for maskindrift"],
    "5711": ["fraktkostnad utleverans", "leveransfrakt kund"],
    "5721": ["tullavgift import"],
}

AMBIGUOUS_PACKS = {
    "5460": ["kaffe", "te", "mjolk", "forbrukningsinkop kontor"],
    "6071": ["kaffe", "fika", "blommor till kund", "kundlunch"],
    "6072": ["kaffe", "fika", "blommor till kund", "kundmiddag"],
    "7631": ["kaffe", "fika", "intern middag", "personalfest"],
    "7632": ["kaffe", "fika", "julbord", "personalfest"],
    "6992": ["p bot", "parkeringsbot", "kontrollavgift", "sanktionsavgift"],
    "7319": ["ersatt privat kostnad", "p bot", "privat avgift betald av arbetsgivare"],
    "6212": ["mobiltelefon", "telefon", "iphone abonnemang"],
    "6540": ["abonnemang", "programvara", "systemkostnad", "webbhotell"],
    "5420": ["programvara", "software inkop"],
    "5410": ["dator", "skarm", "tangentbord"],
    "1224": ["dator", "laptop", "arbetsstation"],
    "5831": ["hotell", "logi"],
    "5832": ["hotell", "logi"],
    "6981": ["medlemsavgift"],
    "6982": ["medlemsavgift"],
    "7382": ["lunch", "middag", "frukost", "kaffe"],
    "5960": ["gava", "present", "giveaway"],
    "5910": ["annonsering", "reklam"],
    "5970": ["annonsering", "internetreklam", "online ads"],
}


def ascii_norm(text: str) -> str:
    text = (text or "").replace("\n", " ").replace("\xa0", " ")
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("&", " och ")
    return re.sub(r"\s+", " ", text).strip()


def clean_phrase(text: str) -> str:
    text = ascii_norm(text)
    text = re.sub(r"[^a-z0-9%/ ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip(" /")


def add_phrase(bucket: set[str], text: str) -> None:
    text = clean_phrase(text)
    if len(text) >= 2:
        bucket.add(text)


def stem_token(token: str) -> str:
    token = clean_phrase(token)
    if len(token) <= 4:
        return token
    for suffix, repl in [
        ("nader", "nad"),
        ("heter", "het"),
        ("ningar", "ning"),
        ("elser", "else"),
        ("or", ""),
        ("ar", ""),
        ("er", ""),
    ]:
        if token.endswith(suffix) and len(token) - len(suffix) + len(repl) >= 4:
            return token[: -len(suffix)] + repl
    return token


def content_tokens(text: str) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9%]+", ascii_norm(text)) if t and t not in STOP]


def ngram_terms(tokens: list[str], max_n: int = 3) -> set[str]:
    out = set()
    for n in range(1, max_n + 1):
        for i in range(len(tokens) - n + 1):
            add_phrase(out, " ".join(tokens[i : i + n]))
    return out


def name_variants(name: str) -> set[str]:
    name = ascii_norm(name)
    out = set()
    add_phrase(out, name)
    plain = re.sub(r"\s*\([^)]*\)", "", name).strip()
    add_phrase(out, plain)
    for paren in re.findall(r"\(([^)]*)\)", name):
        add_phrase(out, paren)
        add_phrase(out, f"{plain} {paren}")
    for piece in [p.strip() for p in plain.split(",") if p.strip()]:
        add_phrase(out, piece)
    return out


def auto_policy(account: dict) -> str:
    code = account["code"]
    name = ascii_norm(account["name"])
    if account["level"] == "group":
        return "group_only"
    if "gruppkonto" in name:
        return "candidate_only"
    if any(x in name for x in ["avdragsgill", "ej avdragsgill", "momsfri", "25 % moms", "12 % moms", "6 % moms"]):
        return "blocked_without_context"
    if code in AMBIGUOUS_PACKS:
        return "blocked_without_context"
    if any(x in name for x in ["representation", "leasing", "drivmedel", "trangselskatt", "programvara", "it tjanster", "medlemsavgift", "kost och logi"]):
        return "candidate_only"
    return "exact_name_allowed"


def parse_accounts(path: Path) -> list[dict]:
    ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with zipfile.ZipFile(path) as zf:
        sroot = ET.fromstring(zf.read("xl/sharedStrings.xml"))
        shared = [
            "".join(t.text or "" for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
            for si in sroot.findall("a:si", ns)
        ]
        sheet = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))
        accounts = []
        current_group = {"code": "", "name": ""}
        current_main = {"code": "", "name": ""}
        for row in sheet.find("a:sheetData", ns):
            vals = {}
            for cell in row.findall("a:c", ns):
                ref = cell.attrib.get("r")
                value_node = cell.find("a:v", ns)
                if value_node is None:
                    continue
                value = value_node.text
                if cell.attrib.get("t") == "s":
                    value = shared[int(value)]
                vals[re.sub(r"\d+", "", ref)] = value.replace("\n", " ").strip()
            if "A" in vals and re.fullmatch(r"\d{2}#?", vals["A"]):
                current_group = {"code": vals["A"].replace("#", ""), "name": vals.get("B", "")}
                current_main = {"code": "", "name": ""}
                accounts.append(
                    {
                        "code": vals["A"].replace("#", ""),
                        "name": vals.get("B", ""),
                        "level": "group",
                        "group_code": current_group["code"],
                        "group_name": current_group["name"],
                        "main_code": "",
                        "main_name": "",
                        "k2_blocked": vals["A"].endswith("#"),
                    }
                )
            if "A" in vals and re.fullmatch(r"\d{4}#?", vals["A"]):
                current_main = {"code": vals["A"].replace("#", ""), "name": vals.get("B", "")}
                accounts.append(
                    {
                        "code": vals["A"].replace("#", ""),
                        "name": vals.get("B", ""),
                        "level": "main",
                        "group_code": current_group["code"],
                        "group_name": current_group["name"],
                        "main_code": current_main["code"],
                        "main_name": current_main["name"],
                        "k2_blocked": vals["A"].endswith("#"),
                    }
                )
            if "C" in vals and re.fullmatch(r"\d{4}#?", vals["C"]):
                accounts.append(
                    {
                        "code": vals["C"].replace("#", ""),
                        "name": vals.get("D", ""),
                        "level": "sub",
                        "group_code": current_group["code"],
                        "group_name": current_group["name"],
                        "main_code": current_main["code"],
                        "main_name": current_main["name"],
                        "k2_blocked": vals["C"].endswith("#"),
                    }
                )
        return accounts


def enrich_account(account: dict) -> dict:
    code = account["code"]
    name = account["name"]
    main_name = account["main_name"]
    group_name = account["group_name"]
    norm_name = ascii_norm(name)
    name_tokens = content_tokens(name)
    main_tokens = content_tokens(main_name)
    group_tokens = content_tokens(group_name)

    keywords = set()
    phrases = set()
    ambiguous = set()

    add_phrase(keywords, code)
    add_phrase(keywords, name)
    add_phrase(phrases, name)

    for item in name_variants(name):
        add_phrase(phrases, item)
    for item in ngram_terms(name_tokens, 3):
        add_phrase(keywords, item)
    for token in name_tokens:
        add_phrase(keywords, token)
        add_phrase(keywords, stem_token(token))
    if name_tokens:
        add_phrase(keywords, " ".join(name_tokens))
        add_phrase(phrases, " ".join(name_tokens))

    if main_name and account["level"] == "sub":
        add_phrase(phrases, main_name)
        add_phrase(phrases, f"{main_name} {name}")
        for item in ngram_terms(main_tokens, 2):
            add_phrase(keywords, item)
    if group_name:
        add_phrase(phrases, group_name)
        add_phrase(phrases, f"{group_name} {name}")
        for item in ngram_terms(group_tokens, 2):
            add_phrase(keywords, item)

    for hint in CLASS_HINTS.get(code[:1], []):
        add_phrase(keywords, hint)
        add_phrase(phrases, f"{hint} {name}")

    for pattern, pack in NAME_PACKS:
        if pattern.search(norm_name):
            for item in pack:
                add_phrase(phrases, item)
                for token in ngram_terms(content_tokens(item), 2):
                    add_phrase(keywords, token)

    for item in CODE_PACKS.get(code, []):
        add_phrase(phrases, item)
        for token in ngram_terms(content_tokens(item), 2):
            add_phrase(keywords, token)

    for item in AMBIGUOUS_PACKS.get(code, []):
        add_phrase(ambiguous, item)
        add_phrase(keywords, item)

    if "ackumulerade avskrivningar" in norm_name:
        base = clean_phrase(norm_name.replace("ackumulerade avskrivningar pa", "").replace("ackumulerade avskrivningar", ""))
        add_phrase(phrases, f"ackumulerad avskrivning {base}")
        add_phrase(phrases, f"samlad avskrivning {base}")
        add_phrase(keywords, "ackumulerad avskrivning")
    if "ackumulerade nedskrivningar" in norm_name:
        base = clean_phrase(norm_name.replace("ackumulerade nedskrivningar pa", "").replace("ackumulerade nedskrivningar", ""))
        add_phrase(phrases, f"ackumulerad nedskrivning {base}")
        add_phrase(phrases, f"samlad nedskrivning {base}")
        add_phrase(keywords, "ackumulerad nedskrivning")
    if "aterforing av" in norm_name:
        add_phrase(keywords, "aterforing")
        add_phrase(phrases, f"aterforing {clean_phrase(norm_name.replace('aterforing av', ''))}")
    if "forandring av" in norm_name:
        add_phrase(keywords, "forandring")
        add_phrase(phrases, f"forandring {clean_phrase(norm_name.replace('forandring av', ''))}")
    if "forskott" in norm_name:
        add_phrase(keywords, "forhandsbetalning")
        add_phrase(phrases, f"forhandsbetalning {name}")

    add_phrase(keywords, f"konto {code}")
    add_phrase(keywords, f"bas {code}")
    add_phrase(phrases, f"konto {code} {name}")
    add_phrase(phrases, f"bas konto {code} {name}")

    if len(keywords) < 8 and name_tokens:
        stemmed = [stem_token(t) for t in name_tokens]
        for item in stemmed:
            add_phrase(keywords, item)
        if len(name_tokens) == 1:
            token = name_tokens[0]
            add_phrase(keywords, f"ovrigt {token}")
            add_phrase(keywords, f"{stem_token(token)} konto")
            add_phrase(phrases, f"konto for {token}")
            add_phrase(phrases, f"bokfor {token}")
        else:
            add_phrase(keywords, f"{name_tokens[0]} {name_tokens[-1]}")
            add_phrase(phrases, f"konto for {' '.join(name_tokens[:2])}")

    if len(phrases) < 8:
        add_phrase(phrases, f"sok konto {code}")
        add_phrase(phrases, f"bas konto {code}")
        add_phrase(phrases, f"bokfor pa konto {code}")
        if name_tokens:
            add_phrase(phrases, f"konto for {' '.join(name_tokens)}")
            add_phrase(phrases, f"bokfor {' '.join(name_tokens)}")
            add_phrase(phrases, f"kostnad eller post {' '.join(name_tokens)}")
        if group_tokens:
            add_phrase(phrases, f"konto inom {' '.join(group_tokens)}")
        if main_tokens:
            add_phrase(phrases, f"underkonto till {' '.join(main_tokens)}")

    if len(keywords) < 8:
        add_phrase(keywords, f"sok konto {code}")
        if name_tokens:
            add_phrase(keywords, f"bokfor {' '.join(name_tokens)}")
        if group_tokens:
            add_phrase(keywords, f"inom {' '.join(group_tokens)}")
        if main_tokens:
            add_phrase(keywords, f"under {main_name}")

    return {
        "konto": code,
        "konto_namn_officiell": name,
        "konto_namn_ascii": ascii_norm(name),
        "niva": account["level"],
        "huvudgrupp_kod": account["group_code"],
        "huvudgrupp_namn_ascii": ascii_norm(group_name),
        "huvudkonto_kod": account["main_code"],
        "huvudkonto_namn_ascii": ascii_norm(main_name),
        "k2_blocked": "true" if account["k2_blocked"] else "false",
        "auto_select_policy": auto_policy(account),
        "sokord": " | ".join(sorted(keywords)),
        "stodfraser": " | ".join(sorted(phrases)),
        "tvetydiga_intentioner": " | ".join(sorted(ambiguous)),
    }


def main() -> None:
    accounts = parse_accounts(XLSX_PATH)
    rows = [enrich_account(account) for account in accounts]

    with OUT_PATH.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()), delimiter="\t")
        writer.writeheader()
        writer.writerows(rows)

    keyword_counts = []
    phrase_counts = []
    for row in rows:
        keyword_counts.append((len([x for x in row["sokord"].split("|") if x.strip()]), row["konto"], row["konto_namn_officiell"]))
        phrase_counts.append((len([x for x in row["stodfraser"].split("|") if x.strip()]), row["konto"], row["konto_namn_officiell"]))
    keyword_counts.sort()
    phrase_counts.sort()

    print(f"ROWCOUNT={len(rows)}")
    print(f"MIN_SOKORD={keyword_counts[0]}")
    print(f"MIN_STODFRASER={phrase_counts[0]}")
    print(f"UNDER5_SOKORD={sum(1 for n, _, _ in keyword_counts if n < 5)}")
    print(f"UNDER5_STODFRASER={sum(1 for n, _, _ in phrase_counts if n < 5)}")
    print(f"UNDER8_SOKORD={sum(1 for n, _, _ in keyword_counts if n < 8)}")
    print(f"UNDER8_STODFRASER={sum(1 for n, _, _ in phrase_counts if n < 8)}")


if __name__ == "__main__":
    main()
