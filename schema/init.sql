PRAGMA defer_foreign_keys=TRUE;

CREATE TABLE departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  leader_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO "departments" ("id","name","leader_name","created_at") VALUES(1,'北区事业部','李明','2026-01-01 00:00:00');
INSERT INTO "departments" ("id","name","leader_name","created_at") VALUES(2,'南区事业部','王芳','2026-01-01 00:00:00');
INSERT INTO "departments" ("id","name","leader_name","created_at") VALUES(3,'东区事业部','张伟','2026-01-01 00:00:00');

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  department_id INTEGER,
  additional_roles TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_token TEXT,
  token_expires_at TEXT,
  last_login TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

INSERT INTO "users" ("username","password_hash","role","department_id","full_name","is_active") VALUES
('admin','YWRtaW46YWRtaW5AMjAyNg==','admin',NULL,'系统管理员',1),
('manager1','bGltMTE6bGltMTFAMjAyNg==','business_leader',1,'李明',1),
('manager2','d2FuZ2YzOndoYW5nZjNAMjAyNg==','business_leader',2,'王芳',1),
('manager3','emhhbmd3ZWk6emhhbmd3ZWlAMjAyNg==','business_leader',3,'张伟',1);

CREATE TABLE salary_shift (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region TEXT NOT NULL,
  site TEXT NOT NULL,
  department_name TEXT,
  position_name TEXT NOT NULL,
  post_name TEXT NOT NULL,
  shift_name TEXT,
  base_rate REAL,
  ot_rate REAL,
  holiday_rate REAL,
  calc_hours REAL,
  fixed_amount REAL,
  hot_weather_allowance REAL,
  meal_deduction REAL DEFAULT 0,
  meal_allowance REAL DEFAULT 0,
  account_manager TEXT,
  valid_from DATE,
  valid_to DATE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "salary_shift" ("region","site","position_name","post_name","base_rate","ot_rate","holiday_rate","calc_hours","is_active") VALUES
('北区事业部','星河广场','保安员','门岗白班',16.44,18.6,37.8,11,1),
('北区事业部','星河广场','保安员','门岗夜班',16.44,17.4,34.8,11,1),
('北区事业部','星河广场','保安员','巡逻岗白班',16.44,18.6,37.8,11,1),
('北区事业部','星河广场','保安员','巡逻岗夜班',16.44,17.4,34.8,11,1),
('北区事业部','星河广场','保安队长','队长岗白班',17.8,17.4,35.6,11,1),
('北区事业部','东方中心','保安员','门岗白班',16.44,18.6,37.8,11,1),
('北区事业部','东方中心','保安员','监控岗白班',16.44,17.4,35.6,11,1),
('北区事业部','东方中心','保安员','监控岗夜班',16.44,17.4,35.6,11,1),
('北区事业部','未来科技园','保安员','门岗白班',18,19.8,39.6,11,1),
('北区事业部','未来科技园','保安员','门岗夜班',18,18,36,11,1),
('北区事业部','未来科技园','保安队长','队长岗白班',20,0,40,11,1),
('南区事业部','阳光大厦','保安员','门岗白班',15.5,17.5,35,11,1),
('南区事业部','阳光大厦','保安员','门岗夜班',15.5,16.5,33,11,1),
('南区事业部','阳光大厦','保安员','巡逻岗白班',15.5,17.5,35,11,1),
('南区事业部','阳光大厦','保安员','巡逻岗夜班',15.5,16.5,33,11,1),
('南区事业部','海景公寓','保安员','门岗白班',16,18,36,11,1),
('南区事业部','海景公寓','保安员','门岗夜班',16,17,34,11,1),
('南区事业部','海景公寓','保安员','特保岗',22,0,44,11,1),
('南区事业部','商业中心','保安员','门岗白班',16.5,18.5,37,11,1),
('南区事业部','商业中心','保安员','门岗夜班',16.5,17.5,35,11,1),
('南区事业部','商业中心','保安队长','队长岗白班',18,0,36,11,1),
('东区事业部','科技园区','保安员','门岗白班',17,19,38,11,1),
('东区事业部','科技园区','保安员','门岗夜班',17,18,36,11,1),
('东区事业部','科技园区','保安员','巡逻岗白班',17,19,38,11,1),
('东区事业部','科技园区','保安员','巡逻岗夜班',17,18,36,11,1),
('东区事业部','科技园区','保安队长','队长岗白班',19,0,38,11,1),
('东区事业部','金融中心','保安员','门岗白班',18.5,20,40,11,1),
('东区事业部','金融中心','保安员','门岗夜班',18.5,19,38,11,1),
('东区事业部','金融中心','保安员','监控岗白班',18.5,19,38,11,1),
('东区事业部','写字楼A座','保安员','门岗白班',16,18,36,11,1),
('东区事业部','写字楼A座','保安员','门岗夜班',16,17,34,11,1),
('东区事业部','写字楼A座','保安员','大堂岗',16,18,36,11,1);

CREATE TABLE user_site_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  site_name TEXT NOT NULL,
  region TEXT,
  is_active INTEGER DEFAULT 1,
  assigned_at TEXT DEFAULT (datetime('now')),
  assigned_by INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  id_card TEXT,
  requested_role TEXT NOT NULL,
  requested_sites TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT,
  processed_by INTEGER,
  created_user_id INTEGER
);

CREATE TABLE application_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  submit_date TEXT NOT NULL,
  count INTEGER DEFAULT 0
);

CREATE TABLE chat_log (
  user_key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE query_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  role TEXT,
  action TEXT,
  params TEXT,
  result_count INTEGER,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE error_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  severity TEXT,
  endpoint TEXT,
  user_id INTEGER,
  message TEXT,
  stack TEXT,
  params TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operator_id INTEGER,
  operator_username TEXT,
  action TEXT,
  target_type TEXT,
  target_id INTEGER,
  details TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);