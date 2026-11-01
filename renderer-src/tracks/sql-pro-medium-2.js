// Dojo SQL, interview-grade set: Medium, batch 2. Multi-table questions whose trap is a double count, a missing
// row, or a rule that lives one table away from the numbers.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('medium', [
    { t: 'Refund Rate by Payment Method', tg: ['joins', 'exists', 'double counting'],
      tb: ['methods', 'payments', 'refunds'],
      extra: {
        methods: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Card'], [2, 'Wallet'], [3, 'Bank transfer']]),
        payments: T('id INTEGER PRIMARY KEY, method_id INTEGER, amount INTEGER', [
          [1, 1, 1200], [2, 1, 800], [3, 1, 500], [4, 1, 300], [5, 2, 900], [6, 2, 600], [7, 3, 2000], [8, 3, 1500]]),
        refunds: T('payment_id INTEGER, amount INTEGER', [[1, 1200], [5, 900], [7, 2000]]),
      },
      hidden: [
        { refunds: [[1, 600], [1, 600], [5, 900], [7, 2000]] },
        { refunds: [[2, 800], [3, 500], [6, 600]] },
      ],
      s: 'A payment can be refunded in parts, so one payment may have several refund rows.',
      k: 'For each payment method, report the share of its payments that were refunded at all, rounded to 2 decimals. Return name and rate in any order.',
      n: ['A payment refunded in three instalments is one refunded payment.'],
      q: 'SELECT m.name, ROUND(1.0 * (SELECT COUNT(*) FROM payments p2 WHERE p2.method_id = m.id AND EXISTS (SELECT 1 FROM refunds r WHERE r.payment_id = p2.id)) / COUNT(*), 2) AS rate FROM payments p JOIN methods m ON m.id = p.method_id GROUP BY m.id, m.name',
      wrong: ['SELECT m.name, ROUND(1.0 * (SELECT COUNT(*) FROM refunds r JOIN payments p3 ON p3.id = r.payment_id WHERE p3.method_id = m.id) / COUNT(*), 2) AS rate FROM payments p JOIN methods m ON m.id = p.method_id GROUP BY m.id, m.name'],
      h: 'Count payments that have a refund, not refund rows.',
      x: 'EXISTS answers "was this payment refunded" once per payment, whatever the number of instalments. Counting refund rows can even push the share above 1.' },

    { t: 'Average Basket by Membership Tier', tg: ['joins', 'two-level aggregate'],
      tb: ['members', 'orders', 'order_items'],
      extra: {
        members: T('id INTEGER PRIMARY KEY, name TEXT, tier TEXT', [[1, 'Asha', 'gold'], [2, 'Ben', 'silver'], [3, 'Chitra', 'gold'], [4, 'Dev', 'silver']]),
        orders: T('id INTEGER PRIMARY KEY, member_id INTEGER', [[10, 1], [11, 1], [12, 2], [13, 3], [14, 4]]),
        order_items: T('order_id INTEGER, qty INTEGER, price INTEGER', [[10, 2, 100], [11, 1, 400], [12, 3, 50], [13, 1, 900], [14, 2, 75]]),
      },
      hidden: [
        { order_items: [[10, 2, 100], [10, 1, 300], [10, 4, 25], [11, 1, 400], [12, 3, 50], [13, 1, 900], [14, 2, 75]] },
        { order_items: [[10, 1, 100], [11, 1, 100], [12, 1, 900], [13, 1, 100], [14, 1, 900]] },
      ],
      s: 'An order holds any number of lines, and each line has a quantity and a unit price.',
      k: 'For each membership tier, report the average value of an order, rounded to 2 decimals. Return tier and avg_order in any order.',
      n: ['The average is over orders, not over order lines.'],
      q: 'WITH ov AS (SELECT o.id, o.member_id, SUM(i.qty * i.price) AS v FROM orders o JOIN order_items i ON i.order_id = o.id GROUP BY o.id, o.member_id) SELECT m.tier, ROUND(AVG(ov.v), 2) AS avg_order FROM ov JOIN members m ON m.id = ov.member_id GROUP BY m.tier',
      wrong: ['SELECT m.tier, ROUND(AVG(i.qty * i.price), 2) AS avg_order FROM order_items i JOIN orders o ON o.id = i.order_id JOIN members m ON m.id = o.member_id GROUP BY m.tier'],
      h: 'Total each order first, then average those totals.',
      x: 'Averaging straight off the lines weights an order by how many lines it has. Collapsing to one row per order first makes the average mean what the question says.' },

    { t: 'Nights Sold by Room Type', tg: ['joins', 'dates', 'intervals'],
      tb: ['room_types', 'rooms', 'stays'],
      extra: {
        room_types: T('id INTEGER PRIMARY KEY, name TEXT, rate INTEGER', [[1, 'Standard', 4000], [2, 'Suite', 9000]]),
        rooms: T('id INTEGER PRIMARY KEY, type_id INTEGER, number TEXT', [[101, 1, '101'], [102, 1, '102'], [201, 2, '201']]),
        stays: T('id INTEGER PRIMARY KEY, room_id INTEGER, check_in TEXT, check_out TEXT', [
          [1, 101, '2024-07-01', '2024-07-02'], [2, 101, '2024-07-05', '2024-07-06'],
          [3, 102, '2024-07-03', '2024-07-04'], [4, 201, '2024-07-02', '2024-07-03']]),
      },
      hidden: [
        { stays: [[1, 101, '2024-07-01', '2024-07-05'], [2, 101, '2024-07-05', '2024-07-06'], [3, 102, '2024-07-03', '2024-07-04'], [4, 201, '2024-07-02', '2024-07-09']] },
        { stays: [[1, 201, '2024-07-01', '2024-07-03'], [2, 201, '2024-07-05', '2024-07-06'], [3, 102, '2024-07-03', '2024-07-04'], [4, 101, '2024-07-02', '2024-07-03']] },
      ],
      s: 'A guest checking in on the 1st and out on the 5th slept four nights.',
      k: 'For each room type, report the nights sold and the revenue at that type\'s nightly rate. Return name, nights and revenue in any order.',
      q: "SELECT rt.name, SUM(CAST(julianday(s.check_out) - julianday(s.check_in) AS INTEGER)) AS nights, SUM(CAST(julianday(s.check_out) - julianday(s.check_in) AS INTEGER)) * rt.rate AS revenue FROM stays s JOIN rooms r ON r.id = s.room_id JOIN room_types rt ON rt.id = r.type_id GROUP BY rt.id, rt.name, rt.rate",
      wrong: ["SELECT rt.name, COUNT(*) AS nights, COUNT(*) * rt.rate AS revenue FROM stays s JOIN rooms r ON r.id = s.room_id JOIN room_types rt ON rt.id = r.type_id GROUP BY rt.id, rt.name, rt.rate"],
      h: 'The nights of a stay are the days between the two dates, not one per stay.',
      x: 'Subtracting the dates gives the nights, which is the same as counting stays only while every stay is a single night.' },

    { t: 'Doctors With an Empty Diary', tg: ['anti join', 'null', 'not exists'],
      tb: ['specialties', 'doctors', 'appointments'],
      extra: {
        specialties: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Cardiology'], [2, 'Dermatology']]),
        doctors: T('id INTEGER PRIMARY KEY, specialty_id INTEGER, name TEXT', [[7, 1, 'Rao'], [8, 1, 'Iyer'], [9, 2, 'Nair'], [10, 2, 'Das']]),
        appointments: T('id INTEGER PRIMARY KEY, doctor_id INTEGER, day TEXT', [[1, 7, '2024-05-02'], [2, 9, '2024-05-03']]),
      },
      hidden: [
        { appointments: [[1, 7, '2024-05-02'], [2, 9, '2024-05-03'], [3, null, '2024-05-04']] },
        { appointments: [[1, 8, '2024-05-02'], [2, 10, '2024-05-03']] },
      ],
      s: 'An appointment can be recorded before a doctor is assigned to it, which leaves its doctor empty.',
      k: 'List the doctors who have no appointment at all. Return the specialty name and the doctor name in any order.',
      q: 'SELECT s.name AS specialty, d.name AS doctor FROM doctors d JOIN specialties s ON s.id = d.specialty_id WHERE NOT EXISTS (SELECT 1 FROM appointments a WHERE a.doctor_id = d.id)',
      wrong: ['SELECT s.name AS specialty, d.name AS doctor FROM doctors d JOIN specialties s ON s.id = d.specialty_id WHERE d.id NOT IN (SELECT doctor_id FROM appointments)'],
      h: 'What does NOT IN return when the list contains an empty value?',
      x: 'A single NULL in the list makes every NOT IN test unknown, so the query returns nothing at all. NOT EXISTS asks the question row by row and is unaffected.' },

    { t: 'Current Price With a Tie-Break', tg: ['window', 'ties', 'joins'],
      tb: ['products', 'suppliers', 'price_changes'],
      extra: {
        products: T('id INTEGER PRIMARY KEY, sku TEXT', [[1, 'LAMP-01'], [2, 'DESK-02']]),
        suppliers: T('product_id INTEGER, name TEXT', [[1, 'Alpha'], [2, 'Beta']]),
        price_changes: T('id INTEGER PRIMARY KEY, product_id INTEGER, changed_on TEXT, price INTEGER', [
          [1, 1, '2024-01-01', 100], [2, 1, '2024-03-01', 120], [3, 2, '2024-01-01', 500], [4, 2, '2024-02-01', 450]]),
      },
      hidden: [
        { price_changes: [[1, 1, '2024-01-01', 100], [2, 1, '2024-03-01', 120], [5, 1, '2024-03-01', 130], [3, 2, '2024-01-01', 500], [4, 2, '2024-02-01', 450]] },
        { price_changes: [[1, 1, '2024-01-01', 100], [2, 1, '2024-02-01', 90], [3, 2, '2024-01-01', 500], [4, 2, '2024-04-01', 700]] },
      ],
      s: 'Two price changes can be filed on the same day; the one entered later is the one that counts.',
      k: 'Report the current price of every product. Return sku, the supplier name and price in any order.',
      n: ['Exactly one row per product.'],
      q: 'WITH r AS (SELECT product_id, price, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY changed_on DESC, id DESC) AS rk FROM price_changes) SELECT p.sku, s.name, r.price FROM r JOIN products p ON p.id = r.product_id JOIN suppliers s ON s.product_id = p.id WHERE r.rk = 1',
      wrong: ['WITH m AS (SELECT product_id, MAX(changed_on) AS last_day FROM price_changes GROUP BY product_id) SELECT p.sku, s.name, pc.price FROM price_changes pc JOIN m ON m.product_id = pc.product_id AND m.last_day = pc.changed_on JOIN products p ON p.id = pc.product_id JOIN suppliers s ON s.product_id = p.id'],
      h: 'Number the changes per product, newest first, and break a tie on the id.',
      x: 'Joining back on the latest date returns both rows when two changes share a day. ROW_NUMBER with the id as a second key always leaves exactly one.' },

    { t: 'Above Their Own Class Average', tg: ['joins', 'group average', 'having'],
      tb: ['classes', 'students', 'scores'],
      extra: {
        classes: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Class A']]),
        students: T('id INTEGER PRIMARY KEY, class_id INTEGER, name TEXT', [[1, 1, 'Asha'], [2, 1, 'Ben'], [3, 1, 'Chitra'], [4, 1, 'Dev']]),
        scores: T('student_id INTEGER, subject TEXT, score INTEGER', [
          [1, 'math', 90], [1, 'science', 80], [2, 'math', 60], [2, 'science', 50],
          [3, 'math', 75], [3, 'science', 85], [4, 'math', 40], [4, 'science', 60]]),
      },
      hidden: [
        { classes: [[1, 'Class A'], [2, 'Class B']], students: [[1, 1, 'Asha'], [2, 1, 'Ben'], [3, 2, 'Chitra'], [4, 2, 'Dev']], scores: [[1, 'math', 90], [1, 'science', 80], [2, 'math', 60], [2, 'science', 50], [3, 'math', 60], [3, 'science', 60], [4, 'math', 50], [4, 'science', 50]] },
        { scores: [[1, 'math', 50], [1, 'science', 50], [2, 'math', 95], [2, 'science', 95], [3, 'math', 75], [3, 'science', 85], [4, 'math', 40], [4, 'science', 60]] },
      ],
      s: 'Each student sits several subjects, and classes differ in how hard they are marked.',
      k: 'Find the students whose own average score is above the average of their class. Return the class name, the student name and their average rounded to 2 decimals, in any order.',
      q: 'WITH sa AS (SELECT s.id, s.class_id, s.name, AVG(sc.score) AS avg_score FROM students s JOIN scores sc ON sc.student_id = s.id GROUP BY s.id, s.class_id, s.name), ca AS (SELECT class_id, AVG(avg_score) AS class_avg FROM sa GROUP BY class_id) SELECT c.name AS class, sa.name AS student, ROUND(sa.avg_score, 2) AS avg_score FROM sa JOIN ca ON ca.class_id = sa.class_id JOIN classes c ON c.id = sa.class_id WHERE sa.avg_score > ca.class_avg',
      wrong: ['WITH sa AS (SELECT s.id, s.class_id, s.name, AVG(sc.score) AS avg_score FROM students s JOIN scores sc ON sc.student_id = s.id GROUP BY s.id, s.class_id, s.name) SELECT c.name AS class, sa.name AS student, ROUND(sa.avg_score, 2) AS avg_score FROM sa JOIN classes c ON c.id = sa.class_id WHERE sa.avg_score > (SELECT AVG(avg_score) FROM sa)',
      ],
      h: 'The comparison average is the one of the student\'s own class.',
      x: 'Two levels of averaging are needed: per student, then per class. A single overall average happens to agree while there is only one class.' },

    { t: 'Top Spender per Country', tg: ['window', 'ties', 'joins'],
      tb: ['countries', 'users', 'txns'],
      extra: {
        countries: T('code TEXT PRIMARY KEY, name TEXT', [['IN', 'India'], ['DE', 'Germany']]),
        users: T('id INTEGER PRIMARY KEY, country TEXT, name TEXT', [[1, 'IN', 'Asha'], [2, 'IN', 'Ben'], [3, 'DE', 'Chitra'], [4, 'DE', 'Dev']]),
        txns: T('id INTEGER PRIMARY KEY, user_id INTEGER, amount INTEGER', [
          [1, 1, 500], [2, 1, 300], [3, 2, 400], [4, 3, 900], [5, 4, 200], [6, 4, 100]]),
      },
      hidden: [
        { txns: [[1, 1, 500], [2, 1, 300], [3, 2, 800], [4, 3, 900], [5, 4, 600], [6, 4, 300]] },
        { txns: [[1, 1, 100], [2, 1, 100], [3, 2, 900], [4, 3, 100], [5, 4, 700], [6, 4, 100]] },
      ],
      s: 'Two people in the same country can spend exactly the same amount.',
      k: 'For every country, report the person who spent the most in total. If two people tie, report the one whose name comes first alphabetically. Return the country name, the person and the total, in any order.',
      q: 'WITH t AS (SELECT u.country, u.name, SUM(x.amount) AS total FROM txns x JOIN users u ON u.id = x.user_id GROUP BY u.id, u.country, u.name), r AS (SELECT country, name, total, ROW_NUMBER() OVER (PARTITION BY country ORDER BY total DESC, name) AS rk FROM t) SELECT c.name AS country, r.name AS person, r.total FROM r JOIN countries c ON c.code = r.country WHERE r.rk = 1',
      wrong: ['WITH t AS (SELECT u.country, u.name, SUM(x.amount) AS total FROM txns x JOIN users u ON u.id = x.user_id GROUP BY u.id, u.country, u.name), r AS (SELECT country, name, total, RANK() OVER (PARTITION BY country ORDER BY total DESC) AS rk FROM t) SELECT c.name AS country, r.name AS person, r.total FROM r JOIN countries c ON c.code = r.country WHERE r.rk = 1'],
      h: 'The question asks for one person per country, so the ordering has to settle every tie.',
      x: 'ROW_NUMBER with the name as a second key keeps exactly one row per country; RANK keeps both tied people and breaks the "one per country" promise.' },

    { t: 'Items Always Bought Alone', tg: ['having', 'joins', 'all rows'],
      tb: ['items', 'orders', 'order_items'],
      extra: {
        items: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Pen'], [2, 'Notebook'], [3, 'Lamp'], [4, 'Mug']]),
        orders: T('id INTEGER PRIMARY KEY, day TEXT', [[10, '2024-02-01'], [11, '2024-02-02'], [12, '2024-02-03'], [13, '2024-02-04']]),
        order_items: T('order_id INTEGER, item_id INTEGER', [[10, 1], [10, 2], [11, 3], [12, 4], [13, 4]]),
      },
      hidden: [
        { order_items: [[10, 1], [10, 2], [11, 3], [12, 4], [13, 4], [13, 1]] },
        { order_items: [[10, 1], [11, 2], [12, 3], [13, 4]] },
      ],
      s: 'A shop wants the items that customers never add to a basket with anything else.',
      k: 'List the items that appear only in orders of a single item. Return the item name in any order.',
      n: ['An item that is sometimes alone and sometimes in a bigger basket does not qualify.'],
      q: 'WITH sz AS (SELECT order_id, COUNT(*) AS n FROM order_items GROUP BY order_id) SELECT i.name FROM order_items oi JOIN sz ON sz.order_id = oi.order_id JOIN items i ON i.id = oi.item_id GROUP BY i.id, i.name HAVING MAX(sz.n) = 1',
      wrong: ['WITH sz AS (SELECT order_id, COUNT(*) AS n FROM order_items GROUP BY order_id) SELECT DISTINCT i.name FROM order_items oi JOIN sz ON sz.order_id = oi.order_id AND sz.n = 1 JOIN items i ON i.id = oi.item_id'],
      h: 'Every order the item appears in has to be a single-item order.',
      x: 'Grouping by the item and testing the largest basket it was ever in asks about all of its orders. Filtering to single-item orders first only asks whether it was ever alone.' },

    { t: 'Energy per Person by Region', tg: ['left join', 'subquery', 'per capita'],
      tb: ['regions', 'households', 'readings'],
      extra: {
        regions: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Coast'], [2, 'Hills']]),
        households: T('id INTEGER PRIMARY KEY, region_id INTEGER, people INTEGER', [[10, 1, 4], [11, 1, 2], [12, 2, 3], [13, 2, 1]]),
        readings: T('household_id INTEGER, day TEXT, kwh INTEGER', [
          [10, '2024-03-01', 44], [11, '2024-03-01', 10], [12, '2024-03-01', 18], [13, '2024-03-01', 6]]),
      },
      hidden: [
        { readings: [[10, '2024-03-01', 24], [10, '2024-03-02', 20], [11, '2024-03-01', 10], [12, '2024-03-01', 18], [13, '2024-03-01', 6]] },
        { readings: [[10, '2024-03-01', 44], [11, '2024-03-01', 10], [12, '2024-03-01', 18]] },
      ],
      s: 'A household that has not sent any reading yet still houses people.',
      k: 'For each region, report the total kWh recorded divided by the number of people living in the region, rounded to 2 decimals. Return name and per_person in any order.',
      n: ['Every household in the region counts towards the people, whether or not it reported.'],
      q: 'SELECT r.name, ROUND(1.0 * SUM(rd.kwh) / (SELECT SUM(h2.people) FROM households h2 WHERE h2.region_id = r.id), 2) AS per_person FROM readings rd JOIN households h ON h.id = rd.household_id JOIN regions r ON r.id = h.region_id GROUP BY r.id, r.name',
      wrong: ['SELECT r.name, ROUND(1.0 * SUM(rd.kwh) / SUM(h.people), 2) AS per_person FROM readings rd JOIN households h ON h.id = rd.household_id JOIN regions r ON r.id = h.region_id GROUP BY r.id, r.name'],
      h: 'The people come from the households table, the kWh from the readings. They are not over the same rows.',
      x: 'Summing people alongside the readings counts a household once per reading and ignores households that never reported. A subquery over the households gives the real population.' },

    { t: 'Came Back Within Thirty Days', tg: ['joins', 'dates', 'first row'],
      tb: ['channels', 'customers', 'orders'],
      extra: {
        channels: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Organic'], [2, 'Referral']]),
        customers: T('id INTEGER PRIMARY KEY, channel_id INTEGER, name TEXT', [[1, 1, 'Asha'], [2, 1, 'Ben'], [3, 2, 'Chitra'], [4, 2, 'Dev']]),
        orders: T('id INTEGER PRIMARY KEY, customer_id INTEGER, day INTEGER', [
          [10, 1, 1], [11, 1, 20], [12, 2, 5], [13, 3, 2], [14, 3, 10], [15, 4, 3]]),
      },
      hidden: [
        { orders: [[10, 1, 1], [11, 1, 100], [12, 1, 110], [13, 3, 2], [14, 3, 10], [15, 4, 3]] },
        { orders: [[10, 1, 1], [11, 1, 20], [12, 2, 5], [13, 3, 2], [14, 3, 40], [15, 4, 3]] },
      ],
      s: 'Retention is measured from the very first order: a customer counts as retained when they order again within 30 days of it.',
      k: 'For each acquisition channel, count the customers who came back within 30 days of their first order. Return name and retained in any order.',
      n: ['Later orders close together do not count if the second order came long after the first.'],
      q: 'WITH f AS (SELECT customer_id, MIN(day) AS d0 FROM orders GROUP BY customer_id) SELECT ch.name, COUNT(DISTINCT o.customer_id) AS retained FROM orders o JOIN f ON f.customer_id = o.customer_id JOIN customers c ON c.id = o.customer_id JOIN channels ch ON ch.id = c.channel_id WHERE o.day > f.d0 AND o.day - f.d0 <= 30 GROUP BY ch.id, ch.name',
      wrong: ['SELECT ch.name, COUNT(DISTINCT o1.customer_id) AS retained FROM orders o1 JOIN orders o2 ON o2.customer_id = o1.customer_id AND o2.day > o1.day AND o2.day - o1.day <= 30 JOIN customers c ON c.id = o1.customer_id JOIN channels ch ON ch.id = c.channel_id GROUP BY ch.id, ch.name'],
      h: 'Find each customer\'s first order date, then look for a later order inside the window.',
      x: 'The window is anchored to the first order, so any pair of nearby orders is not enough: a customer who disappears for three months and then orders twice in a week was not retained.' },

    { t: 'Punctuality by Airline', tg: ['left join', 'coalesce', 'rate'],
      tb: ['airlines', 'flights', 'delays'],
      extra: {
        airlines: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'DojoAir'], [2, 'SkyPanda']]),
        flights: T('id INTEGER PRIMARY KEY, airline_id INTEGER, code TEXT', [
          [100, 1, 'DJ1'], [101, 1, 'DJ2'], [102, 1, 'DJ3'], [103, 2, 'SP1'], [104, 2, 'SP2']]),
        delays: T('flight_id INTEGER, minutes INTEGER', [[100, 0], [101, 40], [102, 5], [103, 0], [104, 60]]),
      },
      hidden: [
        { delays: [[101, 40], [104, 60]] },
        { delays: [[100, 20], [101, 40], [102, 16], [103, 0], [104, 60]] },
      ],
      s: 'A flight that was never late has no row in the delay table at all.',
      k: 'For each airline, report the share of its flights delayed by more than 15 minutes, rounded to 2 decimals. Return name and late_rate in any order.',
      q: 'SELECT a.name, ROUND(1.0 * SUM(CASE WHEN COALESCE(d.minutes, 0) > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) AS late_rate FROM flights f JOIN airlines a ON a.id = f.airline_id LEFT JOIN delays d ON d.flight_id = f.id GROUP BY a.id, a.name',
      wrong: ['SELECT a.name, ROUND(1.0 * SUM(CASE WHEN d.minutes > 15 THEN 1 ELSE 0 END) / COUNT(*), 2) AS late_rate FROM flights f JOIN airlines a ON a.id = f.airline_id JOIN delays d ON d.flight_id = f.id GROUP BY a.id, a.name'],
      h: 'Which flights disappear from an inner join?',
      x: 'The flights table is the population, so delays joins on the left and a missing row means 0 minutes. An inner join measures the rate only over flights that have a delay row.' },

    { t: 'First Response Against the SLA', tg: ['min', 'joins', 'group by'],
      tb: ['priorities', 'tickets', 'responses'],
      extra: {
        priorities: T('id INTEGER PRIMARY KEY, name TEXT, sla_minutes INTEGER', [[1, 'Urgent', 30], [2, 'Normal', 240]]),
        tickets: T('id INTEGER PRIMARY KEY, priority_id INTEGER, opened_min INTEGER', [
          [1, 1, 0], [2, 1, 100], [3, 2, 0], [4, 2, 500]]),
        responses: T('ticket_id INTEGER, at_min INTEGER', [[1, 20], [2, 180], [3, 100], [4, 600]]),
      },
      hidden: [
        { responses: [[1, 20], [1, 400], [2, 180], [3, 100], [3, 900], [4, 600]] },
        { responses: [[1, 40], [2, 110], [3, 100], [4, 800]] },
      ],
      s: 'An agent may reply to a ticket several times. The service promise is about the first reply.',
      k: 'For each priority, count the tickets whose first reply came later than the promised minutes after opening. Return name and breaches in any order.',
      n: ['A first reply exactly on the promise is not a breach.'],
      q: 'WITH fr AS (SELECT ticket_id, MIN(at_min) AS first_at FROM responses GROUP BY ticket_id) SELECT p.name, COUNT(*) AS breaches FROM tickets t JOIN priorities p ON p.id = t.priority_id JOIN fr ON fr.ticket_id = t.id WHERE fr.first_at - t.opened_min > p.sla_minutes GROUP BY p.id, p.name',
      wrong: ['WITH lr AS (SELECT ticket_id, MAX(at_min) AS last_at FROM responses GROUP BY ticket_id) SELECT p.name, COUNT(*) AS breaches FROM tickets t JOIN priorities p ON p.id = t.priority_id JOIN lr ON lr.ticket_id = t.id WHERE lr.last_at - t.opened_min > p.sla_minutes GROUP BY p.id, p.name'],
      h: 'Reduce the replies to the earliest one per ticket before comparing.',
      x: 'MIN over the replies is the first response; the promise is measured against it. The last reply is a different question and flags tickets that were answered promptly and then discussed for days.' },

    { t: 'Ratings From Enrolled Students Only', tg: ['joins', 'exists', 'average'],
      tb: ['courses', 'enrollments', 'ratings'],
      extra: {
        courses: T('id INTEGER PRIMARY KEY, title TEXT', [[1, 'Intro to SQL'], [2, 'Statistics 101']]),
        enrollments: T('student TEXT, course_id INTEGER', [['Asha', 1], ['Ben', 1], ['Chitra', 2], ['Dev', 2]]),
        ratings: T('student TEXT, course_id INTEGER, stars INTEGER', [
          ['Asha', 1, 5], ['Ben', 1, 3], ['Chitra', 2, 4], ['Dev', 2, 2]]),
      },
      hidden: [
        { ratings: [['Asha', 1, 5], ['Ben', 1, 3], ['Esha', 1, 1], ['Chitra', 2, 4], ['Dev', 2, 2]] },
        { ratings: [['Asha', 1, 2], ['Ben', 1, 2], ['Chitra', 2, 5], ['Dev', 2, 5]] },
      ],
      s: 'Anyone can leave a rating, but only the ratings of students who actually took the course are published.',
      k: 'For each course, report the average stars from enrolled students, rounded to 2 decimals. Courses with no such rating are left out. Return title and stars in any order.',
      q: 'SELECT c.title, ROUND(AVG(r.stars), 2) AS stars FROM ratings r JOIN courses c ON c.id = r.course_id WHERE EXISTS (SELECT 1 FROM enrollments e WHERE e.student = r.student AND e.course_id = r.course_id) GROUP BY c.id, c.title',
      wrong: ['SELECT c.title, ROUND(AVG(r.stars), 2) AS stars FROM ratings r JOIN courses c ON c.id = r.course_id GROUP BY c.id, c.title'],
      h: 'A rating counts only when the same student is enrolled on the same course.',
      x: 'The EXISTS test ties the rating to an enrolment on both the student and the course, which is what makes it a real rating.' },

    { t: 'Pick Error Rate per Warehouse', tg: ['exists', 'double counting', 'rate'],
      tb: ['warehouses', 'picks', 'errors'],
      extra: {
        warehouses: T('id INTEGER PRIMARY KEY, region TEXT', [[10, 'North'], [20, 'South']]),
        picks: T('id INTEGER PRIMARY KEY, warehouse_id INTEGER, item TEXT', [
          [1, 10, 'LAMP'], [2, 10, 'DESK'], [3, 10, 'CHAIR'], [4, 10, 'RUG'], [5, 20, 'MUG'], [6, 20, 'PEN']]),
        errors: T('pick_id INTEGER, kind TEXT', [[1, 'wrong item'], [5, 'short']]),
      },
      hidden: [
        { errors: [[1, 'wrong item'], [1, 'damaged'], [5, 'short']] },
        { errors: [[2, 'short'], [3, 'short'], [6, 'wrong item']] },
      ],
      s: 'A single mis-pick can be logged under more than one error kind.',
      k: 'For each warehouse, report the share of picks that went wrong at all, rounded to 2 decimals. Return region and error_rate in any order.',
      q: 'SELECT w.region, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM errors e WHERE e.pick_id = p.id) THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_rate FROM picks p JOIN warehouses w ON w.id = p.warehouse_id GROUP BY w.id, w.region',
      wrong: ['SELECT w.region, ROUND(1.0 * (SELECT COUNT(*) FROM errors e JOIN picks p2 ON p2.id = e.pick_id WHERE p2.warehouse_id = w.id) / COUNT(*), 2) AS error_rate FROM picks p JOIN warehouses w ON w.id = p.warehouse_id GROUP BY w.id, w.region',
      ],
      h: 'The numerator is a number of picks, not a number of error rows.',
      x: 'A CASE with EXISTS turns "this pick went wrong" into one unit per pick, so two error rows on one pick cannot inflate the rate.' },

    { t: 'Active Drivers per City and Month', tg: ['count distinct', 'joins', 'group by'],
      tb: ['cities', 'drivers', 'rides'],
      extra: {
        cities: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Metro A'], [2, 'Town B']]),
        drivers: T('id INTEGER PRIMARY KEY, city_id INTEGER, name TEXT', [[10, 1, 'Asha'], [11, 1, 'Ben'], [12, 2, 'Chitra']]),
        rides: T('id INTEGER PRIMARY KEY, driver_id INTEGER, month TEXT', [
          [1, 10, '2024-04'], [2, 11, '2024-04'], [3, 12, '2024-04'], [4, 10, '2024-05'], [5, 12, '2024-05']]),
      },
      hidden: [
        { rides: [[1, 10, '2024-04'], [2, 10, '2024-04'], [3, 11, '2024-04'], [4, 12, '2024-04'], [5, 12, '2024-05']] },
        { rides: [[1, 10, '2024-04'], [2, 11, '2024-05'], [3, 12, '2024-05'], [4, 10, '2024-05'], [5, 11, '2024-04']] },
      ],
      s: 'A driver is active in a month if they gave at least one ride in it.',
      k: 'For every city and month, report how many drivers were active. Return name, month and active_drivers in any order.',
      q: 'SELECT c.name, r.month, COUNT(DISTINCT r.driver_id) AS active_drivers FROM rides r JOIN drivers d ON d.id = r.driver_id JOIN cities c ON c.id = d.city_id GROUP BY c.id, c.name, r.month',
      wrong: ['SELECT c.name, r.month, COUNT(*) AS active_drivers FROM rides r JOIN drivers d ON d.id = r.driver_id JOIN cities c ON c.id = d.city_id GROUP BY c.id, c.name, r.month'],
      h: 'Counting rides is not counting drivers.',
      x: 'COUNT(DISTINCT driver_id) counts each driver once however many rides they gave, which is what "active" means.' },

    { t: 'Games Losing Revenue', tg: ['self join', 'months', 'joins'],
      tb: ['publishers', 'games', 'purchases'],
      extra: {
        publishers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Blue Studio'], [2, 'Red Studio']]),
        games: T('id INTEGER PRIMARY KEY, publisher_id INTEGER, name TEXT', [[10, 1, 'Comet Run'], [11, 1, 'Dune Drift'], [12, 2, 'Pixel Keep']]),
        purchases: T('id INTEGER PRIMARY KEY, game_id INTEGER, month INTEGER, amount INTEGER', [
          [1, 10, 6, 100], [2, 10, 6, 100], [3, 10, 7, 100],
          [4, 11, 6, 100], [5, 11, 7, 100], [6, 11, 7, 100],
          [7, 12, 6, 100], [8, 12, 7, 100]]),
      },
      hidden: [
        { purchases: [[1, 10, 6, 50], [2, 10, 6, 50], [3, 10, 7, 500], [4, 11, 6, 100], [5, 11, 7, 100], [6, 11, 7, 100], [7, 12, 6, 100], [8, 12, 7, 100]] },
        { purchases: [[1, 10, 6, 100], [2, 10, 7, 100], [3, 11, 6, 300], [4, 11, 7, 100], [5, 12, 6, 100], [6, 12, 7, 400], [7, 12, 7, 100], [8, 10, 6, 100]] },
      ],
      s: 'A studio reviews month 7 against month 6 for each of its games.',
      k: 'Find the games whose revenue in month 7 was lower than in month 6. Return the publisher and the game, in any order.',
      q: 'WITH r AS (SELECT game_id, month, SUM(amount) AS rev FROM purchases GROUP BY game_id, month) SELECT p.name AS publisher, g.name AS game FROM r r6 JOIN r r7 ON r7.game_id = r6.game_id AND r6.month = 6 AND r7.month = 7 JOIN games g ON g.id = r6.game_id JOIN publishers p ON p.id = g.publisher_id WHERE r7.rev < r6.rev',
      wrong: ['WITH r AS (SELECT game_id, month, COUNT(*) AS rev FROM purchases GROUP BY game_id, month) SELECT p.name AS publisher, g.name AS game FROM r r6 JOIN r r7 ON r7.game_id = r6.game_id AND r6.month = 6 AND r7.month = 7 JOIN games g ON g.id = r6.game_id JOIN publishers p ON p.id = g.publisher_id WHERE r7.rev < r6.rev'],
      h: 'Revenue is money, not a number of purchases.',
      x: 'Summing the amounts per game and month, then joining the two months, compares what the question asks about. Counting purchases agrees only while every purchase is the same price.' },

    { t: 'Readmitted Within Thirty Days', tg: ['self join', 'dates', 'intervals'],
      tb: ['patients', 'wards', 'admissions'],
      extra: {
        patients: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        wards: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Cardiology'], [2, 'General']]),
        admissions: T('id INTEGER PRIMARY KEY, patient_id INTEGER, ward_id INTEGER, admit_day INTEGER, discharge_day INTEGER', [
          [1, 1, 1, 1, 1], [2, 1, 2, 20, 20], [3, 2, 1, 5, 5], [4, 2, 1, 60, 60], [5, 3, 2, 10, 10]]),
      },
      hidden: [
        { admissions: [[1, 1, 1, 1, 40], [2, 1, 2, 20, 20], [3, 2, 1, 5, 5], [4, 2, 1, 60, 60], [5, 3, 2, 10, 10]] },
        { admissions: [[1, 1, 1, 1, 1], [2, 1, 2, 40, 40], [3, 2, 1, 5, 5], [4, 2, 1, 25, 25], [5, 3, 2, 10, 10]] },
      ],
      s: 'A readmission is counted from the day the patient went home, not from the day they first came in.',
      k: 'Find every case where a patient was admitted again within 30 days of being discharged. Return the patient, the ward they were discharged from and the gap in days, in any order.',
      n: ['A new admission on the discharge day itself has a gap of 0.'],
      q: 'SELECT p.name AS patient, w.name AS ward, a2.admit_day - a1.discharge_day AS gap FROM admissions a1 JOIN admissions a2 ON a2.patient_id = a1.patient_id AND a2.id <> a1.id AND a2.admit_day >= a1.discharge_day AND a2.admit_day - a1.discharge_day <= 30 JOIN patients p ON p.id = a1.patient_id JOIN wards w ON w.id = a1.ward_id',
      wrong: ['SELECT p.name AS patient, w.name AS ward, a2.admit_day - a1.discharge_day AS gap FROM admissions a1 JOIN admissions a2 ON a2.patient_id = a1.patient_id AND a2.id <> a1.id AND a2.admit_day >= a1.admit_day AND a2.admit_day - a1.admit_day <= 30 JOIN patients p ON p.id = a1.patient_id JOIN wards w ON w.id = a1.ward_id'],
      h: 'Which date does the 30-day clock start from?',
      x: 'Measuring from the discharge day makes a long stay count properly; measuring from the admission day counts the days the patient was still in hospital as if they were at home.' },

    { t: 'Promo Codes That Actually Discounted', tg: ['joins', 'filter', 'sum'],
      tb: ['promos', 'orders', 'discounts'],
      extra: {
        promos: T('code TEXT PRIMARY KEY, description TEXT', [['SAVE10', 'Ten off'], ['FREESHIP', 'Free shipping'], ['WELCOME', 'New customers']]),
        orders: T('id INTEGER PRIMARY KEY, promo_code TEXT, total INTEGER', [
          [1, 'SAVE10', 900], [2, 'SAVE10', 1200], [3, 'FREESHIP', 500], [4, 'WELCOME', 300]]),
        discounts: T('order_id INTEGER, amount INTEGER', [[1, 100], [2, 100], [3, 50], [4, 30]]),
      },
      hidden: [
        { discounts: [[1, 100], [2, 0], [3, 50], [4, 30]] },
        { discounts: [[1, 100], [3, 50]] },
      ],
      s: 'A promo code can be attached to an order and still take nothing off, either because it did not apply or because no discount row was written.',
      k: 'For each promo code, report how many orders it really discounted and the total taken off. Codes that never discounted anything are left out. Return code, orders and discounted in any order.',
      q: 'SELECT o.promo_code AS code, COUNT(*) AS orders, SUM(d.amount) AS discounted FROM orders o JOIN discounts d ON d.order_id = o.id JOIN promos p ON p.code = o.promo_code WHERE d.amount > 0 GROUP BY o.promo_code',
      wrong: ['SELECT o.promo_code AS code, COUNT(*) AS orders, COALESCE(SUM(d.amount), 0) AS discounted FROM orders o LEFT JOIN discounts d ON d.order_id = o.id JOIN promos p ON p.code = o.promo_code GROUP BY o.promo_code'],
      h: 'An order only counts when something was actually taken off it.',
      x: 'Requiring a discount row with a positive amount answers the question. Counting every order that carries the code credits codes that did nothing.' },

    { t: 'Readings Outside Their Sensor Range', tg: ['joins', 'per-row threshold', 'group by'],
      tb: ['sensor_types', 'sensors', 'readings'],
      extra: {
        sensor_types: T('id INTEGER PRIMARY KEY, name TEXT, min_ok INTEGER, max_ok INTEGER', [[1, 'Temperature', 0, 100], [2, 'Pressure', 0, 100]]),
        sensors: T('id INTEGER PRIMARY KEY, type_id INTEGER, site TEXT', [[10, 1, 'Mill'], [11, 2, 'Dock'], [12, 1, 'Farm']]),
        readings: T('sensor_id INTEGER, day TEXT, value INTEGER', [
          [10, '2024-02-01', 50], [10, '2024-02-02', 120], [11, '2024-02-01', 30],
          [11, '2024-02-02', -5], [12, '2024-02-01', 99], [12, '2024-02-02', 101]]),
      },
      hidden: [
        { sensor_types: [[1, 'Temperature', 0, 100], [2, 'Pressure', 20, 40]], readings: [[10, '2024-02-01', 50], [10, '2024-02-02', 120], [11, '2024-02-01', 50], [11, '2024-02-02', 60], [12, '2024-02-01', 99], [12, '2024-02-02', 101]] },
        { sensor_types: [[1, 'Temperature', 60, 110], [2, 'Pressure', 0, 100]] },
      ],
      s: 'Each kind of sensor has its own healthy range, published in the sensor type.',
      k: 'For every sensor that recorded at least one reading outside its own range, report the site, the type name and how many readings were out of range. Any order.',
      n: ['A reading exactly on a bound is inside the range.'],
      q: 'SELECT s.site, t.name AS type, COUNT(*) AS out_of_range FROM readings r JOIN sensors s ON s.id = r.sensor_id JOIN sensor_types t ON t.id = s.type_id WHERE r.value < t.min_ok OR r.value > t.max_ok GROUP BY s.id, s.site, t.name',
      wrong: ['SELECT s.site, t.name AS type, COUNT(*) AS out_of_range FROM readings r JOIN sensors s ON s.id = r.sensor_id JOIN sensor_types t ON t.id = s.type_id WHERE r.value < 0 OR r.value > 100 GROUP BY s.id, s.site, t.name'],
      h: 'The bounds come from the type of the sensor that produced the reading.',
      x: 'The comparison needs two joins, reading to sensor to type. A fixed 0 to 100 happens to match while every type shares those bounds.' },

    { t: 'Loans in Arrears', tg: ['left join', 'coalesce', 'having'],
      tb: ['loan_products', 'loans', 'payments'],
      extra: {
        loan_products: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Personal'], [2, 'Auto']]),
        loans: T('id INTEGER PRIMARY KEY, product_id INTEGER, scheduled_total INTEGER', [
          [100, 1, 5000], [101, 1, 8000], [102, 2, 12000], [103, 2, 6000]]),
        payments: T('loan_id INTEGER, amount INTEGER', [[100, 5000], [101, 3000], [102, 12000], [103, 2000]]),
      },
      hidden: [
        { payments: [[100, 5000], [102, 12000], [103, 2000]] },
        { payments: [[100, 2000], [100, 3000], [101, 8000], [102, 6000], [103, 6000]] },
      ],
      s: 'A loan that has never been paid has no payment rows at all.',
      k: 'List the loans that have paid less than they were scheduled to. Return the product name, the loan id, paid and scheduled_total, in any order.',
      q: 'SELECT lp.name AS product, l.id AS loan, COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.loan_id = l.id), 0) AS paid, l.scheduled_total FROM loans l JOIN loan_products lp ON lp.id = l.product_id WHERE COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.loan_id = l.id), 0) < l.scheduled_total',
      wrong: ['SELECT lp.name AS product, l.id AS loan, SUM(p.amount) AS paid, l.scheduled_total FROM loans l JOIN loan_products lp ON lp.id = l.product_id JOIN payments p ON p.loan_id = l.id GROUP BY l.id, lp.name, l.scheduled_total HAVING SUM(p.amount) < l.scheduled_total'],
      h: 'The worst arrears are the loans with no payments at all.',
      x: 'A subquery with COALESCE gives every loan a paid figure, zero included, so the comparison covers loans that have never paid. An inner join drops them silently.' },
  ]);
})();
