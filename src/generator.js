export function generateFromSeeds(seedsInput, generatorConfig = {}) {
  const seeds = seedsInput.split(',').map(s => s.trim()).filter(Boolean);
  const generatedCodes = new Set();
  const pad = (num) => num.toString().padStart(2, '0');

  // Valores default de fallback
  const suffixMin = generatorConfig.varySuffixRange ? generatorConfig.varySuffixRange[0] : 0;
  const suffixMax = generatorConfig.varySuffixRange ? generatorConfig.varySuffixRange[1] : 99;
  const yearsConfig = generatorConfig.yearsToInject || ['24', '25', '26', '27'];
  const regionsConfig = generatorConfig.regions || ['MX', 'ES', 'US', 'UK'];

  seeds.forEach(seed => {
    generatedCodes.add(seed);

    // Estrategia 1: Si hay un número al final (ej. NL-CUW26-04), variar dentro del rango (ej. 00 a 99)
    const endMatch = seed.match(/(\D+)(\d{1,3})$/);
    if (endMatch) {
      const prefix = endMatch[1];
      for (let i = suffixMin; i <= suffixMax; i++) {
        generatedCodes.add(`${prefix}${pad(i)}`);
      }
    }

    // Estrategia 2: Identificar secuencias de Año y mutarlas según la configuración
    yearsConfig.forEach(year => {
      const yearMuted = seed.replace(/(23|24|25|26|27)/g, year);
      if (yearMuted !== seed) {
        generatedCodes.add(yearMuted);
        
        const endYearMatch = yearMuted.match(/(\D+)(\d{1,3})$/);
        if (endYearMatch && generatorConfig.varySuffixRange) {
          const pre = endYearMatch[1];
          for (let i = suffixMin; i <= suffixMax; i++) {
            generatedCodes.add(`${pre}${pad(i)}`);
          }
        }
      }
    });

    // Estrategia 3: Agregado geográfico configurado
    if (regionsConfig && regionsConfig.length > 0) {
      regionsConfig.forEach(region => {
        generatedCodes.add(`${seed}-${region}`);
        generatedCodes.add(`${seed}${region}`);
      });
    }
  });

  return Array.from(generatedCodes);
}
