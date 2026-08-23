// Static help copy for form fields, shown via FieldLabel's tooltip.
// Lives in code (not a DB table) — it's UI copy tied 1:1 to a specific
// input in a specific form, not data that varies per company or that
// anyone edits at runtime.
export const fieldHelp = {
  login: {
    email: 'El correo con el que se creó tu usuario. Pregunta a tu administrador si no lo tienes.',
    password: 'Tu contraseña. Si la olvidaste, pide a tu administrador que te cree una nueva.',
  },
  products: {
    name: 'El nombre con el que se va a mostrar el producto en el punto de venta y en el ticket.',
    saleType:
      'Por pieza: se vende en unidades enteras (ej. 3 refrescos). Por peso: se vende en kilos o gramos (ej. 1.350 kg de pollo).',
    unit: 'La unidad en la que se mide este producto, ej. "pz" para pieza o "kg" para peso.',
    barcode: 'Opcional. Si el producto trae código de barras, captúralo aquí para poder escanearlo después.',
    cost: 'Lo que te cuesta a ti conseguir o producir una unidad — se usa para calcular la utilidad.',
    price: 'El precio al que se le vende al cliente.',
    initialStock: 'Cuánto tienes en existencia ahora mismo. Se puede dejar en 0 y ajustar después.',
    description: 'Opcional. Detalles adicionales del producto, visibles solo en el catálogo interno.',
    brand: 'Opcional. La marca del producto, si aplica.',
    sku: 'Opcional. Tu propio código interno para identificar el producto, distinto del código de barras.',
    minStock: 'Opcional. Cuando la existencia caiga por debajo de este número, el producto se marca en el catálogo.',
    category: 'Ubica el producto dentro de tu propia organización — categoría, sección, familia, subfamilia. Ninguno de los niveles es obligatorio, detente donde te sea útil.',
    images: 'Fotos del producto. Puedes tomarlas con la cámara del celular o elegir de tu galería. La marcada con estrella es la principal.',
    stockBranch: 'La sucursal en la que se está ajustando la existencia.',
    stockDelta: 'Positivo si entra mercancía (ej. conteo encontró más), negativo si sale (ej. merma o producto dañado).',
    stockReason: 'Por qué se está ajustando la existencia — te ayuda a ti mismo a recordarlo después.',
  },
  sales: {
    quantity: 'Cuánto está llevando el cliente de este producto — piezas o kilos, según el producto.',
    paymentMethod: 'Cómo está pagando el cliente esta parte del total.',
    paymentAmount: 'El monto que cubre este método de pago. Puedes dividir el total entre varios métodos.',
    discount: 'Cuánto le vas a rebajar al total de esta venta. Se descuenta del total antes de cobrar.',
  },
  cashRegister: {
    openingAmount: 'El efectivo con el que arranca la caja — el fondo que dejas antes de la primera venta del turno.',
    countedAmount: 'Cuenta el efectivo físico que hay en la caja ahora mismo y captúralo aquí, tal cual, sin ajustarlo.',
  },
  clients: {
    name: 'El nombre con el que vas a identificar a este cliente.',
    phone: 'Opcional. Para contactarlo por llamada o WhatsApp.',
    creditLimit: 'Opcional. El máximo que le vas a dejar deber a este cliente al mismo tiempo — solo de referencia, no bloquea la venta todavía.',
    address: 'La dirección tal como te la da el cliente — es independiente del pin del mapa, escríbela aunque ya hayas capturado la ubicación.',
    location: 'Usa el botón para guardar la ubicación exacta desde donde estás parado (ideal: en el domicilio del cliente).',
  },
  collections: {
    sale: 'A cuál venta a crédito de este cliente le estás aplicando el pago.',
    amount: 'Cuánto está pagando el cliente ahora — puede ser un abono parcial, no hace falta que liquide todo.',
    paymentMethod: 'Cómo te está pagando este abono.',
    newDueDate: 'La nueva fecha en la que el cliente se compromete a pagar lo que quedó pendiente.',
  },
  organizations: {
    legalName: 'La razón social tal como aparece en su constancia fiscal — se usa para facturar.',
    tradeName: 'Opcional. El nombre con el que se le conoce en el día a día, si es distinto de la razón social.',
    taxId: 'Opcional. El RFC de la empresa, necesario para poder facturarle.',
    taxRegime: 'Opcional. Su régimen fiscal — lo pide su constancia de situación fiscal. Necesario junto al RFC para timbrar la factura (CFDI 4.0).',
    postalCode: 'Opcional. El código postal de su domicilio fiscal — también lo exige la factura electrónica, y debe coincidir con el registrado ante el SAT.',
    address: 'Opcional. El domicilio fiscal o el que uses para correspondencia.',
    phone: 'Opcional. Un teléfono de contacto general de la empresa.',
    email: 'Opcional. El correo al que se le mandaría una factura.',
    contactName: 'Opcional. A quién buscar en esta empresa — quien recibe el pedido o autoriza el crédito.',
    notes: 'Opcional. Condiciones especiales, quién autoriza compras, lo que te sea útil recordar.',
    link: 'Opcional. Si este cliente pertenece a una empresa (para facturar o para agrupar varios contactos de un mismo negocio), selecciónala o crea una nueva aquí mismo.',
  },
  paymentMethods: {
    label: 'El nombre con el que va a aparecer al elegir cómo se cobró o se pagó algo.',
    countsAsCash: 'Actívalo si este medio debe sumarse al efectivo esperado del corte de caja — por ejemplo, vales que cambias por dinero en el día.',
  },
  dateRange: {
    start: 'Desde qué fecha quieres ver los movimientos.',
    end: 'Hasta qué fecha quieres ver los movimientos, incluyéndola.',
  },
  ledger: {
    client: 'Elige un cliente para ver su cuenta con saldo corrido, o "Todos" para ver los movimientos de todos mezclados (sin saldo, porque mezclar cuentas de distintos clientes no tiene sentido contable).',
  },
  legacyDebt: {
    amount: 'Cuánto te debía este cliente antes de empezar a usar el sistema.',
    dueDate: 'Opcional. Cuándo se comprometió a pagarlo.',
    note: 'De qué es esta deuda, para que quede claro de dónde salió cuando la veas después.',
  },
  salesClient: {
    client: 'Opcional. Solo hace falta si vas a cobrar una parte de esta venta a crédito.',
    commitmentDate: 'La fecha en la que el cliente se compromete a pagar este crédito.',
  },
  expenses: {
    category: 'En qué se agrupa este gasto — gasolina, renta, mantenimiento, etc. Crea las que necesites.',
    method: 'Cómo se pagó. Si es efectivo, se resta del efectivo esperado al cerrar la caja.',
    amount: 'Cuánto se gastó.',
    description: 'Opcional. Detalle breve, ej. "Gasolina camioneta de reparto".',
  },
  suppliers: {
    name: 'El nombre con el que vas a identificar a este proveedor.',
    phone: 'Opcional. Para contactarlo cuando necesites hacer un pedido.',
    notes: 'Opcional. Qué te surte, condiciones de pago, lo que te sea útil recordar.',
    paymentAmount: 'Cuánto le estás pagando ahora — puede ser un abono parcial.',
    purchaseProduct: 'Qué producto estás comprando — su existencia sube al confirmar la compra.',
    purchaseQuantity: 'Cuánto estás comprando de este producto.',
    purchaseCost: 'El costo por unidad en esta compra — actualiza el costo del producto para futuras ventas.',
  },
  ticketSettings: {
    logo: 'El logo que aparece arriba del ticket. Se recomienda una imagen cuadrada.',
    message: 'Texto que aparece al final del ticket — un agradecimiento, tus condiciones de crédito, lo que quieras.',
  },
} as const
