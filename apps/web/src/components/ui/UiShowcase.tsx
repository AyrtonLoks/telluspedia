"use client";

import React, { useState } from "react";
import { BookOpen, RotateCcw, Share2, X } from "lucide-react";
import { ALL_CATEGORIES } from "@/stores/timelineStore";
import {
  Badge,
  Button,
  CATEGORY_LABEL,
  CATEGORY_TONE,
  Card,
  Chip,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  IconButton,
  Panel,
  PanelBody,
  PanelFooter,
  PanelHeader,
  Stat,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  cn,
} from "./index";

const SURFACES = [
  ["bg", "bg-bg"],
  ["surface-sunken", "bg-surface-sunken"],
  ["surface", "bg-surface"],
  ["surface-raised", "bg-surface-raised"],
  ["surface-hover", "bg-surface-hover"],
  ["control", "bg-control"],
] as const;

const STATES = [
  ["accent", "bg-accent"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
] as const;

const LAYERS = [
  ["Queimadas", "bg-layer-fires"],
  ["Eventos", "bg-layer-events"],
  ["Satélites", "bg-layer-satellites"],
  ["Aviões", "bg-layer-aircraft"],
  ["Navios", "bg-layer-maritime"],
] as const;

const TYPE_SCALE = [
  ["display · 24/32", "text-display font-semibold", "Brasil"],
  ["title · 18/26", "text-title font-semibold", "Observatório Planetário"],
  ["body · 15/24", "text-body", "Focos de calor detectados nas últimas 24 h."],
  ["label · 13/20", "text-label font-medium", "Queimadas ativas"],
  ["caption · 12/16", "text-caption text-fg-secondary", "NASA FIRMS · VIIRS NOAA-21 · há 4 min"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-title font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("h-16 rounded-card border border-line", className)} />
      <span className="font-mono text-caption text-fg-secondary">{name}</span>
    </div>
  );
}

export function UiShowcase() {
  const [layers, setLayers] = useState({ fires: true, events: false });
  const [cats, setCats] = useState<string[]>(["POLITICS_REGIMES", "WAR_MILITARY"]);
  const [selected, setSelected] = useState(false);

  return (
    <main className="h-screen overflow-y-auto bg-bg text-fg">
      <div className="mx-auto max-w-6xl space-y-12 px-8 py-12">
        <header className="space-y-2">
          <span className="text-label text-fg-secondary">D14 · somente em desenvolvimento</span>
          <h1 className="text-display font-semibold">Design system — Instrumento sereno</h1>
          <p className="max-w-2xl text-body text-fg-secondary">
            Tokens em <code className="font-mono text-label">src/styles/globals.css</code> e{" "}
            <code className="font-mono text-label">tailwind.config.ts</code>; primitivos em{" "}
            <code className="font-mono text-label">src/components/ui</code>.
          </p>
        </header>

        <Section title="Superfícies">
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            {SURFACES.map(([name, cls]) => (
              <Swatch key={name} name={name} className={cls} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 rounded-panel border border-line bg-surface p-5">
            <span className="text-body text-fg">text-fg</span>
            <span className="text-body text-fg-secondary">text-fg-secondary</span>
            <span className="text-body text-fg-muted">text-fg-muted</span>
          </div>
        </Section>

        <Section title="Acento, estados e dados">
          <div className="grid grid-cols-4 gap-4">
            {STATES.map(([name, cls]) => (
              <Swatch key={name} name={name} className={cls} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((c) => (
              <Badge key={c} tone={CATEGORY_TONE[c]}>
                {CATEGORY_LABEL[c]}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-4">
            {LAYERS.map(([name, cls]) => (
              <Swatch key={name} name={name} className={cls} />
            ))}
          </div>
        </Section>

        <Section title="Tipografia (5 tamanhos)">
          <div className="divide-y divide-line rounded-panel border border-line bg-surface">
            {TYPE_SCALE.map(([name, cls, sample]) => (
              <div key={name} className="flex items-baseline gap-6 px-5 py-3">
                <span className="w-36 shrink-0 font-mono text-caption text-fg-muted">{name}</span>
                <span className={cls}>{sample}</span>
              </div>
            ))}
            <div className="flex items-baseline gap-6 px-5 py-3">
              <span className="w-36 shrink-0 font-mono text-caption text-fg-muted">mono · números</span>
              <span className="font-mono text-label tabular-nums">1.000 focos · 409,5 km</span>
            </div>
          </div>
        </Section>

        <Section title="Button · IconButton · Tooltip">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Aprofundar estudo</Button>
            <Button variant="secondary">Comparar</Button>
            <Button variant="ghost">Limpar camadas</Button>
            <Button variant="danger">Excluir</Button>
            <Button variant="secondary" size="sm">Pequeno</Button>
            <Button variant="primary" disabled>Desabilitado</Button>
            <IconButton label="Fechar" icon={<X />} />
            <IconButton label="Reiniciar visão" icon={<RotateCcw />} variant="secondary" />
            <Tooltip content="Fonte: NASA FIRMS (VIIRS NOAA-21 NRT)">
              <Button variant="secondary">Passe o mouse</Button>
            </Tooltip>
          </div>
        </Section>

        <Section title="Switch · Chip · Badge">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-label">
              <Switch
                checked={layers.fires}
                label="Queimadas"
                onCheckedChange={(v) => setLayers((s) => ({ ...s, fires: v }))}
              />
              Queimadas
            </label>
            <label className="flex items-center gap-3 text-label">
              <Switch
                checked={layers.events}
                label="Eventos severos"
                onCheckedChange={(v) => setLayers((s) => ({ ...s, events: v }))}
              />
              Eventos severos
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((c) => (
              <Chip
                key={c}
                tone={CATEGORY_TONE[c]}
                pressed={cats.includes(c)}
                onClick={() => setCats((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))}
              >
                {CATEGORY_LABEL[c]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="success" pulse>Ao vivo</Badge>
            <Badge tone="warning">Ao vivo · desatualizado</Badge>
            <Badge tone="accent">Calculado</Badge>
            <Badge tone="warning" dot="hollow">Simulado</Badge>
            <Badge tone="neutral">Offline</Badge>
          </div>
        </Section>

        <Section title="Tabs · Stat">
          <Tabs defaultValue="eco">
            <TabsList aria-label="Seções do país">
              <TabsTrigger value="eco">Economia</TabsTrigger>
              <TabsTrigger value="soc">Sociedade</TabsTrigger>
              <TabsTrigger value="env">Ambiente</TabsTrigger>
            </TabsList>
            <TabsContent value="eco">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="PIB per capita" value="[VALOR]" source="Banco Mundial · NY.GDP.PCAP.CD · [ANO]" />
                <Stat label="População" value="[VALOR]" source="Banco Mundial · SP.POP.TOTL · [ANO]" />
                <Stat label="Expectativa de vida" value="[VALOR]" source="Banco Mundial · SP.DYN.LE00.IN · [ANO]" />
              </div>
            </TabsContent>
            <TabsContent value="soc" className="text-label text-fg-secondary">Conteúdo de Sociedade.</TabsContent>
            <TabsContent value="env" className="text-label text-fg-secondary">Conteúdo de Ambiente.</TabsContent>
          </Tabs>
          <p className="text-caption text-fg-muted">Valores são marcadores de layout, não dados.</p>
        </Section>

        <Section title="Panel · Card · Dialog">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel className="h-72">
              <PanelHeader
                title="Observatório Planetário"
                subtitle="NASA · OpenSky · CelesTrak"
                actions={<IconButton label="Fechar painel" icon={<X />} size="sm" />}
              />
              <PanelBody className="space-y-2">
                <Card quiet>Card discreto (lista).</Card>
                <Card selected={selected} onClick={() => setSelected((v) => !v)} className="cursor-pointer">
                  Card {selected ? "selecionado" : "clicável"}
                </Card>
              </PanelBody>
              <PanelFooter className="justify-end">
                <Button variant="ghost" size="sm">Limpar</Button>
              </PanelFooter>
            </Panel>
            <div className="space-y-4">
              <Card>Card sólido dentro de painéis. Não aninhe Card dentro de Card.</Card>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Share2 aria-hidden="true" className="h-4 w-4" />
                    Abrir diálogo
                  </Button>
                </DialogTrigger>
                <DialogContent
                  title="Compartilhar estudo"
                  description="Gera um link somente-leitura (RN16)."
                  footer={
                    <>
                      <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                      </DialogClose>
                      <Button variant="primary">
                        <BookOpen aria-hidden="true" className="h-4 w-4" />
                        Copiar link
                      </Button>
                    </>
                  }
                >
                  Corpo do diálogo com foco preso e Esc para fechar.
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Section>
      </div>
    </main>
  );
}
