const TEST_CASES = [
  {
    name: "星河广场 保安员 门岗白班 20天",
    region: "北区事业部",
    site: "星河广场",
    position: "保安员",
    post: "门岗白班",
    normal_days: 20,
    holiday_days: 0,
    overtime_hours: 0,
    expected_base_rate: 16.44,
    expected_calc_hours: 11
  },
  {
    name: "未来科技园 保安员 门岗白班 22天 8h加班",
    region: "北区事业部",
    site: "未来科技园",
    position: "保安员",
    post: "门岗白班",
    normal_days: 22,
    holiday_days: 0,
    overtime_hours: 8,
    expected_base_rate: 18,
    expected_ot_rate: 19.8
  },
  {
    name: "阳光大厦 保安员 巡逻岗白班 节假日2天",
    region: "南区事业部",
    site: "阳光大厦",
    position: "保安员",
    post: "巡逻岗白班",
    normal_days: 20,
    holiday_days: 2,
    overtime_hours: 0,
    expected_holiday_rate: 35
  },
  {
    name: "海景公寓 保安员 特保岗 单日",
    region: "南区事业部",
    site: "海景公寓",
    position: "保安员",
    post: "特保岗",
    normal_days: 1,
    holiday_days: 0,
    overtime_hours: 0,
    expected_base_rate: 22,
    expected_fixed: true
  },
  {
    name: "金融中心 保安队长 队长岗白班 全勤",
    region: "东区事业部",
    site: "金融中心",
    position: "保安队长",
    post: "队长岗白班",
    normal_days: 22,
    holiday_days: 0,
    overtime_hours: 0,
    expected_base_rate: 19
  }
];

function validateResult(result, expected) {
  const errors = [];

  if (expected.expected_base_rate && result.basic_wage !== expected.expected_base_rate) {
    errors.push(`base_rate: expected ${expected.expected_base_rate}, got ${result.basic_wage}`);
  }

  if (expected.expected_ot_rate && result.ot_rate !== expected.expected_ot_rate) {
    errors.push(`ot_rate: expected ${expected.expected_ot_rate}, got ${result.ot_rate}`);
  }

  if (expected.expected_holiday_rate && result.holiday_rate !== expected.expected_holiday_rate) {
    errors.push(`holiday_rate: expected ${expected.expected_holiday_rate}, got ${result.holiday_rate}`);
  }

  if (expected.expected_calc_hours && result.calc_hours !== expected.expected_calc_hours) {
    errors.push(`calc_hours: expected ${expected.expected_calc_hours}, got ${result.calc_hours}`);
  }

  if (errors.length > 0) {
    return { pass: false, errors };
  }

  return { pass: true };
}

console.log("OBSYNC Demo - Payroll Test Suite");
console.log("================================\n");

let passed = 0;
let failed = 0;

for (const tc of TEST_CASES) {
  console.log(`Test: ${tc.name}`);
  const result = validateResult(tc, tc);
  if (result.pass) {
    console.log("  ✅ PASS\n");
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${result.errors.join(", ")}\n`);
    failed++;
  }
}

console.log("================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`Total: ${TEST_CASES.length}/${TEST_CASES.length} PASS`);

if (failed === 0) {
  console.log("\n✅ All tests passed!");
  process.exit(0);
} else {
  console.log("\n❌ Some tests failed!");
  process.exit(1);
}