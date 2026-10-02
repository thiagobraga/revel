import {test,expect} from './fixtures';
import AxeBuilder from '@axe-core/playwright';
test('public identity, themes, language, keyboard and responsive artwork',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page).toHaveTitle(/REVEL/);await expect(page.getByRole('heading',{level:1})).toHaveText('EstradaPerdida');
 await page.getByRole('button',{name:'Tema claro'}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.getByRole('button',{name:'Idioma / Language'}).click();await expect(page.getByText('Noise, concrete and resistance.')).toBeVisible();await page.getByRole('button',{name:'Idioma / Language'}).click();
 await expect(page.locator('.album-cover')).toHaveJSProperty('naturalWidth',1080);expect(errors).toEqual([]);
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
 await page.setViewportSize({width:1920,height:1080});await page.getByRole('button',{name:'Tema escuro'}).click();await page.screenshot({path:'dist/screenshots/desktop-dark.png',fullPage:true});await page.getByRole('button',{name:'Tema claro'}).click();await page.screenshot({path:'dist/screenshots/desktop-light.png',fullPage:true});
 for(const width of [390,768,1440,1920]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Abrir menu'}).click();await expect(page.locator('.navigation')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Abrir menu'})).toBeFocused();await page.screenshot({path:'dist/screenshots/mobile-light.png',fullPage:true});
});
test('production security headers and manifest are present',async({request})=>{
 const response=await request.get('/');expect(response.headers()['content-security-policy']).toContain("'nonce-");expect(response.headers()['x-content-type-options']).toBe('nosniff');expect(response.headers()['permissions-policy']).toContain('camera=()');
 const manifest=await (await request.get('/manifest.webmanifest')).json();expect(manifest.display).toBe('standalone');expect(manifest.icons).toHaveLength(4);expect(manifest.shortcuts).toHaveLength(2);
 const sw=await request.get('/sw.js');expect(sw.ok()).toBe(true);expect(await sw.text()).not.toContain('navigateFallback');
});
test('installs the service worker and serves the explicit offline fallback',async({page,context})=>{
 await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);await context.setOffline(true);await page.goto('/?offline=1');await expect(page.getByRole('heading',{name:'REVEL / Offline'})).toBeVisible();await context.setOffline(false);
});
test('meets Chromium installability requirements',async({page})=>{
 await page.goto('/');await page.evaluate(()=>navigator.serviceWorker.ready);const session=await page.context().newCDPSession(page);const result=await session.send('Page.getInstallabilityErrors');expect(result.installabilityErrors).toEqual([]);await session.detach();
});
