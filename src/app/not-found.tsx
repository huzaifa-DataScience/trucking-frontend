import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-4 dark:bg-stone-950">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          404 – Page not found
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          This page could not be found.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
          >
            Go to Sign in
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
