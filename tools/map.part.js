/* ---------- Peta sebaran anggota (Mode Admin, Beranda) ---------- */
// Titik tengah tiap provinsi (perkiraan) untuk gelembung peta.
const PROV_LL = {
  "Aceh": [4.37, 96.75], "Sumatera Utara": [2.19, 99.38], "Sumatera Barat": [-0.74, 100.8], "Riau": [0.29, 101.71],
  "Kepulauan Riau": [0.95, 104.45], "Jambi": [-1.61, 103.61], "Sumatera Selatan": [-3.32, 104.91], "Kepulauan Bangka Belitung": [-2.74, 106.44],
  "Bengkulu": [-3.79, 102.26], "Lampung": [-4.56, 105.41], "DKI Jakarta": [-6.0, 106.8], "Jawa Barat": [-7.05, 107.65],
  "Banten": [-6.45, 105.85], "Jawa Tengah": [-7.05, 109.95], "DI Yogyakarta": [-8.25, 110.45], "Jawa Timur": [-7.6, 112.55],
  "Bali": [-8.41, 115.19], "Nusa Tenggara Barat": [-8.65, 117.36], "Nusa Tenggara Timur": [-8.66, 121.08],
  "Kalimantan Barat": [-0.28, 111.48], "Kalimantan Tengah": [-1.68, 113.38], "Kalimantan Selatan": [-3.09, 115.28],
  "Kalimantan Timur": [0.54, 116.42], "Kalimantan Utara": [3.07, 116.04], "Sulawesi Utara": [0.62, 123.98], "Gorontalo": [0.7, 122.45],
  "Sulawesi Tengah": [-1.43, 121.45], "Sulawesi Barat": [-2.84, 119.23], "Sulawesi Selatan": [-3.67, 119.97], "Sulawesi Tenggara": [-4.14, 122.17],
  "Maluku": [-3.24, 130.15], "Maluku Utara": [1.57, 127.81], "Papua Barat": [-1.34, 133.17], "Papua Barat Daya": [-0.95, 131.6],
  "Papua": [-2.6, 139.4], "Papua Tengah": [-3.7, 136.4], "Papua Pegunungan": [-4.1, 138.9], "Papua Selatan": [-7.1, 139.6],
};
const PROV_ALIAS = {
  "west java": "Jawa Barat", "central java": "Jawa Tengah", "east java": "Jawa Timur", "jabar": "Jawa Barat", "jateng": "Jawa Tengah", "jatim": "Jawa Timur",
  "dki jakarta": "DKI Jakarta", "daerah khusus jakarta": "DKI Jakarta", "daerah khusus ibukota jakarta": "DKI Jakarta", "jakarta": "DKI Jakarta", "dki": "DKI Jakarta",
  "di yogyakarta": "DI Yogyakarta", "daerah istimewa yogyakarta": "DI Yogyakarta", "yogyakarta": "DI Yogyakarta", "diy": "DI Yogyakarta", "jogja": "DI Yogyakarta", "jogjakarta": "DI Yogyakarta",
  "ntt": "Nusa Tenggara Timur", "ntb": "Nusa Tenggara Barat", "nusa tenggara timur": "Nusa Tenggara Timur", "nusa tenggara barat": "Nusa Tenggara Barat",
  "bangka belitung": "Kepulauan Bangka Belitung", "babel": "Kepulauan Bangka Belitung", "kepulauan bangka belitung": "Kepulauan Bangka Belitung",
  "kepri": "Kepulauan Riau", "nad": "Aceh", "nanggroe aceh darussalam": "Aceh", "sumut": "Sumatera Utara", "sumbar": "Sumatera Barat", "sumsel": "Sumatera Selatan",
  "sulsel": "Sulawesi Selatan", "sulteng": "Sulawesi Tengah", "sulut": "Sulawesi Utara", "sultra": "Sulawesi Tenggara", "sulbar": "Sulawesi Barat",
  "kalbar": "Kalimantan Barat", "kalteng": "Kalimantan Tengah", "kalsel": "Kalimantan Selatan", "kaltim": "Kalimantan Timur", "kaltara": "Kalimantan Utara",
  "malut": "Maluku Utara", "pabar": "Papua Barat", "west papua": "Papua Barat", "bali province": "Bali",
};
const _pk = s => String(s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/^\s*(provinsi|prov\.?|province of)\s+/, "").replace(/\s+province$/, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const PROV_KEYS = Object.keys(PROV_LL).map(n => [_pk(n), n]);
function normProv(s) {
  const k = _pk(s); if (!k) return null;
  if (PROV_ALIAS[k]) return PROV_ALIAS[k];
  const hit = PROV_KEYS.find(([pk]) => pk === k); if (hit) return hit[1];
  const inc = PROV_KEYS.filter(([pk]) => k.includes(pk)).sort((a, b) => b[0].length - a[0].length)[0]; if (inc) return inc[1];
  const al = Object.keys(PROV_ALIAS).find(a => a.length > 3 && k.includes(a)); return al ? PROV_ALIAS[al] : null;
}
const MAPF = { all: ["Semua", m => true], tersedia: ["Tersedia", m => m.status === "tersedia"], relawan: ["Relawan", m => /relawan/i.test(m.level || "")], staf: ["Staf", m => m.level === "Staf PMI"], pengurus: ["Pengurus", m => m.level === "Pengurus PMI"] };
function provStats() {
  const f = (MAPF[S.mapF] || MAPF.all)[1], by = {}; let unknown = 0, total = 0;
  members().filter(f).forEach(m => {
    total++; const p = normProv(m.province); if (!p) { unknown++; return; }
    const o = by[p] || (by[p] = { p, n: 0, avail: 0, rel: 0, staf: 0, peng: 0, roles: {} });
    o.n++; if (m.status === "tersedia") o.avail++; if (m.level === "Staf PMI") o.staf++; else if (m.level === "Pengurus PMI") o.peng++; else o.rel++;
    o.roles[m.role] = (o.roles[m.role] || 0) + 1;
  });
  return { list: Object.values(by).sort((a, b) => b.n - a.n || a.p.localeCompare(b.p)), unknown, total };
}
function mapCard() {
  const { list, unknown, total } = provStats(), max = list[0] ? list[0].n : 1, all = members().length;
  return `<section class="card mapcard" id="sec-map"><div class="card-h"><div><h2>Sebaran anggota roster</h2><p class="muted" style="font-size:.84rem;margin-top:2px"><b style="color:var(--ink)">${total}</b> anggota di <b style="color:var(--ink)">${list.length}</b> provinsi${list[0] ? ` · terbanyak di ${esc(list[0].p)} (${list[0].n})` : ""}</p></div>
    <div class="mapf" role="group" aria-label="Saring peta">${Object.entries(MAPF).map(([k, [l]]) => `<button class="${(S.mapF || "all") === k ? "on" : ""}" data-act="mapf" data-v="${k}">${l}</button>`).join("")}</div></div>
    <div class="mapgrid2"><div class="mapbox"><div id="rmap-slot"></div><div class="maplegend"><span><i class="lg s"></i>sedikit</span><span><i class="lg m"></i></span><span><i class="lg l"></i>banyak</span></div></div>
    <div class="maplist">${list.length ? list.map((o, i) => `<button class="mrow" data-act="mapprov" data-v="${esc(o.p)}" title="Lihat anggota ${esc(o.p)}"><span class="mr-i">${i + 1}</span><span class="mr-n"><b>${esc(o.p)}</b><span class="mr-bar"><i style="width:${Math.max(6, o.n / max * 100)}%"></i></span></span><span class="mr-c">${o.n}</span></button>`).join("") : `<p class="muted" style="padding:10px">Belum ada anggota dengan provinsi.</p>`}
    ${unknown ? `<p class="muted" style="font-size:.78rem;padding:8px 4px 0">${unknown} anggota belum mengisi provinsi atau nama provinsinya tidak dikenali.</p>` : ""}</div></div></section>`;
}
const ID_BOUNDS = [[-10.5, 95], [5.8, 141]];
function refitMap() { if (!RMAP || !RMAP_EL.isConnected) return; RMAP.invalidateSize(); if (!RMAP._touched) { RMAP._fitting = true; RMAP.fitBounds(ID_BOUNDS, { padding: [8, 8], animate: false }); RMAP._fitting = false; } }
let RMAP = null, RMAP_EL = null, RMAP_LAYER = null, RMAP_TILE = null;
const darkMode = () => document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
function mountMap() {
  const slot = document.getElementById("rmap-slot"); if (!slot || slot.firstChild) return;
  if (!RMAP_EL) {
    RMAP_EL = document.createElement("div"); RMAP_EL.className = "rmap"; RMAP_EL.setAttribute("aria-label", "Peta sebaran anggota roster per provinsi");
    slot.appendChild(RMAP_EL);
    RMAP = L.map(RMAP_EL, { zoomControl: true, scrollWheelZoom: false, attributionControl: true, minZoom: 3, maxZoom: 8, zoomSnap: 0.25, maxBounds: [[-20, 85], [16, 152]], maxBoundsViscosity: .8 });
    RMAP.attributionControl.setPrefix(false).addAttribution("Peta dasar: Natural Earth");
    RMAP.fitBounds(ID_BOUNDS, { padding: [8, 8] });
    RMAP.on("dragstart", () => { RMAP._touched = true; }); RMAP_EL.addEventListener("wheel", () => { RMAP._touched = true; }, { passive: true });
    RMAP.on("zoomstart", e => { if (!RMAP._fitting) RMAP._touched = true; });
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(refitMap, 150); });
    RMAP.on("click", () => RMAP.scrollWheelZoom.enable());
    RMAP.on("zoomend", drawBubbles);
    RMAP_LAYER = L.layerGroup().addTo(RMAP);
  } else slot.appendChild(RMAP_EL);
  const dark = darkMode();
  if (!RMAP_TILE || RMAP_TILE._dark !== dark) {
    if (RMAP_TILE) RMAP.removeLayer(RMAP_TILE);
    const C = dark ? { id: ["#1D3352", "#33557F"], x: ["#16263C", "#1E3350"] } : { id: ["#FFFFFF", "#A9C3E3"], x: ["#E6EDF5", "#D3DEEA"] };
    RMAP_TILE = L.geoJSON(ID_GEO, { interactive: false, style: f => f.properties.id === "ID"
      ? { fillColor: C.id[0], fillOpacity: 1, color: C.id[1], weight: 1, lineJoin: "round" }
      : { fillColor: C.x[0], fillOpacity: 1, color: C.x[1], weight: .6 } }).addTo(RMAP);
    RMAP_TILE._dark = dark; RMAP_EL.classList.toggle("dark", dark);
  }
  drawBubbles(); setTimeout(refitMap, 0);
}
function drawBubbles() {
  if (!RMAP_LAYER) return; RMAP_LAYER.clearLayers();
  const { list } = provStats(), max = list[0] ? list[0].n : 1;
  list.slice().reverse().forEach(o => {
    const ll = PROV_LL[o.p]; if (!ll) return;
    const z = RMAP.getZoom(), sc = Math.max(.48, Math.min(1.5, 1 + (z - 4.5) * .4)), d = Math.round((18 + 26 * Math.sqrt(o.n / max)) * sc), lvl = o.n / max > .66 ? "l" : o.n / max > .33 ? "m" : "s";
    const roles = Object.entries(o.roles).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r, n]) => `${esc(r)} (${n})`).join("<br>");
    const mk = L.marker(ll, { icon: L.divIcon({ className: "", html: `<div class="mbub ${lvl}" style="width:${d}px;height:${d}px;font-size:${d > 40 ? 14 : d > 28 ? 12 : d > 18 ? 10 : 9}px;border-width:${d > 22 ? 2.5 : 1.5}px">${o.n}</div>`, iconSize: [d, d], iconAnchor: [d / 2, d / 2] }), title: o.p, keyboard: true, riseOnHover: true });
    mk.bindTooltip(`<div class="mtip"><b>${esc(o.p)}</b><div class="mtip-n">${o.n} anggota · ${o.avail} tersedia</div><div class="mtip-k"><span>Relawan <b>${o.rel}</b></span><span>Staf <b>${o.staf}</b></span><span>Pengurus <b>${o.peng}</b></span></div>${roles ? `<div class="mtip-r">${roles}</div>` : ""}<div class="mtip-h">Klik untuk melihat daftar anggota</div></div>`, { direction: "top", offset: [0, -d / 2], opacity: 1, className: "mtipwrap" });
    mk.on("click", () => goProv(o.p));
    RMAP_LAYER.addLayer(mk);
  });
}
function goProv(p) {
  const raw = [...new Set(members().filter(m => normProv(m.province) === p).map(m => m.province))];
  S.f.prov = ""; S.f.q = ""; S.f.provNorm = p; if (location.hash !== "#roster") location.hash = "roster"; else render();
  toast(`Menampilkan anggota dari ${p}${raw.length > 1 ? " (" + raw.length + " penulisan nama provinsi)" : ""}`);
}
new MutationObserver(() => { const s = document.getElementById("rmap-slot"); if (s && !s.firstChild) mountMap(); }).observe(document.body, { childList: true, subtree: true });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "mapf") { e.stopImmediatePropagation(); S.mapF = b.dataset.v; render(); }
  else if (a === "mapprov") { e.stopImmediatePropagation(); goProv(b.dataset.v); }
  else if (a === "fprovnorm-clear") { e.stopImmediatePropagation(); S.f.provNorm = ""; render(); }
}, true);
