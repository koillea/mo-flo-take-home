"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import KnowledgeEditor, { validateDraft } from "@/components/KnowledgeEditor";
import { getRecord, newId, saveRecord } from "@/lib/storage";
import { validateCompanyUrl } from "@/lib/validation";
import type { ExtractedData, KnowledgeBase, ScrapeApiResponse } from "@/lib/types";

type Status = "idle" | "scraping" | "review";

export default function BuildPage() {
  const params = useSearchParams();
  const editId = params.get("id");

  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [scrapeError, setScrapeError] = useState("");
  const [draft, setDraft] = useState<KnowledgeBase | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [savedMessage, setSavedMessage] = useState("");

  // Load an existing record when arriving from the manage page (?id=...).
  useEffect(() => {
    if (!editId) return;
    const existing = getRecord(editId);
    if (existing) {
      setDraft(existing);
      setStatus("review");
    } else {
      setScrapeError("That record no longer exists. It may have been deleted.");
    }
  }, [editId]);

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    setScrapeError("");
    setSavedMessage("");

    const check = validateCompanyUrl(url);
    if (!check.ok) {
      setUrlError(check.error);
      return;
    }
    setUrlError("");
    setStatus("scraping");

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: check.url }),
      });
      const json = (await res.json()) as ScrapeApiResponse;
      if (!json.ok || !json.data) {
        setScrapeError(json.error ?? "The scrape failed. Please try again.");
        setStatus("idle");
        return;
      }
      setDraft(toRecord(json.data));
      setStatus("review");
    } catch {
      setScrapeError("Network error. Check your connection and try again.");
      setStatus("idle");
    }
  }

  function handleSave() {
    if (!draft) return;
    const errors = validateDraft(draft);
    setSaveErrors(errors);
    if (errors.length) return;

    const record = { ...draft, updatedAt: new Date().toISOString() };
    saveRecord(record);
    setDraft(record);
    setSavedMessage(`Saved "${record.foundation.name}".`);
  }

  function handleDownload() {
    if (!draft) return;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(draft.foundation.name || "knowledge-base")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function startOver() {
    setDraft(null);
    setStatus("idle");
    setSaveErrors([]);
    setSavedMessage("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {editId ? "Edit knowledge base" : "Scrape & build a knowledge base"}
        </h1>
        <p className="text-sm text-slate-600">
          Enter a company website. MoKnowledge reads its pages, then lets you review and correct everything before saving.
        </p>
      </div>

      {!editId && (
        <form onSubmit={handleScrape} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-700" htmlFor="url">Company website</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="url"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[color:var(--brand)] focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={status === "scraping"}
            />
            <button
              type="submit"
              disabled={status === "scraping"}
              className="rounded-md bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {status === "scraping" ? "Scraping…" : "Scrape website"}
            </button>
          </div>
          {urlError && <p role="alert" className="mt-2 text-sm text-red-600">{urlError}</p>}
          {status === "scraping" && (
            <p className="mt-3 text-sm text-slate-600">
              Fetching the homepage and about page, then extracting company data. This usually takes a few seconds.
            </p>
          )}
          {scrapeError && <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{scrapeError}</p>}
        </form>
      )}

      {editId && scrapeError && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{scrapeError}</p>
      )}

      {draft && status === "review" && (
        <>
          {draft.scrapeMeta.warnings.length > 0 && (
            <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              {draft.scrapeMeta.warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          )}
          {draft.scrapeMeta.missingFields.length > 0 && (
            <p className="text-sm text-slate-600">
              {draft.scrapeMeta.missingFields.length} key field(s) weren&apos;t found on the site. They&apos;re flagged below so you can fill them in by hand.
            </p>
          )}

          <KnowledgeEditor
            draft={draft}
            onChange={(next) => {
              setDraft(next);
              setSavedMessage("");
            }}
            missing={draft.scrapeMeta.missingFields}
          />

          {saveErrors.length > 0 && (
            <ul role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700 list-disc pl-6">
              {saveErrors.map((err) => <li key={err}>{err}</li>)}
            </ul>
          )}
          {savedMessage && (
            <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">
              {savedMessage}{" "}
              <Link href="/knowledge/view" className="underline">View all records</Link>
            </p>
          )}

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-[#f5f7fb] py-4">
            <button type="button" onClick={startOver} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-white">
              Start over
            </button>
            <button type="button" onClick={handleDownload} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-white">
              Download JSON
            </button>
            <button type="button" onClick={handleSave} className="rounded-md bg-[color:var(--brand)] px-5 py-2 text-sm font-medium text-white hover:opacity-90">
              Save knowledge base
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function toRecord(data: ExtractedData): KnowledgeBase {
  const now = new Date().toISOString();
  return { ...data, id: newId(), createdAt: now, updatedAt: now, schemaVersion: 1 };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "knowledge-base";
}
