# Design fidelity

The supplied dark storefront and light page with the Petróleo industrial footer are the accepted visual references. The implementation uses their extracted collage fragments, original Revel logos and original Estrada Perdida cover.

| Reference anchor | Implementation and verification |
| --- | --- |
| Wordmark and horizontal header | Original logo, compact mono navigation, rule and theme control. Mobile menu closes on Escape and returns focus. |
| Large two-line hero | Condensed uppercase hierarchy, left-aligned copy/actions and right collage with a faded inner edge. The road divider spans the lower hero. |
| Release grid | Two desktop columns, original square cover, large album heading and two ruled release rows. Stacks on mobile. |
| Manifesto and industrial strip | Two-column heading/body with a vertical rule and full-width factory artwork, stacked on mobile. |
| Agenda and merch | Ruled rows and three flat merch columns. Empty dates are honestly labeled; supplied merchandise is labeled concept. |
| Opposite footer polarity | Light Petróleo footer on dark pages, dark footer on light pages. Factory art is masked away from the title and newsletter inputs. |
| Tokens and rhythm | Supplied Barlow Condensed, Inter and IBM Plex Mono, self-hosted. Grayscale tokens avoid pure white/black, 4px rhythm and no card shadows. |
| Responsive and accessible controls | No horizontal overflow at 390, 768, 1440 and 1920 pixels. Tested keyboard menu, themes and locale; axe WCAG A/AA checks pass. |

Intentional deviations: use the original cover instead of generated mockup lettering; keep headings as accessible text with the supplied font; provide a real locale control; expose no invented track order, show dates, prices, audio playback or streaming URLs. Missing links show an availability message. The reference artwork is used as decoration, not as a substitute for editable text or form controls.

Final browser captures are generated in app/dist/screenshots/: desktop-dark.png, desktop-light.png and mobile-light.png. Regenerate with npm --prefix app run test:e2e against the production build.
