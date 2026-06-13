# OBSYNC Demo

> 本仓库为 demo 演示项目。所有姓名、站点、事业部、token 均为虚构示例，不对应任何真实客户或公司。

基于 Cloudflare Workers + D1 的智能工资查询系统 Demo

## 功能特性

- Dashboard 管理面板
- Chat Query 智能对话查询
- Role Permission 角色权限系统
- Audit Log 操作审计日志
- 4级联动工资计算（事业部 → 站点 → 职务 → 岗位）
- D1 数据库
- AI 对话助手

## 技术栈

- **Cloudflare Workers** - 后端运行时
- **Cloudflare D1** - SQLite 数据库
- **Cloudflare Pages** - 前端静态托管
- **JavaScript** - 编程语言
- **SQLite** - 数据库引擎

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/yourusername/obsync-demo.git
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

## 项目结构

```
obsync-demo/
├── src/
│   └── worker.js          # Cloudflare Worker 主代码
├── schema/
│   └── init.sql          # 数据库初始化脚本
├── public/                # 静态资源（前端页面）
├── tests/                 # 测试文件
├── wrangler.toml         # Wrangler 配置
└── README.md
```

## 数据库表结构

- `departments` - 事业部/部门表
- `users` - 用户表
- `salary_shift` - 工资规则表
- `query_log` - 查询日志
- `audit_log` - 审计日志
- `error_log` - 错误日志
- `chat_log` - 对话记录

## 角色说明

| 角色 | 权限说明 |
|------|----------|
| admin | 全部权限 |
| business_leader | 本事业部所有数据 |
| regional_manager | 本区域所有数据 |
| account_manager | 只能看自己负责的客户数据 |
| captain | 只能看分配的站点数据 |

## License

MIT