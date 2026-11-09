# Studiofoto’s

Daylight-studiofoto’s voor de image-modus. Elke foto is een Gemini-retouche van een stilstaand beeld uit de live 3D-scene, of een recolour daarvan. Geen extra onderdelen: dakrek en ladder staan uit, het dak blijft wit duo-tone met zonnedak.

Totaal in `public/renders`: **373 JPEG’s**.

| Map | Aantal | Wat |
| --- | ---: | --- |
| `public/renders/views/hero` | 48 | Hero, 8 kleuren × 6 velgen |
| `public/renders/views/front` | 48 | Front |
| `public/renders/views/rear` | 48 | Rear |
| `public/renders/views/side` | 48 | Side |
| `public/renders/views/three-quarter` | 48 | 3/4 |
| `public/renders/views/road` | 48 | Wide |
| `public/renders/views/top` | 8 | Plan, alleen kleur (normale velg) |
| `public/renders/views/wheels` | 48 | Wheels-close-up, 8 × 6 |
| `public/renders/views/cabin` | 5 | Cabin-master plus 4 leersoorten |
| `public/renders/wheels` | 24 | Oudere velg-close-ups, 6 velgen × 4 studio’s |

`public/renders/backgrounds` is leeg.

## Wat de configurator toont

Lookup zit in `src/config/nature-scenes.ts` (`viewStillCandidates`). Cache-bust: `?v=3` op de view-foto’s, `?v=6` op de oudere velgbestanden.

- **Hero, Front, Rear, Side, 3/4, Plan, Wide** volgen alleen de lak. De velg blijft de normale RETRO chrome, bestand `{kleur}-retro-daylight.jpg`. De 240 bestanden met een andere velg op die standen staan wel op schijf, maar worden niet geladen.
- **Wheels** volgt kleur én velg: `{kleur}-{velg}-daylight.jpg`. Dat is de 8 × 6-set.
- **Cabin** volgt het leer: `cabin/{leer}-daylight.jpg`.
- **Hoekstrip** gebruikt altijd de groene master van die camera: `gmanufaktur-retro-daylight.jpg`.

## Namen

```
public/renders/views/{camera}/{paint}-{wheel}-daylight.jpg
public/renders/views/cabin/{interior}-daylight.jpg
```

Camera’s: `hero`, `front`, `rear`, `side`, `three-quarter`, `wheels`, `cabin`, `top` (Plan), `road` (Wide).

Kleuren: `gmanufaktur` `#2f4a38`, `sahara` `#fccd68`, `obsidian` `#111111`, `arctic` `#f4f1ea`, `nardo` `#6e7276`, `midnight` `#152238`, `rosso` `#8b1e1e`, `bronze` `#8a6a43`.

Velgen: `retro`, `oem`, `oem-black`, `retro-black`, `retro-bronze`, `retro-paint`.

Leer: `saddle`, `espresso`, `ivory`, `black`.

## Hoe ze gemaakt zijn

Model `gemini-3-pro-image` (override `GEMINI_IMAGE_MODEL`). Request: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` met header `x-goog-api-key`, `responseModalities: ["IMAGE"]`, `imageConfig: { aspectRatio: "16:9", imageSize: "2K" }`. Uitvoer is 2752×1536. Een antwoord kleiner dan 200 KB werd weggegooid en opnieuw gevraagd. De sleutel komt uit `.env` en hoort niet in dit bestand of in git.

De generators stonden in `/tmp` en zitten niet in de repo: `gw-daylight-photo.mjs`, `gw-daylight-retry.mjs`, `gw-variants.mjs`, `gw-wheel-matrix.mjs`.

### 1. 3D-platen

Negen stilstaande JPEG’s uit de live canvas, 1280×720, daylight studio, lak `gmanufaktur`, velg `retro`. Dakrek en ladder verborgen. Bewaard in `/tmp/gw-daylight-3d/{camera}.jpg`, niet in de repo.

De camera stond stil voordat het frame werd gepakt. Voor Wheels werd de camera rechtstreeks op de preset gezet: positie `[2.55, 0.72, 2.15]`, target `[0.95, 0.42, 1.35]`.

### 2. Negen masters

`gw-daylight-photo.mjs` stuurde elke plaat naar Gemini met de opdracht: alleen de afwerking fotorealistisch maken (hoogglans clearcoat, zacht contactschaduw, fijne korrel), niets toevoegen of verplaatsen, dak vlak wit, geen dakbox, rek, rails, ladder of extra lamp.

Resultaat: `public/renders/views/{camera}/gmanufaktur-retro-daylight.jpg` voor alle negen camera’s.

Side en Wheels zijn daarna opnieuw gedaan met `gw-daylight-retry.mjs`. Side had een tweede cabine verzonnen; de retry eist één voertuig. De Wheels-retry houdt de Mercedes-ster in de naafdop.

### 3. Lak op de wijde standen

`gw-variants.mjs` herkleurde elke master behalve Cabin. Bron is de groene RETRO-foto van die camera. Alleen de groene lak verandert; wit dak, ramen en velgen blijven.

Zeven kleuren × zeven standen (Hero, Front, Rear, Side, 3/4, Plan, Wide) = 49 foto’s, naam `{kleur}-retro-daylight.jpg`. Plan heeft alleen deze set, daarom 8 bestanden inclusief de groene master.

### 4. Wheels, 8 kleuren × 6 velgen

Groene close-ups van de vijf niet-chrome velgen zijn kopieën van `public/renders/wheels/{velg}-daylight.jpg` naar `views/wheels/gmanufaktur-{velg}-daylight.jpg`. De groene RETRO-close-up is de Gemini-master en is niet overschreven.

`gw-wheel-matrix.mjs` herkleurde die zes groene close-ups naar de zeven andere lakken (42 foto’s). De prompt eist dat spatbord, deur en wielkast allemaal de nieuwe kleur zijn, zonder restgroen, en dat velg, band, naafdop, camera en crop gelijk blijven.

Samen met de zes groene close-ups: 48 bestanden.

Een eerdere, zwakkere prompt schilderde alleen de wielkast. Die bestanden zijn door deze run vervangen.

### 5. Velgwissels op de wijde standen

Dezelfde `gw-variants.mjs` wisselde daarna alleen de velg op Hero, Front, Rear, Side, 3/4 en Wide, voor alle 8 lakken en de 5 niet-chrome velgen. Bron is `{kleur}-retro-daylight.jpg` van die stand. 6 × 8 × 5 = 240 foto’s.

Die set is compleet, maar de image-modus laadt ze niet meer. Op die standen blijft de normale chrome velg zichtbaar. Het velgontwerp zit alleen in de Wheels-close-up.

### 6. Interieur

`cabin/saddle-daylight.jpg` is een kopie van de groene cabin-master. Espresso, ivory en black zijn recolours van die saddle-foto: alleen het zadelbruine leer verandert, dashboard, stuur, schermen en crop blijven.

### 7. Oudere velg-close-ups

`public/renders/wheels/{velg}-{studio}.jpg`: zes velgen in `daylight`, `alm`, `wald` en `road`. Dit zijn de eerdere fotografische close-ups. Alleen `{velg}-daylight.jpg` is nog een fallback als een Wheels-foto ontbreekt. Alm, Bergwald en Outdoor worden in de UI niet meer aangeboden.

## Wat er niet meer is

Eerdere batches met verzonnen Alm-, Bergwald- en Outdoor-achtergronden zijn verwijderd. De map `views/road` is de Wide-camera en hoort te blijven; de bestanden daar heten `*-daylight.jpg`.
