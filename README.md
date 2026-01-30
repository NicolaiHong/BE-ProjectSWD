# AI Idea API

Node.js + Express + TypeScript backend API with PostgreSQL database. Fully containerized development environment using Docker.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Database Schema](#database-schema)
- [Database Access for Frontend Developers](#database-access-for-frontend-developers)
- [Development](#development)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Docker Desktop** (includes Docker Compose)
  - [Download for Windows](https://www.docker.com/products/docker-desktop)
  - [Download for Mac](https://www.docker.com/products/docker-desktop)
  - [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)
- **Git** - [Download](https://git-scm.com/downloads)
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/) (optional, for local development)

## Project Setup

Follow these steps to set up the entire project from scratch:

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd ai-idea-api
```

### 2. Create Environment Configuration

Create a `.env` file in the root directory with the following configuration:

**For Windows (PowerShell):**

```powershell

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ai_idea_db

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=1d

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google Gemini API (Optional)
GEMINI_API_KEY=your-gemini-api-key

```

**For Mac/Linux:**

```bash

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ai_idea_db

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRES_IN=1d

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Google Gemini API (Optional)
GEMINI_API_KEY=your-gemini-api-key

```

### 3. Build and Start Docker Containers

```bash
docker-compose up --build -d
```

This command will:

- Build the Node.js application image
- Start PostgreSQL database container
- Start the API server container
- Create necessary Docker networks and volumes

### 4. Initialize Database Schema

**For Windows (PowerShell):**

```powershell
# Copy schema file into container
docker cp database/schema.sql ai-idea-api-postgres-1:/schema.sql

# Execute schema
docker-compose exec -T postgres psql -U postgres -d ai_idea_db -f /schema.sql
```

**For Mac/Linux:**

```bash
# Copy and execute schema
docker cp database/schema.sql $(docker-compose ps -q postgres):/schema.sql
docker-compose exec -T postgres psql -U postgres -d ai_idea_db -f /schema.sql
```

### 5. Verify Installation

Check if the API is running:

```bash
# Test API endpoint
curl http://localhost:3000

# Check container status
docker-compose ps
```

You should see both containers running:

- `ai-idea-api-app-1` (API Server)
- `ai-idea-api-postgres-1` (PostgreSQL Database)

## Database Access for Frontend Developers

Frontend developers can access and view the database using various tools. Here are the recommended methods:

### Method 1: Using pgAdmin (Recommended - GUI Tool)

**1. Download and Install pgAdmin:**

- Download from: https://www.pgadmin.org/download/

**2. Connect to Database:**

- Open pgAdmin
- Right-click "Servers" → "Register" → "Server"
- **General Tab:**
  - Name: `AI Idea API Dev`
- **Connection Tab:**
  - Host: `localhost`
  - Port: `5432`
  - Database: `ai_idea_db`
  - Username: `postgres`
  - Password: `postgres`
- Click "Save"

**3. Browse Data:**

- Expand: Servers → AI Idea API Dev → Databases → ai_idea_db → Schemas → public → Tables
- Right-click any table → "View/Edit Data" → "All Rows"

### Method 2: Using DBeaver (Alternative GUI Tool)

**1. Download and Install DBeaver:**

- Download from: https://dbeaver.io/download/

**2. Create New Connection:**

- Click "New Database Connection" (plug icon)
- Select "PostgreSQL"
- Configure connection:
  - Host: `localhost`
  - Port: `5432`
  - Database: `ai_idea_db`
  - Username: `postgres`
  - Password: `postgres`
- Click "Test Connection" → "Finish"

**3. View Tables:**

- Navigate: Databases → ai_idea_db → Schemas → public → Tables
- Double-click any table to view data

### Method 3: Using VS Code Extension

**1. Install PostgreSQL Extension:**

- Open VS Code
- Go to Extensions (Ctrl+Shift+X)
- Search for "PostgreSQL" by Chris Kolkman
- Install the extension

**2. Connect to Database:**

- Click the PostgreSQL icon in the sidebar
- Click "+" to add connection
- Enter connection details:
  - Host: `localhost`
  - User: `postgres`
  - Password: `postgres`
  - Port: `5432`
  - Database: `ai_idea_db`

**3. Query Data:**

- Expand the connection tree
- Right-click any table → "Select Top 1000"
- View and edit data directly in VS Code

### Method 4: Using Docker CLI (Command Line)

**Access PostgreSQL Shell:**

```bash
docker-compose exec postgres psql -U postgres -d ai_idea_db
```

**Common SQL Queries:**

```sql
-- List all tables
\dt

-- View table structure
\d users
\d apis
\d deployments

-- Query all users
SELECT * FROM users;

-- Query APIs with user information
SELECT a.*, u.email as owner_email
FROM apis a
JOIN users u ON a.user_id = u.id;

-- Query deployments
SELECT * FROM deployments ORDER BY created_at DESC LIMIT 10;

-- Exit PostgreSQL shell
\q
```

### Method 5: Database Connection String for Tools

Use this connection string in any PostgreSQL-compatible tool:

```
postgresql://postgres:postgres@localhost:5432/ai_idea_db
```

### Available Tables

The database contains the following main tables:

- `users` - User accounts and authentication
- `apis` - API configurations created by users
- `api_configs` - API endpoint configurations
- `deployments` - Deployment history and status
- `generated_codes` - Generated code snippets
- `ui_schemas` - UI form schemas

## Development

### Local Development (Without Docker)

If you prefer to run the application locally:

**1. Install Dependencies:**

```bash
npm install
```

**2. Update `.env` file:**

```env
DB_HOST=localhost  # Change from 'postgres' to 'localhost'
```

**3. Make sure PostgreSQL is running in Docker:**

```bash
docker-compose up postgres -d
```

**4. Run Development Server:**

```bash
npm run dev
```

The API will be available at `http://localhost:3000` with hot-reload enabled.

### Build for Production

```bash
npm run build
npm start
```

## Common Commands

### Docker Management

```bash
# View real-time logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f postgres

# Stop all containers
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Restart containers
docker-compose restart

# Rebuild containers
docker-compose up --build -d
```

### Database Management

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d ai_idea_db

# Backup database
docker-compose exec postgres pg_dump -U postgres ai_idea_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d ai_idea_db < backup.sql

# Reset database (complete fresh start)
docker-compose down -v
docker-compose up -d
docker cp database/schema.sql $(docker-compose ps -q postgres):/schema.sql
docker-compose exec -T postgres psql -U postgres -d ai_idea_db -f /schema.sql
```

### NPM Scripts

```bash
# Development with hot-reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run tests (if available)
npm test
```

## Troubleshooting

### Port Already in Use

If port 3000 or 5432 is already in use:

1. Change the port in `.env` file:

```env
PORT=3001  # Change to any available port
```

2. Or stop the conflicting service:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Database Connection Failed

1. Ensure PostgreSQL container is running:

```bash
docker-compose ps
```

2. Check PostgreSQL logs:

```bash
docker-compose logs postgres
```

3. Restart containers:

```bash
docker-compose restart
```

### Cannot Connect from Frontend Tools

1. Verify PostgreSQL is exposing port 5432:

```bash
docker-compose ps
```

2. Check if port is mapped correctly in `docker-compose.yml`:

```yaml
ports:
  - "5432:5432"
```

3. Test connection:

```bash
# Windows
Test-NetConnection localhost -Port 5432

# Mac/Linux
nc -zv localhost 5432
```

### Docker Desktop Not Running

Ensure Docker Desktop is running before executing any Docker commands. Start Docker Desktop from your applications menu.

---

## 📞 Support

For issues or questions:

- Check existing issues in the repository
- Create a new issue with detailed description
- Contact the development team

## 📝 License

[Add your license information here]
