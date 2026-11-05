CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE clinics (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  website text,
  phone text,
  npi char(10) UNIQUE,
  is_demo boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  telehealth boolean,
  price_from numeric(10,2) CHECK (price_from >= 0),
  price_note text,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE locations (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  address text NOT NULL,
  city text NOT NULL,
  state char(2) NOT NULL,
  postal_code text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  coordinates geography(Point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography) STORED
);
CREATE INDEX locations_coordinates_idx ON locations USING gist(coordinates);
CREATE INDEX locations_clinic_idx ON locations(clinic_id);
CREATE INDEX locations_state_idx ON locations(state);
CREATE INDEX clinics_public_idx ON clinics(status,is_demo);
CREATE TABLE specialties (id text PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE services (id text PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE clinic_specialties (
  clinic_id text REFERENCES clinics(id) ON DELETE CASCADE,
  specialty_id text REFERENCES specialties(id),
  PRIMARY KEY (clinic_id,specialty_id)
);
CREATE TABLE clinic_services (
  clinic_id text REFERENCES clinics(id) ON DELETE CASCADE,
  service_id text REFERENCES services(id),
  PRIMARY KEY (clinic_id,service_id)
);
CREATE TABLE clinic_insurance (
  clinic_id text REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  PRIMARY KEY (clinic_id,name)
);
CREATE TABLE verification_sources (
  id text PRIMARY KEY,
  clinic_id text NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('identity','address','specialty','service','insurance','price','license')),
  service_id text REFERENCES services(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified')),
  checked_at timestamptz,
  CHECK ((scope = 'service' AND service_id IS NOT NULL) OR (scope <> 'service' AND service_id IS NULL)),
  CHECK (status <> 'verified' OR checked_at IS NOT NULL)
);
CREATE INDEX verification_clinic_idx ON verification_sources(clinic_id);
CREATE TABLE admin_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clinic_id text REFERENCES clinics(id),
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- No search history, patient, symptom, or user-health tables.
CREATE VIEW clinic_directory AS
SELECT c.id, c.slug, c.name, c.description, c.website, c.phone, c.npi,
  c.is_demo AS "isDemo", c.status, c.telehealth, c.price_from::float8 AS "priceFrom",
  c.price_note AS "priceNote", c.last_verified_at AS "lastVerifiedAt",
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'address',l.address,'city',l.city,'state',l.state,'postalCode',l.postal_code,'latitude',l.latitude,'longitude',l.longitude) ORDER BY l.id) FROM locations l WHERE l.clinic_id=c.id),'[]') AS locations,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) ORDER BY s.name) FROM specialties s JOIN clinic_specialties cs ON cs.specialty_id=s.id WHERE cs.clinic_id=c.id),'[]') AS specialties,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name) ORDER BY s.name) FROM services s JOIN clinic_services cs ON cs.service_id=s.id WHERE cs.clinic_id=c.id),'[]') AS services,
  COALESCE((SELECT jsonb_agg(ci.name ORDER BY ci.name) FROM clinic_insurance ci WHERE ci.clinic_id=c.id),'[]') AS insurance,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'label',v.label,'url',v.url,'scope',v.scope,'status',v.status,'checkedAt',v.checked_at,'serviceId',v.service_id) ORDER BY v.scope,v.id) FROM verification_sources v WHERE v.clinic_id=c.id),'[]') AS sources
FROM clinics c;
