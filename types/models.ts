export type Vehicle = {
  id: number;
  name: string;
  plate: string;
  capacity_liters: number;
};

export type Customer = {
  id: number;
  name: string;
  address: string;
  phone?: string | null;
};

export type Product = {
  id: number;
  name: string;
  unit: string;
  price_per_unit: number;
};

export type InventoryItem = {
  id: number;
  vehicle_id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  unit: string;
};

export type OrderStatus = 'assigned' | 'in_progress' | 'delivered' | 'partial' | 'paid';

export type OrderSummary = {
  id: number;
  order_no: string;
  status: OrderStatus;
  scheduled_date: string;
  total_amount: number;
  customer_name: string;
  is_partial?: number | boolean;
};

export type OrderDetail = OrderSummary & {
  customer_id: number;
  vehicle_id: number;
  customer_address: string;
  customer_phone?: string | null;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  qty_ordered: number;
  qty_delivered: number;
  price_per_unit: number;
  product_name: string;
  unit: string;
};

export type PaymentMethod = 'cash' | 'credit' | 'cheque';

export type Payment = {
  id: number;
  order_id: number;
  delivery_id?: number | null;
  method: PaymentMethod;
  amount: number;
  amount_received?: number | null;
  change_given?: number | null;
  bank_name?: string | null;
  cheque_no?: string | null;
  paid_at: string;
};

export type Receipt = {
  id: number;
  order_id: number;
  receipt_no: string;
  created_at: string;
};

export type Bank = {
  id: number;
  name: string;
};

export type CommissionConfig = {
  rate_per_unit: number;
  daily_target_qty: number;
};

export type InventoryMovement = {
  id: number;
  vehicle_id: number;
  product_id: number;
  quantity_change: number;
  movement_type: 'load' | 'return' | 'adjust' | 'delivery';
  notes?: string | null;
  created_at: string;
  product_name: string;
  unit: string;
};

export type ShopProgress = {
  customer_name: string;
  total_ordered: number;
  total_delivered: number;
  completion_rate: number;
};

export type ProductDeliveryStat = {
  product_id: number;
  product_name: string;
  unit: string;
  delivered_qty: number;
  current_qty: number;
  initial_qty: number;
  delivered_ratio: number;
};

export type DashboardStats = {
  total_orders: number;
  pending_orders: number;
  delivered_today: number;
  revenue_today: number;
  inventory_remaining: number;
  commission_today: number;
  cash_total: number;
  cheque_total: number;
  credit_total: number;
  shops_completed: number;
  total_gas_delivered: number;
  target_progress: number;
  target_qty: number;
};
