"use client";

import { useEffect, useState } from "react";
import { getBaseUrl } from "@/lib/api/config";
import * as lookupsApi from "@/lib/api/endpoints/lookups";

export function ApiConnectionTest() {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    const url = getBaseUrl();
    setBaseUrl(url);

    lookupsApi.getJobs()
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
          <br />• Backend is running on port 3000
          <br />• Backend CORS allows requests from http://localhost:3002
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
