{
  lib,
  stdenv,
  rustPlatform,
  importNpmLock,
  cargo-tauri,
  nodejs,
  pkg-config,
  wrapGAppsHook4,
  python3,
  at-spi2-atk,
  atkmm,
  cairo,
  gdk-pixbuf,
  glib,
  gtk3,
  harfbuzz,
  librsvg,
  libsoup_3,
  openssl,
  pango,
  libayatana-appindicator,
  udev,
  webkitgtk_4_1,
  ...
}:
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "chrultrabook-tools";
  version = (builtins.fromJSON (builtins.readFile (finalAttrs.src + "/package-lock.json"))).version;
  src = ./.;

  cargoDeps = rustPlatform.importCargoLock {
    lockFile = ./src-tauri/Cargo.lock;
  };

  npmDeps = importNpmLock {
    npmRoot = ./.;
  };

  postPatch = ''
    substituteInPlace $cargoDepsCopy/libappindicator-sys-*/src/lib.rs \
      --replace-fail "libayatana-appindicator3.so.1" "${libayatana-appindicator}/lib/libayatana-appindicator3.so.1"
  '';

  nativeBuildInputs = [
    cargo-tauri.hook
    nodejs
    importNpmLock.npmConfigHook
    pkg-config
    wrapGAppsHook4
    python3
  ];

  buildInputs = [
    at-spi2-atk
    atkmm
    cairo
    gdk-pixbuf
    glib
    gtk3
    harfbuzz
    librsvg
    libsoup_3
    openssl
    pango
  ]
  ++ lib.optionals stdenv.hostPlatform.isLinux [
    libayatana-appindicator
    udev
    webkitgtk_4_1
  ];

  cargoRoot = "src-tauri";
  buildAndTestSubdir = finalAttrs.cargoRoot;
  doCheck = false;

  meta = with lib; {
    description = "User-friendly configuration utility for Chromebooks running an alternate OS ";
    homepage = "https://github.com/death7654/Chrultrabook-Tools";
    license = licenses.gpl3;
    platforms = [
      "x86_64-linux"
      "aarch64-linux"
    ];
  };
})
