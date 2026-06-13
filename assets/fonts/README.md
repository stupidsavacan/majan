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

After the TTF is present, Phase 3 should convert it to base64 and embed it into CSS with `@font-face` using a `data:` URL.

Do not use Google Fonts, CDN, `fetch()`, `@import url(...)`, or any external font request. The final game must work fully offline by opening the root `index.html` directly.
