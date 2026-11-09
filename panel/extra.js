// Funciones nuevas del panel: mapa, teletransporte, kits, cofres, buscador de objetos, mundo
// (jefes, eventos, criaturas, limpieza), avisos y gráficas. Usa los ayudantes de index.html
// ($, $$, api, say, esc, fmtDur, confirmClick, lastStatus, loadPlayers).

// En inglés los nombres salen del nombre interno del juego (FineWood -> Fine Wood); en español, del catálogo
if (I18N.lang === "en") {
  for (const list of [VH.items, VH.creatures]) for (const i of list) i.name = I18N.humanize(i.prefab);
  for (const b of VH.bosses) b.name = t(b.name); // El Anciano -> The Elder…
}
const ITEM_NAME = Object.fromEntries(VH.items.map((i) => [i.prefab, i.name]));
const itemLabel = (prefab) => ITEM_NAME[prefab] ? `${ITEM_NAME[prefab]} (${prefab})` : prefab;
const EVENT_NAMES = {
  army_eikthyr: "Ejército de Eikthyr (jabalíes y ciervos)", army_theelder: "Ejército del Anciano (greydwarfs)", army_bonemass: "Ejército de Bonemass (draugr)",
  army_moder: "Ejército de Moder (dracos)", army_goblin: "Horda fuling", army_gjall: "Gjall", army_seekers: "Buscadores", army_charred: "Ejército carbonizado",
  army_charredspawners: "Carbonizados con invocadores", army_elakingar: "Elakingar", army_jotuns: "Jötnar",
  wolves: "Manada de lobos", skeletons: "Esqueletos", blobs: "Légamos", foresttrolls: "Trolls del bosque", surtlings: "Surtlings", ghosts: "Fantasmas", bats: "Murciélagos",
  fimbulvinter: "Fimbulvinter (helada)", gemgoblin: "Fuling de gemas",
  boss_eikthyr: "Jefe: Eikthyr", boss_gdking: "Jefe: el Anciano", boss_bonemass: "Jefe: Bonemass", boss_moder: "Jefe: Moder", boss_goblinking: "Jefe: Yagluth",
  boss_queen: "Jefe: la Reina", boss_fader: "Jefe: Fader", boss_frozenking: "Jefe: rey helado", hildirboss1: "Hildir: Brenna", hildirboss2: "Hildir: Geirrhafa", hildirboss3: "Hildir: Zil y Thungr",
};
const BOSS_NAMES = { defeated_eikthyr: "🦌 Eikthyr", defeated_gdking: "🌳 El Anciano", defeated_bonemass: "🦴 Bonemass", defeated_dragon: "🐉 Moder",
  defeated_goblinking: "💀 Yagluth", defeated_queen: "🐜 La Reina", defeated_fader: "🔥 Fader" };

// ---------- jugadores conectados (compartido por todas las pestañas nuevas) ----------
// Llegan en directo desde index.html (onPlayersLoaded), no hace falta preguntar.
let online = [];
async function refreshOnline() {
  if (!lastPlayers) try { lastPlayers = await api("/api/players"); } catch {}
  online = lastPlayers ? lastPlayers.online : [];
  fillWho();
  return online;
}
window.onPlayersLoaded = (p) => {
  online = p.online; fillWho();
  if (!$("#tab-mapa").hidden) { drawMap(); renderMapSide(); }
};
window.onStatus = () => updateRestartUi();
function fillWho() {
  for (const id of ["kitWho", "chestWho", "eventWho", "spawnWho", "dropWho", "bringTo"]) {
    const sel = $("#" + id), cur = sel.value;
    const opts = (id === "kitWho" ? [["*", "👥 Todos los conectados"]] : []).concat(online.map((p) => [p.id, p.name || p.id]));
    const html = opts.length ? opts.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("") : `<option value="">(nadie conectado)</option>`;
    if (sel.dataset.html !== html) { sel.innerHTML = html; sel.dataset.html = html; }
    if (opts.some(([v]) => v === cur)) sel.value = cur;
  }
}
const nameOf = (id) => (online.find((p) => p.id === id) || {}).name || id;
const playerOf = (id) => online.find((p) => p.id === id);

// ---------- lugares guardados ----------
let places = [];
async function loadPlaces() { try { places = await api("/api/places"); } catch {} renderMapSide(); }
async function addPlace(name, pt) {
  places.push({ name, x: pt.x, y: pt.y ?? null, z: pt.z });
  try { places = await api("/api/places", places); say(`Lugar «${name}» guardado.`, "ok"); } catch (err) { places.pop(); say(err.message, "err"); }
  renderMapSide(); drawMap();
}

// ---------- buscador de objetos ----------
$("#itemList").innerHTML = VH.items.map((i) => `<option value="${esc(i.prefab)}">${esc(i.name)}</option>`).join("");
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
$("#itemSearch").addEventListener("input", (e) => {
  const q = norm(e.target.value.trim());
  const list = q ? VH.items.filter((i) => norm(i.name).includes(q) || norm(i.prefab).includes(q) || norm(i.cat).includes(q) || norm(t(i.cat)).includes(q)).slice(0, 80) : [];
  $("#itemResults").innerHTML = list.map((i) => `<div class="item"><span><b style="font-family:system-ui">${esc(i.name)}</b> <span class="muted">${esc(i.prefab)} · ${esc(t(i.cat))}</span></span><button class="small" data-copyitem="${esc(i.prefab)}">Copiar nombre</button></div>`).join("")
    || (q ? `<div class="muted">Nada encontrado. Lista completa (en inglés): <a href="https://valheim-modding.github.io/Jotunn/data/objects/item-list.html" target="_blank" style="color:var(--blue)">item list ↗</a></div>` : "");
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-copyitem]");
  if (b) navigator.clipboard.writeText(b.dataset.copyitem).then(() => say("Copiado: " + b.dataset.copyitem, "ok"));
});

// ---------- acciones de cada tarjeta de jugador (teletransporte, kit, curar) ----------
// El menú se abre dentro de la tarjeta del jugador (en su .pslot)
function openAct(html, btn) {
  const box = $("#actBox"), slot = btn && btn.closest(".pcard")?.querySelector(".pslot");
  $("#giveBox").hidden = true;
  if (slot) slot.appendChild(box);
  box.innerHTML = html; box.hidden = false; box.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
const placeBtn = (id, p, i) => `<button class="small" data-tpplace="${i}" data-id="${esc(id)}">⭐ ${esc(p.name)}</button>`;
document.addEventListener("click", async (e) => {
  const tp = e.target.closest("[data-tpmenu]"), kit = e.target.closest("[data-kitmenu]");
  if (tp && !tp.disabled) {
    const id = tp.dataset.tpmenu, me = playerOf(id) || {}, others = online.filter((p) => p.id !== id);
    openAct(`<b>📍 ¿A dónde llevar a ${esc(nameOf(id))}?</b>
      <div class="muted" style="font-size:12px;margin-top:8px">Junto a un jugador</div>
      <div class="btns" style="margin-top:4px">
        ${others.map((p) => `<button class="small info" data-tp="${esc(id)}" data-to="${esc(p.id)}">Junto a ${esc(p.name)}</button>`).join("") || '<span class="muted">No hay más jugadores conectados.</span>'}
        ${online.length > 1 ? `<button class="small warn" data-tp="*" data-to="${esc(id)}">👥 Traer a todos junto a ${esc(nameOf(id))}</button>` : ""}
      </div>
      <div class="muted" style="font-size:12px;margin-top:8px">A un lugar</div>
      <div class="btns" style="margin-top:4px">
        <button class="small" data-tppoint="${esc(id)}" data-x="0" data-z="0">🏛️ Al centro del mundo</button>
        ${me.deathPos ? `<button class="small" data-tppoint="${esc(id)}" data-x="${me.deathPos.x}" data-y="${me.deathPos.y}" data-z="${me.deathPos.z}">🪦 Donde murió (${fmtDur(Date.now() - me.deathPos.t)})</button>` : ""}
        ${places.map((p, i) => placeBtn(id, p, i)).join("")}
        <button class="small" data-gomap="${esc(id)}">🗺️ Elegir en el mapa</button>
      </div>
      <div class="btns" style="margin-top:10px">
        ${me.pos ? `<button class="small gold" data-saveplace="${esc(id)}">⭐ Guardar dónde está ahora como lugar</button>` : ""}
        <button class="small" data-closeact>Cerrar</button>
      </div>`, tp);
  }
  if (kit && !kit.disabled) {
    const kits = await api("/api/kits");
    openAct(`<b>🎒 Dar kit a ${esc(nameOf(kit.dataset.kitmenu))}</b>
      <div class="btns" style="margin-top:8px">${kits.map((k, i) => `<button class="small on" data-givekit="${i}" data-to="${esc(kit.dataset.kitmenu)}">${esc(k.name)}</button>`).join("")}
      <button class="small" data-closeact>Cerrar</button></div><p class="note">Los kits se editan en la pestaña 🎁 Objetos.</p>`, kit);
  }
  if (e.target.closest("[data-closeact]")) $("#actBox").hidden = true;
  const t = e.target.closest("[data-tp]");
  if (t) {
    try { const r = await api("/api/teleport", { id: t.dataset.tp, to: { player: t.dataset.to } }); say(r.out, "ok"); $("#actBox").hidden = true; }
    catch (err) { say(err.message, "err"); }
  }
  const tpp = e.target.closest("[data-tppoint], [data-tpplace]");
  if (tpp) {
    const pl = tpp.dataset.tpplace !== undefined ? places[+tpp.dataset.tpplace] : { x: +tpp.dataset.x, y: tpp.dataset.y !== undefined ? +tpp.dataset.y : null, z: +tpp.dataset.z };
    try { const r = await api("/api/teleport", { id: tpp.dataset.tppoint || tpp.dataset.id, to: pl }); say(r.out + "\nTarda unos segundos en llegar.", "ok"); $("#actBox").hidden = true; }
    catch (err) { say(err.message, "err"); }
  }
  const sp = e.target.closest("[data-saveplace]");
  if (sp) {
    const me = playerOf(sp.dataset.saveplace);
    const name = me && prompt(t("Nombre del lugar (ej: Base, Portal del pantano):"), t("Base de {a}", { a: me.name }));
    if (name) { await addPlace(name.trim(), me.pos); $("#actBox").hidden = true; }
  }
  const h = e.target.closest("[data-heal]");
  if (h && !h.disabled) {
    try { say((await api("/api/heal", { id: h.dataset.heal })).out, "ok"); } catch (err) { say(err.message, "err"); }
  }
  const g = e.target.closest("[data-givekit]");
  if (g) {
    try { const r = await api("/api/kits/give", { kit: +g.dataset.givekit, id: g.dataset.to }); say(r.out, "ok"); }
    catch (err) { say(err.message, "err"); }
  }
  const gm = e.target.closest("[data-gomap]");
  if (gm) { mapSelected = gm.dataset.gomap; $("#actBox").hidden = true; $('#tabs button[data-tab="mapa"]').click(); say(`Pulsa en el mapa el punto al que llevar a ${nameOf(mapSelected)}.`); }
});

// ---------- «Para todos los conectados» ----------
$("#healAll").addEventListener("click", async () => {
  try { say((await api("/api/heal", { id: "*" })).out, "ok"); } catch (err) { say(err.message, "err"); }
});
$("#bringAll").addEventListener("click", async (e) => {
  const to = $("#bringTo").value;
  if (!to) return say("No hay nadie conectado.", "err");
  if (!confirmClick(e.target)) return;
  try { say((await api("/api/teleport", { id: "*", to: { player: to } })).out, "ok"); } catch (err) { say(err.message, "err"); }
});
$("#kitAll").addEventListener("click", async () => {
  if (!online.length) return say("No hay nadie conectado.", "err");
  try { say((await api("/api/kits/give", { kit: +$("#kitAllSel").value, id: "*" })).out, "ok"); } catch (err) { say(err.message, "err"); }
});
async function sendAllMsg() {
  const text = $("#allMsg").value.replace(/[\r\n"]+/g, " ").trim();
  if (!text) return say("Escribe el aviso primero.", "err");
  try { await api("/api/rcon", { cmd: `${$("#allMsgMode").value} ${text}` }); say("Aviso enviado.", "ok"); $("#allMsg").value = ""; } catch (err) { say(err.message, "err"); }
}
$("#allMsgSend").addEventListener("click", sendAllMsg);
$("#allMsg").addEventListener("keydown", (e) => { if (e.key === "Enter") sendAllMsg(); });

// ---------- mapa ----------
const WORLD_R = 10500;
const cv = $("#mapCanvas"), ctx = cv.getContext("2d");
let view = { cx: 0, cz: 0, scale: 0 }, mapSelected = null, mapClick = null, drag = null;
function mapSize() {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  return { w: cv.width, h: cv.height, dpr };
}
const toScreen = (x, z) => { const { w, h } = mapSize(); return [w / 2 + (x - view.cx) * view.scale, h / 2 - (z - view.cz) * view.scale]; };
const toWorld = (px, py) => { const { w, h } = mapSize(); return [view.cx + (px - w / 2) / view.scale, view.cz - (py - h / 2) / view.scale]; };
function mapFit() { const { w, h } = mapSize(); view = { cx: 0, cz: 0, scale: Math.min(w, h) / (2 * WORLD_R * 1.02) }; drawMap(); }
function mapFollow() {
  if (!online.length || !online[0].pos) return mapFit();
  const xs = online.map((p) => p.pos.x), zs = online.map((p) => p.pos.z);
  const { w, h } = mapSize(), span = Math.max(400, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.5;
  view = { cx: (Math.max(...xs) + Math.min(...xs)) / 2, cz: (Math.max(...zs) + Math.min(...zs)) / 2, scale: Math.min(w, h) / span };
  drawMap();
}
function drawMap() {
  const { w, h, dpr } = mapSize();
  if (!view.scale) { view.scale = Math.min(w, h) / (2 * WORLD_R * 1.02); }
  ctx.fillStyle = "#0f1a24"; ctx.fillRect(0, 0, w, h);
  // Mundo
  const [ox, oy] = toScreen(0, 0);
  ctx.beginPath(); ctx.arc(ox, oy, 10000 * view.scale, 0, Math.PI * 2); ctx.fillStyle = "#1c2a22"; ctx.fill();
  ctx.strokeStyle = "#3d5a46"; ctx.lineWidth = 2 * dpr; ctx.stroke();
  // Cuadrícula: 1 km, o 100 m si hay mucho zoom
  const step = view.scale * 1000 > 400 ? 100 : 1000;
  ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.font = `${11 * dpr}px system-ui`;
  const [x0, z1] = toWorld(0, 0), [x1, z0] = toWorld(w, h);
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const [px] = toScreen(x, 0); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke(); if (x % 1000 === 0) ctx.fillText(x / 1000 + " km", px + 3, 12 * dpr); }
  for (let z = Math.ceil(z0 / step) * step; z <= z1; z += step) { const [, py] = toScreen(0, z); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke(); if (z % 1000 === 0) ctx.fillText(z / 1000 + " km", 3, py - 3); }
  // Centro y norte
  ctx.fillStyle = "#d9a441"; ctx.beginPath(); ctx.arc(ox, oy, 4 * dpr, 0, Math.PI * 2); ctx.fill();
  ctx.fillText(t("Centro"), ox + 6 * dpr, oy - 6 * dpr);
  ctx.fillStyle = "#e9e7e2"; ctx.font = `bold ${13 * dpr}px system-ui`; ctx.fillText("N ↑", w - 34 * dpr, 18 * dpr);
  // Lugares guardados
  ctx.font = `${12 * dpr}px system-ui`;
  for (const p of places) {
    const [px, py] = toScreen(p.x, p.z);
    ctx.fillStyle = "#d9a441"; ctx.fillText("⭐", px - 7 * dpr, py + 5 * dpr);
    ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillText(p.name, px + 9 * dpr, py + 4 * dpr);
  }
  // Punto elegido
  if (mapClick) { const [px, py] = toScreen(mapClick.x, mapClick.z); ctx.strokeStyle = "#4a86d8"; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(px, py, 8 * dpr, 0, Math.PI * 2); ctx.stroke(); }
  // Jugadores
  for (const p of online) {
    if (!p.pos) continue;
    const [px, py] = toScreen(p.pos.x, p.pos.z);
    ctx.beginPath(); ctx.arc(px, py, 6 * dpr, 0, Math.PI * 2); ctx.fillStyle = p.id === mapSelected ? "#d9a441" : "#4caf62"; ctx.fill();
    ctx.lineWidth = 2 * dpr; ctx.strokeStyle = "#fff"; ctx.stroke();
    ctx.font = `bold ${12 * dpr}px system-ui`; ctx.fillStyle = "#fff"; ctx.fillText(p.name || p.id, px + 9 * dpr, py + 4 * dpr);
  }
}
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  const { dpr } = mapSize(), r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * dpr, py = (e.clientY - r.top) * dpr;
  const [wx, wz] = toWorld(px, py);
  view.scale *= e.deltaY < 0 ? 1.25 : 0.8;
  const [nx, nz] = toWorld(px, py);
  view.cx += wx - nx; view.cz += wz - nz; drawMap();
}, { passive: false });
cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, cx: view.cx, cz: view.cz, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => {
  const { dpr } = mapSize(), r = cv.getBoundingClientRect();
  const [wx, wz] = toWorld((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
  $("#mapCoords").textContent = `x ${Math.round(wx)} · z ${Math.round(wz)} (${(Math.hypot(wx, wz) / 1000).toFixed(1)} km del centro)`;
  if (!drag) return;
  const dx = (e.clientX - drag.x) * dpr, dy = (e.clientY - drag.y) * dpr;
  if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
  view.cx = drag.cx - dx / view.scale; view.cz = drag.cz + dy / view.scale; drawMap();
});
cv.addEventListener("pointerup", (e) => {
  const d = drag; drag = null;
  if (!d || d.moved) return;
  const { dpr } = mapSize(), r = cv.getBoundingClientRect();
  const [x, z] = toWorld((e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr);
  mapClick = { x, z }; drawMap();
  const inside = Math.hypot(x, z) <= 10400;
  const who = mapSelected ? online.filter((p) => p.id === mapSelected) : online;
  const box = $("#mapMenu"); box.hidden = false;
  box.innerHTML = `<b>Punto x ${Math.round(x)} · z ${Math.round(z)}</b>${inside ? "" : ' <span class="tag off">fuera del mundo</span>'}
    <div class="btns" style="margin-top:8px">
      <button class="small info" data-mapping ${inside ? "" : "disabled"}>📍 Marcar aquí en el mapa de todos</button>
      ${who.map((p) => `<button class="small warn" data-tpmap="${esc(p.id)}" ${inside ? "" : "disabled"}>Llevar a ${esc(p.name)} aquí</button>`).join("")}
      <button class="small gold" data-mapsave ${inside ? "" : "disabled"}>⭐ Guardar como lugar</button>
      ${mapSelected ? `<button class="small" data-mapall>Ver a todos</button>` : ""}
    </div>
    <p class="note">Al teletransportar a un punto del mapa el juego busca el suelo solo; tarda unos segundos en colocarlo (en el mar, aparece nadando).</p>`;
});
// Lista junto al mapa: jugadores (pulsar = elegir y centrar) y lugares guardados
function renderMapSide() {
  const pl = online.map((p) => `<div class="item ${p.id === mapSelected ? "sel" : ""}" data-mapsel="${esc(p.id)}"><span>🟢 <b>${esc(p.name || p.id)}</b></span><span class="muted">${p.maxHp ? "❤️ " + Math.round(p.hp) : ""}</span></div>`).join("")
    || '<div class="muted">Nadie conectado.</div>';
  const pc = places.map((p, i) => `<div class="item" data-mapgo="${i}"><span>⭐ ${esc(p.name)}</span><button class="small off" data-placedel="${i}" title="Borrar">🗑</button></div>`).join("")
    || '<div class="muted" style="font-size:13px">Aún no hay. Pulsa un punto del mapa → «Guardar como lugar».</div>';
  setHTML($("#mapPlayers"), pl); setHTML($("#mapPlaces"), pc);
}
function centerOn(x, z) { const { w, h } = mapSize(); view.cx = x; view.cz = z; view.scale = Math.max(view.scale, Math.min(w, h) / 1500); drawMap(); }
document.addEventListener("click", async (e) => {
  const sel = e.target.closest("[data-mapsel]");
  if (sel) {
    mapSelected = mapSelected === sel.dataset.mapsel ? null : sel.dataset.mapsel;
    const p = playerOf(mapSelected);
    if (p && p.pos) centerOn(p.pos.x, p.pos.z); else drawMap();
    renderMapSide();
    if (mapSelected) say(`${nameOf(mapSelected)} elegido: pulsa un punto del mapa para llevarlo allí.`);
  }
  const del = e.target.closest("[data-placedel]");
  if (del) {
    e.stopPropagation();
    if (!confirmClick(del)) return;
    const keep = places.filter((_, i) => i !== +del.dataset.placedel);
    try { places = await api("/api/places", keep); renderMapSide(); drawMap(); } catch (err) { say(err.message, "err"); }
    return;
  }
  const go = e.target.closest("[data-mapgo]");
  if (go) { const p = places[+go.dataset.mapgo]; mapClick = { x: p.x, z: p.z }; centerOn(p.x, p.z); }
  if (e.target.closest("[data-mapsave]") && mapClick) {
    const name = prompt(t("Nombre del lugar (ej: Base, Portal del pantano):"), t("Lugar {a}", { a: places.length + 1 }));
    if (name) addPlace(name.trim(), { x: mapClick.x, y: null, z: mapClick.z });
  }
  if (e.target.closest("[data-mapall]")) { mapSelected = null; $("#mapMenu").hidden = true; drawMap(); renderMapSide(); }
  if (e.target.closest("[data-mapping]") && mapClick) {
    try { await api("/api/mapping", mapClick); say("Punto marcado en el mapa de todos los jugadores.", "ok"); } catch (err) { say(err.message, "err"); }
  }
  const t = e.target.closest("[data-tpmap]");
  if (t && mapClick) {
    try { const r = await api("/api/teleport", { id: t.dataset.tpmap, to: mapClick }); say(r.out + "\nTarda unos segundos en llegar.", "ok"); mapSelected = null; $("#mapMenu").hidden = true; renderMapSide(); }
    catch (err) { say(err.message, "err"); }
  }
});
$("#mapZoomIn").addEventListener("click", () => { view.scale *= 1.5; drawMap(); });
$("#mapZoomOut").addEventListener("click", () => { view.scale /= 1.5; drawMap(); });
$("#mapFit").addEventListener("click", mapFit);
$("#mapFollow").addEventListener("click", mapFollow);
window.addEventListener("resize", () => { if (!$("#tab-mapa").hidden) drawMap(); });
let mapFirst = true;
async function loadMap() {
  await refreshOnline();
  if (mapFirst) { mapFirst = false; online.length ? mapFollow() : mapFit(); } else drawMap();
  renderMapSide();
  try {
    const o = await api("/api/overview");
    $("#seedText").textContent = o.seed || "desconocida";
    if (o.seed) { $("#seedLink").href = "https://valheim-map.world/?seed=" + encodeURIComponent(o.seed); $("#seedLink").hidden = false; }
  } catch {}
}

// ---------- kits ----------
let kits = [], kitEditing = -1;
async function loadKits() {
  kits = await api("/api/kits");
  const ks = $("#kitAllSel"), cur = ks.value;
  ks.innerHTML = kits.map((k, i) => `<option value="${i}">${esc(k.name)}</option>`).join("");
  if (cur && kits[+cur]) ks.value = cur;
  $("#kitList").innerHTML = kits.map((k, i) => `<div class="item" style="font-family:system-ui"><span><b>${esc(k.name)}</b> <span class="muted">${k.items.map(([p, c]) => `${c}× ${esc(ITEM_NAME[p] || p)}`).join(", ")}</span></span>
    <span class="btns"><button class="small on" data-kitgive="${i}">Dar</button><button class="small" data-kitedit="${i}">✏️</button></span></div>`).join("") || '<div class="muted">No hay kits.</div>';
}
function editKit(i) {
  kitEditing = i;
  const k = kits[i] || { name: "Nuevo kit", items: [] };
  $("#kitName").value = k.name; $("#kitItems").value = k.items.map(([p, c]) => `${p} ${c}`).join("\n");
  $("#kitDelete").hidden = i < 0; $("#kitEditor").hidden = false;
}
document.addEventListener("click", async (e) => {
  const g = e.target.closest("[data-kitgive]"), ed = e.target.closest("[data-kitedit]");
  if (g) {
    const id = $("#kitWho").value;
    if (!id) return say("No hay nadie conectado.", "err");
    try { say((await api("/api/kits/give", { kit: +g.dataset.kitgive, id })).out, "ok"); } catch (err) { say(err.message, "err"); }
  }
  if (ed) editKit(+ed.dataset.kitedit);
});
$("#kitNew").addEventListener("click", () => editKit(-1));
$("#kitCancel").addEventListener("click", () => ($("#kitEditor").hidden = true));
async function saveKits() { await api("/api/kits", kits); $("#kitEditor").hidden = true; loadKits(); }
$("#kitSave").addEventListener("click", async () => {
  const items = [], bad = [];
  for (const line of $("#kitItems").value.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = line.match(/^([\w-]+)\s*[x×]?\s*(\d+)?$/i);
    if (m) items.push([m[1], +(m[2] || 1)]); else bad.push(line);
  }
  if (bad.length) return say("No entiendo estas líneas: " + bad.join(", ") + "\nFormato: Objeto cantidad (ej. Wood 50)", "err");
  const unknown = items.filter(([p]) => !ITEM_NAME[p]).map(([p]) => p);
  const kit = { name: $("#kitName").value.trim() || "Kit", items };
  if (kitEditing < 0) kits.push(kit); else kits[kitEditing] = kit;
  try { await saveKits(); say("Kit guardado." + (unknown.length ? "\nAviso: no conozco " + unknown.join(", ") + " (si el nombre es correcto, funcionará igual)." : ""), "ok"); } catch (err) { say(err.message, "err"); }
});
$("#kitDelete").addEventListener("click", async (e) => {
  if (!confirmClick(e.target)) return;
  kits.splice(kitEditing, 1);
  try { await saveKits(); say("Kit borrado.", "ok"); } catch (err) { say(err.message, "err"); }
});

// ---------- cofres ----------
let chestOpen = null;
$("#chestFind").addEventListener("click", async () => {
  const id = $("#chestWho").value;
  if (!id) return say("No hay nadie conectado.", "err");
  $("#chestList").innerHTML = '<div class="muted">Buscando…</div>'; $("#chestBox").hidden = true;
  try {
    const list = await api("/api/chests?id=" + encodeURIComponent(id));
    $("#chestList").innerHTML = list.map((c) => `<div class="item"><span>📦 ${esc(c.prefab.replace("piece_chest_", "").replace("piece_chest", "cofre reforzado"))} · a ${c.dist} m</span><button class="small info" data-chest="${esc(c.id)}">Abrir</button></div>`).join("")
      || '<div class="muted">No hay cofres a menos de 30 m de ese jugador.</div>';
  } catch (err) { $("#chestList").innerHTML = ""; say(err.message, "err"); }
});
async function openChest(oid) {
  chestOpen = oid;
  const c = await api("/api/chest?oid=" + encodeURIComponent(oid));
  $("#chestTitle").textContent = `Cofre ${oid}`;
  $("#chestItems").innerHTML = c.items.map((i) => `<div class="item"><span>[${i.index}] ${esc(itemLabel(i.prefab))} × ${i.stack}${i.quality > 1 ? ` · nivel ${i.quality}` : ""}</span><button class="small off" data-chestdel="${i.index}">Quitar</button></div>`).join("")
    || `<div class="muted">${c.empty ? "Vacío." : esc(c.raw || "Sin datos.")}</div>`;
  $("#chestBox").hidden = false;
}
document.addEventListener("click", async (e) => {
  const o = e.target.closest("[data-chest]"), d = e.target.closest("[data-chestdel]");
  try {
    if (o) await openChest(o.dataset.chest);
    if (d) { if (!confirmClick(d)) return; say((await api("/api/chest/remove", { oid: chestOpen, index: +d.dataset.chestdel })).out, "ok"); await openChest(chestOpen); }
  } catch (err) { say(err.message, "err"); }
});
$("#chestAdd").addEventListener("click", async () => {
  try { say((await api("/api/chest/add", { oid: chestOpen, item: $("#chestItem").value.trim(), count: +$("#chestCount").value })).out, "ok"); $("#chestItem").value = ""; await openChest(chestOpen); }
  catch (err) { say(err.message, "err"); }
});

// ---------- mundo ----------
$("#spawnSel").innerHTML = `<optgroup label="Criaturas">${VH.creatures.map((c) => `<option value="${c.prefab}">${esc(c.name)}</option>`).join("")}</optgroup>
  <optgroup label="⚠️ Jefes">${VH.bosses.map((c) => `<option value="${c.prefab}">${esc(c.name)}</option>`).join("")}</optgroup>`;
async function loadWorld() {
  await refreshOnline();
  try {
    const w = await api("/api/world");
    $("#bossList").innerHTML = w.bosses.map((b) => `<div class="item" style="font-family:system-ui"><span>${BOSS_NAMES[b.key] || b.key} ${b.done ? '<span class="tag ok">derrotado</span>' : '<span class="tag">pendiente</span>'}</span>
      <button class="small ${b.done ? "" : "on"}" data-boss="${b.key}" data-done="${!b.done}" data-confirm>${b.done ? "Quitar" : "Marcar derrotado"}</button></div>`).join("");
    const sel = $("#eventSel"), cur = sel.value;
    sel.innerHTML = w.events.map((ev) => `<option value="${esc(ev)}">${esc(EVENT_NAMES[ev] || ev)}</option>`).join("");
    if (cur) sel.value = cur;
    $("#eventCurrent").textContent = w.current ? "Ahora mismo: " + w.current : "No hay ningún evento activo.";
  } catch (err) { $("#bossList").innerHTML = `<div class="muted">${esc(err.message)}</div>`; }
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-boss]");
  if (!b || !confirmClick(b)) return;
  try { say((await api("/api/boss", { key: b.dataset.boss, done: b.dataset.done === "true" })).out, "ok"); loadWorld(); } catch (err) { say(err.message, "err"); }
});
$("#eventStart").addEventListener("click", async (e) => {
  if (!$("#eventWho").value) return say("No hay nadie conectado.", "err");
  if (!confirmClick(e.target)) return;
  try { say((await api("/api/event", { name: $("#eventSel").value, id: $("#eventWho").value })).out, "ok"); setTimeout(loadWorld, 2000); } catch (err) { say(err.message, "err"); }
});
$("#eventStop").addEventListener("click", async () => {
  try { say((await api("/api/event/stop", {})).out, "ok"); setTimeout(loadWorld, 1000); } catch (err) { say(err.message, "err"); }
});
$("#spawnGo").addEventListener("click", async (e) => {
  if (!$("#spawnWho").value) return say("No hay nadie conectado.", "err");
  if (VH.bosses.some((b) => b.prefab === $("#spawnSel").value) && !confirmClick(e.target)) return;
  try {
    say((await api("/api/spawn", { prefab: $("#spawnSel").value, id: $("#spawnWho").value, count: +$("#spawnCount").value, level: +$("#spawnLevel").value, tamed: $("#spawnTamed").checked })).out, "ok");
  } catch (err) { say(err.message, "err"); }
});
$("#dropFind").addEventListener("click", async () => {
  if (!$("#dropWho").value) return say("No hay nadie conectado.", "err");
  $("#dropList").innerHTML = '<div class="muted">Buscando… (puede tardar unos segundos)</div>'; $("#dropActions").hidden = true;
  try {
    const d = await api(`/api/drops?id=${encodeURIComponent($("#dropWho").value)}&r=${$("#dropR").value}`);
    $("#dropList").innerHTML = d.drops.map((x) => `<label class="item" style="font-family:system-ui;margin:0;color:var(--text)"><span><input type="checkbox" data-drop="${esc(x.prefab)}" checked> ${esc(itemLabel(x.prefab))}</span><span class="muted">${x.count} en el suelo</span></label>`).join("")
      || `<div class="muted">No hay objetos tirados a menos de ${d.radius} m.</div>`;
    $("#dropActions").hidden = !d.drops.length;
  } catch (err) { $("#dropList").innerHTML = ""; say(err.message, "err"); }
});
$("#dropDelete").addEventListener("click", async (e) => {
  const prefabs = $$("[data-drop]:checked").map((c) => c.dataset.drop);
  if (!prefabs.length || !confirmClick(e.target)) return;
  try { say((await api("/api/drops/delete", { id: $("#dropWho").value, r: +$("#dropR").value, prefabs })).out, "ok"); $("#dropFind").click(); } catch (err) { say(err.message, "err"); }
});

// ---------- avisos ----------
let schedules = [];
function renderSched() {
  $("#schedList").innerHTML = schedules.map((s, i) => `<div class="row" style="background:var(--card2);padding:8px;border-radius:8px">
    <input data-sched="${i}" data-k="text" value="${esc(s.text)}" placeholder="Texto del mensaje">
    <span class="muted">cada</span><input data-sched="${i}" data-k="everyMin" type="number" min="1" value="${s.everyMin}" style="width:80px;flex:none"><span class="muted">min</span>
    <select data-sched="${i}" data-k="mode"><option value="showMessage" ${s.mode !== "say" ? "selected" : ""}>En pantalla</option><option value="say" ${s.mode === "say" ? "selected" : ""}>En el chat</option></select>
    <button class="small off" data-scheddel="${i}">🗑</button></div>`).join("") || '<div class="muted">No hay mensajes programados.</div>';
}
document.addEventListener("input", (e) => { const t = e.target.closest("[data-sched]"); if (t) schedules[+t.dataset.sched][t.dataset.k] = t.dataset.k === "everyMin" ? +t.value : t.value; });
document.addEventListener("change", (e) => { const t = e.target.closest("select[data-sched]"); if (t) schedules[+t.dataset.sched].mode = t.value; });
document.addEventListener("click", (e) => { const d = e.target.closest("[data-scheddel]"); if (d) { schedules.splice(+d.dataset.scheddel, 1); renderSched(); } });
$("#schedAdd").addEventListener("click", () => { schedules.push({ text: "", everyMin: 60, mode: "showMessage" }); renderSched(); });
async function loadMessages() {
  const m = await api("/api/messages");
  schedules = m.schedules; $("#welcomeText").value = m.welcome; renderSched(); updateRestartUi();
}
$("#msgSave").addEventListener("click", async () => {
  try { await api("/api/messages", { welcome: $("#welcomeText").value, schedules }); say("Avisos guardados.", "ok"); loadMessages(); } catch (err) { say(err.message, "err"); }
});
function updateRestartUi() {
  const at = lastStatus && lastStatus.pendingRestart;
  $("#rwCancel").hidden = !at; $("#rwStart").disabled = !!at;
  if (at) $("#rwInfo").textContent = `⏳ Reinicio programado a las ${new Date(at).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.`;
}

$("#rwStart").addEventListener("click", async (e) => {
  if (!confirmClick(e.target)) return;
  try { const r = await api("/api/restart-warn", { minutes: +$("#rwMinutes").value }); if (lastStatus) lastStatus.pendingRestart = r.at; updateRestartUi(); say("Aviso enviado a los jugadores. El servidor se reiniciará a la hora indicada.", "ok"); }
  catch (err) { say(err.message, "err"); }
});
$("#rwCancel").addEventListener("click", async () => {
  try { await api("/api/restart-cancel", {}); if (lastStatus) lastStatus.pendingRestart = null; $("#rwInfo").textContent = "Reinicio cancelado."; updateRestartUi(); say("Reinicio cancelado.", "ok"); }
  catch (err) { say(err.message, "err"); }
});

// ---------- gráficas de 24 h (inicio) ----------
function chart(title, data, key, color, fmt) {
  const pts = data.filter((d) => d[key] !== null && d[key] !== undefined);
  if (pts.length < 2) return `<div class="kpi"><div class="l">${title}</div><div class="muted" style="font-size:13px;margin-top:8px">Recogiendo datos… (1 punto por minuto)</div></div>`;
  const W = 300, H = 70, t0 = Date.now() - 86400000, max = Math.max(1, ...pts.map((d) => d[key]));
  const line = pts.map((d) => `${((d.t - t0) / 86400000 * W).toFixed(1)},${(H - d[key] / max * (H - 4) - 2).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1][key];
  return `<div class="kpi"><div class="l">${title}</div><div class="v" style="font-size:18px">${fmt(last)} <span class="muted" style="font-size:12px;font-weight:400">máx. ${fmt(max)}</span></div>
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:70px;display:block;margin-top:6px"><polyline points="${line}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
    <div class="muted" style="font-size:11px;display:flex;justify-content:space-between"><span>hace 24 h</span><span>ahora</span></div></div>`;
}
async function loadCharts() {
  try {
    const h = await api("/api/history");
    $("#charts").innerHTML = chart("CPU", h, "cpu", "#d9a441", (v) => Math.round(v) + "%") + chart("Memoria", h, "mem", "#4a86d8", (v) => (v / 1024).toFixed(1) + " GB")
      + chart("Jugadores", h, "players", "#4caf62", (v) => Math.round(v)) + chart("Fallos del crossplay / min", h, "pf", "#cf4a3f", (v) => Math.round(v));
  } catch {}
}
loadCharts(); setInterval(loadCharts, 60000);

// ---------- refresco de las pestañas nuevas ----------
// Los jugadores llegan en directo (onPlayersLoaded); aquí solo lo que se carga al abrir cada pestaña
window.EXTRA_LOADERS = {
  mapa: loadMap, objetos: () => { refreshOnline(); loadKits(); }, mundo: loadWorld, avisos: loadMessages,
};
loadKits().catch(() => {}); loadPlaces();
// Si al cargar la página se abre directamente una pestaña nueva (recordada), cargarla
try { const t = localStorage.getItem("vhTab"); if (window.EXTRA_LOADERS[t]) openTab(t); } catch {}
