import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const code = readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8') + '\nI18N;';
function setup({ language='en-US', saved, query='', storageBlocked=false } = {}) {
  const element = (dataset={}) => ({ dataset, textContent:'', attributes:{}, listeners:{}, setAttribute(key,value) { this.attributes[key]=value; }, addEventListener(type,callback) { this.listeners[type]=callback; } });
  const title=element({i18n:'tagline'}),status=element({i18n:'diving'}),aria=element({i18nAria:'menu'}),en=element(),zh=element();
  const elements={s:status,'lang-en':en,'lang-zh':zh}, events={}, values=new Map(saved===undefined?[]:[['tidehunterLanguage',saved]]);
  const document={documentElement:{},title:'',querySelectorAll(selector) { return selector==='[data-i18n]'?[title,status]:[aria]; },getElementById(id) { return elements[id]; },addEventListener(type,callback) { events[type]=callback; }};
  const location={search:query,href:'https://example.test/tidehunter/'+query},changes=[];
  const localStorage={getItem(key) { if(storageBlocked)throw Error('blocked');return values.get(key); },setItem(key,value) { if(storageBlocked)throw Error('blocked');values.set(key,value); }};
  const i18n=vm.runInNewContext(code,{document,navigator:{language},location,localStorage,URLSearchParams,URL,history:{replaceState(state,title,url){changes.push(url);}},console});
  return {i18n,document,title,status,aria,en,zh,values,events,changes,element};
}
test('first visit respects the primary browser language with English fallback',()=>{
  assert.equal(setup({language:'zh-CN'}).i18n.language,'zh');
  assert.equal(setup({language:'zh-Hant'}).i18n.language,'zh');
  assert.equal(setup({language:'en-GB'}).i18n.language,'en');
  assert.equal(setup({language:'ja-JP'}).i18n.language,'en');
});
test('valid saved preference wins, URL hints override it, and a manual selection survives reload',()=>{
  assert.equal(setup({language:'en-US',saved:'zh'}).i18n.language,'zh');
  assert.equal(setup({language:'zh-CN',saved:'bad'}).i18n.language,'zh');
  const s=setup({saved:'zh',query:'?lang=en&detail=low'});assert.equal(s.i18n.language,'en');
  assert.equal(s.values.get('tidehunterLanguage'),'zh');s.i18n.setLanguage('zh');
  assert.equal(s.values.get('tidehunterLanguage'),'zh');assert.equal(s.changes[0],'/tidehunter/?lang=zh&detail=low');
  assert.equal(s.i18n.setLanguage('de'),false);assert.equal(s.i18n.language,'zh');
});
test('switching languages updates static text, accessible labels, dynamic text and button state',()=>{
  const s=setup(),notice=s.element();let changes=0;const unsubscribe=s.i18n.onChange(()=>changes++);
  s.i18n.setText(notice,'killNotice',{points:300});assert.equal(notice.textContent,'Catch confirmed +300');
  s.zh.listeners.click();assert.equal(notice.textContent,'猎获成功 +300');assert.equal(s.document.documentElement.lang,'zh-CN');
  assert.equal(s.aria.attributes['aria-label'],'打开菜单');assert.equal(s.zh.attributes['aria-pressed'],'true');assert.equal(s.en.attributes['aria-pressed'],'false');
  assert.equal(s.i18n.species(5),'礁鲨');assert.equal(changes,1);unsubscribe();s.i18n.setLanguage('en');assert.equal(changes,1);assert.equal(s.i18n.species(5),'Reef shark');
});
test('loading/fatal text remains translated after switching and inaccessible storage is harmless',()=>{
  const s=setup({storageBlocked:true});s.i18n.setText(s.status,'needWebGPU');
  s.events['tidehunter:error']({detail:{cause:1,message:'oldEnglish'}});s.i18n.setLanguage('zh');assert.match(s.status.textContent,/WebGPU/);assert.match(s.status.textContent,/场景需要/);
  s.events['tidehunter:error']({detail:{message:'GPU timeout'}});assert.equal(s.status.textContent,'启动失败：GPU timeout');
  s.i18n.setLanguage('en');assert.equal(s.status.textContent,'Failed to start: GPU timeout');
});
test('all gameplay and startup messages exist in both languages and parameters remain plain text',()=>{
  const {i18n}=setup();const keys='title tagline dive resume detail low medium high swim vertical fast viewpoints mouseLeft fireControl pause mute stats touchHint playOnline menu mission health oxygen weapon ready fire restart endTitle restartHint initialHint killNotice waveNotice endScore deathOxygen deathAttack goal reloading target danger aimHint diving chromeHint needWebGPU noAdapter deviceLost compile seabed canyons kelp setPieces light failedStart language'.split(' ');
  for(const language of ['en','zh']){i18n.setLanguage(language);for(const key of keys){assert.notEqual(i18n.t(key),key,`${language}:${key}`);assert.ok(i18n.t(key).length);}}
  i18n.setLanguage('en');assert.equal(i18n.t('endScore',{score:700,kills:2,seconds:45}),'Score 700 · 2 fish caught · 45s underwater');
  assert.equal(i18n.t('failedStart',{message:'<img src=x>'}),'Failed to start: <img src=x>');
});
