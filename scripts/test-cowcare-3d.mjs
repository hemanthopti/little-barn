import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base='http://127.0.0.1:4175/';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-sandbox']});
try{
  const page=await browser.newPage({viewport:{width:1536,height:864},deviceScaleFactor:1});
  const failures=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#splash').dispatchEvent('pointerdown',{pointerId:1,pointerType:'mouse'});
  await page.waitForTimeout(350);
  await page.locator('button[aria-label="Play with and care for the cow"]').dispatchEvent('pointerdown',{pointerId:2,pointerType:'mouse'});
  await page.waitForTimeout(3000);
  const result=await page.evaluate(()=>{
    const overlay=document.querySelector('#cc3d-overlay');
    const canvas=document.querySelector('#cc3d-canvas');
    const cow=document.querySelector('#ccCowImg');
    const scene=document.querySelector('#cowcare');
    const gl=canvas?.getContext('webgl2');
    let pixels=null;
    if(gl&&canvas.width&&canvas.height){
      const p=new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width*.5),Math.floor(canvas.height*.5),1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);
      pixels=Array.from(p);
    }
    return {overlay:!!overlay,opacity:overlay?getComputedStyle(overlay).opacity:null,dimensions:canvas?[canvas.width,canvas.height]:null,sceneDisplay:scene?getComputedStyle(scene).display:null,cowOpacity:cow?.getAttribute('opacity'),pixels,toolCount:document.querySelectorAll('[data-id^="cc-"]').length};
  });
  await mkdir('test-artifacts',{recursive:true});
  await page.screenshot({path:'test-artifacts/cowcare-3d-chromium.png'});
  console.log('COW_3D_BROWSER_SMOKE',JSON.stringify(result));
  console.log('COW_3D_PAGE_ERRORS',JSON.stringify(failures));
  assert.equal(result.sceneDisplay,'block','Cow Care SVG must be visible');
  assert.equal(result.overlay,true,'WebGL HTML overlay must exist');
  assert.equal(result.opacity,'1','WebGL overlay must be visible after confirmed frame');
  assert.ok(result.dimensions?.[0]>100&&result.dimensions?.[1]>100,'WebGL canvas must have non-zero dimensions');
  assert.ok(result.toolCount>=6,'Touch tools must still be present');
  assert.equal(failures.length,0,'No uncaught errors');
  console.log('COW_3D_BROWSER_SMOKE_PASS');
}finally{await browser.close();}
