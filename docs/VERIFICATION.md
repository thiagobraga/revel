# Bootstrap verification

Verified locally on Node 24.19.0 using real PostgreSQL 16.15, Redis 7.0.15 and Chromium 153. The API ran as a compiled Node service and the frontend as the production Next.js standalone server. The Browser plugin was unavailable, so browser verification used regular Playwright with the available Chromium binary.

| Check | Result |
| --- | --- |
| API lint, strict typecheck and build | Passed |
| API unit/integration coverage | 30 tests passed. 100% lines, statements, branches and functions across 16 API modules. Types, fixtures and executable startup/CLI wrappers are excluded from the unit coverage denominator; CLI migration/provisioning and server startup were exercised separately. |
| App lint, strict typecheck and production build | Passed |
| App unit coverage | 52 tests passed. 100% lines, statements, branches and functions across all 32 frontend source modules, excluding types and test fixtures. Includes routes, metadata, CSP, auth, primitives, forms, PWA controls, sync and offline behavior. |
| Production Playwright | Nine tests passed: show CRUD, ordered offline replay, realtime across editors, offline logout wipe, cross-browser preferences, responsive themes/locales, security headers/manifest, offline navigation fallback and Chromium installability. |
| Instrumented build and E2E | Five applicable browser tests passed with Istanbul instrumentation; service worker checks use the normal production build. HTML coverage reports can be generated and served by the debug coverage service. |
| Lighthouse | Performance 83, accessibility 100, best practices 96, SEO 100 on the local mobile audit. This is a local lab result, not a production-host performance measurement. |
| Accessibility/layout | axe WCAG A/AA passed; keyboard menu focus and Escape tested; no overflow at 390, 768, 1440 and 1920 pixels. |
| JavaScript budget | About 1.34 MB total generated JavaScript, below the enforced 2.5 MB output budget. |
| Dependency audit | Both packages report zero vulnerabilities. |
| SQL migrations | Fresh apply, repeat apply, concurrent advisory locking, changed-checksum rejection and rollback after failing SQL passed against PostgreSQL. |
| Backup/restore drill | A custom-format pg_dump restored successfully into a separate database with pg_restore --exit-on-error; show row counts matched. |
| Compose/workflow YAML and shell syntax | Parsed successfully; hooks activated and executable. |

Desktop and narrow captures are generated at app/dist/screenshots/desktop-dark.png, desktop-light.png and mobile-light.png. The supplied reference images were compared with these captures; findings are in DESIGN-FIDELITY.md.

Not verified in this execution environment: Docker development boot, production image builds, hardened production compose boot, host Traefik/mkcert configuration, a real production domain, Resend delivery/DNS, the deploy receiver and a configured Claude GitHub App. There is no Docker daemon or container capability here. Quality CI includes real PostgreSQL/Redis, browser coverage, Lighthouse, image builds and production compose boot with generated dummy secrets. CI results must pass before deployment. Production secrets, sending-domain records and deploy credentials remain external configuration.
