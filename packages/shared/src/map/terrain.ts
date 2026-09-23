export enum Terrain {
  Empty = 0,
  Water = 1,
  Grass = 2,
}

export function terrainIndex(tileX: number, tileY: number, mapTiles: number): number {
  return tileY * mapTiles + tileX;
}

export function isPassable(terrain: number[], tileX: number, tileY: number, mapTiles: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= mapTiles || tileY >= mapTiles) return false;
  const t = terrain[terrainIndex(tileX, tileY, mapTiles)]!;
  return t !== Terrain.Water;
}

export function blocksVision(terrain: number[], tileX: number, tileY: number, mapTiles: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= mapTiles || tileY >= mapTiles) return true;
  return terrain[terrainIndex(tileX, tileY, mapTiles)] === Terrain.Grass;
}
