import Link from "next/link";
import { SITE } from "@/site.config";

export default function NotFound() {
  return (
    <section className="py-24 text-center">
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="mt-3 text-muted">
        That page doesn&apos;t exist — but local {SITE.service.phrase} quotes are
        one click away.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:opacity-90"
      >
        Back to home
      </Link>
    </section>
  );
}
