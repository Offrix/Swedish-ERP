import csv
import re
from pathlib import Path


ROOT = Path(r"C:\Users\snobb\Desktop\Swedish ERP\docs\implementation-control\domankarta-rebuild")


PHRASE_REPLACEMENTS = [
    ("ma ste", "måste"),
    ("ska lasa", "ska låsa"),
    ("maste lasas", "måste läsas"),
    ("ska lasas", "ska läsas"),
    ("lasas i ordningen", "läsas i ordningen"),
    ("far inte bora", "får inte röra"),
    ("far inte valja", "får inte välja"),
    ("far inte anvandas", "får inte användas"),
    ("ska folja", "ska följa"),
    ("ska anvandas", "ska användas"),
    ("ska ersatta", "ska ersätta"),
    ("officiell kalla", "officiell källa"),
    ("officiell BAS-kalla", "officiell BAS-källa"),
    ("BAS 2026-kalla", "BAS 2026-källa"),
    ("2026-kalla", "2026-källa"),
    ("FX-kalla", "FX-källa"),
    ("kallarlista", "källlista"),
]


EXACT_REPLACEMENTS = {
    "ar": "är",
    "maste": "måste",
    "far": "får",
    "for": "för",
    "fran": "från",
    "over": "över",
    "aven": "även",
    "bor": "bör",
    "bora": "röra",
    "gor": "gör",
    "gora": "göra",
    "goras": "göras",
    "manga": "många",
    "tva": "två",
    "nagot": "något",
    "nagra": "några",
    "sjalv": "själv",
    "sjalva": "själva",
    "sjalvt": "självt",
    "fardig": "färdig",
    "fardiga": "färdiga",
    "fardigt": "färdigt",
    "agare": "ägare",
    "agaren": "ägaren",
    "agares": "ägares",
    "anstalld": "anställd",
    "anstallda": "anställda",
    "anstallde": "anställde",
    "anstalldes": "anställdes",
    "anstallds": "anställds",
    "behorig": "behörig",
    "behorighet": "behörighet",
    "behorigheter": "behörigheter",
    "mojlig": "möjlig",
    "mojliga": "möjliga",
    "mojligt": "möjligt",
    "hallas": "hållas",
    "haller": "håller",
    "halls": "hålls",
    "ratt": "rätt",
    "rattelse": "rättelse",
    "rattelser": "rättelser",
    "rattning": "rättning",
    "rattningar": "rättningar",
    "falt": "fält",
    "falten": "fälten",
    "tillatna": "tillåtna",
    "otillatna": "otillåtna",
    "ovrig": "övrig",
    "ovriga": "övriga",
    "ovrigt": "övrigt",
    "utgaende": "utgående",
    "ingaende": "ingående",
    "skadestand": "skadestånd",
    "lasa": "läsa",
    "lasaren": "läsaren",
    "lasrattigheter": "läsrättigheter",
    "lasratt": "läsrätt",
    "lasmodell": "läsmodell",
    "lasmodeller": "läsmodeller",
    "lasyta": "läsyta",
    "lasytor": "läsytor",
    "lasbar": "läsbar",
    "lasbara": "läsbara",
    "lasbart": "läsbart",
    "sok": "sök",
    "soka": "söka",
    "sokas": "sökas",
    "sokning": "sökning",
    "sokningar": "sökningar",
    "sokord": "sökord",
    "stod": "stöd",
    "stodfras": "stödfras",
    "stodfraser": "stödfraser",
    "jamkning": "jämkning",
    "hog": "hög",
    "hogre": "högre",
    "hogsta": "högsta",
    "langd": "längd",
    "langre": "längre",
    "fraga": "fråga",
    "fragor": "frågor",
    "pa": "på",
    "nar": "när",
    "later": "låter",
    "galler": "gäller",
    "dar": "där",
    "fore": "före",
    "forfarande": "förfarande",
    "tillrackligt": "tillräckligt",
    "tillampligt": "tillämpligt",
    "lon": "lön",
    "varde": "värde",
    "varden": "värden",
    "ateroppna": "återöppna",
    "ateroppnas": "återöppnas",
    "aterbygga": "återbygga",
    "aterskapa": "återskapa",
    "aterskapas": "återskapas",
    "avgora": "avgöra",
    "agande": "ägande",
    "ager": "äger",
    "ags": "ägs",
    "agd": "ägd",
    "agda": "ägda",
    "agt": "ägt",
    "kravs": "krävs",
    "ror": "rör",
    "primar": "primär",
    "isar": "isär",
    "harda": "hårda",
    "hardas": "härdas",
    "hardning": "härdning",
    "fars": "förs",
    "niva": "nivå",
    "nivaer": "nivåer",
    "folja": "följa",
    "foljer": "följer",
    "foljt": "följt",
    "anvanda": "använda",
    "anvands": "används",
    "anvandas": "användas",
    "anvander": "använder",
    "fullstandig": "fullständig",
    "fullstandiga": "fullständiga",
    "fullstandigt": "fullständigt",
    "lopande": "löpande",
    "ranta": "ränta",
    "rante": "ränte",
    "utanfor": "utanför",
    "utanfar": "utanför",
    "paminnelse": "påminnelse",
    "gron": "grön",
    "faststallelse": "fastställelse",
    "arets": "årets",
    "engangsskatt": "engångsskatt",
    "transportgrans": "transportgräns",
    "bankaterbetalning": "bankåterbetalning",
    "kopsidan": "köpsidan",
    "laasbar": "läsbar",
    "laasbara": "läsbara",
    "laasbart": "läsbart",
    "kalltyp": "källtyp",
    "kallaktivitet": "källaktivitet",
    "kallaktiviteten": "källaktiviteten",
    "kallrad": "källrad",
    "kallbeslut": "källbeslut",
    "kallfordringar": "källfordringar",
    "kalltext": "källtext",
    "vagledning": "vägledning",
    "vagledningen": "vägledningen",
    "vagledningar": "vägledningar",
    "lankar": "länkar",
    "godkannas": "godkännas",
    "godkand": "godkänd",
    "godkanda": "godkända",
    "godkands": "godkänds",
    "upphojer": "upphöjer",
    "upphojs": "upphöjs",
    "berord": "berörd",
    "berorda": "berörda",
    "drojsmal": "dröjsmål",
    "drojsmalsranta": "dröjsmålsränta",
    "drojsmalsränta": "dröjsmålsränta",
    "godkannandeforfarande": "godkännandeförfarande",
    "andring": "ändring",
    "andrings": "ändrings",
    "ersatta": "ersätta",
    "ersatter": "ersätter",
    "ersatts": "ersätts",
    "ersattas": "ersättas",
    "oppen": "öppen",
    "oppet": "öppet",
    "oppna": "öppna",
    "oppnas": "öppnas",
    "oppenhet": "öppenhet",
    "avdragsratt": "avdragsrätt",
    "uppstar": "uppstår",
    "uppstatt": "uppstått",
    "sparr": "spärr",
    "intakt": "intäkt",
    "intakter": "intäkter",
    "intakts": "intäkts",
    "avrakning": "avräkning",
    "lonsamhet": "lönsamhet",
    "leverantor": "leverantör",
    "leverantorer": "leverantörer",
    "utlagg": "utlägg",
    "overbetalning": "överbetalning",
    "overbetalningar": "överbetalningar",
    "overforing": "överföring",
    "overforingar": "överföringar",
    "semesterar": "semesterår",
    "maltidsreduktion": "måltidsreduktion",
    "deltidsfranvaro": "deltidsfrånvaro",
    "franvaro": "frånvaro",
    "overgang": "övergång",
    "hogriskskydd": "högriskskydd",
    "vaxa": "växa",
    "pagaende": "pågående",
    "nyanlaggning": "nyanläggning",
    "lakare": "läkare",
    "lakar": "läkar",
    "hogrisk": "högrisk",
    "nedsattning": "nedsättning",
    "nedsattningar": "nedsättningar",
    "tillfallig": "tillfällig",
    "tillfalliga": "tillfälliga",
    "anstalldsutlagg": "anställdsutlägg",
    "anstalldfordringar": "anställdfordringar",
    "anstalldfordran": "anställdfordran",
    "nettolon": "nettolön",
    "semesterlon": "semesterlön",
    "sjuklon": "sjuklön",
    "sammaloneregeln": "sammalöneregeln",
    "tjanst": "tjänst",
    "tjansteresa": "tjänsteresa",
    "tjansteresor": "tjänsteresor",
    "tremanadersreduktion": "tremånadersreduktion",
    "intjanande": "intjänande",
    "anstand": "anstånd",
    "forsakringskassan": "Försäkringskassan",
}


PREFIX_REPLACEMENTS = [
    ("bokfor", "bokför"),
    ("doman", "domän"),
    ("anlagg", "anlägg"),
    ("tillamp", "tillämp"),
    ("tvard", "tvärd"),
    ("lone", "löne"),
    ("lones", "lönes"),
    ("lonetak", "lönetak"),
    ("forman", "förmån"),
    ("behor", "behör"),
    ("omrak", "omräk"),
    ("ater", "åter"),
    ("berak", "beräk"),
    ("rakn", "räkn"),
    ("rorelse", "rörelse"),
    ("foraldr", "föräldr"),
    ("forandr", "förändr"),
    ("forankr", "förankr"),
    ("forbehall", "förbehåll"),
    ("forber", "förber"),
    ("forbjud", "förbjud"),
    ("forbud", "förbud"),
    ("forbli", "förbli"),
    ("forblir", "förblir"),
    ("forbruk", "förbruk"),
    ("fordel", "fördel"),
    ("forenkl", "förenkl"),
    ("forening", "förening"),
    ("forenings", "förenings"),
    ("foregaende", "föregående"),
    ("forekom", "förekom"),
    ("foretag", "företag"),
    ("forklar", "förklar"),
    ("fornoden", "förnöden"),
    ("forord", "förord"),
    ("foreskrift", "föreskrift"),
    ("foreskr", "föreskr"),
    ("foresla", "föreslå"),
    ("foresl", "föresl"),
    ("forsakring", "försäkring"),
    ("forsakrings", "försäkrings"),
    ("forskott", "förskott"),
    ("forsalj", "försälj"),
    ("forsta", "första"),
    ("forst", "först"),
    ("forsok", "försök"),
    ("forsen", "försen"),
    ("forut", "förut"),
    ("foruts", "föruts"),
    ("forvarv", "förvärv"),
    ("forvaxl", "förväxl"),
    ("forvalt", "förvalt"),
    ("forlust", "förlust"),
    ("forhands", "förhands"),
    ("forteckning", "förteckning"),
    ("formogenhets", "förmögenhets"),
    ("kalldoman", "källdomän"),
    ("kallfamilj", "källfamilj"),
    ("kalls", "källs"),
    ("kallkrav", "källkrav"),
    ("kallunderlag", "källunderlag"),
    ("kallor", "källor"),
    ("kallan", "källan"),
    ("begrans", "begräns"),
    ("avgrans", "avgräns"),
    ("anvand", "använd"),
    ("innehall", "innehåll"),
    ("hjalp", "hjälp"),
    ("inkop", "inköp"),
    ("salj", "sälj"),
    ("omvand", "omvänd"),
    ("sammanstall", "sammanställ"),
    ("sok", "sök"),
    ("stod", "stöd"),
    ("flod", "flöd"),
    ("utlagg", "utlägg"),
    ("leverantor", "leverantör"),
    ("overbetal", "överbetal"),
    ("overfor", "överför"),
    ("paminnelse", "påminnelse"),
    ("gron", "grön"),
    ("faststallelse", "fastställelse"),
    ("arets", "årets"),
    ("engangs", "engångs"),
    ("transportgrans", "transportgräns"),
    ("bankater", "bankåter"),
    ("kopsid", "köpsid"),
    ("vagled", "vägled"),
    ("lank", "länk"),
    ("godkann", "godkänn"),
    ("upphoj", "upphöj"),
    ("berord", "berörd"),
    ("drojsmal", "dröjsmål"),
    ("drojsmals", "dröjsmåls"),
    ("fullstand", "fullständ"),
    ("lopand", "löpand"),
    ("andr", "ändr"),
    ("ersatt", "ersätt"),
    ("oppen", "öppen"),
    ("oppn", "öppn"),
    ("avstam", "avstäm"),
    ("avdragsratt", "avdragsrätt"),
    ("rant", "ränt"),
    ("intakt", "intäkt"),
    ("intjan", "intjän"),
    ("uppstar", "uppstår"),
    ("avrak", "avräk"),
    ("lonsam", "lönsam"),
    ("tjanst", "tjänst"),
    ("framst", "främst"),
    ("sjalvbeskatt", "självbeskatt"),
    ("sjalvkost", "självkost"),
    ("sjalvfakt", "självfakt"),
    ("sjalvvald", "självvald"),
    ("lakar", "läkar"),
    ("nedsatt", "nedsätt"),
    ("sparr", "spärr"),
    ("semesterar", "semesterår"),
    ("franvaro", "frånvaro"),
    ("overgang", "övergång"),
    ("hogrisk", "högrisk"),
    ("utbetalningssparr", "utbetalningsspärr"),
    ("vaxa", "växa"),
    ("pagaende", "pågående"),
    ("nyanlagg", "nyanlägg"),
    ("maltidsreduktion", "måltidsreduktion"),
    ("kalltyp", "källtyp"),
    ("kallaktiv", "källaktiv"),
    ("kallrad", "källrad"),
    ("kallbeslut", "källbeslut"),
    ("kallfordr", "källfordr"),
    ("forsakringskassan", "Försäkringskassan"),
    ("kopare", "köpare"),
    ("kopars", "köpars"),
    ("kopar", "köpar"),
    ("affars", "affärs"),
    ("arsredovis", "årsredovis"),
    ("arsbokslut", "årsbokslut"),
    ("arsstamma", "årsstämma"),
    ("arsrevision", "årsrevision"),
    ("maskinlas", "maskinläs"),
]


INFIX_REPLACEMENTS = [
    ("flode", "flöde"),
    ("flodes", "flödes"),
    ("floden", "flöden"),
    ("flodet", "flödet"),
    ("forlust", "förlust"),
    ("forstand", "förstånd"),
    ("doman", "domän"),
    ("utlagg", "utlägg"),
    ("leverantor", "leverantör"),
    ("overbetal", "överbetal"),
    ("overfor", "överför"),
    ("paminnelse", "påminnelse"),
    ("gron", "grön"),
    ("faststallelse", "fastställelse"),
    ("arets", "årets"),
    ("engangs", "engångs"),
    ("transportgrans", "transportgräns"),
    ("bankater", "bankåter"),
    ("kopsid", "köpsid"),
    ("vagled", "vägled"),
    ("lank", "länk"),
    ("godkann", "godkänn"),
    ("upphoj", "upphöj"),
    ("berord", "berörd"),
    ("drojsmal", "dröjsmål"),
    ("drojsmals", "dröjsmåls"),
    ("omvand", "omvänd"),
    ("sammanstall", "sammanställ"),
    ("salj", "sälj"),
    ("inkop", "inköp"),
    ("agande", "ägande"),
    ("innehall", "innehåll"),
    ("maskinlas", "maskinläs"),
    ("stod", "stöd"),
    ("fullstand", "fullständ"),
    ("anvand", "använd"),
    ("folj", "följ"),
    ("ranta", "ränta"),
    ("rante", "ränte"),
    ("avstam", "avstäm"),
    ("avdragsratt", "avdragsrätt"),
    ("oppn", "öppn"),
    ("intakt", "intäkt"),
    ("intjan", "intjän"),
    ("uppstar", "uppstår"),
    ("avrak", "avräk"),
    ("lonsam", "lönsam"),
    ("ersatt", "ersätt"),
    ("tjanst", "tjänst"),
    ("sparr", "spärr"),
    ("semesterar", "semesterår"),
    ("franvaro", "frånvaro"),
    ("overgang", "övergång"),
    ("hogrisk", "högrisk"),
    ("vaxa", "växa"),
    ("pagaende", "pågående"),
    ("nyanlagg", "nyanlägg"),
    ("maltidsreduktion", "måltidsreduktion"),
    ("kalltyp", "källtyp"),
    ("kallaktiv", "källaktiv"),
    ("kallrad", "källrad"),
    ("kallbeslut", "källbeslut"),
    ("kallfordr", "källfordr"),
]


def preserve_case(source: str, replacement: str) -> str:
    if source.isupper():
        return replacement.upper()
    if source and source[0].isupper():
        return replacement[0].upper() + replacement[1:]
    return replacement


def protect_segments(text: str) -> tuple[str, dict[str, str]]:
    placeholders: dict[str, str] = {}

    def stash(match: re.Match) -> str:
        key = f"__PROTECTED_{len(placeholders)}__"
        placeholders[key] = match.group(0)
        return key

    def should_protect_inline_code(content: str) -> bool:
        if content.startswith("## "):
            return False
        technical_markers = (
            ".md", ".ts", ".tsx", ".js", ".mjs", ".json", ".pdf", ".xlsx", ".xml", ".xsd",
            "://", "\\", "__PROTECTED_", "::", "#", "@", "|",
        )
        if any(marker in content for marker in technical_markers):
            return True
        if "_" in content:
            return True
        if re.fullmatch(r"[A-Za-z0-9:/.+-]+", content):
            return True
        return False

    def stash_inline_code(match: re.Match) -> str:
        content = match.group(0)[1:-1]
        if should_protect_inline_code(content):
            return stash(match)
        return match.group(0)

    def stash_markdown_link(match: re.Match) -> str:
        label = match.group(1)
        target = match.group(2)
        key = f"__PROTECTED_{len(placeholders)}__"
        placeholders[key] = target
        return f"[{label}]({key})"

    patterns = [
        re.compile(r"```.*?```", re.DOTALL),
        re.compile(r"https?://\S+"),
    ]
    text = re.sub(r"(?<!\!)\[([^\]]*)\]\(([^)]+)\)", stash_markdown_link, text)
    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", stash_markdown_link, text)
    text = re.sub(r"`[^`\n]*`", stash_inline_code, text)
    for pattern in patterns:
        text = pattern.sub(stash, text)
    return text, placeholders


def restore_segments(text: str, placeholders: dict[str, str]) -> str:
    for key, value in placeholders.items():
        text = text.replace(key, value)
    return text


def convert_visible_text(text: str) -> str:
    protected, placeholders = protect_segments(text)

    for source, target in PHRASE_REPLACEMENTS:
        protected = re.sub(
            re.escape(source),
            lambda m: preserve_case(m.group(0), target),
            protected,
            flags=re.IGNORECASE,
        )

    for source, target in EXACT_REPLACEMENTS.items():
        protected = re.sub(
            rf"\b{re.escape(source)}\b",
            lambda m: preserve_case(m.group(0), target),
            protected,
            flags=re.IGNORECASE,
        )

    for source, target in sorted(PREFIX_REPLACEMENTS, key=lambda x: len(x[0]), reverse=True):
        protected = re.sub(
            rf"\b{re.escape(source)}",
            lambda m: preserve_case(m.group(0), target),
            protected,
            flags=re.IGNORECASE,
        )

    for source, target in INFIX_REPLACEMENTS:
        protected = re.sub(
            re.escape(source),
            lambda m: preserve_case(m.group(0), target),
            protected,
            flags=re.IGNORECASE,
        )

    return restore_segments(protected, placeholders)


def convert_markdown_files() -> int:
    changed = 0
    for path in sorted(ROOT.glob("*.md")):
        original = path.read_text(encoding="utf-8", errors="ignore")
        updated = convert_visible_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def convert_tsv_files() -> int:
    changed = 0
    for path in sorted(ROOT.glob("*.tsv")):
        with path.open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle, delimiter="\t"))
            fieldnames = rows[0].keys() if rows else []
        dirty = False
        for row in rows:
            for field in ("konto_namn_officiell", "sokord", "stodfraser", "tvetydiga_intentioner"):
                if field in row:
                    updated = convert_visible_text(row[field])
                    if updated != row[field]:
                        row[field] = updated
                        dirty = True
        if dirty:
            with path.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fieldnames, delimiter="\t")
                writer.writeheader()
                writer.writerows(rows)
            changed += 1
    return changed


def main() -> None:
    md_changed = convert_markdown_files()
    tsv_changed = convert_tsv_files()
    print(f"MD_CHANGED={md_changed}")
    print(f"TSV_CHANGED={tsv_changed}")


if __name__ == "__main__":
    main()
