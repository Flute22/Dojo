// Pandas Dojo — Problems 76–100 (Hard)
window.DOJO_PROBLEMS = window.DOJO_PROBLEMS || [];
window.DOJO_PROBLEMS.push(
  {
    id: 76, title: 'Salary Rank within Department', difficulty: 'Hard', tags: ['window functions'],
    story: 'HR wants each employee\'s pay rank inside their own department. Equal salaries share a rank, and the next rank is not skipped (dense ranking).',
    task: 'Return name, dept and salary_rank (1 = highest, dense ranking within dept), in the original row order.',
    setup: `staff = pd.DataFrame({
    "name": ["Ana", "Ben", "Cy", "Dan", "Eve", "Fay", "Gus"],
    "dept": ["IT", "IT", "IT", "IT", "HR", "HR", "HR"],
    "salary": [90, 80, 90, 70, 60, 65, 60],
})`,
    signature: 'def solve(staff: pd.DataFrame) -> pd.DataFrame:', call: 'solve(staff)',
    expected: { columns: ['name', 'dept', 'salary_rank'], rows: [['Ana', 'IT', 1], ['Ben', 'IT', 2], ['Cy', 'IT', 1], ['Dan', 'IT', 3], ['Eve', 'HR', 2], ['Fay', 'HR', 1], ['Gus', 'HR', 2]] },
    hints: ['groupby("dept")["salary"].rank(...) ranks inside each group and keeps the original shape.', 'Use method="dense" and ascending=False.'],
    approaches: [
      { name: 'groupby().rank(method="dense")', code: `def solve(staff):
    rank = staff.groupby("dept")["salary"].rank(method="dense", ascending=False)
    return staff[["name", "dept"]].assign(salary_rank=rank.astype(int))`, explanation: 'This is the pandas version of SQL DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC). rank returns floats, so cast to int for a clean result.', complexity: 'O(n log n).', whenToUse: 'Leaderboards, pay bands, "second highest" questions.' },
      { name: 'Map each value to its position', code: `def solve(staff):
    def dense(s):
        order = {v: i + 1 for i, v in enumerate(sorted(s.unique(), reverse=True))}
        return s.map(order)
    rank = staff.groupby("dept")["salary"].transform(dense)
    return staff[["name", "dept"]].assign(salary_rank=rank)`, explanation: 'Shows what dense ranking means: sort the distinct values and number them. transform puts the result back in the original row order.', complexity: 'O(n log n), with Python work per group.', whenToUse: 'Custom ranking rules that rank() does not offer.' },
    ],
    mistakes: 'method="min" gives 1, 1, 3 (it skips 2). method="first" breaks ties by row order. Pick the method that matches the business question.',
  },
  {
    id: 77, title: 'Top 2 Products per Category', difficulty: 'Hard', tags: ['top-N per group'],
    story: 'Each category page shows its two best-selling products. If two products have the same revenue, the one that comes first alphabetically wins.',
    task: 'Return category, product and revenue for the top 2 products of each category, sorted by category, then revenue descending, then product.',
    setup: `sales = pd.DataFrame({
    "category": ["Kitchen", "Kitchen", "Kitchen", "Kitchen", "Office", "Office", "Office"],
    "product": ["pan", "pot", "mug", "cup", "pen", "pad", "ink"],
    "revenue": [300, 450, 300, 100, 50, 80, 80],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales)',
    expected: { columns: ['category', 'product', 'revenue'], rows: [['Kitchen', 'pot', 450], ['Kitchen', 'mug', 300], ['Office', 'ink', 80], ['Office', 'pad', 80]] },
    hints: ['Sort by category, revenue (descending) and product so the winners come first in each group.', 'groupby("category").head(2) then keeps two rows per group.'],
    approaches: [
      { name: 'Sort + groupby().head(2)', code: `def solve(sales):
    ordered = sales.sort_values(["category", "revenue", "product"], ascending=[True, False, True])
    return ordered.groupby("category").head(2)`, explanation: 'The sort encodes the full ranking rule, including the tie-break. head(2) keeps the first two rows of each group and preserves the sorted order.', complexity: 'O(n log n).', whenToUse: 'The most common top-N-per-group pattern.' },
      { name: 'rank(method="first") filter', code: `def solve(sales):
    ordered = sales.sort_values(["category", "revenue", "product"], ascending=[True, False, True])
    pos = ordered.groupby("category").cumcount() + 1
    return ordered[pos <= 2]`, explanation: 'cumcount numbers rows within each group (like ROW_NUMBER() in SQL). Keeping the number lets you also show "rank 1, rank 2" in the output.', complexity: 'O(n log n).', whenToUse: 'When the rank itself is part of the output.' },
    ],
    mistakes: 'groupby().nlargest(2) does not apply the alphabetical tie-break and returns a MultiIndex Series. Forgetting the product sort key makes the result depend on input order.',
  },
  {
    id: 78, title: 'Running Total per Customer', difficulty: 'Hard', tags: ['window functions'],
    story: 'A loyalty programme upgrades customers when their lifetime spend passes a threshold. You need each customer\'s running total after every order.',
    task: 'Return customer, order_date, amount and running_total (cumulative amount per customer by date), in the original order.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C2", "C1", "C2", "C1"],
    "order_date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-05", "2024-01-07"],
    "amount": [50, 20, 30, 40, 20],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['customer', 'order_date', 'amount', 'running_total'], rows: [['C1', '2024-01-01', 50, 50], ['C2', '2024-01-02', 20, 20], ['C1', '2024-01-03', 30, 80], ['C2', '2024-01-05', 40, 60], ['C1', '2024-01-07', 20, 100]] },
    hints: ['groupby("customer")["amount"].cumsum() keeps the original index.', 'Make sure rows are in date order inside each customer first.'],
    approaches: [
      { name: 'Sort, then groupby().cumsum()', code: `def solve(orders):
    ordered = orders.sort_values("order_date")
    running = ordered.groupby("customer")["amount"].cumsum()
    return orders.assign(running_total=running)`, explanation: 'cumsum on a groupby restarts for every customer. The result keeps the original index labels, so assign() aligns it back to the unsorted table.', complexity: 'O(n log n) for the sort.', whenToUse: 'Running balances, cumulative spend, inventory levels.' },
      { name: 'transform("cumsum")', code: `def solve(orders):
    ordered = orders.sort_values(["customer", "order_date"])
    ordered["running_total"] = ordered.groupby("customer")["amount"].transform("cumsum")
    return ordered.sort_index()`, explanation: 'Works on a sorted copy, then sort_index() restores the original row order. transform makes the shape-preserving intent explicit.', complexity: 'O(n log n).', whenToUse: 'When later steps also need the data sorted by customer.' },
    ],
    mistakes: 'Running cumsum before sorting by date gives totals in file order, not time order. A plain df["amount"].cumsum() mixes all customers together.',
  },
  {
    id: 79, title: 'Days Since Previous Order', difficulty: 'Hard', tags: ['window functions', 'datetime'],
    story: 'To find customers who are slowing down, you measure the gap between each order and the same customer\'s previous one.',
    task: 'Return customer, order_date and days_since_prev (NaN for a customer\'s first order), sorted by customer and order_date.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C1", "C2", "C1", "C2"],
    "order_date": ["2024-03-01", "2024-03-05", "2024-03-02", "2024-03-15", "2024-03-12"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['customer', 'order_date', 'days_since_prev'], rows: [['C1', '2024-03-01', null], ['C1', '2024-03-05', 4.0], ['C1', '2024-03-15', 10.0], ['C2', '2024-03-02', null], ['C2', '2024-03-12', 10.0]], dtypes: { days_since_prev: 'float' } },
    hints: ['Sort by customer and date, then groupby("customer") and diff().', 'diff() on datetimes gives a timedelta. .dt.days turns it into a number.'],
    approaches: [
      { name: 'groupby().diff()', code: `def solve(orders):
    out = orders.sort_values(["customer", "order_date"]).copy()
    day = pd.to_datetime(out["order_date"])
    out["days_since_prev"] = day.groupby(out["customer"]).diff().dt.days
    return out`, explanation: 'diff() subtracts the previous row inside each group. The first row of each customer has nothing before it, so it gets NaT and then NaN.', complexity: 'O(n log n).', whenToUse: 'Gaps between events: purchases, logins, support tickets.' },
      { name: 'shift() and subtract', code: `def solve(orders):
    out = orders.sort_values(["customer", "order_date"]).copy()
    day = pd.to_datetime(out["order_date"])
    prev = day.groupby(out["customer"]).shift(1)
    out["days_since_prev"] = (day - prev).dt.days
    return out`, explanation: 'shift(1) is the pandas version of SQL LAG(). Keeping prev as its own variable lets you also show the previous date in the output.', complexity: 'O(n log n).', whenToUse: 'When you need the previous value itself, not just the difference.' },
    ],
    mistakes: 'A plain diff() without groupby compares C2\'s first order with C1\'s last order. Subtracting date strings raises TypeError, so convert with pd.to_datetime first.',
  },
  {
    id: 80, title: 'Month-over-Month Growth', difficulty: 'Hard', tags: ['window functions', 'growth'],
    story: 'The CEO wants to see how revenue grew compared with the previous month.',
    task: 'Return month, revenue and growth_pct (percent change from the previous month, rounded to 1 decimal, NaN for the first month).',
    setup: `monthly = pd.DataFrame({
    "month": ["2024-01", "2024-02", "2024-03", "2024-04"],
    "revenue": [200, 250, 225, 300],
})`,
    signature: 'def solve(monthly: pd.DataFrame) -> pd.DataFrame:', call: 'solve(monthly)',
    expected: { columns: ['month', 'revenue', 'growth_pct'], rows: [['2024-01', 200, null], ['2024-02', 250, 25.0], ['2024-03', 225, -10.0], ['2024-04', 300, 33.3]], dtypes: { growth_pct: 'float' } },
    hints: ['Series.pct_change() returns (current − previous) / previous.', 'Multiply by 100 and round(1).'],
    approaches: [
      { name: 'pct_change()', code: `def solve(monthly):
    return monthly.assign(growth_pct=(monthly["revenue"].pct_change() * 100).round(1))`, explanation: 'pct_change compares each row with the one before. The table must already be in time order.', complexity: 'O(n).', whenToUse: 'Growth rates over time: revenue, users, prices.' },
      { name: 'shift() formula', code: `def solve(monthly):
    prev = monthly["revenue"].shift(1)
    growth = (monthly["revenue"] - prev) / prev * 100
    return monthly.assign(growth_pct=growth.round(1))`, explanation: 'Spells out the formula, which makes it easy to switch to year-over-year growth with shift(12).', complexity: 'O(n).', whenToUse: 'When reviewers need to see the formula, or the comparison period changes.' },
    ],
    mistakes: 'Data with a missing month (Jan, Mar) makes pct_change compare non-adjacent months. Reindex to a full month range first. In pandas 2.x, pct_change() no longer forward-fills NaN silently.',
  },
  {
    id: 81, title: 'Biggest One-Day Drop', difficulty: 'Hard', tags: ['window functions'],
    story: 'A risk analyst asks: on which day did the stock fall the most compared with the day before, and by how much?',
    task: 'Return one row with date, close and change (close minus the previous close) for the day with the largest drop.',
    setup: `prices = pd.DataFrame({
    "date": ["2024-04-01", "2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05", "2024-04-08"],
    "close": [100.0, 102.5, 99.0, 101.0, 95.5, 97.0],
})`,
    signature: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:', call: 'solve(prices)',
    expected: { columns: ['date', 'close', 'change'], rows: [['2024-04-05', 95.5, -5.5]], dtypes: { close: 'float', change: 'float' } },
    hints: ['diff() gives the change from the previous row.', 'The biggest drop is the smallest (most negative) change: idxmin().'],
    approaches: [
      { name: 'diff() + idxmin()', code: `def solve(prices):
    out = prices.assign(change=prices["close"].diff())
    return out.loc[[out["change"].idxmin()]]`, explanation: 'idxmin skips NaN, so the first row (no previous day) is ignored. Double brackets [[...]] keep the result as a one-row DataFrame instead of a Series.', complexity: 'O(n).', whenToUse: 'Finding the worst or best single period.' },
      { name: 'nsmallest(1)', code: `def solve(prices):
    out = prices.assign(change=prices["close"].diff())
    return out.nsmallest(1, "change")`, explanation: 'nsmallest returns the rows with the smallest values as a DataFrame. Change 1 to 3 for the three worst days.', complexity: 'O(n log k).', whenToUse: 'Top or bottom N periods.' },
    ],
    mistakes: 'out.loc[idx] with a single label returns a Series, so your result looks like a column instead of a row. idxmax() would give the biggest rise, not the biggest drop.',
  },
  {
    id: 82, title: '3-Day Moving Average', difficulty: 'Hard', tags: ['rolling/expanding'],
    story: 'Daily sales are noisy. The dashboard should show a 3-day moving average next to each day.',
    task: 'Return date, sales and avg_3d (mean of the day and the two days before, NaN until three days are available).',
    setup: `daily = pd.DataFrame({
    "date": ["2024-06-01", "2024-06-02", "2024-06-03", "2024-06-04", "2024-06-05", "2024-06-06", "2024-06-07"],
    "sales": [12, 18, 15, 21, 30, 24, 27],
})`,
    signature: 'def solve(daily: pd.DataFrame) -> pd.DataFrame:', call: 'solve(daily)',
    expected: { columns: ['date', 'sales', 'avg_3d'], rows: [['2024-06-01', 12, null], ['2024-06-02', 18, null], ['2024-06-03', 15, 15.0], ['2024-06-04', 21, 18.0], ['2024-06-05', 30, 22.0], ['2024-06-06', 24, 25.0], ['2024-06-07', 27, 27.0]], dtypes: { avg_3d: 'float' } },
    hints: ['rolling(3) creates a window of the current row and the two before it.', 'By default the window needs all 3 values. min_periods would change that.'],
    approaches: [
      { name: 'rolling(3).mean()', code: `def solve(daily):
    return daily.assign(avg_3d=daily["sales"].rolling(3).mean())`, explanation: 'A trailing window: each value uses only the past, so there is no look-ahead. Add center=True for a centred window.', complexity: 'O(n).', whenToUse: 'Smoothing trends in daily metrics.' },
      { name: 'shift() arithmetic', code: `def solve(daily):
    s = daily["sales"]
    return daily.assign(avg_3d=(s + s.shift(1) + s.shift(2)) / 3)`, explanation: 'Shows what a rolling mean computes. NaN in any shifted value makes the sum NaN, which matches rolling\'s default behaviour.', complexity: 'O(n × window).', whenToUse: 'Tiny windows with custom weights, such as 0.5 × today + 0.3 × yesterday + 0.2 × the day before.' },
    ],
    mistakes: 'rolling(3, min_periods=1) gives values for the first two days, which can look misleadingly stable. With a DatetimeIndex, rolling("3D") uses calendar days and handles missing dates correctly.',
  },
  {
    id: 83, title: 'All-Time High and Drawdown', difficulty: 'Hard', tags: ['rolling/expanding'],
    story: 'Investors track how far a price is below its highest point so far (the drawdown).',
    task: 'Return date, close, peak (highest close so far) and drawdown_pct = (close / peak − 1) × 100, rounded to 1 decimal.',
    setup: `prices = pd.DataFrame({
    "date": ["2024-08-01", "2024-08-02", "2024-08-05", "2024-08-06", "2024-08-07", "2024-08-08"],
    "close": [50.0, 55.0, 53.0, 60.0, 54.0, 57.0],
})`,
    signature: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:', call: 'solve(prices)',
    expected: { columns: ['date', 'close', 'peak', 'drawdown_pct'], rows: [['2024-08-01', 50.0, 50.0, 0.0], ['2024-08-02', 55.0, 55.0, 0.0], ['2024-08-05', 53.0, 55.0, -3.6], ['2024-08-06', 60.0, 60.0, 0.0], ['2024-08-07', 54.0, 60.0, -10.0], ['2024-08-08', 57.0, 60.0, -5.0]], dtypes: { close: 'float', peak: 'float', drawdown_pct: 'float' } },
    hints: ['cummax() gives the running maximum.', 'Then compute (close / peak - 1) * 100.'],
    approaches: [
      { name: 'cummax()', code: `def solve(prices):
    peak = prices["close"].cummax()
    return prices.assign(peak=peak, drawdown_pct=((prices["close"] / peak - 1) * 100).round(1))`, explanation: 'cummax is a running maximum. It is the simplest expanding-window function.', complexity: 'O(n).', whenToUse: 'Records to date, peak traffic, drawdowns.' },
      { name: 'expanding().max()', code: `def solve(prices):
    peak = prices["close"].expanding().max()
    dd = (prices["close"] / peak - 1) * 100
    return prices.assign(peak=peak, drawdown_pct=dd.round(1))`, explanation: 'expanding() grows the window from the first row up to the current one. The same object gives mean(), std() and quantile() to date.', complexity: 'O(n) for max.', whenToUse: 'Other expanding statistics, such as average order value to date.' },
    ],
    mistakes: 'Using max() instead of cummax() compares every day with the future peak. -3.636… rounds to -3.6, so round only at the end to avoid stacking rounding errors.',
  },
  {
    id: 84, title: 'Weekly Order Totals', difficulty: 'Hard', tags: ['resample', 'datetime'],
    story: 'Operations plans staffing per week (Monday to Sunday). Daily order counts must be rolled up to weeks ending on Sunday.',
    task: 'Return week_ending (the Sunday, as a datetime) and orders (sum), one row per week.',
    setup: `daily = pd.DataFrame({
    "date": ["2024-01-01", "2024-01-03", "2024-01-07", "2024-01-08", "2024-01-12", "2024-01-16"],
    "orders": [10, 20, 5, 15, 25, 30],
})`,
    signature: 'def solve(daily: pd.DataFrame) -> pd.DataFrame:', call: 'solve(daily)',
    expected: { columns: ['week_ending', 'orders'], rows: [['2024-01-07', 35], ['2024-01-14', 40], ['2024-01-21', 30]], dtypes: { week_ending: 'datetime' } },
    hints: ['resample() needs a DatetimeIndex: set_index(pd.to_datetime(...)).', '"W-SUN" means weeks that end on Sunday, and the label is the Sunday.'],
    approaches: [
      { name: 'set_index + resample("W-SUN")', code: `def solve(daily):
    s = daily.set_index(pd.to_datetime(daily["date"]))["orders"]
    weekly = s.resample("W-SUN").sum()
    return weekly.rename_axis("week_ending").reset_index()`, explanation: 'resample groups by time buckets. 2024-01-07 is a Sunday, so it closes the first week.', complexity: 'O(n).', whenToUse: 'Time-series roll-ups: daily to weekly, hourly to daily.' },
      { name: 'groupby with pd.Grouper', code: `def solve(daily):
    d = daily.assign(week_ending=pd.to_datetime(daily["date"]))
    return d.groupby(pd.Grouper(key="week_ending", freq="W-SUN"))["orders"].sum().reset_index()`, explanation: 'pd.Grouper lets you resample on a column without changing the index, and you can combine it with other keys, such as store.', complexity: 'O(n).', whenToUse: 'Weekly totals per store or per product.' },
    ],
    mistakes: 'resample on a string column raises TypeError, so convert to datetime. "W" means W-SUN, but weeks ending on Monday need "W-MON". Check what your business calls a week.',
  },
  {
    id: 85, title: 'Fill Missing Days with Zero', difficulty: 'Hard', tags: ['resample', 'datetime'],
    story: 'A signup chart skips days with no signups, which makes the line look smoother than reality. Every calendar day should appear, with 0 on quiet days.',
    task: 'Return date (datetime) and signups for every day from the first to the last date, using 0 for days without data.',
    setup: `signups = pd.DataFrame({
    "date": ["2024-02-01", "2024-02-02", "2024-02-05"],
    "signups": [3, 5, 2],
})`,
    signature: 'def solve(signups: pd.DataFrame) -> pd.DataFrame:', call: 'solve(signups)',
    expected: { columns: ['date', 'signups'], rows: [['2024-02-01', 3], ['2024-02-02', 5], ['2024-02-03', 0], ['2024-02-04', 0], ['2024-02-05', 2]], dtypes: { date: 'datetime' } },
    hints: ['resample("D").sum() creates a row for each day, and sums of empty days are 0.', 'Or build the full range with pd.date_range and reindex(fill_value=0).'],
    approaches: [
      { name: 'resample("D").sum()', code: `def solve(signups):
    s = signups.set_index(pd.to_datetime(signups["date"]))["signups"]
    return s.resample("D").sum().rename_axis("date").reset_index()`, explanation: 'Daily resampling creates every day between the first and last timestamp. sum() of an empty bucket is 0.', complexity: 'O(days).', whenToUse: 'Event counts per day, hour or minute.' },
      { name: 'reindex to a date_range', code: `def solve(signups):
    s = signups.set_index(pd.to_datetime(signups["date"]))["signups"]
    full = pd.date_range(s.index.min(), s.index.max(), freq="D")
    return s.reindex(full, fill_value=0).rename_axis("date").reset_index()`, explanation: 'Builds the expected calendar explicitly. You could also extend it to the whole month, even past the last data point.', complexity: 'O(days).', whenToUse: 'When the date range is fixed by the report, not by the data.' },
    ],
    mistakes: 'resample("D").mean() gives NaN for empty days, not 0. With duplicate dates, reindex raises, so aggregate first.',
  },
  {
    id: 86, title: 'Wide Quarterly Sales to Long', difficulty: 'Hard', tags: ['reshaping'],
    story: 'A planning sheet has one column per quarter. Your charting tool needs one row per store per quarter, and empty cells should be left out.',
    task: 'Return store, quarter and sales in long format, without missing sales, sorted by store and quarter.',
    setup: `wide = pd.DataFrame({
    "store": ["A", "B"],
    "Q1": [10, 7],
    "Q2": [12, np.nan],
    "Q3": [9, 11],
})`,
    signature: 'def solve(wide: pd.DataFrame) -> pd.DataFrame:', call: 'solve(wide)',
    expected: { columns: ['store', 'quarter', 'sales'], rows: [['A', 'Q1', 10.0], ['A', 'Q2', 12.0], ['A', 'Q3', 9.0], ['B', 'Q1', 7.0], ['B', 'Q3', 11.0]], dtypes: { sales: 'float' } },
    hints: ['melt(id_vars="store", var_name="quarter", value_name="sales").', 'dropna() and sort_values afterwards.'],
    approaches: [
      { name: 'melt', code: `def solve(wide):
    long = wide.melt(id_vars="store", var_name="quarter", value_name="sales")
    return long.dropna(subset=["sales"]).sort_values(["store", "quarter"])`, explanation: 'melt turns columns into rows. id_vars stay fixed, every other column becomes a (quarter, sales) pair.', complexity: 'O(rows × columns).', whenToUse: 'Turning spreadsheet layouts into tidy data.' },
      { name: 'set_index + stack', code: `def solve(wide):
    long = wide.set_index("store").stack(future_stack=True).dropna()
    return long.rename_axis(["store", "quarter"]).reset_index(name="sales")`, explanation: 'stack moves the column labels into the innermost index level. future_stack=True uses the new pandas behaviour, which keeps NaN until you drop it explicitly.', complexity: 'O(rows × columns).', whenToUse: 'When the identifier is already the index.' },
    ],
    mistakes: 'melt without id_vars also melts the store column. In pandas 2.1+, stack() without future_stack=True gives a FutureWarning.',
  },
  {
    id: 87, title: 'Long Survey Results to Wide', difficulty: 'Hard', tags: ['reshaping'],
    story: 'Survey results arrive as one row per store and quarter. The regional manager wants one row per store with a column per quarter.',
    task: 'Return store, Q1 and Q2, with NaN where a store has no result.',
    setup: `long = pd.DataFrame({
    "store": ["A", "A", "B", "B", "C"],
    "quarter": ["Q1", "Q2", "Q1", "Q2", "Q2"],
    "score": [10, 12, 7, 9, 4],
})`,
    signature: 'def solve(long: pd.DataFrame) -> pd.DataFrame:', call: 'solve(long)',
    expected: { columns: ['store', 'Q1', 'Q2'], rows: [['A', 10.0, 12.0], ['B', 7.0, 9.0], ['C', null, 4.0]], dtypes: { Q1: 'float', Q2: 'float' } },
    hints: ['pivot(index="store", columns="quarter", values="score") reshapes without aggregating.', 'reset_index() and rename_axis(columns=None) tidy up the labels.'],
    approaches: [
      { name: 'pivot', code: `def solve(long):
    wide = long.pivot(index="store", columns="quarter", values="score")
    return wide.reset_index().rename_axis(columns=None)`, explanation: 'pivot reshapes one value per (store, quarter) pair. It raises if a pair appears twice, which is a useful check on the data.', complexity: 'O(n).', whenToUse: 'Reshaping data that is already unique per pair.' },
      { name: 'set_index + unstack', code: `def solve(long):
    wide = long.set_index(["store", "quarter"])["score"].unstack()
    return wide.reset_index().rename_axis(columns=None)`, explanation: 'unstack moves the inner index level into columns. It is the reverse of stack.', complexity: 'O(n).', whenToUse: 'When the data already has a MultiIndex from a groupby.' },
    ],
    mistakes: 'Using pivot_table here also works, but it silently averages duplicate pairs, hiding a data problem. NaN turns the integer columns into float.',
  },
  {
    id: 88, title: 'Year-over-Year with a MultiIndex', difficulty: 'Hard', tags: ['MultiIndex'],
    story: 'A finance table is indexed by (region, year). You need the change from 2023 to 2024 for regions that have both years.',
    task: 'Return region and growth (2024 revenue − 2023 revenue) for regions with both years, sorted by region.',
    setup: `rev = pd.DataFrame({
    "region": ["North", "North", "South", "South", "East"],
    "year": [2023, 2024, 2023, 2024, 2024],
    "revenue": [100, 130, 80, 70, 50],
}).set_index(["region", "year"])`,
    signature: 'def solve(rev: pd.DataFrame) -> pd.DataFrame:', call: 'solve(rev)',
    expected: { columns: ['region', 'growth'], rows: [['North', 30], ['South', -10]] },
    hints: ['rev.xs(2024, level="year") selects one year and drops that level.', 'Or unstack("year") to get one column per year.'],
    approaches: [
      { name: 'xs() per year', code: `def solve(rev):
    r = rev["revenue"]
    growth = (r.xs(2024, level="year") - r.xs(2023, level="year")).dropna()
    return growth.rename("growth").reset_index().sort_values("region")`, explanation: 'xs takes a cross-section at one level value. The two Series align on region, and East (no 2023) becomes NaN and is dropped.', complexity: 'O(n).', whenToUse: 'Comparing two slices of a MultiIndex.' },
      { name: 'unstack("year")', code: `def solve(rev):
    by_year = rev["revenue"].unstack("year")
    growth = (by_year[2024] - by_year[2023]).dropna()
    return growth.rename("growth").reset_index().sort_values("region")`, explanation: 'Moves years into columns, so the maths becomes column arithmetic, which many people find easier to read.', complexity: 'O(n).', whenToUse: 'When you compare several years or add more columns.' },
    ],
    mistakes: 'rev.loc[2024] looks in the first level (region) and raises KeyError. Use xs(..., level=) or loc[(slice(None), 2024), :].',
  },
  {
    id: 89, title: 'Share of Customer Spend', difficulty: 'Hard', tags: ['transform'],
    story: 'For a basket analysis, you want to know what share each order contributes to the customer\'s total spend.',
    task: 'Return order_id, customer and share_pct (order amount ÷ customer total × 100, rounded to 1 decimal).',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5],
    "customer": ["C1", "C1", "C2", "C2", "C2"],
    "amount": [30, 70, 50, 25, 25],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'customer', 'share_pct'], rows: [[1, 'C1', 30.0], [2, 'C1', 70.0], [3, 'C2', 50.0], [4, 'C2', 25.0], [5, 'C2', 25.0]], dtypes: { share_pct: 'float' } },
    hints: ['transform("sum") returns the group total on every row.', 'Divide amount by it.'],
    approaches: [
      { name: 'transform("sum")', code: `def solve(orders):
    total = orders.groupby("customer")["amount"].transform("sum")
    return orders[["order_id", "customer"]].assign(share_pct=(orders["amount"] / total * 100).round(1))`, explanation: 'agg reduces each group to one row, while transform broadcasts the group result back to every row. That is exactly what a share needs.', complexity: 'O(n).', whenToUse: 'Percent of total, difference from group mean, z-scores per group.' },
      { name: 'agg, then merge back', code: `def solve(orders):
    totals = orders.groupby("customer", as_index=False)["amount"].sum().rename(columns={"amount": "total"})
    m = orders.merge(totals, on="customer")
    return m[["order_id", "customer"]].assign(share_pct=(m["amount"] / m["total"] * 100).round(1))`, explanation: 'The SQL-style way: aggregate, then join the totals back. More steps, but the totals table is useful on its own.', complexity: 'O(n).', whenToUse: 'When the totals are also reported separately.' },
    ],
    mistakes: 'Dividing by groupby().sum() directly misaligns, because that result is indexed by customer, not by order. transform avoids the mismatch.',
  },
  {
    id: 90, title: 'Above Their Department Average', difficulty: 'Hard', tags: ['transform'], ignoreOrder: true,
    story: 'A compensation review flags employees who earn more than their own department\'s average.',
    task: 'Return name, dept and salary for employees whose salary is strictly above their department mean.',
    setup: `staff = pd.DataFrame({
    "name": ["Ana", "Ben", "Cy", "Dee", "Eli", "Fox"],
    "dept": ["IT", "IT", "IT", "HR", "HR", "Sales"],
    "salary": [70, 90, 80, 50, 60, 40],
})`,
    signature: 'def solve(staff: pd.DataFrame) -> pd.DataFrame:', call: 'solve(staff)',
    expected: { columns: ['name', 'dept', 'salary'], rows: [['Ben', 'IT', 90], ['Eli', 'HR', 60]] },
    hints: ['groupby("dept")["salary"].transform("mean") gives each row its department average.', 'Compare and filter.'],
    approaches: [
      { name: 'transform + mask', code: `def solve(staff):
    dept_avg = staff.groupby("dept")["salary"].transform("mean")
    return staff[staff["salary"] > dept_avg]`, explanation: 'Each row is compared with its own group mean in a single vectorised step. Fox is alone in Sales, so he equals the average and is not above it.', complexity: 'O(n).', whenToUse: 'Outliers within groups, above-target performers.' },
      { name: 'groupby.filter per group', code: `def solve(staff):
    return staff.groupby("dept", group_keys=False).apply(lambda g: g[g["salary"] > g["salary"].mean()])`, explanation: 'apply runs a small function per department. It is flexible, but slower, and the row order follows the groups.', complexity: 'O(n), with Python overhead per group.', whenToUse: 'Group logic too complex for transform.' },
    ],
    mistakes: 'Comparing with the company-wide mean flags most of IT and nobody in HR. groupby().apply() changes the row order to group order, which matters when order is checked.',
  },
  {
    id: 91, title: 'Count Articles per Tag', difficulty: 'Hard', tags: ['explode', 'string methods'],
    story: 'A blog stores tags as comma-separated text. The editor wants to know how many articles use each tag.',
    task: 'Return tag and articles, sorted by articles descending and then tag ascending. Trim spaces and ignore articles without tags.',
    setup: `posts = pd.DataFrame({
    "article": ["A1", "A2", "A3", "A4"],
    "tags": ["python,pandas", "sql", "pandas,  viz", None],
})`,
    signature: 'def solve(posts: pd.DataFrame) -> pd.DataFrame:', call: 'solve(posts)',
    expected: { columns: ['tag', 'articles'], rows: [['pandas', 2], ['python', 1], ['sql', 1], ['viz', 1]] },
    hints: ['str.split(",") makes a list per row, and explode() gives each list item its own row.', 'Strip spaces before counting.'],
    approaches: [
      { name: 'split + explode', code: `def solve(posts):
    tag = posts["tags"].str.split(",").explode().str.strip().dropna().rename("tag")
    counts = tag.value_counts().reset_index(name="articles")
    return counts.sort_values(["articles", "tag"], ascending=[False, True])`, explanation: 'explode repeats the row index for every list item, so you can still join back to the article if needed.', complexity: 'O(total tags).', whenToUse: 'Multi-value fields: tags, skills, product options.' },
      { name: 'str.get_dummies', code: `def solve(posts):
    flags = posts["tags"].str.replace(" ", "").str.get_dummies(sep=",")
    counts = flags.sum().rename_axis("tag").reset_index(name="articles")
    return counts.sort_values(["articles", "tag"], ascending=[False, True])`, explanation: 'get_dummies builds one 0/1 column per tag, so the sum per column is the article count. That table is also ready for machine-learning features.', complexity: 'O(rows × distinct tags).', whenToUse: 'One-hot encoding multi-value fields.' },
    ],
    mistakes: 'Without strip(), "  viz" and "viz" are different tags. Counting with str.contains("pandas") would also match a tag like "geopandas".',
  },
  {
    id: 92, title: 'Longest Login Streak', difficulty: 'Hard', tags: ['streaks', 'datetime'],
    story: 'A learning app rewards streaks: logging in on consecutive days. Some users logged in twice on the same day.',
    task: 'Return user and longest_streak (the most consecutive days logged in), sorted by user.',
    setup: `logins = pd.DataFrame({
    "user": ["u1", "u1", "u1", "u1", "u1", "u1", "u2", "u2", "u2", "u2", "u2", "u3"],
    "login_date": ["2024-01-01", "2024-01-02", "2024-01-02", "2024-01-03", "2024-01-05", "2024-01-06",
                   "2024-01-02", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07", "2024-01-10"],
})`,
    signature: 'def solve(logins: pd.DataFrame) -> pd.DataFrame:', call: 'solve(logins)',
    expected: { columns: ['user', 'longest_streak'], rows: [['u1', 3], ['u2', 4], ['u3', 1]] },
    hints: ['Remove duplicate days first. Inside one streak, date minus row number is constant.', 'Alternative: a new streak starts wherever the gap to the previous day is not 1 day. cumsum() of those starts labels each streak.'],
    approaches: [
      { name: 'Date minus row number', code: `def solve(logins):
    d = (logins.assign(day=pd.to_datetime(logins["login_date"]))
         .drop_duplicates(["user", "day"]).sort_values(["user", "day"]))
    d["grp"] = d["day"] - pd.to_timedelta(d.groupby("user").cumcount(), unit="D")
    streaks = d.groupby(["user", "grp"]).size()
    return streaks.groupby("user").max().reset_index(name="longest_streak")`, explanation: 'The classic gaps-and-islands trick: subtracting 0, 1, 2… days from consecutive dates gives the same anchor date, so each streak becomes a group.', complexity: 'O(n log n).', whenToUse: 'Consecutive days, months or numbers in SQL-style interview questions.' },
      { name: 'Gap flags + cumsum', code: `def solve(logins):
    d = (logins.assign(day=pd.to_datetime(logins["login_date"]))
         .drop_duplicates(["user", "day"]).sort_values(["user", "day"]))
    starts = d.groupby("user")["day"].diff().ne(pd.Timedelta(days=1))
    d["streak_id"] = starts.cumsum()
    streaks = d.groupby(["user", "streak_id"]).size()
    return streaks.groupby("user").max().reset_index(name="longest_streak")`, explanation: 'Marks the first day of every streak (gap ≠ 1 day, or a new user) and numbers streaks with a running count. Easy to extend to "gap of up to 2 days".', complexity: 'O(n log n).', whenToUse: 'Sessionization and any rule-based grouping of consecutive rows.' },
    ],
    mistakes: 'Not removing the duplicate 2024-01-02 login breaks the streak logic (the gap is 0 days). Forgetting to sort makes diff() compare random rows.',
  },
  {
    id: 93, title: 'Monthly Growth per Store', difficulty: 'Hard', tags: ['growth', 'window functions'],
    story: 'Store managers each want their own month-over-month growth. The data is not sorted.',
    task: 'Return store, month, revenue and growth_pct (per store, rounded to 1 decimal), sorted by store and month.',
    setup: `sales = pd.DataFrame({
    "store": ["A", "B", "A", "B", "A"],
    "month": ["2024-02", "2024-01", "2024-01", "2024-02", "2024-03"],
    "revenue": [120, 50, 100, 75, 90],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales)',
    expected: { columns: ['store', 'month', 'revenue', 'growth_pct'], rows: [['A', '2024-01', 100, null], ['A', '2024-02', 120, 20.0], ['A', '2024-03', 90, -25.0], ['B', '2024-01', 50, null], ['B', '2024-02', 75, 50.0]], dtypes: { growth_pct: 'float' } },
    hints: ['Sort by store and month first.', 'groupby("store")["revenue"].pct_change() restarts for each store.'],
    approaches: [
      { name: 'Sort + groupby().pct_change()', code: `def solve(sales):
    out = sales.sort_values(["store", "month"]).copy()
    out["growth_pct"] = (out.groupby("store")["revenue"].pct_change() * 100).round(1)
    return out`, explanation: 'Grouping keeps the first month of store B from being compared with store A\'s last month.', complexity: 'O(n log n).', whenToUse: 'Growth per segment: store, product, country.' },
      { name: 'groupby().shift()', code: `def solve(sales):
    out = sales.sort_values(["store", "month"]).copy()
    prev = out.groupby("store")["revenue"].shift(1)
    out["growth_pct"] = ((out["revenue"] / prev - 1) * 100).round(1)
    return out`, explanation: 'The LAG-style formula. Swap shift(1) for shift(12) on monthly data to get year-over-year growth.', complexity: 'O(n log n).', whenToUse: 'When the comparison period is configurable.' },
    ],
    mistakes: 'pct_change without groupby gives B\'s January a growth figure against A\'s March. Not sorting first compares months out of order.',
  },
  {
    id: 94, title: 'Top 3 Scores with Ties', difficulty: 'Hard', tags: ['top-N per group', 'window functions'],
    story: 'The school prints a "top 3" honour list. Students who tie should all be included, and absent students (no score) never appear.',
    task: 'Return student, score and rank (method "min", 1 = best) for students with rank ≤ 3, sorted by rank and then student.',
    setup: `scores = pd.DataFrame({
    "student": ["Ana", "Ben", "Cy", "Dee", "Eli", "Fay", "Gus"],
    "score": [95, 88, 95, 80, 88, np.nan, 70],
})`,
    signature: 'def solve(scores: pd.DataFrame) -> pd.DataFrame:', call: 'solve(scores)',
    expected: { columns: ['student', 'score', 'rank'], rows: [['Ana', 95.0, 1], ['Cy', 95.0, 1], ['Ben', 88.0, 3], ['Eli', 88.0, 3]], dtypes: { score: 'float' } },
    hints: ['rank(method="min", ascending=False) gives tied students the same rank and skips the next one.', 'NaN scores get NaN rank, so they drop out of any comparison.'],
    approaches: [
      { name: 'rank(method="min")', code: `def solve(scores):
    out = scores.assign(rank=scores["score"].rank(method="min", ascending=False))
    out = out[out["rank"] <= 3]
    return out.sort_values(["rank", "student"])`, explanation: 'Like SQL RANK(): two students on 95 are both rank 1, and the next is rank 3. So "rank ≤ 3" includes all tied students.', complexity: 'O(n log n).', whenToUse: 'Leaderboards where ties must be treated fairly.' },
      { name: 'nlargest(keep="all")', code: `def solve(scores):
    top = scores.nlargest(3, "score", keep="all")
    top = top.assign(rank=top["score"].rank(method="min", ascending=False))
    return top.sort_values(["rank", "student"])`, explanation: 'keep="all" keeps every row tied with the last place. Then rank them for the output.', complexity: 'O(n log k).', whenToUse: 'Quick top-N lists that must not cut ties.' },
    ],
    mistakes: 'head(3) after sorting cuts Eli even though he ties with Ben. method="dense" would give 1, 1, 2, 2, 3 and include Dee too.',
  },
  {
    id: 95, title: 'Order Number per Customer', difficulty: 'Hard', tags: ['window functions'],
    story: 'To study repeat buying, every order needs a sequence number per customer (1st, 2nd, 3rd…) and a flag for the first order.',
    task: 'Return order_id, customer, order_number and is_first, in the original order. Orders are numbered by order_date.',
    setup: `orders = pd.DataFrame({
    "order_id": ["O1", "O2", "O3", "O4", "O5", "O6"],
    "customer": ["C1", "C2", "C1", "C1", "C3", "C2"],
    "order_date": ["2024-05-01", "2024-05-02", "2024-05-04", "2024-05-09", "2024-05-10", "2024-05-12"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'customer', 'order_number', 'is_first'], rows: [['O1', 'C1', 1, true], ['O2', 'C2', 1, true], ['O3', 'C1', 2, false], ['O4', 'C1', 3, false], ['O5', 'C3', 1, true], ['O6', 'C2', 2, false]] },
    hints: ['groupby("customer").cumcount() numbers rows 0, 1, 2… inside each group.', 'Sort by date first, add 1, and compare with 1 for the flag.'],
    approaches: [
      { name: 'cumcount()', code: `def solve(orders):
    n = orders.sort_values("order_date").groupby("customer").cumcount() + 1
    return orders[["order_id", "customer"]].assign(order_number=n, is_first=n == 1)`, explanation: 'cumcount is ROW_NUMBER() OVER (PARTITION BY customer ORDER BY date) minus one. The result keeps the original index, so it aligns back to the table.', complexity: 'O(n log n).', whenToUse: 'Sequence numbers, first and second purchase analysis.' },
      { name: 'rank(method="first") on dates', code: `def solve(orders):
    day = pd.to_datetime(orders["order_date"])
    n = day.groupby(orders["customer"]).rank(method="first").astype(int)
    return orders[["order_id", "customer"]].assign(order_number=n, is_first=n == 1)`, explanation: 'Ranking dates within each customer gives the same numbers without sorting. method="first" breaks ties by row order.', complexity: 'O(n log n).', whenToUse: 'When you cannot reorder the table.' },
    ],
    mistakes: 'cumcount() starts at 0, so add 1. Without sorting by date, order numbers follow file order, which may not be chronological.',
  },
  {
    id: 96, title: 'Average Score to Date', difficulty: 'Hard', tags: ['rolling/expanding'],
    story: 'A tutoring app shows each student their average test score so far, updated after every test.',
    task: 'Return student, test, score and avg_to_date (the mean of the student\'s scores up to and including this test, rounded to 1 decimal), in the original order.',
    setup: `tests = pd.DataFrame({
    "student": ["s1", "s2", "s1", "s2", "s1"],
    "test": [1, 1, 2, 2, 3],
    "score": [70, 60, 80, 90, 90],
})`,
    signature: 'def solve(tests: pd.DataFrame) -> pd.DataFrame:', call: 'solve(tests)',
    expected: { columns: ['student', 'test', 'score', 'avg_to_date'], rows: [['s1', 1, 70, 70.0], ['s2', 1, 60, 60.0], ['s1', 2, 80, 75.0], ['s2', 2, 90, 75.0], ['s1', 3, 90, 80.0]], dtypes: { avg_to_date: 'float' } },
    hints: ['groupby("student")["score"].expanding().mean() returns a MultiIndex (student, original row).', 'Drop the student level so it aligns back to the table, or use cumsum / count.'],
    approaches: [
      { name: 'groupby().expanding().mean()', code: `def solve(tests):
    avg = tests.groupby("student")["score"].expanding().mean()
    avg = avg.reset_index(level=0, drop=True)
    return tests.assign(avg_to_date=avg.round(1))`, explanation: 'expanding() per group grows the window from the student\'s first test. Dropping the group level leaves the original row labels, so assign() aligns correctly.', complexity: 'O(n).', whenToUse: 'Any "so far" metric per entity.' },
      { name: 'cumsum ÷ cumcount', code: `def solve(tests):
    g = tests.groupby("student")["score"]
    avg = g.cumsum() / (g.cumcount() + 1)
    return tests.assign(avg_to_date=avg.round(1))`, explanation: 'Running sum divided by running count. Fully vectorised and keeps the original index, so it is usually the fastest option.', complexity: 'O(n).', whenToUse: 'Large tables where speed matters.' },
    ],
    mistakes: 'Assigning the expanding() result without dropping the group level gives all NaN, because the MultiIndex does not match. The data must be in test order within each student.',
  },
  {
    id: 97, title: 'Daily OHLC from Trades', difficulty: 'Hard', tags: ['resample'],
    story: 'A trading desk wants a daily candlestick summary from individual trades: the first, highest, lowest and last price of each day.',
    task: 'Return date (datetime), open, high, low and close, one row per day.',
    setup: `trades = pd.DataFrame({
    "time": ["2024-09-02 09:00", "2024-09-02 11:00", "2024-09-02 15:00", "2024-09-02 16:00",
             "2024-09-03 09:30", "2024-09-03 13:00", "2024-09-03 16:00"],
    "price": [10.0, 12.0, 9.5, 11.0, 11.5, 13.0, 12.5],
})`,
    signature: 'def solve(trades: pd.DataFrame) -> pd.DataFrame:', call: 'solve(trades)',
    expected: { columns: ['date', 'open', 'high', 'low', 'close'], rows: [['2024-09-02', 10.0, 12.0, 9.5, 11.0], ['2024-09-03', 11.5, 13.0, 11.5, 12.5]], dtypes: { date: 'datetime' } },
    hints: ['resample("D") on a DatetimeIndex, then .ohlc().', 'Or group by the date part and agg first, max, min, last.'],
    approaches: [
      { name: 'resample("D").ohlc()', code: `def solve(trades):
    s = trades.set_index(pd.to_datetime(trades["time"]))["price"]
    return s.resample("D").ohlc().rename_axis("date").reset_index()`, explanation: 'ohlc() is a built-in resample aggregation that returns all four columns at once.', complexity: 'O(n).', whenToUse: 'Price data, but also min / max / first / last of any metric per period.' },
      { name: 'groupby day + named agg', code: `def solve(trades):
    t = pd.to_datetime(trades["time"])
    return (
        trades.assign(date=t.dt.normalize()).sort_values("time")
        .groupby("date", as_index=False)
        .agg(open=("price", "first"), high=("price", "max"), low=("price", "min"), close=("price", "last"))
    )`, explanation: 'dt.normalize() sets each timestamp to midnight, giving a day key. first and last depend on row order, so sort by time.', complexity: 'O(n log n).', whenToUse: 'When you also group by other keys, such as ticker.' },
    ],
    mistakes: 'first and last are positional: on unsorted trades they are not the opening and closing prices. Days with no trades appear as NaN rows with resample.',
  },
  {
    id: 98, title: 'Flatten Multi-Level Columns', difficulty: 'Hard', tags: ['MultiIndex', 'groupby'],
    story: 'An aggregation with several functions per column produced two-level column headers. Your dashboard tool only accepts flat names like revenue_sum.',
    task: 'Return region, revenue_sum, revenue_mean and qty_sum, sorted by region.',
    setup: `orders = pd.DataFrame({
    "region": ["North", "North", "South"],
    "revenue": [100, 300, 50],
    "qty": [1, 3, 2],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['region', 'revenue_sum', 'revenue_mean', 'qty_sum'], rows: [['North', 400, 200.0, 4], ['South', 50, 50.0, 2]], dtypes: { revenue_mean: 'float' } },
    hints: ['agg({"revenue": ["sum", "mean"], "qty": ["sum"]}) creates MultiIndex columns.', 'Join each tuple with "_": ["_".join(c) for c in out.columns].'],
    approaches: [
      { name: 'Join the column tuples', code: `def solve(orders):
    out = orders.groupby("region").agg({"revenue": ["sum", "mean"], "qty": ["sum"]})
    out.columns = ["_".join(col) for col in out.columns]
    return out.reset_index()`, explanation: 'Each column label is a tuple such as ("revenue", "sum"). Joining with "_" gives flat names in a predictable pattern.', complexity: 'O(n).', whenToUse: 'Flattening any multi-function aggregation.' },
      { name: 'Named aggregation (no MultiIndex)', code: `def solve(orders):
    return orders.groupby("region", as_index=False).agg(
        revenue_sum=("revenue", "sum"),
        revenue_mean=("revenue", "mean"),
        qty_sum=("qty", "sum"),
    )`, explanation: 'Avoids the problem entirely: named aggregation produces flat columns from the start.', complexity: 'O(n).', whenToUse: 'New code. It is clearer than flattening afterwards.' },
    ],
    mistakes: 'out.columns.droplevel(0) leaves duplicate names (sum, mean, sum). reset_index() before flattening adds a ("region", "") tuple that joins to "region_".',
  },
  {
    id: 99, title: 'Next-Day Price Direction', difficulty: 'Hard', tags: ['window functions'],
    story: 'A data scientist is building labels for a model: for each day, did the price go up, down or stay flat on the next day?',
    task: 'Return date, close and next_move ("up", "down" or "flat" compared with the next day\'s close). The last day has no next day, so it gets NaN.',
    setup: `prices = pd.DataFrame({
    "date": ["2024-10-01", "2024-10-02", "2024-10-03", "2024-10-04", "2024-10-07"],
    "close": [10.0, 11.0, 11.0, 9.0, 12.0],
})`,
    signature: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:', call: 'solve(prices)',
    expected: { columns: ['date', 'close', 'next_move'], rows: [['2024-10-01', 10.0, 'up'], ['2024-10-02', 11.0, 'flat'], ['2024-10-03', 11.0, 'down'], ['2024-10-04', 9.0, 'up'], ['2024-10-07', 12.0, null]], dtypes: { close: 'float' } },
    hints: ['shift(-1) brings the next row\'s value up (like SQL LEAD()).', 'Compare it with the current close, and keep NaN where there is no next value.'],
    approaches: [
      { name: 'shift(-1) + np.where', code: `def solve(prices):
    nxt = prices["close"].shift(-1)
    move = np.where(nxt > prices["close"], "up", np.where(nxt < prices["close"], "down", "flat"))
    move = pd.Series(move, index=prices.index).where(nxt.notna())
    return prices.assign(next_move=move)`, explanation: 'Nested np.where handles three outcomes. The final where() sets the last row back to NaN, because NaN comparisons are False and would otherwise read as "flat".', complexity: 'O(n).', whenToUse: 'Creating labels from future values, for example churn next month.' },
      { name: 'Sign of the forward difference', code: `def solve(prices):
    step = np.sign(prices["close"].diff().shift(-1))
    return prices.assign(next_move=step.map({1.0: "up", 0.0: "flat", -1.0: "down"}))`, explanation: 'diff().shift(-1) is "next minus current". np.sign turns it into 1, 0 or -1, and map translates those. NaN stays NaN automatically.', complexity: 'O(n).', whenToUse: 'Compact labelling with a lookup table.' },
    ],
    mistakes: 'Forgetting the NaN case labels the last day as "flat". In real modelling, using shift(-1) features (not labels) leaks future information.',
  },
  {
    id: 100, title: 'Days to Second Purchase', difficulty: 'Hard', tags: ['window functions', 'datetime'],
    story: 'Growth teams track how quickly new customers come back. You need the number of days between each customer\'s first and second order.',
    task: 'Return customer and days_to_second for customers with at least two orders, sorted by customer.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C2", "C1", "C3", "C3", "C1"],
    "order_date": ["2024-01-01", "2024-01-05", "2024-01-10", "2024-01-03", "2024-01-04", "2024-01-20"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['customer', 'days_to_second'], rows: [['C1', 9], ['C3', 1]] },
    hints: ['Sort by customer and date, number the orders with cumcount().', 'Keep orders 0 and 1, pivot them side by side, and subtract.'],
    approaches: [
      { name: 'cumcount + pivot', code: `def solve(orders):
    d = orders.assign(day=pd.to_datetime(orders["order_date"])).sort_values(["customer", "day"])
    d["n"] = d.groupby("customer").cumcount()
    first_two = d[d["n"] < 2].pivot(index="customer", columns="n", values="day").dropna()
    gap = (first_two[1] - first_two[0]).dt.days
    return gap.rename("days_to_second").reset_index()`, explanation: 'Numbering orders turns "first" and "second" into columns 0 and 1. Customers with only one order have NaN in column 1 and are dropped.', complexity: 'O(n log n).', whenToUse: 'Time between the nth and (n+1)th event.' },
      { name: 'agg with a small function', code: `def solve(orders):
    d = orders.assign(day=pd.to_datetime(orders["order_date"])).sort_values(["customer", "day"])
    gap = d.groupby("customer")["day"].agg(lambda s: (s.iloc[1] - s.iloc[0]).days if len(s) > 1 else np.nan)
    return gap.dropna().astype(int).rename("days_to_second").reset_index()`, explanation: 'One readable function per customer. Fine for thousands of customers, but slower than the vectorised version on millions.', complexity: 'O(n log n) plus Python per group.', whenToUse: 'Quick analysis where clarity beats speed.' },
    ],
    mistakes: 'Using the last order instead of the second (max − min) answers a different question. Duplicate orders on the same day give a 0-day gap, so decide whether to deduplicate first.',
  },
);
window.dispatchEvent(new Event('dojo:problems'));
