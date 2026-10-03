# Bootstrap verification

Verified locally on Node 24.19.0 using real PostgreSQL 16.15, Redis 7.0.15 and Chromium 153. The API ran as a compiled Node service and the frontend as the production Next.js standalone server. The Browser plugin was unavailable, so browser verification used regular Playwright with the available Chromium binary.

| Check | Result |
| --- | --- |
| API lint, strict typecheck and build | Passed |
| API unit/integration coverage | 31 tests passed. 100% lines, statements, branches and functions across 16 API modules. Types, fixtures and executable startup/CLI wrappers are excluded from the unit coverage denominator; CLI migration/provisioning and server startup were exercised separately. |
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
| GitHub package quality | API and app jobs passed, including both 100% coverage gates, production browser tests, headless Lighthouse and instrumented browser coverage. |
| Production image/security checks | Both images built and passed the high/critical Trivy gate. CodeQL, npm audit and SBOM generation passed. |
| Docker development/production boot | CI booted the hardened production stack with dummy secrets, ran migrations once and received a healthy response through the gateway. The development stack also booted with the runner UID/GID and returned a healthy API response. |

Desktop and narrow captures are generated at app/dist/screenshots/desktop-dark.png, desktop-light.png and mobile-light.png. The supplied reference images were compared with these captures; findings are in DESIGN-FIDELITY.md.

GitHub evidence: [quality pipeline](https://github.com/thiagobraga/revel/actions/runs/36955592073) and [security pipeline](https://github.com/thiagobraga/revel/actions/runs/36955591770). The local environment has no Docker daemon or container capability, so Docker builds and boot checks were performed on the hosted CI runner.

GitHub's dependency-review action reports that the feature is unavailable for this repository and asks for Dependency graph to be enabled. The workflow keeps its high-severity gate; it has not been bypassed. Check Dependency graph availability in repository Settings / Advanced Security and rerun the review check; its actual setting state could not be inspected through the connector. [Repository security settings](https://github.com/thiagobraga/revel/settings/security_analysis).

Not verified: host Traefik/mkcert configuration, production DNS/TLS/live release at the selected revel.thiagobraga.dev domain, Resend delivery/DNS, the deploy receiver and a configured Claude GitHub App. Production secrets, sending-domain records and deployment credentials remain external configuration. Successful dummy-secret boot is not evidence of a configured production deployment.

## Production domain preparation

Configured revel.thiagobraga.dev for the existing VPS. The follow-up change passed frontend lint/typecheck, all 52 tests at 100% coverage, the production build and the 1.36 MB JavaScript budget check. Two metadata/CSP regression tests failed before the runtime SITE_URL change and passed afterward. The same compiled standalone build was then started with two different runtime HTTPS origins; both actual HTML responses used the matching Open Graph artwork URL and secure WebSocket CSP. Compose/workflow YAML parsed and the gateway assertion script passed syntax validation.

Hosted CI now checks actual production gateway health, metadata/CSP, secure CSRF cookies, anonymous-access rejection and PWA responses. Its latest result will be recorded after completion. DNS lookup from this environment returned a temporary resolution failure, so no missing-record claim or live-host verification is made. The attempted GitHub setting inspection was blocked because browser permission was declined; dependency-review remains enforced and unresolved.
