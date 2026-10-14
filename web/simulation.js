/* Finite-storage fluid link queues with free-flow transit and signal gates.
   Research-informed demonstrator, not SUMO and not calibrated to Gimhae. */
(function(root){
 const links=[
  {linkId:'demo-1',key:'A',roadName:'A · 장유 가상 병목',lat:35.203,lng:128.812,capacity:48,storage:90,freeSpeed:50,length:.6},
  {linkId:'demo-2',key:'B',roadName:'B · 율하 가상 우회',lat:35.174,lng:128.815,capacity:32,storage:70,freeSpeed:40,length:.9},
  {linkId:'demo-3',key:'C',roadName:'C · 김해 가상 합류',lat:35.229,lng:128.881,capacity:80,storage:100,freeSpeed:50,length:.7},
  {linkId:'demo-4',key:'D',roadName:'D · 관동 가상 진입',lat:35.185,lng:128.8,capacity:44,storage:100,freeSpeed:40,length:.5}
 ];
 const dt=1/6, sum=(a,k)=>a.reduce((v,s)=>v+s[k],0);
 function rng(seed){let state=seed>>>0;return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
 function makeBranch(){return {links:links.map(()=>({queue:0,transit:[],arrivals:0,departures:0,delay:0,source:0,occupancy:0,blocked:0,green:true,lastFlow:0})),generated:0,exited:0,sourceDelay:0,totalTime:0,peakQueue:0};}
 class Experiment{
  constructor(seed=42){this.seed=seed>>>0;this.random=rng(this.seed);this.minute=0;this.tick=0;this.baseline=makeBranch();this.response=makeBranch();this.history=[];this.events=[];this.lastOptions={demand:1,incident:false,response:false};}
  advance(branch,arrivals,options,treatment){
   const states=branch.links;
   // All source demand remains accounted for even when entry is blocked.
   states.forEach((s,i)=>{s.source+=arrivals[i];branch.generated+=arrivals[i];const arrived=s.transit.filter(p=>p.tick<=this.tick);s.queue+=arrived.reduce((n,p)=>n+p.count,0);s.transit=s.transit.filter(p=>p.tick>this.tick);});
   const occupancy=states.map(s=>s.queue+s.transit.reduce((n,p)=>n+p.count,0));
   const space=links.map((l,i)=>Math.max(0,l.storage-occupancy[i]));
   const phase=(this.tick*10)%90;
   const greenShare=states.map((s,i)=>{const duration=i===0?(treatment?55:40):i===2?55:90;return Math.max(0,Math.min(10,duration-phase))/10;});const green=greenShare.map(v=>v>0);
   const sending=states.map((s,i)=>Math.min(s.queue,links[i].capacity*dt*(options.incident&&i===0?.45:1)*greenShare[i]));
   const ratio=treatment?.6:.8;
   const out=[0,0,sending[2],0];
   // A and B share downstream receiving space proportionally.
   const merged=sending[0]+sending[1];const factor=merged?Math.min(1,space[2]/merged):0;
   out[0]=sending[0]*factor;out[1]=sending[1]*factor;space[2]-=out[0]+out[1];
   out[3]=Math.min(sending[3],space[0]/ratio,space[1]/(1-ratio));
   space[0]-=out[3]*ratio;space[1]-=out[3]*(1-ratio);
   const enter=(i,count)=>{if(count<=0)return;states[i].transit.push({tick:this.tick+Math.max(1,Math.ceil(links[i].length/links[i].freeSpeed*60/dt)),count});states[i].arrivals+=count;};
   states.forEach((s,i)=>{s.queue=Math.max(0,s.queue-out[i]);s.departures+=out[i];s.green=green[i];s.lastFlow=out[i]/dt;s.blocked=Math.max(0,sending[i]-out[i]);});
   enter(0,out[3]*ratio);enter(1,out[3]*(1-ratio));enter(2,out[0]+out[1]);branch.exited+=out[2];
   states.forEach((s,i)=>{const admitted=Math.min(s.source,space[i]);s.source-=admitted;enter(i,admitted);s.occupancy=s.queue+s.transit.reduce((n,p)=>n+p.count,0);s.delay+=s.queue*dt;branch.sourceDelay+=s.source*dt;branch.totalTime+=(s.occupancy+s.source)*dt;});
   branch.peakQueue=Math.max(branch.peakQueue,sum(states,'queue')+sum(states,'source'));
  }
  step({demand=1,incident=false,response=false}={}){
   if(!Number.isFinite(demand)||demand<0)throw Error('Invalid demand');if(this.minute>=120)return;
   const options={demand,incident,response};if(JSON.stringify(options)!==JSON.stringify(this.lastOptions)){this.events.push({minute:this.minute,...options});this.lastOptions=options;}
   for(let sub=0;sub<6;sub++){
    const pulse=(1+.2*Math.sin(this.tick/72))*(.9+.2*this.random());
    const arrivals=[0,6,2,28].map(v=>v*demand*pulse*dt);
    this.advance(this.baseline,arrivals,options,false);this.advance(this.response,arrivals,options,response);this.tick++;
   }
   this.minute++;this.history.push([sum(this.baseline.links,'queue')+sum(this.baseline.links,'source'),sum(this.response.links,'queue')+sum(this.response.links,'source')]);
  }
  snapshot(){
   const metric=b=>({generated:b.generated,exited:b.exited,inNetwork:sum(b.links,'occupancy'),outside:sum(b.links,'source'),waiting:sum(b.links,'queue')+sum(b.links,'source'),delay:sum(b.links,'delay')+b.sourceDelay,totalVehicleTime:b.totalTime,peakQueue:b.peakQueue,balanceError:b.generated-b.exited-sum(b.links,'occupancy')-sum(b.links,'source')});
   const base=metric(this.baseline),response=metric(this.response);
   return {model:'finite-storage-link-queues-v2',seed:this.seed,minute:this.minute,baselineDelay:base.delay,responseDelay:response.delay,baseline:base,response,history:this.history.map(p=>p.slice()),events:this.events.map(p=>({...p})),assumptions:{timeStepSeconds:10,cycleSeconds:90,greenASeconds:40,greenAResponseSeconds:55,greenCSeconds:55,incidentCapacityFactor:.45,diversionShare:.2,network:'D → A/B → C → exit; external arrivals at D/B/C',calibrated:false},rows:links.map((l,i)=>{const s=this.response.links[i];const wait=s.queue/Math.max(1,l.capacity*(i===0?(this.lastOptions.response?55:40)/90:i===2?55/90:1)*(this.lastOptions.incident&&i===0?.45:1));const speed=Math.round(l.length/(l.length/l.freeSpeed+wait/60)*10)/10;return {...l,speed,queue:+s.queue.toFixed(1),occupancy:+s.occupancy.toFixed(1),sourceQueue:+s.source.toFixed(1),green:s.green,blocked:+s.blocked.toFixed(2),flow:+s.lastFlow.toFixed(1),arrivals:s.arrivals,departures:s.departures,level:speed<20?'혼잡':speed<40?'서행':'원활',createdDate:'모의 '+this.minute+'분',recommendation:'대기 '+s.queue.toFixed(1)+'대 · 점유 '+(s.occupancy/l.storage*100).toFixed(0)+'%'+(s.blocked>0?' · 하류 진입 제한':'')};}).sort((a,b)=>a.speed-b.speed)};
  }
 }
 function compare(options,seeds=[11,22,33,44,55]){return seeds.map(seed=>{const experiment=new Experiment(seed);for(let i=0;i<120;i++)experiment.step(options);return experiment.snapshot();});}
 const api={Experiment,compare,links};if(typeof module!=='undefined')module.exports=api;root.CitySimulation=api;
})(typeof window!=='undefined'?window:globalThis);
