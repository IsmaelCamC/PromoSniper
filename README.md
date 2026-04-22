# PromoSniper

PromoSniper es un framework CLI basado en Node.js y Playwright para automatizar la inserción y comprobación masiva de códigos promocionales en sitios de e-commerce.

Está diseñado para evadir protecciones anti-bot de grado empresarial (como Akamai o Cloudflare) utilizando perfiles persistentes de Google Chrome y el plugin Stealth de Puppeteer Extra.

## Requisitos

- Node.js v18+
- Google Chrome instalado localmente
- Dependencias manejadas por npm o yarn

## Instalación

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```

## Especificaciones de Uso

El flujo de trabajo estándar permite ingresar códigos pre-conocidos ("semillas"), los cuales el sistema muta y multiplica para crear combinaciones probables, iterando automáticamente sobre la caja de texto del carrito del portal objetivo.

Para iniciar:
```bash
node index.js
```

### Argumentos CLI

- `--reset`: Elimina el historial previo guardado en `results.json` para empezar las iteraciones de cero.
- `--headless`: Ejecuta la instancia del navegador en segundo plano. (Nota: No usar si el sitio requiere resolver Captchas o inicios de sesión manuales al empezar).

Al ejecutarse de manera no oculta, la consola otorgará un tiempo de espera (configurable localmente) para proceder al inicio de sesión manual en la ventana generada. Al concluir el tiempo, el motor asume el control del DOM.

## Configuración de Perfiles (Targeting)

PromoSniper es agnóstico y dinámico. Para aplicar el scraper a nuevos sitios (como Nike, Amazon, etc.), no es necesario modificar la lógica del código fuente. 

Crea un nuevo archivo JSON dentro de la ruta `config/` copiando la estructura de ejemplo:

```json
{
  "name": "Target Store",
  "url": "https://www.target-store.com/cart",
  "generatorConfig": {
    "varySuffixRange": [0, 99],
    "yearsToInject": ["24", "25", "26", "27"],
    "regions": ["MX", "US"]
  },
  "selectors": {
    "promoLink": "#link-open-promo",
    "input": "#promo-input-field",
    "applyBtn": ".apply-code-btn",
    "success": [".success-message"],
    "error": [".error-message", ".invalid-coupon"],
    "removeBtn": ".remove-promo-button",
    "cartReadyIdentifier": ".apply-code-btn"
  },
  "settings": {
    "loginWaitMs": 60000,
    "minDelayMs": 3000,
    "maxDelayMs": 7000
  }
}
```

### Parámetros Relevantes

- **generatorConfig:** Define las reglas de mutación de semillas en `src/generator.js`.
- **selectors:** Referencias CSS directas para la inyección de eventos por parte de Playwright. Soportan selectores únicos y arreglos de selectores para validaciones con respuestas variantes (existen múltiples tipos de errores).
- **settings:** Declara los retrasos (en milisegundos) entre inyecciones para simular actividad humana realista.

## Almacenamiento Local

PromoSniper almacena elementos pesados en disco que están configurados en `.gitignore` de manera predeterminada para evitar la fuga de datos sensibles:

- `chrome_profile/`: Variables de navegador, caché de renderizado y autenticaciones persistentes.
- `codes.txt`: Lista plana de la matriz de ataque activa generada por las semillas.
- `results.json`: Historial de comprobación y extracciones de descuentos exitosos. El motor leerá este archivo al inicializarse para omitir redundancias.
