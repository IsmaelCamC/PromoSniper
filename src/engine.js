import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';

chromium.use(stealth());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class ScraperEngine {
  constructor(configObj, baseDir, headless = process.env.HEADLESS === 'true') {
    this.config = configObj;
    this.baseDir = baseDir;
    this.headless = headless;
    this.resultsFile = path.join(this.baseDir, 'results.json');
    this.profileDir = path.join(this.baseDir, 'chrome_profile');
  }

  saveResults(results) {
    let existing = [];
    if (fs.existsSync(this.resultsFile)) {
      try { existing = JSON.parse(fs.readFileSync(this.resultsFile, 'utf-8')); } catch(e){}
    }
    const resultMap = new Map(existing.map(r => [r.code, r]));
    results.forEach(r => resultMap.set(r.code, r));
    fs.writeFileSync(this.resultsFile, JSON.stringify(Array.from(resultMap.values()), null, 2), 'utf-8');
  }

  getUntestedCodes(allCodes) {
    let tested = new Set();
    if (fs.existsSync(this.resultsFile)) {
      try {
        const historic = JSON.parse(fs.readFileSync(this.resultsFile, 'utf-8'));
        historic.forEach(r => { if (r.status !== 'ERROR' && r.status !== 'DESCONOCIDO') tested.add(r.code); });
      } catch(e){}
    }
    return allCodes.filter(c => !tested.has(c));
  }

  async run(allCodes) {
    const codes = this.getUntestedCodes(allCodes);
    console.log(`\n🎯 Iniciando PromoSniper en [${this.config.name}]`);
    console.log(`   Se probarán ${codes.length} códigos nuevos (omitidos ${allCodes.length - codes.length} ya testeados).`);

    if (codes.length === 0) {
      console.log('✅ Nada que hacer.');
      return;
    }

    const maxWait = this.config.settings.loginWaitMs || 60000;
    console.log(`\n⚠️ IMPORTANTE: Se abrirá ${this.config.name}.`);
    console.log(`   Tienes ${maxWait/1000} segundos para INICIAR SESIÓN y agregar algo al carrito.\n`);

    const context = await chromium.launchPersistentContext(
      this.profileDir,
      {
        headless: this.headless,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        viewport: { width: 1280, height: 900 },
        locale: 'es-MX',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    );
    
    // Si la ruta falló en Windows/Linux, playwright usará fallback o crasheará, pero pedimos explícitamente el Mac.
    // Ideally en un framework cross-platform quitaríamos executablePath o lo pondríamos opcional, pero para este caso se deja para evadir a Akamai en Mac.
    
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    const results = [];
    const SEL = this.config.selectors;

    try {
      console.log('🌐  Navegando a la URL destino...');
      await page.goto(this.config.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Esperar a que el usuario haga setup del carrito
      try {
        await page.waitForSelector(SEL.cartReadyIdentifier || SEL.applyBtn, { timeout: maxWait });
        console.log('✅  Condiciones del carrito detectadas satisfactoriamente.');
      } catch (err) {
        console.log(`\n❌  Tiempo de espera agotado o botón de aplicar no encontrado. Revisar login.`);
        await context.close();
        return;
      }

      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        console.log(`[${i + 1}/${codes.length}]`, '─'.repeat(40));

        try {
          const result = await this.testSingleCode(page, code, SEL);
          results.push(result);
          if (i % 10 === 0) this.saveResults(results);
        } catch (err) {
          console.error(`❌  Fallo al probar el código ${code}:`, err.message);
          results.push({ code, status: 'ERROR', timestamp: new Date().toISOString() });
          console.log('⚠️  Pausando 30 segundos (Evasión de Block/Captcha)...');
          await sleep(30000);
          try {
             await page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
             await page.waitForSelector(SEL.cartReadyIdentifier || SEL.applyBtn, { timeout: 15000 });
          } catch(e){}
        }

        if (i < codes.length - 1) {
          const min = this.config.settings.minDelayMs || 3000;
          const max = this.config.settings.maxDelayMs || 7000;
          const dyn = Math.floor(Math.random() * (max - min + 1)) + min;
          await sleep(dyn);
        }
      }
    } finally {
      this.saveResults(results);
      await context.close();
      console.log('🏁 Ejecución finalizada.');
    }
  }

  async testSingleCode(page, code, SEL) {
    console.log(`🔍  Probando: ${code}`);

    // Asegurar que la sección esté visible
    if(SEL.promoLink) {
        try {
            const isVisible = await page.isVisible(SEL.input);
            if (!isVisible) {
              await page.click(SEL.promoLink);
              await page.waitForSelector(SEL.input, { state: 'visible', timeout: 5000 });
            }
        } catch(e) {}
    }

    // IMPORTANTÍSIMO: Asegurarnos de limpiar cualquier promoción previamente validada antes de intentar
    if(SEL.removeBtn) {
        try {
            await page.evaluate((selector) => {
                const removeBtn = document.querySelector(selector);
                if (removeBtn) removeBtn.click();
            }, SEL.removeBtn);
            await sleep(1500); // Darle tiempo al frontend de procesar el click de remover
        } catch(e){}
    }

    await page.fill(SEL.input, '');
    await page.fill(SEL.input, code);
    await sleep(300);

    // Capturar petición
    let promoRequest = null;
    page.once('request', (req) => {
       if (req.url().toLowerCase().includes('promo') || req.url().toLowerCase().includes('coupon')) {
         promoRequest = { url: req.url() };
       }
    });

    await page.click(SEL.applyBtn);

    let status = 'DESCONOCIDO';
    let discountInfo = null;

    try {
      const waitPromises = [];
      const successes = Array.isArray(SEL.success) ? SEL.success : [SEL.success];
      const errors = Array.isArray(SEL.error) ? SEL.error : [SEL.error];

      successes.forEach(s => {
          if (s) waitPromises.push(page.waitForSelector(s, { state: 'visible', timeout: 10000 }).then(() => 'VÁLIDO'));
      });
      errors.forEach(e => {
          if (e) waitPromises.push(page.waitForSelector(e, { state: 'visible', timeout: 10000 }).then(() => 'INVÁLIDO'));
      });

      status = await Promise.race(waitPromises);
    } catch {
      status = 'ERROR (TIMEOUT)';
    }

    // Attempt to scrape the discount amount if valid
    if (status === 'VÁLIDO') {
        try {
            // Buscamos cualquier cosa que parezca "wcs-promotion" o similar. Si el config define un selector para esto es mejor.
            // Por defecto, si existe un selector success extraemos el texto cercano ahí.
            discountInfo = await page.evaluate(() => {
                const el = document.querySelector('.wcs-promotion_id_1.wcs-promo-color') || document.querySelector('[class*="promo"]');
                return el ? el.textContent.trim() : null;
            });
        } catch(e){}
        console.log(`   ✅  VÁLIDO !`);
    } else {
        console.log(`   ❌  ${status}`);
    }

    return { code, status, discountInfo, apiInfo: promoRequest, timestamp: new Date().toISOString() };
  }
}
