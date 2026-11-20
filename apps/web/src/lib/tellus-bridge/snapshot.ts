"use client";

import { useSyncExternalStore } from "react";
import { projection, readSnapshot, SNAPSHOT_KEY } from "./contract/index.mjs";
import type { TellusLabSnapshotV1 } from "./contract/types.mjs";
import { registry } from "./catalog";

const IMPORT_KEY = SNAPSHOT_KEY + ".imported";
const subscribers = new Set<() => void>();
let snapshot: TellusLabSnapshotV1 | null = null;
let encoded: string | null = null;
let importedInMemory: string | null = null;
let channel: BroadcastChannel | undefined;

function stored(key: string) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function decode(text: string | null) {
  try { return text ? projection(readSnapshot(text, registry)) : null; }
  catch { return null; }
}

function refresh() {
  const live = stored(SNAPSHOT_KEY);
  const imported = importedInMemory ?? stored(IMPORT_KEY);
  const signature = JSON.stringify([live, imported]);
  if (signature === encoded) return;
  encoded = signature;
  const current = decode(live);
  const manual = decode(imported);
  snapshot = current && (!manual || current.exportedAt >= manual.exportedAt) ? current : manual;
  subscribers.forEach(notify => notify());
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === SNAPSHOT_KEY || event.key === IMPORT_KEY) {
    if (event.key !== SNAPSHOT_KEY) importedInMemory = null;
    refresh();
  }
}

function subscribe(notify: () => void) {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    window.addEventListener("storage", onStorage);
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(SNAPSHOT_KEY);
      channel.addEventListener("message", refresh);
    }
    refresh();
  }
  return () => {
    subscribers.delete(notify);
    if (!subscribers.size) {
      window.removeEventListener("storage", onStorage);
      channel?.close();
      channel = undefined;
    }
  };
}

export function useStudySnapshot() {
  return useSyncExternalStore(subscribe, () => snapshot, () => null);
}

export function importStudySnapshot(text: string) {
  const progress = projection(readSnapshot(text, registry));
  const contents = JSON.stringify(progress);
  let persistent = true;
  try {
    localStorage.setItem(IMPORT_KEY, contents);
    importedInMemory = null;
  } catch {
    persistent = false;
    importedInMemory = contents;
  }
  refresh();
  channel?.postMessage(IMPORT_KEY);
  return { persistent, active: snapshot?.exportedAt === progress.exportedAt };
}
