// Dojo SQL, interview-grade set: Hard, batch 3.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('hard', [
    { t: 'Payouts That Do Not Reconcile', tg: ['subquery', 'joins', 'reconciliation'],
      tb: ['merchants', 'payouts', 'payout_items', 'fees'],
      extra: {
        merchants: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Corner Shop'], [2, 'Big Store']]),
        payouts: T('id INTEGER PRIMARY KEY, merchant_id INTEGER, amount INTEGER', [[100, 1, 900], [101, 2, 1700]]),
        payout_items: T('payout_id INTEGER, order_amount INTEGER', [[100, 500], [100, 500], [101, 1000], [101, 1000]]),
        fees: T('payout_id INTEGER, amount INTEGER', [[100, 100], [101, 200]]),
      },
      hidden: [
        { fees: [[100, 50], [100, 50], [101, 200]] },
        { payout_items: [[100, 500], [100, 500], [101, 1000], [101, 900]] },
      ],
      s: 'A payout gathers order amounts and takes fees off the top. Fees can be charged in more than one line.',
      k: 'Find the payouts whose items minus fees do not match the amount paid out. Return the merchant, the payout id, expected and amount, in any order.',
      q: 'SELECT m.name, p.id AS payout, (SELECT SUM(i.order_amount) FROM payout_items i WHERE i.payout_id = p.id) - COALESCE((SELECT SUM(f.amount) FROM fees f WHERE f.payout_id = p.id), 0) AS expected, p.amount FROM payouts p JOIN merchants m ON m.id = p.merchant_id WHERE (SELECT SUM(i.order_amount) FROM payout_items i WHERE i.payout_id = p.id) - COALESCE((SELECT SUM(f.amount) FROM fees f WHERE f.payout_id = p.id), 0) <> p.amount',
      wrong: ['SELECT m.name, p.id AS payout, SUM(i.order_amount) - f.amount AS expected, p.amount FROM payouts p JOIN merchants m ON m.id = p.merchant_id JOIN payout_items i ON i.payout_id = p.id JOIN fees f ON f.payout_id = p.id GROUP BY p.id, m.name, f.amount, p.amount HAVING SUM(i.order_amount) - f.amount <> p.amount'],
      h: 'Items and fees are two separate totals per payout.',
      x: 'Each total is taken in its own subquery, so a second fee line cannot multiply the items. Joining both tables at once repeats the item rows once per fee.' },

    { t: 'Closing Stock per Month', tg: ['running total', 'joins', 'months'], o: true,
      tb: ['products', 'months', 'receipts', 'issues'],
      extra: {
        products: T('id INTEGER PRIMARY KEY, sku TEXT', [[1, 'LAMP-01']]),
        months: T('seq INTEGER PRIMARY KEY, month TEXT', [[1, '2024-01']]),
        receipts: T('product_id INTEGER, month TEXT, qty INTEGER', [[1, '2024-01', 100]]),
        issues: T('product_id INTEGER, month TEXT, qty INTEGER', [[1, '2024-01', 40]]),
      },
      hidden: [
        { months: [[1, '2024-01'], [2, '2024-02'], [3, '2024-03']], receipts: [[1, '2024-01', 100], [1, '2024-02', 50]], issues: [[1, '2024-01', 40], [1, '2024-02', 30], [1, '2024-03', 20]] },
        { months: [[1, '2024-01'], [2, '2024-02']], receipts: [[1, '2024-01', 80], [1, '2024-02', 10]], issues: [[1, '2024-01', 30], [1, '2024-02', 5]] },
      ],
      s: 'Stock carries over: what is left at the end of a month opens the next one.',
      k: 'For every month, report the closing quantity of the product. Order by month.',
      n: ['A month with no movement still reports the quantity carried in.'],
      q: "SELECT m.month, COALESCE((SELECT SUM(r.qty) FROM receipts r JOIN months m2 ON m2.month = r.month WHERE m2.seq <= m.seq), 0) - COALESCE((SELECT SUM(i.qty) FROM issues i JOIN months m3 ON m3.month = i.month WHERE m3.seq <= m.seq), 0) AS closing FROM months m ORDER BY m.month",
      wrong: ["SELECT m.month, COALESCE((SELECT SUM(r.qty) FROM receipts r WHERE r.month = m.month), 0) - COALESCE((SELECT SUM(i.qty) FROM issues i WHERE i.month = m.month), 0) AS closing FROM months m ORDER BY m.month"],
      h: 'Closing stock is everything received so far minus everything issued so far.',
      x: 'Both subqueries reach back over the earlier months, which is what carrying stock forward means. Taking only the month\'s own movements reports the change, not the balance.' },

    { t: 'Users Logging In Less and Complaining', tg: ['self join', 'joins', 'two signals'],
      tb: ['users', 'logins', 'tickets'],
      extra: {
        users: T('id INTEGER PRIMARY KEY, name TEXT, plan TEXT', [[1, 'Asha', 'pro'], [2, 'Ben', 'free'], [3, 'Chitra', 'pro']]),
        logins: T('user_id INTEGER, month INTEGER, logins INTEGER', [
          [1, 1, 20], [1, 2, 5], [2, 1, 10], [2, 2, 12], [3, 1, 8], [3, 2, 2]]),
        tickets: T('id INTEGER PRIMARY KEY, user_id INTEGER, month INTEGER, subject TEXT', [
          [1, 1, 2, 'Slow'], [2, 3, 2, 'Crash']]),
      },
      hidden: [
        { tickets: [[1, 1, 2, 'Slow'], [2, 2, 2, 'Billing'], [3, 2, 2, 'Refund']] },
        { logins: [[1, 1, 20], [1, 2, 25], [2, 1, 10], [2, 2, 12], [3, 1, 8], [3, 2, 2]] },
      ],
      s: 'A customer whose usage falls while they are also raising tickets is worth calling.',
      k: 'Find the users whose logins fell from month 1 to month 2 and who raised at least one ticket in month 2. Return the name, the plan, logins in each month and the ticket count, in any order.',
      q: 'SELECT u.name, u.plan, l1.logins AS m1, l2.logins AS m2, (SELECT COUNT(*) FROM tickets t WHERE t.user_id = u.id AND t.month = 2) AS tickets FROM logins l1 JOIN logins l2 ON l2.user_id = l1.user_id AND l1.month = 1 AND l2.month = 2 JOIN users u ON u.id = l1.user_id WHERE l2.logins < l1.logins AND EXISTS (SELECT 1 FROM tickets t WHERE t.user_id = u.id AND t.month = 2)',
      wrong: ['SELECT u.name, u.plan, l1.logins AS m1, l2.logins AS m2, (SELECT COUNT(*) FROM tickets t WHERE t.user_id = u.id AND t.month = 2) AS tickets FROM logins l1 JOIN logins l2 ON l2.user_id = l1.user_id AND l1.month = 1 AND l2.month = 2 JOIN users u ON u.id = l1.user_id WHERE l2.logins < l1.logins OR EXISTS (SELECT 1 FROM tickets t WHERE t.user_id = u.id AND t.month = 2)'],
      h: 'Both signals have to be present.',
      x: 'The two conditions are joined with AND, so a happy customer who asked a billing question does not land on the call list.' },

    { t: 'Route Margin Including Costless Trips', tg: ['left join', 'coalesce', 'margin'],
      tb: ['routes', 'trips', 'costs', 'revenues'],
      extra: {
        routes: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'DEL-BOM'], [2, 'BOM-BLR']]),
        trips: T('id INTEGER PRIMARY KEY, route_id INTEGER, day TEXT', [
          [10, 1, '2024-05-01'], [11, 1, '2024-05-02'], [12, 2, '2024-05-01']]),
        costs: T('trip_id INTEGER, amount INTEGER', [[10, 400], [11, 500], [12, 300]]),
        revenues: T('trip_id INTEGER, amount INTEGER', [[10, 900], [11, 700], [12, 500]]),
      },
      hidden: [
        { costs: [[10, 400], [12, 300]] },
        { revenues: [[10, 500], [11, 400], [12, 900]] },
      ],
      s: 'A trip whose costs have not been filed yet has no cost row at all.',
      k: 'For each route, report revenue, cost and margin (revenue minus cost). Any order.',
      q: 'SELECT r.name, COALESCE((SELECT SUM(v.amount) FROM revenues v JOIN trips t2 ON t2.id = v.trip_id WHERE t2.route_id = r.id), 0) AS revenue, COALESCE((SELECT SUM(c.amount) FROM costs c JOIN trips t3 ON t3.id = c.trip_id WHERE t3.route_id = r.id), 0) AS cost, COALESCE((SELECT SUM(v.amount) FROM revenues v JOIN trips t2 ON t2.id = v.trip_id WHERE t2.route_id = r.id), 0) - COALESCE((SELECT SUM(c.amount) FROM costs c JOIN trips t3 ON t3.id = c.trip_id WHERE t3.route_id = r.id), 0) AS margin FROM routes r',
      wrong: ['SELECT r.name, SUM(v.amount) AS revenue, SUM(c.amount) AS cost, SUM(v.amount) - SUM(c.amount) AS margin FROM trips t JOIN routes r ON r.id = t.route_id JOIN costs c ON c.trip_id = t.id JOIN revenues v ON v.trip_id = t.id GROUP BY r.id, r.name'],
      h: 'Revenue and cost are two independent totals per route.',
      x: 'Separate subqueries keep a trip with no cost row in the revenue, and stop either side from being repeated by the other.' },

    { t: 'Promotions Overlapping on a Product', tg: ['self join', 'intervals', 'joins'],
      tb: ['promotions', 'products', 'promo_products'],
      extra: {
        promotions: T('id INTEGER PRIMARY KEY, name TEXT, start_day TEXT, end_day TEXT', [
          [1, 'Spring Sale', '2024-03-01', '2024-03-31'], [2, 'Clearance', '2024-03-20', '2024-03-25'], [3, 'Loyalty', '2024-04-01', '2024-04-10']]),
        products: T('id INTEGER PRIMARY KEY, sku TEXT', [[10, 'LAMP-01'], [11, 'DESK-02']]),
        promo_products: T('promo_id INTEGER, product_id INTEGER', [[1, 10], [2, 10], [3, 11]]),
      },
      hidden: [
        { promotions: [[1, 'Spring Sale', '2024-03-01', '2024-03-22'], [2, 'Clearance', '2024-03-20', '2024-03-25'], [3, 'Loyalty', '2024-04-01', '2024-04-10']] },
        { promotions: [[1, 'Spring Sale', '2024-03-01', '2024-03-10'], [2, 'Clearance', '2024-03-20', '2024-03-25'], [3, 'Loyalty', '2024-04-01', '2024-04-10']] },
      ],
      s: 'Two promotions must never cover the same product at the same time, or the till does not know which discount to apply.',
      k: 'Find the products covered by two promotions whose date ranges overlap. Return the sku and the two promotion names, the earlier-starting one first, in any order.',
      n: ['Both end days are included in the range.'],
      q: 'SELECT p.sku, pr1.name AS promo_a, pr2.name AS promo_b FROM promo_products pp1 JOIN promo_products pp2 ON pp2.product_id = pp1.product_id AND pp2.promo_id <> pp1.promo_id JOIN promotions pr1 ON pr1.id = pp1.promo_id JOIN promotions pr2 ON pr2.id = pp2.promo_id JOIN products p ON p.id = pp1.product_id WHERE pr1.start_day < pr2.start_day AND pr1.end_day >= pr2.start_day',
      wrong: ['SELECT p.sku, pr1.name AS promo_a, pr2.name AS promo_b FROM promo_products pp1 JOIN promo_products pp2 ON pp2.product_id = pp1.product_id AND pp2.promo_id <> pp1.promo_id JOIN promotions pr1 ON pr1.id = pp1.promo_id JOIN promotions pr2 ON pr2.id = pp2.promo_id JOIN products p ON p.id = pp1.product_id WHERE pr1.start_day < pr2.start_day AND pr1.end_day >= pr2.end_day'],
      h: 'An overlap starts when the earlier promotion is still running on the day the later one begins.',
      x: 'Comparing the first promotion\'s end with the second one\'s start is the real test. Comparing the two end days only finds a promotion that completely contains another.' },

    { t: 'Products Bought by the Same Customer', tg: ['self join', 'distinct pairs', 'joins'],
      tb: ['customers', 'products', 'orders', 'order_items'],
      extra: {
        customers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben']]),
        products: T('id INTEGER PRIMARY KEY, name TEXT', [[10, 'Lamp'], [11, 'Desk'], [12, 'Rug']]),
        orders: T('id INTEGER PRIMARY KEY, customer_id INTEGER, day TEXT', [
          [100, 1, '2024-05-01'], [101, 1, '2024-06-01'], [102, 2, '2024-05-02']]),
        order_items: T('order_id INTEGER, product_id INTEGER', [[100, 10], [100, 11], [102, 12]]),
      },
      hidden: [
        { order_items: [[100, 10], [101, 11], [102, 12]] },
        { order_items: [[100, 10], [100, 11], [101, 10], [101, 11], [102, 12], [102, 10], [102, 11]] },
      ],
      s: 'A cross-sell pair is two different products the same customer has bought, whether in one order or across several.',
      k: 'Report every pair of products bought by the same customer, with the smaller product id first, and how many customers bought both. Return product_a, product_b and customers, in any order.',
      q: 'WITH cp AS (SELECT DISTINCT o.customer_id, oi.product_id FROM order_items oi JOIN orders o ON o.id = oi.order_id) SELECT pa.name AS product_a, pb.name AS product_b, COUNT(*) AS customers FROM cp a JOIN cp b ON b.customer_id = a.customer_id AND b.product_id > a.product_id JOIN products pa ON pa.id = a.product_id JOIN products pb ON pb.id = b.product_id GROUP BY a.product_id, b.product_id, pa.name, pb.name',
      wrong: ['SELECT pa.name AS product_a, pb.name AS product_b, COUNT(*) AS customers FROM order_items a JOIN orders oa ON oa.id = a.order_id JOIN order_items b ON b.order_id = a.order_id AND b.product_id > a.product_id JOIN products pa ON pa.id = a.product_id JOIN products pb ON pb.id = b.product_id GROUP BY a.product_id, b.product_id, pa.name, pb.name'],
      h: 'The pair belongs to the customer, not to one order.',
      x: 'Reducing to the distinct products per customer first lets a pair span two orders and stops a customer who bought both twice from being counted twice.' },

    { t: 'Patients on Interacting Drugs', tg: ['self join', 'lookup table', 'intervals'],
      tb: ['patients', 'drugs', 'prescriptions', 'interactions'],
      extra: {
        patients: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        drugs: T('id INTEGER PRIMARY KEY, name TEXT', [[10, 'Warfin'], [11, 'Aspira'], [12, 'Cetiriz']]),
        prescriptions: T('id INTEGER PRIMARY KEY, patient_id INTEGER, drug_id INTEGER, from_day INTEGER, to_day INTEGER', [
          [1, 1, 10, 1, 30], [2, 1, 11, 10, 20], [3, 2, 10, 1, 10], [4, 3, 12, 1, 30]]),
        interactions: T('drug_a INTEGER, drug_b INTEGER, severity TEXT', [[10, 11, 'high']]),
      },
      hidden: [
        { prescriptions: [[1, 1, 10, 1, 30], [2, 1, 11, 10, 20], [3, 2, 10, 1, 10], [4, 2, 11, 20, 30], [5, 3, 12, 1, 30]] },
        { prescriptions: [[1, 1, 10, 1, 5], [2, 1, 11, 10, 20], [3, 2, 10, 1, 10], [4, 3, 12, 1, 30]] },
      ],
      s: 'Two drugs only interact if the patient is taking them at the same time. The interacting pairs are listed once, in either order.',
      k: 'Find the patients taking two interacting drugs on overlapping days. Return the patient, both drug names and the severity, in any order.',
      q: 'SELECT pt.name AS patient, d1.name AS drug_a, d2.name AS drug_b, i.severity FROM prescriptions p1 JOIN prescriptions p2 ON p2.patient_id = p1.patient_id AND p2.drug_id <> p1.drug_id AND p1.from_day <= p2.to_day AND p2.from_day <= p1.to_day JOIN interactions i ON (i.drug_a = p1.drug_id AND i.drug_b = p2.drug_id) JOIN patients pt ON pt.id = p1.patient_id JOIN drugs d1 ON d1.id = p1.drug_id JOIN drugs d2 ON d2.id = p2.drug_id',
      wrong: ['SELECT pt.name AS patient, d1.name AS drug_a, d2.name AS drug_b, i.severity FROM prescriptions p1 JOIN prescriptions p2 ON p2.patient_id = p1.patient_id AND p2.drug_id <> p1.drug_id JOIN interactions i ON (i.drug_a = p1.drug_id AND i.drug_b = p2.drug_id) JOIN patients pt ON pt.id = p1.patient_id JOIN drugs d1 ON d1.id = p1.drug_id JOIN drugs d2 ON d2.id = p2.drug_id'],
      h: 'Two courses overlap when each starts on or before the other ends.',
      x: 'Without the date test the query flags a patient who finished one drug before starting the other, which is exactly how the clash is avoided in practice.' },

    { t: 'Teachers Above Their School Average', tg: ['group average', 'joins', 'having'],
      tb: ['schools', 'teachers', 'lessons'],
      extra: {
        schools: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Riverside']]),
        teachers: T('id INTEGER PRIMARY KEY, school_id INTEGER, name TEXT', [[10, 1, 'Rao'], [11, 1, 'Iyer'], [12, 1, 'Nair']]),
        lessons: T('id INTEGER PRIMARY KEY, teacher_id INTEGER, day TEXT', [
          [1, 10, '2024-09-02'], [2, 10, '2024-09-03'], [3, 10, '2024-09-04'], [4, 11, '2024-09-02'], [5, 12, '2024-09-02'], [6, 12, '2024-09-03']]),
      },
      hidden: [
        { schools: [[1, 'Riverside'], [2, 'Hilltop']], teachers: [[10, 1, 'Rao'], [11, 1, 'Iyer'], [12, 2, 'Nair'], [13, 2, 'Das']], lessons: [[1, 10, '2024-09-02'], [2, 10, '2024-09-03'], [3, 10, '2024-09-04'], [4, 10, '2024-09-05'], [5, 11, '2024-09-02'], [6, 11, '2024-09-03'], [7, 11, '2024-09-04'], [8, 12, '2024-09-02'], [9, 13, '2024-09-02']] },
        { lessons: [[1, 10, '2024-09-02'], [2, 11, '2024-09-03'], [3, 11, '2024-09-04'], [4, 11, '2024-09-05'], [5, 12, '2024-09-02'], [6, 12, '2024-09-03']] },
      ],
      s: 'Schools differ in size, so a fair comparison is within the school.',
      k: 'List the teachers with more lessons than the average teacher at their own school. Return the school, the teacher and lessons, in any order.',
      q: 'WITH t AS (SELECT te.id, te.school_id, te.name, COUNT(*) AS n FROM lessons l JOIN teachers te ON te.id = l.teacher_id GROUP BY te.id, te.school_id, te.name), a AS (SELECT school_id, AVG(n) AS avg_n FROM t GROUP BY school_id) SELECT s.name AS school, t.name AS teacher, t.n AS lessons FROM t JOIN a ON a.school_id = t.school_id JOIN schools s ON s.id = t.school_id WHERE t.n > a.avg_n',
      wrong: ['WITH t AS (SELECT te.id, te.school_id, te.name, COUNT(*) AS n FROM lessons l JOIN teachers te ON te.id = l.teacher_id GROUP BY te.id, te.school_id, te.name) SELECT s.name AS school, t.name AS teacher, t.n AS lessons FROM t JOIN schools s ON s.id = t.school_id WHERE t.n > (SELECT AVG(n) FROM t)'],
      h: 'The average is the one of the teacher\'s own school.',
      x: 'Grouping the per-teacher counts again by school gives each school its own benchmark, which only matches the overall average while there is one school.' },

    { t: 'Journeys With No Tap Out', tg: ['not exists', 'joins', 'pairing'],
      tb: ['stations', 'passengers', 'taps'],
      extra: {
        stations: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Harbour'], [2, 'Museum']]),
        passengers: T('id INTEGER PRIMARY KEY, card TEXT', [[1, 'C-1'], [2, 'C-2'], [3, 'C-3']]),
        taps: T('id INTEGER PRIMARY KEY, passenger_id INTEGER, station_id INTEGER, kind TEXT, at_min INTEGER', [
          [1, 1, 1, 'in', 100], [2, 1, 2, 'out', 130],
          [3, 2, 1, 'in', 200],
          [4, 3, 2, 'in', 300], [5, 3, 1, 'out', 340]]),
      },
      hidden: [
        { taps: [[1, 1, 1, 'in', 100], [2, 1, 2, 'out', 90], [3, 2, 1, 'in', 200], [4, 3, 2, 'in', 300], [5, 3, 1, 'out', 340]] },
        { taps: [[1, 1, 1, 'in', 100], [2, 1, 2, 'out', 130], [3, 2, 1, 'in', 200], [4, 2, 2, 'out', 260], [5, 3, 2, 'in', 300]] },
      ],
      s: 'A journey is a tap in followed by a tap out by the same card. A tap out recorded before the tap in belongs to an earlier journey.',
      k: 'Find the taps in that were never followed by a tap out. Return the card, the station name and the minute, in any order.',
      q: "SELECT p.card, s.name AS station, t.at_min FROM taps t JOIN passengers p ON p.id = t.passenger_id JOIN stations s ON s.id = t.station_id WHERE t.kind = 'in' AND NOT EXISTS (SELECT 1 FROM taps o WHERE o.passenger_id = t.passenger_id AND o.kind = 'out' AND o.at_min > t.at_min)",
      wrong: ["SELECT p.card, s.name AS station, t.at_min FROM taps t JOIN passengers p ON p.id = t.passenger_id JOIN stations s ON s.id = t.station_id WHERE t.kind = 'in' AND NOT EXISTS (SELECT 1 FROM taps o WHERE o.passenger_id = t.passenger_id AND o.kind = 'out')"],
      h: 'The tap out has to come after the tap in.',
      x: 'Adding the time comparison inside the NOT EXISTS is what makes it a matching tap out rather than any tap out that card ever made.' },

    { t: 'Order Lines Still Outstanding', tg: ['left join', 'coalesce', 'having'],
      tb: ['orders', 'products', 'order_lines', 'shipment_lines'],
      extra: {
        orders: T('id INTEGER PRIMARY KEY, customer TEXT', [[1, 'Asha'], [2, 'Ben']]),
        products: T('id INTEGER PRIMARY KEY, sku TEXT', [[10, 'LAMP-01'], [11, 'DESK-02']]),
        order_lines: T('id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, qty INTEGER', [
          [100, 1, 10, 5], [101, 1, 11, 2], [102, 2, 10, 3]]),
        shipment_lines: T('order_line_id INTEGER, qty INTEGER', [[100, 5], [101, 1], [102, 3]]),
      },
      hidden: [
        { shipment_lines: [[100, 5], [102, 3]] },
        { shipment_lines: [[100, 2], [100, 3], [101, 2], [102, 1]] },
      ],
      s: 'A line can be shipped in several parcels, or not shipped at all.',
      k: 'List the order lines that are not fully shipped. Return the customer, the sku, ordered and shipped, in any order.',
      q: 'SELECT o.customer, p.sku, ol.qty AS ordered, COALESCE((SELECT SUM(sl.qty) FROM shipment_lines sl WHERE sl.order_line_id = ol.id), 0) AS shipped FROM order_lines ol JOIN orders o ON o.id = ol.order_id JOIN products p ON p.id = ol.product_id WHERE COALESCE((SELECT SUM(sl.qty) FROM shipment_lines sl WHERE sl.order_line_id = ol.id), 0) < ol.qty',
      wrong: ['SELECT o.customer, p.sku, ol.qty AS ordered, SUM(sl.qty) AS shipped FROM order_lines ol JOIN orders o ON o.id = ol.order_id JOIN products p ON p.id = ol.product_id JOIN shipment_lines sl ON sl.order_line_id = ol.id GROUP BY ol.id, o.customer, p.sku, ol.qty HAVING SUM(sl.qty) < ol.qty'],
      h: 'A line nobody has shipped is the most outstanding of all.',
      x: 'A subquery with a zero default judges every line, including the ones with no parcel at all, which an inner join drops.' },

    { t: 'Average Rate and Revenue per Room', tg: ['joins', 'two denominators', 'dates'],
      tb: ['hotels', 'rooms', 'stays'],
      extra: {
        hotels: T('id INTEGER PRIMARY KEY, name TEXT, nights_open INTEGER', [[1, 'Harbour Inn', 10], [2, 'Hill Lodge', 10]]),
        rooms: T('id INTEGER PRIMARY KEY, hotel_id INTEGER, number TEXT', [[101, 1, '101'], [102, 1, '102'], [201, 2, '201']]),
        stays: T('id INTEGER PRIMARY KEY, room_id INTEGER, nights INTEGER, paid INTEGER', [
          [1, 101, 2, 8000], [2, 102, 3, 9000], [3, 201, 4, 20000]]),
      },
      hidden: [
        { stays: [[1, 101, 2, 8000], [2, 102, 3, 9000], [3, 201, 4, 20000], [4, 201, 1, 6000]] },
        { rooms: [[101, 1, '101'], [102, 1, '102'], [103, 1, '103'], [201, 2, '201']] },
      ],
      s: 'The average daily rate is the money taken divided by the nights sold. Revenue per available room divides the same money by every room-night the hotel had on sale.',
      k: 'For each hotel, report adr and revpar, both rounded to 2 decimals. Any order.',
      n: ['Room-nights on sale are the rooms of the hotel times its nights open.'],
      q: 'SELECT h.name, ROUND(1.0 * SUM(s.paid) / SUM(s.nights), 2) AS adr, ROUND(1.0 * SUM(s.paid) / ((SELECT COUNT(*) FROM rooms r2 WHERE r2.hotel_id = h.id) * h.nights_open), 2) AS revpar FROM stays s JOIN rooms r ON r.id = s.room_id JOIN hotels h ON h.id = r.hotel_id GROUP BY h.id, h.name, h.nights_open',
      wrong: ['SELECT h.name, ROUND(1.0 * SUM(s.paid) / SUM(s.nights), 2) AS adr, ROUND(1.0 * SUM(s.paid) / (COUNT(*) * h.nights_open), 2) AS revpar FROM stays s JOIN rooms r ON r.id = s.room_id JOIN hotels h ON h.id = r.hotel_id GROUP BY h.id, h.name, h.nights_open',
      ],
      h: 'The rooms on sale come from the rooms table, not from the number of stays.',
      x: 'A subquery counts the hotel\'s rooms once. Counting the joined rows counts stays instead, which happens to match only while every room was sold exactly once.' },

    { t: 'Delinquency Buckets on Loan Schedules', tg: ['buckets', 'dates', 'cross join'], o: true,
      tb: ['buckets', 'loans', 'schedules', 'payments'],
      extra: {
        buckets: T('label TEXT PRIMARY KEY, min_days INTEGER, max_days INTEGER', [['1-30', 1, 30], ['31-60', 31, 60], ['61+', 61, 100000]]),
        loans: T('id INTEGER PRIMARY KEY, borrower TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra'], [4, 'Dev']]),
        schedules: T('loan_id INTEGER, due_day TEXT, amount INTEGER', [[1, '2024-06-01', 1000], [2, '2024-05-20', 500], [3, '2024-03-01', 3000], [4, '2024-05-01', 2000]]),
        payments: T('loan_id INTEGER, amount INTEGER', []),
      },
      hidden: [
        { payments: [[3, 3000], [4, 2000]] },
        { schedules: [[1, '2024-06-20', 1000], [2, '2024-06-10', 2000], [3, '2024-06-01', 3000], [4, '2024-06-02', 500]] },
      ],
      s: 'Overdue is measured against 2024-07-01. A loan counts as overdue only while its scheduled amount is still unpaid.',
      k: 'Report the overdue amount in each ageing bucket. Every bucket appears, with 0 when it holds nothing. Order by label.',
      q: "SELECT b.label, COALESCE((SELECT SUM(s.amount) FROM schedules s WHERE CAST(julianday('2024-07-01') - julianday(s.due_day) AS INTEGER) BETWEEN b.min_days AND b.max_days AND COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.loan_id = s.loan_id), 0) < s.amount), 0) AS overdue FROM buckets b ORDER BY b.label",
      wrong: ["SELECT b.label, SUM(s.amount) AS overdue FROM schedules s JOIN buckets b ON CAST(julianday('2024-07-01') - julianday(s.due_day) AS INTEGER) BETWEEN b.min_days AND b.max_days JOIN loans l ON l.id = s.loan_id WHERE COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.loan_id = s.loan_id), 0) < s.amount GROUP BY b.label ORDER BY b.label"],
      h: 'Start from the buckets so the empty ones survive.',
      x: 'Driving the report from the bucket table guarantees a row for each band. A join from the schedules only reports the bands that happen to be occupied.' },

    { t: 'Moderation Items Past Their Target', tg: ['left join', 'per-row threshold', 'joins'],
      tb: ['queues', 'items', 'actions'],
      extra: {
        queues: T('id INTEGER PRIMARY KEY, name TEXT, target_min INTEGER', [[1, 'Images', 60], [2, 'Comments', 60]]),
        items: T('id INTEGER PRIMARY KEY, queue_id INTEGER, created_min INTEGER', [
          [1, 1, 0], [2, 1, 10], [3, 2, 0], [4, 2, 20]]),
        actions: T('item_id INTEGER, at_min INTEGER, decision TEXT', [[1, 30, 'remove'], [3, 200, 'keep']]),
      },
      hidden: [
        { queues: [[1, 'Images', 60], [2, 'Comments', 300]] },
        { actions: [[1, 30, 'remove'], [2, 500, 'keep'], [3, 200, 'keep']] },
      ],
      s: 'Each queue promises to decide within its own number of minutes. An item nobody has touched is measured against the clock at minute 400.',
      k: 'List the items that missed their queue\'s target, with the queue, the item id and the minutes taken. Any order.',
      n: ['For an item with no decision, the minutes taken are 400 minus when it arrived.'],
      q: 'SELECT q.name AS queue, i.id AS item, COALESCE((SELECT MIN(a.at_min) FROM actions a WHERE a.item_id = i.id), 400) - i.created_min AS minutes FROM items i JOIN queues q ON q.id = i.queue_id WHERE COALESCE((SELECT MIN(a.at_min) FROM actions a WHERE a.item_id = i.id), 400) - i.created_min > q.target_min',
      wrong: ['SELECT q.name AS queue, i.id AS item, COALESCE((SELECT MIN(a.at_min) FROM actions a WHERE a.item_id = i.id), 400) - i.created_min AS minutes FROM items i JOIN queues q ON q.id = i.queue_id WHERE COALESCE((SELECT MIN(a.at_min) FROM actions a WHERE a.item_id = i.id), 400) - i.created_min > 60'],
      h: 'The target is a column on the queue.',
      x: 'Comparing against the queue\'s own target keeps working when one queue is given more time than another.' },

    { t: 'Unfair Matches by Skill Gap', tg: ['self join', 'joins', 'threshold'],
      tb: ['matches', 'players', 'participants'],
      extra: {
        matches: T('id INTEGER PRIMARY KEY, mode TEXT, max_gap INTEGER', [[1, 'Ranked', 200], [2, 'Casual', 200]]),
        players: T('id INTEGER PRIMARY KEY, name TEXT, skill INTEGER', [[10, 'Asha', 1500], [11, 'Ben', 1550], [12, 'Chitra', 900], [13, 'Dev', 1800]]),
        participants: T('match_id INTEGER, player_id INTEGER', [[1, 10], [1, 11], [2, 12], [2, 13]]),
      },
      hidden: [
        { matches: [[1, 'Ranked', 200], [2, 'Casual', 1000]] },
        { participants: [[1, 10], [1, 13], [2, 12], [2, 11]] },
      ],
      s: 'Each mode sets the biggest skill gap it will tolerate inside a match.',
      k: 'Find the matches whose two players are further apart in skill than the mode allows. Return the mode, both player names and the gap, in any order.',
      q: 'SELECT m.mode, p1.name AS player_a, p2.name AS player_b, ABS(p1.skill - p2.skill) AS gap FROM participants pa1 JOIN participants pa2 ON pa2.match_id = pa1.match_id AND pa2.player_id > pa1.player_id JOIN players p1 ON p1.id = pa1.player_id JOIN players p2 ON p2.id = pa2.player_id JOIN matches m ON m.id = pa1.match_id WHERE ABS(p1.skill - p2.skill) > m.max_gap',
      wrong: ['SELECT m.mode, p1.name AS player_a, p2.name AS player_b, ABS(p1.skill - p2.skill) AS gap FROM participants pa1 JOIN participants pa2 ON pa2.match_id = pa1.match_id AND pa2.player_id > pa1.player_id JOIN players p1 ON p1.id = pa1.player_id JOIN players p2 ON p2.id = pa2.player_id JOIN matches m ON m.id = pa1.match_id WHERE ABS(p1.skill - p2.skill) > 200'],
      h: 'The tolerance comes from the match.',
      x: 'Reading the limit from the match row keeps a casual game from being judged by the ranked standard.' },

    { t: 'Sample Ratio Mismatch', tg: ['joins', 'share', 'experiments'],
      tb: ['experiments', 'assignments', 'exposures'],
      extra: {
        experiments: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Checkout Redesign']]),
        assignments: T('experiment_id INTEGER, user_id INTEGER, variant TEXT', [
          [1, 1, 'control'], [1, 2, 'control'], [1, 3, 'treatment'], [1, 4, 'treatment']]),
        exposures: T('experiment_id INTEGER, user_id INTEGER, day TEXT', [
          [1, 1, '2024-05-01'], [1, 2, '2024-05-01'], [1, 3, '2024-05-01'], [1, 4, '2024-05-02']]),
      },
      hidden: [
        { exposures: [[1, 1, '2024-05-01'], [1, 1, '2024-05-02'], [1, 2, '2024-05-01'], [1, 3, '2024-05-01'], [1, 4, '2024-05-02']] },
        { exposures: [[1, 1, '2024-05-01'], [1, 2, '2024-05-01'], [1, 3, '2024-05-01']] },
      ],
      s: 'If a variant is assigned half the users but sees a different share of the exposures, the experiment cannot be trusted.',
      k: 'For each variant, report the share of assigned users and the share of exposed users, both rounded to 2 decimals. Any order.',
      n: ['A user exposed twice is one exposed user.'],
      q: 'WITH a AS (SELECT variant, COUNT(*) AS n FROM assignments WHERE experiment_id = 1 GROUP BY variant), e AS (SELECT a2.variant, COUNT(DISTINCT x.user_id) AS n FROM exposures x JOIN assignments a2 ON a2.user_id = x.user_id AND a2.experiment_id = x.experiment_id WHERE x.experiment_id = 1 GROUP BY a2.variant) SELECT a.variant, ROUND(1.0 * a.n / (SELECT SUM(n) FROM a), 2) AS assigned_share, ROUND(1.0 * e.n / (SELECT SUM(n) FROM e), 2) AS exposed_share FROM a JOIN e ON e.variant = a.variant',
      wrong: ['WITH a AS (SELECT variant, COUNT(*) AS n FROM assignments WHERE experiment_id = 1 GROUP BY variant), e AS (SELECT a2.variant, COUNT(*) AS n FROM exposures x JOIN assignments a2 ON a2.user_id = x.user_id AND a2.experiment_id = x.experiment_id WHERE x.experiment_id = 1 GROUP BY a2.variant) SELECT a.variant, ROUND(1.0 * a.n / (SELECT SUM(n) FROM a), 2) AS assigned_share, ROUND(1.0 * e.n / (SELECT SUM(n) FROM e), 2) AS exposed_share FROM a JOIN e ON e.variant = a.variant'],
      h: 'The exposure share is about users, not about exposure rows.',
      x: 'COUNT(DISTINCT user_id) keeps a chatty user from tipping the balance, which is the whole point of the check.' },

    { t: 'Picks per Hour Excluding Breaks', tg: ['joins', 'subquery', 'rate'],
      tb: ['workers', 'shifts', 'breaks', 'picks'],
      extra: {
        workers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben']]),
        shifts: T('id INTEGER PRIMARY KEY, worker_id INTEGER, minutes INTEGER', [[10, 1, 480], [11, 1, 480], [12, 2, 480]]),
        breaks: T('shift_id INTEGER, minutes INTEGER', [[10, 60], [11, 60], [12, 60]]),
        picks: T('id INTEGER PRIMARY KEY, shift_id INTEGER, units INTEGER', [
          [1, 10, 100], [2, 11, 140], [3, 12, 210]]),
      },
      hidden: [
        { breaks: [[10, 60], [10, 30], [11, 60], [12, 60]] },
        { picks: [[1, 10, 100], [2, 10, 50], [3, 11, 140], [4, 12, 210]] },
      ],
      s: 'Breaks come off the paid shift, and a long shift can have more than one.',
      k: 'For each worker, report the units picked per working hour, rounded to 2 decimals. Return the name and units_per_hour in any order.',
      q: 'SELECT w.name, ROUND(1.0 * SUM(COALESCE((SELECT SUM(p.units) FROM picks p WHERE p.shift_id = s.id), 0)) / (SUM(s.minutes - COALESCE((SELECT SUM(b.minutes) FROM breaks b WHERE b.shift_id = s.id), 0)) / 60.0), 2) AS units_per_hour FROM shifts s JOIN workers w ON w.id = s.worker_id GROUP BY w.id, w.name',
      wrong: ['SELECT w.name, ROUND(1.0 * SUM(p.units) / (SUM(s.minutes - b.minutes) / 60.0), 2) AS units_per_hour FROM shifts s JOIN workers w ON w.id = s.worker_id JOIN breaks b ON b.shift_id = s.id JOIN picks p ON p.shift_id = s.id GROUP BY w.id, w.name'],
      h: 'Picks and breaks are two separate totals per shift.',
      x: 'Taking each total in its own subquery stops a second break row or a second pick row from multiplying the other side.' },

    { t: 'Invoices Still Unpaid After Three Attempts', tg: ['having', 'joins', 'not exists'],
      tb: ['customers', 'invoices', 'attempts'],
      extra: {
        customers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        invoices: T('id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER, paid INTEGER', [
          [100, 1, 600, 0], [101, 2, 900, 0], [102, 3, 300, 1]]),
        attempts: T('invoice_id INTEGER, at_day TEXT, result TEXT', [
          [100, '2024-05-01', 'failed'], [100, '2024-05-03', 'failed'], [100, '2024-05-05', 'failed'],
          [101, '2024-05-02', 'failed'],
          [102, '2024-05-01', 'failed'], [102, '2024-05-04', 'succeeded']]),
      },
      hidden: [
        { attempts: [[100, '2024-05-01', 'failed'], [100, '2024-05-03', 'failed'], [101, '2024-05-02', 'failed'], [101, '2024-05-04', 'failed'], [101, '2024-05-06', 'failed'], [102, '2024-05-01', 'failed']] },
        { invoices: [[100, 1, 600, 1], [101, 2, 900, 0], [102, 3, 300, 0]], attempts: [[100, '2024-05-01', 'failed'], [100, '2024-05-03', 'failed'], [100, '2024-05-05', 'failed'], [101, '2024-05-02', 'failed'], [102, '2024-05-01', 'failed'], [102, '2024-05-02', 'failed'], [102, '2024-05-03', 'succeeded']] },
      ],
      s: 'Billing retries a failed charge. After three failures a human steps in.',
      k: 'List the unpaid invoices with at least three failed attempts. Return the customer, the invoice id, the amount and the number of failures, in any order.',
      q: "SELECT c.name, i.id AS invoice, i.amount, COUNT(*) AS failures FROM attempts a JOIN invoices i ON i.id = a.invoice_id JOIN customers c ON c.id = i.customer_id WHERE a.result = 'failed' AND i.paid = 0 GROUP BY i.id, c.name, i.amount HAVING COUNT(*) >= 3",
      wrong: ["SELECT c.name, i.id AS invoice, i.amount, COUNT(*) AS failures FROM attempts a JOIN invoices i ON i.id = a.invoice_id JOIN customers c ON c.id = i.customer_id WHERE i.paid = 0 GROUP BY i.id, c.name, i.amount HAVING COUNT(*) >= 3"],
      h: 'Only failed attempts count towards the three.',
      x: 'Filtering the result before grouping counts failures rather than attempts, so an invoice that finally went through is not escalated.' },

    { t: 'Supplier Lead Time Reliability', tg: ['left join', 'dates', 'rate'],
      tb: ['suppliers', 'purchase_orders', 'receipts'],
      extra: {
        suppliers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Alpha'], [2, 'Beta']]),
        purchase_orders: T('id INTEGER PRIMARY KEY, supplier_id INTEGER, promised_day TEXT', [
          [100, 1, '2024-05-10'], [101, 1, '2024-05-20'], [102, 2, '2024-05-15'], [103, 2, '2024-05-25']]),
        receipts: T('po_id INTEGER, received_day TEXT', [[100, '2024-05-09'], [101, '2024-05-20'], [102, '2024-05-18'], [103, '2024-05-24']]),
      },
      hidden: [
        { receipts: [[100, '2024-05-09'], [101, '2024-05-20'], [103, '2024-05-24']] },
        { receipts: [[100, '2024-05-11'], [101, '2024-05-21'], [102, '2024-05-18'], [103, '2024-05-24']] },
      ],
      s: 'An order that has not arrived yet has no receipt row, and counts as not on time.',
      k: 'For each supplier, report the share of its orders received by the promised day, rounded to 2 decimals. Return the name and on_time in any order.',
      n: ['Arriving exactly on the promised day is on time.'],
      q: 'SELECT s.name, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM receipts r WHERE r.po_id = po.id AND r.received_day <= po.promised_day) THEN 1 ELSE 0 END) / COUNT(*), 2) AS on_time FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id GROUP BY s.id, s.name',
      wrong: ['SELECT s.name, ROUND(1.0 * SUM(CASE WHEN r.received_day <= po.promised_day THEN 1 ELSE 0 END) / COUNT(*), 2) AS on_time FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id JOIN receipts r ON r.po_id = po.id GROUP BY s.id, s.name'],
      h: 'The population is the orders, not the receipts.',
      x: 'Driving from the orders and testing for a receipt in time keeps the orders that never arrived in the denominator, where they belong.' },

    { t: 'Creative Fatigue in the Second Half', tg: ['self join', 'halves', 'rate'],
      tb: ['creatives', 'impressions', 'clicks'],
      extra: {
        creatives: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Blue Banner'], [2, 'Red Banner']]),
        impressions: T('id INTEGER PRIMARY KEY, creative_id INTEGER, half INTEGER', [
          [1, 1, 1], [2, 1, 1], [3, 1, 2], [4, 1, 2], [5, 2, 1], [6, 2, 1], [7, 2, 2], [8, 2, 2]]),
        clicks: T('impression_id INTEGER', [[1], [2], [3], [5], [7], [8]]),
      },
      hidden: [
        { impressions: [[1, 1, 1], [2, 1, 1], [3, 1, 2], [4, 1, 2], [9, 1, 2], [5, 2, 1], [6, 2, 1], [7, 2, 2], [8, 2, 2]], clicks: [[1], [2], [3], [4], [5], [7], [8]] },
        { clicks: [[1], [2], [3], [4], [5], [7]] },
      ],
      s: 'A creative\'s run is split into two halves. Fatigue shows up as a click-through rate that falls in the second half.',
      k: 'Find the creatives whose click-through rate fell from the first half to the second. Return the name and both rates rounded to 2 decimals, in any order.',
      q: 'WITH h AS (SELECT i.creative_id, i.half, COUNT(*) AS imps, SUM(CASE WHEN EXISTS (SELECT 1 FROM clicks c WHERE c.impression_id = i.id) THEN 1 ELSE 0 END) AS clicks FROM impressions i GROUP BY i.creative_id, i.half) SELECT cr.name, ROUND(1.0 * h1.clicks / h1.imps, 2) AS first_half, ROUND(1.0 * h2.clicks / h2.imps, 2) AS second_half FROM h h1 JOIN h h2 ON h2.creative_id = h1.creative_id AND h1.half = 1 AND h2.half = 2 JOIN creatives cr ON cr.id = h1.creative_id WHERE 1.0 * h2.clicks / h2.imps < 1.0 * h1.clicks / h1.imps',
      wrong: ['WITH h AS (SELECT i.creative_id, i.half, COUNT(*) AS imps, SUM(CASE WHEN EXISTS (SELECT 1 FROM clicks c WHERE c.impression_id = i.id) THEN 1 ELSE 0 END) AS clicks FROM impressions i GROUP BY i.creative_id, i.half) SELECT cr.name, ROUND(1.0 * h1.clicks / h1.imps, 2) AS first_half, ROUND(1.0 * h2.clicks / h2.imps, 2) AS second_half FROM h h1 JOIN h h2 ON h2.creative_id = h1.creative_id AND h1.half = 1 AND h2.half = 2 JOIN creatives cr ON cr.id = h1.creative_id WHERE h2.clicks < h1.clicks'],
      h: 'Compare rates, not click counts.',
      x: 'The halves can carry different numbers of impressions, so only the ratio is comparable. Counting clicks agrees while both halves are the same size.' },

    { t: 'Nurse Ratio Breaches', tg: ['joins', 'ratio', 'per-row threshold'],
      tb: ['wards', 'rosters', 'census'],
      extra: {
        wards: T('id INTEGER PRIMARY KEY, name TEXT, max_patients_per_nurse INTEGER', [[1, 'Intensive Care', 2], [2, 'General', 2]]),
        rosters: T('ward_id INTEGER, day TEXT, nurses INTEGER', [
          [1, '2024-06-01', 3], [1, '2024-06-02', 2], [2, '2024-06-01', 2], [2, '2024-06-02', 2]]),
        census: T('ward_id INTEGER, day TEXT, patients INTEGER', [
          [1, '2024-06-01', 6], [1, '2024-06-02', 5], [2, '2024-06-01', 12], [2, '2024-06-02', 11]]),
      },
      hidden: [
        { census: [[1, '2024-06-01', 6], [1, '2024-06-02', 4], [2, '2024-06-01', 12], [2, '2024-06-02', 13]] },
        { wards: [[1, 'Intensive Care', 2], [2, 'General', 6]] },
      ],
      s: 'Each ward has a rule for how many patients one nurse can look after.',
      k: 'List the ward days where the patients per nurse went over the ward\'s rule. Return the ward, the day, patients, nurses and the limit, in any order.',
      q: 'SELECT w.name, c.day, c.patients, r.nurses, w.max_patients_per_nurse AS limit_per_nurse FROM census c JOIN rosters r ON r.ward_id = c.ward_id AND r.day = c.day JOIN wards w ON w.id = c.ward_id WHERE c.patients > r.nurses * w.max_patients_per_nurse',
      wrong: ['SELECT w.name, c.day, c.patients, r.nurses, w.max_patients_per_nurse AS limit_per_nurse FROM census c JOIN rosters r ON r.ward_id = c.ward_id AND r.day = c.day JOIN wards w ON w.id = c.ward_id WHERE c.patients > r.nurses * 2'],
      h: 'The allowed load is the nurses on duty times the ward\'s own figure.',
      x: 'Reading the ratio from the ward row keeps a general ward from being judged by the intensive care rule.' },
  ]);
})();
