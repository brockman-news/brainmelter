# Piper voice models, pinned to a revision of https://huggingface.co/rhasspy/piper-voices
# speakers: number of speakers in the model (multi-speaker models get a random speaker per utterance)
{
  rev = "5041a7a49ae5b3a0f30e6837769eb03fdbb231bd";
  voices = {
    "en_US-libritts_r-medium" = {
      onnx = { path = "en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx"; hash = "sha256-ELuF4HHWFvz0Bx82nxeZ0EkUkqs8XVUuwZ+1SPrBMZU="; };
      json = { path = "en/en_US/libritts_r/medium/en_US-libritts_r-medium.onnx.json"; hash = "sha256-tHHcYNLYM16BnDk9GW1vv3koF/QAUSV7Jph4UFvJr7M="; };
      speakers = 904;
    };
    "en_US-libritts-high" = {
      onnx = { path = "en/en_US/libritts/high/en_US-libritts-high.onnx"; hash = "sha256-kSelWeEWA/ELNm0aIKx0JoJggdvFId5MJCDFdyjXPw8="; };
      json = { path = "en/en_US/libritts/high/en_US-libritts-high.onnx.json"; hash = "sha256-Lv3G1/lUWIuBgBMsvZuAAZM/3QCTLJK8kv0NICip6z0="; };
      speakers = 904;
      # the same 904 LibriTTS speakers as libritts_r-medium, ~3x slower to synthesize: too much for an X220
      default = false;
    };
    "en_GB-vctk-medium" = {
      onnx = { path = "en/en_GB/vctk/medium/en_GB-vctk-medium.onnx"; hash = "sha256-Tp/IWrkAk4Uxn8a65/VVd/ii1+53/ZFZpVAOtlMfQeY="; };
      json = { path = "en/en_GB/vctk/medium/en_GB-vctk-medium.onnx.json"; hash = "sha256-f4XmOR7Q9/RuSr0ZNFkpoWvpMaDJlFCG+WaS3OIIf6g="; };
      speakers = 109;
    };
    "en_US-l2arctic-medium" = {
      onnx = { path = "en/en_US/l2arctic/medium/en_US-l2arctic-medium.onnx"; hash = "sha256-2J9vEkvx53NbIXnSFBuAAcPhkWnV50PtbjViT0x28EQ="; };
      json = { path = "en/en_US/l2arctic/medium/en_US-l2arctic-medium.onnx.json"; hash = "sha256-qX4rplPp783Bvc7GSjmMi+sZrl6N/b/krWhBmD5WwHw="; };
      speakers = 24;
    };
    "en_US-arctic-medium" = {
      onnx = { path = "en/en_US/arctic/medium/en_US-arctic-medium.onnx"; hash = "sha256-SDMD4pSUej7C+RDqlgk9h24WQPV3Lp2J5RHWyCxmcoY="; };
      json = { path = "en/en_US/arctic/medium/en_US-arctic-medium.onnx.json"; hash = "sha256-2yyhpV2wHN084ormMDesUlEz6eAMpVdDDexXJkMjXv4="; };
      speakers = 18;
    };
    "de_DE-mls-medium" = {
      onnx = { path = "de/de_DE/mls/medium/de_DE-mls-medium.onnx"; hash = "sha256-ac0dKqWjWDmlGJZvzEkktfk+X4yUjtB1KxphatU/Zb8="; };
      json = { path = "de/de_DE/mls/medium/de_DE-mls-medium.onnx.json"; hash = "sha256-sK8cid39xy0y4BVymw6JuZ7sE8LIyqHbdIjZjp5XC0A="; };
      speakers = 236;
    };
    "de_DE-thorsten_emotional-medium" = {
      onnx = { path = "de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium.onnx"; hash = "sha256-wXZOZSJmzW3OvxuVxhlz31lwpfUnLpS2Vf8d35qZ0f8="; };
      json = { path = "de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium.onnx.json"; hash = "sha256-kolbnpn3z8E/Sph52mFcPW4Lqk1mDibXtoWr3Sem0dM="; };
      speakers = 8;
    };
    "fr_FR-mls-medium" = {
      onnx = { path = "fr/fr_FR/mls/medium/fr_FR-mls-medium.onnx"; hash = "sha256-DtIj94RmkX8rrgXukAls5pqx/eslH1VZDQ50ItI04WI="; };
      json = { path = "fr/fr_FR/mls/medium/fr_FR-mls-medium.onnx.json"; hash = "sha256-JSsLCm5MxJSeI+zLlW+cd5mGwy+TTy9+IZHl/cLtymE="; };
      speakers = 125;
    };
    "nl_NL-mls-medium" = {
      onnx = { path = "nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx"; hash = "sha256-iDEuD79QW4fK8jc9lME4SJLoaxvy7kgs9l3Iuhecx9M="; };
      json = { path = "nl/nl_NL/mls/medium/nl_NL-mls-medium.onnx.json"; hash = "sha256-bdshXTjxOSq5Na1FRBuCraHurgRSotaEntcepPLgqmM="; };
      speakers = 52;
    };
    "el_GR-rapunzelina-medium" = {
      onnx = { path = "el/el_GR/rapunzelina/medium/el_GR-rapunzelina-medium.onnx"; hash = "sha256-PKn7MJIhXuku38AZtD/rARX/Tf5jjrNEdIM6sd6ECVI="; };
      json = { path = "el/el_GR/rapunzelina/medium/el_GR-rapunzelina-medium.onnx.json"; hash = "sha256-OmGC7Hx1UOFO8V5dm627GPlzpDQIasllihsQmR/Rkvg="; };
      speakers = 1;
    };
    "et_EE-news-medium" = {
      onnx = { path = "et/et_EE/news/medium/et_EE-news-medium.onnx"; hash = "sha256-3dZ56HTg9uxOj3bJnO931JA0GwAapug5QVAovl0E+b8="; };
      json = { path = "et/et_EE/news/medium/et_EE-news-medium.onnx.json"; hash = "sha256-L1a7r5zSxEv0seAvs2z9MYdvftP3jKGZ8qymcn6WRBo="; };
      speakers = 4;
    };
    "es_ES-sharvard-medium" = {
      onnx = { path = "es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx"; hash = "sha256-QP6/sWecaaRQX/MR3BNuEh40GaE6KQ7yZP30Pd7dD7E="; };
      json = { path = "es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json"; hash = "sha256-dDjJtpnHKwwziNrhto0/Nk3GaiFQ/lVKHBHwM3KVeyw="; };
      speakers = 2;
    };
    "it_IT-paola-medium" = {
      onnx = { path = "it/it_IT/paola/medium/it_IT-paola-medium.onnx"; hash = "sha256-b8kYtaDqYTc4KDPd36Vnv/vmpQYMAgQ8hxku5ZwEIQw="; };
      json = { path = "it/it_IT/paola/medium/it_IT-paola-medium.onnx.json"; hash = "sha256-rqGcCn/OKfvDWbk/EOeQKFRAHkyVri6jKK5RaxXSls8="; };
      speakers = 1;
    };
    "pt_BR-faber-medium" = {
      onnx = { path = "pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx"; hash = "sha256-hYVV46BkIJxXCI/mvXDEw9xU0D6qAMRdXsr0OjP5Wqc="; };
      json = { path = "pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx.json"; hash = "sha256-fmlN4ZWuP8Nt1zLEResE+0m2SYVIk8tVBrl48NUKHW8="; };
      speakers = 1;
    };
    "pl_PL-gosia-medium" = {
      onnx = { path = "pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx"; hash = "sha256-OPZkZCQO108Ybmt9wTxuOyLgI0JimfJcKzzJ36k3P7w="; };
      json = { path = "pl/pl_PL/gosia/medium/pl_PL-gosia-medium.onnx.json"; hash = "sha256-Gu+zGp1T/+RKgWP/c+yDOst6YlOEj2uwQD2KZvnHUQ0="; };
      speakers = 1;
    };
    "ru_RU-irina-medium" = {
      onnx = { path = "ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx"; hash = "sha256-j/OCEtI9owC743BcZF5uW5R18L/eAVWOsXgT4irKqqo="; };
      json = { path = "ru/ru_RU/irina/medium/ru_RU-irina-medium.onnx.json"; hash = "sha256-wuwouzjitZ6TuVmz5ANIwa/rvScvMP7V1BIF0I6Yqdc="; };
      speakers = 1;
    };
    "uk_UA-ukrainian_tts-medium" = {
      onnx = { path = "uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx"; hash = "sha256-eSBBmsX2/YtkUFIPJLUu1aMZy1PdAY+81xyeB5y6yE8="; };
      json = { path = "uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx.json"; hash = "sha256-TpbnKRfKm5Ttx31sz+4Dpz9FC6L8HKk8LlYrwBTlqlU="; };
      speakers = 3;
    };
    "cs_CZ-jirka-medium" = {
      onnx = { path = "cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx"; hash = "sha256-y9XJAKysyOjL7NZDR6u43jnACp0xBL7Qb+6S5PMZ78g="; };
      json = { path = "cs/cs_CZ/jirka/medium/cs_CZ-jirka-medium.onnx.json"; hash = "sha256-+zixeZtzVICCJ8Bl76l7H/orDN5ZUFurtWo201r5xjc="; };
      speakers = 1;
    };
    "fi_FI-harri-medium" = {
      onnx = { path = "fi/fi_FI/harri/medium/fi_FI-harri-medium.onnx"; hash = "sha256-pEFn+qNMrtlA5PytE5/MNZIiZrJZO86+d3AXdMD7I4k="; };
      json = { path = "fi/fi_FI/harri/medium/fi_FI-harri-medium.onnx.json"; hash = "sha256-P5yfdvdK3x++cnnkHuoX1mEHV+Re/9aAi76mvnS4kW0="; };
      speakers = 1;
    };
    "sv_SE-nst-medium" = {
      onnx = { path = "sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx"; hash = "sha256-3wEfVoJaWd0e/AgMOKZaHvcEB+YPYwUOkkb0Oj1+Rx4="; };
      json = { path = "sv/sv_SE/nst/medium/sv_SE-nst-medium.onnx.json"; hash = "sha256-1F3XTLtOylhpS/BKl+JDBECSR28opVriZCTwZTCGmAo="; };
      speakers = 1;
    };
    "da_DK-talesyntese-medium" = {
      onnx = { path = "da/da_DK/talesyntese/medium/da_DK-talesyntese-medium.onnx"; hash = "sha256-uSce/SX3uElLvSjUjdZ1yMEZ2qKE8+5IgAiTX1FfEkE="; };
      json = { path = "da/da_DK/talesyntese/medium/da_DK-talesyntese-medium.onnx.json"; hash = "sha256-if4TvSUUBswAiFcNED6nrDWCMhHYRm+vkTJoq4UG9Bs="; };
      speakers = 1;
    };
    "no_NO-nvcc-medium" = {
      onnx = { path = "no/no_NO/nvcc/medium/no_NO-nvcc-medium.onnx"; hash = "sha256-P1FwKUbZVEiYRAoaZpBhVWYanWgO4QMTD/aPczYLUS4="; };
      json = { path = "no/no_NO/nvcc/medium/no_NO-nvcc-medium.onnx.json"; hash = "sha256-mEEOkR5akHasRnenmwiyD5jFT1UMQ4jimXj2uvoyuD0="; };
      speakers = 10;
    };
    "tr_TR-dfki-medium" = {
      onnx = { path = "tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx"; hash = "sha256-KERxf1JKuWXT/obmBWLLtgHT5FaDbvzCGWzDoUESqPs="; };
      json = { path = "tr/tr_TR/dfki/medium/tr_TR-dfki-medium.onnx.json"; hash = "sha256-E+vXgQ8bYbUCdYPPMTGgojO26oHDjyIA68T/QcPMoDk="; };
      speakers = 1;
    };
    "hu_HU-anna-medium" = {
      onnx = { path = "hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx"; hash = "sha256-lowMOmbLZngRJCzIhlO/+SRzlfx6BRf77vfYwIza5io="; };
      json = { path = "hu/hu_HU/anna/medium/hu_HU-anna-medium.onnx.json"; hash = "sha256-zPln2NuAGMnY/9sO3IgU/8trdSc7sNhDNzFyQPcQKDo="; };
      speakers = 1;
    };
    "ro_RO-mihai-medium" = {
      onnx = { path = "ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx"; hash = "sha256-4GCLu9U8gCZ8CezmgbCfUZn1TnkjVmhMgHNzjl8V0p8="; };
      json = { path = "ro/ro_RO/mihai/medium/ro_RO-mihai-medium.onnx.json"; hash = "sha256-jMDJ8HfcDOw8JaagVeyARtuOQKJRBZFYLyychp9LxH4="; };
      speakers = 1;
    };
    "zh_CN-huayan-medium" = {
      onnx = { path = "zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx"; hash = "sha256-mSmRe/jKuyb9Uo6kTTpmmcEehzF6FHZTEkIL4jC+Dz0="; };
      json = { path = "zh/zh_CN/huayan/medium/zh_CN-huayan-medium.onnx.json"; hash = "sha256-1SHcRVBKjMyZ4yWCKzWUbdcBhAv7B+PbsxpAkp7WqCs="; };
      speakers = 1;
    };
    "ar_JO-kareem-medium" = {
      onnx = { path = "ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx"; hash = "sha256-npXKsHtnnaYDu6F8Tex6sxETIFcZZO6VwDeWA8CGSR4="; };
      json = { path = "ar/ar_JO/kareem/medium/ar_JO-kareem-medium.onnx.json"; hash = "sha256-6m2bnZB229tr9cmMahQe8VSVnSNZcJs3hVcnlk59bE0="; };
      speakers = 1;
    };
  };
}
