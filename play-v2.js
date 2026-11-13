/* A photograph is the skin of each piece of gel. A triangulated texture follows
   the pressure field and the cut plane, then each newly cut piece moves freely. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const limit = (n,a,b) => Math.max(a,Math.min(b,n));
  const lerp = (a,b,t) => a+(b-a)*t;
  const smooth = n => {n=limit(n,0,1);return n*n*(3-2*n);};
  const rand = seed => () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function surface(width,height) {
    const c=document.createElement('canvas');c.width=width;c.height=height;return c;
  }
  async function getImage(value) {
    if(!value) return null;
    if(typeof value!=='string')return value;
    const img=new Image();img.decoding='async';
    const loaded=new Promise((resolve,reject)=>{img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Could not load jelly artwork: '+value));});
    img.src=value;return loaded;
  }
  function imageWidth(img){return img.naturalWidth||img.videoWidth||img.width;}
  function imageHeight(img){return img.naturalHeight||img.videoHeight||img.height;}
  function sourceTexture(img,max=980) {
    const iw=imageWidth(img),ih=imageHeight(img),scale=Math.min(1,max/Math.max(iw,ih));
    const temp=surface(Math.max(1,Math.round(iw*scale)),Math.max(1,Math.round(ih*scale)));
    const ctx=temp.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,temp.width,temp.height);
    const {width:w,height:h}=temp,data=ctx.getImageData(0,0,w,h).data;
    let l=w,b=0,r=0,t=h;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
      if(data[(y*w+x)*4+3]>=22){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}
    }
    if(r<=l||b<=t) throw new Error('The jelly texture contains no visible pixels.');
    const tex=surface(r-l+1,b-t+1),c=tex.getContext('2d',{willReadFrequently:true});
    c.drawImage(temp,l,t,tex.width,tex.height,0,0,tex.width,tex.height);
    return {image:tex,data:c.getImageData(0,0,tex.width,tex.height).data,w:tex.width,h:tex.height};
  }
  function sample(tex,u,v) {
    const x=limit(Math.round(u*(tex.w-1)),0,tex.w-1),y=limit(Math.round(v*(tex.h-1)),0,tex.h-1);
    return (y*tex.w+x)*4;
  }
  function opaque(tex,u,v) {return u>=0&&v>=0&&u<=1&&v<=1&&tex.data[sample(tex,u,v)+3]>58;}
  function ellipse(ctx,x,y,rx,ry,color,angle=0) {
    if(!(rx>0&&ry>0))return;
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.fill();
  }
  function metal(ctx,x,y,length,angle) {
    // A broad, round-ended silicone pastry scraper. Its leading edge stays
    // on the material, and the handle remains above and beside the gesture.
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(length/100,length/100);
    ctx.shadowColor='rgba(68,36,51,.27)';ctx.shadowBlur=2.8;ctx.shadowOffsetY=2.4;
    const steel=ctx.createLinearGradient(-6,-90,12,-9);
    steel.addColorStop(0,'#efebe3');steel.addColorStop(.28,'#b0c1c1');steel.addColorStop(.52,'#fbfff5');
    steel.addColorStop(.68,'#bfd0d0');steel.addColorStop(.92,'#eff5ee');steel.addColorStop(1,'#a1aba8');
    ctx.beginPath();ctx.moveTo(-21,-74);ctx.quadraticCurveTo(-23,-76,-17,-78);ctx.lineTo(7,-78);
    ctx.quadraticCurveTo(12,-78,12,-72);ctx.lineTo(12,-12);ctx.quadraticCurveTo(12,1,1,3);
    ctx.quadraticCurveTo(-3,4,-3,-2);ctx.bezierCurveTo(-4,-26,-15,-59,-21,-74);ctx.fillStyle=steel;ctx.fill();
    ctx.shadowColor='transparent';ctx.strokeStyle='rgba(105,125,125,.62)';ctx.lineWidth=.8;ctx.stroke();
    ctx.beginPath();ctx.moveTo(10,-65);ctx.lineTo(10,-12);ctx.quadraticCurveTo(10,-2,2,1);
    ctx.strokeStyle='#ffffef';ctx.lineWidth=1.3;ctx.stroke();
    const handle=ctx.createLinearGradient(-23,-95,16,-95);
    handle.addColorStop(0,'#477d76');handle.addColorStop(.15,'#82bdb1');handle.addColorStop(.4,'#bde6d5');
    handle.addColorStop(.87,'#89c3b3');handle.addColorStop(1,'#588f83');
    ctx.beginPath();ctx.moveTo(-18,-74);ctx.bezierCurveTo(-21,-81,-18,-94,-18,-106);
    ctx.bezierCurveTo(-19,-120,-19,-137,-7,-139);ctx.bezierCurveTo(8,-141,12,-132,12,-120);
    ctx.lineTo(11,-83);ctx.quadraticCurveTo(13,-72,8,-71);ctx.quadraticCurveTo(0,-67,-13,-70);ctx.closePath();
    ctx.fillStyle=handle;ctx.fill();ctx.lineWidth=1.1;ctx.strokeStyle='#6e9e95';ctx.stroke();
    ellipse(ctx,-3,-125,3.1,4.1,'#5b8c80');ellipse(ctx,-3.3,-126,2.1,2.7,'#5a8378');
    ctx.lineCap='round';ctx.strokeStyle='rgba(247,255,231,.72)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-14,-115);ctx.quadraticCurveTo(-15,-97,-14,-87);ctx.stroke();
    ctx.restore();
  }
  function shadow(ctx,x,y,w,h,opacity) {
    ctx.save();ctx.translate(x,y);ctx.scale(w,h);
    const g=ctx.createRadialGradient(0,0,.07,0,0,1);
    g.addColorStop(0,'rgba(77,55,52,'+opacity+')');g.addColorStop(.58,'rgba(85,56,50,'+opacity*.56+')');g.addColorStop(1,'rgba(97,62,50,0)');
    ellipse(ctx,0,0,1,1,g);ctx.restore();
  }

  // Draw a source triangle into a moved triangle. Expand each clip by half a
  // display pixel so separate antialiased cell edges cannot leave white seams.
  function triangle(ctx,img,a,b,c,pa,pb,pc) {
    const u=b.x-a.x,v=b.y-a.y,s=c.x-a.x,t=c.y-a.y,det=u*t-v*s;
    if(Math.abs(det)<1e-7)return;
    const dx=pb.x-pa.x,dy=pb.y-pa.y,ex=pc.x-pa.x,ey=pc.y-pa.y;
    const ax=(dx*t-ex*v)/det,bx=(dy*t-ey*v)/det,cx=(ex*u-dx*s)/det,dd=(ey*u-dy*s)/det;
    const centerX=(pa.x+pb.x+pc.x)/3,centerY=(pa.y+pb.y+pc.y)/3;
    ctx.save();ctx.beginPath();
    [pa,pb,pc].forEach((p,i)=>{
      const xx=p.x-centerX,yy=p.y-centerY,ext=.72/Math.max(1,Math.hypot(xx,yy));
      const x=p.x+xx*ext,y=p.y+yy*ext;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.closePath();ctx.clip();ctx.transform(ax,bx,cx,dd,pa.x-ax*a.x-cx*a.y,pa.y-bx*a.x-dd*a.y);
    const sx=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x)-1)),sy=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y)-1));
    const sw=Math.min(img.width-sx,Math.ceil(Math.max(a.x,b.x,c.x)+1)-sx),sh=Math.min(img.height-sy,Math.ceil(Math.max(a.y,b.y,c.y)+1)-sy);
    if(sw>0&&sh>0)ctx.drawImage(img,sx,sy,sw,sh,sx,sy,sw,sh);ctx.restore();
  }
  class GelPlay {
    constructor(el,options={}) {
      this.el=el;this.ctx=el.getContext('2d');this.options=options;this.ready=false;this.active=false;this.zoom=1;
      this.tool='cut';this.batch=0;this.age=0;this.raf=0;this.clock=0;this.loadId=0;
      this.pieces=[];this.ids=0;this.bubbles=[];this.pressions=[];this.rings=[];this.hand=null;
      this.auto=null;this.cuts=0;this.presses=0;this.pops=0;this.ambient=0;this.lastAction=null;
      this.reduced=!!options.reducedMotion;this.slant=-.055;this.assets={};this.placement=null;
      this.view={w:1,h:1,ow:1,oh:1,ox:0,oy:0};
      this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(el);
      el.style.touchAction='none';
      el.addEventListener('pointerdown',e=>this.down(e));el.addEventListener('pointermove',e=>this.move(e));
      el.addEventListener('pointerup',e=>this.up(e));el.addEventListener('pointercancel',e=>this.up(e,true));
      el.addEventListener('lostpointercapture',e=>this.up(e,true));
      this.resize();
    }
    async load(assets={}) {
      const id=++this.loadId;
      const loaf=await getImage(assets.loaf||assets.intact||assets.body);
      if(!loaf)throw new Error('A transparent loaf image is needed to play.');
      const [slice,background,cutter]=await Promise.all([getImage(assets.slice||assets.cutFace),getImage(assets.background||assets.board||assets.mat),getImage(assets.cutter)]);
      if(id!==this.loadId)return;
      this.tex=sourceTexture(loaf);this.faceTex=slice?sourceTexture(slice,550):null;this.bg=background;this.cutter=cutter;
      this.assets=assets;this.slant=Number.isFinite(assets.slant)?assets.slant:-.055;
      this.placement=assets.placement||null;this.ready=true;this.reset(this.batch);
    }
    setActive(active=true) {
      this.active=!!active;
      if(!active){this.cancel();if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;this.options.onStop?.();}
      else {this.resize();this.wake();}
    }
    setTool(tool) {
      if(!['cut','press','pop'].includes(tool))return;
      if(tool!==this.tool)this.cancel();
      this.tool=tool;this.render();
    }
    newPiece(a,b) {
      return {id:++this.ids,a,b,x:0,y:0,angle:0,vx:0,vy:0,spin:0,wobble:0,osc:0,age:0};
    }
    reset(batch=0) {
      this.cancel();this.zoom=1;this.batch=batch;this.cuts=0;this.pops=0;this.presses=0;this.lastAction=null;
      this.pieces=[this.newPiece(-.2,1.2)];this.bubbles=[];this.pressions=[];this.rings=[];this.auto=null;
      if(!this.ready)return;
      const random=rand(627181+((Number(batch)||0)%1024)*271);
      for(let i=0;i<15;i++) {
        let uv;
        for(let j=0;j<90;j++){
          const u=.13+.76*random(),v=.17+.60*random();
          if(!opaque(this.tex,u,v)||!opaque(this.tex,u+.04,v)||!opaque(this.tex,u-.04,v))continue;
          if(this.bubbles.some(b=>Math.hypot((b.u-u),(b.v-v)*.7)<.095))continue;
          uv={u,v,rad:.013+random()*.011,alive:true,t:0};break;
        }
        if(uv)this.bubbles.push(uv);
      }
      this.resize();this.wake();
    }
    resize() {
      const r=this.el.getBoundingClientRect(),w=r.width,h=r.height;
      if(!w||!h)return;
      const d=Math.min(2,window.devicePixelRatio||1),pw=Math.round(w*d),ph=Math.round(h*d);
      if(this.el.width!==pw||this.el.height!==ph) {this.el.width=pw;this.el.height=ph;}
      const p=this.placement||{},ratio=this.ready?this.tex.w/this.tex.h:1.6;
      const ow=Math.min(w*(p.width||.78),h*(p.height||.71)*ratio)*this.zoom,oh=ow/ratio;
      const old=this.view;
      this.view={w,h,d,ow,oh,ox:(p.x??.5)*w-ow/2,oy:(p.y??.55)*h-oh/2};
      if(old.w>1) for(const piece of this.pieces) {
        piece.x*=w/old.w;piece.y*=h/old.h;this.keepVisible(piece);
      }
      this.render();
    }
    coord(e) {
      const r=this.el.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};
    }
    bounds(piece) {
      return {a:Math.max(0,piece.a),b:Math.min(1,piece.b)};
    }
    center(piece) {
      const v=this.view,b=this.bounds(piece);
      return {x:v.ox+(b.a+b.b)*.5*v.ow,y:v.oy+.51*v.oh};
    }
    local(piece,p) {
      const v=this.view,c=this.center(piece),dx=p.x-c.x-piece.x,dy=p.y-c.y-piece.y;
      const co=Math.cos(piece.angle),si=Math.sin(piece.angle);
      return {u:(c.x+co*dx+si*dy-v.ox)/v.ow,v:(c.y-si*dx+co*dy-v.oy)/v.oh};
    }
    world(piece,u,v) {
      const a=this.view,c=this.center(piece),dx=a.ox+u*a.ow-c.x,dy=a.oy+v*a.oh-c.y;
      const co=Math.cos(piece.angle),si=Math.sin(piece.angle);
      return {x:c.x+piece.x+co*dx-si*dy,y:c.y+piece.y+si*dx+co*dy};
    }
    intercept(u,v) {return u-this.slant*(v-.5);}
    cutX(intercept,v) {return intercept+this.slant*(v-.5);}
    hit(pos,tolerance=0) {
      for(let i=this.pieces.length-1;i>=0;i--) {
        const piece=this.pieces[i],a=this.local(piece,pos),cut=this.intercept(a.u,a.v);
        if(cut>=piece.a-tolerance&&cut<=piece.b+tolerance&&
          (opaque(this.tex,a.u,a.v)||tolerance&&opaque(this.tex,limit(a.u,.04,.96),limit(a.v,.08,.92))))return {piece,...a};
        for(const [edge,side] of [[piece.face,1],[piece.leftFace,-1]]) {
          if(!edge||a.v<edge.top||a.v>edge.bottom)continue;
          const distance=(cut-edge.ix)*side;
          if(distance>=0&&distance<.089)return {piece,u:this.cutX(edge.ix-side*.009,a.v),v:a.v};
        }
      }
      return null;
    }
    state() {
      return {ready:this.ready,active:this.active,tool:this.tool,batch:this.batch,pieces:this.pieces.length,
        cuts:this.cuts,slices:this.cuts,pops:this.pops,presses:this.presses,bubbles:this.bubbles.filter(b=>b.alive).length,
        touching:!!this.hand,action:this.hand?.mode||this.auto?.mode||this.lastAction,cutProgress:Number((this.hand?.progress||this.auto?.progress||0).toFixed(2))};
    }
    sound(kind,strength) {this.options.onSound?.(kind,limit(strength,0,1));}
    motion(kind,strength) {this.options.onMotion?.(kind,limit(strength,0,1));}
    cancel() {
      const h=this.hand;this.hand=null;this.auto=null;
      if(h) {
        try{if(this.el.hasPointerCapture(h.id))this.el.releasePointerCapture(h.id);}catch{}
        this.options.onStop?.();
      }
    }
    cutAt(piece,u,v) {
      const b=this.bounds(piece),margin=.055,interval=b.b-b.a;
      if(interval<.098||this.pieces.length>=9)return null;
      const edge=Math.min(margin,interval*.40);
      return limit(this.intercept(u,v),b.a+edge,b.b-edge);
    }
    startCut(piece,u,v,automatic=false) {
      const ix=this.cutAt(piece,u,v);if(ix===null)return null;
      const {top,bottom}=this.profile(ix),start=this.world(piece,this.cutX(ix,top),top);
      return {mode:'cut',piece,ix,start,at:start,top,bottom,progress:0,travel:0,t:0,automatic};
    }
    profile(ix) {
      let top=1,bottom=0;
      for(let i=0;i<=190;i++){
        const v=i/190;
        if(opaque(this.tex,this.cutX(ix,v),v)){top=Math.min(top,v);bottom=Math.max(bottom,v);}
      }
      if(top>=bottom){top=.12;bottom=.90;}
      return {top,bottom};
    }
    down(e) {
      if(!this.ready||!this.active||this.hand||e.button>0)return;
      const pos=this.coord(e),hit=this.hit(pos,.022);
      if(!hit)return;
      e.preventDefault();this.el.setPointerCapture(e.pointerId);this.auto=null;
      const {piece,u,v}=hit;
      const base={id:e.pointerId,mode:this.tool,piece,point:pos,previous:pos,grab:pos,at:pos,u,v,t:0,moved:0,
        startX:piece.x,startY:piece.y,prevTime:performance.now(),velocity:{x:0,y:0},feedback:0};
      this.hand=base;
      if(this.tool==='cut') {
        const cut=this.startCut(piece,u,v);
        if(!cut) base.mode='drag';
        else Object.assign(base,cut,{at:pos,grab:pos,point:pos,previous:pos});
      } else if(this.tool==='press') {
        this.presses++;this.notify('press');this.sound('press',.42);this.motion('press',.14);
      } else this.popAt(piece,u,v);
      this.wake();
    }
    move(e) {
      const h=this.hand;if(!h||h.id!==e.pointerId)return;
      const p=this.coord(e),dx=p.x-h.grab.x,dy=p.y-h.grab.y;
      const dist=Math.hypot(dx,dy),dt=limit((performance.now()-h.prevTime)/1000,.005,.14);
      const sx=p.x-h.previous.x,sy=p.y-h.previous.y;
      h.velocity={x:lerp(h.velocity.x,sx/dt,.38),y:lerp(h.velocity.y,sy/dt,.38)};
      h.prevTime=performance.now();h.previous=p;h.point=p;h.at=p;h.moved=Math.max(h.moved,dist);
      if(h.mode==='cut'&&this.pieces.length>1&&dist>9&&Math.abs(dx)>Math.abs(dy)*1.35&&h.progress<.25) {
        h.mode='drag';this.motion('drag',.12);
      }
      if(h.mode==='cut') {
        // Both downstrokes and upstrokes work. A sideways stroke through an
        // intact loaf also works, so children do not need a prescribed gesture.
        const travel=this.pieces.length===1?Math.max(Math.abs(dy),Math.abs(dx)*.84,dist*.74):Math.max(Math.abs(dy),dist*.64);
        const needed=limit((h.bottom-h.top)*this.view.oh*.62,45,170);
        h.travel=Math.max(h.travel,travel);
        const before=h.progress;h.progress=Math.min(1,h.travel/needed);
        if(h.progress-before>.009) {this.motion('cut',.16+.67*h.progress);this.options.onProgress?.('cut',h.progress);h.feedback+=h.progress-before;}
        if(h.feedback>.17){this.sound('cut',.19+.27*h.progress);h.feedback=0;}
        if(h.progress>=1){this.split(h);h.mode='finished';}
      } else if(h.mode==='drag') {
        h.piece.x=h.startX+dx;h.piece.y=h.startY+dy;
        h.piece.angle=limit(h.piece.angle+sx*.0008,-.48,.48);
        this.keepVisible(h.piece);h.piece.vx=0;h.piece.vy=0;
      } else if(h.mode==='press') {
        const uv=this.local(h.piece,p);h.u=limit(uv.u,0,1);h.v=limit(uv.v,0,1);
        if(this.pieces.length>1&&dist>this.view.ow*.11){
          h.piece.x=h.startX+dx*.76;h.piece.y=h.startY+dy*.76;this.keepVisible(h.piece);
        }
        this.motion('press',limit(dist/this.view.ow+.25,0,.8));
      } else if(h.mode==='pop') {
        const uv=this.local(h.piece,p);
        if(h.feedback>.09) {this.popAt(h.piece,uv.u,uv.v,true);h.feedback=0;}
        h.feedback+=dt;
      }
      this.wake();
    }
    up(e,canceled=false) {
      const h=this.hand;if(!h||e.pointerId!==h.id)return;
      this.hand=null;
      if(!canceled) {
        if(h.mode==='cut') {
          if(h.moved<9||h.progress>.72){h.automatic=true;h.t=0;h.atStart=h.progress;this.auto=h;}
          else {this.auto={...h,mode:'retreat',t:0,atStart:h.progress};}
        } else if(h.mode==='press') {
          this.pressions.push({piece:h.piece,u:h.u,v:h.v,age:0,strength:.72,dx:limit((h.point.x-h.grab.x)/this.view.ow,-.3,.3),dy:limit((h.point.y-h.grab.y)/this.view.oh,-.3,.3)});
          h.piece.wobble=.42;h.piece.osc=0;this.sound('release',.28);
        } else if(h.mode==='drag') {
          h.piece.vx=limit(h.velocity.x*.17,-280,280);h.piece.vy=limit(h.velocity.y*.17,-200,200);
          h.piece.spin=limit(h.velocity.x*.00008,-.65,.65);h.piece.wobble=.28;h.piece.osc=0;this.notify('drag');
        } else if(h.mode==='finished')this.options.onStop?.();
      }
      try{if(this.el.hasPointerCapture(h.id))this.el.releasePointerCapture(h.id);}catch{}
      if(!this.auto)this.options.onStop?.();
      this.wake();
    }
    notify(kind) {this.lastAction=kind;this.options.onAction?.(kind,this.state());}
    split(h) {
      if(!this.pieces.includes(h.piece)||h.done)return;
      const old=h.piece,i=this.pieces.indexOf(old),ix=h.ix;h.done=true;
      const left=this.newPiece(old.a,ix),right=this.newPiece(ix,old.b);
      for(const p of [left,right]) {
        Object.assign(p,{x:old.x,y:old.y,angle:old.angle*.94,wobble:.94,osc:0});
      }
      const scale=this.reduced?.67:1,span=this.view.ow;
      const leftShare=(Math.min(1,old.b)-ix)/Math.max(.12,Math.min(1,old.b)-Math.max(0,old.a));
      const spacing=Math.min(149,span*(this.pieces.length>4?.16:.22));
      left.vx=-spacing*(.32+leftShare*.67)*4.1*scale;
      right.vx=spacing*(.34+(1-leftShare)*.88)*4.1*scale;
      left.vy=-7;right.vy=span*.072*scale;
      left.spin=-.22*scale;right.spin=.40*scale;
      const seam=this.makeFace(ix);
      left.face=seam;left.faceBorn=this.age;
      right.leftFace=seam;right.leftBorn=this.age;
      right.face=old.face;right.faceBorn=old.faceBorn;
      left.leftFace=old.leftFace;left.leftBorn=old.leftBorn;
      this.pieces.splice(i,1,left,right);this.cuts++;
      this.pressions=this.pressions.filter(p=>p.piece!==old);
      this.auto={mode:'lift',ix,piece:left,top:h.top,bottom:h.bottom,progress:1,t:0};
      this.sound('cut',.88);this.motion('cut',1);this.options.onProgress?.('cut',1);this.notify('cut');
    }
    makeFace(ix) {
      const w=180,h=300,out=surface(w,h),ctx=out.getContext('2d'),img=ctx.createImageData(w,h),d=img.data;
      const source=this.tex,photo=this.faceTex,profile=this.profile(ix),noise=rand(Math.round(ix*19421)+245);
      // Match the layers at the cut to the exact pixel rows on the loaf. The
      // inner photograph supplies the wet texture of the newly exposed face.
      for(let y=0;y<h;y++) {
        const v=lerp(profile.top,profile.bottom,(y+.5)/h);
        const center=this.cutX(ix,v);
        for(let x=0;x<w;x++) {
          const u=(x+.5)/w,fy=(y+.5)/h;
          const row=limit(v+Math.sin(u*6.1+v*3)*.010*Math.sin(Math.PI*u),.002,.998);
          const sx=limit(center+u*.045,.015,.985),pi=sample(source,sx,row);
          const pi2=sample(source,limit(sx+.013,0,1),row),p=(y*w+x)*4;
          const section=photo?sample(photo,.19+u*.56,.06+fy*.88):0;
          const reference=photo?.data;const grain=(noise()-.5)*4;
          const angularLight=.89+.11*Math.sin(u*Math.PI)+.055*Math.sin(fy*Math.PI);
          const depthGlow=12*Math.exp(-((u-.70)**2/.07+(fy-.36)**2/.12));
          for(let k=0;k<3;k++) {
            const base=(source.data[pi+k]*.73+source.data[pi2+k]*.27);
            const ph=reference&&reference[section+3]>90?reference[section+k]:base;
            const color=base*.23+ph*.77;
            d[p+k]=limit(color*angularLight+grain+depthGlow+[5,2,1][k],0,255);
          }
          d[p+3]=255;
        }
      }
      ctx.putImageData(img,0,0);
      const random=rand(3981+Math.round(ix*7382));
      for(let i=0;i<52;i++) {
        const x=random()*w,y=random()*h,r=1+random()**2*5;
        const g=ctx.createRadialGradient(x-r*.22,y-r*.28,0,x,y,r);
        g.addColorStop(0,'rgba(255,248,221,.09)');g.addColorStop(.60,'rgba(132,53,74,.10)');
        g.addColorStop(.86,'rgba(255,254,229,.45)');g.addColorStop(1,'rgba(161,62,83,.12)');
        ellipse(ctx,x,y,r,r*.9,g);ellipse(ctx,x-r*.45,y-r*.37,r*.27,r*.16,'rgba(255,253,231,.8)');
      }
      return {image:out,ix,...profile};
    }
    popAt(piece,u,v,sweep=false) {
      if(!opaque(this.tex,u,v))return;
      let nearest=null,best=Infinity;
      for(const b of this.bubbles) {
        const ix=this.intercept(b.u,b.v);
        if(!b.alive||ix<piece.a||ix>piece.b)continue;
        const distance=Math.hypot(b.u-u,(b.v-v)*this.tex.h/this.tex.w);
        if(distance<best){best=distance;nearest=b;}
      }
      if(!nearest||best>(sweep?.055:.105)) {
        if(sweep)return;
        nearest={u,v,rad:.018,alive:true,t:0,transient:true};
        this.bubbles.push(nearest);
      }
      nearest.alive=false;nearest.t=0;
      this.pops++;this.rings.push({piece,u:nearest.u,v:nearest.v,age:0,rad:nearest.rad});
      nearest.respawn=1.9+((this.pops*31)%9)*.11;
      this.sound('pop',.6+nearest.rad*7);this.motion('pop',.72);this.notify('pop');
    }
    tap() {
      if(!this.ready||!this.active)return;
      const width=p=>Math.min(p.b,1)-Math.max(0,p.a);
      const piece=this.pieces.reduce((a,b)=>width(a)>width(b)?a:b),range=this.bounds(piece);
      const u=(range.a+range.b)/2,v=.47;
      if(this.tool==='cut') {
        const h=this.startCut(piece,u,v,true);
        if(!h){this.reset(this.batch);this.notify('reform');return;}
        this.auto=h;
      } else if(this.tool==='press') {
        this.presses++;this.pressions.push({piece,u,v,age:0,strength:.98,dx:.09,dy:.17});
        piece.wobble=.55;piece.osc=0;this.sound('press',.72);this.motion('press',.55);this.notify('press');
      } else {
        const b=this.bubbles.find(b=>b.alive&&this.intercept(b.u,b.v)>piece.a&&this.intercept(b.u,b.v)<piece.b);
        this.popAt(piece,b?.u??u,b?.v??v);
      }
      this.wake();
    }
    keepVisible(piece) {
      const v=this.view,c=this.center(piece),b=this.bounds(piece),co=Math.abs(Math.cos(piece.angle)),si=Math.abs(Math.sin(piece.angle));
      const leftRoom=piece.leftFace?v.ow*.113:0,rightRoom=piece.face?v.ow*.12:0;
      const radiusX=(b.b-b.a)*v.ow*.5*co+v.oh*.5*si+Math.abs(this.slant)*v.ow*.35;
      const radiusY=v.oh*.5*co+(b.b-b.a)*v.ow*.5*si;
      piece.x=limit(piece.x,4-c.x+radiusX+leftRoom,v.w-4-c.x-radiusX-rightRoom);
      piece.y=limit(piece.y,4-c.y+radiusY,v.h-4-c.y-radiusY);
    }
    update(dt) {
      if(!this.active||!this.ready)return false;
      this.age+=dt;let moving=false;
      const targetZoom=1/(1+.067*(this.pieces.length-1));
      if(Math.abs(this.zoom-targetZoom)>.001) {
        this.zoom=lerp(this.zoom,targetZoom,1-Math.exp(-4.7*dt));
        const view=this.view,p=this.placement||{},ratio=this.tex.w/this.tex.h;
        view.ow=Math.min(view.w*(p.width||.78),view.h*(p.height||.71)*ratio)*this.zoom;
        view.oh=view.ow/ratio;view.ox=(p.x??.5)*view.w-view.ow/2;view.oy=(p.y??.55)*view.h-view.oh/2;
        moving=true;
      }
      for(const p of this.pieces) {
        p.age+=dt;
        if(Math.abs(p.vx)+Math.abs(p.vy)+Math.abs(p.spin)>.08) {
          p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle=limit(p.angle+p.spin*dt,-.45,.45);
          const decay=Math.exp(-3.85*dt);p.vx*=decay;p.vy*=decay;p.spin*=decay;this.keepVisible(p);moving=true;
        }
        if(p.wobble>.006){p.osc+=dt;p.wobble*=Math.exp(-4.85*dt);moving=true;}else p.wobble=0;
      }
      if(this.hand) {this.hand.t+=dt;moving=true;}
      const a=this.auto;
      if(a) {
        a.t+=dt;
        if(a.mode==='cut') {
          a.progress=lerp(a.atStart||0,1,smooth(a.t/.63));
          this.motion('cut',.19+a.progress*.62);this.options.onProgress?.('cut',a.progress);
          if(a.t<dt*1.1)this.sound('cut',.22);
          if(a.progress>.997)this.split(a);
        } else if(a.mode==='retreat') {
          a.progress=a.atStart*(1-smooth(a.t/.23));if(a.t>=.23){this.auto=null;this.options.onStop?.();}
        } else if(a.mode==='lift'&&a.t>.42) {this.auto=null;this.options.onStop?.();}
        moving=true;
      }
      for(const b of this.bubbles)if(!b.alive) {
        b.t+=dt;if(b.t>=b.respawn){b.t=0;b.alive=true;}moving=true;
      }
      this.bubbles=this.bubbles.filter(b=>!b.transient||!b.alive);
      this.pressions.forEach(p=>p.age+=dt);
      this.pressions=this.pressions.filter(p=>p.age<1.35);
      this.rings.forEach(r=>r.age+=dt);this.rings=this.rings.filter(r=>r.age<.63);
      return moving||this.pressions.length>0||this.rings.length>0;
    }
    wake() {
      if(this.raf||!this.active||!this.ready)return;
      this.clock=performance.now();
      const frame=now=>{
        this.raf=0;
        const delta=limit((now-this.clock)/1000,0,.042);this.clock=now;
        const moving=this.update(delta);this.render();
        if(moving&&this.active)this.raf=requestAnimationFrame(frame);
      };
      this.raf=requestAnimationFrame(frame);
    }
    advance(ms) {
      let left=limit(ms,0,5000)/1000;
      while(left>0.0001){const dt=Math.min(.016,left);this.update(dt);left-=dt;}
      this.render();
    }
    warp(piece,u,v) {
      const view=this.view;
      let x=view.ox+u*view.ow,y=view.oy+v*view.oh;
      const anchor=this.center(piece),bounce=piece.wobble*Math.sin(piece.osc*22);
      if(bounce){
        x+=(x-anchor.x)*bounce*.066;
        y-=(y-(view.oy+view.oh*.9))*bounce*.07;
      }
      const press=(cu,cv,strength,dx,dy)=>{
        const ru=u-cu,rv=(v-cv)*view.oh/view.ow;
        const dist=ru*ru+rv*rv;
        const near=Math.exp(-dist/.013),support=Math.exp(-dist/.052);
        x+=((dx*.39)*near+ru*.29*support)*strength*view.ow;
        y+=((dy*.26+.065)*near+rv*.21*support)*strength*view.ow;
      };
      if(this.hand?.mode==='press'&&this.hand.piece===piece) {
        const h=this.hand;
        press(h.u,h.v,Math.min(1,.22+h.t*5),limit((h.point.x-h.grab.x)/view.ow,-.28,.28),limit((h.point.y-h.grab.y)/view.oh,-.23,.23));
      }
      for(const d of this.pressions)if(d.piece===piece) {
        const t=d.age,f=d.strength*Math.exp(-t*4)*Math.cos(t*14);
        press(d.u,d.v,f,d.dx,d.dy);
      }
      for(const r of this.rings)if(r.piece===piece) {
        const dx=u-r.u,dy=(v-r.v)*view.oh/view.ow,d=Math.hypot(dx,dy);
        const wave=Math.sin((d-r.age*.22)*75)*Math.exp(-((d-r.age*.15)**2)/.002-r.age*8);
        x+=dx*wave*view.ow*.20;y+=dy*wave*view.ow*.20;
      }
      const cut=this.hand?.mode==='cut'?this.hand:this.auto;
      if(cut&&cut.piece===piece&&['cut','retreat'].includes(cut.mode)) {
        const tip=lerp(cut.top,cut.bottom,cut.progress),dist=(u-this.cutX(cut.ix,v));
        const contact=Math.exp(-dist*dist/.006-(v-tip)**2/.042);
        y+=contact*view.oh*.10*(1-.7*cut.progress);x+=Math.sign(dist)*Math.exp(-dist*dist/.009)*smooth((tip-v+.08)*5)*cut.progress*view.ow*.012;
      }
      return {x,y};
    }
    paintSkin(ctx,p) {
      const t=this.tex,view=this.view,range=this.bounds(p),isWhole=this.pieces.length===1;
      const deform=(this.hand?.piece===p&&['cut','press'].includes(this.hand.mode))||
        (this.auto?.piece===p&&['cut','retreat'].includes(this.auto.mode))||
        this.pressions.some(q=>q.piece===p)||this.rings.some(q=>q.piece===p);
      const bounds=()=>{
        const l=p.a<0?-1:p.a,r=p.b>1?2:p.b;
        ctx.beginPath();ctx.moveTo(view.ox+this.cutX(l,0)*view.ow,view.oy-1);
        ctx.lineTo(view.ox+this.cutX(r,0)*view.ow,view.oy-1);
        ctx.lineTo(view.ox+this.cutX(r,1)*view.ow,view.oy+view.oh+1);
        ctx.lineTo(view.ox+this.cutX(l,1)*view.ow,view.oy+view.oh+1);ctx.closePath();ctx.clip();
      };
      if(!deform) {
        ctx.save();if(!isWhole)bounds();
        if(p.wobble){
          const wob=p.wobble*Math.sin(p.osc*22),c=this.center(p),bottom=view.oy+view.oh*.90;
          ctx.translate(c.x,bottom);ctx.scale(1+wob*.066,1-wob*.07);ctx.translate(-c.x,-bottom);
        }
        ctx.drawImage(t.image,view.ox,view.oy,view.ow,view.oh);ctx.restore();return;
      }
      const rows=11,cols=Math.max(3,Math.ceil((range.b-range.a)*16));
      const source=[],dest=[];
      for(let j=0;j<=rows;j++) {
        const v=j/rows,left=p.a<0?0:limit(this.cutX(p.a,v),0,1),right=p.b>1?1:limit(this.cutX(p.b,v),0,1);
        for(let i=0;i<=cols;i++) {
          const u=lerp(left,right,i/cols);source.push({x:u*t.w,y:v*t.h});dest.push(this.warp(p,u,v));
        }
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;
        triangle(ctx,t.image,source[a],source[b],source[d],dest[a],dest[b],dest[d]);
        triangle(ctx,t.image,source[a],source[d],source[c],dest[a],dest[d],dest[c]);
      }
    }
    paintFace(ctx,p,side) {
      const f=side===1?p.face:p.leftFace;if(!f)return;
      const born=side===1?p.faceBorn:p.leftBorn;
      const v=this.view,open=smooth((this.age-born)/.56);
      const width=v.ow*Math.min(.10,(side===1?.088:.061)+Math.abs(p.angle)*.10)*open;
      if(width<.15)return;
      const h=(f.bottom-f.top)*v.oh,top=v.oy+f.top*v.oh,rows=85;
      function outline(rel){
        const ends=Math.max(0,Math.min(1,rel/.12,(1-rel)/.13));
        return Math.sqrt(Math.max(0,1-(1-ends)**2));
      }
      const rowAt=(r)=>{
        const yy=lerp(f.top,f.bottom,r),x=v.ox+this.cutX(f.ix,yy)*v.ow;
        return {x,y:top+h*r,width:width*outline(r)};
      };
      const photo=f.image;
      const raw=c=>{
        // One smooth photograph across the whole cut, clipped by the real
        // silhouette. Sampling strips would staircase the rounded corners.
        const first=rowAt(0),last=rowAt(1);
        c.save();c.transform(side*width,0,last.x-first.x,h,first.x-.4*side,top);
        c.drawImage(photo,0,0,1,1);c.restore();
      };
      ctx.save();ctx.beginPath();
      for(let i=0;i<=rows;i++){const a=rowAt(i/rows);if(!i)ctx.moveTo(a.x,a.y);else ctx.lineTo(a.x,a.y);}
      for(let i=rows;i>=0;i--){const a=rowAt(i/rows);ctx.lineTo(a.x+side*a.width,a.y);}
      ctx.closePath();ctx.clip();raw(ctx);
      const middle=rowAt(.5),shine=ctx.createLinearGradient(middle.x,0,middle.x+side*width,0);
      shine.addColorStop(0,'rgba(145,35,46,.24)');shine.addColorStop(.22,'rgba(255,246,214,.04)');
      shine.addColorStop(.84,'rgba(253,248,219,.10)');shine.addColorStop(.97,'rgba(255,255,226,.50)');shine.addColorStop(1,'rgba(102,33,48,.32)');
      ctx.fillStyle=shine;ctx.fillRect(middle.x-v.ow*.30,top-3,width+v.ow*.62,h+6);ctx.restore();
    }
    bead(ctx,p,b,highlighted) {
      const v=this.view,pos=this.warp(p,b.u,b.v),r=b.rad*v.ow*(highlighted?1:.61);
      const {x,y}=pos;
      if(!b.alive) {
        const power=limit(1-b.t/1.6,0,1);
        if(power<=0)return;
        const g=ctx.createRadialGradient(x-r*.15,y-r*.18,0,x,y,r*1.25);
        g.addColorStop(0,'rgba(80,25,47,'+.31*power+')');g.addColorStop(.55,'rgba(129,33,57,'+.18*power+')');
        g.addColorStop(.85,'rgba(255,234,207,'+.31*power+')');g.addColorStop(1,'rgba(245,182,188,0)');
        ellipse(ctx,x,y,r*1.27,r*1.12,g);return;
      }
      const g=ctx.createRadialGradient(x-r*.19,y-r*.22,r*.05,x,y,r);
      g.addColorStop(0,'rgba(255,240,223,.09)');g.addColorStop(.44,'rgba(255,238,218,.03)');
      g.addColorStop(.68,'rgba(98,40,61,.15)');g.addColorStop(.85,'rgba(243,222,202,.14)');
      g.addColorStop(.94,'rgba(255,255,233,.49)');g.addColorStop(1,'rgba(105,50,66,.24)');
      ellipse(ctx,x,y,r,r*.93,g,-.15);
      ctx.save();ctx.translate(x,y);ctx.rotate(-.32);ellipse(ctx,-r*.36,-r*.52,r*.27,r*.105,'rgba(255,255,243,.85)');
      ellipse(ctx,r*.3,r*.52,r*.14,r*.064,'rgba(255,244,224,.72)');ctx.restore();
    }
    pigmentRing(ctx,p,d) {
      const q=this.warp(p,d.u,d.v),v=this.view;
      const life=d.age===undefined?1:Math.exp(-d.age*5),r=v.ow*.092;
      const g=ctx.createRadialGradient(q.x-r*.1,q.y-r*.12,.1,q.x,q.y,r);
      g.addColorStop(0,'rgba(115,48,60,'+.20*life+')');g.addColorStop(.65,'rgba(124,57,68,'+.04*life+')');
      g.addColorStop(.84,'rgba(255,243,216,'+.16*life+')');g.addColorStop(1,'rgba(255,243,216,0)');
      ellipse(ctx,q.x,q.y,r,r*.76,g);
    }
    render() {
      const ctx=this.ctx,v=this.view;if(!ctx||!v.w||!v.d)return;
      ctx.setTransform(v.d,0,0,v.d,0,0);ctx.clearRect(0,0,v.w,v.h);
      if(!this.ready)return;
      if(this.bg) {
        const iw=imageWidth(this.bg),ih=imageHeight(this.bg),z=Math.max(v.w/iw,v.h/ih);
        ctx.drawImage(this.bg,(v.w-iw*z)/2,(v.h-ih*z)/2,iw*z,ih*z);
      }
      for(const p of this.pieces) {
        const b=this.bounds(p),c=this.world(p,(b.a+b.b)/2,.965);
        shadow(ctx,c.x+v.ow*.023,c.y+v.oh*.025,(b.b-b.a)*v.ow*.58+4,v.oh*.107,.37);
        shadow(ctx,c.x,c.y,(b.b-b.a)*v.ow*.49,v.oh*.031,.47);
      }
      const activePress=this.hand?.mode==='press'?this.hand:null;
      for(const p of this.pieces) {
        const c=this.center(p);
        ctx.save();ctx.translate(c.x+p.x,c.y+p.y);ctx.rotate(p.angle);ctx.translate(-c.x,-c.y);
        this.paintSkin(ctx,p);this.paintFace(ctx,p,1);this.paintFace(ctx,p,-1);
        for(const b of this.bubbles){
          const ix=this.intercept(b.u,b.v);
          if(ix>=p.a&&ix<p.b)this.bead(ctx,p,b,this.tool==='pop');
        }
        if(activePress?.piece===p)this.pigmentRing(ctx,p,activePress);
        for(const d of this.pressions)if(d.piece===p)this.pigmentRing(ctx,p,d);
        for(const r of this.rings)if(r.piece===p&&r.age<.39) {
          const q=this.warp(p,r.u,r.v),life=1-r.age/.39,rad=r.rad*v.ow;
          ctx.lineWidth=1.2*life;ctx.strokeStyle='rgba(255,241,213,'+.65*life+')';
          ctx.beginPath();ctx.ellipse(q.x,q.y,rad*(1+2.2*(1-life)),rad*(.82+1.6*(1-life)),0,0,TAU);ctx.stroke();
          for(let j=0;j<5;j++){const a=-2.9+j*.63,len=rad*(1.4+3.4*(1-life));
            ellipse(ctx,q.x+Math.cos(a)*len,q.y+Math.sin(a)*len,rad*.16*life,rad*.23*life,'rgba(255,243,222,'+life+')',a);}
        }
        ctx.restore();
      }
      const a=this.hand?.mode==='cut'?this.hand:this.auto;
      if(a&&['cut','retreat','lift'].includes(a.mode)) {
        const heightAt=lerp(a.top,a.bottom,a.progress);
        const tip=this.world(a.piece,this.cutX(a.ix,heightAt),heightAt);
        const lift=a.mode==='lift'?smooth(a.t/.42):0;
        if(a.progress>.012&&a.progress<.999) {
          const start=this.world(a.piece,this.cutX(a.ix,a.top+.006),a.top+.006);
          ctx.lineCap='round';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(tip.x,tip.y);
          ctx.lineWidth=limit(v.ow*.009,2,5);ctx.strokeStyle='rgba(109,37,52,.52)';ctx.stroke();
          ctx.beginPath();ctx.moveTo(start.x+1.6,start.y);ctx.lineTo(tip.x+1.6,tip.y);
          ctx.lineWidth=1.3;ctx.strokeStyle='rgba(255,239,219,.77)';ctx.stroke();
        }
        ctx.save();ctx.globalAlpha=1-lift;
        if(this.cutter) {
          const img=this.cutter,aspect=imageWidth(img)/imageHeight(img);
          const size=limit(v.oh*.71,108,234),w=size*Math.min(1,aspect),h=w/aspect;
          const grip=this.assets.cutterTip||{x:.20,y:.99};
          ctx.translate(tip.x,tip.y-lift*v.oh*.21);ctx.rotate(-.08+lift*.18);
          ctx.drawImage(img,-w*grip.x,-h*grip.y,w,h);
        } else metal(ctx,tip.x,tip.y-lift*v.oh*.21,limit(v.oh*.55,64,144),.43+this.slant*.24+lift*.3);
        ctx.restore();
      }
    }
  }
  window.GelPlay=GelPlay;
})();
