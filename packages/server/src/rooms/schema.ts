import { MapSchema, Schema, type } from "@colyseus/schema";

export class TankSchema extends Schema {
  @type("string") playerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("uint8") dir: number = 0;
  @type("number") hp: number = 100;
  @type("uint8") armorPlates: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") invulnerable: boolean = false;
  @type("uint8") selectedAmmo: number = 0;
  @type("uint16") ammoNormal: number = 0;
  @type("uint16") ammoSiege: number = 0;
  @type("uint16") ammoHE: number = 0;
}

export class CampSchema extends Schema {
  @type("uint16") campId: number = 0;
  @type("string") ownerPlayerId: string = "";
  @type("number") coreHp: number = 0;
  @type("number") worldX: number = 0;
  @type("number") worldY: number = 0;
  @type("number") protectionRemaining: number = 0;
}

export class PlayerSchema extends Schema {
  @type("string") playerId: string = "";
  @type("string") nickname: string = "";
  @type("boolean") isAi: boolean = false;
  @type("uint8") campCount: number = 0;
  @type("boolean") eliminated: boolean = false;
  @type(TankSchema) tank = new TankSchema();
}

export class TankRoomState extends Schema {
  @type("number") time: number = 0;
  @type("boolean") softPressureActive: boolean = false;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: CampSchema }) camps = new MapSchema<CampSchema>();
}
