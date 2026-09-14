(()=>{'use strict';
const $=id=>document.getElementById(id);
const tok=()=>sessionStorage.getItem('bdz_t')||'';

async function loadMonthChart(){
  if(!tok()||!$('pg-dash')) return;
  try{
    const x=await BDZ.rpc('bdz_admin_chart',{p_token:tok()});
    if(!x?.ok) return;
    ensureChartLayout(x);
    drawMonthChart(x.series||[], x);
  }catch(e){}
}
function ensureChartLayout(x){
  const card=document.querySelector('#pg-dash .card');
  if(!card) return;
  if(card.dataset.monthChart==='1'){
    const t=$('sTodayKeys'); if(t) t.textContent=String(x.today||0);
    const m=$('sMonthKeys'); if(m) m.textContent=String(x.month_total||0);
    const lab=$('chartMonthLabel'); if(lab) lab.textContent=x.month_label||'';
    return;
  }
  card.dataset.monthChart='1';
  card.innerHTML=
    '<div class="section-head"><div>'+
    '<h2>Thống kê theo tháng <span id="chartMonthLabel" style="font-weight:600;color:var(--muted);font-size:14px"></span></h2>'+
    '<p class="hint">Mỗi chấm = 1 ngày · Hover/chạm để xem số key lấy thành công</p>'+
    '</div></div>'+
    '<div style="display:flex;gap:12px;align-items:stretch;flex-wrap:wrap">'+
    '<div style="flex:1;min-width:260px;position:relative">'+
    '<svg id="chartMonth" viewBox="0 0 640 240" width="100%" height="240" style="display:block"></svg>'+
    '<div id="chartTip" style="display:none;position:absolute;pointer-events:none;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:12px;box-shadow:var(--shadow);z-index:5;white-space:nowrap"></div>'+
    '</div>'+
    '<div style="width:140px;display:flex;flex-direction:column;gap:10px;justify-content:center">'+
    '<div class="stat" style="margin:0;text-align:center"><b>Hôm nay</b><strong id="sTodayKeys" style="font-size:28px;display:block;margin-top:4px">0</strong><span style="font-size:11px;color:var(--muted)">key đã lấy</span></div>'+
    '<div class="stat" style="margin:0;text-align:center"><b>Cả tháng</b><strong id="sMonthKeys" style="font-size:22px;display:block;margin-top:4px">0</strong><span style="font-size:11px;color:var(--muted)">key</span></div>'+
    '</div></div>';
  $('chartMonthLabel').textContent=x.month_label||'';
  $('sTodayKeys').textContent=String(x.today||0);
  $('sMonthKeys').textContent=String(x.month_total||0);
}
function drawMonthChart(series){
  const svg=$('chartMonth'); if(!svg) return;
  const tip=$('chartTip');
  const W=640, H=240, padL=36, padR=16, padT=24, padB=40;
  const data=(series||[]).map(s=>({
    day:s.day,
    label:s.label||String(s.day).slice(8,10),
    keys:Number(s.keys||0)
  }));
  if(!data.length){
    svg.innerHTML='<text x="320" y="120" text-anchor="middle" fill="currentColor" font-size="13" opacity=".45">Chưa có dữ liệu</text>';
    return;
  }
  const max=Math.max(1,...data.map(d=>d.keys));
  const n=data.length;
  const xAt=i=>padL+(i/Math.max(n-1,1))*(W-padL-padR);
  const yAt=v=>padT+(1-v/max)*(H-padT-padB);
  let html='';
  for(let g=0;g<=4;g++){
    const y=padT+(g/4)*(H-padT-padB);
    const val=Math.round(max*(1-g/4));
    html+='<line x1="'+padL+'" y1="'+y+'" x2="'+(W-padR)+'" y2="'+y+'" stroke="var(--border)" stroke-width="1"/>';
    html+='<text x="'+(padL-6)+'" y="'+(y+3)+'" text-anchor="end" font-size="10" fill="currentColor" opacity=".5">'+val+'</text>';
  }
  const pts=data.map((d,i)=>[xAt(i),yAt(d.keys)]);
  let line='';
  for(let i=0;i<pts.length;i++) line+=(i?'L':'M')+pts[i][0].toFixed(1)+','+pts[i][1].toFixed(1);
  const last=pts[pts.length-1], first=pts[0];
  const area=line+' L'+last[0].toFixed(1)+','+(H-padB)+' L'+first[0].toFixed(1)+','+(H-padB)+' Z';
  html+='<path d="'+area+'" fill="#2563eb" opacity=".12"/>';
  html+='<path d="'+line+'" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round"/>';
  const step=Math.max(1,Math.floor(n/10));
  for(let i=0;i<data.length;i++){
    const cx=pts[i][0], cy=pts[i][1];
    html+='<circle class="chart-dot" data-i="'+i+'" cx="'+cx+'" cy="'+cy+'" r="5" fill="#2563eb" stroke="var(--card)" stroke-width="2" style="cursor:pointer"/>';
    html+='<circle class="chart-hit" data-i="'+i+'" cx="'+cx+'" cy="'+cy+'" r="14" fill="transparent" style="cursor:pointer"/>';
    if(i%step===0||i===n-1){
      html+='<text x="'+cx+'" y="'+(H-14)+'" text-anchor="middle" font-size="10" fill="currentColor" opacity=".55">'+data[i].label+'</text>';
    }
  }
  svg.innerHTML=html;
  function showTip(i){
    if(!tip||i<0||i>=data.length) return;
    const d=data[i];
    const parts=String(d.day).split('-');
    const dd=(parts[2]||d.label)+'/'+(parts[1]||'');
    tip.style.display='block';
    tip.innerHTML='<b>'+dd+'</b><br>Lấy key: <b>'+d.keys+'</b>';
    const rect=svg.getBoundingClientRect();
    const scaleX=rect.width/W, scaleY=rect.height/H;
    let left=pts[i][0]*scaleX+8;
    let top=pts[i][1]*scaleY-36;
    if(left+120>rect.width) left=pts[i][0]*scaleX-120;
    if(top<0) top=pts[i][1]*scaleY+12;
    tip.style.left=left+'px';
    tip.style.top=top+'px';
  }
  function hideTip(){ if(tip) tip.style.display='none'; }
  svg.querySelectorAll('.chart-hit,.chart-dot').forEach(el=>{
    el.addEventListener('mouseenter',()=>showTip(+el.dataset.i));
    el.addEventListener('mouseleave',hideTip);
    el.addEventListener('click',()=>showTip(+el.dataset.i));
  });
}
setInterval(loadMonthChart,5000);
[200,600,1200,2500].forEach(ms=>setTimeout(loadMonthChart,ms));
(async()=>{
  for(let i=0;i<40;i++){ if($('pg-dash')) break; await new Promise(r=>setTimeout(r,100)); }
  if(tok()) loadMonthChart();
})();
})();
