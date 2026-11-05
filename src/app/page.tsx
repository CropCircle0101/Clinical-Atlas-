import { Header, Footer } from "@/components/brand";
import { Explorer } from "@/components/explorer";
import { searchClinics } from "@/lib/repository";
import { parseCatalogIntent } from "@/lib/search";
import { isDemoMode } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Home() {
  let clinics: Awaited<ReturnType<typeof searchClinics>>["clinics"] = [],
    total = 0,
    unavailable = false;
  try {
    const result = await searchClinics(parseCatalogIntent(""), {});
    clinics = result.clinics;
    total = result.total;
  } catch {
    unavailable = true;
  }
  return (
    <>
      <Header />
      <main id="main">
        <Explorer
          initialClinics={clinics}
          initialTotal={total}
          mode={isDemoMode() ? "demo" : "live"}
          unavailable={unavailable}
        />
      </main>
      <Footer />
    </>
  );
}
