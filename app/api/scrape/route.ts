// POST /api/scrape  { "url": "example.com" }
// Runs on the server so the browser never fetches third-party sites directly (avoids CORS).

import { NextResponse } from "next/server";
import { validateCompanyUrl } from "@/lib/validation";
import { ScrapeError, scrapeWebsite } from "@/lib/scraper";
import type { ScrapeApiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<NextResponse<ScrapeApiResponse>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  }

  const rawUrl = typeof (body as { url?: unknown })?.url === "string" ? (body as { url: string }).url : "";
  const validation = validateCompanyUrl(rawUrl);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  try {
    const data = await scrapeWebsite(validation.url);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof ScrapeError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 502 });
    }
    console.error("Unexpected scrape failure", err);
    return NextResponse.json({ ok: false, error: "Something went wrong while scraping. Please try again." }, { status: 500 });
  }
}
