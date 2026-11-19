import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const { createHunt, huntArrowPose } = vm.runInNewContext(readFileSync(new URL('../src/game-core.js', import.meta.url), 'utf8') + '\n({createHunt, huntArrowPose});');
const player = { x: 0, y: -20, z: 0, yaw: 0 };
const create = (options = {}) => createHunt({ seed: 42, count: 12, spawn: [0, -20, 0], ...options });
function target(g, index = 0, z = -5) {
  for (const f of g.fish) { f.alive = false; f.respawn = 999; }
  const f = g.fish[index]; Object.assign(f, { alive: true, x: 0, y: -20, z, hp: 1, maxHP: 1, speed: 0, size: 1.5, radius: .885, yaw: Math.PI/2, pitch: 0, roll: 0 }); return f;
}
test('seed reproduces fish and all species appear', () => {
  const a = create(), b = create(); assert.equal(JSON.stringify(a.fish), JSON.stringify(b.fish));
  assert.equal(new Set(a.fish.map(f => f.species)).size, 12);
  assert.notEqual(a.fish[0].x, create({seed:43}).fish[0].x);
});
test('cooldown rejects repeat fire; aiming and swept collision hit', () => {
  const g = create(), f = target(g);
  assert.equal(g.aim(0,-20,0,0,0,-1),0);
  assert.equal(g.fire(0,-20,0,0,0,-1),true); assert.equal(g.fire(0,-20,0,0,0,-1),false);
  g.update(.2,player); assert.equal(f.alive,false); assert.equal(g.kills,1);assert.equal(g.score,100);
});
test('a wall blocks aiming and a fast projectile', () => {
  const g=create({rock:(x,y,z)=>z < -2.9 && z > -3.1 ? 1 : -1}), f=target(g);
  assert.equal(g.aim(0,-20,0,0,0,-1),-1);g.fire(0,-20,0,0,0,-1);g.update(.2,player);assert.equal(f.hp,1);assert.equal(g.kills,0);
});
test('nearest fish receives damage only once', () => {
  const g=create(), near=target(g), far=g.fish[1];Object.assign(far,{alive:true,x:0,y:-20,z:-7,hp:2,speed:0});
  g.fire(0,-20,0,0,0,-1);g.update(.15,player);assert.equal(near.alive,false);assert.equal(far.hp,2);
});
test('oxygen drains underwater, refills at surface, and causes game over', () => {
  const g=create({count:0});g.update(60,player);assert.ok(Math.abs(g.oxygen-66.6666667)<.001);
  g.update(3,{...player,y:-2});assert.equal(g.oxygen,100);g.oxygen=0;g.health=1;g.update(1,player);assert.equal(g.over,true);
  const score=g.elapsed;g.update(10,player);assert.equal(g.elapsed,score);assert.equal(g.fire(0,-20,0,0,0,-1),false);
});
test('predator bites have a cooldown and terrain blocks bites', () => {
  const g=create(),f=target(g,5,-1);f.hp=3;g.update(1/60,player);assert.equal(g.health,88);g.update(1/60,player);assert.equal(g.health,88);
  const blocked=create({rock:(x,y,z)=>z < -.4 && z > -.6 ? 1:-1});target(blocked,5,-1);blocked.update(1/60,player);assert.equal(blocked.health,100);
});
test('quota grants one round reward and killed fish respawn', () => {
  const g=create(),f=target(g);g.kills=7;g.oxygen=30;g.health=60;g.fire(0,-20,0,0,0,-1);g.update(.2,player);
  assert.equal(g.wave,2);assert.equal(g.goal,16);assert.equal(g.score,600);assert.equal(g.oxygen,100);assert.equal(g.health,85);
  f.respawn=0;f.corpse=0;g.update(1/60,player);assert.equal(f.alive,true);assert.equal(f.hp,f.maxHP);
});
test('fish never spawn inside solid terrain and invalid fire is ignored', () => {
  const g=create({rock:()=>1});assert.ok(g.fish.every(f=>!f.alive));assert.equal(g.fire(0,0,0,0,0,0),false);
});
test('predators are a minority and start beyond their attack radius', () => {
  const g=create({count:240});const predators=g.fish.filter(f=>f.predator);
  assert.ok(predators.length>0&&predators.length<=12);
  assert.ok(predators.every(f=>!f.alive||Math.hypot(f.x,f.y+20,f.z)>30));
});

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);
test('embedded arrow tip is on the body surface and follows translation, yaw and roll', () => {
  const g=create(),f=target(g);f.hp=f.maxHP=3;
  g.fire(0,-20,0,0,0,-1);g.update(.2,player);
  assert.equal(f.arrows.length,1);assert.equal(f.alive,true);
  const a=f.arrows[0],hit=g.events.find(e=>e.type==='hit'),before=huntArrowPose(f,a,{});
  close(before.x,hit.x);close(before.y,hit.y);close(before.z,hit.z);
  close((a.x/.48)**2+(a.y/.20)**2+(a.z/.14)**2,1);
  f.x+=4;f.y-=2;f.z+=3;
  const translated=huntArrowPose(f,a,{});close(translated.x,before.x+4);close(translated.y,before.y-2);close(translated.z,before.z+3);
  f.yaw+=1.1;f.roll=.7;const rotated=huntArrowPose(f,a,{});
  close(Math.hypot(rotated.x-f.x,rotated.y-f.y,rotated.z-f.z),Math.hypot(a.x,a.y,a.z)*f.size);
  close(Math.hypot(rotated.dx,rotated.dy,rotated.dz),1);
  assert.ok(Math.hypot(rotated.x-translated.x,rotated.y-translated.y,rotated.z-translated.z)>.05);
});
test('arrow transform uses the same rolled fish basis as the renderer', () => {
  const f={x:1,y:2,z:3,size:2,yaw:0,pitch:0,roll:0},a={x:.1,y:.2,z:.3,dx:0,dy:0,dz:1};
  const first=huntArrowPose(f,a,{});close(first.x,1.6);close(first.y,2.4);close(first.z,2.8);close(first.dx,1);
  f.yaw=Math.PI/2;f.roll=Math.PI/2;const next=huntArrowPose(f,a,{});
  close(next.x,1.2);close(next.y,1.4);close(next.z,3.4);close(next.dy,-1);
});
test('a killed fish retains its arrow for a seven-second sinking corpse, then respawns clean', () => {
  const g=create(),f=target(g);g.fire(0,-20,0,0,0,-1);g.update(.2,player);
  assert.equal(f.alive,false);assert.equal(f.corpse,7);assert.equal(f.arrows.length,1);
  const y=f.y;g.update(1,player);assert.equal(f.corpse,6);assert.ok(f.y<y);assert.ok(f.roll>0);assert.equal(f.arrows.length,1);
  g.update(6.01,player);assert.equal(f.corpse,0);assert.equal(f.alive,false);
  f.respawn=0;g.update(1/60,player);assert.equal(f.alive,true);assert.equal(f.arrows.length,0);assert.equal(f.roll,0);
});
test('the narrower body collision does not hit empty water beside a fish', () => {
  const g=create(),f=target(g);f.yaw=0;
  assert.equal(g.aim(.4,-20,0,0,0,-1),-1);
  g.fire(.4,-20,0,0,0,-1);g.update(.2,player);assert.equal(f.hp,1);
});
test('projectiles start at the muzzle and converge on the camera aim point', () => {
  const g=create(),f=target(g);const muzzle={x:.25,y:-20.12,z:-.4};
  assert.equal(g.fire(0,-20,0,0,0,-1,muzzle),true);
  const s=g.shots.find(s=>s.active);close(s.x,muzzle.x);close(s.y,muzzle.y);close(s.z,muzzle.z);
  assert.ok(s.dx<0&&s.dy>0);assert.equal(g.shotsFired,1);
  const fire=g.events.find(e=>e.type==='fire');close(fire.x,muzzle.x);assert.equal(fire.shot,s.id);
  g.update(1/60,player);close(s.prevX,muzzle.x);close(s.prevY,muzzle.y);close(s.prevZ,muzzle.z);
  g.update(.2,player);assert.equal(f.hp,0);assert.equal(f.arrows.length,1);
});
test('muzzle placement cannot bypass a wall between the diver and gun', () => {
  const g=create({rock:(x,y,z)=>z<-.19&&z>-.31?1:-1}),f=target(g);
  g.fire(0,-20,0,0,0,-1,{x:0,y:-20,z:-.5});g.update(.2,player);
  assert.equal(f.hp,1);assert.equal(g.stuck.length,1);assert.ok(g.stuck[0].z>-.5);
  assert.equal(g.events.find(e=>e.type==='rock').z,g.stuck[0].z);
  g.update(12.01,player);assert.equal(g.stuck.length,0);
});
