import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Phone,
  Globe,
  Video,
  ShieldCheck,
  Clock,
  BadgeInfo,
  CreditCard,
  Stethoscope,
} from "lucide-react";
import { Header, Footer } from "@/components/brand";
import { getClinic } from "@/lib/repository";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export default async function ClinicProfile({ params }: Props) {
  const { slug } = await params;
  const clinic = await getClinic(slug);
  if (!clinic) notFound();
  const format = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  return (
    <>
      <Header />
      <main id="main" className="content-page">
        <Link className="back-link" href="/">
          <ArrowLeft size={15} />
          Back to explore
        </Link>
        <div className="profile-top">
          <span className="eyebrow">{clinic.specialties.map((s) => s.name).join(" · ")}</span>
          <h1>{clinic.name}</h1>
          <p>{clinic.description}</p>
          <div className={`profile-status ${clinic.isDemo ? "demo" : ""}`}>
            <BadgeInfo size={15} />
            {clinic.isDemo
              ? "Fictional demo clinic · not a real healthcare provider"
              : clinic.lastVerifiedAt
                ? `Information reviewed ${format(clinic.lastVerifiedAt)}`
                : "Verification date not available"}
          </div>
        </div>
        <div className="profile-grid">
          <div>
            <section className="content-panel">
              <h2>Services & offerings</h2>
              <div className="offering-list">
                {clinic.services.map((s) => (
                  <span key={s.id}>{s.name}</span>
                ))}
              </div>
              <p style={{ marginTop: 16 }}>
                {clinic.isDemo
                  ? "These offerings are illustrative demo data."
                  : "Service listings reflect reviewed source information. Confirm availability, eligibility and suitability directly with a qualified professional."}
              </p>
            </section>
            <section className="content-panel">
              <h2>Locations</h2>
              {clinic.locations.map((l) => (
                <div className="detail-row" key={l.id}>
                  <MapPin size={18} />
                  <div>
                    <strong>
                      {l.city}, {l.state}
                    </strong>
                    <span>{l.address}</span>
                    <span>
                      {l.city}, {l.state} {l.postalCode}
                    </span>
                    {clinic.isDemo ? (
                      <small>Approximate city-center coordinates · fictional address</small>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.address}, ${l.city}, ${l.state} ${l.postalCode}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="back-link"
                        style={{ margin: 0 }}
                      >
                        Open directions <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </section>
            <section className="content-panel">
              <h2>Sources & verification</h2>
              <p>
                We distinguish provider identity, service offerings, and licensure. An NPI does not
                prove licensure, quality, or the availability of a specific treatment.
              </p>
              {clinic.sources.map((s) => (
                <div className="source-row" key={s.id}>
                  <ShieldCheck size={17} />
                  <div>
                    <strong>{s.label}</strong>
                    {!clinic.isDemo && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer">
                        View {s.scope} source <ArrowUpRight size={11} />
                      </a>
                    )}
                    <small>
                      {s.scope.toUpperCase()} ·{" "}
                      {clinic.isDemo
                        ? "Not verified — demo only"
                        : s.status === "verified" && s.checkedAt
                          ? `Reviewed ${format(s.checkedAt)}`
                          : "Pending review"}
                    </small>
                  </div>
                </div>
              ))}
              {clinic.npi && <p>NPI: {clinic.npi} · Identity identifier only.</p>}
            </section>
          </div>
          <aside>
            <section className="content-panel">
              <h2>Plan your visit</h2>
              <div className="detail-row">
                <Video size={17} />
                <div>
                  <strong>Telehealth</strong>
                  <span>
                    {clinic.telehealth === null
                      ? "Not reported"
                      : clinic.telehealth
                        ? "Listed as available · confirm state eligibility"
                        : "In-person services listed"}
                  </span>
                </div>
              </div>
              <div className="detail-row">
                <CreditCard size={17} />
                <div>
                  <strong>
                    {clinic.priceFrom === null
                      ? "Pricing not reported"
                      : `Starting from $${clinic.priceFrom}`}
                  </strong>
                  <span>
                    {clinic.priceNote || "Contact the clinic for service-specific pricing."}
                  </span>
                  {clinic.isDemo && <small>Fictional sample pricing</small>}
                </div>
              </div>
              <div className="detail-row">
                <Stethoscope size={17} />
                <div>
                  <strong>Insurance</strong>
                  <span>
                    {clinic.insurance.length ? clinic.insurance.join(", ") : "Not reported"}
                  </span>
                  <small>
                    Coverage depends on your plan, network and service. Confirm directly.
                  </small>
                </div>
              </div>
              <div className="detail-row">
                <Clock size={17} />
                <div>
                  <strong>Last reviewed</strong>
                  <span>
                    {clinic.lastVerifiedAt
                      ? format(clinic.lastVerifiedAt)
                      : "Not independently verified"}
                  </span>
                </div>
              </div>
              {clinic.isDemo ? (
                <p style={{ marginTop: 15 }}>
                  Contact links are unavailable for fictional listings.
                </p>
              ) : (
                <>
                  {clinic.website && (
                    <a
                      className="contact-button"
                      href={clinic.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe size={15} />
                      Visit clinic website <ArrowUpRight size={14} />
                    </a>
                  )}
                  {clinic.phone && (
                    <a
                      className="contact-button"
                      href={`tel:${clinic.phone.replace(/[^+\d]/g, "")}`}
                    >
                      <Phone size={15} />
                      {clinic.phone}
                    </a>
                  )}
                </>
              )}
            </section>
            <div className="profile-disclaimer">
              ClinicAtlas helps you discover providers. Listings do not establish medical
              suitability or endorse treatment outcomes. Discuss medical decisions with a qualified
              clinician. Do not use this directory for emergencies.
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
