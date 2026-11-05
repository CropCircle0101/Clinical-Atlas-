import Link from "next/link";
import { Header, Footer } from "@/components/brand";
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="not-found">
        <h1>This listing isn’t available.</h1>
        <p>It may not exist or may still be under review.</p>
        <Link href="/" className="admin-button">
          Explore the directory
        </Link>
      </main>
      <Footer />
    </>
  );
}
