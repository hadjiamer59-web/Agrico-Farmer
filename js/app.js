// Screens: 1) choose area  2) loading  3) advice.
(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const END = new Date().getFullYear() - 1, START = END - 29, WINDOW = 5, cache = {};
  let area = null;
  const show = id => ["pick", "loading", "error", "result"].forEach(s => ($("#" + s).hidden = s !== id));

  $("#areas").insertAdjacentHTML("beforeend", REGIONS.map(r =>
    `<label class="o"><input type="radio" name="a" value="${r.id}"><span>${r.name}<small>${r.sub}</small></span></label>`).join(""));

  function coords() {
    if (!area) return null;
    if (area.id !== "custom") return { lat: area.lat, lon: area.lon, name: area.name };
    const lat = parseFloat($("#lat").value), lon = parseFloat($("#lon").value);
    return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon, name: "Your location" } : null;
  }
  const refresh = () => { $("#coords").hidden = !(area && area.id === "custom"); $("#go").disabled = !coords(); };
  $("#areas").addEventListener("change", e => { area = REGIONS.find(r => r.id === e.target.value); refresh(); });
  ["#lat", "#lon"].forEach(s => $(s).addEventListener("input", refresh));

  const color = s => (s >= 80 ? "#2E7D32" : s >= 60 ? "#7CA82B" : s >= 40 ? "#EF8A17" : "#C62828");
  const sg = n => (n > 0 ? "+" : "") + n;
  const kpi = (l, v, n, bad) => `<div class="k${bad ? " bad" : ""}"><small>${l}</small><b>${v}</b><span>${n}</span></div>`;

  function card(r, i) {
    const ch = r.change > 0 ? `<span class="up">▲ ${sg(r.change)} points</span>` : r.change < 0 ? `<span class="down">▼ ${r.change} points</span>` : `<span class="flat">● no change</span>`;
    const tags = (i < 3 ? '<span class="tag top">Top pick</span>' : "") +
      (r.gap >= 20 ? `<span class="tag water">Needs ~${r.gap} mm irrigation</span>` : '<span class="tag ok">Enough rain</span>') +
      (r.usual === "-" ? '<span class="tag">Perennial</span>' : `<span class="tag sow">Sow in ${r.best}${r.best !== r.usual ? " (usual: " + r.usual + ")" : ""}</span>`);
    return `<div class="c"><div class="ct"><b>${esc(r.crop)}</b><span style="color:${color(r.now)}">${r.now}</span></div>
      <div class="bar"><i style="width:${Math.max(r.now, 2)}%;background:${color(r.now)}"></i></div>
      <div class="cc">${ch} <span class="flat">vs. first ${WINDOW} seasons</span></div>${tags}</div>`;
  }

  function render(c, rows, demo) {
    const a = analyse(rows, WINDOW), tt = a.tTrend * a.years, rr = a.rTrend * 365 * a.years, tm = a.timing;
    const label = { warn: "Watch out", sow: "Sowing date", good: "Good news", info: "Summary" };
    const k = [kpi("Temperature", `${sg(+tt.toFixed(1))} °C`, `${sg(+a.tTrend.toFixed(3))} °C per year`, tt > 0.3),
      kpi("Yearly rainfall", `${sg(Math.round(rr))} mm`, `${sg(+(a.rTrend * 365).toFixed(1))} mm per year`, rr < -30)];
    if (Number.isFinite(tm.days)) {
      k.push(kpi("Autumn rain (Sep-Nov)", `${sg(Math.round(tm.autumn))} mm`, `recent vs. first ${WINDOW} seasons`, tm.autumn < -15));
      k.push(kpi("Rainy season timing", `${Math.abs(Math.round(tm.days))} days ${tm.days >= 0 ? "later" : "earlier"}`, "centre of the rainy season"));
    }
    $("#result").innerHTML = `<div class="hero"><h1>Your advice for ${esc(c.name)}</h1><p>${c.lat.toFixed(2)}, ${c.lon.toFixed(2)} | ${START}-${END}</p></div>${demo ? '<div class="ad warn" style="margin-top:14px"><i>Sample data</i>These numbers are invented. They only show how the app looks. Choose Change area and try again to get real NASA data.</div>' : ""}
      <h2 class="sec">1. How the climate changed</h2><div class="kp">${k.join("")}</div>
      <h2 class="sec">2. What should you do?</h2>${a.advice.map(i => `<div class="ad ${i.kind}"><i>${label[i.kind]}</i>${esc(i.text)}</div>`).join("")}
      <h2 class="sec">3. Crop report</h2><p class="hint">Suitability score from 0 to 100, today compared with the past. Irrigation = extra water needed per season.</p>
      <div class="cr">${a.table.map(card).join("")}</div>`;
  }

  async function run() {
    const c = coords();
    if (!c) return;
    show("loading");
    try {
      const key = c.lat + "," + c.lon;
      const rows = cache[key] || (cache[key] = await fetchClimate(c.lat, c.lon, START, END));
      render(c, rows);
      $("#change").hidden = false;
      show("result");
      window.scrollTo(0, 0);
    } catch (e) {
      $("#errmsg").textContent = /fetch|network/i.test(e.message || "") ? "We could not reach the NASA server. Please check your internet connection and try again." : e.message;
      show("error");
    }
  }
  $("#demo").addEventListener("click", () => {
    const c = coords() || { lat: 32.93, lon: -5.67, name: "Sample area" };
    render(c, sampleClimate(START, END), true);
    $("#change").hidden = false;
    show("result");
    window.scrollTo(0, 0);
  });
  $("#go").addEventListener("click", run);
  $("#retry").addEventListener("click", run);
  $("#change").addEventListener("click", () => { $("#change").hidden = true; show("pick"); });
})();
