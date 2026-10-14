importScripts('simulation.js');
onmessage=event=>{try{const results=CitySimulation.compare(event.data);postMessage({results:results.map(s=>({seed:s.seed,strategies:s.strategies}))});}catch{postMessage({error:'반복 실험 실행 실패'});}};
