// Dojo SQL, interview-grade set: Medium, batch 3.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('medium', [
    { t: 'Share of Total Revenue by Category', tg: ['window', 'joins', 'share'],
      tb: ['categories', 'products', 'sales'],
      extra: {
        categories: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Stationery']]),
        products: T('id INTEGER PRIMARY KEY, category_id INTEGER, name TEXT', [[10, 1, 'Pen'], [11, 1, 'Notebook']]),
        sales: T('id INTEGER PRIMARY KEY, product_id INTEGER, amount INTEGER', [[1, 10, 300], [2, 10, 200], [3, 11, 500]]),
      },
      hidden: [
        { categories: [[1, 'Stationery'], [2, 'Furniture']], products: [[10, 1, 'Pen'], [11, 1, 'Notebook'], [12, 2, 'Desk']], sales: [[1, 10, 300], [2, 10, 200], [3, 11, 500], [4, 12, 1000]] },
        { categories: [[1, 'Stationery'], [2, 'Furniture']], products: [[10, 1, 'Pen'], [11, 2, 'Desk'], [12, 2, 'Chair']], sales: [[1, 10, 250], [2, 11, 500], [3, 12, 250]] },
      ],
      s: 'Finance wants to see how the revenue splits across categories.',
      k: 'For each category, report its revenue and its share of the revenue of all categories, rounded to 2 decimals. Return name, revenue and share in any order.',
      q: 'WITH c AS (SELECT cat.id, cat.name, SUM(s.amount) AS revenue FROM sales s JOIN products p ON p.id = s.product_id JOIN categories cat ON cat.id = p.category_id GROUP BY cat.id, cat.name) SELECT name, revenue, ROUND(1.0 * revenue / SUM(revenue) OVER (), 2) AS share FROM c',
      wrong: ['SELECT cat.name, SUM(s.amount) AS revenue, ROUND(1.0 * SUM(s.amount) / SUM(s.amount), 2) AS share FROM sales s JOIN products p ON p.id = s.product_id JOIN categories cat ON cat.id = p.category_id GROUP BY cat.id, cat.name'],
      h: 'The denominator is the revenue of every category, which is a window over the grouped rows.',
      x: 'SUM(revenue) OVER () totals the already-grouped rows, so each category is divided by the whole. Dividing a group by itself always gives 1, which looks right only when there is a single category.' },

    { t: 'Runner-Up Salary in Each Department', tg: ['window', 'dedupe', 'dense_rank'],
      tb: ['departments', 'employees', 'salaries'],
      extra: {
        departments: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Engineering'], [2, 'Sales']]),
        employees: T('id INTEGER PRIMARY KEY, dept_id INTEGER, name TEXT', [[10, 1, 'Asha'], [11, 1, 'Ben'], [12, 1, 'Chitra'], [13, 2, 'Dev'], [14, 2, 'Esha']]),
        salaries: T('employee_id INTEGER, amount INTEGER', [[10, 120000], [11, 95000], [12, 80000], [13, 70000], [14, 60000]]),
      },
      hidden: [
        { salaries: [[10, 120000], [11, 120000], [12, 80000], [13, 70000], [14, 60000]] },
        { salaries: [[10, 90000], [11, 95000], [12, 95000], [13, 70000], [14, 70000]] },
      ],
      s: 'Two people in a department can be paid exactly the same.',
      k: 'For each department, report the second highest distinct salary. Departments without a second level are left out. Return name and runner_up in any order.',
      q: 'WITH d AS (SELECT DISTINCT e.dept_id, s.amount FROM salaries s JOIN employees e ON e.id = s.employee_id), r AS (SELECT dept_id, amount, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY amount DESC) AS rk FROM d) SELECT dp.name, r.amount AS runner_up FROM r JOIN departments dp ON dp.id = r.dept_id WHERE r.rk = 2',
      wrong: ['WITH r AS (SELECT e.dept_id, s.amount, ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY s.amount DESC) AS rk FROM salaries s JOIN employees e ON e.id = s.employee_id) SELECT dp.name, r.amount AS runner_up FROM r JOIN departments dp ON dp.id = r.dept_id WHERE r.rk = 2'],
      h: 'Two people on the top salary are one pay level.',
      x: 'Collapsing to distinct salaries per department and then ranking them densely gives pay levels, so a tie at the top does not become the runner-up.' },

    { t: 'Quiet Customers This Quarter', tg: ['not exists', 'dates', 'joins'],
      tb: ['regions', 'customers', 'orders'],
      extra: {
        regions: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'West'], [2, 'East']]),
        customers: T('id INTEGER PRIMARY KEY, region_id INTEGER, name TEXT', [[1, 1, 'Asha'], [2, 1, 'Ben'], [3, 2, 'Chitra'], [4, 2, 'Dev']]),
        orders: T('id INTEGER PRIMARY KEY, customer_id INTEGER, day TEXT', [
          [10, 1, '2024-04-05'], [11, 3, '2024-05-20']]),
      },
      hidden: [
        { orders: [[10, 1, '2024-04-05'], [11, 3, '2024-05-20'], [12, 2, '2024-01-10'], [13, 4, '2024-08-01']] },
        { orders: [[10, 2, '2024-06-30'], [11, 4, '2024-04-01']] },
      ],
      s: 'The second quarter of 2024 runs from 1 April to 30 June, both days included.',
      k: 'List the customers who placed no order inside that quarter. Return the region name and the customer name in any order.',
      n: ['A customer who ordered only outside the quarter is still quiet.'],
      q: "SELECT r.name AS region, c.name AS customer FROM customers c JOIN regions r ON r.id = c.region_id WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.day >= '2024-04-01' AND o.day <= '2024-06-30')",
      wrong: ["SELECT r.name AS region, c.name AS customer FROM customers c JOIN regions r ON r.id = c.region_id WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)"],
      h: 'The date window belongs inside the NOT EXISTS, next to the customer match.',
      x: 'Without the dates the query answers "never ordered at all", which is a smaller group: a customer who ordered in January is quiet this quarter but not a stranger.' },

    { t: 'Invoice Tax by Country Rate', tg: ['joins', 'rate table', 'rounding'],
      tb: ['tax_rates', 'invoices', 'invoice_lines'],
      extra: {
        tax_rates: T('country TEXT PRIMARY KEY, rate REAL', [['IN', 0.18], ['DE', 0.18], ['US', 0.18]]),
        invoices: T('id INTEGER PRIMARY KEY, country TEXT, customer TEXT', [[1, 'IN', 'Asha'], [2, 'DE', 'Ben'], [3, 'US', 'Chitra']]),
        invoice_lines: T('invoice_id INTEGER, description TEXT, amount INTEGER', [
          [1, 'Pens', 1000], [1, 'Paper', 500], [2, 'Desk', 4000], [3, 'Lamp', 2000], [3, 'Bulb', 500]]),
      },
      hidden: [
        { tax_rates: [['IN', 0.18], ['DE', 0.19], ['US', 0.07]] },
        { tax_rates: [['IN', 0.05], ['DE', 0.18], ['US', 0.18]] },
      ],
      s: 'Each invoice is taxed at the rate of its own country.',
      k: 'For every invoice, report the customer, the net total and the tax rounded to 2 decimals. Any order.',
      q: 'SELECT i.customer, SUM(l.amount) AS net, ROUND(SUM(l.amount) * t.rate, 2) AS tax FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id JOIN tax_rates t ON t.country = i.country GROUP BY i.id, i.customer, t.rate',
      wrong: ['SELECT i.customer, SUM(l.amount) AS net, ROUND(SUM(l.amount) * 0.18, 2) AS tax FROM invoice_lines l JOIN invoices i ON i.id = l.invoice_id JOIN tax_rates t ON t.country = i.country GROUP BY i.id, i.customer'],
      h: 'The rate is a column on the row the invoice points at.',
      x: 'Joining the rate table and grouping by the rate keeps the tax per invoice correct whatever each country charges.' },

    { t: 'Busiest Hour at Each Station', tg: ['window', 'ties', 'joins'],
      tb: ['lines', 'stations', 'taps'],
      extra: {
        lines: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Blue Line'], [2, 'Red Line']]),
        stations: T('id INTEGER PRIMARY KEY, line_id INTEGER, name TEXT', [[10, 1, 'Harbour'], [11, 2, 'Museum']]),
        taps: T('id INTEGER PRIMARY KEY, station_id INTEGER, hour INTEGER', [
          [1, 10, 8], [2, 10, 8], [3, 10, 9], [4, 11, 17], [5, 11, 18], [6, 11, 18], [7, 11, 18]]),
      },
      hidden: [
        { taps: [[1, 10, 8], [2, 10, 8], [3, 10, 9], [4, 10, 9], [5, 11, 18], [6, 11, 18], [7, 11, 17]] },
        { taps: [[1, 10, 7], [2, 10, 9], [3, 10, 9], [4, 11, 17], [5, 11, 17], [6, 11, 18], [7, 11, 19]] },
      ],
      s: 'Each tap of a travel card records the station and the hour of day.',
      k: 'For each station, report the hour with the most taps and that number. If two hours tie, report the earlier hour. Return the line name, the station, hour and taps, in any order.',
      q: 'WITH h AS (SELECT station_id, hour, COUNT(*) AS n FROM taps GROUP BY station_id, hour), r AS (SELECT station_id, hour, n, ROW_NUMBER() OVER (PARTITION BY station_id ORDER BY n DESC, hour) AS rk FROM h) SELECT l.name AS line, s.name AS station, r.hour, r.n AS taps FROM r JOIN stations s ON s.id = r.station_id JOIN lines l ON l.id = s.line_id WHERE r.rk = 1',
      wrong: ['WITH h AS (SELECT station_id, hour, COUNT(*) AS n FROM taps GROUP BY station_id, hour), r AS (SELECT station_id, hour, n, RANK() OVER (PARTITION BY station_id ORDER BY n DESC) AS rk FROM h) SELECT l.name AS line, s.name AS station, r.hour, r.n AS taps FROM r JOIN stations s ON s.id = r.station_id JOIN lines l ON l.id = s.line_id WHERE r.rk = 1'],
      h: 'One row per station, so the ordering has to settle a tie between two equally busy hours.',
      x: 'Adding the hour as a second sort key makes the choice deterministic and matches the rule in the question.' },

    { t: 'Fill Rate per Supplier', tg: ['left join', 'coalesce', 'rate'],
      tb: ['suppliers', 'purchase_orders', 'deliveries'],
      extra: {
        suppliers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Alpha'], [2, 'Beta']]),
        purchase_orders: T('id INTEGER PRIMARY KEY, supplier_id INTEGER, ordered_qty INTEGER', [
          [100, 1, 50], [101, 1, 100], [102, 2, 40], [103, 2, 60]]),
        deliveries: T('po_id INTEGER, delivered_qty INTEGER', [[100, 50], [101, 80], [102, 40], [103, 30]]),
      },
      hidden: [
        { deliveries: [[100, 50], [101, 80], [102, 40]] },
        { deliveries: [[100, 25], [100, 25], [101, 100], [102, 20], [103, 60]] },
      ],
      s: 'A purchase order can be delivered in several drops, or not at all.',
      k: 'For each supplier, report the share of the ordered quantity that arrived, rounded to 2 decimals. Return name and fill_rate in any order.',
      q: 'SELECT s.name, ROUND(1.0 * SUM(COALESCE((SELECT SUM(d.delivered_qty) FROM deliveries d WHERE d.po_id = po.id), 0)) / SUM(po.ordered_qty), 2) AS fill_rate FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id GROUP BY s.id, s.name',
      wrong: ['SELECT s.name, ROUND(1.0 * SUM(d.delivered_qty) / SUM(po.ordered_qty), 2) AS fill_rate FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN deliveries d ON d.po_id = po.id GROUP BY s.id, s.name'],
      h: 'Total the drops per order first, then compare with what was ordered.',
      x: 'A per-order subquery keeps the ordered quantity counted once and treats an undelivered order as zero. Joining the drops directly repeats the ordered quantity once per drop and drops the orders that never arrived.' },

    { t: 'Average Handling Time Without the Worst Case', tg: ['subquery', 'group max', 'average'],
      tb: ['queues', 'tickets', 'handling'],
      extra: {
        queues: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Billing'], [2, 'Technical']]),
        tickets: T('id INTEGER PRIMARY KEY, queue_id INTEGER, subject TEXT', [
          [1, 1, 'Refund'], [2, 1, 'Invoice'], [3, 1, 'Charge'], [4, 2, 'Crash'], [5, 2, 'Slow'], [6, 2, 'Login']]),
        handling: T('ticket_id INTEGER, minutes INTEGER', [[1, 10], [2, 20], [3, 95], [4, 15], [5, 25], [6, 95]]),
      },
      hidden: [
        { handling: [[1, 10], [2, 20], [3, 200], [4, 15], [5, 25], [6, 30]] },
        { handling: [[1, 40], [2, 40], [3, 40], [4, 10], [5, 20], [6, 30]] },
      ],
      s: 'One very long call can move a queue\'s average on its own, so the longest call in each queue is left out.',
      k: 'For each queue, report the average handling time of its tickets after removing its own longest one, rounded to 2 decimals. Return name and avg_minutes in any order.',
      q: 'SELECT q.name, ROUND(AVG(h.minutes), 2) AS avg_minutes FROM handling h JOIN tickets t ON t.id = h.ticket_id JOIN queues q ON q.id = t.queue_id WHERE h.minutes < (SELECT MAX(h2.minutes) FROM handling h2 JOIN tickets t2 ON t2.id = h2.ticket_id WHERE t2.queue_id = q.id) GROUP BY q.id, q.name',
      wrong: ['SELECT q.name, ROUND(AVG(h.minutes), 2) AS avg_minutes FROM handling h JOIN tickets t ON t.id = h.ticket_id JOIN queues q ON q.id = t.queue_id WHERE h.minutes < (SELECT MAX(minutes) FROM handling) GROUP BY q.id, q.name'],
      h: 'The call to drop is the longest one in that queue, not in the whole table.',
      x: 'The correlated subquery takes the maximum inside the queue, so each queue loses exactly its own worst case.' },

    { t: 'Sold-Out Events', tg: ['joins', 'status filter', 'having'],
      tb: ['venues', 'events', 'tickets'],
      extra: {
        venues: T('id INTEGER PRIMARY KEY, name TEXT, capacity INTEGER', [[1, 'Town Hall', 3], [2, 'Garden Stage', 2]]),
        events: T('id INTEGER PRIMARY KEY, venue_id INTEGER, title TEXT', [[10, 1, 'Jazz Night'], [11, 2, 'Poetry Slam']]),
        tickets: T('id INTEGER PRIMARY KEY, event_id INTEGER, status TEXT', [
          [1, 10, 'sold'], [2, 10, 'sold'], [3, 10, 'sold'], [4, 11, 'sold']]),
      },
      hidden: [
        { tickets: [[1, 10, 'sold'], [2, 10, 'sold'], [3, 10, 'cancelled'], [4, 11, 'sold'], [5, 11, 'sold']] },
        { tickets: [[1, 10, 'sold'], [2, 11, 'sold'], [3, 11, 'sold'], [4, 11, 'sold']] },
      ],
      s: 'A cancelled ticket goes back on sale, so it does not fill a seat.',
      k: 'List the events whose live tickets have reached the capacity of their venue. Return the venue name, the event title, sold and capacity, in any order.',
      q: "SELECT v.name AS venue, e.title, COUNT(*) AS sold, v.capacity FROM tickets t JOIN events e ON e.id = t.event_id JOIN venues v ON v.id = e.venue_id WHERE t.status = 'sold' GROUP BY e.id, v.name, e.title, v.capacity HAVING COUNT(*) >= v.capacity",
      wrong: ["SELECT v.name AS venue, e.title, COUNT(*) AS sold, v.capacity FROM tickets t JOIN events e ON e.id = t.event_id JOIN venues v ON v.id = e.venue_id GROUP BY e.id, v.name, e.title, v.capacity HAVING COUNT(*) >= v.capacity"],
      h: 'Only the live tickets occupy a seat.',
      x: 'Filtering the status before grouping makes the count the number of seats actually gone.' },

    { t: 'Patients on Several Drug Classes', tg: ['count distinct', 'joins', 'having'],
      tb: ['drug_classes', 'drugs', 'prescriptions'],
      extra: {
        drug_classes: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Analgesic'], [2, 'Antibiotic'], [3, 'Antihistamine']]),
        drugs: T('id INTEGER PRIMARY KEY, class_id INTEGER, name TEXT', [[10, 1, 'Paracet'], [11, 1, 'Ibufen'], [12, 2, 'Amoxil'], [13, 3, 'Cetiriz']]),
        prescriptions: T('id INTEGER PRIMARY KEY, patient TEXT, drug_id INTEGER', [
          [1, 'Asha', 10], [2, 'Asha', 12], [3, 'Ben', 11], [4, 'Chitra', 13], [5, 'Chitra', 12], [6, 'Dev', 10]]),
      },
      hidden: [
        { prescriptions: [[1, 'Asha', 10], [2, 'Asha', 11], [3, 'Ben', 11], [4, 'Chitra', 13], [5, 'Chitra', 12], [6, 'Dev', 10]] },
        { prescriptions: [[1, 'Asha', 10], [2, 'Ben', 12], [3, 'Ben', 13], [4, 'Chitra', 13], [5, 'Dev', 10], [6, 'Dev', 11]] },
      ],
      s: 'Two different drugs can belong to the same class.',
      k: 'List the patients prescribed drugs from more than one class, with how many classes. Return patient and classes in any order.',
      q: 'SELECT p.patient, COUNT(DISTINCT d.class_id) AS classes FROM prescriptions p JOIN drugs d ON d.id = p.drug_id JOIN drug_classes c ON c.id = d.class_id GROUP BY p.patient HAVING COUNT(DISTINCT d.class_id) > 1',
      wrong: ['SELECT p.patient, COUNT(*) AS classes FROM prescriptions p JOIN drugs d ON d.id = p.drug_id JOIN drug_classes c ON c.id = d.class_id GROUP BY p.patient HAVING COUNT(*) > 1'],
      h: 'Two prescriptions can still be one class.',
      x: 'COUNT(DISTINCT class_id) counts classes; counting rows counts prescriptions and flags a patient on two drugs of the same class.' },

    { t: 'Net Movement per Account', tg: ['case', 'joins', 'signed sum'],
      tb: ['account_types', 'accounts', 'entries'],
      extra: {
        account_types: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Current'], [2, 'Savings']]),
        accounts: T('id INTEGER PRIMARY KEY, type_id INTEGER, holder TEXT', [[100, 1, 'Asha'], [101, 1, 'Ben'], [102, 2, 'Chitra']]),
        entries: T('id INTEGER PRIMARY KEY, account_id INTEGER, kind TEXT, amount INTEGER', [
          [1, 100, 'deposit', 5000], [2, 100, 'deposit', 2000], [3, 101, 'deposit', 3000], [4, 102, 'deposit', 9000]]),
      },
      hidden: [
        { entries: [[1, 100, 'deposit', 5000], [2, 100, 'withdrawal', 2000], [3, 101, 'deposit', 3000], [4, 102, 'withdrawal', 9000]] },
        { entries: [[1, 100, 'deposit', 1000], [2, 101, 'withdrawal', 500], [3, 101, 'deposit', 2000], [4, 102, 'deposit', 100]] },
      ],
      s: 'Both deposits and withdrawals are stored as positive amounts, with the kind in its own column.',
      k: 'For each account, report the type name, the holder and the net movement. Any order.',
      q: "SELECT t.name AS type, a.holder, SUM(CASE WHEN e.kind = 'deposit' THEN e.amount ELSE -e.amount END) AS net FROM entries e JOIN accounts a ON a.id = e.account_id JOIN account_types t ON t.id = a.type_id GROUP BY a.id, t.name, a.holder",
      wrong: ["SELECT t.name AS type, a.holder, SUM(e.amount) AS net FROM entries e JOIN accounts a ON a.id = e.account_id JOIN account_types t ON t.id = a.type_id GROUP BY a.id, t.name, a.holder"],
      h: 'A withdrawal has to count against the balance.',
      x: 'A CASE gives each row its sign before the sum. Adding the amounts straight up is right only while nothing has been withdrawn.' },

    { t: 'Best Seller per Store by Revenue', tg: ['window', 'joins', 'revenue'],
      tb: ['stores', 'products', 'sales'],
      extra: {
        stores: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Harbour Shop'], [2, 'Hill Shop']]),
        products: T('id INTEGER PRIMARY KEY, name TEXT, price INTEGER', [[10, 'Pen', 100], [11, 'Mug', 100], [12, 'Lamp', 100]]),
        sales: T('id INTEGER PRIMARY KEY, store_id INTEGER, product_id INTEGER, units INTEGER', [
          [1, 1, 10, 5], [2, 1, 11, 3], [3, 1, 12, 1], [4, 2, 10, 2], [5, 2, 11, 7]]),
      },
      hidden: [
        { products: [[10, 'Pen', 10], [11, 'Mug', 100], [12, 'Lamp', 900]] },
        { sales: [[1, 1, 10, 1], [2, 1, 11, 9], [3, 1, 12, 2], [4, 2, 10, 8], [5, 2, 11, 1]] },
      ],
      s: 'Each sale row holds the units sold; the money depends on the product price.',
      k: 'For each store, report the product that brought in the most revenue and that revenue. Return the store, the product and revenue, in any order.',
      n: ['No two products of a store tie on revenue.'],
      q: 'WITH r AS (SELECT s.store_id, p.name AS product, SUM(s.units * p.price) AS revenue FROM sales s JOIN products p ON p.id = s.product_id GROUP BY s.store_id, p.id, p.name), k AS (SELECT store_id, product, revenue, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY revenue DESC) AS rk FROM r) SELECT st.name AS store, k.product, k.revenue FROM k JOIN stores st ON st.id = k.store_id WHERE k.rk = 1',
      wrong: ['WITH r AS (SELECT s.store_id, p.name AS product, SUM(s.units) AS units, SUM(s.units * p.price) AS revenue FROM sales s JOIN products p ON p.id = s.product_id GROUP BY s.store_id, p.id, p.name), k AS (SELECT store_id, product, revenue, ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY units DESC) AS rk FROM r) SELECT st.name AS store, k.product, k.revenue FROM k JOIN stores st ON st.id = k.store_id WHERE k.rk = 1'],
      h: 'Rank by money, which needs the price from the product.',
      x: 'Units and revenue only agree while every product costs the same. Ranking by units times price answers the question asked.' },

    { t: 'Who Is Past the Feature Version', tg: ['joins', 'numeric compare', 'text trap'],
      tb: ['app_versions', 'users', 'installs'],
      extra: {
        app_versions: T('version INTEGER PRIMARY KEY, released_on TEXT', [[7, '2024-01-01'], [8, '2024-02-01'], [9, '2024-03-01']]),
        users: T('id INTEGER PRIMARY KEY, name TEXT, country TEXT', [[1, 'Asha', 'IN'], [2, 'Ben', 'DE'], [3, 'Chitra', 'US']]),
        installs: T('user_id INTEGER, version INTEGER', [[1, 9], [2, 7], [3, 8]]),
      },
      hidden: [
        { app_versions: [[7, '2024-01-01'], [8, '2024-02-01'], [9, '2024-03-01'], [10, '2024-04-01'], [11, '2024-05-01']], installs: [[1, 10], [2, 7], [3, 11]] },
        { installs: [[1, 7], [2, 8], [3, 9]] },
      ],
      s: 'A feature shipped in version 8. The support team wants the people who can already use it.',
      k: 'List the users whose installed version is 8 or newer. Return the user name and the version, in any order.',
      q: 'SELECT u.name, i.version FROM installs i JOIN users u ON u.id = i.user_id JOIN app_versions v ON v.version = i.version WHERE i.version >= 8',
      wrong: ["SELECT u.name, i.version FROM installs i JOIN users u ON u.id = i.user_id JOIN app_versions v ON v.version = i.version WHERE CAST(i.version AS TEXT) >= '8'"],
      h: 'Compare numbers as numbers.',
      x: 'Compared as text, "10" sorts before "8", so a newer version looks older. The version column is a number and should be compared as one.' },

    { t: 'Rooms Booked Twice Over', tg: ['self join', 'intervals', 'joins'],
      tb: ['room_types', 'rooms', 'bookings'],
      extra: {
        room_types: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Standard'], [2, 'Suite']]),
        rooms: T('id INTEGER PRIMARY KEY, type_id INTEGER, number TEXT', [[101, 1, '101'], [201, 2, '201']]),
        bookings: T('id INTEGER PRIMARY KEY, room_id INTEGER, check_in TEXT, check_out TEXT', [
          [1, 101, '2024-07-01', '2024-07-02'], [2, 101, '2024-07-01', '2024-07-02'], [3, 201, '2024-07-05', '2024-07-06']]),
      },
      hidden: [
        { bookings: [[1, 101, '2024-07-01', '2024-07-05'], [2, 101, '2024-07-03', '2024-07-04'], [3, 201, '2024-07-05', '2024-07-06']] },
        { bookings: [[1, 101, '2024-07-01', '2024-07-02'], [2, 101, '2024-07-02', '2024-07-03'], [3, 201, '2024-07-05', '2024-07-09'], [4, 201, '2024-07-08', '2024-07-10']] },
      ],
      s: 'A booking holds a room from the check-in day until the check-out day, which is free again for the next guest.',
      k: 'Find the pairs of bookings that overlap on the same room. Return the room number, the type name and the two booking ids with the smaller one first, in any order.',
      n: ['A booking that checks out on the day another checks in is not an overlap.'],
      q: 'SELECT r.number, rt.name AS type, b1.id AS first_booking, b2.id AS second_booking FROM bookings b1 JOIN bookings b2 ON b2.room_id = b1.room_id AND b1.id < b2.id AND b1.check_in < b2.check_out AND b2.check_in < b1.check_out JOIN rooms r ON r.id = b1.room_id JOIN room_types rt ON rt.id = r.type_id',
      wrong: ['SELECT r.number, rt.name AS type, b1.id AS first_booking, b2.id AS second_booking FROM bookings b1 JOIN bookings b2 ON b2.room_id = b1.room_id AND b1.id < b2.id AND b1.check_in = b2.check_in JOIN rooms r ON r.id = b1.room_id JOIN room_types rt ON rt.id = r.type_id'],
      h: 'Two stays clash when each begins before the other ends.',
      x: 'The overlap test covers every arrangement, including one booking sitting entirely inside another. Comparing only the check-in days finds just the exact duplicates.' },

    { t: 'Orders Split Across Warehouses', tg: ['count distinct', 'having', 'joins'],
      tb: ['warehouses', 'orders', 'shipments'],
      extra: {
        warehouses: T('id INTEGER PRIMARY KEY, region TEXT', [[10, 'North'], [20, 'South']]),
        orders: T('id INTEGER PRIMARY KEY, customer TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        shipments: T('id INTEGER PRIMARY KEY, order_id INTEGER, warehouse_id INTEGER', [
          [100, 1, 10], [101, 1, 20], [102, 2, 10], [103, 3, 20]]),
      },
      hidden: [
        { shipments: [[100, 1, 10], [101, 1, 10], [102, 2, 10], [103, 3, 20]] },
        { shipments: [[100, 1, 10], [101, 2, 10], [102, 2, 20], [103, 3, 20], [104, 3, 10]] },
      ],
      s: 'A big order can be shipped in several parcels, sometimes from the same warehouse twice.',
      k: 'List the orders that were shipped from more than one warehouse, with how many. Return the customer and warehouses in any order.',
      q: 'SELECT o.customer, COUNT(DISTINCT s.warehouse_id) AS warehouses FROM shipments s JOIN orders o ON o.id = s.order_id JOIN warehouses w ON w.id = s.warehouse_id GROUP BY o.id, o.customer HAVING COUNT(DISTINCT s.warehouse_id) > 1',
      wrong: ['SELECT o.customer, COUNT(*) AS warehouses FROM shipments s JOIN orders o ON o.id = s.order_id JOIN warehouses w ON w.id = s.warehouse_id GROUP BY o.id, o.customer HAVING COUNT(*) > 1'],
      h: 'Two parcels can come from one warehouse.',
      x: 'Counting distinct warehouses answers the question; counting parcels flags any order that shipped twice.' },

    { t: 'Cancellation Rate by Signup Cohort', tg: ['joins', 'left join', 'rate'],
      tb: ['cohorts', 'customers', 'cancellations'],
      extra: {
        cohorts: T('month TEXT PRIMARY KEY, campaign TEXT', [['2024-01', 'New Year'], ['2024-02', 'Spring']]),
        customers: T('id INTEGER PRIMARY KEY, signup_month TEXT, name TEXT', [
          [1, '2024-01', 'Asha'], [2, '2024-01', 'Ben'], [3, '2024-01', 'Chitra'], [4, '2024-02', 'Dev'], [5, '2024-02', 'Esha']]),
        cancellations: T('customer_id INTEGER, day TEXT', [[1, '2024-03-01'], [4, '2024-04-01']]),
      },
      hidden: [
        { cancellations: [[1, '2024-03-01'], [1, '2024-05-01'], [4, '2024-04-01']] },
        { cancellations: [[2, '2024-03-01'], [3, '2024-03-02'], [5, '2024-04-01']] },
      ],
      s: 'A customer can cancel, come back and cancel again, which writes a second row.',
      k: 'For each signup cohort, report the share of its customers who have cancelled at least once, rounded to 2 decimals. Return month, campaign and cancel_rate in any order.',
      q: 'SELECT c.month, c.campaign, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM cancellations x WHERE x.customer_id = cu.id) THEN 1 ELSE 0 END) / COUNT(*), 2) AS cancel_rate FROM customers cu JOIN cohorts c ON c.month = cu.signup_month GROUP BY c.month, c.campaign',
      wrong: ['SELECT c.month, c.campaign, ROUND(1.0 * (SELECT COUNT(*) FROM cancellations x JOIN customers c2 ON c2.id = x.customer_id WHERE c2.signup_month = c.month) / COUNT(*), 2) AS cancel_rate FROM customers cu JOIN cohorts c ON c.month = cu.signup_month GROUP BY c.month, c.campaign'],
      h: 'The numerator counts customers, not cancellation rows.',
      x: 'An EXISTS test per customer counts each person once however many times they left.' },

    { t: 'Commission by Ride Count Band', tg: ['band lookup', 'joins', 'approximate match'],
      tb: ['bands', 'drivers', 'rides'],
      extra: {
        bands: T('min_rides INTEGER PRIMARY KEY, commission REAL', [[0, 0.25], [10, 0.2], [25, 0.15]]),
        drivers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        rides: T('id INTEGER PRIMARY KEY, driver_id INTEGER, fare INTEGER', [
          [1, 1, 100], [2, 1, 100], [3, 1, 100], [4, 1, 100], [5, 1, 100],
          [6, 2, 200], [7, 2, 200], [8, 2, 200],
          [9, 3, 300], [10, 3, 300]]),
      },
      hidden: [
        { rides: Array.from({ length: 12 }, (_, i) => [i + 1, 1, 100]).concat(Array.from({ length: 3 }, (_, i) => [i + 20, 2, 200]), [[30, 3, 300]]) },
        { bands: [[0, 0.3], [10, 0.1], [25, 0.05]] },
      ],
      s: 'The commission depends on how many rides the driver has given: 25% from 0 rides, 20% from 10 rides and 15% from 25 rides.',
      k: 'For each driver, report the number of rides, the gross fares and the commission owed, rounded to 2 decimals. Return name, rides, gross and commission in any order.',
      n: ['A driver on exactly 10 rides is already in the 20% band.'],
      q: 'WITH d AS (SELECT r.driver_id, COUNT(*) AS n, SUM(r.fare) AS gross FROM rides r GROUP BY r.driver_id) SELECT dr.name, d.n AS rides, d.gross, ROUND(d.gross * (SELECT b.commission FROM bands b WHERE b.min_rides <= d.n ORDER BY b.min_rides DESC LIMIT 1), 2) AS commission FROM d JOIN drivers dr ON dr.id = d.driver_id',
      wrong: ['WITH d AS (SELECT r.driver_id, COUNT(*) AS n, SUM(r.fare) AS gross FROM rides r GROUP BY r.driver_id) SELECT dr.name, d.n AS rides, d.gross, ROUND(d.gross * (SELECT b.commission FROM bands b WHERE b.min_rides <= d.n ORDER BY b.min_rides LIMIT 1), 2) AS commission FROM d JOIN drivers dr ON dr.id = d.driver_id'],
      h: 'Among the bands the driver qualifies for, which one applies?',
      x: 'The band that applies is the one with the largest minimum at or below the ride count, so the candidates are ordered descending. Taking the smallest minimum always lands in the first band.' },

    { t: 'Searches That Went Nowhere', tg: ['not exists', 'joins', 'sessions'],
      tb: ['users', 'sessions', 'searches', 'clicks'],
      extra: {
        users: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        sessions: T('id INTEGER PRIMARY KEY, user_id INTEGER, day TEXT', [[10, 1, '2024-06-01'], [11, 2, '2024-06-01'], [12, 3, '2024-06-02']]),
        searches: T('id INTEGER PRIMARY KEY, session_id INTEGER, term TEXT', [[1, 10, 'lamp'], [2, 11, 'desk'], [3, 12, 'rug']]),
        clicks: T('search_id INTEGER, result_id INTEGER', [[2, 500]]),
      },
      hidden: [
        { clicks: [[2, 500], [null, 501]] },
        { clicks: [] },
      ],
      s: 'A click is recorded against the search it came from, although a click logged before its search was matched up can have no search at all.',
      k: 'List the searches that got no click. Return the user name, the session day and the term, in any order.',
      q: 'SELECT u.name, s.day, se.term FROM searches se JOIN sessions s ON s.id = se.session_id JOIN users u ON u.id = s.user_id WHERE NOT EXISTS (SELECT 1 FROM clicks c WHERE c.search_id = se.id)',
      wrong: ['SELECT u.name, s.day, se.term FROM searches se JOIN sessions s ON s.id = se.session_id JOIN users u ON u.id = s.user_id WHERE se.id NOT IN (SELECT search_id FROM clicks)'],
      h: 'A search with no click should simply have no matching click row.',
      x: 'NOT EXISTS keeps the searches with no click. Filtering on the joined column being empty works here too, but adding an extra test for a zero result id invents a rule the question never stated.' },

    { t: 'Below Reorder Level After Inbound Stock', tg: ['left join', 'coalesce', 'joins'],
      tb: ['products', 'stock', 'inbound'],
      extra: {
        products: T('id INTEGER PRIMARY KEY, sku TEXT, reorder_level INTEGER', [[1, 'LAMP-01', 20], [2, 'DESK-02', 10], [3, 'RUG-03', 5]]),
        stock: T('product_id INTEGER, on_hand INTEGER', [[1, 12], [2, 4], [3, 9]]),
        inbound: T('product_id INTEGER, qty INTEGER', [[1, 5], [2, 2], [3, 1]]),
      },
      hidden: [
        { inbound: [[1, 5], [3, 1]] },
        { inbound: [[1, 20], [2, 20], [3, 20]] },
      ],
      s: 'Stock already on its way to the warehouse counts towards cover. A product with nothing inbound has no row in that table.',
      k: 'List the products whose stock on hand plus inbound stock is still below the reorder level. Return sku, on_hand, incoming and reorder_level, in any order.',
      q: 'SELECT p.sku, s.on_hand, COALESCE((SELECT SUM(i.qty) FROM inbound i WHERE i.product_id = p.id), 0) AS incoming, p.reorder_level FROM products p JOIN stock s ON s.product_id = p.id WHERE s.on_hand + COALESCE((SELECT SUM(i.qty) FROM inbound i WHERE i.product_id = p.id), 0) < p.reorder_level',
      wrong: ['SELECT p.sku, s.on_hand, SUM(i.qty) AS incoming, p.reorder_level FROM products p JOIN stock s ON s.product_id = p.id JOIN inbound i ON i.product_id = p.id GROUP BY p.id, p.sku, s.on_hand, p.reorder_level HAVING s.on_hand + SUM(i.qty) < p.reorder_level'],
      h: 'A product with nothing on its way still needs checking.',
      x: 'The inbound total is a subquery with a zero default, so products with no inbound row are judged on their stock alone. An inner join hides exactly those.' },

    { t: 'Teaching Outside Their Qualifications', tg: ['not exists', 'many-to-many', 'joins'],
      tb: ['subjects', 'teachers', 'qualifications', 'lessons'],
      extra: {
        subjects: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Maths'], [2, 'Physics'], [3, 'History']]),
        teachers: T('id INTEGER PRIMARY KEY, name TEXT, main_subject_id INTEGER', [[10, 'Rao', 1], [11, 'Iyer', 2], [12, 'Nair', 3]]),
        qualifications: T('teacher_id INTEGER, subject_id INTEGER', [[10, 1], [11, 2], [12, 3]]),
        lessons: T('id INTEGER PRIMARY KEY, teacher_id INTEGER, subject_id INTEGER, day TEXT', [
          [1, 10, 1, '2024-09-02'], [2, 10, 2, '2024-09-03'], [3, 11, 2, '2024-09-02'], [4, 12, 3, '2024-09-04']]),
      },
      hidden: [
        { qualifications: [[10, 1], [10, 2], [11, 2], [12, 3]] },
        { lessons: [[1, 10, 1, '2024-09-02'], [2, 11, 3, '2024-09-03'], [3, 11, 2, '2024-09-02'], [4, 12, 3, '2024-09-04']] },
      ],
      s: 'A teacher can be qualified in several subjects, which are listed in their own table. The main subject is only the one they are listed under.',
      k: 'List the lessons taught by someone not qualified in that subject. Return the teacher, the subject of the lesson and the day, in any order.',
      q: 'SELECT t.name AS teacher, s.name AS subject, l.day FROM lessons l JOIN teachers t ON t.id = l.teacher_id JOIN subjects s ON s.id = l.subject_id WHERE NOT EXISTS (SELECT 1 FROM qualifications q WHERE q.teacher_id = l.teacher_id AND q.subject_id = l.subject_id)',
      wrong: ['SELECT t.name AS teacher, s.name AS subject, l.day FROM lessons l JOIN teachers t ON t.id = l.teacher_id JOIN subjects s ON s.id = l.subject_id WHERE l.subject_id <> t.main_subject_id'],
      h: 'Qualifications live in their own table, one row per subject.',
      x: 'The rule is about the qualification list, so the test is a NOT EXISTS against it. Comparing with the main subject flags every teacher who covers a second subject they are perfectly qualified for.' },

    { t: 'Called Back About the Same Issue', tg: ['self join', 'dates', 'joins'],
      tb: ['issues', 'customers', 'tickets'],
      extra: {
        issues: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Billing'], [2, 'Delivery']]),
        customers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        tickets: T('id INTEGER PRIMARY KEY, customer_id INTEGER, issue_id INTEGER, day INTEGER', [
          [1, 1, 1, 1], [2, 1, 1, 4], [3, 2, 1, 1], [4, 2, 2, 30], [5, 3, 2, 1], [6, 3, 2, 20]]),
      },
      hidden: [
        { tickets: [[1, 1, 1, 1], [2, 1, 2, 4], [3, 2, 1, 1], [4, 2, 2, 30], [5, 3, 2, 1], [6, 3, 2, 6]] },
        { tickets: [[1, 1, 1, 1], [2, 1, 1, 9], [3, 2, 1, 1], [4, 2, 1, 2], [5, 3, 2, 1], [6, 3, 2, 30]] },
      ],
      s: 'A customer calling twice in a week about the same thing means the first answer did not work.',
      k: 'Find the customers who opened two tickets on the same issue within 7 days of each other. Return the customer, the issue name and the gap in days, in any order.',
      n: ['Two tickets about different issues in the same week do not count.'],
      q: 'SELECT c.name AS customer, i.name AS issue, t2.day - t1.day AS gap FROM tickets t1 JOIN tickets t2 ON t2.customer_id = t1.customer_id AND t2.issue_id = t1.issue_id AND t2.day > t1.day AND t2.day - t1.day <= 7 JOIN customers c ON c.id = t1.customer_id JOIN issues i ON i.id = t1.issue_id',
      wrong: ['SELECT c.name AS customer, i.name AS issue, t2.day - t1.day AS gap FROM tickets t1 JOIN tickets t2 ON t2.customer_id = t1.customer_id AND t2.id <> t1.id AND t2.day > t1.day AND t2.day - t1.day <= 7 JOIN customers c ON c.id = t1.customer_id JOIN issues i ON i.id = t1.issue_id'],
      h: 'The two tickets must share the issue as well as the customer.',
      x: 'Joining on both the customer and the issue is what makes it a repeat contact rather than two unrelated calls.' },
  ]);
})();
