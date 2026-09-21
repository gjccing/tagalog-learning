import type { ReactNode } from "react";

function findHighlightIndex(
  word: string,
  highlight: string,
  position: string,
): number {
  const haystack = word.toLowerCase();
  const needle = highlight.toLowerCase();

  if (!needle) return -1;

  const indices: number[] = [];
  let from = 0;

  while (from <= haystack.length - needle.length) {
    const found = haystack.indexOf(needle, from);
    if (found === -1) break;
    indices.push(found);
    from = found + 1;
  }

  if (indices.length === 0) return -1;

  if (position === "end") {
    return indices[indices.length - 1] ?? -1;
  }

  if (position === "start") {
    return indices[0] ?? -1;
  }

  if (position === "middle") {
    const interior = indices.find(
      (index) => index > 0 && index + needle.length < word.length,
    );
    if (interior !== undefined) return interior;
    return indices[Math.floor(indices.length / 2)] ?? -1;
  }

  return indices[0] ?? -1;
}

export function highlightWord(
  word: string,
  highlight: string,
  position: string,
): ReactNode {
  const index = findHighlightIndex(word, highlight, position);

  if (index === -1) {
    return word;
  }

  const end = index + highlight.length;

  return (
    <>
      {word.slice(0, index)}
      <mark className="rounded-sm bg-highlight px-0.5 text-foreground">
        {word.slice(index, end)}
      </mark>
      {word.slice(end)}
    </>
  );
}
