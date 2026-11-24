const $ = id => document.getElementById(id);
const pct = n => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
const names = {CT:"Connecticut", MA:"Massachusetts", ME:"Maine", NH:"New Hampshire", RI:"Rhode Island", VT:"Vermont"};
const svg = (label, content, height = 330) => `<svg role="img" aria-label="${label}" viewBox="0 0 800 ${height}"><title>${label}</title>${content}</svg>`;
const line = (x1,y1,x2,y2,stroke="#dce2dc",extra="") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" ${extra}/>`;
const text = (x,y,label,extra="") => `<text x="${x}" y="${y}" ${extra}>${label}</text>`;

async function render() {
  const response = await fetch("assets/results.json");
  if (!response.ok) throw new Error(`Results request failed (${response.status})`);
  const r = await response.json();
  const less = r.change < 0;
  $("verdict").innerHTML = `<strong>${less ? "Yes" : "No"} — ${less ? "less" : "not less"} snowfall in this comparison.</strong><p>Our state-balanced station index shows <b>${Math.abs(r.change).toFixed(1)}% ${less ? "less" : "more"}</b> annual snowfall in 2000–2019 than in 1940–1999. This is a descriptive answer, not proof that every place changed—or that the difference exceeds natural variability.</p>`;
  $("metrics").innerHTML = [
    [pct(r.change),"state-balanced change"],
    [r.station_count,"long-record stations · 6 states"],
    ["60 : 20","years in the two comparison periods"]
  ].map(([n,label]) => `<div class="metric"><b>${n}</b><span>${label}</span></div>`).join("");

  const vals = r.series.filter(d=>d.anomaly!==null);
  const lo = Math.floor(Math.min(-20,...vals.map(d=>d.anomaly))/20)*20;
  const hi = Math.ceil(Math.max(20,...vals.map(d=>d.anomaly))/20)*20;
  const x = year => 60+(year-1940)/79*715;
  const y = v => 265-(v-lo)/(hi-lo)*230;
  let chart = `<rect x="${x(2000)}" y="20" width="${775-x(2000)}" height="245" fill="#f3e4d7"/>`;
  for(let v=lo;v<=hi;v+=20) {
    chart += line(60,y(v),775,y(v),v===0?"#7c9691":"#dce2dc");
    chart += text(48,y(v)+4,`${v>0?"+":""}${v}%`,'text-anchor="end"');
  }
  for(const year of [1940,1960,1980,2000,2019]) chart+=text(x(year),289,year,'text-anchor="middle"');
  chart+=text(64,15,"Relative to station baseline");
  chart+=text(x(2000)+10,36,"2000–2019");
  // Separate segments at missing regional years rather than bridging gaps.
  let drawing=false, path="";
  for(const d of r.series) {
    if(d.anomaly===null){drawing=false;continue;}
    path+=`${drawing?"L":"M"}${x(d.year).toFixed(2)},${y(d.anomaly).toFixed(2)} `;
    drawing=true;
  }
  chart+=`<path d="${path}" fill="none" stroke="#286c6c" stroke-width="2.5" stroke-linejoin="round"/>`;
  $("timeline").innerHTML=svg("New England annual snowfall anomalies, 1940–2019",chart,310);
  const negative=Object.entries(r.states).filter(([,v])=>v<0);
  $("state-summary").textContent=`${negative.length} of the six state samples had lower later-period snowfall${negative.length ? ` (${negative.map(([s])=>names[s]).join(", ")})`:""}. The station table below makes the differences—and the sampling coverage—visible.`;
  const max=Math.max(10,...Object.values(r.states).map(Math.abs))*1.3;
  const sx=v=>450+v/max*230;
  chart=line(sx(0),15,sx(0),310,"#8aa19b");
  Object.entries(r.states).forEach(([state,v],i)=>{
    const yy=36+i*48;
    chart+=text(10,yy+5,names[state]);
    chart+=`<rect x="${Math.min(sx(0),sx(v))}" y="${yy-11}" width="${Math.abs(sx(v)-sx(0))}" height="23" fill="${v<0?"#bf613b":"#286c6c"}"/>`;
    chart+=text(v<0?sx(v)-9:sx(v)+9,yy+5,pct(v),`text-anchor="${v<0?"end":"start"}"`);
  });
  chart+=text(sx(0),330,"0%",'text-anchor="middle"');
  $("states-chart").innerHTML=svg("Percent change in annual snowfall for each New England state",chart,345);
  $("station-table").innerHTML=r.stations.map(s=>`<tr><td>${s.name}<small>${s.id}</small></td><td>${s.state}</td><td>${s.old.toFixed(1)}″</td><td>${s.new.toFixed(1)}″</td><td>${pct(100*(s.new/s.old-1))}</td><td>${s.n_old} / ${s.n_new}</td></tr>`).join("");
  const interval=a=>`${pct(a[0])} to ${pct(a[1])}`;
  const crosses=r.block_ci[0]<=0 && r.block_ci[1]>=0;
  $("uncertainty").textContent=`The year-resampling 95% bootstrap interval is ${interval(r.ci)}. With five-year blocks, it is ${interval(r.block_ci)}. ${crosses ? "That block interval includes zero: the observed direction is not strong evidence of a persistent difference beyond year-to-year and multi-year variability." : "The block interval excludes zero, suggesting a difference beyond the temporal variability represented by this resampling."} Neither interval includes uncertainty from station selection or changes in observation practices.`;
  $("sensitivity").innerHTML=r.sensitivity.map(s=>`<tr><td>${Math.round(s.monthly_coverage*100)}%${s.monthly_coverage===.95?" (primary)":""}</td><td>${s.stations}</td><td>${s.change===null?"Not all six states represented":pct(s.change)}</td></tr>`).join("");
  $("selection").textContent=`${r.candidate_count} stations met those endpoint rules; ${r.station_count} passed the primary completeness tests.`;
  $("snapshot").textContent=`NOAA snapshot retrieved ${r.retrieved}; ${r.version.replace(/\s+/g," ").replace(/\.$/,"")}. GHCN is updated over time, so a fresh download can differ from this published snapshot. Source file hashes identify the inputs used here.`;
}
render().catch(error=>{
  $("verdict").textContent=`The evidence could not be loaded: ${error.message}. Please use the linked JSON and CSV files, or serve this page over HTTP rather than opening it as a local file.`;
  console.error(error);
});
