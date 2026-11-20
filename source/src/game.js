// Hunt presentation: procedural meshes, WebGPU drawing, DOM HUD and action mapping.
{
  await $('weapon-image').decode();
  const weaponView=createWeaponView(),combatAudio=createCombatAudio();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  rseed(seed);
  const colors = [[1,.7,.13],[.12,.65,1],[1,.35,.15],[.65,.28,1],[.5,.8,.9],[.32,.48,.57],[.12,.9,.55],[1,.2,.32],[.9,.8,.5],[.3,.8,.8],[.5,.5,.95],[.7,.48,.25]];
  const speciesCount = 12, count = LV > 1 ? 96 : LV ? 156 : 240;
  // The camera's compact rock field is also the authority for fish and harpoons.
  const rock = (x, y, z) => {
    const gx = (x - OX) / VS - CO, gy = (y - OY) / VS, gz = (z - OZ) / VS - CO;
    if (gx < 0 || gz < 0 || gy < 0 || gx >= CN * 4 - 1 || gz >= CN * 4 - 1 || gy >= NY - 1) return 1;
    const ix = floor(gx), iy = floor(gy), iz = floor(gz), u = gx - ix, v = gy - iy, w = gz - iz;
    return mix(mix(mix(cv(ix,iy,iz),cv(ix+1,iy,iz),u),mix(cv(ix,iy+1,iz),cv(ix+1,iy+1,iz),u),v),mix(mix(cv(ix,iy,iz+1),cv(ix+1,iy,iz+1),u),mix(cv(ix,iy+1,iz+1),cv(ix+1,iy+1,iz+1),u),v),w) / 127;
  };
  const origin = [POSES[0][0], POSES[0][1], POSES[0][2]];
  let hunt;
  const append = (dst, src, aux) => { const base = dst.p.length / 3; dst.p.push(...src.p); dst.i.push(...src.i.map((i) => i + base)); dst.aux.push(...src.aux.map(() => aux)); };
  const ellipsoid = (m, x, y, z, sx, sy, sz, aux, sub = 1) => append(m, icosphere(sub, (a,b,c) => [x+a*sx,y+b*sy,z+c*sz]), aux);
  const fin = (m, a,b,c) => { const ia=m.v(...a,.4), ib=m.v(...b,.4), ic=m.v(...c,.4); m.tri(ia,ib,ic); };
  const fishMeshes = [];
  for (let s = 0; s < speciesCount; s++) {
    const m = new Mesh(), kind = s % 6, deep = kind === 2 ? rr(.27,.36) : kind === 4 || kind === 5 ? rr(.09,.14) : rr(.15,.23), wide = kind === 2 ? .08 : rr(.09,.15), rings=[];
    const length = [.49,.42,.24,0,-.24,-.39,-.46], heights=[.025,.46,.9,1,.72,.32,.12];
    for (let j=0;j<length.length;j++) { const ring=[]; for (let k=0;k<12;k++) { const a=k/12*TAU; ring.push(m.v(length[j],sin(a)*deep*heights[j],cos(a)*wide*heights[j])); } rings.push(ring); }
    for (let j=0;j<rings.length-1;j++) for(let k=0;k<12;k++) m.quad(rings[j][k],rings[j+1][k],rings[j+1][(k+1)%12],rings[j][(k+1)%12]);
    const tail = kind === 5 ? .27 : rr(.17,.32);
    fin(m,[-.42,0,0],[-.72,tail,0],[-.61,0,0]); fin(m,[-.42,0,0],[-.61,0,0],[-.72,-tail,0]);
    fin(m,[.2,deep*.8,0],[-.14,deep+rr(.12,.25),0],[-.3,deep*.5,0]);
    fin(m,[.02,-deep*.7,0],[-.24,-deep-.13,0],[-.32,-deep*.4,0]);
    for(const sign of [-1,1]) { fin(m,[.21,0,sign*wide*.7],[-.19,-.1,sign*(kind===5?.4:.25)],[-.04,.01,sign*wide]); ellipsoid(m,.34,.055,sign*wide*.65,.035,.035,.025,-.8); }
    fishMeshes.push(m.build());
  }
  // Arrow origin is the penetrating tip; the full steel shaft extends behind it.
  const spear=new Mesh();spear.tube([[-1.48,0,0],[-.09,0,0]],()=>.010,10,true);
  const point=icosphere(0,(x,y,z)=>[-.055+x*.075,y*.027,z*.027]);append(spear,point,.8);
  fin(spear,[-.2,0,0],[-.07,.055,0],[-.09,0,0]);
  const spearMesh=spear.build(),bubbleMesh=icosphere(2).build();
  const trail=new Mesh();trail.tube([[-1,0,0],[0,0,0]],()=>.012,6,true);const trailMesh=trail.build();
  const assets=[...fishMeshes,spearMesh,bubbleMesh,trailMesh];
  let nv=0,ni=0; for(const a of assets){a.v0=nv;a.i0=ni;nv+=a.nv;ni+=a.ib.length;}
  const vertices=new Uint8Array(nv*16),indices=new Uint32Array(ni);
  for(const a of assets){vertices.set(new Uint8Array(a.vb),a.v0*16);indices.set(a.ib,a.i0);}
  const vb=buf(vertices,BU.VERTEX), ib=buf(indices,BU.INDEX), instanceData=new Float32Array((count*5+260)*16), instances=buf(instanceData,BU.VERTEX);
  const shader=mod(S_B + /*wgsl*/`
struct HI { @location(0) p: vec3f, @location(1) n: vec4f, @location(2) a: vec4f, @location(3) b: vec4f, @location(4) c: vec4f, @location(5) d: vec4f };
struct HO { @builtin(position) cp: vec4f, @location(0) wp: vec3f, @location(1) n: vec3f, @location(2) local: vec3f, @location(3) col: vec4f, @location(4) flash: f32, @location(5) aux: f32, @location(6) material: f32 };
@vertex fn vsHunt(i: HI) -> HO {
  let yaw=i.b.x; let pitch=i.b.y;
  let T=vec3f(sin(yaw)*cos(pitch),sin(pitch),-cos(yaw)*cos(pitch));
  let S0=vec3f(cos(yaw),0.,sin(yaw)); let U0=cross(S0,T);
  let U=U0*cos(i.d.y)+S0*sin(i.d.y);let S=S0*cos(i.d.y)-U0*sin(i.d.y);
  var p=i.p;if(i.c.w<0.&&i.d.z>0.){p.x*=i.d.z;} p.z += sin(g.cam.w*9.+i.b.z+p.x*5.)*.075*ss(.2,-.65,p.x)*i.d.x;
  let w=i.a.xyz+(T*p.x+U*p.y+S*p.z)*i.a.w;
  var o:HO; o.cp=g.vp*vec4f(w,1.);o.wp=w;o.n=T*i.n.x+U*i.n.y+S*i.n.z;o.local=i.p;o.col=i.c;o.flash=i.b.w;o.aux=i.d.w;o.material=i.n.w;return o;
}
@fragment fn fsHunt(i: HO) -> @location(0) vec4f {
  let n=normalize(i.n);let z=zone(i.wp);let v=normalize(g.cam.xyz-i.wp);
  if(hs(floor(i.cp.x)*.13+floor(i.cp.y)*.37)>i.aux){discard;}
  if(i.col.w<0.){let light=.55+.45*abs(dot(n,g.sun.xyz));return fin(fog(i.col.rgb*light+pow(max(0.,dot(n,normalize(v+g.sun.xyz))),24.)*.9,i.wp,z));}
  let stripes=step(.62,fract(i.local.x*(6.+i.col.w)+sin(i.local.y*25.)*.12));
  let spots=step(.8,sin(i.local.x*65.)*sin(i.local.y*70.));
  var alb=mix(i.col.rgb*.45,vec3f(.8,.94,.9),ss(.08,-.22,i.local.y)*.65);
  alb=mix(alb,i.col.rgb,ss(-.08,.15,i.local.y));
  alb*=1.-.5*mix(stripes,spots,step(5.,i.col.w));
  alb=mix(alb,i.col.rgb*1.3,1.-step(.6,i.material));
  alb=mix(alb,vec3f(.008,.014,.018),1.-step(-.5,i.material));
  alb=mix(alb,vec3f(1.,.8,.45),clamp(i.flash*4.,0.,1.));
  let lit=alb*(vec3f(.2,.4,.46)+sunE(i.wp.y,z)*(.3+.7*max(0.,dot(n,g.sun.xyz)))*shadow1(i.wp));
  let shine=pow(max(0.,dot(n,normalize(v+g.sun.xyz))),32.)*.9;
  return fin(fog(lit+shine,i.wp,z));
}
@fragment fn fsEffect(i: HO) -> @location(0) vec4f {
  let n=normalize(i.n);let v=normalize(g.cam.xyz-i.wp);let rim=pow(1.-abs(dot(n,v)),2.);
  let alpha=(.025+rim*.28)*i.aux;
  let color=vec3f(.4,.86,1.1)+vec3f(1.)*pow(max(0.,dot(n,normalize(v+g.sun.xyz))),30.);
  return vec4f(color*alpha,alpha);
}
`);
  const instanceLayout={arrayStride:64,stepMode:'instance',attributes:[A(2,0,'float32x4'),A(3,16,'float32x4'),A(4,32,'float32x4'),A(5,48,'float32x4')]};
  const fishPipe=scenePipe(shader,'vsHunt','fsHunt',[vbSolid,instanceLayout]);
  const effectPipe=scenePipe(shader,'vsHunt','fsEffect',[vbSolid,instanceLayout],{blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}});

  const hudEl=$('hunt'), healthEl=$('health'), oxygenEl=$('oxygen'), scoreEl=$('score'), goalEl=$('goal'), statusEl=$('weapon-status'), targetEl=$('target'), toastEl=$('toast'), reticle=$('reticle'), endEl=$('hunt-end');
  let accumulator=0,uiClock=0,aimClock=0,toastTime=0,holding=false,cinematic=false;
  const player={x:0,y:0,z:0,yaw:0}, counts=new Uint32Array(speciesCount), starts=new Uint32Array(speciesCount), cursor=new Uint32Array(speciesCount);
  const notice=(key,params={})=>{I18N.setText(toastEl,key,params);toastTime=3;};
  const muzzle={x:0,y:0,z:0},arrowPose={x:0,y:0,z:0,dx:0,dy:0,dz:0};
  const particles=Array.from({length:128},()=>({life:0,total:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:.02}));let particleIndex=0;
  function burst(e,n){for(let i=0;i<n;i++){
    const p=particles[particleIndex++%particles.length];p.x=e.x;p.y=e.y;p.z=e.z;p.life=p.total=.35+Math.random()*.65;
    const speed=e.type==='fire'?2:1;p.vx=(Math.random()-.5)*speed+(e.dx||0);p.vy=Math.random()*speed+.2;p.vz=(Math.random()-.5)*speed+(e.dz||0);p.size=e.type==='fire'?.008+Math.random()*.014:.015+Math.random()*.025;
  }}
  let killFlash=0;
  function restart(){
    lookAt(...POSES[0]);F[VX]=F[VY]=F[VZ]=0;weaponView.reset();combatAudio.reset();
    for(const p of particles)p.life=0;killFlash=0;
    hunt=createHunt({seed,count,speciesCount,rock,spawn:origin,yaw:F[YAW]});
    accumulator=0;holding=false;endEl.hidden=true;uiClock=0;
    notice('initialHint');
    refreshHUD();
  }
  const shoot=()=>{
    if(menu||dead||hunt.over||cinematic)return;
    sound();const cp=cos(F[PIT]);hunt.fire(F[CX],F[CY],F[CZ],sin(F[YAW])*cp,sin(F[PIT]),-cos(F[YAW])*cp,weaponView.muzzle(muzzle));
  };
  canvas.addEventListener('pointerdown',(e)=>{if(e.button===0&&document.pointerLockElement===canvas){holding=true;shoot();}});
  addEventListener('pointerup',()=>{holding=false;});addEventListener('blur',()=>{holding=false;});
  addEventListener('keydown',(e)=>{if(e.code==='Space'&&!menu){e.preventDefault();holding=true;shoot();}});
  addEventListener('keyup',(e)=>{if(e.code==='Space')holding=false;});
  $('shoot').addEventListener('pointerdown',(e)=>{e.preventDefault();e.stopPropagation();holding=true;shoot();});
  $('shoot').addEventListener('pointercancel',()=>{holding=false;});
  $('retry').onclick=()=>{restart();go();};
  // The same refresh runs while paused when a player changes language. Species names and
  // danger prefixes must be resolved again, rather than cached as already translated text.
  function refreshHUD(){
    if(!hunt)return;
    healthEl.style.width=`${hunt.health}%`;oxygenEl.style.width=`${hunt.oxygen}%`;
    $('health-value').textContent=Math.ceil(hunt.health);$('oxygen-value').textContent=Math.ceil(hunt.oxygen)+'%';
    scoreEl.textContent=String(hunt.score).padStart(5,'0');
    goalEl.textContent=I18N.t('goal',{wave:hunt.wave,kills:hunt.kills,goal:hunt.goal});
    statusEl.textContent=hunt.cooldown>0?I18N.t('reloading',{seconds:hunt.cooldown.toFixed(1)}):I18N.t('ready');
    const f=hunt.fish[hunt.target];
    targetEl.textContent=f&&f.alive?I18N.t('target',{name:I18N.species(f.species),danger:f.predator?I18N.t('danger'):'',hp:f.hp,maxHP:f.maxHP}):I18N.t(mob?'aimHintTouch':'aimHint');
  }
  restart();
  I18N.onChange(()=>{uiClock=0;refreshHUD();});
  function packInstance(o,x,y,z,size,yaw,pitch,phase,flash,color,pattern,animate,roll=0,fade=1){
    instanceData[o]=x;instanceData[o+1]=y;instanceData[o+2]=z;instanceData[o+3]=size;instanceData[o+4]=yaw;instanceData[o+5]=pitch;instanceData[o+6]=phase;instanceData[o+7]=flash;
    instanceData[o+8]=color[0];instanceData[o+9]=color[1];instanceData[o+10]=color[2];instanceData[o+11]=pattern;instanceData[o+12]=animate;instanceData[o+13]=roll;instanceData[o+14]=0;instanceData[o+15]=fade;
  }
  let arrowCount=0,bubbleStart=0,bubbleCount=0,trailCount=0;
  // Only the part already outside the guide is visible. Keep the tail ahead of the near plane.
  const arrow=(p,fade=1)=>{
    const depth=(p.x-F[CX])*F[FX]+(p.y-F[CY])*F[FY]+(p.z-F[CZ])*F[FZ];if(depth<=.15)return;
    const axis=p.dx*F[FX]+p.dy*F[FY]+p.dz*F[FZ];
    const o=(count+arrowCount++)*16;
    packInstance(o,p.x,p.y,p.z,1,atan2(p.dx,-p.dz),atan2(p.dy,hypot(p.dx,p.dz)),0,0,steel,-1,0,0,fade);
    instanceData[o+14]=axis>0?clamp((depth-.55)/(1.48*axis),.02,1):1;
  };
  const steel=[.72,.86,.9],trailColor=[.43,.75,.83],bubbleColor=[.5,.9,1];
  gameView={
    over:()=>hunt.over,restart,setCinematic:(value)=>{cinematic=value;holding=false;},
    update(dt){
      weaponView.setVisible(!menu&&!hunt.over&&!cinematic&&!dead);
      hudEl.hidden=menu||hunt.over||cinematic;reticle.hidden=menu||hunt.over||cinematic;$('shoot').hidden=menu||hunt.over||cinematic;
      if(menu||document.hidden||cinematic){holding=false;accumulator=0;return;}
      if(!hunt.over){
        player.x=F[CX];player.y=F[CY];player.z=F[CZ];player.yaw=F[YAW];
        accumulator+=min(dt,.1);while(accumulator>=1/60){if(holding)shoot();const was=hunt.cooldown;hunt.update(1/60,player);if(was>0&&hunt.cooldown===0)combatAudio.play('reload');accumulator-=1/60;}
        aimClock-=dt;if(aimClock<=0){const cp=cos(F[PIT]);hunt.aim(player.x,player.y,player.z,sin(F[YAW])*cp,sin(F[PIT]),-cos(F[YAW])*cp);aimClock=.08;}
      }
      for(const e of hunt.events){
        combatAudio.play(e.type,e);
        if(e.type==='fire'){weaponView.fire();burst(e,9);}
        if(e.type==='hit'||e.type==='rock'){burst(e,e.type==='hit'?10:5);}
        if(e.type==='kill')killFlash=.55;
        if(e.type==='kill')notice('killNotice',{points:e.value});
        if(e.type==='wave')notice('waveNotice',{wave:e.value});
        if(e.type==='over'){
          holding=false;endEl.hidden=false;
          I18N.setText($('end-score'),'endScore',{score:hunt.score,kills:hunt.kills,seconds:floor(hunt.elapsed)});
          I18N.setText($('end-reason'),hunt.oxygen<=0?'deathOxygen':'deathAttack');
          if(document.pointerLockElement)document.exitPointerLock();
        }
      }hunt.events.length=0;
      weaponView.setVisible(!menu&&!hunt.over&&!cinematic&&!dead);
      weaponView.update(F[TIME],hypot(F[VX],F[VY],F[VZ]),hunt.cooldown,dt);
      killFlash=max(0,killFlash-dt);
      for(const p of particles)if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vx*=exp(-dt*3);p.vy+=dt*.9;p.vz*=exp(-dt*3);}
      $('reload-fill').style.transform=`scaleX(${1-hunt.cooldown/.8})`;
      toastTime=Math.max(0,toastTime-dt);toastEl.style.opacity=toastTime>0?'1':'0';
      reticle.className=killFlash>0?'hit kill':hunt.hit>0?'hit':hunt.target>=0?'locked':'';
      hudEl.classList.toggle('danger',hunt.hurt>0||hunt.oxygen<20);
      uiClock-=dt;if(uiClock<=0){refreshHUD();uiClock=.1;}
    },
    drawFish(r){
      counts.fill(0);for(const f of hunt.fish)if(f.alive||f.corpse>0)counts[f.species]++;
      let total=0;for(let s=0;s<speciesCount;s++){starts[s]=cursor[s]=total;total+=counts[s];}
      for(const f of hunt.fish)if(f.alive||f.corpse>0)packInstance(cursor[f.species]++*16,f.x,f.y,f.z,f.size,f.yaw,f.pitch,f.phase,f.flash,colors[f.species],f.species,f.alive?1:0,f.roll,f.alive?1:min(1,f.corpse/1.5));
      arrowCount=0;
      for(const shot of hunt.shots)if(shot.active)arrow(shot);
      for(const f of hunt.fish)if(f.alive||f.corpse>0)for(const a of f.arrows){huntArrowPose(f,a,arrowPose);arrow(arrowPose,f.alive?1:min(1,f.corpse/1.5));}
      for(const stuck of hunt.stuck)arrow(stuck);
      bubbleStart=count+arrowCount;bubbleCount=0;
      for(const p of particles)if(p.life>0)packInstance((bubbleStart+bubbleCount++)*16,p.x,p.y,p.z,p.size*(1.4-p.life/p.total*.4),0,0,0,0,bubbleColor,0,0,0,min(1,p.life*5));
      trailCount=0;
      for(const shot of hunt.shots)if(shot.active){
        const depth=(shot.x-F[CX])*F[FX]+(shot.y-F[CY])*F[FY]+(shot.z-F[CZ])*F[FZ];
        const axis=shot.dx*F[FX]+shot.dy*F[FY]+shot.dz*F[FZ];
        const length=axis>0?clamp((depth-.25*axis-.55)/axis,.01,.9):.9;
        packInstance((bubbleStart+bubbleCount+trailCount++)*16,shot.x-.25*shot.dx,shot.y-.25*shot.dy,shot.z-.25*shot.dz,length,atan2(shot.dx,-shot.dz),atan2(shot.dy,hypot(shot.dx,shot.dz)),0,0,trailColor,-1,0,0,.7);
      }
      Q.writeBuffer(instances,0,instanceData);
      r.setPipeline(fishPipe);r.setBindGroup(0,bg0);r.setVertexBuffer(0,vb);r.setVertexBuffer(1,instances);r.setIndexBuffer(ib,'uint32');
      for(let s=0;s<speciesCount;s++)if(counts[s]){const a=assets[s];r.drawIndexed(a.ib.length,counts[s],a.i0,a.v0,starts[s]);}
      if(arrowCount)r.drawIndexed(spearMesh.ib.length,arrowCount,spearMesh.i0,spearMesh.v0,count);
      r.setPipeline(effectPipe);
      if(bubbleCount)r.drawIndexed(bubbleMesh.ib.length,bubbleCount,bubbleMesh.i0,bubbleMesh.v0,bubbleStart);
      if(trailCount)r.drawIndexed(trailMesh.ib.length,trailCount,trailMesh.i0,trailMesh.v0,bubbleStart+bubbleCount);
    }
  };
}
