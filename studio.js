(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const scenes = ['stir', 'pour', 'peel', 'play'];
  const flavorNames = ['Strawberry swirl', 'Blueberry swirl', 'Mango swirl', 'Mint swirl'];
  const accents = ['#cf506d', '#7b6bc3', '#c78324', '#418c78'];
  const titles = {stir:'Stir the gel', pour:'Fill the mold', peel:'Peel it out'};
  const playTitles = {cut:'Slice your squishy', press:'Squish it', pop:'Pop the bubbles'};
  const cues = {stir:'Draw circles in the bowl', pour:'Hold to pour', peel:'Pull the mold away'};
  const paths = {
    sound:'<path d="M3 9h4l5-4v14l-5-4H3zM16 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>',
    mute:'<path d="M3 9h4l5-4v14l-5-4H3zM16 9l5 6m0-6-5 6"/>',
    stir:'<path d="M5 7c-4 2-4 8 0 11 5 3 14 2 16-3 1-4-3-7-8-7-4 0-7 2-6 5 1 2 4 3 7 2m-8-9-3 2 3 3"/>',
    pour:'<path d="m4 5 10-2 3 10-2 2-8 1zM14 5l4-1 2 5-4 1m1 3c2 2 3 4 3 8"/>',
    peel:'<path d="m3 16 8 4 10-6M3 16l7-9 6 2c3 1 4-2 3-5l3 2c2 7-2 10-8 9l-5-1z"/>',
    cut:'<path d="m5 15 7-7 4 4-7 7H3l2-4zM13 7l2-2 2 2 3-4 2 2-4 6z"/>',
    press:'<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5-2c0-2 3-2 3 0v2c0-2 3-2 3 0v1c0-2 3-2 3 0v3c0 5-3 7-6 7-2 0-3-1-5-2l-6-6c-1-2 1-3 2-2z"/>',
    pop:'<circle cx="8" cy="15" r="4.5"/><path d="m16 3 1 3m3-1-2 2m4 2-3 .5M12 6l2 1m0 5 1-2"/>',
    reform:'<path d="M4 10a8 8 0 1 1 .8 7M4 4v6h6"/>',
    again:'<path d="M3 12h17m-6-6 6 6-6 6"/>'
  };
  const icon = key => '<svg class="symbol" aria-hidden="true" viewBox="0 0 24 24">'+paths[key]+'</svg>';
  const sound = window.GelAudio;
  const makeSurface = byId('make-surface');
  const playSurface = byId('play-surface');
  const demo = byId('demonstration');
  const stepLabels = Array.from(byId('steps').querySelectorAll('span'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const baseAssets = {};
  let stage = 'stir', batch = 0, tool = 'cut', progress = 0;
  let ready = false, switching = false, finished = false, demoTimer, stageTimer;
  let muted = false;
  try {muted = localStorage.getItem('gel-studio-muted') === 'true';} catch {}
  function stopMotion(){sound.stop();}
  const hooks = {
    reducedMotion, onSound:(kind, strength)=>sound.play(kind, strength),
    onMotion:(kind, strength)=>sound.motion(kind, strength), onStop:stopMotion
  };
  const make = new GelMake(makeSurface, {
    ...hooks, onProgress(value){
      progress = Math.max(0, Math.min(1, value));
      byId('fill').style.transform='scaleX('+progress+')';
      byId('fill-track').setAttribute('aria-valuenow',String(Math.round(progress*100)));
      if(progress>0) hideDemo();
    },
    onComplete(which) {
      if(which!==stage || stage==='play' || finished) return;
      finished=true;
      progress=1;
      clearTimeout(stageTimer);
      stageTimer=setTimeout(()=>enter(scenes[scenes.indexOf(stage)+1]),reducedMotion?120:420);
    }
  });
  const play = new GelPlay(playSurface, {
    ...hooks, onAction(kind,state){
      hideDemo();
      byId('reform').hidden=state.pieces<2 && state.pops===0;
      if(kind==='cut') byId('announcement').textContent=state.pieces+' pieces';
    }
  });
  function readImage(name){
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error('Could not load '+name));
      image.src='assets/gel/'+name+'.webp';
    });
  }
  // Rotate only the berry pigment. Mixing bowl glass, warm light, cream ribbons,
  // peach worktop, and highlights retain their photographed colours.
  function tintPigment(image, flavor){
    if(!flavor)return image;
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height), p=pixels.data;
    const targetHue=[0,253,33,158][flavor]/60;
    const sector=Math.floor(targetHue), f=targetHue-sector;
    const base=[[1,f,0],[1-f,1,0],[0,1,f],[0,1-f,1],[f,0,1],[1,0,1-f]][sector];
    for(let i=0;i<p.length;i+=4){
      if(!p[i+3])continue;
      const r=p[i],g=p[i+1],b=p[i+2];
      const red=r-Math.max(g,b),chroma=r-Math.min(g,b);
      if(red<5 || b-g < -7 || chroma<12)continue;
      const amount=Math.min(1,(red-5)/24,(b-g+7)/16,(chroma-12)/24);
      const low=r-chroma;
      p[i]=r+(low+chroma*base[0]-r)*amount;
      p[i+1]=g+(low+chroma*base[1]-g)*amount;
      p[i+2]=b+(low+chroma*base[2]-b)*amount;
    }
    ctx.putImageData(pixels,0,0);
    return canvas;
  }
  async function materialFor(index){
    const assets={...baseAssets}, flavor=index%4;
    for(const key of ['stir','jug','loaf','slice','spatula']){
      if(flavor){
        await new Promise(resolve=>requestAnimationFrame(resolve));
        assets[key]=tintPigment(baseAssets[key],flavor);
      }
    }
    assets.background=assets.board;
    return assets;
  }
  function hideDemo(){
    clearTimeout(demoTimer);
    demo.classList.remove('coach');
  }
  function showDemo(){
    hideDemo();
    const path=stage==='stir'?'M86 61c7-17-9-30-34-28S17 53 22 65s25 16 41 9':
      stage==='pour'?'M46 45a11 11 0 1 0 17-9': 'M25 78Q48 56 76 24';
    byId('route-path').setAttribute('d',path);
    demoTimer=setTimeout(()=>demo.classList.add('coach'),440);
  }
  function updateUi(){
    const playing=stage==='play', flavor=batch%4;
    byId('title').textContent=playing?playTitles[tool]:titles[stage];
    byId('flavor').textContent=flavorNames[flavor];
    document.documentElement.style.setProperty('--accent',accents[flavor]);
    byId('scene').dataset.stage=stage;
    makeSurface.hidden=playing;playSurface.hidden=!playing;
    stepLabels.forEach((el,i)=>{
      const active=scenes[i]===stage;
      el.classList.toggle('current',active);
      if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    });
    byId('cue').hidden=playing;byId('tools').hidden=!playing;byId('replay').hidden=!playing;
    byId('action-strip').classList.toggle('play',playing);
    if(playing){
      playSurface.setAttribute('aria-label',playTitles[tool]+'. Touch the jelly, or press Space.');
      for(const b of byId('tools').children)b.setAttribute('aria-pressed',String(b.dataset.tool===tool));
      const state=play.state();
      byId('reform').hidden=state.pieces<2 && state.pops===0;
    }else{
      byId('instruction').textContent=cues[stage];
      byId('cue-icon').innerHTML=icon(stage);
      byId('fill').style.transform='scaleX('+progress+')';
      byId('fill-track').setAttribute('aria-label',titles[stage]);
      byId('fill-track').setAttribute('aria-valuenow',String(Math.round(progress*100)));
      makeSurface.setAttribute('aria-label',cues[stage]+'. You can also hold, tap, or press Space.');
    }
  }
  function enter(next){
    clearTimeout(stageTimer);hideDemo();stopMotion();
    make.setActive(false);play.setActive(false);
    const focusedSurface = document.activeElement===makeSurface || document.activeElement===playSurface;
    stage=next;finished=false;progress=0;
    updateUi();
    if(next==='play'){
      tool='cut';play.reset(batch);play.setTool(tool);play.setActive(true);updateUi();sound.play('finish',.8);
    }else{
      make.enter(stage,batch);make.setActive(true);
    }
    byId('announcement').textContent=byId('title').textContent;
    if(focusedSurface) (next==='play'?playSurface:makeSurface).focus({preventScroll:true});
    showDemo();
  }
  async function startBatch(next){
    if(switching)return;
    switching=true;ready=false;
    play.setActive(false);make.setActive(false);sound.stop();
    byId('load').hidden=false;
    byId('load').textContent='Mixing colors…';
    try {
      const assets=await materialFor(next);
      await Promise.all([make.load(assets),play.load(assets)]);
      batch=next;ready=true;byId('load').hidden=true;
      enter('stir');
    }catch(err){loadError(err);}
    finally{switching=false;}
  }
  function loadError(err){
    console.error(err);
    const box=byId('load');box.hidden=false;box.textContent='';
    const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();box.append(retry);
  }
  function displaySound(){
    byId('sound-label').textContent=muted?'Sound off':'Sound on';
    byId('sound').setAttribute('aria-label',muted?'Turn sound on':'Mute sound');
    byId('sound').setAttribute('aria-pressed',String(!muted));
    document.querySelector('.sound-symbol').innerHTML=icon(muted?'mute':'sound');
    sound.setMuted(muted);
  }
  byId('tools').innerHTML=Object.entries({cut:'Slice',press:'Squish',pop:'Pop'}).map(([key,label])=>
    '<button type="button" data-tool="'+key+'">'+icon(key)+'<span>'+label+'</span></button>').join('');
  byId('tools').addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||!ready)return;
    tool=button.dataset.tool;play.setTool(tool);updateUi();showDemo();
  });
  byId('again').innerHTML='<span>Make another</span>'+icon('again');
  byId('again').onclick=()=>{if(ready)startBatch(batch+1);};
  byId('reform').innerHTML=icon('reform');
  byId('reform').onclick=()=>{
    if(!ready)return;
    play.reset(batch);play.setTool(tool);sound.play('release');updateUi();showDemo();
    byId('announcement').textContent='Your squishy is whole again';
  };
  byId('sound').onclick=()=>{
    muted=!muted;displaySound();
    try{localStorage.setItem('gel-studio-muted',String(muted));}catch{}
    if(!muted){sound.unlock();sound.play('pop',.9);}
  };
  for(const canvas of [makeSurface,playSurface]){
    canvas.addEventListener('pointerdown',hideDemo);
    // Screen-reader activation can arrive as a click without any pointer events.
    canvas.addEventListener('click',event=>{
      if(event.detail!==0||!ready||finished)return;
      sound.unlock();hideDemo();
      if(stage==='play')play.tap();else make.tap();
    });
    canvas.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){
        event.preventDefault();
        if(ready&&!finished&&!event.repeat){
          sound.unlock();hideDemo();
          if(stage==='play')play.tap();else make.tap();
        }
      }
    });
  }
  document.addEventListener('visibilitychange',()=>{
    if(!ready)return;
    if(document.hidden){make.setActive(false);play.setActive(false);stopMotion();}
    else if(stage==='play')play.setActive(true);else make.setActive(true);
  });
  window.render_game_to_text=()=>JSON.stringify({
    stage,batch,flavor:flavorNames[batch%4],tool,ready,muted,progress:+progress.toFixed(2),
    surface:stage==='play'?play.state():make.state(),coordinates:'Origin top left, x right and y down'
  });
  window.advanceTime=ms=>{if(stage==='play')play.advance?.(ms);else make.advance(ms);};
  displaySound();updateUi();
  (async()=>{
    const keys=['stir','pour','board','mold','loaf','jug','slice','spatula','cutter'];
    const slow=setTimeout(()=>{byId('load').hidden=false;},750);
    try{
      await Promise.all(keys.map(async key=>{baseAssets[key]=await readImage(key);}));
      clearTimeout(slow);
      await startBatch(0);
    }catch(err){clearTimeout(slow);loadError(err);}
  })();
})();
