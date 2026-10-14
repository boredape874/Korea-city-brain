/* Deterministic point-queue experiment. Hypothetical, uncalibrated parameters. */
(function(root){
 const links=[
  {linkId:'demo-1',roadName:'A · 장유 중심권 가상 구간',lat:35.203,lng:128.812,demand:32,capacity:36,freeSpeed:50,length:1.2},
  {linkId:'demo-2',roadName:'B · 율하 가상 우회 구간',lat:35.174,lng:128.815,demand:18,capacity:28,freeSpeed:40,length:1},
  {linkId:'demo-3',roadName:'C · 김해 중심권 가상 구간',lat:35.229,lng:128.881,demand:28,capacity:32,freeSpeed:50,length:1.5},
  {linkId:'demo-4',roadName:'D · 관동 가상 구간',lat:35.185,lng:128.8,demand:16,capacity:22,freeSpeed:40,length:.8}
 ];
 class Experiment{
  constructor(){this.minute=0;this.baseline=links.map(()=>({queue:0,arrivals:0,departures:0,delay:0,speed:0}));this.response=links.map(()=>({queue:0,arrivals:0,departures:0,delay:0,speed:0}));this.history=[];}
  step({demand=1,incident=false,response=false}={}){
   if(!Number.isFinite(demand)||demand<0)throw Error('Invalid demand');
   if(this.minute>=120)return;
   // Both branches receive exactly the same external arrivals and incident.
   const arrivals=links.map(l=>l.demand*demand*(1+.18*Math.sin(this.minute/12)));
   [this.baseline,this.response].forEach((states,branch)=>{
    const inbound=arrivals.slice();
    if(branch&&response){const diverted=inbound[0]*.2;inbound[0]-=diverted;inbound[1]+=diverted;}
    states.forEach((state,i)=>{const l=links[i];let capacity=l.capacity*(incident&&i===0?.45:1);if(branch&&response&&i===0)capacity*=1.15;
     const before=state.queue;const available=before+inbound[i];const departed=Math.min(available,capacity);
     state.queue=available-departed;state.arrivals+=inbound[i];state.departures+=departed;
     state.delay+=(before+state.queue)/2;
     const wait=capacity>0?state.queue/capacity:Infinity;
     state.speed=l.length/(l.length/l.freeSpeed+wait/60);
    });
   });this.minute++;this.history.push([this.baseline.reduce((s,r)=>s+r.queue,0),this.response.reduce((s,r)=>s+r.queue,0)]);
  }
  snapshot(){return {minute:this.minute,baselineDelay:this.baseline.reduce((s,r)=>s+r.delay,0),responseDelay:this.response.reduce((s,r)=>s+r.delay,0),history:this.history,rows:links.map((l,i)=>{const s=this.response[i];const speed=this.minute?Math.round(s.speed*10)/10:l.freeSpeed;return {...l,speed,queue:Math.round(s.queue*10)/10,arrivals:s.arrivals,departures:s.departures,level:speed<20?'혼잡':speed<40?'서행':'원활',createdDate:'모의 '+this.minute+'분',recommendation:'대기 '+s.queue.toFixed(1)+'대 · 가상 모델'};}).sort((a,b)=>a.speed-b.speed)};}
 }
 const api={Experiment};if(typeof module!=='undefined')module.exports=api;root.CitySimulation=api;
})(typeof window!=='undefined'?window:globalThis);
