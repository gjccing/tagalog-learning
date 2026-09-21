import Link from "next/link";

export default function RootNotFound() {
  return (
    <div className="space-y-4 px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">
        That stage or lesson is not in the current curriculum.
      </p>
      <Link href="/" className="inline-block text-accent hover:underline">
        Back to the course
      </Link>
    </div>
  );
}
