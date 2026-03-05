"use client";

import { useEffect, useState } from "react";
import { getBaseUrl } from "@/lib/api/config";

/** Ping backend root (GET /) – public, no auth – to verify it's up. */
async function pingBackend(baseUrl: string): Promise<void> {
  const url = baseUrl.replace(/\/$/, "") + "/";
  const res = await fetch(url, { method: "GET", credentials: "omit" });
  if (!res.ok) {
    const text = await res.text();
    let msg = `${res.status} ${res.statusText}`;
    if (res.status === 401) {
      msg = "401 Unauthorized – backend requires auth for this request.";
    } else if (text) {
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j?.message) msg = j.message;
      } catch {
        if (text.length < 100) msg = text;
      }
    }
    throw new Error(msg);
  }
}

export function ApiConnectionTest() {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const url = getBaseUrl();
    setBaseUrl(url);

    pingBackend(url)
      .then(() => {
        setStatus("connected");
        setError(null);
      })
      .catch((e) => {
        setStatus("error");
        setError(e instanceof Error ? e.message : String(e));
      });
  }, []);

  if (status === "checking") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
        Testing backend connection to {baseUrl}...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
        <p className="font-semibold">Backend connection failed</p>
        <p className="mt-1">Trying to connect to: <code className="bg-red-100 px-1 rounded dark:bg-red-900">{baseUrl}</code></p>
        <p className="mt-2">Error: {error}</p>
        <p className="mt-2 text-xs">
          Make sure:
          <br />• Backend is running at the URL above (from NEXT_PUBLIC_API_BASE_URL, e.g. http://localhost:3000)
          <br />• Backend CORS allows requests from this app (e.g. http://localhost:3000)
          <br />• Check backend logs for errors
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200">
      ✓ Backend connected at {baseUrl}
    </div>
  );
}
