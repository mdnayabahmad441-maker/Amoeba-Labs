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
  related_client_id?: string;
  related_lead_id?: string;
}

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const TASK_STATUSES = ["To Do", "In Progress", "Done", "Cancelled"] as const;

// ==================== Invoices ====================
export interface Invoice {
  id: string;
  venture_id: string;
  client_id: string;
  amount: number;
  invoice_number: string;
  due_date: string;
  status: "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
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

export const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Cancelled"] as const;

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
