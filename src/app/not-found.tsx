import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Page not found</h1>
      <p>
        <Link href="/">Back to configurator</Link>
      </p>
    </main>
  );
}
