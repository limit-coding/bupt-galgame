// Original synthesized ambience. No recordings, music downloads or external requests.
export function createAmbience(){
 let enableRevision=0;
 let context,master,wind,windFilter,enabled=false,volume=.35,season='summer',timer=0,lastStep=0;
 function init(){
  context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=0;master.connect(context.destination);
  const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);const samples=buffer.getChannelData(0);let previous=0;
  for(let i=0;i<samples.length;i++){previous=(previous+(Math.random()*2-1)*.015)/1.015;samples[i]=previous;}
  wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;windFilter=context.createBiquadFilter();windFilter.type='lowpass';windFilter.frequency.value=700;const gain=context.createGain();gain.gain.value=.5;wind.connect(windFilter);windFilter.connect(gain);gain.connect(master);wind.start();
 }
 async function setEnabled(value){
  const revision=++enableRevision;
  if(!value){enabled=false;if(context)master.gain.setTargetAtTime(0,context.currentTime,.2);return false;}
  try{if(!context)init();await context.resume();if(revision!==enableRevision)return enabled;enabled=context.state==='running';master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.2);return enabled;}catch{enabled=false;return false;}
 }
 function chirp(){if(!context||!enabled)return;const t=context.currentTime;const tone=context.createOscillator(),gain=context.createGain();tone.type='sine';tone.frequency.setValueAtTime(2100,t);tone.frequency.exponentialRampToValueAtTime(3300,t+.07);tone.frequency.exponentialRampToValueAtTime(1800,t+.24);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.024,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+.3);tone.connect(gain);gain.connect(master);tone.start(t);tone.stop(t+.32);tone.onended=()=>{tone.disconnect();gain.disconnect();};}
 function step(){if(!context||!enabled)return;const t=context.currentTime;if(t-lastStep<.36)return;lastStep=t;const osc=context.createOscillator(),gain=context.createGain();osc.type='triangle';osc.frequency.setValueAtTime(season==='winter'?100:140,t);osc.frequency.exponentialRampToValueAtTime(45,t+.1);gain.gain.setValueAtTime(.05,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.12);osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+.13);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 return {setEnabled,setVolume(value){volume=Math.max(0,Math.min(1,value));if(context)master.gain.setTargetAtTime(enabled?volume:0,context.currentTime,.1);},setSeason(value){season=value;if(windFilter)windFilter.frequency.setTargetAtTime(value==='winter'?450:850,context.currentTime,.8);},update(dt,moving){if(!enabled)return;timer+=dt;if(moving)step();if(timer>9&&season!=='winter'){timer=0;chirp();}},suspend(){if(context)master.gain.setTargetAtTime(0,context.currentTime,.1);},resume(){if(context&&enabled)master.gain.setTargetAtTime(volume,context.currentTime,.15);},get enabled(){return enabled;}};
}
