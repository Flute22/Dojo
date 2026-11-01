// Pandas, interview-grade set: Medium. Several tables per question and one judgement call that a quick answer
// gets wrong. See medium.mjs for the field format.
export default [
  { t: 'Cancellation Rate by City Tier', tags: ['merge', 'groupby', 'missing values'],
    story: 'A ride-hailing company reviews cancellations, but only for drivers it considers reliable: those rated 4.5 or higher. A driver who has not been rated yet has no rating at all.',
    task: 'Return tier, cancelled, total and rate (rounded to 2 decimals) for every city tier, counting only the rides of reliable drivers. A tier with no qualifying rides is left out.',
    setup: `cities = pd.DataFrame({
    "city_id": [1, 2, 3],
    "city": ["Metro A", "Metro B", "Town C"],
    "tier": ["T1", "T1", "T2"],
})
drivers = pd.DataFrame({
    "driver_id": [10, 11, 12, 13],
    "city_id": [1, 1, 2, 3],
    "rating": [4.8, 4.6, 4.9, 4.6],
})
rides = pd.DataFrame({
    "ride_id": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "driver_id": [10, 10, 10, 11, 11, 12, 12, 13, 13],
    "status": ["completed", "completed", "cancelled", "completed", "cancelled", "completed", "cancelled", "completed", "completed"],
})`,
    hidden: [
      `cities = pd.DataFrame({"city_id": [1, 2, 3], "city": ["Metro A", "Metro B", "Town C"], "tier": ["T1", "T1", "T2"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12, 13], "city_id": [1, 1, 2, 3], "rating": [4.8, 4.1, 4.9, 4.6]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4, 5, 6, 7, 8, 9], "driver_id": [10, 10, 10, 11, 11, 12, 12, 13, 13], "status": ["completed", "completed", "cancelled", "completed", "cancelled", "completed", "cancelled", "completed", "completed"]})`,
      `cities = pd.DataFrame({"city_id": [1, 2, 3], "city": ["Metro A", "Metro B", "Town C"], "tier": ["T1", "T1", "T2"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12, 13], "city_id": [1, 1, 2, 3], "rating": [4.8, 4.6, 4.9, np.nan]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4, 5, 6, 7, 8, 9], "driver_id": [10, 10, 10, 11, 11, 12, 12, 13, 13], "status": ["completed", "completed", "cancelled", "completed", "cancelled", "completed", "cancelled", "completed", "completed"]})`,
    ],
    sig: 'def solve(cities: pd.DataFrame, drivers: pd.DataFrame, rides: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(cities, drivers, rides):
    ok = drivers[drivers["rating"] >= 4.5]
    m = rides.merge(ok, on="driver_id").merge(cities, on="city_id")
    g = m.groupby("tier", as_index=False).agg(
        cancelled=("status", lambda s: int((s == "cancelled").sum())),
        total=("status", "size"),
    )
    g["rate"] = (g["cancelled"] / g["total"]).round(2)
    return g`,
    wrong: [`def solve(cities, drivers, rides):
    m = rides.merge(drivers, on="driver_id").merge(cities, on="city_id")
    g = m.groupby("tier", as_index=False).agg(
        cancelled=("status", lambda s: int((s == "cancelled").sum())),
        total=("status", "size"),
    )
    g["rate"] = (g["cancelled"] / g["total"]).round(2)
    return g`],
    hints: ['Reduce the drivers to the reliable ones before the merge, so the rate is measured over the right rides.', 'A comparison against a missing rating is False, so unrated drivers drop out without a special case.'],
    why: 'Filtering drivers first means the merge only brings in qualifying rides, so both the counts and the rate are over the intended population.',
    mistakes: 'Merging everything and filtering afterwards is easy to forget entirely. Note that NaN >= 4.5 is False, which is exactly the wanted behaviour here, while ~(rating < 4.5) would quietly let unrated drivers back in.' },

  { t: 'Skip Rate by Genre', tags: ['merge', 'groupby', 'ratio threshold'],
    story: 'A music service counts a play as a skip when the listener heard less than 30% of the track. Tracks range from one-minute interludes to long jazz pieces.',
    task: 'Return genre, skips, plays and rate (rounded to 2 decimals) for every genre.',
    setup: `genres = pd.DataFrame({"genre_id": [1, 2], "genre": ["Pop", "Jazz"]})
tracks = pd.DataFrame({"track_id": [100, 101, 102], "genre_id": [1, 1, 2], "seconds": [200, 240, 300]})
plays = pd.DataFrame({
    "play_id": [1, 2, 3, 4, 5],
    "track_id": [100, 100, 101, 102, 102],
    "played_seconds": [10, 120, 15, 20, 150],
})`,
    hidden: [
      `genres = pd.DataFrame({"genre_id": [1, 2], "genre": ["Pop", "Jazz"]})
tracks = pd.DataFrame({"track_id": [100, 101, 102], "genre_id": [1, 1, 2], "seconds": [200, 240, 300]})
plays = pd.DataFrame({"play_id": [1, 2, 3, 4, 5, 6], "track_id": [100, 100, 101, 102, 102, 100], "played_seconds": [10, 120, 15, 20, 150, 45]})`,
      `genres = pd.DataFrame({"genre_id": [1, 2], "genre": ["Pop", "Jazz"]})
tracks = pd.DataFrame({"track_id": [100, 101, 102, 103], "genre_id": [1, 1, 2, 2], "seconds": [200, 240, 300, 60]})
plays = pd.DataFrame({"play_id": [1, 2, 3, 4, 5, 7], "track_id": [100, 100, 101, 102, 102, 103], "played_seconds": [10, 120, 15, 20, 150, 25]})`,
    ],
    sig: 'def solve(genres: pd.DataFrame, tracks: pd.DataFrame, plays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(genres, tracks, plays):
    m = plays.merge(tracks, on="track_id").merge(genres, on="genre_id")
    m["skip"] = m["played_seconds"] < 0.3 * m["seconds"]
    g = m.groupby("genre", as_index=False).agg(skips=("skip", "sum"), plays=("skip", "size"))
    g["skips"] = g["skips"].astype(int)
    g["rate"] = (g["skips"] / g["plays"]).round(2)
    return g`,
    wrong: [`def solve(genres, tracks, plays):
    m = plays.merge(tracks, on="track_id").merge(genres, on="genre_id")
    m["skip"] = m["played_seconds"] < 30
    g = m.groupby("genre", as_index=False).agg(skips=("skip", "sum"), plays=("skip", "size"))
    g["skips"] = g["skips"].astype(int)
    g["rate"] = (g["skips"] / g["plays"]).round(2)
    return g`],
    hints: ['The skip test needs the track length, so it belongs after the merge with tracks.', 'A boolean column summed gives the count, and its mean gives the rate.'],
    why: 'After the merge each play sits next to its track length, so the 30% rule is one vectorised comparison. Summing the boolean counts the skips.',
    mistakes: 'A fixed 30-second rule agrees on medium-length tracks and disagrees on very short and very long ones, which is the whole point of measuring a share.' },

  { t: 'Stockouts With Missing Inventory Rows', tags: ['merge', 'left join', 'groupby'],
    story: 'Order lines are picked from a named warehouse. A warehouse that has never stocked a product has no inventory row for it at all, which still means it has none on hand.',
    task: 'Return region, sku, ordered and on_hand for every warehouse and product where the total ordered is greater than the quantity on hand there.',
    setup: `products = pd.DataFrame({"product_id": [1, 2, 3], "sku": ["LAMP-01", "DESK-02", "CHAIR-03"]})
warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
inventory = pd.DataFrame({
    "warehouse_id": [10, 10, 20, 20],
    "product_id": [1, 2, 1, 3],
    "on_hand": [5, 40, 2, 7],
})
order_lines = pd.DataFrame({
    "order_id": [900, 901, 902, 903, 904],
    "product_id": [1, 1, 2, 1, 3],
    "warehouse_id": [10, 10, 10, 20, 20],
    "qty": [4, 3, 10, 1, 9],
})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2, 3], "sku": ["LAMP-01", "DESK-02", "CHAIR-03"]})
warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
inventory = pd.DataFrame({"warehouse_id": [10, 10, 20, 20], "product_id": [1, 2, 1, 3], "on_hand": [5, 40, 2, 7]})
order_lines = pd.DataFrame({"order_id": [900, 901, 902, 903, 904, 905], "product_id": [1, 1, 2, 1, 3, 2], "warehouse_id": [10, 10, 10, 20, 20, 20], "qty": [4, 3, 10, 1, 9, 6]})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3], "sku": ["LAMP-01", "DESK-02", "CHAIR-03"]})
warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
inventory = pd.DataFrame({"warehouse_id": [10, 10, 20, 20], "product_id": [1, 2, 1, 3], "on_hand": [50, 40, 2, 70]})
order_lines = pd.DataFrame({"order_id": [900, 901, 902, 903, 904], "product_id": [1, 1, 2, 1, 3], "warehouse_id": [10, 10, 10, 20, 20], "qty": [4, 3, 10, 1, 9]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, warehouses: pd.DataFrame, inventory: pd.DataFrame, order_lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, warehouses, inventory, order_lines):
    need = order_lines.groupby(["warehouse_id", "product_id"], as_index=False)["qty"].sum()
    need = need.rename(columns={"qty": "ordered"})
    m = need.merge(inventory, on=["warehouse_id", "product_id"], how="left")
    m["on_hand"] = m["on_hand"].fillna(0).astype(int)
    m = m[m["ordered"] > m["on_hand"]]
    m = m.merge(warehouses, on="warehouse_id").merge(products, on="product_id")
    return m[["region", "sku", "ordered", "on_hand"]].reset_index(drop=True)`,
    wrong: [`def solve(products, warehouses, inventory, order_lines):
    need = order_lines.groupby(["warehouse_id", "product_id"], as_index=False)["qty"].sum()
    need = need.rename(columns={"qty": "ordered"})
    m = need.merge(inventory, on=["warehouse_id", "product_id"])
    m = m[m["ordered"] > m["on_hand"]]
    m = m.merge(warehouses, on="warehouse_id").merge(products, on="product_id")
    return m[["region", "sku", "ordered", "on_hand"]].reset_index(drop=True)`],
    hints: ['Total the order lines per warehouse and product first.', 'Which merge keeps a pair that has no inventory row?'],
    why: 'The ordered quantities drive the comparison, so inventory merges on the left and the missing rows become 0.',
    mistakes: 'A default inner merge drops exactly the worst stockouts, the products that were never stocked at all.' },

  { t: 'Top Decline Reason per Issuer', tags: ['merge', 'value_counts', 'ties'],
    story: 'A payments team wants the single most common decline reason for each card issuer. Reasons are only recorded on declined transactions.',
    task: 'Return issuer, reason and n for each issuer that has at least one decline. If two reasons are tied, report the one that comes first alphabetically.',
    setup: `issuers = pd.DataFrame({"issuer_id": [1, 2, 3], "issuer": ["Northbank", "Seacard", "Pinegroup"]})
cards = pd.DataFrame({"card_id": [500, 501, 502, 503], "issuer_id": [1, 1, 2, 3], "holder": ["Asha", "Ben", "Chitra", "Dev"]})
txns = pd.DataFrame({
    "txn_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "card_id": [500, 500, 501, 501, 502, 502, 502, 503],
    "status": ["declined", "declined", "declined", "approved", "declined", "declined", "declined", "approved"],
    "reason": ["insufficient funds", "insufficient funds", "expired card", None, "risk block", "risk block", "expired card", None],
})`,
    hidden: [
      `issuers = pd.DataFrame({"issuer_id": [1, 2, 3], "issuer": ["Northbank", "Seacard", "Pinegroup"]})
cards = pd.DataFrame({"card_id": [500, 501, 502, 503], "issuer_id": [1, 1, 2, 3], "holder": ["Asha", "Ben", "Chitra", "Dev"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6, 7, 8], "card_id": [500, 500, 501, 501, 502, 502, 502, 503], "status": ["declined", "declined", "declined", "declined", "declined", "declined", "declined", "approved"], "reason": ["insufficient funds", "expired card", "expired card", "insufficient funds", "risk block", "risk block", "expired card", None]})`,
      `issuers = pd.DataFrame({"issuer_id": [1, 2, 3], "issuer": ["Northbank", "Seacard", "Pinegroup"]})
cards = pd.DataFrame({"card_id": [500, 501, 502, 503], "issuer_id": [1, 1, 2, 3], "holder": ["Asha", "Ben", "Chitra", "Dev"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6, 7, 8], "card_id": [500, 500, 501, 501, 502, 503, 503, 503], "status": ["approved", "approved", "declined", "declined", "declined", "declined", "declined", "declined"], "reason": [None, None, "expired card", "expired card", "risk block", "risk block", "risk block", "stolen card"]})`,
    ],
    sig: 'def solve(issuers: pd.DataFrame, cards: pd.DataFrame, txns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(issuers, cards, txns):
    d = txns[txns["status"] == "declined"].merge(cards, on="card_id").merge(issuers, on="issuer_id")
    g = d.groupby(["issuer", "reason"], as_index=False).size().rename(columns={"size": "n"})
    g = g.sort_values(["issuer", "n", "reason"], ascending=[True, False, True])
    return g.drop_duplicates("issuer")[["issuer", "reason", "n"]].reset_index(drop=True)`,
    wrong: [`def solve(issuers, cards, txns):
    d = txns[txns["status"] == "declined"].merge(cards, on="card_id").merge(issuers, on="issuer_id")
    g = d.groupby(["issuer", "reason"], as_index=False).size().rename(columns={"size": "n"})
    g = g.sort_values(["issuer", "n", "reason"], ascending=[True, False, False])
    return g.drop_duplicates("issuer")[["issuer", "reason", "n"]].reset_index(drop=True)`],
    hints: ['Count the declines per issuer and reason, then keep one row per issuer.', 'Sorting by issuer, count descending and reason ascending puts the wanted row first in each group.'],
    why: 'A three-key sort encodes the tie-break, after which drop_duplicates on the issuer keeps exactly the first row of each group.',
    mistakes: 'idxmax returns whichever tied row it meets first, which depends on the order the groups happen to be in rather than on the alphabet.' },

  { t: 'Connections Too Tight to Make', tags: ['merge', 'suffixes', 'per-row threshold'],
    story: 'Each itinerary is two flights with a connection in between. Every airport publishes its own minimum connection time in minutes, and all times are minute counts on one day.',
    task: 'Return itin_id, pax, gap and min_connect for the itineraries whose connection is shorter than the minimum published at the airport where the passenger changes planes.',
    setup: `airports = pd.DataFrame({
    "code": ["DEL", "BOM", "SIN", "LHR"],
    "city": ["Delhi", "Mumbai", "Singapore", "London"],
    "min_connect": [45, 45, 45, 45],
})
flights = pd.DataFrame({
    "flight_id": [1, 2, 3, 4, 5, 6],
    "from_ap": ["DEL", "BOM", "BOM", "DEL", "SIN", "SIN"],
    "to_ap": ["BOM", "SIN", "SIN", "SIN", "LHR", "LHR"],
    "dep_min": [400, 600, 560, 300, 700, 660],
    "arr_min": [520, 900, 860, 640, 1300, 1260],
})
itineraries = pd.DataFrame({
    "itin_id": [91, 92, 93, 94],
    "pax": ["Asha", "Ben", "Chitra", "Dev"],
    "leg1": [1, 1, 4, 4],
    "leg2": [2, 3, 5, 6],
})`,
    hidden: [
      `airports = pd.DataFrame({"code": ["DEL", "BOM", "SIN", "LHR"], "city": ["Delhi", "Mumbai", "Singapore", "London"], "min_connect": [45, 90, 45, 45]})
flights = pd.DataFrame({"flight_id": [1, 2, 3, 4, 5, 6], "from_ap": ["DEL", "BOM", "BOM", "DEL", "SIN", "SIN"], "to_ap": ["BOM", "SIN", "SIN", "SIN", "LHR", "LHR"], "dep_min": [400, 600, 560, 300, 700, 660], "arr_min": [520, 900, 860, 640, 1300, 1260]})
itineraries = pd.DataFrame({"itin_id": [91, 92, 93, 94], "pax": ["Asha", "Ben", "Chitra", "Dev"], "leg1": [1, 1, 4, 4], "leg2": [2, 3, 5, 6]})`,
      `airports = pd.DataFrame({"code": ["DEL", "BOM", "SIN", "LHR"], "city": ["Delhi", "Mumbai", "Singapore", "London"], "min_connect": [45, 30, 75, 45]})
flights = pd.DataFrame({"flight_id": [1, 2, 3, 4, 5, 6], "from_ap": ["DEL", "BOM", "BOM", "DEL", "SIN", "SIN"], "to_ap": ["BOM", "SIN", "SIN", "SIN", "LHR", "LHR"], "dep_min": [400, 600, 560, 300, 700, 660], "arr_min": [520, 900, 860, 640, 1300, 1260]})
itineraries = pd.DataFrame({"itin_id": [91, 92, 93, 94], "pax": ["Asha", "Ben", "Chitra", "Dev"], "leg1": [1, 1, 4, 4], "leg2": [2, 3, 5, 6]})`,
    ],
    sig: 'def solve(airports: pd.DataFrame, flights: pd.DataFrame, itineraries: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(airports, flights, itineraries):
    m = itineraries.merge(flights, left_on="leg1", right_on="flight_id")
    m = m.merge(flights, left_on="leg2", right_on="flight_id", suffixes=("_1", "_2"))
    m = m.merge(airports, left_on="to_ap_1", right_on="code")
    m["gap"] = m["dep_min_2"] - m["arr_min_1"]
    out = m[m["gap"] < m["min_connect"]]
    return out[["itin_id", "pax", "gap", "min_connect"]].reset_index(drop=True)`,
    wrong: [`def solve(airports, flights, itineraries):
    m = itineraries.merge(flights, left_on="leg1", right_on="flight_id")
    m = m.merge(flights, left_on="leg2", right_on="flight_id", suffixes=("_1", "_2"))
    m["gap"] = m["dep_min_2"] - m["arr_min_1"]
    out = m[m["gap"] < 45].copy()
    out["min_connect"] = 45
    return out[["itin_id", "pax", "gap", "min_connect"]].reset_index(drop=True)`],
    hints: ['Merge flights twice, once for each leg, and use suffixes to tell the two sets of columns apart.', 'The connecting airport is where the first leg lands.'],
    why: 'Two merges put both legs on one row, and the arriving leg\'s destination is the key into airports, which supplies the minimum for that row.',
    mistakes: 'A hard-coded 45 happens to match while every airport publishes the same number, and silently reports the wrong itineraries as soon as one differs.' },

  { t: 'Bought Again After a Refund', tags: ['merge', 'self merge', 'ordering'],
    story: 'Players can refund a purchase and buy the same item again later. The studio wants to know which items win a player back.',
    task: 'Return player and item for every pair where the player refunded a purchase of that item and then bought the same item again strictly after the refund. One row per pair.',
    setup: `players = pd.DataFrame({"player_id": [1, 2, 3], "player": ["Asha", "Ben", "Chitra"], "country": ["IN", "DE", "BR"]})
items = pd.DataFrame({"item_id": [50, 51, 52], "item": ["Skin: Comet", "Boost Pack", "Map: Dunes"], "price": [900, 300, 500]})
purchases = pd.DataFrame({
    "purchase_id": [1, 2, 3, 4, 5, 6],
    "player_id": [1, 1, 2, 2, 3, 3],
    "item_id": [50, 50, 51, 52, 52, 52],
    "day": ["2024-03-01", "2024-03-20", "2024-03-05", "2024-03-25", "2024-03-02", "2024-03-18"],
})
refunds = pd.DataFrame({"purchase_id": [1, 3, 5], "day": ["2024-03-03", "2024-03-08", "2024-03-04"]})`,
    hidden: [
      `players = pd.DataFrame({"player_id": [1, 2, 3], "player": ["Asha", "Ben", "Chitra"], "country": ["IN", "DE", "BR"]})
items = pd.DataFrame({"item_id": [50, 51, 52], "item": ["Skin: Comet", "Boost Pack", "Map: Dunes"], "price": [900, 300, 500]})
purchases = pd.DataFrame({"purchase_id": [1, 2, 3, 4, 5, 6], "player_id": [1, 1, 2, 2, 3, 3], "item_id": [50, 50, 51, 52, 52, 52], "day": ["2024-03-01", "2024-03-02", "2024-03-05", "2024-03-25", "2024-03-02", "2024-03-18"]})
refunds = pd.DataFrame({"purchase_id": [2, 3, 5], "day": ["2024-03-10", "2024-03-08", "2024-03-04"]})`,
      `players = pd.DataFrame({"player_id": [1, 2, 3], "player": ["Asha", "Ben", "Chitra"], "country": ["IN", "DE", "BR"]})
items = pd.DataFrame({"item_id": [50, 51, 52], "item": ["Skin: Comet", "Boost Pack", "Map: Dunes"], "price": [900, 300, 500]})
purchases = pd.DataFrame({"purchase_id": [1, 2, 3, 4, 5, 6, 7], "player_id": [1, 1, 2, 2, 3, 3, 2], "item_id": [50, 50, 51, 52, 52, 52, 51], "day": ["2024-03-01", "2024-03-20", "2024-03-05", "2024-03-25", "2024-03-02", "2024-03-18", "2024-03-20"]})
refunds = pd.DataFrame({"purchase_id": [1, 3, 5], "day": ["2024-03-25", "2024-03-08", "2024-03-19"]})`,
    ],
    sig: 'def solve(players: pd.DataFrame, items: pd.DataFrame, purchases: pd.DataFrame, refunds: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(players, items, purchases, refunds):
    r = refunds.merge(purchases, on="purchase_id", suffixes=("_r", "_p"))
    again = r.merge(purchases, on=["player_id", "item_id"], suffixes=("", "_again"))
    again = again[again["day"] > again["day_r"]]
    out = again.merge(players, on="player_id").merge(items, on="item_id")
    return out[["player", "item"]].drop_duplicates().reset_index(drop=True)`,
    wrong: [`def solve(players, items, purchases, refunds):
    r = refunds.merge(purchases, on="purchase_id", suffixes=("_r", "_p"))
    again = r.merge(purchases, on=["player_id", "item_id"], suffixes=("", "_again"))
    again = again[again["purchase_id_again"] != again["purchase_id"]]
    out = again.merge(players, on="player_id").merge(items, on="item_id")
    return out[["player", "item"]].drop_duplicates().reset_index(drop=True)`],
    hints: ['Start from the refund, attach the purchase it undid, then look for another purchase of the same item by the same player.', 'Watch the suffixes: you need the refund day and the later purchase day side by side.'],
    why: 'The refund row carries the date that matters, so the repurchase is matched on player and item and then filtered on the day being later.',
    mistakes: 'Accepting "any other purchase row" also counts a repurchase that happened before the refund, which is not winning anybody back.' },

  { t: 'Finished Every Lesson', tags: ['merge', 'nunique', 'duplicates'],
    story: 'A learning platform logs a row every time a student opens a lesson, so the same lesson can appear many times for one enrolment.',
    task: 'Return student and title for the enrolments that have viewed every lesson of their course.',
    setup: `courses = pd.DataFrame({"course_id": [1, 2], "title": ["Intro to SQL", "Statistics 101"]})
lessons = pd.DataFrame({"lesson_id": [10, 11, 12, 20, 21], "course_id": [1, 1, 1, 2, 2], "idx": [1, 2, 3, 1, 2]})
enrollments = pd.DataFrame({"enrollment_id": [900, 901, 902], "student": ["Asha", "Ben", "Chitra"], "course_id": [1, 1, 2]})
views = pd.DataFrame({
    "enrollment_id": [900, 900, 900, 901, 901, 902, 902],
    "lesson_id": [10, 11, 12, 10, 11, 20, 21],
})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1, 2], "title": ["Intro to SQL", "Statistics 101"]})
lessons = pd.DataFrame({"lesson_id": [10, 11, 12, 20, 21], "course_id": [1, 1, 1, 2, 2], "idx": [1, 2, 3, 1, 2]})
enrollments = pd.DataFrame({"enrollment_id": [900, 901, 902], "student": ["Asha", "Ben", "Chitra"], "course_id": [1, 1, 2]})
views = pd.DataFrame({"enrollment_id": [900, 900, 900, 901, 901, 902, 902], "lesson_id": [10, 11, 11, 10, 11, 20, 21]})`,
      `courses = pd.DataFrame({"course_id": [1, 2], "title": ["Intro to SQL", "Statistics 101"]})
lessons = pd.DataFrame({"lesson_id": [10, 11, 12, 20, 21], "course_id": [1, 1, 1, 2, 2], "idx": [1, 2, 3, 1, 2]})
enrollments = pd.DataFrame({"enrollment_id": [900, 901, 902], "student": ["Asha", "Ben", "Chitra"], "course_id": [1, 1, 2]})
views = pd.DataFrame({"enrollment_id": [900, 900, 900, 901, 901, 902], "lesson_id": [10, 11, 12, 10, 11, 20]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, lessons: pd.DataFrame, enrollments: pd.DataFrame, views: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, lessons, enrollments, views):
    seen = views.groupby("enrollment_id")["lesson_id"].nunique().rename("seen")
    need = lessons.groupby("course_id")["lesson_id"].size().rename("need")
    e = enrollments.merge(seen, on="enrollment_id", how="left").merge(need, on="course_id", how="left")
    e["seen"] = e["seen"].fillna(0)
    done = e[e["seen"] == e["need"]]
    out = done.merge(courses, on="course_id")
    return out[["student", "title"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, lessons, enrollments, views):
    seen = views.groupby("enrollment_id")["lesson_id"].size().rename("seen")
    need = lessons.groupby("course_id")["lesson_id"].size().rename("need")
    e = enrollments.merge(seen, on="enrollment_id", how="left").merge(need, on="course_id", how="left")
    e["seen"] = e["seen"].fillna(0)
    done = e[e["seen"] == e["need"]]
    out = done.merge(courses, on="course_id")
    return out[["student", "title"]].reset_index(drop=True)`],
    hints: ['Count the different lessons each enrolment has opened.', 'Compare that with the number of lessons its course has.'],
    why: 'nunique collapses the repeated views, so the comparison with the course size means "every lesson", not "enough clicks".',
    mistakes: 'Counting rows lets a student who re-watched one lesson look finished, and the count can even overshoot the lesson total.' },

  { t: 'Return on Ad Spend', tags: ['merge', 'groupby', 'double counting'],
    story: 'Every click costs money whether or not it leads to a sale, and one click can lead to more than one sale.',
    task: 'Return campaign and roas, (revenue - cost) / cost rounded to 2 decimals, for every campaign with at least one sale. Cost is every click of the campaign.',
    setup: `campaigns = pd.DataFrame({"campaign_id": [1, 2, 3], "campaign": ["Spring Shoes", "Winter Coats", "Summer Hats"], "budget": [5000, 4000, 2000]})
clicks = pd.DataFrame({"click_id": [10, 11, 12, 13, 14], "campaign_id": [1, 1, 2, 2, 3], "cost": [100, 150, 200, 50, 300]})
conversions = pd.DataFrame({"click_id": [10, 11, 12, 13], "revenue": [400, 300, 250, 100]})`,
    hidden: [
      `campaigns = pd.DataFrame({"campaign_id": [1, 2, 3], "campaign": ["Spring Shoes", "Winter Coats", "Summer Hats"], "budget": [5000, 4000, 2000]})
clicks = pd.DataFrame({"click_id": [10, 11, 12, 13, 14, 15], "campaign_id": [1, 1, 2, 2, 3, 1], "cost": [100, 150, 200, 50, 300, 250]})
conversions = pd.DataFrame({"click_id": [10, 11, 12, 13], "revenue": [400, 300, 250, 100]})`,
      `campaigns = pd.DataFrame({"campaign_id": [1, 2, 3], "campaign": ["Spring Shoes", "Winter Coats", "Summer Hats"], "budget": [5000, 4000, 2000]})
clicks = pd.DataFrame({"click_id": [10, 11, 12, 13, 14], "campaign_id": [1, 1, 2, 2, 3], "cost": [100, 150, 200, 50, 300]})
conversions = pd.DataFrame({"click_id": [10, 10, 11, 12, 13], "revenue": [400, 500, 300, 250, 100]})`,
    ],
    sig: 'def solve(campaigns: pd.DataFrame, clicks: pd.DataFrame, conversions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(campaigns, clicks, conversions):
    cost = clicks.groupby("campaign_id")["cost"].sum().rename("cost")
    rev = conversions.merge(clicks, on="click_id").groupby("campaign_id")["revenue"].sum().rename("revenue")
    m = campaigns.merge(cost, on="campaign_id").merge(rev, on="campaign_id")
    m["roas"] = ((m["revenue"] - m["cost"]) / m["cost"]).round(2)
    return m[["campaign", "roas"]].reset_index(drop=True)`,
    wrong: [`def solve(campaigns, clicks, conversions):
    m = clicks.merge(conversions, on="click_id").merge(campaigns, on="campaign_id")
    g = m.groupby("campaign", as_index=False).agg(cost=("cost", "sum"), revenue=("revenue", "sum"))
    g["roas"] = ((g["revenue"] - g["cost"]) / g["cost"]).round(2)
    return g[["campaign", "roas"]]`],
    hints: ['Cost and revenue are totalled over different sets of rows.', 'Aggregate each one separately, then put them side by side.'],
    why: 'Clicks give the cost, conversions joined to clicks give the revenue, and merging the two totals keeps each over its own rows.',
    mistakes: 'One merge of clicks and conversions drops the clicks that never converted and repeats a click once per sale, so the same cost is added twice.' },

  { t: 'No-Show Rate in a Date Window', tags: ['merge', 'groupby', 'filter'],
    story: 'A hospital reviews May 2024, from the 1st to the 31st, both days included. A specialty is only reported when it had at least 4 appointments inside that window.',
    task: 'Return specialty and rate (the no-show share inside the window, rounded to 2 decimals) for the specialties that qualify.',
    setup: `specialties = pd.DataFrame({"specialty_id": [1, 2, 3], "specialty": ["Cardiology", "Dermatology", "Oncology"]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9, 10], "specialty_id": [1, 1, 2, 3], "doctor": ["Rao", "Iyer", "Nair", "Das"]})
appointments = pd.DataFrame({
    "appt_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "doctor_id": [7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 7],
    "status": ["attended", "no_show", "attended", "no_show", "attended", "attended", "no_show", "attended", "no_show", "attended", "no_show", "attended"],
    "slot_date": ["2024-05-02", "2024-05-06", "2024-05-09", "2024-05-13", "2024-05-16", "2024-05-20", "2024-05-03", "2024-05-07", "2024-05-10", "2024-05-14", "2024-05-05", "2024-06-02"],
})`,
    hidden: [
      `specialties = pd.DataFrame({"specialty_id": [1, 2, 3], "specialty": ["Cardiology", "Dermatology", "Oncology"]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9, 10], "specialty_id": [1, 1, 2, 3], "doctor": ["Rao", "Iyer", "Nair", "Das"]})
appointments = pd.DataFrame({"appt_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "doctor_id": [7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 7], "status": ["attended", "no_show", "attended", "no_show", "attended", "no_show", "no_show", "attended", "no_show", "attended", "no_show", "attended"], "slot_date": ["2024-05-02", "2024-05-06", "2024-05-09", "2024-05-13", "2024-05-16", "2024-05-31", "2024-05-03", "2024-05-07", "2024-05-10", "2024-05-31", "2024-05-05", "2024-06-02"]})`,
      `specialties = pd.DataFrame({"specialty_id": [1, 2, 3], "specialty": ["Cardiology", "Dermatology", "Oncology"]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9, 10], "specialty_id": [1, 1, 2, 3], "doctor": ["Rao", "Iyer", "Nair", "Das"]})
appointments = pd.DataFrame({"appt_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "doctor_id": [7, 7, 7, 8, 8, 8, 9, 9, 9, 9, 10, 7], "status": ["attended", "no_show", "attended", "no_show", "attended", "attended", "no_show", "attended", "no_show", "attended", "no_show", "attended"], "slot_date": ["2024-05-02", "2024-05-06", "2024-05-09", "2024-04-30", "2024-06-01", "2024-05-20", "2024-05-03", "2024-05-07", "2024-05-10", "2024-05-14", "2024-05-05", "2024-06-02"]})`,
    ],
    sig: 'def solve(specialties: pd.DataFrame, doctors: pd.DataFrame, appointments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(specialties, doctors, appointments):
    a = appointments[appointments["slot_date"].between("2024-05-01", "2024-05-31")]
    m = a.merge(doctors, on="doctor_id").merge(specialties, on="specialty_id")
    g = m.groupby("specialty", as_index=False).agg(
        no_shows=("status", lambda s: int((s == "no_show").sum())),
        total=("status", "size"),
    )
    g = g[g["total"] >= 4]
    g["rate"] = (g["no_shows"] / g["total"]).round(2)
    return g[["specialty", "rate"]].reset_index(drop=True)`,
    wrong: [`def solve(specialties, doctors, appointments):
    a = appointments[(appointments["slot_date"] >= "2024-05-01") & (appointments["slot_date"] < "2024-05-31")]
    m = a.merge(doctors, on="doctor_id").merge(specialties, on="specialty_id")
    g = m.groupby("specialty", as_index=False).agg(
        no_shows=("status", lambda s: int((s == "no_show").sum())),
        total=("status", "size"),
    )
    g = g[g["total"] >= 4]
    g["rate"] = (g["no_shows"] / g["total"]).round(2)
    return g[["specialty", "rate"]].reset_index(drop=True)`],
    hints: ['Two doctors can share a specialty, so the window filter and the count of 4 both apply at the specialty level.', 'between() on ISO date strings includes both ends.'],
    why: 'Filtering before the merge keeps the window out of both the rate and the qualifying count, and the specialty-level grouping pools the doctors.',
    mistakes: 'Writing the upper bound as a strict less-than drops the last day of the month, which changes both the rate and which specialties reach 4.' },

  { t: 'Price in Effect at Order Time', tags: ['merge_asof', 'sorting', 'joins'], o: true,
    story: 'A shop records a new row every time a product\'s price changes. An order is billed at the price that was in effect on the day it was placed.',
    task: 'Return order_id, sku and revenue (quantity times the price in effect) for every order, ordered by order_id.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
price_history = pd.DataFrame({
    "product_id": [1, 2],
    "effective_day": [1, 1],
    "price": [100, 500],
})
orders = pd.DataFrame({
    "order_id": [900, 901, 902, 903],
    "product_id": [1, 2, 1, 2],
    "day": [5, 6, 12, 20],
    "qty": [2, 1, 3, 2],
})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
price_history = pd.DataFrame({"product_id": [1, 1, 2], "effective_day": [1, 10, 1], "price": [100, 150, 500]})
orders = pd.DataFrame({"order_id": [900, 901, 902, 903], "product_id": [1, 2, 1, 2], "day": [5, 6, 12, 20], "qty": [2, 1, 3, 2]})`,
      `products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
price_history = pd.DataFrame({"product_id": [1, 1, 2, 2], "effective_day": [1, 10, 1, 7], "price": [100, 150, 500, 400]})
orders = pd.DataFrame({"order_id": [900, 901, 902, 903], "product_id": [1, 2, 1, 2], "day": [5, 6, 12, 20], "qty": [2, 1, 3, 2]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, price_history: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, price_history, orders):
    o = orders.sort_values("day")
    p = price_history.sort_values("effective_day")
    m = pd.merge_asof(o, p, left_on="day", right_on="effective_day", by="product_id", direction="backward")
    m["revenue"] = m["qty"] * m["price"]
    out = m.merge(products, on="product_id").sort_values("order_id")
    return out[["order_id", "sku", "revenue"]].reset_index(drop=True)`,
    wrong: [`def solve(products, price_history, orders):
    latest = price_history.sort_values("effective_day").drop_duplicates("product_id", keep="last")
    m = orders.merge(latest, on="product_id")
    m["revenue"] = m["qty"] * m["price"]
    out = m.merge(products, on="product_id").sort_values("order_id")
    return out[["order_id", "sku", "revenue"]].reset_index(drop=True)`],
    hints: ['pd.merge_asof matches each row with the most recent earlier row of another frame, per key.', 'Both frames have to be sorted by the column being matched on.'],
    why: 'merge_asof with direction "backward" and by="product_id" picks the last price change on or before the order day, which is exactly the price in effect.',
    mistakes: 'Taking the current price per product bills old orders at today\'s price, which is right only while nothing has ever changed.' },
];
