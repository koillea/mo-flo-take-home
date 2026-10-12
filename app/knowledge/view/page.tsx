"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteRecord, loadRecords } from "@/lib/storage";
import type { KnowledgeBase } from "@/lib/types";

type ViewMode = "cards" | "table" | "detail";

export default function ViewPage() {
  const [records, setRecords] = useState<KnowledgeBase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("cards");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRecords(loadRecords());
    setLoaded(true);
  }, []);

  // Search across name, industry, website, and location fields.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.foundation.name, r.foundation.industry, r.foundation.website, r.foundation.mainAddress, ...r.foundation.serviceLocations]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [records, query]);

  const selected = records.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  function handleDelete(record: KnowledgeBase) {
    if (!window.confirm(`Delete the knowledge base for "${record.foundation.name}"? This can't be undone.`)) return;
    deleteRecord(record.id);
    setRecords(loadRecords());
    if (selectedId === record.id) setSelectedId(null);
    setMessage(`Deleted "${record.foundation.name}".`);
  }

  function handleDownload(record: KnowledgeBase) {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${record.foundation.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "knowledge-base"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!loaded) return <p className="text-sm text-slate-500">Loading records…</p>;

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <h1 className="text-xl font-semibold">No knowledge bases yet</h1>
        <p className="mt-2 text-sm text-slate-600">Scrape a company website to create your first one.</p>
        <Link href="/knowledge" className="mt-4 inline-block rounded-md bg-[color:var(--brand)] px-4 py-2 text-sm font-medium text-white">
          Scrape a website
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Knowledge bases</h1>
          <p className="text-sm text-slate-600">{records.length} saved</p>
        </div>
        <Link href="/knowledge" className="rounded-md bg-[color:var(--brand)] px-4 py-2 text-center text-sm font-medium text-white">
          + New scrape
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          aria-label="Search knowledge bases"
          placeholder="Search by name, industry, website, or location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <div role="group" aria-label="View mode" className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-sm">
          {(["cards", "table", "detail"] as ViewMode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 capitalize ${mode === m ? "bg-[color:var(--brand)] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {message && <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      {filtered.length === 0 && <p className="text-sm text-slate-600">No records match &ldquo;{query}&rdquo;.</p>}

      {mode === "cards" && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <article key={r.id} className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">{r.foundation.name || "Untitled"}</h2>
              <p className="text-xs text-slate-500">{r.foundation.industry || "Industry unknown"}</p>
              <p className="mt-3 line-clamp-3 text-sm text-slate-600">{r.positioning.pitch || r.foundation.description}</p>
              <p className="mt-3 text-xs text-slate-500">
                {r.offerings.length} offerings · {r.keyPeople.length} people · {r.thinkBigger.faqs.length} FAQs
              </p>
              <div className="mt-auto flex flex-wrap gap-3 pt-4 text-sm">
                <button className="text-[color:var(--brand)] hover:underline" onClick={() => { setSelectedId(r.id); setMode("detail"); }}>View</button>
                <Link href={`/knowledge?id=${r.id}`} className="text-[color:var(--brand)] hover:underline">Edit</Link>
                <button className="text-slate-600 hover:underline" onClick={() => handleDownload(r)}>JSON</button>
                <button className="ml-auto text-red-600 hover:underline" onClick={() => handleDelete(r)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {mode === "table" && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Founded</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.foundation.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.foundation.industry || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.foundation.yearFounded || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{r.foundation.mainAddress || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(r.updatedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/knowledge?id=${r.id}`} className="mr-3 text-[color:var(--brand)] hover:underline">Edit</Link>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode === "detail" && selected && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{selected.foundation.name}</h2>
              <p className="text-sm text-slate-500">{selected.foundation.website}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {filtered.length > 1 && (
                <select
                  aria-label="Choose record"
                  className="rounded-md border border-slate-300 px-2 py-1"
                  value={selected.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {filtered.map((r) => <option key={r.id} value={r.id}>{r.foundation.name}</option>)}
                </select>
              )}
              <Link href={`/knowledge?id=${selected.id}`} className="text-[color:var(--brand)] hover:underline">Edit</Link>
              <button className="text-slate-600 hover:underline" onClick={() => handleDownload(selected)}>Download JSON</button>
              <button className="text-red-600 hover:underline" onClick={() => handleDelete(selected)}>Delete</button>
            </div>
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Item label="Pitch" value={selected.positioning.pitch} />
            <Item label="Founded" value={selected.foundation.yearFounded} />
            <Item label="Address" value={selected.foundation.mainAddress} />
            <Item label="Colors" value={selected.branding.colors.join(", ")} />
            <Item label="Fonts" value={selected.branding.fonts.join(", ")} />
            <Item label="Social" value={Object.keys(selected.onlinePresence.socialLinks).join(", ")} />
            <Item label="Offerings" value={selected.offerings.map((o) => o.name).join(", ")} />
            <Item label="Key people" value={selected.keyPeople.map((p) => `${p.name} (${p.title})`).join(", ")} />
            <Item label="Testimonials" value={`${selected.thinkBigger.testimonials.length} found`} />
            <Item label="Missing fields" value={selected.scrapeMeta.missingFields.join(", ") || "None"} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-800">{value || "—"}</dd>
    </div>
  );
}
