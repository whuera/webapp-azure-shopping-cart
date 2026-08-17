# Backend Spec — Módulo de Pedidos (Orders) con Seguimiento de Etapas

## Contexto

El CRM ya cuenta con los siguientes módulos funcionales:
- Auth, Usuarios, Productos, Clientes, Facturas/Ventas, Caja diaria, Inventario/Bodegas, Contabilidad, Activos fijos, CRM (empresas, contactos, oportunidades, tickets, cotizaciones).

Se requiere implementar un **módulo de Pedidos (Orders)** independiente que permita crear pedidos de venta, gestionar su ciclo de vida y registrar el historial completo de etapas para ofrecer seguimiento en tiempo real al equipo y al cliente.

---

## Modelo de datos

### Entidad `Order`

```
id                Long          PK, autoincrement
orderNumber       String        Único, generado automáticamente (ej. ORD-2024-00001)
customer          Customer      FK → customers.id
items             List<OrderItem>
subtotal          Decimal(12,2)
taxRate           Decimal(5,2)  Porcentaje aplicado
tax               Decimal(12,2)
total             Decimal(12,2)
status            Enum          Ver estados abajo
shippingAddress   String        Opcional
trackingCode      String        Opcional — código de guía de envío externo
carrier           String        Opcional — empresa transportista
estimatedDelivery LocalDate     Opcional
notes             String        Opcional
warehouseId       Long          FK → warehouses.id (bodega de despacho)
createdBy         String        Email/username del operador
createdAt         LocalDateTime
updatedAt         LocalDateTime
```

### Entidad `OrderItem`

```
id          Long          PK
order       Order         FK → orders.id
product     Product       FK → products.id
quantity    Integer
unitPrice   Decimal(12,2) Precio al momento de crear el pedido (snapshot)
discount    Decimal(5,2)  Porcentaje de descuento, default 0
subtotal    Decimal(12,2) quantity * unitPrice * (1 - discount/100)
```

### Entidad `OrderTracking`

Esta es la tabla central del seguimiento. Cada cambio de estado genera un registro.

```
id          Long          PK
order       Order         FK → orders.id
status      Enum          Estado al que transicionó
notes       String        Comentario del operador (opcional pero recomendado)
createdBy   String        Email/username del operador que realizó el cambio
createdAt   LocalDateTime Timestamp exacto del cambio
```

---

## Estados del pedido (Enum: `OrderStatus`)

| Valor           | Etiqueta visible      | Descripción                                      |
|-----------------|-----------------------|--------------------------------------------------|
| `PENDING`       | Pedido recibido       | Estado inicial al crear el pedido                |
| `CONFIRMED`     | Confirmado            | Pedido verificado y aceptado                     |
| `PREPARING`     | En preparación        | En bodega, armando el pedido                     |
| `DISPATCHED`    | Despachado            | Salió de la bodega                               |
| `SHIPPED`       | Enviado               | Entregado al transportista con guía              |
| `IN_TRANSIT`    | En tránsito           | En camino al destino                             |
| `DELIVERED`     | Entregado             | Confirmación de entrega al cliente               |
| `CANCELLED`     | Cancelado             | Pedido anulado                                   |
| `RETURNED`      | Devuelto              | Devolución iniciada o completada                 |

### Transiciones válidas

```
PENDING     → CONFIRMED | CANCELLED
CONFIRMED   → PREPARING | CANCELLED
PREPARING   → DISPATCHED | CANCELLED
DISPATCHED  → SHIPPED | CANCELLED
SHIPPED     → IN_TRANSIT
IN_TRANSIT  → DELIVERED | RETURNED
DELIVERED   → RETURNED
CANCELLED   → (terminal)
RETURNED    → (terminal)
```

Si se intenta una transición inválida, retornar `400 Bad Request` con mensaje descriptivo.

---

## Endpoints requeridos

### Base path: `/api/orders`

---

#### `GET /api/orders`

Lista todos los pedidos. Soporte a query params para filtrado:

| Query param  | Tipo   | Descripción                        |
|--------------|--------|------------------------------------|
| `status`     | String | Filtrar por estado                 |
| `customerId` | Long   | Filtrar por cliente                |
| `from`       | String | Fecha inicio ISO (yyyy-MM-dd)      |
| `to`         | String | Fecha fin ISO (yyyy-MM-dd)         |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderNumber": "ORD-2024-00001",
      "customer": { "id": 5, "firstName": "Ana", "lastName": "López", "email": "..." },
      "status": "IN_TRANSIT",
      "total": 150.00,
      "trackingCode": "TRK123456",
      "carrier": "Servientrega",
      "estimatedDelivery": "2024-12-20",
      "createdAt": "2024-12-15T10:30:00"
    }
  ]
}
```

---

#### `GET /api/orders/{id}`

Detalle completo de un pedido incluyendo items.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-00001",
    "customer": { ... },
    "warehouse": { "id": 2, "name": "Bodega Central" },
    "items": [
      {
        "id": 1,
        "product": { "id": 10, "name": "Laptop X1", "sku": "LPT-001" },
        "quantity": 2,
        "unitPrice": 70.00,
        "discount": 0,
        "subtotal": 140.00
      }
    ],
    "subtotal": 140.00,
    "taxRate": 7.14,
    "tax": 10.00,
    "total": 150.00,
    "status": "IN_TRANSIT",
    "shippingAddress": "Calle 123, Bogotá",
    "trackingCode": "TRK123456",
    "carrier": "Servientrega",
    "estimatedDelivery": "2024-12-20",
    "notes": "Entregar en horario de oficina",
    "createdAt": "2024-12-15T10:30:00",
    "updatedAt": "2024-12-17T14:00:00"
  }
}
```

---

#### `POST /api/orders`

Crea un nuevo pedido. El estado inicial es siempre `PENDING`. Se genera automáticamente un `OrderTracking` con `status = PENDING`.

**Request body:**
```json
{
  "customerId": 5,
  "warehouseId": 2,
  "items": [
    { "productId": 10, "quantity": 2 }
  ],
  "taxRate": 7.14,
  "shippingAddress": "Calle 123, Bogotá",
  "estimatedDelivery": "2024-12-20",
  "notes": "Entregar en horario de oficina"
}
```

**Validaciones:**
- `customerId` y `warehouseId` deben existir
- `items` no puede estar vacío
- Cada `productId` debe existir y estar activo
- `quantity` > 0

**Response `201`:** Retorna el pedido creado (mismo formato que `GET /api/orders/{id}`)

---

#### `PUT /api/orders/{id}/status`

Cambia el estado del pedido y registra automáticamente un `OrderTracking`.

**Request body:**
```json
{
  "status": "DISPATCHED",
  "notes": "Pedido entregado a Servientrega, guía TRK123456",
  "trackingCode": "TRK123456",
  "carrier": "Servientrega"
}
```

> `trackingCode` y `carrier` son opcionales. Si se envían, actualizar el pedido con estos valores.

**Validaciones:**
- Verificar que la transición sea válida (ver tabla de transiciones)
- `status` requerido

**Response `200`:** Retorna el pedido actualizado

---

#### `GET /api/orders/{id}/tracking`

Retorna el historial completo de cambios de estado del pedido, ordenado de más antiguo a más reciente.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "status": "PENDING",
      "notes": "Pedido recibido en el sistema",
      "createdBy": "operador@empresa.com",
      "createdAt": "2024-12-15T10:30:00"
    },
    {
      "id": 2,
      "status": "CONFIRMED",
      "notes": "Pago verificado por transferencia",
      "createdBy": "admin@empresa.com",
      "createdAt": "2024-12-15T11:00:00"
    },
    {
      "id": 3,
      "status": "DISPATCHED",
      "notes": "Pedido entregado a Servientrega, guía TRK123456",
      "createdBy": "bodeguero@empresa.com",
      "createdAt": "2024-12-17T14:00:00"
    }
  ]
}
```

---

#### `GET /api/orders/customer/{customerId}`

Lista pedidos de un cliente específico. Mismo formato que `GET /api/orders`.

---

## Comportamiento adicional

### Al crear el pedido (`POST /api/orders`)
- Calcular `unitPrice` desde `product.price` al momento de la creación (snapshot)
- Calcular `subtotal` por ítem, `subtotal` general, `tax`, y `total`
- Crear automáticamente el primer `OrderTracking` con `status = PENDING`, `notes = "Pedido creado"`, `createdBy` = usuario autenticado del JWT

### Al cambiar estado (`PUT /api/orders/{id}/status`)
- Actualizar `order.status` y `order.updatedAt`
- Insertar nuevo `OrderTracking`
- El campo `createdBy` del tracking se toma del JWT del request

### No crear movimiento de inventario al crear pedido
- El descuento de stock se maneja por separado desde el módulo de inventario (registro de salida)
- El inventario `reservedStock` puede incrementarse como mejora futura, pero NO es requerimiento de este spec

---

## Códigos de error esperados

| Código | Caso |
|--------|------|
| `400`  | Transición de estado inválida, validación de campos |
| `404`  | Pedido, cliente, producto o bodega no encontrado |
| `409`  | (Reservado para futuros conflictos de stock) |

---

## Resumen de endpoints

```
GET    /api/orders                        Lista con filtros opcionales
GET    /api/orders/{id}                   Detalle con items
POST   /api/orders                        Crear pedido
PUT    /api/orders/{id}/status            Cambiar estado + tracking automático
GET    /api/orders/{id}/tracking          Historial de etapas
GET    /api/orders/customer/{customerId}  Pedidos por cliente
```

---

*Spec generado para integración con frontend Next.js/TypeScript. El contrato de respuesta sigue el wrapper `{ success: boolean, data: T }` ya usado en todos los demás módulos.*
