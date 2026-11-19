// Pure gameplay simulation. Metres, seconds, +Y up; rendering owns no game rules.
// Fish-local axes are +X forward, +Y up and +Z sideways. Attachments use mesh units.
function huntArrowPose(f, a, out) {
  const sy = Math.sin(f.yaw), cy = Math.cos(f.yaw), sp = Math.sin(f.pitch), cp = Math.cos(f.pitch);
  const cr = Math.cos(f.roll || 0), sr = Math.sin(f.roll || 0);
  const tx = sy * cp, ty = sp, tz = -cy * cp;
  const ux = -sy * sp * cr + cy * sr, uy = cp * cr, uz = cy * sp * cr + sy * sr;
  const sx = cy * cr + sy * sp * sr, sySide = -cp * sr, sz = sy * cr - cy * sp * sr;
  out.x = f.x + (tx * a.x + ux * a.y + sx * a.z) * f.size;
  out.y = f.y + (ty * a.x + uy * a.y + sySide * a.z) * f.size;
  out.z = f.z + (tz * a.x + uz * a.y + sz * a.z) * f.size;
  out.dx = tx * a.dx + ux * a.dy + sx * a.dz;
  out.dy = ty * a.dx + uy * a.dy + sySide * a.dz;
  out.dz = tz * a.dx + uz * a.dy + sz * a.dz;
  return out;
}

function createHunt({ seed = 1, count = 192, speciesCount = 12, rock = () => -1, spawn = [10, -40, 7], yaw = -0.84 } = {}) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const range = (a, b) => a + (b - a) * random();
  const fish = [], shots = Array.from({ length: 24 }, () => ({ active: false, id: 0, x: 0, y: 0, z: 0, prevX: 0, prevY: 0, prevZ: 0, dx: 0, dy: 0, dz: 0, life: 0 }));
  const events = [], stuck = [];
  const game = { fish, shots, stuck, events, health: 100, oxygen: 100, score: 0, kills: 0, goal: 8, wave: 1, cooldown: 0, shotsFired: 0, hurt: 0, hit: 0, elapsed: 0, over: false, target: -1, seed };
  const emit = (type, value = 0, details) => { if (events.length < 32) events.push({ type, value, ...details }); };
  const clear = (x, y, z, r) => rock(x, y, z) < -Math.min(.8, r) && rock(x + r, y, z) < -0.15 && rock(x - r, y, z) < -0.15 && rock(x, y + r, z) < -0.15 && rock(x, y - r, z) < -0.15 && rock(x, y, z + r) < -0.15 && rock(x, y, z - r) < -0.15;
  function place(f, px, py, pz, heading, initial) {
    for (let k = 0; k < 160; k++) {
      const a = heading + range(-1.2, 1.2) + (k > 70 ? range(-Math.PI, Math.PI) : 0), d = range(f.predator ? 32 : initial ? 8 : 24, 48);
      const x = px + Math.sin(a) * d, y = Math.max(-48, Math.min(-5, py + range(-3, 15))), z = pz - Math.cos(a) * d;
      if (Math.hypot(x, z) < 142 && clear(x, y, z, f.radius + .35)) {
        f.x = f.homeX = x; f.y = f.homeY = y; f.z = f.homeZ = z; f.alive = true; f.hp = f.maxHP; f.fear = 0; f.flash = 0; f.respawn = 0; f.corpse = 0; f.roll = 0; f.arrows.length = 0; return true;
      }
    }
    f.alive = false; f.respawn = 1; f.corpse = 0; f.roll = 0; f.arrows.length = 0; return false;
  }
  for (let i = 0; i < count; i++) {
    let species = i % speciesCount;
    // Predators are rarer than reef fish, and begin outside their hunting radius.
    if (i >= speciesCount && species % 6 === 5 && Math.floor(i / speciesCount) % 4 !== 0) species = (species + 1) % speciesCount;
    const predator = species % 6 === 5;
    const size = predator ? range(2.6, 4) : range(.8, 2.5);
    const f = { index: i, species, predator, size, radius: size * .59, maxHP: predator ? 3 : size > 1.9 ? 2 : 1, hp: 1, alive: true, x: 0, y: 0, z: 0, homeX: 0, homeY: 0, homeZ: 0, yaw: range(-Math.PI, Math.PI), pitch: 0, roll: 0, phase: range(0, 6.28), speed: predator ? 2.8 : range(.7, 1.8), fear: 0, flash: 0, respawn: 0, bite: 0, corpse: 0, arrows: [] };
    place(f, spawn[0], spawn[1], spawn[2], yaw, true); fish.push(f);
  }
  // Swept ray against the body, rather than a sphere extending well beyond the visible fish.
  function entry(f, x, y, z, dx, dy, dz, length) {
    const sy = Math.sin(f.yaw), cy = Math.cos(f.yaw), sp = Math.sin(f.pitch), cp = Math.cos(f.pitch);
    const ox = x - f.x, oy = y - f.y, oz = z - f.z;
    const ax = f.size * .48, ay = f.size * .20, az = f.size * .14;
    const px = (ox * sy * cp + oy * sp - oz * cy * cp) / ax;
    const py = (-ox * sy * sp + oy * cp + oz * cy * sp) / ay;
    const pz = (ox * cy + oz * sy) / az;
    const vx = (dx * sy * cp + dy * sp - dz * cy * cp) / ax;
    const vy = (-dx * sy * sp + dy * cp + dz * cy * sp) / ay;
    const vz = (dx * cy + dz * sy) / az;
    const a = vx * vx + vy * vy + vz * vz, b = px * vx + py * vy + pz * vz, c = px * px + py * py + pz * pz - 1;
    if (c <= 0) return 0;
    const disc = b * b - a * c;
    if (disc < 0 || a < 1e-12) return Infinity;
    const t = (-b - Math.sqrt(disc)) / a;
    return t >= 0 && t <= length ? t : Infinity;
  }
  function wall(x, y, z, dx, dy, dz, length) {
    const n = Math.ceil(length / .1);
    for (let k = 0; k <= n; k++) { const t = length * k / (n || 1); if (rock(x + dx * t, y + dy * t, z + dz * t) > -.06) return t; }
    return Infinity;
  }
  game.fire = (x, y, z, dx, dy, dz, muzzle) => {
    if (game.over || game.cooldown > 0) return false;
    const s = shots.find((s) => !s.active); if (!s) return false;
    const l = Math.hypot(dx, dy, dz);
    if (![x, y, z, l].every(Number.isFinite) || l < .01) return false;
    dx /= l; dy /= l; dz /= l;
    let sx = x, sy = y, sz = z, vx = dx, vy = dy, vz = dz;
    if (muzzle) {
      if (![muzzle.x, muzzle.y, muzzle.z].every(Number.isFinite)) return false;
      sx = muzzle.x; sy = muzzle.y; sz = muzzle.z;
      const mx = sx - x, my = sy - y, mz = sz - z, ml = Math.hypot(mx, my, mz);
      if (ml > .001) {
        const barrier = wall(x, y, z, mx / ml, my / ml, mz / ml, ml);
        if (Number.isFinite(barrier)) { const k = Math.max(0, barrier - .02) / ml; sx = x + mx * k; sy = y + my * k; sz = z + mz * k; }
      }
      let distance = Math.min(65, wall(x, y, z, dx, dy, dz, 65));
      for (const f of fish) if (f.alive) distance = Math.min(distance, entry(f, x, y, z, dx, dy, dz, distance));
      // Converge from the visible muzzle to the camera's aim point; never aim back into the diver.
      distance = Math.max(1, distance);
      vx = x + dx * distance - sx; vy = y + dy * distance - sy; vz = z + dz * distance - sz;
      const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
    }
    Object.assign(s, { active: true, id: ++game.shotsFired, x: sx, y: sy, z: sz, prevX: sx, prevY: sy, prevZ: sz, dx: vx, dy: vy, dz: vz, life: 2 });
    game.cooldown = .8; emit('fire', 0, { x: sx, y: sy, z: sz, dx: vx, dy: vy, dz: vz, shot: s.id });
    for (const f of fish) if (f.alive && Math.hypot(f.x - x, f.y - y, f.z - z) < 18) f.fear = 3;
    return true;
  };
  game.aim = (x, y, z, dx, dy, dz) => {
    let best = 65, target = -1;
    const length = Math.hypot(dx, dy, dz);
    if (length < .001 || !Number.isFinite(length)) { game.target = -1; return -1; }
    dx /= length; dy /= length; dz /= length;
    for (let i = 0; i < fish.length; i++) if (fish[i].alive) { const t = entry(fish[i], x, y, z, dx, dy, dz, best); if (t < best) { best = t; target = i; } }
    if (target >= 0 && wall(x, y, z, dx, dy, dz, best) < best) target = -1;
    game.target = target; return target;
  };
  function embed(f, s, hit) {
    const sy = Math.sin(f.yaw), cy = Math.cos(f.yaw), sp = Math.sin(f.pitch), cp = Math.cos(f.pitch);
    const ox = hit.x - f.x, oy = hit.y - f.y, oz = hit.z - f.z;
    const a = {
      x: (ox * sy * cp + oy * sp - oz * cy * cp) / f.size,
      y: (-ox * sy * sp + oy * cp + oz * cy * sp) / f.size,
      z: (ox * cy + oz * sy) / f.size,
      dx: s.dx * sy * cp + s.dy * sp - s.dz * cy * cp,
      dy: -s.dx * sy * sp + s.dy * cp + s.dz * cy * sp,
      dz: s.dx * cy + s.dz * sy
    };
    if (f.arrows.length === 4) f.arrows.shift();
    f.arrows.push(a);
  }
  game.update = (dt, player) => {
    if (game.over) return;
    game.elapsed += dt; game.cooldown = Math.max(0, game.cooldown - dt); game.hurt = Math.max(0, game.hurt - dt); game.hit = Math.max(0, game.hit - dt);
    for (let i = stuck.length - 1; i >= 0; i--) { stuck[i].life -= dt; if (stuck[i].life <= 0) stuck.splice(i, 1); }
    game.oxygen = Math.min(100, Math.max(0, game.oxygen + (player.y > -4 ? 14 : -100 / 180) * dt));
    if (game.oxygen === 0) game.health = Math.max(0, game.health - 12 * dt);
    for (const f of fish) {
      if (!f.alive) {
        f.respawn -= dt;
        if (f.corpse > 0) {
          f.corpse = Math.max(0, f.corpse - dt); f.flash = Math.max(0, f.flash - dt);
          f.roll += (Math.PI * .85 - f.roll) * Math.min(1, dt * .8);
          const nx = f.x + Math.sin(f.yaw) * dt * .13, ny = f.y - dt * .22, nz = f.z - Math.cos(f.yaw) * dt * .13;
          if (ny > -49 && clear(nx, ny, nz, f.radius * .5)) { f.x = nx; f.y = ny; f.z = nz; }
        }
        if (f.respawn <= 0 && f.corpse <= 0) place(f, player.x, player.y, player.z, player.yaw, false);
        continue;
      }
      const px = player.x - f.x, py = player.y - f.y, pz = player.z - f.z, dist = Math.hypot(px, py, pz);
      f.flash = Math.max(0, f.flash - dt); f.fear = Math.max(0, f.fear - dt); f.bite = Math.max(0, f.bite - dt);
      if (dist > 90) { place(f, player.x, player.y, player.z, player.yaw, false); continue; }
      let dx, dy, dz, boost = 1;
      if ((f.predator && dist < 18 && f.fear === 0) || (dist < 8 || f.fear > 0)) {
        const sign = f.predator && f.fear === 0 ? 1 : -1; dx = px * sign; dy = py * sign; dz = pz * sign; boost = 2.4;
      } else {
        const a = game.elapsed * .22 + f.species * 1.71;
        dx = f.homeX + Math.sin(a) * 7 - f.x; dy = f.homeY + Math.sin(a * 1.3 + f.phase) * 1.5 - f.y; dz = f.homeZ + Math.cos(a) * 7 - f.z;
      }
      const desired = Math.atan2(dx, -dz), delta = Math.atan2(Math.sin(desired - f.yaw), Math.cos(desired - f.yaw));
      f.yaw += delta * Math.min(1, dt * 2.3); f.pitch += (Math.atan2(dy, Math.hypot(dx, dz)) * .6 - f.pitch) * Math.min(1, dt * 2);
      const speed = f.speed * boost, vx = Math.sin(f.yaw) * Math.cos(f.pitch), vy = Math.sin(f.pitch), vz = -Math.cos(f.yaw) * Math.cos(f.pitch), step = speed * dt;
      const nx = f.x + vx * step, ny = f.y + vy * step, nz = f.z + vz * step;
      if (ny > -49 && ny < -3 && Math.hypot(nx, nz) < 145 && clear(nx + vx * .6, ny + vy * .6, nz + vz * .6, f.radius + .2)) { f.x = nx; f.y = ny; f.z = nz; }
      else { f.yaw += dt * 5; f.homeX = f.x - vx * 5; f.homeY = Math.min(-5, f.y + 2); f.homeZ = f.z - vz * 5; }
      if (f.predator && dist < f.radius + .9 && f.fear === 0 && f.bite === 0 && wall(f.x, f.y, f.z, px / (dist || 1), py / (dist || 1), pz / (dist || 1), dist) === Infinity) {
        game.health = Math.max(0, game.health - 12); game.hurt = .65; f.bite = 2; f.fear = 1; emit('hurt');
      }
    }
    for (const s of shots) if (s.active) {
      s.prevX = s.x; s.prevY = s.y; s.prevZ = s.z;
      const length = Math.min(38 * dt, s.life * 38); let nearest = wall(s.x, s.y, s.z, s.dx, s.dy, s.dz, length), victim = null;
      for (const f of fish) if (f.alive) { const t = entry(f, s.x, s.y, s.z, s.dx, s.dy, s.dz, length); if (t < nearest) { nearest = t; victim = f; } }
      if (nearest <= length) {
        s.x += s.dx * nearest; s.y += s.dy * nearest; s.z += s.dz * nearest; s.active = false;
        const hit = { x: s.x, y: s.y, z: s.z, dx: s.dx, dy: s.dy, dz: s.dz };
        if (victim) {
          embed(victim, s, hit);
          victim.hp--; victim.flash = .3; victim.fear = 5; game.hit = .3; emit('hit', 1, { ...hit, fish: victim.index });
          if (victim.hp <= 0) { victim.alive = false; victim.corpse = 7; victim.respawn = range(10, 18); game.kills++; const points = victim.predator ? 300 : victim.maxHP * 100; game.score += points; emit('kill', points, { ...hit, fish: victim.index }); }
        } else {
          if (stuck.length === 24) stuck.shift(); stuck.push({ ...hit, life: 12 });
          emit('rock', 0, hit);
        }
      } else { s.x += s.dx * length; s.y += s.dy * length; s.z += s.dz * length; s.life -= dt; if (s.life <= 0) s.active = false; }
    }
    if (game.kills >= game.goal) { game.wave++; game.goal += 8; game.oxygen = 100; game.health = Math.min(100, game.health + 25); game.score += 500; emit('wave', game.wave); }
    if (game.health <= 0) { game.over = true; emit('over'); }
  };
  return game;
}
