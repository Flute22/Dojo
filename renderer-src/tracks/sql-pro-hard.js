// Dojo SQL, interview-grade set: Hard. Onsite-round questions: four or more tables, two or three techniques per
// question, and a trap that a reasonable first answer falls into (double counting, a missing row, a tie, a window).
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('hard', [
    { t: 'Last-Click Attribution Within Seven Days', tg: ['attribution', 'correlated subquery', 'window'],
      tb: ['users', 'campaigns', 'clicks', 'orders', 'refunds'],
      extra: {
        users: T('id INTEGER PRIMARY KEY, country TEXT, is_test INTEGER', [[1, 'IN', 0], [2, 'DE', 0], [3, 'US', 0], [4, 'IN', 1]]),
        campaigns: T('id INTEGER PRIMARY KEY, name TEXT', [[10, 'Search Brand'], [11, 'Search Generic'], [12, 'Display Retarget']]),
        clicks: T('id INTEGER PRIMARY KEY, campaign_id INTEGER, user_id INTEGER, day TEXT', [
          [1, 10, 1, '2024-04-01'], [2, 11, 2, '2024-04-02'], [3, 12, 3, '2024-04-03'], [4, 10, 4, '2024-04-03']]),
        orders: T('id INTEGER PRIMARY KEY, user_id INTEGER, day TEXT, amount INTEGER', [
          [100, 1, '2024-04-05', 1200], [101, 2, '2024-04-04', 800], [102, 3, '2024-04-20', 500], [103, 4, '2024-04-04', 9999]]),
        refunds: T('order_id INTEGER, day TEXT', []),
      },
      hidden: [
        { clicks: [[1, 10, 1, '2024-04-01'], [2, 11, 2, '2024-04-02'], [3, 12, 3, '2024-04-03'], [4, 10, 4, '2024-04-03'], [5, 11, 1, '2024-04-04']] },
        { refunds: [[100, '2024-04-09']] },
      ],
      s: 'A growth team credits a sale to the campaign of the customer\'s most recent click before the sale, as long as that click happened within the previous 7 days. Test accounts never count, and a refunded sale earns no credit.',
      k: 'Return each campaign\'s name, how many sales it earned credit for and the total amount of those sales. Campaigns with no credited sales are left out. Any order.',
      n: ['A click on the same day as the sale does not count: the click must be strictly earlier.', 'Exactly 7 days before the sale is still inside the window.', 'A sale is credited to one campaign only, even when the customer clicked several.'],
      q: "WITH att AS (SELECT o.id AS oid, o.amount, (SELECT c.campaign_id FROM clicks c WHERE c.user_id = o.user_id AND c.day < o.day AND julianday(o.day) - julianday(c.day) <= 7 ORDER BY c.day DESC, c.id DESC LIMIT 1) AS cid FROM orders o JOIN users u ON u.id = o.user_id WHERE u.is_test = 0 AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = o.id)) SELECT ca.name, COUNT(*) AS sales, SUM(a.amount) AS revenue FROM att a JOIN campaigns ca ON ca.id = a.cid GROUP BY ca.name",
      wrong: ["SELECT ca.name, COUNT(DISTINCT o.id) AS sales, SUM(o.amount) AS revenue FROM orders o JOIN users u ON u.id = o.user_id JOIN clicks c ON c.user_id = o.user_id AND c.day < o.day AND julianday(o.day) - julianday(c.day) <= 7 JOIN campaigns ca ON ca.id = c.campaign_id WHERE u.is_test = 0 AND NOT EXISTS (SELECT 1 FROM refunds r WHERE r.order_id = o.id) GROUP BY ca.name"],
      h: 'For each sale, first decide which single click owns it. Then group.',
      x: 'A correlated subquery ordered by day descending picks the one owning click per sale, so each sale is counted once. Joining clicks to sales instead credits every campaign the customer touched, which inflates both the count and the revenue as soon as somebody clicks twice.' },

    { t: 'Devices Shared by a Fraud Ring', tg: ['count distinct', 'joins', 'double counting'],
      tb: ['accounts', 'devices', 'logins', 'txns'],
      extra: {
        accounts: T('id INTEGER PRIMARY KEY, holder TEXT, opened TEXT', [[1, 'Asha', '2024-01-02'], [2, 'Ben', '2024-01-09'], [3, 'Chitra', '2024-02-01'], [4, 'Dev', '2024-02-14'], [5, 'Esha', '2024-03-03']]),
        devices: T('id INTEGER PRIMARY KEY, fingerprint TEXT', [[90, 'fp-aa'], [91, 'fp-bb'], [92, 'fp-cc']]),
        logins: T('account_id INTEGER, device_id INTEGER, day TEXT', [
          [1, 90, '2024-03-01'], [2, 90, '2024-03-02'], [3, 90, '2024-03-03'],
          [4, 91, '2024-03-04'], [5, 91, '2024-03-05'],
          [1, 92, '2024-03-06'], [2, 92, '2024-03-07'], [3, 92, '2024-03-08']]),
        txns: T('id INTEGER PRIMARY KEY, account_id INTEGER, amount INTEGER, flagged INTEGER', [
          [1, 1, 6000, 1], [2, 2, 5000, 1], [3, 3, 2000, 1], [4, 4, 9000, 1], [5, 5, 500, 1], [6, 1, 4000, 0]]),
      },
      hidden: [
        { logins: [[1, 90, '2024-03-01'], [1, 90, '2024-03-02'], [1, 90, '2024-03-09'], [2, 90, '2024-03-02'], [4, 91, '2024-03-04'], [5, 91, '2024-03-05'], [1, 92, '2024-03-06'], [2, 92, '2024-03-07'], [3, 92, '2024-03-08']] },
        { txns: [[1, 1, 3000, 1], [2, 1, 3000, 1], [3, 2, 5000, 1], [4, 3, 300, 1], [5, 3, 200, 1], [6, 4, 9000, 1]] },
      ],
      s: 'A risk team looks for devices that several different accounts sign in from. People sign in repeatedly, and an account can have many flagged transactions.',
      k: 'Find the devices used by at least 3 different accounts whose combined flagged amount, counting each account once, is more than 10000. Return the fingerprint, the number of accounts and that flagged total. Any order.',
      n: ['Signing in twenty times from one device is still one account.', 'Only flagged transactions count towards the amount.'],
      q: 'WITH pair AS (SELECT DISTINCT l.device_id, l.account_id FROM logins l), amt AS (SELECT a.id, COALESCE((SELECT SUM(t.amount) FROM txns t WHERE t.account_id = a.id AND t.flagged = 1), 0) AS flagged FROM accounts a) SELECT d.fingerprint, COUNT(*) AS accounts, SUM(m.flagged) AS flagged_total FROM pair p JOIN devices d ON d.id = p.device_id JOIN amt m ON m.id = p.account_id GROUP BY d.fingerprint HAVING COUNT(*) >= 3 AND SUM(m.flagged) > 10000',
      wrong: ['SELECT d.fingerprint, COUNT(*) AS accounts, SUM(t.amount) AS flagged_total FROM logins l JOIN devices d ON d.id = l.device_id JOIN txns t ON t.account_id = l.account_id AND t.flagged = 1 GROUP BY d.fingerprint HAVING COUNT(*) >= 3 AND SUM(t.amount) > 10000'],
      h: 'Reduce the logins to one row per device and account before you count or add anything.',
      x: 'Each account\'s flagged amount is totalled once, then attached to the distinct device-account pairs. Joining the raw tables multiplies rows: a repeated login or a second flagged transaction inflates both the account count and the total.' },

    { t: 'Departments Short of Cover', tg: ['intervals', 'joins', 'exclusion'],
      tb: ['departments', 'doctors', 'shifts', 'leaves'],
      extra: {
        departments: T('id INTEGER PRIMARY KEY, name TEXT, required_hours INTEGER', [[1, 'Emergency', 16], [2, 'Radiology', 8]]),
        doctors: T('id INTEGER PRIMARY KEY, dept_id INTEGER, name TEXT', [[7, 1, 'Rao'], [8, 1, 'Iyer'], [9, 2, 'Nair']]),
        shifts: T('id INTEGER PRIMARY KEY, doctor_id INTEGER, day TEXT, start_min INTEGER, end_min INTEGER', [
          [1, 7, '2024-06-01', 480, 960], [2, 8, '2024-06-01', 960, 1440], [3, 9, '2024-06-01', 540, 1020],
          [4, 7, '2024-06-02', 480, 840], [5, 8, '2024-06-02', 840, 1200], [6, 9, '2024-06-02', 600, 900]]),
        leaves: T('doctor_id INTEGER, day TEXT', []),
      },
      hidden: [
        { leaves: [[8, '2024-06-01'], [9, '2024-06-02']] },
        { shifts: [[1, 7, '2024-06-01', 480, 960], [2, 8, '2024-06-01', 960, 1200], [3, 9, '2024-06-01', 540, 1020], [4, 7, '2024-06-02', 480, 840], [5, 8, '2024-06-02', 840, 1200], [6, 9, '2024-06-02', 600, 1080]] },
      ],
      s: 'Rosters are planned in advance, and a doctor who later goes on leave for a day does not work the shifts rostered for that day. Shift times are minute counts within the day.',
      k: 'For every department and day where the hours actually covered fall short of the department\'s requirement, return the department name, the day, the covered hours and the required hours. Any order.',
      n: ['Hours are shift minutes divided by 60; shifts of one department never overlap each other.', 'A day where nobody was rostered at all is not reported.'],
      q: 'SELECT dp.name, s.day, SUM(s.end_min - s.start_min) / 60.0 AS covered, dp.required_hours AS required FROM shifts s JOIN doctors d ON d.id = s.doctor_id JOIN departments dp ON dp.id = d.dept_id WHERE NOT EXISTS (SELECT 1 FROM leaves lv WHERE lv.doctor_id = s.doctor_id AND lv.day = s.day) GROUP BY dp.name, s.day, dp.required_hours HAVING SUM(s.end_min - s.start_min) / 60.0 < dp.required_hours',
      wrong: ['SELECT dp.name, s.day, SUM(s.end_min - s.start_min) / 60.0 AS covered, dp.required_hours AS required FROM shifts s JOIN doctors d ON d.id = s.doctor_id JOIN departments dp ON dp.id = d.dept_id GROUP BY dp.name, s.day, dp.required_hours HAVING SUM(s.end_min - s.start_min) / 60.0 < dp.required_hours'],
      h: 'A rostered shift only counts if its doctor is not on leave that same day.',
      x: 'NOT EXISTS removes the shifts cancelled by leave before the hours are added up. Dividing by 60.0 rather than 60 keeps the half hours, which matters right at the requirement boundary.' },

    { t: 'Transit Time in Working Days', tg: ['calendar table', 'joins', 'counting'],
      tb: ['hubs', 'lanes', 'shipments', 'calendar'],
      extra: {
        hubs: T('code TEXT PRIMARY KEY, city TEXT', [['DEL', 'Delhi'], ['BOM', 'Mumbai'], ['BLR', 'Bengaluru']]),
        lanes: T('id INTEGER PRIMARY KEY, from_hub TEXT, to_hub TEXT, sla_days INTEGER', [
          [1, 'DEL', 'BOM', 2], [2, 'BOM', 'BLR', 3], [3, 'DEL', 'BLR', 2]]),
        shipments: T('id INTEGER PRIMARY KEY, lane_id INTEGER, ship_day TEXT, deliver_day TEXT', [
          [900, 1, '2024-09-02', '2024-09-04'], [901, 1, '2024-09-02', '2024-09-05'],
          [902, 2, '2024-09-03', '2024-09-06'], [903, 3, '2024-09-04', '2024-09-05']]),
        calendar: T('day TEXT PRIMARY KEY, is_working INTEGER', [
          ['2024-09-02', 1], ['2024-09-03', 1], ['2024-09-04', 1], ['2024-09-05', 1], ['2024-09-06', 1], ['2024-09-07', 1], ['2024-09-08', 1]]),
      },
      hidden: [
        { calendar: [['2024-09-02', 1], ['2024-09-03', 0], ['2024-09-04', 1], ['2024-09-05', 1], ['2024-09-06', 1], ['2024-09-07', 0], ['2024-09-08', 0]] },
        { shipments: [[900, 1, '2024-09-02', '2024-09-04'], [901, 1, '2024-09-02', '2024-09-05'], [902, 2, '2024-09-03', '2024-09-07'], [903, 3, '2024-09-04', '2024-09-05']] },
      ],
      s: 'Each lane promises a transit time in working days. The calendar table says which days the network actually runs; everything else is a weekend or a holiday.',
      k: 'Find the shipments that took longer than their lane\'s promise. Transit is the number of working days after the shipping day, up to and including the delivery day. Return the shipment id, the lane as "DEL-BOM", the transit and the promise. Any order.',
      n: ['The shipping day itself is not counted.', 'A delivery on a non-working day adds nothing to the count.'],
      q: "SELECT s.id, l.from_hub || '-' || l.to_hub AS lane, (SELECT COUNT(*) FROM calendar c WHERE c.is_working = 1 AND c.day > s.ship_day AND c.day <= s.deliver_day) AS transit, l.sla_days AS sla FROM shipments s JOIN lanes l ON l.id = s.lane_id JOIN hubs h1 ON h1.code = l.from_hub JOIN hubs h2 ON h2.code = l.to_hub WHERE (SELECT COUNT(*) FROM calendar c WHERE c.is_working = 1 AND c.day > s.ship_day AND c.day <= s.deliver_day) > l.sla_days",
      wrong: ["SELECT s.id, l.from_hub || '-' || l.to_hub AS lane, CAST(julianday(s.deliver_day) - julianday(s.ship_day) AS INTEGER) AS transit, l.sla_days AS sla FROM shipments s JOIN lanes l ON l.id = s.lane_id JOIN hubs h1 ON h1.code = l.from_hub JOIN hubs h2 ON h2.code = l.to_hub WHERE julianday(s.deliver_day) - julianday(s.ship_day) > l.sla_days"],
      h: 'Count rows in the calendar between the two dates instead of subtracting them.',
      x: 'Counting working-day rows strictly after the shipping day and up to the delivery day is the definition in the question. Subtracting the dates counts weekends and holidays as transit, so it flags shipments that were never late and misses the ones that were.' },

    { t: 'Upgraded Within Ninety Days', tg: ['self join', 'dates', 'exists'],
      tb: ['customers', 'plans', 'subscriptions', 'invoices'],
      extra: {
        customers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra'], [4, 'Dev']]),
        plans: T('id INTEGER PRIMARY KEY, name TEXT, price INTEGER', [[10, 'Basic', 300], [11, 'Plus', 600], [12, 'Pro', 1200]]),
        subscriptions: T('id INTEGER PRIMARY KEY, customer_id INTEGER, plan_id INTEGER, start_day TEXT, end_day TEXT', [
          [100, 1, 10, '2024-01-01', '2024-03-01'], [101, 1, 11, '2024-03-20', null],
          [102, 2, 11, '2024-01-15', '2024-02-15'], [103, 2, 12, '2024-04-01', null],
          [104, 3, 12, '2024-01-10', '2024-02-10'], [105, 3, 10, '2024-02-20', null],
          [106, 4, 10, '2024-01-05', '2024-01-20'], [107, 4, 11, '2024-06-01', null]]),
        invoices: T('sub_id INTEGER, amount INTEGER, paid INTEGER', [
          [100, 300, 1], [102, 600, 1], [104, 1200, 1], [106, 300, 0]]),
      },
      hidden: [
        { subscriptions: [[100, 1, 10, '2024-01-01', '2024-03-01'], [101, 1, 10, '2024-03-20', null], [102, 2, 11, '2024-01-15', '2024-02-15'], [103, 2, 12, '2024-04-01', null], [104, 3, 12, '2024-01-10', '2024-02-10'], [105, 3, 10, '2024-02-20', null], [106, 4, 10, '2024-01-05', '2024-01-20'], [107, 4, 11, '2024-06-01', null]] },
        { invoices: [[100, 300, 0], [102, 600, 1], [104, 1200, 1], [106, 300, 1]], subscriptions: [[100, 1, 10, '2024-01-01', '2024-03-01'], [101, 1, 11, '2024-03-20', null], [102, 2, 11, '2024-01-15', '2024-02-15'], [103, 2, 12, '2024-04-01', null], [104, 3, 12, '2024-01-10', '2024-02-10'], [105, 3, 10, '2024-02-20', null], [106, 4, 10, '2024-01-05', '2024-01-20'], [107, 4, 11, '2024-03-01', null]] },
      ],
      s: 'Customers cancel and come back. Marketing only counts a win-back when the customer had actually paid for the subscription that ended, and came back on a more expensive plan.',
      k: 'Find every case where a subscription ended, the same customer started another one no more than 90 days later, and the new plan costs strictly more than the old one. The ended subscription must have at least one paid invoice. Return the customer name, the old plan, the new plan and the gap in days. Any order.',
      n: ['A plan at the same price is not an upgrade.', 'Coming back on the same day as the cancellation counts, with a gap of 0.'],
      q: "SELECT c.name, po.name AS old_plan, pn.name AS new_plan, CAST(julianday(s2.start_day) - julianday(s1.end_day) AS INTEGER) AS gap_days FROM subscriptions s1 JOIN subscriptions s2 ON s2.customer_id = s1.customer_id AND s2.id <> s1.id AND s2.start_day >= s1.end_day AND julianday(s2.start_day) - julianday(s1.end_day) <= 90 JOIN plans po ON po.id = s1.plan_id JOIN plans pn ON pn.id = s2.plan_id JOIN customers c ON c.id = s1.customer_id WHERE s1.end_day IS NOT NULL AND pn.price > po.price AND EXISTS (SELECT 1 FROM invoices i WHERE i.sub_id = s1.id AND i.paid = 1)",
      wrong: ["SELECT c.name, po.name AS old_plan, pn.name AS new_plan, CAST(julianday(s2.start_day) - julianday(s1.end_day) AS INTEGER) AS gap_days FROM subscriptions s1 JOIN subscriptions s2 ON s2.customer_id = s1.customer_id AND s2.id <> s1.id AND s2.start_day >= s1.end_day AND julianday(s2.start_day) - julianday(s1.end_day) <= 90 JOIN plans po ON po.id = s1.plan_id JOIN plans pn ON pn.id = s2.plan_id JOIN customers c ON c.id = s1.customer_id WHERE s1.end_day IS NOT NULL AND pn.price >= po.price AND EXISTS (SELECT 1 FROM invoices i WHERE i.sub_id = s1.id AND i.paid = 1)"],
      h: 'Join subscriptions to themselves on the customer, then bring the plan prices in on both sides.',
      x: 'Both plan rows are needed to compare prices, so plans is joined twice. The running subscription has a NULL end day and can only be the new side, which the IS NOT NULL test makes explicit. Strictly more expensive excludes a sideways move at the same price.' },

    { t: 'Cabins Sold Past Capacity', tg: ['joins', 'status filter', 'group by'],
      tb: ['aircraft', 'cabins', 'flights', 'bookings'],
      extra: {
        aircraft: T('id INTEGER PRIMARY KEY, model TEXT', [[1, 'A320'], [2, 'B777']]),
        cabins: T('aircraft_id INTEGER, cabin TEXT, seats INTEGER', [[1, 'Economy', 3], [1, 'Business', 2], [2, 'Economy', 4], [2, 'Business', 1]]),
        flights: T('id INTEGER PRIMARY KEY, code TEXT, aircraft_id INTEGER, day TEXT', [
          [500, 'DJ101', 1, '2024-08-01'], [501, 'DJ202', 2, '2024-08-01'], [502, 'DJ303', 1, '2024-08-02']]),
        bookings: T('id INTEGER PRIMARY KEY, flight_id INTEGER, cabin TEXT, status TEXT', [
          [1, 500, 'Economy', 'booked'], [2, 500, 'Economy', 'booked'], [3, 500, 'Economy', 'booked'], [4, 500, 'Economy', 'booked'],
          [5, 500, 'Business', 'booked'], [6, 501, 'Business', 'booked'], [7, 501, 'Business', 'booked'],
          [8, 502, 'Economy', 'booked'], [9, 502, 'Economy', 'booked']]),
      },
      hidden: [
        { bookings: [[1, 500, 'Economy', 'booked'], [2, 500, 'Economy', 'booked'], [3, 500, 'Economy', 'cancelled'], [4, 500, 'Economy', 'booked'], [5, 500, 'Business', 'booked'], [6, 501, 'Business', 'booked'], [7, 501, 'Business', 'cancelled'], [8, 502, 'Economy', 'booked'], [9, 502, 'Economy', 'booked']] },
        { bookings: [[1, 500, 'Economy', 'booked'], [2, 500, 'Economy', 'booked'], [3, 500, 'Economy', 'booked'], [4, 500, 'Business', 'booked'], [5, 500, 'Business', 'booked'], [6, 500, 'Business', 'booked'], [7, 501, 'Economy', 'booked'], [8, 502, 'Economy', 'booked'], [9, 502, 'Economy', 'booked']] },
      ],
      s: 'Seat capacity depends on the aircraft flying the route, and cancelled bookings free their seat again.',
      k: 'Find every flight and cabin where live bookings are more than the seats available. Return the flight code, the day, the cabin, the number of live bookings and the seats. Any order.',
      n: ['Only bookings with the status "booked" occupy a seat.'],
      q: "SELECT f.code, f.day, b.cabin, COUNT(*) AS booked, cb.seats FROM bookings b JOIN flights f ON f.id = b.flight_id JOIN aircraft ac ON ac.id = f.aircraft_id JOIN cabins cb ON cb.aircraft_id = f.aircraft_id AND cb.cabin = b.cabin WHERE b.status = 'booked' GROUP BY f.code, f.day, b.cabin, cb.seats HAVING COUNT(*) > cb.seats",
      wrong: ["SELECT f.code, f.day, b.cabin, COUNT(*) AS booked, cb.seats FROM bookings b JOIN flights f ON f.id = b.flight_id JOIN aircraft ac ON ac.id = f.aircraft_id JOIN cabins cb ON cb.aircraft_id = f.aircraft_id AND cb.cabin = b.cabin GROUP BY f.code, f.day, b.cabin, cb.seats HAVING COUNT(*) > cb.seats"],
      h: 'The seat count is found by the aircraft of the flight and the cabin of the booking, both at once.',
      x: 'The cabins row is reached through two keys, the aircraft and the cabin name, so the join condition carries both. Counting every booking regardless of status reports flights that are merely busy, not oversold.' },

    { t: 'A/B Test With Contaminated Users', tg: ['experiments', 'having', 'first exposure'],
      tb: ['experiments', 'assignments', 'exposures', 'conversions'],
      extra: {
        experiments: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Checkout Redesign'], [2, 'Search Ranking']]),
        assignments: T('experiment_id INTEGER, user_id INTEGER, variant TEXT', [
          [1, 1, 'control'], [1, 2, 'control'], [1, 3, 'treatment'], [1, 4, 'treatment'], [1, 5, 'treatment'], [2, 1, 'control']]),
        exposures: T('experiment_id INTEGER, user_id INTEGER, day TEXT', [
          [1, 1, '2024-05-01'], [1, 2, '2024-05-02'], [1, 3, '2024-05-01'], [1, 4, '2024-05-03'], [1, 5, '2024-05-04'], [2, 1, '2024-05-01']]),
        conversions: T('user_id INTEGER, day TEXT, value INTEGER', [
          [1, '2024-05-03', 500], [3, '2024-05-02', 700], [4, '2024-05-05', 300], [5, '2024-04-28', 900]]),
      },
      hidden: [
        { assignments: [[1, 1, 'control'], [1, 2, 'control'], [1, 3, 'treatment'], [1, 4, 'treatment'], [1, 5, 'treatment'], [1, 2, 'treatment'], [2, 1, 'control']] },
        { conversions: [[1, '2024-05-03', 500], [3, '2024-05-02', 700], [4, '2024-05-05', 300], [5, '2024-05-04', 900], [2, '2024-05-01', 100]] },
      ],
      s: 'Experiment 1 is being read out. A user only counts once they have been exposed, and a few users were accidentally assigned to both variants by a buggy rollout.',
      k: 'For experiment 1, return each variant, the number of exposed users it can be read on and how many of them converted on or after their first exposure, plus the conversion rate rounded to 2 decimals. Users assigned to more than one variant in this experiment are dropped entirely. Any order.',
      n: ['A conversion before the user\'s first exposure proves nothing and does not count.', 'A user with several conversions still counts once.'],
      q: "WITH clean AS (SELECT user_id, MIN(variant) AS variant FROM assignments WHERE experiment_id = 1 GROUP BY user_id HAVING COUNT(DISTINCT variant) = 1), firstx AS (SELECT user_id, MIN(day) AS d0 FROM exposures WHERE experiment_id = 1 GROUP BY user_id) SELECT c.variant, COUNT(*) AS users, SUM(CASE WHEN EXISTS (SELECT 1 FROM conversions cv WHERE cv.user_id = c.user_id AND cv.day >= f.d0) THEN 1 ELSE 0 END) AS converted, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM conversions cv WHERE cv.user_id = c.user_id AND cv.day >= f.d0) THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM clean c JOIN firstx f ON f.user_id = c.user_id GROUP BY c.variant",
      wrong: ["WITH firstx AS (SELECT user_id, MIN(day) AS d0 FROM exposures WHERE experiment_id = 1 GROUP BY user_id) SELECT a.variant, COUNT(*) AS users, SUM(CASE WHEN EXISTS (SELECT 1 FROM conversions cv WHERE cv.user_id = a.user_id AND cv.day >= f.d0) THEN 1 ELSE 0 END) AS converted, ROUND(1.0 * SUM(CASE WHEN EXISTS (SELECT 1 FROM conversions cv WHERE cv.user_id = a.user_id AND cv.day >= f.d0) THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM assignments a JOIN firstx f ON f.user_id = a.user_id WHERE a.experiment_id = 1 GROUP BY a.variant"],
      h: 'Build the readable population first: one variant per user, exposed at least once.',
      x: 'A HAVING COUNT(DISTINCT variant) = 1 group keeps only cleanly assigned users, and the first exposure per user gives the date a conversion must beat. Reading straight off the assignments table counts a contaminated user in both arms and moves both rates.' },

    { t: 'Imbalance Cost With Missing Readings', tg: ['left join', 'coalesce', 'joins'],
      tb: ['tariffs', 'meters', 'forecasts', 'readings'],
      extra: {
        tariffs: T('id INTEGER PRIMARY KEY, name TEXT, imbalance_price INTEGER', [[1, 'Firm', 4], [2, 'Flexible', 9]]),
        meters: T('id INTEGER PRIMARY KEY, tariff_id INTEGER, site TEXT', [[10, 1, 'Mill Road'], [11, 2, 'Dock Yard'], [12, 1, 'Hill Farm']]),
        forecasts: T('meter_id INTEGER, day TEXT, kwh INTEGER', [
          [10, '2024-02-01', 100], [10, '2024-02-02', 120], [11, '2024-02-01', 80], [11, '2024-02-02', 90], [12, '2024-02-01', 50]]),
        readings: T('meter_id INTEGER, day TEXT, kwh INTEGER', [
          [10, '2024-02-01', 110], [10, '2024-02-02', 100], [11, '2024-02-01', 80], [11, '2024-02-02', 60], [12, '2024-02-01', 55]]),
      },
      hidden: [
        { readings: [[10, '2024-02-01', 110], [10, '2024-02-02', 100], [11, '2024-02-01', 80], [12, '2024-02-01', 55]] },
        { tariffs: [[1, 'Firm', 4], [2, 'Flexible', 2]] },
      ],
      s: 'Each site forecasts its daily consumption. The grid charges for the difference between forecast and actual, at the imbalance price of the site\'s tariff. A meter that failed to report has no reading row at all, and the grid treats that as zero consumption.',
      k: 'Return each site and its total imbalance cost across all forecast days, as the sum over days of the absolute difference in kWh times the tariff price. Any order.',
      n: ['A day with a forecast but no reading is charged on the whole forecast.', 'Days with a reading but no forecast are not part of the report.'],
      q: 'SELECT m.site, SUM(ABS(f.kwh - COALESCE(r.kwh, 0)) * t.imbalance_price) AS cost FROM forecasts f JOIN meters m ON m.id = f.meter_id JOIN tariffs t ON t.id = m.tariff_id LEFT JOIN readings r ON r.meter_id = f.meter_id AND r.day = f.day GROUP BY m.site',
      wrong: ['SELECT m.site, SUM(ABS(f.kwh - r.kwh) * t.imbalance_price) AS cost FROM forecasts f JOIN meters m ON m.id = f.meter_id JOIN tariffs t ON t.id = m.tariff_id JOIN readings r ON r.meter_id = f.meter_id AND r.day = f.day GROUP BY m.site'],
      h: 'The forecast days are the spine of the report; readings may or may not be there.',
      x: 'Driving from forecasts and joining readings on the left keeps the failed days, where COALESCE makes the actual 0 and the whole forecast is charged. An inner join drops exactly the expensive days and understates the bill.' },

    { t: 'Two Weeks of Currency Inflation', tg: ['gaps and islands', 'joins', 'net balance'],
      tb: ['players', 'currency_events', 'items', 'purchases'],
      extra: {
        players: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        currency_events: T('id INTEGER PRIMARY KEY, player_id INTEGER, week INTEGER, kind TEXT, amount INTEGER', [
          [1, 1, 10, 'faucet', 500], [2, 1, 10, 'sink', 100], [3, 1, 11, 'faucet', 400], [4, 1, 11, 'sink', 50],
          [5, 2, 10, 'faucet', 300], [6, 2, 10, 'sink', 400], [7, 2, 11, 'faucet', 600], [8, 2, 11, 'sink', 100],
          [9, 3, 10, 'faucet', 200], [10, 3, 10, 'sink', 100], [11, 3, 12, 'faucet', 900], [12, 3, 12, 'sink', 100]]),
        items: T('id INTEGER PRIMARY KEY, name TEXT, cost INTEGER', [[50, 'Mount', 350], [51, 'Cape', 120]]),
        purchases: T('player_id INTEGER, item_id INTEGER, week INTEGER', []),
      },
      hidden: [
        { purchases: [[1, 50, 11]] },
        { currency_events: [[1, 1, 10, 'faucet', 500], [2, 1, 10, 'sink', 100], [3, 1, 11, 'faucet', 400], [4, 1, 11, 'sink', 50], [5, 2, 10, 'faucet', 300], [6, 2, 10, 'sink', 400], [7, 2, 11, 'faucet', 600], [8, 2, 11, 'sink', 100], [9, 3, 10, 'faucet', 200], [10, 3, 10, 'sink', 100], [11, 3, 11, 'faucet', 900], [12, 3, 11, 'sink', 100]] },
      ],
      s: 'A game\'s economy team watches the currency players hold. Faucets add currency, sinks remove it, and buying an item removes its cost as well.',
      k: 'Find the players whose net currency grew in two consecutive weeks, and return the player name and the first week of the earliest such pair. Any order.',
      n: ['Net growth means faucets minus sinks minus the cost of items bought is strictly positive in that week.', 'Weeks are numbered, and a gap in the numbers breaks the run.'],
      q: 'WITH net AS (SELECT p.id AS pid, w.week, (SELECT COALESCE(SUM(CASE WHEN e.kind = \'faucet\' THEN e.amount ELSE -e.amount END), 0) FROM currency_events e WHERE e.player_id = p.id AND e.week = w.week) - (SELECT COALESCE(SUM(i.cost), 0) FROM purchases pu JOIN items i ON i.id = pu.item_id WHERE pu.player_id = p.id AND pu.week = w.week) AS bal FROM players p JOIN (SELECT DISTINCT week FROM currency_events UNION SELECT DISTINCT week FROM purchases) w) SELECT pl.name, MIN(n1.week) AS first_week FROM net n1 JOIN net n2 ON n2.pid = n1.pid AND n2.week = n1.week + 1 JOIN players pl ON pl.id = n1.pid WHERE n1.bal > 0 AND n2.bal > 0 GROUP BY pl.name',
      wrong: ['WITH net AS (SELECT p.id AS pid, w.week, (SELECT COALESCE(SUM(CASE WHEN e.kind = \'faucet\' THEN e.amount ELSE -e.amount END), 0) FROM currency_events e WHERE e.player_id = p.id AND e.week = w.week) AS bal FROM players p JOIN (SELECT DISTINCT week FROM currency_events UNION SELECT DISTINCT week FROM purchases) w) SELECT pl.name, MIN(n1.week) AS first_week FROM net n1 JOIN net n2 ON n2.pid = n1.pid AND n2.week = n1.week + 1 JOIN players pl ON pl.id = n1.pid WHERE n1.bal > 0 AND n2.bal > 0 GROUP BY pl.name'],
      h: 'Work out one net number per player and week first, then look for a week whose next week is also positive.',
      x: 'Purchases are a sink too, so the per-week balance has to subtract item costs through the items table. Joining the per-week balances to themselves on week + 1 finds consecutive pairs, and MIN picks the earliest run.' },

    { t: 'Enrolled Without the Prerequisite', tg: ['joins', 'not exists', 'dates'],
      tb: ['courses', 'prereqs', 'enrollments', 'completions'],
      extra: {
        courses: T('id INTEGER PRIMARY KEY, code TEXT', [[1, 'CS101'], [2, 'CS201'], [3, 'CS301'], [4, 'MA100']]),
        prereqs: T('course_id INTEGER, requires_id INTEGER', [[2, 1], [3, 2], [3, 4]]),
        enrollments: T('id INTEGER PRIMARY KEY, student TEXT, course_id INTEGER, day TEXT', [
          [900, 'Asha', 2, '2024-08-01'], [901, 'Ben', 3, '2024-08-01'], [902, 'Chitra', 3, '2024-08-05'], [903, 'Dev', 1, '2024-08-02']]),
        completions: T('student TEXT, course_id INTEGER, day TEXT', [
          ['Asha', 1, '2024-05-20'], ['Ben', 2, '2024-06-10'], ['Ben', 4, '2024-06-15'], ['Chitra', 2, '2024-07-01']]),
      },
      hidden: [
        { completions: [['Asha', 1, '2024-05-20'], ['Ben', 2, '2024-06-10'], ['Ben', 4, '2024-08-20'], ['Chitra', 2, '2024-07-01']] },
        { completions: [['Asha', 1, '2024-08-01'], ['Ben', 2, '2024-06-10'], ['Ben', 4, '2024-06-15'], ['Chitra', 2, '2024-07-01'], ['Chitra', 4, '2024-07-02']] },
      ],
      s: 'A course can require several others, and a student must have finished a requirement before the day they enrol.',
      k: 'List every enrolment that broke a prerequisite rule: return the student, the course code and the code of the requirement they had not finished in time. One row per missing requirement, any order.',
      n: ['Finishing a requirement on the enrolment day itself is too late.'],
      q: 'SELECT e.student, c.code AS course, rc.code AS missing FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN prereqs pr ON pr.course_id = e.course_id JOIN courses rc ON rc.id = pr.requires_id WHERE NOT EXISTS (SELECT 1 FROM completions cp WHERE cp.student = e.student AND cp.course_id = pr.requires_id AND cp.day < e.day)',
      wrong: ['SELECT e.student, c.code AS course, rc.code AS missing FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN prereqs pr ON pr.course_id = e.course_id JOIN courses rc ON rc.id = pr.requires_id WHERE NOT EXISTS (SELECT 1 FROM completions cp WHERE cp.student = e.student AND cp.course_id = pr.requires_id)'],
      h: 'Expand each enrolment into one row per requirement, then ask whether that requirement was finished in time.',
      x: 'Joining prereqs gives a row per requirement, and courses is joined twice to name both the course and the requirement. The completion must be strictly earlier than the enrolment, so the date belongs inside the NOT EXISTS.' },
  ]);
})();
