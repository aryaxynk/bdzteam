(()=>{'use strict';
const $=id=>document.getElementById(id);
const tok=()=>sessionStorage.getItem('bdz_t')||'';

async function loadMonthChart(){
  if(!tok()) return;
  const dash=$('pg-dash');
  if(!dash) return;
  // Allow load even if not active yet (just after login)
  try{
    const x=await BDZ.rpc('bdz_admin_chart',{p_token:tok()});
    if(!x||!x.ok) return;
    ensureChartLayout(x);
    drawMonthChart(x.series||[], x);
  }catch(e){
    console.warn('loadMonthChart', e);
  }
}

function ensureChartLayout(x){
  let card=document.querySelector('#pg-dash .tile-chart')||document.querySelector('#pg-dash .card');
  if(!card){
    // DOM not ready — retry shortly
    setTimeout(()=>{ if(tok()) loadMonthChart(); }, 120);
    return;
  }
  if(card.dataset.monthChart!=='1'){
    card.dataset.monthChart='1';
    card.innerHTML=
      '<div class="section-head"><div>'+
      '<h2>Thống kê theo tháng <span id="chartMonthLabel" style="font-weight:600;color:var(--muted-fg,var(--muted));font-size:14px"></span></h2>'+
      '<p class="hint">Mỗi chấm = 1 ngày · Hover/chạm để xem số key lấy thành công</p>'+
      '</div></div>'+
      '<div style="position:relative;width:100%;margin-bottom:14px">'+
      '<svg id="chart" viewBox="0 0 640 240" width="100%" height="220" style="display:block"></svg>'+
      '<div id="chartTip" style="display:none;position:absolute;pointer-events:none;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:12px;z-index:5;white-space:nowrap"></div>'+
      '</div>'+
      '<div class="chart-mini-stats">'+
      '<div class="stat chart-mini"><b>Hôm nay</b><strong id="sTodayKeys">0</strong><span class="meta-item">key đã lấy</span></div>'+
      '<div class="stat chart-mini"><b>Cả tháng</b><strong id="sMonthKeys">0</strong><span class="meta-item">key</span></div>'+
      '</div>';
  }
  const lab=$('chartMonthLabel'); if(lab) lab.textContent=x.month_label||'';
  const t=$('sTodayKeys'); if(t) t.textContent=String(x.today||0);
  const m=$('sMonthKeys'); if(m) m.textContent=String(x.month_total||0);
}

function drawMonthChart(series){
  const svg=$('chart');
  if(!svg) return;
  svg.dataset.monthOwned='1';
  const tip=$('chartTip');
  const W=640, H=240, padL=36, padR=16, padT=24, padB=40;
  const data=(series||[]).map(s=>({day:s.day, keys:Number(s.keys||0)}));
  if(!data.length){
    svg.innerHTML='<text x="320" y="120" text-anchor="middle" fill="currentColor" opacity=".45" font-size="13">Chưa có dữ liệu</text>';
    return;
  }
  const n=data.length;
  const maxV=Math.max(1, ...data.map(d=>d.keys));
  const pts=data.map((d,i)=>{
    const x=padL+(W-padL-padR)*(n===1?0.5:i/(n-1));
    const y=padT+(H-padT-padB)*(1-d.keys/maxV);
    return [x,y];
  });
  let html='';
  const gridN=4;
  for(let g=0;g<=gridN;g++){
    const y=padT+(H-padT-padB)*(g/gridN);
    const val=Math.round(maxV*(1-g/gridN));
    html+='<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="currentColor" opacity=".08"/>';
    html+='<text x="'+(padL-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="currentColor" opacity=".45">'+val+'</text>';
  }
  let line='';
  for(let i=0;i<pts.length;i++){
    line+=(i?' L':'M')+pts[i][0].toFixed(1)+','+pts[i][1].toFixed(1);
  }
  const last=pts[pts.length-1], first=pts[0];
  const area=line+' L'+last[0].toFixed(1)+','+(H-padB)+' L'+first[0].toFixed(1)+','+(H-padB)+' Z';
  html+='<path d="'+area+'" fill="var(--md-primary)" opacity=".1"/>';
  html+='<path d="'+line+'" fill="none" stroke="var(--md-primary)" stroke-width="2.5" stroke-linejoin="round"/>';
  for(let i=0;i<data.length;i++){
    const cx=pts[i][0], cy=pts[i][1];
    html+='<circle class="chart-dot" data-i="'+i+'" cx="'+cx+'" cy="'+cy+'" r="5" fill="var(--md-primary)" stroke="var(--card)" stroke-width="2" style="cursor:pointer"/>';
    html+='<circle class="chart-hit" data-i="'+i+'" cx="'+cx+'" cy="'+cy+'" r="14" fill="transparent" style="cursor:pointer"/>';
    if(i%Math.max(1,Math.floor(n/8))===0||i===n-1){
      const label=String(data[i].day).slice(8);
      html+='<text x="'+cx+'" y="'+(H-14)+'" text-anchor="middle" font-size="10" fill="currentColor" opacity=".55">'+label+'</text>';
    }
  }
  svg.innerHTML=html;
  function showTip(i){
    if(!tip||i<0||i>=data.length) return;
    const d=data[i];
    const dd=String(d.day).slice(8)+'/'+String(d.day).slice(5,7);
    tip.style.display='block';
    tip.innerHTML='<b>'+dd+'</b><br>Lấy key: <b>'+d.keys+'</b>';
    const rect=svg.getBoundingClientRect();
    const scaleX=rect.width/W, scaleY=rect.height/H;
    let left=pts[i][0]*scaleX+8;
    let top=pts[i][1]*scaleY-36;
    if(left+120>rect.width) left=pts[i][0]*scaleX-120;
    if(top<0) top=pts[i][1]*scaleY+12;
    tip.style.left=left+'px'; tip.style.top=top+'px';
  }
  function hideTip(){ if(tip) tip.style.display='none'; }
  svg.querySelectorAll('.chart-hit, .chart-dot').forEach(el=>{
    el.addEventListener('mouseenter',()=>showTip(+el.dataset.i));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('click',()=>showTip(+el.dataset.i));
  });
}

// Public API for admin-logic after login / refresh
window.loadMonthChart=loadMonthChart;
window.drawChart=function(series){ drawMonthChart(series||[]); };

setInterval(loadMonthChart, 30000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) loadMonthChart(); });
document.addEventListener('bdz:admin-ready',()=>{ loadMonthChart(); });

// Boot: wait for shell DOM, then load if already logged in
(async()=>{
  for(let i=0;i<50;i++){
    if($('pg-dash')) break;
    await new Promise(r=>setTimeout(r,100));
  }
  if(tok()) loadMonthChart();
})();
})();
