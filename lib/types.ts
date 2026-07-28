// ==================== Ventures ====================
export interface Venture {
  id: string;
  venture_name: string;
  description: string | null;
  status: "Active" | "Inactive" | "Planning";
  is_default: boolean;
  venture_kind: "Operating business" | "Business unit" | "Product / offer";
  archived_at?: string | null;
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
  next_action_type: NextActionType | null;
  next_action_at: string | null;
  communication_channel: CommunicationChannel | null;
  responsible_employee_id: string | null;
  expected_outcome: string | null;
  last_contact_at: string | null;
  follow_up_priority: FollowUpPriority;
  follow_up_notes: string | null;
  next_action_reschedule_count: number;
  client_update_due_at: string | null;
  next_action_updated_at: string | null;
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
  next_action_type?: NextActionType | "";
  next_action_at?: string;
  communication_channel?: CommunicationChannel | "";
  responsible_employee_id?: string;
  expected_outcome?: string;
  last_contact_at?: string;
  follow_up_priority?: FollowUpPriority;
  follow_up_notes?: string;
  client_update_due_at?: string;
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
  next_action_type: NextActionType | null;
  next_action_at: string | null;
  communication_channel: CommunicationChannel | null;
  responsible_employee_id: string | null;
  expected_outcome: string | null;
  last_contact_at: string | null;
  follow_up_priority: FollowUpPriority;
  follow_up_notes: string | null;
  next_action_reschedule_count: number;
  stage_entered_at: string;
  next_action_updated_at: string | null;
  qualification_status: QualificationStatus;
  pipeline_stage: PipelineStage;
  lead_temperature: LeadTemperature;
  pipeline_stage_updated_at: string | null;
  business_type: string | null;
  industry: string | null;
  location: string | null;
  company_size: string | null;
  number_of_branches: number | null;
  main_business_problem: string | null;
  problem_severity: ScoreFactor | null;
  current_workaround: string | null;
  existing_software: string | null;
  budget_range: string | null;
  expected_project_value: number | null;
  decision_maker_name: string | null;
  decision_maker_identified: boolean;
  urgency: ScoreFactor | null;
  buying_timeline: string | null;
  authority_level: ScoreFactor | null;
  need_level: ScoreFactor | null;
  ability_to_pay: ScoreFactor | null;
  probability_of_closing: number | null;
  competitor_considered: string | null;
  qualification_notes: string | null;
  disqualification_reason: string | null;
  lost_reason: string | null;
  engagement_score: ScoreFactor | null;
  timeline_score: ScoreFactor | null;
  founder_company_fit: ScoreFactor | null;
  lead_score: number;
  score_confidence: "Low" | "Medium" | "High";
  score_reason: string | null;
  recommended_next_action: string | null;
  score_updated_at: string | null;
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
  next_action_type?: NextActionType | "";
  next_action_at?: string;
  communication_channel?: CommunicationChannel | "";
  responsible_employee_id?: string;
  expected_outcome?: string;
  last_contact_at?: string;
  follow_up_priority?: FollowUpPriority;
  follow_up_notes?: string;
  qualification_status?: QualificationStatus;
  pipeline_stage?: PipelineStage;
  lead_temperature?: LeadTemperature;
  business_type?: string;
  industry?: string;
  location?: string;
  company_size?: string;
  number_of_branches?: number | "";
  main_business_problem?: string;
  problem_severity?: ScoreFactor | "";
  current_workaround?: string;
  existing_software?: string;
  budget_range?: string;
  expected_project_value?: number | "";
  decision_maker_name?: string;
  decision_maker_identified?: boolean;
  urgency?: ScoreFactor | "";
  buying_timeline?: string;
  authority_level?: ScoreFactor | "";
  need_level?: ScoreFactor | "";
  ability_to_pay?: ScoreFactor | "";
  probability_of_closing?: number | "";
  competitor_considered?: string;
  qualification_notes?: string;
  disqualification_reason?: string;
  lost_reason?: string;
  engagement_score?: ScoreFactor | "";
  timeline_score?: ScoreFactor | "";
  founder_company_fit?: ScoreFactor | "";
}

export const QUALIFICATION_STATUSES = ["New", "Attempting contact", "Researching", "Unqualified", "Qualified", "Discovery scheduled", "Discovery completed", "Demonstration scheduled", "Demonstration completed", "Proposal requested", "Proposal sent", "Negotiation", "Not ready", "Won", "Lost"] as const;
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number];
export type ScoreFactor = 0 | 1 | 2 | 3 | 4 | 5;

export const PIPELINE_STAGES = ["New", "Contacted", "Qualified", "Meeting/Demo", "Proposal", "Negotiation", "Won", "Lost"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export const LEAD_TEMPERATURES = ["Hot", "Warm", "Cold", "Not ready", "Unqualified"] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

export const NEXT_ACTION_TYPES = ["Call", "WhatsApp", "Email", "Meeting", "Demonstration", "Proposal", "Payment reminder", "Project update", "Renewal", "Upsell", "Referral request", "Other"] as const;
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number];
export const COMMUNICATION_CHANNELS = ["Phone", "WhatsApp", "Email", "In person", "Video call", "Other"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];
export const FOLLOW_UP_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type FollowUpPriority = (typeof FOLLOW_UP_PRIORITIES)[number];

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
  auth_user_id: string | null;
  is_founder: boolean;
  archived_at?: string | null;
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
  project_id: string | null;
  direct_cost_type: "Contractor" | "Employee" | "Software" | "API" | "Travel" | "Other" | null;
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
  project_id?: string;
  direct_cost_type?: Expense["direct_cost_type"];
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
  currency_code: CurrencyCode;
  timezone: BusinessTimezone;
  monthly_revenue_target: number;
  no_contact_warning_days: number;
  lead_stuck_warning_days: number;
  client_update_warning_days: number;
  score_weight_problem_severity: number;
  score_weight_urgency: number;
  score_weight_ability_to_pay: number;
  score_weight_decision_maker: number;
  score_weight_estimated_value: number;
  score_weight_engagement: number;
  score_weight_timeline: number;
  score_weight_founder_fit: number;
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
  currency_code?: CurrencyCode;
  timezone?: BusinessTimezone;
  monthly_revenue_target?: number;
  no_contact_warning_days?: number;
  lead_stuck_warning_days?: number;
  client_update_warning_days?: number;
  score_weight_problem_severity?: number;
  score_weight_urgency?: number;
  score_weight_ability_to_pay?: number;
  score_weight_decision_maker?: number;
  score_weight_estimated_value?: number;
  score_weight_engagement?: number;
  score_weight_timeline?: number;
  score_weight_founder_fit?: number;
}

export const CURRENCY_CODES = ["INR", "USD", "GBP", "EUR", "AED"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];
export const BUSINESS_TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC"] as const;
export type BusinessTimezone = (typeof BUSINESS_TIMEZONES)[number];

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
export const PROJECT_STATUSES = ["Awaiting Agreement", "Awaiting Deposit", "Awaiting Requirements", "Ready to Start", "Active", "Client Review", "On Hold", "Completed", "Cancelled"] as const;
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
  agreement_required: boolean;
  agreement_status: "Not required" | "Pending" | "Accepted";
  agreement_accepted_at: string | null;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_invoice_id: string | null;
  deposit_received: boolean;
  requirements_received: boolean;
  onboarding_completed: boolean;
  ready_to_start_status: "Blocked" | "Ready" | "Overridden";
  start_override_reason: string | null;
  start_override_by: string | null;
  start_override_at: string | null;
  recognized_revenue: number;
  profitability_basis: "Invoiced" | "Collected" | "Recognized";
  direct_cost_budget: number;
  estimated_hours: number;
  actual_hours: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectProfitability {
  project_id: string;
  venture_id: string;
  project_name: string;
  client_id: string | null;
  status: ProjectStatus;
  contract_value: number;
  invoiced_amount: number;
  collected_amount: number;
  recognized_revenue: number;
  outstanding_amount: number;
  profitability_basis: Project["profitability_basis"];
  profitability_revenue: number;
  direct_costs: number;
  contractor_cost: number;
  employee_cost: number;
  software_cost: number;
  api_cost: number;
  travel_cost: number;
  other_cost: number;
  direct_cost_budget: number;
  estimated_hours: number;
  actual_hours: number;
  gross_profit: number;
  gross_margin: number | null;
  effective_revenue_per_hour: number | null;
  budget_variance: number;
  profitability_health: "Healthy" | "Low margin" | "At risk" | "Loss-making";
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

// ==================== Today Command Centre ====================
export const TODAY_RECORD_TYPES = ["Task", "Follow-up", "Proposal", "Invoice", "Project", "Milestone", "Lead", "Meeting", "Field Visit", "Client Update", "Renewal", "Content", "Other"] as const;
export type TodayRecordType = (typeof TODAY_RECORD_TYPES)[number];
export type TodayActionStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export interface TodayActionItem {
  id: string;
  venture_id: string;
  record_type: TodayRecordType;
  source_record_type: string | null;
  source_record_id: string | null;
  title: string;
  description: string | null;
  action_date: string;
  action_time: string | null;
  deadline: string | null;
  priority: Task["priority"];
  status: TodayActionStatus;
  assigned_employee_id: string | null;
  department: string | null;
  related_client_id: string | null;
  related_lead_id: string | null;
  related_project_id: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  venture_id: string;
  record_type: string;
  record_id: string;
  action: string;
  details: Record<string, unknown>;
  related_lead_id: string | null;
  related_client_id: string | null;
  related_project_id: string | null;
  performed_by: string | null;
  created_at: string;
}

// ==================== Calendar ====================
export const CALENDAR_EVENT_TYPES = ["Discovery call", "Demonstration", "Follow-up", "Client meeting", "Project meeting", "Payment reminder", "Field visit", "Employee task", "Content recording", "Proposal expiry", "Contract renewal", "Subscription renewal", "Other"] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];
export const CALENDAR_EVENT_STATUSES = ["Scheduled", "Confirmed", "Completed", "Cancelled", "No show"] as const;
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number];
export type RecurrenceFrequency = "Daily" | "Weekly" | "Monthly";

export interface CalendarEvent {
  id: string; venture_id: string; title: string; event_type: CalendarEventType; description: string | null;
  start_at: string; end_at: string; timezone: string; all_day: boolean; location: string | null; meeting_link: string | null;
  status: CalendarEventStatus; priority: Task["priority"]; assigned_employee_id: string | null; related_lead_id: string | null;
  related_client_id: string | null; related_project_id: string | null; meeting_notes: string | null; outcome: string | null;
  cancellation_reason: string | null; recurrence_frequency: RecurrenceFrequency | null; recurrence_interval: number; recurrence_until: string | null;
  parent_event_id: string | null; reschedule_count: number; google_sync_status: "Not connected" | "Draft" | "Approved" | "Synced" | "Sync failed";
  google_event_id: string | null; google_last_synced_at: string | null; created_at: string; updated_at: string;
}

export interface CalendarEventAttendee { id: string; event_id: string; name: string; email: string | null; employee_id: string | null; response_status: "Pending" | "Accepted" | "Declined" | "Tentative"; created_at: string; }
export interface CalendarEventReminder { id: string; event_id: string; minutes_before: number; channel: "Internal" | "Email draft" | "WhatsApp draft"; status: string; created_at: string; }

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
