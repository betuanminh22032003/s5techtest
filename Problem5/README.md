# Problem 5: CRUD API Server

A clean, well-structured full-stack application featuring:
- **Backend**: Express.js + TypeORM + TypeScript REST API
- **Frontend**: Next.js + React + TypeScript + Tailwind CSS

## 🏗️ Architecture

```
Problem5/
├── src/                    # Backend Express API
│   ├── config/             # Application configuration
│   ├── controllers/        # HTTP request handlers
│   ├── database/           # TypeORM data source configuration
│   ├── entities/           # TypeORM entity definitions
│   ├── middleware/         # Express middleware
│   ├── models/             # DTOs and type definitions
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic layer
│   ├── utils/              # Utility functions
│   ├── validators/         # Request validation rules
│   ├── app.ts              # Express app setup
│   └── index.ts            # Entry point
│
└── frontend/               # Next.js React Frontend
    └── src/
        ├── app/            # Next.js App Router pages
        ├── components/     # React components
        │   ├── ui/         # Reusable UI components
        │   └── resources/  # Resource-specific components
        ├── hooks/          # Custom React hooks
        ├── lib/            # API client utilities
        └── types/          # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation & Running

#### 1. Start the Backend API

```bash
# Navigate to the project directory
cd Problem5

# Install backend dependencies
npm install

# Start the backend server (runs on port 3000)
npm run dev
```

#### 2. Start the Frontend (in a new terminal)

```bash
# Navigate to the frontend directory
cd Problem5/frontend

# Install frontend dependencies
npm install

# Start the Next.js development server (runs on port 3001)
npm run dev
```

#### 3. Access the Application

- **Frontend UI**: `http://localhost:3001`
- **Backend API**: `http://localhost:3000/api/v1`
- **Health Check**: `http://localhost:3000/api/v1/health`

### Production Build

```bash
# Backend
cd Problem5
npm run build
npm start

# Frontend
cd Problem5/frontend
npm run build
npm start
```

## 🌐 Web UI (Next.js + React)

The application includes a modern React frontend built with Next.js and Tailwind CSS:

- **Create** new resources with name, description, category, and status
- **List** all resources with pagination
- **Filter** resources by name, category, or status
- **Edit** existing resources inline
- **Delete** resources with confirmation modal
- **Real-time notifications** for all actions

## 📋 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

#### Health Check
```http
GET /health
```
Returns server health status.

---

### Resources

#### Create a Resource
```http
POST /resources
Content-Type: application/json

{
  "name": "My Resource",
  "description": "A description of the resource",
  "category": "general",
  "status": "active",
  "metadata": {
    "key": "value"
  }
}
```

**Required fields:** `name`

**Optional fields:** `description`, `category`, `status`, `metadata`

**Status options:** `active`, `inactive`, `archived`

---

#### List Resources
```http
GET /resources
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Filter by name (partial match) |
| `category` | string | Filter by exact category |
| `status` | string | Filter by status (`active`, `inactive`, `archived`) |
| `search` | string | Search in name and description |
| `sortBy` | string | Sort field (`name`, `category`, `status`, `createdAt`, `updatedAt`) |
| `sortOrder` | string | Sort direction (`asc`, `desc`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |

**Example:**
```http
GET /resources?status=active&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```

---

#### Get Resource by ID
```http
GET /resources/:id
```

---

#### Update a Resource
```http
PUT /resources/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "inactive"
}
```

All fields are optional. Only provided fields will be updated.

---

#### Delete a Resource
```http
DELETE /resources/:id
```

Returns `204 No Content` on success.

---

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": [ ... ]
  }
}
```

---

## 🧪 Example Usage with cURL

### Create a Resource
```bash
curl -X POST http://localhost:3000/api/v1/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Resource",
    "description": "This is a sample resource",
    "category": "demo",
    "status": "active"
  }'
```

### List Resources with Filters
```bash
curl "http://localhost:3000/api/v1/resources?status=active&limit=5"
```

### Get a Resource
```bash
curl http://localhost:3000/api/v1/resources/{id}
```

### Update a Resource
```bash
curl -X PUT http://localhost:3000/api/v1/resources/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Resource Name",
    "status": "inactive"
  }'
```

### Delete a Resource
```bash
curl -X DELETE http://localhost:3000/api/v1/resources/{id}
```

---

## 🔧 Configuration

Environment variables can be set in `.env` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment (`development`, `production`) |
| `DATABASE_PATH` | `./data/database.sqlite` | SQLite database file path |
| `API_PREFIX` | `/api/v1` | API route prefix |

---

## 📦 Available Scripts

### Backend (Problem5/)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

### Frontend (Problem5/frontend/)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3001) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run Next.js linter |

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** TypeORM
- **Database:** SQLite (via better-sqlite3)
- **Validation:** express-validator
- **Security:** Helmet, CORS
- **Logging:** Morgan

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Library:** React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State:** React Hooks

---

## 📁 Project Structure Details

### Layers

1. **Controllers** - Handle HTTP requests/responses
2. **Services** - Contain business logic
3. **Entities** - TypeORM entity definitions with decorators
4. **Models** - DTOs and type definitions
5. **Validators** - Request validation rules
6. **Middleware** - Cross-cutting concerns (error handling, validation)

### Design Patterns

- **Repository Pattern** - TypeORM repositories for data access
- **Singleton Pattern** - Service instances
- **DTO Pattern** - Data transfer objects for API contracts
- **Error Handling Pattern** - Custom error classes with centralized handling
- **Entity Pattern** - TypeORM entities with decorators

---

## 📄 License

MIT License
