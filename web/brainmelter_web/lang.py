"""Cheap headline language guessing: script ranges first, then stopwords and diacritics for Latin text.

Headlines are short, so every guess is weak; callers combine it with what a feed (bot nick) usually posts.
"""

import re
from collections import Counter, defaultdict

# (language, regex) – first match with enough characters wins
SCRIPTS = [
    ("ja", re.compile(r"[\u3040-\u30ff]")),  # kana before Han: Japanese mixes both
    ("zh", re.compile(r"[\u4e00-\u9fff]")),
    ("ko", re.compile(r"[\uac00-\ud7af]")),
    ("el", re.compile(r"[\u0370-\u03ff\u1f00-\u1fff]")),
    ("cyrillic", re.compile(r"[\u0400-\u04ff]")),
    ("fa", re.compile(r"[پچژگ]")),
    ("ar", re.compile(r"[\u0600-\u06ff]")),
    ("he", re.compile(r"[\u0590-\u05ff]")),
    ("th", re.compile(r"[\u0e00-\u0e7f]")),
    ("hi", re.compile(r"[\u0900-\u097f]")),
    ("ka", re.compile(r"[\u10a0-\u10ff]")),
    ("hy", re.compile(r"[\u0530-\u058f]")),
]

STOPWORDS = {
    "en": "the of and to in is for on with that this as are at by from be it was you how why what new after will its has have says over",
    "de": "der die das und ist nicht mit für auf ein eine den von zu im in sich des dem bei wie auch nach wird über aus einen vor neue gegen was wer warum noch nur schon hinter",
    "fr": "le la les des et est une un pour dans du sur que qui pas au avec ce son aux plus après sont",
    "es": "el la los las de del y en que por para una un con se es al más tras sus como",
    "it": "il la di che e per una un del della con non sono gli le nel dei alla più",
    "nl": "de het een en van is op in te met voor niet dat zijn bij aan naar ook uit wordt",
    "pt": "o a os as de do da em que para com uma um não no na dos das ao mais",
    "pl": "i w z na się nie do że to jest o od po jak dla przez",
    "cs": "a v se na je že s z do to o pro jsou jako by",
    "sv": "och i att det som en på är av för med till inte efter",
    "da": "og i at det er en på til af for med den ikke efter",
    "no": "og i det er på til av for med som en ikke etter",
    "fi": "ja on ei se että oli mukaan kun hän myös nyt",
    "et": "ja on ei et see kui oli ka mis aga kes said sai tegi kuid ning oma juba veel nüüd pärast seda selle mille kas vastu eest",
    "hu": "a az és hogy nem is egy meg van már",
    "ro": "și în de la cu că pe nu din care pentru",
    "tr": "ve bir bu için ile da de mi olarak çok",
}
WORD_LANGS: dict[str, tuple[str, ...]] = {}
for _lang, _words in STOPWORDS.items():
    for _word in _words.split():
        WORD_LANGS[_word] = WORD_LANGS.get(_word, ()) + (_lang,)

DIACRITICS = {
    "de": "ßäöü",
    "fr": "éèêàçùœ",
    "es": "ñáíóú¿¡",
    "pt": "ãõçâê",
    "pl": "łąęśźżń",
    "cs": "řěůčšž",
    "sv": "åäö",
    "da": "æøå",
    "no": "æøå",
    "fi": "äö",
    "et": "õäöü",
    "hu": "őűáé",
    "ro": "ășțâî",
    "tr": "ğşıçöü",
    "it": "àèìòù",
}
CHAR_LANGS: dict[str, tuple[str, ...]] = {}
for _lang, _chars in DIACRITICS.items():
    for _char in _chars:
        CHAR_LANGS[_char] = CHAR_LANGS.get(_char, ()) + (_lang,)

WORD = re.compile(r"[^\W\d_]+", re.UNICODE)


def cyrillic(text: str) -> str:
    if re.search(r"[іїєґІЇЄҐ]", text):
        return "uk"
    if re.search(r"[ыэёЫЭЁ]", text):
        return "ru"
    # Bulgarian writes ъ all the time and lacks ы/э/ё; Russian only uses ъ rarely
    return "bg" if re.search(r"[ъЪ]", text) else "ru"


def guess(text: str) -> tuple[str | None, int]:
    """Return (language, confidence score)."""
    for lang, pattern in SCRIPTS:
        hits = len(pattern.findall(text))
        if hits >= 2 or (hits and lang in ("fa", "ja", "ka", "hy")):
            return (cyrillic(text) if lang == "cyrillic" else lang), 10
    lowered = text.lower()
    scores = Counter()
    # evidence shared by several languages ("in", "de", "ä") counts for less than evidence unique to one
    for word in WORD.findall(lowered):
        langs = WORD_LANGS.get(word, ())
        for lang in langs:
            scores[lang] += 6 / len(langs)
    for char in lowered:
        langs = CHAR_LANGS.get(char, ())
        for lang in langs:
            scores[lang] += 2 / len(langs)
    if not scores:
        return None, 0
    lang, score = scores.most_common(1)[0]
    return lang, round(score)


class Detector:
    """One language per feed (bot nick): the majority of its confidently guessed headlines.

    A feed keeps its voice only if it keeps its language, so single headlines never override the majority.
    """

    def __init__(self) -> None:
        self.by_nick: dict[str, Counter] = defaultdict(Counter)

    def learn(self, nick: str, text: str) -> None:
        lang, score = guess(text)
        if lang and score >= 3:
            self.by_nick[nick][lang] += 1

    def language_of(self, nick: str) -> str:
        history = self.by_nick.get(nick)
        # no confident guess yet: most brockman feeds are English
        return history.most_common(1)[0][0] if history else "en"
