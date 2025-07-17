# Project Rules and Guidelines

## Directory Structure and Command Execution

### ⚠️ IMPORTANT: Always switch to the correct folder before running commands!

### Frontend Commands
**Location:** `frontend/` folder
```bash
cd frontend
npm start          # Start development server
npm run build      # Build for production
npm install        # Install dependencies
npm test           # Run tests
```

### Backend Commands
**Location:** `backend/` folder
```bash
cd backend
npm run dev        # Start development server with nodemon
npm start          # Start production server
npm install        # Install dependencies
npm test           # Run tests (if configured)
```

### Database Commands
**Location:** `backend/` folder
```bash
cd backend
npx knex migrate:latest    # Run database migrations
npx knex migrate:rollback  # Rollback last migration
npx knex seed:run         # Run database seeds
```

### Git Commands
**Location:** Root project folder (`/`)
```bash
git add .
git commit -m "message"
git push
git pull
```

## Common Mistakes to Avoid

1. **❌ Running `npm start` from root** - Will fail with "package.json not found"
2. **❌ Running `npm run dev` from root** - Will fail with "package.json not found"
3. **❌ Running frontend commands from backend folder** - Will use wrong package.json
4. **❌ Running backend commands from frontend folder** - Will use wrong package.json

## Quick Reference

| Command | Correct Directory | Purpose |
|---------|------------------|---------|
| `npm start` | `frontend/` | Start React development server |
| `npm run dev` | `backend/` | Start Node.js development server |
| `npm run build` | `frontend/` | Build React app for production |
| `npx knex migrate:latest` | `backend/` | Run database migrations |
| `git push` | Root (`/`) | Push changes to repository |

## Directory Structure
```
test02/                    # Root project folder
├── frontend/             # React frontend application
│   ├── package.json     # Frontend dependencies
│   ├── src/             # React source code
│   └── public/          # Static assets
├── backend/             # Node.js backend application
│   ├── package.json     # Backend dependencies
│   ├── src/             # Backend source code
│   └── db/              # Database files
├── .git/                # Git repository
└── PROJECT_RULES.md     # This file
```

## Before Running Any Command

1. **Check current directory** with `pwd` (Linux/Mac) or `cd` (Windows)
2. **Navigate to correct folder** using `cd frontend` or `cd backend`
3. **Then run your command**

Remember: When in doubt, always check which folder you're in before running npm commands! 