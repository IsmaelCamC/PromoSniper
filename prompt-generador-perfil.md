Actúa como un experto en web scraping y automatización con Playwright.
A continuación te proporcionaré el código fuente HTML de la página de "Checkout/Carrito" de una tienda en línea. 
Tu tarea es analizar ese HTML y extraer los Selectores CSS precisos para interactuar con la funcionalidad de "Códigos de Promoción", devolviendo ÚNICAMENTE un archivo JSON formateado con la siguiente estructura exacta:

{
  "name": "[INSERTA EL NOMBRE DE LA TIENDA]",
  "url": "[INSERTA LA URL APROXIMADA DE CHECKOUT/CARRITO SEGÚN EL HTML]",
  "generatorConfig": {
    "varySuffixRange": [0, 99],
    "yearsToInject": ["24", "25", "26", "27"],
    "regions": ["MX", "US"]
  },
  "selectors": {
    "promoLink": "[Selector CSS para el botón o link que despliega la caja del cupón, si existe. Si la caja ya está visible siempre, pon null]",
    "input": "[Selector CSS exacto del campo de texto (input) donde se teclea el cupón]",
    "applyBtn": "[Selector CSS del botón para aplicar el cupón]",
    "success": ["[Selector CSS del elemento verde o mensaje que confirme el éxito del cupón. Trata de adivinar cómo se llamaría la clase o div]"],
    "error": ["[Selector CSS del elemento de error o texto rojo si el cupón falla]"],
    "removeBtn": "[Selector CSS del botón o tache(x) para eliminar un cupón aplicado. Si no es obvio, pon null]",
    "cartReadyIdentifier": "[El Selector CSS del applyBtn u otro elemento vital que me garantice que el carrito ya cargó y está listo]"
  },
  "settings": {
    "loginWaitMs": 60000,
    "minDelayMs": 3000,
    "maxDelayMs": 7000
  }
}

REGLAS CRÍTICAS:
1. Usa preferentemente selectores que tengan "id" (`#id`). Si no hay, usa "clases" únicas (`.clase`) o atributos(`[name="cupon"]`).
2. Para "success" y "error", si el HTML de esos mensajes no está visible actualmente en el código fuente porque están inyectados por JavaScript, intenta deducir las clases probables basándote en la nomenclatura del sitio (ej. `.promo-success`, `.alert-error`) o usa selectores amplios.
3. El resultado debe ser EXCLUSIVAMENTE el código JSON. No agregues saludos, ni explicaciones, ni Markdown extra fuera del bloque.

Aquí está el código HTML de la tienda:
[PEGA_TU_HTML_AQUI]
