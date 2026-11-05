"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="not-found" id="main">
      <h1>We couldn’t open this page.</h1>
      <p>Please try again. If the problem continues, the data service may be unavailable.</p>
      <button className="admin-button" onClick={reset}>
        Try again
      </button>
      <a href="/" className="back-link" style={{ marginLeft: 20 }}>
        Back to explore
      </a>
    </main>
  );
}
