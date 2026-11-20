// Language is chosen before GPU startup; selection also works on loading/error screens.
const I18N = (() => {
  const messages = {
    en: {
      title: 'Tidehunter', tagline: 'First-person underwater spearfishing',
      dive: 'Start diving', resume: 'Resume dive', detail: 'Detail', low: 'Low', medium: 'Medium', high: 'High',
      swim: 'Swim', vertical: 'Down / up', fast: 'Faster', viewpoints: 'Viewpoints', mouseLeft: 'Left click',
      fireControl: 'Fire spear', pause: 'Pause', mute: 'Mute', stats: 'Stats',
      touchHint: 'Hold to swim · slide to steer · two fingers to speed up · tap Fire to shoot',
      playOnline: 'Play online', menu: 'Open menu', mission: 'TIDEHUNTER / DIVE HUNT',
      health: 'Health', oxygen: 'Oxygen', weapon: 'H-01 / Twin-band speargun', ready: 'Spear ready', fire: 'Fire',
      restart: 'Dive again', endTitle: 'Dive over', restartHint: 'Press R to restart',
      initialHint: 'Catch 8 fish to complete round one · surface within 4 m to refill oxygen',
      killNotice: 'Catch confirmed +{points}',
      waveNotice: 'Round {wave} · oxygen refilled · +25 health · +500 bonus',
      endScore: 'Score {score} · {kills} fish caught · {seconds}s underwater',
      deathOxygen: 'Out of oxygen — dive ended', deathAttack: 'Overwhelmed by predators — dive ended',
      goal: 'Round {wave} · Catches {kills} / {goal}', reloading: 'Reloading · {seconds}s',
      target: '{name} · {danger}{hp}/{maxHP}', danger: 'Danger · ', aimHint: 'Aim at fish · left click / Space to fire', aimHintTouch: 'Aim at fish · tap Fire to shoot',
      diving: 'Diving…', chromeHint: 'Use Google Chrome for the best experience',
      needWebGPU: 'This scene needs WebGPU. Try a current Chrome or Edge.', noAdapter: 'No WebGPU adapter found.',
      deviceLost: 'The graphics device was lost. Reload the page to try again.',
      compile: 'Compiling shaders…', seabed: 'Sculpting the seabed…', canyons: 'Carving canyons…',
      kelp: 'Growing kelp…', setPieces: 'Building set pieces…', light: 'Letting the light in…',
      failedStart: 'Failed to start: {message}', language: 'Language'
    },
    zh: {
      title: 'Tidehunter · 潮汐猎手', tagline: '潮汐猎手 · 第一人称深海潜猎',
      dive: '开始潜猎', resume: '继续潜猎', detail: '画质', low: '低', medium: '中', high: '高',
      swim: '游泳', vertical: '下潜 / 上浮', fast: '加速', viewpoints: '切换海域', mouseLeft: '左键',
      fireControl: '发射鱼箭', pause: '暂停', mute: '静音', stats: '性能',
      touchHint: '按住游泳 · 滑动转向 · 双指加速 · 点击发射按钮射击',
      playOnline: '在线游玩', menu: '打开菜单', mission: 'TIDEHUNTER / 潜猎行动',
      health: '生命', oxygen: '氧气', weapon: 'H-01 / 双带鱼枪', ready: '鱼箭就绪', fire: '发射',
      restart: '再次下潜', endTitle: '潜水结束', restartHint: '按 R 重新开始',
      initialHint: '猎获 8 条鱼完成首轮 · 距水面 4 米内补充氧气',
      killNotice: '猎获成功 +{points}',
      waveNotice: '第 {wave} 轮 · 氧气补满 · 生命恢复 +25 · 奖励 +500',
      endScore: '积分 {score} · 猎获 {kills} 条 · 潜水 {seconds} 秒',
      deathOxygen: '氧气耗尽，潜水结束', deathAttack: '受到攻击，潜水结束',
      goal: '第 {wave} 轮 · 猎获 {kills} / {goal}', reloading: '上箭 · {seconds}s',
      target: '{name} · {danger}{hp}/{maxHP}', danger: '危险 · ', aimHint: '瞄准鱼群 · 左键 / 空格发射', aimHintTouch: '瞄准鱼群 · 点击发射按钮射击',
      diving: '下潜中…', chromeHint: '使用 Google Chrome 可获得更佳体验',
      needWebGPU: '场景需要 WebGPU 支持，请使用新版 Chrome 或 Edge。', noAdapter: '未找到可用的 WebGPU 图形设备。',
      deviceLost: '图形设备连接已丢失，请刷新页面重试。',
      compile: '编译着色器…', seabed: '塑造海床…', canyons: '雕刻海底峡谷…',
      kelp: '种植海藻…', setPieces: '构建海底景观…', light: '让阳光照进海底…',
      failedStart: '启动失败：{message}', language: '语言'
    }
  };
  const fishNames = {
    en: ['Golden sea bream', 'Bluefin', 'Coral butterflyfish', 'Violet perch', 'Silver dartfish', 'Reef shark', 'Emerald bream', 'Firetail', 'Moonlight butterflyfish', 'Spotted wrasse', 'Deepwater dartfish', 'Tiger shark'],
    zh: ['金纹鲷', '蓝翼鱼', '珊瑚蝶鱼', '紫鳍鲈', '银梭鱼', '礁鲨', '翡翠鲷', '火尾鱼', '月光蝶鱼', '斑点隆头鱼', '深海梭鱼', '虎纹鲨']
  };
  const valid = (value) => value === 'en' || value === 'zh';
  let saved, query;
  try { saved = localStorage.getItem('tidehunterLanguage'); } catch {}
  try { query = new URLSearchParams(location.search).get('lang'); } catch {}
  let language = valid(query) ? query : valid(saved) ? saved : /^zh\b/i.test(navigator.language || '') ? 'zh' : 'en';
  const dynamic = new Map(), listeners = new Set();
  const t = (key, params = {}) => (messages[language][key] ?? messages.en[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
  const setText = (element, key, params = {}) => {
    if (!element) return;
    dynamic.set(element, { key, params: { ...params } });
    element.textContent = t(key, params);
  };
  function applyDOM() {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = t('title');
    for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
    for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', t(element.dataset.i18nAria));
    for (const [element, message] of dynamic) element.textContent = t(message.key, message.params);
    for (const code of ['en', 'zh']) {
      const button = document.getElementById('lang-' + code);
      if (button) button.setAttribute('aria-pressed', String(code === language));
    }
  }
  function setLanguage(value) {
    if (!valid(value)) return false;
    language = value;
    try { localStorage.setItem('tidehunterLanguage', language); } catch {}
    // A manual choice wins over a shared URL hint on the next reload, too.
    try { const url = new URL(location.href); if (url.searchParams.has('lang')) { url.searchParams.set('lang', language); history.replaceState(null, '', url.pathname + url.search + url.hash); } } catch {}
    applyDOM();
    for (const callback of listeners) { try { callback(language); } catch (error) { console.error(error); } }
    return true;
  }
  for (const code of ['en', 'zh']) {
    const button = document.getElementById('lang-' + code);
    if (button) button.addEventListener('click', () => setLanguage(code));
  }
  document.addEventListener('tidehunter:error', (event) => {
    const error = event.detail || {};
    // Friendly GPU errors were already registered by main.js; preserve their translation key.
    if (!error.cause) setText(document.getElementById('s'), 'failedStart', { message: error.message || '' });
  });
  applyDOM();
  return { t, setText, setLanguage, applyDOM, get language() { return language; }, species: (index) => fishNames[language][index] ?? '', onChange(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
})();
