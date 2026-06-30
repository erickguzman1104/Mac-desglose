# Mac desgloses

Aplicación móvil offline para talleres de aluminio y vidrio. Esta base permite crear
cotizaciones, agregar ventanas con medidas, obtener un desglose demostrativo, calcular
precios, optimizar cortes y guardar el resumen localmente.

> [!WARNING]
> Las fórmulas incluidas son plantillas de demostración. No contienen descuentos,
> tolerancias, encuentros ni referencias técnicas definitivas. No deben usarse para
> fabricar hasta reemplazarlas por las fórmulas validadas de cada sistema.

## Estado actual

- Android, iOS y web mediante Expo/React Native.
- Alta de cliente y proyecto dentro de una cotización.
- Catálogo visual de 11 sistemas: Protectores Aluestrong, P-65, AA,
  M-100 con/sin tapa, Puerta Abisagrada P40, Puerta Comercial, Tradicional,
  P-92, C-70 y Ventana Abisagrada P40.
- Ventanas de 2, 3 o 4 hojas, medidas en milímetros y cantidad.
- Desglose básico de perfiles, cristales y accesorios.
- Costo directo, margen, impuesto y total.
- Optimización de barras con First Fit Decreasing.
- Comparación y croquis de corte para planchas de cristal de 130×84 y 96×72
  pulgadas, con rotación de piezas, cantidad de planchas y sobrante.
- Desglose de goma, ruedas, cierre, guías, felpa, tornillos y tarugos, con
  precios detallados configurables.
- Persistencia offline con SQLite en Android/iOS y localStorage en web/desktop.
- Búsqueda de cotizaciones y resumen detallado.
- Tema claro/oscuro automático.

## Requisitos

- Node.js 22.13 o posterior.
- npm.
- Para probar en teléfono: Expo Go compatible con SDK 56.
- Para emulador: Android Studio o Xcode (Xcode requiere macOS).

## Ejecutar

```bash
npm install
npm run start
```

Después, escanea el QR con Expo Go o presiona `a` para Android, `i` para iOS
(solo macOS) o `w` para navegador.

Si Expo informa una diferencia de versiones tras una actualización del SDK, ejecuta:

```bash
npx expo install --fix
```

Comprobaciones:

```bash
npm run typecheck
npm test
npm run doctor
```

## Estructura

```text
src/
  app/                  Rutas y pantallas (Expo Router)
  application/          Casos de uso y creación de cotizaciones
  domain/               Modelos y lógica pura de negocio
    calculations/       Sistemas, precios y optimización de cortes
  infrastructure/       Abstracción de almacenamiento y adaptadores por plataforma
  presentation/         Contexto, tema y componentes reutilizables
tests/                  Pruebas de la lógica de negocio
docs/ARQUITECTURA.md     Diseño técnico y guía de extensión
```

## Agregar o implementar un sistema

1. Abre `src/domain/calculations/systemRegistry.ts`.
2. Crea una función que reciba `OpeningInput` y devuelva `MaterialBreakdown`.
3. Registra esa función en `SYSTEM_REGISTRY` para el sistema correspondiente.
4. Cambia `configured` a `true` y asigna una versión de fórmula.
5. Agrega pruebas con medidas y resultados aprobados por el fabricante.

No mezcles fórmulas con las pantallas. Las referencias, descuentos y cantidades deben
resolverse en la función del sistema y devolverse como cortes, materiales, cristales y
desperdicio.

Consulta [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) para el diseño completo y el
trabajo pendiente de la versión 1.0.
