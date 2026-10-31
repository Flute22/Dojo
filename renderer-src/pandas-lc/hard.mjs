// Pandas, LeetCode-style set: Hard. See medium.mjs for the format.
export default [
  { t: 'Median Rows per Company', tags: ['groupby', 'median', 'even counts'],
    story: 'Payroll wants to see which employees sit in the middle of each company\'s pay scale. When a company has an even number of employees there are two middle people.',
    task: 'Sort each company\'s employees by salary (then id) and return id, company and salary of the middle employee, or of both middle employees when the count is even.',
    setup: `emp = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6, 7, 8],
    "company": ["A", "A", "A", "B", "B", "B", "B", "B"],
    "salary": [30, 10, 20, 50, 40, 90, 60, 70],
})`,
    hidden: [`emp = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6],
    "company": ["A", "A", "A", "A", "C", "C"],
    "salary": [10, 20, 30, 40, 7, 7],
})`, `emp = pd.DataFrame({
    "id": [9, 8, 7, 6],
    "company": ["D", "D", "D", "D"],
    "salary": [5, 5, 5, 5],
})`],
    sig: 'def solve(emp: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(emp):
    s = emp.sort_values(["company", "salary", "id"]).copy()
    s["pos"] = s.groupby("company").cumcount() + 1
    n = s.groupby("company")["id"].transform("size")
    keep = (s["pos"] == (n + 1) // 2) | (s["pos"] == (n + 2) // 2)
    return s.loc[keep, ["id", "company", "salary"]].reset_index(drop=True)`,
    wrong: [`def solve(emp):
    med = emp.groupby("company")["salary"].transform("median")
    return emp.loc[emp["salary"] == med, ["id", "company", "salary"]].reset_index(drop=True)`],
    hints: ['Number each company\'s employees after sorting by salary.', 'For n employees the middle positions are (n+1)//2 and (n+2)//2.'],
    why: 'Sorting and numbering rows within each company turns "the middle" into position arithmetic that works for odd and even counts alike.',
    mistakes: 'Comparing salary to the median value finds nobody when the median is the average of two different salaries.' },

  { t: 'Median of a Frequency Table', tags: ['numpy', 'weighted median'],
    story: 'A survey stores each answer once with a frequency: num is the answer and frequency says how many people gave it.',
    task: 'Return a one-row table with median: the median of all answers if every answer were written out as often as its frequency says. Round to 1 decimal.',
    setup: `numbers = pd.DataFrame({"num": [1, 2, 3], "frequency": [1, 1, 1]})`,
    hidden: [`numbers = pd.DataFrame({"num": [1, 2, 3, 4], "frequency": [5, 1, 1, 1]})`, `numbers = pd.DataFrame({"num": [0, 7, 9], "frequency": [2, 3, 3]})`],
    sig: 'def solve(numbers: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(numbers):
    vals = [n for n, f in zip(numbers["num"], numbers["frequency"]) for _ in range(f)]
    return pd.DataFrame({"median": [round(float(np.median(vals)), 1)]})`,
    wrong: [`def solve(numbers):
    return pd.DataFrame({"median": [round(float(numbers["num"].median()), 1)]})`],
    hints: ['Write each answer out as many times as its frequency says.', 'A list comprehension plus np.median is enough.'],
    why: 'Writing every answer out as often as it occurred gives the real list of responses, after which np.median does the rest.',
    mistakes: 'Taking the median of the num column treats every answer as equally common.' },

  { t: 'Unbroken Status Periods', tags: ['runs', 'dates'],
    story: 'A job runner logs one status per day, but some days are missing. A period is a stretch of consecutive calendar days with the same status.',
    task: 'Return state, start_date and end_date for every period, ordered by start_date.',
    o: true,
    setup: `log = pd.DataFrame({
    "day": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
    "state": ["succeeded", "succeeded", "succeeded", "failed", "failed"],
})`,
    hidden: [`log = pd.DataFrame({
    "day": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
    "state": ["succeeded", "failed", "succeeded", "succeeded", "failed"],
})`, `log = pd.DataFrame({
    "day": ["2024-02-09", "2024-02-01", "2024-02-02", "2024-02-10", "2024-02-04"],
    "state": ["failed", "failed", "failed", "failed", "failed"],
})`],
    sig: 'def solve(log: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(log):
    s = log.sort_values("day").reset_index(drop=True)
    d = pd.to_datetime(s["day"])
    new = (s["state"] != s["state"].shift()) | (d.diff() != pd.Timedelta(days=1))
    g = new.cumsum()
    return s.groupby(g).agg(state=("state", "first"), start_date=("day", "min"), end_date=("day", "max")).reset_index(drop=True)`,
    wrong: [`def solve(log):
    r = log.groupby("state").agg(start_date=("day", "min"), end_date=("day", "max")).reset_index()
    return r.sort_values("start_date")[["state", "start_date", "end_date"]].reset_index(drop=True)`],
    hints: ['A new period starts when the state changes OR when the date is not exactly one day after the previous row.', 'A cumulative sum of those starts numbers the periods.'],
    why: 'Marking the first row of each period and taking a cumulative sum gives every period an id to group by.',
    mistakes: 'Grouping by state merges separate periods of the same state. A missing day also ends a period.' },

  { t: 'Mobile, Desktop and Both', tags: ['groupby', 'reindex', 'zero rows'],
    story: 'A shop tracks daily spend by platform. On a given day a user is counted as "mobile", "desktop", or "both" (if they bought on both platforms that day).',
    task: 'For every date in spending and each platform label in "desktop", "mobile", "both", return spend_date, platform, total_amount and total_users. A "both" user\'s amount is the sum over their two platforms. Combinations without users must appear with zeros.',
    setup: `spending = pd.DataFrame({
    "user_id": [1, 1, 2, 3, 2, 3, 5, 5],
    "spend_date": ["2024-07-01", "2024-07-01", "2024-07-01", "2024-07-01", "2024-07-02", "2024-07-02", "2024-07-02", "2024-07-02"],
    "platform": ["mobile", "desktop", "mobile", "desktop", "mobile", "desktop", "mobile", "desktop"],
    "amount": [100, 100, 100, 300, 100, 100, 50, 50],
})`,
    hidden: [`spending = pd.DataFrame({
    "user_id": [1, 2],
    "spend_date": ["2024-07-01", "2024-07-01"],
    "platform": ["mobile", "mobile"],
    "amount": [10, 20],
})`, `spending = pd.DataFrame({
    "user_id": [4, 4, 4],
    "spend_date": ["2024-08-01", "2024-08-01", "2024-08-02"],
    "platform": ["desktop", "mobile", "desktop"],
    "amount": [5, 6, 7],
})`],
    sig: 'def solve(spending: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(spending):
    u = spending.groupby(["spend_date", "user_id"]).agg(n=("platform", "nunique"), plat=("platform", "first"), amount=("amount", "sum")).reset_index()
    u["platform"] = np.where(u["n"] == 2, "both", u["plat"])
    g = u.groupby(["spend_date", "platform"]).agg(total_amount=("amount", "sum"), total_users=("user_id", "size"))
    idx = pd.MultiIndex.from_product([sorted(spending["spend_date"].unique()), ["desktop", "mobile", "both"]], names=["spend_date", "platform"])
    return g.reindex(idx, fill_value=0).reset_index()`,
    wrong: [`def solve(spending):
    u = spending.groupby(["spend_date", "user_id"]).agg(n=("platform", "nunique"), plat=("platform", "first"), amount=("amount", "sum")).reset_index()
    u["platform"] = np.where(u["n"] == 2, "both", u["plat"])
    return u.groupby(["spend_date", "platform"]).agg(total_amount=("amount", "sum"), total_users=("user_id", "size")).reset_index()`],
    hints: ['First collapse to one row per (date, user) and label them mobile, desktop or both.', 'Reindex against every (date, platform) combination to get the zero rows.'],
    why: 'Per-user daily rows let you label "both" correctly. Reindexing with a full product index restores combinations that had no users.',
    mistakes: 'Without the reindex step, empty combinations simply do not exist. Summing platforms per user before labelling would lose the "both" case.' },

  { t: 'Pages Your Friends Like', tags: ['merge', 'sets', 'symmetric relations'],
    story: 'Friendships are stored once, in either direction. The product team recommends to user 1 every page that one of their friends likes and user 1 has not liked.',
    task: 'Return page_id (each once) of the pages to recommend to user 1.',
    setup: `friendship = pd.DataFrame({"user1_id": [1, 1, 2, 3], "user2_id": [2, 3, 3, 4]})
likes = pd.DataFrame({"user_id": [1, 2, 2, 3, 3, 4, 4], "page_id": [88, 23, 24, 56, 24, 77, 88]})`,
    hidden: [`friendship = pd.DataFrame({"user1_id": [1, 5, 2], "user2_id": [2, 1, 6]})
likes = pd.DataFrame({"user_id": [1, 2, 5, 5, 6, 2], "page_id": [10, 10, 11, 12, 99, 13]})`, `friendship = pd.DataFrame({"user1_id": [4, 5], "user2_id": [1, 1]})
likes = pd.DataFrame({"user_id": [4, 5, 5, 1], "page_id": [7, 7, 8, 8]})`],
    sig: 'def solve(friendship: pd.DataFrame, likes: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(friendship, likes):
    f = pd.concat([friendship.loc[friendship["user1_id"] == 1, "user2_id"], friendship.loc[friendship["user2_id"] == 1, "user1_id"]])
    mine = set(likes.loc[likes["user_id"] == 1, "page_id"])
    pages = likes.loc[likes["user_id"].isin(f) & ~likes["page_id"].isin(mine), "page_id"].drop_duplicates()
    return pages.to_frame().reset_index(drop=True)`,
    wrong: [`def solve(friendship, likes):
    f = friendship.loc[friendship["user1_id"] == 1, "user2_id"]
    mine = set(likes.loc[likes["user_id"] == 1, "page_id"])
    pages = likes.loc[likes["user_id"].isin(f) & ~likes["page_id"].isin(mine), "page_id"].drop_duplicates()
    return pages.to_frame().reset_index(drop=True)`],
    hints: ['A friendship row can name user 1 on either side.', 'Build the friend list from both columns, then filter the likes.'],
    why: 'Concatenating both directions gives the full friend list. isin() and a set of user 1\'s own pages do the filtering.',
    mistakes: 'Reading friends from one column only misses half the friendships. Forgetting drop_duplicates repeats a page liked by several friends.' },

  { t: 'Three-Month Rolling Pay', tags: ['reindex', 'rolling', 'groupby'],
    story: 'For every employee, payroll reports a rolling total of the employee\'s salary over the month and the two months before it. A month with no pay row counts as 0. The employee\'s most recent month is never reported.',
    task: 'Return id, month and salary (the rolling 3-month total) for every month of an employee that has a pay row, except the employee\'s latest month. Order by id ascending, month descending.',
    o: true,
    setup: `emp = pd.DataFrame({
    "id": [1, 1, 1, 1, 2, 2],
    "month": [1, 2, 3, 4, 1, 2],
    "salary": [20, 30, 40, 60, 90, 20],
})`,
    hidden: [`emp = pd.DataFrame({
    "id": [1, 1, 1, 1],
    "month": [1, 2, 5, 6],
    "salary": [20, 30, 100, 7],
})`, `emp = pd.DataFrame({
    "id": [3, 3, 3, 3],
    "month": [6, 3, 1, 2],
    "salary": [5, 6, 7, 8],
})`],
    sig: 'def solve(emp: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(emp):
    parts = []
    for i, g in emp.groupby("id"):
        s = g.set_index("month")["salary"]
        full = s.reindex(range(s.index.min(), s.index.max() + 1), fill_value=0)
        roll = full.rolling(3, min_periods=1).sum()
        months = [m for m in s.index if m != s.index.max()]
        parts.append(pd.DataFrame({"id": i, "month": months, "salary": roll.loc[months].to_numpy()}))
    r = pd.concat(parts, ignore_index=True)
    return r.sort_values(["id", "month"], ascending=[True, False]).reset_index(drop=True)`,
    wrong: [`def solve(emp):
    e = emp.sort_values(["id", "month"]).copy()
    e["roll"] = e.groupby("id")["salary"].transform(lambda s: s.rolling(3, min_periods=1).sum())
    last = e.groupby("id")["month"].transform("max")
    r = e.loc[e["month"] != last, ["id", "month", "roll"]].rename(columns={"roll": "salary"})
    return r.sort_values(["id", "month"], ascending=[True, False]).reset_index(drop=True)`],
    hints: ['A missing month is a 0, so fill the calendar before rolling.', 'Report only the months the employee actually has a row for.'],
    why: 'Reindexing each employee to a complete month range lets rolling(3) mean "three calendar months", and the original months are selected afterwards.',
    mistakes: 'Rolling over rows treats the previous row as the previous month, which is wrong when months are missing.' },

  { t: 'League Standings', tags: ['concat', 'groupby', 'multi-key sort'],
    story: 'Each match is stored once with the home and away team. A win gives 3 points, a draw 1 and a loss 0.',
    task: 'Return team, played, points and goal_diff for every team, sorted by points (high first), then goal_diff (high first), then team name.',
    o: true,
    setup: `matches = pd.DataFrame({
    "home": ["Lions", "Bears", "Wolves", "Lions"],
    "away": ["Bears", "Wolves", "Lions", "Wolves"],
    "hg": [2, 0, 1, 3],
    "ag": [0, 1, 1, 0],
})`,
    hidden: [`matches = pd.DataFrame({
    "home": ["A", "B", "C"],
    "away": ["B", "C", "A"],
    "hg": [5, 1, 1],
    "ag": [0, 0, 0],
})`, `matches = pd.DataFrame({
    "home": ["X", "Y", "Z", "X"],
    "away": ["Y", "Z", "X", "Z"],
    "hg": [3, 2, 0, 1],
    "ag": [3, 2, 0, 1],
})`],
    sig: 'def solve(matches: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(matches):
    h = pd.DataFrame({"team": matches["home"], "gf": matches["hg"], "ga": matches["ag"]})
    a = pd.DataFrame({"team": matches["away"], "gf": matches["ag"], "ga": matches["hg"]})
    t = pd.concat([h, a], ignore_index=True)
    t["pts"] = np.where(t["gf"] > t["ga"], 3, np.where(t["gf"] == t["ga"], 1, 0))
    t["gd"] = t["gf"] - t["ga"]
    r = t.groupby("team").agg(played=("pts", "size"), points=("pts", "sum"), goal_diff=("gd", "sum")).reset_index()
    return r.sort_values(["points", "goal_diff", "team"], ascending=[False, False, True]).reset_index(drop=True)`,
    wrong: [`def solve(matches):
    h = pd.DataFrame({"team": matches["home"], "gf": matches["hg"], "ga": matches["ag"]})
    a = pd.DataFrame({"team": matches["away"], "gf": matches["ag"], "ga": matches["hg"]})
    t = pd.concat([h, a], ignore_index=True)
    t["pts"] = np.where(t["gf"] > t["ga"], 3, np.where(t["gf"] == t["ga"], 1, 0))
    t["gd"] = t["gf"] - t["ga"]
    r = t.groupby("team").agg(played=("pts", "size"), points=("pts", "sum"), goal_diff=("gd", "sum")).reset_index()
    return r.sort_values(["points", "team"], ascending=[False, True]).reset_index(drop=True)`],
    hints: ['Turn every match into two rows: one from each team\'s point of view.', 'sort_values accepts a list of columns and a list of directions.'],
    why: 'Stacking the home and away views gives one row per team per match, so a single groupby computes everything. The three-key sort applies the tie-breaks in order.',
    mistakes: 'Skipping goal difference as a tie-break, or counting only home matches, changes the table.' },

  { t: 'Most Common Product Pairs', tags: ['self merge', 'dense rank'],
    story: 'Two products are bought together when they appear in the same order. The merchandising team wants the product pairs with the three highest co-purchase counts, and a tie for a place keeps everybody.',
    task: 'Return product_a, product_b (product_a < product_b) and pair_count for the pairs whose count is one of the 3 largest distinct counts.',
    setup: `baskets = pd.DataFrame({
    "order_id": [1, 1, 1, 2, 2, 3, 3, 4, 4, 5],
    "product_id": [1, 2, 3, 1, 2, 1, 2, 1, 3, 3],
})`,
    hidden: [`baskets = pd.DataFrame({
    "order_id": [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7],
    "product_id": [1, 2, 1, 2, 3, 4, 3, 4, 5, 6, 5, 6, 7, 8],
})`, `baskets = pd.DataFrame({"order_id": [1, 1, 2], "product_id": [9, 5, 9]})`],
    sig: 'def solve(baskets: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(baskets):
    m = baskets.merge(baskets, on="order_id")
    m = m[m["product_id_x"] < m["product_id_y"]]
    c = m.groupby(["product_id_x", "product_id_y"]).size().reset_index(name="pair_count")
    c = c.rename(columns={"product_id_x": "product_a", "product_id_y": "product_b"})
    return c[c["pair_count"].rank(method="dense", ascending=False) <= 3].reset_index(drop=True)`,
    wrong: [`def solve(baskets):
    m = baskets.merge(baskets, on="order_id")
    m = m[m["product_id_x"] < m["product_id_y"]]
    c = m.groupby(["product_id_x", "product_id_y"]).size().reset_index(name="pair_count")
    c = c.rename(columns={"product_id_x": "product_a", "product_id_y": "product_b"})
    return c.nlargest(3, "pair_count").reset_index(drop=True)`],
    hints: ['Merge the table with itself on order_id and keep each pair once with x < y.', 'Rank the counts densely so ties share a place.'],
    why: 'A self merge lists every pair inside each order, x < y keeps one orientation, and dense ranking keeps all pairs tied for the top three counts.',
    mistakes: 'nlargest(3) cuts the list at three rows and drops tied pairs.' },

  { t: 'Longest Winning Streak', tags: ['runs', 'groupby', 'zero'],
    story: 'Every team has a match history. A streak is a stretch of consecutive wins in date order; draws and losses end it.',
    task: 'Return team and longest_streak (0 for a team that never won) for every team.',
    setup: `results = pd.DataFrame({
    "team": ["A", "A", "A", "A", "B", "B", "B"],
    "match_date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-01", "2024-01-02", "2024-01-03"],
    "result": ["W", "W", "L", "L", "L", "L", "D"],
})`,
    hidden: [`results = pd.DataFrame({
    "team": ["A", "A", "A", "A", "A"],
    "match_date": ["2024-01-05", "2024-01-01", "2024-01-03", "2024-01-02", "2024-01-04"],
    "result": ["W", "W", "L", "W", "W"],
})`, `results = pd.DataFrame({
    "team": ["C", "C", "D", "D", "D"],
    "match_date": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-02", "2024-02-03"],
    "result": ["W", "W", "W", "D", "W"],
})`],
    sig: 'def solve(results: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(results):
    r = results.sort_values(["team", "match_date"])
    win = r["result"] == "W"
    grp = (~win).groupby(r["team"]).cumsum()
    streak = win.groupby([r["team"], grp]).sum()
    return streak.groupby("team").max().rename("longest_streak").reset_index()`,
    wrong: [`def solve(results):
    w = (results["result"] == "W").groupby(results["team"]).sum()
    return w.rename("longest_streak").reset_index()`],
    hints: ['Sort by team and date first.', 'A cumulative count of non-wins gives every streak a label.'],
    why: 'Each loss or draw increments a counter that stays constant through a streak of wins, so summing wins per counter value measures streaks.',
    mistakes: 'Counting all wins ignores the interruptions. Forgetting to sort by date breaks the streaks.' },

  { t: 'Peak Concurrent Sessions', tags: ['sweep line', 'cumsum'],
    story: 'Operations needs the busiest moment for a server. A session occupies the server from its start minute up to, but not including, its end minute.',
    task: 'Return a one-row table with peak: the maximum number of sessions that run at the same time.',
    setup: `sessions = pd.DataFrame({"id": [1, 2, 3, 4], "start": [1, 2, 4, 10], "end": [5, 6, 8, 12]})`,
    hidden: [`sessions = pd.DataFrame({"id": [1, 2, 3], "start": [1, 3, 5], "end": [3, 5, 7]})`, `sessions = pd.DataFrame({"id": [1, 2, 3, 4], "start": [0, 0, 5, 5], "end": [5, 5, 6, 9]})`],
    sig: 'def solve(sessions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sessions):
    ev = pd.concat([pd.DataFrame({"t": sessions["start"], "d": 1}), pd.DataFrame({"t": sessions["end"], "d": -1})])
    ev = ev.sort_values(["t", "d"])
    return pd.DataFrame({"peak": [int(ev["d"].cumsum().max())]})`,
    wrong: [`def solve(sessions):
    ev = pd.concat([pd.DataFrame({"t": sessions["start"], "d": 1}), pd.DataFrame({"t": sessions["end"], "d": -1})])
    ev = ev.sort_values(["t", "d"], ascending=[True, False])
    return pd.DataFrame({"peak": [int(ev["d"].cumsum().max())]})`],
    hints: ['Turn each session into a +1 event at the start and a -1 event at the end.', 'When an end and a start share a minute, process the end first.'],
    why: 'A sweep over time-ordered +1/-1 events keeps a running count of open sessions. Ordering ends before starts at equal times respects the exclusive end.',
    mistakes: 'Handling starts first at the same minute makes back-to-back sessions look like they overlap.' },

  { t: 'Missing ID Ranges', tags: ['numpy', 'gaps'],
    story: 'Customer ids should run from 1 to the largest id, but some are missing. The data team wants the gaps as ranges.',
    task: 'Return start_id and end_id for each maximal range of missing ids between 1 and the largest present id, ordered by start_id.',
    o: true,
    setup: `ids = pd.DataFrame({"id": [1, 2, 5, 6, 9]})`,
    hidden: [`ids = pd.DataFrame({"id": [4, 5, 8]})`, `ids = pd.DataFrame({"id": [7, 1, 3, 20]})`],
    sig: 'def solve(ids: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(ids):
    s = np.sort(ids["id"].to_numpy())
    prev = np.concatenate([[0], s[:-1]])
    gap = s - prev > 1
    return pd.DataFrame({"start_id": prev[gap] + 1, "end_id": s[gap] - 1})`,
    wrong: [`def solve(ids):
    s = np.sort(ids["id"].to_numpy())
    prev, cur = s[:-1], s[1:]
    gap = cur - prev > 1
    return pd.DataFrame({"start_id": prev[gap] + 1, "end_id": cur[gap] - 1})`],
    hints: ['Compare every id with the previous one; a gap is a difference above 1.', 'Remember the gap before the very first id: pretend an id 0 exists.'],
    why: 'Prepending 0 as the "previous" id of the first row makes the leading gap look like any other gap.',
    mistakes: 'Only comparing present ids misses missing ids at the start of the range.' },

  { t: 'Depth and Top Boss', tags: ['hierarchy', 'iteration'],
    story: 'The org table lists each person and their manager (empty for the head of the company). HR wants to know how deep everyone sits and who is at the top of their chain.',
    task: 'Return id, depth (0 for the head) and topBoss (the head of the chain the person belongs to) for everyone.',
    setup: `org = pd.DataFrame({"id": [1, 2, 3, 4], "managerId": [np.nan, 1, 1, 2]})`,
    hidden: [`org = pd.DataFrame({"id": [1, 2, 3, 4, 5, 6], "managerId": [np.nan, 1, 2, 3, 4, np.nan]})`, `org = pd.DataFrame({"id": [5, 6, 7], "managerId": [np.nan, np.nan, 6]})`],
    sig: 'def solve(org: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(org):
    mgr = dict(zip(org["id"], org["managerId"]))
    rows = []
    for i in org["id"]:
        depth, cur = 0, int(i)
        while not pd.isna(mgr.get(cur)):
            cur = int(mgr[cur])
            depth += 1
        rows.append((int(i), depth, cur))
    return pd.DataFrame(rows, columns=["id", "depth", "topBoss"])`,
    wrong: [`def solve(org):
    m1 = org.merge(org, left_on="managerId", right_on="id", how="left", suffixes=("", "_1"))
    m2 = m1.merge(org, left_on="managerId_1", right_on="id", how="left", suffixes=("", "_2"))
    depth = m2["managerId"].notna().astype(int) + m2["managerId_1"].notna().astype(int)
    boss = np.where(m2["managerId_1"].notna(), m2["managerId_1"], np.where(m2["managerId"].notna(), m2["managerId"], m2["id"])).astype(int)
    return pd.DataFrame({"id": m2["id"], "depth": depth, "topBoss": boss})`],
    hints: ['Follow the manager links upward until there is no manager.', 'A dictionary id -> managerId makes each step O(1).'],
    why: 'Walking up the chain with a lookup dictionary works for any depth, unlike a fixed number of self-merges.',
    mistakes: 'Chaining a fixed number of merges only handles hierarchies up to that depth.' },

  { t: 'Ever-Growing Customers', tags: ['groupby', 'diff', 'gaps'],
    story: 'A loyalty programme rewards customers whose yearly spending grew every single year. The years must be consecutive, and they need at least two years of history.',
    task: 'Return customer_id of every customer whose yearly totals are strictly increasing year over year, with no missing calendar year between their first and last year, over at least 2 years.',
    setup: `orders = pd.DataFrame({
    "customer_id": [1, 1, 1, 2, 2, 3],
    "year": [2020, 2021, 2022, 2020, 2021, 2020],
    "amount": [10, 20, 30, 50, 40, 99],
})`,
    hidden: [`orders = pd.DataFrame({
    "customer_id": [1, 1, 1, 1, 2, 2],
    "year": [2020, 2020, 2021, 2023, 2021, 2022],
    "amount": [5, 5, 20, 90, 10, 11],
})`, `orders = pd.DataFrame({
    "customer_id": [4, 4, 4, 5, 5],
    "year": [2019, 2020, 2021, 2019, 2020],
    "amount": [3, 3, 9, 1, 2],
})`],
    sig: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders):
    y = orders.groupby(["customer_id", "year"], as_index=False)["amount"].sum().sort_values(["customer_id", "year"])
    ok = []
    for c, g in y.groupby("customer_id"):
        yrs, amt = g["year"].to_numpy(), g["amount"].to_numpy()
        if len(g) >= 2 and (np.diff(yrs) == 1).all() and (np.diff(amt) > 0).all():
            ok.append(c)
    return pd.DataFrame({"customer_id": ok})`,
    wrong: [`def solve(orders):
    y = orders.groupby(["customer_id", "year"], as_index=False)["amount"].sum().sort_values(["customer_id", "year"])
    ok = []
    for c, g in y.groupby("customer_id"):
        amt = g["amount"].to_numpy()
        if len(g) >= 2 and (np.diff(amt) > 0).all():
            ok.append(c)
    return pd.DataFrame({"customer_id": ok})`],
    hints: ['Add up each customer\'s amounts per year first.', 'np.diff of the years must be all 1 and np.diff of the totals must be all positive.'],
    why: 'After yearly totals, two array checks express the rule: consecutive years and strictly growing amounts.',
    mistakes: 'Comparing neighbouring rows without checking the years accepts a customer who skipped a year.' },

  { t: 'Closest Pair of Stores', tags: ['cross merge', 'geometry'],
    story: 'Two new coffee shops are planned next to existing stores. Planners want the two existing stores that are closest to each other (straight-line distance).',
    task: 'Return name_a, name_b (name_a sorts before name_b) and dist, rounded to 2 decimals, for the single closest pair of stores.',
    setup: `stores = pd.DataFrame({"name": ["A", "B", "C", "D"], "x": [0, 3, 7, 20], "y": [0, 4, 7, 20]})`,
    hidden: [`stores = pd.DataFrame({"name": ["A", "B", "C"], "x": [0, 1, 2], "y": [0, 100, 0.5]})`, `stores = pd.DataFrame({"name": ["P", "Q", "R", "S"], "x": [10, 0, 5, 11], "y": [10, 0, 50, 10.5]})`],
    sig: 'def solve(stores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(stores):
    m = stores.merge(stores, how="cross", suffixes=("_a", "_b"))
    m = m[m["name_a"] < m["name_b"]].copy()
    m["dist"] = np.hypot(m["x_a"] - m["x_b"], m["y_a"] - m["y_b"]).round(2)
    return m.nsmallest(1, "dist")[["name_a", "name_b", "dist"]].reset_index(drop=True)`,
    wrong: [`def solve(stores):
    s = stores.sort_values("x").reset_index(drop=True)
    a, b = s.iloc[:-1].reset_index(drop=True), s.iloc[1:].reset_index(drop=True)
    d = np.hypot(a["x"] - b["x"], a["y"] - b["y"]).round(2)
    i = d.idxmin()
    na, nb = sorted([a.loc[i, "name"], b.loc[i, "name"]])
    return pd.DataFrame({"name_a": [na], "name_b": [nb], "dist": [d[i]]})`],
    hints: ['A cross merge lists every pair; keep each pair once with name_a < name_b.', 'np.hypot gives the straight-line distance.'],
    why: 'Comparing all pairs is O(n squared) but exact. The cross merge and a single nsmallest express it directly.',
    mistakes: 'Sorting by x and comparing only neighbours misses pairs that are close in 2D but far apart in x order.' },

  { t: 'Three Latest Orders per Customer', tags: ['sorting', 'head', 'tie-breaks'],
    story: 'Support looks at each customer\'s three most recent orders. When two orders share a date, the one with the larger order_id came later.',
    task: 'Return order_id, customer, order_date and amount of each customer\'s 3 most recent orders, ordered by customer ascending, then order_date descending, then order_id descending.',
    o: true,
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5],
    "customer": ["Ann", "Ann", "Ann", "Ann", "Bo"],
    "order_date": ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01", "2024-01-15"],
    "amount": [10, 20, 30, 40, 50],
})`,
    hidden: [`orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5],
    "customer": ["Cy", "Cy", "Cy", "Cy", "Cy"],
    "order_date": ["2024-05-01", "2024-05-02", "2024-05-02", "2024-05-02", "2024-04-01"],
    "amount": [1, 2, 3, 4, 5],
})`, `orders = pd.DataFrame({
    "order_id": [7, 8],
    "customer": ["Di", "Eli"],
    "order_date": ["2024-06-01", "2024-06-02"],
    "amount": [70, 80],
})`],
    sig: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders):
    s = orders.sort_values(["customer", "order_date", "order_id"], ascending=[True, False, False])
    return s.groupby("customer").head(3).reset_index(drop=True)`,
    wrong: [`def solve(orders):
    s = orders.sort_values(["customer", "order_date"], ascending=[True, False])
    return s.groupby("customer").head(3).reset_index(drop=True)`],
    hints: ['Sort by customer, date and order_id, with the right direction for each.', 'groupby(...).head(3) keeps the first three rows of every group.'],
    why: 'A full three-key sort makes the order deterministic, so head(3) per customer returns the three latest orders.',
    mistakes: 'Without order_id in the sort, orders with the same date keep their file order, which may put the older one first.' },

  { t: 'Three Months in a Row', tags: ['runs', 'month arithmetic'],
    story: 'A user is "sticky" when they were active in at least three consecutive calendar months, even across a year boundary.',
    task: 'Return user_id for every sticky user. months are written YYYY-MM and may repeat.',
    setup: `events = pd.DataFrame({
    "user_id": [1, 1, 1, 2, 2, 2, 3],
    "month": ["2024-01", "2024-02", "2024-03", "2024-01", "2024-02", "2024-04", "2024-05"],
})`,
    hidden: [`events = pd.DataFrame({
    "user_id": [4, 4, 4, 5, 5, 5],
    "month": ["2023-11", "2023-12", "2024-01", "2023-01", "2023-02", "2024-03"],
})`, `events = pd.DataFrame({
    "user_id": [6, 6, 6, 6, 7, 7],
    "month": ["2024-06", "2024-06", "2024-07", "2024-07", "2024-06", "2024-07"],
})`],
    sig: 'def solve(events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(events):
    e = events.drop_duplicates().copy()
    e["m"] = e["month"].str[:4].astype(int) * 12 + e["month"].str[5:7].astype(int)
    e = e.sort_values(["user_id", "m"])
    key = e["m"] - e.groupby("user_id").cumcount()
    size = e.groupby(["user_id", key])["m"].transform("size")
    return e.loc[size >= 3, ["user_id"]].drop_duplicates().reset_index(drop=True)`,
    wrong: [`def solve(events):
    e = events.drop_duplicates().copy()
    e["m"] = e["month"].str[5:7].astype(int)
    e = e.sort_values(["user_id", "month"])
    key = e["m"] - e.groupby("user_id").cumcount()
    size = e.groupby(["user_id", key])["m"].transform("size")
    return e.loc[size >= 3, ["user_id"]].drop_duplicates().reset_index(drop=True)`],
    hints: ['Convert YYYY-MM into one running month number: year * 12 + month.', 'month number minus position is constant inside a run.'],
    why: 'A continuous month index makes December to January a difference of 1, and the same minus-position trick finds the runs.',
    mistakes: 'Using the month number alone breaks at year ends. Duplicated months inflate run sizes.' },

  { t: 'Second Most Recent Activity', tags: ['sorting', 'cumcount', 'edge case'],
    story: 'For each user the profile page shows their second most recent activity. If a user has only one activity, that one is shown.',
    task: 'Return all columns of the second most recent activity (by start_date) of every user, or of their only activity.',
    setup: `activity = pd.DataFrame({
    "username": ["Alice", "Alice", "Alice", "Bob", "Bob"],
    "activity": ["Travel", "Dancing", "Writing", "Reading", "Cooking"],
    "start_date": ["2024-02-12", "2024-02-21", "2024-02-24", "2024-03-01", "2024-03-05"],
    "end_date": ["2024-02-20", "2024-02-23", "2024-02-28", "2024-03-04", "2024-03-09"],
})`,
    hidden: [`activity = pd.DataFrame({
    "username": ["Cy", "Di", "Di"],
    "activity": ["Chess", "Run", "Swim"],
    "start_date": ["2024-01-01", "2024-01-02", "2024-01-09"],
    "end_date": ["2024-01-03", "2024-01-04", "2024-01-10"],
})`, `activity = pd.DataFrame({
    "username": ["Eve", "Eve", "Eve", "Eve"],
    "activity": ["a", "b", "c", "d"],
    "start_date": ["2024-05-04", "2024-05-01", "2024-05-03", "2024-05-02"],
    "end_date": ["2024-05-05", "2024-05-01", "2024-05-04", "2024-05-02"],
})`],
    sig: 'def solve(activity: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(activity):
    s = activity.sort_values(["username", "start_date"], ascending=[True, False])
    rk = s.groupby("username").cumcount()
    cnt = s.groupby("username")["activity"].transform("size")
    return s.loc[(rk == 1) | (cnt == 1)].reset_index(drop=True)`,
    wrong: [`def solve(activity):
    s = activity.sort_values(["username", "start_date"], ascending=[True, False])
    rk = s.groupby("username").cumcount()
    return s.loc[rk == 1].reset_index(drop=True)`],
    hints: ['cumcount() after sorting numbers the rows within each user.', 'Users with a single row never reach position 1.'],
    why: 'Sort newest first, number the rows per user, and keep position 1 or the sole row.',
    mistakes: 'Keeping only position 1 loses users with a single activity.' },

  { t: 'Overlapping Shifts', tags: ['self merge', 'intervals'],
    story: 'Two employees work together when their shifts on the same day overlap. Shifts that merely touch (one ends when the other starts) do not overlap.',
    task: 'Return emp_a, emp_b (emp_a sorts before emp_b) and overlap_minutes: the total overlap in minutes over all days, only for pairs with a positive total.',
    setup: `shifts = pd.DataFrame({
    "emp": ["Ann", "Bo", "Cy", "Ann", "Bo"],
    "day": [1, 1, 1, 2, 2],
    "start_min": [480, 600, 900, 480, 540],
    "end_min": [720, 840, 960, 600, 660],
})`,
    hidden: [`shifts = pd.DataFrame({
    "emp": ["Ann", "Bo", "Cy"],
    "day": [1, 1, 1],
    "start_min": [0, 60, 120],
    "end_min": [60, 120, 180],
})`, `shifts = pd.DataFrame({
    "emp": ["Di", "Eli", "Di", "Eli"],
    "day": [3, 3, 4, 4],
    "start_min": [0, 30, 100, 90],
    "end_min": [100, 60, 200, 120],
})`],
    sig: 'def solve(shifts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(shifts):
    m = shifts.merge(shifts, on="day", suffixes=("_a", "_b"))
    m = m[m["emp_a"] < m["emp_b"]].copy()
    m["ov"] = np.minimum(m["end_min_a"], m["end_min_b"]) - np.maximum(m["start_min_a"], m["start_min_b"])
    m = m[m["ov"] > 0]
    return m.groupby(["emp_a", "emp_b"], as_index=False)["ov"].sum().rename(columns={"ov": "overlap_minutes"})`,
    wrong: [`def solve(shifts):
    m = shifts.merge(shifts, on="day", suffixes=("_a", "_b"))
    m = m[m["emp_a"] < m["emp_b"]].copy()
    m["ov"] = np.minimum(m["end_min_a"], m["end_min_b"]) - np.maximum(m["start_min_a"], m["start_min_b"])
    m = m[m["ov"] >= 0]
    return m.groupby(["emp_a", "emp_b"], as_index=False)["ov"].sum().rename(columns={"ov": "overlap_minutes"})`],
    hints: ['The overlap of two intervals is min(ends) - max(starts).', 'Only keep strictly positive overlaps.'],
    why: 'Merging on the day pairs every two shifts of that day; min/max arithmetic gives the overlap, and filtering keeps real overlaps only.',
    mistakes: 'Keeping zero overlaps adds pairs whose shifts only touch.' },

  { t: 'Daily Balance Carried Forward', tags: ['reindex', 'ffill', 'groupby'],
    story: 'Accounts only record a balance on days it changed. Reporting needs a row for every day, carrying the last known balance forward.',
    task: 'For each account return account, day and balance for every day from the account\'s first recorded day up to the latest day in the whole table.',
    setup: `balances = pd.DataFrame({
    "account": ["A", "A", "B", "B"],
    "day": [1, 4, 2, 4],
    "balance": [100, 150, 40, 45],
})`,
    hidden: [`balances = pd.DataFrame({
    "account": ["A", "B", "B"],
    "day": [1, 2, 5],
    "balance": [10, 20, 30],
})`, `balances = pd.DataFrame({
    "account": ["C", "D"],
    "day": [3, 1],
    "balance": [1, 2],
})`],
    sig: 'def solve(balances: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(balances):
    last = balances["day"].max()
    out = []
    for a, g in balances.groupby("account"):
        s = g.set_index("day")["balance"]
        full = s.reindex(range(s.index.min(), last + 1)).ffill()
        out.append(pd.DataFrame({"account": a, "day": full.index, "balance": full.to_numpy()}))
    return pd.concat(out, ignore_index=True)`,
    wrong: [`def solve(balances):
    out = []
    for a, g in balances.groupby("account"):
        s = g.set_index("day")["balance"]
        full = s.reindex(range(s.index.min(), s.index.max() + 1)).ffill()
        out.append(pd.DataFrame({"account": a, "day": full.index, "balance": full.to_numpy()}))
    return pd.concat(out, ignore_index=True)`],
    hints: ['Reindex each account to a complete day range, then forward-fill.', 'The range ends on the table\'s last day, not the account\'s own last day.'],
    why: 'reindex creates the missing days as NaN and ffill copies the previous balance into them.',
    mistakes: 'Stopping at each account\'s own last day leaves later days without a row.' },

  { t: 'Quarterly Sales Matrix', tags: ['pivot_table', 'reindex'],
    story: 'Finance wants one row per sales rep with a column for each quarter Q1 to Q4 and a total, even if a quarter has no sales at all.',
    task: 'Return rep, Q1, Q2, Q3, Q4 and total (zeros where nothing was sold).',
    setup: `sales = pd.DataFrame({
    "rep": ["Ann", "Ann", "Bo", "Bo", "Cy", "Ann"],
    "quarter": ["Q1", "Q2", "Q1", "Q4", "Q3", "Q3"],
    "amount": [10, 20, 30, 40, 50, 5],
})`,
    hidden: [`sales = pd.DataFrame({
    "rep": ["Ann", "Bo", "Bo"],
    "quarter": ["Q1", "Q1", "Q3"],
    "amount": [10, 20, 30],
})`, `sales = pd.DataFrame({
    "rep": ["Di", "Di", "Di"],
    "quarter": ["Q4", "Q4", "Q2"],
    "amount": [1, 2, 3],
})`],
    sig: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sales):
    p = sales.pivot_table(index="rep", columns="quarter", values="amount", aggfunc="sum", fill_value=0)
    p = p.reindex(columns=["Q1", "Q2", "Q3", "Q4"], fill_value=0)
    p["total"] = p.sum(axis=1)
    return p.reset_index().rename_axis(None, axis=1)`,
    wrong: [`def solve(sales):
    p = sales.pivot_table(index="rep", columns="quarter", values="amount", aggfunc="sum", fill_value=0)
    p["total"] = p.sum(axis=1)
    return p.reset_index().rename_axis(None, axis=1)`],
    hints: ['pivot_table only creates columns for values that occur.', 'reindex(columns=[...]) forces all four quarters to exist.'],
    why: 'pivot_table builds the matrix; reindexing the columns guarantees the same four quarter columns every time.',
    mistakes: 'A quarter with no sales at all is simply missing from the pivot unless you reindex.' },

  { t: 'Unusual Spending Spikes', tags: ['expanding', 'shift', 'groupby'],
    story: 'Fraud detection flags a transaction when its amount is more than 3 times the average of the same user\'s earlier transactions. A user needs at least 2 earlier transactions before anything can be flagged.',
    task: 'Return user, seq and amount of every flagged transaction. seq is the transaction order for the user.',
    setup: `txns = pd.DataFrame({
    "user": ["a", "a", "a", "a", "b", "b", "b"],
    "seq": [1, 2, 3, 4, 1, 2, 3],
    "amount": [10, 10, 10, 100, 5, 500, 6],
})`,
    hidden: [`txns = pd.DataFrame({
    "user": ["a", "a", "a", "a"],
    "seq": [4, 3, 2, 1],
    "amount": [35, 10, 10, 10],
})`, `txns = pd.DataFrame({
    "user": ["c", "c", "d", "d", "d"],
    "seq": [1, 2, 1, 2, 3],
    "amount": [1, 500, 20, 20, 61],
})`],
    sig: 'def solve(txns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(txns):
    t = txns.sort_values(["user", "seq"]).copy()
    prior_mean = t.groupby("user")["amount"].transform(lambda s: s.shift().expanding().mean())
    prior_n = t.groupby("user").cumcount()
    return t.loc[(prior_n >= 2) & (t["amount"] > 3 * prior_mean), ["user", "seq", "amount"]].reset_index(drop=True)`,
    wrong: [`def solve(txns):
    t = txns.sort_values(["user", "seq"]).copy()
    mean_now = t.groupby("user")["amount"].transform(lambda s: s.expanding().mean())
    prior_n = t.groupby("user").cumcount()
    return t.loc[(prior_n >= 2) & (t["amount"] > 3 * mean_now), ["user", "seq", "amount"]].reset_index(drop=True)`],
    hints: ['The comparison average must exclude the current transaction: shift before expanding.', 'cumcount() tells you how many earlier transactions exist.'],
    why: 'shift() moves every value down one row, so expanding().mean() over the shifted values is the mean of strictly earlier transactions.',
    mistakes: 'Including the current amount in its own average dilutes the threshold.' },

  { t: 'Progressive Income Tax', tags: ['cross merge', 'clip'],
    story: 'A tax table has brackets with a lower bound, an upper bound and a rate. Only the part of an income inside a bracket is taxed at that bracket\'s rate.',
    task: 'Return person and tax (the total over all brackets), rounded to 2 decimals.',
    setup: `brackets = pd.DataFrame({"lower": [0, 10000, 40000], "upper": [10000, 40000, 1000000000], "rate": [0.10, 0.20, 0.30]})
people = pd.DataFrame({"person": ["Ann", "Bo", "Cy"], "income": [5000, 8000, 10000]})`,
    hidden: [`brackets = pd.DataFrame({"lower": [0, 10000, 40000], "upper": [10000, 40000, 1000000000], "rate": [0.10, 0.20, 0.30]})
people = pd.DataFrame({"person": ["Di", "Eli"], "income": [25000, 100000]})`, `brackets = pd.DataFrame({"lower": [0, 500], "upper": [500, 1000000], "rate": [0.0, 0.5]})
people = pd.DataFrame({"person": ["Fay"], "income": [1500]})`],
    sig: 'def solve(brackets: pd.DataFrame, people: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(brackets, people):
    m = people.merge(brackets, how="cross")
    portion = (np.minimum(m["income"], m["upper"]) - m["lower"]).clip(lower=0)
    m["tax"] = portion * m["rate"]
    return m.groupby("person", as_index=False)["tax"].sum().round({"tax": 2})`,
    wrong: [`def solve(brackets, people):
    m = people.merge(brackets, how="cross")
    m = m[(m["income"] > m["lower"]) & (m["income"] <= m["upper"])]
    m["tax"] = (m["income"] * m["rate"]).round(2)
    return m[["person", "tax"]].reset_index(drop=True)`],
    hints: ['Pair every person with every bracket using a cross merge.', 'The taxed part of a bracket is min(income, upper) - lower, never below 0.'],
    why: 'Each bracket contributes rate times the slice of income inside it. clip(lower=0) removes brackets above the income, and summing per person gives the total.',
    mistakes: 'Applying the top reached rate to the whole income taxes the lower slices at the wrong rate.' },

  { t: 'Task Depth Levels', tags: ['graphs', 'recursion', 'dict'],
    story: 'Each row says that a task depends on another. A task with no dependency is level 0. Otherwise its level is one more than the highest level among everything it depends on.',
    task: 'Return task and level for every task. A task with no dependency has an empty depends_on.',
    setup: `deps = pd.DataFrame({
    "task": ["build", "test", "lint"],
    "depends_on": [None, "build", "build"],
})`,
    hidden: [`deps = pd.DataFrame({
    "task": ["a", "b", "c", "d", "d", "e"],
    "depends_on": [None, "a", "b", "b", "a", "d"],
})`, `deps = pd.DataFrame({
    "task": ["x", "y", "z", "z"],
    "depends_on": [None, "x", "x", "y"],
})`],
    sig: 'def solve(deps: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(deps):
    d = {}
    for t, p in zip(deps["task"], deps["depends_on"]):
        d.setdefault(t, [])
        if not pd.isna(p):
            d[t].append(p)
    memo = {}
    def lvl(t):
        if t not in memo:
            memo[t] = 0 if not d.get(t) else 1 + max(lvl(p) for p in d[t])
        return memo[t]
    return pd.DataFrame({"task": list(d), "level": [lvl(t) for t in d]})`,
    wrong: [`def solve(deps):
    n = deps.groupby("task")["depends_on"].count()
    return pd.DataFrame({"task": n.index.to_numpy(), "level": n.to_numpy()})`],
    hints: ['Store each task\'s dependencies in a dictionary.', 'A recursive function with a memo turns the rule into code.'],
    why: 'Level is defined recursively, so a memoised recursive function over the dependency dictionary computes it once per task.',
    mistakes: 'Counting direct dependencies ignores how deep the chain below them goes.' },

  { t: 'Click Sessions', tags: ['sessionization', 'diff', 'groupby'],
    story: 'A new browsing session starts when a user\'s next click comes more than 30 minutes after their previous click, or at their first click.',
    task: 'Return user, session (numbered from 1 for each user), start, end and clicks for every session. ts is a minute count.',
    setup: `clicks = pd.DataFrame({
    "user": ["u1", "u1", "u1", "u1", "u2", "u2"],
    "ts": [0, 10, 25, 100, 5, 20],
})`,
    hidden: [`clicks = pd.DataFrame({
    "user": ["u1", "u1", "u1"],
    "ts": [0, 30, 61],
})`, `clicks = pd.DataFrame({
    "user": ["u2", "u1", "u2", "u1"],
    "ts": [500, 10, 480, 100],
})`],
    sig: 'def solve(clicks: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(clicks):
    c = clicks.sort_values(["user", "ts"]).reset_index(drop=True)
    gap = c.groupby("user")["ts"].diff()
    new = gap.isna() | (gap > 30)
    c["session"] = new.astype(int).groupby(c["user"]).cumsum()
    return c.groupby(["user", "session"], as_index=False).agg(start=("ts", "min"), end=("ts", "max"), clicks=("ts", "size"))`,
    wrong: [`def solve(clicks):
    c = clicks.sort_values(["user", "ts"]).reset_index(drop=True)
    gap = c.groupby("user")["ts"].diff()
    new = gap.isna() | (gap >= 30)
    c["session"] = new.astype(int).groupby(c["user"]).cumsum()
    return c.groupby(["user", "session"], as_index=False).agg(start=("ts", "min"), end=("ts", "max"), clicks=("ts", "size"))`],
    hints: ['Compute the gap inside each user, not across the whole table.', 'Exactly 30 minutes is still the same session.'],
    why: 'A per-user diff finds long gaps, and a cumulative sum of the "new session" flags numbers the sessions.',
    mistakes: 'Using >= 30 splits a session at a gap of exactly 30 minutes.' },

  { t: 'Subscriber Funnel by Month', tags: ['loops', 'boolean masks', 'null'],
    story: 'Each subscription starts in start_month and ends in end_month (empty while it is still running). It is not active in its end month.',
    task: 'For every month 1 to 12 return month, new_subs (started that month), churned (ended that month) and active (running during that month).',
    setup: `subs = pd.DataFrame({
    "user_id": [1, 2, 3, 4],
    "start_month": [1, 1, 3, 5],
    "end_month": [4, 2, 9, 6],
})`,
    hidden: [`subs = pd.DataFrame({
    "user_id": [1, 2, 3],
    "start_month": [2, 2, 7],
    "end_month": [np.nan, 5, np.nan],
})`, `subs = pd.DataFrame({
    "user_id": [1],
    "start_month": [12],
    "end_month": [np.nan],
})`],
    sig: 'def solve(subs: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(subs):
    rows = []
    for m in range(1, 13):
        active = (subs["start_month"] <= m) & (subs["end_month"].isna() | (subs["end_month"] > m))
        rows.append((m, int((subs["start_month"] == m).sum()), int((subs["end_month"] == m).sum()), int(active.sum())))
    return pd.DataFrame(rows, columns=["month", "new_subs", "churned", "active"])`,
    wrong: [`def solve(subs):
    rows = []
    for m in range(1, 13):
        active = (subs["start_month"] <= m) & (subs["end_month"] > m)
        rows.append((m, int((subs["start_month"] == m).sum()), int((subs["end_month"] == m).sum()), int(active.sum())))
    return pd.DataFrame(rows, columns=["month", "new_subs", "churned", "active"])`],
    hints: ['A subscription with no end month is still active.', 'Comparisons with NaN are False, so handle isna() explicitly.'],
    why: 'Three boolean masks per month give the counts. An explicit isna() check covers open-ended subscriptions.',
    mistakes: 'end_month > m is False for NaN, so running subscriptions silently vanish from the active count.' },
];
