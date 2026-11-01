// Dojo SQL, interview-grade set: Medium. Every question joins at least three tables and hides a judgement call
// (which rows qualify, which default applies, what a rate is measured over) that a quick answer gets wrong.
(function () {
  const T = window.dojoT;
  DOJO_SQL_PRO('medium', [
    { t: 'Cancellation Rate by City Tier', tg: ['joins', 'conditional aggregate', 'null'],
      tb: ['cities', 'drivers', 'rides'],
      extra: {
        cities: T('id INTEGER PRIMARY KEY, name TEXT, tier TEXT', [[1, 'Metro A', 'T1'], [2, 'Metro B', 'T1'], [3, 'Town C', 'T2']]),
        drivers: T('id INTEGER PRIMARY KEY, city_id INTEGER, rating REAL', [[10, 1, 4.8], [11, 1, 4.6], [12, 2, 4.9], [13, 3, 4.6]]),
        rides: T('id INTEGER PRIMARY KEY, driver_id INTEGER, status TEXT, fare INTEGER', [
          [1, 10, 'completed', 240], [2, 10, 'completed', 180], [3, 10, 'cancelled', 0],
          [4, 11, 'completed', 300], [5, 11, 'cancelled', 0],
          [6, 12, 'completed', 150], [7, 12, 'cancelled', 0],
          [8, 13, 'completed', 90], [9, 13, 'completed', 120]]),
      },
      hidden: [
        { drivers: [[10, 1, 4.8], [11, 1, 4.1], [12, 2, 4.9], [13, 3, 4.6]] },
        { drivers: [[10, 1, 4.8], [11, 1, 4.6], [12, 2, 4.9], [13, 3, null]] },
      ],
      s: 'A ride-hailing company reviews cancellations, but only for drivers it considers reliable: those rated 4.5 or higher. A rating can be missing for a driver who has not been rated yet.',
      k: 'Report, for every city tier, how many of those drivers\' rides were cancelled, how many rides they had in total, and the cancellation rate rounded to 2 decimals. Return tier, cancelled, total and rate in any order.',
      n: ['A driver with no rating is not known to be reliable, so none of their rides count.', 'A tier with no qualifying rides is left out of the report entirely.'],
      q: "SELECT c.tier, SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, COUNT(*) AS total, ROUND(1.0 * SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM rides r JOIN drivers d ON d.id = r.driver_id JOIN cities c ON c.id = d.city_id WHERE d.rating >= 4.5 GROUP BY c.tier",
      wrong: ["SELECT c.tier, SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled, COUNT(*) AS total, ROUND(1.0 * SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM rides r JOIN drivers d ON d.id = r.driver_id JOIN cities c ON c.id = d.city_id GROUP BY c.tier"],
      h: 'Walk the ride to its driver and the driver to the city, then keep only the reliable drivers before you aggregate.',
      x: 'The rate has to be measured over the qualifying rides only, so the rating filter belongs in WHERE, before the grouping. A missing rating fails "rating >= 4.5" on its own, because any comparison with NULL is unknown, so those drivers drop out without a special case.' },

    { t: 'Skip Rate by Genre', tg: ['joins', 'ratio threshold', 'conditional aggregate'],
      tb: ['genres', 'tracks', 'plays'],
      extra: {
        genres: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Pop'], [2, 'Jazz']]),
        tracks: T('id INTEGER PRIMARY KEY, genre_id INTEGER, seconds INTEGER', [[100, 1, 200], [101, 1, 240], [102, 2, 300]]),
        plays: T('id INTEGER PRIMARY KEY, track_id INTEGER, played_seconds INTEGER', [
          [1, 100, 10], [2, 100, 120], [3, 101, 15], [4, 102, 20], [5, 102, 150]]),
      },
      hidden: [
        { plays: [[1, 100, 10], [2, 100, 120], [3, 101, 15], [4, 102, 20], [5, 102, 150], [6, 100, 45]] },
        { tracks: [[100, 1, 200], [101, 1, 240], [102, 2, 300], [103, 2, 60]], plays: [[1, 100, 10], [2, 100, 120], [3, 101, 15], [4, 102, 20], [5, 102, 150], [7, 103, 25]] },
      ],
      s: 'A music service counts a play as a skip when the listener heard less than 30% of the track. Tracks are of very different lengths, from one-minute interludes to long jazz pieces.',
      k: 'For every genre, return the genre name, how many of its plays were skips, how many plays it had, and the skip rate rounded to 2 decimals. Any order.',
      n: ['Hearing exactly 30% of a track is not a skip.'],
      q: 'SELECT g.name, SUM(CASE WHEN p.played_seconds * 10 < t.seconds * 3 THEN 1 ELSE 0 END) AS skips, COUNT(*) AS plays, ROUND(1.0 * SUM(CASE WHEN p.played_seconds * 10 < t.seconds * 3 THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM plays p JOIN tracks t ON t.id = p.track_id JOIN genres g ON g.id = t.genre_id GROUP BY g.name',
      wrong: ['SELECT g.name, SUM(CASE WHEN p.played_seconds < 30 THEN 1 ELSE 0 END) AS skips, COUNT(*) AS plays, ROUND(1.0 * SUM(CASE WHEN p.played_seconds < 30 THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM plays p JOIN tracks t ON t.id = p.track_id JOIN genres g ON g.id = t.genre_id GROUP BY g.name'],
      h: 'The skip test depends on the track, so it needs a column from tracks, not a fixed number of seconds.',
      x: 'A skip is a share of the track, so the test is played_seconds < 0.3 * seconds. Writing it as played_seconds * 10 < seconds * 3 keeps it in whole numbers and avoids integer division. A fixed 30-second rule happens to agree on medium-length tracks and disagrees on very short or very long ones.' },

    { t: 'Top Decline Reason per Issuer', tg: ['joins', 'window', 'ties'],
      tb: ['issuers', 'cards', 'txns'],
      extra: {
        issuers: T('id INTEGER PRIMARY KEY, name TEXT, country TEXT', [[1, 'Northbank', 'IN'], [2, 'Seacard', 'SG'], [3, 'Pinegroup', 'US']]),
        cards: T('id INTEGER PRIMARY KEY, issuer_id INTEGER, holder TEXT', [[500, 1, 'Asha'], [501, 1, 'Ben'], [502, 2, 'Chitra'], [503, 3, 'Dev']]),
        txns: T('id INTEGER PRIMARY KEY, card_id INTEGER, status TEXT, reason TEXT, amount INTEGER', [
          [1, 500, 'declined', 'insufficient funds', 1200], [2, 500, 'declined', 'insufficient funds', 800], [3, 501, 'declined', 'expired card', 400],
          [4, 501, 'approved', null, 600], [5, 502, 'declined', 'risk block', 2500], [6, 502, 'declined', 'risk block', 300],
          [7, 502, 'declined', 'expired card', 150], [8, 503, 'approved', null, 999]]),
      },
      hidden: [
        { txns: [[1, 500, 'declined', 'insufficient funds', 1200], [2, 500, 'declined', 'expired card', 800], [3, 501, 'declined', 'expired card', 400], [4, 501, 'declined', 'insufficient funds', 600], [5, 502, 'declined', 'risk block', 2500], [6, 502, 'declined', 'risk block', 300], [7, 502, 'declined', 'expired card', 150], [8, 503, 'approved', null, 999]] },
        { txns: [[1, 500, 'approved', null, 1200], [2, 500, 'approved', null, 800], [3, 501, 'declined', 'expired card', 400], [4, 501, 'declined', 'expired card', 600], [5, 502, 'declined', 'risk block', 2500], [6, 503, 'declined', 'risk block', 300], [7, 503, 'declined', 'risk block', 150], [8, 503, 'declined', 'stolen card', 999]] },
      ],
      s: 'A payments team wants the single most common decline reason for each card issuer. Reasons are only recorded on declined transactions.',
      k: 'Return the issuer name, its most common decline reason and how many times that reason occurred. If two reasons are tied for an issuer, report the one that comes first alphabetically. Issuers with no declines are left out. Any order.',
      n: ['Exactly one row per issuer that has at least one decline.'],
      q: "WITH d AS (SELECT i.name AS issuer, t.reason, COUNT(*) AS n FROM txns t JOIN cards c ON c.id = t.card_id JOIN issuers i ON i.id = c.issuer_id WHERE t.status = 'declined' GROUP BY i.name, t.reason) SELECT issuer, reason, n FROM (SELECT issuer, reason, n, ROW_NUMBER() OVER (PARTITION BY issuer ORDER BY n DESC, reason) AS rk FROM d) WHERE rk = 1",
      wrong: ["WITH d AS (SELECT i.name AS issuer, t.reason, COUNT(*) AS n FROM txns t JOIN cards c ON c.id = t.card_id JOIN issuers i ON i.id = c.issuer_id WHERE t.status = 'declined' GROUP BY i.name, t.reason) SELECT issuer, reason, n FROM (SELECT issuer, reason, n, RANK() OVER (PARTITION BY issuer ORDER BY n DESC) AS rk FROM d) WHERE rk = 1"],
      h: 'Count the declines per issuer and reason first, then pick one row per issuer.',
      x: 'Counting per issuer and reason gives a small table to rank. ROW_NUMBER with the reason as a second sort key always returns exactly one row per issuer, which is what the question asks for; RANK keeps every tied reason and returns two rows for the same issuer.' },

    { t: 'Stockouts Across Warehouses', tg: ['left join', 'joins', 'missing rows'],
      tb: ['products', 'warehouses', 'inventory', 'order_lines'],
      extra: {
        products: T('id INTEGER PRIMARY KEY, sku TEXT', [[1, 'LAMP-01'], [2, 'DESK-02'], [3, 'CHAIR-03']]),
        warehouses: T('id INTEGER PRIMARY KEY, region TEXT', [[10, 'North'], [20, 'South']]),
        inventory: T('warehouse_id INTEGER, product_id INTEGER, on_hand INTEGER', [[10, 1, 5], [10, 2, 40], [20, 1, 2], [20, 3, 7]]),
        order_lines: T('order_id INTEGER, product_id INTEGER, warehouse_id INTEGER, qty INTEGER', [
          [900, 1, 10, 4], [901, 1, 10, 3], [902, 2, 10, 10], [903, 1, 20, 1], [904, 3, 20, 9]]),
      },
      hidden: [
        { order_lines: [[900, 1, 10, 4], [901, 1, 10, 3], [902, 2, 10, 10], [903, 1, 20, 1], [904, 3, 20, 9], [905, 2, 20, 6]] },
        { inventory: [[10, 1, 50], [10, 2, 40], [20, 1, 2], [20, 3, 70]] },
      ],
      s: 'Each order line is picked from a named warehouse. A warehouse that has never stocked a product has no inventory row for it at all, which still means it has none on hand.',
      k: 'Find every warehouse and product where the total quantity ordered from that warehouse is greater than the quantity on hand there. Return region, sku, ordered and on_hand in any order.',
      n: ['A missing inventory row counts as 0 on hand.'],
      q: 'SELECT w.region, p.sku, SUM(o.qty) AS ordered, COALESCE(i.on_hand, 0) AS on_hand FROM order_lines o JOIN warehouses w ON w.id = o.warehouse_id JOIN products p ON p.id = o.product_id LEFT JOIN inventory i ON i.warehouse_id = o.warehouse_id AND i.product_id = o.product_id GROUP BY w.region, p.sku, COALESCE(i.on_hand, 0) HAVING SUM(o.qty) > COALESCE(i.on_hand, 0)',
      wrong: ['SELECT w.region, p.sku, SUM(o.qty) AS ordered, i.on_hand AS on_hand FROM order_lines o JOIN warehouses w ON w.id = o.warehouse_id JOIN products p ON p.id = o.product_id JOIN inventory i ON i.warehouse_id = o.warehouse_id AND i.product_id = o.product_id GROUP BY w.region, p.sku, i.on_hand HAVING SUM(o.qty) > i.on_hand'],
      h: 'Which join keeps an order line whose warehouse has no inventory row for that product?',
      x: 'Order lines drive the query, so inventory joins on the left with COALESCE turning the missing row into 0. An inner join silently drops exactly the worst stockouts, the ones where nothing was ever stocked.' },

    { t: 'No-Show Rate in a Date Window', tg: ['joins', 'dates', 'having'],
      tb: ['specialties', 'doctors', 'appointments'],
      extra: {
        specialties: T('id INTEGER PRIMARY KEY, name TEXT', [[1, 'Cardiology'], [2, 'Dermatology'], [3, 'Oncology']]),
        doctors: T('id INTEGER PRIMARY KEY, specialty_id INTEGER, name TEXT', [[7, 1, 'Rao'], [8, 1, 'Iyer'], [9, 2, 'Nair'], [10, 3, 'Das']]),
        appointments: T('id INTEGER PRIMARY KEY, doctor_id INTEGER, status TEXT, slot_date TEXT', [
          [1, 7, 'attended', '2024-05-02'], [2, 7, 'no_show', '2024-05-06'], [3, 7, 'attended', '2024-05-09'],
          [4, 8, 'no_show', '2024-05-13'], [5, 8, 'attended', '2024-05-16'], [6, 8, 'attended', '2024-05-20'],
          [7, 9, 'no_show', '2024-05-03'], [8, 9, 'attended', '2024-05-07'], [9, 9, 'no_show', '2024-05-10'],
          [10, 9, 'attended', '2024-05-14'], [11, 10, 'no_show', '2024-05-05'], [12, 7, 'attended', '2024-06-02']]),
      },
      hidden: [
        { appointments: [[1, 7, 'attended', '2024-05-02'], [2, 7, 'no_show', '2024-05-06'], [3, 7, 'attended', '2024-05-09'], [4, 8, 'no_show', '2024-05-13'], [5, 8, 'attended', '2024-05-16'], [6, 8, 'no_show', '2024-05-31'], [7, 9, 'no_show', '2024-05-03'], [8, 9, 'attended', '2024-05-07'], [9, 9, 'no_show', '2024-05-10'], [10, 9, 'attended', '2024-05-31'], [11, 10, 'no_show', '2024-05-05'], [12, 7, 'attended', '2024-06-02']] },
        { appointments: [[1, 7, 'attended', '2024-05-02'], [2, 7, 'no_show', '2024-05-06'], [3, 7, 'attended', '2024-05-09'], [4, 8, 'no_show', '2024-04-30'], [5, 8, 'attended', '2024-06-01'], [6, 8, 'attended', '2024-05-20'], [7, 9, 'no_show', '2024-05-03'], [8, 9, 'attended', '2024-05-07'], [9, 9, 'no_show', '2024-05-10'], [10, 9, 'attended', '2024-05-14'], [11, 10, 'no_show', '2024-05-05'], [12, 7, 'attended', '2024-06-02']] },
      ],
      s: 'A hospital reviews May 2024, from the 1st to the 31st, both days included. A specialty is only reported when it had at least 4 appointments inside that window.',
      k: 'Return the specialty name and its no-show rate inside the window, rounded to 2 decimals, for the specialties that qualify. Any order.',
      n: ['Appointments outside May 2024 count for nothing, not even towards the 4.'],
      q: "SELECT s.name, ROUND(1.0 * SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN specialties s ON s.id = d.specialty_id WHERE a.slot_date >= '2024-05-01' AND a.slot_date <= '2024-05-31' GROUP BY s.name HAVING COUNT(*) >= 4",
      wrong: ["SELECT s.name, ROUND(1.0 * SUM(CASE WHEN a.status = 'no_show' THEN 1 ELSE 0 END) / COUNT(*), 2) AS rate FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN specialties s ON s.id = d.specialty_id WHERE a.slot_date >= '2024-05-01' AND a.slot_date < '2024-05-31' GROUP BY s.name HAVING COUNT(*) >= 4"],
      h: 'Two doctors can share a specialty, so the window filter and the count of 4 both belong at the specialty level.',
      x: 'Filtering in WHERE keeps the window out of both the rate and the HAVING count. The 31st is inside the window, so the upper bound must include it; "< 2024-05-31" quietly drops the last day of the month.' },

    { t: 'Connections Too Tight to Make', tg: ['self join', 'joins', 'per-row threshold'],
      tb: ['airports', 'flights', 'itineraries'],
      extra: {
        airports: T('code TEXT PRIMARY KEY, city TEXT, min_connect INTEGER', [['DEL', 'Delhi', 45], ['BOM', 'Mumbai', 45], ['SIN', 'Singapore', 45], ['LHR', 'London', 45]]),
        flights: T('id INTEGER PRIMARY KEY, from_ap TEXT, to_ap TEXT, dep_min INTEGER, arr_min INTEGER', [
          [1, 'DEL', 'BOM', 400, 520], [2, 'BOM', 'SIN', 600, 900], [3, 'BOM', 'SIN', 560, 860],
          [4, 'DEL', 'SIN', 300, 640], [5, 'SIN', 'LHR', 700, 1300], [6, 'SIN', 'LHR', 660, 1260]]),
        itineraries: T('id INTEGER PRIMARY KEY, pax TEXT, leg1 INTEGER, leg2 INTEGER', [
          [91, 'Asha', 1, 2], [92, 'Ben', 1, 3], [93, 'Chitra', 4, 5], [94, 'Dev', 4, 6]]),
      },
      hidden: [
        { airports: [['DEL', 'Delhi', 45], ['BOM', 'Mumbai', 90], ['SIN', 'Singapore', 45], ['LHR', 'London', 45]] },
        { airports: [['DEL', 'Delhi', 45], ['BOM', 'Mumbai', 30], ['SIN', 'Singapore', 75], ['LHR', 'London', 45]] },
      ],
      s: 'Each itinerary is two flights with a connection in between. Every airport publishes its own minimum connection time in minutes, and times are plain minute counts on the same day.',
      k: 'Find the itineraries whose connection is shorter than the published minimum at the airport where the passenger changes planes. Return the itinerary id, pax, the gap in minutes and that airport\'s min_connect. Any order.',
      n: ['A gap exactly equal to the minimum is allowed.', 'The connecting airport is where the first flight lands.'],
      q: 'SELECT i.id, i.pax, f2.dep_min - f1.arr_min AS gap, a.min_connect FROM itineraries i JOIN flights f1 ON f1.id = i.leg1 JOIN flights f2 ON f2.id = i.leg2 JOIN airports a ON a.code = f1.to_ap WHERE f2.dep_min - f1.arr_min < a.min_connect',
      wrong: ['SELECT i.id, i.pax, f2.dep_min - f1.arr_min AS gap, 45 AS min_connect FROM itineraries i JOIN flights f1 ON f1.id = i.leg1 JOIN flights f2 ON f2.id = i.leg2 WHERE f2.dep_min - f1.arr_min < 45'],
      h: 'Join flights twice, once as the arriving leg and once as the departing leg, then bring in the airport where they meet.',
      x: 'The same table joined under two aliases gives both legs on one row, and the arriving leg\'s destination is the key into airports. The minimum is a column, not a constant, so it has to come from the join.' },

    { t: 'Meters Over Their Own Tariff', tg: ['joins', 'group by', 'having'],
      tb: ['tariffs', 'meters', 'readings'],
      extra: {
        tariffs: T('id INTEGER PRIMARY KEY, name TEXT, threshold_kwh INTEGER', [[1, 'Standard', 20], [2, 'EcoLow', 20], [3, 'Heavy', 20]]),
        meters: T('id INTEGER PRIMARY KEY, tariff_id INTEGER, home TEXT', [[301, 1, 'Flat 1A'], [302, 2, 'Flat 2B'], [303, 3, 'House 7'], [304, 1, 'Flat 9C']]),
        readings: T('meter_id INTEGER, day TEXT, kwh INTEGER', [
          [301, '2024-07-01', 25], [301, '2024-07-02', 18], [301, '2024-07-03', 22],
          [302, '2024-07-01', 30], [302, '2024-07-02', 12], [302, '2024-07-03', 10],
          [303, '2024-07-01', 40], [303, '2024-07-02', 35], [303, '2024-07-03', 5],
          [304, '2024-07-01', 19], [304, '2024-07-02', 20], [304, '2024-07-03', 15]]),
      },
      hidden: [
        { tariffs: [[1, 'Standard', 20], [2, 'EcoLow', 11], [3, 'Heavy', 38]] },
        { tariffs: [[1, 'Standard', 17], [2, 'EcoLow', 20], [3, 'Heavy', 20]] },
      ],
      s: 'Every home is on a tariff, and each tariff sets the daily allowance in kWh that it considers normal.',
      k: 'Find the homes that went over their own tariff\'s allowance on at least 2 days, and return the home, the tariff name and the number of days over. Any order.',
      n: ['A day exactly at the allowance is not over it.'],
      q: 'SELECT m.home, t.name, COUNT(*) AS days_over FROM readings r JOIN meters m ON m.id = r.meter_id JOIN tariffs t ON t.id = m.tariff_id WHERE r.kwh > t.threshold_kwh GROUP BY m.home, t.name HAVING COUNT(*) >= 2',
      wrong: ['SELECT m.home, t.name, COUNT(*) AS days_over FROM readings r JOIN meters m ON m.id = r.meter_id JOIN tariffs t ON t.id = m.tariff_id WHERE r.kwh > 20 GROUP BY m.home, t.name HAVING COUNT(*) >= 2'],
      h: 'The allowance comes from the tariff of the meter that produced the reading.',
      x: 'The comparison needs a column from a table two joins away: reading to meter to tariff. Hard-coding the number works until the tariffs differ, which is the whole point of having tariffs.' },

    { t: 'Bought Again After a Refund', tg: ['joins', 'self join', 'ordering'],
      tb: ['players', 'items', 'purchases', 'refunds'],
      extra: {
        players: T('id INTEGER PRIMARY KEY, name TEXT, country TEXT', [[1, 'Asha', 'IN'], [2, 'Ben', 'DE'], [3, 'Chitra', 'BR']]),
        items: T('id INTEGER PRIMARY KEY, name TEXT, price INTEGER', [[50, 'Skin: Comet', 900], [51, 'Boost Pack', 300], [52, 'Map: Dunes', 500]]),
        purchases: T('id INTEGER PRIMARY KEY, player_id INTEGER, item_id INTEGER, day TEXT', [
          [1, 1, 50, '2024-03-01'], [2, 1, 50, '2024-03-20'], [3, 2, 51, '2024-03-05'],
          [4, 2, 52, '2024-03-25'], [5, 3, 52, '2024-03-02'], [6, 3, 52, '2024-03-18']]),
        refunds: T('purchase_id INTEGER, day TEXT', [[1, '2024-03-03'], [3, '2024-03-08'], [5, '2024-03-04']]),
      },
      hidden: [
        { purchases: [[1, 1, 50, '2024-03-01'], [2, 1, 50, '2024-03-02'], [3, 2, 51, '2024-03-05'], [4, 2, 52, '2024-03-25'], [5, 3, 52, '2024-03-02'], [6, 3, 52, '2024-03-18']], refunds: [[2, '2024-03-10'], [3, '2024-03-08'], [5, '2024-03-04']] },
        { purchases: [[1, 1, 50, '2024-03-01'], [2, 1, 50, '2024-03-20'], [3, 2, 51, '2024-03-05'], [4, 2, 52, '2024-03-25'], [5, 3, 52, '2024-03-02'], [6, 3, 52, '2024-03-18'], [7, 2, 51, '2024-03-20']], refunds: [[1, '2024-03-25'], [3, '2024-03-08'], [5, '2024-03-19']] },
      ],
      s: 'Players can refund a purchase and buy the same item again later. The studio wants to know which items win a player back.',
      k: 'Find every player and item where the player refunded a purchase of that item and then bought the same item again strictly after the refund. Return the player name and the item name, once per pair, in any order.',
      n: ['A second purchase made before the refund does not count as buying it again.'],
      q: 'SELECT DISTINCT pl.name, it.name AS item FROM refunds rf JOIN purchases p1 ON p1.id = rf.purchase_id JOIN purchases p2 ON p2.player_id = p1.player_id AND p2.item_id = p1.item_id AND p2.day > rf.day JOIN players pl ON pl.id = p1.player_id JOIN items it ON it.id = p1.item_id',
      wrong: ['SELECT DISTINCT pl.name, it.name AS item FROM refunds rf JOIN purchases p1 ON p1.id = rf.purchase_id JOIN purchases p2 ON p2.player_id = p1.player_id AND p2.item_id = p1.item_id AND p2.id <> p1.id JOIN players pl ON pl.id = p1.player_id JOIN items it ON it.id = p1.item_id'],
      h: 'Start from the refund, find the purchase it undid, then look for another purchase of the same item by the same player.',
      x: 'The refund row carries the date that matters, so the second purchase is matched on player and item with day > refund day. Matching on "a different purchase row" instead also accepts a repurchase that happened before the refund, which is not winning anybody back.' },

    { t: 'Finished Every Lesson', tg: ['joins', 'count distinct', 'group by'],
      tb: ['courses', 'lessons', 'enrollments', 'views'],
      extra: {
        courses: T('id INTEGER PRIMARY KEY, title TEXT', [[1, 'Intro to SQL'], [2, 'Statistics 101']]),
        lessons: T('id INTEGER PRIMARY KEY, course_id INTEGER, idx INTEGER', [[10, 1, 1], [11, 1, 2], [12, 1, 3], [20, 2, 1], [21, 2, 2]]),
        enrollments: T('id INTEGER PRIMARY KEY, student TEXT, course_id INTEGER', [[900, 'Asha', 1], [901, 'Ben', 1], [902, 'Chitra', 2]]),
        views: T('enrollment_id INTEGER, lesson_id INTEGER', [
          [900, 10], [900, 11], [900, 12], [901, 10], [901, 11], [902, 20], [902, 21]]),
      },
      hidden: [
        { views: [[900, 10], [900, 11], [900, 11], [901, 10], [901, 11], [902, 20], [902, 21]] },
        { views: [[900, 10], [900, 11], [900, 12], [901, 10], [901, 11], [902, 20]] },
      ],
      s: 'A learning platform logs a row every time a student opens a lesson, so the same lesson can appear many times for one enrollment.',
      k: 'Find the enrollments that have viewed every lesson of their course. Return the student and the course title in any order.',
      n: ['Opening the same lesson three times is still one lesson viewed.'],
      q: 'SELECT e.student, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN views v ON v.enrollment_id = e.id JOIN lessons l ON l.id = v.lesson_id GROUP BY e.id, e.student, c.title HAVING COUNT(DISTINCT v.lesson_id) = (SELECT COUNT(*) FROM lessons l2 WHERE l2.course_id = e.course_id)',
      wrong: ['SELECT e.student, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN views v ON v.enrollment_id = e.id JOIN lessons l ON l.id = v.lesson_id GROUP BY e.id, e.student, c.title HAVING COUNT(*) = (SELECT COUNT(*) FROM lessons l2 WHERE l2.course_id = e.course_id)'],
      h: 'Compare the number of different lessons viewed with the number of lessons the course has.',
      x: 'The course\'s lesson count is a correlated subquery, and the viewed count must be COUNT(DISTINCT lesson_id) because the log repeats. Counting raw rows lets a student who re-watched one lesson look finished.' },

    { t: 'Return on Ad Spend', tg: ['joins', 'subquery', 'double counting'],
      tb: ['campaigns', 'clicks', 'conversions'],
      extra: {
        campaigns: T('id INTEGER PRIMARY KEY, name TEXT, budget INTEGER', [[1, 'Spring Shoes', 5000], [2, 'Winter Coats', 4000], [3, 'Summer Hats', 2000]]),
        clicks: T('id INTEGER PRIMARY KEY, campaign_id INTEGER, cost INTEGER', [
          [10, 1, 100], [11, 1, 150], [12, 2, 200], [13, 2, 50], [14, 3, 300]]),
        conversions: T('click_id INTEGER, revenue INTEGER', [[10, 400], [11, 300], [12, 250], [13, 100]]),
      },
      hidden: [
        { clicks: [[10, 1, 100], [11, 1, 150], [12, 2, 200], [13, 2, 50], [14, 3, 300], [15, 1, 250]] },
        { conversions: [[10, 400], [10, 500], [11, 300], [12, 250], [13, 100]] },
      ],
      s: 'Every click costs money whether or not it leads to a sale, and one click can lead to more than one sale.',
      k: 'For every campaign with at least one sale, return the campaign name and its return on spend, (revenue - cost) / cost, rounded to 2 decimals. Cost is every click of the campaign. Any order.',
      n: ['Clicks that never converted still cost money.'],
      q: 'SELECT c.name, ROUND(1.0 * ((SELECT COALESCE(SUM(v.revenue), 0) FROM conversions v JOIN clicks k2 ON k2.id = v.click_id WHERE k2.campaign_id = c.id) - (SELECT SUM(k.cost) FROM clicks k WHERE k.campaign_id = c.id)) / (SELECT SUM(k.cost) FROM clicks k WHERE k.campaign_id = c.id), 2) AS roas FROM campaigns c WHERE EXISTS (SELECT 1 FROM conversions v JOIN clicks k3 ON k3.id = v.click_id WHERE k3.campaign_id = c.id)',
      wrong: ['SELECT c.name, ROUND(1.0 * (SUM(v.revenue) - SUM(k.cost)) / SUM(k.cost), 2) AS roas FROM campaigns c JOIN clicks k ON k.campaign_id = c.id JOIN conversions v ON v.click_id = k.id GROUP BY c.name'],
      h: 'Revenue and cost are counted over different sets of rows, so one join cannot produce both.',
      x: 'Joining clicks to conversions keeps only converted clicks and repeats a click once per sale, so the same cost is added twice. Totalling cost and revenue in separate subqueries keeps each one over the right rows.' },
  ]);
})();
