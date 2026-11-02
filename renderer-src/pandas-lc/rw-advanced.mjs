// Rewritten originals: Pandas Advanced (problems 101-125). Hierarchies, gaps and islands, cohorts,
// funnels and pivots, each asking for several derived measures so the answer has to be built in layers.
export default [
  { t: 'Depth, Span and Everyone Below', tags: ['recursion', 'hierarchy', 'counting'], o: true,
    story: 'The org chart hangs off the one person with no manager. Leadership wants depth and span of control together.',
    task: 'Return name, depth (0 for the top), reports_total (everyone below at any depth) and direct_reports. Order by depth, then name.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Meera", "Rohan", "Sana"], "manager_id": [np.nan, 1.0, 1.0]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Meera", "Rohan", "Sana", "Uma"], "manager_id": [np.nan, 1.0, 2.0, 3.0]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5], "name": ["Meera", "Rohan", "Sana", "Uma", "Vik"], "manager_id": [np.nan, 1.0, 1.0, 2.0, 2.0]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees):
    mgr = {int(e): (None if pd.isna(m) else int(m)) for e, m in zip(employees["employee_id"], employees["manager_id"])}
    kids = {}
    for e, m in mgr.items():
        if m is not None:
            kids.setdefault(m, []).append(e)
    def depth(e):
        d = 0
        cur = mgr[e]
        while cur is not None:
            d += 1
            cur = mgr[cur]
        return d
    def below(e):
        n = 0
        stack = list(kids.get(e, []))
        while stack:
            n += 1
            stack.extend(kids.get(stack.pop(), []))
        return n
    rows = [(int(e), depth(int(e)), below(int(e)), len(kids.get(int(e), []))) for e in employees["employee_id"]]
    d = pd.DataFrame(rows, columns=["employee_id", "depth", "reports_total", "direct_reports"])
    out = d.merge(employees, on="employee_id")
    return out.sort_values(["depth", "name"])[["name", "depth", "reports_total", "direct_reports"]].reset_index(drop=True)`,
    wrong: [`def solve(employees):
    mgr = {int(e): (None if pd.isna(m) else int(m)) for e, m in zip(employees["employee_id"], employees["manager_id"])}
    kids = {}
    for e, m in mgr.items():
        if m is not None:
            kids.setdefault(m, []).append(e)
    def depth(e):
        d = 0
        cur = mgr[e]
        while cur is not None:
            d += 1
            cur = mgr[cur]
        return d
    rows = [(int(e), depth(int(e)), len(kids.get(int(e), [])), len(kids.get(int(e), []))) for e in employees["employee_id"]]
    d = pd.DataFrame(rows, columns=["employee_id", "depth", "reports_total", "direct_reports"])
    out = d.merge(employees, on="employee_id")
    return out.sort_values(["depth", "name"])[["name", "depth", "reports_total", "direct_reports"]].reset_index(drop=True)`,
    ],
    hints: ['Walk up for depth and down for everyone below.', 'A dictionary of children makes the walk down easy.'],
    why: 'Depth and span are opposite directions through the same links, so each needs its own walk.',
    mistakes: 'Counting direct reports twice is right only on a flat chart with nobody two levels down.' },

  { t: 'Chain of Command and the Pay Above It', tags: ['recursion', 'strings', 'hierarchy'], o: true,
    story: 'Each employee has a chain of managers above them, and that chain has a cost.',
    task: "Return name, chain (names from the top down to the person, joined with ' > ') and pay_above (total salary of everyone above them, 0 for the top). Order by name.",
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Meera", "Rohan", "Sana"], "manager_id": [np.nan, 1.0, 1.0], "salary": [250000, 180000, 170000]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Meera", "Rohan", "Sana"], "manager_id": [np.nan, 1.0, 2.0], "salary": [250000, 180000, 170000]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Meera", "Rohan", "Sana", "Uma"], "manager_id": [np.nan, 1.0, 2.0, 3.0], "salary": [250000, 180000, 170000, 140000]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees):
    mgr = {int(e): (None if pd.isna(m) else int(m)) for e, m in zip(employees["employee_id"], employees["manager_id"])}
    name = dict(zip(employees["employee_id"], employees["name"]))
    pay = dict(zip(employees["employee_id"], employees["salary"]))
    rows = []
    for e in employees["employee_id"]:
        path = [int(e)]
        total = 0
        cur = mgr[int(e)]
        while cur is not None:
            path.append(cur)
            total += pay[cur]
            cur = mgr[cur]
        rows.append((name[e], " > ".join(name[p] for p in reversed(path)), int(total)))
    return pd.DataFrame(rows, columns=["name", "chain", "pay_above"]).sort_values("name").reset_index(drop=True)`,
    wrong: [`def solve(employees):
    mgr = {int(e): (None if pd.isna(m) else int(m)) for e, m in zip(employees["employee_id"], employees["manager_id"])}
    name = dict(zip(employees["employee_id"], employees["name"]))
    pay = dict(zip(employees["employee_id"], employees["salary"]))
    rows = []
    for e in employees["employee_id"]:
        path = [int(e)]
        cur = mgr[int(e)]
        while cur is not None:
            path.append(cur)
            cur = mgr[cur]
        boss = mgr[int(e)]
        rows.append((name[e], " > ".join(name[p] for p in reversed(path)), 0 if boss is None else int(pay[boss])))
    return pd.DataFrame(rows, columns=["name", "chain", "pay_above"]).sort_values("name").reset_index(drop=True)`],
    hints: ['Collect the whole path up, then reverse it for the chain.', 'Add every salary you pass, not just the first.'],
    why: 'The walk up visits every manager, so the chain and the pay can both be accumulated in one pass.',
    mistakes: 'Taking the direct manager\'s salary is the same answer only while nobody sits more than one level up.' },

  { t: 'Payroll and Headcount Under Each Manager', tags: ['recursion', 'levels', 'groupby'], o: true,
    story: 'A manager carries everyone below them, directly or not, and finance wants the split.',
    task: 'Return name, direct_count, indirect_count (below them but not reporting directly) and payroll_below. Only people with someone below them. Order by payroll_below descending, then name.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Meera", "Rohan", "Sana"], "manager_id": [np.nan, 1.0, 1.0], "salary": [250000, 180000, 170000]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Meera", "Rohan", "Sana", "Uma"], "manager_id": [np.nan, 1.0, 2.0, 2.0], "salary": [250000, 180000, 170000, 140000]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5], "name": ["Meera", "Rohan", "Sana", "Uma", "Vik"], "manager_id": [np.nan, 1.0, 1.0, 2.0, 4.0], "salary": [250000, 180000, 170000, 140000, 90000]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees):
    mgr = {int(e): (None if pd.isna(m) else int(m)) for e, m in zip(employees["employee_id"], employees["manager_id"])}
    name = dict(zip(employees["employee_id"], employees["name"]))
    pay = dict(zip(employees["employee_id"], employees["salary"]))
    rows = []
    for e in employees["employee_id"]:
        cur = mgr[int(e)]
        lvl = 1
        while cur is not None:
            rows.append((cur, lvl, int(pay[int(e)])))
            cur = mgr[cur]
            lvl += 1
    if not rows:
        return pd.DataFrame(columns=["name", "direct_count", "indirect_count", "payroll_below"])
    b = pd.DataFrame(rows, columns=["anc", "lvl", "salary"])
    b["direct"] = (b["lvl"] == 1).astype(int)
    b["indirect"] = (b["lvl"] > 1).astype(int)
    g = b.groupby("anc", as_index=False).agg(direct_count=("direct", "sum"), indirect_count=("indirect", "sum"), payroll_below=("salary", "sum"))
    g["name"] = g["anc"].map(name)
    return g.sort_values(["payroll_below", "name"], ascending=[False, True])[["name", "direct_count", "indirect_count", "payroll_below"]].reset_index(drop=True)`,
    wrong: [`def solve(employees):
    e = employees.dropna(subset=["manager_id"]).copy()
    e["manager_id"] = e["manager_id"].astype(int)
    g = e.groupby("manager_id", as_index=False).agg(direct_count=("employee_id", "size"), payroll_below=("salary", "sum"))
    g["indirect_count"] = 0
    g["name"] = g["manager_id"].map(dict(zip(employees["employee_id"], employees["name"])))
    g["payroll_below"] = g["payroll_below"].astype(int)
    return g.sort_values(["payroll_below", "name"], ascending=[False, True])[["name", "direct_count", "indirect_count", "payroll_below"]].reset_index(drop=True)`],
    hints: ['Walk up from every employee and credit each manager you pass.', 'Keep the level so you can tell direct from indirect.'],
    why: 'One pass up per employee produces every ancestor pair with its level, which is all the grouping needs.',
    mistakes: 'Summing the direct reports reports no indirect headcount and understates the payroll under anyone with a deeper team.' },

  { t: 'One Manager\'s Organisation, Level by Level', tags: ['recursion', 'groupby', 'levels'], o: true,
    story: 'Employee 2 runs a division and wants it summarised one level at a time, not as a list of names.',
    task: 'Return level (1 for their direct reports), people, payroll and avg_salary (1 decimal) for everyone below employee 2, not counting them. Order by level.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Meera", "Rohan", "Uma", "Vik"], "manager_id": [np.nan, 1.0, 2.0, 2.0], "salary": [250000, 180000, 140000, 110000]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5], "name": ["Meera", "Rohan", "Uma", "Vik", "Wasim"], "manager_id": [np.nan, 1.0, 2.0, 3.0, 3.0], "salary": [250000, 180000, 140000, 110000, 95000]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Meera", "Rohan", "Uma"], "manager_id": [np.nan, 1.0, 2.0], "salary": [250000, 180000, 140000]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees):
    kids = {}
    for e, m in zip(employees["employee_id"], employees["manager_id"]):
        if not pd.isna(m):
            kids.setdefault(int(m), []).append(int(e))
    pay = dict(zip(employees["employee_id"], employees["salary"]))
    rows = []
    frontier, lvl = kids.get(2, []), 1
    while frontier:
        for e in frontier:
            rows.append((lvl, int(pay[e])))
        frontier = [k for e in frontier for k in kids.get(e, [])]
        lvl += 1
    d = pd.DataFrame(rows, columns=["level", "salary"])
    g = d.groupby("level", as_index=False).agg(people=("salary", "size"), payroll=("salary", "sum"), avg_salary=("salary", "mean"))
    g["avg_salary"] = g["avg_salary"].round(1)
    return g.sort_values("level").reset_index(drop=True)`,
    wrong: [`def solve(employees):
    e = employees[employees["manager_id"] == 2]
    return pd.DataFrame({"level": [1], "people": [len(e)], "payroll": [int(e["salary"].sum())], "avg_salary": [round(e["salary"].mean(), 1)]})`],
    hints: ['Take the direct reports, then the reports of those, one layer at a time.', 'The layer number is the level.'],
    why: 'Expanding a frontier one layer per step is what makes the level column mean the distance from the manager.',
    mistakes: 'Stopping at the direct reports reports one level and loses the rest of the division.' },

  { t: 'Longest Login Streak and Its Dates', tags: ['gaps and islands', 'cumcount', 'groupby'], o: true,
    story: 'A streak is consecutive days with at least one login.',
    task: 'Return name, streak (days in the longest run), started and ended for each user who logged in, breaking ties by the earlier start. Order by streak descending, then name.',
    setup: `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5], "user_id": [1, 1, 1, 2, 2], "day": [1, 2, 3, 5, 6], "event_type": ["login"] * 5})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5], "user_id": [1, 1, 1, 2, 2], "day": [1, 2, 9, 5, 6], "event_type": ["login"] * 5})`,
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 2, 2], "day": [1, 2, 5, 6], "event_type": ["login", "view", "login", "login"]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    d = events[events["event_type"] == "login"][["user_id", "day"]].drop_duplicates()
    d = d.sort_values(["user_id", "day"]).copy()
    d["grp"] = d["day"] - d.groupby("user_id").cumcount()
    r = d.groupby(["user_id", "grp"], as_index=False).agg(streak=("day", "size"), started=("day", "min"), ended=("day", "max"))
    r = r.sort_values(["user_id", "streak", "started"], ascending=[True, False, True])
    best = r.groupby("user_id", as_index=False).head(1)
    out = best.merge(users, on="user_id")
    return out.sort_values(["streak", "name"], ascending=[False, True])[["name", "streak", "started", "ended"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    d = events[events["event_type"] == "login"][["user_id", "day"]].drop_duplicates()
    g = d.groupby("user_id", as_index=False).agg(streak=("day", "size"), started=("day", "min"), ended=("day", "max"))
    out = g.merge(users, on="user_id")
    return out.sort_values(["streak", "name"], ascending=[False, True])[["name", "streak", "started", "ended"]].reset_index(drop=True)`],
    hints: ['Day minus a running count is constant inside a run of consecutive days.', 'Make the days distinct first.'],
    why: 'The constant difference labels each island, and the longest island per user is the streak.',
    mistakes: 'Counting login days ignores the gaps, so two separate visits look like one unbroken streak.' },

  { t: 'Session Report With Funnel Depth', tags: ['sessionization', 'cumsum', 'case'], o: true,
    story: 'A gap of more than 30 minutes starts a new session. Each session got some way down the funnel.',
    task: "Return name, session_no, events, minutes (first to last) and reached: 'purchase', 'cart', 'view' or 'none', whichever is the furthest the session got. Order by name, session_no.",
    setup: `users = pd.DataFrame({"user_id": [1], "name": ["Ana"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 1, 1], "minute": [0, 5, 10, 100], "event_type": ["login", "view", "purchase", "login"]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1], "name": ["Ana"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 1, 1], "minute": [0, 5, 10, 15], "event_type": ["login", "view", "purchase", "view"]})`,
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 2, 2], "minute": [0, 5, 0, 8], "event_type": ["login", "add_to_cart", "login", "view"]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    e = events.sort_values(["user_id", "minute"]).copy()
    gap = e["minute"] - e.groupby("user_id")["minute"].shift()
    e["session_no"] = (gap.isna() | (gap > 30)).astype(int).groupby(e["user_id"]).cumsum()
    g = e.groupby(["user_id", "session_no"], as_index=False).agg(
        events=("event_id", "size"), lo=("minute", "min"), hi=("minute", "max"),
        buys=("event_type", lambda s: (s == "purchase").sum()),
        carts=("event_type", lambda s: (s == "add_to_cart").sum()),
        views=("event_type", lambda s: (s == "view").sum()))
    g["minutes"] = g["hi"] - g["lo"]
    g["reached"] = np.where(g["buys"] > 0, "purchase", np.where(g["carts"] > 0, "cart", np.where(g["views"] > 0, "view", "none")))
    out = g.merge(users, on="user_id")
    return out.sort_values(["name", "session_no"])[["name", "session_no", "events", "minutes", "reached"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    e = events.sort_values(["user_id", "minute"]).copy()
    gap = e["minute"] - e.groupby("user_id")["minute"].shift()
    e["session_no"] = (gap.isna() | (gap > 30)).astype(int).groupby(e["user_id"]).cumsum()
    g = e.groupby(["user_id", "session_no"], as_index=False).agg(
        events=("event_id", "size"), lo=("minute", "min"), hi=("minute", "max"), last=("event_type", "last"))
    g["minutes"] = g["hi"] - g["lo"]
    g["reached"] = np.where(g["last"] == "purchase", "purchase", np.where(g["last"] == "add_to_cart", "cart", np.where(g["last"] == "view", "view", "none")))
    out = g.merge(users, on="user_id")
    return out.sort_values(["name", "session_no"])[["name", "session_no", "events", "minutes", "reached"]].reset_index(drop=True)`],
    hints: ['Test the deepest step first.', 'A session that bought has reached purchase whatever it did afterwards.'],
    why: 'The furthest point reached is about whether a step ever happened, not about what happened last.',
    mistakes: 'Reading the last event calls a session that browsed after buying a mere view.' },

  { t: 'Day-1 and Day-7 Retention by Plan and Country', tags: ['retention', 'merge', 'groupby'], o: true,
    story: 'Growth measures whether a new user came back the next day, and again a week in.',
    task: 'Return plan, country, users, day1, day7 (users with an event exactly 1 and exactly 7 days after signup) and day1_pct and day7_pct (1 decimal). Order by plan, country.',
    setup: `users = pd.DataFrame({"user_id": [1, 2], "signup_day": [10, 20], "plan": ["free", "free"], "country": ["IN", "IN"]})
events = pd.DataFrame({"event_id": [1, 2], "user_id": [1, 2], "day": [11, 21]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2], "signup_day": [10, 20], "plan": ["free", "free"], "country": ["IN", "IN"]})
events = pd.DataFrame({"event_id": [1, 2], "user_id": [1, 2], "day": [13, 21]})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3], "signup_day": [10, 20, 30], "plan": ["free", "pro", "pro"], "country": ["IN", "US", "US"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 2, 2, 3], "day": [11, 21, 27, 37]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    m = users.merge(events, on="user_id", how="left")
    m["off"] = m["day"] - m["signup_day"]
    u = m.groupby(["user_id", "plan", "country"], as_index=False).agg(
        d1=("off", lambda s: int((s == 1).any())), d7=("off", lambda s: int((s == 7).any())))
    g = u.groupby(["plan", "country"], as_index=False).agg(users=("user_id", "size"), day1=("d1", "sum"), day7=("d7", "sum"))
    g["day1_pct"] = (100.0 * g["day1"] / g["users"]).round(1)
    g["day7_pct"] = (100.0 * g["day7"] / g["users"]).round(1)
    return g.sort_values(["plan", "country"])[["plan", "country", "users", "day1", "day7", "day1_pct", "day7_pct"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    m = users.merge(events, on="user_id", how="left")
    m["off"] = m["day"] - m["signup_day"]
    u = m.groupby(["user_id", "plan", "country"], as_index=False).agg(
        d1=("off", lambda s: int((s >= 1).any())), d7=("off", lambda s: int((s >= 7).any())))
    g = u.groupby(["plan", "country"], as_index=False).agg(users=("user_id", "size"), day1=("d1", "sum"), day7=("d7", "sum"))
    g["day1_pct"] = (100.0 * g["day1"] / g["users"]).round(1)
    g["day7_pct"] = (100.0 * g["day7"] / g["users"]).round(1)
    return g.sort_values(["plan", "country"])[["plan", "country", "users", "day1", "day7", "day1_pct", "day7_pct"]].reset_index(drop=True)`],
    hints: ['The offset has to be exactly 1 and exactly 7.', 'Reduce to one row per user before grouping.'],
    why: 'Day-1 retention is a specific day, which is what makes it comparable between cohorts.',
    mistakes: '"At least a day later" counts anybody who ever came back, which quietly turns retention into activity.' },

  { t: 'Weekly Cohort Retention Triangle', tags: ['cohort', 'cross merge', 'left merge'], o: true,
    story: 'Users are grouped by the week they signed up, then followed week by week.',
    task: 'Return cohort_week (signup_day // 7), week_offset 0 to 2, cohort_size, active (users of the cohort with an event in that week after signup) and pct (1 decimal). Every cohort and offset appears. Order by cohort_week, week_offset.',
    setup: `users = pd.DataFrame({"user_id": [1, 2], "signup_day": [0, 1]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 1, 2, 2, 2], "day": [0, 7, 14, 1, 8, 15]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2], "signup_day": [0, 1]})
events = pd.DataFrame({"event_id": [1, 2, 3], "user_id": [1, 1, 2], "day": [0, 7, 1]})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3], "signup_day": [0, 1, 7]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 2, 3, 3], "day": [0, 1, 7, 14]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    u = users.copy()
    u["cohort_week"] = u["signup_day"] // 7
    sz = u.groupby("cohort_week", as_index=False).agg(cohort_size=("user_id", "size"))
    grid = sz.merge(pd.DataFrame({"week_offset": [0, 1, 2]}), how="cross")
    e = events.merge(u, on="user_id")
    e["off"] = (e["day"] - e["signup_day"]) // 7
    rows = []
    for _, g in grid.iterrows():
        hit = e[(e["cohort_week"] == g["cohort_week"]) & (e["off"] == g["week_offset"]) & (e["day"] >= e["signup_day"])]
        active = hit["user_id"].nunique()
        rows.append((g["cohort_week"], g["week_offset"], g["cohort_size"], active, round(100.0 * active / g["cohort_size"], 1)))
    r = pd.DataFrame(rows, columns=["cohort_week", "week_offset", "cohort_size", "active", "pct"])
    return r.sort_values(["cohort_week", "week_offset"]).reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    u = users.copy()
    u["cohort_week"] = u["signup_day"] // 7
    sz = u.groupby("cohort_week", as_index=False).agg(cohort_size=("user_id", "size"))
    grid = sz.merge(pd.DataFrame({"week_offset": [0, 1, 2]}), how="cross")
    e = events.merge(u, on="user_id")
    e["off"] = (e["day"] - e["signup_day"]) // 7
    rows = []
    for _, g in grid.iterrows():
        hit = e[(e["cohort_week"] == g["cohort_week"]) & (e["off"] == g["week_offset"]) & (e["day"] >= e["signup_day"])]
        active = hit["user_id"].nunique()
        rows.append((g["cohort_week"], g["week_offset"], g["cohort_size"], active, round(100.0 * active / max(active, 1), 1)))
    r = pd.DataFrame(rows, columns=["cohort_week", "week_offset", "cohort_size", "active", "pct"])
    return r.sort_values(["cohort_week", "week_offset"]).reset_index(drop=True)`],
    hints: ['Retention is a share of the cohort, so the denominator is its size.', 'The cross product keeps the empty weeks.'],
    why: 'Dividing by the cohort size is what makes two cohorts of different sizes comparable at all.',
    mistakes: 'Dividing by the active count gives 100 per cent everywhere, which looks plausible only while nobody has churned.' },

  { t: 'Ordered Funnel Within One Session', tags: ['funnel', 'sessionization', 'pivot'], o: true,
    story: 'A funnel only counts when the steps happen in order, inside the same session (a gap of more than 30 minutes starts a new one).',
    task: 'Return step_no, step and sessions for login, view, add_to_cart and purchase, where each step must happen strictly after the one before it in the same session. Order by step_no.',
    setup: `events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 1, 1], "minute": [0, 5, 10, 15], "event_type": ["login", "view", "add_to_cart", "purchase"]})`,
    hidden: [
      `events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 1, 1], "minute": [0, 5, 10, 15], "event_type": ["login", "add_to_cart", "view", "purchase"]})`,
      `events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5], "user_id": [1, 1, 2, 2, 2], "minute": [0, 5, 0, 5, 10], "event_type": ["login", "view", "login", "view", "add_to_cart"]})`,
    ],
    sig: 'def solve(events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(events):
    e = events.sort_values(["user_id", "minute"]).copy()
    gap = e["minute"] - e.groupby("user_id")["minute"].shift()
    e["sn"] = (gap.isna() | (gap > 30)).astype(int).groupby(e["user_id"]).cumsum()
    def first(s, kind):
        v = s.loc[s["event_type"] == kind, "minute"]
        return v.min() if len(v) else np.nan
    rows = []
    for (_, _), s in e.groupby(["user_id", "sn"]):
        rows.append([first(s, k) for k in ["login", "view", "add_to_cart", "purchase"]])
    m = pd.DataFrame(rows, columns=["t1", "t2", "t3", "t4"])
    ok1 = m["t1"].notna()
    ok2 = ok1 & (m["t2"] > m["t1"])
    ok3 = ok2 & (m["t3"] > m["t2"])
    ok4 = ok3 & (m["t4"] > m["t3"])
    return pd.DataFrame({"step_no": [1, 2, 3, 4], "step": ["login", "view", "add_to_cart", "purchase"],
                         "sessions": [int(ok1.sum()), int(ok2.sum()), int(ok3.sum()), int(ok4.sum())]})`,
    wrong: [`def solve(events):
    e = events.sort_values(["user_id", "minute"]).copy()
    gap = e["minute"] - e.groupby("user_id")["minute"].shift()
    e["sn"] = (gap.isna() | (gap > 30)).astype(int).groupby(e["user_id"]).cumsum()
    rows = []
    for (_, _), s in e.groupby(["user_id", "sn"]):
        rows.append([int((s["event_type"] == k).any()) for k in ["login", "view", "add_to_cart", "purchase"]])
    m = pd.DataFrame(rows, columns=["t1", "t2", "t3", "t4"])
    return pd.DataFrame({"step_no": [1, 2, 3, 4], "step": ["login", "view", "add_to_cart", "purchase"],
                         "sessions": [int(m["t1"].sum()), int(m["t2"].sum()), int(m["t3"].sum()), int(m["t4"].sum())]})`],
    hints: ['Collapse each session to the first time of each step.', 'Then "in order" is a chain of comparisons.'],
    why: 'Once a session is one row of timestamps, the ordering requirement becomes arithmetic the funnel can enforce.',
    mistakes: 'Only asking whether a step appeared counts a session that added to the cart before it ever looked at anything.' },

  { t: 'Deposit Streaks and What They Were Worth', tags: ['gaps and islands', 'groupby', 'filtering'], o: true,
    story: 'A streak is consecutive days with at least one deposit.',
    task: 'Return owner, streak_days, started, ended and deposited (total deposits inside the streak) for each account\'s longest deposit streak, breaking ties by the earlier start. Order by owner.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 5, 6], "amount": [100, 200, 300, 400], "kind": ["deposit"] * 4})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5], "account_id": [1, 1, 1, 2, 2], "day": [1, 2, 9, 5, 6], "amount": [100, 200, 900, 300, 400], "kind": ["deposit"] * 5})`,
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 1], "day": [1, 2, 3], "amount": [100, 200, 300], "kind": ["deposit", "withdrawal", "deposit"]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    dep = transactions[transactions["kind"] == "deposit"]
    d = dep[["account_id", "day"]].drop_duplicates().sort_values(["account_id", "day"]).copy()
    d["grp"] = d["day"] - d.groupby("account_id").cumcount()
    r = d.groupby(["account_id", "grp"], as_index=False).agg(streak_days=("day", "size"), started=("day", "min"), ended=("day", "max"))
    r = r.sort_values(["account_id", "streak_days", "started"], ascending=[True, False, True])
    best = r.groupby("account_id", as_index=False).head(1).copy()
    vals = []
    for _, b in best.iterrows():
        inside = dep[(dep["account_id"] == b["account_id"]) & (dep["day"] >= b["started"]) & (dep["day"] <= b["ended"])]
        vals.append(int(inside["amount"].sum()))
    best["deposited"] = vals
    out = best.merge(accounts, on="account_id")
    return out.sort_values("owner")[["owner", "streak_days", "started", "ended", "deposited"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    dep = transactions[transactions["kind"] == "deposit"]
    d = dep[["account_id", "day"]].drop_duplicates().sort_values(["account_id", "day"]).copy()
    d["grp"] = d["day"] - d.groupby("account_id").cumcount()
    r = d.groupby(["account_id", "grp"], as_index=False).agg(streak_days=("day", "size"), started=("day", "min"), ended=("day", "max"))
    r = r.sort_values(["account_id", "streak_days", "started"], ascending=[True, False, True])
    best = r.groupby("account_id", as_index=False).head(1).copy()
    tot = dep.groupby("account_id", as_index=False)["amount"].sum().rename(columns={"amount": "deposited"})
    best = best.merge(tot, on="account_id")
    best["deposited"] = best["deposited"].astype(int)
    out = best.merge(accounts, on="account_id")
    return out.sort_values("owner")[["owner", "streak_days", "started", "ended", "deposited"]].reset_index(drop=True)`],
    hints: ['Find the island first, then go back for the money inside it.', 'The island gives you a date range.'],
    why: 'The streak is a window of days, so its value is the deposits that fall inside that window.',
    mistakes: 'Totalling every deposit of the account includes money paid in long outside the streak.' },

  { t: 'Maximum Drawdown and When It Happened', tags: ['cumsum', 'cummax', 'idxmax'], o: true,
    story: 'A drawdown is how far the balance fell from its highest point so far.',
    task: 'Return owner, peak_balance, trough_balance, drawdown (peak minus trough) and trough_day for the worst drawdown of each account, breaking ties by the earlier day. Order by owner.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "amount": [1000, -400, 500, -200]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 1], "day": [1, 2, 3], "amount": [-300, 1000, -100]})`,
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "amount": [1000, 400, -500, 900]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["bal"] = t.groupby("account_id")["amount"].cumsum()
    t["peak"] = t.groupby("account_id")["bal"].cummax()
    t["dd"] = t["peak"] - t["bal"]
    t = t.sort_values(["account_id", "dd", "day"], ascending=[True, False, True])
    pick = t.groupby("account_id", as_index=False).head(1)
    out = pick.merge(accounts, on="account_id")
    return out.sort_values("owner")[["owner", "peak", "bal", "dd", "day"]].rename(columns={"peak": "peak_balance", "bal": "trough_balance", "dd": "drawdown", "day": "trough_day"}).reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["bal"] = t.groupby("account_id")["amount"].cumsum()
    t["peak"] = t.groupby("account_id")["bal"].transform("max")
    t["dd"] = t["peak"] - t["bal"]
    t = t.sort_values(["account_id", "dd", "day"], ascending=[True, False, True])
    pick = t.groupby("account_id", as_index=False).head(1)
    out = pick.merge(accounts, on="account_id")
    return out.sort_values("owner")[["owner", "peak", "bal", "dd", "day"]].rename(columns={"peak": "peak_balance", "bal": "trough_balance", "dd": "drawdown", "day": "trough_day"}).reset_index(drop=True)`],
    hints: ['The peak is the highest point so far, not the highest ever.', 'cummax walks the rows in order.'],
    why: 'A drawdown measures a fall that actually happened, so the peak has to come before the trough.',
    mistakes: 'The overall maximum invents a fall from a peak the account only reached later.' },

  { t: 'Month Spine With a Carried Balance', tags: ['date spine', 'cross merge', 'cumsum'], o: true,
    story: 'A statement has a row for every month, even the quiet ones, and the balance carries through them.',
    task: 'For months 1 to 3, return owner, month, net (that month\'s movements, 0 when none) and closing (balance at the end of the month). Order by owner, month.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6], "account_id": [1, 1, 1, 2, 2, 2], "month": [1, 2, 3, 1, 2, 3], "amount": [500, 300, -200, 100, 100, 100]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "month": [1, 3, 1, 2], "amount": [500, -200, 100, 100]})`,
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2], "account_id": [1, 1], "month": [2, 2], "amount": [500, -100]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    grid = accounts[["account_id"]].merge(pd.DataFrame({"month": [1, 2, 3]}), how="cross")
    m = transactions.groupby(["account_id", "month"], as_index=False)["amount"].sum().rename(columns={"amount": "net"})
    g = grid.merge(m, on=["account_id", "month"], how="left")
    g["net"] = g["net"].fillna(0).astype(int)
    g = g.sort_values(["account_id", "month"])
    g["closing"] = g.groupby("account_id")["net"].cumsum()
    out = g.merge(accounts, on="account_id")
    return out.sort_values(["owner", "month"])[["owner", "month", "net", "closing"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    m = transactions.groupby(["account_id", "month"], as_index=False)["amount"].sum().rename(columns={"amount": "net"})
    m = m.sort_values(["account_id", "month"])
    m["closing"] = m.groupby("account_id")["net"].cumsum()
    out = m.merge(accounts, on="account_id")
    return out.sort_values(["owner", "month"])[["owner", "month", "net", "closing"]].reset_index(drop=True)`],
    hints: ['Build every account-month pair first.', 'A left merge turns a quiet month into a zero rather than a hole.'],
    why: 'The spine is what makes an empty month appear at all, and the running total then carries the balance across it.',
    mistakes: 'Grouping the transactions alone skips the months with no movement, so the statement has holes.' },

  { t: 'Monthly Net Split by Kind', tags: ['pivot', 'conditional sum', 'cumsum'], o: true,
    story: 'Each month is broken into deposits, withdrawals and fees, and the balance keeps running.',
    task: 'Return owner, month, deposits, withdrawals, fees, net and closing (running net within the account). Months with no transactions are not shown. Order by owner, month.',
    setup: `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 1, 1], "month": [1, 1, 2, 2], "amount": [500, -200, 300, -50], "kind": ["deposit", "withdrawal", "deposit", "fee"]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "month": [1, 2, 1, 2], "amount": [500, 300, 100, -50], "kind": ["deposit", "deposit", "deposit", "fee"]})`,
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 1], "month": [1, 2, 3], "amount": [500, -600, 200], "kind": ["deposit", "withdrawal", "deposit"]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    t = transactions.copy()
    for k in ["deposit", "withdrawal", "fee"]:
        t[k] = np.where(t["kind"] == k, t["amount"], 0)
    m = t.groupby(["account_id", "month"], as_index=False).agg(
        deposits=("deposit", "sum"), withdrawals=("withdrawal", "sum"), fees=("fee", "sum"), net=("amount", "sum"))
    m = m.sort_values(["account_id", "month"])
    m["closing"] = m.groupby("account_id")["net"].cumsum()
    out = m.merge(accounts, on="account_id")
    return out.sort_values(["owner", "month"])[["owner", "month", "deposits", "withdrawals", "fees", "net", "closing"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    t = transactions.copy()
    for k in ["deposit", "withdrawal", "fee"]:
        t[k] = np.where(t["kind"] == k, t["amount"], 0)
    m = t.groupby(["account_id", "month"], as_index=False).agg(
        deposits=("deposit", "sum"), withdrawals=("withdrawal", "sum"), fees=("fee", "sum"), net=("amount", "sum"))
    m = m.sort_values(["account_id", "month"])
    m["closing"] = m["net"].cumsum()
    out = m.merge(accounts, on="account_id")
    return out.sort_values(["owner", "month"])[["owner", "month", "deposits", "withdrawals", "fees", "net", "closing"]].reset_index(drop=True)`],
    hints: ['One conditional column per kind turns rows into columns.', 'The closing balance runs inside the account.'],
    why: 'A grouped cumulative sum restarts for each account, which is what a per-account statement needs.',
    mistakes: 'A plain cumsum carries one account\'s balance into the next one.' },

  { t: 'Days With Money In and Money Out', tags: ['groupby', 'filter', 'conditional sum'], o: true,
    story: 'A day with both a credit and a debit is worth reconciling.',
    task: 'Return owner, day, money_in, money_out, net and txns for every account-day with at least one positive and one negative amount. Order by owner, day.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5], "account_id": [1, 1, 2, 2, 2], "day": [1, 1, 3, 3, 4], "amount": [600, -100, 500, -50, 200]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 1, 3, 3], "amount": [600, 100, 500, -50]})`,
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 1], "day": [1, 1, 1], "amount": [600, -100, -200]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    t = transactions.copy()
    t["money_in"] = np.where(t["amount"] > 0, t["amount"], 0)
    t["money_out"] = np.where(t["amount"] < 0, t["amount"], 0)
    t["pos"] = (t["amount"] > 0).astype(int)
    t["neg"] = (t["amount"] < 0).astype(int)
    g = t.groupby(["account_id", "day"], as_index=False).agg(
        money_in=("money_in", "sum"), money_out=("money_out", "sum"), net=("amount", "sum"),
        txns=("txn_id", "size"), pos=("pos", "sum"), neg=("neg", "sum"))
    g = g[(g["pos"] > 0) & (g["neg"] > 0)]
    out = g.merge(accounts, on="account_id")
    return out.sort_values(["owner", "day"])[["owner", "day", "money_in", "money_out", "net", "txns"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    t = transactions.copy()
    t["money_in"] = np.where(t["amount"] > 0, t["amount"], 0)
    t["money_out"] = np.where(t["amount"] < 0, t["amount"], 0)
    g = t.groupby(["account_id", "day"], as_index=False).agg(
        money_in=("money_in", "sum"), money_out=("money_out", "sum"), net=("amount", "sum"), txns=("txn_id", "size"))
    g = g[g["txns"] > 1]
    out = g.merge(accounts, on="account_id")
    return out.sort_values(["owner", "day"])[["owner", "day", "money_in", "money_out", "net", "txns"]].reset_index(drop=True)`],
    hints: ['Count the positives and the negatives separately.', 'The day needs at least one of each.'],
    why: 'Counting each sign is what makes the condition say what it means, whatever else happened that day.',
    mistakes: 'Keeping the busy days catches a day with two deposits and nothing going out.' },

  { t: 'Top Three Pay Levels per Department', tags: ['drop_duplicates', 'cumcount', 'groupby'], o: true,
    story: 'A pay band is a salary level, however many people sit on it.',
    task: 'Return department, level (1 for the highest), salary, people (how many are on that salary) and first_name (alphabetically first of them), for the top three levels of each department. Order by department, level.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 1, 1], "salary": [180000, 140000, 110000, 90000]})
departments = pd.DataFrame({"dept_id": [1], "department": ["Engineering"]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 1, 1], "salary": [180000, 180000, 110000, 90000]})
departments = pd.DataFrame({"dept_id": [1], "department": ["Engineering"]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 2, 2], "salary": [180000, 140000, 110000, 90000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame, departments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees, departments):
    lv = employees[["dept_id", "salary"]].drop_duplicates().sort_values(["dept_id", "salary"], ascending=[True, False]).copy()
    lv["level"] = lv.groupby("dept_id").cumcount() + 1
    lv = lv[lv["level"] <= 3]
    m = employees.groupby(["dept_id", "salary"], as_index=False).agg(people=("employee_id", "size"), first_name=("name", "min"))
    out = lv.merge(m, on=["dept_id", "salary"]).merge(departments, on="dept_id")
    return out.sort_values(["department", "level"])[["department", "level", "salary", "people", "first_name"]].reset_index(drop=True)`,
    wrong: [`def solve(employees, departments):
    e = employees.sort_values(["dept_id", "salary"], ascending=[True, False]).copy()
    e["level"] = e.groupby("dept_id").cumcount() + 1
    e = e[e["level"] <= 3]
    m = employees.groupby(["dept_id", "salary"], as_index=False).agg(people=("employee_id", "size"), first_name=("name", "min"))
    out = e[["dept_id", "salary", "level"]].merge(m, on=["dept_id", "salary"]).merge(departments, on="dept_id")
    return out.sort_values(["department", "level"])[["department", "level", "salary", "people", "first_name"]].reset_index(drop=True)`],
    hints: ['A level is a distinct salary, so drop the duplicates before numbering.', 'Count the members separately and merge them back.'],
    why: 'Numbering distinct salaries keeps a shared level from using up two of the three places.',
    mistakes: 'Numbering the employees makes two people on the same salary look like two different levels.' },

  { t: 'Median, Quartiles and Spread per City', tags: ['percentile', 'sorting', 'groupby'], o: true,
    story: 'Pricing wants the shape of the fare distribution in each city, not just its average.',
    task: 'Over completed trips, return city, p25, median (1 decimal, the average of the middle two when the count is even), p75 and spread (highest fare minus lowest). Use nearest-rank quartiles: position (n + 3) // 4 for p25 and (3n + 3) // 4 for p75, 1-based over the fares sorted ascending. Order by city.',
    setup: `drivers = pd.DataFrame({"driver_id": [1], "driver": ["Arun"], "city": ["Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4, 5], "driver_id": [1] * 5, "city": ["Mumbai"] * 5, "status": ["completed"] * 5, "fare": [100, 200, 300, 400, 500]})`,
    hidden: [
      `drivers = pd.DataFrame({"driver_id": [1], "driver": ["Arun"], "city": ["Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "driver_id": [1] * 4, "city": ["Mumbai"] * 4, "status": ["completed"] * 4, "fare": [100, 200, 300, 400]})`,
      `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Delhi"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4, 5, 6], "driver_id": [1, 1, 1, 2, 2, 2], "city": ["Mumbai"] * 3 + ["Delhi"] * 3, "status": ["completed"] * 6, "fare": [100, 200, 900, 150, 150, 150]})`,
    ],
    sig: 'def solve(drivers: pd.DataFrame, trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(drivers, trips):
    t = trips[trips["status"] == "completed"].merge(drivers[["driver_id"]], on="driver_id")
    rows = []
    for city, g in t.groupby("city"):
        v = sorted(g["fare"].tolist())
        n = len(v)
        p25 = v[(n + 3) // 4 - 1]
        p75 = v[(3 * n + 3) // 4 - 1]
        mid = (v[(n + 1) // 2 - 1] + v[(n + 2) // 2 - 1]) / 2
        rows.append((city, p25, round(mid, 1), p75, v[-1] - v[0]))
    return pd.DataFrame(rows, columns=["city", "p25", "median", "p75", "spread"]).sort_values("city").reset_index(drop=True)`,
    wrong: [`def solve(drivers, trips):
    t = trips[trips["status"] == "completed"].merge(drivers[["driver_id"]], on="driver_id")
    rows = []
    for city, g in t.groupby("city"):
        s = g["fare"]
        rows.append((city, int(s.quantile(0.25)), round(s.median(), 1), int(s.quantile(0.75)), int(s.max() - s.min())))
    return pd.DataFrame(rows, columns=["city", "p25", "median", "p75", "spread"]).sort_values("city").reset_index(drop=True)`],
    hints: ['A nearest-rank quartile is a position in the sorted fares.', 'It never invents a value between two fares.'],
    why: 'Nearest-rank picks an actual observed fare, which is what the question asks for.',
    mistakes: 'The default quantile interpolates between two fares, and the two agree only when the count divides evenly.' },

  { t: 'Longest Completed Run, and What Broke It', tags: ['gaps and islands', 'cumcount', 'shift'], o: true,
    story: 'A driver\'s run is consecutive trips that all completed, in request order.',
    task: 'Return city, driver, run_length, started and broken_by (the status of the trip that ended the run, NaN when nothing did) for each driver\'s longest run, breaking ties by the earlier start. Order by city, driver.',
    setup: `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "driver_id": [1, 1, 2, 2], "minute": [10, 20, 10, 20], "status": ["completed"] * 4})`,
    hidden: [
      `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4, 5], "driver_id": [1, 1, 1, 2, 2], "minute": [10, 20, 30, 10, 20], "status": ["completed", "cancelled_by_rider", "completed", "completed", "completed"]})`,
      `drivers = pd.DataFrame({"driver_id": [1], "driver": ["Arun"], "city": ["Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3], "driver_id": [1, 1, 1], "minute": [10, 20, 30], "status": ["completed", "completed", "cancelled_by_driver"]})`,
    ],
    sig: 'def solve(drivers: pd.DataFrame, trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(drivers, trips):
    t = trips.sort_values(["driver_id", "minute"]).copy()
    t["seq"] = t.groupby("driver_id").cumcount() + 1
    t["grp"] = t["seq"] - t.groupby(["driver_id", "status"]).cumcount()
    done = t[t["status"] == "completed"]
    r = done.groupby(["driver_id", "grp"], as_index=False).agg(run_length=("seq", "size"), started=("minute", "min"), last_seq=("seq", "max"))
    r = r.sort_values(["driver_id", "run_length", "started"], ascending=[True, False, True])
    best = r.groupby("driver_id", as_index=False).head(1).copy()
    nxt = t[["driver_id", "seq", "status"]].rename(columns={"seq": "last_seq", "status": "broken_by"})
    best["last_seq"] = best["last_seq"] + 1
    best = best.merge(nxt, on=["driver_id", "last_seq"], how="left")
    out = best.merge(drivers, on="driver_id")
    return out.sort_values(["city", "driver"])[["city", "driver", "run_length", "started", "broken_by"]].reset_index(drop=True)`,
    wrong: [`def solve(drivers, trips):
    t = trips.sort_values(["driver_id", "minute"]).copy()
    t["seq"] = t.groupby("driver_id").cumcount() + 1
    done = t[t["status"] == "completed"]
    r = done.groupby("driver_id", as_index=False).agg(run_length=("seq", "size"), started=("minute", "min"), last_seq=("seq", "max"))
    nxt = t[["driver_id", "seq", "status"]].rename(columns={"seq": "last_seq", "status": "broken_by"})
    r["last_seq"] = r["last_seq"] + 1
    r = r.merge(nxt, on=["driver_id", "last_seq"], how="left")
    out = r.merge(drivers, on="driver_id")
    return out.sort_values(["city", "driver"])[["city", "driver", "run_length", "started", "broken_by"]].reset_index(drop=True)`],
    hints: ['Number the trips overall and within the status; the difference labels each run.', 'Keep the overall position so you can look up the next trip.'],
    why: 'The overall sequence is what lets you find the trip immediately after the run, which is the one that broke it.',
    mistakes: 'Counting completed trips reports one long run even when a cancellation split it in two.' },

  { t: 'Hours That Beat the City Rate', tags: ['ratio', 'groupby', 'merge'], o: true,
    story: 'The fare per kilometre is higher in some hours than the city normally charges.',
    task: 'Over completed trips, return city, hour, trips, hour_rate (total fare over total km, 2 decimals), city_rate (2 decimals) and surge_pct (how far the hour is above the city rate, 1 decimal), for the hours above their city\'s rate. Order by city, hour.',
    setup: `trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "city": ["Mumbai"] * 4, "hour": [8, 8, 18, 18], "status": ["completed"] * 4, "fare": [100, 200, 300, 100], "km": [10, 10, 10, 10]})`,
    hidden: [
      `trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "city": ["Mumbai"] * 4, "hour": [8, 8, 18, 18], "status": ["completed"] * 4, "fare": [100, 200, 300, 100], "km": [10, 20, 10, 10]})`,
      `trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "city": ["Mumbai", "Mumbai", "Delhi", "Delhi"], "hour": [8, 18, 9, 20], "status": ["completed"] * 4, "fare": [100, 300, 200, 100], "km": [10, 10, 10, 10]})`,
    ],
    sig: 'def solve(trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(trips):
    t = trips[trips["status"] == "completed"]
    c = t.groupby("city", as_index=False).agg(f=("fare", "sum"), k=("km", "sum"))
    c["city_rate"] = c["f"] / c["k"]
    h = t.groupby(["city", "hour"], as_index=False).agg(trips=("trip_id", "size"), f=("fare", "sum"), k=("km", "sum"))
    h["hour_rate"] = h["f"] / h["k"]
    m = h.merge(c[["city", "city_rate"]], on="city")
    m = m[m["hour_rate"] > m["city_rate"]].copy()
    m["surge_pct"] = (100.0 * (m["hour_rate"] - m["city_rate"]) / m["city_rate"]).round(1)
    m["hour_rate"] = m["hour_rate"].round(2)
    m["city_rate"] = m["city_rate"].round(2)
    return m.sort_values(["city", "hour"])[["city", "hour", "trips", "hour_rate", "city_rate", "surge_pct"]].reset_index(drop=True)`,
    wrong: [`def solve(trips):
    t = trips[trips["status"] == "completed"].copy()
    t["rate"] = t["fare"] / t["km"]
    c = t.groupby("city", as_index=False)["rate"].mean().rename(columns={"rate": "city_rate"})
    h = t.groupby(["city", "hour"], as_index=False).agg(trips=("trip_id", "size"), f=("fare", "sum"), k=("km", "sum"))
    h["hour_rate"] = h["f"] / h["k"]
    m = h.merge(c, on="city")
    m = m[m["hour_rate"] > m["city_rate"]].copy()
    m["surge_pct"] = (100.0 * (m["hour_rate"] - m["city_rate"]) / m["city_rate"]).round(1)
    m["hour_rate"] = m["hour_rate"].round(2)
    m["city_rate"] = m["city_rate"].round(2)
    return m.sort_values(["city", "hour"])[["city", "hour", "trips", "hour_rate", "city_rate", "surge_pct"]].reset_index(drop=True)`],
    hints: ['A rate over a group is total over total.', 'Averaging per-trip rates weights a short trip like a long one.'],
    why: 'Summing the fares and the distances before dividing weights every kilometre equally, which is what a rate means.',
    mistakes: 'The mean of per-trip rates agrees only when every trip has the same rate, and drifts as soon as the distances differ.' },

  { t: 'Percentile Within Class and Within Course', tags: ['rank', 'percentile', 'groupby'], o: true,
    story: 'A student can look strong in their class and ordinary across the year group, or the other way round.',
    task: 'Return course, student, course_class, course_pct and class_pct (3 decimals each): the share of scores strictly below theirs, over one less than the number of scores in the group (0.0 when the group has one row). Order by course, course_class, student.',
    setup: `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Aarav", "Bhavna", "Chirag", "Disha"], "course_class": ["A"] * 4})
scores = pd.DataFrame({"student_id": [1, 2, 3, 4], "course_id": [1] * 4, "score": [90, 80, 70, 60]})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Aarav", "Bhavna", "Chirag", "Disha"], "course_class": ["A", "A", "B", "B"]})
scores = pd.DataFrame({"student_id": [1, 2, 3, 4], "course_id": [1] * 4, "score": [90, 80, 70, 60]})`,
      `courses = pd.DataFrame({"course_id": [1, 2], "course": ["Math", "Physics"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"], "course_class": ["A", "A"]})
scores = pd.DataFrame({"student_id": [1, 2, 1, 2], "course_id": [1, 1, 2, 2], "score": [90, 80, 60, 95]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, students, scores):
    s = scores.merge(students, on="student_id").merge(courses, on="course_id").copy()
    def pct(g):
        n = len(g)
        return (g.rank(method="min") - 1) / (n - 1) if n > 1 else g * 0.0
    s["course_pct"] = s.groupby("course_id")["score"].transform(pct).round(3)
    s["class_pct"] = s.groupby(["course_id", "course_class"])["score"].transform(pct).round(3)
    return s.sort_values(["course", "course_class", "student"])[["course", "student", "course_class", "course_pct", "class_pct"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, students, scores):
    s = scores.merge(students, on="student_id").merge(courses, on="course_id").copy()
    def pct(g):
        n = len(g)
        return (g.rank(method="min") - 1) / (n - 1) if n > 1 else g * 0.0
    s["course_pct"] = s.groupby("course_id")["score"].transform(pct).round(3)
    s["class_pct"] = s["course_pct"]
    return s.sort_values(["course", "course_class", "student"])[["course", "student", "course_class", "course_pct", "class_pct"]].reset_index(drop=True)`],
    hints: ['The same calculation, two different groupings.', 'The class one adds the class to the group.'],
    why: 'A percentile only means something against a stated peer group, so each column groups differently.',
    mistakes: 'Reusing the course percentile is identical while there is one class and wrong the moment there are two.' },

  { t: 'Most Improved per Course, in Context', tags: ['pivot', 'rank', 'transform'], o: true,
    story: 'Improvement is the T2 score minus the T1 score in the same course.',
    task: 'Return course, student, gain and course_avg_gain (2 decimals) for the most improved student in each course, breaking ties by student_id. Order by course.',
    setup: `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2], "course_id": [1] * 4, "term": ["T1", "T2", "T1", "T2"], "score": [60, 90, 70, 75]})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2], "course_id": [1] * 4, "term": ["T1", "T2", "T1", "T2"], "score": [90, 60, 70, 75]})`,
      `courses = pd.DataFrame({"course_id": [1, 2], "course": ["Math", "Physics"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2, 1, 1, 2, 2], "course_id": [1, 1, 1, 1, 2, 2, 2, 2], "term": ["T1", "T2"] * 4, "score": [60, 90, 70, 75, 50, 55, 80, 95]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, students, scores):
    p = scores.pivot_table(index=["student_id", "course_id"], columns="term", values="score", aggfunc="max").reset_index()
    p["gain"] = p["T2"] - p["T1"]
    p["course_avg_gain"] = p.groupby("course_id")["gain"].transform("mean").round(2)
    p = p.sort_values(["course_id", "gain", "student_id"], ascending=[True, False, True])
    best = p.groupby("course_id", as_index=False).head(1)
    out = best.merge(students, on="student_id").merge(courses, on="course_id")
    return out.sort_values("course")[["course", "student", "gain", "course_avg_gain"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, students, scores):
    g = scores.groupby(["student_id", "course_id"], as_index=False)["score"].agg(["max", "min"]).reset_index()
    g["gain"] = g["max"] - g["min"]
    g["course_avg_gain"] = g.groupby("course_id")["gain"].transform("mean").round(2)
    g = g.sort_values(["course_id", "gain", "student_id"], ascending=[True, False, True])
    best = g.groupby("course_id", as_index=False).head(1)
    out = best.merge(students, on="student_id").merge(courses, on="course_id")
    return out.sort_values("course")[["course", "student", "gain", "course_avg_gain"]].reset_index(drop=True)`],
    hints: ['Pivot the terms onto one row so you can subtract them.', 'The direction of the change matters.'],
    why: 'T2 minus T1 keeps the sign, which is what tells improvement from decline.',
    mistakes: 'Highest minus lowest is always positive, so a student who fell back looks like the most improved.' },

  { t: 'Scores Pivot With the Term Change', tags: ['pivot', 'conditional sum', 'merge'], o: true,
    story: 'The report card shows both terms side by side for each subject.',
    task: 'Return student, math_t1, math_t2, physics_t1, physics_t2 and total_change (all T2 scores minus all T1 scores). Order by student.',
    setup: `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2], "course_id": [1] * 4, "term": ["T1", "T2", "T1", "T2"], "score": [60, 90, 70, 75]})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1, 2], "course": ["Math", "Physics"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 1, 1, 2, 2, 2, 2], "course_id": [1, 1, 2, 2, 1, 1, 2, 2], "term": ["T1", "T2"] * 4, "score": [60, 90, 50, 40, 70, 75, 80, 95]})`,
      `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2], "course_id": [1] * 4, "term": ["T1", "T2", "T1", "T2"], "score": [60, 50, 70, 100]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, students, scores):
    s = scores.merge(students, on="student_id").merge(courses, on="course_id").copy()
    out = students[["student_id", "student"]].copy()
    for course, label in [("Math", "math"), ("Physics", "physics")]:
        for term in ["T1", "T2"]:
            sub = s[(s["course"] == course) & (s["term"] == term)][["student_id", "score"]]
            out = out.merge(sub.rename(columns={"score": label + "_" + term.lower()}), on="student_id", how="left")
    s["signed"] = np.where(s["term"] == "T2", s["score"], -s["score"])
    ch = s.groupby("student_id", as_index=False)["signed"].sum().rename(columns={"signed": "total_change"})
    out = out.merge(ch, on="student_id")
    return out.sort_values("student")[["student", "math_t1", "math_t2", "physics_t1", "physics_t2", "total_change"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, students, scores):
    s = scores.merge(students, on="student_id").merge(courses, on="course_id").copy()
    out = students[["student_id", "student"]].copy()
    for course, label in [("Math", "math"), ("Physics", "physics")]:
        for term in ["T1", "T2"]:
            sub = s[(s["course"] == course) & (s["term"] == term)][["student_id", "score"]]
            out = out.merge(sub.rename(columns={"score": label + "_" + term.lower()}), on="student_id", how="left")
    out["total_change"] = out["math_t2"] - out["math_t1"]
    return out.sort_values("student")[["student", "math_t1", "math_t2", "physics_t1", "physics_t2", "total_change"]].reset_index(drop=True)`],
    hints: ['The change covers every subject, not just the first column.', 'Sign the scores by term and add them up.'],
    why: 'Signing by term turns the overall change into one grouped sum, whatever subjects the student took.',
    mistakes: 'Subtracting the maths columns is the whole change only while maths is the only subject.' },

  { t: 'Students Who Improved in Every Course', tags: ['pivot', 'groupby', 'min'], o: true,
    story: 'Some students went up in every single subject, not just on average.',
    task: 'Return student, courses, smallest_gain and biggest_gain for students whose T2 score beat their T1 score in every course they took. Order by student.',
    setup: `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2], "course_id": [1] * 4, "term": ["T1", "T2", "T1", "T2"], "score": [60, 90, 70, 65]})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1, 2], "course": ["Math", "Physics"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 1, 1, 2, 2, 2, 2], "course_id": [1, 1, 2, 2, 1, 1, 2, 2], "term": ["T1", "T2"] * 4, "score": [60, 90, 50, 45, 70, 80, 60, 70]})`,
      `courses = pd.DataFrame({"course_id": [1, 2], "course": ["Math", "Physics"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 1, 1, 1, 2, 2, 2, 2], "course_id": [1, 1, 2, 2, 1, 1, 2, 2], "term": ["T1", "T2"] * 4, "score": [60, 90, 50, 55, 70, 65, 60, 70]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, students, scores):
    p = scores.pivot_table(index=["student_id", "course_id"], columns="term", values="score", aggfunc="max").reset_index()
    p["gain"] = p["T2"] - p["T1"]
    g = p.groupby("student_id", as_index=False).agg(courses=("course_id", "size"), smallest_gain=("gain", "min"), biggest_gain=("gain", "max"))
    g = g[g["smallest_gain"] > 0]
    out = g.merge(students, on="student_id")
    return out.sort_values("student")[["student", "courses", "smallest_gain", "biggest_gain"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, students, scores):
    p = scores.pivot_table(index=["student_id", "course_id"], columns="term", values="score", aggfunc="max").reset_index()
    p["gain"] = p["T2"] - p["T1"]
    g = p.groupby("student_id", as_index=False).agg(courses=("course_id", "size"), smallest_gain=("gain", "min"), biggest_gain=("gain", "max"), avg=("gain", "mean"))
    g = g[g["avg"] > 0]
    out = g.merge(students, on="student_id")
    return out.sort_values("student")[["student", "courses", "smallest_gain", "biggest_gain"]].reset_index(drop=True)`],
    hints: ['"Every course" is a condition on the smallest gain.', 'An average can hide a subject that went backwards.'],
    why: 'Once each course has a gain, the smallest one being positive says exactly that none of them fell.',
    mistakes: 'A positive average passes a student who went up in one subject and down in another.' },

  { t: 'Event Mix per User, With Conversion', tags: ['pivot', 'conditional sum', 'division'], o: true,
    story: 'Product wants one row per active user: what they did, and how often a cart turned into a purchase.',
    task: 'Return name, logins, views, carts, purchases and cart_to_purchase_pct (purchases over carts, 1 decimal, NaN when there were no carts), for users with at least one event. Order by name.',
    setup: `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6, 7], "user_id": [1, 1, 1, 1, 2, 2, 2], "event_type": ["login", "view", "add_to_cart", "purchase", "login", "view", "add_to_cart"]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6, 7], "user_id": [1, 1, 1, 1, 2, 2, 2], "event_type": ["login", "view", "view", "purchase", "login", "add_to_cart", "purchase"]})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3], "name": ["Ana", "Bo", "Cy"]})
events = pd.DataFrame({"event_id": [1, 2, 3], "user_id": [1, 1, 2], "event_type": ["login", "add_to_cart", "login"]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    e = events.copy()
    for k in ["login", "view", "add_to_cart", "purchase"]:
        e[k] = (e["event_type"] == k).astype(int)
    g = e.groupby("user_id", as_index=False).agg(logins=("login", "sum"), views=("view", "sum"), carts=("add_to_cart", "sum"), purchases=("purchase", "sum"))
    g["cart_to_purchase_pct"] = (100.0 * g["purchases"] / g["carts"].replace(0, np.nan)).round(1)
    out = g.merge(users, on="user_id")
    return out.sort_values("name")[["name", "logins", "views", "carts", "purchases", "cart_to_purchase_pct"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    e = events.copy()
    for k in ["login", "view", "add_to_cart", "purchase"]:
        e[k] = (e["event_type"] == k).astype(int)
    g = e.groupby("user_id", as_index=False).agg(logins=("login", "sum"), views=("view", "sum"), carts=("add_to_cart", "sum"), purchases=("purchase", "sum"))
    g["cart_to_purchase_pct"] = (100.0 * g["purchases"] / g["views"].replace(0, np.nan)).round(1)
    out = g.merge(users, on="user_id")
    return out.sort_values("name")[["name", "logins", "views", "carts", "purchases", "cart_to_purchase_pct"]].reset_index(drop=True)`],
    hints: ['The denominator is the carts.', 'Turn a zero denominator into NaN rather than dividing by it.'],
    why: 'Cart-to-purchase is a step in the funnel, so it is measured against the carts that preceded it.',
    mistakes: 'Dividing by the views answers a different question, and agrees only when the two counts happen to match.' },

  { t: 'Value Tiers With a Recency Rule', tags: ['case', 'groupby', 'dates'], o: true,
    story: 'A tier depends on both how much a customer spent and how recently they ordered. Today is day 100.',
    task: "Return name, spend (delivered orders), last_day, days_since and tier: 'champion' (spend at least 3000 and ordered within 60 days), 'lapsed big spender' (spend at least 3000), 'promising' (ordered within 60 days) or 'dormant'. Order by tier, name.",
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2], "customer_id": [1, 2], "day": [90, 95], "status": ["delivered", "delivered"]})
items = pd.DataFrame({"order_id": [1, 2], "amount": [4000, 500]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2], "customer_id": [1, 2], "day": [10, 95], "status": ["delivered", "delivered"]})
items = pd.DataFrame({"order_id": [1, 2], "amount": [4000, 500]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 1, 2], "day": [10, 90, 20], "status": ["delivered", "delivered", "delivered"]})
items = pd.DataFrame({"order_id": [1, 2, 3], "amount": [2000, 2000, 500]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, items):
    d = orders[orders["status"] == "delivered"].merge(items, on="order_id")
    s = d.groupby("customer_id", as_index=False).agg(spend=("amount", "sum"), last_day=("day", "max"))
    s["days_since"] = 100 - s["last_day"]
    big = s["spend"] >= 3000
    recent = s["days_since"] <= 60
    s["tier"] = np.where(big & recent, "champion", np.where(big, "lapsed big spender", np.where(recent, "promising", "dormant")))
    out = s.merge(customers, on="customer_id")
    return out.sort_values(["tier", "name"])[["name", "spend", "last_day", "days_since", "tier"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, items):
    d = orders[orders["status"] == "delivered"].merge(items, on="order_id")
    s = d.groupby("customer_id", as_index=False).agg(spend=("amount", "sum"), last_day=("day", "max"))
    s["days_since"] = 100 - s["last_day"]
    s["tier"] = np.where(s["spend"] >= 3000, "champion", "promising")
    out = s.merge(customers, on="customer_id")
    return out.sort_values(["tier", "name"])[["name", "spend", "last_day", "days_since", "tier"]].reset_index(drop=True)`],
    hints: ['Both conditions matter, so there are four tiers.', 'Test the two-condition tier first.'],
    why: 'Nesting the conditions from the most specific outwards is what keeps a lapsed spender out of the champion tier.',
    mistakes: 'Tiering on spend alone calls a customer who vanished months ago a champion.' },

  { t: 'Pairs Bought Together, With Confidence', tags: ['self merge', 'market basket', 'ratio'], o: true,
    story: 'Two products bought in the same delivered order are a pair. Confidence is how often one leads to the other.',
    task: 'Return product_a, product_b, pair_orders, confidence_a_to_b and confidence_b_to_a (pair orders over each product\'s own delivered orders, 1 decimal), with product_a\'s id lower than product_b\'s. Order by pair_orders descending, then product_a, then product_b.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "product": ["Notebook", "Pen"]})
orders = pd.DataFrame({"order_id": [1, 2], "status": ["delivered", "delivered"]})
lines = pd.DataFrame({"order_id": [1, 1, 2, 2], "product_id": [1, 2, 1, 2]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Notebook", "Pen"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "status": ["delivered"] * 3})
lines = pd.DataFrame({"order_id": [1, 1, 2, 3], "product_id": [1, 2, 1, 1]})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Notebook", "Pen", "Lamp"]})
orders = pd.DataFrame({"order_id": [1, 2], "status": ["delivered", "delivered"]})
lines = pd.DataFrame({"order_id": [1, 1, 1, 2, 2], "product_id": [1, 2, 3, 2, 3]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, orders, lines):
    li = lines.merge(orders[orders["status"] == "delivered"], on="order_id")[["order_id", "product_id"]].drop_duplicates()
    pc = li.groupby("product_id", as_index=False)["order_id"].nunique().rename(columns={"order_id": "orders"})
    p = li.merge(li, on="order_id", suffixes=("_a", "_b"))
    p = p[p["product_id_a"] < p["product_id_b"]]
    g = p.groupby(["product_id_a", "product_id_b"], as_index=False)["order_id"].size().rename(columns={"size": "pair_orders"})
    g = g.merge(pc.rename(columns={"product_id": "product_id_a", "orders": "oa"}), on="product_id_a")
    g = g.merge(pc.rename(columns={"product_id": "product_id_b", "orders": "ob"}), on="product_id_b")
    g["confidence_a_to_b"] = (100.0 * g["pair_orders"] / g["oa"]).round(1)
    g["confidence_b_to_a"] = (100.0 * g["pair_orders"] / g["ob"]).round(1)
    names = dict(zip(products["product_id"], products["product"]))
    g["product_a"] = g["product_id_a"].map(names)
    g["product_b"] = g["product_id_b"].map(names)
    return g.sort_values(["pair_orders", "product_a", "product_b"], ascending=[False, True, True])[["product_a", "product_b", "pair_orders", "confidence_a_to_b", "confidence_b_to_a"]].reset_index(drop=True)`,
    wrong: [`def solve(products, orders, lines):
    li = lines.merge(orders[orders["status"] == "delivered"], on="order_id")[["order_id", "product_id"]].drop_duplicates()
    total = li["order_id"].nunique()
    p = li.merge(li, on="order_id", suffixes=("_a", "_b"))
    p = p[p["product_id_a"] < p["product_id_b"]]
    g = p.groupby(["product_id_a", "product_id_b"], as_index=False)["order_id"].size().rename(columns={"size": "pair_orders"})
    g["confidence_a_to_b"] = (100.0 * g["pair_orders"] / total).round(1)
    g["confidence_b_to_a"] = (100.0 * g["pair_orders"] / total).round(1)
    names = dict(zip(products["product_id"], products["product"]))
    g["product_a"] = g["product_id_a"].map(names)
    g["product_b"] = g["product_id_b"].map(names)
    return g.sort_values(["pair_orders", "product_a", "product_b"], ascending=[False, True, True])[["product_a", "product_b", "pair_orders", "confidence_a_to_b", "confidence_b_to_a"]].reset_index(drop=True)`],
    hints: ['Each confidence divides by that product\'s own order count.', 'Keeping a < b counts each pair once.'],
    why: 'Dividing by each product\'s own orders is what makes the two confidences differ, which is the point of the measure.',
    mistakes: 'Dividing by every order gives both directions the same number and agrees only when both products are in everything.' },
];
