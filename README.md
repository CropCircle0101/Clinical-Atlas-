# ClinicAtlas

A responsive US healthcare discovery MVP built with **Next.js App Router, TypeScript, Tailwind CSS, MapLibre GL JS and PostgreSQL/PostGIS**. Describe a specialty or diagnostic service, then explore matching stored clinic records on a map and synchronized list.

**The included 20 clinic listings are fictional.** Names, addresses, offerings, prices and insurance are sample data, with approximate city-center coordinates. Demo profiles disable contact links and never claim independent verification. This is a directory, not a diagnostic or treatment recommendation service.

## Run the demo

Requirements: Node.js 22.13+ (tested with 24), pnpm 11.25, and network access for map tiles. Use Corepack or install pnpm from its official package.

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

PowerShell: use `Copy-Item .env.example .env.local` instead of `cp` if preferred. Open **http://127.0.0.1:3000**. The example has `DEMO_MODE=true`; no database or AI key is needed for the demo. A demo review workspace is available at `/admin` with every mutation disabled.

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

The installed dependencies are pinned in `pnpm-lock.yaml`. The workspace explicitly permits esbuild’s package installation script. No external fonts, analytics or clinical image assets are required.

## Connect PostgreSQL/PostGIS

1. Start PostgreSQL with PostGIS, locally with `docker compose up -d db` or through a managed provider that supports PostGIS. The Compose credentials are for local development only; its port is bound to loopback.
2. Set `DATABASE_URL` in `.env.local`. For a remote database, set `DATABASE_SSL=true` and use a trusted certificate chain. The app never disables certificate validation. Keep credentials out of Git.
3. Run `pnpm db:migrate`. The migration creates PostGIS, normalized tables, geographic indexes and the read view, then upserts catalog dictionaries. It uses a transaction, migration ledger and advisory lock. Initial extension creation requires appropriate DB privileges; runtime credentials should have fewer privileges.
4. Set `DEMO_MODE=false`, set `ADMIN_SECRET` to at least 32 random characters and set `APP_ORIGIN` to the exact browser origin. Restart the app.
5. Visit `/admin` and sign in with the configured access key. Create a draft or stage an active organization NPI. Add the public practice address and reviewed coordinates, explicit services, and independent source URLs. Open each source before recording its review. Publish only when all requirements pass.

An empty live database intentionally shows **zero listings**. AI never fills gaps. Optional `pnpm db:seed` writes fictional records as drafts with `is_demo=true`; live discovery excludes them. Demo mode reads the versioned fixture directly and never silently substitutes it for a failed live database.

The shared-key admin login is suitable for a controlled MVP. It uses timing-safe key comparison and a four-hour HMAC-signed, HttpOnly, SameSite=Strict cookie, Secure in production. There is no default key. Rotate `ADMIN_SECRET` to invalidate sessions. Add individual accounts, MFA, roles and per-reviewer audit identity before a multi-editor launch.

## Working features

- Off-white, navy and teal interface, desktop list/map split and mobile map/list switch.
- MapLibre geographic markers, zoom-based clustering, cluster expansion, numbered cards and markers, card selection, map selection, “search this area,” and US-wide view including Alaska and Hawaii.
- Natural-language catalog matching for named services/specialties and explicit location, distance, price, insurance and telehealth constraints. Unrecognized or ambiguous mixed procedures fail closed instead of returning unrelated matches. Multiple requested services must all be present. The local parser is deliberately conservative; it is not a general medical language model.
- Optional server-side AI intent extraction through the OpenAI Responses API with strict JSON Schema, runtime validation, bounded timeout and catalog fallback. It produces filters only; records come exclusively from the repository/database. No symptom-to-diagnosis or symptom-to-treatment inference.
- City, state and known ZIP lookup from directory locations; PostGIS `ST_DWithin` radius filtering in meters with mile conversion and nearest matching location selection. Optional Stadia geocoding handles additional cities/ZIPs. Unknown locations generate a visible error instead of a nationwide fallback.
- Clinic profiles with services, specialties, address, source scope and review date, known pricing/coverage, website and telephone links for live records.
- Protected admin API for draft creation/editing, scoped source review, publication and archival. Edits withdraw publication and reset source reviews. Publication requires independently reviewed identity/address/specialty plus a source for every service, and source evidence for price/insurance when supplied. Reviews must be within 180 days at publication. NPPES/CMS identity alone cannot meet these requirements. A listing’s review is not a quality rating or licensure certificate.
- Server-side NPPES organization identity staging. Only name and NPI are stored, alongside a pending source. No services, clinician license claims, residential addresses or contact-person details are imported. The reviewer supplies a public practice location and coordinates.
- Page-memory-only saved clinics. No account, browser storage or persisted shortlist.

## Optional AI configuration and privacy

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4.1-mini`). The key is used only by server code. Users must select **Use AI parsing** for search text to leave the app for AI processing. Without the key, the app gives a visible catalog fallback notice. AI refusals, timeouts, incomplete responses and invalid output never become provider data.

The app uses [`text.format` structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) with `store:false`. That disables response storage; it does not promise zero upstream retention. Review your provider’s processing policies before operating a public health-related service.

Search uses POST JSON, `Cache-Control: no-store`, no query-string history, no search table and no raw request/error-payload logging. Avoid submitting sensitive health information; none is needed for directory matching. Configure hosting, tracing and error-monitoring infrastructure to exclude request bodies and health-related searches. Map rendering contacts third-party map services. Optional geocoding sends only location text, never the clinical query.

## Maps and geocoding

The default style is Stadia Maps Alidade Smooth, with source attribution retained by MapLibre. [Stadia allows localhost development without authentication](https://docs.stadiamaps.com/authentication/), subject to limits. Before production, create an appropriate Stadia account/subscription and register the deployment’s domain. The plan must permit the intended usage; localhost access is not a production license. Keep required [attribution](https://stadiamaps.com/attribution/) visible. Set `NEXT_PUBLIC_MAP_STYLE_URL` if using another licensed compatible style. Do not point the app at an unapproved public OSM tile endpoint.

`STADIA_API_KEY` optionally enables server-side US place lookup beyond cities/ZIPs already in directory records. Verify current provider terms for geocoding, storage and usage. Map clicks and camera movement do not request user geolocation. If tiles fail, the list and filters remain available.

## Data model and CMS investigation

`db/migrations/001_initial.sql` defines `clinics`, `locations`, `specialties`, `services`, join tables, `clinic_insurance`, `verification_sources`, `admin_audit` and the `clinic_directory` JSON read view. Location geography is generated from longitude/latitude and indexed with GiST. All dynamic search values use parameter binding. Public queries require `published` and `is_demo=false`. Runtime search results are capped at 200 with a total count; narrow filters or map area to refine larger result sets. The admin queue is capped at 100 for the MVP. The form currently edits one location per clinic; the data model and profiles support multiple locations.

See [docs/data-sources.md](docs/data-sources.md) for research and the ingestion policy. NPPES is an identity/taxonomy/address lead, **never proof of licensure, a specific offering, insurance acceptance, pricing or efficacy**. CMS Doctors and Clinicians data is a potential enrichment source, not a complete nationwide commercial directory. This app does not claim unproven anti-aging treatments work.

## API and security

| Route                          | Behavior                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `POST /api/search`             | `{ query, useAI, filters }`; returns stored records, total, structured intent, parser, mode and notice |
| `POST /api/admin/session`      | Admin access-key login; signed cookie                                                                  |
| `DELETE /api/admin/session`    | Clear cookie                                                                                           |
| `GET /api/admin/clinics`       | Authenticated review queue                                                                             |
| `POST /api/admin/clinics`      | Create unpublished draft                                                                               |
| `PUT /api/admin/clinics/:id`   | Replace draft, withdraw publication and reset evidence                                                 |
| `PATCH /api/admin/clinics/:id` | `verify-source`, `publish` or `archive`                                                                |
| `POST /api/admin/import/nppes` | Stage active NPI-2 organization identity only                                                          |

Mutations enforce exact origin checks; production requires `APP_ORIGIN`. JSON request limits are checked while streaming; schema validation, bounded AI calls, rate limits, secure cookie settings and baseline security headers are implemented. Server-side fetch targets are fixed, so evidence URLs are never fetched by the server. Clinic/source URLs must be HTTPS without embedded credentials. No public ingestion route exists.

Rate limits are **in-memory per server process**. By default they are shared rather than trusting spoofable proxy headers. Only enable `TRUST_PROXY=true` behind a proxy that overwrites `X-Forwarded-For`. Configure a shared limiter/WAF for multiple instances and public traffic. Search limits and admin authentication complement each other; this MVP is not a complete abuse-prevention or medical compliance program.

## Validation and remaining dependencies

The unit suite covers stored-record-only matching, unsupported requests, all-services constraints, radius/bounds/state matching, unknown-price/coverage handling, draft exclusion, schema rejection, NPI check digits, session tampering/expiration, origin checks, body-size limits, publication freshness and NPI-only rejection. `pnpm build` includes a full TypeScript check. Browser QA covers responsive presentation and primary search/profile interactions.

Before a live launch, provision and validate PostgreSQL/PostGIS, configure production origin/secrets and licensed map access, test AI and NPPES against live credentials/network access, and review actual provider evidence. No real provider dataset is included. Bulk CMS ingestion, periodic refresh jobs, per-editor identity, service-level pricing, exhaustive nationwide location gazetteer, distributed rate limiting and production operational monitoring remain future work. PostgreSQL integration tests require `TEST_DATABASE_URL` and are skipped explicitly if it is absent; CI provides a disposable PostGIS service. There is no automatic deployment configuration for this Node/PostGIS application.

Repository: [CropCircle0101/Clinical-Atlas-](https://github.com/CropCircle0101/Clinical-Atlas-).
