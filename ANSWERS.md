# Answers

> Draft based on what this repo actually does. Rewrite in your own words before submitting, and check every claim against the code.

## 1. What approach did you take to scraping and structuring the knowledge base data?

The scraper runs on the server, because browsers can't fetch third-party sites because of CORS. It fetches the homepage and one about page, then runs pure extraction functions over the HTML. Each fact has a source priority: JSON-LD first, then meta and Open Graph tags, then anchor and markup patterns, and last visible-text regex. I separated fetching from extraction so the extractors can be tested offline with saved HTML. Fields that couldn't be found stay empty and are listed in `scrapeMeta.missingFields`, so the review UI can flag them instead of showing guesses.

## 2. What information beyond our current baseline did you choose to include, and why?

I added a `thinkBigger` section with testimonials, certification and trust signals, FAQs, content themes, legal links, and a raw text excerpt. I picked these because they are the material that makes copy specific instead of generic. Testimonials and certifications are proof points, FAQs answer what customers ask, and content themes come from section headings and show what the company talks about most. I also kept the raw excerpt so the record can be re-enriched later without re-scraping.

## 3. How would your knowledge base design improve the outputs of MoSocial, MoMail, and MoBlogs specifically?

- **MoSocial:** `ctas`, `contentThemes`, and `industry` give it approved calls to action and hashtag sources. Social handles let it tag the right accounts.
- **MoMail:** `faqs` and `certifications` give it accurate reply copy, and `emails` gives the correct reply-to address.
- **MoBlogs:** `contentThemes`, `bodyExcerpt`, and `keyPeople` (for bylines) give it topics and a source to draw from without inventing facts.

Across all three, `branding.writingStyle` and `thinkBigger.testimonials` are the main guard against generic output. The prompt in `prompts/03` says to use only fields that exist.

## 4. What would you improve or change about MoKnowledge if you had more time?

- Render JavaScript sites with a headless browser, since static HTML misses many modern sites.
- Crawl more pages with a limit and a sitemap, instead of just the homepage and about page.
- Add an LLM enrichment step for `targetBuyers`, `customerNeeds`, and `writingStyle`, with evidence quotes and confidence levels.
- Replace `localStorage` with the Supabase design and add version history.
- Respect robots.txt and rate-limit requests per domain.
- Add tests for the extractors, using a folder of saved real-site HTML files.

## 5. What was the most challenging part of this assignment?

The hardest part was handling incomplete and inconsistent data. Sites put the same fact in different places, and the visible text is flattened, so sentence boundaries are lost. For example, the founding story sometimes picks up a heading, and the legal entity regex needed care to return "Inc" instead of the full company name. I also couldn't test against live sites from my development environment, so the sample output comes from a fixture instead.
