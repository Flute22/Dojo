// Pandas, LeetCode-style set: Advanced. See medium.mjs for the format.
export default [
  { t: 'Merge Overlapping Bookings', tags: ['intervals', 'cummax', 'groupby'],
    story: 'A room can be booked for a range of days, both ends included. Bookings of the same room that overlap, or that start inside the merged range so far, must be combined into one block. Bookings on adjacent days (1-2 and 3-4) stay separate.',
    task: 'Return room, start_day and end_day of every merged block.',
    setup: `bookings = pd.DataFrame({
    "room": [1, 1, 1, 2],
    "start_day": [1, 2, 7, 4],
    "end_day": [3, 5, 9, 4],
})`,
    hidden: [`bookings = pd.DataFrame({
    "room": [1, 1, 1, 1],
    "start_day": [1, 2, 4, 12],
    "end_day": [10, 3, 5, 13],
})`, `bookings = pd.DataFrame({
    "room": [5, 5, 6, 6],
    "start_day": [1, 3, 2, 1],
    "end_day": [2, 4, 6, 3],
})`],
    sig: 'def solve(bookings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(bookings):
    b = bookings.sort_values(["room", "start_day", "end_day"]).copy()
    prev_max = b.groupby("room")["end_day"].transform(lambda s: s.cummax().shift())
    new = prev_max.isna() | (b["start_day"] > prev_max)
    b["grp"] = new.astype(int).groupby(b["room"]).cumsum()
    r = b.groupby(["room", "grp"], as_index=False).agg(start_day=("start_day", "min"), end_day=("end_day", "max"))
    return r[["room", "start_day", "end_day"]]`,
    wrong: [`def solve(bookings):
    b = bookings.sort_values(["room", "start_day", "end_day"]).copy()
    prev_end = b.groupby("room")["end_day"].shift()
    new = prev_end.isna() | (b["start_day"] > prev_end)
    b["grp"] = new.astype(int).groupby(b["room"]).cumsum()
    r = b.groupby(["room", "grp"], as_index=False).agg(start_day=("start_day", "min"), end_day=("end_day", "max"))
    return r[["room", "start_day", "end_day"]]`],
    hints: ['After sorting by start, a booking starts a new block only if it begins after the largest end seen so far.', 'The largest end so far is a shifted cumulative max.'],
    why: 'cummax tracks the furthest end reached by earlier bookings, shifted by one row to exclude the current one. A running count of block starts labels the blocks.',
    mistakes: 'Comparing only with the previous booking\'s end fails when a long booking covers several short ones.' },

  { t: 'Cohort Retention Matrix', tags: ['cohorts', 'month arithmetic', 'reindex'],
    story: 'Users belong to the cohort of the month they signed up. Growth wants to know how many users of each cohort were active exactly 0, 1 and 2 months after their signup month.',
    task: 'Return cohort, month_offset (0, 1, 2) and active_users (distinct users) for every cohort and every offset, with 0 when nobody was active. Order by cohort, then month_offset.',
    o: true,
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3], "signup_month": ["2024-01", "2024-01", "2024-02"]})
activity = pd.DataFrame({
    "user_id": [1, 1, 2, 2, 3, 3, 3],
    "active_month": ["2024-01", "2024-02", "2024-01", "2024-03", "2024-02", "2024-03", "2024-04"],
})`,
    hidden: [`users = pd.DataFrame({"user_id": [1, 2], "signup_month": ["2023-12", "2023-12"]})
activity = pd.DataFrame({
    "user_id": [1, 2, 1, 1],
    "active_month": ["2023-12", "2023-12", "2024-01", "2024-01"],
})`, `users = pd.DataFrame({"user_id": [1, 2, 3], "signup_month": ["2024-05", "2024-05", "2024-06"]})
activity = pd.DataFrame({
    "user_id": [1, 2, 3, 3],
    "active_month": ["2024-05", "2024-05", "2024-06", "2024-09"],
})`],
    sig: 'def solve(users: pd.DataFrame, activity: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, activity):
    def idx(s):
        return s.str[:4].astype(int) * 12 + s.str[5:7].astype(int)
    u = users.assign(si=idx(users["signup_month"]))
    a = activity.assign(ai=idx(activity["active_month"])).drop_duplicates(["user_id", "ai"])
    m = a.merge(u, on="user_id")
    m["offset"] = m["ai"] - m["si"]
    counts = m[m["offset"].between(0, 2)].groupby(["signup_month", "offset"])["user_id"].nunique()
    full = pd.MultiIndex.from_product([sorted(users["signup_month"].unique()), [0, 1, 2]], names=["cohort", "month_offset"])
    return counts.rename_axis(["cohort", "month_offset"]).reindex(full, fill_value=0).rename("active_users").reset_index()`,
    wrong: [`def solve(users, activity):
    def idx(s):
        return s.str[:4].astype(int) * 12 + s.str[5:7].astype(int)
    u = users.assign(si=idx(users["signup_month"]))
    a = activity.assign(ai=idx(activity["active_month"])).drop_duplicates(["user_id", "ai"])
    m = a.merge(u, on="user_id")
    m["month_offset"] = m["ai"] - m["si"]
    r = m[m["month_offset"].between(0, 2)].groupby(["signup_month", "month_offset"])["user_id"].nunique().rename("active_users").reset_index()
    return r.rename(columns={"signup_month": "cohort"})`],
    hints: ['Convert YYYY-MM to year * 12 + month so offsets work across years.', 'Reindex against all cohort x offset combinations to get the zero rows.'],
    why: 'A numeric month index makes "k months later" a subtraction. Reindexing against a product index restores empty cells.',
    mistakes: 'Without the reindex, offsets nobody reached are simply missing from the matrix.' },

  { t: 'Maximum Drawdown per Fund', tags: ['cummax', 'finance'],
    story: 'The drawdown of a fund on a day is how far its price is below the highest price it reached up to that day, as a fraction of that highest price.',
    task: 'Return fund and max_drawdown (the largest drawdown over time, rounded to 4 decimals), one row per fund.',
    setup: `prices = pd.DataFrame({
    "fund": ["A", "A", "A", "B", "B", "B"],
    "day": [1, 2, 3, 1, 2, 3],
    "price": [100, 80, 60, 10, 10, 10],
})`,
    hidden: [`prices = pd.DataFrame({
    "fund": ["C", "C", "C", "D"],
    "day": [1, 2, 3, 1],
    "price": [50, 100, 90, 40],
})`, `prices = pd.DataFrame({
    "fund": ["E", "E", "E", "E"],
    "day": [4, 3, 2, 1],
    "price": [60, 90, 120, 100],
})`],
    sig: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(prices):
    p = prices.sort_values(["fund", "day"]).copy()
    peak = p.groupby("fund")["price"].cummax()
    p["dd"] = (peak - p["price"]) / peak
    r = p.groupby("fund", as_index=False)["dd"].max()
    r["dd"] = r["dd"].round(4)
    return r.rename(columns={"dd": "max_drawdown"})`,
    wrong: [`def solve(prices):
    g = prices.groupby("fund")["price"]
    r = ((g.max() - g.min()) / g.max()).round(4).rename("max_drawdown").reset_index()
    return r`],
    hints: ['Sort by day first, then take a running maximum per fund.', 'The drawdown on a day is (peak - price) / peak.'],
    why: 'cummax gives the highest price so far on every day; the largest relative gap to it is the maximum drawdown.',
    mistakes: 'Using the overall max and min ignores which came first. A fund that only rises has a drawdown of 0, not a negative number.' },

  { t: 'Cheapest Routes with Cycles', tags: ['graphs', 'shortest path', 'loops'],
    story: 'Routes are one-way trips between nodes, each with a cost. The graph may contain cycles and several routes between the same nodes.',
    task: 'Return node and min_cost: the cheapest total cost from node "A" to every node reachable from "A" (A itself costs 0).',
    setup: `routes = pd.DataFrame({
    "src": ["A", "B", "A", "D"],
    "dst": ["B", "C", "D", "E"],
    "cost": [2, 3, 4, 1],
})`,
    hidden: [`routes = pd.DataFrame({
    "src": ["A", "B", "A"],
    "dst": ["B", "C", "C"],
    "cost": [2, 3, 9],
})`, `routes = pd.DataFrame({
    "src": ["A", "B", "B", "C", "Z"],
    "dst": ["B", "A", "C", "B", "Y"],
    "cost": [1, 1, 2, 5, 1],
})`],
    sig: 'def solve(routes: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(routes):
    dist = {"A": 0}
    for _ in range(len(routes) + 1):
        changed = False
        for s, d, c in zip(routes["src"], routes["dst"], routes["cost"]):
            if s in dist and dist[s] + c < dist.get(d, float("inf")):
                dist[d] = dist[s] + c
                changed = True
        if not changed:
            break
    keys = sorted(dist)
    return pd.DataFrame({"node": keys, "min_cost": [dist[k] for k in keys]})`,
    wrong: [`def solve(routes):
    dist, frontier = {"A": 0}, ["A"]
    while frontier:
        nxt = []
        for s in frontier:
            for d, c in zip(routes.loc[routes["src"] == s, "dst"], routes.loc[routes["src"] == s, "cost"]):
                if d not in dist:
                    dist[d] = dist[s] + c
                    nxt.append(d)
        frontier = nxt
    keys = sorted(dist)
    return pd.DataFrame({"node": keys, "min_cost": [dist[k] for k in keys]})`],
    hints: ['Keep a dictionary of the best known cost per node and relax every route repeatedly.', 'Stop when a full pass changes nothing; the loop count is bounded by the number of routes.'],
    why: 'Repeatedly relaxing every route (Bellman-Ford) converges to the cheapest cost even when cycles or cheaper multi-hop paths exist.',
    mistakes: 'A breadth-first search finds the fewest hops, which is not always the cheapest path.' },

  { t: 'Last-Touch Attribution', tags: ['merge_asof', 'time windows'],
    story: 'Marketing credits every purchase to the channel of the user\'s most recent touch strictly before the purchase and at most 7 days earlier. A purchase with no such touch is credited to "direct".',
    task: 'Return channel and purchases (the number of purchases credited to it). ts is a day number.',
    setup: `touches = pd.DataFrame({"user": [1, 2, 3], "ts": [1, 3, 2], "channel": ["email", "ads", "seo"]})
purchases = pd.DataFrame({"user": [1, 2, 3, 4], "ts": [4, 5, 5, 6]})`,
    hidden: [`touches = pd.DataFrame({"user": [1, 1, 1], "ts": [1, 3, 5], "channel": ["email", "ads", "seo"]})
purchases = pd.DataFrame({"user": [1], "ts": [6]})`, `touches = pd.DataFrame({"user": [1, 2], "ts": [10, 4], "channel": ["ads", "email"]})
purchases = pd.DataFrame({"user": [1, 2, 2], "ts": [8, 20, 8]})`],
    sig: 'def solve(touches: pd.DataFrame, purchases: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(touches, purchases):
    p = purchases.sort_values("ts")
    t = touches.sort_values("ts")
    m = pd.merge_asof(p, t, on="ts", by="user", direction="backward", tolerance=7, allow_exact_matches=False)
    m["channel"] = m["channel"].fillna("direct")
    return m.groupby("channel", as_index=False).size().rename(columns={"size": "purchases"})`,
    wrong: [`def solve(touches, purchases):
    p = purchases.sort_values("ts")
    t = touches.sort_values("ts")
    m = pd.merge_asof(p, t, on="ts", by="user", direction="backward", allow_exact_matches=False)
    m["channel"] = m["channel"].fillna("direct")
    return m.groupby("channel", as_index=False).size().rename(columns={"size": "purchases"})`],
    hints: ['pd.merge_asof matches each purchase with the nearest earlier touch of the same user.', 'tolerance limits how far back it may look; allow_exact_matches controls the strict "before".'],
    why: 'merge_asof does exactly "latest earlier row" per key, with tolerance for the 7-day window and allow_exact_matches=False for the strict comparison.',
    mistakes: 'Without tolerance an old touch is still credited. Both tables must be sorted by the time column.' },

  { t: 'Distinct Customers in a Rolling Week', tags: ['distinct', 'windows'],
    story: 'For each day that has orders, the dashboard shows how many different customers ordered during that day or the 6 days before it.',
    task: 'Return day and distinct_customers, ordered by day.',
    o: true,
    setup: `orders = pd.DataFrame({"customer": [1, 2, 3, 4, 5], "day": [1, 2, 3, 4, 5]})`,
    hidden: [`orders = pd.DataFrame({"customer": [1, 1, 1], "day": [1, 2, 3]})`, `orders = pd.DataFrame({"customer": [1, 1, 2, 2], "day": [5, 5, 5, 11]})`],
    sig: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders):
    rows = []
    for d in sorted(orders["day"].unique()):
        w = orders[(orders["day"] >= d - 6) & (orders["day"] <= d)]
        rows.append((int(d), w["customer"].nunique()))
    return pd.DataFrame(rows, columns=["day", "distinct_customers"])`,
    wrong: [`def solve(orders):
    daily = orders.groupby("day")["customer"].nunique()
    r = daily.rolling(7, min_periods=1).sum()
    return pd.DataFrame({"day": daily.index.to_numpy(), "distinct_customers": r.astype(int).to_numpy()})`],
    hints: ['Distinct counts cannot be added day by day.', 'For each day, look at the orders inside its 7-day window and count unique customers.'],
    why: 'Filtering the raw orders to the window and calling nunique counts every customer once, however many days they ordered.',
    mistakes: 'Summing the daily distinct counts counts a returning customer once per day. A rolling window over rows is not a window over days.' },

  { t: 'Overdraft Fees That Compound', tags: ['sequential state', 'loops'],
    story: 'Transactions hit an account in seq order from a balance of 0. Every transaction that leaves the balance negative also triggers an immediate fee of 10, even if the balance was already negative.',
    task: 'Return account and final_balance for every account.',
    setup: `txns = pd.DataFrame({
    "account": [1, 1, 1, 2, 2],
    "seq": [1, 2, 3, 1, 2],
    "amount": [50, -80, 100, 10, 20],
})`,
    hidden: [`txns = pd.DataFrame({
    "account": [2, 2, 2, 2],
    "seq": [1, 2, 3, 4],
    "amount": [10, -30, -5, 50],
})`, `txns = pd.DataFrame({
    "account": [3, 3, 4],
    "seq": [2, 1, 1],
    "amount": [5, -20, 5],
})`],
    sig: 'def solve(txns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(txns):
    rows = []
    for a, g in txns.sort_values(["account", "seq"]).groupby("account"):
        bal = 0
        for amt in g["amount"]:
            bal += amt
            if bal < 0:
                bal -= 10
        rows.append((a, bal))
    return pd.DataFrame(rows, columns=["account", "final_balance"])`,
    wrong: [`def solve(txns):
    rows = []
    for a, g in txns.sort_values(["account", "seq"]).groupby("account"):
        bal = 0
        for amt in g["amount"]:
            before = bal
            bal += amt
            if before >= 0 and bal < 0:
                bal -= 10
        rows.append((a, bal))
    return pd.DataFrame(rows, columns=["account", "final_balance"])`],
    hints: ['Each balance depends on the one before it, fee included, so a plain cumsum is not enough.', 'Process each account in seq order with a loop.'],
    why: 'The fee changes the starting point of every later step, so the balance has to be computed step by step.',
    mistakes: 'Charging the fee only when the balance first turns negative misses the later negative transactions.' },

  { t: 'Sessions and Longest Session', tags: ['sessionization', 'diff'],
    story: 'A new session starts for a user when more than 30 minutes passed since their previous event; exactly 30 minutes does not start one. A session\'s length is the time from its first to its last event.',
    task: 'Return user, sessions (count) and longest_minutes (length of the longest session) for every user.',
    setup: `events = pd.DataFrame({"user": [1, 1, 1, 1, 1, 2], "ts": [0, 10, 25, 70, 80, 5]})`,
    hidden: [`events = pd.DataFrame({"user": [1, 1, 1, 1], "ts": [0, 30, 60, 91]})`, `events = pd.DataFrame({"user": [7, 8, 7, 7], "ts": [100, 50, 1, 100]})`],
    sig: 'def solve(events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(events):
    e = events.sort_values(["user", "ts"]).reset_index(drop=True)
    gap = e.groupby("user")["ts"].diff()
    new = gap.isna() | (gap > 30)
    e["sid"] = new.astype(int).groupby(e["user"]).cumsum()
    s = e.groupby(["user", "sid"]).agg(length=("ts", lambda x: x.max() - x.min())).reset_index()
    return s.groupby("user", as_index=False).agg(sessions=("sid", "size"), longest_minutes=("length", "max"))`,
    wrong: [`def solve(events):
    e = events.sort_values(["user", "ts"]).reset_index(drop=True)
    gap = e.groupby("user")["ts"].diff()
    new = gap.isna() | (gap >= 30)
    e["sid"] = new.astype(int).groupby(e["user"]).cumsum()
    s = e.groupby(["user", "sid"]).agg(length=("ts", lambda x: x.max() - x.min())).reset_index()
    return s.groupby("user", as_index=False).agg(sessions=("sid", "size"), longest_minutes=("length", "max"))`],
    hints: ['Mark session starts with a per-user diff, then cumsum the flags.', 'Group by user and session to measure lengths.'],
    why: 'The first event of a user and every event after a long gap start a session. A cumulative sum of those flags is the session number.',
    mistakes: 'A gap of exactly 30 minutes still belongs to the same session. Unsorted events break diff().' },

  { t: 'Reactivated Customers', tags: ['month arithmetic', 'diff'],
    story: 'A customer is reactivated in a month when they order and their previous order month was at least 2 months earlier (they skipped a whole month). A customer can order several times in a month.',
    task: 'Return month (YYYY-MM) and reactivated (count of customers reactivated in that month) for every month with at least one, ordered by month.',
    o: true,
    setup: `orders = pd.DataFrame({
    "customer": [1, 1, 1, 2, 2, 3],
    "order_month": ["2024-01", "2024-02", "2024-05", "2024-01", "2024-03", "2024-04"],
})`,
    hidden: [`orders = pd.DataFrame({"customer": [1, 1], "order_month": ["2023-11", "2024-01"]})`, `orders = pd.DataFrame({
    "customer": [1, 1, 1, 2, 2],
    "order_month": ["2024-06", "2024-06", "2024-07", "2024-06", "2024-09"],
})`],
    sig: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders):
    m = orders.drop_duplicates().copy()
    m["mi"] = m["order_month"].str[:4].astype(int) * 12 + m["order_month"].str[5:7].astype(int)
    m = m.sort_values(["customer", "mi"])
    m["d"] = m.groupby("customer")["mi"].diff()
    r = m[m["d"] >= 2].groupby("order_month").size().rename("reactivated").reset_index()
    return r.rename(columns={"order_month": "month"}).sort_values("month").reset_index(drop=True)`,
    wrong: [`def solve(orders):
    m = orders.drop_duplicates().copy()
    m["mi"] = m["order_month"].str[5:7].astype(int)
    m = m.sort_values(["customer", "order_month"])
    m["d"] = m.groupby("customer")["mi"].diff()
    r = m[m["d"] >= 2].groupby("order_month").size().rename("reactivated").reset_index()
    return r.rename(columns={"order_month": "month"}).sort_values("month").reset_index(drop=True)`],
    hints: ['Turn YYYY-MM into one number that keeps counting across years.', 'Drop duplicate (customer, month) pairs before diffing.'],
    why: 'year * 12 + month makes a gap in months a plain subtraction, including across a year end.',
    mistakes: 'Using only the month number turns November to January into a difference of -10.' },

  { t: 'Third Business Day', tags: ['dates', 'numpy', 'calendar'],
    story: 'An order is due on the third business day after the day it was placed (the placement day itself does not count). Business days are Monday to Friday except the listed holidays. An order placed on a weekend or holiday counts from the next business day.',
    task: 'Return id and due_date for every order.',
    setup: `orders = pd.DataFrame({"id": [1, 2], "placed_on": pd.to_datetime(["2024-03-04", "2024-03-06"])})
holidays = pd.DataFrame({"day": pd.to_datetime(["2024-12-25"])})`,
    hidden: [`orders = pd.DataFrame({"id": [1, 2], "placed_on": pd.to_datetime(["2024-03-04", "2024-03-08"])})
holidays = pd.DataFrame({"day": pd.to_datetime(["2024-03-07"])})`, `orders = pd.DataFrame({"id": [1], "placed_on": pd.to_datetime(["2024-03-09"])})
holidays = pd.DataFrame({"day": pd.to_datetime(["2024-03-11"])})`],
    sig: 'def solve(orders: pd.DataFrame, holidays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders, holidays):
    hol = holidays["day"].values.astype("datetime64[D]")
    due = np.busday_offset(orders["placed_on"].values.astype("datetime64[D]"), 3, roll="backward", holidays=hol)
    return pd.DataFrame({"id": orders["id"], "due_date": pd.to_datetime(due)})`,
    wrong: [`def solve(orders, holidays):
    due = np.busday_offset(orders["placed_on"].values.astype("datetime64[D]"), 3, roll="backward")
    return pd.DataFrame({"id": orders["id"], "due_date": pd.to_datetime(due)})`],
    hints: ['NumPy has a business-day calendar: np.busday_offset.', 'roll="backward" moves a weekend or holiday back to the previous business day first, so counting forward starts from the next one.'],
    why: 'busday_offset counts only business days and skips the holidays you pass in.',
    mistakes: 'Adding 3 days (or even BDay(3) without the holiday list) ignores the holidays.' },

  { t: 'Weighted Item Rating', tags: ['aggregation', 'weighted mean'],
    story: 'Items with few ratings should not top the list on luck. The weighted rating is (v / (v + m)) * R + (m / (v + m)) * C, where v is the item\'s number of ratings, R its average score, C the average over every rating of every item, and m = 2.',
    task: 'Return item and wr rounded to 3 decimals, ordered by wr descending and then item.',
    o: true,
    setup: `ratings = pd.DataFrame({"item": ["A", "A", "B", "B", "B"], "score": [4, 4, 4, 4, 4]})`,
    hidden: [`ratings = pd.DataFrame({"item": ["A", "A", "B", "B", "B", "B", "C"], "score": [5, 5, 3, 3, 3, 3, 4]})`, `ratings = pd.DataFrame({"item": ["Z"], "score": [2]})`],
    sig: 'def solve(ratings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(ratings):
    c = ratings["score"].mean()
    g = ratings.groupby("item")["score"].agg(v="size", r="mean").reset_index()
    g["wr"] = ((g["v"] / (g["v"] + 2)) * g["r"] + (2 / (g["v"] + 2)) * c).round(3)
    return g.sort_values(["wr", "item"], ascending=[False, True])[["item", "wr"]].reset_index(drop=True)`,
    wrong: [`def solve(ratings):
    g = ratings.groupby("item")["score"].mean().round(3).rename("wr").reset_index()
    return g.sort_values(["wr", "item"], ascending=[False, True]).reset_index(drop=True)`],
    hints: ['C is one number for the whole table; v and R are per item.', 'Aggregate count and mean in one agg call.'],
    why: 'The formula pulls items with few ratings towards the global mean. Computing C once and v, R per item keeps the code short.',
    mistakes: 'A plain per-item average ignores how many ratings stand behind it.' },

  { t: 'No Skipped Week', tags: ['dedupe', 'weeks'],
    story: 'Days are numbered from 0 and a week is day // 7. A user is "steady" when they were active in every week between their first and last active week.',
    task: 'Return user for every steady user. A user active in a single week is steady.',
    setup: `activity = pd.DataFrame({"user": [1, 1, 1, 2, 2, 3], "day": [1, 8, 15, 1, 15, 3]})`,
    hidden: [`activity = pd.DataFrame({"user": [1, 1, 1], "day": [1, 2, 15]})`, `activity = pd.DataFrame({"user": [1, 1, 1, 1, 1, 1, 2, 2, 2], "day": [1, 5, 10, 17, 24, 30, 1, 8, 22]})`],
    sig: 'def solve(activity: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(activity):
    w = activity.assign(wk=activity["day"] // 7).drop_duplicates(["user", "wk"])
    g = w.groupby("user")["wk"].agg(["size", "min", "max"])
    ok = g[g["size"] == g["max"] - g["min"] + 1]
    return pd.DataFrame({"user": ok.index.to_numpy()})`,
    wrong: [`def solve(activity):
    wk = activity["day"] // 7
    g = wk.groupby(activity["user"]).agg(["size", "min", "max"])
    ok = g[g["size"] == g["max"] - g["min"] + 1]
    return pd.DataFrame({"user": ok.index.to_numpy()})`],
    hints: ['Count DISTINCT active weeks per user.', 'No skipped week means distinct weeks == last - first + 1.'],
    why: 'If every week in the span is present, the number of distinct weeks equals the span length.',
    mistakes: 'Counting raw rows lets several active days in one week hide a skipped week.' },

  { t: 'Understaffed Hours', tags: ['explode', 'intervals'],
    story: 'Shifts run from start_hour up to, but not including, end_hour. The need table says how many people each hour requires.',
    task: 'Return hour, staff (people on shift) and required for every hour in need where staff < required, including hours nobody covers.',
    setup: `shifts = pd.DataFrame({"emp": ["Ann", "Bo", "Cy"], "start_hour": [8, 9, 10], "end_hour": [12, 12, 12]})
need = pd.DataFrame({"hour": [8, 9, 10, 11], "required": [2, 2, 3, 4]})`,
    hidden: [`shifts = pd.DataFrame({"emp": ["Ann", "Bo"], "start_hour": [8, 8], "end_hour": [9, 10]})
need = pd.DataFrame({"hour": [8, 9, 10], "required": [2, 1, 1]})`, `shifts = pd.DataFrame({"emp": ["Di"], "start_hour": [9], "end_hour": [10]})
need = pd.DataFrame({"hour": [8, 9, 10], "required": [1, 1, 1]})`],
    sig: 'def solve(shifts: pd.DataFrame, need: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(shifts, need):
    h = shifts.assign(hour=[list(range(s, e)) for s, e in zip(shifts["start_hour"], shifts["end_hour"])]).explode("hour")
    h["hour"] = h["hour"].astype(int)
    staff = h.groupby("hour").size()
    n = need.copy()
    n["staff"] = n["hour"].map(staff).fillna(0).astype(int)
    return n.loc[n["staff"] < n["required"], ["hour", "staff", "required"]].reset_index(drop=True)`,
    wrong: [`def solve(shifts, need):
    n = need.copy()
    n["staff"] = n["hour"].map(lambda h: int((shifts["start_hour"] <= h).sum()))
    return n.loc[n["staff"] < n["required"], ["hour", "staff", "required"]].reset_index(drop=True)`],
    hints: ['Expand each shift into one row per hour it covers: range() plus explode().', 'Map the counts onto the need table and fill the hours nobody covers with 0.'],
    why: 'explode turns a list of hours into rows, so counting rows per hour gives the staff level.',
    mistakes: 'Counting only shift start hours ignores everyone who is already working.' },

  { t: 'Ordered Funnel Within an Hour', tags: ['funnel', 'merge', 'ordering'],
    story: 'A user reaches "carted" with a cart step at or after their first view and within 60 minutes of it. They reach "bought" with a buy step at or after that cart step and also within 60 minutes of the first view.',
    task: 'Return one row with viewed, carted and bought: the number of users that reached each stage (ts is a minute count).',
    setup: `steps = pd.DataFrame({
    "user": [1, 1, 1, 2, 2, 3],
    "step": ["view", "cart", "buy", "view", "cart", "view"],
    "ts": [0, 10, 30, 0, 5, 0],
})`,
    hidden: [`steps = pd.DataFrame({
    "user": [1, 1, 1, 2, 2, 2, 3, 3, 3],
    "step": ["view", "cart", "buy", "view", "buy", "cart", "cart", "view", "buy"],
    "ts": [0, 80, 90, 0, 10, 20, 5, 10, 20],
})`, `steps = pd.DataFrame({
    "user": [1, 1, 1, 1],
    "step": ["view", "view", "cart", "buy"],
    "ts": [0, 20, 50, 60],
})`],
    sig: 'def solve(steps: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(steps):
    v = steps[steps["step"] == "view"].groupby("user")["ts"].min().rename("t0")
    c = steps[steps["step"] == "cart"].merge(v, on="user")
    c = c[(c["ts"] >= c["t0"]) & (c["ts"] <= c["t0"] + 60)].groupby("user")["ts"].min().rename("t1")
    b = steps[steps["step"] == "buy"].merge(c.reset_index(), on="user").merge(v.reset_index(), on="user")
    b = b[(b["ts"] >= b["t1"]) & (b["ts"] <= b["t0"] + 60)]
    return pd.DataFrame({"viewed": [len(v)], "carted": [len(c)], "bought": [b["user"].nunique()]})`,
    wrong: [`def solve(steps):
    n = steps.groupby("step")["user"].nunique()
    return pd.DataFrame({"viewed": [n.get("view", 0)], "carted": [n.get("cart", 0)], "bought": [n.get("buy", 0)]})`],
    hints: ['Find each user\'s first view time first; it anchors the window.', 'Each stage is a merge with the previous stage, then a time filter.'],
    why: 'A funnel is a chain: each stage keeps only users who also satisfied the previous stage and its time rule.',
    mistakes: 'Counting users per step independently ignores both the order of the steps and the 60-minute window.' },

  { t: 'Top Decile Spenders', tags: ['rank', 'percentiles', 'ties'],
    story: 'A customer is in the top decile when the share of customers who spent at least as much as they did is at most 10%. Customers with equal spend are all in or all out.',
    task: 'Return id of every customer in the top decile.',
    setup: `customers = pd.DataFrame({"id": list(range(1, 11)), "spend": [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]})`,
    hidden: [`customers = pd.DataFrame({"id": list(range(1, 11)), "spend": [100, 100, 90, 80, 70, 60, 50, 40, 30, 20]})`, `customers = pd.DataFrame({"id": list(range(1, 21)), "spend": [(i + 1) * 5 for i in range(20)]})`],
    sig: 'def solve(customers: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers):
    share = customers["spend"].rank(pct=True, method="max", ascending=False)
    return customers.loc[share <= 0.1, ["id"]].reset_index(drop=True)`,
    wrong: [`def solve(customers):
    d = pd.qcut(customers["spend"].rank(method="first", ascending=False), 10, labels=False)
    return customers.loc[d == 0, ["id"]].reset_index(drop=True)`],
    hints: ['rank(pct=True) gives a fraction; method="max" gives tied rows the same, highest position.', 'Rank descending so the biggest spender gets the smallest fraction.'],
    why: 'With method="max" and ascending=False, the rank of a customer divided by n is exactly the share of customers spending at least as much.',
    mistakes: 'qcut or ntile splits ties arbitrarily; a tie across the 10% line must put both customers outside.' },

  { t: 'Team Size and Depth', tags: ['hierarchy', 'iteration', 'dict'],
    story: 'Every person reports to a manager (empty for the head of the company). For each person who manages somebody, directly or through others, HR wants the total number of people below them and the number of levels of the deepest chain below them.',
    task: 'Return id, team_size and max_depth for everybody with a team. A direct report is one level below.',
    setup: `org = pd.DataFrame({"id": [1, 2, 3, 4], "managerId": [np.nan, 1, 1, 1]})`,
    hidden: [`org = pd.DataFrame({"id": [1, 2, 3, 4, 5], "managerId": [np.nan, 1, 2, 3, 4]})`, `org = pd.DataFrame({"id": [1, 2, 3, 4, 5, 6], "managerId": [np.nan, 1, 1, 2, 2, 3]})`],
    sig: 'def solve(org: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(org):
    mgr = {int(i): (None if pd.isna(m) else int(m)) for i, m in zip(org["id"], org["managerId"])}
    size, depth = {}, {}
    for i in mgr:
        cur, d = mgr[i], 1
        while cur is not None:
            size[cur] = size.get(cur, 0) + 1
            depth[cur] = max(depth.get(cur, 0), d)
            cur, d = mgr.get(cur), d + 1
    ids = sorted(size)
    return pd.DataFrame({"id": ids, "team_size": [size[k] for k in ids], "max_depth": [depth[k] for k in ids]})`,
    wrong: [`def solve(org):
    c = org["managerId"].dropna().astype(int).value_counts().sort_index()
    return pd.DataFrame({"id": c.index.to_numpy(), "team_size": c.to_numpy(), "max_depth": 1})`],
    hints: ['Walk up from every person and credit every ancestor.', 'Track the largest distance seen for each ancestor.'],
    why: 'Each person adds 1 to the team size of every manager above them and updates how deep the longest chain below that manager is.',
    mistakes: 'Counting direct reports ignores people two or more levels down.' },

  { t: 'Leave Days per Month', tags: ['date_range', 'dedupe', 'months'],
    story: 'Each row is a period of leave from start_date to end_date, both days included. Periods of the same employee can overlap, and a day still counts once.',
    task: 'Return emp, month (YYYY-MM) and days: the number of leave days of each employee in each calendar month.',
    setup: `leaves = pd.DataFrame({
    "emp": [1, 2],
    "start_date": ["2024-03-29", "2024-05-05"],
    "end_date": ["2024-04-02", "2024-05-05"],
})`,
    hidden: [`leaves = pd.DataFrame({
    "emp": [1, 1],
    "start_date": ["2024-06-01", "2024-06-04"],
    "end_date": ["2024-06-05", "2024-06-08"],
})`, `leaves = pd.DataFrame({"emp": [3], "start_date": ["2023-12-30"], "end_date": ["2024-01-02"]})`],
    sig: 'def solve(leaves: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(leaves):
    rows = []
    for e, s, t in zip(leaves["emp"], leaves["start_date"], leaves["end_date"]):
        for d in pd.date_range(s, t):
            rows.append((e, d))
    d = pd.DataFrame(rows, columns=["emp", "day"]).drop_duplicates()
    d["month"] = d["day"].dt.strftime("%Y-%m")
    return d.groupby(["emp", "month"], as_index=False).size().rename(columns={"size": "days"})`,
    wrong: [`def solve(leaves):
    rows = []
    for e, s, t in zip(leaves["emp"], leaves["start_date"], leaves["end_date"]):
        for d in pd.date_range(s, t):
            rows.append((e, d))
    d = pd.DataFrame(rows, columns=["emp", "day"])
    d["month"] = d["day"].dt.strftime("%Y-%m")
    return d.groupby(["emp", "month"], as_index=False).size().rename(columns={"size": "days"})`],
    hints: ['Expand every leave period into one row per day with pd.date_range.', 'Drop duplicate (emp, day) rows before counting.'],
    why: 'One row per employee and calendar day makes overlaps visible as duplicates, which drop_duplicates removes.',
    mistakes: 'Subtracting dates per row double counts overlapping periods and mishandles periods that cross a month end.' },

  { t: 'Second Chance Applicants', tags: ['merge', 'dates', 'first row'],
    story: 'Recruiters look for candidates whose earliest application was rejected and who were then accepted for a different job within 90 days after that application (the same day does not count, day 90 does).',
    task: 'Return candidate for every such person.',
    setup: `applications = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "candidate": [1, 1, 2, 3],
    "job": [10, 11, 10, 12],
    "applied_on": pd.to_datetime(["2024-01-01", "2024-02-01", "2024-01-05", "2024-01-10"]),
    "status": ["rejected", "accepted", "accepted", "rejected"],
})`,
    hidden: [`applications = pd.DataFrame({
    "id": [1, 2, 3],
    "candidate": [4, 4, 4],
    "job": [10, 11, 12],
    "applied_on": pd.to_datetime(["2024-01-01", "2024-01-20", "2024-02-10"]),
    "status": ["accepted", "rejected", "accepted"],
})`, `applications = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "candidate": [5, 5, 6, 6],
    "job": [1, 2, 1, 2],
    "applied_on": pd.to_datetime(["2024-01-01", "2024-03-31", "2024-01-01", "2024-04-01"]),
    "status": ["rejected", "accepted", "rejected", "accepted"],
})`],
    sig: 'def solve(applications: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(applications):
    a = applications.sort_values(["candidate", "applied_on", "id"])
    first = a.drop_duplicates("candidate")
    first = first[first["status"] == "rejected"]
    m = first.merge(a[a["status"] == "accepted"], on="candidate", suffixes=("_f", "_a"))
    days = (m["applied_on_a"] - m["applied_on_f"]).dt.days
    ok = m[(m["job_f"] != m["job_a"]) & days.between(1, 90)]
    return ok[["candidate"]].drop_duplicates().reset_index(drop=True)`,
    wrong: [`def solve(applications):
    r = applications[applications["status"] == "rejected"]
    m = r.merge(applications[applications["status"] == "accepted"], on="candidate", suffixes=("_f", "_a"))
    days = (m["applied_on_a"] - m["applied_on_f"]).dt.days
    ok = m[(m["job_f"] != m["job_a"]) & days.between(1, 90)]
    return ok[["candidate"]].drop_duplicates().reset_index(drop=True)`],
    hints: ['Keep only each candidate\'s earliest application first.', 'Subtract the dates and use .dt.days with between(1, 90).'],
    why: 'Sorting and drop_duplicates picks the first application; the merge pairs it with that candidate\'s accepted applications for the date and job test.',
    mistakes: 'Using any rejection (not the earliest one) accepts candidates who were rejected after an earlier acceptance.' },

  { t: 'Gap Since the Previous Alert', tags: ['diff', 'filter order'],
    story: 'Monitoring wants to know, for each high-severity alert, how many minutes passed since the previous alert of any severity.',
    task: 'Return id and minutes_since_prev for every "high" alert, ordered by id. The very first alert overall has no previous alert: use a missing value.',
    o: true,
    setup: `alerts = pd.DataFrame({"id": [1, 2, 3], "ts": [10, 25, 40], "severity": ["high", "high", "high"]})`,
    hidden: [`alerts = pd.DataFrame({"id": [1, 2, 3, 4], "ts": [5, 8, 20, 22], "severity": ["low", "high", "low", "high"]})`, `alerts = pd.DataFrame({"id": [1, 2, 3], "ts": [10, 10, 10], "severity": ["high", "low", "high"]})`],
    sig: 'def solve(alerts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(alerts):
    a = alerts.sort_values(["ts", "id"]).copy()
    a["minutes_since_prev"] = a["ts"].diff()
    return a.loc[a["severity"] == "high", ["id", "minutes_since_prev"]].sort_values("id").reset_index(drop=True)`,
    wrong: [`def solve(alerts):
    a = alerts[alerts["severity"] == "high"].sort_values(["ts", "id"]).copy()
    a["minutes_since_prev"] = a["ts"].diff()
    return a[["id", "minutes_since_prev"]].sort_values("id").reset_index(drop=True)`],
    hints: ['Compute the gap on the full table, then filter.', 'Filtering first removes the alerts that should be the "previous" ones.'],
    why: 'diff() must see every alert in order, so the severity filter comes after it.',
    mistakes: 'Filtering before diff() compares each high alert with the previous high alert only.' },

  { t: 'Fulfilment Buckets', tags: ['np.select', 'null dates', 'zero rows'],
    story: 'An order that shipped within 2 days of being placed shipped on time, later is shipped late. An order not shipped yet is open: overdue if placed more than 2 days before 2024-06-30, otherwise ok.',
    task: 'Return bucket and orders for all four buckets: "shipped on time", "shipped late", "open overdue", "open ok", with 0 when a bucket is empty.',
    setup: `orders = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "placed_on": ["2024-06-01", "2024-06-01", "2024-06-20", "2024-06-29"],
    "shipped_on": ["2024-06-02", "2024-06-10", None, None],
})`,
    hidden: [`orders = pd.DataFrame({"id": [1, 2], "placed_on": ["2024-06-01", "2024-06-05"], "shipped_on": ["2024-06-01", "2024-06-07"]})`, `orders = pd.DataFrame({"id": [1, 2], "placed_on": ["2024-06-28", "2024-06-27"], "shipped_on": [None, None]})`],
    sig: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders):
    p = pd.to_datetime(orders["placed_on"])
    s = pd.to_datetime(orders["shipped_on"])
    today = pd.Timestamp("2024-06-30")
    bucket = np.select(
        [s.notna() & ((s - p).dt.days <= 2), s.notna(), (today - p).dt.days > 2],
        ["shipped on time", "shipped late", "open overdue"],
        "open ok",
    )
    names = ["shipped on time", "shipped late", "open overdue", "open ok"]
    counts = pd.Series(bucket).value_counts().reindex(names, fill_value=0)
    return pd.DataFrame({"bucket": names, "orders": counts.to_numpy()})`,
    wrong: [`def solve(orders):
    p = pd.to_datetime(orders["placed_on"])
    s = pd.to_datetime(orders["shipped_on"])
    today = pd.Timestamp("2024-06-30")
    bucket = np.select(
        [s.notna() & ((s - p).dt.days <= 2), s.notna(), (today - p).dt.days > 2],
        ["shipped on time", "shipped late", "open overdue"],
        "open ok",
    )
    return pd.Series(bucket).value_counts().rename_axis("bucket").reset_index(name="orders")`],
    hints: ['np.select checks conditions in order, so test shipped_on.notna() before comparing dates.', 'Reindex the counts against the four bucket names.'],
    why: 'np.select assigns each order the first matching bucket; reindexing the counts adds the empty buckets with 0.',
    mistakes: 'value_counts() omits empty buckets. A NaT shipped date compared with a number is False, so order the conditions carefully.' },

  { t: 'First Day Out of Stock', tags: ['cumsum', 'groupby', 'first match'],
    story: 'Stock moves are recorded per product and day: positive quantities arrive, negative ones leave. Warehouses want the first day each product\'s stock dropped below zero.',
    task: 'Return product and first_negative_day for every product whose running stock was ever below zero. Moves are processed in day order.',
    setup: `moves = pd.DataFrame({
    "product": ["p1", "p1", "p1", "p2", "p2"],
    "day": [1, 2, 3, 1, 2],
    "qty": [10, -4, -9, 5, 5],
})`,
    hidden: [`moves = pd.DataFrame({
    "product": ["p1", "p1", "p1", "p1"],
    "day": [4, 1, 2, 3],
    "qty": [20, -5, -10, 3],
})`, `moves = pd.DataFrame({
    "product": ["a", "a", "b", "b"],
    "day": [1, 2, 1, 2],
    "qty": [-1, 5, 5, -6],
})`],
    sig: 'def solve(moves: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(moves):
    m = moves.sort_values(["product", "day"]).copy()
    m["stock"] = m.groupby("product")["qty"].cumsum()
    neg = m[m["stock"] < 0]
    return neg.groupby("product", as_index=False)["day"].min().rename(columns={"day": "first_negative_day"})`,
    wrong: [`def solve(moves):
    m = moves.sort_values(["product", "day"])
    tot = m.groupby("product").agg(total=("qty", "sum"), last=("day", "max")).reset_index()
    return tot.loc[tot["total"] < 0, ["product", "last"]].rename(columns={"last": "first_negative_day"}).reset_index(drop=True)`],
    hints: ['A running total per product needs the moves in day order.', 'The first negative day is the minimum day among the negative-stock rows.'],
    why: 'cumsum per product gives the stock after each move; filtering negatives and taking each product\'s earliest day answers the question.',
    mistakes: 'The final stock says nothing about a dip in the middle that was later repaid.' },

  { t: 'Running Distinct Users', tags: ['first seen', 'cumsum'],
    story: 'A product team tracks how many different users have ever been seen up to each day: every user counts from their first day on.',
    task: 'Return day, new_users (users seen for the first time that day) and total_users (distinct users up to and including that day) for every day in the table, ordered by day.',
    o: true,
    setup: `events = pd.DataFrame({"user": ["a", "b", "c", "d"], "day": [1, 1, 2, 3]})`,
    hidden: [`events = pd.DataFrame({"user": ["a", "a", "b", "a", "b"], "day": [1, 2, 2, 3, 3]})`, `events = pd.DataFrame({"user": ["x", "y", "x", "y"], "day": [5, 5, 7, 9]})`],
    sig: 'def solve(events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(events):
    first = events.groupby("user")["day"].min()
    new = first.value_counts()
    out = pd.DataFrame({"day": sorted(events["day"].unique())})
    out["new_users"] = out["day"].map(new).fillna(0).astype(int)
    out["total_users"] = out["new_users"].cumsum()
    return out`,
    wrong: [`def solve(events):
    daily = events.groupby("day")["user"].nunique()
    out = pd.DataFrame({"day": daily.index.to_numpy(), "new_users": events.groupby("user")["day"].min().value_counts().reindex(daily.index, fill_value=0).to_numpy()})
    out["total_users"] = daily.cumsum().to_numpy()
    return out`],
    hints: ['A user is new on the minimum day they appear.', 'The running total is a cumsum of the new-user counts, not of the daily distinct counts.'],
    why: 'Counting users by first-seen day and taking a cumulative sum yields the number of distinct users so far.',
    mistakes: 'Summing daily distinct counts counts returning users on every day they appear.' },

  { t: 'Gaps Between Jobs', tags: ['dates', 'shift', 'groupby'],
    story: 'A hiring audit looks at employees who had a break of more than 30 days between the end of one job and the start of the next one.',
    task: 'Return emp, gap_start (the previous job\'s end_date), gap_end (the next job\'s start_date) and gap_days for every gap above 30 days, ordered by emp and gap_start.',
    o: true,
    setup: `jobs = pd.DataFrame({
    "emp": ["a", "a", "b", "b"],
    "start_date": pd.to_datetime(["2020-01-01", "2020-06-01", "2020-03-01", "2020-04-01"]),
    "end_date": pd.to_datetime(["2020-03-31", "2020-12-31", "2020-03-20", "2020-09-01"]),
})`,
    hidden: [`jobs = pd.DataFrame({
    "emp": ["a", "b", "b"],
    "start_date": pd.to_datetime(["2020-01-01", "2021-01-01", "2021-03-15"]),
    "end_date": pd.to_datetime(["2020-02-01", "2021-03-01", "2021-12-31"]),
})`, `jobs = pd.DataFrame({
    "emp": ["c", "c", "c"],
    "start_date": pd.to_datetime(["2019-01-01", "2019-06-01", "2020-06-01"]),
    "end_date": pd.to_datetime(["2019-05-01", "2019-12-31", "2020-12-31"]),
})`],
    sig: 'def solve(jobs: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(jobs):
    j = jobs.sort_values(["emp", "start_date"]).copy()
    j["gap_start"] = j.groupby("emp")["end_date"].shift()
    j["gap_end"] = j["start_date"]
    j["gap_days"] = (j["gap_end"] - j["gap_start"]).dt.days
    r = j[j["gap_days"] > 30]
    return r[["emp", "gap_start", "gap_end", "gap_days"]].sort_values(["emp", "gap_start"]).reset_index(drop=True)`,
    wrong: [`def solve(jobs):
    j = jobs.sort_values(["emp", "start_date"]).copy()
    j["gap_start"] = j["end_date"].shift()
    j["gap_end"] = j["start_date"]
    j["gap_days"] = (j["gap_end"] - j["gap_start"]).dt.days
    r = j[j["gap_days"] > 30]
    return r[["emp", "gap_start", "gap_end", "gap_days"]].sort_values(["emp", "gap_start"]).reset_index(drop=True)`],
    hints: ['Shift the end dates down by one row inside each employee, not across the whole table.', 'Date differences have a .dt.days accessor.'],
    why: 'groupby("emp")["end_date"].shift() puts each job next to the previous job of the same employee.',
    mistakes: 'A plain shift() pairs an employee\'s first job with the last job of the previous employee.' },

  { t: 'The 80% Revenue Products', tags: ['cumsum', 'pareto', 'groupby'],
    story: 'Each month, a few products bring most of the money. The Pareto list contains the best-selling products, in order, until their revenue reaches 80% of the month\'s total, including the product that crosses the line.',
    task: 'Return month, product and revenue for every product on each month\'s Pareto list. No two products of a month have the same revenue.',
    setup: `sales = pd.DataFrame({
    "month": ["2024-01"] * 3 + ["2024-02"] * 2,
    "product": ["a", "b", "c", "d", "e"],
    "revenue": [50, 30, 20, 80, 20],
})`,
    hidden: [`sales = pd.DataFrame({
    "month": ["2024-03"] * 4,
    "product": ["a", "b", "c", "d"],
    "revenue": [10, 50, 20, 20 + 0],
})`, `sales = pd.DataFrame({
    "month": ["2024-04", "2024-04", "2024-04", "2024-05"],
    "product": ["a", "b", "c", "d"],
    "revenue": [85, 10, 5, 70],
})`],
    sig: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sales):
    s = sales.sort_values(["month", "revenue"], ascending=[True, False]).copy()
    total = s.groupby("month")["revenue"].transform("sum")
    before = s.groupby("month")["revenue"].cumsum() - s["revenue"]
    return s.loc[before < 0.8 * total, ["month", "product", "revenue"]].reset_index(drop=True)`,
    wrong: [`def solve(sales):
    s = sales.sort_values(["month", "revenue"], ascending=[True, False]).copy()
    total = s.groupby("month")["revenue"].transform("sum")
    cum = s.groupby("month")["revenue"].cumsum()
    return s.loc[cum <= 0.8 * total, ["month", "product", "revenue"]].reset_index(drop=True)`],
    hints: ['Sort by revenue within each month, then use a cumulative sum.', 'Keep a product when the revenue accumulated BEFORE it is still below 80%.'],
    why: 'Comparing the cumulative sum before a product with the 80% line keeps the product that crosses it, which is the one that completes the 80%.',
    mistakes: 'cumsum <= 80% drops the product that pushes the total over the line, so the list stops short of 80%.' },

  { t: 'Possible Duplicate Charges', tags: ['self merge', 'time windows'],
    story: 'A card processor suspects a duplicate when the same account is charged the same amount twice within 24 hours (1440 minutes), whatever happened in between.',
    task: 'Return id (each once) of every charge that is part of at least one such pair.',
    setup: `charges = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "account": ["A", "A", "A", "B"],
    "amount": [50, 50, 20, 50],
    "ts": [0, 100, 5000, 10],
})`,
    hidden: [`charges = pd.DataFrame({
    "id": [1, 2, 3],
    "account": ["A", "A", "A"],
    "amount": [50, 20, 50],
    "ts": [0, 100, 200],
})`, `charges = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "account": ["C", "C", "C", "D"],
    "amount": [9, 9, 9, 9],
    "ts": [0, 1440, 2880, 0],
})`],
    sig: 'def solve(charges: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(charges):
    m = charges.merge(charges, on=["account", "amount"], suffixes=("_x", "_y"))
    m = m[(m["id_x"] < m["id_y"]) & ((m["ts_y"] - m["ts_x"]).abs() <= 1440)]
    ids = pd.concat([m["id_x"], m["id_y"]]).drop_duplicates().sort_values()
    return pd.DataFrame({"id": ids.to_numpy()})`,
    wrong: [`def solve(charges):
    c = charges.sort_values(["account", "ts"]).reset_index(drop=True)
    same = (c["account"] == c["account"].shift()) & (c["amount"] == c["amount"].shift()) & ((c["ts"] - c["ts"].shift()) <= 1440)
    flagged = c.loc[same | same.shift(-1, fill_value=False), "id"].sort_values()
    return pd.DataFrame({"id": flagged.to_numpy()})`],
    hints: ['Merge the table with itself on account and amount, then compare the timestamps.', 'Keep pairs once with id_x < id_y and collect the ids from both sides.'],
    why: 'A self merge on the equality keys lists all candidate pairs; the time filter and concatenating both sides gives every involved charge.',
    mistakes: 'Comparing only consecutive rows misses a duplicate pair that has a different charge between them.' },
];
