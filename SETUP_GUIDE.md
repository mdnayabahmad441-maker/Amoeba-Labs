# Groenics - Setup Guide

## Step 1: Create Supabase Database Tables

1. Go to your Supabase project: https://supabase.co/
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire SQL script below and paste it

### SQL Script (Copy & Run)

```sql
-- Create ventures table
CREATE TABLE ventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active', -- Active, Inactive, Planning
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create schools table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Lead', -- Lead, Active, Inactive, Closed
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  source VARCHAR(100), -- Referral, Website, Cold Call, Event, etc.
  stage VARCHAR(50) DEFAULT 'New Lead', -- New Lead, Contacted, Demo Scheduled, Proposal Sent, Negotiation, Closed Won, Closed Lost
  notes TEXT,
  next_follow_up DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High, Urgent
  status VARCHAR(50) DEFAULT 'To Do', -- To Do, In Progress, Done, Cancelled
  assigned_to VARCHAR(255),
  related_school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create reminders table
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  reminder_date DATE NOT NULL,
  notes TEXT,
  related_school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id UUID NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Draft', -- Draft, Sent, Paid, Overdue, Cancelled
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_schools_venture_id ON schools(venture_id);
CREATE INDEX idx_schools_status ON schools(status);
CREATE INDEX idx_leads_venture_id ON leads(venture_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_tasks_venture_id ON tasks(venture_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_reminders_venture_id ON reminders(venture_id);
CREATE INDEX idx_reminders_reminder_date ON reminders(reminder_date);
CREATE INDEX idx_invoices_venture_id ON invoices(venture_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE ventures ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create a default venture for NaySha Educore (run this AFTER the table creation)
-- INSERT INTO ventures (venture_name, description, status) 
-- VALUES ('NaySha Educore', 'School management and education platform', 'Active');
```

**After running the SQL:**
1. Go to **Table Editor** to verify all 6 tables were created
2. Note the venture ID that was created (or manually insert NaySha Educore if needed)

---

## Step 2: Enable Supabase Authentication

1. In your Supabase project, go to **Authentication** → **Providers**
2. Enable **Email/Password** (required for this project)
3. Optionally enable **Google** for OAuth
4. Go to **Settings** → **Auth** and ensure these are set:
   - **Site URL**: `http://localhost:3000` (development)
   - **Redirect URLs**: 
     - `http://localhost:3000/auth/callback`
     - `https://yourdomain.com/auth/callback` (for production)
5. Copy your **Anon Key** and **Service Role Key** (you'll need these)

---

## Step 3: Add Environment Variables

Update your `.env.local` file with these variables:

```env
# Existing (already have)
NEXT_PUBLIC_SUPABASE_URL=https://ynbnjapjrtrdjekokseo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYm5qYXBqcnRyZGpla29rc2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Mjk3MTMsImV4cCI6MjA5NjEwNTcxM30.Y1FFAXRDiLgLmq8cqdh4HQLVUX5xjVhN0vKGKWXQdNk

# NEW - Add these (get from Supabase Settings → API)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

## Step 4: Verification Checklist

- [ ] All 6 tables created in Supabase
- [ ] Default venture "NaySha Educore" exists
- [ ] Supabase Auth enabled with Email/Password
- [ ] Environment variables updated in `.env.local`
- [ ] Ready to run implementation

---

## Next

Once you've completed Steps 1-4, respond with "READY" and I'll:
1. Build the complete portal authentication system
2. Create all reusable components
3. Implement all 7 modules with full CRUD operations
4. Deploy production-ready code
