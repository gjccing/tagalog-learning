import { t, type Dictionary } from "@/lib/i18n";

export function AnkiDownload({
  href,
  dict,
}: {
  href: string;
  dict: Dictionary;
}) {
  return (
    <a
      href={href}
      download
      className="block rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:border-accent"
    >
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-medium tracking-tight">
          {t(dict, "Download Anki deck")}
        </p>
        <span className="shrink-0 text-sm font-medium text-accent">.apkg</span>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        {t(dict, "Import this lesson into Anki. Cards include Tagalog audio.")}
      </p>
    </a>
  );
}
