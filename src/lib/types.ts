export type Offering = { id: string; name: string };
export type VerificationSource = {
  id: string;
  label: string;
  url: string;
  scope: "identity" | "address" | "specialty" | "service" | "insurance" | "price" | "license";
  status: "pending" | "verified";
  checkedAt: string | null;
  serviceId?: string | null;
};
export type ClinicLocation = {
  id: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
};
export type Clinic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  website: string | null;
  phone: string | null;
  npi: string | null;
  isDemo: boolean;
  status: "draft" | "published" | "archived";
  telehealth: boolean | null;
  priceFrom: number | null;
  priceNote: string | null;
  insurance: string[];
  specialties: Offering[];
  services: Offering[];
  locations: ClinicLocation[];
  sources: VerificationSource[];
  lastVerifiedAt: string | null;
  distanceMiles?: number;
  matchedLocationId?: string;
};
export type SearchIntent = {
  specialtyIds: string[];
  serviceIds: string[];
  terms: string[];
  location: string | null;
  radiusMiles: number | null;
  telehealth: boolean | null;
  insurance: string | null;
  maxPrice: number | null;
  unsupported: boolean;
};
export type SearchFilters = {
  location?: string;
  radiusMiles?: number;
  specialtyId?: string;
  serviceId?: string;
  telehealth?: boolean;
  insurance?: string;
  maxPrice?: number;
  bounds?: [number, number, number, number];
};
export type SearchResponse = {
  clinics: Clinic[];
  total: number;
  intent: SearchIntent;
  mode: "demo" | "live";
  parser: "catalog" | "ai" | "fallback";
  notice: string | null;
};
export type ResolvedPlace = {
  label: string;
  latitude: number;
  longitude: number;
  state?: string;
  stateOnly?: boolean;
};
