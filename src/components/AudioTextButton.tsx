"use client";

import { useEffect, useId, useState } from "react";

type Playback = {
  id: string;
  audio: HTMLAudioElement;
  stop: () => void;
};

let currentPlayback: Playback | null = null;

function stopCurrent() {
  if (!currentPlayback) return;
  currentPlayback.stop();
  currentPlayback = null;
}

export function AudioTextButton({
  text,
  src,
  label,
}: {
  text: string;
  src: string;
  label: string;
}) {
  const id = useId();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (currentPlayback?.id === id) {
        stopCurrent();
      }
    };
  }, [id]);

  function play() {
    stopCurrent();

    const audio = new Audio(src);
    const stop = () => {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
    };

    currentPlayback = { id, audio, stop };
    setPlaying(true);

    const finish = () => {
      if (currentPlayback?.id === id) {
        currentPlayback = null;
      }
      setPlaying(false);
    };

    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    void audio.play().catch(finish);
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      aria-pressed={playing}
      title={text}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-accent transition-colors hover:border-accent hover:bg-card focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <SpeakerIcon playing={playing} />
    </button>
  );
}

function SpeakerIcon({ playing }: { playing: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 fill-current"
    >
      <path d="M4 9v6h3.2L12 19.2V4.8L7.2 9H4z" />
      {playing ? (
        <path d="M16.5 12c0-1.8-1-3.3-2.5-4.1v8.2c1.5-.8 2.5-2.3 2.5-4.1zm2.5 0c0 2.8-1.6 5.3-4 6.5v2.1c3.5-1.4 6-4.7 6-8.6s-2.5-7.2-6-8.6v2.1c2.4 1.2 4 3.7 4 6.5z" />
      ) : (
        <path d="M16.2 8.1v7.8c1.4-.8 2.3-2.3 2.3-3.9 0-1.6-.9-3.1-2.3-3.9z" />
      )}
    </svg>
  );
}
