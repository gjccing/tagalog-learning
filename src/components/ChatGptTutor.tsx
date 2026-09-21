"use client";

import { useEffect, useId, useState } from "react";
import { t, type Dictionary, type Locale } from "@/lib/i18n";

export function ChatGptTutor({
  href,
  lang,
  dict,
}: {
  href: string;
  lang: Locale;
  dict: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-left shadow-sm transition-colors hover:border-accent"
      >
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-medium tracking-tight">
            {t(dict, "Practice with ChatGPT")}
          </p>
          <span className="shrink-0 text-sm font-medium text-accent">
            {t(dict, "Voice")}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {t(
            dict,
            "Open this lesson in ChatGPT and tap Voice to start speaking.",
          )}
        </p>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label={t(dict, "Close")}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <h3
                id={titleId}
                className="text-xl font-semibold tracking-tight"
              >
                {t(dict, "Practice with ChatGPT")}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {t(dict, "Close")}
              </button>
            </div>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>{t(dict, "Open ChatGPT with this lesson.")}</li>
              <li>{t(dict, "Turn on Voice mode yourself.")}</li>
              <li>
                {t(
                  dict,
                  "Click the settings in the top right and change the voice language.",
                )}
              </li>
            </ol>
            <video
              className="mt-4 w-full rounded-xl bg-foreground/5"
              controls
              playsInline
              preload="metadata"
              aria-label={t(dict, "How to change the ChatGPT voice language")}
            >
              <source
                src={`/videos/chatgpt-voice-language-${lang}.mp4`}
                type="video/mp4"
              />
              <source
                src={`/videos/chatgpt-voice-language-${lang}.mov`}
                type="video/quicktime"
              />
            </video>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {t(dict, "Open ChatGPT")}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
