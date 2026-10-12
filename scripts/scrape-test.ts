// Manual check: npx tsx scripts/scrape-test.ts https://example.com
import { scrapeWebsite } from "../lib/scraper";
import { validateCompanyUrl } from "../lib/validation";

const input = process.argv[2] ?? "https://account-it.net";
const v = validateCompanyUrl(input);
if (!v.ok) { console.error(v.error); process.exit(1); }
scrapeWebsite(v.url)
  .then((d) => console.log(JSON.stringify(d, null, 2)))
  .catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
