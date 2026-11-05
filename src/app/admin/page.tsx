import { cookies } from "next/headers";
import { Header, Footer } from "@/components/brand";
import { AdminLogin, AdminWorkspace } from "@/components/admin";
import { validSession, sessionCookie, secretConfigured } from "@/lib/auth";
import { isDemoMode } from "@/lib/db";
import { getReviewQueue } from "@/lib/repository";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const demo = isDemoMode();
  const authenticated = validSession((await cookies()).get(sessionCookie)?.value);
  return (
    <>
      <Header />
      <main className="admin-shell" id="main">
        {authenticated || demo ? (
          <AdminWorkspace
            initialClinics={await getReviewQueue()}
            demo={demo}
            authenticated={authenticated}
          />
        ) : (
          <AdminLogin configured={secretConfigured()} />
        )}
      </main>
      <Footer />
    </>
  );
}
