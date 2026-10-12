// Offline check: runs the extractor on saved HTML, so no network is needed.
import { readFileSync } from "node:fs";
import { buildFromHtml } from "../lib/scraper";

const home = readFileSync("fixtures/home.html", "utf8");
const about = readFileSync("fixtures/about.html", "utf8");
const data = buildFromHtml(home, "https://riverbend-drilling.example/", about);
console.log(JSON.stringify(data, null, 2));
