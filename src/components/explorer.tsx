"use client";
import { useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Sparkles,
  LockKeyhole,
  ArrowUpRight,
  ScanLine,
  Activity,
  Stethoscope,
  Video,
  ChevronDown,
  LayoutList,
  Map,
  Heart,
  LoaderCircle,
  RotateCcw,
  Info,
} from "lucide-react";
import { ClinicCard } from "./clinic-card";
import { insuranceOptions, services, specialties } from "@/lib/catalog";
import type { Clinic, SearchFilters, SearchResponse } from "@/lib/types";
const ClinicMap = dynamic(() => import("./clinic-map"), {
  ssr: false,
  loading: () => <div className="map-panel map-loading">Loading map…</div>,
});

export function Explorer({
  initialClinics,
  initialTotal,
  mode,
  unavailable = false,
}: {
  initialClinics: Clinic[];
  initialTotal: number;
  mode: "demo" | "live";
  unavailable?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [filters, setFilters] = useState<SearchFilters>({}),
    [result, setResult] = useState<{ clinics: Clinic[]; total: number }>({
      clinics: initialClinics,
      total: initialTotal,
    });
  const [selected, setSelected] = useState<string | null>(null),
    [saved, setSaved] = useState<Set<string>>(new Set()),
    [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [expanded, setExpanded] = useState(false),
    [mobileView, setMobileView] = useState("list"),
    [useAI, setUseAI] = useState(false),
    [parser, setParser] = useState<string>("catalog");
  const controller = useRef<AbortController | null>(null),
    sequence = useRef(0);
  async function search(q = query, nextFilters = filters) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    setNotice("");
    setSelected(null);
    setSavedOnly(false);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, filters: nextFilters, useAI }),
        signal: abort.signal,
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search unavailable");
      if (current !== sequence.current) return;
      const found = data as SearchResponse;
      setResult(found);
      setParser(found.parser);
      setNotice(found.notice || "");
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError" && current === sequence.current)
        setError(e.message);
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void search();
  }
  function updateFilter(key: keyof SearchFilters, value: unknown) {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    void search(query, next);
  }
  function quickSearch(q: string) {
    setQuery(q);
    setFilters({});
    void search(q, {});
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function select(id: string) {
    setSelected(id || null);
    if (id)
      document
        .getElementById(`card-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  const visible = savedOnly ? result.clinics.filter((c) => saved.has(c.id)) : result.clinics;
  const activeCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;
  function reset() {
    setQuery("");
    setFilters({});
    setSavedOnly(false);
    void search("", {});
  }
  return (
    <>
      {mode === "demo" && (
        <div className="demo-banner">
          <span className="demo-banner-dot" /> You’re exploring the demo. All clinic listings,
          offerings and prices are fictional.{" "}
          <a href="/about#data">
            About our data <ArrowUpRight size={12} />
          </a>
        </div>
      )}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> YOUR CARE. YOUR DIRECTION.
          </div>
          <h1>
            The right care starts
            <br />
            with a <span>clearer view.</span>
          </h1>
          <p>
            Find clinics, specialists, and diagnostic services across the US.
            <br className="desktop-break" /> Just tell us what you’re looking for.
          </p>
        </div>
        <div className="hero-note">
          <div className="atlas-orbit">
            <span />
            <span />
            <span />
            <Crosshair />
          </div>
          <span>
            Care is personal.
            <br />
            <strong>Finding it should be simple.</strong>
          </span>
        </div>
        <form className="search-form" onSubmit={submit}>
          <div className="search-input-wrap">
            <Sparkles size={21} />
            <label className="sr-only" htmlFor="care-search">
              Describe a specialty, service, or test
            </label>
            <input
              id="care-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={500}
              placeholder="Try “an MRI in Boston” or “dermatology with telehealth”"
              autoComplete="off"
              name="care-search"
            />
          </div>
          <div className="search-location">
            <MapPin size={17} />
            <label className="sr-only" htmlFor="hero-location">
              City, state, or ZIP
            </label>
            <input
              id="hero-location"
              value={filters.location || ""}
              onChange={(e) =>
                setFilters({ ...filters, location: e.target.value || undefined, bounds: undefined })
              }
              placeholder="Anywhere in the US"
              maxLength={100}
            />
          </div>
          <button className="search-submit" disabled={loading}>
            {loading ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <>
                Find care <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        <div className="search-below">
          <div className="try-searches">
            <span>Explore:</span>
            <button onClick={() => quickSearch("MRI")}>
              <ScanLine size={13} /> MRI scans
            </button>
            <button onClick={() => quickSearch("Primary care")}>
              <Stethoscope size={13} /> Primary care
            </button>
            <button onClick={() => quickSearch("Cardiology")}>
              <Activity size={13} /> Cardiology
            </button>
          </div>
          <label className="ai-opt-in">
            <input type="checkbox" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} />
            <Sparkles size={13} /> Use AI parsing{" "}
            <span title="When selected, search text is sent to OpenAI. Don’t include personal medical details. No search history is stored by ClinicAtlas.">
              <Info size={13} />
            </span>
          </label>
        </div>
        <div className="trust-row">
          <span>
            <ShieldCheck size={15} /> Source transparency
          </span>
          <span>
            <MapPin size={15} /> Nationwide discovery
          </span>
          <span>
            <LockKeyhole size={14} /> No search history stored
          </span>
        </div>
      </section>
      <section className="explore" id="explore">
        <div className="explore-heading">
          <div className="explore-title">
            <h2>
              Explore your options<span>.</span>
            </h2>
            <p>A little clarity for your next step.</p>
          </div>
          <a href="/about#data" className="data-note">
            <ShieldCheck size={15} /> How we review information <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="filters-bar">
          <div className="filter-select">
            <MapPin size={14} />
            <select
              aria-label="Distance"
              value={filters.radiusMiles ?? ""}
              onChange={(e) =>
                updateFilter("radiusMiles", e.target.value ? Number(e.target.value) : undefined)
              }
            >
              <option value="">Distance</option>
              {[10, 25, 50, 100, 250, 1000].map((n) => (
                <option value={n} key={n}>
                  Within {n} miles
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </div>
          <div className="filter-select">
            <Stethoscope size={14} />
            <select
              aria-label="Specialty"
              value={filters.specialtyId || ""}
              onChange={(e) => updateFilter("specialtyId", e.target.value)}
            >
              <option value="">Specialty</option>
              {specialties.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </div>
          <div className="filter-select">
            <ScanLine size={14} />
            <select
              aria-label="Service or test"
              value={filters.serviceId || ""}
              onChange={(e) => updateFilter("serviceId", e.target.value)}
            >
              <option value="">Service or test</option>
              {services.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </div>
          <button
            className={`filter-button ${filters.telehealth ? "active" : ""}`}
            onClick={() => updateFilter("telehealth", filters.telehealth ? undefined : true)}
            aria-pressed={!!filters.telehealth}
          >
            <Video size={14} />
            Telehealth
          </button>
          <button
            className={`filter-button more-filters ${expanded ? "active" : ""}`}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="extra-filters"
          >
            <SlidersHorizontal size={14} /> All filters
            {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
          </button>
          {activeCount > 0 && (
            <button className="clear-filters" onClick={reset}>
              <X size={13} />
              Clear
            </button>
          )}
          <span className="filter-right">Find your fit, at your pace.</span>
        </div>
        {expanded && (
          <div className="extra-filters" id="extra-filters">
            <label>
              Insurance{" "}
              <select
                value={filters.insurance || ""}
                onChange={(e) => updateFilter("insurance", e.target.value)}
              >
                <option value="">Any / unknown</option>
                {insuranceOptions.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </label>
            <label>
              Maximum listed starting price
              <select
                value={filters.maxPrice ?? ""}
                onChange={(e) =>
                  updateFilter("maxPrice", e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">Any / unknown</option>
                {[100, 200, 500, 1000].map((p) => (
                  <option key={p} value={p}>
                    Up to ${p}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Price and insurance filters exclude unknown values. Listed prices are starting prices,
              not service quotes. Confirm coverage and costs directly.
            </p>
          </div>
        )}
        {(error || notice || unavailable) && (
          <div
            className={`search-notice ${error || unavailable ? "notice-error" : ""}`}
            role={error ? "alert" : "status"}
          >
            <Info size={16} />
            {error ||
              notice ||
              (unavailable
                ? "The database is not configured. Connect PostgreSQL or enable demo mode to explore."
                : "")}
          </div>
        )}
        <div className="results-toolbar">
          <div className="results-tabs">
            <button className={!savedOnly ? "active" : ""} onClick={() => setSavedOnly(false)}>
              All clinics <span>{result.total}</span>
            </button>
            <button className={savedOnly ? "active" : ""} onClick={() => setSavedOnly(true)}>
              <Heart size={14} />
              Saved <span>{saved.size}</span>
            </button>
          </div>
          <div className="results-info">
            <span className="results-count" aria-live="polite">
              {loading
                ? "Finding matches…"
                : `${visible.length} ${mode === "demo" ? "demo " : ""}results${result.total > 200 ? ` of ${result.total}` : ""}`}
            </span>
            <span className="sort-label">
              {parser === "ai" ? "AI filters applied" : "Catalog matches"}
            </span>
            <div className="view-toggle">
              <button
                className={mobileView === "list" ? "active" : ""}
                aria-label="Show list"
                onClick={() => setMobileView("list")}
              >
                <LayoutList size={16} />
              </button>
              <button
                className={mobileView === "map" ? "active" : ""}
                aria-label="Show map"
                onClick={() => setMobileView("map")}
              >
                <Map size={16} />
              </button>
            </div>
          </div>
        </div>
        <div
          className={`discovery-layout mobile-${mobileView} ${loading ? "is-loading" : ""}`}
          aria-busy={loading}
        >
          <div className="results-list">
            {visible.length ? (
              visible.map((clinic, i) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  index={i}
                  selected={selected === clinic.id}
                  onSelect={() => select(clinic.id)}
                  saved={saved.has(clinic.id)}
                  onSave={() =>
                    setSaved((prev) => {
                      const next = new Set(prev);
                      if (next.has(clinic.id)) next.delete(clinic.id);
                      else next.add(clinic.id);
                      return next;
                    })
                  }
                />
              ))
            ) : (
              <div className="empty-results">
                <Search size={28} />
                <h3>{savedOnly ? "A place for your shortlist" : "No matching clinics yet"}</h3>
                <p>
                  {savedOnly
                    ? "Tap the heart on a clinic to keep it here during this visit. Saved clinics aren’t stored after you leave."
                    : "Try a broader location or fewer filters. We only show records in our directory and never invent a match."}
                </p>
                <button onClick={reset}>
                  <RotateCcw size={14} />
                  Reset search
                </button>
              </div>
            )}
            <p className="list-disclaimer">
              Listings are not endorsements. Availability, pricing and insurance can change.{" "}
              {mode === "demo"
                ? "All records shown are fictional."
                : "Confirm details with the clinic."}
            </p>
          </div>
          <ClinicMap
            clinics={visible}
            selectedId={selected}
            onSelect={select}
            onSearchArea={(bounds) => {
              const next = { ...filters, bounds };
              setFilters(next);
              void search(query, next);
            }}
          />
        </div>
      </section>
      <section className="clarity-section">
        <div className="clarity-icon">
          <ShieldCheck size={26} />
        </div>
        <div>
          <span className="eyebrow">BUILT ON TRANSPARENCY</span>
          <h2>More context. More confidence.</h2>
          <p>
            See what a clinic offers, where information comes from, and when it was reviewed.
            <br />
            No medical advice. Just a clearer place to start.
          </p>
        </div>
        <a className="secondary-link" href="/about">
          Get to know ClinicAtlas <ArrowUpRight size={17} />
        </a>
      </section>
    </>
  );
}
function Crosshair() {
  return <span className="orbit-cross">+</span>;
}
