'use strict';
const el=id=>document.getElementById(id);
let map, layers, geometry=new Map(), current=null;
if(window.L){map=L.map('map').setView([35.205,128.84],12);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);layers=L.layerGroup().addTo(map);}
else el('map').textContent='지도 라이브러리 연결 실패. 인터넷 연결을 확인하세요.';
const color=level=>level==='혼잡'?'#ef6470':level==='서행'?'#efb75c':'#48bea1';
function cell(parent,text,tag='td'){const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;}
function render(data){
 current=data;const rows=data.rows||[];el('rows').replaceChildren();el('decisions').replaceChildren();if(layers)layers.clearLayers();let mapped=0;
 rows.forEach(row=>{const tr=document.createElement('tr');[row.roadName||row.linkId,row.speed+' km/h',row.level,row.createdDate||'미제공',row.recommendation].forEach(v=>cell(tr,v));el('rows').append(tr);
 const popup=document.createElement('div');popup.textContent=(row.roadName||row.linkId)+' · '+row.speed+' km/h · '+row.level;
 if(map && data.mode==='demo'){L.circleMarker([row.lat,row.lng],{radius:12,color:color(row.level),fillOpacity:.7}).bindPopup(popup).addTo(layers);mapped++;}
 else if(map&&geometry.has(String(row.linkId))){L.geoJSON(geometry.get(String(row.linkId)),{style:{color:color(row.level),weight:6}}).bindPopup(popup).addTo(layers);mapped++;}
 });
 rows.filter(r=>r.level==='혼잡').slice(0,3).forEach(r=>{const d=document.createElement('div');d.className='decision';cell(d,r.roadName||r.linkId,'b');cell(d,r.speed+' km/h 관측. 현장 확인 후 안내 검토. 원인 및 우회 효과는 아직 확인되지 않았습니다.','p');el('decisions').append(d);});
 if(!el('decisions').children.length)el('decisions').textContent=rows.length?'혼잡 기준에 해당하는 구간 없음':'관측 데이터 없음';
 el('count').textContent=rows.length;el('congested').textContent=rows.filter(r=>r.level==='혼잡').length;el('average').textContent=rows.length?(rows.reduce((s,r)=>s+r.speed,0)/rows.length).toFixed(1)+' km/h':'—';el('mapped').textContent=mapped;
 el('data-kind').textContent=data.mode==='demo'?'모의 시나리오':data.mode==='live'?'ITS 실측':'연결 안 됨';
 el('distribution').replaceChildren();
 ['혼잡','서행','원활'].forEach(level=>{const count=rows.filter(r=>r.level===level).length;const row=document.createElement('div');row.className='bar-row';const head=document.createElement('div');head.className='bar-head';cell(head,level,'span');cell(head,count+' 구간','span');const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=(rows.length?count/rows.length*100:0)+'%';fill.style.background=color(level);track.append(fill);row.append(head,track);el('distribution').append(row);});
 el('status').textContent=data.error||`${data.source} · ${data.mode==='demo'?'교통 수치와 위치는 합성 시나리오':('수집 '+data.fetchedAt+' · 지도 결합 '+mapped+'/'+rows.length)}`;
}
const isPages=location.hostname.endsWith('.github.io');
async function refresh(){el('refresh').disabled=true;el('status').textContent='조회 중…';try{if(isPages){if(el('mode').value==='live'){render({mode:'unavailable',rows:[],error:'GitHub Pages는 정적 호스팅입니다. ITS 실시간 조회는 Python 서버에서 실행하세요. API 키를 공개 사이트에 입력하지 마세요.'});return;}const res=await fetch('demo.json');if(!res.ok)throw Error();const rows=(await res.json()).map(r=>({...r,level:r.speed<20?'혼잡':r.speed<40?'서행':'원활',recommendation:r.speed<20?'현장 확인 후 우회 안내 검토':'추가 관측 유지'})).sort((a,b)=>a.speed-b.speed);render({mode:'demo',source:'합성 시나리오 · 실측 아님',fetchedAt:null,rows});}else{const res=await fetch('/api/traffic?mode='+el('mode').value);render(await res.json());}}catch{render({mode:'unavailable',rows:[],error:'데이터 연결 실패. 기존 관측을 지웠습니다.'});}finally{el('refresh').disabled=false;}}
el('refresh').onclick=refresh;el('mode').onchange=refresh;
el('geometry').onchange=async e=>{try{const doc=JSON.parse(await e.target.files[0].text());if(doc.type!=='FeatureCollection'||!Array.isArray(doc.features))throw Error();const next=new Map();for(const f of doc.features){const id=f.properties?.LINK_ID??f.properties?.linkId;if(id!=null&&['LineString','MultiLineString'].includes(f.geometry?.type))next.set(String(id),f);}if(!next.size)throw Error();geometry=next;el('geometry-status').textContent=next.size+'개 도로 링크 연결. 좌표는 WGS84 경위도여야 합니다.';if(current)render(current);}catch{el('geometry-status').textContent='연결 실패: LINK_ID와 WGS84 도로 선형이 있는 GeoJSON을 선택하세요.';}};
el('export').onclick=()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='city-brain-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
refresh();
