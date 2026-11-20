import { ImageResponse } from "next/og";
import { loadCountryByIso, readFlagDataUri } from "@/lib/server-loaders";

export const runtime = "nodejs";
export const alt = "Perfil geopolítico na TellusPedia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatMetric(value: number | null, suffix = ""): string {
  if (value === null || !Number.isFinite(value)) return "Sem dado";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)} bi${suffix}`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} mi${suffix}`;
  return `${value.toLocaleString("pt-BR")}${suffix}`;
}

export default async function CountryOpenGraphImage({
  params,
}: {
  params: Promise<{ iso: string }>;
}) {
  const { iso } = await params;
  const country = loadCountryByIso(iso);

  const name = country?.nameCommon ?? iso.toUpperCase();
  const official = country?.nameOfficial ?? "Enciclopédia Geopolítica";
  const isoCode = country?.isoCode ?? iso.toUpperCase();
  const capital = country?.capital ?? "—";
  const continent = country?.continent ?? "Global";
  const flagUri = readFlagDataUri(country?.flagSvgUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(135deg, #05070B 0%, #0C1018 55%, #111827 100%)",
          color: "#E8ECF4",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "999px",
                background: "#4CC3E0",
              }}
            />
            <span style={{ fontSize: "24px", fontWeight: 700 }}>TellusPedia</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 18px",
              borderRadius: "8px",
              border: "1px solid rgba(76, 195, 224, 0.35)",
              background: "rgba(76, 195, 224, 0.12)",
              color: "#4CC3E0",
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            {isoCode} · {continent}
          </div>
        </div>

        {/* Hero: Flag (or ISO emblem) + Country title */}
        <div style={{ display: "flex", alignItems: "center", gap: "36px" }}>
          {flagUri ? (
            <div
              style={{
                display: "flex",
                padding: "8px",
                borderRadius: "14px",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                background: "#131925",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={flagUri}
                alt={name}
                width={180}
                height={120}
                style={{ borderRadius: "8px", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "160px",
                height: "120px",
                borderRadius: "14px",
                border: "1px solid rgba(76, 195, 224, 0.35)",
                background: "#131925",
              }}
            >
              <span style={{ fontSize: "44px", fontWeight: 700, color: "#4CC3E0" }}>
                {isoCode}
              </span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "820px" }}>
            <div style={{ fontSize: "60px", fontWeight: 700, lineHeight: 1.1, color: "#F8FAFC" }}>
              {name}
            </div>
            <div style={{ fontSize: "24px", color: "#9AA5B8", lineHeight: 1.3 }}>
              {official}
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "#131925",
              }}
            >
              <span style={{ fontSize: "14px", color: "#687489" }}>Capital</span>
              <span style={{ fontSize: "22px", fontWeight: 600 }}>{capital}</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "#131925",
              }}
            >
              <span style={{ fontSize: "14px", color: "#687489" }}>População</span>
              <span style={{ fontSize: "22px", fontWeight: 600 }}>
                {formatMetric(country?.population ?? null)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "12px 20px",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                background: "#131925",
              }}
            >
              <span style={{ fontSize: "14px", color: "#687489" }}>Área</span>
              <span style={{ fontSize: "22px", fontWeight: 600 }}>
                {formatMetric(country?.areaKm2 ?? null, " km²")}
              </span>
            </div>
          </div>
          <span style={{ fontSize: "18px", color: "#687489" }}>/pais/{isoCode}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
