// Panel de administración del servidor de Valheim.
// Habla con Docker por su socket, lee el log del servidor para saber jugadores y código
// de crossplay, y gestiona ajustes, listas, mods (BepInEx/Thunderstore) y copias.
// Sin dependencias npm: solo Node 20 + docker/zip/unzip del sistema.
const http = require("http");
const net = require("net");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const { StringDecoder } = require("string_decoder");
const { execFile } = require("child_process");

const PORT = 3000;
const CONTAINER = "valheim";
const CONFIG = "/config";
const PROJECT = "/project";
const ENV_FILE = path.join(PROJECT, "valheim.env");
const PLUGINS = path.join(CONFIG, "bepinex", "plugins");
const PLUGINS_OFF = path.join(CONFIG, "bepinex", "plugins_disabled");
const BACKUPS = path.join(CONFIG, "backups");
const PANEL_DATA = path.join(CONFIG, "panel");
const PLAYERS_FILE = path.join(PANEL_DATA, "players.json");
const TS_CACHE = path.join(PANEL_DATA, "thunderstore.json");
const SETTINGS_FILE = path.join(PANEL_DATA, "settings.json");
const BEPINEX_PACK = "denikson-BepInExPack_Valheim";
const ADDRESSES = { local: process.env.LOCAL_ADDRESS || "", public: process.env.PUBLIC_ADDRESS || "" };
const RCON_HOST = process.env.RCON_HOST || "172.31.0.10";
const STATUS_URL = `http://${RCON_HOST}/status.json`; // status.json de la imagen (STATUS_HTTP=true)
const RCON_PORT = Number(process.env.RCON_PORT || 2458);
const RCON_PASSWORD = process.env.RCON_PASSWORD || "";
const RCON_WHITELIST = process.env.RCON_WHITELIST || "172.31.0.0/24"; // red interna de docker-compose
// Idioma de lo que ven los jugadores dentro del juego (avisos de reinicio) y de los kits por defecto.
// El idioma del panel lo elige cada navegador (selector ES/EN de la cabecera).
const I18N = require("./i18n.js");
const GAME_LANG = /^es/i.test(process.env.PANEL_LANG || "") ? "es" : "en";
const tg = (s, params) => I18N.fill(I18N.translate(s, GAME_LANG), params);

fs.mkdirSync(PANEL_DATA, { recursive: true });

// ---------- utilidades ----------

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 50 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || stdout || err.message).toString().trim()));
      else resolve(stdout.toString());
    });
  });
}

function safeName(name) {
  const base = path.basename(String(name || ""));
  if (!base || base === "." || base === "..") throw new Error("Nombre de archivo no válido");
  return base;
}

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function dirSize(p) {
  const st = await fsp.stat(p);
  if (!st.isDirectory()) return st.size;
  let total = 0;
  for (const e of await fsp.readdir(p)) total += await dirSize(path.join(p, e));
  return total;
}

// ---------- Docker por socket ----------

function docker(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath: "/var/run/docker.sock", path: apiPath, method, headers: body ? { "Content-Type": "application/json" } : {} },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString();
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function inspect() {
  const r = await docker("GET", `/containers/${CONTAINER}/json`);
  return r.status === 200 ? r.json : null;
}

// ---------- RCON (mod ValheimRcon) ----------
// Mismo protocolo que el panel de Minecraft: login (tipo 3) y comando (tipo 2).

function packet(id, type, body) {
  const payload = Buffer.from(body, "utf8");
  const buf = Buffer.alloc(14 + payload.length);
  buf.writeInt32LE(10 + payload.length, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  payload.copy(buf, 12);
  return buf;
}

// Abre una conexión RCON, se autentica, ejecuta un comando y devuelve la respuesta.
function rcon(command) {
  return new Promise((resolve, reject) => {
    if (!RCON_PASSWORD) return reject(new Error("RCON sin configurar"));
    const socket = net.connect(RCON_PORT, RCON_HOST);
    let buf = Buffer.alloc(0);
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("El servidor no responde por RCON (¿está arrancando o falta el mod?)"));
    }, 5000);
    const finish = (err, result) => {
      clearTimeout(timer);
      socket.end();
      err ? reject(err) : resolve(result);
    };

    socket.on("connect", () => socket.write(packet(1, 3, RCON_PASSWORD)));
    socket.on("error", (e) => finish(new Error("No se pudo conectar por RCON: " + e.message)));
    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 4) {
        const len = buf.readInt32LE(0);
        if (buf.length < len + 4) break;
        const id = buf.readInt32LE(4);
        const body = buf.toString("utf8", 12, len + 2);
        buf = buf.subarray(len + 4);
        if (id === -1) return finish(new Error("Contraseña RCON incorrecta"));
        if (id === 1) socket.write(packet(2, 2, command));
        else if (id === 2) return finish(null, body);
      }
    });
  });
}

let rconCheck = { at: 0, ok: false };
async function rconAvailable() {
  if (Date.now() - rconCheck.at < 30000) return rconCheck.ok;
  try { await rcon("time"); rconCheck = { at: Date.now(), ok: true }; }
  catch { rconCheck = { at: Date.now(), ok: false }; }
  return rconCheck.ok;
}

// ---------- seguimiento del log del servidor ----------
// Mantiene las últimas líneas y el estado deducido de ellas (fase, código, versión, jugadores).

const MAX_LINES = 3000;
const state = {
  lines: [], seq: 0, followingStart: null, following: false,
  phase: "desconocido", joinCode: "", publicIp: "", version: "", activeCount: null,
  pending: [], // ids conectados aún sin nombre de personaje
  events: [], // actividad reciente para la línea de tiempo del inicio
  playfab: {}, // id de PlayFab -> id de plataforma, para detectar desconexiones con crossplay
  attempt: null, // última conexión aún sin personaje: { id, t }
  onlineAt: null, // último "Game server connected" (también cuenta el reinicio diario dentro del contenedor)
  pfErrors: [], // horas de los últimos "PlayFab network error" (crossplay perdiendo la conexión)
};

// Ajustes propios del panel: reinicio automático y cuándo se tocaron los mods por última vez
let settings = { autoRecover: true, modsChangedAt: 0, lastAutoRestart: 0, immortal: [] }; // immortal: Steam_… o "*" (todos)
try { Object.assign(settings, JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"))); } catch {}
function saveSettings() { return fsp.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2)).catch(() => {}); }
function markModsChanged() { settings.modsChangedAt = Date.now(); saveSettings(); }

// Hora de la línea: "10/25/2026 18:56:57:" (Valheim) o, si no, el momento en que llega
function lineTime(line) {
  const m = line.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  return m ? new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]).getTime() : Date.now();
}

function addEvent(line, kind, text) {
  state.events.push({ t: lineTime(line), kind, text });
  if (state.events.length > 200) state.events.shift();
}
let players = {}; // id -> { id, name, online, firstSeen, lastSeen }
try { players = JSON.parse(fs.readFileSync(PLAYERS_FILE, "utf8")); } catch {}
for (const p of Object.values(players)) p.online = false;

let savePlayersTimer = null;
// Como mucho una escritura cada 5 s (los jugadores se consultan cada 2 s)
function savePlayers() {
  if (savePlayersTimer) return;
  savePlayersTimer = setTimeout(() => { savePlayersTimer = null; fsp.writeFile(PLAYERS_FILE, JSON.stringify(players, null, 2)).catch(() => {}); }, 5000);
}

function playerConnected(id) {
  const now = Date.now();
  const p = players[id] || (players[id] = { id, name: "", firstSeen: now });
  p.online = true;
  p.lastSeen = now;
  p.joinPending = true; // se anuncia en la actividad cuando llegue el nombre del personaje
  if (!state.pending.includes(id)) state.pending.push(id);
  savePlayers();
}

function playerDisconnected(id) {
  for (const p of Object.values(players)) {
    if (p.id === id || p.id === "Steam_" + id || p.id.endsWith("_" + id)) { p.online = false; p.lastSeen = Date.now(); }
  }
  state.pending = state.pending.filter((x) => x !== id);
  savePlayers();
}

function leaveEvent(line, id) {
  const p = players[id];
  if (p && p.online) addEvent(line, "leave", (p.name || id) + " ha salido");
}

function handleLine(raw) {
  const line = raw.replace(/\^\[\[[0-9;]*m|\x1b\[[0-9;]*m|\r/g, "");
  if (!line.trim()) return;
  // Ruido de las consultas automáticas del panel (modo inmortal y comprobación del RCON)
  if (/Command completed: (players|heal|time)\b|valheim-server Online \d+$| Steam ID:\S+ Position:|hp of healing|Current server time:/.test(line)) return;
  state.lines.push({ n: ++state.seq, t: line });
  if (state.lines.length > MAX_LINES) state.lines.shift();

  let m;
  // El actualizador también comprueba versiones con el servidor ya en marcha: eso no cambia la fase
  if (/Downloading\/updating\/validating Valheim server|Update state \(0x/.test(line) && state.phase !== "en línea") state.phase = "actualizando";
  else if (/Starting server|Valheim server is starting|Load world/i.test(line) && state.phase !== "en línea") state.phase = "arrancando";
  if (/Game server connected|Opened Steam server|with join code/.test(line)) state.phase = "en línea";
  if (/Valheim server is stopping|OnApplicationQuit|Net scene destroyed/.test(line)) state.phase = "parando";

  if ((m = line.match(/Valheim version: ?([^\s(]+)/i))) state.version = m[1];
  if ((m = line.match(/join code (\d+)(?: and IP ([\d.]+))?/))) {
    // Solo se avisa si cambia respecto al último anunciado (tras reiniciar suele repetirse el mismo)
    if (m[1] !== state.announcedCode) addEvent(line, "code", "Nuevo código crossplay: " + m[1]);
    state.announcedCode = m[1];
    state.joinCode = m[1]; if (m[2]) state.publicIp = m[2];
  }
  if (/Game server connected/.test(line)) {
    addEvent(line, "start", "Servidor en línea");
    // Arranque nuevo del juego (también el reinicio diario de las 5:00): nadie sigue conectado
    state.onlineAt = lineTime(line); state.pfErrors = []; state.pending = []; state.playfab = {}; state.attempt = null;
    for (const p of Object.values(players)) p.online = false;
  }
  if (/PlayFab network error/.test(line)) {
    state.pfErrors.push(lineTime(line));
    if (state.pfErrors.length > 50) state.pfErrors.shift();
  }
  // Formato nuevo: "World save (5/5) done. Total time [393ms]"; antiguo: "World saved ( 123ms )"
  if ((m = line.match(/World save \(5\/5\) done\. Total time \[(\d+)ms\]|World saved \(\s*([\d.]+)\s*ms/i))) addEvent(line, "save", `Mundo guardado (${Math.round(m[1] || m[2])} ms)`);
  if (/Backing up Valheim server worlds/.test(line)) addEvent(line, "backup", "Copia de seguridad automática");
  if (/Valheim server is stopping|OnApplicationQuit/.test(line)) addEvent(line, "stop", "Servidor parándose");
  if ((m = line.match(/is active with (\d+) player|, now (\d+) player\(s\)/))) state.activeCount = Number(m[1] || m[2]);

  // Conexiones: Steam directo o crossplay (PlayFab con ID de plataforma)
  if ((m = line.match(/Got handshake from client (\d+)/))) { playerConnected("Steam_" + m[1]); state.attempt = { id: "Steam_" + m[1], t: lineTime(line) }; }
  if ((m = line.match(/Platform ID ([A-Za-z]+_[\w-]+)/))) { playerConnected(m[1]); state.attempt = { id: m[1], t: lineTime(line) }; }
  // Desconectado a los pocos segundos sin llegar a cargar el personaje: el servidor lo rechazó
  // (lista de permitidos, baneo o contraseña incorrecta)
  if (/RPC_Disconnect|Player connection lost|wrong password/.test(line) && state.attempt && lineTime(line) - state.attempt.t < 30000) {
    const p = players[state.attempt.id];
    if (p) {
      p.online = false;
      p.joinPending = false;
      p.rejectedAt = Date.now();
      p.rejectReason = /wrong password/.test(line) ? "password" : "";
      addEvent(line, "rejected", `Entrada rechazada: ${p.name || p.id}` + (p.rejectReason ? " (contraseña incorrecta)" : ""));
      state.pending = state.pending.filter((x) => x !== p.id);
      savePlayers();
    }
    state.attempt = null;
  }
  if ((m = line.match(/Got character ZDOID from (.+?) : (-?\d+):\d+/)) && m[2] !== "0") {
    const name = m[1].trim();
    const known = Object.values(players).find((p) => p.online && p.name === name);
    const id = known ? known.id : state.pending.shift();
    const p = id && players[id];
    if (state.attempt && state.attempt.id === id) state.attempt = null;
    if (p) {
      p.name = name; p.lastSeen = Date.now();
      if (p.joinPending) { p.joinPending = false; addEvent(line, "join", name + " ha entrado"); }
      state.pfErrors = []; // alguien ha podido entrar: el crossplay funciona
      savePlayers();
    }
  }
  // Crossplay: cada jugador tiene un ID de PlayFab ligado a su ID de plataforma (Steam_…)
  if ((m = line.match(/remote ID playfab\/(\w+) received local Platform ID ([A-Za-z]+_[\w-]+)/))) state.playfab[m[1]] = m[2];
  if ((m = line.match(/playfab\/(\w+)/)) && state.playfab[m[1]] && /clos|dispos|disconnect|lost|timed? ?out/i.test(line)) {
    const pid = state.playfab[m[1]];
    leaveEvent(line, pid); playerDisconnected(pid); delete state.playfab[m[1]];
  }
  if ((m = line.match(/Closing socket (\d+)/))) { leaveEvent(line, "Steam_" + m[1]); playerDisconnected("Steam_" + m[1]); }
  if ((m = line.match(/(?:Disconnect(?:ed)?|RPC_Disconnect).*?((?:Steam|Xbox|PlayFab)_[\w-]+)/i))) { leaveEvent(line, m[1]); playerDisconnected(m[1]); }
}

function followLogs(since) {
  state.following = true;
  const decoder = new StringDecoder("utf8");
  let buf = Buffer.alloc(0), text = "";
  const req = http.request(
    { socketPath: "/var/run/docker.sock", path: `/containers/${CONTAINER}/logs?follow=1&stdout=1&stderr=1&since=${since}`, method: "GET" },
    (res) => {
      res.on("data", (chunk) => {
        // Formato multiplexado de Docker: cabecera de 8 bytes con el tamaño del bloque
        buf = Buffer.concat([buf, chunk]);
        while (buf.length >= 8) {
          const size = buf.readUInt32BE(4);
          if (buf.length < 8 + size) break;
          text += decoder.write(buf.subarray(8, 8 + size));
          buf = buf.subarray(8 + size);
        }
        const parts = text.split("\n");
        text = parts.pop();
        parts.forEach(handleLine);
      });
      res.on("end", () => { state.following = false; });
    }
  );
  req.on("error", () => { state.following = false; });
  req.end();
}

// Cada pocos segundos: si el contenedor (re)arrancó, empieza a seguir su log desde cero.
async function watchContainer() {
  try {
    const info = await inspect();
    const running = info && info.State.Running;
    if (!running) {
      state.phase = info ? "parado" : "no creado";
      state.joinCode = "";
      for (const p of Object.values(players)) p.online = false;
    } else if (info.State.StartedAt !== state.followingStart || !state.following) {
      if (info.State.StartedAt !== state.followingStart) {
        // La actividad se conserva entre reinicios; el resto se vuelve a deducir del log nuevo
        state.lines = []; state.joinCode = ""; state.phase = "arrancando"; state.activeCount = null; state.pending = []; state.playfab = {}; state.attempt = null;
        state.onlineAt = null; state.pfErrors = [];
        for (const p of Object.values(players)) p.online = false;
        state.followingStart = info.State.StartedAt;
        followLogs(Math.floor(new Date(info.State.StartedAt).getTime() / 1000) - 1);
      } else {
        followLogs(Math.floor(Date.now() / 1000));
      }
    }
  } catch {}
  setTimeout(watchContainer, 3000);
}
watchContainer();

// ---------- estado del servidor ----------

let statusCache = { at: 0, data: null };
async function getStatusJson() {
  if (Date.now() - statusCache.at < 4000) return statusCache.data;
  try {
    const r = await fetch(STATUS_URL, { signal: AbortSignal.timeout(2000) });
    statusCache = { at: Date.now(), data: await r.json() };
  } catch { statusCache = { at: Date.now(), data: null }; }
  return statusCache.data;
}

function parseStats(s) {
  if (!s || !s.cpu_stats || !s.precpu_stats || !s.cpu_stats.cpu_usage) return null;
  const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
  const sysDelta = s.cpu_stats.system_cpu_usage - (s.precpu_stats.system_cpu_usage || 0);
  const cpus = s.cpu_stats.online_cpus || 1;
  const mem = s.memory_stats || {};
  const used = (mem.usage || 0) - ((mem.stats && mem.stats.inactive_file) || 0);
  return { cpu: sysDelta > 0 ? (cpuDelta / sysDelta) * cpus * 100 : 0, cpus, memUsed: used, memLimit: mem.limit || 0 };
}

// Docker tarda 1-2 s en contestar stats?stream=false (mide dos veces). Con stream=true manda una
// medida por segundo: se deja abierto y se guarda la última, así nadie tiene que esperar.
let statsNow = { at: 0, data: null };
function watchStats() {
  let buf = "";
  const req = http.request({ socketPath: "/var/run/docker.sock", path: `/containers/${CONTAINER}/stats?stream=true`, method: "GET" }, (res) => {
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        try { statsNow = { at: Date.now(), data: parseStats(JSON.parse(line)) }; } catch {}
      }
    });
    res.on("end", () => setTimeout(watchStats, 3000));
    res.on("error", () => {});
  });
  req.on("error", () => setTimeout(watchStats, 5000));
  req.end();
}
watchStats();
// Si el contenedor está parado no llegan medidas: se dan por caducadas a los 5 s
async function getStats() { return Date.now() - statsNow.at < 5000 ? statsNow.data : null; }

async function apiStatus() {
  const [info, status, stats, env] = await Promise.all([inspect(), getStatusJson(), getStats(), readEnv()]);
  const running = !!(info && info.State.Running);
  const rconOk = running && state.phase === "en línea" ? await rconAvailable() : false;
  const live = rconOk ? await getRconPlayers() : null;
  // Con crossplay el servidor no responde a la consulta de Steam de status.json; entonces vale el log
  const count = live ? live.length : status && !status.error ? status.player_count : state.activeCount;
  let phase = state.phase;
  if (running && status && !status.error) phase = "en línea";
  return {
    running, phase,
    startedAt: running ? info.State.StartedAt : null,
    joinCode: running ? state.joinCode : "",
    publicIp: state.publicIp,
    version: state.version,
    playerCount: running ? count : 0,
    stats,
    serverName: env.SERVER_NAME || "",
    worldName: env.WORLD_NAME || "",
    crossplay: /(^|\s)-crossplay(\s|$)/.test(env.SERVER_ARGS || ""),
    addresses: ADDRESSES,
    rcon: rconOk,
    onlineSince: running && state.phase === "en línea" ? state.onlineAt : null,
    // Cambios en mods o .cfg hechos después del último arranque del juego
    modsPending: !!settings.modsChangedAt && !!state.onlineAt && settings.modsChangedAt > state.onlineAt,
    crossplayHealth: crossplayHealth(),
    immortal: settings.immortal,
    pendingRestart: pendingRestart ? pendingRestart.at : null,
  };
}

// ---------- vigilante del crossplay ----------
// A veces la conexión con PlayFab se rompe y el servidor entra en bucle ("PlayFab network error"
// cada ~45 s). Mientras dura, nadie puede entrar con el código. Reiniciar el contenedor lo arregla.

const PF_WINDOW = 10 * 60 * 1000;
const PF_THRESHOLD = 8; // en bucle salen ~13 errores cada 10 minutos
const AUTO_RESTART_GAP = 60 * 60 * 1000; // como mucho un reinicio automático por hora

function crossplayHealth() {
  const recent = state.pfErrors.filter((t) => Date.now() - t < PF_WINDOW).length;
  return {
    errors: recent, broken: recent >= PF_THRESHOLD,
    lastError: state.pfErrors.length ? state.pfErrors[state.pfErrors.length - 1] : null,
    autoRecover: settings.autoRecover, lastAutoRestart: settings.lastAutoRestart || null,
  };
}

async function crossplayWatchdog() {
  try {
    const h = crossplayHealth();
    const live = await getRconPlayers();
    const nobody = live ? live.length === 0 : state.activeCount === 0 && !Object.values(players).some((p) => p.online);
    if (settings.autoRecover && h.broken && nobody && state.phase === "en línea" &&
        Date.now() - (settings.lastAutoRestart || 0) > AUTO_RESTART_GAP) {
      settings.lastAutoRestart = Date.now();
      await saveSettings();
      state.events.push({ t: Date.now(), kind: "stop", text: "Reinicio automático: el crossplay había perdido la conexión" });
      await containerAction("restart");
    }
  } catch {}
  setTimeout(crossplayWatchdog, 60000);
}
setTimeout(crossplayWatchdog, 60000);

// ---------- modo inmortal ----------
// Volar o el modo dios de verdad solo existen en el juego de cada jugador. Desde el servidor lo más
// parecido es curar cada 2 s (comando heal del mod RCON) a quien haya perdido vida.

const IMMORTAL_EVERY = 2000;

function parsePlayers(out) {
  return out.split("\n").map((l) => l.match(/^(.*?) Steam ID:(\S+) Position: \((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\).*?HP:(-?[\d.]+)\/([\d.]+)/)).filter(Boolean)
    .map((m) => ({ name: m[1], id: m[2], x: Number(m[3]), y: Number(m[4]), z: Number(m[5]), hp: Number(m[6]), max: Number(m[7]) }));
}

async function immortalLoop() {
  try {
    if (settings.immortal.length && state.phase === "en línea") {
      for (const p of (await getRconPlayers()) || []) {
        const on = settings.immortal.includes("*") || settings.immortal.includes(p.id);
        if (on && p.max > 0 && p.hp < p.max) await rcon(`heal ${p.id} 10000`); // el juego no pasa del máximo
      }
    }
  } catch {}
  setTimeout(immortalLoop, IMMORTAL_EVERY);
}
setTimeout(immortalLoop, IMMORTAL_EVERY);

async function healPlayers(id) {
  const list = (await getRconPlayers()) || [];
  const targets = id === "*" ? list : list.filter((p) => p.id === id);
  if (!targets.length) throw new Error(id === "*" ? "No hay nadie conectado" : "Ese jugador no está conectado");
  for (const p of targets) await rcon(`heal ${p.id} 10000`);
  return { ok: true, out: targets.length === 1 ? `${targets[0].name} curado` : `${targets.length} jugadores curados` };
}

// Lugares guardados para teletransportar: [{ name, x, y, z }]
if (!Array.isArray(settings.places)) settings.places = [];
async function savePlaces(list) {
  if (!Array.isArray(list) || list.length > 100) throw new Error("Lista no válida");
  // y = null: punto elegido en el mapa, sin altura (al teletransportar el juego busca el suelo)
  settings.places = list.map((p) => ({ name: String(p.name || "Lugar").slice(0, 40), x: +p.x, y: p.y === null || p.y === undefined || !Number.isFinite(+p.y) ? null : +p.y, z: +p.z }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.z) && Math.hypot(p.x, p.z) <= 10400);
  await saveSettings();
  return settings.places;
}

// ---------- mundo y jugadores (mapa, teletransporte, kits, cofres, jefes, eventos, criaturas) ----------

const CATALOG = require("./items.js");
const ITEM_PREFABS = new Set(CATALOG.items.map((i) => i.prefab));
const CHEST_PREFABS = ["piece_chest_wood", "piece_chest", "piece_chest_private", "piece_chest_blackmetal", "piece_chest_barrel"];
const BOSS_KEYS = ["defeated_eikthyr", "defeated_gdking", "defeated_bonemass", "defeated_dragon", "defeated_goblinking", "defeated_queen", "defeated_fader"];
const ID_RE = /^[A-Za-z]+_[\w-]+$/; // Steam_7656…, Xbox_…
const PREFAB_RE = /^[\w-]{1,64}$/;
const OBJ_RE = /^-?\d+:-?\d+$/; // id de objeto "N:M"

// Semilla: en _main.N.fwl2, tras el nombre del mundo (con su longitud delante) va la semilla con la suya
async function readSeed(worldDir) {
  try {
    const files = (await fsp.readdir(worldDir)).filter((f) => /^_main\.\d+\.fwl2$/.test(f));
    const latest = files.sort((a, b) => Number(b.split(".")[1]) - Number(a.split(".")[1]))[0];
    if (!latest) return "";
    const buf = await fsp.readFile(path.join(worldDir, latest));
    const name = Buffer.from(path.basename(worldDir));
    const i = buf.indexOf(name);
    if (i < 1 || buf[i - 1] !== name.length) return "";
    const len = buf[i + name.length];
    const seed = buf.toString("utf8", i + name.length + 1, i + name.length + 1 + len);
    return /^[\w-]{1,32}$/.test(seed) ? seed : "";
  } catch { return ""; }
}

async function livePlayer(id) {
  const list = (await getRconPlayers()) || [];
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error("Ese jugador no está conectado");
  return p;
}
const vec = (p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}`;
const n = (v, min, max, def) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def; };

// Al jugador X a: otro jugador ({player}) o un punto del mapa ({x, z}).
// Para un punto del mapa se usa una altura bajo tierra: el juego busca entonces el suelo él solo
// (si fuera por encima, el jugador caería desde esa altura).
async function teleport(id, to) {
  if (!ID_RE.test(id)) throw new Error("Jugador no válido");
  let dest;
  if (to && to.player) { const t = await livePlayer(to.player); dest = { x: t.x + 1.5, y: t.y + 0.5, z: t.z }; }
  else if (to && Number.isFinite(+to.x) && Number.isFinite(+to.z)) {
    if (Math.hypot(+to.x, +to.z) > 10400) throw new Error("Ese punto está fuera del mundo");
    // Con altura conocida (lugar guardado, punto de muerte) se usa un poco por encima; si no, el juego busca el suelo
    dest = { x: +to.x, y: Number.isFinite(+to.y) && to.y !== null ? +to.y + 0.5 : -400, z: +to.z };
  } else throw new Error("Destino no válido");
  return rcon(`teleport ${id} ${vec(dest)}`);
}

const DEFAULT_KITS = [
  { name: "🪓 Principiante", items: [["AxeFlint", 1], ["PickaxeAntler", 1], ["Hammer", 1], ["Torch", 1], ["ShieldWood", 1], ["CookedMeat", 10], ["Wood", 50], ["Stone", 30]] },
  { name: "🏠 Construcción", items: [["Wood", 200], ["FineWood", 100], ["RoundLog", 100], ["Stone", 200], ["BronzeNails", 100], ["Resin", 50], ["Hammer", 1]] },
  { name: "🍖 Comida", items: [["CookedMeat", 20], ["CookedDeerMeat", 20], ["Raspberry", 20], ["Honey", 20], ["MeadHealthMedium", 10], ["MeadStaminaMedium", 10]] },
  { name: "⛏️ Minería", items: [["PickaxeIron", 1], ["Iron", 50], ["Copper", 50], ["Tin", 50], ["Coal", 100]] },
  { name: "⚔️ Combate", items: [["SwordIron", 1], ["ShieldBanded", 1], ["BowFineWood", 1], ["ArrowIron", 100], ["HelmetIron", 1], ["ArmorIronChest", 1], ["ArmorIronLegs", 1], ["MeadHealthMedium", 10]] },
];
if (!Array.isArray(settings.kits)) settings.kits = DEFAULT_KITS.map((k) => ({ ...k, name: tg(k.name) }));

async function giveKit(index, target) {
  const kit = settings.kits[n(index, 0, 999, -1)];
  if (!kit) throw new Error("Kit no encontrado");
  const list = (await getRconPlayers()) || [];
  const targets = target === "*" ? list.map((p) => p.id) : [target];
  if (!targets.length) throw new Error("No hay nadie conectado");
  for (const id of targets) {
    if (!ID_RE.test(id)) throw new Error("Jugador no válido");
    for (const [item, count] of kit.items) await rcon(`give ${id} ${item} -count ${n(count, 1, 9999, 1)}`);
  }
  return { ok: true, out: `${kit.name} entregado a ${targets.length} jugador(es)` };
}

function parseObjects(out) {
  return out.split("\n").map((l) => l.match(/^-Prefab: (\S+) Id: (\S+) Position: \((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)\)/)).filter(Boolean)
    .map((m) => ({ prefab: m[1], id: m[2], x: +m[3], y: +m[4], z: +m[5] }));
}

async function nearbyChests(id) {
  const p = await livePlayer(id);
  const found = [];
  for (const prefab of CHEST_PREFABS) found.push(...parseObjects(await rcon(`findObjects -near ${vec(p)} 30 -prefab ${prefab}`)));
  return found.map((c) => ({ ...c, dist: Math.round(Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z)) })).sort((a, b) => a.dist - b.dist);
}

async function showChest(oid) {
  if (!OBJ_RE.test(oid)) throw new Error("Cofre no válido");
  const out = await rcon(`showContainer ${oid}`);
  const items = out.split("\n").map((l) => l.match(/^\[(\d+)\] (\S+) Stack: (\d+) Quality: (\d+)/)).filter(Boolean)
    .map((m) => ({ index: +m[1], prefab: m[2], stack: +m[3], quality: +m[4] }));
  return { items, empty: /Container is empty/.test(out), raw: items.length || /empty/.test(out) ? "" : out };
}

// Objetos tirados en el suelo: los que tienen el nombre de un objeto del catálogo (los de construcción se llaman distinto)
async function nearbyDrops(id, radius) {
  const p = await livePlayer(id);
  const r = n(radius, 5, 60, 30);
  const out = parseObjects(await rcon(`findObjects -near ${vec(p)} ${r}`));
  const counts = {};
  for (const o of out) if (ITEM_PREFABS.has(o.prefab)) counts[o.prefab] = (counts[o.prefab] || 0) + 1;
  // Si la lista sale cortada (demasiados objetos), se pregunta por cada objeto común
  if (out.length > 40) {
    for (const prefab of ITEM_PREFABS) {
      if (counts[prefab]) continue;
      const c = parseObjects(await rcon(`findObjects -near ${vec(p)} ${r} -prefab ${prefab}`)).length;
      if (c) counts[prefab] = c;
    }
  }
  return { radius: r, drops: Object.entries(counts).map(([prefab, count]) => ({ prefab, count })).sort((a, b) => b.count - a.count) };
}

async function deleteDrops(id, radius, prefabs) {
  const p = await livePlayer(id);
  const r = n(radius, 5, 60, 30);
  let deleted = 0;
  for (const prefab of prefabs || []) {
    if (!ITEM_PREFABS.has(prefab)) continue; // solo objetos sueltos del catálogo, nunca construcciones
    const out = await rcon(`deleteObjects -near ${vec(p)} ${r} -prefab ${prefab}`);
    const m = out.match(/Deleted (\d+)\//);
    if (m) deleted += +m[1];
  }
  return { ok: true, out: `${deleted} objetos borrados` };
}

async function worldInfo() {
  const [keysOut, eventsOut, currentOut] = await Promise.all([rcon("globalKeys"), rcon("eventsList"), rcon("currentEvent")]);
  const keys = keysOut.split("\n").slice(1).map((l) => l.split(/\s*:\s*|\s+/)[0]).filter(Boolean);
  const events = (eventsOut.split("\n")[1] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return { bosses: BOSS_KEYS.map((k) => ({ key: k, done: keys.includes(k) })), keys, events, current: /No active/.test(currentOut) ? "" : currentOut };
}

async function startEvent(name, id) {
  if (!PREFAB_RE.test(name)) throw new Error("Evento no válido");
  const p = await livePlayer(id);
  return rcon(`startEvent ${name} ${vec(p)}`);
}

async function spawnNear(prefab, id, count, level, tamed) {
  if (!PREFAB_RE.test(prefab)) throw new Error("Criatura no válida");
  const p = await livePlayer(id);
  const at = { x: p.x + 5, y: p.y + 1, z: p.z + 5 };
  return rcon(`spawn ${prefab} ${vec(at)} -count ${n(count, 1, 20, 1)} -level ${n(level, 1, 3, 1)} -radius 3${tamed ? " -tamed" : ""}`);
}

// ---------- avisos: mensajes programados, bienvenida y reinicio con aviso ----------

if (!Array.isArray(settings.schedules)) settings.schedules = []; // [{ text, everyMin, mode, last }]
if (typeof settings.welcome !== "string") settings.welcome = "";
const cleanMsg = (t) => String(t || "").replace(/[\r\n"]+/g, " ").trim().slice(0, 200);

async function scheduleLoop() {
  try {
    if (state.phase === "en línea" && settings.schedules.length) {
      const live = (await getRconPlayers()) || [];
      for (const s of settings.schedules) {
        if (live.length && Date.now() - (s.last || 0) >= s.everyMin * 60000) {
          s.last = Date.now();
          await rcon(`${s.mode === "say" ? "say" : "showMessage"} ${cleanMsg(s.text)}`);
        }
      }
    }
  } catch {}
  setTimeout(scheduleLoop, 30000);
}
setTimeout(scheduleLoop, 30000);

// Bienvenida: se manda cuando el log anuncia que alguien ha entrado
let welcomedAt = Date.now();
setInterval(async () => {
  const joins = state.events.filter((e) => e.kind === "join" && e.t > welcomedAt);
  if (!joins.length) return;
  welcomedAt = Math.max(...joins.map((e) => e.t));
  if (!settings.welcome) return;
  for (const e of joins) {
    const name = e.text.replace(/ ha entrado$/, "");
    await rcon(`showMessage ${cleanMsg(settings.welcome.replace(/\{(nombre|name)\}/g, name))}`).catch(() => {});
  }
}, 5000);

let pendingRestart = null; // { at, timers }
function restartWithWarning(minutes) {
  if (pendingRestart) throw new Error("Ya hay un reinicio programado");
  const total = n(minutes, 1, 30, 5) * 60000, at = Date.now() + total;
  const warn = (txt) => rcon(`showMessage ${txt}`).catch(() => {});
  const timers = [];
  for (const left of [10, 5, 1].map((m) => m * 60000).concat(10000)) {
    if (left > total) continue;
    timers.push(setTimeout(() => warn(left >= 60000 ? tg("El servidor se reinicia en {a} min. ¡Poneos a salvo!", { a: left / 60000 }) : tg("El servidor se reinicia en 10 segundos")), total - left));
  }
  timers.push(setTimeout(async () => {
    pendingRestart = null;
    await rcon("save").catch(() => {});
    state.events.push({ t: Date.now(), kind: "stop", text: "Reinicio programado con aviso" });
    containerAction("restart").catch(() => {});
  }, total));
  warn(tg("El servidor se reinicia en {a} min. ¡Poneos a salvo!", { a: Math.round(total / 60000) }));
  pendingRestart = { at, timers };
  return { ok: true, at };
}
function cancelRestart() {
  if (!pendingRestart) return { ok: true };
  pendingRestart.timers.forEach(clearTimeout);
  pendingRestart = null;
  rcon(`showMessage ${tg("Reinicio cancelado")}`).catch(() => {});
  return { ok: true };
}

// ---------- historial de 24 h (CPU, memoria, jugadores, fallos del crossplay) ----------

const HISTORY_FILE = path.join(PANEL_DATA, "history.json");
let history = [];
try { history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")); } catch {}
setInterval(async () => {
  try {
    const [stats, info] = await Promise.all([getStats().catch(() => null), inspect()]);
    const running = !!(info && info.State.Running);
    history.push({
      t: Date.now(),
      cpu: stats ? +(stats.cpu / stats.cpus).toFixed(1) : null,
      mem: stats ? Math.round(stats.memUsed / 1048576) : null,
      players: running ? state.activeCount || 0 : null,
      pf: state.pfErrors.filter((t) => Date.now() - t < 60000).length,
    });
    history = history.filter((h) => Date.now() - h.t < 86400000);
  } catch {}
}, 60000);
setInterval(() => fsp.writeFile(HISTORY_FILE, JSON.stringify(history)).catch(() => {}), 600000);

// Seguimiento de jugadores aunque nadie tenga el panel abierto (para las estadísticas)
setInterval(() => { if (state.phase === "en línea") getRconPlayers().catch(() => {}); }, 15000);

function setImmortal(id, enabled) {
  id = String(id || "");
  if (id !== "*" && !/^[A-Za-z]+_[\w-]+$/.test(id)) throw new Error("Jugador no válido");
  settings.immortal = settings.immortal.filter((x) => x !== id);
  if (enabled) settings.immortal.push(id);
  saveSettings();
  return { ok: true, immortal: settings.immortal };
}

// Resumen del mundo guardado, copias y espacio en disco (solo lee archivos, no toca el servidor)
let overviewCache = { at: 0, data: null };
async function apiOverview() {
  // Se recalcula si ha pasado 1 min o si desde entonces se ha guardado el mundo o hecho una copia
  const lastDisk = Math.max(0, ...state.events.filter((e) => e.kind === "save" || e.kind === "backup").map((e) => e.t));
  if (Date.now() - overviewCache.at > 60000 || lastDisk > overviewCache.at) overviewCache = { at: Date.now(), data: await computeOverview() };
  return { ...overviewCache.data, events: state.events.slice(-40).reverse() };
}
async function computeOverview() {
  const env = await readEnv();
  const world = env.WORLD_NAME || "";
  const worldsDir = path.join(CONFIG, "worlds_local");
  // Formato nuevo: carpeta worlds_local/<Mundo>/_main.N.db2 + .chunk; antiguo: <Mundo>.db
  let db = null, worldSize = 0, autoBackupsSize = 0;
  const worldDir = path.join(worldsDir, world);
  try {
    const files = (await fsp.readdir(worldDir)).filter((f) => /^_main\.\d+\.db2$/.test(f));
    const latest = files.sort((a, b) => Number(b.split(".")[1]) - Number(a.split(".")[1]))[0];
    if (latest) { const st = await fsp.stat(path.join(worldDir, latest)); db = { size: st.size, savedAt: st.mtime }; }
    worldSize = await dirSize(worldDir);
  } catch {}
  if (!db) try { const st = await fsp.stat(path.join(worldsDir, world + ".db")); db = { size: st.size, savedAt: st.mtime }; worldSize = st.size; } catch {}
  // Copias internas que hace el propio Valheim (carpetas <Mundo>_backup_auto-…)
  try {
    for (const f of await fsp.readdir(worldsDir)) if (f.startsWith(world + "_backup_auto-")) autoBackupsSize += await dirSize(path.join(worldsDir, f));
  } catch {}
  const backups = await apiBackups();
  let disk = null;
  try { const s = await fsp.statfs(CONFIG); disk = { free: s.bavail * s.bsize, total: s.blocks * s.bsize }; } catch {}
  const mods = (await apiMods()).filter((m) => m.enabled);
  return {
    world, db, seed: await readSeed(worldDir),
    worldsSize: worldSize, autoBackupsSize,
    lastBackup: backups[0] || null,
    backupsCount: backups.length,
    backupsSize: backups.reduce((a, b) => a + b.size, 0),
    disk,
    events: state.events.slice(-40).reverse(),
    password: env.SERVER_PASS || "",
    mods: mods.map((m) => ({ name: m.name, version: m.version, url: m.url })),
  };
}

// Conectados según el propio servidor (comando "players" del RCON); null si el RCON no responde
let rconPlayers = { at: 0, list: null }, rconPlayersBusy = null;
// Si llegan varias consultas a la vez, comparten la misma llamada al RCON
function getRconPlayers() {
  if (Date.now() - rconPlayers.at < 1500) return Promise.resolve(rconPlayers.list);
  if (!rconPlayersBusy) rconPlayersBusy = fetchRconPlayers().finally(() => (rconPlayersBusy = null));
  return rconPlayersBusy;
}
async function fetchRconPlayers() {
  let list = null;
  try { if (state.phase === "en línea") list = parsePlayers(await rcon("players")); } catch {}
  rconPlayers = { at: Date.now(), list };
  if (list) {
    // Es la lista exacta: corrige el seguimiento deducido del log
    const ids = new Set(list.map((p) => p.id));
    const now = Date.now();
    for (const r of list) {
      const p = players[r.id] || (players[r.id] = { id: r.id, name: r.name, firstSeen: now });
      // Estadísticas: sesiones, tiempo jugado (entre consultas, como mucho 1 min) y muertes (vida a 0)
      if (!p.tick) { p.sessions = (p.sessions || 0) + 1; p.sessionStart = now; }
      else p.playMs = (p.playMs || 0) + Math.min(60000, now - p.tick);
      p.tick = now;
      if (r.hp <= 0 && !p.dead) { p.deaths = (p.deaths || 0) + 1; p.deathPos = { x: r.x, y: r.y, z: r.z, t: now }; state.events.push({ t: now, kind: "death", text: `${r.name} ha muerto` }); }
      p.dead = r.hp <= 0;
      p.lastSeen = now;
      p.online = true; p.name = r.name || p.name; p.hp = r.hp; p.maxHp = r.max; p.pos = { x: r.x, y: r.y, z: r.z };
    }
    for (const p of Object.values(players)) {
      if (!ids.has(p.id)) p.tick = 0;
      if (p.online && !ids.has(p.id) && !state.pending.includes(p.id)) p.online = false;
    }
    savePlayers();
    state.activeCount = list.length;
  }
  return list;
}

async function apiPlayers() {
  const live = await getRconPlayers();
  const all = Object.values(players).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  if (live) return { online: all.filter((p) => p.online), history: all, count: live.length };
  // Sin RCON: si hay más "en línea" que los que dice el servidor, los más antiguos se dan por desconectados
  const count = statusCache.data && !statusCache.data.error ? statusCache.data.player_count : state.activeCount;
  let online = all.filter((p) => p.online);
  if (typeof count === "number" && online.length > count) {
    online.slice(count).forEach((p) => (p.online = false));
    online = online.slice(0, count);
  }
  return { online, history: all, count };
}

// ---------- datos en directo ----------
// Un bucle refresca cada 2 s estado y jugadores; el navegador los recibe al momento por /api/live (SSE)
// y /api/status y /api/players contestan con la última foto sin esperar a Docker ni al RCON.

const live = { status: null, players: null, at: 0, json: "" };
const liveClients = new Set();
let liveBusy = null;
function refreshLive(force) {
  if (force) rconPlayers.at = 0;
  if (liveBusy) return liveBusy;
  liveBusy = (async () => {
    try {
      const [status, pl] = await Promise.all([apiStatus(), apiPlayers()]);
      status.events = state.events.slice(-40).reverse();
      live.status = status; live.players = pl; live.at = Date.now();
      const json = JSON.stringify({ status, players: pl });
      if (json !== live.json) {
        live.json = json;
        for (const res of liveClients) res.write(`data: ${json}\n\n`);
      }
    } catch {}
    liveBusy = null;
  })();
  return liveBusy;
}
setInterval(() => refreshLive(), 2000);
setInterval(() => { for (const res of liveClients) res.write(": latido\n\n"); }, 15000);
setTimeout(refreshLive, 1000);
async function liveStatus() { if (Date.now() - live.at > 5000) await refreshLive(); return live.status; }
async function livePlayers() { if (Date.now() - live.at > 5000) await refreshLive(); return live.players; }
function openLive(req, res) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.write("retry: 3000\n\n");
  if (live.json) res.write(`data: ${live.json}\n\n`);
  liveClients.add(res);
  req.on("close", () => liveClients.delete(res));
}

// ---------- contenedor ----------

async function containerAction(action) {
  const map = { start: "start", stop: "stop?t=120", restart: "restart?t=120" };
  if (!map[action]) throw new Error("Acción no válida");
  const r = await docker("POST", `/containers/${CONTAINER}/${map[action]}`);
  if (r.status >= 400) throw new Error((r.json && r.json.message) || r.text);
  return { ok: true };
}

// ---------- listas de admin / baneados / permitidos ----------

const LISTS = { admin: "adminlist.txt", banned: "bannedlist.txt", permitted: "permittedlist.txt" };

async function readList(type) {
  if (!LISTS[type]) throw new Error("Lista no válida");
  let text = "";
  try { text = await fsp.readFile(path.join(CONFIG, LISTS[type]), "utf8"); } catch {}
  return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));
}

async function writeList(type, ids) {
  const clean = [...new Set(ids.map((s) => String(s).trim()).filter((s) => /^[\w-]{3,64}$/.test(s)))];
  await fsp.writeFile(path.join(CONFIG, LISTS[type]), `// List ${type} players ID  ONE per line\n` + clean.join("\n") + "\n");
  return clean;
}

// Los servidores con crossplay identifican a los jugadores de Steam como "Steam_<id>";
// sin crossplay solo con el número. Guardamos ambas formas para que funcione siempre.
function idVariants(id) {
  const m = String(id).match(/^(?:Steam_)?(\d{17})$/);
  return m ? [m[1], "Steam_" + m[1]] : [String(id)];
}

async function listChange(type, id, add) {
  const ids = await readList(type);
  const variants = idVariants(id);
  const next = add ? ids.concat(variants) : ids.filter((x) => !variants.includes(x));
  return writeList(type, next);
}

// ---------- ajustes (valheim.env) ----------

async function readEnv() {
  const env = {};
  let text = "";
  try { text = await fsp.readFile(ENV_FILE, "utf8"); } catch {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

// Reescribe solo las claves indicadas, conservando comentarios y orden del archivo.
async function writeEnv(changes) {
  let lines = [];
  try { lines = (await fsp.readFile(ENV_FILE, "utf8")).split(/\r?\n/); } catch {}
  const done = new Set();
  lines = lines.map((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)=/);
    if (m && m[1] in changes) { done.add(m[1]); return `${m[1]}=${changes[m[1]]}`; }
    return line;
  });
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  for (const [k, v] of Object.entries(changes)) if (!done.has(k)) lines.push(`${k}=${v}`);
  await fsp.writeFile(ENV_FILE, lines.join("\n") + "\n");
}

const MODIFIERS = {
  combat: ["veryeasy", "easy", "hard", "veryhard"],
  deathpenalty: ["casual", "veryeasy", "easy", "hard", "hardcore"],
  resources: ["muchless", "less", "more", "muchmore", "most"],
  raids: ["none", "muchless", "less", "more", "muchmore"],
  portals: ["casual", "hard", "veryhard"],
};
const PRESETS = ["normal", "casual", "easy", "hard", "hardcore", "immersive", "hammer"];
const SETKEYS = ["nobuildcost", "playerevents", "passivemobs", "nomap"];

function parseArgs(args) {
  const out = { crossplay: false, preset: "", modifiers: {}, setkeys: [], extra: [] };
  const t = String(args || "").split(/\s+/).filter(Boolean);
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "-crossplay") out.crossplay = true;
    else if (t[i] === "-preset") out.preset = t[++i] || "";
    else if (t[i] === "-modifier") { out.modifiers[t[i + 1]] = t[i + 2]; i += 2; }
    else if (t[i] === "-setkey") out.setkeys.push(t[++i]);
    else out.extra.push(t[i]);
  }
  return out;
}

function buildArgs(s) {
  const a = [];
  if (s.crossplay) a.push("-crossplay");
  if (PRESETS.includes(s.preset)) a.push("-preset", s.preset);
  for (const [k, v] of Object.entries(s.modifiers || {})) if (MODIFIERS[k] && MODIFIERS[k].includes(v)) a.push("-modifier", k, v);
  for (const k of s.setkeys || []) if (SETKEYS.includes(k)) a.push("-setkey", k);
  for (const x of s.extra || []) if (/^[\w.:/-]+$/.test(x)) a.push(x);
  return a.join(" ");
}

async function apiGetSettings() {
  const env = await readEnv();
  const args = parseArgs(env.SERVER_ARGS);
  return {
    serverName: env.SERVER_NAME || "", worldName: env.WORLD_NAME || "", password: env.SERVER_PASS || "",
    public: env.SERVER_PUBLIC === "true", bepinex: env.BEPINEX === "true",
    backupsCron: env.BACKUPS_CRON || "", backupsMaxAge: env.BACKUPS_MAX_AGE || "3",
    restartCron: env.RESTART_CRON || "", updateIfIdle: env.UPDATE_IF_IDLE !== "false",
    ...args,
    options: { modifiers: MODIFIERS, presets: PRESETS, setkeys: SETKEYS },
  };
}

async function apiSaveSettings(s) {
  const name = String(s.serverName || "").trim();
  const world = String(s.worldName || "").trim();
  const pass = String(s.password || "");
  if (!name) throw new Error("El nombre del servidor no puede estar vacío");
  if (!/^[A-Za-z0-9_-]+$/.test(world)) throw new Error("El nombre del mundo solo puede tener letras, números, - y _");
  if (pass.length < 5) throw new Error("La contraseña debe tener al menos 5 caracteres");
  if (name.toLowerCase().includes(pass.toLowerCase())) throw new Error("La contraseña no puede estar contenida en el nombre del servidor");
  if (/[\r\n]/.test(name + pass)) throw new Error("Caracteres no válidos");
  await writeEnv({
    SERVER_NAME: name, WORLD_NAME: world, SERVER_PASS: pass,
    SERVER_PUBLIC: s.public ? "true" : "false",
    SERVER_ARGS: buildArgs(s),
    BEPINEX: s.bepinex ? "true" : "false",
    BACKUPS_CRON: /^[\d*/, -]+$/.test(s.backupsCron || "") ? s.backupsCron : "0 */2 * * *",
    BACKUPS_MAX_AGE: String(Math.max(1, Number(s.backupsMaxAge) || 3)),
    RESTART_CRON: /^[\d*/, -]*$/.test(s.restartCron || "") ? s.restartCron || "" : "",
    UPDATE_IF_IDLE: s.updateIfIdle ? "true" : "false",
  });
  return { ok: true };
}

// Recrea el contenedor del servidor para que tome los ajustes nuevos de valheim.env
async function applySettings() {
  const out = await run("docker", ["compose", "-p", "valheim", "--project-directory", PROJECT, "-f", path.join(PROJECT, "docker-compose.yml"), "up", "-d", "--no-deps", "valheim"]);
  return { ok: true, out };
}

// ---------- mods ----------

async function readManifest(dir) {
  try { return JSON.parse((await fsp.readFile(path.join(dir, "manifest.json"), "utf8")).replace(/^﻿/, "")); } catch { return null; }
}

async function apiMods() {
  const mods = [];
  for (const [base, enabled] of [[PLUGINS, true], [PLUGINS_OFF, false]]) {
    let entries = [];
    try { entries = await fsp.readdir(base, { withFileTypes: true }); } catch {}
    for (const e of entries) {
      const full = path.join(base, e.name);
      const man = e.isDirectory() ? await readManifest(full) : null;
      mods.push({
        folder: e.name, enabled, isDir: e.isDirectory(),
        name: (man && man.name) || e.name.replace(/\.dll$/i, ""),
        version: (man && man.version_number) || "",
        description: (man && man.description) || "",
        author: (man && man.panel_owner) || "",
        url: (man && man.panel_url) || "",
        size: await dirSize(full).catch(() => 0),
      });
    }
  }
  return mods.sort((a, b) => a.name.localeCompare(b.name));
}

async function toggleMod(folder, enable) {
  folder = safeName(folder);
  const from = path.join(enable ? PLUGINS_OFF : PLUGINS, folder);
  const to = path.join(enable ? PLUGINS : PLUGINS_OFF, folder);
  await fsp.mkdir(path.dirname(to), { recursive: true });
  await fsp.rename(from, to);
  return { ok: true };
}

async function deleteMod(folder) {
  folder = safeName(folder);
  for (const base of [PLUGINS, PLUGINS_OFF]) await fsp.rm(path.join(base, folder), { recursive: true, force: true });
  return { ok: true };
}

// Copia el contenido útil de un mod descomprimido a plugins/<carpeta>.
// Los paquetes de Thunderstore traen los .dll en la raíz, en plugins/ o en BepInEx/plugins/.
async function installExtracted(srcDir, folder, meta) {
  const candidates = ["BepInEx/plugins", "plugins"].map((p) => path.join(srcDir, p));
  let from = srcDir;
  for (const c of candidates) if (await exists(c)) { from = c; break; }
  const dest = path.join(PLUGINS, folder);
  await fsp.rm(dest, { recursive: true, force: true });
  await fsp.rm(path.join(PLUGINS_OFF, folder), { recursive: true, force: true });
  await fsp.mkdir(dest, { recursive: true });
  const skip = new Set(["icon.png", "readme.md", "changelog.md", "license", "license.md", "license.txt", "manifest.json"]);
  for (const e of await fsp.readdir(from)) {
    if (from === srcDir && (skip.has(e.toLowerCase()) || e === "BepInEx" || e === "config" || e === "patchers")) continue;
    await fsp.cp(path.join(from, e), path.join(dest, e), { recursive: true });
  }
  // Configuración por defecto que traen algunos mods
  for (const c of ["BepInEx/config", "config"].map((p) => path.join(srcDir, p))) {
    if (await exists(c)) await fsp.cp(c, path.join(CONFIG, "bepinex"), { recursive: true, force: false, errorOnExist: false });
  }
  const man = (await readManifest(srcDir)) || {};
  await fsp.writeFile(path.join(dest, "manifest.json"), JSON.stringify({ ...man, ...meta }, null, 2));
}

async function unzipTo(zipFile) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "mod-"));
  await run("unzip", ["-o", "-q", zipFile, "-d", dir]);
  return dir;
}

async function uploadMod(fileName, data) {
  fileName = safeName(fileName);
  if (/\.dll$/i.test(fileName)) {
    const folder = fileName.replace(/\.dll$/i, "");
    const dest = path.join(PLUGINS, folder);
    await fsp.mkdir(dest, { recursive: true });
    await fsp.writeFile(path.join(dest, fileName), data);
    return { ok: true, installed: [folder] };
  }
  if (!/\.zip$/i.test(fileName)) throw new Error("Solo se aceptan archivos .dll o .zip");
  const tmp = path.join(os.tmpdir(), "upload-" + Date.now() + ".zip");
  await fsp.writeFile(tmp, data);
  const dir = await unzipTo(tmp);
  try {
    const man = await readManifest(dir);
    const folder = man && man.name ? (man.author || "Manual") + "-" + man.name : fileName.replace(/\.zip$/i, "");
    await installExtracted(dir, safeName(folder), { panel_source: "subido" });
    return { ok: true, installed: [folder] };
  } finally {
    fsp.rm(dir, { recursive: true, force: true });
    fsp.rm(tmp, { force: true });
  }
}

// ---------- Thunderstore ----------
// El índice completo pesa ~170 MB, así que se lee en streaming objeto a objeto
// y se guarda una versión reducida en caché (se renueva cada 24 h).

let tsIndex = null, tsLoading = null;

async function buildThunderstoreIndex() {
  const res = await fetch("https://thunderstore.io/c/valheim/api/v1/package/");
  if (!res.ok) throw new Error("Thunderstore respondió " + res.status);
  const decoder = new TextDecoder();
  const out = [];
  let depth = 0, inStr = false, esc = false, cur = "";
  for await (const chunk of res.body) {
    const s = decoder.decode(chunk, { stream: true });
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (depth >= 1) cur += ch;
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true;
      else if (ch === "{" || ch === "[") { if (depth === 1 && ch === "{") cur = "{"; depth++; }
      else if (ch === "}" || ch === "]") {
        depth--;
        if (depth === 1 && ch === "}") {
          try {
            const p = JSON.parse(cur);
            const v = p.versions && p.versions[0];
            if (v && !p.is_deprecated) {
              out.push({
                full: p.full_name, owner: p.owner, name: p.name, url: p.package_url,
                desc: v.description, version: v.version_number, icon: v.icon, download: v.download_url,
                deps: v.dependencies || [], cats: p.categories || [], rating: p.rating_score || 0,
                downloads: p.versions.reduce((a, x) => a + (x.downloads || 0), 0), updated: p.date_updated,
              });
            }
          } catch {}
          cur = "";
        }
      }
    }
  }
  out.sort((a, b) => b.downloads - a.downloads);
  const index = { at: Date.now(), packages: out };
  await fsp.writeFile(TS_CACHE, JSON.stringify(index));
  return index;
}

async function getThunderstore() {
  if (tsIndex && Date.now() - tsIndex.at < 24 * 3600 * 1000) return tsIndex;
  if (!tsIndex) { try { tsIndex = JSON.parse(await fsp.readFile(TS_CACHE, "utf8")); } catch {} }
  if (tsIndex && Date.now() - tsIndex.at < 24 * 3600 * 1000) return tsIndex;
  if (!tsLoading) tsLoading = buildThunderstoreIndex().then((i) => (tsIndex = i)).finally(() => (tsLoading = null));
  if (tsIndex) return tsIndex; // se usa la caché vieja mientras se actualiza
  return tsLoading;
}

async function searchThunderstore(q, category) {
  const idx = await getThunderstore();
  const installed = new Set((await apiMods()).map((m) => m.folder));
  const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  const results = idx.packages.filter((p) => {
    if (p.name === "BepInExPack_Valheim") return false;
    if (category && !p.cats.includes(category)) return false;
    const hay = (p.name + " " + p.owner + " " + p.desc).toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const cats = {};
  for (const p of idx.packages) for (const c of p.cats) cats[c] = (cats[c] || 0) + 1;
  return {
    total: results.length,
    results: results.slice(0, 60).map((p) => ({ ...p, installed: installed.has(p.owner + "-" + p.name) })),
    categories: Object.keys(cats).sort(),
    cachedAt: idx.at,
  };
}

// Instala un paquete y sus dependencias (salvo BepInExPack, que ya trae la imagen)
async function installFromThunderstore(full, done = new Set()) {
  const idx = await getThunderstore();
  const [owner, name] = String(full).split("-");
  const key = owner + "-" + name;
  if (key === BEPINEX_PACK || done.has(key)) return [];
  done.add(key);
  const pkg = idx.packages.find((p) => p.owner === owner && p.name === name);
  if (!pkg) throw new Error("No se encontró " + key + " en Thunderstore");
  const installed = [];
  for (const dep of pkg.deps) installed.push(...(await installFromThunderstore(dep.split("-").slice(0, 2).join("-"), done)));
  await downloadAndInstall(key, owner, pkg.download, pkg.version, pkg.url);
  installed.push(key + " " + pkg.version);
  return installed;
}

async function downloadAndInstall(key, owner, downloadUrl, version, pageUrl) {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error("No se pudo descargar " + key);
  const tmp = path.join(os.tmpdir(), key + ".zip");
  await fsp.writeFile(tmp, Buffer.from(await res.arrayBuffer()));
  const dir = await unzipTo(tmp);
  try {
    await installExtracted(dir, key, { panel_owner: owner, panel_url: pageUrl, panel_source: "thunderstore", version_number: version });
  } finally {
    fsp.rm(dir, { recursive: true, force: true });
    fsp.rm(tmp, { force: true });
  }
}

// Igual que installFromThunderstore pero preguntando solo por ese paquete (no descarga el índice de ~170 MB)
async function installPackage(full, done = new Set()) {
  const [owner, name] = String(full).split("-");
  const key = owner + "-" + name;
  if (key === BEPINEX_PACK || done.has(key)) return [];
  done.add(key);
  const r = await fetch(`https://thunderstore.io/api/experimental/package/${owner}/${name}/`);
  if (!r.ok) throw new Error("Thunderstore respondió " + r.status);
  const p = await r.json(), v = p.latest || {};
  if (!v.download_url) throw new Error("No se encontró " + key + " en Thunderstore");
  const installed = [];
  for (const dep of v.dependencies || []) installed.push(...(await installPackage(dep.split("-").slice(0, 2).join("-"), done)));
  await downloadAndInstall(key, owner, v.download_url, v.version_number, p.package_url);
  installed.push(key + " " + v.version_number);
  return installed;
}

// ---------- mod RCON: instalación y configuración automáticas ----------
// Casi todo el panel (jugadores, mapa, kits, consola…) habla con el servidor por el mod ValheimRcon.
// Si falta, se instala desde Thunderstore; su .cfg se mantiene con RCON_PASSWORD y solo la red
// interna de Docker en la lista blanca. Si hubo que cambiar algo, el servidor se reinicia una vez
// para cargarlo, pero solo cuando está en línea, sin nadie conectado y el RCON aún no responde.

const RCON_MOD = "Tristan-ValheimRcon";
const RCON_CFG = path.join(CONFIG, "bepinex", "org.tristan.rcon.cfg");
const rconSetup = { busy: false, needsRestart: false };

async function ensureRcon() {
  if (!RCON_PASSWORD || rconSetup.busy) return;
  rconSetup.busy = true;
  try {
    if ((await readEnv()).BEPINEX !== "true") return;
    let changed = false;
    if (!(await exists(path.join(PLUGINS, RCON_MOD))) && !(await exists(path.join(PLUGINS_OFF, RCON_MOD)))) {
      console.log("Instalando el mod RCON:", (await installPackage(RCON_MOD)).join(", "));
      changed = true;
    }
    let text = null;
    try { text = await fsp.readFile(RCON_CFG, "utf8"); } catch {}
    if (text === null) {
      await fsp.mkdir(path.dirname(RCON_CFG), { recursive: true });
      await fsp.writeFile(RCON_CFG, `## Created by the Valheim panel (BepInEx adds the remaining options on first start)\n\n[1. Rcon]\n\nPort = ${RCON_PORT}\nPassword = ${RCON_PASSWORD}\nWhitelist IP mask = ${RCON_WHITELIST}\n`);
      changed = true;
    } else {
      const m = text.match(/^Password\s*=(.*)$/m);
      if (!m || m[1].trim() !== RCON_PASSWORD) {
        text = m ? text.replace(/^Password\s*=.*$/m, () => `Password = ${RCON_PASSWORD}`) : text.replace(/^\[1\. Rcon\][ \t]*$/m, (h) => `${h}\nPassword = ${RCON_PASSWORD}`);
        await fsp.writeFile(RCON_CFG, text);
        changed = true;
      }
    }
    if (changed) { console.log("Mod RCON preparado:", RCON_CFG); markModsChanged(); rconSetup.needsRestart = true; }
    if (rconSetup.needsRestart && state.phase === "en línea") {
      rconCheck.at = 0;
      const nobody = !Object.values(players).some((p) => p.online) && !state.activeCount;
      if (await rconAvailable()) rconSetup.needsRestart = false;
      else if (nobody) {
        rconSetup.needsRestart = false;
        state.events.push({ t: Date.now(), kind: "stop", text: "Mod RCON preparado: reiniciando el servidor para cargarlo" });
        await containerAction("restart");
      }
    }
  } catch (e) { console.error("No se pudo preparar el mod RCON:", e.message); }
  finally { rconSetup.busy = false; }
}
setTimeout(ensureRcon, 5000);
setInterval(ensureRcon, 60000);

// ---------- archivos de configuración de mods (.cfg) ----------

const CFG_DIR = path.join(CONFIG, "bepinex");

async function listCfg() {
  let entries = [];
  try { entries = await fsp.readdir(CFG_DIR); } catch {}
  return entries.filter((f) => /\.cfg$/i.test(f)).sort();
}

// ---------- copias de seguridad ----------

async function apiBackups() {
  let entries = [];
  try { entries = await fsp.readdir(BACKUPS); } catch {}
  const out = [];
  for (const f of entries) {
    if (!/\.zip$/i.test(f)) continue;
    const st = await fsp.stat(path.join(BACKUPS, f));
    out.push({ file: f, size: st.size, date: st.mtime, restorable: /^worlds-.*\.zip$/.test(f) });
  }
  return out.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function stamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function createBackup() {
  if (!(await exists(path.join(CONFIG, "worlds_local")))) throw new Error("Todavía no hay ningún mundo creado");
  await fsp.mkdir(BACKUPS, { recursive: true });
  const file = `worlds-${stamp()}.zip`;
  // Mismo formato que las copias automáticas de la imagen (rutas config/worlds_local/...)
  await run("zip", ["-r", "-q", path.join(BACKUPS, file), "config/worlds_local/", "-x", "*_backup_auto-*"], { cwd: "/" });
  return { ok: true, file };
}

async function waitStopped() {
  for (let i = 0; i < 150; i++) {
    const info = await inspect();
    if (!info || !info.State.Running) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function restoreBackup(file) {
  file = safeName(file);
  const zip = path.join(BACKUPS, file);
  const entries = (await run("unzip", ["-Z1", zip])).split("\n").filter(Boolean);
  if (!entries.length || !entries.every((e) => e.startsWith("config/worlds_local/"))) throw new Error("Esta copia no tiene el formato esperado");
  await containerAction("stop");
  await waitStopped();
  const current = path.join(CONFIG, "worlds_local");
  let saved = "";
  if (await exists(current)) {
    saved = `worlds_local.antes-de-restaurar-${stamp()}`;
    await fsp.rename(current, path.join(CONFIG, saved));
  }
  await run("unzip", ["-o", "-q", zip, "-d", "/"]);
  await containerAction("start");
  return { ok: true, saved };
}

// ---------- HTTP ----------

function readBody(req, limit = 300 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("Archivo demasiado grande")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function json(req) {
  const b = await readBody(req, 1024 * 1024);
  return b.length ? JSON.parse(b.toString()) : {};
}

const routes = {
  "GET /api/status": () => liveStatus(),
  "GET /api/players": () => livePlayers(),
  "POST /api/heal": async (req) => healPlayers(String((await json(req)).id)),
  "GET /api/places": async () => settings.places,
  "POST /api/places": async (req) => savePlaces(await json(req)),
  "GET /api/overview": () => apiOverview(),
  "POST /api/server": async (req) => containerAction((await json(req)).action),
  "POST /api/rcon": async (req) => {
    const cmd = String((await json(req)).cmd || "").trim();
    if (!cmd) throw new Error("Escribe un comando");
    const out = await rcon(cmd);
    rconCheck = { at: Date.now(), ok: true };
    return { ok: true, out };
  },
  "GET /api/logs": (req, url) => {
    const after = Number(url.searchParams.get("after") || 0);
    return { lines: state.lines.filter((l) => l.n > after), last: state.seq };
  },
  "GET /api/lists": async () => ({ admin: await readList("admin"), banned: await readList("banned"), permitted: await readList("permitted") }),
  "POST /api/lists": async (req) => {
    const b = await json(req);
    if (b.ids) return { ids: await writeList(b.type, b.ids) };
    return { ids: await listChange(b.type, b.id, b.add !== false) };
  },
  "GET /api/settings": () => apiGetSettings(),
  "POST /api/settings": async (req) => apiSaveSettings(await json(req)),
  "POST /api/settings/apply": () => applySettings(),
  "GET /api/mods": () => apiMods(),
  "POST /api/mods/toggle": async (req) => { const b = await json(req); const r = await toggleMod(b.folder, b.enable); markModsChanged(); return r; },
  "POST /api/mods/delete": async (req) => { const r = await deleteMod((await json(req)).folder); markModsChanged(); return r; },
  "POST /api/mods/upload": async (req, url) => { const r = await uploadMod(url.searchParams.get("name"), await readBody(req)); markModsChanged(); return r; },
  "POST /api/mods/install": async (req) => { const installed = await installFromThunderstore((await json(req)).full); markModsChanged(); return { ok: true, installed }; },
  "GET /api/thunderstore": (req, url) => searchThunderstore(url.searchParams.get("q"), url.searchParams.get("cat")),
  "GET /api/cfg": async () => listCfg(),
  "GET /api/cfg/file": async (req, url) => ({ text: await fsp.readFile(path.join(CFG_DIR, safeName(url.searchParams.get("name"))), "utf8") }),
  "POST /api/cfg/file": async (req) => {
    const b = await json(req);
    const name = safeName(b.name);
    if (!/\.cfg$/i.test(name)) throw new Error("Solo archivos .cfg");
    await fsp.writeFile(path.join(CFG_DIR, name), String(b.text));
    markModsChanged();
    return { ok: true };
  },
  "POST /api/teleport": async (req) => {
    const b = await json(req);
    if (b.id === "*") {
      // Traer a todos junto a un jugador
      const list = (await getRconPlayers()) || [];
      for (const p of list) if (p.id !== b.to?.player) await teleport(p.id, b.to);
      return { ok: true, out: `${Math.max(0, list.length - 1)} jugador(es) teletransportados` };
    }
    return { ok: true, out: await teleport(String(b.id), b.to) };
  },
  "POST /api/mapping": async (req) => {
    const b = await json(req);
    if (!Number.isFinite(+b.x) || !Number.isFinite(+b.z)) throw new Error("Punto no válido");
    return { ok: true, out: await rcon(`ping ${(+b.x).toFixed(1)} 30 ${(+b.z).toFixed(1)}`) };
  },
  "GET /api/kits": async () => settings.kits,
  "POST /api/kits": async (req) => {
    const kits = await json(req);
    if (!Array.isArray(kits)) throw new Error("Formato no válido");
    settings.kits = kits.slice(0, 30).map((k) => ({
      name: String(k.name || "Kit").slice(0, 40),
      items: (k.items || []).filter(([p]) => PREFAB_RE.test(p)).slice(0, 40).map(([p, c]) => [p, n(c, 1, 9999, 1)]),
    }));
    await saveSettings();
    return { ok: true };
  },
  "POST /api/kits/give": async (req) => { const b = await json(req); return giveKit(b.kit, String(b.id)); },
  "GET /api/chests": async (req, url) => nearbyChests(url.searchParams.get("id")),
  "GET /api/chest": async (req, url) => showChest(url.searchParams.get("oid")),
  "POST /api/chest/add": async (req) => {
    const b = await json(req);
    if (!OBJ_RE.test(b.oid) || !PREFAB_RE.test(b.item)) throw new Error("Datos no válidos");
    return { ok: true, out: await rcon(`addItemToContainer ${b.oid} ${b.item} -count ${n(b.count, 1, 9999, 1)}`) };
  },
  "POST /api/chest/remove": async (req) => {
    const b = await json(req);
    if (!OBJ_RE.test(b.oid)) throw new Error("Cofre no válido");
    return { ok: true, out: await rcon(`removeItemFromContainer ${b.oid} -index ${n(b.index, 0, 999, 0)}`) };
  },
  "GET /api/drops": async (req, url) => nearbyDrops(url.searchParams.get("id"), url.searchParams.get("r")),
  "POST /api/drops/delete": async (req) => { const b = await json(req); return deleteDrops(String(b.id), b.r, b.prefabs); },
  "GET /api/world": async () => worldInfo(),
  "POST /api/boss": async (req) => {
    const b = await json(req);
    if (!BOSS_KEYS.includes(b.key)) throw new Error("Jefe no válido");
    return { ok: true, out: await rcon(`${b.done ? "addGlobalKey" : "removeGlobalKey"} ${b.key}`) };
  },
  "POST /api/event": async (req) => { const b = await json(req); return { ok: true, out: await startEvent(String(b.name), String(b.id)) }; },
  "POST /api/event/stop": async () => ({ ok: true, out: await rcon("stopEvent") }),
  "POST /api/spawn": async (req) => { const b = await json(req); return { ok: true, out: await spawnNear(String(b.prefab), String(b.id), b.count, b.level, !!b.tamed) }; },
  "GET /api/messages": async () => ({ schedules: settings.schedules, welcome: settings.welcome }),
  "POST /api/messages": async (req) => {
    const b = await json(req);
    settings.welcome = cleanMsg(b.welcome);
    settings.schedules = (b.schedules || []).slice(0, 20).filter((s) => cleanMsg(s.text))
      .map((s) => ({ text: cleanMsg(s.text), everyMin: n(s.everyMin, 1, 1440, 60), mode: s.mode === "say" ? "say" : "showMessage", last: Date.now() }));
    await saveSettings();
    return { ok: true };
  },
  "POST /api/restart-warn": async (req) => restartWithWarning((await json(req)).minutes),
  "POST /api/restart-cancel": async () => cancelRestart(),
  "GET /api/history": async () => history,
  "POST /api/immortal": async (req) => { const b = await json(req); return setImmortal(b.id, !!b.enabled); },
  "POST /api/autorecover": async (req) => { settings.autoRecover = !!(await json(req)).enabled; await saveSettings(); return { ok: true }; },
  "GET /api/backups": () => apiBackups(),
  "POST /api/backups/create": () => createBackup(),
  "POST /api/backups/restore": async (req) => restoreBackup((await json(req)).file),
  "POST /api/backups/delete": async (req) => { await fsp.rm(path.join(BACKUPS, safeName((await json(req)).file))); return { ok: true }; },
};

// ---------- contraseña del panel ----------
// Si PANEL_PASSWORD está vacía no se pide (como antes). Las sesiones duran 30 días y sobreviven a reinicios.

const crypto = require("crypto");
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "";
const SESSION_DAYS = 30;
if (!Array.isArray(settings.sessions)) settings.sessions = []; // [{ hash, exp }]
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");
const loginFails = {}; // ip -> [horas de fallos]
const sessionToken = (req) => ((req.headers.cookie || "").match(/(?:^|;\s*)vhs=([a-f0-9]{64})/) || [])[1];

function hasSession(req) {
  if (!PANEL_PASSWORD) return true;
  const t = sessionToken(req);
  if (!t) return false;
  const h = hashToken(t);
  return settings.sessions.some((s) => s.hash === h && s.exp > Date.now());
}

async function login(req, res) {
  const ip = req.socket.remoteAddress || "";
  const fails = (loginFails[ip] = (loginFails[ip] || []).filter((t) => Date.now() - t < 60000));
  if (fails.length >= 5) { res.statusCode = 429; return res.end(JSON.stringify({ error: tr(req, "Demasiados intentos. Espera un minuto.") })); }
  const { password } = await json(req).catch(() => ({}));
  const a = Buffer.from(String(password || "")), b = Buffer.from(PANEL_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    fails.push(Date.now());
    res.statusCode = 401; return res.end(JSON.stringify({ error: tr(req, "Contraseña incorrecta") }));
  }
  const token = crypto.randomBytes(32).toString("hex");
  settings.sessions = settings.sessions.filter((s) => s.exp > Date.now()).slice(-20);
  settings.sessions.push({ hash: hashToken(token), exp: Date.now() + SESSION_DAYS * 86400000 });
  await saveSettings();
  res.setHeader("Set-Cookie", `vhs=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}`);
  res.end(JSON.stringify({ ok: true }));
}

// Idioma de la petición: el elegido en el panel (cookie) o, si no, el del navegador
function reqLang(req) {
  const c = ((req.headers.cookie || "").match(/(?:^|;\s*)vhlang=(es|en)/) || [])[1];
  return c || (/^es\b/i.test(req.headers["accept-language"] || "") ? "es" : "en");
}
const tr = (req, s) => I18N.translate(s, reqLang(req));

const loginPage = (lang) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${I18N.translate("Panel Valheim", lang)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#14161b;color:#e9e7e2;font:15px system-ui,"Segoe UI",sans-serif;padding:16px;box-sizing:border-box}
form{background:#1e2128;border:1px solid #30343e;border-radius:12px;padding:24px;width:100%;max-width:340px}h1{font-size:20px;margin:0 0 16px}h1 span{color:#d9a441}
input,button{width:100%;box-sizing:border-box;padding:12px;border-radius:8px;font:inherit}input{background:#14161b;color:#e9e7e2;border:1px solid #30343e;margin-bottom:12px}
button{border:0;background:#d9a441;color:#1a1a1a;font-weight:700;cursor:pointer}#e{color:#ff8a80;font-size:14px;min-height:20px;margin-top:10px}
#l{margin-top:8px;text-align:right;font-size:13px}#l a{color:#9aa0ab;margin-left:8px;cursor:pointer}#l a.on{color:#d9a441;font-weight:700}</style></head>
<body><form id="f"><h1>⚔️ Panel <span>Valheim</span></h1><input type="password" id="p" placeholder="${I18N.translate("Contraseña del panel", lang)}" autofocus autocomplete="current-password"><button>${I18N.translate("Entrar", lang)}</button><div id="e"></div>
<div id="l">🌐<a data-l="es" class="${lang === "es" ? "on" : ""}">ES</a><a data-l="en" class="${lang === "en" ? "on" : ""}">EN</a></div></form>
<script>document.getElementById("f").onsubmit=async(ev)=>{ev.preventDefault();const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:document.getElementById("p").value})});
if(r.ok)location.reload();else document.getElementById("e").textContent=(await r.json().catch(()=>({}))).error||"Error";};
document.querySelectorAll("#l a").forEach((a)=>a.onclick=()=>{try{localStorage.setItem("vhLang",a.dataset.l)}catch(e){}document.cookie="vhlang="+a.dataset.l+"; Path=/; Max-Age=31536000; SameSite=Strict";location.reload();});</script></body></html>`;

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/api/login") { res.setHeader("Content-Type", "application/json"); return login(req, res); }
    if (!hasSession(req)) {
      if (url.pathname.startsWith("/api/")) { res.statusCode = 401; res.setHeader("Content-Type", "application/json"); return res.end(JSON.stringify({ error: tr(req, "Inicia sesión") })); }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.end(loginPage(reqLang(req)));
    }
    if (req.method === "POST" && url.pathname === "/api/logout") {
      const t = sessionToken(req);
      if (t) { settings.sessions = settings.sessions.filter((s) => s.hash !== hashToken(t)); await saveSettings(); }
      res.setHeader("Set-Cookie", "vhs=; Path=/; Max-Age=0");
      return res.end("{}");
    }
    if (req.method === "GET" && url.pathname === "/api/backups/download") {
      try {
        const name = safeName(url.searchParams.get("file"));
        const file = path.join(BACKUPS, name);
        await fsp.access(file);
        res.writeHead(200, { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${name}"` });
        return fs.createReadStream(file).pipe(res);
      } catch { res.writeHead(404); return res.end("No encontrado"); }
    }
    if (req.method === "GET" && url.pathname === "/api/live") return openLive(req, res);
    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) {
      res.setHeader("Content-Type", "application/json");
      try {
        res.end(JSON.stringify(await handler(req, url)));
        if (req.method === "POST") { overviewCache.at = 0; setTimeout(() => refreshLive(true), 400); }
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: tr(req, e.message) }));
      }
      return;
    }
    if (["/items.js", "/extra.js", "/i18n.js"].includes(url.pathname)) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      return fs.createReadStream(path.join(__dirname, url.pathname.slice(1))).pipe(res);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  })
  .listen(PORT, () => console.log(`Panel de Valheim en http://localhost:${PORT}`));
