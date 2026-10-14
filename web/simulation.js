/* Synthetic 36-link finite-storage network. Fluid vehicles; uncalibrated. */
(function(root){
 const dt=1/6, strategies=['none','signal','reroute','combined'];
 const links=Array.from({length:36},(_,i)=>{const column=Math.floor(i/6),row=i%6;return {linkId:'sim-'+i,key:'R'+String(i+1).padStart(2,'0'),roadName:'R'+String(i+1).padStart(2,'0')+' · '+['진입','분산','생활권','병목','합류','출구'][column]+' 가상 도로',column,row,lat:35.17+row*.014,lng:128.77+column*.022,capacity:column===3?42:54,storage:column===3?45:65,freeSpeed:column%2?40:50,length:.5,signal:column===2||column===4,next:column===5?[]:[row,...(row<5?[row+1]:[row-1])].map(r=>(column+1)*6+r)};});
 const presets={normal:{label:'평시',demand:1},peak:{label:'아침 출근',demand:1.5},evening:{label:'저녁 퇴근',demand:1.4},school:{label:'등교 집중',demand:1.2},incident:{label:'단일 사고',demand:1.2},construction:{label:'도로 공사',demand:1.1},rain:{label:'폭우',demand:1.1},festival:{label:'행사 종료',demand:1.4},signalFailure:{label:'신호 고장',demand:1.2},multi:{label:'동시 사고 3곳',demand:1.3},heavy:{label:'고수요 + 공사',demand:1.8},compound:{label:'폭우 + 사고 + 신호 고장',demand:1.5}};
 function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
 const total=(a,k)=>a.reduce((n,s)=>n+s[k],0);
 function makeBranch(){return {links:links.map(()=>({queue:0,transit:[],arrivals:0,departures:0,delay:0,source:0,occupancy:0,blocked:0,green:true,lastFlow:0})),generated:0,exited:0,sourceDelay:0,totalTime:0,peakQueue:0};}
 function effects(scenario,minute,manual){const factors=links.map(()=>1),failed=new Set(),events=[];const event=(ids,factor,label)=>{ids.forEach(i=>factors[i]*=factor);events.push({label,links:ids.map(i=>links[i].key)});};
  if(manual.incident)event([Math.max(0,Math.min(links.length-1,Number(manual.target)||20))],.45,'수동 사고');
  if(minute>=20&&minute<75){if(['incident','compound'].includes(scenario))event([20],.45,'병목 사고');if(scenario==='multi')event([13,20,28],.45,'동시 사고');}
  if(['construction','heavy'].includes(scenario))event([18,19],.6,'2개 구간 공사');
  if(['rain','compound'].includes(scenario))event(links.map((_,i)=>i),.75,'폭우 · 전체 처리용량 저하');
  if(['signalFailure','compound'].includes(scenario)&&minute>=30&&minute<90){failed.add(14);failed.add(26);events.push({label:'신호 고장 · 안전 정지',links:['R15','R27']});}
  return {factors,failed,events};
 }
 class Experiment{
  constructor(seed=42){this.seed=seed>>>0;this.random=rng(this.seed);this.minute=0;this.tick=0;this.branches=Object.fromEntries(strategies.map(k=>[k,makeBranch()]));this.baseline=this.branches.none;this.response=this.branches.none;this.strategyHistory=[];this.history=[];this.events=[];this.lastOptions={demand:1,scenario:'normal',strategy:'none',incident:false,target:20};}
  advance(branch,arrivals,options,strategy,effect){const states=branch.links;
   states.forEach((s,i)=>{s.source+=arrivals[i];branch.generated+=arrivals[i];const ready=s.transit.filter(p=>p.tick<=this.tick);s.queue+=ready.reduce((n,p)=>n+p.count,0);s.transit=s.transit.filter(p=>p.tick>this.tick);});
   const space=links.map((l,i)=>Math.max(0,l.storage-states[i].queue-states[i].transit.reduce((n,p)=>n+p.count,0)));
   const phase=(this.tick*10)%90;
   const greens=links.map((l,i)=>{if(effect.failed.has(i))return 0;if(!l.signal)return 1;const extended=['signal','combined'].includes(strategy)&&states[i].queue>8;return Math.max(0,Math.min(10,(extended?60:45)-phase))/10;});
   const sending=states.map((s,i)=>Math.min(s.queue,links[i].capacity*effect.factors[i]*dt*greens[i]));
   const shares=links.map(l=>{if(!l.next.length)return [];if(!['reroute','combined'].includes(strategy))return l.next.map(()=>1/l.next.length);const costs=l.next.map(i=>states[i].occupancy/links[i].storage+states[i].queue/links[i].capacity+(1-effect.factors[i])+ (effect.failed.has(i)?2:0));const weights=costs.map(cost=>1/(.15+cost));const sum=weights.reduce((a,b)=>a+b,0);return weights.map(v=>v/sum);});
   const requested=links.map(()=>0);links.forEach((l,i)=>l.next.forEach((target,k)=>requested[target]+=sending[i]*shares[i][k]));
   const receiveFactor=requested.map((n,i)=>n?Math.min(1,space[i]/n):1);
   const outgoing=links.map((l,i)=>sending[i]*(l.next.length?Math.min(...l.next.map(t=>receiveFactor[t])):1));
   const enter=(i,n)=>{if(n<=0)return;states[i].transit.push({tick:this.tick+Math.max(1,Math.ceil(links[i].length/links[i].freeSpeed*60/dt)),count:n});states[i].arrivals+=n;};
   states.forEach((s,i)=>{s.queue=Math.max(0,s.queue-outgoing[i]);s.departures+=outgoing[i];s.green=greens[i]>0;s.lastFlow=outgoing[i]/dt;s.blocked=Math.max(0,sending[i]-outgoing[i]);});
   links.forEach((l,i)=>{if(!l.next.length)branch.exited+=outgoing[i];l.next.forEach((target,k)=>{const n=outgoing[i]*shares[i][k];enter(target,n);space[target]-=n;});});
   states.forEach((s,i)=>{const n=Math.min(s.source,Math.max(0,space[i]));s.source-=n;enter(i,n);s.occupancy=s.queue+s.transit.reduce((a,p)=>a+p.count,0);s.delay+=s.queue*dt;branch.sourceDelay+=s.source*dt;branch.totalTime+=(s.occupancy+s.source)*dt;});branch.peakQueue=Math.max(branch.peakQueue,total(states,'queue')+total(states,'source'));
  }
  step(input={}){const options={demand:input.demand??1,scenario:input.scenario||'normal',strategy:input.strategy||(input.response?'combined':'none'),incident:!!input.incident,target:Number(input.target??20)};
   if(!Number.isFinite(options.demand)||options.demand<0||!strategies.includes(options.strategy)||!presets[options.scenario])throw Error('Invalid experiment input');if(this.minute>=120)return;
   if(JSON.stringify(options)!==JSON.stringify(this.lastOptions))this.events.push({minute:this.minute,...options});this.lastOptions=options;
   for(let sub=0;sub<6;sub++){const effect=effects(options.scenario,this.tick/6,options);const pulse=(1+.15*Math.sin(this.tick/72))*(.9+.2*this.random());const arrivals=links.map(l=>{if(l.column!==0)return 0;let demand=13+ l.row%3*2;if(options.scenario==='school'&&l.row<2)demand*=1.5;if(options.scenario==='festival'&&this.minute>=45&&this.minute<65)demand*=1.8;return demand*options.demand*pulse*dt;});strategies.forEach(k=>this.advance(this.branches[k],arrivals,options,k,effect));this.tick++;}
   this.minute++;this.response=this.branches[options.strategy];this.strategyHistory.push(strategies.map(k=>total(this.branches[k].links,'queue')+total(this.branches[k].links,'source')));this.history=this.strategyHistory.map(p=>[p[0],p[strategies.indexOf(options.strategy)]]);
  }
  snapshot(){const metric=b=>({generated:b.generated,exited:b.exited,inNetwork:total(b.links,'occupancy'),outside:total(b.links,'source'),waiting:total(b.links,'queue')+total(b.links,'source'),delay:total(b.links,'delay')+b.sourceDelay,totalVehicleTime:b.totalTime,peakQueue:b.peakQueue,balanceError:b.generated-b.exited-total(b.links,'occupancy')-total(b.links,'source')});const metrics=Object.fromEntries(strategies.map(k=>[k,metric(this.branches[k])]));const selected=this.lastOptions.strategy;const branch=this.branches[selected];const effect=effects(this.lastOptions.scenario,this.minute,this.lastOptions);
   return {model:'synthetic-36-link-network-v3',seed:this.seed,minute:this.minute,options:{...this.lastOptions},baselineDelay:metrics.none.delay,responseDelay:metrics[selected].delay,baseline:metrics.none,response:metrics[selected],strategies:metrics,history:this.history.map(p=>p.slice()),strategyHistory:this.strategyHistory.map(p=>p.slice()),events:this.events.map(p=>({...p})),activeEvents:effect.events,assumptions:{links:36,timeStepSeconds:10,cycleSeconds:90,baseGreenSeconds:45,adaptiveGreenSeconds:60,network:'six columns × six corridors; directed eastbound branching and merging',calibrated:false,fluidFlow:true},rows:links.map((l,i)=>{const s=branch.links[i];const cap=l.capacity*effect.factors[i]*(l.signal?.5:1);const wait=s.queue/Math.max(.1,cap);const speed=Math.round(l.length/(l.length/l.freeSpeed+wait/60)*10)/10;return {...l,speed,queue:+s.queue.toFixed(1),occupancy:+s.occupancy.toFixed(1),sourceQueue:+s.source.toFixed(1),green:s.green,blocked:+s.blocked.toFixed(2),flow:+s.lastFlow.toFixed(1),incident:effect.factors[i]<1||effect.failed.has(i),arrivals:s.arrivals,departures:s.departures,level:speed<20?'혼잡':speed<40?'서행':'원활',createdDate:'모의 '+this.minute+'분',recommendation:'대기 '+s.queue.toFixed(1)+'대 · 점유 '+(s.occupancy/l.storage*100).toFixed(0)+'%'+(s.blocked>0?' · 하류 제한':'')};}).sort((a,b)=>a.speed-b.speed)};
  }
 }
 function compare(options,seeds=[11,22,33,44,55]){return seeds.map(seed=>{const e=new Experiment(seed);for(let i=0;i<120;i++)e.step(options);return e.snapshot();});}
 function configure(actual){if(!actual.links||!actual.links.length)throw Error('Actual road geometry required');links.splice(0,links.length,...actual.links);}
 const api={Experiment,compare,links,presets,strategies,configure};if(typeof module!=='undefined')module.exports=api;root.CitySimulation=api;
})(typeof window!=='undefined'?window:globalThis);
