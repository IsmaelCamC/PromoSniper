import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

import { generateFromSeeds } from './src/generator.js';
import { ScraperEngine } from './src/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.join(__dirname, 'config');
const CODES_FILE = path.join(__dirname, 'codes.txt');
const RESULTS_FILE = path.join(__dirname, 'results.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log('==============================================');
  console.log('🔥 PromoSniper - Universal Checkout Attacker 🔥');
  console.log('==============================================\n');

  // Funcionalidad --reset
  if (process.argv.includes('--reset')) {
    if (fs.existsSync(RESULTS_FILE)) {
      fs.unlinkSync(RESULTS_FILE);
      console.log('✅ Historial de resultados (results.json) reiniciado desde cero.');
    } else {
      console.log('⚠️ No había historial previo para limpiar.');
    }
  }

  // Detectar perfil
  const profiles = fs.readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json'));
  if (profiles.length === 0) {
    console.error('❌ No se encontraron perfiles en la carpeta /config');
    process.exit(1);
  }

  // Para poder usarlo automáticamente como antes sin presionar Enter, usar arg --auto-rayban temporal
  const selectedProfile = profiles[0]; // Carga automatica del primero para agilizar
  const profilePath = path.join(CONFIG_DIR, selectedProfile);
  const config = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));

  console.log(`✅ Perfil activo: ${config.name}`);

  let codesToTest = [];

  // Checar si ya hay códigos pre-generados
  let preGeneratedCodes = [];
  if (fs.existsSync(CODES_FILE)) {
    preGeneratedCodes = fs.readFileSync(CODES_FILE, 'utf-8').split('\n').map(c => c.trim()).filter(Boolean);
  }

  if (preGeneratedCodes.length > 0) {
    console.log(`\n📄 Se encontraron ${preGeneratedCodes.length} códigos en 'codes.txt'.`);
    const useExisting = await askQuestion('¿Quieres usar estos códigos automáticamente? (Y/n): ');
    
    if (useExisting.toLowerCase() !== 'n') {
      codesToTest = preGeneratedCodes;
    }
  }

  if (codesToTest.length === 0) {
    const seedsInput = await askQuestion('\nIngresa los códigos o semillas válidas (separados por coma):\n> ');
    if (!seedsInput.trim()) {
      console.error('❌ Debes proveer al menos una semilla.');
      process.exit(1);
    }
    console.log('\n⚙️ Generando malla de variaciones automáticas...');
    
    // Pasamos el generadorConfig si existe en el JSON
    codesToTest = generateFromSeeds(seedsInput, config.generatorConfig || {});
    
    fs.writeFileSync(CODES_FILE, codesToTest.join('\n'), 'utf-8');
    console.log(`   Se generaron ${codesToTest.length} códigos mutados y se guardaron en codes.txt\n`);
  }

  // Preguntar modo Headless (por si se le fue un --headless flag)
  let headless = false;
  if (!process.argv.includes('--headless')) {
    const headlessAns = await askQuestion('\n¿Ejecutar en modo invisible (headless)? Tienes que logearte tú (y/N): ');
    headless = headlessAns.toLowerCase() === 'y';
  } else {
    headless = true;
  }

  rl.close();

  // Instanciar motor y ejecutar
  const engine = new ScraperEngine(config, __dirname, headless);
  await engine.run(codesToTest);
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err);
  process.exit(1);
});
