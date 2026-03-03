# 🔧 FundForge Backend

This is the backend API for **FundForge** — a crowdfunding platform.  
It provides RESTful endpoints to manage projects, contributions, comments, updates, views, and user dashboards.

The backend uses **Express.js**, integrates with **Firebase Authentication** for secure access, and uses **Supabase** (PostgreSQL) for data storage.

---

## 🚀 Features

- Verifies Firebase ID tokens on protected routes  
- Uses Supabase PostgreSQL for crowdfunding data  
- Bootstraps user profiles from Firebase auth  
- Exposes APIs for:
  - Projects (create, list, detail)
  - Contributions
  - Comments & Updates
  - Creator Dashboard

---

## 📦 Tech Stack

- **Node.js**
- **Express.js**
- **Supabase (PostgreSQL)**
- **Firebase Authentication**
- Middleware for token validation
- dotenv for environment variable management :contentReference[oaicite:2]{index=2}

---

## 📦 Installation

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Then open `.env` and fill in your Firebase and Supabase credentials:

```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

⚠️ Never commit your `.env` file to your repository.

Apply Supabase schema:

Go to your Supabase Dashboard → SQL Editor → run:

```
backend/supabase/schema.sql
```

This will create the required tables and relationships in your database.

## ▶️ Start the Server

For development (with auto-restart):

```bash
npm run dev
```

For production:

```bash
npm start
```

The API server will run at:

```
http://localhost:5000
```
