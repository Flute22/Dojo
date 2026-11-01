// Dojo SQL, interview-grade set: Advanced. Whiteboard puzzles: recursion, sweep lines, FIFO allocation, interval
// merging, multi-level tie-breaks. Expect 30 minutes or more each, across four or more tables.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('advanced', [
    { t: 'Explode a Bill of Materials', tg: ['recursive cte', 'multiply along a path', 'left join'],
      tb: ['products', 'bom', 'inventory', 'suppliers', 'build_orders'],
      extra: {
        products: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Bike'], [2, 'Frame'], [3, 'Wheel'], [4, 'Tube'], [5, 'Steel'], [6, 'Spoke']]),
        bom: T('parent_id INTEGER, child_id INTEGER, qty INTEGER', [[1, 2, 1], [1, 3, 1], [2, 5, 1], [3, 4, 1], [3, 6, 1]]),
        inventory: T('product_id INTEGER, on_hand INTEGER', [[4, 1], [5, 0], [6, 2]]),
        suppliers: T('product_id INTEGER, name TEXT, lead_days INTEGER', [[4, 'Alpha', 5], [4, 'Beta', 9], [5, 'Gamma', 3], [6, 'Delta', 7]]),
        build_orders: T('product_id INTEGER, qty INTEGER', [[1, 1]]),
      },
      hidden: [
        { bom: [[1, 2, 1], [1, 3, 2], [2, 5, 3], [3, 4, 1], [3, 6, 2]] },
        { build_orders: [[1, 2]] },
      ],
      s: 'A product is built from sub-assemblies, which are built from other parts, down to the parts that are bought in. A part with no children of its own is bought in. Each row of the bill of materials says how many of the child go into one of the parent.',
      k: 'For every build order, work out each bought-in part it needs: return the product being built, the part, the gross units needed, how many must be bought after using what is on hand, and the longest supplier lead time for that part. Any order.',
      n: ['Quantities multiply down the tree: 2 wheels with 2 spokes each need 4 spokes.', 'A part with no inventory row has none on hand, and a part with more on hand than needed needs 0 bought.'],
      q: "WITH RECURSIVE ex(root, pid, q) AS (SELECT bo.product_id, bo.product_id, bo.qty FROM build_orders bo UNION ALL SELECT e.root, b.child_id, e.q * b.qty FROM ex e JOIN bom b ON b.parent_id = e.pid), gross AS (SELECT e.root, e.pid, SUM(e.q) AS need FROM ex e WHERE NOT EXISTS (SELECT 1 FROM bom b2 WHERE b2.parent_id = e.pid) GROUP BY e.root, e.pid) SELECT pr.name AS build, rp.name AS part, g.need AS gross_need, MAX(0, g.need - COALESCE(i.on_hand, 0)) AS to_buy, (SELECT MAX(s.lead_days) FROM suppliers s WHERE s.product_id = g.pid) AS lead_days FROM gross g JOIN products pr ON pr.id = g.root JOIN products rp ON rp.id = g.pid LEFT JOIN inventory i ON i.product_id = g.pid",
      wrong: ["WITH RECURSIVE ex(root, pid, q) AS (SELECT bo.product_id, bo.product_id, bo.qty FROM build_orders bo UNION ALL SELECT e.root, b.child_id, b.qty FROM ex e JOIN bom b ON b.parent_id = e.pid), gross AS (SELECT e.root, e.pid, SUM(e.q) AS need FROM ex e WHERE NOT EXISTS (SELECT 1 FROM bom b2 WHERE b2.parent_id = e.pid) GROUP BY e.root, e.pid) SELECT pr.name AS build, rp.name AS part, g.need AS gross_need, MAX(0, g.need - COALESCE(i.on_hand, 0)) AS to_buy, (SELECT MAX(s.lead_days) FROM suppliers s WHERE s.product_id = g.pid) AS lead_days FROM gross g JOIN products pr ON pr.id = g.root JOIN products rp ON rp.id = g.pid LEFT JOIN inventory i ON i.product_id = g.pid"],
      h: 'Carry the running quantity down the recursion and multiply it by each child quantity on the way.',
      x: 'The recursion walks from the build order down the tree, multiplying the quantity needed so far by the quantity on each edge, so a part reached through two different sub-assemblies is added up by the final GROUP BY. Carrying the edge quantity alone loses every multiplier above it, which only looks right when every quantity happens to be 1.' },

    { t: 'Fewest Hops to a Flagged Account', tg: ['recursive cte', 'graph', 'time ordering', 'cycle guard'],
      tb: ['banks', 'accounts', 'transfers', 'flags'],
      extra: {
        banks: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Northbank'], [2, 'Seabank']]),
        accounts: T('id INTEGER PRIMARY KEY, bank_id INTEGER, holder TEXT', [[1, 1, 'Asha'], [2, 1, 'Ben'], [3, 2, 'Chitra'], [4, 2, 'Dev'], [5, 1, 'Esha']]),
        transfers: T('id INTEGER PRIMARY KEY, src INTEGER, dst INTEGER, day INTEGER, amount INTEGER', [
          [1, 1, 2, 1, 5000], [2, 2, 3, 2, 4000], [3, 3, 4, 3, 3500], [4, 1, 5, 1, 2000], [5, 5, 4, 4, 1800]]),
        flags: T('account_id INTEGER, reason TEXT', [[4, 'sanctions list']]),
      },
      hidden: [
        { transfers: [[1, 1, 2, 1, 5000], [2, 2, 3, 2, 4000], [3, 3, 4, 3, 3500], [4, 1, 5, 5, 2000], [5, 5, 4, 2, 1800]] },
        { flags: [[3, 'sanctions list']] },
      ],
      s: 'Money moves between accounts on numbered days. A chain of transfers only makes sense if each transfer happens strictly after the one that fed it, and a chain never passes through the same account twice.',
      k: 'Starting from account 1, find every flagged account that money can reach along such a chain, and report the bank, the holder and the fewest transfers needed. Any order.',
      n: ['Two transfers on the same day cannot follow each other.', 'Account 1 is the only starting point.'],
      q: "WITH RECURSIVE w(acct, day, hops, path) AS (SELECT 1, 0, 0, ',1,' UNION ALL SELECT t.dst, t.day, w.hops + 1, w.path || t.dst || ',' FROM w JOIN transfers t ON t.src = w.acct AND t.day > w.day WHERE instr(w.path, ',' || t.dst || ',') = 0) SELECT b.name AS bank, a.holder, MIN(w.hops) AS hops FROM w JOIN flags f ON f.account_id = w.acct JOIN accounts a ON a.id = w.acct JOIN banks b ON b.id = a.bank_id GROUP BY b.name, a.holder",
      wrong: ["WITH RECURSIVE w(acct, hops, path) AS (SELECT 1, 0, ',1,' UNION ALL SELECT t.dst, w.hops + 1, w.path || t.dst || ',' FROM w JOIN transfers t ON t.src = w.acct WHERE instr(w.path, ',' || t.dst || ',') = 0) SELECT b.name AS bank, a.holder, MIN(w.hops) AS hops FROM w JOIN flags f ON f.account_id = w.acct JOIN accounts a ON a.id = w.acct JOIN banks b ON b.id = a.bank_id GROUP BY b.name, a.holder"],
      h: 'Carry both the day of the last transfer and the accounts already visited through the recursion.',
      x: 'The day has to travel with the chain so the next transfer can be required to be later, and the visited accounts have to travel with it so a cycle cannot loop forever. Dropping the day finds shortcuts that run backwards in time, which no money could actually take.' },

    { t: 'Peak Occupancy per Ward', tg: ['sweep line', 'window', 'intervals'],
      tb: ['wards', 'patients', 'stays'],
      extra: {
        wards: T('id INTEGER PRIMARY KEY, name TEXT, beds INTEGER', [[1, 'Intensive Care', 3], [2, 'Maternity', 2]]),
        patients: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra'], [4, 'Dev'], [5, 'Esha']]),
        stays: T('id INTEGER PRIMARY KEY, patient_id INTEGER, ward_id INTEGER, in_min INTEGER, out_min INTEGER', [
          [1, 1, 1, 0, 100], [2, 2, 1, 50, 150], [3, 3, 1, 200, 300], [4, 4, 2, 0, 60], [5, 5, 2, 70, 120]]),
      },
      hidden: [
        { stays: [[1, 1, 1, 0, 100], [2, 2, 1, 50, 150], [3, 3, 1, 200, 300], [4, 4, 2, 0, 60], [5, 5, 2, 60, 120]] },
        { stays: [[1, 1, 1, 0, 100], [2, 2, 1, 50, 150], [3, 3, 1, 60, 300], [4, 4, 2, 0, 60], [5, 5, 2, 70, 120]] },
      ],
      s: 'A stay occupies a bed from the minute the patient arrives until the minute they leave, and the leaving minute is already free for the next patient.',
      k: 'For every ward, report the ward name, the highest number of patients in it at the same time, the earliest minute at which that peak is reached, and how many different patients stayed there in total. Any order.',
      n: ['A patient leaving at minute 60 and another arriving at minute 60 are never both in the ward.'],
      q: 'WITH ev AS (SELECT ward_id, in_min AS t, 1 AS d FROM stays UNION ALL SELECT ward_id, out_min AS t, -1 AS d FROM stays), run AS (SELECT ward_id, t, SUM(d) OVER (PARTITION BY ward_id ORDER BY t, d) AS cur FROM ev), pk AS (SELECT ward_id, MAX(cur) AS peak FROM run GROUP BY ward_id) SELECT w.name, pk.peak, (SELECT MIN(r.t) FROM run r WHERE r.ward_id = pk.ward_id AND r.cur = pk.peak) AS at_min, (SELECT COUNT(DISTINCT s.patient_id) FROM stays s WHERE s.ward_id = pk.ward_id) AS patients FROM pk JOIN wards w ON w.id = pk.ward_id',
      wrong: ['WITH ev AS (SELECT ward_id, in_min AS t, 1 AS d FROM stays UNION ALL SELECT ward_id, out_min AS t, -1 AS d FROM stays), run AS (SELECT ward_id, t, SUM(d) OVER (PARTITION BY ward_id ORDER BY t, d DESC) AS cur FROM ev), pk AS (SELECT ward_id, MAX(cur) AS peak FROM run GROUP BY ward_id) SELECT w.name, pk.peak, (SELECT MIN(r.t) FROM run r WHERE r.ward_id = pk.ward_id AND r.cur = pk.peak) AS at_min, (SELECT COUNT(DISTINCT s.patient_id) FROM stays s WHERE s.ward_id = pk.ward_id) AS patients FROM pk JOIN wards w ON w.id = pk.ward_id'],
      h: 'Turn every stay into an arrival event of +1 and a departure event of -1, then run a total along the timeline.',
      x: 'A running sum over time-ordered events gives the occupancy after each event, and its maximum is the peak. At the same minute the departures have to be applied before the arrivals, which is what ordering by the delta ascending does; the other order makes a hand-over look like an overlap.' },

    { t: 'Cheapest Route With Legal Connections', tg: ['recursive cte', 'graph', 'per-row threshold'],
      tb: ['airports', 'flights', 'requests'],
      extra: {
        airports: T('code TEXT PRIMARY KEY, city TEXT, min_connect INTEGER', [['A', 'Alphaville', 45], ['B', 'Betatown', 45], ['C', 'Gammacity', 45], ['D', 'Deltaport', 45]]),
        flights: T('id INTEGER PRIMARY KEY, from_ap TEXT, to_ap TEXT, dep_min INTEGER, arr_min INTEGER, price INTEGER', [
          [1, 'A', 'B', 100, 200, 50], [2, 'B', 'D', 300, 400, 50], [3, 'A', 'C', 100, 200, 60],
          [4, 'C', 'D', 250, 350, 10], [5, 'A', 'D', 90, 500, 200]]),
        requests: T('id INTEGER PRIMARY KEY, from_ap TEXT, to_ap TEXT', [[1, 'A', 'D']]),
      },
      hidden: [
        { airports: [['A', 'Alphaville', 45], ['B', 'Betatown', 45], ['C', 'Gammacity', 90], ['D', 'Deltaport', 45]] },
        { flights: [[1, 'A', 'B', 100, 200, 50], [2, 'B', 'D', 300, 400, 50], [3, 'A', 'C', 100, 200, 60], [4, 'C', 'D', 250, 350, 5], [5, 'A', 'D', 90, 500, 200]] },
      ],
      s: 'All flights run on the same day, with times as minute counts. A passenger changing planes needs at least the connecting airport\'s published minimum, and never visits the same airport twice.',
      k: 'For every request, return the request id, where it goes from and to, and the cheapest total price of a journey of at most three flights that respects every connection minimum. Any order.',
      n: ['A connection exactly equal to the minimum is allowed.', 'The minimum is the one published by the airport where the passenger changes planes.'],
      q: "WITH RECURSIVE r(rid, at_ap, arr, cost, legs, path) AS (SELECT rq.id, rq.from_ap, -1, 0, 0, ',' || rq.from_ap || ',' FROM requests rq UNION ALL SELECT r.rid, f.to_ap, f.arr_min, r.cost + f.price, r.legs + 1, r.path || f.to_ap || ',' FROM r JOIN flights f ON f.from_ap = r.at_ap JOIN airports a ON a.code = r.at_ap WHERE r.legs < 3 AND instr(r.path, ',' || f.to_ap || ',') = 0 AND (r.legs = 0 OR f.dep_min - r.arr >= a.min_connect)) SELECT rq.id, rq.from_ap, rq.to_ap, MIN(r.cost) AS cheapest FROM r JOIN requests rq ON rq.id = r.rid WHERE r.at_ap = rq.to_ap GROUP BY rq.id, rq.from_ap, rq.to_ap",
      wrong: ["WITH RECURSIVE r(rid, at_ap, arr, cost, legs, path) AS (SELECT rq.id, rq.from_ap, -1, 0, 0, ',' || rq.from_ap || ',' FROM requests rq UNION ALL SELECT r.rid, f.to_ap, f.arr_min, r.cost + f.price, r.legs + 1, r.path || f.to_ap || ',' FROM r JOIN flights f ON f.from_ap = r.at_ap WHERE r.legs < 3 AND instr(r.path, ',' || f.to_ap || ',') = 0 AND (r.legs = 0 OR f.dep_min > r.arr)) SELECT rq.id, rq.from_ap, rq.to_ap, MIN(r.cost) AS cheapest FROM r JOIN requests rq ON rq.id = r.rid WHERE r.at_ap = rq.to_ap GROUP BY rq.id, rq.from_ap, rq.to_ap"],
      h: 'Grow partial journeys: carry where you are, when you landed, what you have paid and which airports you have used.',
      x: 'The connection rule compares the next departure with the arrival you are holding, against the minimum of the airport you are standing in, so that airport has to be joined inside the recursive step. Requiring only a later departure lets the search buy a cheap itinerary nobody could actually fly.' },

    { t: 'Monthly Revenue Movement', tg: ['cohort', 'month series', 'self join'], o: true,
      tb: ['months', 'customers', 'plans', 'subscriptions'],
      extra: {
        months: T('seq INTEGER PRIMARY KEY, month TEXT, last_day TEXT', [[1, '2024-01', '2024-01-31'], [2, '2024-02', '2024-02-29'], [3, '2024-03', '2024-03-31']]),
        customers: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Asha'], [2, 'Ben'], [3, 'Chitra']]),
        plans: T('id INTEGER PRIMARY KEY, name TEXT, price INTEGER', [[10, 'Basic', 300], [11, 'Plus', 600], [12, 'Pro', 1200]]),
        subscriptions: T('id INTEGER PRIMARY KEY, customer_id INTEGER, plan_id INTEGER, start_day TEXT, end_day TEXT', [
          [100, 1, 10, '2024-01-05', '2024-02-10'], [101, 1, 11, '2024-02-10', null],
          [102, 2, 11, '2024-01-10', '2024-02-20'], [103, 3, 12, '2024-03-01', null]]),
      },
      hidden: [
        { subscriptions: [[100, 1, 10, '2024-01-05', '2024-02-10'], [101, 1, 11, '2024-02-10', null], [102, 2, 11, '2024-01-10', '2024-02-29'], [103, 3, 12, '2024-03-01', null]] },
        { subscriptions: [[100, 1, 11, '2024-01-05', '2024-02-10'], [101, 1, 10, '2024-02-10', null], [102, 2, 11, '2024-01-10', '2024-02-20'], [103, 3, 12, '2024-03-01', null]] },
      ],
      s: 'A customer\'s monthly revenue is the price of the plan they are on at the end of the month. A plan change is recorded as one subscription ending and another starting. A subscription with no end day is still running.',
      k: 'Build the revenue movement for every month: return month, new_mrr (customers who had nothing last month), expansion (they paid more than last month), contraction (they paid less) and churn (they had revenue last month and none now). Order by month.',
      n: ['A subscription that ends on the last day of a month no longer counts for that month.', 'Expansion and contraction are the size of the change, not the new amount.', 'The first month has no previous month, so everybody with revenue is new.'],
      q: "WITH mrr AS (SELECT m.seq, m.month, c.id AS cid, COALESCE((SELECT SUM(p.price) FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.customer_id = c.id AND s.start_day <= m.last_day AND (s.end_day IS NULL OR s.end_day > m.last_day)), 0) AS mrr FROM months m JOIN customers c), j AS (SELECT a.seq, a.month, a.mrr AS cur, COALESCE(b.mrr, 0) AS prev FROM mrr a LEFT JOIN mrr b ON b.cid = a.cid AND b.seq = a.seq - 1) SELECT month, SUM(CASE WHEN prev = 0 AND cur > 0 THEN cur ELSE 0 END) AS new_mrr, SUM(CASE WHEN prev > 0 AND cur > prev THEN cur - prev ELSE 0 END) AS expansion, SUM(CASE WHEN cur > 0 AND cur < prev THEN prev - cur ELSE 0 END) AS contraction, SUM(CASE WHEN prev > 0 AND cur = 0 THEN prev ELSE 0 END) AS churn FROM j GROUP BY seq, month ORDER BY month",
      wrong: ["WITH mrr AS (SELECT m.seq, m.month, c.id AS cid, COALESCE((SELECT SUM(p.price) FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE s.customer_id = c.id AND s.start_day <= m.last_day AND (s.end_day IS NULL OR s.end_day >= m.last_day)), 0) AS mrr FROM months m JOIN customers c), j AS (SELECT a.seq, a.month, a.mrr AS cur, COALESCE(b.mrr, 0) AS prev FROM mrr a LEFT JOIN mrr b ON b.cid = a.cid AND b.seq = a.seq - 1) SELECT month, SUM(CASE WHEN prev = 0 AND cur > 0 THEN cur ELSE 0 END) AS new_mrr, SUM(CASE WHEN prev > 0 AND cur > prev THEN cur - prev ELSE 0 END) AS expansion, SUM(CASE WHEN cur > 0 AND cur < prev THEN prev - cur ELSE 0 END) AS contraction, SUM(CASE WHEN prev > 0 AND cur = 0 THEN prev ELSE 0 END) AS churn FROM j GROUP BY seq, month ORDER BY month"],
      h: 'Build one revenue number per customer per month first, even when it is zero, then compare each month with the one before.',
      x: 'Crossing months with customers gives a complete grid, so a customer who leaves still has a zero row to compare against. Whether a subscription ending on the last day of the month still counts decides which month the churn lands in, which is why the comparison must be strictly after the month end.' },

    { t: 'Cost of Goods Sold, FIFO', tg: ['fifo allocation', 'window', 'joins'],
      tb: ['products', 'warehouses', 'lots', 'shipments'],
      extra: {
        products: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Widget'], [2, 'Gadget']]),
        warehouses: T('id INTEGER PRIMARY KEY, region TEXT', [[10, 'North'], [20, 'South']]),
        lots: T('id INTEGER PRIMARY KEY, product_id INTEGER, received_day TEXT, qty INTEGER, unit_cost INTEGER', [
          [1, 1, '2024-01-01', 10, 5], [2, 1, '2024-02-01', 10, 5], [3, 2, '2024-01-05', 5, 8], [4, 2, '2024-02-05', 5, 8]]),
        shipments: T('id INTEGER PRIMARY KEY, product_id INTEGER, warehouse_id INTEGER, day TEXT, qty INTEGER', [
          [100, 1, 10, '2024-03-01', 12], [101, 2, 10, '2024-03-02', 3], [102, 1, 20, '2024-03-03', 5]]),
      },
      hidden: [
        { lots: [[1, 1, '2024-01-01', 10, 4], [2, 1, '2024-02-01', 10, 9], [3, 2, '2024-01-05', 5, 8], [4, 2, '2024-02-05', 5, 8]] },
        { shipments: [[100, 1, 10, '2024-03-01', 12], [101, 2, 10, '2024-03-02', 3], [102, 1, 20, '2024-03-03', 5], [103, 1, 10, '2024-03-04', 13]] },
      ],
      s: 'Stock arrives in lots, each with its own unit cost, and is shipped out oldest lot first. Only shipments from the North region are part of this report, and the warehouse never ships more than it received.',
      k: 'For every product, return the product name and the cost of the goods shipped from North, taking the units from the oldest lots first. Any order.',
      n: ['A lot is used up before the next one is touched.', 'A lot that is never reached contributes nothing.'],
      q: "WITH q AS (SELECT s.product_id AS pid, SUM(s.qty) AS need FROM shipments s JOIN warehouses w ON w.id = s.warehouse_id WHERE w.region = 'North' GROUP BY s.product_id), l AS (SELECT lo.id, lo.product_id, lo.qty, lo.unit_cost, SUM(lo.qty) OVER (PARTITION BY lo.product_id ORDER BY lo.received_day, lo.id) - lo.qty AS before FROM lots lo) SELECT p.name, SUM(MIN(l.qty, MAX(0, q.need - l.before)) * l.unit_cost) AS cogs FROM l JOIN q ON q.pid = l.product_id JOIN products p ON p.id = l.product_id GROUP BY p.name",
      wrong: ["WITH q AS (SELECT s.product_id AS pid, SUM(s.qty) AS need FROM shipments s JOIN warehouses w ON w.id = s.warehouse_id WHERE w.region = 'North' GROUP BY s.product_id) SELECT p.name, q.need * (SELECT SUM(lo.qty * lo.unit_cost) FROM lots lo WHERE lo.product_id = q.pid) / (SELECT SUM(lo.qty) FROM lots lo WHERE lo.product_id = q.pid) AS cogs FROM q JOIN products p ON p.id = q.pid"],
      h: 'For each lot, how many units of the shipped total fall inside it? A running total of the earlier lots tells you.',
      x: 'A running sum of lot quantities, minus the lot itself, says how many units were already taken before this lot, so this lot supplies MIN(its qty, what is left). That is FIFO in one pass. A weighted average price charges the same amount whatever the order, which only matches when every lot cost the same.' },

    { t: 'Session Funnel by Acquisition Channel', tg: ['sessionization', 'window', 'joins'],
      tb: ['channels', 'users', 'events'],
      extra: {
        channels: T('id INTEGER PRIMARY KEY, name TEXT, cost INTEGER', [[1, 'Organic'], [2, 'Paid Social']].map((r) => [r[0], r[1], 0])),
        users: T('id INTEGER PRIMARY KEY, channel_id INTEGER', [[1, 1], [2, 1], [3, 2], [4, 2]]),
        events: T('id INTEGER PRIMARY KEY, user_id INTEGER, ts INTEGER, name TEXT', [
          [1, 1, 0, 'view'], [2, 1, 10, 'cart'], [3, 1, 20, 'checkout'],
          [4, 2, 0, 'view'], [5, 2, 15, 'cart'],
          [6, 3, 0, 'view'], [7, 3, 25, 'checkout'],
          [8, 4, 0, 'view'], [9, 4, 5, 'view']]),
      },
      hidden: [
        { events: [[1, 1, 0, 'view'], [2, 1, 10, 'cart'], [3, 1, 20, 'checkout'], [4, 1, 400, 'view'], [5, 1, 410, 'cart'], [6, 2, 0, 'view'], [7, 3, 0, 'view'], [8, 3, 25, 'checkout'], [9, 4, 0, 'view']] },
        { events: [[1, 1, 0, 'view'], [2, 1, 10, 'cart'], [3, 1, 20, 'checkout'], [4, 2, 0, 'view'], [5, 2, 15, 'checkout'], [6, 3, 0, 'view'], [7, 3, 25, 'cart'], [8, 4, 0, 'view'], [9, 4, 5, 'view']] },
      ],
      s: 'Events carry a minute count. A new session starts when more than 30 minutes have passed since the user\'s previous event. A session counts as converting when a checkout happens inside it.',
      k: 'For every acquisition channel, return the channel name, how many sessions it produced, how many of them converted and the conversion rate rounded to 2 decimals. Any order.',
      n: ['One user can produce several sessions, and each one counts on its own.', 'A gap of exactly 30 minutes is still the same session.'],
      q: "WITH e AS (SELECT ev.id, ev.user_id, ev.ts, ev.name, u.channel_id, CASE WHEN LAG(ev.ts) OVER (PARTITION BY ev.user_id ORDER BY ev.ts, ev.id) IS NULL OR ev.ts - LAG(ev.ts) OVER (PARTITION BY ev.user_id ORDER BY ev.ts, ev.id) > 30 THEN 1 ELSE 0 END AS newsess FROM events ev JOIN users u ON u.id = ev.user_id), s AS (SELECT channel_id, user_id, name, SUM(newsess) OVER (PARTITION BY user_id ORDER BY ts, id) AS sid FROM e), agg AS (SELECT channel_id, user_id, sid, MAX(CASE WHEN name = 'checkout' THEN 1 ELSE 0 END) AS conv FROM s GROUP BY channel_id, user_id, sid) SELECT c.name, COUNT(*) AS sessions, SUM(a.conv) AS converting, ROUND(1.0 * SUM(a.conv) / COUNT(*), 2) AS rate FROM agg a JOIN channels c ON c.id = a.channel_id GROUP BY c.name",
      wrong: ["SELECT c.name, COUNT(DISTINCT u.id) AS sessions, COUNT(DISTINCT CASE WHEN ev.name = 'checkout' THEN u.id END) AS converting, ROUND(1.0 * COUNT(DISTINCT CASE WHEN ev.name = 'checkout' THEN u.id END) / COUNT(DISTINCT u.id), 2) AS rate FROM events ev JOIN users u ON u.id = ev.user_id JOIN channels c ON c.id = u.channel_id GROUP BY c.name"],
      h: 'Number the sessions per user first: a flag on every event that starts one, then a running total of those flags.',
      x: 'The running sum of session-start flags gives every event its session number, after which one row per user and session is the population to measure. Counting users instead happens to agree while nobody comes back, and diverges the moment somebody has a second session.' },

    { t: 'Group Standings With Head-to-Head', tg: ['tie-breaks', 'rank', 'self join'],
      tb: ['pools', 'teams', 'matches', 'penalties'],
      extra: {
        pools: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Group A']]),
        teams: T('id INTEGER PRIMARY KEY, pool_id INTEGER, name TEXT', [[1, 1, 'Lions'], [2, 1, 'Bears'], [3, 1, 'Wolves'], [4, 1, 'Eagles']]),
        matches: T('id INTEGER PRIMARY KEY, home_id INTEGER, away_id INTEGER, home_goals INTEGER, away_goals INTEGER', [
          [1, 1, 2, 3, 0], [2, 1, 3, 2, 1], [3, 1, 4, 1, 0],
          [4, 2, 3, 2, 0], [5, 2, 4, 1, 1], [6, 3, 4, 0, 2]]),
        penalties: T('team_id INTEGER, points INTEGER', []),
      },
      hidden: [
        { matches: [[1, 1, 2, 3, 0], [2, 1, 4, 1, 0], [3, 3, 1, 2, 1], [4, 3, 2, 1, 0], [5, 4, 3, 5, 0], [6, 2, 4, 2, 1]] },
        { penalties: [[1, 6]] },
      ],
      s: 'A win is 3 points and a draw 1. Any points deducted by the committee come off the total. Teams level on points are separated by the points they took from each other, then by goal difference, then by name.',
      k: 'Return the pool name, the team, its points and its position in the pool, where 1 is top. Any order.',
      n: ['The head-to-head comparison only counts matches between the teams that are level on points.', 'A team with no deduction simply has none.'],
      q: 'WITH t AS (SELECT te.id, te.pool_id, te.name, COALESCE((SELECT SUM(CASE WHEN m.home_id = te.id THEN (CASE WHEN m.home_goals > m.away_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) ELSE (CASE WHEN m.away_goals > m.home_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) END) FROM matches m WHERE m.home_id = te.id OR m.away_id = te.id), 0) - COALESCE((SELECT SUM(p.points) FROM penalties p WHERE p.team_id = te.id), 0) AS pts, COALESCE((SELECT SUM(CASE WHEN m.home_id = te.id THEN m.home_goals - m.away_goals ELSE m.away_goals - m.home_goals END) FROM matches m WHERE m.home_id = te.id OR m.away_id = te.id), 0) AS gd FROM teams te), h AS (SELECT a.id, COALESCE(SUM(CASE WHEN m.home_id = a.id THEN (CASE WHEN m.home_goals > m.away_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) ELSE (CASE WHEN m.away_goals > m.home_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) END), 0) AS h2h FROM t a LEFT JOIN t b ON b.pool_id = a.pool_id AND b.pts = a.pts AND b.id <> a.id LEFT JOIN matches m ON (m.home_id = a.id AND m.away_id = b.id) OR (m.away_id = a.id AND m.home_id = b.id) GROUP BY a.id) SELECT po.name AS pool, t.name AS team, t.pts AS points, RANK() OVER (PARTITION BY t.pool_id ORDER BY t.pts DESC, h.h2h DESC, t.gd DESC, t.name) AS place FROM t JOIN h ON h.id = t.id JOIN pools po ON po.id = t.pool_id',
      wrong: ['WITH t AS (SELECT te.id, te.pool_id, te.name, COALESCE((SELECT SUM(CASE WHEN m.home_id = te.id THEN (CASE WHEN m.home_goals > m.away_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) ELSE (CASE WHEN m.away_goals > m.home_goals THEN 3 WHEN m.home_goals = m.away_goals THEN 1 ELSE 0 END) END) FROM matches m WHERE m.home_id = te.id OR m.away_id = te.id), 0) - COALESCE((SELECT SUM(p.points) FROM penalties p WHERE p.team_id = te.id), 0) AS pts, COALESCE((SELECT SUM(CASE WHEN m.home_id = te.id THEN m.home_goals - m.away_goals ELSE m.away_goals - m.home_goals END) FROM matches m WHERE m.home_id = te.id OR m.away_id = te.id), 0) AS gd FROM teams te) SELECT po.name AS pool, t.name AS team, t.pts AS points, RANK() OVER (PARTITION BY t.pool_id ORDER BY t.pts DESC, t.gd DESC, t.name) AS place FROM t JOIN pools po ON po.id = t.pool_id'],
      h: 'Work out the points and goal difference for every team, then, for the teams that are level, the points they took from each other.',
      x: 'Points come from the matches a team appears in on either side, so the CASE has to flip for away games. The head-to-head total is a second pass over the same table, restricted to opponents on the same points, and only then can one window function apply all three tie-breaks in order.' },

    { t: 'Customer Minutes Lost to Outages', tg: ['interval merging', 'window', 'joins'],
      tb: ['feeders', 'customers', 'outages', 'crews'],
      extra: {
        feeders: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Mill Feeder'], [2, 'Dock Feeder']]),
        customers: T('id INTEGER PRIMARY KEY, feeder_id INTEGER, name TEXT', [
          [1, 1, 'Flat 1A'], [2, 1, 'Flat 1B'], [3, 1, 'House 3'], [4, 2, 'Shed 9'], [5, 2, 'Pier 4']]),
        outages: T('id INTEGER PRIMARY KEY, feeder_id INTEGER, start_min INTEGER, end_min INTEGER', [
          [1, 1, 0, 60], [2, 1, 120, 180], [3, 2, 0, 30], [4, 2, 200, 260], [5, 1, 400, 420]]),
        crews: T('outage_id INTEGER, crew_name TEXT', [[1, 'Red'], [2, 'Blue'], [3, 'Red'], [4, 'Green']]),
      },
      hidden: [
        { outages: [[1, 1, 0, 60], [2, 1, 30, 180], [3, 2, 0, 30], [4, 2, 200, 260], [5, 1, 400, 420]] },
        { crews: [[1, 'Red'], [2, 'Blue'], [3, 'Red'], [4, 'Green'], [5, 'Amber']] },
      ],
      s: 'A feeder serves many customers, and an outage on it cuts power to all of them. Outages can overlap, and an outage that no crew was ever dispatched to is a false alarm that never happened.',
      k: 'For every feeder with at least one real outage, return the feeder name, the number of minutes it was off supply counting overlapping outages once, how many customers it serves, and the customer-minutes lost. Any order.',
      n: ['Two outages that overlap are one stretch without power.', 'Outages that merely touch, one ending as the next begins, are also one stretch.'],
      q: 'WITH o AS (SELECT ou.* FROM outages ou WHERE EXISTS (SELECT 1 FROM crews c WHERE c.outage_id = ou.id)), s AS (SELECT feeder_id, start_min, end_min, MAX(end_min) OVER (PARTITION BY feeder_id ORDER BY start_min, end_min ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS pm FROM o), g AS (SELECT feeder_id, start_min, end_min, SUM(CASE WHEN pm IS NULL OR start_min > pm THEN 1 ELSE 0 END) OVER (PARTITION BY feeder_id ORDER BY start_min, end_min) AS grp FROM s), m AS (SELECT feeder_id, MIN(start_min) AS a, MAX(end_min) AS b FROM g GROUP BY feeder_id, grp) SELECT f.name, SUM(m.b - m.a) AS minutes, (SELECT COUNT(*) FROM customers c WHERE c.feeder_id = f.id) AS customers, SUM(m.b - m.a) * (SELECT COUNT(*) FROM customers c WHERE c.feeder_id = f.id) AS cmi FROM m JOIN feeders f ON f.id = m.feeder_id GROUP BY f.id, f.name',
      wrong: ['WITH o AS (SELECT ou.* FROM outages ou WHERE EXISTS (SELECT 1 FROM crews c WHERE c.outage_id = ou.id)) SELECT f.name, SUM(o.end_min - o.start_min) AS minutes, (SELECT COUNT(*) FROM customers c WHERE c.feeder_id = f.id) AS customers, SUM(o.end_min - o.start_min) * (SELECT COUNT(*) FROM customers c WHERE c.feeder_id = f.id) AS cmi FROM o JOIN feeders f ON f.id = o.feeder_id GROUP BY f.id, f.name'],
      h: 'Merge the outages of a feeder into separate stretches before you add any minutes up.',
      x: 'Sorted by start, an outage begins a new stretch only when it starts after the furthest end seen so far, which a running maximum over the earlier rows provides. Adding the raw durations counts the overlap twice and reports more lost minutes than the clock allows.' },

    { t: 'Blocked by a Prerequisite Chain', tg: ['recursive cte', 'transitive closure', 'not exists'],
      tb: ['courses', 'prereqs', 'enrollments', 'completions'],
      extra: {
        courses: T('id INTEGER PRIMARY KEY, code TEXT', [[1, 'CS101'], [2, 'CS201'], [3, 'CS301'], [4, 'MA100']]),
        prereqs: T('course_id INTEGER, requires_id INTEGER', [[2, 1], [3, 2], [3, 4]]),
        enrollments: T('id INTEGER PRIMARY KEY, student TEXT, course_id INTEGER', [
          [900, 'Asha', 2], [901, 'Ben', 3], [902, 'Chitra', 3], [903, 'Dev', 1]]),
        completions: T('student TEXT, course_id INTEGER', [
          ['Asha', 1], ['Ben', 1], ['Ben', 2], ['Ben', 4], ['Chitra', 2], ['Chitra', 4], ['Chitra', 1]]),
      },
      hidden: [
        { completions: [['Asha', 1], ['Ben', 1], ['Ben', 2], ['Ben', 4], ['Chitra', 2], ['Chitra', 4]] },
        { prereqs: [[2, 1], [3, 2], [3, 4], [4, 1]] },
      ],
      s: 'A course can require other courses, and those requirements have requirements of their own. A student must have finished everything in the chain, however deep, before a course is open to them.',
      k: 'For every course, return its code, the length of its longest requirement chain, and how many enrolled students are missing at least one course anywhere in that chain. Any order.',
      n: ['A course with no requirements has a chain length of 0 and blocks nobody.', 'A requirement counts however far down the chain it appears.'],
      q: 'WITH RECURSIVE anc(course_id, req_id, depth) AS (SELECT course_id, requires_id, 1 FROM prereqs UNION SELECT a.course_id, p.requires_id, a.depth + 1 FROM anc a JOIN prereqs p ON p.course_id = a.req_id) SELECT c.code, COALESCE((SELECT MAX(depth) FROM anc WHERE course_id = c.id), 0) AS chain, (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND EXISTS (SELECT 1 FROM anc a WHERE a.course_id = c.id AND NOT EXISTS (SELECT 1 FROM completions cp WHERE cp.student = e.student AND cp.course_id = a.req_id))) AS blocked FROM courses c',
      wrong: ['WITH RECURSIVE anc(course_id, req_id, depth) AS (SELECT course_id, requires_id, 1 FROM prereqs UNION SELECT a.course_id, p.requires_id, a.depth + 1 FROM anc a JOIN prereqs p ON p.course_id = a.req_id) SELECT c.code, COALESCE((SELECT MAX(depth) FROM anc WHERE course_id = c.id), 0) AS chain, (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND EXISTS (SELECT 1 FROM prereqs p WHERE p.course_id = c.id AND NOT EXISTS (SELECT 1 FROM completions cp WHERE cp.student = e.student AND cp.course_id = p.requires_id))) AS blocked FROM courses c'],
      h: 'Build the full set of requirements per course with a recursive walk, then ask the two questions of that set.',
      x: 'The recursion closes the requirement graph: every course paired with everything below it and how far down it sits. Both the chain length and the missing-course test read that closure, so a student who skipped a requirement two levels down is caught. Looking only at direct requirements measures a depth of 1 and lets those students through.' },
  ]);
})();
