# Yuji Mai font assets

This directory is reserved for the Yuji Mai font used by the mahjong tile renderer.

Expected files:

```txt
assets/fonts/YujiMai-Regular.ttf
assets/fonts/OFL.txt
```

`OFL.txt` is already included.

The font file itself should be uploaded as a binary file:

```txt
assets/fonts/YujiMai-Regular.ttf
```

After the TTF is present, the `Embed Yuji Mai font` workflow generates the offline CSS file:

```txt
extracted-zips/offline-sanma-mahjong-phase1/src/styles/yuji-mai-embedded.css
```

The workflow intentionally embeds only the mahjong tile glyph subset used by the renderer:

```txt
一二三四五六七八九萬東南西北發中
```

This keeps the offline tile face font available without embedding the full Yuji Mai font. The generated CSS uses a WOFF2 data URL and a matching `unicode-range` so non-tile UI text can keep using the normal system font stack.

Do not use Google Fonts, CDN, `fetch()`, `@import url(...)`, or any external font request. The final game must work fully offline by opening the root `index.html` directly.
