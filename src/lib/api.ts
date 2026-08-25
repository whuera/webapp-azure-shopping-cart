import axios, { AxiosInstance, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import {
  Result, LoginRequest, LoginResponse, UserResponse, CreateUserRequest,
  Product, Category, CategoryGroup, Customer, Invoice, InvoiceRequest, DailyCash,
  CashTransaction, Warehouse, Inventory, InventoryMovement,
  InventoryMovementRequest, TransferRequest, ChartOfAccount,
  AccountingPeriod, JournalEntry, FixedAsset, CrmCompany, CrmContact,
  CrmPipelineStage, CrmOpportunity, CrmActivity, CrmTicket, CrmQuote,
  Order, OrderTracking, CreateOrderRequest, UpdateOrderStatusRequest,
  Comercio,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const http: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data = <T>(res: AxiosResponse<Result<T>>) => res.data;

// Known backend messages translated to Spanish for a consistent UI.
// Falls back to the original message if nothing matches.
function translateKnownMessage(message: string): string {
  const skuExists = message.match(/Product with SKU '(.+)' already exists/i);
  if (skuExists) return `Ya existe un producto con el SKU "${skuExists[1]}". Usa un SKU distinto.`;
  return message;
}

/**
 * Extracts a human-readable, Spanish message from any API error (validation
 * 400s, conflict 409s, or unexpected 500s), so callers can show it to the
 * user instead of letting the error crash the page.
 */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === "string") {
      // Some validation errors come back as a JSON string inside `message`,
      // e.g. {"code":"01","messages":[{"description":"..."}]}
      try {
        const parsed = JSON.parse(message);
        const descriptions = parsed?.messages?.map((m: { description?: string }) => m.description).filter(Boolean);
        if (descriptions?.length) return descriptions.join(" ");
      } catch {
        // not JSON, use as-is
      }
      return translateKnownMessage(message);
    }
    // `data.error` (e.g. "Internal Server Error", "Bad Request") is Spring's
    // generic reason phrase, not a useful message for end users — ignore it
    // and fall back to a friendly, status-based message instead.
    const status = err.response?.status;
    if (status === 409) return "Ya existe un registro con ese valor. Verifica los datos e intenta de nuevo.";
    if (status === 404) return "No se encontró el recurso solicitado.";
    if (status === 500) return "Ocurrió un error inesperado en el servidor. Intenta nuevamente.";
    if (!err.response) return "No se pudo conectar con el servidor. Verifica tu conexión.";
  }
  return "Ocurrió un error inesperado. Intenta nuevamente.";
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (body: LoginRequest) =>
    http.post<Result<LoginResponse>>("/api/auth/login", body).then(data),
  me: () => http.get<Result<UserResponse>>("/api/auth/me").then(data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => http.get<Result<UserResponse[]>>("/api/admin/users").then(data),
  getById: (id: number) =>
    http.get<Result<UserResponse>>(`/api/admin/users/${id}`).then(data),
  create: (body: CreateUserRequest) =>
    http.post<Result<UserResponse>>("/api/admin/users", body).then(data),
  update: (id: number, body: Partial<UserResponse>) =>
    http.put<Result<UserResponse>>(`/api/admin/users/${id}`, body).then(data),
  deactivate: (id: number) =>
    http.delete<Result<UserResponse>>(`/api/admin/users/${id}`).then(data),
  assignRoles: (id: number, roles: string[]) =>
    http.put<Result<UserResponse>>(`/api/admin/users/${id}/roles`, { roles }).then(data),
  resetPassword: (id: number, newPassword: string, updatedBy: string) =>
    http.post<Result<string>>(`/api/admin/users/${id}/reset-password`, { newPassword, updatedBy }).then(data),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  list: () => http.get<Result<Product[]>>("/api/products").then(data),
  getById: (id: number) =>
    http.get<Result<Product>>(`/api/product/${id}`).then(data),
  create: (body: Partial<Product>) =>
    http.post<Result<Product>>("/api/products", body).then(data),
  update: (id: number, body: Partial<Product>) =>
    http.put<Result<Product>>(`/api/products/${id}`, body).then(data),
  /** Soft delete — marks the product as DELETE_PRODUCT but keeps the row (and its SKU) reserved. */
  delete: (id: number) =>
    http.delete<Result<Product>>(`/api/products/${id}`).then(data),
  /** Hard delete — permanently removes the row from the database, freeing its SKU. Irreversible. */
  hardDelete: (id: number) =>
    http.delete<Result<string>>(`/api/products/${id}/hard`).then(data),
  listByType: (type: string) =>
    http.get<Result<Product[]>>(`/api/products/type/${type}`).then(data),
  /**
   * Looks up the product that currently owns `sku`, if any. Returns `null`
   * when the SKU is free, or when it belongs to `excludeId` (used when
   * editing a product so it doesn't flag its own SKU as taken).
   */
  checkSku: async (sku: string, excludeId?: number): Promise<Product | null> => {
    try {
      const res = await http.get<Result<Product>>(`/api/products/sku/${encodeURIComponent(sku)}`);
      const owner = res.data.data;
      return owner && owner.id !== excludeId ? owner : null;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  },
  categories: () =>
    http.get<Result<Category[]>>("/api/categories").then(data),
  createCategory: (body: Partial<Category>) =>
    http.post<Result<Category>>("/api/categories", body).then(data),
  updateCategoryGroup: (categoryId: number, groupId: number | null) =>
    http.put<Result<Category>>(`/api/categories/${categoryId}/group`, null, {
      params: groupId != null ? { groupId } : {},
    }).then(data),
  setImages: (productId: number, images: { url: string; sortOrder?: number }[]) =>
    http.put<Result<Product>>(`/api/products/${productId}/images`, images).then(data),
};

// ── Category Groups ───────────────────────────────────────────────────────────
export const categoryGroupsApi = {
  list: () =>
    http.get<Result<CategoryGroup[]>>("/api/category-groups").then(data),
  create: (body: { name: string; description?: string }) =>
    http.post<Result<CategoryGroup>>("/api/category-groups", body).then(data),
  update: (id: number, body: { name: string; description?: string }) =>
    http.put<Result<CategoryGroup>>(`/api/category-groups/${id}`, body).then(data),
  delete: (id: number) =>
    http.delete<Result<string>>(`/api/category-groups/${id}`).then(data),
};

// ── Comercios (tiendas del portal mobilpymes.store) ───────────────────────────
export const comerciosApi = {
  list: (status?: string) =>
    http.get<Result<Comercio[]>>("/api/admin/stores", { params: status ? { status } : {} }).then(data),
  /**
   * Cambia el status administrativo del comercio (PENDING_REVIEW | ACTIVE | SUSPENDED).
   * "Validar" = ACTIVE, "Suspender" = SUSPENDED, "Reactivar/revertir" = ACTIVE/PENDING_REVIEW.
   * NOTE: endpoint solicitado al backend — no existe todavía (ver issue de seguimiento).
   */
  updateStatus: (id: number, status: string) =>
    http.put<Result<Comercio>>(`/api/admin/stores/${id}/status`, { status }).then(data),
  /**
   * Otorga o retira el sello "Oficial/Certificado" (independiente del status).
   * NOTE: endpoint solicitado al backend — no existe todavía (ver issue de seguimiento).
   */
  setOfficial: (id: number, isOfficial: boolean) =>
    http.put<Result<Comercio>>(`/api/admin/stores/${id}/official`, { isOfficial }).then(data),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const customersApi = {
  list: () =>
    http.get<Result<Customer[]>>("/api/customer/customers").then(data),
  create: (body: Partial<Customer>) =>
    http.post<Result<Customer>>("/api/customer/create", body).then(data),
  update: (id: number, body: Partial<Customer>) =>
    http.put<Result<Customer>>(`/api/customer/${id}`, body).then(data),
};

// ── Sales / Invoices ──────────────────────────────────────────────────────────
export const invoicesApi = {
  list: () => http.get<Result<Invoice[]>>("/api/invoice").then(data),
  getById: (id: number) =>
    http.get<Result<Invoice>>(`/api/invoice/${id}`).then(data),
  create: (body: InvoiceRequest) =>
    http.post<Result<Invoice>>("/api/invoice", body).then(data),
  cancel: (id: number) =>
    http.delete<Result<Invoice>>(`/api/invoice/${id}/cancel`).then(data),
  byCustomer: (customerId: number) =>
    http.get<Result<Invoice[]>>(`/api/invoice/customer/${customerId}`).then(data),
};

export const cashApi = {
  today: () => http.get<Result<DailyCash>>("/api/cash/today").then(data),
  open: (openingBalance: number) =>
    http.post<Result<DailyCash>>("/api/cash/open", { openingBalance }).then(data),
  close: () => http.post<Result<DailyCash>>("/api/cash/close").then(data),
  transactions: (id: number) =>
    http.get<Result<CashTransaction[]>>(`/api/cash/${id}/transactions`).then(data),
};

// ── Inventory ─────────────────────────────────────────────────────────────────
export const warehousesApi = {
  list: () =>
    http.get<Result<Warehouse[]>>("/api/inventory/warehouses").then(data),
  getById: (id: number) =>
    http.get<Result<Warehouse>>(`/api/inventory/warehouses/${id}`).then(data),
  create: (body: Partial<Warehouse>) =>
    http.post<Result<Warehouse>>("/api/inventory/warehouses", body).then(data),
  update: (id: number, body: Partial<Warehouse>) =>
    http.put<Result<Warehouse>>(`/api/inventory/warehouses/${id}`, body).then(data),
  deactivate: (id: number) =>
    http.delete<Result<Warehouse>>(`/api/inventory/warehouses/${id}`).then(data),
};
export const inventoryApi = {
  byWarehouse: (warehouseId: number) =>
    http.get<Result<Inventory[]>>(`/api/inventory/stock/warehouse/${warehouseId}`).then(data),
  byProduct: (productId: number) =>
    http.get<Result<Inventory[]>>(`/api/inventory/stock/product/${productId}`).then(data),
  registerEntry: (body: InventoryMovementRequest) =>
    http.post<Result<InventoryMovement>>("/api/inventory/movements/entry", body).then(data),
  registerExit: (body: InventoryMovementRequest) =>
    http.post<Result<InventoryMovement>>("/api/inventory/movements/exit", body).then(data),
  transfer: (body: TransferRequest) =>
    http.post<Result<InventoryMovement[]>>("/api/inventory/movements/transfer", body).then(data),
  adjustment: (body: InventoryMovementRequest) =>
    http.post<Result<InventoryMovement>>("/api/inventory/movements/adjustment", body).then(data),
  movementsByWarehouse: (warehouseId: number) =>
    http.get<Result<InventoryMovement[]>>(`/api/inventory/movements/warehouse/${warehouseId}`).then(data),
  movementsByProduct: (productId: number) =>
    http.get<Result<InventoryMovement[]>>(`/api/inventory/movements/product/${productId}`).then(data),
};

// ── Accounting ────────────────────────────────────────────────────────────────
export const accountingApi = {
  accounts: {
    list: () => http.get<Result<ChartOfAccount[]>>("/api/accounting/accounts").then(data),
    create: (body: Partial<ChartOfAccount>) =>
      http.post<Result<ChartOfAccount>>("/api/accounting/accounts", body).then(data),
    update: (id: number, body: Partial<ChartOfAccount>) =>
      http.put<Result<ChartOfAccount>>(`/api/accounting/accounts/${id}`, body).then(data),
    initialize: () =>
      http.post<Result<string>>("/api/accounting/accounts/initialize").then(data),
  },
  periods: {
    list: () => http.get<Result<AccountingPeriod[]>>("/api/accounting/periods").then(data),
    current: () => http.get<Result<AccountingPeriod>>("/api/accounting/periods/current").then(data),
    create: (year: number, month: number) =>
      http.post<Result<AccountingPeriod>>(`/api/accounting/periods?year=${year}&month=${month}`).then(data),
    close: (id: number) =>
      http.put<Result<AccountingPeriod>>(`/api/accounting/periods/${id}/close`).then(data),
  },
  journal: {
    list: (periodId: number) =>
      http.get<Result<JournalEntry[]>>(`/api/accounting/journal-entries/period/${periodId}`).then(data),
    post: (id: number) =>
      http.post<Result<JournalEntry>>(`/api/accounting/journal-entries/${id}/post`).then(data),
  },
  reports: {
    trialBalance: (periodId: number) =>
      http.get(`/api/accounting/reports/trial-balance/${periodId}`).then(data),
    balanceSheet: (periodId: number) =>
      http.get(`/api/accounting/reports/balance-sheet/${periodId}`).then(data),
    profitLoss: (periodId: number) =>
      http.get(`/api/accounting/reports/profit-loss/${periodId}`).then(data),
  },
  fixedAssets: {
    list: () => http.get<Result<FixedAsset[]>>("/api/fixed-assets").then(data),
    create: (body: Partial<FixedAsset>) =>
      http.post<Result<FixedAsset>>("/api/fixed-assets", body).then(data),
    update: (id: number, body: Partial<FixedAsset>) =>
      http.put<Result<FixedAsset>>(`/api/fixed-assets/${id}`, body).then(data),
    dispose: (id: number) =>
      http.delete<Result<FixedAsset>>(`/api/fixed-assets/${id}/dispose`).then(data),
  },
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: { status?: string; customerId?: number; from?: string; to?: string }) =>
    http.get<Result<Order[]>>("/api/orders", { params }).then(data),
  getById: (id: number) =>
    http.get<Result<Order>>(`/api/orders/${id}`).then(data),
  create: (body: CreateOrderRequest) =>
    http.post<Result<Order>>("/api/orders", body).then(data),
  updateStatus: (id: number, body: UpdateOrderStatusRequest) =>
    http.put<Result<Order>>(`/api/orders/${id}/status`, body).then(data),
  tracking: (id: number) =>
    http.get<Result<OrderTracking[]>>(`/api/orders/${id}/tracking`).then(data),
  byCustomer: (customerId: number) =>
    http.get<Result<Order[]>>(`/api/orders/customer/${customerId}`).then(data),
};

// ── CRM ───────────────────────────────────────────────────────────────────────
export const crmApi = {
  companies: {
    list: () => http.get<Result<CrmCompany[]>>("/api/crm/companies").then(data),
    create: (body: Partial<CrmCompany>) =>
      http.post<Result<CrmCompany>>("/api/crm/companies", body).then(data),
    update: (id: number, body: Partial<CrmCompany>) =>
      http.put<Result<CrmCompany>>(`/api/crm/companies/${id}`, body).then(data),
  },
  contacts: {
    list: () => http.get<Result<CrmContact[]>>("/api/crm/contacts").then(data),
    create: (body: Partial<CrmContact>) =>
      http.post<Result<CrmContact>>("/api/crm/contacts", body).then(data),
    update: (id: number, body: Partial<CrmContact>) =>
      http.put<Result<CrmContact>>(`/api/crm/contacts/${id}`, body).then(data),
  },
  stages: {
    list: () =>
      http.get<Result<CrmPipelineStage[]>>("/api/crm/pipeline/stages").then(data),
    create: (body: Partial<CrmPipelineStage>) =>
      http.post<Result<CrmPipelineStage>>("/api/crm/pipeline/stages", body).then(data),
  },
  opportunities: {
    list: () =>
      http.get<Result<CrmOpportunity[]>>("/api/crm/opportunities").then(data),
    create: (body: Partial<CrmOpportunity>) =>
      http.post<Result<CrmOpportunity>>("/api/crm/opportunities", body).then(data),
    update: (id: number, body: Partial<CrmOpportunity>) =>
      http.put<Result<CrmOpportunity>>(`/api/crm/opportunities/${id}`, body).then(data),
    moveStage: (id: number, stageId: number) =>
      http.put<Result<CrmOpportunity>>(`/api/crm/opportunities/${id}/move/${stageId}`).then(data),
    markWon: (id: number) =>
      http.put<Result<CrmOpportunity>>(`/api/crm/opportunities/${id}/won`).then(data),
    markLost: (id: number, reason?: string) =>
      http.put<Result<CrmOpportunity>>(`/api/crm/opportunities/${id}/lost`, { reason }).then(data),
  },
  activities: {
    byOpportunity: (id: number) =>
      http.get<Result<CrmActivity[]>>(`/api/crm/activities/opportunity/${id}`).then(data),
    create: (body: Partial<CrmActivity>) =>
      http.post<Result<CrmActivity>>("/api/crm/activities", body).then(data),
    complete: (id: number, notes?: string) =>
      http.put<Result<CrmActivity>>(`/api/crm/activities/${id}/complete`, { notes }).then(data),
  },
  tickets: {
    list: () => http.get<Result<CrmTicket[]>>("/api/crm/tickets").then(data),
    create: (body: Partial<CrmTicket>) =>
      http.post<Result<CrmTicket>>("/api/crm/tickets", body).then(data),
    update: (id: number, body: Partial<CrmTicket>) =>
      http.put<Result<CrmTicket>>(`/api/crm/tickets/${id}`, body).then(data),
    resolve: (id: number) =>
      http.put<Result<CrmTicket>>(`/api/crm/tickets/${id}/resolve`).then(data),
    close: (id: number) =>
      http.put<Result<CrmTicket>>(`/api/crm/tickets/${id}/close`).then(data),
  },
  quotes: {
    list: () => http.get<Result<CrmQuote[]>>("/api/crm/quotes").then(data),
    create: (body: Partial<CrmQuote>) =>
      http.post<Result<CrmQuote>>("/api/crm/quotes", body).then(data),
    updateStatus: (id: number, status: string) =>
      http.put<Result<CrmQuote>>(`/api/crm/quotes/${id}/status`, { status }).then(data),
  },
};
