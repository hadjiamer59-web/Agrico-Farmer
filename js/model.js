// Climate model: NASA POWER download, growing-season scores, sowing dates, advice.
const DAYS = 30.4;
const MON = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sum = a => a.reduce((x, y) => x + y, 0);
const mean = a => (a.length ? sum(a) / a.length : NaN);
const pick = (a, k) => a.map(r => r[k]).filter(v => v != null);

async function fetchClimate(lat, lon, start, end) {
  const q = new URLSearchParams({ parameters: "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT", community: "AG",
    longitude: lon, latitude: lat, start, end, format: "JSON" });
  const res = await fetch("https://power.larc.nasa.gov/api/temporal/monthly/point?" + q);
  if (!res.ok) throw new Error("The NASA server answered with an error (" + res.status + "). Please try again.");
  return parse(await res.json());
}

function sampleClimate(start, end) { // DEMO data only: invented, not real measurements
  const rows = []; let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = start; y <= end; y++) for (let m = 1; m <= 12; m++) {
    const k = y - start, t = 14 + 7 * Math.sin((m - 4) / 12 * 2 * Math.PI) + 0.045 * k + (rnd() - 0.5);
    const wet = Math.exp(-0.5 * Math.pow(((((m - 12) % 12) + 12) % 12 - 1 - 0.03 * k) / 2.2, 2));
    rows.push({ year: y, month: m, t, tx: t + 6.5, p: Math.max(0.05, (2.4 - 0.015 * k) * wet + (rnd() - 0.5) * 0.3) });
  }
  return rows;
}

function parse(data) {
  const p = data.properties.parameter, rows = [];
  for (const k of Object.keys(p.T2M)) {
    const month = +k.slice(4);
    if (month > 12) continue; // month 13 is the yearly average
    const g = n => (p[n][k] === -999 ? null : p[n][k]);
    rows.push({ year: +k.slice(0, 4), month, t: g("T2M"), tx: g("T2M_MAX"), p: g("PRECTOTCORR") });
  }
  return rows;
}

function yearly(rows) {
  const by = {};
  rows.forEach(r => (by[r.year] = by[r.year] || []).push(r));
  return Object.keys(by).map(Number).sort((a, b) => a - b)
    .map(y => ({ year: y, temp: mean(pick(by[y], "t")), rain: mean(pick(by[y], "p")) }));
}

function trend(pts) { // slope of y per x (least squares)
  const d = pts.filter(q => Number.isFinite(q[0]) && Number.isFinite(q[1])), n = d.length;
  const sx = sum(d.map(q => q[0])), sy = sum(d.map(q => q[1]));
  const sxy = sum(d.map(q => q[0] * q[1])), sxx = sum(d.map(q => q[0] * q[0]));
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

const rangeScore = (x, [lo, hi], [la, ha]) =>
  x >= lo && x <= hi ? 1 : x < lo ? Math.max(0, (x - la) / (lo - la)) : Math.max(0, (ha - x) / (ha - hi));
const heatScore = (x, ok, abs) => (x <= ok ? 1 : Math.max(0, (abs - x) / (abs - ok)));
const seasonScore = (cr, s) => 100 * (0.5 * rangeScore(s.rain, cr.r, cr.ra) + 0.3 * rangeScore(s.tmean, cr.t, cr.ta) + 0.2 * heatScore(s.tmax, cr.tx, cr.txa));

function seasonStats(rows, start, end) { // seasons that wrap the new year belong to the year they end in
  const wrap = start > end, n = wrap ? 12 - start + 1 + end : end - start + 1, g = {};
  for (const r of rows) {
    const m = r.month;
    if (!(wrap ? m >= start || m <= end : m >= start && m <= end)) continue;
    (g[wrap && m >= start ? r.year + 1 : r.year] = g[wrap && m >= start ? r.year + 1 : r.year] || []).push(r);
  }
  return Object.keys(g).map(Number).sort((a, b) => a - b).filter(y => g[y].length === n)
    .map(y => ({ rain: sum(pick(g[y], "p")) * DAYS, tmean: mean(pick(g[y], "t")), tmax: mean(pick(g[y], "tx")) }));
}

function windowScore(rows, cr, season, w, which) {
  const st = seasonStats(rows, season[0], season[1]);
  const sel = which === "first" ? st.slice(0, w) : st.slice(-w);
  return { score: mean(sel.map(s => seasonScore(cr, s))), rain: mean(sel.map(s => s.rain)) };
}

function recommend(rows, w) {
  const out = CROPS.map(cr => {
    const then = windowScore(rows, cr, cr.season, w, "first").score;
    const now = windowScore(rows, cr, cr.season, w, "last");
    let best = cr.season[0], gain = 0;
    for (const m of cr.sow || []) {
      if (m === cr.season[0]) continue;
      const sh = m - cr.season[0], alt = cr.season.map(x => ((x - 1 + sh) % 12 + 12) % 12 + 1);
      const d = windowScore(rows, cr, alt, w, "last").score - now.score;
      if (d > Math.max(3, gain)) { gain = d; best = alt[0]; }
    }
    return { crop: cr.name, then: Math.round(then), now: Math.round(now.score), change: Math.round(now.score) - Math.round(then),
      gap: Math.round(Math.max(0, cr.r[0] - now.rain)), usual: cr.sow ? MON[cr.season[0]] : "-", best: cr.sow ? MON[best] : "-" };
  });
  return out.sort((a, b) => b.now - a.now);
}

function rainTiming(rows, w) { // has the rainy season moved? (water years Sep-Aug)
  const by = {};
  rows.forEach(r => (by[r.year + (r.month >= 9 ? 1 : 0)] = by[r.year + (r.month >= 9 ? 1 : 0)] || []).push(r));
  const wy = Object.keys(by).map(Number).sort((a, b) => a - b).filter(y => by[y].length === 12).map(y => {
    const mm = by[y].map(r => ({ i: (r.month + 3) % 12, m: r.month, v: (r.p || 0) * DAYS })), tot = sum(mm.map(r => r.v));
    return { tot, centre: sum(mm.map(r => r.i * r.v)) / tot, autumn: sum(mm.filter(r => [9, 10, 11].includes(r.m)).map(r => r.v)) };
  }).filter(r => r.tot > 0);
  if (wy.length < 2 * w) return { days: NaN, autumn: NaN };
  const a = wy.slice(0, w), b = wy.slice(-w);
  return { days: (mean(b.map(r => r.centre)) - mean(a.map(r => r.centre))) * DAYS, autumn: mean(b.map(r => r.autumn)) - mean(a.map(r => r.autumn)) };
}

function advice(table) {
  const items = [], alt = table.filter(r => r.change >= 0 && r.gap < 20 && r.now >= 60).slice(0, 2).map(r => r.crop);
  const alts = alt.length ? alt : table.slice(0, 2).map(r => r.crop), sg = n => (n > 0 ? "+" : "") + n;
  table.filter(r => r.change <= -10).forEach(r => {
    let t = `${r.crop} is losing suitability (${sg(r.change)} points)`;
    if (r.gap >= 20) t += ` and needs about ${r.gap} mm of extra water per season`;
    const o = alts.filter(a => a !== r.crop);
    items.push({ kind: "warn", text: t + (o.length ? `. Consider ${o.join(" or ")}.` : ".") });
  });
  table.forEach(r => { if (r.best !== "-" && r.best !== r.usual) items.push({ kind: "sow", text: `Sow ${r.crop} in ${r.best} instead of ${r.usual}: it fits the recent climate better.` }); });
  const up = table.filter(r => r.change >= 15);
  if (up.length) items.push({ kind: "good", text: "Getting better: " + up.map(r => `${r.crop} (${sg(r.change)})`).join(", ") + "." });
  if (!items.length) items.push({ kind: "info", text: "No crop shows a clear decline here. Keep your current crops and keep watching the trend." });
  return items;
}

function analyse(rows, w) {
  const ys = yearly(rows), table = recommend(rows, w);
  return { years: ys.length, tTrend: trend(ys.map(y => [y.year, y.temp])), rTrend: trend(ys.map(y => [y.year, y.rain])),
    timing: rainTiming(rows, w), table, advice: advice(table) };
}
if (typeof module !== "undefined") module.exports = { parse, analyse, recommend, rainTiming };
