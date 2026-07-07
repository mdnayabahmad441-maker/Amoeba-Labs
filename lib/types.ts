// ==================== Ventures ====================
export interface Venture {
  id: string;
  venture_name: string;
  description: string | null;
  status: "Active" | "Inactive" | "Planning";
  created_at: string;
  updated_at: string;
}

// ==================== Client Types ====================
export const CLIENT_TYPES = [
  "School",
  "Hospital",
  "Business",
  "Restaurant",
  "Clinic",
  "NGO",
  "Government",
  "Other",
] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];

// ==================== Clients ====================
export interface Client {
  id: string;
  venture_id: string;
  client_name: string;
  client_type: ClientType;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  status: "Lead" | "Active" | "Inactive" | "Closed";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  client_name: string;
  client_type: ClientType;
  owner_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  status?: Client["status"];
  notes?: string;
}

// ==================== Leads ====================
export interface Lead {
  id: string;
  venture_id: string;
  client_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage:
    | "New Lead"
    | "Contacted"
    | "Demo Scheduled"
    | "Proposal Sent"
    | "Negotiation"
    | "Closed Won"
    | "Closed Lost";
  notes: string | null;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  client_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  source?: string;
  stage?: Lead["stage"];
  notes?: string;
  next_follow_up?: string;
}

export const LEAD_STAGES: Lead["stage"][] = [
  "New Lead",
  "Contacted",
  "Demo Scheduled",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

// ==================== Tasks ====================
export interface Task {
  id: string;
  venture_id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "To Do" | "In Progress" | "Done" | "Cancelled";
  assigned_to: string | null;
  assigned_to_phone: string | null;
  assigned_employee_id: string | null;
  related_client_id: string | null;
  related_lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  status?: Task["status"];
  assigned_to?: string;
  assigned_to_phone?: string;
  assigned_employee_id?: string;
  related_client_id?: string;
  related_lead_id?: string;
}

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const TASK_STATUSES = ["To Do", "In Progress", "Done", "Cancelled"] as const;

// ==================== Employees ====================
export const EMPLOYEE_STATUSES = ["Active", "Inactive"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export interface Employee {
  id: string;
  venture_id: string;
  full_name: string;
  role: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  status: EmployeeStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  full_name: string;
  role?: string;
  department?: string;
  phone?: string;
  email?: string;
  status?: EmployeeStatus;
  notes?: string;
}

// ==================== Invoices ====================
export interface Invoice {
  id: string;
  venture_id: string;
  client_id: string;
  amount: number;
  invoice_number: string;
  due_date: string;
  status: "Draft" | "Sent" | "Partially Paid" | "Paid" | "Overdue" | "Cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceInput {
  client_id: string;
  amount: number;
  invoice_number: string;
  due_date: string;
  status?: Invoice["status"];
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  service_name: string;
  description: string | null;
  quantity: number;
  rate: number;
  amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: "UPI" | "Bank Transfer" | "Cash" | "Card" | "Razorpay" | "Stripe" | "Other";
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"] as const;
export const PAYMENT_METHODS = ["UPI", "Bank Transfer", "Cash", "Card", "Razorpay", "Stripe", "Other"] as const;

// ==================== Expenses ====================
export const EXPENSE_CATEGORIES = [
  "Software",
  "Marketing",
  "Travel",
  "Office",
  "Utilities",
  "Team",
  "Client Work",
  "Food",
  "Miscellaneous",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: string;
  venture_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  payment_method: Payment["method"];
  vendor: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  payment_method: Payment["method"];
  vendor?: string;
  paid_by?: string;
  notes?: string;
}

// ==================== Business Settings ====================
export interface BusinessSettings {
  id: string;
  venture_id: string;
  business_name: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  tax_id: string | null;
  bank_details: string | null;
  upi_id: string | null;
  invoice_prefix: string;
  proposal_prefix: string;
  default_payment_terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessSettingsInput {
  business_name: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_id?: string;
  bank_details?: string;
  upi_id?: string;
  invoice_prefix?: string;
  proposal_prefix?: string;
  default_payment_terms?: string;
}

// ==================== Proposals ====================
export const PROPOSAL_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export interface Proposal {
  id: string;
  venture_id: string;
  client_id: string | null;
  lead_id: string | null;
  proposal_number: string;
  title: string;
  status: ProposalStatus;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  service_name: string;
  description: string | null;
  quantity: number;
  rate: number;
  amount: number;
  created_at: string;
}

// ==================== Projects ====================
export const PROJECT_STATUSES = ["Planning", "Active", "On Hold", "Completed", "Cancelled"] as const;
export const MILESTONE_STATUSES = ["Not Started", "In Progress", "Done", "Blocked"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export interface Project {
  id: string;
  venture_id: string;
  client_id: string | null;
  lead_id: string | null;
  proposal_id: string | null;
  project_name: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: MilestoneStatus;
  amount: number | null;
  created_at: string;
}

// ==================== Follow-ups ====================
export const FOLLOWUP_TYPES = ["Call", "Email", "WhatsApp", "Meeting", "Other"] as const;
export type FollowupType = (typeof FOLLOWUP_TYPES)[number];

export const FOLLOWUP_TYPE_ICONS: Record<FollowupType, string> = {
  Call: "📞",
  Email: "📧",
  WhatsApp: "💬",
  Meeting: "🤝",
  Other: "📝",
};

export interface Followup {
  id: string;
  venture_id: string;
  client_id: string | null;
  lead_id: string | null;
  type: FollowupType;
  notes: string | null;
  follow_up_date: string;
  next_follow_up: string | null;
  status: "Pending" | "Done" | "Overdue";
  created_at: string;
}

export interface CreateFollowupInput {
  client_id?: string;
  lead_id?: string;
  type: FollowupType;
  notes?: string;
  follow_up_date: string;
  next_follow_up?: string;
  status: "Pending" | "Done" | "Overdue";
}

// ==================== Dashboard Stats ====================
export interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalLeads: number;
  tasksToday: number;
  totalRevenue: number;
  overdueInvoices: number;
}

// ==================== User ====================
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
  created_at: string;
}

// ==================== API Response Types ====================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
