// Review-and-edit form for a knowledge base draft. Fields the scraper couldn't find are flagged.
"use client";

import type { Faq, Gender, KnowledgeBase, Offering, Person } from "@/lib/types";
import { Field, ListArea, RecordArea, Section, TextArea, TextInput, inputClass } from "./fields";

// Returns a list of human-readable problems. An empty list means the draft can be saved.
export function validateDraft(d: KnowledgeBase): string[] {
  const errors: string[] = [];
  if (!d.foundation.name.trim()) errors.push("Company name is required.");
  if (d.foundation.website && !/^https?:\/\//i.test(d.foundation.website)) {
    errors.push("Website must start with http:// or https://.");
  }
  if (d.foundation.yearFounded && !/^(19|20)\d{2}$/.test(d.foundation.yearFounded)) {
    errors.push("Year founded must be a four-digit year.");
  }
  for (const e of d.onlinePresence.emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.push(`Invalid email: ${e}`);
  }
  for (const c of d.branding.colors) {
    if (!/^#[0-9a-f]{6}$/i.test(c)) errors.push(`Colors must be 6-digit hex values, got "${c}".`);
  }
  return errors;
}

interface Props {
  draft: KnowledgeBase;
  onChange: (next: KnowledgeBase) => void;
  missing: string[];
}

export default function KnowledgeEditor({ draft, onChange, missing }: Props) {
  const isMissing = (key: string) => missing.includes(key);
  const set = <K extends keyof KnowledgeBase>(section: K, patch: Partial<KnowledgeBase[K]>) =>
    onChange({ ...draft, [section]: { ...(draft[section] as object), ...patch } });

  const f = draft.foundation;
  const p = draft.positioning;
  const m = draft.market;
  const b = draft.branding;
  const o = draft.onlinePresence;
  const t = draft.thinkBigger;

  return (
    <div className="space-y-6">
      <Section title="Company foundation" id="foundation">
        <Field label="Company name" missing={isMissing("foundation.name")}>
          <TextInput value={f.name} onChange={(v) => set("foundation", { name: v })} />
        </Field>
        <Field label="Industry" missing={isMissing("foundation.industry")}>
          <TextInput value={f.industry} onChange={(v) => set("foundation", { industry: v })} />
        </Field>
        <Field label="Overview / description" wide missing={isMissing("foundation.description")}>
          <TextArea value={f.description} onChange={(v) => set("foundation", { description: v })} />
        </Field>
        <Field label="Website">
          <TextInput value={f.website} onChange={(v) => set("foundation", { website: v })} />
        </Field>
        <Field label="Company role">
          <TextInput value={f.companyRole} onChange={(v) => set("foundation", { companyRole: v })} />
        </Field>
        <Field label="Business model" wide>
          <TextArea value={f.businessModel} onChange={(v) => set("foundation", { businessModel: v })} />
        </Field>
        <Field label="Year founded" missing={isMissing("foundation.yearFounded")}>
          <TextInput value={f.yearFounded} onChange={(v) => set("foundation", { yearFounded: v })} />
        </Field>
        <Field label="Legal entity type">
          <TextInput value={f.legalEntityType} onChange={(v) => set("foundation", { legalEntityType: v })} />
        </Field>
        <Field label="Employee count">
          <TextInput value={f.employeeCount} onChange={(v) => set("foundation", { employeeCount: v })} />
        </Field>
        <Field label="Main address" missing={isMissing("foundation.mainAddress")}>
          <TextInput value={f.mainAddress} onChange={(v) => set("foundation", { mainAddress: v })} />
        </Field>
        <Field label="Other locations (one per line)">
          <ListArea value={f.otherLocations} onChange={(v) => set("foundation", { otherLocations: v })} />
        </Field>
        <Field label="Service locations (one per line)">
          <ListArea value={f.serviceLocations} onChange={(v) => set("foundation", { serviceLocations: v })} />
        </Field>
        <Field label="Alternative names (one per line)" wide>
          <ListArea value={f.alternateNames} onChange={(v) => set("foundation", { alternateNames: v })} />
        </Field>
      </Section>

      <Section title="Positioning" id="positioning">
        <Field label="Company pitch" wide missing={isMissing("positioning.pitch")}>
          <TextArea value={p.pitch} onChange={(v) => set("positioning", { pitch: v })} rows={3} />
        </Field>
        <Field label="Founding story" wide>
          <TextArea value={p.foundingStory} onChange={(v) => set("positioning", { foundingStory: v })} rows={3} />
        </Field>
      </Section>

      <Section title="Market & customers" id="market">
        <Field label="Target buyers (one per line)">
          <ListArea value={m.targetBuyers} onChange={(v) => set("market", { targetBuyers: v })} />
        </Field>
        <Field label="Industry groupings (one per line)">
          <ListArea value={m.industryGroupings} onChange={(v) => set("market", { industryGroupings: v })} />
        </Field>
        <Field label="Customer needs" wide>
          <TextArea value={m.customerNeeds} onChange={(v) => set("market", { customerNeeds: v })} />
        </Field>
        <Field label="Ideal customer persona" wide>
          <TextArea value={m.idealPersona} onChange={(v) => set("market", { idealPersona: v })} />
        </Field>
        <Field label="Industry outlook" wide>
          <TextArea value={m.industryOutlook} onChange={(v) => set("market", { industryOutlook: v })} />
        </Field>
        <Field label="Channels (one per line)">
          <ListArea value={m.channels} onChange={(v) => set("market", { channels: v })} />
        </Field>
        <Field label="Funnels (one per line)">
          <ListArea value={m.funnels} onChange={(v) => set("market", { funnels: v })} />
        </Field>
        <Field label="CTAs (one per line)">
          <ListArea value={m.ctas} onChange={(v) => set("market", { ctas: v })} />
        </Field>
        <Field label="Suppliers / partners (one per line)">
          <ListArea value={m.suppliers} onChange={(v) => set("market", { suppliers: v })} />
        </Field>
      </Section>

      <Section title="Branding & style" id="branding">
        <Field label="Writing style" wide>
          <TextArea value={b.writingStyle} onChange={(v) => set("branding", { writingStyle: v })} />
        </Field>
        <Field label="Art style" wide>
          <TextArea value={b.artStyle} onChange={(v) => set("branding", { artStyle: v })} />
        </Field>
        <Field label="Fonts (one per line)" missing={isMissing("branding.fonts")}>
          <ListArea value={b.fonts} onChange={(v) => set("branding", { fonts: v })} />
        </Field>
        <Field label="Brand colors (hex, one per line)" missing={isMissing("branding.colors")}>
          <ListArea value={b.colors} onChange={(v) => set("branding", { colors: v })} />
        </Field>
        <Field label="Logo URLs (one per line)" wide missing={isMissing("branding.logos")}>
          <ListArea value={b.logos} onChange={(v) => set("branding", { logos: v })} />
        </Field>
      </Section>

      <Section title="Online presence" id="online">
        <Field label="Social links (platform: url)" wide missing={isMissing("onlinePresence.socialLinks")}>
          <RecordArea value={o.socialLinks} onChange={(v) => set("onlinePresence", { socialLinks: v })} rows={4} />
        </Field>
        <Field label="Emails (one per line)">
          <ListArea value={o.emails} onChange={(v) => set("onlinePresence", { emails: v })} />
        </Field>
        <Field label="Phones (one per line)">
          <ListArea value={o.phones} onChange={(v) => set("onlinePresence", { phones: v })} />
        </Field>
      </Section>

      <Section title="Key people" id="people">
        <div className="md:col-span-2">
          <RowsEditor<Person>
            rows={draft.keyPeople}
            onChange={(rows) => onChange({ ...draft, keyPeople: rows })}
            empty={{ name: "", title: "", gender: "" as Gender, bio: "" }}
            missing={isMissing("keyPeople")}
            columns={[
              { key: "name", label: "Name" },
              { key: "title", label: "Title / role" },
              { key: "gender", label: "Gender", options: ["", "male", "female", "unknown"] },
              { key: "bio", label: "Background", wide: true },
            ]}
          />
        </div>
      </Section>

      <Section title="Offerings" id="offerings">
        <div className="md:col-span-2">
          <RowsEditor<Offering>
            rows={draft.offerings}
            onChange={(rows) => onChange({ ...draft, offerings: rows })}
            empty={{ name: "", category: "", description: "", price: "", features: [] }}
            missing={isMissing("offerings")}
            columns={[
              { key: "name", label: "Name" },
              { key: "category", label: "Category" },
              { key: "price", label: "Pricing" },
              { key: "description", label: "Description", wide: true },
            ]}
          />
        </div>
      </Section>

      <Section title="Think bigger: trust, FAQs, and content" id="extras">
        <Field label="Testimonials (one per line)" wide>
          <ListArea value={t.testimonials} onChange={(v) => set("thinkBigger", { testimonials: v })} rows={4} />
        </Field>
        <Field label="Certifications & trust signals (one per line)" wide>
          <ListArea value={t.certifications} onChange={(v) => set("thinkBigger", { certifications: v })} />
        </Field>
        <Field label="Content themes (one per line)">
          <ListArea value={t.contentThemes} onChange={(v) => set("thinkBigger", { contentThemes: v })} />
        </Field>
        <Field label="Legal links (name: url)">
          <RecordArea value={t.legalLinks} onChange={(v) => set("thinkBigger", { legalLinks: v })} />
        </Field>
        <div className="md:col-span-2">
          <RowsEditor<Faq>
            label="FAQs"
            rows={t.faqs}
            onChange={(rows) => set("thinkBigger", { faqs: rows })}
            empty={{ question: "", answer: "" }}
            columns={[
              { key: "question", label: "Question" },
              { key: "answer", label: "Answer", wide: true },
            ]}
          />
        </div>
        <Field label="Source text excerpt (read-only, used for AI enrichment later)" wide>
          <textarea className={`${inputClass} bg-slate-50 text-slate-500`} rows={4} readOnly value={t.bodyExcerpt} />
        </Field>
      </Section>
    </div>
  );
}

// Generic add/remove row editor for arrays of objects.
interface Column<T> {
  key: keyof T & string;
  label: string;
  wide?: boolean;
  options?: string[];
}

function RowsEditor<T extends object>({
  rows,
  onChange,
  columns,
  empty,
  label,
  missing,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  columns: Column<T>[];
  empty: T;
  label?: string;
  missing?: boolean;
}) {
  const update = (i: number, key: keyof T, value: unknown) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r));
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        {label ?? "Entries"}
        {missing && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800">not found</span>}
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-slate-200 p-3 md:grid-cols-2">
            {columns.map((c) => (
              <label key={c.key} className={c.wide ? "md:col-span-2" : ""}>
                <span className="mb-1 block text-xs text-slate-500">{c.label}</span>
                {c.options ? (
                  <select className={inputClass} value={String(row[c.key] ?? "")} onChange={(e) => update(i, c.key, e.target.value)}>
                    {c.options.map((o) => (
                      <option key={o} value={o}>{o || "—"}</option>
                    ))}
                  </select>
                ) : (
                  <input className={inputClass} value={String(row[c.key] ?? "")} onChange={(e) => update(i, c.key, e.target.value)} />
                )}
              </label>
            ))}
            <div className="md:col-span-2 text-right">
              <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        onClick={() => onChange([...rows, structuredClone(empty)])}
      >
        + Add entry
      </button>
    </div>
  );
}
