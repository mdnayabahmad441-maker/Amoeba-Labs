# 🎯 Quick Start Guide - Amoeba Labs Portal

## ✅ You've Completed Setup Steps 1-3!

You have:
1. ✅ Created all 6 Supabase tables
2. ✅ Enabled Supabase Authentication  
3. ✅ Updated environment variables

---

## 📌 Step 5: Add the Default Venture

Run this SQL in your Supabase SQL Editor to create the default venture:

```sql
INSERT INTO ventures (venture_name, description, status) 
VALUES (
  'NaySha Educore', 
  'School management and education platform', 
  'Active'
);
```

This venture will automatically be used by the dashboard and all modules.

---

## 🚀 Step 6: Start the Application

```bash
npm run dev
```

Open http://localhost:3000

---

## 🔐 Step 7: Create Your First Account

1. Go to http://localhost:3000/auth/signup
2. Create your account
3. You'll be logged in automatically
4. Redirected to `/portal` dashboard

---

## 📊 Step 8: Start Using the System

### Dashboard (`/portal`)
- View all statistics
- See upcoming tasks
- Check recent activity

### Schools (`/portal/schools`)
- ➕ Add your first school
- 🔍 Search and filter
- ✏️ Edit school details
- 🗑️ Delete schools

### Leads (`/portal/leads`)
- ➕ Create new leads
- 📈 Track sales pipeline stages
- 📅 Schedule follow-ups
- 🎯 Monitor progress

### Tasks (`/portal/tasks`)
- ➕ Create tasks
- 🎯 Set priority levels
- ✅ Track status
- 📅 Manage due dates

### Reminders (`/portal/reminders`)
- ➕ Set reminders
- 📋 Check completion status
- 📅 View upcoming
- ✅ Mark as done

### Billing (`/portal/billing`)
- 💰 Create invoices
- 📊 Track revenue
- 📈 View payment status
- 💼 Manage invoices

### Ventures (`/portal/ventures`)
- 🚀 Add new ventures
- 📝 Manage descriptions
- 🔄 Change status
- 📈 Grow portfolio

---

## 🔗 Key URLs

| Page | URL |
|------|-----|
| Home | http://localhost:3000 |
| Login | http://localhost:3000/auth/login |
| Signup | http://localhost:3000/auth/signup |
| Dashboard | http://localhost:3000/portal |
| Schools | http://localhost:3000/portal/schools |
| Leads | http://localhost:3000/portal/leads |
| Tasks | http://localhost:3000/portal/tasks |
| Reminders | http://localhost:3000/portal/reminders |
| Billing | http://localhost:3000/portal/billing |
| Ventures | http://localhost:3000/portal/ventures |

---

## ⚠️ Important Notes

### All data is stored in Supabase
- No hardcoded demo data
- Every record is real and persisted
- Changes sync instantly

### Search and Filters
- Search works across multiple fields
- Filters are real-time
- Case-insensitive matching

### Relationships
- Schools link to Ventures
- Leads link to Ventures
- Tasks can link to Schools/Leads
- Reminders can link to Schools/Leads
- Invoices link to Schools

---

## 🐛 Troubleshooting

### Getting "No active venture found" error?
**Solution**: Run the SQL to insert the NaySha Educore venture (Step 5 above)

### Login not working?
**Solution**: Check that Supabase Auth is enabled and Email/Password provider is active

### Data not showing up?
**Solution**: Make sure you're using the correct `venture_id` - verify in Supabase

### Styles look broken?
**Solution**: Run `npm install` and restart dev server

---

## 📝 Creating Test Data

### Add a Test School
```
School Name: Demo School
Owner: John Doe
Email: john@demoschool.com
Phone: +91-9999999999
City: Mumbai
State: Maharashtra
Status: Lead
```

### Add a Test Lead
```
School Name: Future Academy
Contact: Jane Smith
Email: jane@futureacademy.com
Phone: +91-8888888888
Source: Referral
Stage: New Lead
Follow-up: [Pick any date]
```

### Add a Test Invoice
```
School: [Pick any school]
Amount: 50000
Invoice #: INV-001
Due Date: [Pick a date]
Status: Draft
```

---

## 🎨 Customize

The system is fully customizable:
- Change colors in Tailwind classes
- Modify form fields in each module
- Add new database columns and update types
- Extend with new modules

---

## 📚 Documentation

- [Complete Implementation Guide](./IMPLEMENTATION_COMPLETE.md)
- [Setup Instructions](./SETUP_GUIDE.md)
- [TypeScript Types](./lib/types.ts)

---

## ✨ You're All Set!

Your production-ready Amoeba Labs portal is ready to use. All systems are operational and fully integrated with Supabase.

**Happy Building! 🚀**
