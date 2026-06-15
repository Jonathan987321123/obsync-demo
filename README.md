# Cloudflare Workers Business Application Demo

Enterprise-grade payroll query system built on Cloudflare Workers + D1, featuring AI Assistant, RBAC permission control, operation audit, and complete business functionality.

> 本仓库为 demo 演示项目。所有姓名、站点、事业部、token 均为虚构示例，不对应任何真实客户或公司。
> *This is a demo project. All names, sites, departments, and tokens are fictional examples and do not correspond to any real clients or companies.*

---

## Online Demo

**API Address**: `https://obsync-demo.your-account.workers.dev`

> 部署后替换为你的 Worker 地址 / Replace with your Worker URL after deployment.

---

## Features

| Feature | Description |
|---------|-------------|
| **AI Assistant** | Intelligent dialogue for querying payroll rules with natural language understanding |
| **RBAC** | 5-level role permission system with fine-grained data isolation |
| **Dashboard** | Real-time statistics, query/audit/error log visualization |
| **Audit Log** | Complete operation audit trail for compliance requirements |
| **D1 Database** | SQLite architecture with global distributed edge deployment |
| **4-Level Cascade** | Department → Site → Position → Post linkage calculation |

---

## Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Browser   │────▶│ Cloudflare Edge │────▶│     D1     │
└──────────────┘     │    Workers     │     │  SQLite    │
                     │    (API)       │     └─────────────┘
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │   MiniMax M3   │
                     │  (AI Assistant)│
                     └─────────────────┘
```

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Cloudflare Workers | Edge computing API |
| Cloudflare D1 | SQLite distributed database |
| Cloudflare Pages | Frontend static hosting |
| JavaScript (ES6+) | Primary development language |
| HMAC-SHA256 | Token authentication |
| MiniMax M3 | AI dialogue engine |

---

## Project Structure

```
obsync-demo/
├── src/
│   └── worker.js          # Cloudflare Worker main code (~700 lines)
├── schema/
│   └── init.sql           # Database initialization (8 tables)
├── tests/
│   └── test.js            # Regression tests
├── wrangler.toml          # Wrangler configuration
├── package.json          # npm dependencies
└── README.md
```

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Jonathan987321123/obsync-demo.git
cd obsync-demo
```

### 2. Initialize D1 Database

```bash
# Create D1 database
npx wrangler d1 create obsync-demo

# Fill database_id in wrangler.toml

# Initialize table structure
npx wrangler d1 execute obsync-demo --local --file=schema/init.sql
```

### 3. Configure environment variables

```bash
# Set HMAC secret (for token signing)
npx wrangler secret put HMAC_SECRET

# Set AI API Key (for Chat feature)
npx wrangler secret put M3_API_KEY
```

### 4. Deploy

```bash
npx wrangler deploy
```

---

## Test Results

| Test Case | Status |
|-----------|--------|
| Payroll calculation (5 cases) | ✅ PASS |
| Chat query parsing | ✅ PASS |
| Role permission | ✅ PASS |
| Query log replay | ✅ PASS |
| Playback regression | ✅ PASS |

---

## Database Schema

| Table Name | Purpose |
|-----------|---------|
| `departments` | Business departments |
| `users` | User authentication |
| `salary_shift` | Salary rules (32 items) |
| `query_log` | Query logs |
| `audit_log` | Operation audit |
| `error_log` | Error tracking |
| `chat_log` | Conversation limits |

---

## Role Permissions

| Role | Data Permission Scope |
|------|----------------------|
| `admin` | All departments/sites/data |
| `business_leader` | All sites in department |
| `regional_manager` | All sites in region |
| `account_manager` | Customer data under management |
| `captain` | Assigned sites |

---

## Test Accounts

| Role | Username | Password | Name |
|------|----------|----------|------|
| Admin | admin | admin@2026 | System Admin |
| Business Manager | manager1 | lim11@2026 | Manager A |
| Business Manager | manager2 | wangf3@2026 | Manager B |
| Business Manager | manager3 | zhangwei@2026 | Manager C |

---

## API Endpoints

### Login

```bash
curl -X POST https://your-worker.workers.dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@2026"}'
```

### Get department list

```bash
curl https://your-worker.workers.dev/?api=regions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Calculate payroll

```bash
curl -X POST https://your-worker.workers.dev/calc \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "region": "北区事业部",
    "site": "星河广场",
    "position": "保安员",
    "post": "门岗白班",
    "normal_days": 20,
    "holiday_days": 2,
    "overtime_hours": 0
  }'
```

### AI Chat query

```bash
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"星河广场 保安员 20天 多少钱"}'
```

### Dashboard (admin only)

```bash
curl https://your-worker.workers.dev/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## License

MIT
