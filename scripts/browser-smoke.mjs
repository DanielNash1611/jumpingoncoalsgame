import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=Number(process.env.QA_PORT || 4173), base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'], {stdio:'pipe',env:{...process.env,DATABASE_URL:'',TRACKER_ACCESS_KEY:'',TRACKER_SESSION_SECRET:''}});
let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
let browser;const errors=[], external=[];
try {
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,serverLog);
 browser=await chromium.launch({headless:true,...(process.env.QA_CHROME?{executablePath:process.env.QA_CHROME}:{}),args:['--mute-audio']});
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>{window.__mediaRequests=0;navigator.mediaDevices.getUserMedia=()=>{window.__mediaRequests++;return Promise.reject(new Error('Camera disabled in smoke test'));};});
 await context.route('**/*',route=>{const url=route.request().url();if(/^https?:/.test(url)&&!url.startsWith(base+'/')){external.push(url);return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await mkdir('test-results',{recursive:true});
await page.goto(base);await page.waitForFunction(()=>document.querySelector('#ui-title-panel').getAttribute('aria-hidden')==='false');
 await page.keyboard.press('m');assert.match(await page.locator('#ui-title-sound').innerText(),/off/i);await page.keyboard.press('Space');
 await page.waitForFunction(()=>document.querySelector('#ui-hud').getAttribute('aria-hidden')==='false',{timeout:60000});
 assert.match(await page.locator('#ui-chapter').innerText(),/Swing/i);await page.keyboard.down('ArrowRight');await page.waitForTimeout(300);await page.keyboard.up('ArrowRight');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#ui-cinematic-title').textContent==='Paused');await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);const bounds=await page.locator('canvas').boundingBox();assert.ok(bounds&&bounds.width<=390&&bounds.height<=844);
 assert.deepEqual(external,[],'Unexpected external requests');assert.deepEqual(errors,[],'Browser runtime errors');assert.equal(await page.evaluate(()=>window.__mediaRequests),0,'Smoke must not request camera or microphone');
 await page.waitForTimeout(350);await page.screenshot({path:'test-results/browser-smoke.png',fullPage:false});console.log(JSON.stringify({checks:'passed',errors,external,mediaRequests:0}));
} finally {await browser?.close();server.kill('SIGTERM');}
