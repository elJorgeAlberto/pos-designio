# Sistema de Diseño — POS Designio
Reemplaza/extiende `docs/ARCHITECTURE.md §10`. Es la fuente única de verdad
de UI/UX. No se negocia por pantalla — aplica siempre, sin excepción,
salvo que este documento se actualice.

---

## 0. Contexto de plataforma — leer esto primero

**Este es un producto mobile-first que hoy vive como sitio web y mañana
será una app móvil nativa (o empaquetada).** No es "un sitio web
responsivo que también funciona en celular" — es una app que, por ahora,
se distribuye vía navegador. La diferencia importa para cada decisión de
implementación:

- **Navegación**: nada de navbar superior con links tipo sitio web. La
  navegación vive en un shell de app persistente (tab bar inferior y/o
  FAB de acciones rápidas). Los cambios de pantalla son transiciones de
  estado dentro de la SPA (React Router en modo memoria/estado, no
  recargas de página), nunca dependen del historial del navegador.
- **Interacción**: cero patrones que asuman mouse/hover como único
  disparador. Todo lo que reacciona a `:hover` debe tener un equivalente
  funcional en `:active`/tap. Si un flujo solo tiene sentido con hover
  (tooltips, menús flotantes), siempre necesita un fallback táctil
  explícito (ver §7, tooltips).
- **Densidad**: diseña primero la versión de celular (una columna, todo
  apilado, controles grandes). Tablet/desktop son una *expansión* del
  mismo layout (más columnas, más contexto visible a la vez), nunca un
  diseño aparte que se comprime hacia abajo para mobile.
- **Persistencia de contexto**: como eventualmente esto corre como app
  (sin barra de navegador visible), asume que el usuario nunca ve la URL
  ni usa el botón "atrás" del navegador como mecanismo de navegación
  principal — todo control de "regresar" es explícito y visible en la UI
  (botón, no gesto del sistema operativo del que dependamos).
- Cuando un componente de shadcn tenga variante "desktop" y variante
  "móvil" implícitas (ej. `Dialog` vs `Drawer`/`Sheet`), **por defecto usa
  la variante de app móvil** (`Sheet` que sube desde abajo) y solo cae a
  `Dialog` centrado en breakpoints de escritorio si aporta algo real.

Si en algún punto una implementación se siente "como una página web con
un formulario", está mal — no es la vara. La vara es "se siente como una
app que instalarías".

---

## 1. Tipografía

Variables (Tailwind, ya definidas en el tema):
```css
--font-display: 'Handjet', ui-sans-serif, system-ui, sans-serif;
--font-heading: 'Stack Sans Headline', ui-sans-serif, system-ui, sans-serif;
--font-sans: 'Chivo Mono', ui-monospace, monospace;
--font-mono: 'Chivo Mono', ui-monospace, monospace;
```
Auto-hospedadas vía `@fontsource` (Handjet, Chivo Mono) y
`@fontsource-variable/stack-sans-headline` — nunca cargar desde el CDN de
Google en producción.

**Escala tipográfica fija** (no improvisar tamaños por pantalla):

| Nivel | Fuente | Tamaño | Peso | Uso |
|---|---|---|---|---|
| H0 | Handjet | `clamp(48px, 14vw, 96px)` | 700 | Splash, anuncios, **total de venta en pantalla de cobro** |
| H1 | Stack Sans Headline | 28px | 700 | Título de pantalla/módulo |
| H2 | Stack Sans Headline | 24px | 700 | Sección dentro de una pantalla |
| H3 | Stack Sans Headline | 20px | 600 | Subsección, título de card |
| H4 | Stack Sans Headline | 17px | 600 | Encabezado de lista/tabla |
| H5 | Stack Sans Headline | 15px | 600 | Etiqueta destacada, metadata importante |
| Body | Chivo Mono | 15px | 400 | Texto general, formularios |
| Dense/tabla | Chivo Mono | 13px | 400 | Tablas de montos, líneas de ticket (aprovecha la alineación monoespaciada) |
| Caption | Chivo Mono | 12px | 400 | Ayudas, timestamps, texto secundario |

`line-height`: 1.6 en Body/Caption (Chivo Mono se ve apretada por defecto),
1.2 en H0–H3, 1.35 en H4–H5.

`letter-spacing`: en Body, `-0.01em` ayuda a compensar el ancho extra de
la monoespaciada en pantallas chicas — no lo dejes en 0 por default.

---

## 2. Paleta de color

Contraste verificado contra WCAG AA:

| Nombre | Hex | Rol | Texto encima |
|---|---|---|---|
| Azafrán | `#f07f2b` | Primary (dominante) | Graphite (6.5:1) — **nunca blanco** (2.7:1, insuficiente) |
| Terracota | `#a65226` | Secondary / hover-pressed | Blanco/Refract (5.45:1) |
| Cobre | `#331a00` | Accent orange | — |
| Mossdeep | `#0d2827` | Accent green | — |
| Tealix | `#035147` | Success | Blanco (9.25:1) |
| Celadon | `#a4dcb5` | Highlight green | Graphite |
| Error Red | `#e74c3c` | Destructive | Blanco solo en texto grande/negrita (3.82:1) — evitar en texto pequeño, ahí usar Error Red como color de texto sobre fondo claro |
| Graphite | `#191919` | Foreground / off-black | — |
| Smoke | `#a9a9a9` | Muted | — |
| Steel | `#c5c5c5` | Border/input | — |
| Refract | `#f6f5fc` | Background / off-white | — |

Mapeo a variables del tema (usar **siempre** el nombre semántico —
`bg-primary`, `text-destructive`— nunca el nombre de marca directo como
`bg-azafran` salvo en casos decorativos sin significado semántico):

```css
--background: var(--refract);      --foreground: var(--graphite);
--primary: var(--azafran);         --primary-foreground: var(--graphite);
--secondary: var(--terracota);     --secondary-foreground: var(--refract);
--muted: var(--steel);             --muted-foreground: #6b6b6b;
--accent: var(--celadon);          --accent-foreground: var(--graphite);
--success: var(--tealix);          --success-foreground: var(--refract);
--destructive: var(--error-red);   --destructive-foreground: var(--refract);
--border: var(--steel);            --input: var(--steel);
--ring: var(--azafran);
```

Regla dura: **antes de usar texto blanco sobre un fondo de color, verifica
en la tabla de arriba si el contraste lo permite.** Azafrán y Celadon
nunca llevan texto blanco.

---

## 3. Radios y geometría

`--radius: 0px`. Esquinas rectas en todo — botones, cards, inputs, sheets.
Es intencional, coherente con la estética "display digital" de Handjet.
No redondear "para que se vea más suave" — si algo se ve demasiado duro
una vez montado, se ajusta acá centralmente, nunca por componente.

---

## 4. Iconografía

`lucide-react`, estilo outline, `stroke-width` consistente (default de la
librería, no lo sobrescribas por componente). Tamaño estándar 20px en
línea con texto, 24px en botones de acción, 28px+ en el FAB.

---

## 5. Modo oscuro

No requerido en el lanzamiento. El tema ya usa variables CSS, así que se
agrega después con un bloque `.dark { ... }` sin tocar componentes. No
implementar toggle ni lógica de tema todavía — no es deuda técnica,
es alcance diferido a propósito.

---

## 6. Ergonomía móvil

- **Área táctil mínima 44×44px** en todo elemento interactivo (botones,
  ítems de lista tocables, íconos con acción). Los tamaños `sm` de shadcn
  no cumplen esto por default — verificar `min-height`/`min-width` al usarlos.
- **Safe-area insets**: aplicar en los contenedores fijos (bottom nav, FAB,
  cualquier barra pegada a un borde), no en cada elemento:
  ```css
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: env(safe-area-inset-top); /* solo en headers fijos */
  ```
- **Swipe accidental de "atrás"**:
  - `overscroll-behavior-x: none;` en `html, body`.
  - Instalar como PWA (modo `standalone`) reduce la superficie del gesto,
    sobre todo en iOS.
  - Navegación interna por estado de la app, nunca por historial del
    navegador (ver §0).
  - Si el usuario está a mitad de una venta y el sistema detecta intento
    de salir, confirmar con `AlertDialog` de shadcn antes de perder la
    captura — nunca dejarlo pasar en silencio.
- **FAB de acciones rápidas**: fijo, anclado en zona de alcance del pulgar
  (inferior derecha por default). Al tocarlo, se abre en abanico: nueva
  venta (acción primaria, visualmente más grande/prominente), entrada de
  dinero, agregar cliente, compra. No lo uses como contenedor de más de
  4-5 acciones — si crece más que eso, algunas bajan a un menú secundario.

---

## 7. Interacción y componentes

- **Cero diálogos nativos del navegador.** Nunca `alert()`, `confirm()`,
  `prompt()`. Confirmaciones bloqueantes → `AlertDialog` de shadcn.
  Notificaciones no bloqueantes (éxito, error, advertencia, info) →
  **Sileo** (`npm install sileo`) — toast físico con animación de
  resorte. `<Toaster />` vive una sola vez en `main.tsx` envolviendo toda
  la app. Validación de campo vacío: `required` nativo de HTML para
  bloquear el submit; el mensaje de error real (ej. "el servidor rechazó
  esto") sale por `sileo.error()`, nunca por texto ad-hoc inventado por
  componente.
- **Cursor**: todo elemento clickeable (`button`, `[role="button"]`)
  muestra `cursor: pointer`. Ya resuelto de forma global en `index.css`
  (`@layer base`) — no repetir por componente. (Nota: en el móvil real
  esto es cosmético/no aplica, pero mantiene consistencia cuando se prueba
  en desktop durante desarrollo.)
- **Tooltips en inputs**: todo campo de formulario lleva una explicación
  de una frase, vía el componente `FieldLabel`
  (`src/components/FieldLabel.tsx`, envolviendo `Label` + `Tooltip` de
  shadcn) en vez de `Label` a secas. Se activa con hover en
  desktop y con tap en móvil (shadcn `Tooltip` ya maneja esto si se
  configura con `delayDuration` corto y no depende solo de `:hover`).
  El texto de ayuda vive en `src/lib/field-help.ts` — es copy de UI fijo
  mantenido por el equipo, no dato de negocio ni algo editable por el
  usuario final, así que **nunca** va a la base de datos.
- **Paginación en toda tabla.** Cualquier pantalla que muestre datos en una
  `Table` de shadcn pagina a 20 filas por página — nunca una lista sin
  límite. Implementación estándar: el hook `usePagination` (`src/lib/use-pagination.ts`)
  sobre el arreglo ya filtrado/ordenado, más el componente
  `TablePagination` (`src/components/TablePagination.tsx`) debajo de la
  tabla — no se resuelve a mano por pantalla. `usePagination` acota la
  página pedida al total de páginas disponible en cada render, así que
  no hace falta un efecto aparte para resetear la página cuando cambia
  un filtro o una búsqueda.
- **Catálogo completo de shadcn, no solo `Card` + formulario plano.**
  `Sheet` para altas/ediciones (sube desde abajo, no un formulario
  siempre visible en la página — refuerza la sensación de app). `Popover`
  para selección rápida sin cambiar de pantalla (ej. elegir cliente en
  una venta, con su saldo visible ahí mismo). `Dialog` reservado para
  confirmaciones/decisiones puntuales, no para formularios largos. Cada
  pantalla nueva se piensa por el componente correcto para su
  interacción — no por default al más simple de implementar.

---

## 8. Caso especial: pantalla de Ventas

Es la pantalla que más se usa, todos los días, bajo presión de tiempo en
el mostrador. No puede verse como una lista plana ni sentirse genérica:

- Layout con jerarquía real: catálogo (búsqueda/categorías) → carrito
  (líneas de venta, edición de cantidad/peso inline) → cobro (métodos de
  pago, total en H0/Handjet).
- El total de la venta es el elemento visualmente más importante de la
  pantalla — usa H0 y color `--primary`.
- Selección de cliente para crédito: `Popover` que muestra saldo e
  historial de puntualidad al momento de elegir, sin salir de la pantalla
  de venta (ver `docs/ARCHITECTURE.md §4.5`).
- Botones de cobro grandes, con área táctil generosa — es la acción que
  más se repite en el día, no puede requerir precisión de mouse.

---

## 9. Checklist antes de dar por terminada cualquier pantalla nueva

- [ ] ¿Se probó primero en ancho de celular (375px), no en desktop?
- [ ] ¿Todo elemento interactivo cumple 44×44px mínimo?
- [ ] ¿Usa las variables semánticas de color (`bg-primary`, no
      `bg-azafran`), y el contraste de texto/fondo respeta §2?
- [ ] ¿Los tamaños de texto salen de la escala fija de §1, sin números
      inventados?
- [ ] ¿Cero `alert/confirm/prompt` nativos?
- [ ] ¿Cada campo de formulario tiene su `FieldLabel` con tooltip?
- [ ] ¿La navegación dentro de la pantalla no depende del botón "atrás"
      del navegador?
- [ ] ¿Se ve como una app, o se ve como una página web con un formulario
      encima? Si es lo segundo, no está terminada.
