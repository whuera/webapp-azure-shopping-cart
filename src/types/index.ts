// ── API Wrapper ────────────────────────────────────────────────────────────────
export interface Result<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse {
  token: string; tokenType: string;
  userId: number; email: string;
  firstName: string; lastName: string;
  userType: string; roles: string[];
}
export interface UserResponse {
  id: number; email: string;
  firstName: string; lastName: string;
  phoneNumber?: string; userType: string;
  status: string; roles: string[];
}
export interface CreateUserRequest {
  firstName: string; lastName: string;
  email: string; password: string;
  phoneNumber?: string; userType: string;
  roleNames: string[]; createdBy?: string;
}

// ── Products ──────────────────────────────────────────────────────────────────
export interface Category { id: number; name: string; }
export interface Product {
  id: number; name: string; description?: string;
  sku?: string; category?: Category;
  brand?: string; model?: string;
  status?: string; price: number;
  costPrice?: number; currency?: string;
  unitOfMeasure?: string; productType?: string;
  discount?: number; maxDiscount?: number;
  tracksInventory?: boolean; stock?: number;
  minStock?: number; maxStock?: number;
  taxRate?: number; taxExempt?: boolean;
  taxClassification?: string;
  createdAt?: string; updatedAt?: string;
}

// ── Customer ──────────────────────────────────────────────────────────────────
export interface Customer {
  id: number; status?: string;
  firstName: string; lastName: string;
  email: string; documentId: string;
  phoneNumber: string; imageCustomer?: string;
  comment?: string;
}

// ── Invoice ───────────────────────────────────────────────────────────────────
export interface InvoiceItem {
  id: number; product: Product;
  quantity: number; unitPrice: number;
  discount: number; subtotal: number;
}
export interface Invoice {
  id: number; invoiceNumber: string;
  customer: Customer; warehouse?: Warehouse;
  items: InvoiceItem[];
  subtotal: number; taxRate: number;
  tax: number; total: number;
  paymentMethod: string; status: string;
  notes?: string; createdAt: string;
}
export interface InvoiceRequest {
  customerId: number; warehouseId: number;
  items: { productId: number; quantity: number }[];
  paymentMethod: string; taxRate: number; notes?: string;
}

// ── Daily Cash ────────────────────────────────────────────────────────────────
export interface DailyCash {
  id: number; cashDate: string;
  openingBalance: number; totalSales: number;
  totalRefunds: number; closingBalance?: number;
  status: string; openedAt: string; closedAt?: string;
}
export interface CashTransaction {
  id: number; type: string;
  amount: number; description?: string;
  createdAt: string;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export interface Warehouse {
  id: number; name: string;
  location?: string; description?: string;
  status?: string; createdAt?: string;
}
export interface Inventory {
  id: number; product: Product;
  warehouse: Warehouse;
  currentStock: number; reservedStock: number;
  lastUpdated?: string;
}
export interface InventoryMovement {
  id: number; product: Product;
  warehouse: Warehouse; movementType: string;
  quantity: number; previousStock: number;
  currentStock: number; reference?: string;
  notes?: string; createdAt: string;
}
export interface InventoryMovementRequest {
  productId: number; warehouseId: number;
  quantity: number; reference?: string; notes?: string;
}
export interface TransferRequest {
  productId: number; fromWarehouseId: number;
  toWarehouseId: number; quantity: number;
  reference?: string; notes?: string;
}

// ── Accounting ────────────────────────────────────────────────────────────────
export interface ChartOfAccount {
  id: number; code: string; name: string;
  description?: string; accountType: string;
  level?: number; allowsMovement?: boolean;
  isActive?: boolean;
}
export interface AccountingPeriod {
  id: number; year: number; month: number;
  name: string; periodKey: string;
  startDate: string; endDate: string;
  status: string; closedAt?: string;
}
export interface JournalEntryLine {
  id: number; description?: string;
  debit: number; credit: number;
  account: ChartOfAccount;
}
export interface JournalEntry {
  id: number; entryNumber: string;
  period: AccountingPeriod; entryDate: string;
  entryType: string; reference?: string;
  description?: string; status: string;
  lines: JournalEntryLine[];
  totalDebit: number; totalCredit: number;
  createdAt: string;
}
export interface FixedAsset {
  id: number; code: string; name: string;
  description?: string; purchaseDate?: string;
  purchaseCost?: number; salvageValue?: number;
  usefulLifeMonths?: number; depreciationMethod?: string;
  accumulatedDepreciation?: number; bookValue?: number;
  status?: string;
}

// ── CRM ───────────────────────────────────────────────────────────────────────
export interface CrmCompany {
  id: number; name: string; industry?: string;
  website?: string; phone?: string; address?: string;
  taxId?: string; employeeCount?: number;
  status?: string; assignedTo?: string;
  createdAt?: string;
}
export interface CrmContact {
  id: number; firstName: string; lastName: string;
  email?: string; phone?: string; position?: string;
  company?: CrmCompany; status?: string;
  source?: string; assignedTo?: string;
  createdAt?: string;
}
export interface CrmPipelineStage {
  id: number; name: string; stageOrder: number;
  defaultProbability: number; color?: string;
  isWon: boolean; isLost: boolean; isActive: boolean;
}
export interface CrmOpportunity {
  id: number; title: string; description?: string;
  contact?: CrmContact; stage?: CrmPipelineStage;
  amount: number; probability: number;
  weightedAmount?: number; status: string;
  lostReason?: string; assignedTo?: string;
  expectedCloseDate?: string; createdAt?: string;
}
export interface CrmActivity {
  id: number; type: string; subject: string;
  description?: string; status: string;
  priority: string; assignedTo?: string;
  opportunity?: CrmOpportunity; contact?: CrmContact;
  dueDate?: string; completedAt?: string;
  createdAt?: string;
}
export interface CrmTicket {
  id: number; ticketNumber: string;
  subject: string; description?: string;
  category?: string; priority: string;
  status: string; assignedTo?: string;
  contact?: CrmContact; createdAt?: string;
  resolvedAt?: string;
}
export interface CrmQuote {
  id: number; quoteNumber: string; version: number;
  contact?: CrmContact; opportunity?: CrmOpportunity;
  status: string; subtotal: number;
  discountAmount?: number; taxRate?: number;
  tax?: number; total: number;
  validUntil?: string; createdAt?: string;
}
