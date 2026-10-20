{
  lib,
  python3Packages,
  fetchurl,
  runCommand,
  piper-tts,
  espeak-ng,
  # names from ./voices.nix to bundle; null = every voice not marked `default = false` (~1.9 GB of models)
  voiceNames ? null,
}:

let
  voiceData = import ./voices.nix;
  fontData = import ./fonts.nix;

  selectedVoices =
    if voiceNames == null then
      lib.filterAttrs (_: voice: voice.default or true) voiceData.voices
    else
      lib.getAttrs voiceNames voiceData.voices;

  fetchVoiceFile =
    file:
    fetchurl {
      url = "https://huggingface.co/rhasspy/piper-voices/resolve/${voiceData.rev}/${file.path}";
      inherit (file) hash;
    };

  voices = runCommand "brainmelter-piper-voices" { } ''
    mkdir $out
    ${lib.concatStrings (
      lib.mapAttrsToList (name: voice: ''
        ln -s ${fetchVoiceFile voice.onnx} $out/${name}.onnx
        ln -s ${fetchVoiceFile voice.json} $out/${name}.onnx.json
      '') selectedVoices
    )}
  '';

  fontFile =
    font:
    fetchurl {
      name = "${font.family}.ttf";
      url = "https://raw.githubusercontent.com/google/fonts/${fontData.rev}/${
        lib.replaceStrings [ "[" "]" "," ] [ "%5B" "%5D" "%2C" ] font.path
      }";
      inherit (font) hash;
    };

  fontIndex = builtins.toJSON (
    map (font: {
      inherit (font) family;
      file = "${font.family}.ttf";
      fallback = font.fallback or false;
      decor = font.decor or false;
    }) fontData.fonts
  );

  fonts = runCommand "brainmelter-fonts" { inherit fontIndex; passAsFile = [ "fontIndex" ]; } ''
    mkdir $out
    cp $fontIndexPath $out/fonts.json
    ${lib.concatMapStrings (font: ''
      ln -s ${fontFile font} $out/${font.family}.ttf
    '') fontData.fonts}
  '';

  piper = python3Packages.toPythonModule (
    piper-tts.override {
      withTrain = false;
      withHTTP = false;
      withAlignment = false;
    }
  );
in
python3Packages.buildPythonApplication {
  pname = "brainmelter-web";
  version = "0.1.0";
  pyproject = true;
  src = ../web;

  build-system = [ python3Packages.setuptools ];
  dependencies = [
    python3Packages.aiohttp
    piper
  ];

  makeWrapperArgs = [
    "--set-default BRAINMELTER_VOICES ${voices}"
    "--set-default BRAINMELTER_FONTS ${fonts}"
    "--prefix PATH : ${lib.makeBinPath [ espeak-ng ]}"
  ];

  passthru = { inherit voices fonts; };

  meta = {
    description = "Overwhelming news installation: brockman.news headlines in thousands of voices and dozens of fonts";
    mainProgram = "brainmelter-web";
    license = lib.licenses.mit;
  };
}
