# Fonts from https://github.com/google/fonts, pinned.
# fallback = true: always appended to the font stack for script coverage (Cyrillic, Greek, Hebrew, CJK, Arabic).
# decor = true: only for the start screen title; headlines always use the other fonts so they stay readable.
{
  rev = "5174b3333331c966c38f4355d50b03ca1c1df2f9";
  fonts = [
    { family = "Bangers"; path = "ofl/bangers/Bangers-Regular.ttf"; hash = "sha256-QWCnMR3pNCZ0zOkWDN6fy7MPSBkDl9hv8bcLRVr2WCQ="; }
    { family = "Nosifer"; path = "ofl/nosifer/Nosifer-Regular.ttf"; hash = "sha256-CcWsNeNNx6OX1faYtwPFZAtZz5PU00Prrk8W84WdCbg="; decor = true; }
    { family = "Rye"; path = "ofl/rye/Rye-Regular.ttf"; hash = "sha256-t+3uXmFa4bawfp0DDBMJFSvzZyoOiipGKT4nNzD1rbo="; }
    { family = "PirataOne"; path = "ofl/pirataone/PirataOne-Regular.ttf"; hash = "sha256-U0ei4VVYns9mfUt2ZhPI7gA+3en4Nxf9JMCVmaSx7MA="; }
    { family = "PressStart2P"; path = "ofl/pressstart2p/PressStart2P-Regular.ttf"; hash = "sha256-A0x38fBeyJQh5KY/DjpMoez4UsxtK/YR8SbydXKOAX0="; }
    { family = "VT323"; path = "ofl/vt323/VT323-Regular.ttf"; hash = "sha256-z03nUa2njOrAM9vhamh3QpOZlbd7wqBSrheklXlYWU0="; }
    { family = "Silkscreen"; path = "ofl/silkscreen/Silkscreen-Regular.ttf"; hash = "sha256-yEVHMzC5TCB5zprwHFGsi6LZnCT00UwDmEO7uOZC69g="; }
    { family = "RubikMonoOne"; path = "ofl/rubikmonoone/RubikMonoOne-Regular.ttf"; hash = "sha256-siYktqNuVD6UIQbt/M0ZjFC1e2W5JL/gKm8KVplCnms="; }
    { family = "Anton"; path = "ofl/anton/Anton-Regular.ttf"; hash = "sha256-pLo6kjUOuwMdoMtHYwrEnrJlCCyhvARQRC9Kg6uUfKs="; }
    { family = "AbrilFatface"; path = "ofl/abrilfatface/AbrilFatface-Regular.ttf"; hash = "sha256-WXHUo3WKkiqf7cf2+4JaljQaLnGMRaSyyaa0F8jE2+k="; }
    { family = "PlayfairDisplay"; path = "ofl/playfairdisplay/PlayfairDisplay[wght].ttf"; hash = "sha256-xA8ik3ZqUDvHDM6eUS74RKTMt8vN55L+LqMdGRkX2NY="; }
    { family = "OldStandard"; path = "ofl/oldstandardtt/OldStandard-Regular.ttf"; hash = "sha256-QnF6EoC1I6UGyisChcyjgOd/4hSx9uPXWouSUAXxnqw="; }
    { family = "SpecialElite"; path = "apache/specialelite/SpecialElite-Regular.ttf"; hash = "sha256-p3b8tM64vfA+KWdojr2tQmgN5bkafmLBfnGK4hLRS8Q="; }
    { family = "PermanentMarker"; path = "apache/permanentmarker/PermanentMarker-Regular.ttf"; hash = "sha256-KPgsinlDy46dWZ+FVNodT8ddvPabmIWtbAYR0gxpRsU="; }
    { family = "Lobster"; path = "ofl/lobster/Lobster-Regular.ttf"; hash = "sha256-1laOaX/VDO3AvgTYquQSf+la3WB+e/+VTKiGBL6AwgU="; }
    { family = "Pacifico"; path = "ofl/pacifico/Pacifico-Regular.ttf"; hash = "sha256-W2wNUzSnv3fepSuXXFoMQIh4wPcRXtW2+xUfY0t79wE="; }
    { family = "Shrikhand"; path = "ofl/shrikhand/Shrikhand-Regular.ttf"; hash = "sha256-i6MvbWqW+428kvwaz7xNISPVNIBj2JssPdeE56/Lga8="; }
    { family = "BodoniModa"; path = "ofl/bodonimoda/BodoniModa[opsz,wght].ttf"; hash = "sha256-VQ9eNO4Kgo15QbH+m8WLNOUmDT8zphUy5tCgEU55pc8="; }
    { family = "BigShouldersDisplay"; path = "ofl/bigshouldersdisplay/BigShouldersDisplay[wght].ttf"; hash = "sha256-YOII3CdqHDX8W2LpT5+5WcQMEXg6nrdUgXXBSx++tyA="; }
    { family = "SpaceMono"; path = "ofl/spacemono/SpaceMono-Regular.ttf"; hash = "sha256-lYN+GCuu6tqDNo93SNsoNX8KG3XGuE/3Blte35M8jhg="; }
    { family = "ComicNeue"; path = "ofl/comicneue/ComicNeue-Regular.ttf"; hash = "sha256-oO5aN8iyfE2wcAE32ShZix4jsAieFUaolhkJF2t3k2A="; }
    { family = "RuslanDisplay"; path = "ofl/ruslandisplay/RuslanDisplay-Regular.ttf"; hash = "sha256-b7X02waGnohspdo3YMVHxtPr7IKuvTZ48xTpmuM0ewk="; }
    { family = "RussoOne"; path = "ofl/russoone/RussoOne-Regular.ttf"; hash = "sha256-vAq8xmC9i3rTAA7LKJiifFiimlD37IFlL6EudRSNCd8="; }
    { family = "Comfortaa"; path = "ofl/comfortaa/Comfortaa[wght].ttf"; hash = "sha256-D8P0XcSLYU25w5GBUCVEs3IX7L+L7i+zWIaZK8lsW9M="; }
    { family = "Oswald"; path = "ofl/oswald/Oswald[wght].ttf"; hash = "sha256-WzjCRuJVoS9XEtZA1WvM7QRyRm/GiYPS0EEOwEV8KBc="; }
    { family = "Lalezar"; path = "ofl/lalezar/Lalezar-Regular.ttf"; hash = "sha256-e4CAe8gx8UHeD33PaBZBK/DFSJaNVIxRVso4hzM5Dqk="; fallback = true; }
    { family = "ReemKufi"; path = "ofl/reemkufi/ReemKufi[wght].ttf"; hash = "sha256-M+rRmGzUjBOMTZBsnlpjQYdyaEYfl2I0CaIBTeHNSqQ="; }
    { family = "Rubik"; path = "ofl/rubik/Rubik[wght].ttf"; hash = "sha256-Gzp0N7oq+A5GXnc+1gxQNtG6as5JLYkEbbzxj7MeTog="; fallback = true; }
    { family = "ZCOOLKuaiLe"; path = "ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf"; hash = "sha256-gSpvwf5Uttc6QZJFwy3+uoqjMQTVvpDRz2rwggB8tx0="; fallback = true; }
    { family = "NotoSans"; path = "ofl/notosans/NotoSans[wdth,wght].ttf"; hash = "sha256-v7e7aRUT8S5zTcNGwDoD94SRJDLX4/qOVu/PkG/oaz0="; fallback = true; }
    { family = "NotoSerif"; path = "ofl/notoserif/NotoSerif[wdth,wght].ttf"; hash = "sha256-TY5nYUJGVoZwGQgaGgEzbzywhpgmgmmHFAVPwz94JxM="; fallback = true; }
    { family = "NotoSansMono"; path = "ofl/notosansmono/NotoSansMono[wdth,wght].ttf"; hash = "sha256-LLKts3io9XQhPiPfaXBQuDxUwn30ZaIBVVJ0CydpoIE="; }
  ];
}
