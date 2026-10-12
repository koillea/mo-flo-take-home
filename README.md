# MoKnowledge

MoKnowledge is a web app that scrapes a company's website and turns it into a structured, reviewable knowledge base. The user enters a URL, the server fetches and parses the site, the user reviews and corrects the results, and the final record is saved as JSON. The output is meant to feed content apps such as MoSocial, MoMail, and MoBlogs.

## Setup

Requirements: Node.js 18.18 or newer, npm.

```bash
npm install
npm run dev        # http://localhost:3000 -> redirects to /knowledge
```

Other scripts:

```bash
npm run build      # production build
npm run lint
npx tsx scripts/fixture-test.ts          # offline extractor check using fixtures/
npx tsx scripts/scrape-test.ts https://yourcompany.com   # live scrape from the terminal
```

## Features

- **Scrape & Build (`/knowledge`)**: URL input with validation, a scrape button with a loading state, and a review form grouped by knowledge base category. Fields the scraper couldn't find are flagged.
- **Review and edit**: every field is editable. The form checks required fields, hex colors, emails, and years before saving.
- **Save and export**: records are saved in the browser, and each one can be downloaded as JSON.
- **Manage (`/knowledge/view`)**: card, table, and detail views; search across name, industry, website, and location; edit and delete.
- **Error handling**: invalid URLs, private addresses, unreachable sites, non-HTML responses, malformed JSON, and corrupt stored data each produce a readable message.

## How scraping works

The scraper runs on the server (`app/api/scrape/route.ts`). A browser can't fetch third-party sites because of CORS, so the server does the fetching.

1. **Validate** the URL (`lib/validation.ts`). It requires http or https and a real domain, and rejects localhost and private IP ranges so the endpoint can't be used to probe internal networks.
2. **Fetch** the homepage with a 15-second timeout and a 2 MB size cap (`lib/scraper/fetch.ts`). Then try `/about`, `/about-us`, and `/company` for founding story and team context.
3. **Extract** with pure functions over the HTML (`lib/scraper/extract.ts`). No network calls happen here, so the extractors can be tested with saved HTML.
4. **Assemble** the record and list any key fields that came back empty in `scrapeMeta.missingFields` (`lib/scraper/index.ts`).

### Source priority

When several sources could supply the same fact, the scraper prefers the most explicit one:

1. **JSON-LD** (schema.org `Organization`, `Person`, `Service`, `FAQPage`). Machine-readable and authored by the site owner.
2. **Meta and Open Graph tags** (`description`, `og:site_name`, `theme-color`).
3. **Anchors and markup** (`mailto:`, `tel:`, social links, `img` tags with "logo" in their attributes).
4. **Visible text with regex** (founding year, employee count, legal entity suffix). This is the least reliable and is labeled as such in the docs.

### Fallback for missing data

- Empty fields stay empty and are never filled with placeholder text.
- Missing key fields are listed in `scrapeMeta.missingFields` and flagged in the review UI.
- A warning appears when most fields are missing, which usually means the site renders its content with JavaScript.
- Fields that need interpretation (`targetBuyers`, `writingStyle`) are left for the enrichment step rather than guessed.

## Knowledge base schema

The full schema is in `lib/types.ts`, with design notes in `docs/schema.md`. Top-level sections:

`foundation`, `positioning`, `market`, `branding`, `onlinePresence`, `keyPeople`, `offerings`, `thinkBigger`, `scrapeMeta`.

Beyond the baseline, `thinkBigger` adds testimonials, certifications and trust signals, FAQs, content themes (from section headings), legal links, and a raw text excerpt. These support MoSocial (proof points and themes), MoMail (FAQs and trust signals for reply copy), and MoBlogs (themes and source text for long-form content).

The Supabase design (bonus) is in `docs/supabase-schema.sql`. It covers multi-company ownership, append-only versions, and RLS policies.

## Example AI prompts

Prompts are in `prompts/`. They are documented but not called, because the assignment doesn't require an LLM:

- `01-foundation-extraction.md`: turns scraped metadata and text into foundation fields, returning `null` when unsupported.
- `02-market-and-voice.md`: infers buyers and writing style, with a quoted `evidence` field and a confidence level for each claim.
- `03-content-generation-context.md`: shows how the knowledge base constrains downstream content so it doesn't invent testimonials or awards.

## Assumptions and limitations

- **Static HTML only.** Sites that render content with JavaScript will return few fields. A headless browser would be the next step.
- **Two pages.** The scraper reads the homepage and one about page. It doesn't crawl the full site.
- **Regex heuristics** for founding year, employee count, and legal entity type. They can miss or mis-match.
- **`foundingStory` can include headings** because visible text has no reliable sentence boundaries.
- **Storage is `localStorage`.** Records are per browser and not shared between devices. The Supabase design is the production path.
- **No authentication.** Anyone using the browser has access to its records.
- **Legal and robots.txt** are not checked. A production scraper should respect robots.txt and each site's terms.

## Testing

- `npm run build` and `npm run lint` pass.
- `npx tsx scripts/fixture-test.ts` runs the extractor on `fixtures/home.html` and `fixtures/about.html`. The output is in `examples/sample-output.json`.
- The API's validation and error paths were checked by hand with curl.

**Not verified:** a live scrape of a real company site. The development sandbox blocks outbound requests to external sites, so the sample output is generated from a fixture that imitates a typical small-business website. Run `npx tsx scripts/scrape-test.ts <url>` to test against a real site.

## Project layout

```
app/
  api/scrape/route.ts     POST endpoint: validate, scrape, return JSON
  knowledge/              Scrape & build page (review, save, export)
  knowledge/view/         Manage page (cards, table, detail, search, delete)
components/               Nav, form primitives, knowledge base editor
lib/
  types.ts                Data model
  validation.ts           URL validation and SSRF guard
  scraper/                fetch.ts, extract.ts (pure), index.ts (orchestration)
  storage.ts              localStorage persistence
prompts/                  Example LLM prompts
docs/                     Schema notes and Supabase bonus design
examples/                 Sample JSON output
fixtures/                 Saved HTML for offline testing
scripts/                  Offline and live test runners
```
