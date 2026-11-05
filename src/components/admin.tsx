"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Plus,
  ShieldCheck,
  LockKeyhole,
  LogOut,
  Pencil,
  X,
  LoaderCircle,
} from "lucide-react";
import type { Clinic } from "@/lib/types";
import { publicationProblems } from "@/lib/publication";
import { specialties, services } from "@/lib/catalog";
import type { z } from "zod";
import type { draftSchema } from "@/lib/validation";
type Draft = z.infer<typeof draftSchema>;

export function AdminLogin({ configured }: { configured: boolean }) {
  const [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSecret("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-login">
      <LockKeyhole size={25} color="#13796e" />
      <h1 style={{ marginTop: 17 }}>Provider review workspace</h1>
      <p>
        Sign in to review sources, maintain clinic information, and publish approved directory
        records.
      </p>
      {!configured && (
        <div className="admin-issues">
          Admin access is disabled. Configure a random ADMIN_SECRET of at least 32 characters on the
          server.
        </div>
      )}
      <form className="admin-form" onSubmit={submit}>
        <label style={{ marginTop: 20 }}>
          Admin access key
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            required
            autoComplete="current-password"
            maxLength={256}
          />
        </label>
        <button disabled={busy || !configured} className="admin-button">
          {busy ? <LoaderCircle className="spin" size={15} /> : <LockKeyhole size={14} />}Sign in
          securely
        </button>
      </form>
      {error && (
        <div role="alert" className="search-notice notice-error">
          {error}
        </div>
      )}
    </div>
  );
}
export function AdminWorkspace({
  initialClinics,
  demo,
  authenticated,
}: {
  initialClinics: Clinic[];
  demo: boolean;
  authenticated: boolean;
}) {
  const [clinics, setClinics] = useState(initialClinics),
    [selectedId, setSelectedId] = useState(initialClinics[0]?.id || ""),
    [editing, setEditing] = useState<"new" | "edit" | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [npi, setNpi] = useState("");
  const router = useRouter();
  const selected = clinics.find((c) => c.id === selectedId),
    problems = selected ? publicationProblems(selected) : [];
  async function refresh(id?: string) {
    const r = await fetch("/api/admin/clinics", { cache: "no-store" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setClinics(data.clinics);
    if (id) setSelectedId(id);
  }
  async function act(action: "publish" | "archive" | "verify-source", sourceId?: string) {
    if (!selected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`/api/admin/clinics/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sourceId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await refresh();
      setMessage(
        action === "publish"
          ? "Published to the live directory."
          : action === "archive"
            ? "Listing archived and removed from discovery."
            : "Source review recorded. This is not a licensure or quality certification.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  async function save(draft: Draft) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(
        editing === "edit" ? `/api/admin/clinics/${selectedId}` : "/api/admin/clinics",
        {
          method: editing === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await refresh(data.id || selectedId);
      setEditing(null);
      setMessage("Draft saved. Every source must be reviewed before publication.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function importNpi(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin/import/nppes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npi }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await refresh(data.id);
      setNpi("");
      setMessage(data.notice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.refresh();
  }
  return (
    <>
      <Link className="back-link" href="/">
        <ArrowLeft size={14} />
        Back to directory
      </Link>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">PROVIDER OPERATIONS</span>
          <h1>Review, then publish.</h1>
          <p>Independent evidence first. Every offering needs a source.</p>
        </div>
        <div className="admin-actions" style={{ marginTop: 0 }}>
          <button
            className="admin-button"
            disabled={demo || busy}
            onClick={() => {
              setEditing("new");
              setError("");
            }}
          >
            <Plus size={14} />
            New clinic
          </button>
          {authenticated && (
            <button className="admin-button secondary" onClick={logout}>
              <LogOut size={13} />
              Sign out
            </button>
          )}
        </div>
      </div>
      {demo && (
        <div className="search-notice">
          <ShieldCheck size={16} />
          Read-only demo of the review workspace. All records are fictional. Live editing requires
          PostgreSQL, DEMO_MODE=false and admin authentication.
        </div>
      )}
      {message && (
        <div className="search-notice" role="status">
          <Check size={15} />
          {message}
        </div>
      )}
      {error && (
        <div className="search-notice notice-error" role="alert">
          {error}
        </div>
      )}
      <form className="import-form admin-form" onSubmit={importNpi}>
        <label>
          Stage an organization from CMS NPPES
          <input
            value={npi}
            onChange={(e) => setNpi(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
            pattern="\d{10}"
            placeholder="10-digit organization NPI"
            required
            disabled={demo}
          />
        </label>
        <button className="admin-button secondary" disabled={demo || busy}>
          Import identity lead
        </button>
        <p>
          NPPES supplies identity leads only. No services, licensure, contact-person details or
          private addresses are inferred or imported.
        </p>
      </form>
      <div className="admin-grid">
        <aside className="admin-queue" aria-label="Review queue">
          {clinics.length ? (
            clinics.map((c) => (
              <button
                className={`queue-item ${selectedId === c.id ? "active" : ""}`}
                key={c.id}
                onClick={() => {
                  setSelectedId(c.id);
                  setEditing(null);
                  setError("");
                  setMessage("");
                }}
              >
                <strong>{c.name}</strong>
                <small>
                  {c.isDemo ? "Fictional demo · " : ""}
                  {c.status} · {c.locations[0]?.state || "Needs location"}
                </small>
              </button>
            ))
          ) : (
            <p style={{ padding: 15, fontSize: 12 }}>
              No records yet. Create a clinic draft or stage an organization identity from NPPES.
            </p>
          )}
        </aside>
        <section className="admin-detail">
          {editing ? (
            <DraftEditor
              key={editing === "new" ? "new" : selectedId}
              clinic={editing === "edit" ? selected : undefined}
              onSave={save}
              onCancel={() => setEditing(null)}
              busy={busy}
            />
          ) : selected ? (
            <>
              <span className="eyebrow">
                {selected.status.toUpperCase()} {selected.isDemo ? " · FICTIONAL" : ""}
              </span>
              <h2 style={{ marginTop: 10 }}>{selected.name}</h2>
              <p>{selected.description}</p>
              <p>
                <strong>Specialties:</strong>{" "}
                {selected.specialties.map((s) => s.name).join(", ") || "Not supplied"}
                <br />
                <strong>Services:</strong>{" "}
                {selected.services.map((s) => s.name).join(", ") || "Not supplied"}
                <br />
                <strong>Location:</strong>{" "}
                {selected.locations
                  .map((l) => `${l.address}, ${l.city}, ${l.state} ${l.postalCode}`)
                  .join("; ") || "Not supplied"}
              </p>
              <h3 className="admin-subhead">Evidence review</h3>
              <p style={{ fontSize: 11 }}>
                Open each source and independently confirm its scoped facts before recording review.
                NPI identity is never service or licensure evidence.
              </p>
              {selected.sources.map((s) => (
                <div className="admin-review-source" key={s.id}>
                  <div>
                    <strong>{s.label}</strong>
                    {!demo && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        Open {s.scope} source <ArrowUpRight size={11} />
                      </a>
                    )}
                    <small>
                      {s.scope}
                      {s.serviceId ? ` · ${s.serviceId}` : ""} · {s.status}
                      {s.checkedAt
                        ? ` · ${new Date(s.checkedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}`
                        : ""}
                    </small>
                  </div>
                  <button
                    className="admin-button secondary"
                    disabled={demo || busy || s.status === "verified"}
                    onClick={() => act("verify-source", s.id)}
                  >
                    <Check size={12} />
                    {s.status === "verified" ? "Reviewed" : "Record source review"}
                  </button>
                </div>
              ))}
              {problems.length > 0 && (
                <div className="admin-issues">
                  <strong>Publication requirements</strong>
                  <ul>
                    {problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="admin-actions">
                <button
                  className="admin-button"
                  disabled={demo || busy || problems.length > 0 || selected.status === "published"}
                  onClick={() => act("publish")}
                >
                  <ShieldCheck size={14} />
                  Publish verified information
                </button>
                <button
                  className="admin-button secondary"
                  disabled={demo || busy}
                  onClick={() => setEditing("edit")}
                >
                  <Pencil size={13} />
                  Edit draft
                </button>
                <button
                  className="admin-button secondary"
                  disabled={demo || busy || selected.status === "archived"}
                  onClick={() => act("archive")}
                >
                  <X size={13} />
                  Archive
                </button>
              </div>
            </>
          ) : (
            <p>Select a draft to review, or create a clinic.</p>
          )}
        </section>
      </div>
    </>
  );
}
function initialDraft(clinic?: Clinic): Draft {
  return {
    name: clinic?.name || "",
    description: clinic?.description || "",
    website: clinic?.website ?? null,
    phone: clinic?.phone ?? null,
    telehealth: clinic?.telehealth ?? null,
    priceFrom: clinic?.priceFrom ?? null,
    priceNote: clinic?.priceNote ?? null,
    insurance: clinic?.insurance || [],
    specialtyIds: clinic?.specialties.map((s) => s.id) || [],
    serviceIds: clinic?.services.map((s) => s.id) || [],
    location: clinic?.locations[0] || {
      address: "",
      city: "",
      state: "",
      postalCode: "",
      latitude: 0,
      longitude: 0,
    },
    evidence: clinic?.sources.map((s) => ({
      label: s.label,
      url: s.url,
      scope: s.scope,
      serviceId: s.serviceId ?? null,
    })) || [
      { label: "Provider website — identity", url: "", scope: "identity", serviceId: null },
      { label: "Public practice address", url: "", scope: "address", serviceId: null },
      { label: "Specialty information", url: "", scope: "specialty", serviceId: null },
    ],
  };
}
function DraftEditor({
  clinic,
  onSave,
  onCancel,
  busy,
}: {
  clinic?: Clinic;
  onSave: (d: Draft) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(() => initialDraft(clinic));
  const field = (key: keyof Draft, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));
  const location = (key: keyof Draft["location"], value: unknown) =>
    setDraft((d) => ({ ...d, location: { ...d.location, [key]: value } }));
  const toggle = (key: "specialtyIds" | "serviceIds", id: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(id) ? d[key].filter((v) => v !== id) : [...d[key], id],
    }));
  function submit(e: FormEvent) {
    e.preventDefault();
    const { address, city, state, postalCode, latitude, longitude } = draft.location;
    void onSave({
      ...draft,
      location: { address, city, state, postalCode, latitude, longitude },
      evidence: draft.evidence.filter((v) => v.url.trim()),
    });
  }
  function evidence(i: number, patch: Partial<Draft["evidence"][number]>) {
    field(
      "evidence",
      draft.evidence.map((v, j) => (j === i ? { ...v, ...patch } : v)),
    );
  }
  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>{clinic ? "Edit clinic draft" : "Create a clinic draft"}</h2>
      <p style={{ fontSize: 11, color: "#788b79", marginBottom: 20 }}>
        Saving withdraws any published listing and resets source reviews. Only enter independently
        supported, public practice information.
      </p>
      <div className="admin-form-grid">
        <label className="wide">
          Clinic name
          <input
            value={draft.name}
            onChange={(e) => field("name", e.target.value)}
            required
            maxLength={160}
          />
        </label>
        <label className="wide">
          Description
          <textarea
            value={draft.description}
            onChange={(e) => field("description", e.target.value)}
            required
            minLength={15}
            maxLength={2000}
          />
        </label>
        <label>
          Website (HTTPS)
          <input
            type="url"
            value={draft.website || ""}
            onChange={(e) => field("website", e.target.value || null)}
          />
        </label>
        <label>
          Practice phone
          <input
            type="tel"
            value={draft.phone || ""}
            onChange={(e) => field("phone", e.target.value || null)}
          />
        </label>
        <label>
          Telehealth
          <select
            value={draft.telehealth === null ? "unknown" : String(draft.telehealth)}
            onChange={(e) =>
              field("telehealth", e.target.value === "unknown" ? null : e.target.value === "true")
            }
          >
            <option value="unknown">Unknown</option>
            <option value="true">Available — confirm state eligibility</option>
            <option value="false">Not listed</option>
          </select>
        </label>
        <label>
          Starting price (USD, blank if unknown)
          <input
            type="number"
            min="0"
            max="100000"
            step=".01"
            value={draft.priceFrom ?? ""}
            onChange={(e) =>
              field("priceFrom", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </label>
        <label className="wide">
          Price context
          <input
            value={draft.priceNote || ""}
            onChange={(e) => field("priceNote", e.target.value || null)}
          />
        </label>
        <label className="wide">
          Reported insurance (comma separated; blank if unknown)
          <input
            value={draft.insurance.join(",")}
            onChange={(e) =>
              field(
                "insurance",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
      </div>
      <h3 className="admin-subhead">Specialties</h3>
      <div className="admin-checks">
        {specialties.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={draft.specialtyIds.includes(s.id)}
              onChange={() => toggle("specialtyIds", s.id)}
            />
            {s.name}
          </label>
        ))}
      </div>
      <h3 className="admin-subhead">Explicitly offered services</h3>
      <div className="admin-checks">
        {services.map((s) => (
          <label key={s.id}>
            <input
              type="checkbox"
              checked={draft.serviceIds.includes(s.id)}
              onChange={() => toggle("serviceIds", s.id)}
            />
            {s.name}
          </label>
        ))}
      </div>
      <h3 className="admin-subhead">Public practice location</h3>
      {clinic && clinic.locations.length > 1 && (
        <div className="admin-issues">
          This MVP editor replaces the record’s locations with the single address below.
        </div>
      )}
      <div className="admin-form-grid">
        <label className="wide">
          Street address
          <input
            value={draft.location.address}
            required
            onChange={(e) => location("address", e.target.value)}
          />
        </label>
        <label>
          City
          <input
            value={draft.location.city}
            required
            onChange={(e) => location("city", e.target.value)}
          />
        </label>
        <label>
          State (two letters)
          <input
            value={draft.location.state}
            required
            maxLength={2}
            pattern="[A-Z]{2}"
            onChange={(e) => location("state", e.target.value.toUpperCase())}
          />
        </label>
        <label>
          ZIP
          <input
            value={draft.location.postalCode}
            required
            pattern="\d{5}(-\d{4})?"
            onChange={(e) => location("postalCode", e.target.value)}
          />
        </label>
        <label>
          Latitude (verified coordinate)
          <input
            type="number"
            required
            step="any"
            min={18}
            max={72}
            value={draft.location.latitude || ""}
            onChange={(e) => location("latitude", Number(e.target.value))}
          />
        </label>
        <label>
          Longitude (verified coordinate)
          <input
            type="number"
            required
            step="any"
            min={-180}
            max={-60}
            value={draft.location.longitude || ""}
            onChange={(e) => location("longitude", Number(e.target.value))}
          />
        </label>
      </div>
      <h3 className="admin-subhead">Evidence links</h3>
      <p style={{ fontSize: 11, color: "#7d8f79", marginBottom: 12 }}>
        Add identity, address, specialty and one service-specific source per service. Include
        insurance or price sources when those values are supplied. Links are reviewed manually.
      </p>
      {draft.evidence.map((v, i) => (
        <div className="evidence-editor" key={i}>
          <input
            aria-label={`Evidence ${i + 1} label`}
            value={v.label}
            onChange={(e) => evidence(i, { label: e.target.value })}
            placeholder="Source label"
          />
          <input
            aria-label={`Evidence ${i + 1} URL`}
            type="url"
            value={v.url}
            onChange={(e) => evidence(i, { url: e.target.value })}
            placeholder="https://provider.example/services"
          />
          <select
            aria-label={`Evidence ${i + 1} scope`}
            value={v.scope}
            onChange={(e) =>
              evidence(i, {
                scope: e.target.value as Draft["evidence"][number]["scope"],
                serviceId: e.target.value === "service" ? (draft.serviceIds[0] ?? null) : null,
              })
            }
          >
            {["identity", "address", "specialty", "service", "insurance", "price", "license"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
          {v.scope === "service" ? (
            <select
              aria-label={`Evidence ${i + 1} service`}
              value={v.serviceId || ""}
              onChange={(e) => evidence(i, { serviceId: e.target.value || null })}
            >
              <option value="">Select service</option>
              {services
                .filter((s) => draft.serviceIds.includes(s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          ) : (
            <button
              type="button"
              className="admin-button secondary"
              onClick={() =>
                field(
                  "evidence",
                  draft.evidence.filter((_, j) => j !== i),
                )
              }
            >
              Remove link
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="admin-button secondary"
        onClick={() =>
          field("evidence", [
            ...draft.evidence,
            {
              label: "Service evidence",
              url: "",
              scope: "service",
              serviceId: draft.serviceIds[0] ?? null,
            },
          ])
        }
      >
        <Plus size={13} />
        Add source
      </button>
      <div className="admin-actions">
        <button className="admin-button" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={13} /> : <Check size={13} />}Save unpublished
          draft
        </button>
        <button type="button" className="admin-button secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
