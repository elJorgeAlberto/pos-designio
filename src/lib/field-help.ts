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
  },
  cashRegister: {
    openingAmount: 'El efectivo con el que arranca la caja — el fondo que dejas antes de la primera venta del turno.',
    countedAmount: 'Cuenta el efectivo físico que hay en la caja ahora mismo y captúralo aquí, tal cual, sin ajustarlo.',
  },
} as const
