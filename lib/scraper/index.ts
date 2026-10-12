// Orchestrates the scrape: fetch pages, run extractors, return an ExtractedData object.
// Fallback strategy: every field has a source chain. When a field is empty we record it in
// scrapeMeta.missingFields so the UI can flag it instead of silently showing blanks.

import type { ExtractedData } from "../types";
import { fetchPage } from "./fetch";
import {
  extractAddress,
  extractCertifications,
  extractContacts,
  extractContentThemes,
  extractCtas,
  extractEmployeeCount,
  extractFaqs,
  extractFonts,
  extractIndustry,
  extractJsonLd,
  extractLegalEntity,
  extractLegalLinks,
  extractLogos,
  extractMeta,
  extractOfferings,
  extractPeople,
  extractColors,
  extractSocialLinks,
  extractTestimonials,
  extractVisibleText,
  extractYearFounded,
  parseHtml,
  type Doc,
} from "./extract";

// Pages to try in addition to the homepage. The first one that exists is used.
const ABOUT_PATHS = ["/about", "/about-us", "/company"];

export async function scrapeWebsite(url: string): Promise<ExtractedData> {
  const warnings: string[] = [];
  const home = await fetchPage(url);
  if (!home) {
    throw new ScrapeError("Couldn't load that page. Check the URL, or the site may block scrapers or require JavaScript.");
  }

  const pagesFetched = [home.url];
  let aboutHtml = "";
  for (const path of ABOUT_PATHS) {
    const about = await fetchPage(new URL(path, home.url).toString());
    if (about) {
      aboutHtml = about.html;
      pagesFetched.push(about.url);
      break;
    }
  }

  const data = buildFromHtml(home.html, home.url, aboutHtml, warnings);
  data.sourceUrl = url;
  data.scrapeMeta.pagesFetched = pagesFetched;
  return data;
}

// Pure function. Given HTML strings, returns extracted data. Easy to test with saved pages.
export function buildFromHtml(
  html: string,
  baseUrl: string,
  aboutHtml: string,
  warnings: string[] = [],
): ExtractedData {
  const $ = parseHtml(html);
  const jsonLd = extractJsonLd($);
  const meta = extractMeta($);
  const text = extractVisibleText($);
  const aboutDoc = aboutHtml ? parseHtml(aboutHtml) : null;
  const aboutText = aboutDoc ? extractVisibleText(aboutDoc) : "";
  const aboutJsonLd = aboutDoc ? extractJsonLd(aboutDoc) : [];

  // Prefer schema.org names, then Open Graph site name, then the <title> before any separator.
  const orgNode = jsonLd.find((n) => ["Organization", "LocalBusiness", "ProfessionalService"].some((t) => {
    const ty = n["@type"];
    return ty === t || (Array.isArray(ty) && ty.includes(t));
  }));
  const name =
    (typeof orgNode?.["name"] === "string" && orgNode["name"]) ||
    meta.siteName ||
    meta.title.split(/\s[|\-–—:]\s/)[0];

  const allJsonLd = [...jsonLd, ...aboutJsonLd];
  const allText = `${text} ${aboutText}`;
  const altNames = typeof orgNode?.["alternateName"] !== "undefined" ? toArray(orgNode["alternateName"]) : [];
  if (meta.siteName && meta.siteName !== name) altNames.push(meta.siteName);

  const foundingStory = aboutText.match(/[^.]*\b(?:founded|started|began|established)\b[^.]*\./i)?.[0].trim() ?? "";
  const contacts = extractContacts($);
  const legalEntity = extractLegalEntity(text);
  const businessModel = typeof orgNode?.["makesOffer"] === "string" ? orgNode["makesOffer"] : "";

  const data: ExtractedData = {
    sourceUrl: baseUrl,
    foundation: {
      name,
      description: meta.description,
      website: meta.canonical || baseUrl,
      industry: extractIndustry(allJsonLd),
      businessModel,
      companyRole: "",
      yearFounded: extractYearFounded(allText, allJsonLd),
      legalEntityType: legalEntity,
      employeeCount: extractEmployeeCount(allText, allJsonLd),
      mainAddress: extractAddress($, allJsonLd),
      otherLocations: [],
      serviceLocations: [],
      alternateNames: [...new Set(altNames.filter(Boolean))],
    },
    positioning: {
      pitch: meta.description,
      foundingStory,
    },
    market: {
      targetBuyers: [],
      customerNeeds: "",
      idealPersona: "",
      industryGroupings: [],
      industryOutlook: "",
      channels: [],
      funnels: [],
      ctas: extractCtas($),
      suppliers: [],
    },
    branding: {
      writingStyle: "",
      artStyle: "",
      fonts: extractFonts($, html),
      colors: extractColors($, html, meta.themeColor),
      logos: extractLogos($, baseUrl, allJsonLd),
    },
    onlinePresence: {
      socialLinks: extractSocialLinks($, allJsonLd, baseUrl),
      emails: contacts.emails,
      phones: contacts.phones,
    },
    keyPeople: extractPeople(allJsonLd),
    offerings: extractOfferings(allJsonLd),
    thinkBigger: {
      testimonials: extractTestimonials($),
      certifications: extractCertifications(allText),
      faqs: extractFaqs(allJsonLd),
      contentThemes: extractContentThemes($),
      legalLinks: extractLegalLinks($, baseUrl),
      bodyExcerpt: text.slice(0, 1500),
    },
    scrapeMeta: {
      scrapedAt: new Date().toISOString(),
      pagesFetched: [baseUrl],
      missingFields: [],
      warnings,
    },
  };

  data.scrapeMeta.missingFields = findMissing(data);
  if (data.scrapeMeta.missingFields.length > 8) {
    warnings.push("Many fields came back empty. The site may render content with JavaScript, which this scraper can't run.");
  }
  return data;
}

// Fields a reviewer should look at first. Keys use dot notation for the editor.
const REQUIRED_FIELDS: [string, (d: ExtractedData) => unknown][] = [
  ["foundation.name", (d) => d.foundation.name],
  ["foundation.description", (d) => d.foundation.description],
  ["foundation.industry", (d) => d.foundation.industry],
  ["foundation.yearFounded", (d) => d.foundation.yearFounded],
  ["foundation.mainAddress", (d) => d.foundation.mainAddress],
  ["positioning.pitch", (d) => d.positioning.pitch],
  ["branding.colors", (d) => d.branding.colors],
  ["branding.logos", (d) => d.branding.logos],
  ["onlinePresence.socialLinks", (d) => d.onlinePresence.socialLinks],
  ["keyPeople", (d) => d.keyPeople],
  ["offerings", (d) => d.offerings],
];

function findMissing(d: ExtractedData): string[] {
  return REQUIRED_FIELDS.filter(([, get]) => {
    const v = get(d);
    if (Array.isArray(v)) return v.length === 0;
    if (v && typeof v === "object") return Object.keys(v).length === 0;
    return !v;
  }).map(([key]) => key);
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return typeof v === "string" ? [v] : [];
}

export class ScrapeError extends Error {}
export type { Doc };
