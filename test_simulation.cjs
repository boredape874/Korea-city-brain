const assert=require('node:assert/strict');
const {Experiment}=require('./web/simulation.js');
const e=new Experiment();for(let t=0;t<60;t++)e.step({incident:true,response:true});
for(const branch of [e.baseline,e.response])for(const s of branch){assert(s.queue>=0);assert(Math.abs(s.arrivals-s.departures-s.queue)<1e-7);}
const sum=(a,k)=>a.reduce((s,r)=>s+r[k],0);
assert(Math.abs(sum(e.baseline,'arrivals')-sum(e.response,'arrivals'))<1e-7);
assert(sum(e.response,'delay')<sum(e.baseline,'delay'));
const control=new Experiment();for(let t=0;t<60;t++)control.step({incident:true,response:false});assert.deepEqual(control.baseline,control.response);
const overloaded=new Experiment();for(let t=0;t<120;t++)overloaded.step({demand:1.8,incident:true,response:true});assert(overloaded.response[1].queue>0,'Diversion must expose downstream congestion');overloaded.step();assert.equal(overloaded.minute,120);
console.log('Simulation checks passed: conservation, common demand, intervention, downstream congestion, time limit');
