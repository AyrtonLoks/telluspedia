import { ImageResponse } from "next/og";
import {
  formatStudyPeriod,
  loadCountryByIso,
  loadStudyBySlug,
  readFlagDataUri,
} from "@/lib/server-loaders";

export const runtime = "nodejs";
export const alt = "Estudo compartilhado na TellusPedia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function StudyOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = await loadStudyBySlug(slug);

  const title = study?.title ?? "Estudo Geopolítico — TellusPedia";
  const period = study ? formatStudyPeriod(study) : "Linha do tempo histórica";
  const description =
    study?.description?.trim() ||
    "Snapshot imutável de pesquisa geopolítica e histórica na TellusPedia.";

  const countries = (study?.selectedCountryIsos ?? []).slice(0, 4).map((iso) => {
    const data = loadCountryByIso(iso);
    return {
      iso: data?.isoCode ?? iso,
      name: data?.nameCommon ?? iso,
      flagUri: readFlagDataUri(data?.flagSvgUrl),
    };
  });

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
            <span style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "0.02em" }}>
              TellusPedia
            </span>
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
            {period}
          </div>
        </div>

        {/* Main title & summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "1020px" }}>
          <span
            style={{
              fontSize: "18px",
              color: "#9AA5B8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Estudo imutável compartilhado
          </span>
          <div
            style={{
              fontSize: title.length > 52 ? "44px" : "54px",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#F8FAFC",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "24px",
              lineHeight: 1.4,
              color: "#9AA5B8",
            }}
          >
            {description.length > 155 ? `${description.slice(0, 152)}…` : description}
          </div>
        </div>

        {/* Footer: Countries with flags */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {countries.length > 0 ? (
              countries.map((c) => (
                <div
                  key={c.iso}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    background: "#131925",
                    fontSize: "20px",
                    color: "#E8ECF4",
                  }}
                >
                  {c.flagUri && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.flagUri}
                      alt={c.name}
                      width={30}
                      height={20}
                      style={{ borderRadius: "3px", objectFit: "cover" }}
                    />
                  )}
                  <span>{c.name}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: "20px", color: "#687489" }}>
                Observatório Planetário &amp; Geopolítica
              </span>
            )}
          </div>
          <span style={{ fontSize: "18px", color: "#687489" }}>
            /study/{study?.id ?? slug}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
