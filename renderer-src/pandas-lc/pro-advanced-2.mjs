// Pandas, interview-grade set: Advanced, batch 2.
export default [
  { t: 'Longest Referral Chain', tags: ['graphs', 'recursion', 'depth'],
    story: 'A member can invite others, who can invite others again. Growth wants to know how deep the chains go.',
    task: 'Return campaign, member and depth for every member who invited at least one person, where depth is the longest chain of invitations below them.',
    setup: `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Launch", "Summer"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4, 5], "campaign_id": [1, 1, 1, 2, 2], "member": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
referrals = pd.DataFrame({"referrer_id": [1, 4], "invitee_id": [2, 5]})`,
    hidden: [
      `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Launch", "Summer"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4, 5], "campaign_id": [1, 1, 1, 2, 2], "member": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
referrals = pd.DataFrame({"referrer_id": [1, 2, 3, 4], "invitee_id": [2, 3, 4, 5]})`,
      `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Launch", "Summer"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4, 5], "campaign_id": [1, 1, 1, 2, 2], "member": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
referrals = pd.DataFrame({"referrer_id": [1, 2, 4], "invitee_id": [2, 3, 5]})`,
    ],
    sig: 'def solve(campaigns: pd.DataFrame, users: pd.DataFrame, referrals: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(campaigns, users, referrals):
    kids = {}
    for a, b in zip(referrals["referrer_id"], referrals["invitee_id"]):
        kids.setdefault(a, []).append(b)
    memo = {}
    def depth(n):
        if n not in memo:
            memo[n] = 0 if n not in kids else 1 + max(depth(k) for k in kids[n])
        return memo[n]
    rows = [(n, depth(n)) for n in kids]
    d = pd.DataFrame(rows, columns=["user_id", "depth"])
    out = d.merge(users, on="user_id").merge(campaigns, on="campaign_id")
    return out[["campaign", "member", "depth"]].reset_index(drop=True)`,
    wrong: [`def solve(campaigns, users, referrals):
    g = referrals.groupby("referrer_id", as_index=False).size().rename(columns={"size": "depth", "referrer_id": "user_id"})
    out = g.merge(users, on="user_id").merge(campaigns, on="campaign_id")
    return out[["campaign", "member", "depth"]].reset_index(drop=True)`],
    hints: ['Walk down the invitations from each member.', 'A memo keeps the recursion cheap.'],
    why: 'The depth below a member is one more than the deepest of their invitees, which only recursion reaches.',
    mistakes: 'Counting direct invitations measures width, which agrees only when nobody invites two people.' },

  { t: 'Fewest Changes Between Stations', tags: ['graphs', 'search', 'penalty'],
    story: 'Each edge belongs to a line. Changing line costs a passenger one interchange.',
    task: 'Return request_id, from_station, to_station, changes and stops: the smallest number of interchanges, and the stops on a journey that achieves it.',
    setup: `lines = pd.DataFrame({"line_id": [1, 2], "line": ["Blue", "Red"]})
stations = pd.DataFrame({"station_id": [1, 2, 3, 4], "station": ["Harbour", "Market", "Museum", "Airport"]})
edges = pd.DataFrame({"from_id": [1, 2, 3, 1], "to_id": [2, 3, 4, 4], "line_id": [1, 1, 1, 2]})
requests = pd.DataFrame({"request_id": [1], "from_id": [1], "to_id": [4]})`,
    hidden: [
      `lines = pd.DataFrame({"line_id": [1, 2], "line": ["Blue", "Red"]})
stations = pd.DataFrame({"station_id": [1, 2, 3, 4], "station": ["Harbour", "Market", "Museum", "Airport"]})
edges = pd.DataFrame({"from_id": [1, 2, 3], "to_id": [2, 3, 4], "line_id": [1, 1, 2]})
requests = pd.DataFrame({"request_id": [1], "from_id": [1], "to_id": [4]})`,
      `lines = pd.DataFrame({"line_id": [1, 2], "line": ["Blue", "Red"]})
stations = pd.DataFrame({"station_id": [1, 2, 3, 4], "station": ["Harbour", "Market", "Museum", "Airport"]})
edges = pd.DataFrame({"from_id": [1, 2, 3, 1], "to_id": [2, 3, 4, 4], "line_id": [1, 2, 1, 2]})
requests = pd.DataFrame({"request_id": [1], "from_id": [1], "to_id": [3]})`,
    ],
    sig: 'def solve(lines: pd.DataFrame, stations: pd.DataFrame, edges: pd.DataFrame, requests: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(lines, stations, edges, requests):
    e = list(zip(edges["from_id"], edges["to_id"], edges["line_id"]))
    rows = []
    for _, rq in requests.iterrows():
        best = None
        stack = [(rq["from_id"], -1, 0, 0, (rq["from_id"],))]
        while stack:
            at, line, stops, changes, seen = stack.pop()
            if at == rq["to_id"] and stops > 0:
                cand = (changes, stops)
                best = cand if best is None else min(best, cand)
            for f, t, l in e:
                if f != at or t in seen:
                    continue
                cost = 0 if line in (-1, l) else 1
                stack.append((t, l, stops + 1, changes + cost, seen + (t,)))
        name = dict(zip(stations["station_id"], stations["station"]))
        rows.append((rq["request_id"], name[rq["from_id"]], name[rq["to_id"]], best[0], best[1]))
    return pd.DataFrame(rows, columns=["request_id", "from_station", "to_station", "changes", "stops"])`,
    wrong: [`def solve(lines, stations, edges, requests):
    e = list(zip(edges["from_id"], edges["to_id"], edges["line_id"]))
    rows = []
    for _, rq in requests.iterrows():
        best = None
        stack = [(rq["from_id"], 0, (rq["from_id"],))]
        while stack:
            at, stops, seen = stack.pop()
            if at == rq["to_id"] and stops > 0:
                best = stops if best is None else min(best, stops)
            for f, t, l in e:
                if f != at or t in seen:
                    continue
                stack.append((t, stops + 1, seen + (t,)))
        name = dict(zip(stations["station_id"], stations["station"]))
        rows.append((rq["request_id"], name[rq["from_id"]], name[rq["to_id"]], 0, best))
    return pd.DataFrame(rows, columns=["request_id", "from_station", "to_station", "changes", "stops"])`],
    hints: ['Carry the line you are on, and add one when the next edge is on another line.', 'Compare journeys by changes first, then by stops.'],
    why: 'The cost of an edge depends on how you arrived, so the line has to travel with the partial journey.',
    mistakes: 'Counting only stops answers a different question and reports no interchanges at all.' },

  { t: 'Allocate Stock by Order Priority', tags: ['cumsum', 'allocation', 'clip'],
    story: 'Stock is handed out in priority order, 1 first. An order takes everything it asks for if enough is left, otherwise whatever remains.',
    task: 'Return order_id, priority, qty and allocated for every order.',
    setup: `products = pd.DataFrame({"product_id": [1], "sku": ["LAMP-01"]})
stock = pd.DataFrame({"product_id": [1], "on_hand": [10]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "product_id": [1, 1, 1], "priority": [1, 2, 3], "qty": [4, 3, 3]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1], "sku": ["LAMP-01"]})
stock = pd.DataFrame({"product_id": [1], "on_hand": [10]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "product_id": [1, 1, 1], "priority": [1, 2, 3], "qty": [4, 5, 3]})`,
      `products = pd.DataFrame({"product_id": [1], "sku": ["LAMP-01"]})
stock = pd.DataFrame({"product_id": [1], "on_hand": [6]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "product_id": [1, 1, 1], "priority": [1, 2, 3], "qty": [4, 3, 3]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, stock: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, stock, orders):
    o = orders.merge(stock, on="product_id").sort_values(["product_id", "priority"]).copy()
    o["before"] = o.groupby("product_id")["qty"].cumsum() - o["qty"]
    left = (o["on_hand"] - o["before"]).clip(lower=0)
    o["allocated"] = np.minimum(o["qty"], left).astype(int)
    return o[["order_id", "priority", "qty", "allocated"]].reset_index(drop=True)`,
    wrong: [`def solve(products, stock, orders):
    o = orders.merge(stock, on="product_id").copy()
    total = o.groupby("product_id")["qty"].transform("sum")
    share = (o["on_hand"] * o["qty"] / total).astype(int)
    o["allocated"] = np.minimum(o["qty"], share).astype(int)
    return o[["order_id", "priority", "qty", "allocated"]].reset_index(drop=True)`],
    hints: ['How much was promised to the higher priorities already? A running total answers that.', 'Clip what is left at zero.'],
    why: 'A cumulative sum that excludes the current order says how much stock is left when its turn comes.',
    mistakes: 'Splitting the stock in proportion gives everybody a little, which is not what priority means.' },

  { t: 'Longest Run of Profitable Days', tags: ['groupby', 'gaps and islands', 'cumcount'],
    story: 'A day is profitable when the trades booked on it add up to more than zero. A trader can book several trades in a day.',
    task: 'Return holder and longest_run: the longest stretch of consecutive profitable days.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "holder": ["Asha", "Ben"]})
days = pd.DataFrame({"day": [1, 2, 3, 4, 5]})
trades = pd.DataFrame({
    "trade_id": list(range(1, 11)),
    "account_id": [1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
    "day": [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
    "pnl": [50, 30, -20, 10, 40, -10, 20, 30, 40, -5],
})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "holder": ["Asha", "Ben"]})
days = pd.DataFrame({"day": [1, 2, 3, 4, 5]})
trades = pd.DataFrame({"trade_id": list(range(1, 11)), "account_id": [1, 1, 1, 1, 1, 2, 2, 2, 2, 2], "day": [1, 2, 3, 4, 5, 1, 2, 3, 4, 5], "pnl": [50, 30, 20, 10, 40, -10, 20, -30, 40, -5]})`,
      `accounts = pd.DataFrame({"account_id": [1, 2], "holder": ["Asha", "Ben"]})
days = pd.DataFrame({"day": [1, 2, 3, 4, 5]})
trades = pd.DataFrame({"trade_id": list(range(1, 11)), "account_id": [1, 1, 1, 1, 1, 2, 2, 2, 2, 2], "day": [1, 1, 2, 3, 4, 1, 2, 3, 4, 5], "pnl": [50, -60, 30, 10, 40, 10, 20, 30, 40, 50]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, days: pd.DataFrame, trades: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, days, trades):
    d = trades.groupby(["account_id", "day"], as_index=False)["pnl"].sum()
    p = d[d["pnl"] > 0].sort_values(["account_id", "day"]).copy()
    p["grp"] = p["day"] - p.groupby("account_id").cumcount()
    r = p.groupby(["account_id", "grp"], as_index=False).size()
    g = r.groupby("account_id", as_index=False)["size"].max().rename(columns={"size": "longest_run"})
    out = g.merge(accounts, on="account_id")
    return out[["holder", "longest_run"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, days, trades):
    p = trades[trades["pnl"] > 0].sort_values(["account_id", "day"]).copy()
    p["grp"] = p["day"] - p.groupby("account_id").cumcount()
    r = p.groupby(["account_id", "grp"], as_index=False).size()
    g = r.groupby("account_id", as_index=False)["size"].max().rename(columns={"size": "longest_run"})
    out = g.merge(accounts, on="account_id")
    return out[["holder", "longest_run"]].reset_index(drop=True)`],
    hints: ['Total the trades per day before judging the day.', 'Day minus a running count is constant inside a run.'],
    why: 'A day with a win and a bigger loss is a losing day, which only shows after the daily totals.',
    mistakes: 'Judging individual trades can even count one day twice.' },

  { t: 'Salary Cost Under Each Manager', tags: ['recursion', 'hierarchy', 'rollup'],
    story: 'A manager carries the cost of everybody below them, however many levels down.',
    task: 'Return name and cost: the total salary of the organisation below each manager, not counting their own. Managers with nobody below them are left out.',
    setup: `org = pd.DataFrame({"employee_id": [1, 2, 3, 4], "manager_id": [np.nan, 1, 1, 1]})
employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"]})
salaries = pd.DataFrame({"employee_id": [1, 2, 3, 4], "amount": [200, 150, 120, 90]})`,
    hidden: [
      `org = pd.DataFrame({"employee_id": [1, 2, 3, 4], "manager_id": [np.nan, 1, 2, 3]})
employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"]})
salaries = pd.DataFrame({"employee_id": [1, 2, 3, 4], "amount": [200, 150, 120, 90]})`,
      `org = pd.DataFrame({"employee_id": [1, 2, 3, 4], "manager_id": [np.nan, 1, 1, 1]})
employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"]})
salaries = pd.DataFrame({"employee_id": [1, 2, 3, 4], "amount": [200, 150, 120, 400]})`,
    ],
    sig: 'def solve(org: pd.DataFrame, employees: pd.DataFrame, salaries: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(org, employees, salaries):
    mgr = {int(e): (None if pd.isna(m) else int(m)) for e, m in zip(org["employee_id"], org["manager_id"])}
    pay = dict(zip(salaries["employee_id"], salaries["amount"]))
    cost = {}
    for e in mgr:
        cur = mgr[e]
        while cur is not None:
            cost[cur] = cost.get(cur, 0) + pay.get(e, 0)
            cur = mgr.get(cur)
    rows = [(k, v) for k, v in cost.items()]
    c = pd.DataFrame(rows, columns=["employee_id", "cost"])
    out = c.merge(employees, on="employee_id")
    return out[["name", "cost"]].reset_index(drop=True)`,
    wrong: [`def solve(org, employees, salaries):
    m = org.dropna(subset=["manager_id"]).merge(salaries, on="employee_id")
    m["manager_id"] = m["manager_id"].astype(int)
    g = m.groupby("manager_id", as_index=False)["amount"].sum().rename(columns={"amount": "cost", "manager_id": "employee_id"})
    out = g.merge(employees, on="employee_id")
    return out[["name", "cost"]].reset_index(drop=True)`],
    hints: ['Walk up from every employee and credit every manager above them.', 'A dictionary of manager links makes each step cheap.'],
    why: 'Each employee adds their salary to every manager in the chain above, which is what a roll-up means.',
    mistakes: 'Summing the direct reports agrees only in a flat organisation.' },

  { t: 'Uncovered Minutes After Merging Shifts', tags: ['interval merging', 'cummax', 'groupby'],
    story: 'Shifts at a site can overlap, and the site is only staffed while at least one shift covers the minute.',
    task: 'Return site and uncovered: the minutes between opening and closing with nobody on duty.',
    setup: `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"], "open_min": [0, 0], "close_min": [600, 600]})
staff = pd.DataFrame({"staff_id": [10, 11, 12], "staff": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "site_id": [1, 1, 2, 2], "staff_id": [10, 11, 12, 10], "start_min": [0, 300, 0, 400], "end_min": [300, 600, 200, 600]})`,
    hidden: [
      `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"], "open_min": [0, 0], "close_min": [600, 600]})
staff = pd.DataFrame({"staff_id": [10, 11, 12], "staff": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "site_id": [1, 1, 2, 2], "staff_id": [10, 11, 12, 10], "start_min": [0, 200, 0, 400], "end_min": [300, 600, 200, 600]})`,
      `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"], "open_min": [0, 0], "close_min": [600, 600]})
staff = pd.DataFrame({"staff_id": [10, 11, 12], "staff": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "site_id": [1, 1, 2, 2], "staff_id": [10, 11, 12, 10], "start_min": [0, 300, 0, 100], "end_min": [100, 600, 600, 200]})`,
    ],
    sig: 'def solve(sites: pd.DataFrame, staff: pd.DataFrame, shifts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sites, staff, shifts):
    s = shifts.sort_values(["site_id", "start_min", "end_min"]).copy()
    s["pm"] = s.groupby("site_id")["end_min"].transform(lambda x: x.cummax().shift())
    s["new"] = s["pm"].isna() | (s["start_min"] > s["pm"])
    s["grp"] = s.groupby("site_id")["new"].cumsum()
    m = s.groupby(["site_id", "grp"], as_index=False).agg(a=("start_min", "min"), b=("end_min", "max"))
    m["covered"] = m["b"] - m["a"]
    g = m.groupby("site_id", as_index=False)["covered"].sum()
    out = g.merge(sites, on="site_id")
    out["uncovered"] = (out["close_min"] - out["open_min"] - out["covered"]).astype(int)
    return out[["site", "uncovered"]].reset_index(drop=True)`,
    wrong: [`def solve(sites, staff, shifts):
    s = shifts.copy()
    s["covered"] = s["end_min"] - s["start_min"]
    g = s.groupby("site_id", as_index=False)["covered"].sum()
    out = g.merge(sites, on="site_id")
    out["uncovered"] = (out["close_min"] - out["open_min"] - out["covered"]).astype(int)
    return out[["site", "uncovered"]].reset_index(drop=True)`],
    hints: ['Merge the shifts into stretches before subtracting anything.', 'A shifted cumulative maximum says how far cover already reached.'],
    why: 'The running maximum of the earlier ends decides whether a shift extends the stretch or starts a new one.',
    mistakes: 'Adding the raw shift lengths counts an overlap twice and can report negative gaps.' },

  { t: 'Cumulative Revenue per Cohort Month', tags: ['cross merge', 'cumulative', 'groupby'], o: true,
    story: 'Payments are recorded by how many months after signup they arrived.',
    task: 'Return month, month_offset and revenue_to_date for every cohort and offsets 0, 1 and 2, ordered by month then month_offset.',
    setup: `cohorts = pd.DataFrame({"month": ["2024-01"], "label": ["January"]})
customers = pd.DataFrame({"customer_id": [1, 2], "month": ["2024-01", "2024-01"]})
payments = pd.DataFrame({"customer_id": [1, 1, 2], "month_offset": [0, 1, 0], "amount": [100, 100, 200]})`,
    hidden: [
      `cohorts = pd.DataFrame({"month": ["2024-01"], "label": ["January"]})
customers = pd.DataFrame({"customer_id": [1, 2], "month": ["2024-01", "2024-01"]})
payments = pd.DataFrame({"customer_id": [1, 1, 2], "month_offset": [0, 2, 0], "amount": [100, 300, 200]})`,
      `cohorts = pd.DataFrame({"month": ["2024-01", "2024-02"], "label": ["January", "February"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "month": ["2024-01", "2024-01", "2024-02"]})
payments = pd.DataFrame({"customer_id": [1, 1, 2, 3, 3], "month_offset": [0, 1, 0, 0, 1], "amount": [100, 100, 200, 50, 60]})`,
    ],
    sig: 'def solve(cohorts: pd.DataFrame, customers: pd.DataFrame, payments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(cohorts, customers, payments):
    p = payments.merge(customers, on="customer_id")
    grid = cohorts[["month"]].merge(pd.DataFrame({"month_offset": [0, 1, 2]}), how="cross")
    rows = []
    for _, g in grid.iterrows():
        inside = p[(p["month"] == g["month"]) & (p["month_offset"] <= g["month_offset"])]
        rows.append((g["month"], g["month_offset"], int(inside["amount"].sum())))
    r = pd.DataFrame(rows, columns=["month", "month_offset", "revenue_to_date"])
    return r.sort_values(["month", "month_offset"]).reset_index(drop=True)`,
    wrong: [`def solve(cohorts, customers, payments):
    p = payments.merge(customers, on="customer_id")
    grid = cohorts[["month"]].merge(pd.DataFrame({"month_offset": [0, 1, 2]}), how="cross")
    rows = []
    for _, g in grid.iterrows():
        inside = p[p["month_offset"] <= g["month_offset"]]
        rows.append((g["month"], g["month_offset"], int(inside["amount"].sum())))
    r = pd.DataFrame(rows, columns=["month", "month_offset", "revenue_to_date"])
    return r.sort_values(["month", "month_offset"]).reset_index(drop=True)`],
    hints: ['Cross the cohorts with the offsets, then total everything up to that offset.', 'The cohort filter matters as soon as there is more than one.'],
    why: 'The cross product gives a complete triangle and the subtotal reaches back over the earlier offsets.',
    mistakes: 'Forgetting the cohort filter mixes every cohort into every row.' },

  { t: 'Greedy Delivery Route Cost', tags: ['greedy', 'loops', 'graphs'],
    story: 'A van leaves the depot and always drives to the nearest stop it has not visited yet, until every stop is done. It does not return to the depot.',
    task: 'Return one row with km: the total kilometres of that route.',
    setup: `depots = pd.DataFrame({"depot_id": [1], "depot": ["Depot A"]})
stops = pd.DataFrame({"stop_id": [10, 11, 12], "stop": ["Alpha", "Beta", "Gamma"]})
distances = pd.DataFrame({
    "from_id": [1, 1, 1, 10, 10, 11, 11, 12, 12, 10, 11, 12],
    "to_id": [10, 11, 12, 11, 12, 12, 10, 10, 11, 1, 1, 1],
    "km": [5, 9, 12, 4, 8, 3, 4, 8, 3, 5, 9, 12],
})`,
    hidden: [
      `depots = pd.DataFrame({"depot_id": [1], "depot": ["Depot A"]})
stops = pd.DataFrame({"stop_id": [10, 11, 12], "stop": ["Alpha", "Beta", "Gamma"]})
distances = pd.DataFrame({"from_id": [1, 1, 1, 10, 10, 11, 11, 12, 12, 10, 11, 12], "to_id": [10, 11, 12, 11, 12, 12, 10, 10, 11, 1, 1, 1], "km": [5, 2, 12, 4, 8, 3, 4, 8, 3, 5, 2, 12]})`,
      `depots = pd.DataFrame({"depot_id": [1], "depot": ["Depot A"]})
stops = pd.DataFrame({"stop_id": [10, 11, 12], "stop": ["Alpha", "Beta", "Gamma"]})
distances = pd.DataFrame({"from_id": [1, 1, 1, 10, 10, 11, 11, 12, 12, 10, 11, 12], "to_id": [10, 11, 12, 11, 12, 12, 10, 10, 11, 1, 1, 1], "km": [5, 9, 1, 4, 8, 3, 4, 8, 3, 5, 9, 1]})`,
    ],
    sig: 'def solve(depots: pd.DataFrame, stops: pd.DataFrame, distances: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(depots, stops, distances):
    d = {}
    for a, b, km in zip(distances["from_id"], distances["to_id"], distances["km"]):
        d[(a, b)] = km
    todo = set(stops["stop_id"])
    at = 1
    total = 0
    while todo:
        nxt = min(todo, key=lambda s: d[(at, s)])
        total += d[(at, nxt)]
        todo.remove(nxt)
        at = nxt
    return pd.DataFrame({"km": [total]})`,
    wrong: [`def solve(depots, stops, distances):
    d = {}
    for a, b, km in zip(distances["from_id"], distances["to_id"], distances["km"]):
        d[(a, b)] = km
    order = sorted(stops["stop_id"], key=lambda s: d[(1, s)])
    total = d[(1, order[0])]
    for a, b in zip(order, order[1:]):
        total += d[(a, b)]
    return pd.DataFrame({"km": [total]})`],
    hints: ['The next stop is the nearest to where you are now, not to the depot.', 'Keep a set of stops still to visit.'],
    why: 'The greedy rule looks at the distances from the current stop, which changes after every leg.',
    mistakes: 'Visiting the stops in order of their distance from the depot is a different route.' },

  { t: 'Balance With Monthly Interest', tags: ['running state', 'loops', 'merge'], o: true,
    story: 'Interest is added at the end of each month on the balance after that month\'s movements, and it earns interest itself the month after.',
    task: 'Return month and closing (rounded to 2 decimals), ordered by month.',
    setup: `accounts = pd.DataFrame({"account_id": [1], "holder": ["Asha"], "rate_id": [1]})
rates = pd.DataFrame({"rate_id": [1], "rate_name": ["Saver"], "monthly_rate": [0.0]})
movements = pd.DataFrame({"account_id": [1, 1, 1], "month": [1, 2, 3], "amount": [1000, 500, -200]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1], "holder": ["Asha"], "rate_id": [1]})
rates = pd.DataFrame({"rate_id": [1], "rate_name": ["Saver"], "monthly_rate": [0.1]})
movements = pd.DataFrame({"account_id": [1, 1, 1], "month": [1, 2, 3], "amount": [1000, 500, -200]})`,
      `accounts = pd.DataFrame({"account_id": [1], "holder": ["Asha"], "rate_id": [1]})
rates = pd.DataFrame({"rate_id": [1], "rate_name": ["Saver"], "monthly_rate": [0.5]})
movements = pd.DataFrame({"account_id": [1, 1, 1], "month": [1, 2, 3], "amount": [1000, -500, 200]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, rates: pd.DataFrame, movements: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, rates, movements):
    rate = float(accounts.merge(rates, on="rate_id")["monthly_rate"].iloc[0])
    m = movements.sort_values("month")
    bal = 0.0
    rows = []
    for month, amount in zip(m["month"], m["amount"]):
        bal = (bal + amount) * (1 + rate)
        rows.append((month, round(bal, 2)))
    return pd.DataFrame(rows, columns=["month", "closing"])`,
    wrong: [`def solve(accounts, rates, movements):
    rate = float(accounts.merge(rates, on="rate_id")["monthly_rate"].iloc[0])
    m = movements.sort_values("month").copy()
    m["closing"] = (m["amount"].cumsum() * (1 + rate)).round(2)
    return m[["month", "closing"]].reset_index(drop=True)`],
    hints: ['Each closing balance depends on the one before it, interest included.', 'A plain running total cannot compound.'],
    why: 'Carrying the balance forward and applying the rate each month is what compounding means.',
    mistakes: 'Applying the rate once to the running total charges a single month of interest on everything.' },

  { t: 'Longest Dry Spell per Store', tags: ['cross merge', 'gaps and islands', 'calendar'],
    story: 'A dry spell is a stretch of calendar days with no sale at all, between the first and the last day of the calendar.',
    task: 'Return store and longest_dry: the longest dry spell in days. A store that sold something every day reports 0.',
    setup: `stores = pd.DataFrame({"store_id": [1, 2], "store": ["Harbour Shop", "Hill Shop"]})
calendar = pd.DataFrame({"day": [1, 2, 3, 4, 5, 6]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6], "store_id": [1, 1, 1, 2, 2, 2], "day": [1, 4, 6, 1, 2, 6], "amount": [100, 200, 150, 90, 80, 70]})`,
    hidden: [
      `stores = pd.DataFrame({"store_id": [1, 2], "store": ["Harbour Shop", "Hill Shop"]})
calendar = pd.DataFrame({"day": [1, 2, 3, 4, 5, 6]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6], "store_id": [1, 1, 1, 2, 2, 2], "day": [1, 2, 3, 1, 5, 6], "amount": [100, 200, 150, 90, 80, 70]})`,
      `stores = pd.DataFrame({"store_id": [1, 2], "store": ["Harbour Shop", "Hill Shop"]})
calendar = pd.DataFrame({"day": [1, 2, 3, 4, 5, 6]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6], "store_id": [1, 1, 2, 2, 2, 2], "day": [3, 4, 1, 2, 3, 4], "amount": [100, 200, 90, 80, 70, 60]})`,
    ],
    sig: 'def solve(stores: pd.DataFrame, calendar: pd.DataFrame, sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(stores, calendar, sales):
    grid = stores[["store_id"]].merge(calendar, how="cross")
    sold = set(zip(sales["store_id"], sales["day"]))
    grid["sold"] = [(s, d) in sold for s, d in zip(grid["store_id"], grid["day"])]
    grid = grid.sort_values(["store_id", "day"])
    grid["grp"] = grid.groupby("store_id")["sold"].cumsum()
    dry = grid[~grid["sold"]]
    runs = dry.groupby(["store_id", "grp"], as_index=False).size()
    g = runs.groupby("store_id", as_index=False)["size"].max().rename(columns={"size": "longest_dry"})
    out = stores.merge(g, on="store_id", how="left")
    out["longest_dry"] = out["longest_dry"].fillna(0).astype(int)
    return out[["store", "longest_dry"]].reset_index(drop=True)`,
    wrong: [`def solve(stores, calendar, sales):
    s = sales.sort_values(["store_id", "day"]).copy()
    s["gap"] = s.groupby("store_id")["day"].diff() - 1
    g = s.groupby("store_id", as_index=False)["gap"].max().rename(columns={"gap": "longest_dry"})
    out = stores.merge(g, on="store_id", how="left")
    out["longest_dry"] = out["longest_dry"].fillna(0).astype(int)
    return out[["store", "longest_dry"]].reset_index(drop=True)`],
    hints: ['Build every store-day pair, mark the ones with a sale, then measure the runs of blanks.', 'A running count of selling days labels each dry run.'],
    why: 'The full grid exposes a dry spell at the end of the calendar as well as between two sales.',
    mistakes: 'The gap between two sale days misses a store that stopped selling before the calendar ended.' },

  { t: 'Install Order for Packages', tags: ['recursion', 'dag', 'merge'], o: true,
    story: 'A package can only be installed once everything it needs is installed. Its level is one more than the deepest package it needs.',
    task: 'Return repo, package and level for every package, ordered by level then package. Packages that need nothing are level 0.',
    setup: `repos = pd.DataFrame({"repo_id": [1, 2], "repo": ["main", "contrib"]})
packages = pd.DataFrame({"package_id": [1, 2, 3, 4], "repo_id": [1, 1, 1, 2], "package": ["app", "ui", "core", "utils"]})
deps = pd.DataFrame({"package_id": [1, 2, 3], "needs_id": [2, 3, 4]})`,
    hidden: [
      `repos = pd.DataFrame({"repo_id": [1, 2], "repo": ["main", "contrib"]})
packages = pd.DataFrame({"package_id": [1, 2, 3, 4], "repo_id": [1, 1, 1, 2], "package": ["app", "ui", "core", "utils"]})
deps = pd.DataFrame({"package_id": [1, 1, 2, 3], "needs_id": [2, 3, 3, 4]})`,
      `repos = pd.DataFrame({"repo_id": [1, 2], "repo": ["main", "contrib"]})
packages = pd.DataFrame({"package_id": [1, 2, 3, 4], "repo_id": [1, 1, 1, 2], "package": ["app", "ui", "core", "utils"]})
deps = pd.DataFrame({"package_id": [1, 2, 3], "needs_id": [2, 4, 4]})`,
    ],
    sig: 'def solve(repos: pd.DataFrame, packages: pd.DataFrame, deps: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(repos, packages, deps):
    needs = {}
    for p, n in zip(deps["package_id"], deps["needs_id"]):
        needs.setdefault(p, []).append(n)
    memo = {}
    def level(p):
        if p not in memo:
            memo[p] = 0 if p not in needs else 1 + max(level(n) for n in needs[p])
        return memo[p]
    rows = [(int(p), level(int(p))) for p in packages["package_id"]]
    l = pd.DataFrame(rows, columns=["package_id", "level"])
    out = l.merge(packages, on="package_id").merge(repos, on="repo_id")
    return out.sort_values(["level", "package"])[["repo", "package", "level"]].reset_index(drop=True)`,
    wrong: [`def solve(repos, packages, deps):
    needs = {}
    for p, n in zip(deps["package_id"], deps["needs_id"]):
        needs.setdefault(p, []).append(n)
    memo = {}
    def level(p):
        if p not in memo:
            memo[p] = 0 if p not in needs else 1 + min(level(n) for n in needs[p])
        return memo[p]
    rows = [(int(p), level(int(p))) for p in packages["package_id"]]
    l = pd.DataFrame(rows, columns=["package_id", "level"])
    out = l.merge(packages, on="package_id").merge(repos, on="repo_id")
    return out.sort_values(["level", "package"])[["repo", "package", "level"]].reset_index(drop=True)`],
    hints: ['A package reached by two paths has to wait for the longer one.', 'Take the maximum over what it needs.'],
    why: 'The deepest requirement decides when a package can be installed.',
    mistakes: 'Taking the shallowest one schedules a package before something it needs.' },

  { t: 'Patient Journey Through Departments', tags: ['shift', 'open interval', 'merge'], o: true,
    story: 'A transfer records the minute the patient arrived in a department. They stay until the next transfer, and the last department is still ongoing at minute 300.',
    task: 'Return patient, department, at_min and minutes for every leg, ordered by at_min.',
    setup: `departments = pd.DataFrame({"department_id": [1, 2, 3], "department": ["Emergency", "Imaging", "Ward"]})
patients = pd.DataFrame({"patient_id": [1], "patient": ["Asha"]})
transfers = pd.DataFrame({"transfer_id": [1, 2, 3], "patient_id": [1, 1, 1], "department_id": [1, 2, 3], "at_min": [0, 60, 150]})`,
    hidden: [
      `departments = pd.DataFrame({"department_id": [1, 2, 3], "department": ["Emergency", "Imaging", "Ward"]})
patients = pd.DataFrame({"patient_id": [1], "patient": ["Asha"]})
transfers = pd.DataFrame({"transfer_id": [1, 2, 3, 4], "patient_id": [1, 1, 1, 1], "department_id": [1, 2, 1, 3], "at_min": [0, 30, 90, 200]})`,
      `departments = pd.DataFrame({"department_id": [1, 2, 3], "department": ["Emergency", "Imaging", "Ward"]})
patients = pd.DataFrame({"patient_id": [1, 2], "patient": ["Asha", "Ben"]})
transfers = pd.DataFrame({"transfer_id": [1, 2, 3, 4], "patient_id": [1, 1, 2, 2], "department_id": [1, 2, 1, 3], "at_min": [0, 60, 100, 200]})`,
    ],
    sig: 'def solve(departments: pd.DataFrame, patients: pd.DataFrame, transfers: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(departments, patients, transfers):
    t = transfers.sort_values(["patient_id", "at_min"]).copy()
    t["next"] = t.groupby("patient_id")["at_min"].shift(-1).fillna(300)
    t["minutes"] = (t["next"] - t["at_min"]).astype(int)
    out = t.merge(patients, on="patient_id").merge(departments, on="department_id")
    return out.sort_values("at_min")[["patient", "department", "at_min", "minutes"]].reset_index(drop=True)`,
    wrong: [`def solve(departments, patients, transfers):
    t = transfers.sort_values("at_min").copy()
    t["next"] = t["at_min"].shift(-1).fillna(300)
    t["minutes"] = (t["next"] - t["at_min"]).astype(int)
    out = t.merge(patients, on="patient_id").merge(departments, on="department_id")
    return out.sort_values("at_min")[["patient", "department", "at_min", "minutes"]].reset_index(drop=True)`],
    hints: ['The next transfer is the next one for that patient.', 'Group before shifting, and close the last leg at 300.'],
    why: 'Shifting inside the patient keeps one journey from borrowing another patient\'s arrival.',
    mistakes: 'A plain shift over the whole frame mixes two patients as soon as there are two.' },

  { t: 'Units Sold by Price Band', tags: ['buckets', 'loops', 'merge'], o: true,
    story: 'Products are grouped by their shelf price into bands.',
    task: 'Return label and units for every price band, ordered by label. Every band appears, with 0 when nothing in it sold.',
    setup: `bands = pd.DataFrame({"label": ["cheap", "mid", "premium"], "min_price": [0, 100, 500], "max_price": [99, 499, 100000]})
products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Pen", "Lamp", "Desk"], "price": [20, 300, 900]})
sales = pd.DataFrame({"sale_id": [1, 2, 3], "product_id": [1, 2, 3], "units": [50, 10, 2]})`,
    hidden: [
      `bands = pd.DataFrame({"label": ["cheap", "mid", "premium"], "min_price": [0, 100, 500], "max_price": [99, 499, 100000]})
products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Pen", "Lamp", "Desk"], "price": [20, 300, 400]})
sales = pd.DataFrame({"sale_id": [1, 2, 3], "product_id": [1, 2, 3], "units": [50, 10, 2]})`,
      `bands = pd.DataFrame({"label": ["cheap", "mid", "premium"], "min_price": [0, 100, 500], "max_price": [99, 499, 100000]})
products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Pen", "Lamp", "Desk"], "price": [20, 300, 900]})
sales = pd.DataFrame({"sale_id": [1, 2, 3], "product_id": [1, 1, 3], "units": [50, 25, 2]})`,
    ],
    sig: 'def solve(bands: pd.DataFrame, products: pd.DataFrame, sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(bands, products, sales):
    s = sales.merge(products, on="product_id")
    rows = []
    for _, b in bands.iterrows():
        inside = s[(s["price"] >= b["min_price"]) & (s["price"] <= b["max_price"])]
        rows.append((b["label"], int(inside["units"].sum())))
    r = pd.DataFrame(rows, columns=["label", "units"])
    return r.sort_values("label").reset_index(drop=True)`,
    wrong: [`def solve(bands, products, sales):
    s = sales.merge(products, on="product_id")
    s["label"] = pd.cut(s["price"], [-1, 99, 499, 10 ** 9], labels=["cheap", "mid", "premium"])
    g = s.groupby("label", as_index=False, observed=True)["units"].sum()
    return g.sort_values("label").reset_index(drop=True)`],
    hints: ['Start from the bands so an empty one still has a row.', 'Walk the band frame.'],
    why: 'Driving the report from the bands guarantees every band appears.',
    mistakes: 'Grouping the sales by a cut only shows the bands that happen to have sold.' },

  { t: 'Size of Each Fraud Cluster', tags: ['connected components', 'graphs', 'merge'],
    story: 'Two accounts are linked when they share something suspicious, named in the reasons frame. A cluster is a set of accounts joined by any chain of links, in either direction.',
    task: 'Return holder and cluster_size: how many accounts are in each account\'s cluster, counting itself.',
    setup: `reasons = pd.DataFrame({"reason_id": [1, 2, 3], "reason": ["same device", "same card", "same address"]})
accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
links = pd.DataFrame({"a_id": [1, 4], "b_id": [2, 5], "reason_id": [1, 3]})`,
    hidden: [
      `reasons = pd.DataFrame({"reason_id": [1, 2, 3], "reason": ["same device", "same card", "same address"]})
accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
links = pd.DataFrame({"a_id": [1, 2, 4], "b_id": [2, 3, 5], "reason_id": [1, 2, 3]})`,
      `reasons = pd.DataFrame({"reason_id": [1, 2, 3], "reason": ["same device", "same card", "same address"]})
accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
links = pd.DataFrame({"a_id": [1, 2, 3, 4], "b_id": [2, 3, 1, 5], "reason_id": [1, 2, 3, 3]})`,
    ],
    sig: 'def solve(reasons: pd.DataFrame, accounts: pd.DataFrame, links: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(reasons, accounts, links):
    adj = {int(a): set() for a in accounts["account_id"]}
    for a, b in zip(links["a_id"], links["b_id"]):
        adj[int(a)].add(int(b))
        adj[int(b)].add(int(a))
    rows = []
    for a in accounts["account_id"]:
        seen = {int(a)}
        stack = [int(a)]
        while stack:
            n = stack.pop()
            for m in adj[n]:
                if m not in seen:
                    seen.add(m)
                    stack.append(m)
        rows.append((int(a), len(seen)))
    c = pd.DataFrame(rows, columns=["account_id", "cluster_size"])
    out = c.merge(accounts, on="account_id")
    return out[["holder", "cluster_size"]].reset_index(drop=True)`,
    wrong: [`def solve(reasons, accounts, links):
    adj = {int(a): set() for a in accounts["account_id"]}
    for a, b in zip(links["a_id"], links["b_id"]):
        adj[int(a)].add(int(b))
        adj[int(b)].add(int(a))
    rows = [(int(a), 1 + len(adj[int(a)])) for a in accounts["account_id"]]
    c = pd.DataFrame(rows, columns=["account_id", "cluster_size"])
    out = c.merge(accounts, on="account_id")
    return out[["holder", "cluster_size"]].reset_index(drop=True)`],
    hints: ['Walk out from every account along links in both directions.', 'A visited set keeps the walk finite.'],
    why: 'The whole component has to be collected, not just the neighbours.',
    mistakes: 'Counting direct links makes a chain of three look like two separate pairs.' },

  { t: 'Delay Carried to the Next Leg', tags: ['running state', 'loops', 'merge'], o: true,
    story: 'An aircraft flies its legs in order. A leg leaves late by its own delay plus whatever arrived late from the leg before, minus the turnaround slack, but never less than zero.',
    task: 'Return leg and delay for every leg, ordered by leg.',
    setup: `aircraft = pd.DataFrame({"aircraft_id": [1], "model": ["A320"]})
flights = pd.DataFrame({"flight_id": [10, 11, 12], "aircraft_id": [1, 1, 1], "leg": [1, 2, 3], "turn_min": [60, 60, 60]})
delays = pd.DataFrame({"flight_id": [10, 11, 12], "own_min": [0, 0, 0]})`,
    hidden: [
      `aircraft = pd.DataFrame({"aircraft_id": [1], "model": ["A320"]})
flights = pd.DataFrame({"flight_id": [10, 11, 12], "aircraft_id": [1, 1, 1], "leg": [1, 2, 3], "turn_min": [60, 60, 60]})
delays = pd.DataFrame({"flight_id": [10, 11, 12], "own_min": [90, 0, 0]})`,
      `aircraft = pd.DataFrame({"aircraft_id": [1], "model": ["A320"]})
flights = pd.DataFrame({"flight_id": [10, 11, 12], "aircraft_id": [1, 1, 1], "leg": [1, 2, 3], "turn_min": [60, 60, 60]})
delays = pd.DataFrame({"flight_id": [10, 11, 12], "own_min": [30, 50, 0]})`,
    ],
    sig: 'def solve(aircraft: pd.DataFrame, flights: pd.DataFrame, delays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(aircraft, flights, delays):
    f = flights.merge(delays, on="flight_id").sort_values("leg")
    carried = 0
    rows = []
    for leg, turn, own in zip(f["leg"], f["turn_min"], f["own_min"]):
        d = own if leg == f["leg"].min() else max(0, own + carried - turn)
        rows.append((leg, int(d)))
        carried = d
    return pd.DataFrame(rows, columns=["leg", "delay"])`,
    wrong: [`def solve(aircraft, flights, delays):
    f = flights.merge(delays, on="flight_id").sort_values("leg")
    return f[["leg", "own_min"]].rename(columns={"own_min": "delay"}).reset_index(drop=True)`],
    hints: ['Each leg needs the delay the previous leg ended up with.', 'The turnaround absorbs part of it, clamped at zero.'],
    why: 'Carrying the delay forward is what makes the knock-on visible.',
    mistakes: 'Reading each leg\'s own delay reports a punctual aircraft that was in fact hours behind.' },

  { t: 'Tiered Usage Billing', tags: ['allocation', 'shift', 'groupby'],
    story: 'Usage is billed in tiers: the first units at the first tier\'s price, the next ones at the second tier\'s price, and so on. The tier frame gives the running ceiling of each tier.',
    task: 'Return name, units and due for every account.',
    setup: `tiers = pd.DataFrame({"tier_id": [1, 2, 3], "upto_units": [100, 500, 1000000], "price_per_unit": [5, 5, 5]})
accounts = pd.DataFrame({"account_id": [1, 2], "name": ["Asha", "Ben"]})
usage = pd.DataFrame({"account_id": [1, 1, 2], "month": ["2024-05"] * 3, "units": [50, 120, 700]})`,
    hidden: [
      `tiers = pd.DataFrame({"tier_id": [1, 2, 3], "upto_units": [100, 500, 1000000], "price_per_unit": [10, 4, 2]})
accounts = pd.DataFrame({"account_id": [1, 2], "name": ["Asha", "Ben"]})
usage = pd.DataFrame({"account_id": [1, 1, 2], "month": ["2024-05"] * 3, "units": [50, 120, 700]})`,
      `tiers = pd.DataFrame({"tier_id": [1, 2, 3], "upto_units": [100, 500, 1000000], "price_per_unit": [5, 5, 5]})
accounts = pd.DataFrame({"account_id": [1, 2], "name": ["Asha", "Ben"]})
usage = pd.DataFrame({"account_id": [1, 2], "month": ["2024-05"] * 2, "units": [50, 50]})`,
    ],
    sig: 'def solve(tiers: pd.DataFrame, accounts: pd.DataFrame, usage: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(tiers, accounts, usage):
    u = usage.groupby("account_id", as_index=False)["units"].sum()
    t = tiers.sort_values("upto_units").copy()
    t["floor_units"] = t["upto_units"].shift().fillna(0)
    rows = []
    for aid, units in zip(u["account_id"], u["units"]):
        due = 0
        for ceil, floor, price in zip(t["upto_units"], t["floor_units"], t["price_per_unit"]):
            slice_units = max(0, min(units, ceil) - floor)
            due += slice_units * price
        rows.append((aid, units, int(due)))
    r = pd.DataFrame(rows, columns=["account_id", "units", "due"])
    out = r.merge(accounts, on="account_id")
    return out[["name", "units", "due"]].reset_index(drop=True)`,
    wrong: [`def solve(tiers, accounts, usage):
    u = usage.groupby("account_id", as_index=False)["units"].sum()
    t = tiers.sort_values("upto_units")
    rows = []
    for aid, units in zip(u["account_id"], u["units"]):
        price = t[t["upto_units"] >= units]["price_per_unit"].iloc[0]
        rows.append((aid, units, int(units * price)))
    r = pd.DataFrame(rows, columns=["account_id", "units", "due"])
    out = r.merge(accounts, on="account_id")
    return out[["name", "units", "due"]].reset_index(drop=True)`],
    hints: ['Each tier bills the slice of usage between its floor and its ceiling.', 'The floor is the previous ceiling.'],
    why: 'The slices add up to the bill, which is what tiered pricing means.',
    mistakes: 'Charging the whole usage at the rate of the tier it lands in only matches when every tier costs the same.' },

  { t: 'Longest Run of Improving Scores', tags: ['groupby', 'gaps and islands', 'shift'],
    story: 'Tests are taken in sequence within a term. A run of improvement is a stretch of tests in one term where each score beats the one before.',
    task: 'Return student and longest_run: the longest run of improving scores inside a single term. A single test is a run of 1.',
    setup: `terms = pd.DataFrame({"term_id": [1, 2], "term": ["Autumn", "Spring"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Asha", "Ben"]})
tests = pd.DataFrame({
    "test_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "student_id": [1, 1, 1, 1, 2, 2, 2, 2],
    "term_id": [1, 1, 1, 2, 1, 1, 1, 2],
    "seq": [1, 2, 3, 1, 1, 2, 3, 1],
    "score": [40, 50, 60, 55, 70, 60, 80, 50],
})`,
    hidden: [
      `terms = pd.DataFrame({"term_id": [1, 2], "term": ["Autumn", "Spring"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Asha", "Ben"]})
tests = pd.DataFrame({"test_id": [1, 2, 3, 4, 5, 6, 7, 8], "student_id": [1, 1, 1, 1, 2, 2, 2, 2], "term_id": [1, 1, 1, 2, 1, 1, 1, 2], "seq": [1, 2, 3, 1, 1, 2, 3, 1], "score": [40, 50, 45, 55, 70, 75, 80, 90]})`,
      `terms = pd.DataFrame({"term_id": [1, 2], "term": ["Autumn", "Spring"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Asha", "Ben"]})
tests = pd.DataFrame({"test_id": [1, 2, 3, 4, 5, 6, 7, 8], "student_id": [1, 1, 1, 1, 2, 2, 2, 2], "term_id": [1, 1, 1, 2, 1, 1, 1, 2], "seq": [1, 2, 3, 1, 1, 2, 3, 1], "score": [40, 40, 40, 55, 70, 60, 50, 40]})`,
    ],
    sig: 'def solve(terms: pd.DataFrame, students: pd.DataFrame, tests: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(terms, students, tests):
    t = tests.sort_values(["student_id", "term_id", "seq"]).copy()
    t["prev"] = t.groupby(["student_id", "term_id"])["score"].shift()
    t["brk"] = (t["prev"].isna() | (t["score"] <= t["prev"])).astype(int)
    t["grp"] = t.groupby(["student_id", "term_id"])["brk"].cumsum()
    runs = t.groupby(["student_id", "term_id", "grp"], as_index=False).size()
    g = runs.groupby("student_id", as_index=False)["size"].max().rename(columns={"size": "longest_run"})
    out = g.merge(students, on="student_id")
    return out[["student", "longest_run"]].reset_index(drop=True)`,
    wrong: [`def solve(terms, students, tests):
    t = tests.sort_values(["student_id", "term_id", "seq"]).copy()
    t["prev"] = t.groupby("student_id")["score"].shift()
    t["brk"] = (t["prev"].isna() | (t["score"] <= t["prev"])).astype(int)
    t["grp"] = t.groupby("student_id")["brk"].cumsum()
    runs = t.groupby(["student_id", "grp"], as_index=False).size()
    g = runs.groupby("student_id", as_index=False)["size"].max().rename(columns={"size": "longest_run"})
    out = g.merge(students, on="student_id")
    return out[["student", "longest_run"]].reset_index(drop=True)`],
    hints: ['The run lives inside a term, so the term belongs in every grouping.', 'Shift within student and term.'],
    why: 'Grouping by student and term keeps a new term from continuing the previous run.',
    mistakes: 'Without the term the first test of a new term can extend a run it has nothing to do with.' },

  { t: 'Nearest Branch Open at the Time', tags: ['filtering', 'distance', 'groupby'],
    story: 'A customer wants the closest branch that is open at minute 800, measured by straight-line distance.',
    task: 'Return customer, branch and distance (rounded to 2 decimals) for every customer.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "x": [0, 20], "y": [0, 20]})
branches = pd.DataFrame({"branch_id": [10, 11, 12], "branch": ["Central", "North", "South"], "x": [3, 6, 30], "y": [4, 8, 40]})
hours = pd.DataFrame({"branch_id": [10, 11, 12], "open_min": [0, 0, 0], "close_min": [1440, 1440, 1440]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "x": [0, 20], "y": [0, 20]})
branches = pd.DataFrame({"branch_id": [10, 11, 12], "branch": ["Central", "North", "South"], "x": [3, 6, 30], "y": [4, 8, 40]})
hours = pd.DataFrame({"branch_id": [10, 11, 12], "open_min": [600, 0, 0], "close_min": [700, 1440, 1440]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "x": [0, 7], "y": [0, 9]})
branches = pd.DataFrame({"branch_id": [10, 11, 12], "branch": ["Central", "North", "South"], "x": [3, 6, 30], "y": [4, 8, 40]})
hours = pd.DataFrame({"branch_id": [10, 11, 12], "open_min": [0, 0, 0], "close_min": [1440, 1440, 1440]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, branches: pd.DataFrame, hours: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, branches, hours):
    b = branches.merge(hours, on="branch_id")
    b = b[(b["open_min"] <= 800) & (b["close_min"] > 800)]
    m = customers.merge(b, how="cross", suffixes=("_c", "_b"))
    m["distance"] = np.hypot(m["x_c"] - m["x_b"], m["y_c"] - m["y_b"])
    m = m.sort_values(["customer_id", "distance"]).drop_duplicates("customer_id")
    m["distance"] = m["distance"].round(2)
    return m[["customer", "branch", "distance"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, branches, hours):
    m = customers.merge(branches, how="cross", suffixes=("_c", "_b"))
    m["distance"] = np.hypot(m["x_c"] - m["x_b"], m["y_c"] - m["y_b"])
    m = m.sort_values(["customer_id", "distance"]).drop_duplicates("customer_id")
    m["distance"] = m["distance"].round(2)
    return m[["customer", "branch", "distance"]].reset_index(drop=True)`],
    hints: ['Only the branches open at that minute are candidates.', 'Filter before measuring.'],
    why: 'The opening hours decide which branches can be chosen at all.',
    mistakes: 'Ignoring the hours sends the customer to a closed branch.' },

  { t: 'Battery State of Charge', tags: ['running state', 'clip', 'loops'], o: true,
    story: 'A plan charges or discharges the battery each hour. The charge can never go above the capacity or below zero, and anything that would is simply not stored or not supplied.',
    task: 'Return hour and soc: the state of charge at the end of every hour, ordered by hour.',
    setup: `batteries = pd.DataFrame({"battery_id": [1], "battery": ["Pack A"], "capacity": [100]})
plans = pd.DataFrame({"battery_id": [1, 1, 1, 1], "hour": [1, 2, 3, 4], "change": [40, 20, -30, 10]})
prices = pd.DataFrame({"hour": [1, 2, 3, 4], "price": [5, 6, 7, 9]})`,
    hidden: [
      `batteries = pd.DataFrame({"battery_id": [1], "battery": ["Pack A"], "capacity": [50]})
plans = pd.DataFrame({"battery_id": [1, 1, 1, 1], "hour": [1, 2, 3, 4], "change": [40, 20, -30, 10]})
prices = pd.DataFrame({"hour": [1, 2, 3, 4], "price": [5, 6, 7, 9]})`,
      `batteries = pd.DataFrame({"battery_id": [1], "battery": ["Pack A"], "capacity": [100]})
plans = pd.DataFrame({"battery_id": [1, 1, 1, 1], "hour": [1, 2, 3, 4], "change": [40, -60, 40, 40]})
prices = pd.DataFrame({"hour": [1, 2, 3, 4], "price": [5, 6, 7, 9]})`,
    ],
    sig: 'def solve(batteries: pd.DataFrame, plans: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(batteries, plans, prices):
    cap = int(batteries["capacity"].iloc[0])
    p = plans.sort_values("hour")
    soc = 0
    rows = []
    for hour, change in zip(p["hour"], p["change"]):
        soc = max(0, min(cap, soc + change))
        rows.append((hour, int(soc)))
    return pd.DataFrame(rows, columns=["hour", "soc"])`,
    wrong: [`def solve(batteries, plans, prices):
    cap = int(batteries["capacity"].iloc[0])
    p = plans.sort_values("hour").copy()
    p["soc"] = p["change"].cumsum().clip(lower=0, upper=cap).astype(int)
    return p[["hour", "soc"]].reset_index(drop=True)`],
    hints: ['Each hour starts from the charge the previous hour ended with, after the limits.', 'Clamp inside the loop, not at the end.'],
    why: 'Clamping as you go loses the energy that could not be stored, so later hours start from the real charge.',
    mistakes: 'Clipping a running total keeps counting energy the battery never held.' },

  { t: 'Bracket Winners Round by Round', tags: ['merge', 'tournament', 'resolution'], o: true,
    story: 'The semi-finals name their teams. The final\'s home side is the winner of semi slot 1 and its away side the winner of slot 2, whatever its own columns happen to say, and they can be empty.',
    task: 'Return round, slot and winner for every match, ordered by round then slot. No match is drawn.',
    setup: `teams = pd.DataFrame({"team_id": [1, 2, 3, 4], "team": ["Lions", "Bears", "Wolves", "Eagles"]})
rounds = pd.DataFrame({"round_id": [1, 2], "round": ["Semi", "Final"]})
matches = pd.DataFrame({
    "match_id": [1, 2, 3],
    "round_id": [1, 1, 2],
    "slot": [1, 2, 1],
    "home_id": [1.0, 3.0, 1.0],
    "away_id": [2.0, 4.0, 4.0],
    "home_goals": [3, 0, 2],
    "away_goals": [1, 2, 1],
})`,
    hidden: [
      `teams = pd.DataFrame({"team_id": [1, 2, 3, 4], "team": ["Lions", "Bears", "Wolves", "Eagles"]})
rounds = pd.DataFrame({"round_id": [1, 2], "round": ["Semi", "Final"]})
matches = pd.DataFrame({"match_id": [1, 2, 3], "round_id": [1, 1, 2], "slot": [1, 2, 1], "home_id": [1.0, 3.0, np.nan], "away_id": [2.0, 4.0, np.nan], "home_goals": [3, 0, 2], "away_goals": [1, 2, 1]})`,
      `teams = pd.DataFrame({"team_id": [1, 2, 3, 4], "team": ["Lions", "Bears", "Wolves", "Eagles"]})
rounds = pd.DataFrame({"round_id": [1, 2], "round": ["Semi", "Final"]})
matches = pd.DataFrame({"match_id": [1, 2, 3], "round_id": [1, 1, 2], "slot": [1, 2, 1], "home_id": [1.0, 3.0, 1.0], "away_id": [2.0, 4.0, 4.0], "home_goals": [1, 0, 2], "away_goals": [3, 2, 1]})`,
    ],
    sig: 'def solve(teams: pd.DataFrame, rounds: pd.DataFrame, matches: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(teams, rounds, matches):
    semi = matches[matches["round_id"] == 1].copy()
    semi["winner"] = np.where(semi["home_goals"] > semi["away_goals"], semi["home_id"], semi["away_id"])
    win_by_slot = dict(zip(semi["slot"], semi["winner"]))
    fin = matches[matches["round_id"] == 2].copy()
    fin["winner"] = np.where(fin["home_goals"] > fin["away_goals"], win_by_slot[1], win_by_slot[2])
    w = pd.concat([semi[["round_id", "slot", "winner"]], fin[["round_id", "slot", "winner"]]], ignore_index=True)
    w["winner"] = w["winner"].astype(int)
    out = w.merge(rounds, on="round_id").merge(teams, left_on="winner", right_on="team_id")
    return out.sort_values(["round", "slot"])[["round", "slot", "team"]].rename(columns={"team": "winner"}).reset_index(drop=True)`,
    wrong: [`def solve(teams, rounds, matches):
    m = matches.copy()
    m["winner"] = np.where(m["home_goals"] > m["away_goals"], m["home_id"], m["away_id"])
    m = m.dropna(subset=["winner"])
    m["winner"] = m["winner"].astype(int)
    out = m.merge(rounds, on="round_id").merge(teams, left_on="winner", right_on="team_id")
    return out.sort_values(["round", "slot"])[["round", "slot", "team"]].rename(columns={"team": "winner"}).reset_index(drop=True)`],
    hints: ['Resolve the semi-finals first, then feed their winners into the final.', 'The final\'s own team columns cannot be trusted.'],
    why: 'The bracket has to be resolved in order, because the final\'s sides are decided by the earlier round.',
    mistakes: 'Reading the final\'s own columns finds nothing when they are empty, and the wrong team when they are stale.' },
];
