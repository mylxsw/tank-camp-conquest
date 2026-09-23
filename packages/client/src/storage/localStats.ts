const KEY = "tcc.localStats.v1";

export interface LocalBestStats {
  bestSurviveMs: number;
  bestMaxCamps: number;
  totalCampsCaptured: number;
  totalTanksDestroyed: number;
  recentRuns: Array<{
    at: number;
    survivedMs: number;
    maxCampsOwned: number;
    tanksDestroyed: number;
    campsCaptured: number;
  }>;
}

function empty(): LocalBestStats {
  return {
    bestSurviveMs: 0,
    bestMaxCamps: 0,
    totalCampsCaptured: 0,
    totalTanksDestroyed: 0,
    recentRuns: [],
  };
}

export function loadLocalStats(): LocalBestStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) } as LocalBestStats;
  } catch {
    return empty();
  }
}

export function recordRun(run: LocalBestStats["recentRuns"][number]): LocalBestStats {
  const cur = loadLocalStats();
  cur.bestSurviveMs = Math.max(cur.bestSurviveMs, run.survivedMs);
  cur.bestMaxCamps = Math.max(cur.bestMaxCamps, run.maxCampsOwned);
  cur.totalCampsCaptured += run.campsCaptured;
  cur.totalTanksDestroyed += run.tanksDestroyed;
  cur.recentRuns = [run, ...cur.recentRuns].slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(cur));
  return cur;
}
