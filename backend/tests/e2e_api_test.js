/**
 * Pocket Friend - End-to-End API and MySQL Verification Suite
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const postData = data ? JSON.stringify(data) : '';

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(postData) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Starting Pocket Friend End-to-End API & Database Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const testEmail = `student_${Date.now()}@college.edu`;
  const testPassword = 'Password123!';
  let userToken = null;
  let userId = null;
  let createdCategoryId = null;
  let createdTxId = null;

  // 1. Health Check
  console.log('1. Testing Health Check API:');
  const healthRes = await request('GET', '/health');
  assert(healthRes.status === 200 && healthRes.data.status === 'online', 'Health endpoint returns online');

  // 2. Register New User
  console.log('\n2. Testing User Registration:');
  const regRes = await request('POST', '/auth/register', {
    name: 'Rahul Sharma',
    email: testEmail,
    password: testPassword
  });
  assert(regRes.status === 201 && regRes.data.success && regRes.data.token, 'User registered successfully and received JWT token');
  userToken = regRes.data.token;
  userId = regRes.data.user.id;
  assert(regRes.data.user.name === 'Rahul Sharma', 'User name matches registration payload');

  // 3. Duplicate Registration Check
  console.log('\n3. Testing Duplicate Registration Prevention:');
  const dupRes = await request('POST', '/auth/register', {
    name: 'Duplicate User',
    email: testEmail,
    password: testPassword
  });
  assert(dupRes.status === 409 && !dupRes.data.success, 'Duplicate registration correctly rejected with 409 Conflict');

  // 4. User Login
  console.log('\n4. Testing User Login & Authentication:');
  const loginRes = await request('POST', '/auth/login', {
    email: testEmail,
    password: testPassword
  });
  assert(loginRes.status === 200 && loginRes.data.success && loginRes.data.token, 'User logged in successfully with valid credentials');

  // 5. Invalid Password Login
  console.log('\n5. Testing Invalid Password Rejection:');
  const badLoginRes = await request('POST', '/auth/login', {
    email: testEmail,
    password: 'WrongPassword!'
  });
  assert(badLoginRes.status === 401 && !badLoginRes.data.success, 'Invalid password correctly rejected with 401 Unauthorized');

  // 6. Get Current User Profile (JWT Protected)
  console.log('\n6. Testing Authenticated /auth/me:');
  const meRes = await request('GET', '/auth/me', null, userToken);
  assert(meRes.status === 200 && meRes.data.user.email === testEmail, 'Verified authenticated user profile via JWT');

  // 7. Categories API (Auto-seeded & Custom)
  console.log('\n7. Testing Categories API:');
  const catListRes = await request('GET', '/categories', null, userToken);
  assert(catListRes.status === 200 && catListRes.data.data.length >= 8, 'Default categories auto-seeded in MySQL upon user registration');

  const addCatRes = await request('POST', '/categories', {
    name: 'Coding Subscriptions',
    type: 'expense',
    icon: '💻',
    color: '#3b82f6'
  }, userToken);
  assert(addCatRes.status === 201 && addCatRes.data.data.name === 'Coding Subscriptions', 'Created custom category in MySQL');
  createdCategoryId = addCatRes.data.data.id;

  // 8. Transactions API - Create Income & Expense
  console.log('\n8. Testing Transactions Creation:');
  // Income 1: Pocket Money
  const tx1Res = await request('POST', '/transactions', {
    type: 'income',
    amount: 5000,
    category: 'Pocket Money',
    description: 'Monthly pocket money from parents',
    paymentMethod: 'Bank Transfer',
    date: '2026-09-01'
  }, userToken);
  assert(tx1Res.status === 201 && tx1Res.data.data.amount === 5000, 'Created Income transaction of ₹5,000 in MySQL');

  // Income 2: Part-time / Freelancing
  const tx2Res = await request('POST', '/transactions', {
    type: 'income',
    amount: 2500,
    category: 'Freelance',
    description: 'Web design gig payment',
    paymentMethod: 'UPI',
    date: '2026-09-05'
  }, userToken);
  assert(tx2Res.status === 201, 'Created Freelance Income transaction of ₹2,500 in MySQL');

  // Expense 1: Food & Snacks
  const tx3Res = await request('POST', '/transactions', {
    type: 'expense',
    amount: 650,
    category: 'Food & Snacks',
    description: 'Campus cafeteria and snacks',
    paymentMethod: 'UPI',
    date: '2026-09-08'
  }, userToken);
  assert(tx3Res.status === 201, 'Created Expense transaction of ₹650 in MySQL');
  createdTxId = tx3Res.data.data.id;

  // Expense 2: Books & Study
  const tx4Res = await request('POST', '/transactions', {
    type: 'expense',
    amount: 1200,
    category: 'Books & Study',
    description: 'Data Structures textbook',
    paymentMethod: 'Cash',
    date: '2026-09-10'
  }, userToken);
  assert(tx4Res.status === 201, 'Created Expense transaction of ₹1,200 in MySQL');

  // 9. Read Transactions & Filtering
  console.log('\n9. Testing Transactions Listing & Filtering:');
  const txListRes = await request('GET', '/transactions', null, userToken);
  assert(txListRes.status === 200 && txListRes.data.data.length === 4, 'Retrieved all 4 transactions from MySQL');

  const expenseOnlyRes = await request('GET', '/transactions?type=expense', null, userToken);
  assert(expenseOnlyRes.status === 200 && expenseOnlyRes.data.data.length === 2, 'Filtered transactions by type=expense returned 2 items');

  // 10. Update Transaction
  console.log('\n10. Testing Transaction Update:');
  const updateTxRes = await request('PUT', `/transactions/${createdTxId}`, {
    type: 'expense',
    amount: 750,
    category: 'Food & Snacks',
    description: 'Campus cafeteria lunch & juice (updated)',
    paymentMethod: 'UPI',
    date: '2026-09-08'
  }, userToken);
  assert(updateTxRes.status === 200 && updateTxRes.data.data.amount === 750, 'Updated transaction amount from ₹650 to ₹750 in MySQL');

  // 11. Dashboard Summary SQL Aggregations
  console.log('\n11. Testing Dashboard SQL Aggregation Calculations:');
  const dashRes = await request('GET', '/dashboard/summary', null, userToken);
  assert(dashRes.status === 200 && dashRes.data.success, 'Dashboard summary query executed successfully');
  
  // Total Income = 5000 + 2500 = 7500
  // Total Expenses = 750 + 1200 = 1950
  // Balance = 7500 - 1950 = 5550
  const summary = dashRes.data.data;
  console.log(`     Calculated Balance: ₹${summary.balance}`);
  console.log(`     Total Income: ₹${summary.totalIncome}`);
  console.log(`     Total Expenses: ₹${summary.totalExpenses}`);
  assert(summary.totalIncome === 7500, 'Calculated total income matches expected ₹7,500');
  assert(summary.totalExpenses === 1950, 'Calculated total expenses matches expected ₹1,950');
  assert(summary.balance === 5550, 'Calculated balance matches expected ₹5,550');
  assert(summary.recentTransactions.length === 4, 'Recent transactions list contains top transactions');
  assert(summary.categorySpending.length >= 2, 'Category spending breakdown aggregated properly');

  // 12. User Isolation & Security Test
  console.log('\n12. Testing User Isolation & Data Security:');
  const userBEmail = `user_b_${Date.now()}@college.edu`;
  const userBReg = await request('POST', '/auth/register', {
    name: 'Priya Patel',
    email: userBEmail,
    password: 'Password456!'
  });
  const userBToken = userBReg.data.token;

  // User B queries transactions - should receive empty list
  const userBTxRes = await request('GET', '/transactions', null, userBToken);
  assert(userBTxRes.status === 200 && userBTxRes.data.data.length === 0, 'User B cannot see User A transactions (Empty isolation)');

  // User B attempts to edit User A transaction - must be denied (404/Not Found)
  const userBHackRes = await request('PUT', `/transactions/${createdTxId}`, {
    amount: 99999
  }, userBToken);
  assert(userBHackRes.status === 404, 'User B prohibited from modifying User A transaction (Unauthorized isolation)');

  // 13. Delete Transaction
  console.log('\n13. Testing Transaction Deletion:');
  const delTxRes = await request('DELETE', `/transactions/${createdTxId}`, null, userToken);
  assert(delTxRes.status === 200 && delTxRes.data.success, 'Transaction deleted from MySQL');

  // Re-check dashboard after deletion:
  // Expenses = 1950 - 750 = 1200
  // Balance = 7500 - 1200 = 6300
  const afterDelDash = await request('GET', '/dashboard/summary', null, userToken);
  assert(afterDelDash.data.data.totalExpenses === 1200, 'Dashboard total expenses updated dynamically to ₹1,200 after deletion');
  assert(afterDelDash.data.data.balance === 6300, 'Dashboard balance updated dynamically to ₹6,300 after deletion');

  // 14. Delete Category
  console.log('\n14. Testing Category Deletion:');
  const delCatRes = await request('DELETE', `/categories/${createdCategoryId}`, null, userToken);
  assert(delCatRes.status === 200 && delCatRes.data.success, 'Custom category deleted from MySQL');

  console.log('\n================================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
