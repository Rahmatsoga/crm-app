# Comprehensive Custom CRM Platform
## Production-Ready Product Requirement Document & Technical Architecture Blueprint

**Status:** Complete Phase 1 + 2 Roadmap  
**Version:** 2.0  
**Target Release:** Phase 1 (MVP), Phase 2 (Growth)  
**Built For:** B2B SaaS Sales Teams (1–100+ users)

---

## Table of Contents
1. [Executive Overview & Product Boundaries](#executive-overview)
2. [Phase 1: Core Must-Haves (The Non-Negotiable MVP)](#phase-1-core-must-haves)
3. [Phase 2: Growth & Competitive Nice-to-Haves](#phase-2-growth--competitive-nice-to-haves)
4. [Technical Architecture & Data Blueprint](#technical-architecture--data-blueprint)
5. [Integration Ecosystem & Data Flow](#integration-ecosystem--data-flow)
6. [Deployment & Go-Live Standards](#deployment--go-live-standards)

---

## Executive Overview

### Core Problem Statement

Sales teams struggle with four critical friction points that this CRM directly solves:

1. **Fragmented Communication**: Customer interactions scattered across email, phone, SMS, and messaging apps create incomplete customer profiles and duplicate follow-up efforts.

2. **Dropped Leads & Missed Opportunities**: Without centralized lead capture and automated routing, qualified prospects fall through cracks or languish in personal inboxes.

3. **Invisible Pipeline & Revenue Risk**: Sales managers lack real-time visibility into deal status, stage velocity, and revenue forecasting, forcing decisions based on gut feel rather than data.

4. **Repetitive Manual Work**: Sales reps waste 30–40% of time on admin (data entry, email logging, task creation) instead of selling.

**This CRM exists to:**
- Centralize all customer data in one searchable, accessible location
- Automate lead capture, qualification, and routing
- Provide real-time pipeline visibility and revenue forecasting
- Eliminate repetitive tasks through workflow automation
- Track every customer interaction (email, call, note, meeting) with full audit trail

---

### The Three Guiding Questions

Every feature in Phase 1 directly answers:

#### 1. **Who are our leads and customers?**
- Complete contact profiles with company, title, email, phone, and custom fields
- Duplicate prevention and data quality rules
- Lead scoring to identify highest-priority prospects
- Historical communication timeline for full context

#### 2. **Where are they in the sales process?**
- Visual pipeline showing each deal's current stage
- Time-in-stage reporting to identify bottlenecks
- Automated stage progression based on triggers
- Deal ownership and assignment tracking
- Win/loss status visibility

#### 3. **What exact action needs to happen next?**
- Task/activity queue with due dates and priority
- Automated task creation based on deal stage or workflow triggers
- Email follow-up sequences with tracking and reminders
- Calendar integration for meeting scheduling
- Clear owner assignments and accountability

---

## Phase 1: Core Must-Haves (The Non-Negotiable MVP)

> **Principle:** Phase 1 includes only features that **prevent a sales team from functioning**. Every feature here is non-negotiable for day-one operations. No Phase 2 features appear here.

### 1. Unified Contact & Account Management
**Criticality:** 10/10 | Foundation of entire CRM

#### Functional Requirements

**Contact Management:**
- Store unlimited contact records with first name, last name, email, phone, job title, company affiliation
- Support custom fields (text, select dropdowns, date, checkbox, number, currency, email, URL)
- Automatic duplicate detection by email address with merge-and-deduplicate workflow
- 360-degree contact view: all communication history, deals, tasks, and activities in chronological order
- Full-text search across contact names, emails, phone numbers, companies
- Bulk import (CSV) with field mapping and duplicate handling
- Contact tagging system for custom segmentation (e.g., "VIP," "Unresponsive," "Trial Expiring")
- Activity timeline showing every email, call, note, meeting, task mention, and stage change
- Contact status flags: Active, Inactive, Unresponsive, Not Qualified

**Account Management:**
- Separate Account (Company) records distinct from Contact records
- 1-to-many relationship: One Account → Multiple Contacts
- Account-level fields: company name, industry, company size, annual revenue (estimated), website, LinkedIn URL
- Primary contact assignment per account
- Account status: Prospect, Customer, Lost, Churned
- Parent account support for managing portfolio and subsidiary companies
- Account merge and deduplication workflow
- Activity timeline aggregating all contact activities under the account

**Data Integrity & Quality:**
- Email validation on save (syntax check)
- Phone number normalization to E.164 format for consistency
- Company name standardization via optional integration with data enrichment API
- Mandatory field enforcement (email, last name, or company required)
- Audit trail for all record changes (who changed what, when)

#### Database Schema Excerpt (PostgreSQL)

```sql
-- Users/Team table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'sales_rep', -- 'admin', 'sales_rep', 'manager'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_email (tenant_id, email)
);

-- Accounts (Companies) table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    company_size VARCHAR(50), -- '1-10', '11-50', '51-200', etc.
    annual_revenue DECIMAL(12,2),
    website VARCHAR(255),
    linkedin_url VARCHAR(255),
    phone VARCHAR(20),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_country VARCHAR(100),
    address_zip VARCHAR(20),
    status VARCHAR(50) DEFAULT 'prospect', -- 'prospect', 'customer', 'lost', 'churned'
    custom_fields JSONB DEFAULT '{}', -- Extensible custom field storage
    tags TEXT[] DEFAULT '{}', -- Array of tags for segmentation
    primary_contact_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (primary_contact_id) REFERENCES contacts(id),
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_tenant_name (tenant_id, account_name)
);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    account_id UUID,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    job_title VARCHAR(100),
    linkedin_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'unresponsive', 'not_qualified'
    lead_score INT DEFAULT 0, -- 0-100 for lead prioritization
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tenant_email (tenant_id, email),
    INDEX idx_tenant_account (tenant_id, account_id),
    INDEX idx_tenant_lead_score (tenant_id, lead_score DESC),
    INDEX idx_last_activity (tenant_id, last_activity_at)
);

-- Email deduplication detection
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_contacts_email_trgm ON contacts USING gin(email gin_trgm_ops);
```

---

### 2. Centralized Activity Feed & Interaction Log
**Criticality:** 10/10 | Complete interaction history

#### Functional Requirements

**Activity Types:**
- Email (incoming/outgoing with full body, attachments metadata)
- Call logs (duration, direction, outcome: completed/missed/declined)
- Meeting recaps (attendees, date, time, notes, next steps)
- Notes (freeform text logged against contact/deal/account)
- Task creation/completion events
- Deal stage changes with before/after state
- Contact field updates (audit trail)
- Workflow automation triggers (which automation ran and what actions were taken)

**Core Fields per Activity:**
- Type (email, call, meeting, note, task, automation_action)
- Title/Subject (auto-populated for emails, user-provided for notes)
- Description/Body (full text, searchable)
- Related Entity (Contact ID, Deal ID, Account ID)
- Created By (user who logged the activity)
- Created At (timestamp with timezone)
- Due Date (for tasks and follow-ups)
- Status (for tasks: pending, completed, overdue)
- Direction (for emails/calls: inbound/outbound)
- Metadata (email message ID, call recording link, meeting invitee list, etc.)

**Timeline Features:**
- Chronological activity feed on contact/deal records (newest first, optional reverse sort)
- Full-text search across activity descriptions, notes, email bodies
- Filter activities by type (show only emails, calls, notes, etc.)
- Filter by date range, user, status
- Attachment preview inline (images, PDFs, documents)
- Thread grouping for email conversations (automatically linked by subject + participants)

**Email Activity Integration:**
- Automatic email logging from Gmail/Outlook (via OAuth) without manual action
- Parse email metadata: To, From, CC, BCC, Subject, Date, Body, Attachments
- Store email message ID for threading and reply tracking
- Email body searchable in activity feed
- Email recipient auto-linked to contact records by email address
- Company domain auto-linked to account record

**Call Activity Logging:**
- Manual call log creation with duration, direction (inbound/outbound), outcome (completed/missed/declined/voicemail)
- Call recording link storage (if integrated with VoIP system)
- Call notes field
- Missed call alerts with option to trigger automated follow-up task

**Meeting Recap Logging:**
- User creates meeting recap: attendees (auto-linked to contacts), date, location/call link, agenda/notes, action items
- Automatic Google Calendar sync (see-only or read-write depending on permission)
- Meeting reminder 24 hours before scheduled time
- Post-meeting task creation for action items

**Audit Trail Requirements:**
- All activities immutable once created (no deletions, only soft-deletes with audit log)
- Soft delete records the deleting user and timestamp
- History table tracking all edits to critical fields (contact name change, deal value change, stage change)

#### Database Schema Excerpt

```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'email', 'call', 'meeting', 'note', 'task', 'stage_change', 'automation_action'
    subject VARCHAR(255),
    description TEXT,
    contact_id UUID,
    deal_id UUID,
    account_id UUID,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID,
    deleted_at TIMESTAMP,
    metadata JSONB DEFAULT '{}', -- Extensible for email_message_id, call_duration, recording_url, etc.
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (deleted_by) REFERENCES users(id),
    
    INDEX idx_tenant_contact (tenant_id, contact_id, created_at DESC),
    INDEX idx_tenant_deal (tenant_id, deal_id, created_at DESC),
    INDEX idx_tenant_type (tenant_id, type, created_at DESC),
    INDEX idx_tenant_created_by (tenant_id, created_by, created_at DESC)
);

CREATE TABLE activity_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_activity_history (activity_id, changed_at DESC)
);

CREATE TABLE email_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    thread_key VARCHAR(255) UNIQUE NOT NULL, -- Hash of (contact_email, subject) for grouping
    contact_id UUID NOT NULL,
    account_id UUID,
    last_activity_at TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_tenant_contact_thread (tenant_id, contact_id, last_activity_at DESC)
);
```

---

### 3. Visual Deal Pipeline & Opportunity Tracker
**Criticality:** 10/10 | Real-time pipeline visibility

#### Functional Requirements

**Pipeline Configuration:**
- Support multiple pipelines per tenant (for different products, sales motions, or teams)
- Each pipeline has named stages in defined sequence (e.g., "New," "Qualified," "Demo Scheduled," "Proposal Sent," "Negotiation," "Won," "Lost")
- Stages are reorderable and customizable (no fixed default sequence)
- Mark stage as "win" stage (closes deal as won) or "loss" stage (closes deal as lost)

**Deal Management:**
- Unique deal record per opportunity
- Core fields: Deal Title, Account, Primary Contact, Deal Value (currency with symbol support), Probability (0–100%), Expected Close Date, Assigned Owner (user), Current Stage
- Optional fields: Deal Description, Deal Source (which channel/campaign), Lost Reason (if lost), Won Reason (if won)
- Deal status: Open, Won, Lost (calculated from stage)
- Custom fields (JSONB) for additional data per deal
- Deal timeline showing all activities (emails, calls, notes, task completions, stage changes) in chronological order

**Kanban Board Visual:**
- Drag-and-drop deal cards between stage columns
- Each card shows: Deal Title, Deal Value, Probability, Expected Close Date, Owner name, Contact name, Account name
- Color-coding option: by owner, by source, by probability bracket
- Card preview on hover showing full deal details
- Clicking card opens deal detail panel with full history and editing capability
- Search bar filters deals by title, account, contact, or owner name
- Filter by deal status (Open/Won/Lost) and date range
- Bulk actions: reassign deals, update probability, change close date

**Pipeline Metrics (Real-time Calculation):**
- Total pipeline value (sum of all open deals)
- Count of deals by stage
- Average deal value
- Win rate % (won deals / won + lost deals)
- Average time-in-stage (days) per stage (identifies bottlenecks)
- Conversion rate stage-to-stage (% deals progressing from stage N to N+1)
- Expected revenue this month/quarter (sum of deal values × probability)

**Deal Progression Rules:**
- Automatic stage advancement based on workflow trigger (e.g., "When proposal email sent, move to Proposal Sent stage")
- Prevent stage regression without approval (configurable, e.g., Sales Rep can move backward, Manager approval required)
- Mandatory fields per stage (e.g., "Demo Scheduled" stage requires meeting date)
- Warning if deal in stage > X days without activity (stale deal alert)

**Probability & Revenue Weighting:**
- Each stage has default probability (e.g., New=10%, Qualified=25%, Demo=50%, Proposal=75%, Negotiation=90%, Won=100%)
- Sales rep can override probability per deal (with audit trail)
- Weighted pipeline = sum of (deal value × probability) for all open deals
- Forecast chart showing expected revenue by month based on expected close dates

#### Database Schema Excerpt

```sql
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL, -- Sequence in pipeline
    default_probability INT DEFAULT 50,
    is_win_stage BOOLEAN DEFAULT FALSE,
    is_loss_stage BOOLEAN DEFAULT FALSE,
    mandatory_fields TEXT[] DEFAULT '{}', -- Fields required for stage entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
    UNIQUE (pipeline_id, stage_order),
    INDEX idx_pipeline_order (pipeline_id, stage_order)
);

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pipeline_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tenant_pipelines (tenant_id)
);

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pipeline_id UUID NOT NULL,
    deal_title VARCHAR(255) NOT NULL,
    account_id UUID NOT NULL,
    primary_contact_id UUID,
    deal_value DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    probability INT DEFAULT 50, -- 0-100, can override stage default
    expected_close_date DATE NOT NULL,
    assigned_owner UUID NOT NULL,
    current_stage_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'won', 'lost'
    won_date DATE,
    lost_date DATE,
    lost_reason VARCHAR(255),
    deal_source VARCHAR(100), -- 'referral', 'inbound', 'campaign', 'cold_outreach', etc.
    custom_fields JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (primary_contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_owner) REFERENCES users(id),
    FOREIGN KEY (current_stage_id) REFERENCES pipeline_stages(id),
    
    INDEX idx_tenant_status (tenant_id, status, expected_close_date),
    INDEX idx_tenant_owner (tenant_id, assigned_owner, status),
    INDEX idx_tenant_account (tenant_id, account_id),
    INDEX idx_expected_close (tenant_id, expected_close_date)
);

CREATE TABLE deal_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL,
    from_stage_id UUID,
    to_stage_id UUID NOT NULL,
    moved_by UUID NOT NULL,
    moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    days_in_previous_stage INT,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
    FOREIGN KEY (from_stage_id) REFERENCES pipeline_stages(id),
    FOREIGN KEY (to_stage_id) REFERENCES pipeline_stages(id),
    FOREIGN KEY (moved_by) REFERENCES users(id),
    INDEX idx_deal_history (deal_id, moved_at DESC)
);
```

---

### 4. Task & Follow-up Engine
**Criticality:** 9/10 | Drives accountability and follow-up cadence

#### Functional Requirements

**Task Creation:**
- Manual task creation: user specifies title, description, due date, priority, assigned owner, linked contact/deal
- Automated task creation via workflow (see Workflow Automation section)
- Task types: Follow-up Email, Phone Call, Meeting Prep, Document Preparation, Proposal Send, Demo Scheduling, Contract Review, etc.
- Recurring tasks: option for weekly, bi-weekly, monthly, or custom recurrence
- Task dependency: Task B cannot be marked complete until Task A is done

**Task Management:**
- Task list view with filtering: My Tasks, Team Tasks, Overdue, Due Today, Due This Week, Due This Month
- Task detail panel showing: title, description, due date, assignee, priority, linked contact/deal, related activities, comments
- Status tracking: Not Started, In Progress, Completed, Cancelled
- Completion: User marks task complete with optional completion notes/comments
- Bulk actions: reassign multiple tasks, change due dates, mark multiple tasks complete

**Reminders & Notifications:**
- Email reminder 1 day before due date (configurable per user)
- In-app notification 2 hours before due date
- Overdue tasks appear in red on task lists and in daily dashboard
- Daily digest of overdue, due today, and due within 3 days (sent at 9 AM user timezone)

**Task Linking & Context:**
- Each task links to one or more contacts and deals (multi-link supported)
- Related activities shown inline: previous calls with this contact, recent emails, current deal stage
- Task comment thread: team members can add comments and @mention colleagues
- Attachments: upload files (proposals, documents, etc.) to tasks

**Priority & Time Estimation:**
- Priority levels: Low, Medium, High, Critical
- Estimated time to complete (in minutes, used for workload management)
- Actual time logged (optional, for team metrics)

#### Database Schema Excerpt

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    assigned_to UUID NOT NULL,
    assigned_by UUID NOT NULL,
    created_by UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    task_type VARCHAR(100),
    estimated_minutes INT,
    actual_minutes_spent INT,
    completion_notes TEXT,
    completed_at TIMESTAMP,
    completed_by UUID,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'bi_weekly', 'monthly', 'custom'
    recurrence_end_date DATE,
    parent_task_id UUID, -- For recurring task template
    depends_on_task_id UUID, -- For task dependencies
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id),
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id),
    
    INDEX idx_tenant_assigned (tenant_id, assigned_to, due_date),
    INDEX idx_tenant_status (tenant_id, status, due_date),
    INDEX idx_overdue (tenant_id, due_date, status)
);

CREATE TABLE task_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'deal', 'account'
    entity_id UUID NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE (task_id, entity_type, entity_id),
    INDEX idx_task_entities (task_id)
);

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_task_comments (task_id, created_at DESC)
);
```

---

### 5. Email Integration & Bidirectional Email Sync
**Criticality:** 10/10 | Primary customer communication channel

#### Functional Requirements

**Email Account Connection:**
- OAuth 2.0 integration with Gmail and Microsoft Outlook
- Secure token storage (encrypted at rest in database)
- Token refresh handling (automatic refresh before expiry)
- User disconnects email and reconnects without data loss

**Outbound Email Sending:**
- Compose email in CRM (WYSIWYG editor with rich text, links, tables)
- Add recipients from contacts database (auto-complete by name or email)
- Email templates (save as template, insert variables like {{contact.first_name}})
- CC/BCC support with optional logging control (can hide BCC from CRM log if needed)
- Email signature auto-append (per user)
- Send via user's Gmail or Outlook account (preserves email continuity for customer)
- Scheduled send: queue email to send at specific date/time
- Delivery confirmation: mark email as sent and log in activity feed

**Inbound Email Capture:**
- Monitor user's Gmail inbox or Outlook for incoming emails
- Auto-detect email recipients and senders, link to existing contacts or create new contacts
- Auto-link email to contact record based on sender email address
- Auto-link email to company based on email domain (e.g., user@company.com → Company "Company" in CRM)
- Full email body stored in activity feed (searchable)
- Attachments metadata logged (filename, size, type; actual files optional to store)
- Email threading: group related emails by subject and participants into conversation thread
- Flag important emails for follow-up (user manually flags or automation rule)

**Email Engagement Tracking:**
- Open tracking: inject tracking pixel, record when email opened (timestamp, location if available)
- Click tracking: shorten links with tracking, record when link clicked (timestamp, which link)
- Reply tracking: auto-capture when customer replies to email sent from CRM
- Unsubscribe management: detect unsubscribe headers, allow users to unsubscribe contacts

**Email Sync Scheduling:**
- Sync user's inbox every 5 minutes (or configurable interval)
- Bidirectional: capture inbound emails AND sync sent emails back from user's email client
- Manual sync button: force immediate sync if user wants real-time pull
- Sync status indicator showing last sync time and any errors

**Privacy & Compliance:**
- Honor "Do Not Track" preferences per contact
- GDPR consent tracking: log if contact opted into email communication
- Unsubscribe list management: auto-add unsubscribed contacts to do-not-contact list
- Email footer auto-append: add company name, address, unsubscribe link per compliance requirements

#### Database Schema Excerpt

```sql
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook'
    access_token TEXT NOT NULL ENCRYPTED, -- Encrypted storage
    refresh_token TEXT NOT NULL ENCRYPTED,
    token_expires_at TIMESTAMP,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    is_connected BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, user_id, email_address),
    INDEX idx_user_connected (user_id, is_connected)
);

CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    external_message_id VARCHAR(255), -- Gmail message ID or Outlook internet message ID
    from_email VARCHAR(255) NOT NULL,
    to_email TEXT NOT NULL, -- CSV of recipients
    cc_email TEXT, -- CSV
    bcc_email TEXT, -- CSV
    subject VARCHAR(255),
    body TEXT,
    body_html TEXT,
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    sent_by_user UUID, -- User who sent (for outbound)
    received_by_user UUID, -- User's inbox this was sent to (for inbound)
    email_account_id UUID,
    contact_id UUID, -- Primary contact (sender/recipient as appropriate)
    deal_id UUID,
    thread_id UUID, -- Link to email_threads
    is_opened BOOLEAN DEFAULT FALSE,
    first_open_at TIMESTAMP,
    last_open_at TIMESTAMP,
    open_count INT DEFAULT 0,
    links_clicked INT DEFAULT 0,
    received_at TIMESTAMP,
    sent_at TIMESTAMP,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by_user) REFERENCES users(id),
    FOREIGN KEY (received_by_user) REFERENCES users(id),
    FOREIGN KEY (email_account_id) REFERENCES email_accounts(id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
    FOREIGN KEY (thread_id) REFERENCES email_threads(id),
    
    INDEX idx_tenant_direction (tenant_id, direction, received_at DESC),
    INDEX idx_contact_emails (contact_id, received_at DESC),
    INDEX idx_external_message_id (external_message_id)
);

CREATE TABLE email_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'opened', 'link_clicked', 'bounced', 'unsubscribed'
    event_timestamp TIMESTAMP NOT NULL,
    link_url VARCHAR(500), -- For link_clicked events
    ip_address INET,
    user_agent TEXT,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_email_tracking (email_id, event_timestamp DESC)
);
```

---

### 6. Lead Management & Automated Lead Capture
**Criticality:** 10/10 | Revenue growth depends on quality lead flow

#### Functional Requirements

**Lead Capture Channels:**

**Web Forms:**
- Embedded form builder (WYSIWYG): create custom forms with text, email, phone, dropdown, textarea fields
- Single-step and multi-step forms (progressive disclosure)
- Form submission webhook: POST lead data to CRM API with authentication
- Duplicate detection: check if email already exists before creating contact
- Auto-link to company based on company domain or email domain
- Lead capture compliance: add checkbox for email consent (GDPR/CCPA)

**Email Lead Capture:**
- Forwarding email address (e.g., leads@company-crm.com)
- Any email sent to this address auto-creates contact from sender info (if not exists)
- Body of email captured as lead note
- Attachments saved as lead documents

**Import:**
- Bulk CSV import with field mapping UI
- Duplicate detection by email during import
- Validation errors reported per row

**LinkedIn/Apollo Integration (Phase 1 Lite):**
- Manual lead creation from LinkedIn prospect search (user copies name, email, company, pastes into CRM)
- Apollo API integration: search prospects by company/title, create contact
- Optional data enrichment (see below)

**Lead Scoring & Prioritization:**
- Automatic lead scoring based on rule engine:
  - Email domain is known customer domain: +10 points
  - Job title matches target titles: +15 points
  - Company size matches target range: +10 points
  - Completed specific form field: +5 points
  - Email opened: +2 points per open
  - Link clicked in email: +3 points per click
  - Custom scoring rules per tenant configuration
- Lead score displayed prominently on contact record
- Scoring recalculated nightly or on-demand
- Filter/sort contacts by lead score for prioritization

**Lead Routing & Assignment:**
- Round-robin assignment: new leads automatically assigned to next available rep (rotation)
- Territory-based assignment: assign lead to rep if company matches territory
- Manual reassignment: manager can override and manually assign
- Lead assignment rules engine: IF [criteria] THEN assign to [rep or team]
- Assignment notification: assigned rep receives email notification of new lead

**Lead Status Workflow:**
- Contact status progression: New Lead → Qualified → Contacted → Interested → Not Interested
- Lead qualification criteria (customizable): required fields before marking "Qualified"
- Automatic status update based on workflow triggers (e.g., "When email opened, status = Interested")

**Lead Activity Tracking:**
- Track all interactions with lead: emails, calls, forms submitted, pages visited (via tracking pixel on website)
- Activity history linked to lead score changes (show why score increased/decreased)

#### Database Schema Excerpt

```sql
CREATE TABLE lead_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source_name VARCHAR(100) NOT NULL, -- 'web_form', 'email_forward', 'import', 'api', 'linkedin'
    source_type VARCHAR(50),
    config JSONB DEFAULT '{}', -- Form ID, email address, API key, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, source_name)
);

CREATE TABLE lead_scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(50), -- 'email_domain', 'job_title', 'company_size', 'form_field', 'activity'
    condition_value VARCHAR(255),
    points INT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_enabled (tenant_id, enabled)
);

CREATE TABLE lead_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(50), -- 'territory', 'company', 'score_range', 'source'
    condition_value VARCHAR(255),
    assigned_to_user_id UUID,
    assigned_to_team_id UUID,
    routing_method VARCHAR(50) DEFAULT 'round_robin', -- 'round_robin', 'least_loaded', 'manual'
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
    INDEX idx_tenant_enabled (tenant_id, enabled)
);

CREATE TABLE lead_form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    source_id UUID NOT NULL,
    contact_id UUID,
    form_data JSONB NOT NULL, -- All form field values
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    referrer_url VARCHAR(500),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES lead_sources(id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    INDEX idx_tenant_submissions (tenant_id, submitted_at DESC)
);
```

---

### 7. Workflow Automation Engine (Basic)
**Criticality:** 9/10 | Eliminates repetitive tasks

#### Functional Requirements

**Visual Workflow Builder (No-Code):**
- Drag-and-drop workflow canvas
- Three components: Triggers, Conditions, Actions
- Save and activate/deactivate workflows without code

**Triggers:**
- New contact created
- Contact field updated (e.g., email added, status changed)
- Email received (inbound email on contact)
- Email opened (tracked engagement)
- Email link clicked
- Deal created
- Deal stage changed
- Deal value changed
- Task completed
- Manual trigger (user runs workflow on-demand)
- Scheduled trigger (runs daily at X time, weekly on day X, etc.)

**Conditions:**
- IF contact.lead_score > 50
- IF contact.email_domain contains "@company.com"
- IF deal.value > $50,000
- IF deal.expected_close_date < TODAY + 7 days
- AND/OR logic for combining conditions
- Null checks (field is empty, field is not empty)

**Actions:**
- Create contact (if not exists)
- Create task (with title, due date, assigned to)
- Update contact field (set status = Qualified, set lead_score = 75)
- Update deal field (set probability = 85, set stage = Proposal Sent)
- Send email (choose template or compose new)
- Send email sequence (follow-up emails at day 1, 3, 5, 7)
- Create activity/note on contact
- Assign contact to user (round-robin or specific user)
- Add tag to contact
- Trigger another workflow (chain workflows)
- Webhook call (POST to external system, e.g., Zapier)

**Workflow Execution & Logging:**
- Workflow runs immediately (for trigger-based) or on schedule (for scheduled)
- Execution history: show each workflow run, what actions executed, any errors
- Test mode: preview workflow on sample record without committing changes
- Execution log: all workflow activity logged for audit trail
- Rate limiting: prevent infinite loops (no workflow can run > 1000 times per hour)

**Common Pre-built Workflows:**
- Template: "New Lead Auto-Assign"
  - Trigger: New contact created
  - Action: Assign to next available sales rep (round-robin)
  - Action: Create task "Follow up with lead"
  - Action: Send template email "Welcome to Company"
- Template: "High-Value Lead Prioritization"
  - Trigger: Contact created + lead_score > 75
  - Action: Add tag "High Priority"
  - Action: Assign to senior sales rep
  - Action: Create task "Schedule discovery call" with priority=High

#### Database Schema Excerpt

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    workflow_name VARCHAR(100) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL, -- 'contact_created', 'deal_stage_changed', 'email_opened', etc.
    trigger_config JSONB DEFAULT '{}', -- Trigger-specific config (e.g., schedule time)
    is_enabled BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tenant_enabled (tenant_id, is_enabled)
);

CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    step_order INT NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'condition', 'action'
    condition_type VARCHAR(50), -- For condition steps
    condition_operator VARCHAR(20), -- 'equals', 'contains', 'greater_than', etc.
    condition_value VARCHAR(255),
    condition_logic VARCHAR(10) DEFAULT 'AND', -- How to combine with previous condition
    action_type VARCHAR(50), -- For action steps
    action_config JSONB DEFAULT '{}', -- Action-specific config
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    UNIQUE (workflow_id, step_order),
    INDEX idx_workflow_steps (workflow_id)
);

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    trigger_entity_type VARCHAR(50), -- 'contact', 'deal', etc.
    trigger_entity_id UUID,
    execution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    executed_actions JSONB DEFAULT '{}', -- Log of actions that ran
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    INDEX idx_workflow_executions (workflow_id, started_at DESC)
);
```

---

### 8. Basic Reporting & Pipeline Analytics
**Criticality:** 8/10 | Data-driven decision making

#### Functional Requirements

**Core Reports:**

**Pipeline Report:**
- Total pipeline value (sum of all open deals)
- Count of deals by stage
- Average deal value
- Conversion rate by stage (% deals progressing stage-to-stage)
- Time-in-stage average (days in each stage)
- Filterable by: date range, owner, account, source
- Chart types: bar chart (count by stage), line chart (pipeline value trend over time)

**Sales Rep Performance Report:**
- Deals won by rep
- Total revenue by rep (closed deals only)
- Pipeline value by rep
- Win rate by rep (won / won + lost)
- Average deal size by rep
- Conversion rate by rep
- Time to close average by rep
- Filterable by: date range, month/quarter/year
- Sortable by any column

**Forecast Report:**
- Expected revenue this month/quarter based on expected close dates and probabilities
- Actual vs. expected (if month is closed)
- Rep-level forecast
- By pipeline breakdown
- Trend line showing forecast accuracy over time

**Lead Source Report:**
- Leads captured by source (web form, email, import, etc.)
- Leads converted to opportunity by source
- Cost-per-lead if cost data provided
- Conversion rate by source
- Revenue influenced by source

**Activity Report:**
- Total emails sent/received by rep
- Total calls logged by rep
- Total notes created
- Average response time to emails
- Filterable by date range, rep, contact

**Customizable Dashboard:**
- Drag-and-drop dashboard tiles
- Tile types: metric card (single KPI), bar chart, line chart, table
- Save multiple dashboards (e.g., "Sales Manager Dashboard," "Executive Dashboard")
- Set dashboard as default for role

**Export Options:**
- Export any report to CSV or PDF
- Scheduled reports: email report to users daily/weekly/monthly

#### Database Schema Excerpt

```sql
CREATE TABLE saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    report_name VARCHAR(100) NOT NULL,
    report_type VARCHAR(50), -- 'pipeline', 'sales_rep', 'forecast', 'lead_source', 'custom'
    filters JSONB DEFAULT '{}', -- Saved filter state
    chart_type VARCHAR(50), -- 'bar', 'line', 'table'
    created_by UUID NOT NULL,
    is_public BOOLEAN DEFAULT FALSE, -- Can other users view?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tenant_reports (tenant_id)
);

-- Reporting is mostly done via materialized views and aggregation queries
-- Example: Monthly pipeline snapshot for trend analysis
CREATE MATERIALIZED VIEW pipeline_snapshots AS
SELECT 
    DATE_TRUNC('day', d.created_at)::DATE as snapshot_date,
    d.tenant_id,
    d.assigned_owner,
    ps.stage_name,
    COUNT(DISTINCT d.id) as deal_count,
    SUM(d.deal_value * d.probability / 100) as weighted_value,
    SUM(d.deal_value) as total_value
FROM deals d
JOIN pipeline_stages ps ON d.current_stage_id = ps.id
WHERE d.status = 'open'
GROUP BY snapshot_date, d.tenant_id, d.assigned_owner, ps.stage_name;

CREATE INDEX idx_pipeline_snapshots ON pipeline_snapshots(tenant_id, snapshot_date DESC);
```

---

### 9. Role-Based Access Control (RBAC)
**Criticality:** 8/10 | Data security and compliance

#### Functional Requirements

**Role Hierarchy:**

**Admin Role:**
- Full system access
- User management: create, edit, deactivate users
- Workflow creation and modification
- Report access: all reports
- Settings: modify CRM configuration, pipeline stages, custom fields, email templates
- Data export: full CRM data export
- Team management: create teams, assign users to teams

**Manager Role:**
- View own and team's contacts, deals, activities
- Create and assign tasks to team members
- View team performance reports (pipeline, conversion, win rate)
- Cannot modify system settings, workflows, or users
- Cannot view other teams' data

**Sales Rep Role:**
- Full CRUD on own contacts and deals
- View only team members' contacts/deals (read-only)
- Cannot view other sales reps' or teams' data
- Cannot create users or modify workflows
- Cannot access admin/reporting settings
- Can create and complete own tasks

**Custom Role (Future):**
- Ability to define granular permissions per role

**Permission Model:**
- All data access is tenant-isolated (users cannot see other tenants' data)
- Users can only access data they created, are assigned to, or their team manages
- Sharing: owner can explicitly share record with specific users or teams

**API Access Control:**
- API keys generated per user (for integrations)
- Rate limits per API key
- API scopes: read-only, read-write, admin

#### Database Schema Excerpt

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    role_name VARCHAR(50) NOT NULL,
    description TEXT,
    permissions TEXT[] DEFAULT '{}', -- Array of permission strings
    is_system_role BOOLEAN DEFAULT FALSE, -- System roles: admin, manager, sales_rep
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, role_name)
);

ALTER TABLE users ADD COLUMN role_id UUID;
ALTER TABLE users ADD FOREIGN KEY (role_id) REFERENCES roles(id);

CREATE TABLE record_sharing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type VARCHAR(50) NOT NULL, -- 'contact', 'deal', 'account'
    record_id UUID NOT NULL,
    shared_with_user_id UUID,
    shared_with_team_id UUID,
    permission VARCHAR(20) DEFAULT 'read', -- 'read', 'edit'
    shared_by UUID NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by) REFERENCES users(id),
    UNIQUE (record_type, record_id, COALESCE(shared_with_user_id, shared_with_team_id))
);
```

---

## Phase 2: Growth & Competitive Nice-to-Haves

### Phase 2 Overview

Phase 2 launches **after Phase 1 is stable and in production with active users**. These features transform the MVP into a sophisticated, competitive CRM platform. **No Phase 2 features block Phase 1 go-live.**

---

### 1. Omnichannel Two-Way Communication Engine
**Priority:** High | Enables modern buyer engagement

#### Features

- **Unified Inbox:** WhatsApp, SMS, Instagram DM, Facebook Messenger all in one message stream
- **Two-Way Sync:** Bi-directional sync with messaging platforms
- **Reply from CRM:** Sales rep replies to WhatsApp message from within CRM, message sent from user's WhatsApp account
- **Conversation Threading:** All messages from one contact/account grouped into threads
- **Engagement Automation:** Workflow triggers on "message received," "message opened," "link clicked," etc.
- **Business Phone Number:** Dedicated phone number for SMS/WhatsApp (optional BYOT—bring your own twilio account)

#### Integration Targets (Phase 2)
- WhatsApp Business API
- Twilio (SMS, WhatsApp)
- Facebook Messenger Platform
- Instagram Direct Messages
- Telegram Bot API

---

### 2. Visual Workflow Automation Engine (Advanced)
**Priority:** High | Power-users need sophisticated automation

#### Enhancements Over Phase 1

- **Conditional Branches:** IF/ELSE logic for complex workflows
- **Delay Actions:** "Wait 3 days, then send email" 
- **Loop Actions:** "For each contact in segment, create task"
- **API Webhooks:** Call external APIs (Zapier, Make, custom endpoints) as action
- **Approval Gates:** Workflow pauses for manager approval before continuing
- **Bulk Workflow Runs:** Execute workflow on multiple records at once
- **Workflow Versioning & Rollback:** Save workflow versions, rollback if needed
- **Performance Analytics:** Track workflow execution count, avg runtime, error rate

---

### 3. Calendar Integration & Meeting Scheduling
**Priority:** High | Essential for deal progression

#### Features

- **Calendar Sync:** Read/write access to Google Calendar or Outlook calendar
- **Embedded Booking Link:** Generate shareable booking link (Calendly-like) for prospects
- **Auto-Calendar:** When meeting created in CRM, add to calendar; when meeting added to calendar, sync to CRM
- **Meeting Reminders:** Notification 15 min, 1 hour, 1 day before meeting
- **Meeting Recaps:** Post-meeting, create activity, log attendees, capture notes
- **Time Zone Handling:** Display meeting time in attendee's timezone
- **Availability Sync:** Show team member's free/busy status for scheduling

---

### 4. Sales Forecasting & Pipeline Analytics (Advanced)
**Priority:** Medium | C-level decision support

#### Features

- **Weighted Pipeline:** Forecast revenue by multiplying deal value × stage probability
- **Scenario Modeling:** "What if we improve conversion by 5%?" model
- **Historical Accuracy Tracking:** Compare predicted vs. actual revenue to improve future forecasts
- **Influence Analysis:** Which activities (calls, emails, demos) correlate with deal close?
- **Cohort Analysis:** Track deal progression by cohort (leads from same month/source)
- **Attrition Analysis:** Identify stages/reps where deals drop off most
- **Revenue by Dimension:** Revenue by rep, by source, by segment, by product line
- **Export to BI Tools:** Native Google Looker Studio, Power BI, Tableau connectors

---

### 5. Data Enrichment & Prospecting Intelligence
**Priority:** Medium | Accelerates qualification

#### Features

- **Auto-Enrichment on Import:** When lead imported, auto-fill company size, industry, LinkedIn URL, etc.
- **Apollo.io Integration:** Search prospects by company/title/keyword, one-click add to CRM
- **Hunter.io Integration:** Find email addresses for new contacts
- **LinkedIn Integration:** Pull profile info, auto-link to LinkedIn URL
- **Firmographic Data:** Company size, funding, technology stack, growth rate
- **Technographic Data:** What tools does company use? (for competitive targeting)
- **Job Change Alerts:** Get notified when key decision-maker changes roles or companies
- **Company News Monitoring:** Get alerts when company news published (funding, acquisition, new product)

---

### 6. AI-Powered Features (MCP Protocol)
**Priority:** Medium | Next-generation productivity

#### Features (Phase 2)

- **Call/Meeting Transcript Summarization:** Upload call recording, auto-generate summary and action items
- **Smart Email Drafting:** "Draft reply to customer objection about pricing" → AI generates draft
- **Lead Research Assistant:** "Tell me about this company's funding" → AI researches and summarizes
- **Deal Insights:** "What's blocking this deal?" → AI analyzes communication, activities, deal metadata
- **Competitor Tracking:** "Show me deals where competitor X is mentioned" → AI identifies mentions in notes/emails
- **Custom Prompts:** CRM users can define custom AI prompts for repeating queries

#### Implementation
- **MCP (Model Context Protocol)** connectivity with Claude, ChatGPT, other LLMs
- **Artifact Generation:** AI-generated documents, proposals, outreach sequences
- **One-Click Export:** Export AI output to email draft, task, note, or document

---

### 7. Client-Facing Portal & Self-Service Tools
**Priority:** Low-Medium | Reduces admin, increases conversion

#### Features

- **Customer Portal Login:** Prospects/customers log in to view proposal status, contract e-signatures, shared documents
- **Embedded Proposal Viewer:** Client views proposal with watermark, download restrictions
- **E-Signature Integration:** Integrate DocuSign or HelloSign for contract signing in CRM
- **Self-Service Lead Forms:** Multi-step lead capture forms with conditional logic
- **Branded Landing Pages:** No-code landing page builder with form capture
- **Customer Health Dashboard:** Customer can see license usage, support tickets, renewal date
- **Payment Collection:** Accept payments directly in portal (Stripe integration)

---

### 8. Mobile App (iOS & Android)
**Priority:** Medium | Field sales enablement

#### Features

- **Full CRM Access on Mobile:** Contacts, deals, tasks, activities, pipeline
- **Offline Mode:** Access records when offline, sync when back online
- **Business Card Scanning:** Snap photo of business card, OCR extracts contact info
- **Call Logging:** Log incoming/outgoing calls, auto-link to contact
- **Note Voice Transcription:** Record voice note, auto-transcribe and save
- **Push Notifications:** Receive alerts for assigned tasks, overdue items, new leads
- **Map View:** Show all contacts/accounts on map by geography

---

### 9. Advanced Customization & No-Code Configuration
**Priority:** Low-Medium | Enterprise self-service

#### Features

- **Custom Dashboard Builder:** Drag-and-drop custom KPI dashboards
- **Custom Report Builder:** SQL-like interface for building custom reports
- **Field Visibility Rules:** Show/hide fields based on role or stage
- **Validation Rules:** Custom data validation (e.g., "Probability must be 0–100")
- **Computed Fields:** Define fields calculated from other fields (e.g., Days in Stage = TODAY - Stage Change Date)

---

## Technical Architecture & Data Blueprint

### Database Architecture

#### Core Technology Stack (Phase 1)

**Database:** PostgreSQL 15+
- Reason: ACID compliance, JSONB for extensible custom fields, native array support, excellent indexing, FTS (full-text search)
- Sizing: Start 10 GB, horizontal scaling via read replicas

**Caching Layer:** Redis 7+
- Use cases: Session store, rate limiting, real-time dashboard aggregations, email sync job queue
- TTL: 1 hour for most cache entries

**Search (Optional Phase 1):** PostgreSQL FTS (full-text search) built-in
- Reason: Avoid external dependency for MVP; pg_trgm extension for typo-tolerant search
- Phase 2: Elasticsearch for advanced search analytics

**File Storage:** AWS S3 or Google Cloud Storage
- Store: Email attachments, task documents, profile photos
- Retention: 7 years (compliance)

#### Multi-Tenancy Design

All core tables include `tenant_id` UUID as first foreign key:
- Enforces data isolation at database level
- Supports multiple customers in single database
- Enables per-tenant customization without schema changes
- Query filters always include `WHERE tenant_id = ?` to prevent data leakage

Example:
```sql
SELECT * FROM contacts 
WHERE tenant_id = $1 AND account_id = $2;
```

#### Key Indexes for Performance

**Contacts Table:**
```sql
-- Speed up contact searches by email
CREATE INDEX idx_tenant_email ON contacts(tenant_id, email);

-- Speed up "My contacts" queries
CREATE INDEX idx_tenant_account ON contacts(tenant_id, account_id);

-- Speed up lead scoring/sorting
CREATE INDEX idx_tenant_lead_score ON contacts(tenant_id, lead_score DESC);

-- Speed up activity timeline queries
CREATE INDEX idx_last_activity ON contacts(tenant_id, last_activity_at DESC);
```

**Deals Table:**
```sql
-- Speed up "My deals" and "Deals by stage" queries
CREATE INDEX idx_tenant_status ON deals(tenant_id, status, expected_close_date);

-- Speed up "Sales rep's pipeline" queries
CREATE INDEX idx_tenant_owner ON deals(tenant_id, assigned_owner, status);

-- Speed up forecasting (group by expected close date)
CREATE INDEX idx_expected_close ON deals(tenant_id, expected_close_date);
```

**Activities Table:**
```sql
-- Speed up activity timeline on contact record
CREATE INDEX idx_tenant_contact ON activities(tenant_id, contact_id, created_at DESC);

-- Speed up activity timeline on deal record
CREATE INDEX idx_tenant_deal ON activities(tenant_id, deal_id, created_at DESC);

-- Speed up filtering by activity type
CREATE INDEX idx_tenant_type ON activities(tenant_id, type, created_at DESC);
```

**Tasks Table:**
```sql
-- Speed up "My tasks" and "Overdue" views
CREATE INDEX idx_tenant_assigned ON tasks(tenant_id, assigned_to, due_date);

-- Speed up "Overdue task" alerts
CREATE INDEX idx_overdue ON tasks(tenant_id, due_date, status);
```

---

### Recommended Tech Stack

| Layer | Component | Technology | Rationale |
|-------|-----------|------------|-----------|
| **Frontend** | Web App | Next.js 14+ (React) | Modern, full-stack, built-in optimization, Vercel deploy |
| | UI Components | Radix UI + Tailwind CSS | Accessible, unstyled components + utility CSS |
| | Drag-and-Drop | @dnd-kit | Performant, accessible drag-drop library |
| | State Management | React Query (TanStack Query) + Zustand | Server state + client state, minimal boilerplate |
| | Real-time | Socket.io or Pusher | Live updates to pipeline, tasks, notifications |
| | **Backend** | API Server | Node.js + Express or Fastify | JavaScript full-stack, fast, minimal overhead |
| | ORM | Prisma | Type-safe DB queries, auto-migrations, excellent DX |
| | Authentication | NextAuth.js | OAuth, email/password, session management |
| | Email Sync | Nylas SDK or Supabase | Manage Gmail/Outlook OAuth, email events |
| | Job Queue | Bull (Redis-backed) | Async: email sync, workflow execution, reports |
| | **Database** | RDBMS | PostgreSQL 15+ | ACID, JSONB, FTS, multi-tenancy support |
| | Caching | Redis 7+ | Session, rate limiting, real-time aggregations |
| | Search | pg_trgm (Phase 1), Elasticsearch (Phase 2) | Full-text search, typo tolerance |
| | **Hosting** | Compute | AWS EC2 / Google Cloud Run / Railway | Scalable, managed services |
| | Database | AWS RDS / Heroku Postgres / Supabase | Managed postgres with backup, HA |
| | Storage | AWS S3 / Google Cloud Storage | Email attachments, documents |
| | CDN | Cloudflare | Static assets, API caching, DDoS protection |

---

### API Design (RESTful)

**Base URL:** `https://api.crm.example.com/v1`

**Authentication:** Bearer token (JWT) with 24-hour expiry + refresh token

**Rate Limiting:** 1000 requests per minute per API key

**Response Format:**
```json
{
  "status": "success",
  "data": { /* resource */ },
  "errors": null
}
```

**Pagination:**
```json
{
  "data": [ /* array of results */ ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "page_size": 20,
    "total_pages": 50
  }
}
```

**Core Endpoints (Phase 1):**

```
# Contacts
GET    /contacts
POST   /contacts
GET    /contacts/{id}
PATCH  /contacts/{id}
DELETE /contacts/{id}
GET    /contacts/{id}/activities
POST   /contacts/{id}/activities

# Accounts
GET    /accounts
POST   /accounts
GET    /accounts/{id}
PATCH  /accounts/{id}

# Deals
GET    /deals
POST   /deals
GET    /deals/{id}
PATCH  /deals/{id}
PUT    /deals/{id}/stage  # Move deal to new stage

# Pipeline
GET    /pipelines
GET    /pipelines/{id}/stages
GET    /pipelines/{id}/stats  # Pipeline metrics

# Tasks
GET    /tasks
POST   /tasks
GET    /tasks/{id}
PATCH  /tasks/{id}
PUT    /tasks/{id}/complete

# Activities
GET    /activities
GET    /activities/{id}

# Email
POST   /emails/send
GET    /emails
POST   /email-accounts/connect
GET    /email-accounts/sync-status

# Workflows
GET    /workflows
POST   /workflows
PATCH  /workflows/{id}
POST   /workflows/{id}/execute

# Reports
GET    /reports/pipeline
GET    /reports/sales-rep
GET    /reports/forecast
POST   /reports/export
```

---

## Integration Ecosystem & Data Flow

### Phase 1 Integrations

**Required (Out of Box):**
1. Gmail (OAuth 2.0) — Email sync, send, open/click tracking
2. Outlook (OAuth 2.0) — Email sync, send, open/click tracking
3. Google Calendar (OAuth 2.0) — Meeting sync, availability
4. Zapier / Make — Webhook-based integrations to 1000+ apps

**Recommended:**
5. Slack — Notifications for assigned tasks, pipeline alerts
6. Stripe (if accepting payments) — Log payments in deal record
7. Databox / Google Looker Studio — Export reports for dashboards

### Phase 2 Integrations

1. Apollo.io — Lead search and prospecting
2. Hunter.io — Email finding
3. Twilio — SMS and WhatsApp
4. Gong / Otter.ai — Call recording and transcription
5. DocuSign — E-signatures on proposals
6. Segment — Customer data platform sync
7. Salesforce — Data sync if moving off Salesforce
8. HubSpot — Migration tool for existing HubSpot users

---

## Deployment & Go-Live Standards

### Pre-Launch Checklist

- [ ] Database performance tested at 100k contacts, 50k deals
- [ ] All Phase 1 features tested and working
- [ ] Email sync tested (Gmail + Outlook) with 100+ emails
- [ ] Workflows tested end-to-end with all trigger types
- [ ] RBAC tested: verify data isolation by role
- [ ] Backup and restore tested and documented
- [ ] API rate limiting tested under load
- [ ] Mobile responsiveness verified on all major devices
- [ ] GDPR compliance: data export, deletion, consent tracking implemented
- [ ] Security audit: SQL injection, XSS, CSRF prevention verified
- [ ] Admin dashboard ready for tenant management, user provisioning
- [ ] Support documentation and video tutorials recorded
- [ ] Incident response plan documented

### Post-Launch Monitoring

- Uptime monitoring: PagerDuty or equivalent
- Application performance monitoring (APM): New Relic or Datadog
- Database query monitoring: Slow query log, index health
- Error tracking: Sentry for frontend and backend errors
- User analytics: Segment or Mixpanel for feature adoption tracking

---

## Success Metrics (Phase 1)

- **Adoption:** ≥50% of sales team logging in daily by week 4
- **Data Quality:** ≥90% of contacts have email address, company, and job title
- **Email Sync:** ≥95% of inbound emails auto-linked to contacts within 5 minutes
- **Task Completion:** ≥70% of assigned tasks completed on-time
- **User Satisfaction:** NPS ≥40 within 8 weeks of go-live

---

## Appendix: Phasing Roadmap

```
PHASE 1 (MVP) — Months 1–3
├── Contact & Account Management
├── Activity Feed
├── Visual Pipeline
├── Tasks
├── Email Integration
├── Lead Management
├── Basic Workflows
├── Reporting
├── RBAC
└── Go-Live

PHASE 2 (GROWTH) — Months 4–8
├── Omnichannel Communication
├── Advanced Workflows
├── Calendar Integration
├── Sales Forecasting
├── Data Enrichment
├── AI Features (MCP)
├── Client Portal
├── Mobile App
└── Advanced Customization
```

---

**Document Version:** 2.0  
**Last Updated:** August 2026  
**Next Review:** Monthly during Phase 1 development
