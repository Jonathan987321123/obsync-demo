const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const DEPT_REGION_MAP = {
  1: "北区事业部",
  2: "南区事业部",
  3: "东区事业部"
};

const APPLY_ROLES = ["captain", "account_manager", "regional_manager"];
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;

function jsonError(message, status = 400, extra = {}) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}

function jsonOk(data = {}, status = 200) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders }
  });
}

function hashPassword(username, plain) {
  const raw = `${username}:${plain}`;
  return btoa(unescape(encodeURIComponent(raw)));
}

function verifyPassword(username, plain, stored) {
  return hashPassword(username, plain) === stored;
}

async function generateToken(user, env) {
  const payload = JSON.stringify({
    uid: user.id,
    uname: user.username,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS
  });
  const secret = env && env.HMAC_SECRET || "obsync-demo-secret";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return btoa(unescape(encodeURIComponent(payload))) + "." + sigB64;
}

async function requireAuth(request, env, allowedRoles = null) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { error: jsonError("未登录", 401) };
  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE last_token = ? AND token_expires_at > datetime('now') AND is_active = 1"
  ).bind(token).first();
  if (!user) return { error: jsonError("Token 无效或过期", 401) };
  const additionalRoles = (() => {
    try {
      return JSON.parse(user.additional_roles || "[]");
    } catch {
      return [];
    }
  })();
  const allRoles = [user.role, ...additionalRoles];
  if (allowedRoles && !allRoles.some((r) => allowedRoles.includes(r))) {
    return { error: jsonError("权限不足", 403) };
  }
  return { user: { ...user, _allRoles: allRoles, _additionalRoles: additionalRoles } };
}

function validateString(s, max = 100) {
  if (typeof s !== 'string') return null;
  s = s.trim();
  if (s.length === 0 || s.length > max) return null;
  if (/[<>'"\\\x00-\x1f]/.test(s)) return null;
  return s;
}

function validateDays(n) {
  const v = Number(n);
  if (!Number.isInteger(v) || v < 0 || v > 31) return null;
  return v;
}

function validateHours(n) {
  const v = Number(n);
  if (isNaN(v) || v < 0 || v > 744) return null;
  return v;
}

function getDeptRegion(deptId) {
  return DEPT_REGION_MAP[deptId] || "";
}

async function getUserRegions(user, env) {
  const all = user._allRoles;
  if (all.includes("business_leader") || all.includes("regional_manager")) {
    const region = getDeptRegion(user.department_id);
    return region ? [region] : [];
  }
  if (all.includes("admin")) {
    const r = await env.DB.prepare("SELECT DISTINCT region FROM salary_shift WHERE is_active = 1 ORDER BY region").all();
    return r.results.map((x) => x.region);
  }
  return [];
}

async function getUserSites(user, env) {
  const all = user._allRoles;
  if (all.includes("business_leader") || all.includes("regional_manager")) {
    const region = getDeptRegion(user.department_id);
    if (!region) return new Set();
    const r = await env.DB.prepare("SELECT DISTINCT site FROM salary_shift WHERE region = ? AND is_active = 1").bind(region).all();
    return new Set(r.results.map((x) => x.site));
  }
  if (all.includes("admin")) {
    const r = await env.DB.prepare("SELECT DISTINCT site FROM salary_shift WHERE is_active = 1").all();
    return new Set(r.results.map((x) => x.site));
  }
  return new Set();
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体不是 JSON", 400);
  }
  const { username, password } = body || {};
  if (!username || !password) return jsonError("缺少 username/password", 400);
  const user = await env.DB.prepare(
    "SELECT * FROM users WHERE username = ? AND is_active = 1"
  ).bind(username).first();
  if (!user) return jsonError("用户名或密码错误", 401);
  if (!verifyPassword(username, password, user.password_hash)) {
    return jsonError("用户名或密码错误", 401);
  }
  const token = await generateToken(user, env);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  await env.DB.prepare(
    "UPDATE users SET last_token = ?, token_expires_at = ?, last_login = datetime('now') WHERE id = ?"
  ).bind(token, expiresAt, user.id).run();
  return jsonOk({
    token,
    expires_at: expiresAt,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      additional_roles: user._additionalRoles || [],
      department_id: user.department_id
    }
  });
}

async function handleRegions(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const user = auth.user;
  const regions = await getUserRegions(user, env);
  if (regions.length === 0) return jsonOk({ regions: [], total: 0, user_role: user.role });
  const placeholders = regions.map(() => "?").join(",");
  const r = await env.DB.prepare(
    `SELECT region, count() as cnt FROM salary_shift WHERE region IN (${placeholders}) GROUP BY region ORDER BY cnt DESC`
  ).bind(...regions).all();
  await logQuery(env, user, 'regions_list', { regions }, r.results.length, request);
  return jsonOk({
    regions: r.results.map((x) => x.region),
    total: r.results.reduce((s, x) => s + x.cnt, 0),
    user_role: user.role
  });
}

async function handleSites(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const user = auth.user;
  const region = new URL(request.url).searchParams.get("region");
  if (!region) return jsonError("缺少 region 参数", 400);
  const allowedRegions = await getUserRegions(user, env);
  if (!allowedRegions.includes(region)) return jsonError("无权访问该事业部", 403);
  const result = await env.DB.prepare(
    "SELECT DISTINCT site FROM salary_shift WHERE region = ? AND is_active = 1 ORDER BY site"
  ).bind(region).all();
  await logQuery(env, user, 'sites_list', { region, role: user.role }, result.results.length, request);
  return jsonOk({ sites: result.results.map((x) => x.site), count: result.results.length });
}

async function handleGetPositions(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const region = validateString(url.searchParams.get("region") || "");
  const site = validateString(url.searchParams.get("site") || "");
  if (!region || !site) return jsonError("参数 region/site 不合法", 400);
  const r = await env.DB.prepare(
    "SELECT DISTINCT position_name FROM salary_shift WHERE region = ? AND site = ? AND is_active = 1 ORDER BY position_name"
  ).bind(region, site).all();
  const positions = (r.results || []).map((x) => x.position_name);
  await logQuery(env, auth.user, 'positions_list', { region, site }, positions.length, request);
  return jsonOk({ positions });
}

async function handleGetPosts(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const region = validateString(url.searchParams.get("region") || "");
  const site = validateString(url.searchParams.get("site") || "");
  const position = validateString(url.searchParams.get("position") || "");
  if (!region || !site || !position) return jsonError("参数 region/site/position 不合法", 400);
  const r = await env.DB.prepare(
    "SELECT DISTINCT post_name FROM salary_shift WHERE region = ? AND site = ? AND position_name = ? AND is_active = 1 ORDER BY post_name"
  ).bind(region, site, position).all();
  const posts = (r.results || []).map((x) => x.post_name);
  await logQuery(env, auth.user, 'posts_list', { region, site, position }, posts.length, request);
  return jsonOk({ posts });
}

async function handleGetShifts(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const url = new URL(request.url);
  const region = validateString(url.searchParams.get("region") || "");
  const site = validateString(url.searchParams.get("site") || "");
  const position = validateString(url.searchParams.get("position") || "");
  const post = validateString(url.searchParams.get("post") || "");
  if (!region || !site || !position || !post) return jsonError("参数 region/site/position/post 不合法", 400);
  const r = await env.DB.prepare(
    "SELECT DISTINCT shift_name FROM salary_shift WHERE region = ? AND site = ? AND position_name = ? AND post_name = ? AND is_active = 1 AND shift_name IS NOT NULL ORDER BY shift_name"
  ).bind(region, site, position, post).all();
  const shifts = (r.results || []).map((x) => x.shift_name);
  await logQuery(env, auth.user, 'shifts_list', { region, site, position, post }, shifts.length, request);
  return jsonOk({ shifts });
}

async function handleCalculate(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const user = auth.user;
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("请求体不是 JSON", 400);
  }

  const region = validateString((body && body.region) || "");
  const site = validateString((body && body.site) || "");
  const position = validateString((body && body.position) || "");
  const post = validateString((body && body.post) || "");
  const shift = validateString((body && body.shift) || "", 50);
  const nd = validateDays((body && body.normal_days) ?? 0);
  const hd = validateDays((body && body.holiday_days) ?? 0);
  const oh = validateHours((body && body.overtime_hours) ?? (body && body.ot_hours) ?? 0);
  if (!region || !site) return jsonError("参数 region/site 不合法", 400);
  if (nd === null || hd === null || oh === null) return jsonError("参数 days/hours 超出范围 (days 0-31, hours 0-744)", 400);
  if (position && !post) return jsonError("提供职务时必须提供岗位", 400);
  if (post && !position) return jsonError("提供岗位时必须提供职务", 400);

  const allowedSites = await getUserSites(user, env);
  if (!allowedSites.has(site)) return jsonError("无权访问该站点", 403);

  let normalPay, holidayPay, otPay;
  let baseRate, otRate, holidayRate, calcHours;
  let usedTable = 'salary_shift';

  if (position && post) {
    const r = await env.DB.prepare(
      "SELECT base_rate, ot_rate, holiday_rate, calc_hours, fixed_amount, " +
      "meal_deduction, meal_allowance, hot_weather_allowance, shift_name " +
      "FROM salary_shift " +
      "WHERE region=? AND site=? AND position_name=? AND post_name=? " +
      "  AND IFNULL(shift_name,'__default__') = IFNULL(?,'__default__') " +
      "  AND is_active=1 LIMIT 1"
    ).bind(region, site, position, post, shift).first();
    if (r) {
      usedTable = 'salary_shift';
      baseRate = Number(r.base_rate) || 0;
      otRate = Number(r.ot_rate) || 0;
      holidayRate = Number(r.holiday_rate) || 0;
      calcHours = Number(r.calc_hours) || 11;
      const onSiteDays = nd + hd;
      normalPay = baseRate * calcHours * nd;
      holidayPay = holidayRate * calcHours * hd;
      otPay = otRate * oh;
    }
  }

  if (!normalPay) {
    return jsonError("规则不存在", 404, { region, site });
  }

  const salary = normalPay + holidayPay + otPay;

  const breakdown = [
    { item: "普通工资", formula: `${baseRate} × ${calcHours}h × ${nd}天`, amount: Math.round(normalPay * 100) / 100 },
    { item: "节假日工资", formula: `${holidayRate} × ${calcHours}h × ${hd}天`, amount: Math.round(holidayPay * 100) / 100 },
    { item: "加班工资", formula: `${otRate} × ${oh}h`, amount: Math.round(otPay * 100) / 100 }
  ];

  await logQuery(env, user, 'calc', { region, site, position, post, shift, nd, hd, oh, usedTable }, 1, request);

  return jsonOk({
    salary: Math.round(salary * 100) / 100,
    breakdown,
    total: Math.round(salary * 100) / 100,
    normal_pay: Math.round(normalPay * 100) / 100,
    holiday_pay: Math.round(holidayPay * 100) / 100,
    ot_pay: Math.round(otPay * 100) / 100,
    basic_wage: baseRate || null,
    holiday_rate: holidayRate || null,
    ot_rate: otRate || null,
    calc_hours: calcHours,
    normal_days: nd,
    holiday_days: hd,
    ot_hours: oh,
    position: position || null,
    post: post || null,
    shift: shift || null,
    region,
    site,
    used_table: usedTable
  });
}

async function handleDashboard(request, env) {
  const auth = await requireAuth(request, env, ["admin"]);
  if (auth.error) return auth.error;
  try {
    const users = await env.DB.prepare(
      "SELECT count(*) AS n FROM users WHERE is_active = 1"
    ).first();
    const sites = await env.DB.prepare(
      "SELECT count(DISTINCT site) AS n FROM salary_shift WHERE is_active = 1"
    ).first();
    const shifts = await env.DB.prepare(
      "SELECT count(*) AS n FROM salary_shift WHERE is_active = 1"
    ).first();
    const queriesToday = await env.DB.prepare(
      "SELECT count(*) AS n FROM query_log WHERE created_at >= datetime('now', 'start of day')"
    ).first();

    const recentQueries = await env.DB.prepare(
      "SELECT id, username, role, action, params, result_count, ip, created_at " +
      "FROM query_log ORDER BY id DESC LIMIT 20"
    ).all();

    const recentAudits = await env.DB.prepare(
      "SELECT id, operator_username, action, target_type, target_id, details, ip, created_at " +
      "FROM audit_log ORDER BY id DESC LIMIT 20"
    ).all();

    const recentErrors = await env.DB.prepare(
      "SELECT id, severity, endpoint, user_id, message, created_at " +
      "FROM error_log WHERE severity IN ('warn','error','critical') " +
      "ORDER BY id DESC LIMIT 20"
    ).all();

    return jsonOk({
      generated_at: new Date().toISOString(),
      stats: {
        users_total: users?.n || 0,
        sites_total: sites?.n || 0,
        salary_shift_rows: shifts?.n || 0,
        queries_today: queriesToday?.n || 0
      },
      recent_queries: recentQueries.results || [],
      recent_audits: recentAudits.results || [],
      recent_errors: recentErrors.results || []
    });
  } catch (e) {
    return jsonError("DB error: " + (e.message || e), 500);
  }
}

async function handleChat(request, env) {
  try {
    return await _handleChatInner(request, env);
  } catch (e) {
    logError(env, 'error', 'POST /api/chat', null, 'handleChat uncaught exception', e, null);
    return jsonError(`Chat 内部错误: ${e.message || e}`, 500);
  }
}

async function _handleChatInner(request, env) {
  const auth = await requireAuth(request, env);
  if (auth.error) return auth.error;
  const user = auth.user;
  if (user.role === "captain") {
    return jsonOk({ ok: false, error: "Chat 助手仅对业务总/区域经理/管理员开放" }, 403);
  }
  const userId = user.id;
  const today = new Date().toISOString().slice(0, 10);
  const userKey = `${userId}_${today}`;
  const limit = 20;

  await env.DB.prepare(
    "INSERT OR IGNORE INTO chat_log (user_key, count) VALUES (?, 0)"
  ).bind(userKey).run();
  const upd = await env.DB.prepare(
    "UPDATE chat_log SET count = count + 1, updated_at = datetime('now') WHERE user_key = ? AND count < ?"
  ).bind(userKey, limit).run();
  if (!upd.success || (upd.meta && upd.meta.changes === 0)) {
    const cur = await env.DB.prepare("SELECT count FROM chat_log WHERE user_key = ?").bind(userKey).first();
    return jsonOk({ ok: false, error: "今日对话次数已用完", used: cur ? cur.count : limit, limit }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return jsonError("invalid json", 400); }
  const userMsg = (body.message || "").toString().trim();
  if (!userMsg) return jsonError("消息为空", 400);
  if (userMsg.length > 2000) return jsonError("消息过长 (上限 2000)", 400);

  const extracted = extractQuery(userMsg);
  console.log('[chat] user:', user.username, 'msg:', JSON.stringify(userMsg));
  console.log('[chat] extracted:', JSON.stringify(extracted));

  const data = await directQuerySalary(env, user, {
    site: extracted.site,
    region: extracted.region,
    position: extracted.position,
    extra: extracted.extra
  });
  console.log('[chat] D1 returned', data.count, 'rows');

  if (!extracted.site && data.count === 0) {
    const cur = await env.DB.prepare('SELECT count FROM chat_log WHERE user_key = ?').bind(userKey).first();
    return jsonOk({
      ok: true,
      reply: '请问您想查询哪个站点？\n\n提示：能从您问题里识别 site/region/position/days，但没抽出站点名。\n\n推荐格式：\n• "星河广场 20天 保安员"\n• "东方中心 4天 保安员"\n• "科技园区 上海 11h"',
      used: cur ? cur.count : 1, limit,
      remaining: limit - (cur ? cur.count : 1),
      mode: 'pre_extract_empty'
    });
  }

  const apiUrl = (env.M3_API_URL || "https://api.minimaxi.com/anthropic").replace(/\/+$/, "");
  const model = env.M3_MODEL || "MiniMax-M3";
  const apiKey = env.M3_API_KEY;
  if (!apiKey) return jsonError("M3_API_KEY 未配置", 500);

  const roleDesc = {
    "admin": "你是 admin, 可以看所有事业部/站点/岗位的工资数据",
    "business_leader": "你是业务总, 部门 ID = " + (user.department_id || "null") + ", 只能看本部门 (region) 的数据",
    "regional_manager": "你是区域经理, 部门 ID = " + (user.department_id || "null") + ", 只能看本部门 (region) 的数据",
    "account_manager": "你是客户经理, full_name = " + (user.full_name || "") + ", 只能看自己的数据"
  };
  const userRole = user.role;
  const userAccess = roleDesc[userRole] || "未知角色";

  const fmtSysPrompt = `你是 obsync-demo 工资预估查询系统助手.
${userAccess}.

## 你的唯一任务
- 下面是后端从 D1 查到的真实数据 (在 [DATA] 段)
- 你只能依据 [DATA] 段中的内容回答
- 如果 [DATA] 中不存在对应信息, 必须明确说明 "未查询到匹配数据"
- **禁止推测 / 禁止估算 / 禁止补充未出现的数字 / 禁止用常识补全**
- 回答用中文, 简洁 (< 200 字)`;

  const topResults = data.results.slice(0, 3);
  const userPayload = `[用户问题]: ${userMsg}
[已抽取的查询参数]: site="${extracted.site}" region="${extracted.region}" position="${extracted.position}" days="${extracted.days}" hours="${extracted.hours}"
[DATA] (${topResults.length} / ${data.count} 条):
${JSON.stringify(topResults, null, 2)}
${data.count === 0 ? '[提示]: D1 无数据。告诉用户"未查询到匹配数据"。' : '[提示]: 列出最相关的那一条给用户，简洁回答。'}`;

  let m2;
  try {
    m2 = await fetch(`${apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: fmtSysPrompt,
        messages: [{ role: 'user', content: userPayload }]
      }),
    });
  } catch (e) {
    logError(env, 'warn', 'M3_call', user, 'M3 call failed', e, { msg: userMsg.slice(0, 100) });
    return jsonError(`M3 call 失败: ${e.message || e}`, 502);
  }
  if (!m2.ok) {
    const errText = await m2.text();
    return jsonError(`M3 返回 ${m2.status}: ${errText.slice(0, 200)}`, 502);
  }
  const m2Json = await m2.json();
  let reply = (m2Json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  if (!reply) reply = '(M3 未返回文本)';

  const cur = await env.DB.prepare('SELECT count FROM chat_log WHERE user_key = ?').bind(userKey).first();
  await logQuery(env, user, 'chat', { msg: userMsg.slice(0, 200), extracted, d1_count: data.count }, data.count, request);
  return jsonOk({
    ok: true,
    reply,
    used: cur ? cur.count : 1,
    limit,
    remaining: limit - (cur ? cur.count : 1),
    mode: 'pre_extracted',
    extracted,
    d1_count: data.count
  });
}

async function logPush(env, entry) {
  if (!env || !env.DB) return;
  try {
    if (entry._table === 'query_log') {
      await env.DB.prepare(
        "INSERT INTO query_log (user_id, username, role, action, params, result_count, ip, user_agent) VALUES (?,?,?,?,?,?,?,?)"
      ).bind(entry.user_id||null, entry.username||null, entry.role||null, entry.action, entry.params||null, entry.result_count||null, entry.ip||null, entry.user_agent||null).run();
    } else if (entry._table === 'error_log') {
      await env.DB.prepare(
        "INSERT INTO error_log (severity, endpoint, user_id, message, stack, params) VALUES (?,?,?,?,?,?)"
      ).bind(entry.severity, entry.endpoint||null, entry.user_id||null, entry.message, entry.stack||null, entry.params||null).run();
    } else if (entry._table === 'audit_log') {
      await env.DB.prepare(
        "INSERT INTO audit_log (operator_id, operator_username, action, target_type, target_id, details, ip) VALUES (?,?,?,?,?,?,?)"
      ).bind(entry.operator_id||null, entry.operator_username||null, entry.action, entry.target_type||null, entry.target_id||null, entry.details||null, entry.ip||null).run();
    }
  } catch (e) {
    console.error('[logger] logPush failed for', entry._table, ':', e.message);
  }
}

function logQuery(env, user, action, params, resultCount, request) {
  const ip = (request?.headers && (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For'))) || '';
  const ua = (request?.headers && request.headers.get('User-Agent')) || '';
  return logPush(env, {
    _table: 'query_log',
    user_id: user?.id,
    username: user?.username,
    role: user?.role,
    action,
    params: params ? JSON.stringify(params) : null,
    result_count: resultCount,
    ip, user_agent: ua
  });
}

function logError(env, severity, endpoint, user, message, err, params) {
  return logPush(env, {
    _table: 'error_log',
    severity,
    endpoint,
    user_id: user?.id,
    message,
    stack: err && err.stack ? String(err.stack).slice(0, 1000) : null,
    params: params ? (typeof params === 'string' ? params : JSON.stringify(params)) : null
  });
}

const KNOWN_POSITIONS = ["保安员", "保安队长", "保安领班", "巡查员", "保安队员", "保洁员", "保安", "后勤", "门岗", "厨师", "仓库管理员", "甲方检查人员", "文员", "保安副队长", "领班", "项目经理", "施工监理", "司机"];
const KNOWN_REGIONS = ["北区事业部", "南区事业部", "东区事业部"];

function extractQuery(text) {
  let s = String(text || "").trim();
  const raw = s;
  const out = { site: "", region: "", position: "", days: "", hours: "", extra: "", _raw: raw };
  if (!s) return out;

  for (const r of KNOWN_REGIONS) {
    if (s.includes(r)) { out.region = r; break; }
  }

  const sortedPos = [...KNOWN_POSITIONS].sort((a, b) => b.length - a.length);
  for (const p of sortedPos) {
    if (s.includes(p)) { out.position = p; break; }
  }

  const daysMatch = s.match(/(\d{1,2})\s*(?:天|day|d|工作日)/i);
  if (daysMatch) out.days = daysMatch[1];

  const hoursMatch = s.match(/(\d{1,3}(?:\.\d+)?)\s*(?:h|hr|小时|工时)/i);
  if (hoursMatch) out.hours = hoursMatch[1];

  let remainder = s;
  for (const drop of [
    out.region, out.position,
    out.days && out.days + "天", out.days && out.days + " 天",
    out.days && out.days + "个工作日", out.days && out.days + " 工作日",
    out.days,
    out.hours && out.hours + "h",
    out.hours && out.hours + "小时", out.hours && out.hours + " 小时",
    out.hours
  ]) {
    if (drop) remainder = remainder.replace(drop, " ");
  }
  remainder = remainder.replace(/(?:工作|上|做|是|担任|工资|多少钱|多少|多少天|什么|查询|预估|帮我|请问|的|保安员岗位|岗位|每天|节假日|大概)/g, " ");
  remainder = remainder.replace(/\s+/g, " ").trim();

  const tokens = remainder.split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    out.site = tokens[0];
    out.extra = tokens.slice(1).join(' ');
  }

  return out;
}

async function directQuerySalary(env, user, params) {
  const userRole = user.role;
  let roleFilter = "";
  const roleParams = [];
  if (userRole === "business_leader" || userRole === "regional_manager") {
    if (user.department_id) {
      const dRow = await env.DB.prepare("SELECT name FROM departments WHERE id = ?").bind(user.department_id).first();
      const deptName = dRow ? dRow.name : "";
      roleFilter = " AND region = ?";
      roleParams.push(deptName);
    }
  }

  const baseSelect = "SELECT region, site, position_name, post_name, base_rate, ot_rate, holiday_rate, calc_hours, account_manager FROM salary_shift WHERE is_active = 1";

  const tries = [];
  if (params.site && params.position && params.extra) {
    tries.push({ extra: " AND site LIKE ? AND position_name LIKE ? AND post_name LIKE ?",
                 p: [params.site + "%", "%" + params.position + "%", "%" + params.extra + "%"] });
  }
  if (params.site && params.extra) {
    tries.push({ extra: " AND site LIKE ? AND post_name LIKE ?",
                 p: [params.site + "%", "%" + params.extra + "%"] });
  }
  if (params.site && params.position) {
    tries.push({ extra: " AND site LIKE ? AND position_name LIKE ?",
                 p: [params.site + "%", "%" + params.position + "%"] });
  }
  if (params.site) {
    tries.push({ extra: " AND site LIKE ?", p: [params.site + "%"] });
  }
  if (params.extra) {
    tries.push({ extra: " AND post_name LIKE ?", p: ["%" + params.extra + "%"] });
  }
  if (params.position) {
    tries.push({ extra: " AND position_name LIKE ?", p: ["%" + params.position + "%"] });
  }

  for (const t of tries) {
    const sql = baseSelect + roleFilter + t.extra + " ORDER BY site, position_name, post_name LIMIT 30";
    try {
      const r = await env.DB.prepare(sql).bind(...roleParams, ...t.p).all();
      const results = r.results || [];
      if (results.length > 0) {
        return { count: results.length, results, params: { ...params }, role_filtered: userRole };
      }
    } catch (e) {
      console.error('directQuerySalary try failed:', e.message);
    }
  }

  return { count: 0, results: [], params: { ...params }, role_filtered: userRole };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method === "GET") {
      const _api = url.searchParams.get("api");
      if (_api === "regions") return handleRegions(request, env);
      if (_api === "sites") return handleSites(request, env);
      if (_api === "positions") return handleGetPositions(request, env);
      if (_api === "posts") return handleGetPosts(request, env);
      if (_api === "shifts") return handleGetShifts(request, env);
    }

    if (url.pathname.startsWith("/api/") || url.pathname === "/login" || url.pathname === "/calc") {
      if (request.method === "POST" && url.pathname === "/login") return handleLogin(request, env);
      if (request.method === "POST" && url.pathname === "/api/chat") return handleChat(request, env);
      if (request.method === "POST" && url.pathname === "/calc") return handleCalculate(request, env);
      if (request.method === "GET" && url.pathname === "/api/admin/dashboard") return handleDashboard(request, env);
      return new Response("Not Found", { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};