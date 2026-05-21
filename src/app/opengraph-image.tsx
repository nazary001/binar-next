import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Binar 2000 — готельний текстиль, ЗІЗ та засоби прибирання";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1d1d1f 0%, #2d2d2f 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#f85a0b",
            }}
          />
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>
            Binar 2000
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <h1
            style={{
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 900,
              margin: 0,
            }}
          >
            Співпраця заради{" "}
            <span style={{ color: "#f85a0b" }}>ефективності</span>
          </h1>
          <p
            style={{
              fontSize: 32,
              fontWeight: 300,
              color: "#8e8e8f",
              maxWidth: 900,
              margin: 0,
            }}
          >
            B2B-постачання для готелів, HoReCa, медицини та виробництв
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            fontSize: 22,
            color: "#777779",
          }}
        >
          <span>Готелі</span>
          <span>·</span>
          <span>ЗІЗ</span>
          <span>·</span>
          <span>Прибирання</span>
          <span>·</span>
          <span>з 2000 року</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
