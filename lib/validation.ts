// Validates a user-entered company website URL.
// Returns a normalized URL string or a human-readable error.

export type UrlValidation =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function validateCompanyUrl(input: string): UrlValidation {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Please enter a website URL." };

  // Allow users to omit the scheme, e.g. "account-it.net"
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are supported." };
  }

  // Require a real-looking hostname with at least one dot (blocks "localhost", "foo").
  if (!parsed.hostname.includes(".")) {
    return { ok: false, error: "Enter a full domain, such as example.com." };
  }

  // Block obvious private/local targets to avoid SSRF through the scrape endpoint.
  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, error: "Private or local addresses can't be scraped." };
  }

  return { ok: true, url: parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname) };
}

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  return false;
}
