"use client";

import React, { useEffect, useState } from "react";
import { X, Crosshair, ExternalLink, Radio, Activity, Plane, Anchor, Flame } from "lucide-react";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useGlobeStore } from "@/stores/globeStore";
import { EONET_CATEGORIES, formatEonetDate, observationLocation, type ObservatoryEntity } from "@/lib/observatory-data";
import { firmsMapUrl, formatAcqTime, FIRMS_CONFIDENCE_LABEL } from "@/lib/firms-display";
import { useEpochState } from "@/lib/epoch/useEpochState";
import { Button, buttonClasses } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { TONES, type Tone } from "@/components/ui/tones";
import { cn } from "@/components/ui/cn";
import { AIS_MOVING_MIN_KNOTS, VESSEL_LABEL, vesselIsMoving, vesselSpeedLabel, type VesselGroup } from "@/lib/ais-data";
import { DataSourceBadge } from "./DataSourceBadge";
import type { ObservatoryMeta } from "@/lib/observatory-source";

const ENTITY_META: Record<ObservatoryEntity["type"], { title: string; tone: Tone; icon: React.ReactNode }> = {
  FIRMS: { title: "Foco de Calor (FIRMS)", tone: "layer-fires", icon: <Flame /> },
  ISS: { title: "Telemetria Orbital ISS", tone: "layer-satellites", icon: <Radio /> },
  SATELLITE: { title: "Satélite Artificial", tone: "layer-satellites", icon: <Radio /> },
  EONET: { title: "Evento Severo NASA", tone: "layer-events", icon: <Activity /> },
  EONET_CLUSTER: { title: "Eventos próximos", tone: "layer-events", icon: <Activity /> },
  AIRCRAFT: { title: "Aeronave rastreada", tone: "layer-aircraft", icon: <Plane /> },
  VESSEL_GROUP: { title: "Embarcações da área", tone: "layer-maritime", icon: <Anchor /> },
  VESSEL: { title: "Embarcação", tone: "layer-maritime", icon: <Anchor /> },
  MARITIME: { title: "Corredor Mercante", tone: "layer-maritime", icon: <Anchor /> },
};

/** Par rótulo/valor da telemetria; valores numéricos em mono tabular. */
function Field({ label, children, mono = true }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-caption text-fg-muted">{label}</span>
      <span className={cn("truncate text-label text-fg", mono && "font-mono tabular-nums")}>{children}</span>
    </div>
  );
}

const FIELD_GRID = "grid grid-cols-2 gap-3 rounded-card border border-line bg-surface-raised p-3";

export const ObservatoryTelemetryHUD: React.FC = () => {
  const storeSelectedEntity = useObservatoryStore((s) => s.selectedEntity);
  const selectedEntity =
    typeof window === "undefined"
      ? useObservatoryStore.getState().selectedEntity
      : storeSelectedEntity;
  const setSelectedEntity = useObservatoryStore((s) => s.setSelectedEntity);
  const flyTo = useGlobeStore((s) => s.flyTo);

  // Época ativa: fonte única (T12)
  const isContemporary = useEpochState().isContemporary;

  // ISS: a mesma propagação SGP4 que posiciona o modelo 3D (D04), atualizada a cada segundo.
  const aircraftMeta = useObservatoryStore((s) => s.layerMeta.FLIGHTS_OPENSKY);
  const storeIss = useObservatoryStore((s) => s.issTelemetry);
  const refreshIssTelemetry = useObservatoryStore((s) => s.refreshIssTelemetry);
  const isIssSelected = selectedEntity?.type === "ISS";
  useEffect(() => {
    if (!isIssSelected) return;
    refreshIssTelemetry();
    const interval = setInterval(() => refreshIssTelemetry(), 1000);
    return () => clearInterval(interval);
  }, [isIssSelected, refreshIssTelemetry]);

  if (!selectedEntity || !isContemporary) return null;

  const handleFocus = (lat: number, lng: number, altitude: number = 1.8) => {
    flyTo(lat, lng, altitude);
  };

  // Vale a leitura mais recente entre a telemetria do store e a do momento do clique.
  const activeIss =
    selectedEntity.type === "ISS"
      ? storeIss && storeIss.timestamp >= selectedEntity.data.timestamp
        ? storeIss
        : selectedEntity.data
      : null;

  const aircraftPosition = selectedEntity.type === "AIRCRAFT"
    ? selectedEntity.estimatedPosition ?? selectedEntity.data
    : null;

  const meta = ENTITY_META[selectedEntity.type];

  return (
    <Panel
      data-testid="observatory-telemetry-hud"
      className="fixed bottom-[var(--map-overlay-bottom)] left-3 z-30 max-h-[var(--map-overlay-height)] w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto xl:left-6"
    >
      <PanelHeader
        headingLevel={3}
        title={meta.title}
        icon={<span className={TONES[meta.tone].text}>{meta.icon}</span>}
        className="px-4 py-3"
        actions={<IconButton label="Fechar telemetria" icon={<X />} size="sm" onClick={() => setSelectedEntity(null)} />}
      />

      <div className="space-y-3 p-4">
        {selectedEntity.type === "FIRMS" && (
          <>
            <div className="space-y-0.5">
              <div className="font-mono text-label font-medium tabular-nums text-fg">
                {selectedEntity.data.acqDate}
                {selectedEntity.data.acqTime ? ` · ${formatAcqTime(selectedEntity.data.acqTime)} UTC` : ""}
              </div>
              <span className="text-caption text-fg-muted">
                {selectedEntity.data.satellite}
                {selectedEntity.data.daynight ? ` · passagem ${selectedEntity.data.daynight === "D" ? "diurna" : "noturna"}` : ""}
              </span>
            </div>

            <div className={FIELD_GRID}>
              <Field label="Potência radiativa (FRP)">{selectedEntity.data.frp.toLocaleString("pt-BR")} MW</Field>
              <Field label="Confiança" mono={false}>{FIRMS_CONFIDENCE_LABEL[selectedEntity.data.confidence]}</Field>
              <Field label="Brilho">{selectedEntity.data.brightness.toLocaleString("pt-BR")} K</Field>
              <Field label="Posição">
                {selectedEntity.data.lat.toFixed(3)}°, {selectedEntity.data.lng.toFixed(3)}°
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" className="flex-1" onClick={() => handleFocus(selectedEntity.data.lat, selectedEntity.data.lng, 1.6)}>
                <Crosshair aria-hidden="true" className="h-4 w-4" />
                Focar Foco
              </Button>
              <a
                href={firmsMapUrl(selectedEntity.data.lat, selectedEntity.data.lng, selectedEntity.data.acqDate)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir no mapa oficial NASA FIRMS"
                title="Abrir no mapa oficial NASA FIRMS (fonte primária)"
                className={buttonClasses("secondary", "sm", "w-8 px-0")}
              >
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
            <p className="text-caption text-fg-muted">Fonte: NASA FIRMS (Fire Information for Resource Management System).</p>
          </>
        )}

        {selectedEntity.type === "SATELLITE" && (
          <>
            <div className="space-y-0.5">
              <div className="text-label font-medium text-fg">{selectedEntity.data.name}</div>
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                NORAD ID: {selectedEntity.data.noradId} · {selectedEntity.data.category === "station" ? "Estação espacial" : "Satélite visível a olho nu"}
              </span>
            </div>
            <div className={FIELD_GRID}>
              <Field label="Altitude">{selectedEntity.data.altKm.toFixed(0)} km</Field>
              <Field label="Velocidade">{Math.round(selectedEntity.data.velocityKmh).toLocaleString("pt-BR")} km/h</Field>
              <Field label="Coordenadas">
                {selectedEntity.data.lat.toFixed(2)}°, {selectedEntity.data.lng.toFixed(2)}°
              </Field>
              <Field label="Época do TLE">
                {new Date(selectedEntity.data.tleEpoch).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </Field>
            </div>
            <p className="text-caption text-fg-muted">Posição no instante do clique, calculada por SGP4 (TLE do CelesTrak).</p>
          </>
        )}

        {selectedEntity.type === "ISS" && activeIss && (
          <>
            <div className="space-y-0.5">
              <div className="text-label font-medium text-fg">Estação Espacial Internacional (Zvezda / Destiny)</div>
              <span className="font-mono text-caption tabular-nums text-fg-muted">
                NORAD ID: 25544 · Inclinação: {activeIss.orbitInclinationDeg}°
              </span>
              <span className="block text-caption text-fg-muted">
                Posição calculada por SGP4 a partir do TLE do CelesTrak
                {activeIss.tleEpoch ? ` (época ${new Date(activeIss.tleEpoch).toLocaleString("pt-BR", { timeZone: "UTC" })} UTC)` : ""}
              </span>
            </div>

            <div className={FIELD_GRID}>
              <Field label="Altitude">{activeIss.altitudeKm} km</Field>
              <Field label="Velocidade">{activeIss.velocityKmh.toLocaleString("pt-BR")} km/h</Field>
              <Field label="Coordenadas">
                {activeIss.latitude.toFixed(2)}°, {activeIss.longitude.toFixed(2)}°
              </Field>
              <Field label="Iluminação" mono={false}>
                {activeIss.visibility === "daylight" ? "Dia Orbital" : "Noite Orbital"}
              </Field>
            </div>

            <Button variant="primary" size="sm" className="w-full" onClick={() => handleFocus(activeIss.latitude, activeIss.longitude, 1.8)}>
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              Focar Câmera na ISS
            </Button>
          </>
        )}

        {selectedEntity.type === "EONET" && (
          <EonetDetails entity={selectedEntity} onFocus={handleFocus} onSelect={setSelectedEntity} />
        )}

        {selectedEntity.type === "EONET_CLUSTER" && (
          <>
            <p className="text-caption text-fg-muted">{selectedEntity.data.events.length} eventos EONET</p>
            <ul className="max-h-48 space-y-1 overflow-auto">
              {selectedEntity.data.events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    className="w-full rounded-control border border-line px-2 py-1 text-left text-label text-fg hover:bg-surface-raised"
                    onClick={() => setSelectedEntity({ type: "EONET", data: event })}
                  >
                    {event.title}
                    <span className="block text-caption text-fg-muted">{EONET_CATEGORIES[event.category]}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => handleFocus(selectedEntity.data.lat, selectedEntity.data.lng, 1.5)}
            >
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              Aproximar grupo
            </Button>
          </>
        )}

        {selectedEntity.type === "AIRCRAFT" && aircraftPosition && (
          <>
            <div className="space-y-0.5">
              <div className="font-mono text-label font-medium text-fg">
                {selectedEntity.data.callsign || "Sem indicativo"} ({selectedEntity.data.icao24})
              </div>
              <span className="text-caption text-fg-muted">País do transponder: {selectedEntity.data.originCountry}</span>
              <div><DataSourceBadge meta={selectedEntity.meta ?? aircraftMeta} /></div>
            </div>

            <div className={FIELD_GRID}>
              <Field label="Altitude de voo">{selectedEntity.data.altitudeMeters} m</Field>
              <Field label="Velocidade">{Math.round(selectedEntity.data.velocityMs * 3.6)} km/h</Field>
              <Field label="Rumo">{selectedEntity.data.headingDeg}°</Field>
              <Field label={selectedEntity.estimatedPosition ? "Posição estimada" : "Posição"}>
                {aircraftPosition.lat.toFixed(2)}°, {aircraftPosition.lng.toFixed(2)}°
              </Field>
            </div>
            {selectedEntity.data.positionTimestamp != null && (
              <p className="text-caption text-fg-muted">
                Última posição recebida · {new Date(selectedEntity.data.positionTimestamp).toLocaleString("pt-BR", { timeZone: "UTC" })} UTC
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" className="flex-1" onClick={() => handleFocus(aircraftPosition.lat, aircraftPosition.lng, 1.8)}>
                <Crosshair aria-hidden="true" className="h-4 w-4" />
                Focar Câmera na Aeronave
              </Button>
              <a href="https://openskynetwork.github.io/opensky-api/rest.html" target="_blank" rel="noreferrer" className={buttonClasses("secondary", "sm")}>
                OpenSky <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </div>
          </>
        )}

        {selectedEntity.type === "VESSEL_GROUP" && (
          <VesselGroupDetails
            key={selectedEntity.data.vessels.map(({ id }) => id).join(",")}
            group={selectedEntity.data}
            meta={selectedEntity.meta}
            onSelect={setSelectedEntity}
            onFocus={handleFocus}
          />
        )}

        {selectedEntity.type === "VESSEL" && (() => {
          const { data, meta, group } = selectedEntity;
          return (
            <>
              {group && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedEntity({ type: "VESSEL_GROUP", data: group, meta })}>
                  Voltar à lista da área
                </Button>
              )}
              <div data-testid="vessel-telemetry" className="space-y-1">
                <div className="text-label font-medium text-fg">{data.name ?? "Nome não informado"}</div>
                <DataSourceBadge meta={meta} />
                <p className="text-caption text-fg-muted">
                  {meta.source === "live" ? (
                    <a href="https://aisstream.io/documentation" target="_blank" rel="noreferrer" className="underline">
                      {meta.provider}
                    </a>
                  ) : meta.provider}
                  {data.mmsi && ` · MMSI ${data.mmsi}`}
                </p>
              </div>
              <div className={FIELD_GRID}>
                <Field label="Tipo" mono={false}>{VESSEL_LABEL[data.kind]}</Field>
                <Field label="Bandeira (MID)" mono={false}>{data.flag ?? "Indisponível"}</Field>
                <Field label="Destino informado" mono={false}>{data.destination ?? "Indisponível"}</Field>
                <Field label="Velocidade medida">{vesselSpeedLabel(data.speedKnots)}</Field>
              </div>
              {data.speedKnots != null && (
                <p className="text-caption text-fg-muted">
                  {vesselIsMoving(data) ? "Em movimento" : `Abaixo de ${AIS_MOVING_MIN_KNOTS} nó`}
                </p>
              )}
              {data.observedAt > 0 && (
                <p className="text-caption text-fg-muted">
                  Posição recebida · {new Date(data.observedAt).toLocaleString("pt-BR", { timeZone: "UTC" })} UTC
                </p>
              )}
              <Button variant="primary" size="sm" className="w-full" onClick={() => handleFocus(data.lat, data.lng, 1.5)}>
                <Crosshair aria-hidden="true" className="h-4 w-4" />
                Focar última posição
              </Button>
            </>
          );
        })()}

        {selectedEntity.type === "MARITIME" && (
          <>
            <div className="space-y-0.5">
              <div className="text-label font-medium text-fg">{selectedEntity.data.name}</div>
              <span className="text-caption text-fg-muted">
                {{ CANAL: "Canal", STRAIT: "Estreito", OCEAN_CORRIDOR: "Corredor oceânico" }[selectedEntity.data.category]}
              </span>
            </div>

            <div className={cn(FIELD_GRID, "grid-cols-1")}>
              <Field label="Ponto crítico" mono={false}>
                {selectedEntity.data.chokePoint || "Corredor Mercante Principal"}
              </Field>
              {selectedEntity.data.dailyTonnageTeuApprox != null && (
                <Field label="Volume diário de referência">
                  ~{selectedEntity.data.dailyTonnageTeuApprox.toLocaleString("pt-BR")} TEU/dia
                </Field>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => {
                const first = selectedEntity.data.coordinates[0];
                if (first) handleFocus(first[0], first[1], 1.8);
              }}
            >
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              Focar Corredor Marítimo
            </Button>
          </>
        )}
      </div>
    </Panel>
  );
};

function VesselGroupDetails({ group, meta, onSelect, onFocus }: {
  group: VesselGroup;
  meta: ObservatoryMeta;
  onSelect: (entity: ObservatoryEntity) => void;
  onFocus: (lat: number, lng: number, altitude: number) => void;
}) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const ordered = [...group.vessels].sort((a, b) =>
    Number(vesselIsMoving(b)) - Number(vesselIsMoving(a)) || (a.name ?? a.id).localeCompare(b.name ?? b.id, "pt-BR")
  );
  const vessels = ordered.filter(({ name, mmsi }) =>
    !term || name?.toLocaleLowerCase("pt-BR").includes(term) || mmsi?.includes(term)
  );
  return (
    <div data-testid="vessel-group-telemetry" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-label font-medium text-fg">
          {group.title && <span className="block">{group.title}</span>}
          <span className="text-caption text-fg-secondary">{group.vessels.length} na amostra</span>
        </div>
        <DataSourceBadge meta={meta} />
      </div>
      {group.vessels.length > 5 && (
        <input
          aria-label="Buscar embarcação por nome ou MMSI"
          placeholder="Nome ou MMSI"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-control border border-line bg-surface-raised px-2 py-1.5 text-label text-fg"
        />
      )}
      <ul className="max-h-[min(32vh,14rem)] space-y-1 overflow-y-auto">
        {vessels.map((vessel) => (
          <li key={vessel.id}>
            <button
              type="button"
              className="w-full rounded-control border border-line px-2 py-1.5 text-left text-label text-fg hover:bg-surface-raised"
              onClick={() => onSelect({ type: "VESSEL", data: vessel, group, meta })}
            >
              <span className="block truncate">{vessel.name ?? (vessel.mmsi ? `MMSI ${vessel.mmsi}` : "Nome não informado")}</span>
              <span className="block truncate text-caption text-fg-muted">
                {VESSEL_LABEL[vessel.kind]} · {vesselSpeedLabel(vessel.speedKnots)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {vessels.length === 0 && <p className="text-caption text-fg-muted">Nenhuma embarcação encontrada.</p>}
      <Button variant="secondary" size="sm" className="w-full" onClick={() => onFocus(group.lat, group.lng, 1.5)}>
        <Crosshair aria-hidden="true" className="h-4 w-4" />
        Aproximar área
      </Button>
    </div>
  );
}

function EonetDetails({ entity, onFocus, onSelect }: {
  entity: Extract<ObservatoryEntity, { type: "EONET" }>;
  onFocus: (lat: number, lng: number, altitude?: number) => void;
  onSelect: (entity: ObservatoryEntity) => void;
}) {
  const { data, observationIndex } = entity;
  const geometry = data.geometry ?? [];
  const observation = geometry[observationIndex ?? geometry.length - 1];
  const { lat, lng } = observation ? observationLocation(observation) : data;
  const { date, magnitudeValue, magnitudeUnit, magnitudeDescription } = observation ?? data;
  const showTrack = data.category === "severeStorms" && geometry.length > 1;
  return (
    <>
      <div className="space-y-0.5">
        <div className="text-label font-medium text-fg">{data.title}</div>
        <p className="text-caption text-fg-muted">{EONET_CATEGORIES[data.category]} · {formatEonetDate(date)}</p>
      </div>
      <div className={cn(FIELD_GRID, "grid-cols-1")}>
        <Field label="Magnitude observada">
          {magnitudeValue == null ? "Indisponível" : `${magnitudeValue.toLocaleString("pt-BR")} ${magnitudeUnit ?? ""}`}
        </Field>
        {magnitudeDescription && <span className="text-caption text-fg-muted">{magnitudeDescription}</span>}
      </div>
      {showTrack && (
        <div className="space-y-1">
          <p className="text-caption font-medium text-fg">Observações da trajetória</p>
          <ul className="flex max-h-24 flex-wrap gap-1 overflow-auto" aria-label="Observações da trajetória">
            {geometry.map((point, index) => (
              <li key={`${point.date}-${index}`}>
                <button
                  type="button"
                  aria-pressed={point === observation}
                  className="rounded-control border border-line px-2 py-1 text-caption text-fg-secondary aria-pressed:bg-surface-raised aria-pressed:text-fg"
                  onClick={() => onSelect({ type: "EONET", data, observationIndex: index })}
                >
                  {formatEonetDate(point.date)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button variant="primary" size="sm" className="w-full" onClick={() => onFocus(lat, lng, 1.8)}>
        <Crosshair aria-hidden="true" className="h-4 w-4" />
        Focar Evento
      </Button>
      {data.sources.length > 0 && (
        <ul aria-label="Fontes do evento" className="flex flex-wrap gap-1">
          {data.sources.map(({ id, url }, index) => (
            <li key={`${url}-${index}`}>
              <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "sm")}>
                {id}
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
