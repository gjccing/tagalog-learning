import { ImageResponse } from "next/og";
import { cache, type CSSProperties } from "react";

export const ogSize = {
  width: 1200,
  height: 630,
};

export const ogContentType = "image/png";

type OgFonts = {
  latin: ArrayBuffer;
  cjk: ArrayBuffer;
};

const getOgFonts = cache(async (): Promise<OgFonts | null> => {
  try {
    const [latin, cjk] = await Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@5.2.8/latin-500-normal.ttf",
      ),
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-tc@5.2.8/chinese-traditional-500-normal.ttf",
      ),
    ]);
    if (!latin.ok || !cjk.ok) return null;
    return {
      latin: await latin.arrayBuffer(),
      cjk: await cjk.arrayBuffer(),
    };
  } catch {
    return null;
  }
});

function OgLine({
  text,
  style,
}: {
  text: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", ...style }}>
      {text.split(/\s+/).map((word, index) => (
        <span key={`${index}-${word}`} style={{ marginRight: "0.35em" }}>
          {word}
        </span>
      ))}
    </div>
  );
}

export async function ogImage({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const fonts = await getOgFonts();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f6f1ea",
        color: "#1c1917",
        fontFamily: fonts ? "Noto Sans, Noto Sans TC" : "sans-serif",
        padding: "64px 72px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          borderLeft: "12px solid #0f766e",
          paddingLeft: 48,
        }}
      >
        <OgLine
          text={eyebrow}
          style={{
            fontSize: 28,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#0f766e",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <OgLine
            text={title}
            style={{
              fontSize: title.length > 36 ? 56 : 72,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          />
          {subtitle ? (
            <OgLine
              text={subtitle}
              style={{
                fontSize: 28,
                lineHeight: 1.4,
                color: "#78716c",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>,
    {
      ...ogSize,
      fonts: fonts
        ? [
            {
              name: "Noto Sans",
              data: fonts.latin,
              weight: 500,
              style: "normal",
            },
            {
              name: "Noto Sans TC",
              data: fonts.cjk,
              weight: 500,
              style: "normal",
            },
          ]
        : [],
    },
  );
}
