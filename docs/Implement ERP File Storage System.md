# AI Prompt — Implement ERP File Storage System

## Context

We are building an **ERP platform** with multiple modules such as:

- Tasks
- Fleet
- Inventory
- CRM
- HR
- Finance
- Projects

We need to implement a **centralized file storage system** so users can upload and attach files to different records across the ERP.

The frontend component responsible for selecting and uploading files is:

```
CustomColumnEditorContent.tsx
```

This component allows the user to:

- choose files
- upload media
- attach documents to ERP records

Files may include images, PDFs, voice recordings, videos, and other documents.

---

# Task

You are a **senior backend/database engineer**.

Your task is to:

1. **Analyze the current database schema**
2. **Design a scalable file storage architecture**
3. **Generate a database migration**
4. Ensure the solution works well with **Supabase/Postgres**

---

# Requirements

## 1. Centralized Storage System

The ERP must support storing files for multiple modules.

Files must be attachable to records such as:

- task
- fleet_vehicle
- fleet_driver
- inventory_item
- crm_contact
- hr_employee
- project
- finance_record

The system must be **generic and reusable**.

---

# Supported File Types

The system must support:

### Images

- jpg
- jpeg
- png
- gif
- webp

### Documents

- pdf
- doc
- docx
- xls
- xlsx

### Audio

- mp3
- wav
- ogg

### Video

- mp4
- mov
- webm

---

# Core Features

## File Upload

Users can upload files from the UI.

Supported features:

- drag and drop
- upload progress
- multiple file upload

---

## File Storage

Files will be stored in a storage service such as:

- Supabase Storage

## File Metadata

All file metadata must be stored in the database.

Required fields:

| Field        | Type      | Description            |
| ------------ | --------- | ---------------------- |
| id           | uuid      | primary key            |
| file_name    | text      | original file name     |
| file_type    | text      | mime type              |
| file_size    | integer   | size in bytes          |
| storage_path | text      | path in storage bucket |
| storage_url  | text      | public or signed URL   |
| module       | text      | module name            |
| module_id    | uuid      | record reference       |
| uploaded_by  | uuid      | user id                |
| created_at   | timestamp | upload time            |

---

# Database Requirements

## Table: `files`

This table stores metadata for all uploaded files.

The table must include:

- UUID primary key
- relation to `auth.users`
- indexes for performance
- optional relation to module records

Example structure:

```
files
-----
id uuid primary key
file_name text
file_type text
file_size integer
storage_path text
storage_url text
module text
module_id uuid
uploaded_by uuid
created_at timestamp
```

---

# Additional Requirements

### Indexes

Add indexes for:

```
module
module_id
uploaded_by
created_at
```

---

### Security

Implement:

- file size limits
- allowed mime types
- role based access control
- row level security (RLS)

Example policies:

- users can view files belonging to their tenant
- users can upload files
- only owners or admins can delete files

---

# File Preview Requirements

The frontend should support: remeber i use it in table

### Image Preview

render `<img>` in circle in the table

### PDF Preview

Title in the table

### Audio

Title in the table

### Video

Title in the table

---

# File Actions

The system must support:

### Upload

store file in storage bucket

### Download

retrieve via signed URL

### Delete

remove from:

- storage bucket
- database record

---

# Acceptance Criteria

The feature is complete when:

- users can upload files
- files are stored in storage
- metadata saved in database
- files can be previewed
- files can be downloaded
- files can be deleted
- file records can be linked to ERP modules

---

# Expected Output From AI

Generate the following:

1. **SQL Migration**
   - create `files` table
   - indexes
   - foreign keys
   - RLS policies

2. **Supabase Storage Setup**
   - create bucket
   - permissions

3. **TypeScript Types**

4. **Example API**

```
POST /api/files/upload
GET /api/files/:id
DELETE /api/files/:id
```

5. **Frontend Integration Example**
   for:

```
CustomColumnEditorContent.tsx
```

---

# Important

The solution must be:

- scalable
- multi-module compatible
- secure
- production ready
- optimized for Supabase/Postgres

Avoid hardcoding module logic.

The file system must be **generic and reusable across the ERP**.

---

# Output Format

Return:

1️⃣ SQL Migration
2️⃣ Supabase storage configuration
3️⃣ Backend API example
4️⃣ TypeScript types
5️⃣ Frontend upload example

---

# Goal

Create a **robust enterprise-grade file storage system for the ERP**.
