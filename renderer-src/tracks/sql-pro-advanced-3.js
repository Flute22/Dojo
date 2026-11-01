// Dojo SQL, interview-grade set: Advanced, batch 3.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('advanced', [
    { t: 'Buses Bunching at a Stop', tg: ['window', 'lag', 'per-row threshold'],
      tb: ['routes', 'stops', 'arrivals'],
      extra: {
        routes: T('id INTEGER PRIMARY KEY, name TEXT, min_headway INTEGER', [[1, 'Route 7', 5], [2, 'Route 9', 5]]),
        stops: T('id INTEGER PRIMARY KEY, route_id INTEGER, name TEXT', [[10, 1, 'Harbour'], [11, 2, 'Museum']]),
        arrivals: T('id INTEGER PRIMARY KEY, stop_id INTEGER, vehicle TEXT, at_min INTEGER', [
          [1, 10, 'B1', 100], [2, 10, 'B2', 103], [3, 10, 'B3', 120],
          [4, 11, 'B4', 200], [5, 11, 'B5', 204], [6, 11, 'B6', 230]]),
      },
      hidden: [
        { routes: [[1, 'Route 7', 5], [2, 'Route 9', 3]] },
        { arrivals: [[1, 10, 'B1', 100], [2, 10, 'B2', 110], [3, 10, 'B3', 120], [4, 11, 'B4', 200], [5, 11, 'B5', 204], [6, 11, 'B6', 230]] },
      ],
      s: 'Each route publishes the smallest gap it wants between buses at a stop. Two buses arriving closer than that are bunching.',
      k: 'Report every bunching pair: the stop, the two vehicles in arrival order, the gap and the route minimum. Any order.',
      q: 'WITH a AS (SELECT ar.stop_id, ar.vehicle, ar.at_min, LAG(ar.vehicle) OVER (PARTITION BY ar.stop_id ORDER BY ar.at_min) AS prev_vehicle, LAG(ar.at_min) OVER (PARTITION BY ar.stop_id ORDER BY ar.at_min) AS prev_min FROM arrivals ar) SELECT s.name AS stop, a.prev_vehicle AS first_bus, a.vehicle AS second_bus, a.at_min - a.prev_min AS gap, r.min_headway FROM a JOIN stops s ON s.id = a.stop_id JOIN routes r ON r.id = s.route_id WHERE a.prev_min IS NOT NULL AND a.at_min - a.prev_min < r.min_headway',
      wrong: ['WITH a AS (SELECT ar.stop_id, ar.vehicle, ar.at_min, LAG(ar.vehicle) OVER (PARTITION BY ar.stop_id ORDER BY ar.at_min) AS prev_vehicle, LAG(ar.at_min) OVER (PARTITION BY ar.stop_id ORDER BY ar.at_min) AS prev_min FROM arrivals ar) SELECT s.name AS stop, a.prev_vehicle AS first_bus, a.vehicle AS second_bus, a.at_min - a.prev_min AS gap, r.min_headway FROM a JOIN stops s ON s.id = a.stop_id JOIN routes r ON r.id = s.route_id WHERE a.prev_min IS NOT NULL AND a.at_min - a.prev_min < 5'],
      h: 'The minimum gap belongs to the route of the stop.',
      x: 'LAG inside the stop gives the previous arrival, and the threshold has to be read from the route two joins away.' },

    { t: 'Days Present in Each Tax Year', tg: ['intervals', 'clipping', 'cross join'], o: true,
      tb: ['people', 'years', 'trips'],
      extra: {
        people: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben']]),
        years: T('year INTEGER PRIMARY KEY, from_day TEXT, to_day TEXT', [[2024, '2024-01-01', '2024-12-31']]),
        trips: T('id INTEGER PRIMARY KEY, person_id INTEGER, entry_day TEXT, exit_day TEXT', [
          [1, 1, '2024-03-01', '2024-03-10'], [2, 1, '2024-06-01', '2024-06-05'], [3, 2, '2024-05-01', '2024-05-20']]),
      },
      hidden: [
        { trips: [[1, 1, '2023-12-25', '2024-01-05'], [2, 1, '2024-06-01', '2024-06-05'], [3, 2, '2024-12-20', '2025-01-10']] },
        { trips: [[1, 1, '2024-03-01', '2024-03-02'], [2, 2, '2024-05-01', '2024-05-03']] },
      ],
      s: 'A trip can start in one year and end in the next. Only the days inside the year count, and both the entry and the exit day count as present.',
      k: 'For every person and year, report the days present. Order by year, then name.',
      q: "SELECT y.year, p.name, SUM(CAST(julianday(MIN(t.exit_day, y.to_day)) - julianday(MAX(t.entry_day, y.from_day)) AS INTEGER) + 1) AS days FROM trips t JOIN people p ON p.id = t.person_id JOIN years y ON t.entry_day <= y.to_day AND t.exit_day >= y.from_day GROUP BY y.year, p.id, p.name ORDER BY y.year, p.name",
      wrong: ["SELECT y.year, p.name, SUM(CAST(julianday(t.exit_day) - julianday(t.entry_day) AS INTEGER) + 1) AS days FROM trips t JOIN people p ON p.id = t.person_id JOIN years y ON t.entry_day <= y.to_day AND t.exit_day >= y.from_day GROUP BY y.year, p.id, p.name ORDER BY y.year, p.name"],
      h: 'Clip each trip to the year before measuring it.',
      x: 'Taking the later of the two starts and the earlier of the two ends keeps only the part inside the year. Measuring the whole trip credits days spent in another year.' },

    { t: 'Claims Paid by Development Lag', tg: ['cross join', 'cumulative', 'joins'], o: true,
      tb: ['policies', 'claims', 'payments'],
      extra: {
        policies: T('id INTEGER PRIMARY KEY, product TEXT', [[1, 'Motor']]),
        claims: T('id INTEGER PRIMARY KEY, policy_id INTEGER, accident_year INTEGER', [[100, 1, 2023], [101, 1, 2023]]),
        payments: T('claim_id INTEGER, lag_years INTEGER, amount INTEGER', [[100, 0, 500], [101, 0, 300]]),
      },
      hidden: [
        { payments: [[100, 0, 500], [100, 1, 200], [101, 0, 300], [101, 2, 100]] },
        { claims: [[100, 1, 2023], [101, 1, 2024]], payments: [[100, 0, 500], [101, 0, 300], [101, 1, 50]] },
      ],
      s: 'A claim is paid in instalments over the years after the accident. The lag is how many years after the accident year the money went out.',
      k: 'For every accident year and every lag 0, 1 and 2, report the amount paid up to and including that lag. Order by accident_year, then lag_years.',
      n: ['A lag with no payment still reports everything paid so far.'],
      q: 'WITH l(k) AS (VALUES (0), (1), (2)), y AS (SELECT DISTINCT accident_year FROM claims) SELECT y.accident_year, l.k AS lag_years, COALESCE((SELECT SUM(p.amount) FROM payments p JOIN claims c ON c.id = p.claim_id WHERE c.accident_year = y.accident_year AND p.lag_years <= l.k), 0) AS paid_to_date FROM y, l ORDER BY y.accident_year, l.k',
      wrong: ['WITH l(k) AS (VALUES (0), (1), (2)), y AS (SELECT DISTINCT accident_year FROM claims) SELECT y.accident_year, l.k AS lag_years, COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.lag_years <= l.k), 0) AS paid_to_date FROM y, l ORDER BY y.accident_year, l.k'],
      h: 'The figure is cumulative, so reach back over the smaller lags too.',
      x: 'Crossing the accident years with the lags gives a complete triangle, and the subquery adds up everything paid up to that lag.' },

    { t: 'Latency at the 95th Percentile', tg: ['percentile', 'window', 'joins'],
      tb: ['services', 'endpoints', 'calls'],
      extra: {
        services: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'checkout']]),
        endpoints: T('id INTEGER PRIMARY KEY, service_id INTEGER, path TEXT', [[10, 1, '/pay'], [11, 1, '/cart']]),
        calls: T('id INTEGER PRIMARY KEY, endpoint_id INTEGER, ms INTEGER', [
          [1, 10, 10], [2, 10, 20], [3, 10, 30], [4, 10, 40], [5, 10, 50],
          [6, 11, 10], [7, 11, 20], [8, 11, 30], [9, 11, 40], [10, 11, 50]]),
      },
      hidden: [
        { calls: Array.from({ length: 20 }, (_, i) => [i + 1, 10, (i + 1) * 10]).concat([[21, 11, 10], [22, 11, 20], [23, 11, 30], [24, 11, 40], [25, 11, 50]]) },
        { calls: [[1, 10, 5], [2, 10, 5], [3, 10, 5], [4, 10, 5], [5, 10, 5], [6, 11, 70], [7, 11, 80], [8, 11, 90], [9, 11, 100], [10, 11, 110]] },
      ],
      s: 'The 95th percentile is the smallest latency that at least 95% of the calls are at or below.',
      k: 'For every endpoint, report the path and its 95th percentile latency. Any order.',
      q: 'WITH c AS (SELECT endpoint_id, ms, CUME_DIST() OVER (PARTITION BY endpoint_id ORDER BY ms) AS cd FROM calls) SELECT e.path, MIN(c.ms) AS p95 FROM c JOIN endpoints e ON e.id = c.endpoint_id JOIN services s ON s.id = e.service_id WHERE c.cd >= 0.95 GROUP BY e.id, e.path',
      wrong: ['SELECT e.path, MAX(c.ms) AS p95 FROM calls c JOIN endpoints e ON e.id = c.endpoint_id JOIN services s ON s.id = e.service_id GROUP BY e.id, e.path'],
      h: 'CUME_DIST gives the share of calls at or below each latency.',
      x: 'The smallest latency whose cumulative share reaches 95% is the percentile. With five calls the top one is also the 95th percentile, which is why the maximum looks right until a single outlier arrives.' },

    { t: 'Carts Abandoned Then Recovered', tg: ['joins', 'time window', 'not exists'],
      tb: ['users', 'carts', 'events', 'orders'],
      extra: {
        users: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        carts: T('id INTEGER PRIMARY KEY, user_id INTEGER, created_min INTEGER', [[10, 1, 0], [11, 2, 0], [12, 3, 0]]),
        events: T('cart_id INTEGER, kind TEXT, at_min INTEGER', [
          [10, 'add', 10], [10, 'abandon', 20], [11, 'add', 10], [11, 'abandon', 30], [12, 'add', 5]]),
        orders: T('id INTEGER PRIMARY KEY, user_id INTEGER, at_min INTEGER', [[100, 1, 500], [101, 2, 1000]]),
      },
      hidden: [
        { orders: [[100, 1, 500], [101, 2, 3000]] },
        { events: [[10, 'add', 10], [10, 'abandon', 20], [11, 'add', 10], [12, 'add', 5], [12, 'abandon', 40]] },
      ],
      s: 'A cart is abandoned when an abandon event is logged for it. It counts as recovered when the same person orders within 1440 minutes of that event.',
      k: 'Report the abandoned carts that were recovered: the user, the cart, the abandon minute and the order minute. Any order.',
      q: "SELECT u.name, c.id AS cart, e.at_min AS abandoned_at, o.at_min AS ordered_at FROM events e JOIN carts c ON c.id = e.cart_id JOIN users u ON u.id = c.user_id JOIN orders o ON o.user_id = c.user_id AND o.at_min > e.at_min AND o.at_min - e.at_min <= 1440 WHERE e.kind = 'abandon'",
      wrong: ["SELECT u.name, c.id AS cart, e.at_min AS abandoned_at, o.at_min AS ordered_at FROM events e JOIN carts c ON c.id = e.cart_id JOIN users u ON u.id = c.user_id JOIN orders o ON o.user_id = c.user_id AND o.at_min > e.at_min WHERE e.kind = 'abandon'"],
      h: 'The order has to land inside the recovery window.',
      x: 'Without the upper bound an order months later counts as a recovery, which is not what the campaign is measuring.' },

    { t: 'Too Little Rest Between Shifts', tg: ['window', 'lag', 'joins'],
      tb: ['depots', 'drivers', 'shifts'],
      extra: {
        depots: T('id INTEGER PRIMARY KEY, name TEXT, min_rest_min INTEGER', [[1, 'North Depot', 660], [2, 'South Depot', 660]]),
        drivers: T('id INTEGER PRIMARY KEY, depot_id INTEGER, name TEXT', [[10, 1, 'Asha'], [11, 2, 'Ben']]),
        shifts: T('id INTEGER PRIMARY KEY, driver_id INTEGER, start_min INTEGER, end_min INTEGER', [
          [1, 10, 0, 480], [2, 10, 1000, 1400], [3, 11, 0, 480], [4, 11, 1200, 1600]]),
      },
      hidden: [
        { depots: [[1, 'North Depot', 660], [2, 'South Depot', 800]] },
        { shifts: [[1, 10, 0, 480], [2, 10, 1200, 1400], [3, 11, 0, 480], [4, 11, 1200, 1600]] },
      ],
      s: 'A driver must rest for at least their depot\'s minimum between the end of one shift and the start of the next.',
      k: 'Report every breach: the driver, the depot, the rest taken and the minimum required. Any order.',
      q: 'WITH s AS (SELECT sh.driver_id, sh.start_min, LAG(sh.end_min) OVER (PARTITION BY sh.driver_id ORDER BY sh.start_min) AS prev_end FROM shifts sh) SELECT d.name AS driver, dp.name AS depot, s.start_min - s.prev_end AS rest, dp.min_rest_min FROM s JOIN drivers d ON d.id = s.driver_id JOIN depots dp ON dp.id = d.depot_id WHERE s.prev_end IS NOT NULL AND s.start_min - s.prev_end < dp.min_rest_min',
      wrong: ['WITH s AS (SELECT sh.driver_id, sh.start_min, LAG(sh.end_min) OVER (PARTITION BY sh.driver_id ORDER BY sh.start_min) AS prev_end FROM shifts sh) SELECT d.name AS driver, dp.name AS depot, s.start_min - s.prev_end AS rest, dp.min_rest_min FROM s JOIN drivers d ON d.id = s.driver_id JOIN depots dp ON dp.id = d.depot_id WHERE s.prev_end IS NOT NULL AND s.start_min - s.prev_end < 660'],
      h: 'The rest minimum is a column on the depot.',
      x: 'Reading the minimum from the depot keeps the rule right when depots differ, which a hard-coded number cannot.' },

    { t: 'Expected Arrivals Against Capacity', tg: ['joins', 'expected value', 'having'],
      tb: ['hotels', 'rooms', 'bookings', 'segments'],
      extra: {
        hotels: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Harbour Inn'], [2, 'Hill Lodge']]),
        rooms: T('id INTEGER PRIMARY KEY, hotel_id INTEGER', [[10, 1], [11, 1], [12, 2], [13, 2], [14, 2]]),
        segments: T('id INTEGER PRIMARY KEY, name TEXT, cancel_rate REAL', [[1, 'Corporate', 0.0], [2, 'Leisure', 0.0]]),
        bookings: T('id INTEGER PRIMARY KEY, hotel_id INTEGER, segment_id INTEGER, day TEXT', [
          [100, 1, 1, '2024-08-01'], [101, 1, 1, '2024-08-01'], [102, 1, 2, '2024-08-01'],
          [103, 2, 2, '2024-08-01'], [104, 2, 2, '2024-08-01']]),
      },
      hidden: [
        { segments: [[1, 'Corporate', 0.5], [2, 'Leisure', 0.0]] },
        { bookings: [[100, 1, 1, '2024-08-01'], [101, 1, 1, '2024-08-01'], [102, 2, 2, '2024-08-01'], [103, 2, 2, '2024-08-01'], [104, 2, 2, '2024-08-01']] },
      ],
      s: 'Each segment cancels at its own rate, so a booking is only expected to turn up with probability one minus that rate.',
      k: 'Report the hotel days where the expected arrivals are more than the rooms available. Return the hotel, the day, expected rounded to 2 decimals, and rooms. Any order.',
      q: 'SELECT h.name, b.day, ROUND(SUM(1 - s.cancel_rate), 2) AS expected, (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id) AS rooms FROM bookings b JOIN hotels h ON h.id = b.hotel_id JOIN segments s ON s.id = b.segment_id GROUP BY h.id, h.name, b.day HAVING SUM(1 - s.cancel_rate) > (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id)',
      wrong: ['SELECT h.name, b.day, ROUND(COUNT(*), 2) AS expected, (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id) AS rooms FROM bookings b JOIN hotels h ON h.id = b.hotel_id JOIN segments s ON s.id = b.segment_id GROUP BY h.id, h.name, b.day HAVING COUNT(*) > (SELECT COUNT(*) FROM rooms r WHERE r.hotel_id = h.id)'],
      h: 'Each booking contributes its own probability of turning up.',
      x: 'Summing one minus the cancellation rate is the expected number of arrivals. Counting bookings assumes nobody ever cancels, which is only true when every rate is zero.' },

    { t: 'Net Exposure per Netting Set', tg: ['signed sum', 'joins', 'abs'],
      tb: ['counterparties', 'netting_sets', 'trades'],
      extra: {
        counterparties: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Alpha Bank'], [2, 'Beta Fund']]),
        netting_sets: T('id INTEGER PRIMARY KEY, counterparty_id INTEGER, label TEXT', [[10, 1, 'A-1'], [11, 1, 'A-2'], [12, 2, 'B-1']]),
        trades: T('id INTEGER PRIMARY KEY, netting_set_id INTEGER, direction TEXT, value INTEGER', [
          [1, 10, 'receive', 500], [2, 10, 'receive', 300], [3, 11, 'receive', 400], [4, 12, 'receive', 900]]),
      },
      hidden: [
        { trades: [[1, 10, 'receive', 500], [2, 10, 'pay', 300], [3, 11, 'receive', 400], [4, 12, 'pay', 900]] },
        { trades: [[1, 10, 'receive', 500], [2, 10, 'pay', 800], [3, 11, 'pay', 400], [4, 12, 'receive', 900]] },
      ],
      s: 'Inside a netting set, what you owe cancels against what you are owed. Exposure is what is left if it is in your favour, and nothing if it is not.',
      k: 'For each netting set, report the counterparty, the label and the exposure. Any order.',
      q: "SELECT c.name, ns.label, MAX(0, SUM(CASE WHEN t.direction = 'receive' THEN t.value ELSE -t.value END)) AS exposure FROM trades t JOIN netting_sets ns ON ns.id = t.netting_set_id JOIN counterparties c ON c.id = ns.counterparty_id GROUP BY ns.id, c.name, ns.label",
      wrong: ["SELECT c.name, ns.label, SUM(t.value) AS exposure FROM trades t JOIN netting_sets ns ON ns.id = t.netting_set_id JOIN counterparties c ON c.id = ns.counterparty_id GROUP BY ns.id, c.name, ns.label"],
      h: 'Give each trade its sign, then floor the total at zero.',
      x: 'The direction decides the sign, and a set that is net in the other direction has no exposure at all rather than a negative one.' },

    { t: 'Products That Fall Off the Shelf', tg: ['running total', 'window', 'capacity'],
      tb: ['shelves', 'products', 'facings'],
      extra: {
        shelves: T('id INTEGER PRIMARY KEY, label TEXT, width_cm INTEGER', [[1, 'A1', 100], [2, 'A2', 40]]),
        products: T('id INTEGER PRIMARY KEY, name TEXT, width_cm INTEGER', [[10, 'Pen', 20], [11, 'Mug', 30], [12, 'Lamp', 40], [13, 'Rug', 50]]),
        facings: T('shelf_id INTEGER, product_id INTEGER, position INTEGER', [
          [1, 10, 1], [1, 11, 2], [1, 12, 3], [2, 13, 1]]),
      },
      hidden: [
        { facings: [[1, 10, 1], [1, 11, 2], [1, 12, 3], [1, 13, 4], [2, 13, 1]] },
        { shelves: [[1, 'A1', 45], [2, 'A2', 40]] },
      ],
      s: 'Products are placed on a shelf in position order and take their own width. Anything that does not fit in the remaining space falls off.',
      k: 'Report the products that do not fit, with the shelf, the product and the space used before it. Any order.',
      q: 'WITH f AS (SELECT fa.shelf_id, fa.product_id, fa.position, SUM(p.width_cm) OVER (PARTITION BY fa.shelf_id ORDER BY fa.position) - p.width_cm AS used, p.width_cm FROM facings fa JOIN products p ON p.id = fa.product_id) SELECT s.label, p.name, f.used FROM f JOIN shelves s ON s.id = f.shelf_id JOIN products p ON p.id = f.product_id WHERE f.used + f.width_cm > s.width_cm',
      wrong: ['SELECT s.label, p.name, 0 AS used FROM facings fa JOIN shelves s ON s.id = fa.shelf_id JOIN products p ON p.id = fa.product_id WHERE p.width_cm > s.width_cm'],
      h: 'How much of the shelf is already taken when this product is placed?',
      x: 'A running total of the earlier widths is the space already used, so the test is that total plus this width against the shelf. Comparing a single product with the whole shelf misses everything that is squeezed out by the products before it.' },

    { t: 'Machines Overdue for Service', tg: ['left join', 'per-row threshold', 'dates'],
      tb: ['machines', 'schedules', 'maintenance_logs'],
      extra: {
        machines: T('id INTEGER PRIMARY KEY, name TEXT, schedule_id INTEGER', [[1, 'Press A', 1], [2, 'Press B', 1], [3, 'Lathe', 2]]),
        schedules: T('id INTEGER PRIMARY KEY, name TEXT, interval_days INTEGER', [[1, 'Quarterly', 90], [2, 'Monthly', 90]]),
        maintenance_logs: T('machine_id INTEGER, serviced_on TEXT', [
          [1, '2024-05-01'], [2, '2024-01-01'], [3, '2024-04-01']]),
      },
      hidden: [
        { schedules: [[1, 'Quarterly', 90], [2, 'Monthly', 30]] },
        { maintenance_logs: [[1, '2024-05-01'], [2, '2024-01-01']] },
      ],
      s: 'A machine is overdue when the days since its last service exceed its schedule interval, measured against 2024-06-01. A machine that has never been serviced is overdue whatever its schedule says.',
      k: 'Report the overdue machines with the days since their last service, or -1 when there is none. Return the machine, the schedule name and days_since. Any order.',
      q: "SELECT m.name, s.name AS schedule, COALESCE(CAST(julianday('2024-06-01') - julianday((SELECT MAX(l.serviced_on) FROM maintenance_logs l WHERE l.machine_id = m.id)) AS INTEGER), -1) AS days_since FROM machines m JOIN schedules s ON s.id = m.schedule_id WHERE COALESCE(CAST(julianday('2024-06-01') - julianday((SELECT MAX(l.serviced_on) FROM maintenance_logs l WHERE l.machine_id = m.id)) AS INTEGER), 999999) > s.interval_days",
      wrong: ["SELECT m.name, s.name AS schedule, CAST(julianday('2024-06-01') - julianday(MAX(l.serviced_on)) AS INTEGER) AS days_since FROM machines m JOIN schedules s ON s.id = m.schedule_id JOIN maintenance_logs l ON l.machine_id = m.id GROUP BY m.id, m.name, s.name, s.interval_days HAVING CAST(julianday('2024-06-01') - julianday(MAX(l.serviced_on)) AS INTEGER) > s.interval_days"],
      h: 'A machine with no service history has to be reported too.',
      x: 'A correlated subquery with a default lets a machine with no log fall through as overdue, which an inner join silently drops.' },

    { t: 'Letter Grades by Percentile Band', tg: ['percentile', 'bands', 'joins'],
      tb: ['curves', 'students', 'scores'],
      extra: {
        curves: T('grade TEXT PRIMARY KEY, min_pct REAL', [['A', 0.9], ['B', 0.7], ['C', 0.4], ['D', 0.0]]),
        students: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra'], [4, 'Dev'], [5, 'Esha']]),
        scores: T('student_id INTEGER, score INTEGER', [[1, 95], [2, 80], [3, 60], [4, 40], [5, 20]]),
      },
      hidden: [
        { scores: [[1, 95], [2, 95], [3, 60], [4, 40], [5, 20]] },
        { scores: [[1, 50], [2, 50], [3, 50], [4, 50], [5, 90]] },
      ],
      s: 'A grade is decided by where the student sits in the class, not by the raw score. The band is the share of students at or below them.',
      k: 'Report every student with their score, their percentile rounded to 2 decimals and their grade. Any order.',
      n: ['Students with the same score share a percentile and therefore a grade.'],
      q: 'WITH p AS (SELECT s.student_id, s.score, CUME_DIST() OVER (ORDER BY s.score) AS pct FROM scores s) SELECT st.name, p.score, ROUND(p.pct, 2) AS pct, (SELECT c.grade FROM curves c WHERE c.min_pct <= p.pct ORDER BY c.min_pct DESC LIMIT 1) AS grade FROM p JOIN students st ON st.id = p.student_id',
      wrong: ['WITH p AS (SELECT s.student_id, s.score, 1.0 * ROW_NUMBER() OVER (ORDER BY s.score) / (SELECT COUNT(*) FROM scores) AS pct FROM scores s) SELECT st.name, p.score, ROUND(p.pct, 2) AS pct, (SELECT c.grade FROM curves c WHERE c.min_pct <= p.pct ORDER BY c.min_pct DESC LIMIT 1) AS grade FROM p JOIN students st ON st.id = p.student_id'],
      h: 'Which ranking function gives tied scores the same share?',
      x: 'CUME_DIST gives every tied score the same cumulative share, so two students on 95 get the same grade. A row number divided by the count hands one of them a lower band than the other.' },

    { t: 'Longest Row of Free Seats', tg: ['gaps and islands', 'window', 'joins'],
      tb: ['flights', 'seats', 'bookings'],
      extra: {
        flights: T('id INTEGER PRIMARY KEY, code TEXT', [[1, 'DJ101'], [2, 'DJ202']]),
        seats: T('flight_id INTEGER, seat_no INTEGER', [
          [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5]]),
        bookings: T('flight_id INTEGER, seat_no INTEGER', [[1, 4], [1, 5], [2, 1], [2, 2]]),
      },
      hidden: [
        { bookings: [[1, 2], [2, 1]] },
        { bookings: [[1, 1], [1, 3], [1, 5], [2, 3]] },
      ],
      s: 'A family wants seats next to each other, so the gaps in the seat map matter.',
      k: 'For each flight, report the longest run of consecutive free seat numbers. Return the code and longest_free. Any order.',
      q: 'WITH f AS (SELECT s.flight_id, s.seat_no FROM seats s WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = s.flight_id AND b.seat_no = s.seat_no)), g AS (SELECT flight_id, seat_no, seat_no - ROW_NUMBER() OVER (PARTITION BY flight_id ORDER BY seat_no) AS grp FROM f), r AS (SELECT flight_id, grp, COUNT(*) AS len FROM g GROUP BY flight_id, grp) SELECT fl.code, MAX(r.len) AS longest_free FROM r JOIN flights fl ON fl.id = r.flight_id GROUP BY fl.id, fl.code',
      wrong: ['SELECT fl.code, COUNT(*) AS longest_free FROM seats s JOIN flights fl ON fl.id = s.flight_id WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id = s.flight_id AND b.seat_no = s.seat_no) GROUP BY fl.id, fl.code'],
      h: 'Seat number minus row number stays constant inside a run of free seats.',
      x: 'Grouping the free seats by that difference measures each run, and the longest one is the answer. Counting free seats ignores whether they are together.' },

    { t: 'Intervals Where Demand Beats Staffing', tg: ['joins', 'ratio', 'threshold'],
      tb: ['intervals', 'calls', 'staffing'],
      extra: {
        intervals: T('id INTEGER PRIMARY KEY, label TEXT, minutes INTEGER', [[1, '09:00', 30], [2, '09:30', 30], [3, '10:00', 30]]),
        calls: T('interval_id INTEGER, handled_min INTEGER', [
          [1, 10], [1, 10], [1, 10], [2, 10], [2, 10], [3, 10], [3, 10], [3, 10], [3, 10]]),
        staffing: T('interval_id INTEGER, agents INTEGER', [[1, 1], [2, 1], [3, 1]]),
      },
      hidden: [
        { staffing: [[1, 1], [2, 1], [3, 2]] },
        { calls: [[1, 10], [1, 10], [2, 10], [2, 10], [2, 10], [3, 10], [3, 10]] },
      ],
      s: 'The work offered in an interval is the handling minutes of its calls. The capacity is the agents on duty times the minutes in the interval.',
      k: 'Report the intervals where the offered work exceeds the capacity. Return the label, offered and capacity. Any order.',
      q: 'SELECT i.label, SUM(c.handled_min) AS offered, s.agents * i.minutes AS capacity FROM calls c JOIN intervals i ON i.id = c.interval_id JOIN staffing s ON s.interval_id = i.id GROUP BY i.id, i.label, s.agents, i.minutes HAVING SUM(c.handled_min) > s.agents * i.minutes',
      wrong: ['SELECT i.label, SUM(c.handled_min) AS offered, s.agents * i.minutes AS capacity FROM calls c JOIN intervals i ON i.id = c.interval_id JOIN staffing s ON s.interval_id = i.id GROUP BY i.id, i.label, s.agents, i.minutes HAVING SUM(c.handled_min) > i.minutes'],
      h: 'Capacity grows with the number of agents.',
      x: 'Multiplying the interval length by the agents on duty is the capacity; comparing against the bare interval length assumes a single agent.' },

    { t: 'Leaky Water Meters', tg: ['gaps and islands', 'window', 'min'],
      tb: ['sites', 'meters', 'night_readings'],
      extra: {
        sites: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Mill Road'], [2, 'Dock Yard']]),
        meters: T('id INTEGER PRIMARY KEY, site_id INTEGER, label TEXT', [[10, 1, 'M-1'], [11, 2, 'M-2']]),
        night_readings: T('meter_id INTEGER, night INTEGER, litres INTEGER', [
          [10, 1, 5], [10, 2, 6], [10, 3, 7], [10, 4, 0],
          [11, 1, 0], [11, 2, 4], [11, 3, 0], [11, 4, 3]]),
      },
      hidden: [
        { night_readings: [[10, 1, 5], [10, 2, 0], [10, 3, 7], [10, 4, 8], [11, 1, 0], [11, 2, 4], [11, 3, 0], [11, 4, 3]] },
        { night_readings: [[10, 1, 5], [10, 2, 6], [10, 3, 7], [10, 4, 8], [11, 1, 2], [11, 2, 4], [11, 3, 6], [11, 4, 3]] },
      ],
      s: 'At night a healthy meter should read zero. Three nights in a row above zero means a leak.',
      k: 'Report the meters with a leak: the site, the meter and the length of the longest run of nights above zero. Any order.',
      q: 'WITH f AS (SELECT meter_id, night FROM night_readings WHERE litres > 0), g AS (SELECT meter_id, night, night - ROW_NUMBER() OVER (PARTITION BY meter_id ORDER BY night) AS grp FROM f), r AS (SELECT meter_id, grp, COUNT(*) AS len FROM g GROUP BY meter_id, grp), m AS (SELECT meter_id, MAX(len) AS longest FROM r GROUP BY meter_id) SELECT s.name AS site, me.label, m.longest FROM m JOIN meters me ON me.id = m.meter_id JOIN sites s ON s.id = me.site_id WHERE m.longest >= 3',
      wrong: ['WITH c AS (SELECT meter_id, COUNT(*) AS nights FROM night_readings WHERE litres > 0 GROUP BY meter_id) SELECT s.name AS site, me.label, c.nights AS longest FROM c JOIN meters me ON me.id = c.meter_id JOIN sites s ON s.id = me.site_id WHERE c.nights >= 3'],
      h: 'The nights have to be consecutive.',
      x: 'Night minus row number labels each run of wet nights, so the longest run can be measured. Counting wet nights overall flags a meter that was wet on three scattered nights.' },

    { t: 'Holdings That Drifted Too Far', tg: ['joins', 'share', 'tolerance'],
      tb: ['portfolios', 'targets', 'holdings', 'prices'],
      extra: {
        portfolios: T('id INTEGER PRIMARY KEY, name TEXT, tolerance REAL', [[1, 'Balanced', 0.05], [2, 'Growth', 0.05]]),
        targets: T('portfolio_id INTEGER, asset TEXT, target_weight REAL', [
          [1, 'EQ', 0.5], [1, 'BD', 0.5], [2, 'EQ', 0.8], [2, 'BD', 0.2]]),
        holdings: T('portfolio_id INTEGER, asset TEXT, units INTEGER', [
          [1, 'EQ', 60], [1, 'BD', 40], [2, 'EQ', 80], [2, 'BD', 20]]),
        prices: T('asset TEXT PRIMARY KEY, price INTEGER', [['EQ', 1], ['BD', 1]]),
      },
      hidden: [
        { prices: [['EQ', 3], ['BD', 1]] },
        { portfolios: [[1, 'Balanced', 0.05], [2, 'Growth', 0.3]], prices: [['EQ', 2], ['BD', 1]] },
      ],
      s: 'A holding\'s weight is its market value divided by the value of the whole portfolio. A portfolio is rebalanced when a weight moves further from its target than the portfolio tolerates.',
      k: 'Report the holdings that drifted too far: the portfolio, the asset, the actual weight rounded to 2 decimals and the target. Any order.',
      q: 'WITH v AS (SELECT h.portfolio_id, h.asset, h.units * p.price AS value FROM holdings h JOIN prices p ON p.asset = h.asset), w AS (SELECT portfolio_id, asset, 1.0 * value / SUM(value) OVER (PARTITION BY portfolio_id) AS weight FROM v) SELECT pf.name, w.asset, ROUND(w.weight, 2) AS weight, t.target_weight FROM w JOIN targets t ON t.portfolio_id = w.portfolio_id AND t.asset = w.asset JOIN portfolios pf ON pf.id = w.portfolio_id WHERE ABS(w.weight - t.target_weight) > pf.tolerance',
      wrong: ['WITH v AS (SELECT h.portfolio_id, h.asset, h.units AS value FROM holdings h JOIN prices p ON p.asset = h.asset), w AS (SELECT portfolio_id, asset, 1.0 * value / SUM(value) OVER (PARTITION BY portfolio_id) AS weight FROM v) SELECT pf.name, w.asset, ROUND(w.weight, 2) AS weight, t.target_weight FROM w JOIN targets t ON t.portfolio_id = w.portfolio_id AND t.asset = w.asset JOIN portfolios pf ON pf.id = w.portfolio_id WHERE ABS(w.weight - t.target_weight) > pf.tolerance'],
      h: 'A weight is about value, which is units times price.',
      x: 'Units alone are only a weight when every asset costs the same, which is exactly the case the example happens to be in.' },

    { t: 'How Alike Are Two Viewers', tg: ['set similarity', 'joins', 'distinct'],
      tb: ['users', 'items', 'watches'],
      extra: {
        users: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        items: T('id INTEGER PRIMARY KEY, title TEXT', [[10, 'Comet'], [11, 'Dunes'], [12, 'Harbour']]),
        watches: T('user_id INTEGER, item_id INTEGER', [[1, 10], [1, 11], [2, 10], [2, 11], [3, 12]]),
      },
      hidden: [
        { watches: [[1, 10], [1, 11], [2, 10], [2, 12], [3, 12]] },
        { watches: [[1, 10], [1, 10], [1, 11], [2, 10], [2, 11], [2, 11], [3, 12]] },
      ],
      s: 'Two viewers are alike when they have watched the same things. The measure is the number of titles both watched divided by the number of titles either watched.',
      k: 'For every pair of users with the smaller id first, report both names and the similarity rounded to 2 decimals. Any order.',
      n: ['Watching the same title twice does not make it count twice.'],
      q: 'WITH w AS (SELECT DISTINCT user_id, item_id FROM watches) SELECT ua.name AS user_a, ub.name AS user_b, ROUND(1.0 * (SELECT COUNT(*) FROM w x JOIN w y ON y.item_id = x.item_id WHERE x.user_id = ua.id AND y.user_id = ub.id) / (SELECT COUNT(DISTINCT item_id) FROM w z WHERE z.user_id IN (ua.id, ub.id)), 2) AS similarity FROM users ua JOIN users ub ON ub.id > ua.id',
      wrong: ['SELECT ua.name AS user_a, ub.name AS user_b, ROUND(1.0 * (SELECT COUNT(*) FROM watches x JOIN watches y ON y.item_id = x.item_id WHERE x.user_id = ua.id AND y.user_id = ub.id) / (SELECT COUNT(DISTINCT item_id) FROM watches z WHERE z.user_id IN (ua.id, ub.id)), 2) AS similarity FROM users ua JOIN users ub ON ub.id > ua.id'],
      h: 'Reduce the log to one row per user and title before counting anything.',
      x: 'The overlap is a count of titles, so repeated views have to be collapsed first or they multiply the numerator.' },

    { t: 'Cheapest Way to Fill the Demand', tg: ['allocation', 'running total', 'window'],
      tb: ['parts', 'suppliers', 'offers', 'demand'],
      extra: {
        parts: T('id INTEGER PRIMARY KEY, sku TEXT', [[1, 'BOLT-01']]),
        suppliers: T('id INTEGER PRIMARY KEY, name TEXT', [[10, 'Alpha'], [11, 'Beta'], [12, 'Gamma']]),
        offers: T('part_id INTEGER, supplier_id INTEGER, price INTEGER, capacity INTEGER', [
          [1, 10, 4, 100], [1, 11, 5, 100], [1, 12, 6, 100]]),
        demand: T('part_id INTEGER, units INTEGER', [[1, 300]]),
      },
      hidden: [
        { demand: [[1, 150]] },
        { offers: [[1, 10, 9, 50], [1, 11, 4, 100], [1, 12, 7, 150]], demand: [[1, 200]] },
      ],
      s: 'A buyer fills the demand from the cheapest offers first, taking as much as each supplier can provide before moving on.',
      k: 'Report what is bought from each supplier that is used: the supplier, the price, the units taken and the cost. Any order.',
      n: ['No two offers for a part share a price.'],
      q: 'WITH o AS (SELECT o.supplier_id, o.price, o.capacity, SUM(o.capacity) OVER (PARTITION BY o.part_id ORDER BY o.price) - o.capacity AS before, d.units FROM offers o JOIN demand d ON d.part_id = o.part_id) SELECT s.name, o.price, MIN(o.capacity, MAX(0, o.units - o.before)) AS taken, MIN(o.capacity, MAX(0, o.units - o.before)) * o.price AS cost FROM o JOIN suppliers s ON s.id = o.supplier_id WHERE MIN(o.capacity, MAX(0, o.units - o.before)) > 0',
      wrong: ['WITH o AS (SELECT o.supplier_id, o.price, o.capacity, d.units, SUM(o.capacity) OVER (PARTITION BY o.part_id) AS total FROM offers o JOIN demand d ON d.part_id = o.part_id) SELECT s.name, o.price, CAST(1.0 * o.units * o.capacity / o.total AS INTEGER) AS taken, CAST(1.0 * o.units * o.capacity / o.total AS INTEGER) * o.price AS cost FROM o JOIN suppliers s ON s.id = o.supplier_id WHERE CAST(1.0 * o.units * o.capacity / o.total AS INTEGER) > 0'],
      h: 'How much demand is left when this offer\'s turn comes? A running total of the cheaper offers answers that.',
      x: 'Ordering the offers by price and running a total gives each one the demand still unfilled, so it supplies the smaller of that and its capacity. Splitting the demand in proportion to capacity ignores the prices entirely, and only matches when every price is the same.' },

    { t: 'Energy Cost of Lift Journeys', tg: ['joins', 'per-row rate', 'abs'],
      tb: ['buildings', 'lifts', 'trips'],
      extra: {
        buildings: T('id INTEGER PRIMARY KEY, name TEXT, kwh_per_floor REAL', [[1, 'Tower A', 0.5], [2, 'Tower B', 0.5]]),
        lifts: T('id INTEGER PRIMARY KEY, building_id INTEGER, label TEXT', [[10, 1, 'L1'], [11, 2, 'L2']]),
        trips: T('id INTEGER PRIMARY KEY, lift_id INTEGER, from_floor INTEGER, to_floor INTEGER', [
          [1, 10, 1, 5], [2, 10, 5, 8], [3, 11, 3, 8], [4, 11, 8, 10]]),
      },
      hidden: [
        { buildings: [[1, 'Tower A', 0.5], [2, 'Tower B', 1.5]] },
        { trips: [[1, 10, 1, 5], [2, 10, 5, 2], [3, 11, 3, 8], [4, 11, 8, 1]] },
      ],
      s: 'A lift uses energy for every floor it travels, up or down, at the rate published by its building.',
      k: 'For every lift, report the building, the lift, the floors travelled and the energy used rounded to 2 decimals. Any order.',
      q: 'SELECT b.name AS building, l.label, SUM(ABS(t.to_floor - t.from_floor)) AS floors, ROUND(SUM(ABS(t.to_floor - t.from_floor)) * b.kwh_per_floor, 2) AS kwh FROM trips t JOIN lifts l ON l.id = t.lift_id JOIN buildings b ON b.id = l.building_id GROUP BY l.id, b.name, l.label, b.kwh_per_floor',
      wrong: ['SELECT b.name AS building, l.label, SUM(t.to_floor - t.from_floor) AS floors, ROUND(SUM(t.to_floor - t.from_floor) * b.kwh_per_floor, 2) AS kwh FROM trips t JOIN lifts l ON l.id = t.lift_id JOIN buildings b ON b.id = l.building_id GROUP BY l.id, b.name, l.label, b.kwh_per_floor'],
      h: 'Going down costs energy too.',
      x: 'The absolute difference counts the floors travelled in either direction; a signed difference lets a descent cancel out a climb.' },

    { t: 'Orders Waiting on One Missing Part', tg: ['having', 'left join', 'joins'],
      tb: ['orders', 'parts', 'order_parts', 'stock'],
      extra: {
        orders: T('id INTEGER PRIMARY KEY, customer TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        parts: T('id INTEGER PRIMARY KEY, sku TEXT', [[10, 'BOLT'], [11, 'NUT'], [12, 'WASHER']]),
        order_parts: T('order_id INTEGER, part_id INTEGER, qty INTEGER', [
          [1, 10, 5], [1, 11, 5], [2, 10, 5], [2, 12, 5], [3, 11, 5]]),
        stock: T('part_id INTEGER, on_hand INTEGER', [[10, 100], [11, 1], [12, 100]]),
      },
      hidden: [
        { stock: [[10, 100], [11, 1]] },
        { stock: [[10, 1], [11, 1], [12, 100]] },
      ],
      s: 'An order can only be built when every part it needs is in stock in the quantity it asks for. A part with no stock row has none.',
      k: 'Report the orders held up by exactly one part, with the customer and the missing sku. Any order.',
      q: 'WITH m AS (SELECT op.order_id, op.part_id FROM order_parts op LEFT JOIN stock s ON s.part_id = op.part_id WHERE COALESCE(s.on_hand, 0) < op.qty) SELECT o.customer, p.sku AS missing FROM m JOIN orders o ON o.id = m.order_id JOIN parts p ON p.id = m.part_id WHERE (SELECT COUNT(*) FROM m m2 WHERE m2.order_id = m.order_id) = 1',
      wrong: ['WITH m AS (SELECT op.order_id, op.part_id FROM order_parts op JOIN stock s ON s.part_id = op.part_id WHERE s.on_hand < op.qty) SELECT o.customer, p.sku AS missing FROM m JOIN orders o ON o.id = m.order_id JOIN parts p ON p.id = m.part_id WHERE (SELECT COUNT(*) FROM m m2 WHERE m2.order_id = m.order_id) = 1'],
      h: 'A part with no stock row is missing too.',
      x: 'The left join with a zero default treats an unstocked part as short, which an inner join hides. The count then keeps only the orders one part away from being built.' },

    { t: 'Repeat Donors Who Increased Their Gift', tg: ['window', 'lag', 'joins'],
      tb: ['campaigns', 'donors', 'donations'],
      extra: {
        campaigns: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Spring Appeal'], [2, 'Winter Appeal']]),
        donors: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        donations: T('id INTEGER PRIMARY KEY, donor_id INTEGER, campaign_id INTEGER, seq INTEGER, amount INTEGER', [
          [1, 1, 1, 1, 100], [2, 1, 1, 2, 200], [3, 2, 1, 1, 300], [4, 2, 1, 2, 200], [5, 3, 2, 1, 50], [6, 3, 2, 2, 150]]),
      },
      hidden: [
        { donations: [[1, 1, 1, 1, 100], [2, 1, 2, 2, 200], [3, 2, 1, 1, 300], [4, 2, 1, 2, 200], [5, 3, 2, 1, 50], [6, 3, 2, 2, 150]] },
        { donations: [[1, 1, 1, 1, 100], [2, 1, 1, 2, 90], [3, 2, 1, 1, 300], [4, 2, 1, 2, 400], [5, 3, 2, 1, 50], [6, 3, 2, 2, 150]] },
      ],
      s: 'Donors give more than once within a campaign. Fundraising wants the people whose gift grew from one donation to the next inside the same campaign.',
      k: 'Report every increase: the donor, the campaign, the previous amount and the new one. Any order.',
      n: ['An increase across two different campaigns does not count.'],
      q: 'WITH d AS (SELECT dn.donor_id, dn.campaign_id, dn.seq, dn.amount, LAG(dn.amount) OVER (PARTITION BY dn.donor_id, dn.campaign_id ORDER BY dn.seq) AS prev FROM donations dn) SELECT do.name AS donor, c.name AS campaign, d.prev, d.amount FROM d JOIN donors do ON do.id = d.donor_id JOIN campaigns c ON c.id = d.campaign_id WHERE d.prev IS NOT NULL AND d.amount > d.prev',
      wrong: ['WITH d AS (SELECT dn.donor_id, dn.campaign_id, dn.seq, dn.amount, LAG(dn.amount) OVER (PARTITION BY dn.donor_id ORDER BY dn.campaign_id, dn.seq) AS prev FROM donations dn) SELECT do.name AS donor, c.name AS campaign, d.prev, d.amount FROM d JOIN donors do ON do.id = d.donor_id JOIN campaigns c ON c.id = d.campaign_id WHERE d.prev IS NOT NULL AND d.amount > d.prev'],
      h: 'The comparison lives inside one campaign, so the campaign belongs in the partition.',
      x: 'Partitioning by donor and campaign keeps a gift in one appeal from being compared with a gift in another.' },
  ]);
})();
