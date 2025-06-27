# vetflow

A secure, web-based clinic-management platform for small-to-medium veterinary practices. VetFlow centralizes patient records, appointments, lab results, billing, inventory, compliance and audit trails, with automated scheduling, real-time alerts, role-based access, GDPR/HIPAA encryption, WCAG 2.1 AA accessibility, and scalable deployment via Supabase, Vercel, and CI/CD.

---

## Table of Contents

1. [Overview](#overview)  
2. [Features](#features)  
3. [Architecture](#architecture)  
4. [Installation](#installation)  
5. [Environment Variables](#environment-variables)  
6. [Running Locally](#running-locally)  
7. [Usage Examples](#usage-examples)  
8. [Components](#components)  
9. [Dependencies](#dependencies)  
10. [Contributing](#contributing)  
11. [License](#license)  

---

## Overview

VetFlow streamlines every aspect of veterinary clinic operations:

- **Patient Management**: CRUD, demographics, allergies  
- **Visit Recording**: Vitals, vaccinations, notes  
- **Appointment Calendar**: Booking, rescheduling, Google Calendar sync  
- **Automated Reminders**: Email reminders for upcoming appointments  
- **Billing & Invoicing**: PDF generation, email delivery  
- **Inventory Management**: Real-time stock, low-stock alerts  
- **Lab Results**: PDF storage, tagging, viewer  
- **Data Migration**: CSV/Google Sheets import, parity checks  
- **Security & Compliance**: Role-based access, AES-256 encryption, TLS 1.2+, audit logs  
- **Accessibility**: WCAG 2.1 AA via WAI-ARIA & TailwindCSS/Material UI  

---

## Features

- Secure authentication (login, logout, password reset)  
- Role-Based Access Control (RBAC)  
- Automated scheduling with email reminders  
- Real-time inventory monitoring & low-stock alerts  
- GDPR/HIPAA-compliant encryption and audit trails  
- Data migration and parity checks  
- WCAG 2.1 AA accessibility  
- Scalable deployment via Vercel (frontend), AWS Fargate (API), Supabase  

---

## Architecture

1. **Presentation Layer** (Next.js SPA)  
   - UI Components (e.g., `Sidebar.jsx`, `DashboardLayout.jsx`, `PatientForm.jsx`)  
   - Styling: TailwindCSS + Material Tailwind UI + WAI-ARIA  
2. **API Layer** (Node.js + Express)  
   - Entry Point: `server.js`  
   - Middleware: `errorhandlermiddleware.js`, `rbacmiddleware.js`, `auditlogger.js`  
   - Controllers & Services (e.g., `patientcontroller.js` + `patientservice.js`)  
   - Supabase DB with Row-Level Security & Auth  
3. **Background Workers & Scheduled Jobs**  
   - `emailreminderjob.js`, `lowstockjob.js`, `paritycheckjob.js`  
4. **DevOps & Monitoring**  
   - CI/CD via GitHub Actions  
   - Frontend deployed to Vercel; API to AWS Fargate  
   - Migrations via Supabase CLI  
   - Monitoring with Sentry & Datadog  

---

## Installation

```bash
# Clone the repo
git clone https://github.com/your-org/vetflow.git
cd vetflow

# Install dependencies
npm install        # or yarn install

# (Optional) Frontend dependencies
cd frontend
npm install
```

---

## Environment Variables

Create a `.env` in the root (and `/frontend` if needed) with:

```
# Supabase
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Auth & JWT
JWT_SECRET=your_jwt_secret

# Database (if used)
DATABASE_URL=postgres://user:pass@host:port/db

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key

# Google Calendar
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=yyy
GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth2callback

# Storage & Misc
STORAGE_BUCKET=vf-files
```

---

## Running Locally

```bash
# Start API
npm run dev          # uses nodemon on server.js

# Start Frontend (in /frontend)
npm run dev          # Next.js on http://localhost:3000
```

---

## Usage Examples

### 1. Authentication

```bash
# Login
POST /api/auth/login
Body: { "email": "vet@clinic.com", "password": "??????" }

# Protected request (bearer JWT)
GET /api/patients
Headers: { Authorization: "Bearer <token>" }
```

### 2. Create a Patient

```bash
POST /api/patients
Headers: { Authorization: "Bearer <token>" }
Body:
{
  "name": "Fido",
  "species": "Canine",
  "breed": "Beagle",
  "allergies": ["Peanuts"]
}
```

### 3. Book an Appointment

```bash
POST /api/appointments
Body:
{
  "patientId": 1,
  "start": "2024-08-15T10:00:00Z",
  "end": "2024-08-15T10:30:00Z",
  "notes": "Annual vaccination"
}
```

---

## Components

Below is a selection of core components, their file names, and responsibilities:

- **authenticationEndpointsHandler.js**  
  Handles login, logout, session retrieval, password reset (depends on `authService`).

- **writeOperationLogger.js**  
  Express middleware logging POST/PUT/DELETE operations to audit logs.

- **patientRecordManager.js**  
  Business logic for patient CRUD, validation, allergy checks.

- **syncGoogleCalendarAppointments.js**  
  Integrates with Google Calendar API to sync appointments.

- **appointmentReminderScheduler.js**  
  Scheduled job sending reminders for upcoming appointments.

- **generateInvoicePdf.js**  
  Generates invoice PDFs using PDFKit.

- **parseValidateImport.js**  
  Parses CSV/Google Sheets, validates schema, bulk imports.

- **maintenanceModeManager.js**  
  Toggles maintenance mode feature flag.

- **centralErrorHandler.js**  
  Global error handler for consistent HTTP responses.

- **roleBasedRouteGuard.js**  
  RBAC middleware enforcing permissions on protected routes.

- **supabaseAuthJwtManager.js** _(Fail status in plan)_  
  Wraps Supabase Auth to issue/validate JWTs.

- **transactionalEmailSender.js**  
  Sends transactional emails via SendGrid.

- **supabaseFileManager.js**  
  Manages file uploads via Supabase Storage.

- **calculateInvoiceTotals.js**, **stockLevelManager.js**, **veterinaryVisitRecorder.js**  
  Core business services.

- **appointmentEndpoints**, **invoiceEndpoints**, **patientVisitsEndpoints**, **inventoryStockEndpoints**, **csvSheetsImportController**, **labResultsFileEndpoints**  
  RESTful controllers for each domain.

- **Background Jobs**:  
  - `emailreminderjob.js`  
  - `lowstockjob.js`  
  - `paritycheckjob.js`

- **UI Components** (Next.js + Tailwind):  
  `Sidebar.jsx`, `TopNav.jsx`, `DashboardLayout.jsx`, `DataTable.jsx`,  
  `PatientForm.jsx`, `AppointmentCalendar.jsx`, `InvoiceForm.jsx`,  
  `LabResultsViewer.jsx`, `MigrationToolUI.jsx`

---

## Dependencies

- Runtime
  - Node.js >=14  
  - Express  
  - Next.js  
  - TailwindCSS, Material Tailwind UI  
  - @supabase/supabase-js  
  - @sendgrid/mail  
  - pdfkit  
  - csv-parser  
  - googleapis  
- DevOps
  - GitHub Actions  
  - Supabase CLI  
  - AWS Fargate (via Terraform/CDK)  
  - Vercel  

---

## Contributing

1. Fork the repo  
2. Create a feature branch (`git checkout -b feature/xyz`)  
3. Install & run locally, add tests  
4. Submit a pull request with clear description  

Please adhere to existing code style, add unit/integration tests, and update the README when you add features.

---

## License

MIT ? Your Organization Name

---

> For full design details & API docs, visit the project Google Doc:  
> https://docs.google.com/document/d/14k3y2jBKjN0LBQgyHQusXcanieFrYwonDGhzxw7fFRw/