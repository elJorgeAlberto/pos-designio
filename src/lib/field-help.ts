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
    creditLimit: 'Opcional. El máximo que le vas a dejar deber a este cliente al mismo tiempo — solo de referencia, no bloquea la venta todavía.',
    address: 'La dirección tal como te la da el cliente — es independiente del pin del mapa, escríbela aunque ya hayas capturado la ubicación.',
    location: 'Usa el botón para guardar la ubicación exacta desde donde estás parado (ideal: en el domicilio del cliente).',
  },
  collections: {
    sale: 'A cuál venta a crédito de este cliente le estás aplicando el pago.',
    amount: 'Cuánto está pagando el cliente ahora — puede ser un abono parcial, no hace falta que liquide todo.',
  },
  salesClient: {
    client: 'Opcional. Solo hace falta si vas a cobrar una parte de esta venta a crédito.',
    commitmentDate: 'La fecha en la que el cliente se compromete a pagar este crédito.',
  },
  ticketSettings: {
    logo: 'El logo que aparece arriba del ticket. Se recomienda una imagen cuadrada.',
    message: 'Texto que aparece al final del ticket — un agradecimiento, tus condiciones de crédito, lo que quieras.',
  },
} as const
