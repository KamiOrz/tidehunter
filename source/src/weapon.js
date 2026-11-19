// Rig the photographic viewmodel locally: finger/trigger patches deform independently of recoil.
function createWeaponView() {
  const layer=$('weapon-layer'), image=$('weapon-image'), rig=$('weapon-rig'), ctx=rig.getContext('2d');
  rig.width=image.naturalWidth;rig.height=image.naturalHeight;
  let shown=false, age=10, tx=0,ty=0,roll=0, oldDraw=-1;
  const patches=[];
  function patch(x,y,w,h,deform) {
    const source=document.createElement('canvas');source.width=w;source.height=h;source.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
    const frames=[];
    for(let frame=0;frame<9;frame++) {
      const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),nx=20,ny=12,points=[];
      for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
        const u=i*w/nx,v=j*h/ny,offset=deform(x+u,y+v,frame/8);
        points.push({u,v,x:u+offset[0],y:v+offset[1]});
      }
      const triangle=(a,b,c)=>{
        const det=a.u*(b.v-c.v)+b.u*(c.v-a.v)+c.u*(a.v-b.v);
        const A=(a.x*(b.v-c.v)+b.x*(c.v-a.v)+c.x*(a.v-b.v))/det;
        const B=(a.y*(b.v-c.v)+b.y*(c.v-a.v)+c.y*(a.v-b.v))/det;
        const C=(a.x*(c.u-b.u)+b.x*(a.u-c.u)+c.x*(b.u-a.u))/det;
        const D=(a.y*(c.u-b.u)+b.y*(a.u-c.u)+c.y*(b.u-a.u))/det;
        const E=a.x-A*a.u-C*a.v,F=a.y-B*a.u-D*a.v;
        const cx=(a.x+b.x+c.x)/3,cy=(a.y+b.y+c.y)/3;
        g.save();g.beginPath();
        for(const [i,p] of [a,b,c].entries()){const dx=p.x-cx,dy=p.y-cy,l=Math.hypot(dx,dy)||1;const px=p.x+dx/l*.5,py=p.y+dy/l*.5;if(!i)g.moveTo(px,py);else g.lineTo(px,py);}
        g.closePath();g.clip();g.transform(A,B,C,D,E,F);g.drawImage(source,0,0);g.restore();
      };
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=i+j*(nx+1);triangle(points[k],points[k+1],points[k+nx+2]);triangle(points[k],points[k+nx+2],points[k+nx+1]);}
      frames.push(c);
    }
    patches.push({x,y,w,h,frames});
  }
  const weight=(x,y,cx,cy,rx,ry)=>{const d=((x-cx)/rx)**2+((y-cy)/ry)**2;return d<1?(1-d)**2:0;};
  patch(965,525,365,230,(x,y,t)=>{
    const finger=weight(x,y,1113,635,145,74),trigger=weight(x,y,1032,598,40,64);
    return [(finger*24+trigger*20)*t,(finger*10+trigger*5)*t];
  });
  patch(510,190,650,295,(x,y,t)=>{
    const along=(x-530)/595,line=207+(x-530)*.32;
    const w=weight(x,y,820,line,300,13)*Math.sin(Math.PI*clamp(along,0,1));
    return [-w*7*t,w*10*t];
  });
  function draw(cooldown) {
    const pull=age<.025?age/.025:1-sstep(.10,.25,age), frame=round(clamp(pull,0,1)*8);
    const unloaded=cooldown>.15, load=unloaded?0:cooldown>0?1-cooldown/.15:1;
    const key=frame*100+round(load*20);if(key===oldDraw)return;oldDraw=key;
    ctx.clearRect(0,0,rig.width,rig.height);ctx.drawImage(image,0,0);
    for(const p of patches){ctx.clearRect(p.x,p.y,p.w,p.h);ctx.drawImage(p.frames[frame],p.x,p.y);}
    // Exposed spear point leaves the guide at release, then slides back into view at the end of reload.
    if(load<1){
      ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.moveTo(414,153);ctx.lineTo(542,205);ctx.lineTo(529,231);ctx.lineTo(411,181);ctx.closePath();ctx.fill();ctx.restore();
      if(load>0){ctx.save();ctx.beginPath();ctx.moveTo(414,153);ctx.lineTo(542,205);ctx.lineTo(529,231);ctx.lineTo(411,181);ctx.closePath();ctx.clip();ctx.globalAlpha=load;ctx.drawImage(image,100*(1-load),42*(1-load));ctx.restore();}
    }
    rig.dataset.trigger=String(frame);rig.dataset.loaded=String(load===1);
  }
  draw(0);
  return {
    setVisible(visible){if(visible!==shown){layer.hidden=!visible;shown=visible;}},
    fire(){age=0;oldDraw=-1;},
    reset(){age=10;oldDraw=-1;draw(0);},
    update(time,speed,cooldown,dt=1/60){
      if(!shown)return;age+=dt;
      const h=canvas.clientHeight,moving=min(1,speed/7),kick=exp(-age*13)*sin(age*26);
      tx=(sin(time*4.4)*moving*.0025+sin(time*1.3)*.0014)*h;
      ty=(cos(time*8.8)*moving*.0015+kick*.018)*h;
      roll=sin(time*4.4)*moving*.15+kick*1.3;
      rig.style.transform=`translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) rotate(${roll.toFixed(3)}deg)`;
      draw(cooldown);
    },
    // The photo's muzzle is (530,212), not the projecting arrow point. Work in unrotated canvas axes,
    // so touch portrait rotation uses the same physical trajectory as desktop.
    muzzle(out){
      const h=canvas.clientHeight,w=canvas.clientWidth,iw=h*1.2,ih=h*.8;
      let x=530/1536*iw-iw*.78,y=212/1024*ih-ih*.88;
      const a=roll*PI/180,px=x*cos(a)-y*sin(a),py=x*sin(a)+y*cos(a);
      x=w*.5-h*.332+iw*.78+px+tx;y=h*.372+ih*.88+py+ty;
      const z=.85,cp=cos(F[PIT]),sy=sin(F[YAW]),cy=cos(F[YAW]),sp=sin(F[PIT]);
      const vx=(x/w*2-1)*TANH*w/h*z,vy=(1-y/h*2)*TANH*z;
      out.x=F[CX]+sy*cp*z+cy*vx-sy*sp*vy;
      out.y=F[CY]+sp*z+cp*vy;
      out.z=F[CZ]-cy*cp*z+sy*vx+cy*sp*vy;return out;
    }
  };
}
