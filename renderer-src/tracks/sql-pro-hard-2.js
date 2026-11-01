// Dojo SQL, interview-grade set: Hard, batch 2.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('hard', [
    { t: 'Week-One Retention by Plan', tg: ['cohort', 'count distinct', 'joins'],
      tb: ['plans', 'users', 'devices', 'sessions'],
      extra: {
        plans: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Free'], [2, 'Pro']]),
        users: T('id INTEGER PRIMARY KEY, plan_id INTEGER, signup_week INTEGER', [
          [1, 1, 10], [2, 1, 10], [3, 1, 10], [4, 2, 10], [5, 2, 10]]),
        devices: T('id INTEGER PRIMARY KEY, kind TEXT', [[100, 'phone'], [101, 'laptop'], [102, 'bot']]),
        sessions: T('id INTEGER PRIMARY KEY, user_id INTEGER, device_id INTEGER, week INTEGER', [
          [1, 1, 100, 11], [2, 2, 101, 11], [3, 3, 100, 13], [4, 4, 101, 11], [5, 5, 100, 12]]),
      },
      hidden: [
        { sessions: [[1, 1, 100, 11], [2, 2, 102, 11], [3, 3, 100, 13], [4, 4, 101, 11], [5, 5, 102, 11]] },
        { sessions: [[1, 1, 100, 11], [2, 2, 100, 11], [3, 3, 100, 11], [4, 4, 101, 11], [5, 5, 100, 11]] },
      ],
      s: 'Everyone in this report signed up in week 10. A session from a device of kind "bot" is traffic, not a person.',
      k: 'For each plan, report how many users signed up and how many of them had a real session in week 11, plus the retention rounded to 2 decimals. Return name, signups, retained and rate in any order.',
      n: ['A user with three sessions in week 11 is retained once.', 'Sessions in later weeks do not count for week one.'],
      q: "SELECT p.name, COUNT(*) AS signups, SUM(CASE WHEN EXISTS (SELECT 1 FROM sessions s JOIN devices d ON d.id = s.device_id WHERE s.user_id = u.id AND s.week = 11 AND d.kind <> 'bot') THEN 1 ELSE 0 END) AS retained, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM sessions s JOIN devices d ON d.id = s.device_id WHERE s.user_id = u.id AND s.week = 11 AND d.kind <> 'bot') THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM users u JOIN plans p ON p.id = u.plan_id GROUP BY p.id, p.name",
      wrong: ["SELECT p.name, COUNT(*) AS signups, SUM(CASE WHEN EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id AND s.week = 11) THEN 1 ELSE 0 END) AS retained, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id AND s.week = 11) THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM users u JOIN plans p ON p.id = u.plan_id GROUP BY p.id, p.name"],
      h: 'The population is the users, and a user is retained when a real session exists in week 11.',
      x: 'Driving from users keeps the denominator right, and the EXISTS reaches through the session to the device so bot traffic cannot retain anybody.' },

    { t: 'Funnel Steps Reached in Order', tg: ['funnel', 'ordering', 'exists'],
      tb: ['steps', 'users', 'sessions', 'events'],
      extra: {
        steps: T('step_no INTEGER PRIMARY KEY, name TEXT', [[1, 'view'], [2, 'cart'], [3, 'checkout']]),
        users: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        sessions: T('id INTEGER PRIMARY KEY, user_id INTEGER, day TEXT', [[10, 1, '2024-06-01'], [11, 2, '2024-06-01'], [12, 3, '2024-06-02']]),
        events: T('id INTEGER PRIMARY KEY, session_id INTEGER, step_no INTEGER, ts INTEGER', [
          [1, 10, 1, 0], [2, 10, 2, 10], [3, 10, 3, 20],
          [4, 11, 1, 0], [5, 11, 2, 15],
          [6, 12, 1, 0]]),
      },
      hidden: [
        { events: [[1, 10, 1, 0], [2, 10, 2, 10], [3, 10, 3, 20], [4, 11, 2, 0], [5, 11, 1, 15], [6, 12, 1, 0]] },
        { events: [[1, 10, 1, 0], [2, 10, 2, 10], [3, 10, 3, 20], [4, 11, 1, 0], [5, 11, 2, 5], [6, 11, 3, 9]] },
      ],
      s: 'A session only counts as reaching a step if it passed every earlier step first, each one later than the one before.',
      k: 'For each funnel step, report the step name and how many sessions reached it. Any order.',
      n: ['A cart event logged before the view does not count as progress.'],
      q: 'WITH ok AS (SELECT e.session_id, e.step_no, e.ts FROM events e WHERE NOT EXISTS (SELECT 1 FROM steps s2 WHERE s2.step_no < e.step_no AND NOT EXISTS (SELECT 1 FROM events e2 WHERE e2.session_id = e.session_id AND e2.step_no = s2.step_no AND e2.ts < e.ts))) SELECT s.name, COUNT(DISTINCT ok.session_id) AS sessions FROM steps s JOIN ok ON ok.step_no = s.step_no GROUP BY s.step_no, s.name',
      wrong: ['SELECT s.name, COUNT(DISTINCT e.session_id) AS sessions FROM steps s JOIN events e ON e.step_no = s.step_no GROUP BY s.step_no, s.name'],
      h: 'For an event to count, every earlier step must have an event of its own with a smaller timestamp.',
      x: 'The nested NOT EXISTS says "no earlier step is missing a timestamp before this one", which is what reaching a step in order means. Counting the raw events credits sessions that jumped straight in.' },

    { t: 'Stock Ageing Buckets', tg: ['buckets', 'cross join', 'left join'], o: true,
      tb: ['buckets', 'products', 'lots'],
      extra: {
        buckets: T('label TEXT PRIMARY KEY, min_days INTEGER, max_days INTEGER', [['0-30', 0, 30], ['31-90', 31, 90], ['91+', 91, 100000]]),
        products: T('id INTEGER PRIMARY KEY, sku TEXT', [[1, 'LAMP-01'], [2, 'DESK-02']]),
        lots: T('id INTEGER PRIMARY KEY, product_id INTEGER, received_day TEXT, qty INTEGER', [
          [1, 1, '2024-06-20', 10], [2, 1, '2024-05-01', 5], [3, 2, '2024-06-25', 8], [4, 2, '2024-05-10', 4], [5, 2, '2024-01-01', 3]]),
      },
      hidden: [
        { lots: [[1, 1, '2024-06-20', 10], [2, 1, '2024-05-01', 5], [3, 2, '2024-06-25', 8], [4, 2, '2024-05-10', 4]] },
        { lots: [[1, 1, '2024-06-20', 10], [2, 1, '2024-06-21', 5], [3, 2, '2024-06-25', 8], [4, 2, '2024-06-26', 4]] },
      ],
      s: 'Stock is aged against 2024-07-01: a lot received on 2024-06-20 has been held 11 days.',
      k: 'Report the quantity held in each ageing bucket. Every bucket appears, with 0 when it holds nothing. Order by label.',
      q: "SELECT b.label, COALESCE((SELECT SUM(l.qty) FROM lots l WHERE CAST(julianday('2024-07-01') - julianday(l.received_day) AS INTEGER) BETWEEN b.min_days AND b.max_days), 0) AS qty FROM buckets b ORDER BY b.label",
      wrong: ["SELECT b.label, SUM(l.qty) AS qty FROM lots l JOIN buckets b ON CAST(julianday('2024-07-01') - julianday(l.received_day) AS INTEGER) BETWEEN b.min_days AND b.max_days JOIN products p ON p.id = l.product_id GROUP BY b.label ORDER BY b.label"],
      h: 'The buckets are the spine of the report, so start from them.',
      x: 'Driving from the bucket table and totalling the lots inside each one guarantees a row per bucket. A join from the lots only reports the buckets that happen to hold something.' },

    { t: 'Churned Revenue by Reason', tg: ['window', 'latest row', 'joins'],
      tb: ['reasons', 'customers', 'subscriptions', 'cancellations'],
      extra: {
        reasons: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Too expensive'], [2, 'Missing feature'], [3, 'Switched vendor']]),
        customers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        subscriptions: T('customer_id INTEGER, mrr INTEGER', [[1, 600], [2, 1200], [3, 300]]),
        cancellations: T('id INTEGER PRIMARY KEY, customer_id INTEGER, reason_id INTEGER, day TEXT', [
          [1, 1, 1, '2024-03-01'], [2, 2, 2, '2024-03-05'], [3, 3, 1, '2024-03-09']]),
      },
      hidden: [
        { cancellations: [[1, 1, 1, '2024-03-01'], [2, 1, 3, '2024-05-01'], [3, 2, 2, '2024-03-05'], [4, 3, 1, '2024-03-09']] },
        { cancellations: [[1, 1, 2, '2024-03-01'], [2, 2, 2, '2024-03-05'], [3, 3, 3, '2024-03-09']] },
      ],
      s: 'A customer can leave, come back and leave again. Only the most recent departure explains where their revenue went.',
      k: 'For each reason, report the monthly revenue lost through it. Reasons nobody gave are left out. Return name and mrr_lost in any order.',
      q: 'WITH last_c AS (SELECT customer_id, reason_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day DESC, id DESC) AS rk FROM cancellations) SELECT r.name, SUM(s.mrr) AS mrr_lost FROM last_c lc JOIN subscriptions s ON s.customer_id = lc.customer_id JOIN reasons r ON r.id = lc.reason_id WHERE lc.rk = 1 GROUP BY r.id, r.name',
      wrong: ['SELECT r.name, SUM(s.mrr) AS mrr_lost FROM cancellations c JOIN subscriptions s ON s.customer_id = c.customer_id JOIN reasons r ON r.id = c.reason_id GROUP BY r.id, r.name'],
      h: 'Reduce the cancellations to the latest one per customer before you add any revenue up.',
      x: 'Without that step a customer who left twice has their revenue counted under both reasons, so the total exceeds the revenue that actually left.' },

    { t: 'Driver Utilisation Across Shifts', tg: ['left join', 'coalesce', 'rate'],
      tb: ['cities', 'drivers', 'shifts', 'rides'],
      extra: {
        cities: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Metro A'], [2, 'Town B']]),
        drivers: T('id INTEGER PRIMARY KEY, city_id INTEGER, name TEXT', [[10, 1, 'Asha'], [11, 1, 'Ben'], [12, 2, 'Chitra']]),
        shifts: T('id INTEGER PRIMARY KEY, driver_id INTEGER, online_min INTEGER', [
          [100, 10, 300], [101, 10, 200], [102, 11, 400], [103, 12, 100]]),
        rides: T('id INTEGER PRIMARY KEY, shift_id INTEGER, duration_min INTEGER', [
          [1, 100, 150], [2, 101, 50], [3, 102, 100], [4, 103, 80]]),
      },
      hidden: [
        { rides: [[1, 100, 150], [2, 102, 100], [3, 103, 80]] },
        { rides: [[1, 100, 100], [2, 100, 50], [3, 101, 150], [4, 102, 40], [5, 103, 10]] },
      ],
      s: 'A driver can be online for a whole shift without a single ride.',
      k: 'For each driver, report the share of their online minutes spent on rides, rounded to 2 decimals. Return the city, the driver and utilisation, in any order.',
      q: 'SELECT c.name AS city, d.name AS driver, ROUND(1.0 * SUM(COALESCE((SELECT SUM(r.duration_min) FROM rides r WHERE r.shift_id = s.id), 0)) / SUM(s.online_min), 2) AS utilisation FROM shifts s JOIN drivers d ON d.id = s.driver_id JOIN cities c ON c.id = d.city_id GROUP BY d.id, c.name, d.name',
      wrong: ['SELECT c.name AS city, d.name AS driver, ROUND(1.0 * SUM(r.duration_min) / SUM(s.online_min), 2) AS utilisation FROM shifts s JOIN drivers d ON d.id = s.driver_id JOIN cities c ON c.id = d.city_id JOIN rides r ON r.shift_id = s.id GROUP BY d.id, c.name, d.name'],
      h: 'Total the rides per shift first, then compare with the online minutes.',
      x: 'A per-shift subquery with a zero default keeps empty shifts in the denominator, and stops a shift with two rides from counting its online minutes twice.' },

    { t: 'Velocity Rule Over a Sliding Window', tg: ['self join', 'sliding window', 'having'],
      tb: ['merchants', 'cards', 'txns', 'rules'],
      extra: {
        merchants: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Corner Shop'], [2, 'Big Store']]),
        cards: T('id INTEGER PRIMARY KEY, holder TEXT', [[500, 'Asha'], [501, 'Ben']]),
        txns: T('id INTEGER PRIMARY KEY, card_id INTEGER, merchant_id INTEGER, at_min INTEGER', [
          [1, 500, 1, 10], [2, 500, 1, 20], [3, 500, 2, 30], [4, 501, 1, 100], [5, 501, 2, 400]]),
        rules: T('id INTEGER PRIMARY KEY, window_min INTEGER, max_txns INTEGER', [[1, 60, 2]]),
      },
      hidden: [
        { txns: [[1, 500, 1, 50], [2, 500, 1, 70], [3, 500, 2, 90], [4, 501, 1, 100], [5, 501, 2, 400]] },
        { txns: [[1, 500, 1, 10], [2, 500, 1, 20], [3, 501, 2, 30], [4, 501, 1, 40], [5, 501, 2, 50]] },
      ],
      s: 'The rule is about any stretch of time as long as the window, not about clock hours.',
      k: 'Find the cards that broke the rule: more transactions than the rule allows inside some window of its length, counted from one of their own transactions. Return the holder and the largest number seen in such a window, in any order.',
      n: ['The window starts at a transaction and includes it.'],
      q: 'WITH w AS (SELECT t1.card_id, t1.id AS anchor, COUNT(*) AS n FROM txns t1 JOIN txns t2 ON t2.card_id = t1.card_id AND t2.at_min >= t1.at_min AND t2.at_min < t1.at_min + (SELECT window_min FROM rules WHERE id = 1) GROUP BY t1.card_id, t1.id) SELECT c.holder, MAX(w.n) AS worst FROM w JOIN cards c ON c.id = w.card_id WHERE w.n > (SELECT max_txns FROM rules WHERE id = 1) GROUP BY c.id, c.holder',
      wrong: ['WITH b AS (SELECT card_id, at_min / (SELECT window_min FROM rules WHERE id = 1) AS bucket, COUNT(*) AS n FROM txns GROUP BY card_id, at_min / (SELECT window_min FROM rules WHERE id = 1)) SELECT c.holder, MAX(b.n) AS worst FROM b JOIN cards c ON c.id = b.card_id WHERE b.n > (SELECT max_txns FROM rules WHERE id = 1) GROUP BY c.id, c.holder'],
      h: 'Anchor a window at every transaction of the card and count what falls inside it.',
      x: 'A self join on the card with a time range is a sliding window. Dividing the clock into fixed buckets misses a burst that straddles a boundary, which is exactly how a fraudster would slip through.' },

    { t: 'Doctors Over Their Panel Cap', tg: ['joins', 'status filter', 'having'],
      tb: ['specialties', 'doctors', 'patients'],
      extra: {
        specialties: T('id INTEGER PRIMARY KEY, name TEXT, panel_cap INTEGER', [[1, 'General', 3], [2, 'Cardiology', 2]]),
        doctors: T('id INTEGER PRIMARY KEY, specialty_id INTEGER, name TEXT', [[10, 1, 'Rao'], [11, 1, 'Iyer'], [12, 2, 'Nair']]),
        patients: T('id INTEGER PRIMARY KEY, doctor_id INTEGER, status TEXT', [
          [1, 10, 'active'], [2, 10, 'active'], [3, 10, 'active'], [4, 10, 'active'],
          [5, 11, 'active'], [6, 12, 'active'], [7, 12, 'active'], [8, 12, 'active']]),
      },
      hidden: [
        { patients: [[1, 10, 'active'], [2, 10, 'active'], [3, 10, 'moved away'], [4, 10, 'active'], [5, 11, 'active'], [6, 12, 'active'], [7, 12, 'moved away'], [8, 12, 'active']] },
        { patients: [[1, 11, 'active'], [2, 11, 'active'], [3, 11, 'active'], [4, 11, 'active'], [5, 10, 'active'], [6, 12, 'active'], [7, 12, 'active'], [8, 12, 'active']] },
      ],
      s: 'A patient who has moved away still has a record but is no longer on the panel.',
      k: 'List the doctors whose active panel is larger than the cap for their specialty. Return the specialty, the doctor, panel and panel_cap, in any order.',
      q: "SELECT s.name AS specialty, d.name AS doctor, COUNT(*) AS panel, s.panel_cap FROM patients p JOIN doctors d ON d.id = p.doctor_id JOIN specialties s ON s.id = d.specialty_id WHERE p.status = 'active' GROUP BY d.id, s.name, d.name, s.panel_cap HAVING COUNT(*) > s.panel_cap",
      wrong: ["SELECT s.name AS specialty, d.name AS doctor, COUNT(*) AS panel, s.panel_cap FROM patients p JOIN doctors d ON d.id = p.doctor_id JOIN specialties s ON s.id = d.specialty_id GROUP BY d.id, s.name, d.name, s.panel_cap HAVING COUNT(*) > s.panel_cap"],
      h: 'Only active patients sit on the panel, and the cap comes from the specialty.',
      x: 'Filtering the status before grouping makes the count the real panel size, and the cap arrives through the doctor\'s specialty.' },

    { t: 'Refund and Chargeback Exposure', tg: ['subquery', 'double counting', 'rate'],
      tb: ['merchants', 'orders', 'refunds', 'chargebacks'],
      extra: {
        merchants: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Corner Shop'], [2, 'Big Store'], [3, 'Kiosk']]),
        orders: T('id INTEGER PRIMARY KEY, merchant_id INTEGER, amount INTEGER', [
          [1, 1, 1000], [2, 1, 1000], [3, 2, 2000], [4, 2, 2000], [5, 3, 500], [6, 3, 500]]),
        refunds: T('order_id INTEGER, amount INTEGER', [[1, 300], [3, 100]]),
        chargebacks: T('order_id INTEGER, amount INTEGER', [[5, 200]]),
      },
      hidden: [
        { refunds: [[1, 300], [3, 100], [5, 50]] },
        { refunds: [[1, 150], [1, 150], [3, 100]] },
      ],
      s: 'An order can be refunded in parts and charged back as well.',
      k: 'For each merchant, report revenue, exposure (refunds plus chargebacks) and the exposure share rounded to 2 decimals, for merchants whose share is above 0.1. Any order.',
      q: 'WITH m AS (SELECT o.merchant_id, SUM(o.amount) AS revenue, (SELECT COALESCE(SUM(r.amount), 0) FROM refunds r JOIN orders o2 ON o2.id = r.order_id WHERE o2.merchant_id = o.merchant_id) + (SELECT COALESCE(SUM(cb.amount), 0) FROM chargebacks cb JOIN orders o3 ON o3.id = cb.order_id WHERE o3.merchant_id = o.merchant_id) AS exposure FROM orders o GROUP BY o.merchant_id) SELECT me.name, m.revenue, m.exposure, ROUND(1.0 * m.exposure / m.revenue, 2) AS share FROM m JOIN merchants me ON me.id = m.merchant_id WHERE 1.0 * m.exposure / m.revenue > 0.1',
      wrong: ['SELECT me.name, SUM(o.amount) AS revenue, COALESCE(SUM(r.amount), 0) + COALESCE(SUM(cb.amount), 0) AS exposure, ROUND(1.0 * (COALESCE(SUM(r.amount), 0) + COALESCE(SUM(cb.amount), 0)) / SUM(o.amount), 2) AS share FROM orders o JOIN merchants me ON me.id = o.merchant_id LEFT JOIN refunds r ON r.order_id = o.id LEFT JOIN chargebacks cb ON cb.order_id = o.id GROUP BY me.id, me.name HAVING 1.0 * (COALESCE(SUM(r.amount), 0) + COALESCE(SUM(cb.amount), 0)) / SUM(o.amount) > 0.1'],
      h: 'Revenue, refunds and chargebacks are three different sets of rows.',
      x: 'Each total is taken in its own subquery, so nothing is repeated. Joining two optional tables onto the orders multiplies the order rows and inflates both the revenue and the exposure.' },

    { t: 'Top Two Products per Category, Net of Returns', tg: ['dense_rank', 'left join', 'ties'],
      tb: ['categories', 'products', 'sales', 'returns'],
      extra: {
        categories: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Lighting'], [2, 'Seating']]),
        products: T('id INTEGER PRIMARY KEY, category_id INTEGER, name TEXT', [
          [10, 1, 'Lamp'], [11, 1, 'Bulb'], [12, 1, 'Shade'], [13, 2, 'Chair'], [14, 2, 'Stool'], [15, 2, 'Bench']]),
        sales: T('id INTEGER PRIMARY KEY, product_id INTEGER, amount INTEGER', [
          [1, 10, 900], [2, 11, 600], [3, 12, 300], [4, 13, 800], [5, 14, 500], [6, 15, 200]]),
        returns: T('sale_id INTEGER, amount INTEGER', []),
      },
      hidden: [
        { returns: [[1, 700], [4, 700]] },
        { sales: [[1, 900], [2, 900], [3, 300], [4, 800], [5, 800], [6, 200]].map((r, i) => [i + 1, [10, 11, 12, 13, 14, 15][i], r[1]]) },
      ],
      s: 'Money that came back reduces what a product really brought in.',
      k: 'For each category, report the products whose net revenue is among the two highest net figures, ties included. Return the category, the product and net, in any order.',
      q: 'WITH n AS (SELECT p.category_id, p.name, SUM(s.amount) - COALESCE(SUM((SELECT SUM(r.amount) FROM returns r WHERE r.sale_id = s.id)), 0) AS net FROM sales s JOIN products p ON p.id = s.product_id GROUP BY p.id, p.category_id, p.name), r AS (SELECT category_id, name, net, DENSE_RANK() OVER (PARTITION BY category_id ORDER BY net DESC) AS rk FROM n) SELECT c.name AS category, r.name AS product, r.net FROM r JOIN categories c ON c.id = r.category_id WHERE r.rk <= 2',
      wrong: ['WITH n AS (SELECT p.category_id, p.name, SUM(s.amount) AS net FROM sales s JOIN products p ON p.id = s.product_id GROUP BY p.id, p.category_id, p.name), r AS (SELECT category_id, name, net, DENSE_RANK() OVER (PARTITION BY category_id ORDER BY net DESC) AS rk FROM n) SELECT c.name AS category, r.name AS product, r.net FROM r JOIN categories c ON c.id = r.category_id WHERE r.rk <= 2'],
      h: 'Subtract the returns before ranking anything.',
      x: 'A big return can push a product out of the top two, so the ranking has to run on the net figure. Dense ranking keeps products that tie on net.' },

    { t: 'Students at Risk in a Term', tg: ['joins', 'two conditions', 'group by'],
      tb: ['terms', 'students', 'attendance', 'assessments'],
      extra: {
        terms: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Autumn']]),
        students: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        attendance: T('student_id INTEGER, term_id INTEGER, present INTEGER', [
          [1, 1, 1], [1, 1, 1], [1, 1, 0], [1, 1, 0], [2, 1, 1], [2, 1, 1], [2, 1, 1], [2, 1, 1], [3, 1, 1], [3, 1, 0], [3, 1, 0], [3, 1, 0]]),
        assessments: T('student_id INTEGER, term_id INTEGER, score INTEGER', [
          [1, 1, 40], [1, 1, 50], [2, 1, 70], [2, 1, 80], [3, 1, 30], [3, 1, 40]]),
      },
      hidden: [
        { terms: [[1, 'Autumn'], [2, 'Spring']], attendance: [[1, 1, 1], [1, 1, 1], [1, 1, 0], [1, 1, 0], [1, 2, 1], [1, 2, 1], [1, 2, 1], [1, 2, 1], [3, 1, 1], [3, 1, 0], [3, 1, 0], [3, 1, 0]], assessments: [[1, 1, 40], [1, 1, 50], [1, 2, 90], [1, 2, 90], [3, 1, 30], [3, 1, 40]] },
        { assessments: [[1, 1, 60], [1, 1, 70], [2, 1, 70], [2, 1, 80], [3, 1, 30], [3, 1, 40]] },
      ],
      s: 'A student is at risk in a term when they attended less than 80% of sessions in it and also averaged under 50 in its assessments.',
      k: 'List the students at risk, with the term, their attendance rounded to 2 decimals and their average score rounded to 2 decimals. Any order.',
      n: ['Both conditions have to hold in the same term.'],
      q: 'WITH a AS (SELECT student_id, term_id, 1.0 * SUM(present) / COUNT(*) AS att FROM attendance GROUP BY student_id, term_id), s AS (SELECT student_id, term_id, AVG(score) AS avg_score FROM assessments GROUP BY student_id, term_id) SELECT st.name, t.name AS term, ROUND(a.att, 2) AS attendance, ROUND(s.avg_score, 2) AS avg_score FROM a JOIN s ON s.student_id = a.student_id AND s.term_id = a.term_id JOIN students st ON st.id = a.student_id JOIN terms t ON t.id = a.term_id WHERE a.att < 0.8 AND s.avg_score < 50',
      wrong: ['WITH a AS (SELECT student_id, 1.0 * SUM(present) / COUNT(*) AS att FROM attendance GROUP BY student_id), s AS (SELECT student_id, term_id, AVG(score) AS avg_score FROM assessments GROUP BY student_id, term_id) SELECT st.name, t.name AS term, ROUND(a.att, 2) AS attendance, ROUND(s.avg_score, 2) AS avg_score FROM a JOIN s ON s.student_id = a.student_id JOIN students st ON st.id = a.student_id JOIN terms t ON t.id = s.term_id WHERE a.att < 0.8 AND s.avg_score < 50'],
      h: 'Both figures are per student and term, so both grouped tables carry the term.',
      x: 'Aggregating attendance per student only is right while there is a single term, and goes wrong as soon as a student has a good term and a bad one.' },

    { t: 'Gaps Between Shifts at a Site', tg: ['window', 'lag', 'intervals'],
      tb: ['sites', 'staff', 'shifts'],
      extra: {
        sites: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Depot'], [2, 'Yard']]),
        staff: T('id INTEGER PRIMARY KEY, name TEXT', [[10, 'Asha'], [11, 'Ben'], [12, 'Chitra']]),
        shifts: T('id INTEGER PRIMARY KEY, site_id INTEGER, staff_id INTEGER, start_min INTEGER, end_min INTEGER', [
          [1, 1, 10, 0, 300], [2, 1, 11, 360, 600], [3, 2, 12, 0, 240], [4, 2, 10, 300, 480]]),
      },
      hidden: [
        { shifts: [[1, 1, 10, 0, 300], [2, 1, 11, 200, 600], [3, 2, 12, 0, 240], [4, 2, 10, 300, 480]] },
        { shifts: [[1, 1, 10, 0, 300], [2, 1, 11, 360, 600], [3, 1, 10, 700, 900], [4, 2, 12, 0, 240]] },
      ],
      s: 'Shifts at a site can follow each other with a gap, or overlap when two people are on at once.',
      k: 'For each site, report the total minutes with nobody on duty between its first and last shift. Return the site name and uncovered in any order.',
      n: ['Overlapping shifts leave no gap at all, not a negative one.'],
      q: 'WITH s AS (SELECT site_id, start_min, end_min, LAG(end_min) OVER (PARTITION BY site_id ORDER BY start_min, end_min) AS prev_end FROM shifts) SELECT si.name, COALESCE(SUM(MAX(0, s.start_min - s.prev_end)), 0) AS uncovered FROM s JOIN sites si ON si.id = s.site_id GROUP BY si.id, si.name',
      wrong: ['WITH s AS (SELECT site_id, start_min, end_min, LAG(end_min) OVER (PARTITION BY site_id ORDER BY start_min, end_min) AS prev_end FROM shifts) SELECT si.name, COALESCE(SUM(s.start_min - s.prev_end), 0) AS uncovered FROM s JOIN sites si ON si.id = s.site_id GROUP BY si.id, si.name'],
      h: 'A gap is the start of a shift minus the end of the one before, but never below zero.',
      x: 'Clamping at zero stops an overlap from cancelling out a real gap elsewhere in the day.' },

    { t: 'Peak Demand Charge by Month', tg: ['group by', 'max', 'joins'],
      tb: ['tariffs', 'sites', 'meters', 'readings'],
      extra: {
        tariffs: T('id INTEGER PRIMARY KEY, name TEXT, demand_charge INTEGER', [[1, 'Industrial', 50]]),
        sites: T('id INTEGER PRIMARY KEY, tariff_id INTEGER, name TEXT', [[1, 1, 'Mill Road'], [2, 1, 'Dock Yard']]),
        meters: T('id INTEGER PRIMARY KEY, site_id INTEGER', [[10, 1], [11, 1], [12, 2]]),
        readings: T('meter_id INTEGER, month TEXT, kwh INTEGER', [
          [10, '2024-01', 30], [10, '2024-01', 50], [11, '2024-01', 20], [12, '2024-01', 70]]),
      },
      hidden: [
        { readings: [[10, '2024-01', 30], [10, '2024-01', 50], [11, '2024-01', 20], [12, '2024-01', 70], [10, '2024-02', 90], [12, '2024-02', 10]] },
        { readings: [[10, '2024-01', 80], [10, '2024-01', 50], [11, '2024-01', 20], [12, '2024-01', 70]] },
      ],
      s: 'The demand charge is based on the single highest half-hour reading of the month at that site, whichever meter produced it.',
      k: 'For each site and month, report the peak reading and the charge, which is the peak times the tariff charge. Any order.',
      q: 'SELECT s.name, r.month, MAX(r.kwh) AS peak, MAX(r.kwh) * t.demand_charge AS charge FROM readings r JOIN meters m ON m.id = r.meter_id JOIN sites s ON s.id = m.site_id JOIN tariffs t ON t.id = s.tariff_id GROUP BY s.id, s.name, r.month, t.demand_charge',
      wrong: ['WITH p AS (SELECT s.id AS site_id, s.name, MAX(r.kwh) AS peak FROM readings r JOIN meters m ON m.id = r.meter_id JOIN sites s ON s.id = m.site_id GROUP BY s.id, s.name) SELECT p.name, r.month, p.peak, p.peak * t.demand_charge AS charge FROM p JOIN sites s ON s.id = p.site_id JOIN tariffs t ON t.id = s.tariff_id JOIN readings r ON r.meter_id IN (SELECT id FROM meters WHERE site_id = p.site_id) GROUP BY p.name, r.month, p.peak, t.demand_charge'],
      h: 'The peak is per site and month together.',
      x: 'Grouping by both keys takes the maximum inside each month. A peak taken over the whole period charges every month at the worst month\'s level.' },

    { t: 'Invoices Converted at the Right Rate', tg: ['asof lookup', 'joins', 'dates'],
      tb: ['currencies', 'rates', 'invoices', 'invoice_lines'],
      extra: {
        currencies: T('code TEXT PRIMARY KEY, name TEXT', [['EUR', 'Euro'], ['INR', 'Rupee']]),
        rates: T('code TEXT, day TEXT, to_usd REAL', [['EUR', '2024-01-01', 1.1], ['INR', '2024-01-01', 0.012]]),
        invoices: T('id INTEGER PRIMARY KEY, code TEXT, day TEXT, customer TEXT', [
          [1, 'EUR', '2024-02-10', 'Asha'], [2, 'INR', '2024-02-20', 'Ben']]),
        invoice_lines: T('invoice_id INTEGER, amount INTEGER', [[1, 100], [1, 200], [2, 10000]]),
      },
      hidden: [
        { rates: [['EUR', '2024-01-01', 1.1], ['EUR', '2024-02-01', 1.5], ['INR', '2024-01-01', 0.012]] },
        { rates: [['EUR', '2024-01-01', 1.1], ['EUR', '2024-03-01', 2.0], ['INR', '2024-01-01', 0.012], ['INR', '2024-02-15', 0.02]] },
      ],
      s: 'A rate is filed on a day and holds until the next one. An invoice is converted at the rate in force on its own date.',
      k: 'For each invoice, report the customer, the total in its own currency and the total in dollars rounded to 2 decimals. Any order.',
      q: 'SELECT i.customer, SUM(l.amount) AS local_total, ROUND(SUM(l.amount) * (SELECT r.to_usd FROM rates r WHERE r.code = i.code AND r.day <= i.day ORDER BY r.day DESC LIMIT 1), 2) AS usd_total FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id JOIN currencies c ON c.code = i.code GROUP BY i.id, i.customer, i.code, i.day',
      wrong: ['SELECT i.customer, SUM(l.amount) AS local_total, ROUND(SUM(l.amount) * (SELECT r.to_usd FROM rates r WHERE r.code = i.code ORDER BY r.day DESC LIMIT 1), 2) AS usd_total FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id JOIN currencies c ON c.code = i.code GROUP BY i.id, i.customer, i.code, i.day'],
      h: 'Among the rates for that currency, take the newest one that is not after the invoice date.',
      x: 'The date filter inside the subquery is what makes it the rate in force. Taking the newest rate overall values old invoices at today\'s rate.' },

    { t: 'Repeat Offenders Under One Policy', tg: ['joins', 'having', 'count distinct'],
      tb: ['policies', 'users', 'reports'],
      extra: {
        policies: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Spam'], [2, 'Harassment']]),
        users: T('id INTEGER PRIMARY KEY, handle TEXT', [[1, 'asha'], [2, 'ben'], [3, 'chitra']]),
        reports: T('id INTEGER PRIMARY KEY, user_id INTEGER, policy_id INTEGER, upheld INTEGER', [
          [1, 1, 1, 1], [2, 1, 1, 1], [3, 2, 1, 1], [4, 3, 2, 1], [5, 3, 2, 1], [6, 3, 2, 1]]),
      },
      hidden: [
        { reports: [[1, 1, 1, 1], [2, 1, 1, 0], [3, 2, 1, 1], [4, 3, 2, 1], [5, 3, 2, 1], [6, 3, 2, 0]] },
        { reports: [[1, 1, 1, 1], [2, 1, 2, 1], [3, 2, 1, 1], [4, 2, 2, 1], [5, 3, 2, 1], [6, 3, 2, 1]] },
      ],
      s: 'A report can be dismissed rather than upheld, and a user can be reported under different policies.',
      k: 'List the users with at least two upheld reports under the same policy, with that policy and the count. Any order.',
      q: 'SELECT u.handle, p.name AS policy, COUNT(*) AS upheld FROM reports r JOIN users u ON u.id = r.user_id JOIN policies p ON p.id = r.policy_id WHERE r.upheld = 1 GROUP BY u.id, u.handle, p.id, p.name HAVING COUNT(*) >= 2',
      wrong: ['SELECT u.handle, p.name AS policy, COUNT(*) AS upheld FROM reports r JOIN users u ON u.id = r.user_id JOIN policies p ON p.id = r.policy_id GROUP BY u.id, u.handle, p.id, p.name HAVING COUNT(*) >= 2'],
      h: 'Only upheld reports count, and the grouping has to include the policy.',
      x: 'Grouping by user and policy keeps the two reports under the same rule, and the upheld filter leaves out the ones that were dismissed.' },

    { t: 'Bins Holding Incompatible Goods', tg: ['self join', 'lookup table', 'joins'],
      tb: ['classes', 'products', 'bins', 'placements', 'incompatible'],
      extra: {
        classes: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Food'], [2, 'Chemicals'], [3, 'Textiles']]),
        products: T('id INTEGER PRIMARY KEY, class_id INTEGER, name TEXT', [[10, 1, 'Rice'], [11, 2, 'Bleach'], [12, 3, 'Towels']]),
        bins: T('id INTEGER PRIMARY KEY, zone TEXT', [[100, 'A1'], [101, 'A2'], [102, 'B1']]),
        placements: T('bin_id INTEGER, product_id INTEGER', [[100, 10], [100, 11], [101, 10], [102, 11]]),
        incompatible: T('class_a INTEGER, class_b INTEGER', [[1, 2]]),
      },
      hidden: [
        { placements: [[100, 10], [100, 11], [101, 10], [101, 12], [102, 11]] },
        { placements: [[100, 10], [100, 11], [101, 11], [101, 12], [102, 10]], incompatible: [[1, 2], [2, 3]] },
      ],
      s: 'Some goods must not share a bin. The pairs that clash are listed once, in either order.',
      k: 'Find the bins holding two products whose classes clash. Return the zone and the two product names with the smaller id first, in any order.',
      q: 'SELECT b.zone, p1.name AS product_a, p2.name AS product_b FROM placements pl1 JOIN placements pl2 ON pl2.bin_id = pl1.bin_id AND pl2.product_id > pl1.product_id JOIN products p1 ON p1.id = pl1.product_id JOIN products p2 ON p2.id = pl2.product_id JOIN bins b ON b.id = pl1.bin_id JOIN incompatible i ON (i.class_a = p1.class_id AND i.class_b = p2.class_id) OR (i.class_a = p2.class_id AND i.class_b = p1.class_id)',
      wrong: ['SELECT b.zone, p1.name AS product_a, p2.name AS product_b FROM placements pl1 JOIN placements pl2 ON pl2.bin_id = pl1.bin_id AND pl2.product_id > pl1.product_id JOIN products p1 ON p1.id = pl1.product_id JOIN products p2 ON p2.id = pl2.product_id JOIN bins b ON b.id = pl1.bin_id WHERE p1.class_id <> p2.class_id'],
      h: 'The clash is whatever the lookup table says, in either direction.',
      x: 'Joining the incompatibility table with both orderings of the pair applies the real rule. Treating any two different classes as a clash flags perfectly legal bins.' },

    { t: 'Crew Over the Duty Limit in a Day', tg: ['sliding window', 'self join', 'limits'],
      tb: ['roles', 'crew', 'duties'],
      extra: {
        roles: T('id INTEGER PRIMARY KEY, name TEXT, max_minutes INTEGER', [[1, 'Pilot', 600], [2, 'Cabin', 720]]),
        crew: T('id INTEGER PRIMARY KEY, role_id INTEGER, name TEXT', [[10, 1, 'Asha'], [11, 1, 'Ben'], [12, 2, 'Chitra']]),
        duties: T('id INTEGER PRIMARY KEY, crew_id INTEGER, start_min INTEGER, minutes INTEGER', [
          [1, 10, 0, 300], [2, 10, 400, 350], [3, 11, 0, 200], [4, 12, 0, 500], [5, 12, 600, 300]]),
      },
      hidden: [
        { duties: [[1, 10, 1300, 300], [2, 10, 1700, 350], [3, 11, 0, 200], [4, 12, 0, 500], [5, 12, 600, 300]] },
        { roles: [[1, 'Pilot', 700], [2, 'Cabin', 700]] },
      ],
      s: 'A duty starts at a minute and lasts a number of minutes. The limit applies to any 24-hour stretch, which is 1440 minutes, starting at one of the crew member\'s own duties.',
      k: 'List the crew whose duty minutes inside such a stretch exceed the limit for their role, with the worst total. Return the name, the role and worst_minutes, in any order.',
      q: 'WITH w AS (SELECT d1.crew_id, d1.id AS anchor, SUM(d2.minutes) AS total FROM duties d1 JOIN duties d2 ON d2.crew_id = d1.crew_id AND d2.start_min >= d1.start_min AND d2.start_min < d1.start_min + 1440 GROUP BY d1.crew_id, d1.id) SELECT c.name, r.name AS role, MAX(w.total) AS worst_minutes FROM w JOIN crew c ON c.id = w.crew_id JOIN roles r ON r.id = c.role_id WHERE w.total > r.max_minutes GROUP BY c.id, c.name, r.name',
      wrong: ['SELECT c.name, r.name AS role, SUM(d.minutes) AS worst_minutes FROM duties d JOIN crew c ON c.id = d.crew_id JOIN roles r ON r.id = c.role_id GROUP BY c.id, c.name, r.name, d.start_min / 1440 HAVING SUM(d.minutes) > r.max_minutes'],
      h: 'Anchor the stretch at each duty of that crew member and total what falls inside it.',
      x: 'A self join with a time range is a rolling window. Cutting the clock into fixed 24-hour blocks misses a pair of duties that straddles a boundary.' },

    { t: 'Sellers With Two Months of Falling Ratings', tg: ['self join', 'months', 'joins'],
      tb: ['sellers', 'orders', 'reviews'],
      extra: {
        sellers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Alpha'], [2, 'Beta']]),
        orders: T('id INTEGER PRIMARY KEY, seller_id INTEGER, month INTEGER', [
          [1, 1, 1], [2, 1, 2], [3, 1, 3], [4, 2, 1], [5, 2, 2], [6, 2, 3]]),
        reviews: T('order_id INTEGER, stars INTEGER', [[1, 5], [2, 4], [3, 3], [4, 3], [5, 4], [6, 5]]),
      },
      hidden: [
        { reviews: [[1, 5], [2, 3], [3, 4], [4, 3], [5, 4], [6, 5]] },
        { reviews: [[1, 4], [2, 3], [3, 2], [4, 5], [5, 4], [6, 3]] },
      ],
      s: 'A marketplace watches for sellers whose service is sliding, month after month.',
      k: 'Find the sellers whose average rating fell from month 1 to month 2 and again from month 2 to month 3. Return the name and the three averages rounded to 2 decimals, in any order.',
      q: 'WITH m AS (SELECT o.seller_id, o.month, AVG(r.stars) AS avg_stars FROM reviews r JOIN orders o ON o.id = r.order_id GROUP BY o.seller_id, o.month) SELECT s.name, ROUND(m1.avg_stars, 2) AS m1, ROUND(m2.avg_stars, 2) AS m2, ROUND(m3.avg_stars, 2) AS m3 FROM m m1 JOIN m m2 ON m2.seller_id = m1.seller_id AND m2.month = 2 JOIN m m3 ON m3.seller_id = m1.seller_id AND m3.month = 3 JOIN sellers s ON s.id = m1.seller_id WHERE m1.month = 1 AND m2.avg_stars < m1.avg_stars AND m3.avg_stars < m2.avg_stars',
      wrong: ['WITH m AS (SELECT o.seller_id, o.month, AVG(r.stars) AS avg_stars FROM reviews r JOIN orders o ON o.id = r.order_id GROUP BY o.seller_id, o.month) SELECT s.name, ROUND(m1.avg_stars, 2) AS m1, ROUND(m2.avg_stars, 2) AS m2, ROUND(m3.avg_stars, 2) AS m3 FROM m m1 JOIN m m2 ON m2.seller_id = m1.seller_id AND m2.month = 2 JOIN m m3 ON m3.seller_id = m1.seller_id AND m3.month = 3 JOIN sellers s ON s.id = m1.seller_id WHERE m1.month = 1 AND m3.avg_stars < m1.avg_stars'],
      h: 'Both steps down have to hold, not just the overall direction.',
      x: 'Comparing each month with the one before catches a real slide. Comparing the first month with the last also accepts a seller who dipped and recovered.' },

    { t: 'Proration on a Mid-Month Upgrade', tg: ['joins', 'arithmetic', 'dates'],
      tb: ['plans', 'subscriptions', 'changes'],
      extra: {
        plans: T('id INTEGER PRIMARY KEY, name TEXT, price INTEGER', [[1, 'Basic', 300], [2, 'Pro', 900]]),
        subscriptions: T('id INTEGER PRIMARY KEY, customer TEXT, plan_id INTEGER', [[100, 'Asha', 1], [101, 'Ben', 1], [102, 'Chitra', 2]]),
        changes: T('sub_id INTEGER, day INTEGER, new_plan_id INTEGER', [[100, 1, 2], [101, 1, 2]]),
      },
      hidden: [
        { changes: [[100, 11, 2], [101, 1, 2]] },
        { changes: [[100, 21, 2], [101, 16, 2]] },
      ],
      s: 'A billing month is 30 days. When a subscription moves to another plan on day d, the old plan is charged for the days before d and the new plan from day d onwards.',
      k: 'For every subscription that changed plan, report the customer and the amount due for the month, rounded to 2 decimals. Any order.',
      n: ['A change on day 1 means the whole month is on the new plan.'],
      q: 'SELECT s.customer, ROUND(po.price * (c.day - 1) / 30.0 + pn.price * (30 - c.day + 1) / 30.0, 2) AS due FROM changes c JOIN subscriptions s ON s.id = c.sub_id JOIN plans po ON po.id = s.plan_id JOIN plans pn ON pn.id = c.new_plan_id',
      wrong: ['SELECT s.customer, ROUND(pn.price, 2) AS due FROM changes c JOIN subscriptions s ON s.id = c.sub_id JOIN plans po ON po.id = s.plan_id JOIN plans pn ON pn.id = c.new_plan_id'],
      h: 'Split the 30 days at the change and charge each part at its own price.',
      x: 'The old plan covers day 1 up to the day before the change, the new plan the rest. Charging the new price for the whole month only matches when the change lands on day 1.' },

    { t: 'Users Past the Frequency Cap', tg: ['joins', 'having', 'per-row threshold'],
      tb: ['campaigns', 'users', 'impressions'],
      extra: {
        campaigns: T('id INTEGER PRIMARY KEY, name TEXT, frequency_cap INTEGER', [[1, 'Spring Shoes', 2], [2, 'Winter Coats', 2]]),
        users: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        impressions: T('id INTEGER PRIMARY KEY, campaign_id INTEGER, user_id INTEGER', [
          [1, 1, 1], [2, 1, 1], [3, 1, 1], [4, 1, 2], [5, 2, 3], [6, 2, 3], [7, 2, 3]]),
      },
      hidden: [
        { campaigns: [[1, 'Spring Shoes', 2], [2, 'Winter Coats', 5]] },
        { impressions: [[1, 1, 1], [2, 1, 2], [3, 1, 2], [4, 1, 2], [5, 2, 3], [6, 2, 3], [7, 2, 1]] },
      ],
      s: 'Each campaign sets its own cap on how often one person should see it.',
      k: 'List the people who saw a campaign more often than its cap, with the campaign, the count and the cap. Any order.',
      q: 'SELECT u.name, c.name AS campaign, COUNT(*) AS seen, c.frequency_cap FROM impressions i JOIN users u ON u.id = i.user_id JOIN campaigns c ON c.id = i.campaign_id GROUP BY u.id, u.name, c.id, c.name, c.frequency_cap HAVING COUNT(*) > c.frequency_cap',
      wrong: ['SELECT u.name, c.name AS campaign, COUNT(*) AS seen, c.frequency_cap FROM impressions i JOIN users u ON u.id = i.user_id JOIN campaigns c ON c.id = i.campaign_id GROUP BY u.id, u.name, c.id, c.name, c.frequency_cap HAVING COUNT(*) > 2'],
      h: 'The cap is a column on the campaign.',
      x: 'Comparing against the campaign\'s own column keeps working when one campaign is more tolerant than another.' },

    { t: 'Bed Turnaround Time', tg: ['window', 'lag', 'average'],
      tb: ['wards', 'beds', 'stays'],
      extra: {
        wards: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Intensive Care'], [2, 'Maternity']]),
        beds: T('id INTEGER PRIMARY KEY, ward_id INTEGER, label TEXT', [[10, 1, 'ICU-1'], [11, 1, 'ICU-2'], [12, 2, 'MAT-1']]),
        stays: T('id INTEGER PRIMARY KEY, bed_id INTEGER, in_day INTEGER, out_day INTEGER', [
          [1, 10, 1, 3], [2, 10, 5, 7], [3, 11, 1, 2], [4, 11, 6, 8], [5, 12, 1, 4], [6, 12, 6, 9]]),
      },
      hidden: [
        { stays: [[1, 10, 1, 3], [2, 10, 5, 7], [3, 10, 9, 11], [4, 11, 1, 2], [5, 12, 1, 4], [6, 12, 6, 9]] },
        { stays: [[1, 10, 5, 7], [2, 10, 1, 3], [3, 11, 1, 2], [4, 11, 6, 8], [5, 12, 1, 4], [6, 12, 6, 9]] },
      ],
      s: 'The turnaround is the days a bed sits empty between one patient leaving and the next arriving. Stays are not entered in the order they happened.',
      k: 'For each ward, report the average turnaround across its beds, rounded to 2 decimals. Return the ward name and avg_turnaround in any order.',
      q: 'WITH g AS (SELECT s.bed_id, s.in_day - LAG(s.out_day) OVER (PARTITION BY s.bed_id ORDER BY s.in_day) AS gap FROM stays s) SELECT w.name, ROUND(AVG(g.gap), 2) AS avg_turnaround FROM g JOIN beds b ON b.id = g.bed_id JOIN wards w ON w.id = b.ward_id WHERE g.gap IS NOT NULL GROUP BY w.id, w.name',
      wrong: ['WITH g AS (SELECT s.bed_id, s.in_day - LAG(s.out_day) OVER (PARTITION BY s.bed_id ORDER BY s.id) AS gap FROM stays s) SELECT w.name, ROUND(AVG(g.gap), 2) AS avg_turnaround FROM g JOIN beds b ON b.id = g.bed_id JOIN wards w ON w.id = b.ward_id WHERE g.gap IS NOT NULL GROUP BY w.id, w.name'],
      h: 'The gap is between one stay and the next one in the same bed.',
      x: 'LAG over the bed\'s stays in date order gives the previous discharge, and the first stay has no gap to report.' },
  ]);
})();
