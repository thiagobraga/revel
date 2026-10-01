# REVEL - Estrada Perdida

## Deliverable and source of truth

Two full-page desktop UI concepts: light and dark. These are visual design images, not an implemented or hosted website. Each image is 724 × 2172 px; use them as composition references rather than production text or high-resolution background files.

The supplied `Estrada Perdida` and `Petróleo` covers and REVEL logo are the identity sources. Originals are included unchanged in `assets/`. Image-generated artwork can contain small local differences between themes: the implementation must use the same original assets, crop positions, DOM, spacing and typography in both themes. Do not reproduce generated lettering or redraw the logo.

## Direction

A minimal editorial framework carrying a chaotic hardcore/crust collage. Factories, smoke, currency, gas masks, figures and the fractured road from Estrada Perdida form the page's visual structure. The art crosses section boundaries; controls remain quiet and aligned.

Neutral black, white and gray only. No sepia, chrome effects, colored platform branding, soft rounded cards or generic music-template decoration. Grain belongs mainly to the artwork and paper surfaces. Keep text itself crisp outside short display headings.

Petróleo closes the page through its actual smokestacks, smoke and worn photocopy texture. The footer deliberately has the opposite tonal polarity from the main body.

Audience: listeners, underground promoters, independent venues and people interested in the band's releases and merchandise. Primary action: listen. Secondary actions: follow upcoming shows, contact the band and explore merch.

## Page structure

| Section | Layout and content | Main interaction |
| --- | --- | --- |
| Header | Original logo left; Música, Manifesto, Agenda, Merch centered; contact and theme control right | Anchor navigation, contact, theme switch |
| Hero | Oversized two-line Estrada Perdida headline left, dominant album collage right and across the lower edge | Ouvir agora; Explorar o disco |
| Platform rail | Thin horizontal rules and monochrome text links | Verified Spotify, Bandcamp and YouTube destinations |
| Música | Square original album cover and restrained release information with two illustrative audio rows | Open verified release or play available audio |
| Manifesto | Large declaration beside a short paragraph; factory collage bridges the lower edge | Read the band's positioning |
| Agenda | Two ruled rows; no boxed dashboard cards or invented dates | Follow updates; booking contact |
| Merch | Three equally sized image columns with captions; black tee, white tee and physical release concepts | Open product or enquiry destination |
| Petróleo footer | Contrasting surface, original single-cover crop, large title and listening action | Listen to the single |
| Footer utilities | Logo, newsletter form, social/contact links and copyright | Subscribe or contact |

## Copy

Website copy is Brazilian Portuguese. Editorial copy is proposed wording, not quoted lyrics or a verified biography.

- Hero: **ESTRADA PERDIDA** / “Ruído, concreto e resistência.”
- Release: “Um caminho entre ruínas, confronto e sobrevivência. Aumente o volume.”
- Manifesto: **NENHUM SILÊNCIO. NENHUMA RENDIÇÃO.**
- Manifesto body: “Hardcore e crust em estado bruto. Música independente, feita no encontro, na urgência e no confronto.”
- Closing line: “Do palco à rua. Sem atalhos.”
- Agenda: **NOS VEMOS NO CAOS.** / “Novas datas a caminho.” / “Leve a REVEL para sua cidade.”
- Merch: **VISTA O RUÍDO.**
- Footer: **PETRÓLEO.** / “O peso que fica.”
- Newsletter: **FIQUE POR PERTO.** / “Novidades da banda. Cancele quando quiser.”

The two numbered music rows are illustrative. Do not infer a confirmed album track order, song duration or inclusion of Petróleo on Estrada Perdida. Confirm those facts before production. Merch images are concepts, not confirmed stock or product specifications. Show dates, prices, release years, member names, URLs and email addresses have intentionally not been invented.

## Theme tokens

Use one layout with CSS custom properties. Theme changes must not change content, component geometry, image dimensions or section order.

| Token | Light | Dark |
| --- | --- | --- |
| `--page` | `#EEEEEE` | `#111111` |
| `--surface` | `#E2E2E2` | `#191919` |
| `--text` | `#111111` | `#F2F2F2` |
| `--muted` | `#505050` | `#BDBDBD` |
| `--rule` | `#777777` | `#8A8A8A` |
| `--action-bg` | `#111111` | `#F2F2F2` |
| `--action-text` | `#F2F2F2` | `#111111` |
| `--footer-bg` | `#101010` | `#EEEEEE` |
| `--footer-text` | `#F2F2F2` | `#111111` |

Color is permitted only for meaningful destructive form actions if added later: a pale red surface `#FBE3E3` with dark red text `#8F2020`, or a dark red surface `#3A1D1D` with pale red text `#FFC2C2`. No destructive action is necessary in the current page. Validation can remain monochrome with an icon and explicit message.

Retain the original positive tonality of album covers and product photography. Do not apply `filter: invert()` to the whole site. Use the included black/white logo variants and theme-aware compositing for decorative collage only. The footer's image position is identical in both themes; adjust its overlay and tone to retain legibility.

## Grid, spacing and typography

- Desktop target: 1440-1920 px viewport, 12-column grid, 24-32 px gutters, 56-80 px outer margins. At 1920 px, cap prose/content at about 1680 px while artwork can extend edge to edge.
- Hero: `min-height: 100svh` including header and listening rail; do not mechanically stretch the tall concept image into a background.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96 and 128 px. Typical desktop section padding: 80-112 px; mobile: 48-64 px.
- Display type: heavy condensed grotesk, uppercase, tight leading around 0.92-1.0. Suggested implementation family: **Barlow Condensed**, weights 700-900. Font files are not bundled; acquire licensed originals before production.
- Body: **Inter** or a neutral system sans; 16-18 px desktop, at least 16 px mobile, line-height 1.5-1.65.
- Labels/navigation: **IBM Plex Mono** or system monospace; 12-14 px, moderate tracking. Avoid tiny generated-preview sizing in the actual website.
- Hero title: responsive `clamp(64px, 9vw, 172px)`. Section headings: `clamp(36px, 4.5vw, 76px)`. Preserve headline line breaks where space permits.
- Original REVEL logo is always an image, never recreated with a font. Preserve its ratio and rough perimeter.

## Components and states

Buttons have square corners, 1 px borders, minimum 44 px height and clear action text. Primary and outline styles share dimensions. Hover uses a monochrome fill change; keyboard focus uses a 2 px high-contrast outline with 3 px offset. The active theme control exposes its accessible name and pressed state.

Music rows are separated by hairlines. A real player needs play/pause, current time, duration, seeking and volume controls where relevant. Do not imply playback when no audio source is available. External streaming links must use confirmed artist/release URLs.

Agenda uses dates, city, venue and a ticket link when confirmed. Until then, show the honest empty state in the concept. Do not present “EM BREVE” as a fictional dated event.

Merch is an open three-column presentation. Products retain consistent crop ratios. Captions sit outside the image. Avoid fake prices, inventory counters and cart interactions until an actual catalog exists.

Newsletter needs a visible email label, `type="email"`, autocomplete, submit progress, success feedback and specific validation feedback. Explain the purpose of collecting email. A form provider and subscription handling are implementation dependencies; the concept does not collect data.

## Responsive behavior

| Width | Behavior |
| --- | --- |
| 1200 px and above | Full desktop navigation; hero and album split layouts; three merch columns |
| 768-1199 px | Reduced display size and gutters; hero art remains dominant; navigation condenses when needed |
| Below 768 px | Logo + theme + menu button; hero copy above collage; album/manifesto stack; agenda wraps into accessible rows; merch stacks; footer and form stack |

Mobile gutters: 20-24 px. Do not make a whole desktop canvas horizontally scroll. Keep imagery decorative where possible, crop it intentionally and prevent it from covering controls. Full album covers remain uncropped. The mobile menu supports keyboard interaction, focus return and Escape dismissal.

## Artwork and extraction inventory

| Directory/file | Purpose |
| --- | --- |
| `assets/artwork/estrada-perdida-original.jpg` | Exact supplied album cover, 1080 × 1080 |
| `assets/artwork/petroleo-original.jpg` | Exact supplied single cover |
| `assets/brand/revel-white-original.png` | Supplied transparent logo with original canvas |
| `assets/brand/revel-white.png` | Logo cropped to the original alpha bounds |
| `assets/brand/revel-black.png` | Black silhouette using the same original alpha channel |
| `assets/brand/revel-2025-original.png` | Alternate supplied logo retained as source material |
| `assets/fragments/` | Factory, road, hand, currency and refinery crops from the original covers |
| `assets/ui-extracts/` | Literal raster crops of decorative art and merch from the final UI concepts |
| `assets/manifest.json` | Source and crop notes |
| `assets/ui-extracts/manifest.json` | Exact extraction rectangles and screenshot dimensions |
| `previews/` | Both complete final UI concept images |

UI extracts are flattened screenshot crops: they are not recovered original layers, transparent cutouts or high-resolution originals. They may retain neighboring texture at their edges. Prefer the source cover crops for implementation; the UI extracts record the concept's specific compositions and merchandise mockups. Do not enlarge small merch crops for print.

## Accessibility and performance

Use semantic header, nav, main, sections and footer; one h1. Provide a skip link. Decorative collage gets empty alt text; covers and products get concise descriptive alt text. Validate 4.5:1 contrast for body text and 3:1 for large text and meaningful controls after overlays are applied. Never put long text directly over dense artwork.

Do not autoplay sound, flash artwork or animate grain continuously. Optional subtle transitions must respect reduced-motion preferences. Render typography and controls as HTML, not embedded screenshot text. Preserve image width/height to prevent layout shifts. Load the hero intentionally and lazy-load below-fold artwork; serve appropriately sized WebP/AVIF derivatives while retaining supplied originals.

## Production acceptance criteria

1. Same DOM, content, geometry and source image crop positions in both themes.
2. Original logo and cover images remain faithful; generated reinterpretations are not substituted for the official covers.
3. No horizontal overflow at 390, 768, 1440 or 1920 px viewport widths.
4. Header navigation, theme switch, listening destinations, contact and form states work with keyboard and touch.
5. Footer visibly contrasts with the body in both themes and uses the supplied Petróleo artwork.
6. No invented shows, product availability, biography, track order or functional integrations.

## Creation notes

Concept images were produced with the built-in image-generation tool. The light image was first created from the supplied album and logo, then its footer was revised using the newly supplied Petróleo cover. The dark image was requested as a theme-only edit of that final light image. Local scripts only extracted/cropped the requested assets and packaged this handoff.
