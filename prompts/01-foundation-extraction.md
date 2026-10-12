# Prompt 1: Foundation extraction

**Purpose:** turn messy scraped text and metadata into the Company Foundation fields.
**Used by:** the enrichment step after the scraper. Not called in this build (no LLM is connected).

## System prompt

You extract structured company facts from scraped website data. Rules:
1. Use only the provided input. Never use outside knowledge about the company.
2. If a field is not clearly supported by the input, return `null`. Do not guess.
3. Prefer explicit structured data (JSON-LD) over inferred text. The input labels each source.
4. Return only JSON matching the schema. No commentary.

## User prompt template

```
Input sources (in priority order):
- JSON-LD: {{jsonld}}
- Meta tags: {{meta}}
- Visible text excerpt (first 1500 chars): {{body_excerpt}}
- About page text (may be empty): {{about_text}}

Return JSON:
{
  "name": string | null,
  "industry": string | null,
  "businessModel": string | null,   // one sentence: what they sell and to whom
  "companyRole": string | null,     // e.g. "Service provider", "Brokerage", "SaaS"
  "yearFounded": string | null,     // 4-digit year, only if stated
  "legalEntityType": string | null, // "LLC", "Inc", "Ltd", etc.
  "employeeCount": string | null,
  "mainAddress": string | null,
  "alternateNames": string[]
}
```

## Example

**Input (abridged):** JSON-LD `Organization` with `foundingDate: "1980"`, `name: "Riverbend Drilling Inc"`; body text says "family-owned since 1980".

**Expected output:**
```json
{
  "name": "Riverbend Drilling Inc",
  "industry": "Water Well Drilling",
  "businessModel": "Residential and commercial water well drilling, installation, and maintenance, with free estimates and financing.",
  "companyRole": "Service provider",
  "yearFounded": "1980",
  "legalEntityType": "Inc",
  "employeeCount": null,
  "mainAddress": "185 Angel Fire Rd, Dripping Springs, TX 78620",
  "alternateNames": ["Riverbend Well Co"]
}
```

Note: `legalEntityType` is `Inc` only because the source says "Inc". It is not inferred from "family-owned".
