// Pandas Dojo — Problems 101–125 (Advanced)
window.DOJO_PROBLEMS = window.DOJO_PROBLEMS || [];
window.DOJO_PROBLEMS.push(
  {
    id: 101, title: 'Monthly Cohort Retention', difficulty: 'Advanced', tags: ['cohort retention'],
    story: 'Product wants to know how many users from each signup month are still active one and two months later.',
    task: 'Return cohort (signup month), month_offset (0, 1, 2…) and retention_pct (active users ÷ cohort size × 100, rounded to 1 decimal) for every cohort/offset with activity, sorted by cohort and offset.',
    setup: `signups = pd.DataFrame({"user": ["u1", "u2", "u3", "u4", "u5"],
                        "signup_month": ["2024-01", "2024-01", "2024-01", "2024-02", "2024-02"]})
activity = pd.DataFrame({
    "user": ["u1", "u1", "u2", "u2", "u3", "u4", "u4", "u5", "u1"],
    "activity_month": ["2024-01", "2024-02", "2024-01", "2024-03", "2024-01", "2024-02", "2024-03", "2024-02", "2024-02"],
})`,
    signature: 'def solve(signups: pd.DataFrame, activity: pd.DataFrame) -> pd.DataFrame:', call: 'solve(signups, activity)',
    expected: { columns: ['cohort', 'month_offset', 'retention_pct'], rows: [['2024-01', 0, 100.0], ['2024-01', 1, 33.3], ['2024-01', 2, 33.3], ['2024-02', 0, 100.0], ['2024-02', 1, 50.0]], dtypes: { retention_pct: 'float' } },
    hints: ['Turn months into a number (year × 12 + month) so the offset is a simple subtraction.', 'Count unique users per (cohort, offset) and divide by the cohort size with .div(size, level="signup_month").'],
    approaches: [
      { name: 'Month index + nunique', code: `def solve(signups, activity):
    def month_no(s):
        d = pd.to_datetime(s)
        return d.dt.year * 12 + d.dt.month
    m = activity.merge(signups, on="user")
    m["month_offset"] = month_no(m["activity_month"]) - month_no(m["signup_month"])
    active = m.groupby(["signup_month", "month_offset"])["user"].nunique()
    size = signups.groupby("signup_month")["user"].nunique()
    pct = active.div(size, level="signup_month").mul(100).round(1)
    return pct.rename("retention_pct").reset_index().rename(columns={"signup_month": "cohort"})`, explanation: 'nunique handles users with several events in a month (u1 appears twice in February). div(..., level=) divides each cohort\'s rows by that cohort\'s size.', complexity: 'O(n) plus the merge.', whenToUse: 'Retention dashboards and subscription analysis.' },
      { name: 'Cohort matrix, then stack', code: `def solve(signups, activity):
    m = activity.merge(signups, on="user")
    off = (pd.to_datetime(m["activity_month"]).dt.to_period("M") - pd.to_datetime(m["signup_month"]).dt.to_period("M"))
    m["month_offset"] = off.apply(lambda p: p.n)
    matrix = m.pivot_table(index="signup_month", columns="month_offset", values="user", aggfunc="nunique")
    pct = matrix.div(matrix[0], axis=0).mul(100).round(1)
    long = pct.stack(future_stack=True).dropna()
    return long.rename_axis(["cohort", "month_offset"]).reset_index(name="retention_pct")`, explanation: 'Builds the familiar triangle (cohorts × offsets) and divides every row by its month-0 column. Period subtraction returns an offset object, and .n gives the number of months.', complexity: 'O(n).', whenToUse: 'When you also want to show the matrix as a heatmap.' },
    ],
    mistakes: 'count() instead of nunique() counts events, not users, and gives over 100%. Subtracting .dt.month alone breaks across years (January minus December = −11).',
  },
  {
    id: 102, title: 'Strict Checkout Funnel', difficulty: 'Advanced', tags: ['funnel'],
    story: 'Growth wants conversion through visit → cart → checkout → purchase. A user only counts at a step if they also reached every earlier step.',
    task: 'Return step, users and conv_from_prev_pct (users ÷ users at previous step × 100, rounded to 1; 100.0 for the first step), in funnel order.',
    setup: `events = pd.DataFrame({
    "user": ["u1", "u1", "u2", "u3", "u4", "u5", "u6", "u1", "u2", "u3", "u5", "u1", "u3", "u4", "u1", "u4"],
    "step": ["visit", "visit", "visit", "visit", "visit", "visit", "visit", "cart", "cart", "cart", "cart",
             "checkout", "checkout", "checkout", "purchase", "purchase"],
})
steps = ["visit", "cart", "checkout", "purchase"]`,
    signature: 'def solve(events: pd.DataFrame, steps: list) -> pd.DataFrame:', call: 'solve(events, steps)',
    expected: { columns: ['step', 'users', 'conv_from_prev_pct'], rows: [['visit', 6, 100.0], ['cart', 4, 66.7], ['checkout', 2, 50.0], ['purchase', 1, 50.0]], dtypes: { conv_from_prev_pct: 'float' } },
    hints: ['u4 reached checkout and purchase without a cart, so u4 only counts at visit.', 'Build a user × step True/False table, then cumprod across the steps in order.'],
    approaches: [
      { name: 'User × step table + cumprod', code: `def solve(events, steps):
    reached = pd.crosstab(events["user"], events["step"]).gt(0).reindex(columns=steps, fill_value=False)
    strict = reached.astype(int).cumprod(axis=1)
    users = strict.sum()
    conv = (users / users.shift(1) * 100).round(1).fillna(100.0)
    return pd.DataFrame({"step": steps, "users": users.values, "conv_from_prev_pct": conv.values})`, explanation: 'cumprod across columns turns 1, 0, 1 into 1, 0, 0, so skipping a step blocks every later step. Summing columns gives users per step.', complexity: 'O(users × steps).', whenToUse: 'Ordered funnels where skipping a step should not count.' },
      { name: 'Set intersection loop', code: `def solve(events, steps):
    rows, kept, prev = [], None, None
    for step in steps:
        who = set(events.loc[events["step"] == step, "user"])
        kept = who if kept is None else kept & who
        n = len(kept)
        rows.append({"step": step, "users": n, "conv_from_prev_pct": 100.0 if prev is None else round(n / prev * 100, 1)})
        prev = n
    return pd.DataFrame(rows)`, explanation: 'Keeps the set of users still in the funnel and intersects it with each next step. Very readable, and fast enough for a handful of steps.', complexity: 'O(n × steps).', whenToUse: 'Explaining funnel logic to stakeholders.' },
    ],
    mistakes: 'Counting each step independently gives checkout 3 and purchase 2, which overstates conversion. Duplicate events (u1 visits twice) must be counted once.',
  },
  {
    id: 103, title: 'RFM Segments', difficulty: 'Advanced', tags: ['RFM'],
    story: 'CRM needs simple segments based on Recency, Frequency and Monetary value as of 30 June 2024.',
    task: 'Return customer, recency (days since last order), frequency (orders), monetary (sum) and segment: "Champion" if recency ≤ 30 and frequency ≥ 3, else "At risk" if recency > 90, else "Regular". Sort by customer.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C1", "C1", "C2", "C3", "C3", "C4", "C4", "C4"],
    "order_date": ["2024-06-20", "2024-06-25", "2024-06-28", "2024-02-01", "2024-05-15", "2024-06-10", "2024-03-01", "2024-03-02", "2024-03-05"],
    "amount": [50.0, 30.0, 20.0, 200.0, 40.0, 60.0, 10.0, 10.0, 10.0],
})
as_of = "2024-06-30"`,
    signature: 'def solve(orders: pd.DataFrame, as_of: str) -> pd.DataFrame:', call: 'solve(orders, as_of)',
    expected: { columns: ['customer', 'recency', 'frequency', 'monetary', 'segment'], rows: [['C1', 2, 3, 100.0, 'Champion'], ['C2', 150, 1, 200.0, 'At risk'], ['C3', 20, 2, 100.0, 'Regular'], ['C4', 117, 3, 30.0, 'At risk']], dtypes: { monetary: 'float' } },
    hints: ['Named aggregation: last=("order_date", "max"), frequency=("order_date", "count"), monetary=("amount", "sum").', 'Then np.select for the segment rules, in priority order.'],
    approaches: [
      { name: 'Named agg + np.select', code: `def solve(orders, as_of):
    d = orders.assign(order_date=pd.to_datetime(orders["order_date"]))
    rfm = d.groupby("customer", as_index=False).agg(
        last=("order_date", "max"), frequency=("order_date", "count"), monetary=("amount", "sum"))
    rfm["recency"] = (pd.Timestamp(as_of) - rfm["last"]).dt.days
    rfm["segment"] = np.select(
        [(rfm["recency"] <= 30) & (rfm["frequency"] >= 3), rfm["recency"] > 90],
        ["Champion", "At risk"], default="Regular")
    return rfm[["customer", "recency", "frequency", "monetary", "segment"]]`, explanation: 'One groupby builds the three RFM inputs. np.select applies rules in order, so a customer matching both rules gets the first.', complexity: 'O(n).', whenToUse: 'CRM segmentation with transparent business rules.' },
      { name: 'Score with a function', code: `def solve(orders, as_of):
    d = orders.assign(order_date=pd.to_datetime(orders["order_date"]))
    g = d.groupby("customer")
    rfm = pd.DataFrame({
        "recency": (pd.Timestamp(as_of) - g["order_date"].max()).dt.days,
        "frequency": g.size(),
        "monetary": g["amount"].sum(),
    })
    def segment(r):
        if r.recency <= 30 and r.frequency >= 3:
            return "Champion"
        return "At risk" if r.recency > 90 else "Regular"
    rfm["segment"] = rfm.apply(segment, axis=1)
    return rfm.reset_index()`, explanation: 'A row function reads like the business rule, which helps when rules change often. apply(axis=1) is slow on millions of rows, but fine for customer-level tables.', complexity: 'O(customers) with Python per row.', whenToUse: 'Small summary tables with complex rules.' },
    ],
    mistakes: 'Measuring recency from today\'s date makes results change every day; use a fixed as-of date. Checking "At risk" first would label C4 correctly, but could mislabel future champions.',
  },
  {
    id: 104, title: 'Sessionize Click Events', difficulty: 'Advanced', tags: ['sessionization'],
    story: 'Analytics defines a session as a run of events where each gap is 30 minutes or less. Longer gaps start a new session.',
    task: 'Return user, ts and session (1, 2, 3… per user), sorted by user and ts.',
    setup: `clicks = pd.DataFrame({
    "user": ["u1", "u2", "u1", "u1", "u2", "u1", "u2", "u1"],
    "ts": ["2024-05-01 09:00", "2024-05-01 10:00", "2024-05-01 09:10", "2024-05-01 09:50",
           "2024-05-01 10:29", "2024-05-01 10:05", "2024-05-01 11:00", "2024-05-01 13:00"],
})`,
    signature: 'def solve(clicks: pd.DataFrame) -> pd.DataFrame:', call: 'solve(clicks)',
    expected: { columns: ['user', 'ts', 'session'], rows: [['u1', '2024-05-01 09:00', 1], ['u1', '2024-05-01 09:10', 1], ['u1', '2024-05-01 09:50', 2], ['u1', '2024-05-01 10:05', 2], ['u1', '2024-05-01 13:00', 3], ['u2', '2024-05-01 10:00', 1], ['u2', '2024-05-01 10:29', 1], ['u2', '2024-05-01 11:00', 2]] },
    hints: ['Sort, then compute the gap to the previous event per user with groupby().diff().', 'A new session starts where the gap is missing or above 30 minutes. cumsum() of those flags per user numbers the sessions.'],
    approaches: [
      { name: 'Gap flag + grouped cumsum', code: `def solve(clicks):
    d = clicks.sort_values(["user", "ts"]).copy()
    t = pd.to_datetime(d["ts"])
    gap = t.groupby(d["user"]).diff()
    new = gap.isna() | (gap > pd.Timedelta(minutes=30))
    d["session"] = new.groupby(d["user"]).cumsum()
    return d`, explanation: 'Each True marks a session start, and the running count of starts is the session number. Grouping the cumsum restarts it for every user.', complexity: 'O(n log n).', whenToUse: 'Web analytics, app usage, call-centre contacts.' },
      { name: 'shift() comparison', code: `def solve(clicks):
    d = clicks.assign(t=pd.to_datetime(clicks["ts"])).sort_values(["user", "t"])
    prev_t = d.groupby("user")["t"].shift(1)
    d["session"] = ((d["t"] - prev_t) > pd.Timedelta("30min")).astype(int)
    d.loc[prev_t.isna(), "session"] = 1
    d["session"] = d.groupby("user")["session"].cumsum()
    return d[["user", "ts", "session"]]`, explanation: 'Same idea spelled out with LAG-style shift. It is easier to debug because you can print prev_t next to each event.', complexity: 'O(n log n).', whenToUse: 'When you need to inspect gaps while tuning the threshold.' },
    ],
    mistakes: 'A 30-minute gap exactly (10:00 → 10:30) belongs to the same session here because the rule is "more than 30". Without grouping, the first event of u2 is compared with the last event of u1.',
  },
  {
    id: 105, title: 'IQR Outlier Orders', difficulty: 'Advanced', tags: ['outliers'],
    story: 'Finance wants to review unusually small or large orders using the standard IQR rule.',
    task: 'Return order_id and amount for orders below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR, in the original order.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "amount": [20, 22, 25, 27, 30, 31, 35, 120, 2],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'amount'], rows: [[8, 120], [9, 2]] },
    hints: ['quantile([0.25, 0.75]) gives Q1 and Q3.', 'Here Q1 = 22 and Q3 = 31, so the fences are 8.5 and 44.5.'],
    approaches: [
      { name: 'quantile fences', code: `def solve(orders):
    q1, q3 = orders["amount"].quantile([0.25, 0.75])
    iqr = q3 - q1
    low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    return orders[(orders["amount"] < low) | (orders["amount"] > high)]`, explanation: 'The IQR rule is robust: one huge value barely moves the quartiles, unlike the mean and standard deviation.', complexity: 'O(n).', whenToUse: 'Skewed money data with a few extreme values.' },
      { name: 'between() inverted', code: `def solve(orders):
    q = orders["amount"].quantile([0.25, 0.75])
    iqr = q[0.75] - q[0.25]
    normal = orders["amount"].between(q[0.25] - 1.5 * iqr, q[0.75] + 1.5 * iqr)
    return orders[~normal]`, explanation: 'Defines the normal range and keeps everything outside it. Note that ~ also flags NaN amounts, which may be what a data-quality check wants.', complexity: 'O(n).', whenToUse: 'When the same "normal" mask is reused for cleaning.' },
    ],
    mistakes: 'Different tools compute quartiles differently. pandas uses linear interpolation by default (interpolation="linear"), so results can differ from Excel\'s QUARTILE.EXC.',
  },
  {
    id: 106, title: 'Z-Score Outliers per Machine', difficulty: 'Advanced', tags: ['outliers', 'transform'],
    story: 'Factory sensors run at different normal levels. A reading is suspicious if it is more than 1.5 standard deviations from its own machine\'s mean.',
    task: 'Return machine and reading for readings with |z| > 1.5, where z uses each machine\'s mean and sample standard deviation.',
    setup: `sensors = pd.DataFrame({
    "machine": ["M1", "M1", "M1", "M1", "M1", "M2", "M2", "M2", "M2", "M2"],
    "reading": [10, 11, 9, 10, 20, 50, 52, 48, 51, 49],
})`,
    signature: 'def solve(sensors: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sensors)',
    expected: { columns: ['machine', 'reading'], rows: [['M1', 20]] },
    hints: ['transform("mean") and transform("std") give each row its machine\'s statistics.', 'z = (reading − mean) / std. pandas std() uses ddof=1 (sample) by default.'],
    approaches: [
      { name: 'transform mean and std', code: `def solve(sensors):
    g = sensors.groupby("machine")["reading"]
    z = (sensors["reading"] - g.transform("mean")) / g.transform("std")
    return sensors[z.abs() > 1.5]`, explanation: 'Each reading is standardised against its own machine, so M2\'s normal level of 50 is not flagged.', complexity: 'O(n).', whenToUse: 'Anomaly detection per store, user or device.' },
      { name: 'Grouped z-score function', code: `def solve(sensors):
    z = sensors.groupby("machine")["reading"].transform(lambda s: (s - s.mean()) / s.std())
    return sensors.loc[z.abs() > 1.5, ["machine", "reading"]]`, explanation: 'Puts the full z-score formula in one function per group. It is clearer, but the lambda runs in Python for each group.', complexity: 'O(n) plus per-group overhead.', whenToUse: 'When the statistic is custom, for example a median-based robust z-score.' },
    ],
    mistakes: 'One global mean flags all of M2. NumPy\'s np.std defaults to ddof=0 (population), which gives a different z than pandas.',
  },
  {
    id: 107, title: 'Merge Duplicate CRM Contacts', difficulty: 'Advanced', tags: ['deduplication'],
    story: 'The CRM has several records per person because emails were typed with different case and spaces. For each person, keep the most complete record. If two records are equally complete, keep the most recently updated one.',
    task: 'Return email (lowercase, trimmed), name and phone, one row per email, sorted by email.',
    setup: `crm = pd.DataFrame({
    "email": [" Amy@Mail.com", "amy@mail.com", "bo@mail.com", "BO@mail.com ", "cy@mail.com"],
    "name": ["Amy", "Amy K", "Bo", "Bo L", None],
    "phone": [None, "555-1", "555-2", "555-3", None],
    "updated": ["2024-01-01", "2024-02-01", "2024-01-05", "2024-03-01", "2024-04-01"],
})`,
    signature: 'def solve(crm: pd.DataFrame) -> pd.DataFrame:', call: 'solve(crm)',
    expected: { columns: ['email', 'name', 'phone'], rows: [['amy@mail.com', 'Amy K', '555-1'], ['bo@mail.com', 'Bo L', '555-3'], ['cy@mail.com', null, null]] },
    hints: ['Normalise the key first: email.str.strip().str.lower().', 'Score completeness with notna().sum(axis=1), then sort by key, score (desc) and updated (desc) and keep the first per key.'],
    approaches: [
      { name: 'Score, sort, drop_duplicates', code: `def solve(crm):
    d = crm.assign(
        email=crm["email"].str.strip().str.lower(),
        filled=crm[["name", "phone"]].notna().sum(axis=1),
    )
    d = d.sort_values(["email", "filled", "updated"], ascending=[True, False, False])
    return d.drop_duplicates("email")[["email", "name", "phone"]]`, explanation: 'The sort encodes the business rule (complete first, then newest), and drop_duplicates keeps the first row per key.', complexity: 'O(n log n).', whenToUse: 'Golden-record creation and master-data clean-up.' },
      { name: 'groupby().head(1) after sorting', code: `def solve(crm):
    d = crm.assign(key=crm["email"].str.strip().str.lower(), filled=crm[["name", "phone"]].count(axis=1))
    best = d.sort_values(["filled", "updated"], ascending=False).groupby("key").head(1)
    return best.assign(email=best["key"])[["email", "name", "phone"]].sort_values("email")`, explanation: 'count(axis=1) also counts non-missing values per row. Sorting globally and taking head(1) per key gives the same winners.', complexity: 'O(n log n).', whenToUse: 'When you might keep the top 2 records per key for manual review.' },
    ],
    mistakes: 'Deduplicating before normalising the email keeps all five rows. Keeping the latest record alone would lose Amy\'s phone number if the newest record were incomplete.',
  },
  {
    id: 108, title: 'Price in Effect on a Date', difficulty: 'Advanced', tags: ['SCD / latest record'],
    story: 'A price history table stores a new row whenever a price changes (valid_from). Audit asks: what price applied to each product on 15 March 2024?',
    task: 'Return product, price and valid_from (datetime) of the row in effect on as_of, for products that already had a price then, sorted by product.',
    setup: `history = pd.DataFrame({
    "product": ["P1", "P1", "P1", "P2", "P2", "P3"],
    "valid_from": ["2024-01-01", "2024-03-01", "2024-04-01", "2024-02-15", "2024-03-20", "2024-04-01"],
    "price": [10, 12, 13, 5, 6, 7],
})
as_of = "2024-03-15"`,
    signature: 'def solve(history: pd.DataFrame, as_of: str) -> pd.DataFrame:', call: 'solve(history, as_of)',
    expected: { columns: ['product', 'price', 'valid_from'], rows: [['P1', 12, '2024-03-01'], ['P2', 5, '2024-02-15']], dtypes: { valid_from: 'datetime' } },
    hints: ['Keep rows with valid_from ≤ as_of, then the latest of those per product.', 'pd.merge_asof does "latest row on or before" lookups directly.'],
    approaches: [
      { name: 'Filter + latest per key', code: `def solve(history, as_of):
    h = history.assign(valid_from=pd.to_datetime(history["valid_from"]))
    h = h[h["valid_from"] <= pd.Timestamp(as_of)]
    return h.sort_values("valid_from").drop_duplicates("product", keep="last").sort_values("product")[["product", "price", "valid_from"]]`, explanation: 'Future rows are removed first, then the newest remaining row per product is the one in effect. P3 has no price yet and drops out.', complexity: 'O(n log n).', whenToUse: 'Slowly changing dimensions (type 2) and point-in-time lookups.' },
      { name: 'merge_asof', code: `def solve(history, as_of):
    h = history.assign(valid_from=pd.to_datetime(history["valid_from"])).sort_values("valid_from")
    q = pd.DataFrame({"product": sorted(h["product"].unique()), "as_of": pd.Timestamp(as_of)})
    q["as_of"] = q["as_of"].astype(h["valid_from"].dtype)
    m = pd.merge_asof(q, h, left_on="as_of", right_on="valid_from", by="product")
    return m.dropna(subset=["price"])[["product", "price", "valid_from"]]`, explanation: 'merge_asof matches each query row with the last right row whose key is ≤ the left key, within each by= group. It scales to many dates at once, such as pricing every order on its own order date.', complexity: 'O(n log n).', whenToUse: 'Joining events to the version of a record valid at event time.' },
    ],
    mistakes: 'Taking the overall latest row returns P1 at 13, a price that did not exist yet on 15 March. merge_asof requires both sides sorted by the "on" keys.',
  },
  {
    id: 109, title: 'Shipping Fees: apply vs Vectorized', difficulty: 'Advanced', tags: ['performance'],
    story: 'Shipping costs $5 plus $0.50 per kg above 2 kg, and is free for orders of $100 or more. The current apply() code is slow on 10 million rows.',
    task: 'Return order_id and fee.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6],
    "weight_kg": [1.0, 3.0, 2.0, 10.0, 4.5, 0.5],
    "order_total": [30.0, 50.0, 120.0, 80.0, 99.99, 100.0],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'fee'], rows: [[1, 5.0], [2, 5.5], [3, 0.0], [4, 9.0], [5, 6.25], [6, 0.0]], dtypes: { fee: 'float' } },
    hints: ['(weight − 2).clip(lower=0) gives the extra kg without an if.', 'np.where(total >= 100, 0, fee) applies the free-shipping rule.'],
    approaches: [
      { name: 'Vectorized with clip + np.where', code: `def solve(orders):
    extra_kg = (orders["weight_kg"] - 2).clip(lower=0)
    fee = 5 + 0.5 * extra_kg
    fee = np.where(orders["order_total"] >= 100, 0.0, fee)
    return orders[["order_id"]].assign(fee=fee)`, explanation: 'Every step runs on whole columns in compiled code. On 10 million rows this typically takes well under a second, while apply takes minutes.', complexity: 'O(n), vectorised.', whenToUse: 'Any rule built from arithmetic and comparisons.' },
      { name: 'Row-wise apply (the slow baseline)', code: `def solve(orders):
    def fee(row):
        if row["order_total"] >= 100:
            return 0.0
        return 5 + 0.5 * max(row["weight_kg"] - 2, 0)
    return orders[["order_id"]].assign(fee=orders.apply(fee, axis=1))`, explanation: 'Easy to read, but apply(axis=1) builds a Series for every row and calls Python each time. Use it to confirm the logic, then replace it with the vectorised version.', complexity: 'O(n) with heavy per-row overhead (often 100× slower).', whenToUse: 'Prototyping, or rules that call non-vectorisable Python code.' },
    ],
    mistakes: 'Using > 100 instead of >= 100 charges order 6. Python\'s max() inside apply is fine for one row, but on a Series you need clip() or np.maximum().',
  },
  {
    id: 110, title: 'Shrink a DataFrame\'s Memory', difficulty: 'Advanced', tags: ['memory optimisation', 'dtype conversion'], checkDtype: true,
    story: 'An orders extract will grow to 50 million rows. To fit it in memory, you change the dtypes: repeated text becomes category and numbers use the smallest safe type.',
    task: 'Return all columns with status as category, quantity downcast to int8 and price downcast to float32. Keep order_id as int64. This problem checks dtypes.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6],
    "status": ["new", "shipped", "new", "returned", "shipped", "new"],
    "quantity": [1, 2, 1, 5, 3, 2],
    "price": [9.99, 20.0, 5.5, 12.25, 3.0, 7.75],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'status', 'quantity', 'price'], rows: [[1, 'new', 1, 9.99], [2, 'shipped', 2, 20.0], [3, 'new', 1, 5.5], [4, 'returned', 5, 12.25], [5, 'shipped', 3, 3.0], [6, 'new', 2, 7.75]], dtypes: { status: 'category', quantity: 'int8', price: 'float32' } },
    hints: ['astype({"status": "category", ...}) converts several columns at once.', 'pd.to_numeric(s, downcast="integer") picks the smallest int type that fits.'],
    approaches: [
      { name: 'astype with a dict', code: `def solve(orders):
    return orders.astype({"status": "category", "quantity": "int8", "price": "float32"})`, explanation: 'A category column stores each distinct text once plus small integer codes. int8 holds −128…127, using 1 byte instead of 8. Check df.memory_usage(deep=True) before and after.', complexity: 'O(n).', whenToUse: 'When you know the value ranges in advance.' },
      { name: 'Automatic downcasting', code: `def solve(orders):
    return orders.assign(
        status=orders["status"].astype("category"),
        quantity=pd.to_numeric(orders["quantity"], downcast="integer"),
        price=pd.to_numeric(orders["price"], downcast="float"),
    )`, explanation: 'downcast inspects the actual values and picks the smallest type that fits, so it is safer when ranges are unknown.', complexity: 'O(n).', whenToUse: 'Generic loaders that shrink any incoming file.' },
    ],
    mistakes: 'float32 keeps about 7 significant digits, which is fine for prices but not for large IDs or exact money totals. Category is only worth it when values repeat. A unique text column gets bigger.',
  },
  {
    id: 111, title: 'One Clean Method Chain', difficulty: 'Advanced', tags: ['method chaining'],
    story: 'Your team\'s style guide prefers one readable chain over many temporary variables. The task: 2024 revenue by category, excluding cancelled orders.',
    task: 'Return category and revenue (qty × price summed) for non-cancelled 2024 orders, sorted by revenue descending.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7],
    "date": ["2023-12-30", "2024-01-02", "2024-01-05", "2024-02-10", "2024-02-11", "2024-03-01", "2024-03-02"],
    "category": ["Books", "Books", "Toys", "Toys", "Books", "Games", "Toys"],
    "qty": [1, 2, 1, 3, 1, 2, 1],
    "price": [10, 12, 25, 8, 15, 30, 20],
    "status": ["ok", "ok", "cancelled", "ok", "ok", "ok", "ok"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['category', 'revenue'], rows: [['Games', 60], ['Toys', 44], ['Books', 39]] },
    hints: ['assign() can take a lambda that receives the DataFrame at that point in the chain.', 'query() and pipe() keep filtering steps inside the chain.'],
    approaches: [
      { name: 'assign + query + groupby', code: `def solve(orders):
    return (
        orders
        .assign(date=lambda d: pd.to_datetime(d["date"]), revenue=lambda d: d["qty"] * d["price"])
        .query("status != 'cancelled' and date.dt.year == 2024")
        .groupby("category", as_index=False)["revenue"].sum()
        .sort_values("revenue", ascending=False)
    )`, explanation: 'Lambdas in assign see the DataFrame as it is at that step, so no temporary variables are needed. Each line is one transformation.', complexity: 'O(n).', whenToUse: 'Readable, reviewable pipelines in notebooks and production code.' },
      { name: 'pipe with named steps', code: `def drop_cancelled(d):
    return d[d["status"] != "cancelled"]

def only_year(d, year):
    return d[pd.to_datetime(d["date"]).dt.year == year]

def solve(orders):
    return (
        orders.pipe(drop_cancelled)
        .pipe(only_year, 2024)
        .assign(revenue=lambda d: d["qty"] * d["price"])
        .groupby("category", as_index=False)["revenue"].sum()
        .sort_values("revenue", ascending=False)
    )`, explanation: 'pipe(func, *args) calls func(df, *args). Named step functions can be unit-tested and reused across reports.', complexity: 'O(n).', whenToUse: 'Shared cleaning steps used in several pipelines.' },
    ],
    mistakes: 'Using inplace=True inside a chain returns None and breaks the next step. Referencing the outer orders variable inside a lambda uses the unfiltered data. Use the lambda argument.',
  },
  {
    id: 112, title: 'Case Study: Monthly ARPU', difficulty: 'Advanced', tags: ['case study', 'growth'],
    story: 'Leadership wants a monthly KPI table: revenue, active customers, average revenue per active customer (ARPU), and how ARPU changed month over month.',
    task: 'Return month, revenue, active_customers, arpu (rounded to 2) and arpu_change_pct (rounded to 1, NaN for the first month), in month order.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C2", "C1", "C2", "C3", "C1", "C2", "C3", "C4"],
    "date": ["2024-01-03", "2024-01-09", "2024-01-20", "2024-02-02", "2024-02-14", "2024-03-01", "2024-03-05", "2024-03-09", "2024-03-30"],
    "amount": [10.0, 20.0, 30.0, 40.0, 20.0, 50.0, 25.0, 15.0, 70.0],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['month', 'revenue', 'active_customers', 'arpu', 'arpu_change_pct'], rows: [['2024-01', 60.0, 2, 30.0, null], ['2024-02', 60.0, 2, 30.0, 0.0], ['2024-03', 160.0, 4, 40.0, 33.3]], dtypes: { revenue: 'float', arpu: 'float', arpu_change_pct: 'float' } },
    hints: ['Group by a month label with named aggregation: revenue=("amount", "sum"), active_customers=("customer", "nunique").', 'arpu = revenue / active_customers, then pct_change().'],
    approaches: [
      { name: 'Named agg + derived columns', code: `def solve(orders):
    month = pd.to_datetime(orders["date"]).dt.strftime("%Y-%m")
    kpi = orders.assign(month=month).groupby("month", as_index=False).agg(
        revenue=("amount", "sum"), active_customers=("customer", "nunique"))
    kpi["arpu"] = (kpi["revenue"] / kpi["active_customers"]).round(2)
    kpi["arpu_change_pct"] = (kpi["arpu"].pct_change() * 100).round(1)
    return kpi`, explanation: 'Aggregate once, then derive ratios from the aggregates. Never average per-order values to get ARPU, because ARPU is a ratio of sums.', complexity: 'O(n).', whenToUse: 'Monthly KPI packs and investor updates.' },
      { name: 'resample on a DatetimeIndex', code: `def solve(orders):
    d = orders.set_index(pd.to_datetime(orders["date"]))
    kpi = pd.DataFrame({
        "revenue": d["amount"].resample("MS").sum(),
        "active_customers": d["customer"].resample("MS").nunique(),
    })
    kpi["arpu"] = (kpi["revenue"] / kpi["active_customers"]).round(2)
    kpi["arpu_change_pct"] = (kpi["arpu"].pct_change() * 100).round(1)
    kpi.index = kpi.index.strftime("%Y-%m")
    return kpi.rename_axis("month").reset_index()`, explanation: '"MS" buckets by month start. Resampling also creates months with no orders, which keeps the time axis complete.', complexity: 'O(n).', whenToUse: 'When missing months must still appear in the report.' },
    ],
    mistakes: 'Using count instead of nunique counts orders, so C1\'s two January orders inflate the customer count. A month with zero active customers would divide by zero, so guard with .replace(0, np.nan).',
  },
  {
    id: 113, title: 'Churn Rate by Channel', difficulty: 'Advanced', tags: ['churn', 'case study'],
    story: 'Marketing compares acquisition channels. A customer has churned if their last order was more than 60 days before 30 June 2024.',
    task: 'Return channel, customers and churn_pct (rounded to 1), sorted by churn_pct descending.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C1", "C2", "C3", "C4", "C4", "C5", "C6"],
    "channel": ["ads", "ads", "ads", "organic", "organic", "organic", "organic", "referral"],
    "order_date": ["2024-01-10", "2024-06-01", "2024-03-01", "2024-06-20", "2024-02-01", "2024-04-10", "2024-04-30", "2024-06-29"],
})
as_of = "2024-06-30"`,
    signature: 'def solve(orders: pd.DataFrame, as_of: str) -> pd.DataFrame:', call: 'solve(orders, as_of)',
    expected: { columns: ['channel', 'customers', 'churn_pct'], rows: [['organic', 3, 66.7], ['ads', 2, 50.0], ['referral', 1, 0.0]], dtypes: { churn_pct: 'float' } },
    hints: ['First reduce to one row per customer with their last order date.', 'The mean of a True/False column is the share of True values.'],
    approaches: [
      { name: 'Customer table, then mean of a flag', code: `def solve(orders, as_of):
    last = (orders.assign(order_date=pd.to_datetime(orders["order_date"]))
            .groupby(["customer", "channel"], as_index=False)["order_date"].max())
    last["churned"] = (pd.Timestamp(as_of) - last["order_date"]).dt.days > 60
    out = last.groupby("channel", as_index=False).agg(customers=("customer", "count"), churn_pct=("churned", "mean"))
    out["churn_pct"] = (out["churn_pct"] * 100).round(1)
    return out.sort_values("churn_pct", ascending=False)`, explanation: 'Churn is a customer-level fact, so collapse orders to customers first. Averaging the boolean flag gives the churn rate directly.', complexity: 'O(n).', whenToUse: 'Any rate per segment: churn, conversion, defect rate.' },
      { name: 'crosstab with normalize', code: `def solve(orders, as_of):
    d = orders.assign(order_date=pd.to_datetime(orders["order_date"]))
    last = d.groupby(["customer", "channel"])["order_date"].max().reset_index()
    churned = (pd.Timestamp(as_of) - last["order_date"]).dt.days > 60
    rate = pd.crosstab(last["channel"], churned, normalize="index").reindex(columns=[True], fill_value=0)[True]
    out = pd.DataFrame({"customers": last["channel"].value_counts(), "churn_pct": (rate * 100).round(1)})
    return out.rename_axis("channel").reset_index().sort_values("churn_pct", ascending=False)`, explanation: 'normalize="index" turns counts into row shares. reindex makes sure the True column exists even if no channel had churners.', complexity: 'O(n).', whenToUse: 'When you also want the full churned vs active split per channel.' },
    ],
    mistakes: 'Computing churn on order rows counts C1 twice. Exactly 60 days is not churn here, because the rule says "more than 60".',
  },
  {
    id: 114, title: 'Products Bought Together', difficulty: 'Advanced', tags: ['market basket', 'merge/join'],
    story: 'Merchandising wants the product pairs that most often appear in the same order, to plan bundles.',
    task: 'Return item_a, item_b (item_a < item_b alphabetically) and orders, sorted by orders descending, then item_a, then item_b.',
    setup: `lines = pd.DataFrame({
    "order_id": [1, 1, 1, 2, 2, 3, 3, 4, 4],
    "item": ["bread", "milk", "eggs", "bread", "milk", "milk", "eggs", "bread", "butter"],
})`,
    signature: 'def solve(lines: pd.DataFrame) -> pd.DataFrame:', call: 'solve(lines)',
    expected: { columns: ['item_a', 'item_b', 'orders'], rows: [['bread', 'milk', 2], ['eggs', 'milk', 2], ['bread', 'butter', 1], ['bread', 'eggs', 1]] },
    hints: ['Merge the table with itself on order_id to get every pair within an order.', 'Keep only pairs where item_a < item_b to drop self-pairs and mirror pairs.'],
    approaches: [
      { name: 'Self-merge', code: `def solve(lines):
    pairs = lines.merge(lines, on="order_id", suffixes=("_a", "_b"))
    pairs = pairs[pairs["item_a"] < pairs["item_b"]]
    counts = pairs.groupby(["item_a", "item_b"]).size().reset_index(name="orders")
    return counts.sort_values(["orders", "item_a", "item_b"], ascending=[False, True, True])`, explanation: 'A self-join creates all combinations within each order (k² rows for k items). The < filter keeps each unordered pair once.', complexity: 'O(Σ k²) per order.', whenToUse: 'Co-occurrence: products, skills, symptoms.' },
      { name: 'itertools.combinations', code: `from itertools import combinations

def solve(lines):
    rows = []
    for _, items in lines.groupby("order_id")["item"]:
        rows += list(combinations(sorted(set(items)), 2))
    pairs = pd.DataFrame(rows, columns=["item_a", "item_b"])
    counts = pairs.value_counts().reset_index(name="orders")
    return counts.sort_values(["orders", "item_a", "item_b"], ascending=[False, True, True])`, explanation: 'Generates sorted pairs per order in Python. set() removes repeated items in one order, which the self-merge would double count.', complexity: 'O(Σ k²) with Python loops.', whenToUse: 'When you also need triples (combinations(..., 3)).' },
    ],
    mistakes: 'Using != instead of < counts every pair twice (bread–milk and milk–bread). A huge order with 500 items creates 250,000 pairs, so filter big orders first.',
  },
  {
    id: 115, title: 'Products Behind 80% of Revenue', difficulty: 'Advanced', tags: ['pareto', 'window functions'],
    story: 'A Pareto analysis: which top products together bring in the first 80% of revenue?',
    task: 'Sort products by revenue descending and return product, revenue and cum_share_pct (rounded to 1) for products whose cumulative share before them is below 80%.',
    setup: `sales = pd.DataFrame({
    "product": ["C", "A", "E", "B", "D"],
    "revenue": [100, 500, 40, 300, 60],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales)',
    expected: { columns: ['product', 'revenue', 'cum_share_pct'], rows: [['A', 500, 50.0], ['B', 300, 80.0]], dtypes: { cum_share_pct: 'float' } },
    hints: ['cumsum() / sum() gives the cumulative share.', 'The share before a product is the cumulative share minus its own share. Keep rows where that is below 80.'],
    approaches: [
      { name: 'cumsum and the previous share', code: `def solve(sales):
    d = sales.sort_values("revenue", ascending=False).copy()
    share = d["revenue"] / d["revenue"].sum() * 100
    d["cum_share_pct"] = share.cumsum().round(1)
    before = share.cumsum() - share
    return d[before < 80]`, explanation: 'Including the product that crosses the line is the usual Pareto convention. Comparing the share before each product implements that cleanly.', complexity: 'O(n log n).', whenToUse: 'ABC analysis of inventory, customers or complaints.' },
      { name: 'shift() the cumulative share', code: `def solve(sales):
    d = sales.sort_values("revenue", ascending=False).copy()
    cum = d["revenue"].cumsum() / d["revenue"].sum() * 100
    d["cum_share_pct"] = cum.round(1)
    return d[cum.shift(1, fill_value=0) < 80]`, explanation: 'shift(1, fill_value=0) gives "cumulative share up to the previous product". Same rule, one step shorter.', complexity: 'O(n log n).', whenToUse: 'When you already have the cumulative column.' },
    ],
    mistakes: 'Filtering cum_share ≤ 80 can miss the product that crosses the threshold when it lands above 80. Float sums can be 79.999…, so compare the unrounded value and round only for display.',
  },
  {
    id: 116, title: 'Weighted Average Price', difficulty: 'Advanced', tags: ['groupby', 'performance'],
    story: 'Purchasing buys the same product at different prices and quantities. The true average cost is weighted by quantity.',
    task: 'Return product and wavg_price = Σ(qty × price) ÷ Σ qty, rounded to 2 decimals.',
    setup: `buys = pd.DataFrame({
    "product": ["P1", "P1", "P2", "P2", "P2"],
    "qty": [2, 3, 1, 1, 2],
    "price": [10.0, 12.0, 5.0, 7.0, 6.0],
})`,
    signature: 'def solve(buys: pd.DataFrame) -> pd.DataFrame:', call: 'solve(buys)',
    expected: { columns: ['product', 'wavg_price'], rows: [['P1', 11.2], ['P2', 6.0]], dtypes: { wavg_price: 'float' } },
    hints: ['Add a value column (qty × price), sum value and qty per product, then divide.', 'np.average(price, weights=qty) also works inside apply.'],
    approaches: [
      { name: 'Sum then divide (vectorised)', code: `def solve(buys):
    g = buys.assign(value=buys["qty"] * buys["price"]).groupby("product")[["value", "qty"]].sum()
    return (g["value"] / g["qty"]).round(2).rename("wavg_price").reset_index()`, explanation: 'Weighted averages are ratios of sums. Summing two columns per group stays fully vectorised.', complexity: 'O(n).', whenToUse: 'Large tables, any weighted mean (cost, rating, CPM).' },
      { name: 'np.average in apply', code: `def solve(buys):
    w = buys.groupby("product").apply(lambda g: np.average(g["price"], weights=g["qty"]), include_groups=False)
    return w.round(2).rename("wavg_price").reset_index()`, explanation: 'Reads exactly like the definition, but apply calls Python once per group.', complexity: 'O(n) plus per-group overhead.', whenToUse: 'Few groups, or when the weighting is complex.' },
    ],
    mistakes: 'groupby("product")["price"].mean() ignores quantities and gives P1 = 11.0. Rows with qty 0 are fine, but a product whose quantities sum to 0 divides by zero.',
  },
  {
    id: 117, title: 'Year-to-Date Revenue', difficulty: 'Advanced', tags: ['window functions', 'datetime'],
    story: 'The finance dashboard shows revenue year-to-date, which restarts every January.',
    task: 'Return month, revenue and ytd (running total within each calendar year).',
    setup: `monthly = pd.DataFrame({
    "month": ["2023-11", "2023-12", "2024-01", "2024-02", "2024-03"],
    "revenue": [100, 150, 80, 120, 100],
})`,
    signature: 'def solve(monthly: pd.DataFrame) -> pd.DataFrame:', call: 'solve(monthly)',
    expected: { columns: ['month', 'revenue', 'ytd'], rows: [['2023-11', 100, 100], ['2023-12', 150, 250], ['2024-01', 80, 80], ['2024-02', 120, 200], ['2024-03', 100, 300]] },
    hints: ['Group by the year part of the month, then cumsum().', 'monthly["month"].str[:4] or pd.to_datetime(...).dt.year give the year.'],
    approaches: [
      { name: 'cumsum per year', code: `def solve(monthly):
    year = pd.to_datetime(monthly["month"]).dt.year
    return monthly.assign(ytd=monthly.groupby(year)["revenue"].cumsum())`, explanation: 'You can group by a Series that is not a column, here the derived year. The running total restarts for each year.', complexity: 'O(n).', whenToUse: 'YTD, QTD and MTD totals.' },
      { name: 'String slice as the key', code: `def solve(monthly):
    return monthly.assign(ytd=monthly.groupby(monthly["month"].str[:4])["revenue"].cumsum())`, explanation: 'When dates are clean ISO strings, slicing the year is simpler than converting to datetime.', complexity: 'O(n).', whenToUse: 'Quick work on trusted, well-formatted strings.' },
    ],
    mistakes: 'A plain cumsum keeps counting from November 2023. A fiscal year starting in April needs a shifted year key, such as (date − 3 months).dt.year.',
  },
  {
    id: 118, title: 'Duplicate Card Charges', difficulty: 'Advanced', tags: ['deduplication', 'datetime'],
    story: 'Fraud ops suspects double charges: the same card charged the same amount within 5 minutes of the previous charge.',
    task: 'Return tx_id, card and amount of every charge made within 5 minutes after an earlier charge with the same card and amount, in time order.',
    setup: `tx = pd.DataFrame({
    "tx_id": ["T1", "T2", "T3", "T4", "T5", "T6"],
    "card": ["c1", "c1", "c1", "c2", "c2", "c2"],
    "ts": ["2024-07-01 10:00", "2024-07-01 10:03", "2024-07-01 10:20", "2024-07-01 11:00", "2024-07-01 11:02", "2024-07-01 11:04"],
    "amount": [50.0, 50.0, 50.0, 20.0, 25.0, 20.0],
})`,
    signature: 'def solve(tx: pd.DataFrame) -> pd.DataFrame:', call: 'solve(tx)',
    expected: { columns: ['tx_id', 'card', 'amount'], rows: [['T2', 'c1', 50.0], ['T6', 'c2', 20.0]], dtypes: { amount: 'float' } },
    hints: ['Group by card and amount, and compare each charge with the previous one in that group.', 'diff() ≤ 5 minutes flags the repeat.'],
    approaches: [
      { name: 'Grouped diff', code: `def solve(tx):
    d = tx.assign(t=pd.to_datetime(tx["ts"])).sort_values("t")
    gap = d.groupby(["card", "amount"])["t"].diff()
    return d.loc[gap <= pd.Timedelta(minutes=5), ["tx_id", "card", "amount"]]`, explanation: 'Grouping by (card, amount) means T5 at $25 does not hide T6 from T4. NaT gaps (first charge in a group) compare as False.', complexity: 'O(n log n).', whenToUse: 'Duplicate detection within a time window.' },
      { name: 'Self-merge in a window', code: `def solve(tx):
    d = tx.assign(t=pd.to_datetime(tx["ts"]))
    m = d.merge(d, on=["card", "amount"], suffixes=("", "_prev"))
    hit = (m["t"] > m["t_prev"]) & (m["t"] - m["t_prev"] <= pd.Timedelta(minutes=5))
    return m.loc[hit, ["tx_id", "card", "amount"]].drop_duplicates().sort_values("tx_id")`, explanation: 'Compares each charge with every earlier one, not only the immediately previous one. That catches triple charges too, at the cost of more rows.', complexity: 'O(k²) per (card, amount) group.', whenToUse: 'Small groups, or rules about any earlier event in a window.' },
    ],
    mistakes: 'Grouping by card only compares T6 with T5 (different amount) and misses it. Comparing floats with == is fine for exact cents, but round first if amounts come from calculations.',
  },
  {
    id: 119, title: 'Device Mix per Country', difficulty: 'Advanced', tags: ['pivot/crosstab'],
    story: 'Product wants each country\'s device mix as row percentages, to decide where mobile-first matters most.',
    task: 'Return country, desktop and mobile as percentages of that country\'s sessions (rounded to 1), sorted by country.',
    setup: `sessions = pd.DataFrame({
    "country": ["NG", "NG", "NG", "KE", "KE"],
    "device": ["mobile", "mobile", "desktop", "mobile", "desktop"],
})`,
    signature: 'def solve(sessions: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sessions)',
    expected: { columns: ['country', 'desktop', 'mobile'], rows: [['KE', 50.0, 50.0], ['NG', 33.3, 66.7]], dtypes: { desktop: 'float', mobile: 'float' } },
    hints: ['pd.crosstab(..., normalize="index") divides each row by its total.', 'Multiply by 100 and round.'],
    approaches: [
      { name: 'crosstab(normalize="index")', code: `def solve(sessions):
    mix = pd.crosstab(sessions["country"], sessions["device"], normalize="index").mul(100).round(1)
    return mix.reset_index().rename_axis(columns=None)`, explanation: 'Row-normalising answers "within this country, what share is mobile". normalize="columns" would answer the opposite question.', complexity: 'O(n).', whenToUse: 'Mix and composition tables.' },
      { name: 'Counts ÷ row totals', code: `def solve(sessions):
    counts = sessions.groupby(["country", "device"]).size().unstack(fill_value=0)
    mix = counts.div(counts.sum(axis=1), axis=0).mul(100).round(1)
    return mix.reset_index().rename_axis(columns=None)`, explanation: 'div(..., axis=0) divides each row by its own total. This is the general pattern for any row-wise percentage.', complexity: 'O(n).', whenToUse: 'When the counts already come from a groupby.' },
    ],
    mistakes: 'Dividing by the grand total gives each cell\'s share of all sessions, so rows no longer add up to 100. Rounded rows may add up to 99.9 or 100.1, which is normal.',
  },
  {
    id: 120, title: 'Carry Stock Levels Forward per Store', difficulty: 'Advanced', tags: ['missing values', 'transform'],
    story: 'Stock is only counted on some days. Between counts, the last known level applies, but a store must never inherit another store\'s count.',
    task: 'Return store, day and stock with missing values forward-filled within each store. A store\'s first missing value stays NaN.',
    setup: `stock = pd.DataFrame({
    "store": ["A", "A", "A", "A", "B", "B", "B"],
    "day": [1, 2, 3, 4, 1, 2, 3],
    "stock": [10, np.nan, np.nan, 7, np.nan, 5, np.nan],
})`,
    signature: 'def solve(stock: pd.DataFrame) -> pd.DataFrame:', call: 'solve(stock)',
    expected: { columns: ['store', 'day', 'stock'], rows: [['A', 1, 10.0], ['A', 2, 10.0], ['A', 3, 10.0], ['A', 4, 7.0], ['B', 1, null], ['B', 2, 5.0], ['B', 3, 5.0]], dtypes: { stock: 'float' } },
    hints: ['groupby("store")["stock"].ffill() restarts at each store.', 'A plain ffill() would give store B day 1 the value 7 from store A.'],
    approaches: [
      { name: 'groupby().ffill()', code: `def solve(stock):
    return stock.assign(stock=stock.groupby("store")["stock"].ffill())`, explanation: 'Group-aware forward fill keeps the original index, so it aligns back. Add limit=2 to stop carrying values for too long.', complexity: 'O(n).', whenToUse: 'Snapshots per entity: stock, balances, statuses.' },
      { name: 'transform with a lambda', code: `def solve(stock):
    filled = stock.sort_values(["store", "day"]).groupby("store")["stock"].transform(lambda s: s.ffill())
    return stock.assign(stock=filled)`, explanation: 'Sorting by day first makes "forward" mean forward in time, even if the input order is mixed.', complexity: 'O(n log n).', whenToUse: 'Unsorted inputs, or combining ffill with other per-group logic.' },
    ],
    mistakes: 'fillna(method="ffill") is deprecated in pandas 2.x, so use .ffill(). Forgetting to sort by day carries values backward in time.',
  },
  {
    id: 121, title: 'Rolling 7-Day Spend per User', difficulty: 'Advanced', tags: ['rolling/expanding', 'datetime'],
    story: 'A spending limit applies over any 7-day window. For every transaction, you need the user\'s spend in the 7 days ending at that moment.',
    task: 'Return user, date, amount and spend_7d (sum over the window (date − 7 days, date]), in the original order.',
    setup: `tx = pd.DataFrame({
    "user": ["u1", "u2", "u1", "u2", "u1", "u1"],
    "date": pd.to_datetime(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-05", "2024-01-09", "2024-01-10"]),
    "amount": [10.0, 30.0, 20.0, 10.0, 5.0, 15.0],
})`,
    signature: 'def solve(tx: pd.DataFrame) -> pd.DataFrame:', call: 'solve(tx)',
    expected: { columns: ['user', 'date', 'amount', 'spend_7d'], rows: [['u1', '2024-01-01', 10.0, 10.0], ['u2', '2024-01-02', 30.0, 30.0], ['u1', '2024-01-03', 20.0, 30.0], ['u2', '2024-01-05', 10.0, 40.0], ['u1', '2024-01-09', 5.0, 25.0], ['u1', '2024-01-10', 15.0, 20.0]], dtypes: { date: 'datetime', amount: 'float', spend_7d: 'float' } },
    hints: ['A time-based window: rolling("7D", on="date") uses calendar time, not a row count.', 'Roll each user\'s rows separately (loop over groupby) and stitch the pieces back with pd.concat.'],
    approaches: [
      { name: 'Per-user rolling("7D")', code: `def solve(tx):
    parts = [g.rolling("7D", on="date")["amount"].sum() for _, g in tx.groupby("user")]
    return tx.assign(spend_7d=pd.concat(parts))`, explanation: '"7D" includes everything after date − 7 days, so on 01-10 the 01-03 charge has just dropped out. Rolling each user separately keeps the original row labels, so pd.concat aligns straight back. Each user\'s rows must be sorted by date.', complexity: 'O(n).', whenToUse: 'Velocity checks, rolling limits, trailing-week metrics.' },
      { name: 'Self-merge and filter', code: `def solve(tx):
    m = tx.reset_index().merge(tx, on="user", suffixes=("", "_w"))
    inside = (m["date_w"] <= m["date"]) & (m["date_w"] > m["date"] - pd.Timedelta(days=7))
    spend = m[inside].groupby("index")["amount_w"].sum()
    return tx.assign(spend_7d=spend)`, explanation: 'Pairs every transaction with the same user\'s other transactions and keeps those inside the window. It is easy to adapt to unusual windows, such as business days.', complexity: 'O(k²) per user.', whenToUse: 'Small data or irregular window rules.' },
    ],
    mistakes: 'rolling(7) counts 7 rows, not 7 days. A plain rolling("7D") without groupby mixes users.',
  },
  {
    id: 122, title: 'Favourite Category per Customer', difficulty: 'Advanced', tags: ['top-N per group'],
    story: 'Personalisation needs each customer\'s most purchased category. Ties go to the category that comes first alphabetically.',
    task: 'Return customer and top_category, sorted by customer.',
    setup: `purchases = pd.DataFrame({
    "customer": ["C1", "C1", "C1", "C2", "C2", "C3"],
    "category": ["Books", "Toys", "Books", "Toys", "Games", "Toys"],
})`,
    signature: 'def solve(purchases: pd.DataFrame) -> pd.DataFrame:', call: 'solve(purchases)',
    expected: { columns: ['customer', 'top_category'], rows: [['C1', 'Books'], ['C2', 'Games'], ['C3', 'Toys']] },
    hints: ['Count (customer, category) pairs, then sort by customer, count descending and category.', 'Keep the first row per customer.'],
    approaches: [
      { name: 'Count, sort, keep first', code: `def solve(purchases):
    counts = purchases.groupby(["customer", "category"]).size().reset_index(name="n")
    best = counts.sort_values(["customer", "n", "category"], ascending=[True, False, True]).drop_duplicates("customer")
    return best.rename(columns={"category": "top_category"})[["customer", "top_category"]]`, explanation: 'A mode with an explicit tie-break. The same pattern gives the most common store, device or payment method per customer.', complexity: 'O(n log n).', whenToUse: 'Profile features for personalisation and CRM.' },
      { name: 'agg with Series.mode', code: `def solve(purchases):
    top = purchases.groupby("customer")["category"].agg(lambda s: s.mode().sort_values().iloc[0])
    return top.rename("top_category").reset_index()`, explanation: 'mode() returns all most-frequent values (sorted). Taking the first after sorting applies the alphabetical tie-break.', complexity: 'O(n) plus per-group overhead.', whenToUse: 'Readable one-liners on moderate data.' },
    ],
    mistakes: 'value_counts().idxmax() returns whichever tied category was counted first, which depends on row order. Decide the tie-break explicitly.',
  },
  {
    id: 123, title: 'What Drove the Revenue Change?', difficulty: 'Advanced', tags: ['case study', 'reshaping'],
    story: 'Revenue grew from Q1 to Q2. The CFO asks which products explain the change.',
    task: 'Return product, change (Q2 − Q1) and share_of_change_pct (change ÷ total change × 100, rounded to 1), sorted by change descending.',
    setup: `rev = pd.DataFrame({
    "product": ["A", "B", "C", "A", "B", "C"],
    "quarter": ["Q1", "Q1", "Q1", "Q2", "Q2", "Q2"],
    "revenue": [100, 200, 50, 150, 180, 120],
})`,
    signature: 'def solve(rev: pd.DataFrame) -> pd.DataFrame:', call: 'solve(rev)',
    expected: { columns: ['product', 'change', 'share_of_change_pct'], rows: [['C', 70, 70.0], ['A', 50, 50.0], ['B', -20, -20.0]], dtypes: { share_of_change_pct: 'float' } },
    hints: ['Pivot quarters into columns, then subtract.', 'Shares can be negative and can exceed 100% when other products decline.'],
    approaches: [
      { name: 'pivot + column maths', code: `def solve(rev):
    wide = rev.pivot(index="product", columns="quarter", values="revenue")
    change = wide["Q2"] - wide["Q1"]
    out = pd.DataFrame({"change": change, "share_of_change_pct": (change / change.sum() * 100).round(1)})
    return out.reset_index().sort_values("change", ascending=False)`, explanation: 'A bridge (waterfall) analysis: the changes per product add up to the total change, so shares add up to 100%.', complexity: 'O(n).', whenToUse: 'Variance analysis and revenue bridges.' },
      { name: 'Signed sum with groupby', code: `def solve(rev):
    sign = rev["quarter"].map({"Q1": -1, "Q2": 1})
    change = (rev["revenue"] * sign).groupby(rev["product"]).sum()
    out = change.rename("change").reset_index()
    out["share_of_change_pct"] = (out["change"] / out["change"].sum() * 100).round(1)
    return out.sort_values("change", ascending=False)`, explanation: 'Gives Q1 a −1 weight and Q2 a +1 weight, so one groupby sum produces the difference without reshaping.', complexity: 'O(n).', whenToUse: 'Long data where pivoting would be large.' },
    ],
    mistakes: 'A product missing in one quarter gives NaN after the pivot. Fill with 0 if missing means "no revenue". When the total change is close to 0, shares explode, so report absolute changes too.',
  },
  {
    id: 124, title: 'Time-Aware Interpolation', difficulty: 'Advanced', tags: ['resample', 'missing values'],
    story: 'A sensor logs at irregular times. Missing values should be estimated by elapsed time, not by row position.',
    task: 'Return ts and value with gaps filled by time-weighted interpolation.',
    setup: `readings = pd.DataFrame({
    "ts": ["2024-01-01 00:00", "2024-01-01 01:00", "2024-01-01 02:00", "2024-01-01 04:00"],
    "value": [10.0, np.nan, np.nan, 40.0],
})`,
    signature: 'def solve(readings: pd.DataFrame) -> pd.DataFrame:', call: 'solve(readings)',
    expected: { columns: ['ts', 'value'], rows: [['2024-01-01 00:00', 10.0], ['2024-01-01 01:00', 17.5], ['2024-01-01 02:00', 25.0], ['2024-01-01 04:00', 40.0]], dtypes: { value: 'float' } },
    hints: ['interpolate(method="time") needs a DatetimeIndex.', 'Between 00:00 (10) and 04:00 (40), the value rises 7.5 per hour.'],
    approaches: [
      { name: 'interpolate(method="time")', code: `def solve(readings):
    s = readings.set_index(pd.to_datetime(readings["ts"]))["value"]
    filled = s.interpolate(method="time")
    return readings.assign(value=filled.to_numpy())`, explanation: 'Weights by the actual time between known points. Linear by position would give 20 and 30 instead of 17.5 and 25.', complexity: 'O(n).', whenToUse: 'Irregular sensor, price or GPS data.' },
      { name: 'np.interp on timestamps', code: `def solve(readings):
    t = pd.to_datetime(readings["ts"]).astype("int64").to_numpy()
    v = readings["value"].to_numpy()
    known = ~np.isnan(v)
    return readings.assign(value=np.interp(t, t[known], v[known]))`, explanation: 'Timestamps as integers (nanoseconds) are a numeric x-axis, so np.interp gives time-weighted results.', complexity: 'O(n log n).', whenToUse: 'When you interpolate onto a different set of times.' },
    ],
    mistakes: 'Default interpolate() is positional and ignores the 2-hour gap. Assigning a Series with a DatetimeIndex back to a RangeIndex table gives NaN, so use .to_numpy().',
  },
  {
    id: 125, title: 'Case Study: New vs Returning Customers', difficulty: 'Advanced', tags: ['case study', 'cohort retention'],
    story: 'Your final case: the growth team wants to see, for each month, how many customers were new (first order ever that month) and how many came back.',
    task: 'Return month, new_customers and returning_customers, in month order. Count each customer once per month.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C2", "C1", "C1", "C3", "C2", "C3", "C4"],
    "date": ["2024-01-04", "2024-01-15", "2024-01-20", "2024-02-02", "2024-02-18", "2024-03-01", "2024-03-07", "2024-03-21"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['month', 'new_customers', 'returning_customers'], rows: [['2024-01', 2, 0], ['2024-02', 1, 1], ['2024-03', 1, 2]] },
    hints: ['Reduce to unique (customer, month) pairs first.', 'Each customer\'s first month is the min month per customer (transform("min")). New = month equals first month.'],
    approaches: [
      { name: 'First month via transform', code: `def solve(orders):
    d = orders.assign(month=pd.to_datetime(orders["date"]).dt.strftime("%Y-%m"))[["customer", "month"]].drop_duplicates()
    d["is_new"] = d["month"] == d.groupby("customer")["month"].transform("min")
    out = d.groupby("month").agg(new_customers=("is_new", "sum"), returning_customers=("is_new", lambda s: (~s).sum()))
    return out.reset_index()`, explanation: 'After deduplicating, each row is one active customer in one month. Comparing with the first month splits them into new and returning.', complexity: 'O(n log n).', whenToUse: 'Growth accounting: new, returning, and (with more steps) resurrected and churned.' },
      { name: 'crosstab on a label', code: `def solve(orders):
    d = orders.assign(month=pd.to_datetime(orders["date"]).dt.strftime("%Y-%m"))[["customer", "month"]].drop_duplicates()
    first = d.groupby("customer")["month"].min()
    d["type"] = np.where(d["month"] == d["customer"].map(first), "new_customers", "returning_customers")
    t = pd.crosstab(d["month"], d["type"]).reindex(columns=["new_customers", "returning_customers"], fill_value=0)
    return t.reset_index().rename_axis(columns=None)`, explanation: 'Labels each active customer-month, then counts labels per month. reindex guarantees both columns exist, even in a month with no returning customers.', complexity: 'O(n log n).', whenToUse: 'When you add more customer types later.' },
    ],
    mistakes: 'Without drop_duplicates, C1\'s two January orders count as two customers. "First order in the data" is only "first order ever" if the data starts at the beginning of the business.',
  },
);
window.dispatchEvent(new Event('dojo:problems'));
