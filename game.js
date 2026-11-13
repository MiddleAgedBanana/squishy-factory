(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const lines = {
    shelf:'<path d="M3 14v5h18v-5M5 14V9h5v5m3 0V6h6v8M2 14h20"/>',
    sound:'<path d="m3 9 4 0 5-4v14l-5-4H3zM15.5 8a6 6 0 0 1 0 8M18.5 5a10 10 0 0 1 0 14"/>',
    mute:'<path d="m3 9 4 0 5-4v14l-5-4H3zM16 9l6 6m0-6-6 6"/>',
    make:'<path d="M3 13h18c-.7 4-3.6 7-8 7h-2c-4.1 0-7.3-2.6-8-7Zm9.6 0 5.2-8.3c1.5-2.6 4-.9 2.5 1.3l-4.4 7"/>',
    play:'<path d="m8 5 11 7-11 7z" fill="currentColor" stroke-width="1.4"/>',
    left:'<path d="M19 12H5m6-6-6 6 6 6"/>',right:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check:'<path d="m4 12 5 5L20 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',
    tap:'<path d="M9 12V5a1.65 1.65 0 0 1 3.3 0v5.4-1a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1 3 0v1.1a1.5 1.5 0 0 1 3 0v3c0 4.5-2.8 7-6.2 7h-1.6c-2 0-3.2-.7-4.4-2L4.6 14c-1.4-1.8.5-3.7 2-2.5l2.4 1.7zM4 5l1.4 1.1M6.7 2l.8 1.5"/>',
    recipe:'<path d="M5 4h13v16H5zM3.5 7h3m-3 5h3m-3 5h3m3-10h5m-5 4h5m-5 4h3"/>',
    dice:'<rect x="3" y="3" width="18" height="18" rx="4" transform="rotate(-9 12 12)"/><g fill="currentColor" stroke="none"><circle cx="7.8" cy="8.6" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="16.2" cy="15.4" r="1.3"/></g>',
    mend:'<path d="M4 10a8.5 8.5 0 1 1 1.8 8M4 4v6h6"/>',plus:'<path d="M12 4v16M4 12h16"/>',spark:'<path d="m13 3 2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5z"/>'
  };
  const icon = name => '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+lines[name]+'</svg>';
  const palettes = {berry:['Strawberry','#f790ae'],peach:['Peach','#ffac83'],lemon:['Lemon','#f5d56f'],mint:['Mint','#86d6af'],sky:['Sky','#8dcef2'],grape:['Grape','#c3a3e6']};
  const options = {
    shape:{bear:'Bear',bunny:'Bunny',cat:'Kitty'},color:Object.fromEntries(Object.entries(palettes).map(([k,v])=>[k,v[0]])),
    mix:{plain:'Plain',sprinkles:'Sprinkles',pearls:'Pearls',stars:'Stars'},face:{happy:'Happy',sleepy:'Sleepy',surprised:'Surprised'},
    tools:{squish:'Squish',poke:'Poke',stretch:'Stretch',slice:'Slice'}
  };
  const stages = [
    {key:'shape',title:'Pick a shape',verb:'mold',action:'Press the mold',next:'Next: Color'},
    {key:'color',title:'Pour a color',verb:'color',action:'Pour the color',next:'Next: Mix-ins'},
    {key:'mix',title:'Add a mix-in',verb:'mix',action:'Mix it in',next:'Next: Face'},
    {key:'face',title:'Pick a face',verb:'face',action:'Stamp the face',next:'Play with it!'}
  ];
  const directions = {squish:'Press and squish',poke:'Give it a poke',stretch:'Pull to stretch',slice:'Slide to slice'};
  const steps = stages.map(s=>s.key);
  const defaults = {shape:'bear',color:'berry',mix:'plain',face:'happy'};
  const recipeKey = r => steps.map(k=>r[k]).join('-');
  const valid = r => r && steps.every(k=>Object.prototype.hasOwnProperty.call(options[k],r[k]));
  const recipeName = r => options.color[r.color]+' '+options.shape[r.shape];
  function read(key, fallback) {
    try {return JSON.parse(localStorage.getItem('sf1-'+key)) ?? fallback} catch {return fallback}
  }
  function write(key,value) {try {localStorage.setItem('sf1-'+key,JSON.stringify(value))} catch {}}
  const draft = read('draft',null);
  let recipe = valid(draft?.recipe) ? {...draft.recipe} : {...defaults};
  let step = steps.includes(draft?.step) ? steps.indexOf(draft.step) : 0;
  let phase = draft?.phase==='play' ? 'play' : 'make';
  let tool = options.tools[draft?.tool] ? draft.tool : 'squish';
  let sound = read('sound',true) !== false;
  const saved = read('shelf',[]);
  let shelf = Array.isArray(saved) ? saved.filter(valid) : [];
  let page = 0;
  const S = window.FactorySound;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toy = new Toy($('toy'),{reducedMotion:reduced.matches,onAction(kind){
    S.play(kind);
    document.querySelector('.touch-demo').classList.remove('show');
    if(phase==='play') updateMend();
  }});
  const thumbCache = new Map();
  function thumbnail(config,size=122){
    const key=recipeKey(config)+size;
    if(!thumbCache.has(key)) {
      if(thumbCache.size >= 96) thumbCache.delete(thumbCache.keys().next().value);
      thumbCache.set(key,Toy.thumbnail(config,size));
    }
    return '<img alt="" width="'+size+'" height="'+size+'" src="'+thumbCache.get(key)+'">';
  }
  const swatch = color=>'<span class="swatch" style="--swatch:'+palettes[color][1]+'"></span>';
  function art(key,value,inRecipe=false){
    if(key==='color')return swatch(value);
    if(key==='tools')return FactoryArt(value);
    if(key==='shape'){
      const tint={bear:'berry',bunny:'grape',cat:'mint'};
      return thumbnail({...defaults,shape:value,color:inRecipe?recipe.color:tint[value]});
    }
    if(key==='face')return thumbnail({...recipe,face:value,mix:'plain'});
    return mixArt(value);
  }
  function mixArt(value){
    const parts={
      plain:'<ellipse cx="33" cy="34" rx="18" ry="12" fill="#edb8ce" stroke="#987482" stroke-width="1.4"/><path d="M20 33q3-8 13-7" fill="none" stroke="#fff0ed" stroke-width="3" stroke-linecap="round"/>',
      sprinkles:'<g stroke-width="7" stroke-linecap="round"><path d="m13 32 6 3m18-16 5 4" stroke="#e485a1"/><path d="m29 33 3-6m12 13 4-5" stroke="#79baa9"/><path d="m18 22 6 2m9 18 4 3" stroke="#ecc05c"/><path d="m50 24 5 4m-35 13 5 3" stroke="#a98ccc"/></g>',
      pearls:'<g stroke="#b49aa8" stroke-width="1.1"><circle cx="24" cy="36" r="9" fill="#ecbed3"/><circle cx="35" cy="23" r="8" fill="#e7d4f1"/><circle cx="44" cy="37" r="9" fill="#e1e9ca"/></g><g fill="#fff9ec"><ellipse cx="21" cy="32" rx="3" ry="2"/><ellipse cx="32" cy="20" rx="3" ry="2"/><ellipse cx="41" cy="34" rx="3" ry="2"/></g>',
      stars:'<path d="m26 19 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1z" fill="#f5cc70" stroke="#c59351" stroke-width="1.3"/><path d="m44 12 3 5 6 1-4 4 1 6-6-3-5 3 1-6-4-4 6-1z" fill="#c7a9dc" stroke="#9b7eb7"/>'
    };
    return '<svg class="mix-art" aria-hidden="true" viewBox="0 0 66 58">'+parts[value]+'</svg>';
  }
  function announce(text){$('announcement').textContent=text}
  function saveDraft(){write('draft',{recipe,step:steps[step],phase,tool})}
  function configToy(){toy.configure({...recipe,phase,tool,step:steps[step]})}
  function hint(){const el=document.querySelector('.touch-demo');el.classList.remove('show');void el.offsetWidth;el.classList.add('show')}
  function ensureStageVisible(){
    if(scrollY>12 && matchMedia('(max-width:740px),(max-aspect-ratio:4/5)').matches){
      $('stage').scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});
    }
  }
  function remember(){
    const key=recipeKey(recipe);
    shelf=[{...recipe},...shelf.filter(item=>recipeKey(item)!==key)];
    write('shelf',shelf);
  }
  function buttonText(id,symbol,label,utility=false){$(id).innerHTML=icon(symbol)+'<span'+(utility?' class="utility-label"':'')+'>'+label+'</span>'}
  function renderRecipe(){
    $('ingredients').innerHTML=steps.map((key,index)=>{
      const value=recipe[key];
      return '<button class="ingredient" aria-label="Change '+key+', currently '+options[key][value]+'" data-step="'+index+'">'+art(key,value,true)+options[key][value]+'</button>';
    }).join('');
  }
  function renderChoices(){
    const key=phase==='make'?steps[step]:'tools';
    const value=key==='tools'?tool:recipe[key];
    const el=$('choices');
    el.className='choices '+key;
    el.setAttribute('aria-label',phase==='play'?'Play tools':stages[step].title);
    el.innerHTML=Object.entries(options[key]).map(([id,name])=>
      '<button class="choice" data-choice="'+id+'" aria-pressed="'+(value===id)+'"><span class="choice-art">'+art(key,id)+'</span><span>'+name+'</span>'+(value===id?'<span class="tick">'+icon('check')+'</span>':'')+'</button>').join('');
  }
  function updateMend(){
    const m=$('mend');
    if(m){const cuts=toy.snapshot().slices;m.innerHTML=icon(cuts?'mend':'plus')+(cuts?'Put it together':'Make another');m.dataset.cut=cuts?'yes':'no';}
  }
  function renderNavigation(){
    const nav=$('navigation');
    if(phase==='make'){
      nav.innerHTML=(step?'<button class="sub-button" id="back" aria-label="Previous step">'+icon('left')+'</button>':'')+
        '<button class="primary-button" id="next">'+stages[step].next+icon(step===3?'play':'right')+'</button>';
    } else {
      nav.innerHTML='<button class="primary-button" id="mend"></button>';updateMend();
    }
  }
  function renderSound(){
    S.setEnabled(sound);buttonText('sound',sound?'sound':'mute',sound?'Sound on':'Sound off',true);
    $('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Mute sound':'Turn sound on');
  }
  function updateStage(){
    const s=stages[step],making=phase==='make';
    const action=making?s.action:directions[tool];
    $('toy').setAttribute('aria-label',action+' on '+recipeName(recipe)+'. Tap, or press Space.');
    $('stage-action').innerHTML=icon('tap')+action;
    document.querySelector('.touch-demo').dataset.gesture=making?'tap':tool;
    $('toy-name').textContent=recipeName(recipe);
    $('stage').style.setProperty('--toy-swatch',palettes[recipe.color][1]);
  }
  function render(){
    const making=phase==='make',s=stages[step];
    configToy();
    $('main-title').textContent=making?'Make a squishy':'Play with your squishy';
    $('make-tab').setAttribute('aria-pressed',String(making));
    $('play-tab').setAttribute('aria-pressed',String(!making));
    $('step-count').textContent=making?'Step '+(step+1)+' of 4':'Your play tools';
    $('pips').innerHTML=making?stages.map((_,i)=>'<b class="'+(i===step?'current':i<step?'past':'')+'"></b>').join(''):'';
    $('console-title').textContent=making?s.title:'Pick a tool';
    $('surprise').hidden=!making;
    updateStage();renderChoices();renderNavigation();renderRecipe();saveDraft();
  }
  function enterPlay(finish=false){
    if(phase!=='play'){toy.mend();remember()}
    phase='play';render();hint();ensureStageVisible();
    if(finish){S.play('finish');announce(recipeName(recipe)+' is on your shelf. Time to play!')}
  }
  function startNew(){
    recipe={...defaults};step=0;phase='make';tool='squish';toy.mend();render();hint();announce('Make a new squishy');
  }
  function press(){toy.act(phase==='play'?tool:stages[step].verb);if(phase==='play')updateMend()}
  function pick(id){
    if(phase==='play'){
      tool=id;configToy();updateStage();renderChoices();hint();
    } else {
      recipe[steps[step]]=id;configToy();toy.act(stages[step].verb);updateStage();renderChoices();renderRecipe();
    }
    saveDraft();
  }
  function showShelf(){
    const limit=9,start=page*limit;
    $('shelf-content').innerHTML=shelf.length?shelf.slice(start,start+limit).map((r,i)=>'<button class="choice" data-load="'+(i+start)+'">'+thumbnail(r,106)+'<span>'+recipeName(r)+'</span></button>').join(''):'<p class="shelf-empty">Your finished squishies will sit here.</p>';
    if(shelf.length>limit){
      const pager=document.createElement('div');pager.className='shelf-pages';
      if(page) pager.innerHTML='<button class="small-button" data-page="-1">Back</button>';
      if(start+limit<shelf.length) pager.innerHTML+='<button class="small-button" data-page="1">More</button>';
      $('shelf-content').append(pager);
    }
    if(!$('shelf').open)$('shelf').showModal();
  }
  function focusChoice(id){$('choices').querySelector('[data-choice="'+id+'"]')?.focus({preventScroll:true})}
  document.addEventListener('pointerdown',()=>{if(sound)S.unlock()},{capture:true,passive:true});
  document.addEventListener('keydown',event=>{
    if(sound)S.unlock();
    if(event.key.toLowerCase()==='f'&&!event.repeat&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
      else document.documentElement.requestFullscreen?.().catch(()=>{});
    }
  });
  $('choices').onclick=e=>{const b=e.target.closest('[data-choice]');if(b){pick(b.dataset.choice);if(e.detail===0)focusChoice(b.dataset.choice)}};
  $('navigation').onclick=e=>{
    const id=e.target.closest('button')?.id;
    if(id==='mend'){
      if(toy.snapshot().slices){toy.mend();S.play('mend');announce('Whole again!');updateMend()}else startNew();
    }else if(id==='next'&&step===3)enterPlay(true);
    else if(id==='next'||id==='back'){step+=id==='next'?1:-1;render();hint();announce(stages[step].title)}
    if(id&&e.detail===0)$('choices').querySelector('button')?.focus({preventScroll:true});
  };
  $('ingredients').onclick=e=>{
    const b=e.target.closest('[data-step]');if(!b)return;
    phase='make';step=Number(b.dataset.step);toy.mend();render();hint();$('console-title').scrollIntoView({block:'nearest'});
    if(e.detail===0)$('choices').querySelector('button')?.focus({preventScroll:true});
  };
  $('shelf-open').onclick=()=>{page=0;showShelf()};
  $('shelf-close').onclick=()=>$('shelf').close();
  $('shelf').onclick=e=>{if(e.target===$('shelf'))$('shelf').close()};
  $('new-toy').onclick=()=>{$('shelf').close();startNew()};
  $('shelf-content').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.page){page+=Number(b.dataset.page);showShelf();return}
    recipe={...shelf[Number(b.dataset.load)]};step=0;tool='squish';phase='play';toy.mend();$('shelf').close();render();hint();
  };
  $('sound').onclick=()=>{sound=!sound;renderSound();write('sound',sound);if(sound)S.play('poke')};
  $('make-tab').onclick=()=>{if(phase!=='make'){phase='make';toy.mend();render();hint()}};
  $('play-tab').onclick=()=>{if(phase!=='play')enterPlay(true)};
  $('stage-action').onclick=press;
  $('toy').addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();if(!e.repeat)press()}});
  $('brand-art').innerHTML=FactoryArt('brand');
  $('recipe-title').innerHTML=icon('recipe')+'My recipe';
  $('shelf-close').innerHTML=icon('close');
  buttonText('new-toy','plus','Make a new squishy');
  buttonText('shelf-open','shelf','My shelf',true);
  buttonText('make-tab','make','Make');buttonText('play-tab','play','Play');
  document.querySelector('.touch-demo').innerHTML=icon('tap');
  const surprise=document.createElement('button');surprise.id='surprise';surprise.className='surprise';surprise.innerHTML=icon('dice')+'Surprise me';
  $('choices').after(surprise);
  surprise.onclick=()=>{
    const key=steps[step],other=Object.keys(options[key]).filter(id=>id!==recipe[key]);
    pick(other[Math.floor(Math.random()*other.length)]);
    announce(options[key][recipe[key]]);
  };
  window.render_game_to_text=()=>JSON.stringify({phase,step:steps[step],recipe,tool,shelf:shelf.length,sound,coordinates:'Canvas origin top left; x right, y down.',toy:toy.snapshot()});
  window.advanceTime=ms=>toy.advance(ms);
  renderSound();render();hint();
})();
