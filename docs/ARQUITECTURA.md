# Arquitectura de Mac desgloses

## Decisiones principales

La app usa Expo SDK 56, React Native, TypeScript estricto y Expo Router. SQLite es la
fuente local de verdad en Android/iOS; web y desktop web usan localStorage. La interfaz
no ejecuta SQL ni depende de un motor concreto: llama casos de uso y repositorios
mediante interfaces.

El diseño está preparado para introducir sincronización después: un repositorio remoto
puede implementarse sin cambiar los modelos ni los cálculos.

## Capas

### Dominio

`src/domain/models.ts` define Cliente, Proyecto, Cotización, Ítem, Sistema,
materiales, cortes, barras, empresa y configuración. No depende de React ni SQLite.

`src/domain/calculations/` contiene funciones puras:

- `systemRegistry.ts`: registro y reglas de cada sistema.
- `pricing.ts`: costos, margen, impuesto y totales.
- `cutOptimizer.ts`: distribución de piezas en barras.
- `glassOptimizer.ts`: empaquetado 2D, rotación y comparación de planchas
  de 130×84 y 96×72 pulgadas.

### Aplicación

`src/application/quoteFactory.ts` coordina el cálculo de una abertura y la creación
de una cotización. Genera identificadores y conserva una copia de los precios usados,
para que una cotización histórica no cambie al editar la configuración.

### Infraestructura

`src/infrastructure/storage/` define el contrato compartido y selecciona el adaptador
por plataforma. `StorageProvider.tsx` conserva SQLite, migraciones y transacciones en
Android/iOS. `StorageProvider.web.tsx` persiste cotizaciones y ajustes en localStorage
sin incluir `expo-sqlite` en el bundle web.

`src/infrastructure/database.ts` crea el esquema SQLite y maneja su versión.
`quoteRepository.ts` implementa la persistencia SQLite de cotizaciones y
`settingsRepository.ts` guarda datos de empresa y precios en móvil.

El JSON completo de cada cotización se conserva como una instantánea. En SQLite se
acompaña con columnas indexadas para búsqueda; en web se almacena con el texto de
búsqueda en un registro versionado de localStorage. Esta decisión acelera el MVP;
antes de una sincronización multiusuario conviene normalizar ítems y materiales o
incorporar un registro de cambios.

### Presentación

`src/app/` contiene las rutas:

- `/`: tablero, búsqueda e historial.
- `/quotes/new`: cliente, proyecto, abertura, cálculo y guardado.
- `/quotes/[id]`: desglose, barras, costos y resumen.
- `/settings`: empresa, moneda, precios e impuestos.

`src/presentation/` contiene componentes, tema y estado compartido.

## Flujo implementado

1. El usuario completa cliente/proyecto.
2. Selecciona sistema, hojas, ancho, alto y cantidad.
3. `createQuoteItem` consulta el registro de sistemas.
4. La regla devuelve cortes, perfiles, cristal y accesorios.
5. `calculatePrice` aplica los precios configurados.
6. Al guardar, `createQuote` consolida transporte, margen, impuesto y total.
7. El repositorio guarda la cotización en el adaptador activo; en móvil también guarda
   el cliente y usa una transacción SQLite.
8. La pantalla de resumen agrupa cortes por referencia y optimiza cada grupo.
9. El optimizador ubica los cristales en ambos tamaños de plancha y dibuja un
   croquis proporcional de cada opción.

Los consumos de goma, ruedas, cierre, kits de guías, felpa, tornillos y tarugos
se capturan por unidad y se multiplican por la cantidad del ítem. Esta captura
manual es intencional hasta recibir reglas técnicas validadas por sistema.

## Fórmulas de sistemas

La función `demoBreakdown` es deliberadamente genérica. Solo demuestra contratos de
datos y flujo visual. Para un sistema real debe definirse, como mínimo:

- referencias exactas de marco, hoja, interlock, junquillo y refuerzos;
- descuentos por ancho, alto, hojas y tipo de encuentro;
- cantidad y dimensiones reales de cristales;
- reglas para rieles, tapas, felpas, gomas, rodamientos, cierres y tornillos;
- restricciones de tamaño y avisos técnicos;
- merma de sierra y tolerancias;
- pruebas aprobadas por una persona responsable de producción.

Ejemplo conceptual:

```ts
function calculateP65(input: OpeningInput): MaterialBreakdown {
  // Aplicar aquí únicamente fórmulas P-65 validadas.
  return {
    cuts: [],
    materials: [],
    glass: [],
    estimatedWastePercent: 0,
  };
}
```

Luego se asigna en `SYSTEM_REGISTRY`:

```ts
"P-65": {
  id: "P-65",
  name: "P-65",
  formulaVersion: "p65-1.0",
  configured: true,
  calculate: calculateP65,
}
```

Las reglas reales deberían separarse en un archivo por sistema cuando sean entregadas.

## Optimización

La implementación actual usa First Fit Decreasing y agrupa barras por código de
perfil. Es una heurística apropiada para respuesta inmediata, no una garantía del
óptimo matemático. La versión 1.0 debe añadir:

- ancho de corte de la sierra;
- inventario de sobrantes reutilizables;
- dirección/acabado de perfiles;
- límites de empalme;
- comparación con un solver exacto para trabajos grandes;
- reporte imprimible por lote.

El croquis de cristal usa una heurística bidimensional de mejor área con cortes
guillotina y permite rotar piezas. Compara el área total comprada y el porcentaje
de sobrante. Antes de producción debe incorporar espesor de corte, restricciones
por veta/textura y márgenes perimetrales del proveedor.

## Pendiente para versión 1.0

Prioridad alta:

- fórmulas reales y pruebas de los siete sistemas;
- CRUD independiente de clientes y proyectos;
- editar y duplicar cotizaciones;
- catálogo de materiales con precio por referencia y proveedor;
- PDF con logo, condiciones y numeración configurable;
- Excel con resumen y hoja de cortes;
- compartir mediante WhatsApp, correo y sistema operativo;
- reglas automáticas validadas de accesorios por sistema;
- validaciones técnicas y respaldo/restauración local.

Calidad y lanzamiento:

- pruebas de integración de SQLite y navegación;
- migraciones incrementales con datos reales;
- accesibilidad y pruebas en teléfonos/tabletas;
- manejo de moneda, redondeo y unidades configurable;
- cifrado o protección de datos sensibles;
- icono, splash, permisos, política de privacidad y builds firmados;
- estrategia de sincronización, conflictos, autenticación y auditoría.

## Esquema local

- `clients`: datos básicos del cliente.
- `projects`: preparado para CRUD de proyectos.
- `quotes`: metadatos indexados e instantánea JSON.
- `settings`: configuración serializada y versionable.

La base activa WAL y claves foráneas. `PRAGMA user_version` controla futuras
migraciones.
