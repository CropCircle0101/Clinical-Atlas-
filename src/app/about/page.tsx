import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header, Footer } from "@/components/brand";
export default function About() {
  return (
    <>
      <Header />
      <main id="main" className="content-page">
        <Link className="back-link" href="/">
          <ArrowLeft size={15} />
          Back to explore
        </Link>
        <div className="about-hero">
          <span className="eyebrow">A CLEARER START</span>
          <h1>
            Good discovery starts
            <br />
            with honest information.
          </h1>
          <p>
            ClinicAtlas brings clinic locations, specialties and services into one navigable view.
            We help you explore what’s listed and understand where the information comes from.
          </p>
        </div>
        <section className="about-section">
          <h2>From a question to a place on the map.</h2>
          <ol>
            <li>
              Describe a named specialty, treatment or diagnostic test. Avoid including symptoms,
              medical history or personal identifiers.
            </li>
            <li>
              Review the clinics in the directory. Narrow your options by place, distance,
              specialty, service, telehealth, listed starting price and reported insurance.
            </li>
            <li>
              Open a profile to see offerings, sources and review dates. Confirm details and discuss
              medical suitability directly with the clinic.
            </li>
          </ol>
          <p>
            AI parsing is optional. When enabled, it translates search text into structured catalog
            filters. Providers always come from stored records; AI never creates a listing or
            recommends treatment. Unsupported requests return no matches.
          </p>
        </section>
        <section className="about-section" id="data">
          <h2>Our data, with its limits.</h2>
          <p>
            The demo contains 20 fictional clinic records with approximate city-center coordinates.
            All names, street addresses, services, coverage and prices in demo mode are
            illustrative. They have not been verified, and contact links are disabled.
          </p>
          <p>
            Live records must pass administrator review before publication. Reviewers check
            independent identity, address and specialty sources and specific evidence for every
            listed service. Sources must have been reviewed within 180 days at publication. Editing
            a record withdraws publication and resets its review. A reviewed listing is not a
            clinical quality rating.
          </p>
          <p>
            <a
              href="https://www.cms.gov/medicare/regulations-guidance/administrative-simplification/data-dissemination"
              target="_blank"
              rel="noopener noreferrer"
            >
              CMS NPPES dissemination data
            </a>{" "}
            and the{" "}
            <a
              href="https://npiregistry.cms.hhs.gov/api-page"
              target="_blank"
              rel="noopener noreferrer"
            >
              NPI Registry API
            </a>{" "}
            can supply identity, taxonomy and practice-address leads. Registry information can be
            self-reported and does not prove current licensure or a particular service. Imports
            always remain drafts pending independent review and geocoding.
          </p>
          <p>
            The{" "}
            <a
              href="https://data.cms.gov/provider-data/topics/doctors-clinicians"
              target="_blank"
              rel="noopener noreferrer"
            >
              CMS Doctors and Clinicians Provider Data Catalog
            </a>{" "}
            provides Medicare-related provider and group information. Its coverage is not the entire
            US healthcare market. Historical utilization and Medicare enrollment do not establish
            current availability, prices, commercial insurance acceptance or treatment efficacy.
          </p>
          <p>
            We make no claims that unproven anti-aging, rejuvenation or experimental therapies work.
            This MVP does not list such services. Licensure requires separate authoritative
            state-board verification.
          </p>
        </section>
        <section className="about-section" id="privacy">
          <h2>Your search stays out of our history.</h2>
          <p>
            ClinicAtlas does not persist health-related search text, search filters, or query
            history. Search runs through a POST request, so it is not placed in the URL. Saved
            clinics exist only in this page’s memory and disappear when you leave or reload.
          </p>
          <p>
            If you enable AI parsing, your search text is sent server-side to OpenAI with response
            storage disabled. External providers may apply their own processing and retention
            policies; this is not a promise of zero retention. Please leave out names, dates of
            birth, symptoms and medical records. You can use catalog matching without sending your
            search text to an AI provider.
          </p>
          <p>
            Map rendering contacts Stadia Maps and its map-data services. Optional geocoding sends
            only your location text. The admin interface uses a secure, short-lived login cookie.
            Hosting infrastructure may maintain access logs; configure it to exclude request bodies
            and search payloads before launch.
          </p>
        </section>
        <section className="about-section">
          <h2>A directory, with a clear purpose.</h2>
          <p>
            ClinicAtlas is a provider discovery tool. It does not diagnose, recommend treatment,
            assess clinical suitability, guarantee coverage, or certify providers. Information can
            change after review. Always confirm services, clinician licensure, costs and insurance
            directly before booking.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
