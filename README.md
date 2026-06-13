# Cloudflare Workers Business Application Demo

> 本仓库为 demo 演示项目。所有姓名、站点、事业部、token 均为虚构示例，不对应任何真实客户或公司。

基于 Cloudflare Workers + D1 构建的企业级工资查询系统，支持 AI 助手、RBAC 权限控制、操作审计等完整业务功能。

## 在线 Demo

**API 地址**：`https://obsync-demo.your-account.workers.dev`

> 部署后替换为你的 Worker 地址

## 功能特性

| 功能 | 说明 |
|------|------|
| AI Assistant | 智能对话查询，支持自然语言理解工资规则 |
| RBAC | 5 级角色权限体系，精细化数据隔离 |
| Dashboard | 实时统计，查询/审计/错误日志可视化 |
| Audit Log | 完整操作审计，满足合规要求 |
| D1 Database | SQLite 架构，全球分布式边缘部署 |
| 4-Level Cascade | 事业部 → 站点 → 职务 → 岗位联动计算 |

## 架构图

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

## 技术栈

| 技术 | 用途 |
|------|------|
| Cloudflare Workers | 边缘计算 API |
| Cloudflare D1 | SQLite 分布式数据库 |
| Cloudflare Pages | 前端静态托管 |
| JavaScript (ES6+) | 主开发语言 |
| HMAC-SHA256 | Token 认证 |
| MiniMax M3 | AI 对话引擎 |

## 项目结构

```
obsync-demo/
├── src/
│   └── worker.js          # Cloudflare Worker 主代码 (~700 lines)
├── schema/
│   └── init.sql           # 数据库初始化脚本 (8 tables)
├── tests/
│   └── test.js            # 回归测试
├── wrangler.toml          # Wrangler 配置
├── package.json          # npm 依赖
└── README.md
```

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/Jonathan987321123/obsync-demo.git
cd obsync-demo
```

### 2. 初始化 D1 数据库

```bash
# 创建 D1 数据库
npx wrangler d1 create obsync-demo

# 将 database_id 填入 wrangler.toml

# 初始化表结构
npx wrangler d1 execute obsync-demo --local --file=schema/init.sql
```

### 3. 配置环境变量

```bash
# 设置 HMAC 密钥（用于 Token 签名）
npx wrangler secret put HMAC_SECRET

# 设置 AI API Key（用于 Chat 功能）
npx wrangler secret put M3_API_KEY
```

### 4. 部署

```bash
npx wrangler deploy
```

## 测试结果

| 测试项 | 状态 |
|--------|------|
| Payroll 计算 (5 cases) | ✅ PASS |
| Chat Query 解析 | ✅ PASS |
| Role Permission | ✅ PASS |
| Query Log Replay | ✅ PASS |
| Playback Regression | ✅ PASS |

## 数据库表结构

| 表名 | 用途 |
|------|------|
| `departments` | 事业部/部门 |
| `users` | 用户认证 |
| `salary_shift` | 工资规则 (32 条) |
| `query_log` | 查询日志 |
| `audit_log` | 操作审计 |
| `error_log` | 错误追踪 |
| `chat_log` | 对话限制 |

## 角色权限

| 角色 | 数据权限范围 |
|------|-------------|
| `admin` | 全部事业部/站点/数据 |
| `business_leader` | 本事业部所有站点 |
| `regional_manager` | 本区域所有站点 |
| `account_manager` | 自己负责的客户数据 |
| `captain` | 分配的站点 |

## 测试账号

| 角色 | 用户名 | 密码 | 姓名 |
|------|--------|------|------|
| 管理员 | admin | admin@2026 | 系统管理员 |
| 业务总 | manager1 | lim11@2026 | 业务总甲 |
| 业务总 | manager2 | wangf3@2026 | 业务总乙 |
| 业务总 | manager3 | zhangwei@2026 | 业务总丙 |

## API 接口

### 登录
```bash
curl -X POST https://your-worker.workers.dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@2026"}'
```

### 获取事业部列表
```bash
curl https://your-worker.workers.dev/?api=regions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 工资计算
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

### AI Chat 查询
```bash
curl -X POST https://your-worker.workers.dev/api/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"星河广场 保安员 20天 多少钱"}'
```

### Dashboard (仅管理员)
```bash
curl https://your-worker.workers.dev/api/admin/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## License

MIT