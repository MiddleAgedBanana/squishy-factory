/* Photographic materials retain their source lighting as the child moves them. */
(() => {
  'use strict';
  const width=960, height=640;
  const bowl={x:473,y:315,rx:268,ry:253};
  const flavors=['#e94170','#7869cf','#ef9e26','#4cbd9b'];
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const ease=v=>{v=clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const wrap=n=>Math.atan2(Math.sin(n),Math.cos(n));
  const imageSize=img=>[img.naturalWidth||img.width,img.naturalHeight||img.height];

  // WebGL performs a polar displacement within the photographed liquid; the
  // glass rim and the reflection on the worktop stay in their real positions.
  function makeVortex() {
    const surface=document.createElement('canvas');
    const gl=surface.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:false,premultipliedAlpha:true});
    if (!gl) return null;
    const shaders=[];
    function shader(type,code) {
      const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,code);gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    }
    try {
      const program=gl.createProgram();
      gl.attachShader(program,shader(gl.VERTEX_SHADER,`
        attribute vec2 a; varying vec2 uv;
        void main(){uv=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}
      `));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
        precision highp float; varying vec2 uv; uniform sampler2D photo;
        uniform vec2 finger,flow; uniform float turn,progress,force;
        void main(){
          vec2 center=vec2(.4927,.4922), axes=vec2(.2792,.3953);
          vec2 d=(uv-center)/axes;
          float r=length(d), edge=1.-smoothstep(.925,1.,r);
          vec2 local=(uv-finger)/axes; float wake=exp(-dot(local,local)*5.5);
          vec2 displaced=d-flow*wake*edge*force*.24;
          float angle=turn*(1.-smoothstep(.02,1.,r))*1.35 +
                      sin(r*5.6-turn*.65)*.13*progress;
          float c=cos(angle),s=sin(angle);
          vec2 bent=mat2(c,-s,s,c)*displaced;
          bent*=1.+.02*sin(r*20.-turn*2.)*edge*force;
          vec2 pos=center+bent*axes;
          vec3 src=texture2D(photo,uv).rgb, col=texture2D(photo,pos).rgb;
          // Fold neighbouring ribbons together without softening the air
          // pockets and bright, wet highlights on the surface.
          float a=progress*.58;
          vec2 neighbour=mat2(cos(a),-sin(a),sin(a),cos(a))*bent;
          vec3 other=texture2D(photo,center+neighbour*axes).rgb;
          float highlight=smoothstep(.68,.99,max(col.r,max(col.g,col.b))) *
                          smoothstep(.24,.82,min(col.r,min(col.g,col.b)));
          col=mix(col,other,progress*.36*(1.-highlight));
          gl_FragColor=vec4(mix(src,col,edge),1.);
        }
      `));
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
      for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
      for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
      const keys=['turn','progress','force','finger','flow'];
      const uniforms=Object.fromEntries(keys.map(k=>[k,gl.getUniformLocation(program,k)]));
      // Render the shell as one connected sheet. Adjacent triangles use the
      // exact same displaced endpoints, including the alpha edge of the photo.
      const shell=gl.createProgram();
      gl.attachShader(shell,shader(gl.VERTEX_SHADER,`
        attribute vec2 pos; uniform vec4 size; uniform float progress,rolled; varying vec2 texcoord;
        void main(){
          float t=pos.x, front=.99-progress*1.35;
          float lift=smoothstep(0.,1.,(t-front+.03)/.49), curl=sin(lift*3.14159);
          float x=size.x+t*size.z+lift*(74.+rolled*270.)+rolled*225.;
          float y=size.y-pow(lift,.95)*(136.+rolled*235.)-curl*14.-rolled*65.;
          float h=size.w*(1.-lift*.24)-curl*19.;
          vec2 screen=vec2(x/960.,(y+pos.y*h)/640.);
          gl_Position=vec4(screen.x*2.-1.,1.-screen.y*2.,0.,1.);texcoord=pos;
        }
      `));
      gl.attachShader(shell,shader(gl.FRAGMENT_SHADER,`
        precision mediump float;varying vec2 texcoord;uniform sampler2D photo;
        void main(){vec4 pixel=texture2D(photo,texcoord);gl_FragColor=vec4(pixel.rgb*pixel.a,pixel.a);}
      `));
      gl.linkProgram(shell);
      if(!gl.getProgramParameter(shell,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(shell));
      const vertices=[];
      for(let i=0;i<=140;i++)vertices.push(i/140,0,i/140,1);
      const mesh=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,mesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
      const shPos=gl.getAttribLocation(shell,'pos'), shP=gl.getUniformLocation(shell,'progress'),shR=gl.getUniformLocation(shell,'rolled'),shSize=gl.getUniformLocation(shell,'size');
      const deposit=gl.createProgram();
      gl.attachShader(deposit,shader(gl.VERTEX_SHADER,`
        attribute vec2 a; varying vec2 uv;
        void main(){uv=vec2((a.x+1.)*.5,(1.-a.y)*.5);gl_Position=vec4(a,0.,1.);}
      `));
      gl.attachShader(deposit,shader(gl.FRAGMENT_SHADER,`
        precision highp float;varying vec2 uv;uniform sampler2D photo;
        uniform vec2 landing;uniform float age,force;
        void main(){
          vec2 v=(uv-landing)*vec2(1.,.56);float r=length(v);
          float waves=exp(-r*8.5)*sin(r*61.-age*6.5);
          vec2 displaced=uv+v*(waves*.18+force*.025*sin(age*3.1-r*20.))*force;
          displaced+=.002*force*vec2(sin(uv.y*21.+age),cos(uv.x*24.-age*.7));
          vec3 col=texture2D(photo,vec2(.135,.115)+displaced*vec2(.70,.31)).rgb;
          col+=force*(waves*.055+.042*exp(-r*44.));
          gl_FragColor=vec4(col,1.);
        }
      `));
      gl.linkProgram(deposit);
      if(!gl.getProgramParameter(deposit,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(deposit));
      const depAttr=gl.getAttribLocation(deposit,'a'),depTime=gl.getUniformLocation(deposit,'age'),depForce=gl.getUniformLocation(deposit,'force'),depHit=gl.getUniformLocation(deposit,'landing');
      const ribbon=gl.createProgram();
      gl.attachShader(ribbon,shader(gl.VERTEX_SHADER,`
        attribute vec2 pos;uniform vec2 lip,hit;uniform float thick,age;varying vec2 local;
        void main(){
          float u=pos.x,t=1.-u,mid=mix(lip.x,hit.x,.79);
          float x=lip.x*t*t*t+3.*mid*t*t*u+3.*hit.x*t*u*u+hit.x*u*u*u;
          float y=lip.y*t*t*t+3.*(lip.y+24.)*t*t*u+3.*(lip.y+hit.y)*.5*t*u*u+hit.y*u*u*u;
          float w=thick*(1.02-.24*sin(u*3.14159))*(.96+.045*sin(u*13.-age*9.));
          vec2 point=vec2((x+(pos.y-.5)*w)/960.,y/640.);
          gl_Position=vec4(point.x*2.-1.,1.-point.y*2.,0.,1.);local=vec2(pos.y,u);
        }
      `));
      gl.attachShader(ribbon,shader(gl.FRAGMENT_SHADER,`
        precision highp float;varying vec2 local;uniform float age;uniform sampler2D photo;
        void main(){
          float s=local.x,t=local.y;
          vec3 col=texture2D(photo,vec2(.49+s*.20+.025*sin(t*6.-age*2.),.61+.10*t+.04*sin(t*9.-age*3.))).rgb;
          float glint=exp(-pow((s-.28-.04*sin(t*8.-age*2.))/.13,2.));
          float rim=pow(abs(s*2.-1.),3.);
          col=mix(col,col*.84,rim);
          col=mix(col,vec3(1.,.92,.88),.58*glint);
          gl_FragColor=vec4(col,1.);
        }
      `));gl.linkProgram(ribbon);
      if(!gl.getProgramParameter(ribbon,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(ribbon));
      const rbPos=gl.getAttribLocation(ribbon,'pos'),rbLip=gl.getUniformLocation(ribbon,'lip'),rbHit=gl.getUniformLocation(ribbon,'hit'),rbT=gl.getUniformLocation(ribbon,'age'),rbThick=gl.getUniformLocation(ribbon,'thick');
      const textures=new Map();
      let current=null;
      function prepare(pass,points,attribute,img,quality){
        if(gl.isContextLost())return false;
        const w=Math.round(Math.min(1350,Math.max(640,quality)));
        if(surface.width!==w){surface.width=w;surface.height=Math.round(w*2/3);gl.viewport(0,0,w,surface.height);}
        gl.useProgram(pass);gl.bindBuffer(gl.ARRAY_BUFFER,points);gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
        if(img!==current){
          let slot=textures.get(img);
          if(!slot){
            slot=textures.size?gl.createTexture():tex;gl.bindTexture(gl.TEXTURE_2D,slot);
            for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
            for(const param of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,param,gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);textures.set(img,slot);
          }else gl.bindTexture(gl.TEXTURE_2D,slot);
          current=img;
        }
        return true;
      }
      return {
        draw(ctx,img,p,twist,point,dx,dy,press,quality){
          if(!prepare(program,buffer,loc,img,quality))return false;
          gl.uniform1f(uniforms.turn,twist);gl.uniform1f(uniforms.progress,p);gl.uniform1f(uniforms.force,press);
          gl.uniform2f(uniforms.finger,point.x/width,point.y/height);gl.uniform2f(uniforms.flow,dx,dy);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);ctx.drawImage(surface,0,0,width,height);return true;
        },
        pool(ctx,img,x,y,w,h,hitX,hitY,age,force){
          if(!prepare(deposit,buffer,depAttr,img,990))return false;
          gl.uniform1f(depTime,age);gl.uniform1f(depForce,force);gl.uniform2f(depHit,(hitX-x)/w,(hitY-y)/h);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,4);ctx.drawImage(surface,x,y,w,h);return true;
        },
        ribbon(ctx,img,lip,hitX,hitY,thick,age,quality){
          if(!prepare(ribbon,mesh,rbPos,img,quality))return false;
          gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform2f(rbLip,lip.x,lip.y);gl.uniform2f(rbHit,hitX,hitY);
          gl.uniform1f(rbThick,thick);gl.uniform1f(rbT,age);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,vertices.length/2);ctx.drawImage(surface,0,0,width,height);return true;
        },
        peel(ctx,img,p,rolled,x,y,w,h,quality){
          if(!prepare(shell,mesh,shPos,img,quality))return false;
          gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform4f(shSize,x,y,w,h);gl.uniform1f(shP,p);gl.uniform1f(shR,rolled);
          gl.drawArrays(gl.TRIANGLE_STRIP,0,vertices.length/2);
          ctx.drawImage(surface,0,0,width,height);return true;
        },
        dropImages(){for(const t of textures.values())if(t!==tex)gl.deleteTexture(t);textures.clear();current=null;},
        destroy(){this.dropImages();gl.deleteTexture(tex);gl.deleteBuffer(buffer);gl.deleteBuffer(mesh);gl.deleteProgram(program);gl.deleteProgram(shell);gl.deleteProgram(deposit);gl.deleteProgram(ribbon);shaders.forEach(s=>gl.deleteShader(s));}
      };
    } catch {return null;}
  }
  // Software rendering for devices where WebGL is disabled. A single sampled
  // image replaces nested rotated rings, so cream ribbons stay continuous.
  function stirFallback(ctx,img,turn,store){
    ctx.drawImage(img,0,0,width,height);
    if(store.image!==img){
      store.image=img;const n=384;store.n=n;store.surface=document.createElement('canvas');store.surface.width=n;store.surface.height=n;
      store.ctx=store.surface.getContext('2d',{willReadFrequently:true});
      const [iw,ih]=imageSize(img);store.ctx.drawImage(img,(bowl.x-bowl.rx)/width*iw,(bowl.y-bowl.ry)/height*ih,bowl.rx*2/width*iw,bowl.ry*2/height*ih,0,0,n,n);
      store.src=store.ctx.getImageData(0,0,n,n);store.dst=store.ctx.createImageData(n,n);store.stamp=-999;
      store.x=new Float32Array(n*n);store.y=new Float32Array(n*n);store.f=new Float32Array(n*n);
      for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=y*n+x,dx=x+.5-n/2,dy=y+.5-n/2,r=Math.hypot(dx,dy)/(n/2);
        store.x[i]=dx;store.y[i]=dy;store.f[i]=r>=1?-1:(1-ease(r))*1.35;}
    }
    if(Math.abs(store.stamp-turn)>.025){
      const n=store.n,src=store.src.data,out=store.dst.data;
      for(let i=0;i<n*n;i++){
        const k=i*4;
        if(store.f[i]<0){out[k+3]=0;continue;}
        const a=turn*store.f[i],co=Math.cos(a),si=Math.sin(a),dx=store.x[i],dy=store.y[i];
        const sx=clamp(dx*co+dy*si+n/2-.5,0,n-1.001),sy=clamp(-dx*si+dy*co+n/2-.5,0,n-1.001);
        const x=sx|0,y=sy|0,t=sx-x,u=sy-y,j=(y*n+x)*4,l=j+4*n;
        for(let c=0;c<3;c++)out[k+c]=mix(mix(src[j+c],src[j+4+c],t),mix(src[l+c],src[l+4+c],t),u);
        out[k+3]=255;
      }
      store.ctx.putImageData(store.dst,0,0);store.stamp=turn;
    }
    ctx.drawImage(store.surface,bowl.x-bowl.rx,bowl.y-bowl.ry,bowl.rx*2,bowl.ry*2);
  }
  function poolShape(ctx,left,right,back,front,spread){
    const inset=(right-left)*.033*spread;
    const rx=Math.min((right-left)*.20,47),ry=Math.min((front-back)*.29,41);
    ctx.beginPath();ctx.moveTo(left+inset+rx,back);
    ctx.lineTo(right-inset-rx,back);ctx.quadraticCurveTo(right-inset,back,right-inset+5,back+ry);
    ctx.lineTo(right,front-ry);ctx.quadraticCurveTo(right+2,front,right-rx,front);
    ctx.lineTo(left+rx,front);ctx.quadraticCurveTo(left-2,front,left,front-ry);
    ctx.lineTo(left+inset-4,back+ry);ctx.quadraticCurveTo(left+inset,back,left+inset+rx,back);ctx.closePath();
  }
  function contactShadow(ctx,x,y,rx,ry,opacity){
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const grad=ctx.createRadialGradient(0,0,0,0,0,1);
    grad.addColorStop(0,'rgba(95,39,39,'+opacity+')');grad.addColorStop(.62,'rgba(98,43,41,'+opacity*.68+')');grad.addColorStop(1,'rgba(98,43,41,0)');
    ctx.fillStyle=grad;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }

  class GelMake {
    constructor(canvas,options={}){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.active=false;
      this.assets={};this.swirlCache={};this.vortex=null;this.triedVortex=false;this.stage='stir';this.batch=0;
      this.reset();this.canvas.style.touchAction='none';
      const listeners={pointerdown:e=>this.down(e),pointermove:e=>this.move(e),pointerup:e=>this.up(e),pointercancel:e=>this.up(e),lostpointercapture:e=>this.up(e),blur:()=>this.release()};
      for(const [k,f] of Object.entries(listeners))canvas.addEventListener(k,f);
      this.listeners=listeners;this.onHidden=()=>{if(document.hidden)this.release();};document.addEventListener('visibilitychange',this.onHidden);
      this.observer=new ResizeObserver(()=>{this.resize();this.draw();});this.observer.observe(canvas);this.resize();
    }
    reset(){
      this.progress=0;this.complete=false;this.pointer=null;this.last=null;this.turn=0;this.turnTarget=0;this.direction=1;this.heat=0;this.force=0;
      this.age=0;this.lastTick=0;this.pose=0;this.target={x:bowl.x+75,y:bowl.y+28};this.spot={...this.target};this.dx=0;this.dy=0;this.travel=0;this.motionAt=-1;this.lastBed=0;this.frame=0;
    }
    load(assets){this.vortex?.dropImages();this.assets=assets;this.resize();this.draw();return this;}
    state(){return {stage:this.stage,batch:this.batch,progress:this.progress,complete:this.complete,held:this.pointer!==null,active:this.active};}
    enter(stage,batch=0){
      if(!['stir','pour','peel'].includes(stage))return;
      this.release();cancelAnimationFrame(this.frame);this.reset();this.stage=stage;this.batch=Number(batch)||0;
      this.resize();this.draw();this.options.onProgress?.(0);return this;
    }
    setActive(value){this.active=!!value;if(!this.active){this.release();cancelAnimationFrame(this.frame);this.frame=0;}else{this.resize();this.draw();}return this;}
    resize(){
      const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.65);
      if(!r.width||!r.height)return;
      const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
      if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
      this.scale=Math.max(w/width,h/height);this.ox=(w-width*this.scale)/2;this.oy=(h-height*this.scale)/2;
    }
    point(event){
      const box=this.canvas.getBoundingClientRect();
      return {x:((event.clientX-box.left)*this.canvas.width/box.width-this.ox)/this.scale,y:((event.clientY-box.top)*this.canvas.height/box.height-this.oy)/this.scale};
    }
    down(event){
      if(!this.active||this.complete||this.pointer!==null||event.button>0)return;
      event.preventDefault();try{this.canvas.setPointerCapture(event.pointerId);}catch{}
      this.begin(event.pointerId,this.point(event));
    }
    begin(id,p){
      if(!this.active||this.complete||this.pointer!==null)return;
      this.pointer=id;this.last=p;this.target=this.constrain(p);this.heat=.3;this.motionAt=this.age;this.pressedAt=performance.now();this.travel=0;
      this.options.onSound?.(this.stage,.45);this.options.onMotion?.(this.stage,.45);
      this.amount(.035);this.wake();
    }
    tap(){
      if(!this.active||this.complete||this.pointer!==null)return;
      const p=this.progress,theta=p*9+.2;
      const point=this.stage==='stir'?{x:bowl.x+Math.cos(theta)*97,y:bowl.y+Math.sin(theta)*72}:{x:width*.51,y:height*.6};
      this.begin('tap',point);
      if(this.complete||this.pointer!=='tap')return;
      this.pose=.88;this.force=.8;this.heat=.8;this.turnTarget+=.48;
      this.amount(.13);this.release();this.draw();
    }
    constrain(p){
      const x=(p.x-bowl.x)/bowl.rx,y=(p.y-bowl.y)/bowl.ry,dist=Math.max(1,Math.hypot(x,y)/.83);
      return {x:bowl.x+x/dist*bowl.rx,y:bowl.y+y/dist*bowl.ry};
    }
    move(e){
      if(this.pointer===null||e.pointerId!==this.pointer||this.complete)return;
      const p=this.point(e),old=this.last;this.last=p;
      const dx=p.x-old.x,dy=p.y-old.y,travel=Math.min(80,Math.hypot(dx,dy));
      this.travel+=travel;this.heat=clamp(this.heat+travel/40);this.dx=clamp(dx/42,-1,1);this.dy=clamp(dy/42,-1,1);
      this.motionAt=this.age;
      if(this.stage==='stir'){
        const prev=Math.atan2((old.y-bowl.y)/bowl.ry,(old.x-bowl.x)/bowl.rx);
        const next=Math.atan2((p.y-bowl.y)/bowl.ry,(p.x-bowl.x)/bowl.rx);
        const rotation=clamp(wrap(next-prev),-.36,.36);if(Math.abs(rotation)>.01)this.direction=Math.sign(rotation);
        this.turnTarget+=rotation*.91;this.target=this.constrain(p);this.amount(travel/1900);
      }else if(this.stage==='pour'){
        this.target={x:clamp(p.x,235,730),y:clamp(p.y,335,475)};this.amount(travel/3400);
      }else{this.target=p;this.amount(travel/1260);}
      if(!this.complete)this.options.onMotion?.(this.stage,.4+.58*this.heat);
      this.wake();
    }
    up(e){
      if(e.pointerId!==this.pointer)return;
      if(e.type==='pointerup'&&this.travel<13&&performance.now()-this.pressedAt<230){
        this.pose=.88;this.force=.8;this.turnTarget+=.48;this.amount(.13);
      }
      this.release();
    }
    release(){
      if(this.pointer===null)return;
      const id=this.pointer;this.pointer=null;this.last=null;
      if(typeof id==='number'&&this.canvas.hasPointerCapture(id)){try{this.canvas.releasePointerCapture(id);}catch{}}
      this.options.onStop?.();this.wake();
    }
    amount(delta){
      if(this.complete||this.pointer===null||delta<=0)return;
      this.progress=clamp(this.progress+delta);this.options.onProgress?.(this.progress);
      if(this.progress>=1){
        this.complete=true;this.release();this.draw();
        this.options.onComplete?.(this.stage);
      }
    }
    advance(ms){
      const dt=clamp(Number(ms)||0,0,5000)/1000;
      const held=this.pointer!==null;
      this.age+=dt;this.heat*=Math.exp(-dt*4.4);
      const response=1-Math.exp(-dt*13);
      this.force=mix(this.force,held?1:0,response);
      this.pose=mix(this.pose,held?1:0,1-Math.exp(-dt*8.5));
      if(held){
        const lastStage=this.stage;
        if(this.age-this.lastBed>.12){this.lastBed=this.age;this.options.onMotion?.(this.stage,.46+.48*this.heat);}
        if(this.stage==='stir')this.turnTarget+=this.direction*dt*(.68+this.heat*.56);
        const rate=this.stage==='stir'?.238:this.stage==='pour'?.283:.272;
        this.amount(rate*dt);
        if(this.stage!==lastStage)return;
      }
      this.turn=mix(this.turn,this.turnTarget,response);
      const lazy=this.stage==='stir'&&held&&this.age-this.motionAt>.26;
      const angle=this.turnTarget*1.8+.35;
      this.spot.x=mix(this.spot.x,lazy?bowl.x+Math.cos(angle)*65:this.target.x,response);
      this.spot.y=mix(this.spot.y,lazy?bowl.y+Math.sin(angle)*47:this.target.y,response);
      this.dx*=Math.exp(-dt*6);this.dy*=Math.exp(-dt*6);this.draw();
    }
    wake(){
      if(this.frame||!this.active)return;
      this.lastTick=performance.now();
      const tick=now=>{
        this.frame=0;if(!this.active)return;
        const dt=Math.min(64,Math.max(0,now-this.lastTick));this.lastTick=now;this.advance(dt);
        if(this.pointer!==null||this.pose>.006||Math.abs(this.turnTarget-this.turn)>.007)this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);
    }
    draw(){
      if(!this.scale)return;
      const c=this.ctx;c.setTransform(this.scale,0,0,this.scale,this.ox,this.oy);
      c.imageSmoothingEnabled=true;c.clearRect(0,0,width,height);
      if(this.stage==='stir'&&this.assets.stir)this.stir(c);
      if(this.stage==='pour'&&this.assets.pour)this.pour(c);
      if(this.stage==='peel'&&this.assets.board)this.peel(c);
    }
    stir(c){
      const img=this.assets.stir;
      if(!this.triedVortex){this.triedVortex=true;this.vortex=makeVortex();}
      const bent=this.turn*(this.options.reducedMotion?.66:1);
      let rendered=false;
      if(this.vortex){
        try {rendered=this.vortex.draw(c,img,this.progress,bent,this.spot,this.dx,this.dy,this.force,this.canvas.width);}
        catch {this.vortex.destroy();this.vortex=null;}
      }
      if(!rendered)stirFallback(c,img,bent,this.swirlCache);
      const tool=this.assets.spatula;
      if(!tool)return;
      const [iw,ih]=imageSize(tool),w=287,h=w*ih/iw;
      const angle=Math.sin(this.turn*.8)*.1+this.dx*.055;
      c.save();c.translate(this.spot.x,this.spot.y);c.rotate(angle);
      // The paddle enters the liquid before its handle; keep it under a
      // thin transparent film of the photographed colour.
      c.shadowColor='rgba(58,23,32,.24)';c.shadowBlur=5;c.shadowOffsetX=3;c.shadowOffsetY=9;
      c.drawImage(tool,-w*.17,-h*.81,w,h);c.restore();
    }
    pour(c){
      const progress=this.progress, ink=flavors[this.batch%4]||flavors[0];
      c.drawImage(this.assets.pour,0,0,width,height);
      const extent=ease(Math.min(1,progress/.44));
      const rise=ease(progress);
      const hitX=clamp(486+(this.spot.x-bowl.x)*.48,386,574);
      const hitY=clamp(436-rise*36+(this.spot.y-bowl.y)*.10,380,450);
      let left=mix(hitX,180,extent),right=mix(hitX,780,extent);
      const back=mix(hitY,396-rise*115,extent),front=mix(hitY,478+4*rise,extent);
      if(progress>.001){
        left-=rise*2;right+=rise*2;
        c.save();poolShape(c,left,right,back,front,extent);c.clip();
        c.fillStyle=ink;c.fillRect(left-2,back-2,right-left+4,front-back+4);
        const gel=this.assets.loaf;
        if(gel){
          const [iw,ih]=imageSize(gel);
          // The source is the upper, bubble-filled surface of the actual cast.
          c.globalAlpha=.93;
          if(!this.vortex?.pool(c,gel,left,back,right-left,front-back,hitX,hitY,this.age,this.pose)){
            c.drawImage(gel,iw*.135,ih*.115,iw*.70,ih*.31,left,back,right-left,front-back);
          }
          c.globalAlpha=1;
        }
        const glaze=c.createLinearGradient(0,back,0,front);
        glaze.addColorStop(0,'rgba(78,17,25,.18)');glaze.addColorStop(.18,'rgba(255,238,221,.09)');glaze.addColorStop(.58,'rgba(255,238,232,0)');glaze.addColorStop(1,'rgba(255,231,221,.26)');
        c.fillStyle=glaze;c.fillRect(left,back,right-left,front-back);
        if(this.pose>.04){
          contactShadow(c,hitX,hitY+2,26,9,.24*this.pose);
          for(let i=0;i<3;i++){
            const t=(this.age*1.65+i/3)%1;
            c.beginPath();c.ellipse(hitX,hitY,8+32*t,2+7*t,.02,0,Math.PI*2);
            c.lineWidth=1.5*(1-t)+.5;c.strokeStyle='rgba(255,242,236,'+(.38*(1-t)*this.pose)+')';c.stroke();
          }
        }
        c.restore();
        c.save();poolShape(c,left,right,back,front,extent);c.lineWidth=2;c.strokeStyle='rgba(255,220,213,.48)';c.stroke();c.restore();
      }
      const jug=this.assets.jug;if(!jug)return;
      const [jw,jh]=imageSize(jug),w=298,h=w*jh/jw;
      const tilt=mix(-.42,.27,this.pose);
      const x=300+(this.spot.x-bowl.x)*.13,y=143-this.pose*7;
      const lipX=(.91-.48)*w,lipY=(.54-.47)*h;
      const lip={x:x+Math.cos(tilt)*lipX-Math.sin(tilt)*lipY,y:y+Math.sin(tilt)*lipX+Math.cos(tilt)*lipY};
      const flowing=this.pose>.035&&progress>0&&!this.complete;
      if(flowing&&!this.vortex?.ribbon(c,jug,lip,hitX,hitY,23*this.pose,this.age,990)){
        const jet=23*this.pose,midY=(lip.y+hitY)*.5,midX=lip.x+(hitX-lip.x)*.79;
        const surfaceY=u=>lip.y*(1-u)**3+3*(lip.y+24)*(1-u)**2*u+3*midY*(1-u)*u*u+hitY*u**3;
        const surfaceX=u=>lip.x*(1-u)**3+3*midX*(1-u)**2*u+3*hitX*(1-u)*u*u+hitX*u**3;
        const [jw,jh]=imageSize(jug),bands=58;
        c.save();c.globalAlpha=clamp(this.pose*2);
        for(let i=0;i<bands;i++){
          const a=i/bands,b=(i+1)/bands,y=surfaceY(a),dy=surfaceY(b)-y;
          const w=jet*(1.02-.24*Math.sin(a*Math.PI))*(.96+.045*Math.sin(a*13-this.age*9));
          const x=surfaceX(a),next=surfaceX(b),source=.59+.14*Math.sin(i*.038-this.age*2);
          c.save();c.transform(1,0,(next-x)/dy,1,x,y);
          c.drawImage(jug,jw*source,jh*(.60+.10*a),jw*.115,jh*.06,-w/2,0,w,dy+.65);
          const film=c.createLinearGradient(-w/2,0,w/2,0);
          film.addColorStop(0,'rgba(107,22,43,.28)');film.addColorStop(.12,'rgba(255,233,226,.48)');
          film.addColorStop(.32,'rgba(255,249,239,.72)');film.addColorStop(.42,'rgba(255,230,218,.15)');
          film.addColorStop(.76,'rgba(255,244,239,0)');film.addColorStop(1,'rgba(121,24,48,.36)');
          c.fillStyle=film;c.fillRect(-w/2,0,w,dy+.6);c.restore();
        }
        c.restore();
      }
      c.save();c.translate(x,y);c.rotate(tilt);c.drawImage(jug,-w*.48,-h*.47,w,h);c.restore();
    }
    peel(c){
      const p=this.progress,loaf=this.assets.loaf,mold=this.assets.mold;
      c.drawImage(this.assets.board,0,0,width,height);
      if(!loaf||!mold)return;
      const [lw,lh]=imageSize(loaf),[mw,mh]=imageSize(mold);
      const base=483,toyW=504,toyH=toyW*lh/lw, w=574,h=w*mh/mw;
      contactShadow(c,485,base-14,285,24,.47);
      const wobble=Math.sin(p*Math.PI*3)*Math.sin(p*Math.PI)*.016;
      c.save();c.translate(480,base);c.scale(1+wobble,1-wobble);c.drawImage(loaf,-toyW/2,-toyH,toyW,toyH);c.restore();
      const rolled=ease((p-.50)/.50),front=.99-p*1.35;
      if(this.vortex?.peel(c,mold,p,rolled,480-w/2,base-h,w,h,this.canvas.width))return;
      const lifted=t=>ease((t-front+.03)/.49);
      const offsets=t=>{
        const lift=lifted(t),wave=Math.sin(lift*Math.PI);
        return {x:480-w/2+t*w+lift*(74+rolled*270)+rolled*225,
          y:base-h-Math.pow(lift,.95)*(136+rolled*235)-wave*14-rolled*65,
          h:h*(1-lift*.24)-wave*19};
      };
      // Each photographed strip follows the same continuous peel front;
      // mapping both boundaries removes gaps even when the sheet stretches.
      const bands=p>.0001?160:1;
      for(let i=0;i<bands;i++){
        const t=i/bands,n=(i+1)/bands,a=offsets(t),b=offsets(n),sx=mw*t;
        const sw=(mw/bands),ex=b.x-a.x,ey=b.y-a.y;
        c.save();c.transform(ex/sw,ey/sw,0,a.h/mh,a.x,a.y);
        c.drawImage(mold,sx,0,Math.min(sw+.5,mw-sx),mh,0,0,Math.min(sw+.5,mw-sx),mh);c.restore();
      }
    }
    destroy(){
      this.setActive(false);this.observer.disconnect();this.vortex?.destroy();
      for(const [k,f]of Object.entries(this.listeners))this.canvas.removeEventListener(k,f);
      document.removeEventListener('visibilitychange',this.onHidden);
    }
  }
  // May be used as a constructor or a factory.
  window.GelMake=function(canvas,options){return new GelMake(canvas,options);};
})();
