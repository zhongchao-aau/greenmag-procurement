// Auto-generated types for Supabase database
// Run `npx supabase gen types typescript` to refresh after schema changes

export type UserRole = 'user' | 'admin'
export type RequestStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'changes_requested' | 'rejected' | 'closed'
export type OrderStatus = 'approved' | 'ordered' | 'confirmed' | 'partially_shipped' | 'shipped' | 'partially_received' | 'received' | 'closed'
export type ShipmentStatus = 'created' | 'dispatched' | 'in_transit' | 'customs' | 'out_for_delivery' | 'delivered' | 'exception' | 'returned'
export type InspectionResult = 'pending' | 'passed' | 'partially_passed' | 'failed'
export type InventoryTxType = 'receipt' | 'usage' | 'adjustment' | 'return' | 'damaged' | 'reversal'
export type TrackingLeg = 'china' | 'eu' | 'single'
export type LifecycleStatus = 'active' | 'obsolete' | 'discontinued' | 'prototype'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  lab_number: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  country: string | null
  website: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  lead_time_days: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Product {
  id: string
  code: string
  name: string
  purpose: string | null
  status: LifecycleStatus
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface Variant {
  id: string
  code: string
  name: string
  product_id: string
  winding_material: string | null
  joint_method: string | null
  topology: string | null
  status: LifecycleStatus
  design_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Relations
  product?: Product
}

export interface ManufacturingConfiguration {
  id: string
  code: string
  name: string
  variant_id: string
  planned_units: number
  build_type: string | null
  description: string | null
  status: string
  mfg_link: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Relations
  variant?: Variant
}

export interface Component {
  id: string
  code: string
  name: string
  category: string | null
  material: string | null
  reference_size: string | null
  manufacturer: string | null
  manufacturer_pn: string | null
  unit: string
  low_stock_threshold: number | null
  description: string | null
  datasheet_url: string | null
  teams_link: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  // Computed
  current_stock?: number
}

export interface BomLine {
  id: string
  code: string
  mfg_config_id: string
  component_id: string
  qty_per_unit: number
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Relations
  component?: Component
  mfg_config?: ManufacturingConfiguration
}

export interface PurchaseRequest {
  id: string
  code: string
  requester_id: string
  status: RequestStatus
  purpose: string | null
  notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
  // Relations
  requester?: Profile
  reviewer?: Profile
  items?: RequestItem[]
}

export interface RequestItem {
  id: string
  request_id: string
  component_id: string | null
  item_name: string
  manufacturer: string | null
  manufacturer_pn: string | null
  quantity: number
  unit: string
  supplier_suggestion: string | null
  supplier_url: string | null
  specification: string | null
  purpose_notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Relations
  component?: Component
}

export interface PurchaseOrder {
  id: string
  code: string
  supplier_id: string | null
  supplier_ref: string | null
  status: OrderStatus
  responsible_id: string | null
  order_date: string | null
  confirmation_date: string | null
  expected_delivery: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Relations
  supplier?: Supplier
  responsible?: Profile
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  request_item_id: string | null
  component_id: string | null
  item_name: string
  quantity: number
  unit: string
  // Admin only:
  unit_price?: number | null
  currency?: string | null
  shipping_cost?: number | null
  other_cost?: number | null
  tax_amount?: number | null
  total_cost?: number | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  component?: Component
  request_item?: RequestItem
}

export interface Shipment {
  id: string
  code: string
  description: string | null
  status: ShipmentStatus
  china_carrier: string | null
  china_tracking_number: string | null
  china_tracking_url: string | null
  china_status: string | null
  china_dispatched_at: string | null
  eu_carrier: string | null
  eu_tracking_number: string | null
  eu_tracking_url: string | null
  eu_status: string | null
  eu_dispatched_at: string | null
  expected_delivery: string | null
  actual_delivery: string | null
  destination: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Relations
  items?: ShipmentItem[]
  events?: ShipmentEvent[]
  orders?: PurchaseOrder[]
}

export interface ShipmentItem {
  id: string
  shipment_id: string
  order_item_id: string | null
  component_id: string | null
  item_name: string
  quantity_shipped: number
  unit: string
  notes: string | null
  created_at: string
  // Relations
  component?: Component
}

export interface ShipmentEvent {
  id: string
  shipment_id: string
  leg: TrackingLeg
  event_time: string
  location: string | null
  status_code: string | null
  description: string
  is_manual: boolean
  recorded_by: string | null
  created_at: string
}

export interface Receipt {
  id: string
  shipment_id: string
  received_by: string
  received_at: string
  status: string
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  items?: ReceiptItem[]
  shipment?: Shipment
  receiver?: Profile
}

export interface ReceiptItem {
  id: string
  receipt_id: string
  shipment_item_id: string | null
  component_id: string | null
  item_name: string
  quantity_expected: number | null
  quantity_received: number
  unit: string
  notes: string | null
  created_at: string
}

export interface Inspection {
  id: string
  receipt_id: string
  inspector_id: string
  inspected_at: string
  result: InspectionResult
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  items?: InspectionItem[]
  inspector?: Profile
}

export interface InspectionItem {
  id: string
  inspection_id: string
  receipt_item_id: string | null
  component_id: string | null
  item_name: string
  quantity_inspected: number
  quantity_accepted: number
  quantity_rejected: number
  quantity_damaged: number
  quantity_missing: number
  notes: string | null
  inventory_added: boolean
  created_at: string
  updated_at: string
  // Relations
  component?: Component
}

export interface InventoryBalance {
  component_id: string
  quantity: number
  location: string | null
  lab_number: string | null
  updated_at: string
  // Relations
  component?: Component
}

export interface InventoryTransaction {
  id: string
  component_id: string
  tx_type: InventoryTxType
  quantity: number
  direction: 1 | -1
  reason: string | null
  inspection_item_id: string | null
  usage_id: string | null
  related_order_id: string | null
  reversed_by: string | null
  performed_by: string
  created_at: string
  // Relations
  component?: Component
  performer?: Profile
}

export interface UsageRecord {
  id: string
  component_id: string
  quantity: number
  used_by: string
  used_at: string
  purpose: string
  lab_number: string | null
  notes: string | null
  is_reversed: boolean
  reversal_notes: string | null
  created_at: string
  updated_at: string
  // Relations
  component?: Component
  user?: Profile
}

export interface ActivityLog {
  id: string
  entity_type: string
  entity_id: string
  entity_code: string | null
  action: string
  description: string
  performed_by: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  // Relations
  performer?: Profile
}

// Minimal Database type for Supabase client generics
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      suppliers: { Row: Supplier; Insert: Partial<Supplier>; Update: Partial<Supplier> }
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> }
      variants: { Row: Variant; Insert: Partial<Variant>; Update: Partial<Variant> }
      manufacturing_configurations: { Row: ManufacturingConfiguration; Insert: Partial<ManufacturingConfiguration>; Update: Partial<ManufacturingConfiguration> }
      components: { Row: Component; Insert: Partial<Component>; Update: Partial<Component> }
      bom_lines: { Row: BomLine; Insert: Partial<BomLine>; Update: Partial<BomLine> }
      purchase_requests: { Row: PurchaseRequest; Insert: Partial<PurchaseRequest>; Update: Partial<PurchaseRequest> }
      request_items: { Row: RequestItem; Insert: Partial<RequestItem>; Update: Partial<RequestItem> }
      purchase_orders: { Row: PurchaseOrder; Insert: Partial<PurchaseOrder>; Update: Partial<PurchaseOrder> }
      order_items: { Row: OrderItem; Insert: Partial<OrderItem>; Update: Partial<OrderItem> }
      shipments: { Row: Shipment; Insert: Partial<Shipment>; Update: Partial<Shipment> }
      shipment_order_links: { Row: { id: string; shipment_id: string; order_id: string; notes: string | null; created_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      shipment_items: { Row: ShipmentItem; Insert: Partial<ShipmentItem>; Update: Partial<ShipmentItem> }
      shipment_events: { Row: ShipmentEvent; Insert: Partial<ShipmentEvent>; Update: Partial<ShipmentEvent> }
      receipts: { Row: Receipt; Insert: Partial<Receipt>; Update: Partial<Receipt> }
      receipt_items: { Row: ReceiptItem; Insert: Partial<ReceiptItem>; Update: Partial<ReceiptItem> }
      inspections: { Row: Inspection; Insert: Partial<Inspection>; Update: Partial<Inspection> }
      inspection_items: { Row: InspectionItem; Insert: Partial<InspectionItem>; Update: Partial<InspectionItem> }
      inventory_balances: { Row: InventoryBalance; Insert: Partial<InventoryBalance>; Update: Partial<InventoryBalance> }
      inventory_transactions: { Row: InventoryTransaction; Insert: Partial<InventoryTransaction>; Update: Partial<InventoryTransaction> }
      usage_records: { Row: UsageRecord; Insert: Partial<UsageRecord>; Update: Partial<UsageRecord> }
      activity_log: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> }
    }
    Views: {
      order_items_public: { Row: Omit<OrderItem, 'unit_price' | 'currency' | 'shipping_cost' | 'other_cost' | 'tax_amount' | 'total_cost'> }
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      current_user_role: { Args: Record<string, never>; Returns: UserRole }
      next_gm_id: { Args: { entity: string; prefix: string }; Returns: string }
    }
    Enums: {
      user_role: UserRole
      request_status: RequestStatus
      order_status: OrderStatus
      shipment_status: ShipmentStatus
      inspection_result: InspectionResult
      inventory_tx_type: InventoryTxType
    }
  }
}
