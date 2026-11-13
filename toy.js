/* The toy is painted once from a soft solid. During play we move the cached skin,
   so even a pile of slices can spring back without repainting the material. */
(() => {
  'use strict';

  const TAU = 2 * Math.PI;
  const W = 328, H = 302, OX = 164, OY = 190;
  const RES = 1.65;
  const SKIN_W = Math.round(W * RES), SKIN_H = Math.round(H * RES);
  const floor = 99;
  const colors = {
    berry: [252, 143, 167], peach: [255, 177, 127], lemon: [251, 217, 110],
    mint: [141, 217, 178], sky: [137, 199, 234], grape: [191, 163, 230]
  };
  const defaults = { shape: 'bear', color: 'berry', mix: 'plain', face: 'happy', phase: 'make', tool: 'squish', step: 'shape' };
  const settings = {
    shape: ['bear', 'bunny', 'cat'], color: Object.keys(colors), mix: ['plain', 'sprinkles', 'pearls', 'stars'],
    face: ['happy', 'sleepy', 'surprised'], phase: ['make', 'play'], tool: ['squish', 'poke', 'stretch', 'slice'],
    step: ['shape', 'color', 'mix', 'face']
  };
  const makeTools = { shape: 'mold', color: 'color', mix: 'mix', face: 'face' };
  const geometry = new Map(), skins = new Map(), thumbs = new Map();
  const clamp = (x, l, h) => Math.min(h, Math.max(l, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const rgb = a => 'rgb(' + a.map(Math.round).join(',') + ')';
  const tint = (a, b, p) => rgb(a.map((v, i) => mix(v, b[i], p)));

  function canvas(w, h) {
    const el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    return el;
  }
  function seedRandom(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function remember(cache, key, value, limit) {
    if (cache.size >= limit) cache.delete(cache.keys().next().value);
    cache.set(key, value);
    return value;
  }
  function ellipse(ctx,x,y,rx,ry,fill,angle=0) {
    ctx.beginPath();
    ctx.ellipse(x,y,rx,ry,angle,0,TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function star(ctx,x,y,r,color) {
    ctx.beginPath();
    for (let k=0; k<10; k++) {
      const a = -Math.PI/2+k*Math.PI/5, rr=k%2 ? r*.52 : r;
      const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr;
      if (!k) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function grad(ctx,x0,y0,x1,y1,stops) {
    const g=ctx.createLinearGradient(x0,y0,x1,y1);
    stops.forEach((color,i)=>g.addColorStop(i/(stops.length-1),color));
    return g;
  }
  function generateGeometry(shape) {
    if (geometry.has(shape)) return geometry.get(shape);
    const count=SKIN_W*SKIN_H;
    const heights=new Float32Array(count);
    const earTint=new Float32Array(count), masks=new Uint8ClampedArray(count);
    const light=new Float32Array(count), soft=new Float32Array(count), gloss=new Float32Array(count);
    const shapes = {
      bear: [[-87,-73,37,38,-.28],[88,-75,36,36,.24]],
      cat: [[-84,-85,38,46,-.38],[82,-85,36,45,.39]],
      bunny: [[-60,-103,26,66,-.20],[52,-103,26,60,.23]]
    };
    const ears=shapes[shape].map(([x,y,rx,ry,a])=>({x,y,rx,ry,c:Math.cos(a),s:Math.sin(a)}));
    for (let row=0; row<SKIN_H; row++) {
      const y=(row+.5)/RES-OY;
      const yy=(y-17)/(y<17?119:82);
      const bodyWidth=148*(1+.07*yy);
      const ty=Math.abs(yy)**2.23;
      for (let col=0; col<SKIN_W; col++) {
        const i=row*SKIN_W+col, x=(col+.5)/RES-OX;
        const xx=(x+1.5-yy*1.8)/bodyWidth;
        const f=1-Math.abs(xx)**2.25-ty;
        let z=(f>=0?1:-1)*Math.sqrt(Math.abs(f))*105;
        for (const e of ears) {
          const xx=x-e.x, yy=y-e.y;
          const v=(-xx*e.s+yy*e.c)/e.ry;
          const width=e.rx*(shape==='cat' ? 1+.77*v : 1);
          const u=(xx*e.c+yy*e.s)/Math.max(4,width);
          const f=1-u*u-v*v;
          const ez=(f>=0?1:-1)*Math.sqrt(Math.abs(f))*e.rx*.97-2;
          const d=ez-z;
          if (d>-8) {
            const q=clamp(.5+d/16,0,1);
            z=mix(z,ez,q)+8*q*(1-q);
            // Dye is pressed into a shallow well in each ear.
            const ir = (u+.03)**2/.48**2+(v+.15)**2/(shape==='bear'?.43:.62)**2;
            const ear=clamp(1-ir,0,1);
            earTint[i]=ear*q;
            z-=6*ear*ear*q;
          }
        }
        heights[i]=z;
        masks[i]=clamp(z*34+30,0,255);
      }
    }
    const rand=seedRandom(340726);
    for (let row=1; row<SKIN_H-1; row++) {
      for (let col=1; col<SKIN_W-1; col++) {
        const i=row*SKIN_W+col;
        if (!masks[i]) continue;
        const z=heights[i], x=col/RES-OX, y=row/RES-OY;
        const nx=(heights[i-1]-heights[i+1])*RES*.5;
        const ny=(heights[i-SKIN_W]-heights[i+SKIN_W])*RES*.5;
        const n=1/Math.hypot(nx,ny,1);
        const d=(-.47*nx-.66*ny+.59)*n;
        const bounced=Math.max(0,(.50*nx+.54*ny-.1)*n);
        const highlight=Math.max(0,(-.26*nx-.38*ny+.887)*n);
        const grain=(rand()-.5)*.026;
        light[i]=.77+.23*clamp(d,-.85,1)+.075*bounced+grain;
        soft[i]=.36*Math.max(0,d)**2.1;
        const dry=Math.exp(-((x+57)**2/900+(y+62)**2/145));
        // Two softly edged reflections from the workshop window on the curved skin.
        const hx=x+68,hy=y+60;
        const a=hx*.86-hy*.51,b=hx*.51+hy*.86;
        const windowLight=.43*Math.exp(-(a*a/172+b*b/22))+.24*Math.exp(-((a+23)**2/22+(b-2)**2/12));
        gloss[i]=.23*highlight**28+.23*dry+windowLight+.14*Math.max(0,1-z/25)*Math.max(0,d);
      }
    }
    const field={heights,earTint,masks,light,soft,gloss};
    geometry.set(shape,field);
    return field;
  }
  function depth(field,x,y) {
    const ix=Math.round((x+OX)*RES), iy=Math.round((y+OY)*RES);
    return ix>=0&&ix<SKIN_W&&iy>=0&&iy<SKIN_H ? field.heights[iy*SKIN_W+ix] : -1;
  }
  function skinFor(config) {
    const key=[config.shape,config.color,config.mix,config.face].join('/');
    if (skins.has(key)) return skins.get(key);
    const field=generateGeometry(config.shape), base=colors[config.color];
    const art=canvas(SKIN_W,SKIN_H), ctx=art.getContext('2d');
    const img=ctx.createImageData(SKIN_W,SKIN_H), pixels=img.data;
    for (let i=0,p=0; i<field.masks.length; i++,p+=4) {
      const alpha=field.masks[i];
      if (!alpha) continue;
      const illum=field.light[i], silk=field.soft[i], spec=field.gloss[i], blush=field.earTint[i];
      for (let j=0; j<3; j++) {
        let channel=mix(base[j],[245,117,151][j],blush*.65);
        channel=mix(channel*illum, [255,245,232][j],silk);
        pixels[p+j]=mix(channel,255,spec);
      }
      pixels[p+3]=alpha;
    }
    ctx.putImageData(img,0,0);
    ctx.setTransform(RES,0,0,RES,OX*RES,OY*RES);
    paintPores(ctx,field);
    paintMix(ctx,field,config.mix);
    paintFace(ctx,config);
    return remember(skins,key,art,12);
  }
  function paintPores(ctx,field) {
    const rand=seedRandom(39182);
    for (let i=0;i<1550;i++) {
      const x=rand()*312-156,y=rand()*280-173;
      const z=depth(field,x,y);
      if (z<10) continue;
      const r=.18+rand()**2*.64;
      const perspective=clamp(z/94,.22,1);
      ellipse(ctx,x+.07,y+.22,r*perspective,r*.78,'rgba(255,250,231,.32)',-.2);
      ellipse(ctx,x,y,r*perspective,r*.62,'rgba(116,57,77,.17)',-.2);
    }
  }
  const candy=['#fff5b1','#f7bcdb','#a7f6db','#aadeff','#fff4dc','#cbabff'];
  function decoration(ctx,kind,x,y,r,angle,color) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    if (kind==='sprinkles') {
      ctx.lineWidth=r*1.2;ctx.lineCap='round';
      ctx.strokeStyle='rgba(110,61,78,.26)';ctx.beginPath();ctx.moveTo(-r*.83,1.1);ctx.lineTo(r*.83,1.1);ctx.stroke();
      ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(-r*.83,0);ctx.lineTo(r*.83,0);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.56)';ctx.lineWidth=r*.27;ctx.beginPath();ctx.moveTo(-r*.8,-r*.24);ctx.lineTo(r*.45,-r*.24);ctx.stroke();
    } else if (kind==='pearls') {
      const g=ctx.createRadialGradient(-r*.3,-r*.4,.15,0,0,r);
      g.addColorStop(0,'#fffef3');g.addColorStop(.45,color);g.addColorStop(1,'#bb92aa');
      ellipse(ctx,.25,1.2,r,r*.85,'rgba(111,58,82,.22)');
      ellipse(ctx,0,0,r,r*.94,g);
    } else if (kind==='stars') {
      star(ctx,.3,1.1,r,'rgba(101,60,100,.32)');star(ctx,0,0,r,color);
      ctx.strokeStyle='rgba(255,255,247,.8)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(-r*.45,-r*.12);ctx.lineTo(-r*.16,-r*.21);ctx.lineTo(0,-r*.72);ctx.stroke();
    }
    ctx.restore();
  }
  function paintMix(ctx,field,kind) {
    if (kind==='plain') return;
    const rand=seedRandom(48316);
    for (let i=0;i<150;i++) {
      const x=rand()*288-144,y=rand()*150-119,z=depth(field,x,y);
      const r=2.5+rand()*2.3, angle=(rand()-.5)*2.6, color=candy[Math.floor(rand()*candy.length)];
      // Decorations collect on the crown, with a few rolling around the sides.
      if (z<17||y>-31+Math.abs(x)*.13||i> (kind==='sprinkles'?120:75)) continue;
      decoration(ctx,kind,x,y,r*(kind==='stars'?1.35:1),angle,color);
    }
  }
  function eye(ctx,x,y,angle) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ellipse(ctx,.45,1.1,7.55,9.15,'rgba(125,62,76,.30)');
    const g=ctx.createRadialGradient(-2,-3,0,1,2,10);
    g.addColorStop(0,'#75524b');g.addColorStop(.45,'#533438');g.addColorStop(.88,'#37232c');g.addColorStop(1,'#68404c');
    ellipse(ctx,0,0,7.4,8.8,g);
    ellipse(ctx,-2.2,-3,2.05,2.35,'#fff4dc',.2);
    ellipse(ctx,2.9,3.3,.85,.95,'rgba(255,212,212,.64)');
    ctx.restore();
  }
  function paintFace(ctx,config) {
    const fx=-3,fy=20, sleepy=config.face==='sleepy';
    ctx.save();ctx.translate(fx,fy);ctx.rotate(-.012);
    for (const side of [-1,1]) {
      ctx.save();ctx.translate(side*71,13);ctx.scale(1,.60);
      const blush=ctx.createRadialGradient(0,0,0,0,0,23);
      blush.addColorStop(0,'rgba(242,99,125,.60)');blush.addColorStop(.56,'rgba(244,108,140,.39)');blush.addColorStop(1,'rgba(247,123,148,0)');
      ellipse(ctx,0,0,23,23,blush);ctx.restore();
      for(let i=0;i<3;i++) ellipse(ctx,side*(66+i*4.8),13.3+Math.sin(i*2.1)*2.2,1.35,1.04,'rgba(255,230,212,.88)');
    }
    if (sleepy) {
      ctx.lineCap='round';ctx.lineWidth=4.6;ctx.strokeStyle='#654049';
      for (const side of [-1,1]) {
        const x=side*44;
        ctx.beginPath();ctx.moveTo(x-7,-2);ctx.bezierCurveTo(x-4,5,x+3,6,x+8,-2);ctx.stroke();
        ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(x+side*6,1);ctx.lineTo(x+side*9,4);ctx.stroke();ctx.lineWidth=4.6;
      }
    } else {
      eye(ctx,-44,0,-.035);eye(ctx,44,-.8,.055);
    }
    if (config.shape==='bear') {
      const muzzle=ctx.createRadialGradient(-4,14,2,0,17,22);
      muzzle.addColorStop(0,'rgba(255,229,208,.82)');muzzle.addColorStop(.65,'rgba(255,220,204,.68)');muzzle.addColorStop(1,'rgba(255,220,204,0)');
      ctx.save();ctx.translate(0,4);ctx.scale(1,.80);ellipse(ctx,0,16,24,19,muzzle);ctx.restore();
    }
    if (config.face==='surprised') {
      ellipse(ctx,0,19,4.8,6.4,grad(ctx,0,13,0,26,['#55313a','#b76d7f']));
    } else {
      ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2.75;ctx.strokeStyle='#73444c';
      ctx.beginPath();ctx.moveTo(0,9);ctx.quadraticCurveTo(1,18,-4,19);ctx.quadraticCurveTo(-7.5,20,-9.3,16.3);
      ctx.moveTo(0,15.5);ctx.quadraticCurveTo(5.5,22.9,10.1,16);ctx.stroke();
    }
    ctx.beginPath();ctx.moveTo(-5.5,7);ctx.bezierCurveTo(-6,2.6,5.5,2.2,5.8,6.5);ctx.quadraticCurveTo(5,9.7,.5,11.5);ctx.quadraticCurveTo(-3.4,10.6,-5.5,7);
    ctx.fillStyle=grad(ctx,0,3,0,12,['#906069','#57323d']);ctx.fill();
    ellipse(ctx,-1.7,5,1.8,.7,'rgba(255,229,216,.62)');
    if (config.shape==='cat') {
      ctx.lineCap='round';ctx.lineWidth=1.7;ctx.strokeStyle='rgba(119,68,83,.62)';
      for(const s of [-1,1]) for(const k of [0,1]) {
        ctx.beginPath();ctx.moveTo(s*82,10+k*5);ctx.quadraticCurveTo(s*94,8+k*8,s*(103-k*2),4+k*13);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawShadow(ctx,x,y,sx=1) {
    ctx.save();ctx.translate(x+8,y+2.5);ctx.scale(sx,.14);
    const g=ctx.createRadialGradient(5,13,9,4,13,148);
    g.addColorStop(0,'rgba(58,52,62,.41)');g.addColorStop(.45,'rgba(60,70,68,.27)');g.addColorStop(.80,'rgba(67,76,68,.10)');g.addColorStop(1,'rgba(69,76,71,0)');
    ellipse(ctx,3,13,155,155,g);ctx.restore();
    ctx.save();ctx.translate(x+2,y-.9);ctx.scale(sx,.07);
    const contact=ctx.createRadialGradient(0,0,4,0,0,88);
    contact.addColorStop(0,'rgba(65,51,67,.42)');contact.addColorStop(.72,'rgba(69,62,70,.13)');contact.addColorStop(1,'rgba(71,69,69,0)');
    ellipse(ctx,0,0,88,88,contact);ctx.restore();
  }
  function section(ctx,field,x,config,width) {
    let top=null,bottom=null;
    for (let y=-180;y<=102;y++) if(depth(field,x,y)>1) {if(top===null)top=y;bottom=y;}
    if (top===null||bottom-top<5) return;
    const base=colors[config.color];
    // The flat back edge follows the cut plane and the rounded near edge
    // follows the height of the actual solid where the foam was sliced.
    ctx.save();ctx.beginPath();ctx.moveTo(x,top);
    for(let y=top;y<=bottom;y+=2) {
      ctx.lineTo(x+width*clamp(depth(field,x,y)/100,0,1.03),y+2);
    }
    ctx.lineTo(x,bottom+.5);ctx.closePath();ctx.clip();
    ctx.fillStyle=grad(ctx,x,0,x+width,0,[tint(base,[123,66,84],.16),tint(base,[255,240,206],.49),tint(base,[250,215,195],.28)]);
    ctx.fillRect(x-1,top-2,width+3,bottom-top+6);
    const bands=[
      [.25,.18,tint(base,[252,229,153],.73)],
      [.44,.19,tint(base,[251,164,180],.64)],
      [.62,.22,tint(base,[170,227,205],.74)]
    ];
    const h=bottom-top;
    for (const [y,thick,c] of bands) {
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-2,top+y*h);
      ctx.bezierCurveTo(x+width*.1,top+y*h+3,x+width*.7,top+y*h+10,x+width+3,top+y*h+2);
      ctx.lineTo(x+width+3,top+(y+thick)*h);
      ctx.bezierCurveTo(x+width*.6,top+(y+thick)*h+7,x+width*.26,top+(y+thick)*h+5,x-2,top+(y+thick)*h);
      ctx.fill();
    }
    const rand=seedRandom(19000+Math.round(x+155)*391);
    for(let i=0;i<120;i++) {
      const px=x+rand()*width,py=top+rand()*h,r=.4+rand()**2*1.35;
      ellipse(ctx,px,py+.4,r,r*.8,'rgba(255,252,216,.49)');
      ellipse(ctx,px,py,r*.90,r*.69,'rgba(145,88,99,.30)');
      if(i%19===0&&config.mix!=='plain') decoration(ctx,config.mix,px,py,2.4,rand()*5,candy[i%candy.length]);
    }
    const wash=grad(ctx,x,0,x+width,0,['rgba(106,54,76,.23)','rgba(255,242,212,.03)','rgba(255,246,226,.38)']);
    ctx.fillStyle=wash;ctx.fillRect(x-1,top-1,width+3,h+5);
    ctx.strokeStyle=tint(base,[255,255,230],.72);ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x,top);
    for(let y=top+2;y<=bottom;y+=2) ctx.lineTo(x+width*clamp(depth(field,x,y)/100,0,1.03),y+2);
    ctx.stroke();ctx.restore();
  }
  function cutter(ctx,x,y,opacity=1) {
    ctx.save();ctx.translate(x,y);ctx.rotate(-.36);ctx.globalAlpha*=opacity;
    // A little blunt-ended pastry scraper with a cream cutting edge and mint handle.
    ctx.shadowColor='rgba(84,64,87,.22)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    ctx.beginPath();ctx.moveTo(-7,-25);ctx.quadraticCurveTo(-4,-32,5,-26);ctx.lineTo(10,10);
    ctx.quadraticCurveTo(11.8,17,8,24);ctx.quadraticCurveTo(5,28,2,23);
    ctx.lineTo(-7,-13);ctx.closePath();
    ctx.fillStyle=grad(ctx,-8,0,11,0,['#cbbccd','#fff3d9','#fffdf0']);ctx.fill();
    ctx.shadowColor='transparent';ctx.strokeStyle='#c1aabd';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-13,-28);ctx.lineTo(-18,-51);
    ctx.bezierCurveTo(-21,-64,-7,-69,0,-60);ctx.quadraticCurveTo(6,-53,7,-30);
    ctx.quadraticCurveTo(7,-23,-2,-22);ctx.quadraticCurveTo(-11,-20,-13,-28);ctx.closePath();
    ctx.fillStyle=grad(ctx,-18,-45,6,-45,['#8abda9','#bff2c9','#a6dbbd','#79af9d']);ctx.fill();
    ctx.strokeStyle='#7eaf9d';ctx.stroke();ellipse(ctx,-9,-55,2.5,2.5,'#64988c');
    ctx.beginPath();ctx.moveTo(-14,-45);ctx.lineTo(-12,-33);ctx.lineWidth=2.4;ctx.lineCap='round';ctx.strokeStyle='rgba(249,255,218,.78)';ctx.stroke();
    ctx.restore();
  }
  function pill(ctx,x,y,w,h,r,fill,outline) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
    if(outline) {ctx.lineWidth=1;ctx.strokeStyle=outline;ctx.stroke();}
  }
  function bottle(ctx,x,y,angle,base,shaker=false) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.shadowColor='rgba(84,64,87,.18)';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
    pill(ctx,-14.5,-47,29,34,7,grad(ctx,-15,-30,14,-30,[tint(base,[140,110,146],.19),tint(base,[255,242,207],.55),rgb(base)]),'rgba(128,94,127,.62)');
    ctx.shadowColor='transparent';pill(ctx,-13,-36,26,15,2,'#fff0d5');ellipse(ctx,0,-28.8,4.6,5,tint(base,[214,131,147],.27));
    pill(ctx,-8,-16,16,7,2,'#ebdbca','#c7afab');
    if(shaker) {
      pill(ctx,-10,-11,20,11,3,'#c6b0ec','#987ea6');
      for(const xx of [-5,0,5])ellipse(ctx,xx,-1.8,1.2,.8,'#7d6484');
    } else {
      ctx.beginPath();ctx.moveTo(-6,-9);ctx.lineTo(6,-9);ctx.lineTo(2,-1);ctx.quadraticCurveTo(0,1,-2,-1);ctx.closePath();ctx.fillStyle='#fff5d7';ctx.fill();ctx.strokeStyle='#c9b8a6';ctx.stroke();
    }
    ctx.restore();
  }
  function stamp(ctx,x,y,isMold) {
    ctx.save();ctx.translate(x,y);ctx.rotate(isMold?-.07:.12);
    const w=isMold?60:30;
    ctx.shadowColor='rgba(78,57,86,.23)';ctx.shadowBlur=2;ctx.shadowOffsetY=2;
    pill(ctx,-w,-14,w*2,14,5,grad(ctx,0,-14,0,0,['#e4cbef','#bc9dce','#9479af']),'#9775a4');
    ctx.shadowColor='transparent';
    pill(ctx,-w+4,-3,w*2-8,4,2,'#ffe6bb','#cfad9d');
    pill(ctx,-8,-29,16,17,4,grad(ctx,-8,0,8,0,['#cea9bf','#ffe0c2','#d0a4b9']));
    ellipse(ctx,0,-29,isMold?22:15,9,grad(ctx,0,-38,0,-20,['#fff0ce','#efa9a6','#cc8aa7']));
    ctx.globalAlpha*=.70;ellipse(ctx,-5,-33,7,1.5,'#fff9d8');ctx.restore();
  }
  function spring() {return {value:0,speed:0,target:0};}
  function integrate(s,dt,frequency,damping) {
    s.speed+=(frequency*frequency*(s.target-s.value)-damping*s.speed)*dt;
    s.value+=s.speed*dt;
    if(Math.abs(s.speed)<.01&&Math.abs(s.value-s.target)<.001) {s.value=s.target;s.speed=0;}
  }
  function crown(shape) {return shape==='bunny'?-170:shape==='cat'?-129:-112;}
  function cleaned(next) {
    const conf={...defaults};
    for(const key of Object.keys(settings)) if(settings[key].includes(next[key]))conf[key]=next[key];
    return conf;
  }
  class Toy {
    static thumbnail(next={}, size=128) {
      const c=cleaned(next), side=clamp(Math.round(size)||128,24,768);
      const key=[c.shape,c.color,c.mix,c.face,side].join('/');
      if(thumbs.has(key)) return thumbs.get(key);
      const el=canvas(side,side),ctx=el.getContext('2d');
      const top=crown(c.shape),scale=Math.min(side/307,side/(floor-top+9));
      ctx.translate(side/2,side/2-(top+floor)*scale/2);
      ctx.scale(scale,scale);
      ctx.drawImage(skinFor(c),-OX,-OY,W,H);
      return remember(thumbs,key,el.toDataURL('image/png'),96);
    }
    constructor(el,options={}) {
      this.canvas=el;this.ctx=el.getContext('2d');this.options=options;this.config={...defaults};
      this.press=spring();this.stretch=spring();this.side=spring();this.spread=spring();this.pull=spring();
      this.pointer=null;this.cuts=[];this.dents=[];this.effects=[];this.lastAction=null;this.age=0;this.serial=0;
      this.width=0;this.height=0;this.frame=0;this.rafTime=0;this.view=null;
      this.resize=()=>{
        const rect=el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
        const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));
        if(el.width!==w||el.height!==h) {el.width=w;el.height=h;}
        this.width=rect.width;this.height=rect.height;this.dpr=dpr;this.draw();
      };
      this.observer=new ResizeObserver(this.resize);this.observer.observe(el);
      el.style.touchAction='none';
      el.addEventListener('pointerdown',event=>this.down(event));
      el.addEventListener('pointermove',event=>this.move(event));
      el.addEventListener('pointerup',event=>this.up(event));
      el.addEventListener('pointercancel',event=>this.up(event,true));
      el.addEventListener('lostpointercapture',event=>this.up(event,true));
      this.resize();
    }
    configure(next={}) {
      const old=this.config,c=cleaned({...old,...next});this.config=c;
      if(c.shape!==old.shape||c.phase!==old.phase||c.tool!==old.tool||c.step!==old.step) this.release();
      if(c.shape!==old.shape) {this.cuts=[];this.dents=[];this.spread=spring();}
      this.draw();
    }
    layout() {
      const w=this.width,h=this.height;
      const s=Math.min(w/407,h*.87/(floor-crown(this.config.shape)));
      const tall=crown(this.config.shape);
      return {s, x:w*.50, y:h*.54-(floor+tall)*s*.5};
    }
    point(event) {
      const r=this.canvas.getBoundingClientRect(),v=this.layout();
      return {x:(event.clientX-r.left-v.x)/v.s,y:(event.clientY-r.top-v.y)/v.s};
    }
    kind() {
      return this.config.phase==='play'?this.config.tool:makeTools[this.config.step];
    }
    down(event) {
      if(this.pointer||event.button>0) return;
      const p=this.point(event);
      if(Math.abs(p.x)>187||p.y<crown(this.config.shape)-18||p.y>floor+13) return;
      event.preventDefault();
      this.canvas.setPointerCapture(event.pointerId);
      const kind=this.kind();
      this.pointer={id:event.pointerId,kind,start:p,at:p};
      if(kind!=='slice') this.act(kind,p,true);
      if(kind==='squish'||kind==='mold') this.press.target=.78;
      if(kind==='stretch') {this.stretch.target=.37;this.pull.target=-.1;}
      this.wake();
    }
    move(event) {
      const a=this.pointer;if(!a||a.id!==event.pointerId)return;
      const p=this.point(event);a.at=p;
      const dx=p.x-a.start.x,dy=p.y-a.start.y;
      if(a.kind==='squish'||a.kind==='mold') {
        this.press.target=clamp(.78+dy/100,.40,1.45);
        this.side.target=clamp(dx/260,-.22,.22);
      }
      if(a.kind==='stretch') {
        this.side.target=clamp(dx/117,-.80,.8);
        this.stretch.target=clamp(.36-dy/100,0,1.35);
        this.pull.target=clamp(Math.abs(dx)/125,0,1);
      }
      if(a.kind==='poke'&&this.dents.length) {
        const d=this.dents[this.dents.length-1];
        d.x=clamp(p.x,-126,126);d.y=clamp(p.y,-85,77);d.age=0;
      }
      this.wake();
    }
    release() {
      const p=this.pointer;this.pointer=null;
      this.side.target=0;this.press.target=0;this.stretch.target=0;this.pull.target=0;
      if(p&&this.canvas.hasPointerCapture(p.id)) this.canvas.releasePointerCapture(p.id);
      this.wake();
    }
    up(event,cancel=false) {
      const a=this.pointer;if(!a||a.id!==event.pointerId) return;
      const p=this.point(event);
      if(a.kind==='slice'&&!cancel) this.act('slice',{x:(a.start.x+p.x)/2,y:p.y});
      this.release();
    }
    addCut(at) {
      if(this.cuts.length>=4) return;
      const bounds=[-148,...this.cuts,148];
      let x=clamp(at?.x??0,-90,90);
      if(!at||bounds.some(c=>Math.abs(c-x)<34)) {
        let best=1;
        for(let i=2;i<bounds.length;i++) if(bounds[i]-bounds[i-1]>bounds[best]-bounds[best-1])best=i;
        x=(bounds[best]+bounds[best-1])/2;
      }
      this.cuts.push(Math.round(x));this.cuts.sort((a,b)=>a-b);
      this.spread.value=Math.min(this.spread.value,.42);this.spread.target=1;
      return x;
    }
    act(kind=this.kind(),at=null,held=false) {
      if(!['mold','color','mix','face','squish','poke','stretch','slice'].includes(kind)) return;
      const p=at||{x:0,y:12},reduced=this.options.reducedMotion,force=reduced?.45:1;
      this.lastAction=kind;
      if(kind==='squish'||kind==='mold') {
        this.press.speed=held?3.7*force:12.4*force;
        this.side.speed=clamp(p.x/120,-1,1)*.8;
      } else if(kind==='stretch') {
        this.stretch.speed=held?2*force:12*force;
        if(!held) this.side.speed=1.9*force;
      } else if(kind==='poke') {
        const x=clamp(p.x,-127,127),y=clamp(p.y,-78,77);
        this.dents.push({x,y,age:0,held});this.dents=this.dents.slice(-9);
        this.press.speed=1.2*force;
      } else if(kind==='slice') {
        const x=this.addCut(at);
        this.effects.push({kind,x:x??p.x,y:0,t:0});
        this.press.speed=2.5*force;
      } else {
        this.press.speed=(kind==='face'?5:3.4)*force;
      }
      if(['color','mix','face','mold'].includes(kind)) {
        this.effects.push({kind,x:0,y:0,t:0,seed:++this.serial});
      }
      this.effects=this.effects.slice(-4);
      this.wake();this.draw();
      this.options.onAction?.(kind);
    }
    mend() {
      this.release();this.cuts=[];this.dents=[];this.effects=[];this.spread=spring();
      this.press.speed=3;this.lastAction=null;this.draw();this.wake();
    }
    snapshot() {
      return {slices:this.cuts.length,pieces:this.cuts.length+1,cuts:this.cuts.map(x=>Math.round((x+148)/296*100)/100),
        lastAction:this.lastAction,pressed:!!this.pointer,pokes:this.dents.length};
    }
    advance(ms) {
      let remaining=clamp(Number(ms)||0,0,6000)/1000;
      while(remaining>.00001) {
        const dt=Math.min(1/90,remaining);remaining-=dt;this.age+=dt;
        integrate(this.press,dt,13,8.8);integrate(this.stretch,dt,11,8.5);
        integrate(this.side,dt,11,8);integrate(this.pull,dt,12,9);integrate(this.spread,dt,7.8,10.5);
        this.dents.forEach(d=>{if(!d.held||!this.pointer||d!==this.dents.at(-1))d.age+=dt;});
        this.effects.forEach(e=>e.t+=dt);
      }
      this.dents=this.dents.filter(d=>d.age<1.8);this.effects=this.effects.filter(e=>e.t<1.15);
      this.draw();
    }
    wake() {
      if(this.frame) return;
      this.rafTime=performance.now();
      const tick=now=>{
        this.frame=0;const delta=Math.min(Math.max(0,now-this.rafTime),55);
        this.rafTime=now;this.advance(delta);
        const moving=[this.press,this.stretch,this.side,this.spread,this.pull].some(s=>s.speed!==0||s.value!==s.target);
        if(moving||this.effects.length||this.dents.length) this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);
    }
    paintDents(ctx) {
      const field=generateGeometry(this.config.shape);
      for (const d of this.dents) {
        const life=clamp(1-d.age/1.8,0,1);
        const r=Math.min(20*(.68+.32*life),Math.max(0,depth(field,d.x,d.y)-2)*.37);
        if (r<2) continue;
        ctx.save();ctx.translate(d.x,d.y);ctx.scale(1,.81);
        const g=ctx.createRadialGradient(-r*.1,-r*.3,0,0,0,r);
        g.addColorStop(0,'rgba(111,55,76,'+.43*life+')');g.addColorStop(.55,'rgba(130,67,87,'+.28*life+')');g.addColorStop(.84,'rgba(255,232,210,'+.34*life+')');g.addColorStop(1,'rgba(255,230,217,0)');
        ellipse(ctx,0,0,r,r,g);ctx.restore();
      }
    }
    paintPieces(ctx,art) {
      const f=generateGeometry(this.config.shape),n=this.cuts.length;
      const bounds=[-OX,...this.cuts,W-OX],spread=this.spread.value;
      const separation=(n<3?65:49)*spread;
      for(let i=0;i<=n;i++) {
        const left=bounds[i],right=bounds[i+1];
        ctx.save();ctx.translate((i-n/2)*separation,(i-n/2)*4.5*spread);
        ctx.rotate((i-n/2)*.046*spread);
        ctx.save();ctx.beginPath();ctx.rect(left,-OY,right-left,H);ctx.clip();
        ctx.drawImage(art,-OX,-OY,W,H);this.paintDents(ctx);ctx.restore();
        if(i<n) section(ctx,f,right,this.config,Math.max(1,(n<3?49:39)*spread));
        ctx.restore();
      }
    }
    paintEffects(ctx) {
      const base=colors[this.config.color],top=crown(this.config.shape);
      for(const e of this.effects) {
        const t=e.t,opacity=clamp((1.06-t)*5,0,1);
        ctx.save();ctx.globalAlpha=opacity*(this.options.reducedMotion?.75:1);
        if(e.kind==='color') {
          // An icing ribbon lands, then melts into the surface.
          const target=-76,progress=clamp(t/.40,0,1);
          const tail=clamp((t-.49)/.30,0,1);
          const startY=-103;
          const y=mix(startY,target,progress),a=mix(startY,target,tail);
          if(t<.80) {
            const g=grad(ctx,-30,0,-17,0,[tint(base,[250,231,211],.80),rgb(base),tint(base,[155,81,110],.2)]);
            ctx.strokeStyle=g;ctx.lineCap='round';ctx.lineWidth=11;
            ctx.beginPath();ctx.moveTo(-25,a);ctx.bezierCurveTo(-30,a+4,-19,y-10,-21,y);ctx.stroke();
          }
          if(t<.9) {
            ctx.save();ctx.globalAlpha*=clamp((.9-t)/.22,0,1);
            bottle(ctx,-25,startY,1.25+Math.sin(t*6)*.12,base);ctx.restore();
          }
          if(t>.30) {
            const p=clamp((t-.30)/.42,0,1);
            ctx.globalAlpha*=clamp((1-t)/.40,0,1);
            ellipse(ctx,-21,target+6,2+31*p,2+8*p,tint(base,[255,244,213],.32),.05);
            for(let i=0;i<6;i++) {
              const a=i*1.4,reach=Math.sin(Math.PI*p);
              ellipse(ctx,-21+Math.cos(a)*reach*35,target+Math.sin(a)*reach*15-7,2.5,3.6,tint(base,[255,234,226],.28));
            }
          }
        } else if(e.kind==='mix') {
          const rnd=seedRandom(40231+e.seed),originY=-92;
          if(t<.9) {
            ctx.save();ctx.globalAlpha*=clamp((.9-t)/.24,0,1);
            bottle(ctx,-11+Math.sin(t*34)*9,originY,1.07+Math.sin(t*32)*.12,[182,164,222],true);ctx.restore();
          }
          for(let i=0;i<24;i++) {
            const xx=(rnd()-.5)*174,delay=rnd()*.33,turn=rnd()*5,sz=2.6+rnd()*2,dy=rnd()*18;
            const p=clamp((t-delay)/.60,0,1);if(t<delay||p>=1)continue;
            const yy=mix(originY,-49-Math.abs(xx)*.12,p*p)-Math.sin(p*Math.PI)*dy;
            const sprinkleX=mix(-11+Math.sin(delay*34)*9,xx,p);
            if(this.config.mix==='plain') ellipse(ctx,sprinkleX,yy,sz,sz*.8,'rgba(255,248,220,.88)');
            else decoration(ctx,this.config.mix,sprinkleX+Math.sin(p*4+turn)*5*p,yy,sz,turn+p*2,candy[i%candy.length]);
          }
        } else if(e.kind==='face') {
          if(t<.65) {
            const hit=Math.sin(Math.PI*clamp(t/.65,0,1));
            ctx.save();ctx.globalAlpha*=Math.min(1,t*18,(.65-t)*12);
            stamp(ctx,7+(1-hit)*34,-17+hit*46,false);ctx.restore();
          }
          for(let i=0;i<6;i++) {
            const a=Math.PI*(i/5)*.95+.05;
            const distance=70+t*31;
            const x=-Math.cos(a)*distance,y=14-Math.sin(a)*distance*.65;
            star(ctx,x,y,Math.max(0,Math.sin(Math.PI*Math.min(1,t/.9)))*(i%2?3:5.2),'#fff5bb');
          }
        } else if(e.kind==='mold') {
          const p=clamp(t/.62,0,1);
          if(t<.67) {
            const hit=Math.sin(Math.PI*clamp(t/.67,0,1));
            ctx.save();ctx.globalAlpha*=Math.min(1,t*18,(.67-t)*11);
            stamp(ctx,0,-92+hit*37,true);ctx.restore();
          }
          ctx.lineCap='round';ctx.lineWidth=2.3*(1-p)+.3;ctx.strokeStyle='rgba(255,252,221,'+(.9*(1-p))+')';
          for(const s of [-1,1]) for(let i=0;i<3;i++) {
            const angle=-.83+i*.57,dx=s*Math.cos(angle),dy=Math.sin(angle);
            const x=s*137+dx*p*15,y=25+i*13+dy*p*12;
            ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*(8+p*5),y+dy*(8+p*5));ctx.stroke();
          }
        } else if(e.kind==='slice') {
          const p=clamp(t/.65,0,1), cutTop=-85;
          const y=mix(cutTop,77,p*p*(3-2*p));
          if(t<.88) cutter(ctx,e.x,y,clamp((.88-t)/.23,0,1));
          if(p<1) {
            ctx.strokeStyle='rgba(255,251,224,'+(1-p)+')';ctx.lineWidth=3;ctx.lineCap='round';
            ctx.beginPath();ctx.moveTo(e.x,y+17);ctx.lineTo(e.x+1,y+28);ctx.stroke();
          }
        }
        ctx.restore();
      }
      if(this.pointer?.kind==='slice') {
        const a=this.pointer;ctx.save();ctx.lineWidth=3;ctx.setLineDash([4,6]);ctx.lineCap='round';ctx.strokeStyle='#fff9db';
        ctx.beginPath();ctx.moveTo(a.start.x,a.start.y);ctx.lineTo(a.at.x,a.at.y);ctx.stroke();ctx.restore();cutter(ctx,a.at.x,a.at.y);
      }
    }
    draw() {
      const ctx=this.ctx;if(!ctx||!this.width||!this.height)return;
      const d=this.dpr,art=skinFor(this.config),v=this.layout();
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      ctx.setTransform(d*v.s,0,0,d*v.s,d*v.x,d*v.y);
      const p=this.press.value,t=this.stretch.value;
      const sx=clamp(1+.31*p-.115*t+.24*this.pull.value,.70,1.5);
      const sy=clamp(1-.37*p+.28*t-.08*this.pull.value,.48,1.4);
      const shrink=1/(1+this.cuts.length*.089*this.spread.value);
      drawShadow(ctx,0,floor,shrink*(sx+this.cuts.length*.13*this.spread.value));
      ctx.save();ctx.translate(0,floor);ctx.transform(sx*shrink,0,-this.side.value*.43,sy*Math.sqrt(shrink),0,0);ctx.translate(0,-floor);
      if(this.cuts.length)this.paintPieces(ctx,art);
      else {ctx.drawImage(art,-OX,-OY,W,H);this.paintDents(ctx);}
      ctx.restore();this.paintEffects(ctx);
    }
  }
  window.Toy=Toy;
})();
