import Link from "next/link";
import { ArrowUpRight, Cross, ShieldCheck } from "lucide-react";
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ClinicAtlas home">
      <span className="brand-mark">
        <Cross size={20} strokeWidth={2.5} />
      </span>
      <span>
        Clinic<span className="brand-light">Atlas</span>
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
export function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/" className="nav-explore">
            Explore clinics
          </Link>
          <Link href="/about">How it works</Link>
          <Link href="/about#data">
            Our data <ArrowUpRight size={13} />
          </Link>
        </nav>
        <Link href="/admin" className="provider-link">
          Provider portal <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <Brand />
      <p>A clearer path to finding care.</p>
      <div>
        <Link href="/about#privacy">Privacy</Link>
        <Link href="/about#data">Data & verification</Link>
        <span>
          <ShieldCheck size={13} /> Discovery, with transparency.
        </span>
      </div>
      <small>
        ClinicAtlas is a provider directory. It does not offer diagnosis or treatment
        recommendations.
      </small>
    </footer>
  );
}
