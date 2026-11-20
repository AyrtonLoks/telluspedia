"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface LocalClockWidgetProps {
  timezone: string | null;
}

export const LocalClockWidget: React.FC<LocalClockWidgetProps> = ({ timezone }) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    if (!timezone) {
      setTimeStr("");
      setDateStr("");
      return;
    }

    const updateTime = () => {
      try {
        const now = new Date();
        const timeFormatted = now.toLocaleTimeString("pt-BR", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const dateFormatted = now.toLocaleDateString("pt-BR", {
          timeZone: timezone,
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        setTimeStr(timeFormatted);
        setDateStr(dateFormatted);
      } catch {
        setTimeStr("--:--:--");
        setDateStr("");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  if (!timezone) {
    return (
      <div className="flex items-center gap-2.5 rounded-card border border-line bg-surface-raised px-3 py-2">
        <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-muted" />
        <div>
          <div className="text-label font-medium text-fg-secondary">Dado indisponível</div>
          <div className="text-caption text-fg-muted">Fuso horário</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-card border border-line bg-surface-raised px-3 py-2">
      <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-fg-secondary" />
      <div className="min-w-0">
        <div className="font-mono text-body font-medium tabular-nums text-fg">
          {timeStr || "Calculando..."}
        </div>
        <div className="truncate text-caption capitalize text-fg-muted">
          {dateStr} · {timezone.split("/")[1]?.replace(/_/g, " ") || timezone}
        </div>
      </div>
    </div>
  );
};
