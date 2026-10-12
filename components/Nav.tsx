import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/knowledge" className="text-lg font-semibold text-slate-900">
          <span className="text-[color:var(--brand)]">Mo</span>Knowledge
        </Link>
        <nav className="flex gap-4 text-sm font-medium text-slate-600">
          <Link href="/knowledge" className="hover:text-slate-900">Scrape &amp; Build</Link>
          <Link href="/knowledge/view" className="hover:text-slate-900">Manage</Link>
        </nav>
      </div>
    </header>
  );
}
