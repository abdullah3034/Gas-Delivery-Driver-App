import { SQLiteDatabase } from "expo-sqlite";

type InsertResult = {
  lastInsertRowId?: number;
};

type SeedProduct = {
  name: string;
  unit: string;
  price_per_unit: number;
};

type SeedVehicle = {
  name: string;
  plate: string;
  capacity_liters: number;
};

type SeedCustomer = {
  name: string;
  address: string;
  phone: string;
};

type SeedOrderItem = {
  productIndex: number;
  qty: number;
};

const bankNames = [
  "Axis Bank",
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Kotak Mahindra Bank",
];

const vehicles: SeedVehicle[] = [
  { name: "LPG Truck A", plate: "TN 01 AB 1234", capacity_liters: 12000 },
  { name: "LPG Truck B", plate: "TN 02 CD 5678", capacity_liters: 9000 },
];

const customers: SeedCustomer[] = [
  { name: "Noura Cafe", address: "14 Market Street", phone: "555-1100" },
  {
    name: "Skyline Apartments",
    address: "88 East River Rd",
    phone: "555-2200",
  },
  { name: "Metro Bakery", address: "402 Central Ave", phone: "555-3300" },
  { name: "Golden Diner", address: "210 Sunset Blvd", phone: "555-4400" },
  { name: "City Hostel", address: "77 Lake Road", phone: "555-5500" },
  { name: "Cafe Aurora", address: "9 North Avenue", phone: "555-6600" },
  { name: "Harbor Eatery", address: "16 Dock Street", phone: "555-7700" },
  { name: "Sunrise School", address: "12 Hill View", phone: "555-8800" },
  { name: "Green Mart", address: "55 Pine Avenue", phone: "555-9900" },
  { name: "Lakeside Hotel", address: "3 Lakefront Way", phone: "555-1010" },
];

const products: SeedProduct[] = [
  { name: "LPG 12kg Cylinder", unit: "cylinder", price_per_unit: 2.5 },
  { name: "LPG 20kg Cylinder", unit: "cylinder", price_per_unit: 2.3 },
  { name: "LPG 5kg Cylinder", unit: "cylinder", price_per_unit: 2.8 },
];

const orderVariants: SeedOrderItem[][] = [
  [
    { productIndex: 0, qty: 40 },
    { productIndex: 1, qty: 20 },
  ],
  [
    { productIndex: 0, qty: 30 },
    { productIndex: 2, qty: 15 },
  ],
  [{ productIndex: 1, qty: 25 }],
  [
    { productIndex: 0, qty: 18 },
    { productIndex: 1, qty: 12 },
  ],
  [
    { productIndex: 2, qty: 24 },
    { productIndex: 1, qty: 10 },
  ],
  [{ productIndex: 0, qty: 22 }],
  [
    { productIndex: 0, qty: 12 },
    { productIndex: 2, qty: 18 },
  ],
  [
    { productIndex: 1, qty: 16 },
    { productIndex: 2, qty: 8 },
  ],
  [{ productIndex: 2, qty: 26 }],
  [
    { productIndex: 0, qty: 28 },
    { productIndex: 1, qty: 14 },
  ],
];

export async function seedDatabase(db: SQLiteDatabase) {
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const nowIso = today.toISOString();

  await db.execAsync("BEGIN");
  try {
    for (const bank of bankNames) {
      await db.runAsync("INSERT INTO banks (name) VALUES (?)", [bank]);
    }

    await db.runAsync(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      ["commission_rate_per_unit", "0.075"],
    );
    await db.runAsync(
      "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
      ["commission_daily_target_qty", "50"],
    );

    const vehicleIds: number[] = [];
    for (const vehicle of vehicles) {
      const result = await db.runAsync(
        "INSERT INTO vehicles (name, plate, capacity_liters) VALUES (?, ?, ?)",
        [vehicle.name, vehicle.plate, vehicle.capacity_liters],
      );
      vehicleIds.push((result as InsertResult).lastInsertRowId as number);
    }

    const customerIds: number[] = [];
    for (const customer of customers) {
      const result = await db.runAsync(
        "INSERT INTO customers (name, address, phone) VALUES (?, ?, ?)",
        [customer.name, customer.address, customer.phone],
      );
      customerIds.push((result as InsertResult).lastInsertRowId as number);
    }

    const productIds: number[] = [];
    for (const product of products) {
      const result = await db.runAsync(
        "INSERT INTO products (name, unit, price_per_unit) VALUES (?, ?, ?)",
        [product.name, product.unit, product.price_per_unit],
      );
      productIds.push((result as InsertResult).lastInsertRowId as number);
    }

    await db.runAsync(
      "INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)",
      [vehicleIds[0], productIds[0], 220],
    );
    await db.runAsync(
      "INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)",
      [vehicleIds[0], productIds[1], 140],
    );
    await db.runAsync(
      "INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)",
      [vehicleIds[0], productIds[2], 160],
    );
    await db.runAsync(
      "INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)",
      [vehicleIds[1], productIds[0], 180],
    );
    await db.runAsync(
      "INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)",
      [vehicleIds[1], productIds[1], 120],
    );
    await db.runAsync(
      "INSERT INTO inventory (vehicle_id, product_id, quantity) VALUES (?, ?, ?)",
      [vehicleIds[1], productIds[2], 140],
    );

    const orderIds: number[] = [];
    const ordersPerVehicle = 8;

    for (let vIndex = 0; vIndex < vehicleIds.length; vIndex += 1) {
      for (let i = 0; i < ordersPerVehicle; i += 1) {
        const customerId = customerIds[(i + vIndex) % customerIds.length];
        const items = orderVariants[i % orderVariants.length];
        const orderNo = `ORD-${vIndex + 1}${String(i + 1).padStart(3, "0")}`;

        let totalAmount = 0;
        for (const item of items) {
          totalAmount += item.qty * products[item.productIndex].price_per_unit;
        }

        const orderResult = await db.runAsync(
          "INSERT INTO orders (order_no, customer_id, vehicle_id, status, scheduled_date, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            orderNo,
            customerId,
            vehicleIds[vIndex],
            "assigned",
            todayDate,
            totalAmount,
            nowIso,
          ],
        );
        const orderId = (orderResult as InsertResult).lastInsertRowId as number;
        orderIds.push(orderId);

        for (const item of items) {
          await db.runAsync(
            "INSERT INTO order_items (order_id, product_id, qty_ordered, qty_delivered, price_per_unit) VALUES (?, ?, ?, ?, ?)",
            [
              orderId,
              productIds[item.productIndex],
              item.qty,
              0,
              products[item.productIndex].price_per_unit,
            ],
          );
        }
      }
    }

    const deliveredOrders = orderIds.slice(0, 3);
    for (const orderId of deliveredOrders) {
      const orderRow = await db.getFirstAsync<{ vehicle_id: number }>(
        "SELECT vehicle_id FROM orders WHERE id = ?",
        [orderId],
      );
      const vehicleId = orderRow?.vehicle_id ?? vehicleIds[0];

      await db.runAsync(
        "UPDATE order_items SET qty_delivered = qty_ordered WHERE order_id = ?",
        [orderId],
      );

      const totalQtyRow = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(qty_delivered), 0) as total FROM order_items WHERE order_id = ?",
        [orderId],
      );
      const totalAmountRow = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(qty_delivered * price_per_unit), 0) as total FROM order_items WHERE order_id = ?",
        [orderId],
      );

      const deliveredItems = await db.getAllAsync<{
        product_id: number;
        qty: number;
      }>(
        "SELECT product_id, qty_delivered as qty FROM order_items WHERE order_id = ?",
        [orderId],
      );
      for (const item of deliveredItems) {
        await db.runAsync(
          `UPDATE inventory
           SET quantity = quantity - ?
           WHERE vehicle_id = ? AND product_id = ?`,
          [item.qty, vehicleId, item.product_id],
        );
        await db.runAsync(
          "INSERT INTO inventory_movements (vehicle_id, product_id, quantity_change, movement_type, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            vehicleId,
            item.product_id,
            -item.qty,
            "delivery",
            "Seeded delivery",
            nowIso,
          ],
        );
      }

      await db.runAsync(
        "UPDATE orders SET status = ?, total_amount = ? WHERE id = ?",
        ["delivered", totalAmountRow?.total ?? 0, orderId],
      );

      const deliveryResult = await db.runAsync(
        "INSERT INTO deliveries (order_id, delivered_at, delivered_by, amount, notes) VALUES (?, ?, ?, ?, ?)",
        [orderId, nowIso, "Driver 01", totalAmountRow?.total ?? 0, null],
      );
      const deliveryId = (deliveryResult as InsertResult).lastInsertRowId as number;

      if (deliveryId) {
        for (const item of deliveredItems) {
          const priceRow = await db.getFirstAsync<{ price: number }>(
            "SELECT price_per_unit as price FROM order_items WHERE order_id = ? AND product_id = ?",
            [orderId, item.product_id],
          );
          await db.runAsync(
            "INSERT INTO delivery_items (delivery_id, product_id, qty_delivered, price_per_unit) VALUES (?, ?, ?, ?)",
            [deliveryId, item.product_id, item.qty, priceRow?.price ?? 0],
          );
        }
      }

      await db.runAsync(
        "INSERT INTO sales (order_id, total_qty, total_amount, created_at) VALUES (?, ?, ?, ?)",
        [orderId, totalQtyRow?.total ?? 0, totalAmountRow?.total ?? 0, nowIso],
      );
    }

    const paidOrder = deliveredOrders[0];
    const paidTotalRow = await db.getFirstAsync<{ total: number }>(
      "SELECT total_amount as total FROM orders WHERE id = ?",
      [paidOrder],
    );
    const seedAmount = paidTotalRow?.total ?? 0;
    const paidDeliveryRow = await db.getFirstAsync<{ id: number }>(
      "SELECT id FROM deliveries WHERE order_id = ? ORDER BY id DESC LIMIT 1",
      [paidOrder],
    );
    await db.runAsync(
      "INSERT INTO payments (order_id, delivery_id, method, amount, amount_received, change_given, bank_name, cheque_no, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        paidOrder,
        paidDeliveryRow?.id ?? null,
        "cash",
        seedAmount,
        seedAmount,
        0,
        null,
        null,
        nowIso,
      ],
    );
    await db.runAsync(
      "INSERT INTO receipts (order_id, receipt_no, created_at) VALUES (?, ?, ?)",
      [paidOrder, `RCPT-${Date.now()}`, nowIso],
    );
    await db.runAsync("UPDATE orders SET status = ? WHERE id = ?", [
      "paid",
      paidOrder,
    ]);

    await db.execAsync("COMMIT");
  } catch (error) {
    await db.execAsync("ROLLBACK");
    throw error;
  }
}
