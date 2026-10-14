const assert=require('node:assert/strict');
const {Experiment,compare,links}=require('./web/simulation.js');
for(const demand of [.5,1,1.8]){
 const e=new Experiment(42);for(let t=0;t<120;t++){
  e.step({demand,incident:t>=10&&t<70,response:t>=25});
  const snapshot=e.snapshot();
  for(const branch of [e.baseline,e.response]){
   for(let i=0;i<4;i++){const s=branch.links[i];assert(s.queue>=0&&s.source>=0);assert(s.occupancy<=links[i].storage+1e-7);assert(Math.abs(s.arrivals-s.departures-s.occupancy)<1e-7);}
  }
  assert(Math.abs(snapshot.baseline.balanceError)<1e-7);assert(Math.abs(snapshot.response.balanceError)<1e-7);assert.equal(snapshot.baseline.generated,snapshot.response.generated);
 }
 e.step();assert.equal(e.minute,120);
}
const control=new Experiment();for(let t=0;t<60;t++)control.step({incident:true});assert.deepEqual(control.baseline,control.response);
const replay=new Experiment();for(let t=0;t<60;t++)replay.step({incident:true});assert.deepEqual(control.snapshot(),replay.snapshot());
const overloaded=new Experiment();for(let t=0;t<120;t++)overloaded.step({demand:1.8,incident:true,response:true});assert(overloaded.snapshot().response.outside>0,'Finite storage must retain blocked source demand');
const samples=compare({incident:true,response:true});assert.equal(samples.length,5);assert(samples.every(s=>Math.abs(s.response.balanceError)<1e-7));
console.log('Passed: network/global conservation, finite storage, source queues, common demand, no-response identity, seed replay, 120-minute limit and batch comparison');
