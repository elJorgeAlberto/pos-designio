-- Shared reference catalog, not tenant data — safe to ship in every
-- environment (dev/prod). Covers Fase 1/2 scope; extend as new modules
-- land.
insert into public.permissions (key, description) values
  ('sales.create', 'Registrar una venta'),
  ('sales.void', 'Cancelar o devolver una venta'),
  ('sales.discount', 'Aplicar descuentos en una venta'),
  ('inventory.view', 'Ver existencias de inventario'),
  ('inventory.edit', 'Editar productos'),
  ('inventory.adjust', 'Hacer ajustes manuales de inventario'),
  ('clients.view', 'Ver clientes y su saldo'),
  ('clients.create', 'Dar de alta clientes'),
  ('clients.edit', 'Editar datos de clientes'),
  ('credit.collect', 'Registrar cobros a cuenta de clientes'),
  ('suppliers.edit', 'Dar de alta o editar proveedores'),
  ('purchases.create', 'Registrar compras a proveedores'),
  ('expenses.create', 'Registrar gastos'),
  ('cash_register.open', 'Abrir caja'),
  ('cash_register.close', 'Hacer corte de caja'),
  ('reports.view', 'Ver reportes y métricas'),
  ('reports.export', 'Exportar reportes'),
  ('users.manage', 'Administrar usuarios de la empresa'),
  ('roles.manage', 'Administrar roles y permisos'),
  ('branches.manage', 'Administrar sucursales y cajas');
