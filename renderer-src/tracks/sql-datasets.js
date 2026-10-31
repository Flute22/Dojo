// Dojo SQL track: small practice databases and the helpers that turn them into SQL.
// Each question lists which tables it uses; only those tables are created for it.
(function () {
  if (window.DOJO_DB) return;

  const T = (cols, rows) => ({ cols, rows });

  // ---- shop: a small online store -------------------------------------------------------------
  const shop = {
    customers: T('id INTEGER PRIMARY KEY, name TEXT, city TEXT, signup_date TEXT, segment TEXT', [
      [1, 'Asha', 'Mumbai', '2023-01-15', 'retail'], [2, 'Ben', 'Delhi', '2023-02-03', 'retail'],
      [3, 'Chitra', 'Pune', '2023-02-20', 'corporate'], [4, 'Dev', 'Mumbai', '2023-03-11', 'retail'],
      [5, 'Esha', 'Delhi', '2023-03-29', 'corporate'], [6, 'Farid', 'Chennai', '2023-04-14', 'retail'],
      [7, 'Gita', 'Pune', '2023-05-02', 'retail'], [8, 'Hari', 'Mumbai', '2023-05-19', 'corporate'],
      [9, 'Isha', 'Bengaluru', '2023-06-07', 'retail'], [10, 'Jai', 'Delhi', '2023-06-25', 'retail'],
      [11, 'Kavya', 'Chennai', '2023-07-13', 'corporate'], [12, 'Lal', 'Bengaluru', '2023-08-01', 'retail'],
    ]),
    products: T('id INTEGER PRIMARY KEY, name TEXT, category TEXT, price INTEGER', [
      [1, 'Notebook', 'Stationery', 80], [2, 'Pen', 'Stationery', 20], [3, 'Desk Lamp', 'Home', 650],
      [4, 'Backpack', 'Bags', 1200], [5, 'Water Bottle', 'Home', 300], [6, 'Headphones', 'Electronics', 1800],
      [7, 'Mouse', 'Electronics', 700], [8, 'Keyboard', 'Electronics', 1500], [9, 'Planner', 'Stationery', 250],
      [10, 'Yoga Mat', 'Fitness', 900],
    ]),
    orders: T('id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT, channel TEXT', [
      [1, 1, '2024-01-05', 'delivered', 'web'], [2, 2, '2024-01-09', 'delivered', 'app'],
      [3, 3, '2024-01-14', 'delivered', 'store'], [4, 1, '2024-01-20', 'delivered', 'app'],
      [5, 4, '2024-01-27', 'cancelled', 'web'], [6, 5, '2024-02-02', 'delivered', 'web'],
      [7, 2, '2024-02-10', 'delivered', 'app'], [8, 6, '2024-02-14', 'returned', 'web'],
      [9, 1, '2024-02-21', 'delivered', 'web'], [10, 7, '2024-02-25', 'delivered', 'store'],
      [11, 3, '2024-03-03', 'delivered', 'app'], [12, 8, '2024-03-09', 'shipped', 'web'],
      [13, 4, '2024-03-15', 'delivered', 'app'], [14, 9, '2024-03-18', 'delivered', 'web'],
      [15, 1, '2024-03-26', 'delivered', 'app'], [16, 5, '2024-04-02', 'delivered', 'store'],
      [17, 10, '2024-04-08', 'cancelled', 'app'], [18, 2, '2024-04-12', 'delivered', 'web'],
      [19, 6, '2024-04-19', 'delivered', 'app'], [20, 3, '2024-04-28', 'delivered', 'web'],
      [21, 7, '2024-05-04', 'delivered', 'app'], [22, 9, '2024-05-11', 'returned', 'store'],
      [23, 1, '2024-05-16', 'delivered', 'web'], [24, 11, '2024-05-23', 'delivered', 'app'],
      [25, 4, '2024-05-30', 'delivered', 'web'], [26, 8, '2024-06-04', 'shipped', 'app'],
      [27, 2, '2024-06-10', 'delivered', 'web'], [28, 10, '2024-06-17', 'delivered', 'store'],
      [29, 5, '2024-06-22', 'delivered', 'app'], [30, 1, '2024-06-29', 'delivered', 'web'],
    ]),
    order_items: T('order_id INTEGER, product_id INTEGER, qty INTEGER, unit_price INTEGER', [
      [1, 1, 3, 80], [1, 2, 5, 20], [2, 6, 1, 1800], [3, 4, 1, 1200], [3, 5, 2, 300], [4, 3, 1, 650],
      [4, 1, 2, 80], [5, 7, 1, 700], [6, 8, 1, 1500], [6, 7, 1, 700], [7, 9, 2, 250], [7, 2, 10, 20],
      [8, 6, 1, 1800], [9, 5, 1, 300], [9, 1, 5, 80], [10, 3, 2, 650], [11, 4, 1, 1200], [11, 6, 1, 1800],
      [12, 8, 1, 1500], [13, 1, 4, 80], [13, 2, 4, 20], [13, 9, 1, 250], [14, 5, 3, 300], [15, 7, 1, 700],
      [15, 5, 1, 300], [16, 6, 2, 1800], [17, 4, 1, 1200], [18, 2, 6, 20], [18, 1, 2, 80], [19, 3, 1, 650],
      [19, 9, 1, 250], [20, 8, 1, 1500], [21, 5, 2, 300], [21, 1, 1, 80], [22, 7, 1, 700], [23, 6, 1, 1800],
      [23, 2, 3, 20], [24, 4, 2, 1200], [25, 9, 3, 250], [26, 3, 1, 650], [27, 7, 2, 700], [27, 5, 1, 300],
      [28, 1, 6, 80], [29, 8, 1, 1500], [29, 2, 2, 20], [30, 9, 2, 250], [30, 1, 1, 80],
    ]),
  };

  // ---- hr: a company with a reporting line ----------------------------------------------------
  const hr = {
    departments: T('id INTEGER PRIMARY KEY, name TEXT, location TEXT', [
      [1, 'Engineering', 'Bengaluru'], [2, 'Sales', 'Mumbai'], [3, 'Finance', 'Delhi'],
      [4, 'HR', 'Delhi'], [5, 'Support', 'Chennai'],
    ]),
    employees: T('id INTEGER PRIMARY KEY, name TEXT, dept_id INTEGER, manager_id INTEGER, title TEXT, salary INTEGER, hire_date TEXT', [
      [1, 'Meera', null, null, 'CEO', 250000, '2015-04-01'], [2, 'Rohan', 1, 1, 'VP Engineering', 180000, '2016-02-10'],
      [3, 'Sana', 2, 1, 'VP Sales', 170000, '2016-06-15'], [4, 'Tarun', 3, 1, 'CFO', 175000, '2017-01-09'],
      [5, 'Uma', 1, 2, 'Eng Manager', 140000, '2018-03-12'], [6, 'Vikram', 1, 5, 'Engineer', 110000, '2019-07-01'],
      [7, 'Wasim', 1, 5, 'Engineer', 110000, '2020-01-20'], [8, 'Xena', 1, 5, 'Engineer', 95000, '2021-09-13'],
      [9, 'Yash', 2, 3, 'Sales Manager', 120000, '2018-11-05'], [10, 'Zoya', 2, 9, 'Sales Rep', 70000, '2020-05-18'],
      [11, 'Aman', 2, 9, 'Sales Rep', 70000, '2021-02-22'], [12, 'Bela', 2, 9, 'Sales Rep', 65000, '2022-08-30'],
      [13, 'Chirag', 3, 4, 'Accountant', 80000, '2019-10-14'], [14, 'Divya', 3, 4, 'Accountant', 85000, '2021-06-07'],
      [15, 'Esha', 4, 1, 'HR Lead', 90000, '2018-09-25'], [16, 'Farhan', 4, 15, 'HR Exec', 55000, '2023-03-06'],
    ]),
    projects: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Atlas'], [2, 'Beacon'], [3, 'Comet']]),
    assignments: T('emp_id INTEGER, project_id INTEGER, hours INTEGER', [
      [6, 1, 120], [6, 2, 40], [7, 1, 100], [8, 1, 60], [8, 3, 80], [5, 1, 30], [5, 2, 30], [5, 3, 30],
      [10, 3, 90], [11, 3, 70], [13, 2, 50], [14, 2, 45], [2, 1, 10],
    ]),
  };

  // ---- web: product analytics ------------------------------------------------------------------
  const web = {
    users: T('id INTEGER PRIMARY KEY, name TEXT, signup_date TEXT, country TEXT, plan TEXT', [
      [1, 'Ana', '2024-01-02', 'IN', 'free'], [2, 'Bo', '2024-01-03', 'US', 'pro'], [3, 'Cy', '2024-01-03', 'IN', 'free'],
      [4, 'Di', '2024-01-09', 'UK', 'pro'], [5, 'Ed', '2024-01-10', 'IN', 'free'], [6, 'Flo', '2024-01-17', 'US', 'free'],
      [7, 'Gus', '2024-01-18', 'IN', 'pro'], [8, 'Hana', '2024-01-25', 'UK', 'free'], [9, 'Ivo', '2024-01-26', 'US', 'free'],
      [10, 'Jun', '2024-02-02', 'IN', 'pro'],
    ]),
    events: T('id INTEGER PRIMARY KEY, user_id INTEGER, event_type TEXT, event_time TEXT', [
      [1, 1, 'login', '2024-01-02 09:00:00'], [2, 1, 'view', '2024-01-02 09:05:00'], [3, 1, 'add_to_cart', '2024-01-02 09:12:00'],
      [4, 1, 'purchase', '2024-01-02 09:15:00'], [5, 1, 'login', '2024-01-03 20:00:00'], [6, 1, 'view', '2024-01-03 20:10:00'],
      [7, 1, 'login', '2024-01-09 08:30:00'], [8, 1, 'view', '2024-01-09 08:50:00'],
      [9, 2, 'login', '2024-01-03 10:00:00'], [10, 2, 'view', '2024-01-03 10:02:00'], [11, 2, 'view', '2024-01-03 10:05:00'],
      [12, 2, 'add_to_cart', '2024-01-03 10:20:00'], [13, 2, 'view', '2024-01-03 11:30:00'], [14, 2, 'purchase', '2024-01-03 11:40:00'],
      [15, 2, 'login', '2024-01-04 10:00:00'], [16, 2, 'login', '2024-01-05 10:00:00'], [17, 2, 'login', '2024-01-06 10:00:00'],
      [18, 2, 'login', '2024-01-08 10:00:00'],
      [19, 3, 'login', '2024-01-03 15:00:00'], [20, 3, 'view', '2024-01-03 15:03:00'], [21, 3, 'logout', '2024-01-03 15:10:00'],
      [22, 4, 'login', '2024-01-09 12:00:00'], [23, 4, 'view', '2024-01-09 12:04:00'], [24, 4, 'add_to_cart', '2024-01-09 12:08:00'],
      [25, 4, 'purchase', '2024-01-09 12:09:00'], [26, 4, 'login', '2024-01-10 12:00:00'], [27, 4, 'login', '2024-01-11 12:00:00'],
      [28, 4, 'purchase', '2024-01-11 12:30:00'],
      [29, 5, 'login', '2024-01-10 18:00:00'], [30, 5, 'view', '2024-01-10 18:05:00'],
      [31, 6, 'login', '2024-01-17 07:00:00'], [32, 6, 'view', '2024-01-17 07:15:00'], [33, 6, 'add_to_cart', '2024-01-17 07:20:00'],
      [34, 6, 'login', '2024-01-24 07:00:00'], [35, 6, 'purchase', '2024-01-24 07:10:00'],
      [36, 7, 'login', '2024-01-18 21:00:00'], [37, 7, 'view', '2024-01-18 21:10:00'], [38, 7, 'add_to_cart', '2024-01-18 21:15:00'],
      [39, 7, 'purchase', '2024-01-18 21:20:00'], [40, 7, 'login', '2024-01-19 21:00:00'], [41, 7, 'login', '2024-01-20 21:00:00'],
      [42, 7, 'login', '2024-01-21 21:00:00'], [43, 7, 'login', '2024-01-22 21:00:00'], [44, 7, 'login', '2024-01-25 21:00:00'],
      [45, 8, 'login', '2024-01-25 11:00:00'], [46, 8, 'view', '2024-01-25 11:30:00'], [47, 8, 'view', '2024-01-25 12:30:00'],
      [48, 10, 'login', '2024-02-02 09:00:00'], [49, 10, 'view', '2024-02-02 09:05:00'], [50, 10, 'add_to_cart', '2024-02-02 09:30:00'],
      [51, 10, 'purchase', '2024-02-02 09:45:00'], [52, 10, 'login', '2024-02-09 09:00:00'],
    ]),
  };

  // ---- bank: accounts and transactions ---------------------------------------------------------
  const bank = {
    accounts: T('id INTEGER PRIMARY KEY, owner TEXT, type TEXT, opened TEXT', [
      [1, 'Asha', 'savings', '2022-05-01'], [2, 'Ben', 'current', '2022-07-15'], [3, 'Chitra', 'savings', '2023-01-10'],
      [4, 'Dev', 'savings', '2023-03-03'], [5, 'Esha', 'current', '2023-06-21'], [6, 'Farid', 'savings', '2023-09-09'],
    ]),
    transactions: T('id INTEGER PRIMARY KEY, account_id INTEGER, txn_date TEXT, amount INTEGER, kind TEXT', [
      [1, 1, '2024-01-01', 5000, 'deposit'], [2, 1, '2024-01-05', -1200, 'withdrawal'], [3, 1, '2024-01-10', -300, 'withdrawal'],
      [4, 1, '2024-01-31', 25, 'interest'], [5, 1, '2024-02-03', 2000, 'deposit'], [6, 1, '2024-02-14', -2500, 'withdrawal'],
      [7, 1, '2024-02-29', 20, 'interest'],
      [8, 2, '2024-01-02', 10000, 'deposit'], [9, 2, '2024-01-15', -4000, 'withdrawal'], [10, 2, '2024-01-16', -4500, 'withdrawal'],
      [11, 2, '2024-01-20', -2000, 'withdrawal'], [12, 2, '2024-02-01', 3000, 'deposit'], [13, 2, '2024-02-10', -100, 'fee'],
      [14, 3, '2024-01-03', 800, 'deposit'], [15, 3, '2024-01-04', 800, 'deposit'], [16, 3, '2024-01-05', 800, 'deposit'],
      [17, 3, '2024-01-08', 800, 'deposit'], [18, 3, '2024-01-09', -500, 'withdrawal'], [19, 3, '2024-01-10', 800, 'deposit'],
      [20, 4, '2024-01-07', 15000, 'deposit'], [21, 4, '2024-02-07', 15000, 'deposit'], [22, 4, '2024-03-07', -30000, 'withdrawal'],
      [23, 5, '2024-01-12', 600, 'deposit'], [24, 5, '2024-01-12', -100, 'fee'], [25, 5, '2024-02-12', 600, 'deposit'],
      [26, 5, '2024-02-12', -100, 'fee'], [27, 5, '2024-03-12', 600, 'deposit'], [28, 5, '2024-03-12', -100, 'fee'],
      [29, 6, '2024-02-01', 100, 'deposit'], [30, 6, '2024-02-02', 100, 'deposit'], [31, 6, '2024-02-03', 100, 'deposit'],
      [32, 6, '2024-02-06', 100, 'deposit'], [33, 6, '2024-02-07', 100, 'deposit'], [34, 6, '2024-02-08', 100, 'deposit'],
    ]),
  };

  // ---- rides: a ride-hailing service -----------------------------------------------------------
  const rides = {
    drivers: T('id INTEGER PRIMARY KEY, name TEXT, city TEXT, joined TEXT', [
      [1, 'Arun', 'Mumbai', '2023-01-10'], [2, 'Bina', 'Delhi', '2023-02-14'], [3, 'Chet', 'Mumbai', '2023-04-02'],
      [4, 'Dara', 'Delhi', '2023-06-19'], [5, 'Eka', 'Pune', '2023-09-01'], [6, 'Fali', 'Mumbai', '2023-11-11'],
    ]),
    riders: T('id INTEGER PRIMARY KEY, name TEXT, signup_date TEXT', [
      [1, 'Ria', '2023-10-01'], [2, 'Sam', '2023-10-14'], [3, 'Tia', '2023-11-02'], [4, 'Uday', '2023-11-20'],
      [5, 'Veda', '2023-12-05'], [6, 'Wren', '2023-12-18'], [7, 'Xan', '2024-01-09'], [8, 'Yuki', '2024-01-30'],
    ]),
    trips: T('id INTEGER PRIMARY KEY, rider_id INTEGER, driver_id INTEGER, city TEXT, request_time TEXT, status TEXT, fare INTEGER, distance_km INTEGER', [
      [1, 1, 1, 'Mumbai', '2024-03-01 08:10:00', 'completed', 220, 12], [2, 2, 1, 'Mumbai', '2024-03-01 09:40:00', 'completed', 180, 9],
      [3, 3, 3, 'Mumbai', '2024-03-01 18:05:00', 'cancelled_by_driver', null, null], [4, 4, 2, 'Delhi', '2024-03-01 19:20:00', 'completed', 310, 17],
      [5, 5, 4, 'Delhi', '2024-03-02 07:50:00', 'completed', 150, 7], [6, 1, 1, 'Mumbai', '2024-03-02 08:15:00', 'completed', 240, 13],
      [7, 6, 3, 'Mumbai', '2024-03-02 21:30:00', 'cancelled_by_rider', null, null], [8, 2, 2, 'Delhi', '2024-03-02 22:00:00', 'completed', 410, 22],
      [9, 7, 5, 'Pune', '2024-03-03 10:00:00', 'completed', 130, 6], [10, 8, 5, 'Pune', '2024-03-03 11:30:00', 'cancelled_by_driver', null, null],
      [11, 3, 3, 'Mumbai', '2024-03-03 12:00:00', 'completed', 200, 10], [12, 4, 4, 'Delhi', '2024-03-04 08:00:00', 'completed', 170, 8],
      [13, 1, 1, 'Mumbai', '2024-03-04 08:20:00', 'cancelled_by_driver', null, null], [14, 5, 2, 'Delhi', '2024-03-04 18:40:00', 'completed', 360, 19],
      [15, 6, 3, 'Mumbai', '2024-03-05 09:00:00', 'completed', 190, 10], [16, 7, 5, 'Pune', '2024-03-05 17:45:00', 'completed', 160, 8],
      [17, 2, 1, 'Mumbai', '2024-03-05 20:10:00', 'completed', 260, 14], [18, 8, 4, 'Delhi', '2024-03-06 07:30:00', 'cancelled_by_rider', null, null],
      [19, 3, 3, 'Mumbai', '2024-03-06 08:45:00', 'completed', 215, 11], [20, 4, 2, 'Delhi', '2024-03-06 19:00:00', 'completed', 330, 18],
      [21, 1, 1, 'Mumbai', '2024-03-07 08:05:00', 'completed', 230, 12], [22, 5, 4, 'Delhi', '2024-03-07 12:15:00', 'completed', 140, 7],
      [23, 6, 3, 'Mumbai', '2024-03-08 13:00:00', 'cancelled_by_driver', null, null], [24, 7, 5, 'Pune', '2024-03-08 09:10:00', 'completed', 125, 6],
      [25, 2, 2, 'Delhi', '2024-03-09 23:00:00', 'completed', 450, 25], [26, 8, 5, 'Pune', '2024-03-09 10:30:00', 'completed', 155, 7],
      [27, 3, 1, 'Mumbai', '2024-03-10 08:00:00', 'completed', 205, 11], [28, 4, 4, 'Delhi', '2024-03-10 20:30:00', 'cancelled_by_driver', null, null],
    ]),
  };

  // ---- school: students, courses and exam scores -----------------------------------------------
  // Scores per student: [term T1 [math, physics, english], term T2 [math, physics, english]].
  const SCORES = {
    1: [[88, 72, 65], [91, 75, 70]], 2: [[76, 81, 90], [80, 79, 92]], 3: [[55, 38, 60], [62, 45, 58]],
    4: [[88, 92, 85], [90, 94, 88]], 5: [[35, 48, 70], [52, 50, 74]], 6: [[67, 59, 38], [71, 63, 45]],
    7: [[92, 85, 78], [89, 88, 82]], 8: [[76, 70, 82], [79, 72, 86]],
  };
  const scoreRows = [];
  Object.keys(SCORES).forEach((sid) => ['T1', 'T2'].forEach((term, ti) => SCORES[sid][ti].forEach((sc, ci) => scoreRows.push([+sid, ci + 1, term, sc]))));
  const school = {
    students: T('id INTEGER PRIMARY KEY, name TEXT, class TEXT', [
      [1, 'Aarav', 'A'], [2, 'Bhavna', 'A'], [3, 'Chirag', 'B'], [4, 'Disha', 'B'],
      [5, 'Eshan', 'A'], [6, 'Fiza', 'B'], [7, 'Gopal', 'A'], [8, 'Hema', 'B'],
    ]),
    courses: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Math'], [2, 'Physics'], [3, 'English'], [4, 'Chemistry']]),
    scores: T('student_id INTEGER, course_id INTEGER, term TEXT, score INTEGER', scoreRows),
  };

  window.DOJO_DB = { shop, hr, web, bank, rides, school };

  // ---- helpers -----------------------------------------------------------------------------------
  const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");

  /** All tables a question uses, as { name: { cols, rows } }. */
  window.dojoTablesFor = function (q) {
    const out = {};
    (q.tb || []).forEach((name) => {
      const t = (q.extra && q.extra[name]) || (window.DOJO_DB[q.db] && window.DOJO_DB[q.db][name]);
      if (!t) throw new Error(`Question "${q.t}" uses unknown table ${name}`);
      out[name] = t;
    });
    return out;
  };

  /** CREATE TABLE + INSERT statements for a question's tables. */
  window.dojoSetupSql = function (q) {
    const parts = [];
    const tables = window.dojoTablesFor(q);
    Object.keys(tables).forEach((name) => {
      const t = tables[name];
      parts.push(`CREATE TABLE ${name} (${t.cols});`);
      for (let i = 0; i < t.rows.length; i += 200) {
        parts.push(`INSERT INTO ${name} VALUES ${t.rows.slice(i, i + 200).map((r) => '(' + r.map(lit).join(', ') + ')').join(', ')};`);
      }
    });
    return parts.join('\n');
  };

  // ---- the question bank ---------------------------------------------------------------------------
  // DOJO_SQL_ADD('easy', [...]) numbers questions in the order the files load: easy 1-50, medium 51-75,
  // hard 76-100, advanced 101-125.
  window.DOJO_SQL = window.DOJO_SQL || [];
  const LEVEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', advanced: 'Advanced' };
  window.DOJO_SQL_ADD = function (level, list) {
    list.forEach((q) => {
      q.id = window.DOJO_SQL.length + 1;
      q.difficulty = LEVEL[level];
      window.DOJO_SQL.push(q);
    });
  };
})();
