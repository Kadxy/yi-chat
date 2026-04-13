import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Yi Chat - Your Online AI Agent";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56,121,229,0.15) 0%, transparent 70%)",
          top: -100,
          right: -100,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(57,221,166,0.12) 0%, transparent 70%)",
          bottom: -150,
          left: -50,
          display: "flex",
        }}
      />

      {/* Logo circle with gradient border */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #39dda6 0%, #3879e5 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: "50%",
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          Yi
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: "#ffffff",
          marginBottom: 12,
          display: "flex",
        }}
      >
        Yi Chat
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 24,
          color: "rgba(255,255,255,0.6)",
          display: "flex",
        }}
      >
        Your Online AI Agent
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 4,
          background: "linear-gradient(90deg, #39dda6 0%, #3879e5 100%)",
          display: "flex",
        }}
      />
    </div>,
    { ...size },
  );
}
