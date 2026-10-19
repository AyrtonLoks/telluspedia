"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface LocalClockWidgetProps {
  timezone: string;
}

export const LocalClockWidget: React.FC<LocalClockWidgetProps> = ({ timezone }) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
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
      } catch (err) {
        setTimeStr("--:--:--");
        setDateStr("");
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/40 text-xs">
      <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
      <div>
        <div className="font-mono font-medium text-slate-100 tracking-wider text-sm">
          {timeStr || "Calculando..."}
        </div>
        <div className="text-[10px] text-slate-400 capitalize">
          {dateStr} • {timezone.split("/")[1]?.replace("_", " ") || timezone}
        </div>
      </div>
    </div>
  );
};
