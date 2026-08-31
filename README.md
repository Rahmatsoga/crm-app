# XYZ Software House — CRM

## 📋 Overview

A production-ready, role-based Customer Relationship Management (CRM) system built for software houses to manage clients, sales pipeline, projects, invoices, documents, tasks, and support tickets — with **database-level access control** and **structured activity tracking**.

This CRM eliminates scattered spreadsheets and email threads by centralizing all client interactions, deal progress, and team collaboration in one secure workspace.

**Status:** MVP Phase 1 (Activity Feed ✅ | Email Integration 🔄)

---

## ✨ Current Features (Week 1 Complete)

### ✅ Core Functionality
- **Client Management** - Complete contact profiles with company details, status tracking, and search
- **Sales Pipeline** - Visual deal tracking with stage progression and win/loss management
- **Task Management** - Actionable to-do items with due dates and priority filtering
- **Support Tickets** - Issue tracking for customer support cases
- **Project Tracking** - Milestone management for won deals with team members
- **Document Management** - Secure file storage per client/project
- **Activity Timeline** - Chronological interaction log with multiple activity types (note, email, call, meeting, task)
- **Role-Based Access Control** - Database-level RLS policies for Admin, Sales, and Support roles
- **Real-time Collaboration** - Shared client view across teams with audit trails

### 📊 Dashboard & Reporting
- KPI overview with pipeline visualization
- Client count and status breakdown
- Deal pipeline summary
- Quick metrics view

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React 18 + Vite | Fast, modern development |
| **Authentication** | Supabase Auth | Built-in OAuth support |
| **Database** | PostgreSQL (Supabase) | ACID compliance + RLS security |
| **Real-time** | Supabase Realtime | WebSocket subscriptions |
| **Storage** | Supabase Storage | Integrated file management |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Routing** | React Router v6 | Client-side navigation |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account (free tier works)

### Installation

1. **Clone repository**
```bash
git clone https://github.com/Rahmatsoga/crm-app.git
cd crm-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Supabase**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Open SQL Editor and run **in this order**:
     1. `database/crm_supabase_schema.sql` (base tables)
     2. `database/crm_rls_hardening.sql` (security policies)
     3. `database/storage_rls_policies.sql` (file permissions)

4. **Configure environment**
```bash
cp .env.example .env.local
```

Then update `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. **Add redirect URL**
   - Supabase → Authentication → URL Configuration
   - Add: `http://localhost:5173/reset-password`

6. **Run development server**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📝 User Roles & Permissions

### Admin
- ✅ Full system access
- ✅ View all clients, deals, tickets
- ✅ User management
- ✅ Settings & configuration
- ✅ Reporting & analytics

### Sales Rep
- ✅ Own assigned clients
- ✅ Create/manage deals
- ✅ View team members' clients (read-only)
- ✅ Create tasks & activities
- ✅ Access personal dashboard

### Support
- ✅ Assigned tickets only
- ✅ View linked clients/projects
- ✅ Create notes & activities
- ✅ Cannot create deals

**All permissions enforced at database level using PostgreSQL RLS policies.**

---

## 📚 Database Schema

### Core Tables

**clients** - Company/individual contacts
```sql
- id, name, email, phone, company_name
- status (lead/active/inactive)
- created_by, assigned_rep_id
- created_at, updated_at
```

**deals** - Sales opportunities
```sql
- id, client_id, title, stage, value, probability
- expected_close_date, assigned_owner_id
- status (open/won/lost)
- won_date, lost_date, lost_reason
```

**tasks** - Action items
```sql
- id, title, description, due_date
- assigned_to, assigned_by, status
- priority, completed_at
```

**activities** - Interaction log ⭐ NEW (Week 1)
```sql
- id, type (note/email/call/meeting/task_completed)
- subject, description, client_id, deal_id
- created_by, created_at
```

**tickets** - Support cases
```sql
- id, subject, description, status
- client_id, assigned_to
```

**projects** - Deal-related work
```sql
- id, deal_id, title, status
- milestones, members, updates
```

---

## 🔐 Security Features

### Row-Level Security (RLS)
Every table has PostgreSQL RLS policies enforcing:
- Users see only their tenant's data
- Sales reps see only assigned clients
- Support staff see only assigned tickets

### Email Verification
- Signup requires email confirmation
- Password reset via secure link
- Token expiry: 24 hours

### Audit Trail
- All changes tracked with timestamp
- User attribution for every action
- Soft-delete with audit history

### CORS & API Security
- Supabase handles CORS automatically
- Row-level security prevents unauthorized access
- Service-to-service auth via service role key

---

## 🎯 Development Roadmap

### ✅ Phase 1: Core MVP (Weeks 1-6) - IN PROGRESS
- [x] Week 1: **Activity Feed** - Complete ✅
- [ ] Week 2-3: **Email Integration** - In Progress 🔄
- [ ] Week 3-4: **Lead Capture** - Planned
- [ ] Week 4-5: **Workflow Automation** - Planned
- [ ] Week 5-6: **User Management UI** - Planned

### 🟡 Phase 2: Enhancement (Weeks 7-12)
- [ ] Deal metadata (value, probability, close date)
- [ ] Advanced reporting & analytics
- [ ] Performance optimization
- [ ] Security hardening

### 🟢 Phase 3: Growth (Months 4-6)
- [ ] Omnichannel communication (WhatsApp, SMS)
- [ ] Calendar integration (Google, Outlook)
- [ ] Sales forecasting
- [ ] Data enrichment (Apollo.io, Hunter.io)
- [ ] Client portal
- [ ] Mobile app

---

## 📊 Feature Completion Matrix

| Feature | Status | Priority |
|---------|--------|----------|
| Contact Management | ✅ Basic | Critical |
| Activity Timeline | ✅ Complete | Critical |
| Deal Pipeline | ✅ Basic | Critical |
| Tasks | ✅ Basic | Critical |
| Email Integration | 🔄 In Progress | Critical |
| Lead Capture | ⏳ Planned | Critical |
| Workflow Automation | ⏳ Planned | Critical |
| Reporting | ✅ Minimal | High |
| Role-Based Access | ✅ Full | High |
| Integrations | ⏳ Planned | Medium |

**Overall Completion: 31% (Week 1 MVP)**

---

## 🧪 Testing

### Manual Testing Checklist

**Activity Feed**
- [x] Add activity (note, email, call, meeting)
- [x] View activities in chronological order
- [x] Delete activity
- [x] Multiple roles see same activities (RLS working)
- [x] Timestamps display correctly
- [x] Activity types show icons

**Access Control**
- [x] Admin can see all clients
- [x] Sales rep sees only assigned clients
- [x] Support sees only assigned tickets
- [x] Unauthorized access blocked at DB level

### Automated Testing (Upcoming)
- Unit tests for components
- Integration tests for Supabase queries
- E2E tests for critical flows

---

## 📦 Project Structure

```
crm-app/
├── src/
│   ├── components/
│   │   ├── ActivityFeed.jsx          ⭐ NEW (Week 1)
│   │   ├── ClientForm.jsx
│   │   ├── DealPipeline.jsx
│   │   ├── TaskList.jsx
│   │   └── ...
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Clients.jsx
│   │   ├── ClientDetail.jsx
│   │   ├── Pipeline.jsx
│   │   ├── Tasks.jsx
│   │   ├── Tickets.jsx
│   │   ├── Projects.jsx
│   │   ├── Invoices.jsx
│   │   ├── Documents.jsx
│   │   └── Auth/
│   │       ├── SignUp.jsx
│   │       ├── SignIn.jsx
│   │       └── ResetPassword.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── App.jsx
│   └── index.css
├── database/
│   ├── crm_supabase_schema.sql
│   ├── crm_rls_hardening.sql
│   └── storage_rls_policies.sql
├── public/
├── .env.example
├── vite.config.js
├── package.json
└── README.md
```

---

## 🔌 API Integration Points (Planned)

### Week 2: Email Integration
- **Gmail OAuth** - Connect user Gmail account
- **Gmail API** - Fetch emails, send from CRM
- **Email Webhook** - Auto-log incoming emails
- **Open/Click Tracking** - Track customer engagement

### Week 3-4: Lead Capture
- **Web Forms** - Embedded form builder
- **Form Submission Webhook** - Auto-create contacts
- **Lead Scoring API** - Prioritize leads
- **CSV Import** - Bulk lead import

### Week 4-5: Workflow Automation
- **Supabase Functions** - Trigger-based automation
- **Webhook System** - External integrations
- **Scheduled Jobs** - pg_cron for recurring tasks

---

## 📈 Performance Notes

### Database Query Optimization
- B-tree indexes on frequently filtered columns
- Composite indexes for multi-column queries
- Query result caching via Supabase Realtime
- Pagination for large datasets

### Frontend Performance
- Code splitting via Vite
- Lazy loading of routes
- React memo for component optimization
- Supabase connection pooling

### Expected Load Capacity
- **100+ concurrent users** - Supabase handles automatically
- **10k+ clients** - Queries <500ms with indexes
- **100k+ activities** - Pagination required

---

## 🚨 Known Limitations

1. **Email Integration (Week 2)** - Currently requires manual note entry. Gmail sync coming.
2. **Mobile App** - No native mobile app yet. Responsive design works on tablets.
3. **Calendar Sync** - Not integrated. Manual date entry required.
4. **Advanced Automation** - Basic workflows only. Conditional logic coming Phase 2.
5. **Reporting** - Dashboard only. Detailed reports coming Phase 2.

---

## 🤝 Contributing

### Setup for Contributors
```bash
git clone https://github.com/Rahmatsoga/crm-app.git
git checkout -b feature/your-feature
npm install
npm run dev
```

### Code Standards
- Use React functional components with hooks
- Keep components under 300 lines
- Extract reusable logic to custom hooks
- Use Supabase client singleton
- Follow Tailwind class naming

### Commit Convention
```
feat: Add activity feed component
fix: Resolve RLS policy for tasks
docs: Update README with Week 1 completion
```

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Commit with descriptive messages
4. Push to branch
5. Open pull request with description

---

## 📞 Support & Contact

### Issues & Bug Reports
- GitHub Issues: [Report a bug](https://github.com/Rahmatsoga/crm-app/issues)
- Include: Steps to reproduce, expected vs actual, browser/OS

### Feature Requests
- GitHub Discussions: [Request a feature](https://github.com/Rahmatsoga/crm-app/discussions)
- Vote on planned features
- Comment on roadmap items

### Questions?
- Check README.md
- Search existing issues
- Review database schema in `/database` folder

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎉 Acknowledgments

Built with:
- [React](https://react.dev) - UI framework
- [Supabase](https://supabase.com) - Backend & Database
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Vite](https://vitejs.dev) - Build tool

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Lines of Code** | ~2,500+ |
| **Components** | 12+ |
| **Database Tables** | 10+ |
| **RLS Policies** | 8+ |
| **Development Time (Phase 1)** | 1 week |
| **Team Size** | 1-2 developers |
| **Target Users** | Software house teams (5-50 people) |

---

## 🚀 Next Steps

### Immediate (Week 2)
- [x] Activity Feed deployment ✅
- [ ] Email integration setup 🔄
- [ ] Gmail OAuth configuration
- [ ] Email sync testing

### Short Term (Month 1)
- [ ] Lead capture forms
- [ ] Workflow automation builder
- [ ] Advanced reporting

### Medium Term (Months 2-3)
- [ ] Omnichannel communication
- [ ] Calendar integration
- [ ] Mobile app
- [ ] Data enrichment

---

**Last Updated:** August 31, 2026  
**Status:** Active Development  
**Phase 1 Progress:** 31% Complete (Activity Feed ✅)
