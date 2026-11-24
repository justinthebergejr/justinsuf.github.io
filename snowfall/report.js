const $ = id => document.getElementById(id);
const pct = n => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
const names = {CT: "Connecticut", MA: "Massachusetts", ME: "Maine", NH: "New Hampshire", RI: "Rhode Island", VT: "Vermont"};
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"})[c]);
const blue = "#245b9c";
const grey = "#707b89";
const line = (x1, y1, x2, y2, color = "#e1e8f0", extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
const text = (x, y, label, extra = "") => `<text x="${x}" y="${y}" ${extra}>${escapeHTML(label)}</text>`;
const svg = (label, content, width, height) =>
  `<svg role="img" aria-label="${escapeHTML(label)}" viewBox="0 0 ${width} ${height}"><title>${escapeHTML(label)}</title>${content}</svg>`;
const widthOf = id => Math.max(260, $(id).clientWidth);

function timeline(r) {
  const width = widthOf("timeline");
  const left = 44, right = width - 14, top = 30, bottom = 234;
  const values = r.series.filter(d => d.anomaly !== null).map(d => d.anomaly);
  const lo = Math.floor(Math.min(-20, ...values) / 20) * 20;
  const hi = Math.ceil(Math.max(20, ...values) / 20) * 20;
  const x = year => left + (year - 1940) / 79 * (right - left);
  const y = value => bottom - (value - lo) / (hi - lo) * (bottom - top);
  let chart = `<rect x="${x(2000)}" y="${top}" width="${right - x(2000)}" height="${bottom - top}" fill="#e9f1fb"/>`;
  const tickStep = hi - lo > 100 ? 40 : 20;
  for (let value = lo; value <= hi; value += tickStep) {
    chart += line(left, y(value), right, y(value), value === 0 ? "#91a4b9" : "#e1e8f0");
    chart += text(left - 9, y(value) + 4, `${value > 0 ? "+" : ""}${value}%`, 'text-anchor="end"');
  }
  for (const year of (width < 450 ? [1940, 1980, 2019] : [1940, 1960, 1980, 2000, 2019])) {
    chart += text(x(year), bottom + 24, year, `text-anchor="${year === 2019 ? "end" : "middle"}"`);
  }
  chart += text(left, 15, "More / less snow than the earlier average");
  let path = "", drawing = false;
  for (const d of r.series) {
    if (d.anomaly === null) { drawing = false; continue; }
    path += `${drawing ? "L" : "M"}${x(d.year)},${y(d.anomaly)} `;
    drawing = true;
  }
  chart += `<path d="${path}" fill="none" stroke="${blue}" stroke-width="2" stroke-linejoin="round"/>`;
  chart += `<g id="year-marker" aria-hidden="true"></g>`;
  $("timeline").innerHTML = svg("Annual New England snowfall compared with the 1940–1999 station averages", chart, width, 270);

  function selectYear() {
    const year = Number($("year").value);
    const d = r.series.find(item => item.year === year);
    const value = d.anomaly;
    $("year-value").textContent = value === null
      ? `${year}: incomplete state coverage (${d.stations} stations)`
      : `${year}: ${pct(value)} · ${d.stations} stations`;
    $("year-marker").innerHTML = line(x(year), top, x(year), bottom, "#7d94b0", 'stroke-dasharray="3 3"') +
      (value === null ? "" : `<circle cx="${x(year)}" cy="${y(value)}" r="4.5" fill="${blue}" stroke="white" stroke-width="2"/>`);
  }
  $("year").oninput = selectYear;
  $("year-explorer").hidden = false;
  selectYear();
}

function statesChart(r) {
  const width = widthOf("states-chart");
  const left = width < 400 ? 112 : 140, right = width - 53;
  const low = -5, high = Math.max(20, ...Object.values(r.states));
  const x = v => left + (v - low) / (high - low) * (right - left);
  let chart = "";
  for (const tick of [-5, 0, 10, 20]) {
    chart += line(x(tick), 10, x(tick), 282, tick === 0 ? "#91a4b9" : "#e1e8f0");
    chart += text(x(tick), 306, `${tick > 0 ? "+" : ""}${tick}%`, 'text-anchor="middle"');
  }
  Object.entries(r.states).forEach(([state, value], i) => {
    const y = 32 + i * 46;
    const count = r.stations.filter(s => s.state === state).length;
    chart += text(0, y + 2, names[state]);
    chart += text(0, y + 17, `${count} station${count === 1 ? "" : "s"}`, 'style="font-size:10px"');
    chart += `<rect x="${Math.min(x(0), x(value))}" y="${y - 10}" width="${Math.max(1, Math.abs(x(value) - x(0)))}" height="19" rx="1" fill="${value < 0 ? grey : blue}"/>`;
    chart += text(x(value) + (value < 0 ? -7 : 7), y + 4, pct(value),
      `text-anchor="${value < 0 ? "end" : "start"}" style="fill:#202e3b;font-weight:600"`);
  });
  $("states-chart").innerHTML = svg("Change in mean annual snowfall by state, with station counts", chart, width, 320);
}

function intervals(r) {
  const width = widthOf("interval-chart");
  const left = width < 400 ? 105 : 140, right = width - 23;
  const low = Math.floor(Math.min(-10, r.ci[0], r.block_ci[0]) / 10) * 10;
  const high = Math.ceil(Math.max(30, r.ci[1], r.block_ci[1]) / 10) * 10;
  const x = value => left + (value - low) / (high - low) * (right - left);
  let chart = "";
  for (let tick = low; tick <= high; tick += 10) {
    chart += line(x(tick), 10, x(tick), 112, tick === 0 ? "#91a4b9" : "#e1e8f0",
      tick === 0 ? 'stroke-dasharray="3 3"' : "");
    chart += text(x(tick), 137, `${tick > 0 ? "+" : ""}${tick}%`, 'text-anchor="middle"');
  }
  [["Single years", r.ci], ["5-year blocks", r.block_ci]].forEach(([label, ci], i) => {
    const y = 38 + i * 48;
    chart += text(0, y + 4, label);
    chart += line(x(ci[0]), y, x(ci[1]), y, blue, 'stroke-width="3"');
    for (const bound of ci) chart += line(x(bound), y - 5, x(bound), y + 5, blue);
    chart += `<circle cx="${x(r.change)}" cy="${y}" r="5" fill="${blue}"/>`;
  });
  $("interval-chart").innerHTML = svg("Observed snowfall change and two bootstrap uncertainty intervals, both including zero", chart, width, 150);
}

async function render() {
  const response = await fetch("assets/results.json");
  if (!response.ok) throw new Error(`Results request failed (${response.status})`);
  const r = await response.json();
  const less = r.change < 0;
  const crossesZero = ci => ci[0] <= 0 && ci[1] >= 0;
  const caveat = crossesZero(r.block_ci)
    ? `But the uncertainty interval includes zero, so this isn’t clear evidence of a lasting ${less ? "decrease" : "increase"}, either.`
    : "The five-year-block interval excludes zero, but station selection and changes in measurement practices remain sources of uncertainty.";
  $("verdict").innerHTML = `<h2>${less ? "Yes" : "No"}, ${less ? "less snow" : "not in this comparison"}.</h2><p>The ${r.station_count}-station index shows <strong>${Math.abs(r.change).toFixed(1)}% ${less ? "less" : "more"} annual snowfall</strong> in 2000–2019 than in 1940–1999. ${caveat}</p>`;
  const negative = Object.entries(r.states).filter(([, value]) => value < 0);
  $("state-summary").textContent = `${negative.length === 1 ? "Only one state sample had" : `${negative.length} state samples had`} less snowfall in the later period${negative.length ? `: ${negative.map(([state]) => names[state]).join(", ")}` : ""}. These are summaries of the available stations, not measurements of every town or mountain. Each state gets the same weight in the regional result, even when it has fewer stations.`;
  $("station-table").innerHTML = r.stations.map(s =>
    `<tr><td>${escapeHTML(s.name)}<small>${escapeHTML(s.id)}</small></td><td>${s.state}</td><td>${s.old.toFixed(1)}″</td><td>${s.new.toFixed(1)}″</td><td>${pct(100 * (s.new / s.old - 1))}</td><td>${s.n_old} / ${s.n_new}</td></tr>`).join("");
  const interval = ci => `${pct(ci[0])} to ${pct(ci[1])}`;
  $("uncertainty").textContent = `The 95% interval is ${interval(r.ci)} when individual years are resampled, and ${interval(r.block_ci)} with five-year blocks. ${crossesZero(r.ci) && crossesZero(r.block_ci) ? "Both include zero. The observed difference could reflect year-to-year and multi-year variability." : "An interval that includes zero does not clearly distinguish a difference from temporal variability."} These intervals also don’t account for station selection or changes in measurement practices.`;
  $("sensitivity").innerHTML = r.sensitivity.map(s =>
    `<tr><td>${Math.round(s.monthly_coverage * 100)}%${s.monthly_coverage === .95 ? " (main result)" : ""}</td><td>${s.stations}</td><td>${s.change === null ? "Not all states represented" : pct(s.change)}</td></tr>`).join("");
  $("selection").textContent = `${r.candidate_count} stations met the endpoint rules; ${r.station_count} passed the main completeness tests.`;
  const version = r.version.match(/3\.\d+-upd-\d+/)?.[0] || r.version;
  $("snapshot").textContent = `Downloaded ${r.retrieved}. GHCN-Daily version ${version}. NOAA updates this dataset, including historical observations. File hashes in the download below identify the exact inputs used here.`;
  function draw() { timeline(r); statesChart(r); intervals(r); }
  draw();
  // Redraw at the actual display width, keeping SVG text readable on small screens.
  if ("ResizeObserver" in window) {
    let previous = $("timeline").clientWidth;
    new ResizeObserver(() => {
      const width = $("timeline").clientWidth;
      if (Math.abs(width - previous) > 1) { previous = width; draw(); }
    }).observe($("timeline"));
  }
}

render().catch(error => {
  const notice = document.createElement("p");
  notice.className = "scope-note";
  notice.textContent = `The interactive results could not load (${error.message}). The published summary above is still available. Use the JSON or CSV downloads below, or serve the page over HTTP if viewing locally.`;
  $("verdict").after(notice);
  console.error(error);
});
