# Reglas de UI/UX — POS Designio

Reglas fijas para todo el frontend, además de lo ya definido en la
arquitectura (`docs/ARCHITECTURE.md` §10 Sistema de diseño). Esto no se
negocia por pantalla — aplica siempre.

## Notificaciones y validación

- **Nunca** usar `alert()`, `confirm()`, `prompt()` ni ningún diálogo nativo
  del navegador.
- **Nunca** validar campos vacíos con JS a mano mostrando su propio mensaje
  ad-hoc — usar el `required` nativo de HTML para bloquear el submit, y
  [Sileo](https://sileo.aaryan.design/) (`sileo.success/error/warning/info`)
  para cualquier notificación: confirmaciones de éxito, errores del
  servidor, advertencias.
- El `<Toaster />` de Sileo vive una sola vez en `main.tsx`, envolviendo
  toda la app.

## Botones

- Todo elemento clickeable (`button`, `[role="button"]`) debe mostrar
  `cursor: pointer`. Ya está resuelto de forma global en `index.css`
  (`@layer base`) — no hace falta agregarlo por componente.

## Tooltips en inputs

- Todo input de un formulario lleva un tooltip que explica, en una frase,
  de qué se trata el campo y cómo llenarlo — aparece con hover (desktop) o
  tap (mobile) sobre un ícono de información junto a la etiqueta.
- Implementación: componente `FieldLabel` (`src/components/FieldLabel.tsx`)
  envolviendo `Label` + `Tooltip` de shadcn. Se usa en vez de `Label` a
  secas en cualquier campo de formulario.
- El texto de ayuda vive en `src/lib/field-help.ts`, **no en la base de
  datos** — es copy de UI fijo, mantenido por nosotros junto al
  formulario, no datos que cambien por empresa ni que el usuario final
  edite. Meterlo en una tabla solo agregaría una vuelta de red por un
  string estático.

## Componentes

- No construir pantallas solo con `Card` + formulario plano. Usar el
  catálogo completo de shadcn donde tenga sentido — `Sheet` para
  formularios de alta/edición (en vez de dejarlos siempre visibles en la
  página), `Popover`, `Dialog`, etc. Cada pantalla nueva se piensa con el
  componente correcto para su interacción, no por default a lo más simple.
- El punto de venta (pantalla de ventas) en particular debe verse robusto
  — no una lista plana. Layout claro de catálogo/carrito/cobro, con
  jerarquía visual real.
