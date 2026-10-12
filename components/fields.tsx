// Small, reusable form primitives used by the knowledge base editor.
"use client";

import type { ReactNode } from "react";

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[color:var(--brand)] focus:outline-none focus:ring-2 focus:ring-blue-100";

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  wide,
  missing,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  missing?: boolean;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        {missing && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800">not found</span>}
      </span>
      {children}
    </label>
  );
}

export function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea className={inputCls} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />;
}

// Lists are edited one item per line, then split back into an array.
export function ListArea({ value, onChange, rows = 3 }: { value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  return (
    <textarea
      className={inputCls}
      rows={rows}
      value={value.join("\n")}
      onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
    />
  );
}

// Key/value records are edited as "key: value" lines.
export function RecordArea({ value, onChange, rows = 3 }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void; rows?: number }) {
  return (
    <textarea
      className={inputCls}
      rows={rows}
      value={Object.entries(value).map(([k, v]) => `${k}: ${v}`).join("\n")}
      onChange={(e) => {
        const out: Record<string, string> = {};
        for (const line of e.target.value.split("\n")) {
          const idx = line.indexOf(":");
          if (idx < 1) continue;
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx + 1).trim();
          if (key && val) out[key] = val;
        }
        onChange(out);
      }}
    />
  );
}

export const inputClass = inputCls;
