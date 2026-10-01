/**
 * Check Flip — sound effects. Most are synthesized with WebAudio; the dice use real recordings
 * (assets/sfx, mixed from the MIT-licensed @3d-dice/dice-box-threejs hit sounds; see README).
 * Until the files have loaded, the synthesized dice play instead.
 */
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const SFX=(()=>{let ctx=null,on=lsGet('hs-snd')!=='0';
  function ac(){if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C()}if(ctx.state==='suspended')ctx.resume();return ctx}
  function tone(f,t0,d,type,v,f2){const c=ac();if(!c)return;const t=c.currentTime+t0,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';
    o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
    g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(v||.15,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.03)}
  function noise(t0,d,v,hp){const c=ac();if(!c)return;const b=c.createBuffer(1,Math.max(1,c.sampleRate*d|0),c.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);
    const src=c.createBufferSource();src.buffer=b;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=hp||1500;const g=c.createGain();g.gain.value=v||.2;
    src.connect(f).connect(g).connect(c.destination);src.start(c.currentTime+t0)}
  // one die hitting the table: a short filtered click, a hard "tick" and a soft wooden knock
  function clack(t0,v,p){const c=ac();if(!c)return;const t=c.currentTime+t0,len=.045;
    const b=c.createBuffer(1,Math.max(1,c.sampleRate*len|0),c.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,6);
    const src=c.createBufferSource();src.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=p;f.Q.value=2.2;
    const g=c.createGain();g.gain.value=v;src.connect(f).connect(g).connect(c.destination);src.start(t);
    tone(p*1.35,t0,.028,'sine',v*.22);tone(150+Math.random()*70,t0,.06,'triangle',v*.45)}
  // recorded dice: decoded once, after the first tap (browsers need a gesture for audio)
  const BUF={},SRC={};let loading=false;
  function loadRec(){if(loading)return;const c=ac();if(!c)return;loading=true;
    [['roll','/assets/sfx/dice-roll.mp3'],['land','/assets/sfx/dice-land.mp3']].forEach(([k,u])=>
      fetch(u).then(r=>r.ok?r.arrayBuffer():Promise.reject()).then(b=>new Promise((ok,no)=>c.decodeAudioData(b,ok,no))).then(b=>{BUF[k]=b}).catch(()=>{}))}
  function rec(k,v){const c=ac();if(!c||!BUF[k])return false;const s=c.createBufferSource(),g=c.createGain();s.buffer=BUF[k];g.gain.value=v;
    s.connect(g).connect(c.destination);s.start();SRC[k]=s;s.onended=()=>{if(SRC[k]===s)delete SRC[k]};return true}
  function stopRec(k){const s=SRC[k];if(s){try{s.stop()}catch(e){}delete SRC[k]}}
  // two dice shaken in a hand, then thrown: bounces get closer and quieter
  function roll(){
    for(let k=0;k<14;k++)clack(k*.036+Math.random()*.012,.07+Math.random()*.05,2600+Math.random()*1400);
    [0,1].forEach(d=>{let t=.62+d*.045,gap=.16,v=.34;
      for(let k=0;k<7;k++){clack(t,v*(.85+Math.random()*.3),1900+Math.random()*1300);t+=gap*(.8+Math.random()*.4);gap*=.68;v*=.72}});
  }
  const P={
    click:()=>tone(620,0,.07,'triangle',.12),
    menu:()=>{tone(523,0,.1,'triangle',.12);tone(784,.07,.14,'triangle',.12)},
    rattle:()=>{noise(0,.035,.22,2600);noise(.04,.03,.16,3200)},
    roll:()=>{if(!rec('roll',.9))roll()},
    // skipping the roll cuts the recording short, then the dice settle
    land:()=>{stopRec('roll');if(!rec('land',.8)){clack(0,.16,1700);tone(140,0,.1,'triangle',.12)}},
    step:()=>tone(540,0,.05,'square',.045),
    good:()=>[523,659,784,1047].forEach((f,k)=>tone(f,k*.075,.2,'triangle',.15)),
    bad:()=>[440,370,311,262].forEach((f,k)=>tone(f,k*.09,.22,'sawtooth',.07)),
    neutral:()=>tone(440,0,.18,'sine',.1),
    card:()=>{noise(0,.12,.12,3500);tone(988,.05,.12,'sine',.07)},
    turn:()=>{tone(784,0,.16,'sine',.16);tone(1175,.13,.3,'sine',.14)},
    tick:()=>tone(1320,0,.045,'square',.05),
    pay:()=>{tone(1319,0,.09,'square',.09);tone(1760,.08,.14,'square',.09);noise(.2,.18,.1,5000);tone(2637,.22,.25,'sine',.06)},
    deal:()=>{tone(660,0,.12,'triangle',.13);tone(880,.1,.12,'triangle',.13);tone(660,.2,.18,'triangle',.1)},
    out:()=>tone(330,0,.7,'sawtooth',.11,80),
    win:()=>[523,659,784,1047,784,1047,1319].forEach((f,k)=>tone(f,k*.11,.24,'triangle',.15)),
    join:()=>tone(988,0,.14,'sine',.12),
    pop:()=>{tone(700,0,.09,'sine',.12,1400);tone(1400,.07,.08,'sine',.06)},
    start:()=>[392,523,659,784].forEach((f,k)=>tone(f,k*.09,.26,'triangle',.14))
  };
  return{play(n){if(!on)return;try{P[n]&&P[n]()}catch(e){}},get on(){return on},toggle(){on=!on;lsSet('hs-snd',on?'1':'0');if(on){ac();loadRec()}return on},unlock(){if(on)try{ac();loadRec()}catch(e){}}}
})();
document.addEventListener('pointerdown',()=>SFX.unlock(),{once:true});

export {SFX};

