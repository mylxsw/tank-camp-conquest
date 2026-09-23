import Colyseus from "colyseus";
import { createServer } from "http";
import express from "express";
import { SERVER_PORT, ROOM_NAME } from "./config.js";
import { TankRoom } from "./rooms/TankRoom.js";

const { Server } = Colyseus;

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.define(ROOM_NAME, TankRoom);

httpServer.listen(SERVER_PORT, () => {
  console.log(`[tcc-server] listening on ${SERVER_PORT}, room=${ROOM_NAME}`);
});
