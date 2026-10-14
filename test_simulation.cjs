const assert=require('node:assert/strict');const {Experiment,compare,links,presets,strategies}=require('./web/simulation.js');
assert.equal(links.length,36);assert(Object.keys(presets).length>=12);
for(const scenario of Object.keys(presets)){
 const e=new Experiment(42);for(let t=0;t<120;t++){
  e.step({demand:presets[scenario].demand,scenario,strategy:'combined',incident:t>=40&&t<60,target:15});const snapshot=e.snapshot();
  for(const strategy of strategies){const b=e.branches[strategy];for(let i=0;i<36;i++){const s=b.links[i];assert(s.queue>=0&&s.source>=0);assert(s.occupancy<=links[i].storage+1e-7);assert(Math.abs(s.arrivals-s.departures-s.occupancy)<1e-7);}assert(Math.abs(snapshot.strategies[strategy].balanceError)<1e-7);assert.equal(b.generated,e.baseline.generated);}
 }
 e.step();assert.equal(e.minute,120);
}
const a=new Experiment(),b=new Experiment();for(let t=0;t<60;t++){a.step({scenario:'multi',strategy:'combined'});b.step({scenario:'multi',strategy:'combined'});}assert.deepEqual(a.snapshot(),b.snapshot());assert(a.snapshot().events.length>0);assert.equal(a.snapshot().activeEvents[0].links.length,3);
const overloaded=new Experiment();for(let t=0;t<120;t++)overloaded.step({demand:1.8,scenario:'heavy',strategy:'combined'});assert(overloaded.snapshot().baseline.outside>0,'Blocked demand must stay outside');
const samples=compare({scenario:'multi',strategy:'combined',demand:1.3});assert.equal(samples.length,5);assert(samples.every(s=>Object.keys(s.strategies).length===4));
console.log('Passed: 36 links, 12 scenarios, four strategy conservation, finite storage, blocked entry demand, identical demand, deterministic replay, simultaneous events, time limit and five-seed comparison');
