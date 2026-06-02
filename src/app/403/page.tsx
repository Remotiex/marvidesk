import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">403 — Forbidden</h1>
      <p className="text-muted">
        You don&apos;t have permission to view this page.
      </p>
      <Link href="/" className="text-primary underline">
        Back to home
      </Link>
    </div>
  );
}
