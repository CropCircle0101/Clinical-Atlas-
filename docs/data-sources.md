# Provider data sourcing and review

Investigated November 5, 2026 against the following primary sources:

- [CMS NPI Registry](https://npiregistry.cms.hhs.gov/): public identity, taxonomy and practice-address search. CMS explicitly says NPI issuance does not ensure licensure or credentialing.
- [CMS NPPES dissemination](https://www.cms.gov/medicare/regulations-guidance/administrative-simplification/data-dissemination): downloadable data for a future bulk pipeline. Dataset format, current release and applicable terms must be checked before importing a release.
- [NPI Registry API](https://npiregistry.cms.hhs.gov/api-page): the MVP stages a single active organization identity using API version 2.1. The endpoint is fixed server-side; records remain unpublished.
- [CMS Doctors and Clinicians catalog](https://data.cms.gov/provider-data/topics/doctors-clinicians) and [CMS About the Data](https://www.cms.gov/medicare/quality/physician-compare-initiative/about-data): potential Medicare-related clinician, group, location and affiliation enrichment. Relevant datasets have different scopes and refresh cycles; use the matching data dictionary and release metadata.

NPPES name/taxonomy/address fields are leads. They may be self-reported, stale, incomplete, or unsuitable for public practice display. Medicare enrollment or historical utilization does not demonstrate that a clinic currently offers a test, accepts a commercial plan, charges a particular price, or has an available appointment. Medicare data does not cover the entire US market.

For this MVP, NPPES import stores only an active organization name, NPI and pending registry source. It deliberately does not import street addresses or personal contacts. An editor independently supplies public practice information. No clinician is automatically converted into a clinic, no service is inferred from a taxonomy code, and no real NPI is included in fictional demo records.

The publication gate requires independently reviewed identity, address and specialty evidence plus a scoped source for every service. All must have been reviewed within 180 days. Known starting prices and insurance require additional evidence; unknown fields remain unknown. Registry/CMS URLs alone cannot satisfy this MVP’s publication gate. Licensure, when investigated, must be checked against the relevant state authority; the app does not assert license status from an NPI.

A future bulk pipeline should pin a release, whitelist public organization fields, stage normalized candidates, deduplicate by organization NPI and reviewed location, validate coordinates, suppress residential/private records, reconcile changes without overwriting reviewed facts, and queue human review. Preserve per-field provenance and timestamps, and remove or archive withdrawn providers. Refresh scheduling and automatic CMS bulk ingestion are not implemented.

Fictional demo records are permanently flagged `is_demo`; live queries exclude them. Source review records are assertions by an administrator, not clinical quality certification. Never infer efficacy or list unsupported anti-aging/rejuvenation claims.
