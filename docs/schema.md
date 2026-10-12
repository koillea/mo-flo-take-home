# Knowledge base schema

The JSON shape is defined in `lib/types.ts`. This document explains the design choices.

## Top-level structure

| Section | Purpose | Mainly used by |
|---|---|---|
| `foundation` | Who the company is: name, industry, size, location | All apps |
| `positioning` | Pitch and founding story | MoSocial, MoBlogs |
| `market` | Buyers, needs, CTAs, channels | MoMail, MoSocial |
| `branding` | Voice, fonts, colors, logos | All apps (visual and tone) |
| `onlinePresence` | Social profiles and contact points | MoSocial (handles), MoMail (reply-to) |
| `keyPeople` | Named people with roles | MoBlogs (bylines), MoSocial (spokesperson) |
| `offerings` | Products and services with pricing | All apps |
| `thinkBigger` | Testimonials, FAQs, certifications, themes, legal links, raw excerpt | MoBlogs, MoMail |
| `scrapeMeta` | Source pages and missing fields | Review UI, data quality |

## Design choices

- **Arrays for multi-value fields** (`fonts`, `colors`, `ctas`): consumers can iterate without parsing strings.
- **Key/value record for social links** (`socialLinks: { linkedin: url }`): a missing platform is an absent key, not an empty string.
- **Gender union** (`"male" | "female" | "unknown" | ""`): an empty string means not extracted, while `"unknown"` means it was extracted but not stated.
- **`scrapeMeta.missingFields`**: a list of dot-paths. The review UI uses it to flag gaps, and downstream apps can refuse to generate copy when a required field is missing.
- **`schemaVersion: 1`**: lets future migrations read old JSON without guessing.
- **`thinkBigger.bodyExcerpt`**: keeping the raw source text means the knowledge base can be re-enriched later without re-scraping.

## Limitations

- `businessModel`, `companyRole`, `targetBuyers`, `customerNeeds`, and `writingStyle` come back blank from scraping. They need the enrichment step in `prompts/`.
- `foundingStory` is the first sentence containing "founded" on the about page. Flattened visible text has no reliable sentence boundaries, so it can include a heading. Enrichment should clean it.
- Gender is only read from JSON-LD `gender`. Team pages without schema.org markup won't produce it.
