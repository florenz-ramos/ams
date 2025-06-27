# Attendance Management System (AMS) Dashboard

## Overview
This project is a modern, modular project management dashboard built with Next.js, Supabase, and shadcn/ui. The system is designed to be **flexible and extensible**: each organization can create and manage its own "Projects" to represent different processes or workflows (such as Enrollment, Attendance, etc.).

### Why Projects?
- **Modular by Design:** Instead of hardcoding features globally, the system lets each organization owner add and manage their own processes as "Projects".
- **Flexible Workflows:** Projects can represent any process (e.g., Enrollment, Attendance, Document Management, etc.), allowing organizations to tailor the system to their needs.
- **Separation of Concerns:** Each project is a container for a specific workflow, making it easy to manage, customize, and extend.
- **Scalable:** Organizations can have multiple projects (e.g., different enrollment periods, types, or custom workflows) without code changes.

## Key Features
- **Project Templates:** Create projects from configurable templates stored in Supabase (e.g., Enrollment, Attendance Management System) with requirements and user targets.
- **Faculty Attendance:** Log, edit, and view faculty attendance with dynamic time slots (e.g., MORNING IN, AFTERNOON OUT).
- **Student Enrollment:** Manage student application and enrollment as a project, with customizable numbering and status workflows.
- **Sidebar Navigation:** Sidebar items are generated based on project requirements.
- **Modern UI:** All UI components use shadcn/ui for consistency and accessibility.
- **Supabase Integration:** All data is stored and managed via Supabase.

## Recent Major Changes & Fixes
- **Supabase-Based Templates:**
  - Project templates are now stored in Supabase instead of local JSON files.
  - Templates are dynamically loaded from the `templates` table.
  - Added migration script to set up the templates table.
- **Server Action for Template Loading:**
  - The `getTemplate` Server Action now fetches templates from Supabase.
  - Improved reliability and build stability.
- **TypeScript & ESLint Compliance:**
  - All `any` types have been replaced with explicit types for `Faculty`, `AttendanceRecord`, `TimeSlot`, and `Project`.
  - All unused variables and linter warnings have been resolved.
  - All React hooks have correct dependency arrays.
- **UI Consistency:**
  - All form elements, tables, dialogs, and buttons use shadcn/ui components.
- **Build Stability:**
  - The project now builds cleanly with `npm run build` and passes all type and lint checks.

## Setup Instructions
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Set up your environment:**
   - Configure your Supabase credentials in a `.env` file:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```
3. **Set up templates in Supabase:**
   ```bash
   node scripts/setup-templates.js
   ```
4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. **Build for production:**
   ```bash
   npm run build
   ```

## How to Add a New Project Template
1. Add a new template to the `templates` table in Supabase with the following fields:
   - `name`: Unique identifier (e.g., 'enrollment', 'attendance')
   - `type`: Display name (e.g., 'Enrollment', 'Attendance')
   - `default_name`: Default project name
   - `default_description`: Default project description
   - `user_targets`: Array of user target roles
   - `requirements`: Array of project requirements
2. The template will automatically appear in the dashboard's project type selector.

## How Enrollment and Attendance Work
- Each process (like Enrollment or Attendance) is managed as a separate project.
- Projects can have their own data, workflows, and settings (e.g., numbering, status, analytics).
- Owners can create multiple projects for different periods or types as needed.

## Troubleshooting
- If you encounter persistent build/type errors, ensure all API routes use the correct handler signature and that no stale files remain in `.next`.
- Use the Server Action (`getTemplate`) for all server-side template loading.
- Make sure your Supabase service role key has the necessary permissions to create tables and insert data.

---

For more details, see the code and comments throughout the project.
