// Core data model for a MoKnowledge record.
// Mirrors the baseline categories in the MoFlo brief, plus "thinkBigger" extras.

export type Gender = "male" | "female" | "unknown" | "";

export interface Person {
  name: string;
  title: string;
  gender: Gender;
  bio: string;
}

export interface Offering {
  name: string;
  category: string; // e.g. "Service", "Product", "Listing", "Consultation"
  description: string;
  price: string;
  features: string[];
}

export interface Faq {
  question: string;
  answer: string;
}

export interface KnowledgeBase {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: 1;
  sourceUrl: string;

  foundation: {
    name: string;
    description: string;
    website: string;
    industry: string;
    businessModel: string;
    companyRole: string;
    yearFounded: string;
    legalEntityType: string;
    employeeCount: string;
    mainAddress: string;
    otherLocations: string[];
    serviceLocations: string[];
    alternateNames: string[];
  };

  positioning: {
    pitch: string;
    foundingStory: string;
  };

  market: {
    targetBuyers: string[];
    customerNeeds: string;
    idealPersona: string;
    industryGroupings: string[];
    industryOutlook: string;
    channels: string[];
    funnels: string[];
    ctas: string[];
    suppliers: string[];
  };

  branding: {
    writingStyle: string;
    artStyle: string;
    fonts: string[];
    colors: string[];
    logos: string[];
  };

  onlinePresence: {
    socialLinks: Record<string, string>;
    emails: string[];
    phones: string[];
  };

  keyPeople: Person[];
  offerings: Offering[];

  // "Think Bigger" extras that help MoSocial, MoMail, and MoBlogs
  thinkBigger: {
    testimonials: string[];
    certifications: string[];
    faqs: Faq[];
    contentThemes: string[];
    legalLinks: Record<string, string>;
    bodyExcerpt: string; // raw text sample, useful for LLM enrichment later
  };

  // Scraper metadata. Not user-editable.
  scrapeMeta: {
    scrapedAt: string;
    pagesFetched: string[];
    missingFields: string[];
    warnings: string[];
  };
}

// Output of the pure extractor, before ids and timestamps are added.
export type ExtractedData = Omit<KnowledgeBase, "id" | "createdAt" | "updatedAt" | "schemaVersion">;

export interface ScrapeApiResponse {
  ok: boolean;
  data?: ExtractedData;
  error?: string;
}
