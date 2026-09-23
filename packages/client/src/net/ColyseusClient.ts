import { Client, Room } from "colyseus.js";
import { ROOM_NAME } from "./roomName.js";

type RuntimeConfig = {
  colyseusUrl?: string;
  colyseusPath?: string;
};

async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (res.ok) return (await res.json()) as RuntimeConfig;
  } catch {
    /* dev / missing file */
  }
  return {};
}

/** Resolve Colyseus endpoint: runtime config.json → VITE_ → same-host /colyseus → localhost. */
export async function resolveColyseusUrl(): Promise<string> {
  const cfg = await loadRuntimeConfig();
  if (cfg.colyseusUrl && cfg.colyseusUrl.trim()) return cfg.colyseusUrl.trim();

  const baked = import.meta.env.VITE_COLYSEUS_URL;
  if (baked && String(baked).trim()) return String(baked).trim();

  if (typeof window !== "undefined" && window.location?.host) {
    const { hostname, port, protocol } = window.location;
    // Vite/dev without nginx: talk to Colyseus directly (proxy also exists as backup).
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (port === "5173" || port === "4173" || port === "") {
        return "ws://127.0.0.1:2567";
      }
    }
    const path = (cfg.colyseusPath || "/colyseus").replace(/\/$/, "");
    const proto = protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }

  return "ws://127.0.0.1:2567";
}

export async function joinTankRoom(nickname: string): Promise<Room> {
  const endpoint = await resolveColyseusUrl();
  const client = new Client(endpoint);
  return client.joinOrCreate(ROOM_NAME, { nickname });
}
