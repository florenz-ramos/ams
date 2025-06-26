# Attendance Management System (AMS) Dashboard

## Overview
This project is a modern project management dashboard built with Next.js, Supabase, and shadcn/ui. It focuses on project templates, especially an Attendance Management System for faculty and students. The dashboard features dynamic project creation, flexible attendance schemas, and a clean, modern UI.

## Key Features
- **Project Templates:** Create projects from configurable templates (e.g., Attendance Management System) with requirements and user targets.
- **Faculty Attendance:** Log, edit, and view faculty attendance with dynamic time slots (e.g., MORNING IN, AFTERNOON OUT).
- **Sidebar Navigation:** Sidebar items are generated based on project requirements.
- **Modern UI:** All UI components use shadcn/ui for consistency and accessibility.
- **Supabase Integration:** All data is stored and managed via Supabase.

## Recent Major Changes & Fixes
- **Removed Problematic API Route:**
  - The dynamic API route at `src/app/api/template/[template]/route.ts` was causing persistent build/type errors and has been deleted.
- **Server Action for Template Loading:**
  - A new Server Action (`getTemplate`) was created in `src/lib/actions.ts` to load project templates directly from the filesystem, replacing the old API route.
  - The dashboard now uses this Server Action to fetch templates, improving reliability and build stability.
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
   - Configure your Supabase credentials in a `.env` file.
3. **Run the development server:**
   ```bash
   npm run dev
   ```
4. **Build for production:**
   ```bash
   npm run build
   ```

## How to Add a New Project Template
1. Add a new JSON file to `src/lib/templates/` (e.g., `my-template.json`).
2. Use the dashboard to create a new project and select your template.

## How Attendance Works
- Each faculty member can have multiple time slots per day (e.g., MORNING IN, AFTERNOON OUT).
- Only the last occurrence of each label is displayed in the table.
- Attendance can be added or edited via a modal dialog.

## Troubleshooting
- If you encounter persistent build/type errors, ensure all API routes use the correct handler signature and that no stale files remain in `.next`.
- Use the Server Action (`getTemplate`) for all server-side template loading.

---

For more details, see the code and comments throughout the project.
