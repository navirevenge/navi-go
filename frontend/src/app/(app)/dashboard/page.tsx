"use client";

import { useEffect, useState } from "react";
import { DashboardView } from "@/components/dashboard-view";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p role="alert" className="text-accent">{error}</p>;
  if (!data) return <p role="status" className="text-muted">Loading your dashboard…</p>;
  return <DashboardView data={data} />;
}
