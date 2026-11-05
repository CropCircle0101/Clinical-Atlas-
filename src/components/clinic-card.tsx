"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  Video,
  BadgeCheck,
  Heart,
  ScanLine,
  Stethoscope,
  Activity,
  Eye,
  Sparkles,
} from "lucide-react";
import type { Clinic } from "@/lib/types";
export function ClinicCard({
  clinic,
  index,
  selected,
  onSelect,
  saved,
  onSave,
}: {
  clinic: Clinic;
  index: number;
  selected: boolean;
  onSelect: () => void;
  saved: boolean;
  onSave: () => void;
}) {
  const location =
    clinic.locations.find((l) => l.id === clinic.matchedLocationId) ?? clinic.locations[0];
  const category = clinic.specialties[0]?.id;
  const Icon =
    category === "diagnostic-imaging"
      ? ScanLine
      : category === "cardiology"
        ? Activity
        : category === "ophthalmology"
          ? Eye
          : category === "dermatology"
            ? Sparkles
            : Stethoscope;
  return (
    <article
      id={`card-${clinic.id}`}
      className={`clinic-card ${selected ? "is-selected" : ""}`}
      aria-label={clinic.name}
    >
      <div className={`clinic-visual visual-${index % 4}`}>
        <Icon size={30} strokeWidth={1.3} />
        <span className="visual-orbit" />
        <span className="map-index">{index + 1}</span>
      </div>
      <div className="card-content">
        <div className="card-eyebrow">
          <span>{clinic.specialties[0]?.name || "Healthcare clinic"}</span>
          <button
            className={`save-button ${saved ? "is-saved" : ""}`}
            onClick={onSave}
            aria-label={`${saved ? "Unsave" : "Save"} ${clinic.name}`}
            aria-pressed={saved}
          >
            <Heart size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <h3>
          <button onClick={onSelect} aria-pressed={selected}>
            {clinic.name}
          </button>
        </h3>
        <p className="card-location">
          <MapPin size={13} />
          {location ? `${location.city}, ${location.state}` : "Location pending"}
          {clinic.distanceMiles !== undefined && <span>· {clinic.distanceMiles} mi</span>}
        </p>
        <div className="service-tags">
          {clinic.services.slice(0, 3).map((s) => (
            <span key={s.id}>{s.name}</span>
          ))}
        </div>
        <div className="card-meta">
          {clinic.isDemo ? (
            <span className="demo-label">Fictional demo</span>
          ) : (
            <span className="verified-label">
              <BadgeCheck size={13} /> Information reviewed
            </span>
          )}
          {clinic.telehealth === true && (
            <span>
              <Video size={13} /> Telehealth
            </span>
          )}
        </div>
        <div className="card-bottom">
          <span>
            {clinic.priceFrom === null ? (
              "Price not listed"
            ) : (
              <>
                From <strong>${clinic.priceFrom}</strong>
                <small>{clinic.isDemo ? " · sample" : " · confirm with clinic"}</small>
              </>
            )}
          </span>
          <Link href={`/clinics/${clinic.slug}`}>
            View clinic <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
