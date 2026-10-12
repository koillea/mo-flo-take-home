// Pure extraction functions: HTML in, structured fields out.
// No network calls here, so every extractor can be tested with a saved HTML string.
//
// Priority order used throughout: JSON-LD (explicit, machine-readable) >
// Open Graph / meta tags > visible page text (heuristic, lowest confidence).

import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Faq, Gender, Offering, Person } from "../types";

export type Doc = CheerioAPI;

export function parseHtml(html: string): Doc {
  return cheerio.load(html);
}

// ---------- JSON-LD ----------

type JsonNode = Record<string, unknown>;

// Returns every schema.org node from all JSON-LD blocks, flattened through @graph and arrays.
export function extractJsonLd($: Doc): JsonNode[] {
  const nodes: JsonNode[] = [];

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      const obj = value as JsonNode;
      nodes.push(obj);
      if (Array.isArray(obj["@graph"])) walk(obj["@graph"]);
    }
  };

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      walk(JSON.parse(raw));
    } catch {
      // Malformed JSON-LD is common on real sites. Skip the block and keep going.
    }
  });

  return nodes;
}

export function hasType(node: JsonNode, ...types: string[]): boolean {
  const t = node["@type"];
  const list = Array.isArray(t) ? t : [t];
  return list.some((x) => typeof x === "string" && types.includes(x));
}

function str(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function strList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(str).filter(Boolean);
  const s = str(v);
  return s ? [s] : [];
}

// ---------- Meta tags ----------

export interface MetaInfo {
  title: string;
  description: string;
  siteName: string;
  canonical: string;
  ogImage: string;
  themeColor: string;
  keywords: string[];
}

export function extractMeta($: Doc): MetaInfo {
  const meta = (name: string) =>
    ($(`meta[name="${name}"]`).attr("content") ?? $(`meta[property="${name}"]`).attr("content") ?? "").trim();

  return {
    title: $("title").first().text().trim(),
    description: meta("description") || meta("og:description") || meta("twitter:description"),
    siteName: meta("og:site_name"),
    canonical: $('link[rel="canonical"]').attr("href")?.trim() ?? meta("og:url"),
    ogImage: meta("og:image"),
    themeColor: meta("theme-color"),
    keywords: meta("keywords").split(",").map((k) => k.trim()).filter(Boolean),
  };
}

// ---------- Foundation facts (regex over visible text, lowest confidence) ----------

export function extractVisibleText($: Doc): string {
  const clone = $.root().clone();
  clone.find("script, style, noscript, svg").remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

export function extractYearFounded(text: string, jsonLd: JsonNode[]): string {
  const org = jsonLd.find((n) => hasType(n, "Organization", "LocalBusiness", "ProfessionalService"));
  const fromSchema = org ? str(org["foundingDate"]).slice(0, 4) : "";
  if (/^\d{4}$/.test(fromSchema)) return fromSchema;

  const m = text.match(/(?:founded|established|since|est\.)\s+(?:in\s+)?((?:19|20)\d{2})/i);
  return m ? m[1] : "";
}

export function extractEmployeeCount(text: string, jsonLd: JsonNode[]): string {
  const org = jsonLd.find((n) => hasType(n, "Organization", "LocalBusiness"));
  const emp = org?.["numberOfEmployees"];
  if (emp && typeof emp === "object" && "value" in emp) return str((emp as JsonNode)["value"]);

  const m = text.match(/(\d[\d,]*\+?)\s+(?:employees|team members|staff members)/i);
  return m ? m[1] : "";
}

// Returns only the entity type suffix (e.g. "LLC", "Inc"), not the company name.
export function extractLegalEntity(text: string): string {
  const m = text.match(/\b[A-Z][\w&'-]*(?:\s[A-Z][\w&'-]*){0,4},?\s(LLC|L\.L\.C\.|Inc\.?|Corp\.?|Corporation|Ltd\.?|LLP|PLLC|P\.C\.)(?=\W|$)/);
  return m ? m[1].replace(/\.$/, "") : "";
}

export function extractAddress($: Doc, jsonLd: JsonNode[]): string {
  const org = jsonLd.find((n) => hasType(n, "Organization", "LocalBusiness", "ProfessionalService"));
  const addr = org?.["address"];
  if (typeof addr === "string") return addr.trim();
  if (addr && typeof addr === "object") {
    const a = addr as JsonNode;
    return [a["streetAddress"], a["addressLocality"], a["addressRegion"], a["postalCode"]]
      .map(str)
      .filter(Boolean)
      .join(", ");
  }
  return $("address").first().text().replace(/\s+/g, " ").trim();
}

export function extractIndustry(jsonLd: JsonNode[]): string {
  const org = jsonLd.find((n) => hasType(n, "Organization", "LocalBusiness", "ProfessionalService"));
  return str(org?.["industry"]) || str(org?.["knowsAbout"]) || "";
}

// ---------- Social, contacts ----------

const SOCIAL_HOSTS: Record<string, RegExp> = {
  linkedin: /linkedin\.com\//i,
  facebook: /facebook\.com\//i,
  instagram: /instagram\.com\//i,
  twitter: /(twitter\.com|x\.com)\//i,
  youtube: /youtube\.com\/|youtu\.be\//i,
  tiktok: /tiktok\.com\//i,
  pinterest: /pinterest\.com\//i,
  yelp: /yelp\.com\//i,
};

export function extractSocialLinks($: Doc, jsonLd: JsonNode[], baseUrl: string): Record<string, string> {
  const found: Record<string, string> = {};
  const consider = (href: string) => {
    for (const [platform, re] of Object.entries(SOCIAL_HOSTS)) {
      if (!found[platform] && re.test(href)) {
        // Skip share buttons ("sharer.php", "intent/tweet") which are not company profiles.
        if (/sharer|intent\/|share\?/i.test(href)) return;
        found[platform] = href;
      }
    }
  };

  $("a[href]").each((_, el) => consider(absolute($(el).attr("href") ?? "", baseUrl)));

  // schema.org sameAs is the most reliable signal, so it wins over anchor scraping.
  for (const node of jsonLd) {
    for (const link of strList(node["sameAs"])) consider(link);
  }
  return found;
}

export function extractContacts($: Doc): { emails: string[]; phones: string[] } {
  const emails = new Set<string>();
  const phones = new Set<string>();

  $('a[href^="mailto:"]').each((_, el) => {
    const v = ($(el).attr("href") ?? "").replace(/^mailto:/i, "").split("?")[0].trim();
    if (v) emails.add(v.toLowerCase());
  });
  $('a[href^="tel:"]').each((_, el) => {
    const v = ($(el).attr("href") ?? "").replace(/^tel:/i, "").trim();
    if (v) phones.add(v);
  });

  // Plain-text fallback for contacts not wrapped in links. Filter out image filenames.
  const text = extractVisibleText($);
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) {
    const email = m[0].toLowerCase().replace(/\.+$/, "");
    if (!/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(email)) emails.add(email);
  }
  for (const m of text.matchAll(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g)) phones.add(m[0].trim());

  // Dedupe phones by digits so "+15122737389" and "512.273.7389" count once.
  const seenDigits = new Set<string>();
  const uniquePhones = [...phones].filter((p) => {
    const digits = p.replace(/\D/g, "").slice(-10);
    if (seenDigits.has(digits)) return false;
    seenDigits.add(digits);
    return true;
  });

  return { emails: [...emails].slice(0, 10), phones: uniquePhones.slice(0, 10) };
}

// ---------- Branding ----------

export function extractColors($: Doc, html: string, themeColor: string): string[] {
  const counts = new Map<string, number>();
  const add = (hex: string) => {
    const norm = normalizeHex(hex);
    if (norm && !isNeutral(norm)) counts.set(norm, (counts.get(norm) ?? 0) + 1);
  };

  if (themeColor) add(themeColor);
  for (const m of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) add(m[0]);

  // Most-used colors first. Neutral grays and near-black/white are filtered out above.
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex).slice(0, 6);
}

function normalizeHex(hex: string): string | null {
  const h = hex.replace("#", "").toLowerCase();
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  if (h.length === 6) return `#${h}`;
  return null;
}

// Drops colors where red, green, and blue are nearly equal (grays, black, white).
function isNeutral(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) < 16;
}

export function extractFonts($: Doc, html: string): string[] {
  const fonts = new Set<string>();

  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const family = href.match(/family=([^&:]+)/);
    if (family) fonts.add(decodeURIComponent(family[1]).replace(/\+/g, " "));
  });

  for (const m of html.matchAll(/font-family:\s*["']?([^;"'},]+)/gi)) {
    const name = m[1].split(",")[0].replace(/["']/g, "").trim();
    if (name && !name.startsWith("var(") && name.length < 40) fonts.add(name);
  }

  return [...fonts].slice(0, 6);
}

export function extractLogos($: Doc, baseUrl: string, jsonLd: JsonNode[]): string[] {
  const logos = new Set<string>();

  const org = jsonLd.find((n) => hasType(n, "Organization", "LocalBusiness"));
  const jsonLogo = org?.["logo"];
  if (typeof jsonLogo === "string") logos.add(absolute(jsonLogo, baseUrl));
  if (jsonLogo && typeof jsonLogo === "object") {
    const u = str((jsonLogo as JsonNode)["url"]);
    if (u) logos.add(absolute(u, baseUrl));
  }

  // <img> tags with "logo" in their class, id, or alt text
  $("img").each((_, el) => {
    const $el = $(el);
    const hint = `${$el.attr("class") ?? ""} ${$el.attr("id") ?? ""} ${$el.attr("alt") ?? ""} ${$el.attr("src") ?? ""}`;
    const src = $el.attr("src") ?? "";
    if (/logo/i.test(hint) && src && !src.startsWith("data:")) logos.add(absolute(src, baseUrl));
  });

  // og:image is a social share card, not a logo, so it is intentionally not used here.
  return [...logos].slice(0, 5);
}

// ---------- Key people ----------

export function extractPeople(jsonLd: JsonNode[]): Person[] {
  return jsonLd
    .filter((n) => hasType(n, "Person"))
    .map((n) => ({
      name: str(n["name"]),
      title: str(n["jobTitle"]),
      gender: normalizeGender(str(n["gender"])),
      bio: str(n["description"]),
    }))
    .filter((p) => p.name)
    .slice(0, 20);
}

function normalizeGender(v: string): Gender {
  const s = v.toLowerCase();
  if (s === "male" || s === "m") return "male";
  if (s === "female" || s === "f") return "female";
  return v ? "unknown" : "";
}

// ---------- Offerings ----------

export function extractOfferings(jsonLd: JsonNode[]): Offering[] {
  return jsonLd
    .filter((n) => hasType(n, "Service", "Product", "Offer", "SoftwareApplication", "Event"))
    .map((n) => {
      const offers = n["offers"];
      const offer = (Array.isArray(offers) ? offers[0] : offers) as JsonNode | undefined;
      const price = offer ? [str(offer["price"]), str(offer["priceCurrency"])].filter(Boolean).join(" ") : "";
      return {
        name: str(n["name"]),
        category: str(Array.isArray(n["@type"]) ? n["@type"][0] : n["@type"]),
        description: str(n["description"]),
        price,
        features: [],
      };
    })
    .filter((o) => o.name)
    .slice(0, 30);
}

// ---------- FAQs ----------

export function extractFaqs(jsonLd: JsonNode[]): Faq[] {
  const faqs: Faq[] = [];
  for (const node of jsonLd.filter((n) => hasType(n, "FAQPage"))) {
    const entities = Array.isArray(node["mainEntity"]) ? node["mainEntity"] : [];
    for (const q of entities as JsonNode[]) {
      const answer = q["acceptedAnswer"] as JsonNode | undefined;
      const question = str(q["name"]);
      if (question) faqs.push({ question, answer: str(answer?.["text"]) });
    }
  }
  return faqs.slice(0, 25);
}

// ---------- Testimonials and trust signals ----------

export function extractTestimonials($: Doc): string[] {
  const out = new Set<string>();
  $('blockquote, [class*="testimonial"], [class*="review"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    // Keep quote-length snippets only. Tiny labels and long article bodies are excluded.
    if (text.length >= 40 && text.length <= 400) out.add(text);
  });
  return [...out].slice(0, 15);
}

export function extractCertifications(text: string): string[] {
  const patterns = [
    /\b(?:certified|accredited|licensed|licensed by|member of|award[- ]winning|BBB|A\+ rating)\b[^.]{0,80}/gi,
    /\b(?:CPA|NGWA|AICPA|ProAdvisor)\b[^.]{0,40}/g,
  ];
  const hits = new Set<string>();
  for (const re of patterns) {
    for (const m of text.matchAll(re)) hits.add(m[0].trim());
  }
  // Drop fragments that are contained in a longer hit (e.g. "NGWA)" inside "Member of ... (NGWA)").
  const all = [...hits];
  return all.filter((h) => !all.some((other) => other !== h && other.includes(h))).slice(0, 12);
}

// ---------- CTAs, navigation, legal ----------

export function extractCtas($: Doc): string[] {
  const ctaRe = /\b(get|schedule|contact|quote|estimate|call|book|start|learn|apply|request|buy|try|demo|sign up|subscribe)\b/i;
  const out = new Set<string>();
  $("a, button").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text && text.length <= 40 && ctaRe.test(text)) out.add(text);
  });
  return [...out].slice(0, 15);
}

export function extractLegalLinks($: Doc, baseUrl: string): Record<string, string> {
  const out: Record<string, string> = {};
  const map: [string, RegExp][] = [
    ["privacy", /privacy/i],
    ["terms", /terms|conditions/i],
    ["disclaimer", /disclaimer/i],
    ["accessibility", /accessib/i],
  ];
  $("a[href]").each((_, el) => {
    const text = `${$(el).text()} ${$(el).attr("href")}`;
    for (const [key, re] of map) {
      if (!out[key] && re.test(text)) out[key] = absolute($(el).attr("href") ?? "", baseUrl);
    }
  });
  return out;
}

// Section headings are a rough proxy for content themes (what the company talks about most).
export function extractContentThemes($: Doc): string[] {
  const headings = new Set<string>();
  $("h2, h3").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t.length >= 4 && t.length <= 80) headings.add(t);
  });
  return [...headings].slice(0, 20);
}

// ---------- Helpers ----------

export function absolute(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}
