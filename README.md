# Cloudflare Workers Business Application Demo
# Cloudflare Workers 企业应用演示项目

> 本仓库为 demo 演示项目。所有姓名、站点、事业部、token 均为虚构示例，不对应任何真实客户或公司。
> This is a demo project. All names, sites, departments, and tokens are fictional examples and do not correspond to any real clients or companies.

---

## 🌐 Online Demo | 在线演示

**API 地址 / API Address**: `https://obsync-demo.your-account.workers.dev`

> 部署后替换为你的 Worker 地址
> Replace with your Worker URL after deployment.

---

## ✨ Features | 功能特性

| Feature / 功能 | Description / 说明 |
|----------------|--------------------|
| **AI Assistant** | Intelligent dialogue for querying payroll rules with natural language understanding / 智能对话查询，支持自然语言理解工资规则 |
| **RBAC** | 5-level role permission system with fine-grained data isolation / 5 级角色权限体系，精细化数据隔离 |
| **Dashboard** | Real-time statistics, query/audit/error log visualization / 实时统计，查询/审计/错误日志可视化 |
| **Audit Log** | Complete operation audit trail for compliance requirements / 完整操作审计，满足合规要求 |
| **D1 Database** | SQLite architecture with global distributed edge deployment / SQLite 架构，全球分布式边缘部署 |
| **4-Level Cascade** | Department → Site → Position → Post linkage calculation / 事业部 → 站点 → 职务 → 岗位联动计算 |

---

## 🏗️ Architecture | 架构图

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

## 🛠️ Tech Stack | 技术栈

| Technology / 技术 | Purpose / 用途 |
|-------------------|----------------|
| Cloudflare Workers | Edge computing API / 边缘计算 API |
| Cloudflare D1 | SQLite distributed database / SQLite 分布式数据库 |
| Cloudflare Pages | Frontend static hosting / 前端静态托管 |
| JavaScript (ES6+) | Primary development language / 主开发语言 |
| HMAC-SHA256 | Token authentication / Token 认证 |
| MiniMax M3 | AI dialogue engine / AI 对话引擎 |

---

## 📁 Project Structure | 项目结构

```
obsync-demo/
├── src/
│   └── worker.js          # Cloudflare Worker 主代码 (~700 行) / Cloudflare Worker main code (~700 lines)
├── schema/
│   └── init.sql           # 数据库初始化脚本 (8 张表) / Database initialization (8 tables)
├── tests/
│   └── test.js            # 回归测试 / Regression tests
├── wrangler.toml          # Wrangler 配置 / Wrangler configuration
├── package.json          # npm 依赖 / npm dependencies
└── README.md
```

---

## 🚀 Quick Start | 快速开始

### 1. Clone the repository / 克隆仓库

```bash
git clone https://github.com/Jonathan987321123/obsync-demo.git
cd obsync-demo
```

### 2. Initialize D1 Database / 初始化 D1 数据库

```bash
# 创建 D1 数据库 / Create D1 database
npx wrangler d1 create obsync-demo

# 将 database_id 填入 wrangler.toml / Fill database_id in wrangler.toml

# 初始化表结构 / Initialize table structure
npx wrangler d1 execute obsync-demo --local --file=schema/init.sql
```

### 3. Configure environment variables / 配置环境变量

```bash
# 设置 HMAC 密钥（用于 Token 签名）/ Set HMAC secret (for token signing)
npx wrangler secret put HMAC_SECRET

# 设置 AI API Key（用于 Chat 功能）/ Set AI API Key (for Chat feature)
npx wrangler secret put M3_API_KEY
```

### 4. Deploy / 部署

```bash
npx wrangler deploy
```

---

## ✅ Test Results | 测试结果

| Test Case / 测试项 | Status / 状态 |
|--------------------|---------------|
| Payroll calculation (5 cases) / 工资计算 (5 个用例) | ✅ PASS |
| Chat query parsing / Chat Query 解析 | ✅ PASS |
| Role permission / 角色权限 | ✅ PASS |
| Query log replay / 查询日志回放 | ✅ PASS |
| Playback regression / 回放回归 | ✅ PASS |

---

## 🗄️ Database Schema | 数据库表结构

| Table Name / 表名 | Purpose / 用途 |
|-------------------|---------------|
| `departments` | Business departments / 事业部/部门 |
| `users` | User authentication / 用户认证 |
| `salary_shift` | Salary rules (32 items) / 工资规则 (32 条) |
| `query_log` | Query logs / 查询日志 |
| `audit_log` | Operation audit / 操作审计 |
| `error_log` | Error tracking / 错误追踪 |
| `chat_log` | Conversation limits / 对话限制 |

---

## 🔐 Role Permissions | 角色权限

| Role / 角色 | Data Permission Scope / 数据权限范围 |
|-------------|-------------------------------------|
| `admin` | All departments/sites/data / 全部事业部/站点/数据 |
| `business_leader` | All sites in department / 本事业部所有站点 |
| `regional_manager` | All sites in region / 本区域所有站点 |
| `account_manager` | Customer data under management / 自己负责的客户数据 |
| `captain` | Assigned sites / 分配的站点 |

---

## 👤 Test Accounts | 测试账号

| Role / 角色 | Username / 用户名 | Password / 密码 | Name / 姓名 |
|------------|-------------------|-----------------|-------------|
| Admin / 管理员 | admin | admin@2026 | System Admin / 系统管理员 |
| Business Manager / 业务总 | manager1 | lim11@2026 | Manager A / 业务总甲 |
| Business Manager / 业务总 | manager2 | wangf3@2026 | Manager B / 业务总乙 |
| Business Manager / 业务总 | manager3 | zhangwei@2026 | Manager C / 业务总丙 |

---

## 📡 API Endpoints | API 接口

### Login / 登录

```bash
curl -X POST https://your-worker.workers.dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@2026"}'
```

### Get department list / 获取事业部列表

```bash
curl https://your-worker.workers.dev/?api=regions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Calculate payroll / 工资计算

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

### AI Chat query / AI Chat 查询

```bash
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"星河广场 保安员 20天 多少钱"}'
```

### Dashboard (admin only) / Dashboard（仅管理员）

```bash
curl https://your-worker.workers.dev/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📄 License | 开源协议

MIT
