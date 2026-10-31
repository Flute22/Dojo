// Pandas Dojo — Problems 51–75 (Medium)
window.DOJO_PROBLEMS = window.DOJO_PROBLEMS || [];
window.DOJO_PROBLEMS.push(
  {
    id: 51, title: 'Fill Gaps in a Product Feed', difficulty: 'Medium', tags: ['missing values'],
    story: 'A supplier feed arrived with holes: some products have no category and some have no price. The shop needs a complete table before it goes live.',
    task: 'Fill a missing category with "Unknown" and a missing price with the median of the known prices. Return all columns.',
    setup: `products = pd.DataFrame({
    "product": ["Oolong", "Matcha", "Mocha", "Sencha", "Latte", "Espresso"],
    "category": ["Tea", None, "Coffee", "Tea", None, "Coffee"],
    "price": [4.0, np.nan, 6.0, np.nan, 5.0, 8.0],
})`,
    signature: 'def solve(products: pd.DataFrame) -> pd.DataFrame:', call: 'solve(products)',
    expected: { columns: ['product', 'category', 'price'], rows: [['Oolong', 'Tea', 4.0], ['Matcha', 'Unknown', 5.5], ['Mocha', 'Coffee', 6.0], ['Sencha', 'Tea', 5.5], ['Latte', 'Unknown', 5.0], ['Espresso', 'Coffee', 8.0]], dtypes: { price: 'float' } },
    hints: ['fillna() accepts a dict that maps each column to its own fill value.', 'products["price"].median() skips NaN, so it is the median of 4, 6, 5 and 8.'],
    approaches: [
      { name: 'fillna with a dict', code: `def solve(products):
    return products.fillna({
        "category": "Unknown",
        "price": products["price"].median(),
    })`, explanation: 'One call fills each column with its own value. Columns not in the dict are left untouched.', complexity: 'O(n).', whenToUse: 'Cleaning several columns with simple, column-specific defaults.' },
      { name: 'assign each column', code: `def solve(products):
    return products.assign(
        category=products["category"].fillna("Unknown"),
        price=products["price"].fillna(products["price"].median()),
    )`, explanation: 'assign() returns a new DataFrame and keeps the original unchanged. Each rule is a separate, readable line, which is handy when rules get more complex.', complexity: 'O(n).', whenToUse: 'Method chains where every column has its own cleaning logic.' },
    ],
    mistakes: 'Using the mean instead of the median lets one very expensive product pull the fill value up. df["price"].fillna(..., inplace=True) on a slice can trigger SettingWithCopyWarning, so assign the result instead.',
  },
  {
    id: 52, title: 'Fill Salaries by Department', difficulty: 'Medium', tags: ['missing values', 'groupby'],
    story: 'Some salaries are missing in an HR export. A company-wide average would be misleading, because IT pays more than HR. You decide to fill each gap with that department\'s average.',
    task: 'Fill each missing salary with the mean salary of the same department. Return name, dept and salary.',
    setup: `staff = pd.DataFrame({
    "name": ["Ana", "Ben", "Cai", "Dua", "Eva", "Fin", "Gil"],
    "dept": ["IT", "IT", "IT", "HR", "HR", "Sales", "Sales"],
    "salary": [70000, np.nan, 80000, 50000, np.nan, 60000, np.nan],
})`,
    signature: 'def solve(staff: pd.DataFrame) -> pd.DataFrame:', call: 'solve(staff)',
    expected: { columns: ['name', 'dept', 'salary'], rows: [['Ana', 'IT', 70000.0], ['Ben', 'IT', 75000.0], ['Cai', 'IT', 80000.0], ['Dua', 'HR', 50000.0], ['Eva', 'HR', 50000.0], ['Fin', 'Sales', 60000.0], ['Gil', 'Sales', 60000.0]], dtypes: { salary: 'float' } },
    hints: ['groupby("dept")["salary"].transform("mean") returns a Series as long as the original table, with each row holding its department\'s mean.', 'Pass that Series to fillna().'],
    approaches: [
      { name: 'groupby + transform', code: `def solve(staff):
    dept_mean = staff.groupby("dept")["salary"].transform("mean")
    return staff.assign(salary=staff["salary"].fillna(dept_mean))`, explanation: 'transform keeps the original shape, so the group means line up row by row with the gaps. fillna only uses them where salary is NaN.', complexity: 'O(n).', whenToUse: 'Group-aware imputation: by region, store, product line or month.' },
      { name: 'Means table + map', code: `def solve(staff):
    means = staff.groupby("dept")["salary"].mean()
    fill = staff["dept"].map(means)
    return staff.assign(salary=staff["salary"].fillna(fill))`, explanation: 'First computes one mean per department (a small lookup Series), then maps each row\'s department to it. Same result, and you can inspect or log the lookup table.', complexity: 'O(n).', whenToUse: 'When the fill values must be reviewed or reused elsewhere.' },
    ],
    mistakes: 'groupby().mean() returns one row per department, so passing it straight to fillna() misaligns on the index. Use transform() or map(). A department with no known salaries stays NaN.',
  },
  {
    id: 53, title: 'Interpolate Missing Closing Prices', difficulty: 'Medium', tags: ['missing values'],
    story: 'A price feed dropped a few days. For a smooth chart, the analyst wants to estimate the missing closes by drawing a straight line between the known days.',
    task: 'Fill missing close values by linear interpolation. Return date and close.',
    setup: `prices = pd.DataFrame({
    "date": ["2024-07-01", "2024-07-02", "2024-07-03", "2024-07-04", "2024-07-05", "2024-07-08"],
    "close": [10.0, np.nan, 14.0, np.nan, np.nan, 20.0],
})`,
    signature: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:', call: 'solve(prices)',
    expected: { columns: ['date', 'close'], rows: [['2024-07-01', 10.0], ['2024-07-02', 12.0], ['2024-07-03', 14.0], ['2024-07-04', 16.0], ['2024-07-05', 18.0], ['2024-07-08', 20.0]], dtypes: { close: 'float' } },
    hints: ['Series.interpolate() fills NaN using the values around it.', 'The default method is "linear", which treats rows as evenly spaced.'],
    approaches: [
      { name: 'interpolate()', code: `def solve(prices):
    return prices.assign(close=prices["close"].interpolate())`, explanation: 'Linear interpolation treats each row as one step. Between 14 and 20 there are three steps, so the two gaps become 16 and 18.', complexity: 'O(n).', whenToUse: 'Smoothly changing measurements such as prices, temperatures or sensor readings.' },
      { name: 'NumPy np.interp', code: `def solve(prices):
    s = prices["close"]
    pos = np.arange(len(s))
    known = s.notna().to_numpy()
    out = prices[["date"]].copy()
    out["close"] = np.interp(pos, pos[known], s.to_numpy()[known])
    return out`, explanation: 'Shows what interpolate() does under the hood: known positions and values define a line, and np.interp reads values off it for every position.', complexity: 'O(n log n) for the lookup.', whenToUse: 'When you need custom x-values, such as real timestamps instead of row positions.' },
    ],
    mistakes: 'Linear interpolation ignores the weekend gap between 07-05 and 07-08. For time-aware results, set a DatetimeIndex and use interpolate(method="time"). fillna(method="ffill") is deprecated, so use .ffill() if you want to carry values forward.',
  },
  {
    id: 54, title: 'First Order per Customer and Product', difficulty: 'Medium', tags: ['duplicates'],
    story: 'A loyalty programme rewards only the first purchase of each product by each customer. Repeat purchases of the same product should not count.',
    task: 'Keep only the first order for every (customer_id, product) pair, in the original order. Return order_id, customer_id and product.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "customer_id": ["C1", "C2", "C1", "C3", "C2", "C1", "C4", "C3"],
    "product": ["pen", "ink", "pen", "pad", "ink", "ink", "pen", "pad"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'customer_id', 'product'], rows: [[1, 'C1', 'pen'], [2, 'C2', 'ink'], [4, 'C3', 'pad'], [6, 'C1', 'ink'], [7, 'C4', 'pen']] },
    hints: ['drop_duplicates() has a subset= parameter for the columns that define a duplicate.', 'keep="first" is the default.'],
    approaches: [
      { name: 'drop_duplicates(subset=)', code: `def solve(orders):
    return orders.drop_duplicates(subset=["customer_id", "product"], keep="first")`, explanation: 'Rows count as duplicates when the subset columns match. The first occurrence is kept and the original order is preserved.', complexity: 'O(n) with hashing.', whenToUse: 'Deduplicating on a business key rather than on whole rows.' },
      { name: 'duplicated() mask', code: `def solve(orders):
    repeat = orders.duplicated(subset=["customer_id", "product"])
    return orders[~repeat]`, explanation: 'duplicated() marks every repeat as True. Having the mask lets you also count or inspect the repeats before removing them.', complexity: 'O(n).', whenToUse: 'Data-quality reports where you need to show what was removed.' },
      { name: 'groupby().head(1)', code: `def solve(orders):
    return orders.groupby(["customer_id", "product"], sort=False).head(1)`, explanation: 'head(1) returns the first row of each group and keeps the original row order. Change it to head(2) for "first two purchases".', complexity: 'O(n).', whenToUse: 'When you might want the first N per group, not only the first.' },
    ],
    mistakes: 'drop_duplicates() without subset only removes rows where every column matches, and order_id is always different. Also check that the data is sorted by time before trusting keep="first".',
  },
  {
    id: 55, title: 'Latest Email per Customer', difficulty: 'Medium', tags: ['duplicates', 'datetime'],
    story: 'The CRM log stores a new row every time a customer updates their email, and the log is not sorted. Marketing needs each customer\'s current email.',
    task: 'For each customer_id keep the row with the latest updated_at. Return customer_id, email and updated_at, sorted by customer_id.',
    setup: `log = pd.DataFrame({
    "customer_id": ["C1", "C2", "C1", "C3", "C2", "C3"],
    "email": ["amy@mail.com", "bo@mail.com", "amy.k@mail.com", "cy@mail.com", "bo.l@mail.com", "cy@mail.com"],
    "updated_at": ["2024-01-05", "2024-02-01", "2024-03-10", "2024-01-20", "2024-01-15", "2024-01-20"],
})`,
    signature: 'def solve(log: pd.DataFrame) -> pd.DataFrame:', call: 'solve(log)',
    expected: { columns: ['customer_id', 'email', 'updated_at'], rows: [['C1', 'amy.k@mail.com', '2024-03-10'], ['C2', 'bo@mail.com', '2024-02-01'], ['C3', 'cy@mail.com', '2024-01-20']] },
    hints: ['Sort by updated_at first, so the latest row of each customer comes last.', 'Then drop_duplicates("customer_id", keep="last").'],
    approaches: [
      { name: 'Sort + drop_duplicates(keep="last")', code: `def solve(log):
    return (
        log.sort_values("updated_at")
        .drop_duplicates("customer_id", keep="last")
        .sort_values("customer_id")
    )`, explanation: 'After sorting, the last row per customer is the newest. ISO dates (YYYY-MM-DD) sort correctly as text. For other formats, convert with pd.to_datetime first.', complexity: 'O(n log n).', whenToUse: 'The classic "latest record per key" pattern for dimension tables.' },
      { name: 'idxmax per group', code: `def solve(log):
    ts = pd.to_datetime(log["updated_at"])
    latest_rows = ts.groupby(log["customer_id"]).idxmax()
    return log.loc[latest_rows]`, explanation: 'idxmax() returns the row label of the newest timestamp in each group, and loc fetches those rows. The original text column stays unchanged.', complexity: 'O(n).', whenToUse: 'Large tables where a full sort is expensive.' },
    ],
    mistakes: 'Using keep="first" without sorting gives whichever row happens to come first. With non-ISO date strings such as "3/10/2024", text sorting is wrong, so convert to datetime.',
  },
  {
    id: 56, title: 'Prices Stored as Text', difficulty: 'Medium', tags: ['dtype conversion', 'string methods'],
    story: 'A spreadsheet export stored prices as text like "$1,200.00", and one row says "N/A". You need real numbers before you can sum anything.',
    task: 'Return item and price, where price is a float. Remove "$" and "," and turn anything that is not a number into NaN.',
    setup: `catalog = pd.DataFrame({
    "item": ["Desk", "Laptop", "Mouse", "Monitor", "Chair"],
    "price_text": ["$12.50", "$1,200.00", "$7", "N/A", "$45.99"],
})`,
    signature: 'def solve(catalog: pd.DataFrame) -> pd.DataFrame:', call: 'solve(catalog)',
    expected: { columns: ['item', 'price'], rows: [['Desk', 12.5], ['Laptop', 1200.0], ['Mouse', 7.0], ['Monitor', null], ['Chair', 45.99]], dtypes: { price: 'float' } },
    hints: ['.str.replace(r"[$,]", "", regex=True) removes both characters in one go.', 'pd.to_numeric(..., errors="coerce") turns "N/A" into NaN instead of raising.'],
    approaches: [
      { name: 'Regex replace + to_numeric', code: `def solve(catalog):
    cleaned = catalog["price_text"].str.replace(r"[$,]", "", regex=True)
    return pd.DataFrame({
        "item": catalog["item"],
        "price": pd.to_numeric(cleaned, errors="coerce"),
    })`, explanation: 'The character class [$,] matches either symbol. errors="coerce" converts anything unparseable to NaN, so one bad cell does not break the whole column.', complexity: 'O(n).', whenToUse: 'Cleaning currency, percentages or numbers with thousand separators.' },
      { name: 'Plain replaces, no regex', code: `def solve(catalog):
    cleaned = (
        catalog["price_text"]
        .str.replace("$", "", regex=False)
        .str.replace(",", "", regex=False)
    )
    return catalog[["item"]].assign(price=pd.to_numeric(cleaned, errors="coerce"))`, explanation: 'Literal replaces avoid regex surprises. This matters because $ is a special character in regex (end of string).', complexity: 'O(n), two passes.', whenToUse: 'When teammates are less comfortable reading regex.' },
    ],
    mistakes: 'astype(float) raises on "N/A". str.replace("$", "", regex=True) does nothing useful, because $ means end of string in regex. Always check the result with .isna().sum() so you know how many values were coerced.',
  },
  {
    id: 57, title: 'Messy City Names', difficulty: 'Medium', tags: ['string methods', 'value_counts'],
    story: 'Customers typed their city by hand, so "Lagos" appears as " lagos", "LAGOS" and "Lagos ". The regional manager wants a clean count of orders per city.',
    task: 'Clean city with strip() and title case, ignore missing cities, and return city and orders sorted by orders descending.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7],
    "city": [" lagos", "Lagos ", "LAGOS", "Abuja", "abuja ", "Kano", None],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['city', 'orders'], rows: [['Lagos', 3], ['Abuja', 2], ['Kano', 1]] },
    hints: ['Chain .str.strip().str.title() on the column.', 'value_counts() then reset_index(name="orders").'],
    approaches: [
      { name: 'Clean then value_counts', code: `def solve(orders):
    city = orders["city"].str.strip().str.title()
    return city.value_counts().reset_index(name="orders")`, explanation: 'The .str methods run on every value and pass missing values through as NaN. value_counts() then drops NaN and sorts by count.', complexity: 'O(n).', whenToUse: 'Any free-text category before grouping.' },
      { name: 'Clean column + groupby', code: `def solve(orders):
    clean = orders.assign(city=orders["city"].str.strip().str.title())
    return (
        clean.dropna(subset=["city"])
        .groupby("city").size()
        .reset_index(name="orders")
        .sort_values("orders", ascending=False)
    )`, explanation: 'Writes the cleaned column back to the table first, which is better when later steps also group by city.', complexity: 'O(n).', whenToUse: 'Pipelines where the cleaned column is reused.' },
    ],
    mistakes: 'Forgetting strip() leaves "Lagos" and "Lagos " as two groups. str.capitalize() would turn "new york" into "New york". Use title() for city names.',
  },
  {
    id: 58, title: 'Users per Email Domain', difficulty: 'Medium', tags: ['string methods'],
    story: 'Sales wants to know which email providers your users rely on, to plan a deliverability test. Some emails use capital letters and one user has no email.',
    task: 'Extract the domain (the part after @, in lowercase) and count users per domain. Return domain and users, sorted by users descending and then domain ascending.',
    setup: `users = pd.DataFrame({
    "user_id": [1, 2, 3, 4, 5, 6],
    "email": ["ana@gmail.com", "ben@yahoo.com", "cy@gmail.com", "dee@company.org", "eli@GMAIL.com", None],
})`,
    signature: 'def solve(users: pd.DataFrame) -> pd.DataFrame:', call: 'solve(users)',
    expected: { columns: ['domain', 'users'], rows: [['gmail.com', 3], ['company.org', 1], ['yahoo.com', 1]] },
    hints: ['.str.split("@").str[1] gets the part after @.', 'Lowercase before counting, then sort by two columns to break the tie.'],
    approaches: [
      { name: 'split + str[1]', code: `def solve(users):
    domain = users["email"].str.split("@").str[1].str.lower().rename("domain")
    counts = domain.value_counts().reset_index(name="users")
    return counts.sort_values(["users", "domain"], ascending=[False, True])`, explanation: 'split() gives a list per row and .str[1] takes the second item. Renaming the Series makes value_counts() name the column domain.', complexity: 'O(n).', whenToUse: 'Simple, well-formed delimiters.' },
      { name: 'Regex extract', code: `def solve(users):
    domain = users["email"].str.extract(r"@(.+)$")[0].str.lower()
    out = domain.value_counts().rename_axis("domain").reset_index(name="users")
    return out.sort_values(["users", "domain"], ascending=[False, True])`, explanation: 'The capture group (.+) grabs everything after @ up to the end. extract returns a DataFrame with one column per group, so [0] takes the first.', complexity: 'O(n).', whenToUse: 'When the pattern is more complex, for example removing subdomains.' },
    ],
    mistakes: 'Counting before lowercasing splits gmail.com and GMAIL.com. value_counts() alone gives ties in arbitrary order, so add an explicit tie-break.',
  },
  {
    id: 59, title: 'Revenue by Month', difficulty: 'Medium', tags: ['datetime', 'groupby'],
    story: 'Finance asks for monthly revenue. Orders are stored with a date string.',
    task: 'Return month (as "YYYY-MM" text) and revenue (sum), in chronological order.',
    setup: `orders = pd.DataFrame({
    "order_date": ["2024-01-05", "2024-01-20", "2024-02-03", "2024-02-28", "2024-03-15", "2024-01-31"],
    "revenue": [120.0, 80.0, 200.0, 50.0, 90.0, 30.0],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['month', 'revenue'], rows: [['2024-01', 230.0], ['2024-02', 250.0], ['2024-03', 90.0]], dtypes: { revenue: 'float' } },
    hints: ['Convert with pd.to_datetime, then use the .dt accessor.', '.dt.strftime("%Y-%m") or .dt.to_period("M") give the month.'],
    approaches: [
      { name: 'to_period("M")', code: `def solve(orders):
    month = pd.to_datetime(orders["order_date"]).dt.to_period("M").astype(str)
    return (
        orders.assign(month=month)
        .groupby("month", as_index=False)["revenue"].sum()
    )`, explanation: 'A Period represents the whole month, so it sorts in time order and can do maths (month + 1). astype(str) gives the "2024-01" label.', complexity: 'O(n).', whenToUse: 'Monthly and quarterly reporting.' },
      { name: 'strftime label', code: `def solve(orders):
    month = pd.to_datetime(orders["order_date"]).dt.strftime("%Y-%m")
    return orders.groupby(month.rename("month"))["revenue"].sum().reset_index()`, explanation: 'strftime formats each date as text. Year first is important, because the labels then sort chronologically as text.', complexity: 'O(n).', whenToUse: 'When you need a specific text format for a report.' },
    ],
    mistakes: 'Grouping by .dt.month alone mixes January 2024 with January 2025. A label like "Jan-2024" sorts alphabetically, not by time.',
  },
  {
    id: 60, title: 'Delivery Time in Minutes', difficulty: 'Medium', tags: ['datetime'],
    story: 'Operations wants the delivery time of every order in minutes. One delivery crossed midnight, and one has not been delivered yet.',
    task: 'Return delivery_id and delivery_minutes (float) = delivered_at − ordered_at in minutes. Undelivered orders get NaN.',
    setup: `deliveries = pd.DataFrame({
    "delivery_id": ["D1", "D2", "D3", "D4", "D5"],
    "ordered_at": ["2024-05-01 10:00", "2024-05-01 11:15", "2024-05-01 23:50", "2024-05-02 09:00", "2024-05-02 14:10"],
    "delivered_at": ["2024-05-01 10:35", "2024-05-01 12:05", "2024-05-02 00:20", None, "2024-05-02 14:55"],
})`,
    signature: 'def solve(deliveries: pd.DataFrame) -> pd.DataFrame:', call: 'solve(deliveries)',
    expected: { columns: ['delivery_id', 'delivery_minutes'], rows: [['D1', 35.0], ['D2', 50.0], ['D3', 30.0], ['D4', null], ['D5', 45.0]], dtypes: { delivery_minutes: 'float' } },
    hints: ['Subtracting two datetime columns gives a timedelta column.', '.dt.total_seconds() / 60 converts it to minutes.'],
    approaches: [
      { name: 'total_seconds()', code: `def solve(deliveries):
    start = pd.to_datetime(deliveries["ordered_at"])
    end = pd.to_datetime(deliveries["delivered_at"])
    minutes = (end - start).dt.total_seconds() / 60
    return pd.DataFrame({"delivery_id": deliveries["delivery_id"], "delivery_minutes": minutes})`, explanation: 'Missing timestamps become NaT, and NaT minus anything is NaT, which becomes NaN minutes. Full timestamps handle midnight correctly.', complexity: 'O(n).', whenToUse: 'Durations: wait times, session lengths, time to resolve.' },
      { name: 'Divide by a Timedelta', code: `def solve(deliveries):
    gap = pd.to_datetime(deliveries["delivered_at"]) - pd.to_datetime(deliveries["ordered_at"])
    return deliveries[["delivery_id"]].assign(delivery_minutes=gap / pd.Timedelta(minutes=1))`, explanation: 'Dividing a timedelta by one minute gives a float number of minutes. Swap in hours=1 or days=1 for other units.', complexity: 'O(n).', whenToUse: 'When you switch between units often.' },
    ],
    mistakes: '.dt.seconds only returns the seconds part (0–86399) and ignores whole days, so long durations come out wrong. Use .dt.total_seconds().',
  },
  {
    id: 61, title: 'Tag High-Value Orders', difficulty: 'Medium', tags: ['apply/map/np.where'],
    story: 'Customer service gives priority to orders of $100 or more. They want a tier label on every order.',
    task: 'Return order_id, amount and tier, where tier is "high" if amount ≥ 100 and "standard" otherwise.',
    setup: `orders = pd.DataFrame({
    "order_id": [11, 12, 13, 14, 15],
    "amount": [120, 45, 100, 80, 300],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'amount', 'tier'], rows: [[11, 120, 'high'], [12, 45, 'standard'], [13, 100, 'high'], [14, 80, 'standard'], [15, 300, 'high']] },
    hints: ['np.where(condition, value_if_true, value_if_false) works on whole columns.', 'Add the result with assign(tier=...).'],
    approaches: [
      { name: 'np.where', code: `def solve(orders):
    return orders.assign(tier=np.where(orders["amount"] >= 100, "high", "standard"))`, explanation: 'Vectorised if/else: the condition is evaluated for the whole column at once in C.', complexity: 'O(n), very fast.', whenToUse: 'Any two-way label or flag.' },
      { name: 'apply with a function', code: `def solve(orders):
    def label(amount):
        return "high" if amount >= 100 else "standard"
    return orders.assign(tier=orders["amount"].apply(label))`, explanation: 'Readable, but it calls Python once per row. On a million rows it is often 50–100 times slower than np.where.', complexity: 'O(n) with Python overhead per row.', whenToUse: 'Logic that cannot be vectorised, such as calling an external parser.' },
    ],
    mistakes: 'np.where returns NaN-unaware results: a missing amount compares as False and becomes "standard". Handle NaN explicitly if it can occur.',
  },
  {
    id: 62, title: 'Letter Grades with np.select', difficulty: 'Medium', tags: ['apply/map/np.where', 'binning'],
    story: 'The school grades as follows: 90+ is A, 80+ is B, 70+ is C, and anything lower is F. Students without a score were absent and should be marked as such.',
    task: 'Return student and grade, using "Absent" for a missing score.',
    setup: `results = pd.DataFrame({
    "student": ["Ama", "Bo", "Cleo", "Dan", "Eko", "Fei"],
    "score": [95, 82, 70, 64, np.nan, 89.5],
})`,
    signature: 'def solve(results: pd.DataFrame) -> pd.DataFrame:', call: 'solve(results)',
    expected: { columns: ['student', 'grade'], rows: [['Ama', 'A'], ['Bo', 'B'], ['Cleo', 'C'], ['Dan', 'F'], ['Eko', 'Absent'], ['Fei', 'B']] },
    hints: ['np.select takes a list of conditions and a list of matching choices. The first True condition wins.', 'Put the missing-score condition first.'],
    approaches: [
      { name: 'np.select', code: `def solve(results):
    s = results["score"]
    conditions = [s.isna(), s >= 90, s >= 80, s >= 70]
    choices = ["Absent", "A", "B", "C"]
    return results[["student"]].assign(grade=np.select(conditions, choices, default="F"))`, explanation: 'Conditions are checked in order, so s >= 80 only applies to rows that failed s >= 90. default catches everything else.', complexity: 'O(n × conditions).', whenToUse: 'Multi-branch business rules (if / elif / else) on whole columns.' },
      { name: 'pd.cut with bins', code: `def solve(results):
    grade = pd.cut(
        results["score"],
        bins=[-np.inf, 70, 80, 90, np.inf],
        right=False,
        labels=["F", "C", "B", "A"],
    )
    return results[["student"]].assign(grade=grade.astype(object).fillna("Absent"))`, explanation: 'right=False makes each bin include its left edge, so 70 lands in C and 90 in A. cut returns a categorical, so convert to object before filling with a new label.', complexity: 'O(n log bins).', whenToUse: 'When rules are pure numeric ranges and you also want ordered categories.' },
    ],
    mistakes: 'Putting s >= 70 before s >= 90 gives everyone above 70 a C. fillna("Absent") directly on a categorical raises, because "Absent" is not one of its categories.',
  },
  {
    id: 63, title: 'Country Codes to Names', difficulty: 'Medium', tags: ['apply/map/np.where'],
    story: 'Orders store a two-letter country code. The report should show full names, and any code you do not have a name for should show as "Other".',
    task: 'Return order_id and country, mapping NG, KE, GH and ZA to their names and anything else to "Other".',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6],
    "code": ["NG", "KE", "GH", "ZA", "NG", "US"],
})
names = {"NG": "Nigeria", "KE": "Kenya", "GH": "Ghana", "ZA": "South Africa"}`,
    signature: 'def solve(orders: pd.DataFrame, names: dict) -> pd.DataFrame:', call: 'solve(orders, names)',
    expected: { columns: ['order_id', 'country'], rows: [[1, 'Nigeria'], [2, 'Kenya'], [3, 'Ghana'], [4, 'South Africa'], [5, 'Nigeria'], [6, 'Other']] },
    hints: ['Series.map(dict) looks up each value and gives NaN when it is not found.', 'Follow it with fillna("Other").'],
    approaches: [
      { name: 'map + fillna', code: `def solve(orders, names):
    return orders[["order_id"]].assign(country=orders["code"].map(names).fillna("Other"))`, explanation: 'map with a dict is a fast lookup. Unknown keys become NaN, which makes them easy to spot or fill.', complexity: 'O(n).', whenToUse: 'Translating codes, IDs or abbreviations.' },
      { name: 'map with dict.get', code: `def solve(orders, names):
    return orders[["order_id"]].assign(country=orders["code"].map(lambda c: names.get(c, "Other")))`, explanation: 'dict.get with a default handles unknown codes in one step, but it runs Python per row.', complexity: 'O(n) with per-row overhead.', whenToUse: 'Small tables, or when the default depends on the value.' },
    ],
    mistakes: 'replace(names) leaves unknown codes unchanged ("US" stays "US"), which can look like a valid country. Use map when unmapped values must be visible.',
  },
  {
    id: 64, title: 'Regional Sales Summary', difficulty: 'Medium', tags: ['groupby'],
    story: 'The sales director wants one line per region: total revenue, average order value and number of orders, with the biggest region first.',
    task: 'Return region, total_revenue, avg_order (rounded to 2 decimals) and orders, sorted by total_revenue descending.',
    setup: `sales = pd.DataFrame({
    "region": ["North", "South", "North", "East", "South", "North", "East"],
    "revenue": [100, 200, 150, 50, 100, 250, 70],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales)',
    expected: { columns: ['region', 'total_revenue', 'avg_order', 'orders'], rows: [['North', 500, 166.67, 3], ['South', 300, 150.0, 2], ['East', 120, 60.0, 2]], dtypes: { avg_order: 'float' } },
    hints: ['Named aggregation: .agg(total_revenue=("revenue", "sum"), ...).', 'Use as_index=False so region stays a column.'],
    approaches: [
      { name: 'Named aggregation', code: `def solve(sales):
    out = sales.groupby("region", as_index=False).agg(
        total_revenue=("revenue", "sum"),
        avg_order=("revenue", "mean"),
        orders=("revenue", "count"),
    )
    out["avg_order"] = out["avg_order"].round(2)
    return out.sort_values("total_revenue", ascending=False)`, explanation: 'Each keyword is the output column name, and the tuple says which column and which function. No renaming step needed.', complexity: 'O(n).', whenToUse: 'The standard way to build summary tables in pandas 2.x.' },
      { name: 'agg with a list, then flatten', code: `def solve(sales):
    out = sales.groupby("region")["revenue"].agg(["sum", "mean", "count"])
    out.columns = ["total_revenue", "avg_order", "orders"]
    out["avg_order"] = out["avg_order"].round(2)
    return out.reset_index().sort_values("total_revenue", ascending=False)`, explanation: 'A list of functions gives one column per function. You then rename them by position.', complexity: 'O(n).', whenToUse: 'Older code bases, or when the function list is dynamic.' },
    ],
    mistakes: 'Forgetting as_index=False or reset_index() leaves region in the index. count counts non-null values, while size counts all rows. They differ when revenue has NaN.',
  },
  {
    id: 65, title: 'Categories with Enough Reviews', difficulty: 'Medium', tags: ['groupby'],
    story: 'A marketplace only shows a category rating when it has at least 3 products, so that one product cannot dominate the score.',
    task: 'Return category, products (count) and avg_rating (rounded to 1 decimal) for categories with at least 3 products, sorted by avg_rating descending.',
    setup: `items = pd.DataFrame({
    "product": ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9"],
    "category": ["Kitchen", "Kitchen", "Kitchen", "Garden", "Garden", "Office", "Office", "Office", "Office"],
    "rating": [4.0, 3.5, 4.5, 5.0, 4.0, 3.0, 4.0, 3.5, 3.0],
})`,
    signature: 'def solve(items: pd.DataFrame) -> pd.DataFrame:', call: 'solve(items)',
    expected: { columns: ['category', 'products', 'avg_rating'], rows: [['Kitchen', 3, 4.0], ['Office', 4, 3.4]], dtypes: { avg_rating: 'float' } },
    hints: ['Aggregate first, then filter the summary rows (like SQL HAVING).', 'Or use groupby(...).filter(lambda g: len(g) >= 3) before aggregating.'],
    approaches: [
      { name: 'Aggregate, then filter (HAVING)', code: `def solve(items):
    out = items.groupby("category", as_index=False).agg(
        products=("product", "count"),
        avg_rating=("rating", "mean"),
    )
    out = out[out["products"] >= 3]
    out["avg_rating"] = out["avg_rating"].round(1)
    return out.sort_values("avg_rating", ascending=False)`, explanation: 'Filtering the summary is the pandas version of SQL HAVING. It is fast because each group is reduced to one row first.', complexity: 'O(n).', whenToUse: 'Minimum sample size rules on any metric.' },
      { name: 'groupby.filter, then aggregate', code: `def solve(items):
    big = items.groupby("category").filter(lambda g: len(g) >= 3)
    out = big.groupby("category", as_index=False).agg(
        products=("product", "count"),
        avg_rating=("rating", "mean"),
    )
    return out.assign(avg_rating=out["avg_rating"].round(1)).sort_values("avg_rating", ascending=False)`, explanation: 'filter() keeps all original rows of groups that pass the test. Useful when you need those detail rows afterwards, not just the summary.', complexity: 'O(n), but the lambda runs once per group in Python.', whenToUse: 'When later steps need row-level data of the qualifying groups.' },
    ],
    mistakes: 'Assigning into a filtered slice (out = out[mask]; out["x"] = ...) can raise SettingWithCopyWarning. Use .copy() or assign().',
  },
  {
    id: 66, title: 'Orders with Customer Names', difficulty: 'Medium', tags: ['merge/join'],
    story: 'The orders table only has customer IDs. Support wants to see names, and orders from unknown customers (deleted accounts) should be left out.',
    task: 'Return order_id, name and amount for orders whose customer exists, in the order of the orders table.',
    setup: `customers = pd.DataFrame({
    "customer_id": ["C1", "C2", "C3"],
    "name": ["Ada", "Bayo", "Chen"],
})
orders = pd.DataFrame({
    "order_id": ["O1", "O2", "O3", "O4"],
    "customer_id": ["C1", "C3", "C4", "C1"],
    "amount": [50, 30, 20, 70],
})`,
    signature: 'def solve(orders: pd.DataFrame, customers: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders, customers)',
    expected: { columns: ['order_id', 'name', 'amount'], rows: [['O1', 'Ada', 50], ['O2', 'Chen', 30], ['O4', 'Ada', 70]] },
    hints: ['orders.merge(customers, on="customer_id") is an inner join by default.', 'An inner join keeps the order of the left table\'s keys.'],
    approaches: [
      { name: 'Inner merge', code: `def solve(orders, customers):
    joined = orders.merge(customers, on="customer_id", how="inner")
    return joined[["order_id", "name", "amount"]]`, explanation: 'Only orders whose customer_id exists in both tables survive. how="inner" is the default, but writing it makes the intent clear.', complexity: 'O(n + m) with a hash join.', whenToUse: 'Enriching facts with dimension attributes when unmatched rows are noise.' },
      { name: 'map a lookup Series', code: `def solve(orders, customers):
    lookup = customers.set_index("customer_id")["name"]
    out = orders.assign(name=orders["customer_id"].map(lookup))
    return out.dropna(subset=["name"])[["order_id", "name", "amount"]]`, explanation: 'For a single column, map() is a light alternative to merge and never changes the row count.', complexity: 'O(n).', whenToUse: 'Adding one attribute from a table with unique keys.' },
    ],
    mistakes: 'If customers has duplicate IDs, the merge multiplies order rows. Check with customers["customer_id"].is_unique or merge(..., validate="many_to_one").',
  },
  {
    id: 67, title: 'Total Spend for Every Customer', difficulty: 'Medium', tags: ['merge/join', 'groupby'],
    story: 'A retention report must list every customer with their total spend, including customers who have not bought anything yet (spend 0).',
    task: 'Return name and total_spent for all customers in the customers table order. Customers with no orders get 0.',
    setup: `customers = pd.DataFrame({
    "customer_id": ["C1", "C2", "C3", "C4"],
    "name": ["Ada", "Bayo", "Chen", "Dee"],
})
orders = pd.DataFrame({
    "customer_id": ["C1", "C1", "C3"],
    "amount": [50, 70, 30],
})`,
    signature: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(customers, orders)',
    expected: { columns: ['name', 'total_spent'], rows: [['Ada', 120.0], ['Bayo', 0.0], ['Chen', 30.0], ['Dee', 0.0]], dtypes: { total_spent: 'float' } },
    hints: ['Aggregate orders per customer first, then left-join onto customers.', 'A left join leaves NaN where there is no match. Fill those with 0.'],
    approaches: [
      { name: 'Aggregate, left merge, fillna', code: `def solve(customers, orders):
    spend = orders.groupby("customer_id", as_index=False)["amount"].sum()
    out = customers.merge(spend, on="customer_id", how="left")
    out["total_spent"] = out["amount"].fillna(0)
    return out[["name", "total_spent"]]`, explanation: 'Aggregating before the join keeps the join one-to-one. how="left" keeps every customer, even without orders.', complexity: 'O(n + m).', whenToUse: 'Any "for every X, even with zero" report.' },
      { name: 'map + fillna', code: `def solve(customers, orders):
    spend = orders.groupby("customer_id")["amount"].sum()
    total = customers["customer_id"].map(spend).fillna(0)
    return pd.DataFrame({"name": customers["name"], "total_spent": total})`, explanation: 'The per-customer sums act as a lookup table. Customers missing from it map to NaN and become 0.', complexity: 'O(n + m).', whenToUse: 'Adding one metric to a dimension table.' },
    ],
    mistakes: 'Joining first and aggregating afterwards works here, but with several fact tables it multiplies rows. An inner join silently drops Bayo and Dee.',
  },
  {
    id: 68, title: 'Customers Who Never Ordered', difficulty: 'Medium', tags: ['merge/join'],
    story: 'Marketing wants to send a welcome discount to customers who signed up but never placed an order.',
    task: 'Return customer_id and name of customers with no orders (an anti-join), in the customers table order.',
    setup: `customers = pd.DataFrame({
    "customer_id": ["C1", "C2", "C3", "C4"],
    "name": ["Ada", "Bayo", "Chen", "Dee"],
})
orders = pd.DataFrame({
    "order_id": [1, 2, 3],
    "customer_id": ["C1", "C3", "C1"],
})`,
    signature: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(customers, orders)',
    expected: { columns: ['customer_id', 'name'], rows: [['C2', 'Bayo'], ['C4', 'Dee']] },
    hints: ['~customers["customer_id"].isin(orders["customer_id"]) is True for customers with no orders.', 'Or merge with indicator=True and keep "left_only".'],
    approaches: [
      { name: 'isin + ~', code: `def solve(customers, orders):
    has_order = customers["customer_id"].isin(orders["customer_id"])
    return customers[~has_order]`, explanation: 'The shortest anti-join: keep rows whose key is not in the other table.', complexity: 'O(n + m).', whenToUse: 'Single-column keys, which is most of the time.' },
      { name: 'merge(indicator=True)', code: `def solve(customers, orders):
    m = customers.merge(orders[["customer_id"]].drop_duplicates(), on="customer_id", how="left", indicator=True)
    return m.loc[m["_merge"] == "left_only", ["customer_id", "name"]]`, explanation: 'indicator=True adds a _merge column saying where each row came from. It also works for keys made of several columns.', complexity: 'O(n + m).', whenToUse: 'Multi-column keys, or reconciliations where you want both, left_only and right_only.' },
    ],
    mistakes: 'If orders["customer_id"] contains NaN and customers has a NaN ID too, isin treats them as a match. Without drop_duplicates() in the merge version, customers with many orders would be repeated before filtering.',
  },
  {
    id: 69, title: 'Invoice and Payment Reconciliation', difficulty: 'Medium', tags: ['merge/join'],
    story: 'Accounting compares invoices with payments. Some invoices are unpaid or partly paid, and one payment refers to an invoice that does not exist.',
    task: 'Return invoice_id, invoiced, paid and gap (invoiced − paid, treating missing as 0) for every invoice_id in either table, sorted by invoice_id.',
    setup: `invoices = pd.DataFrame({"invoice_id": ["I1", "I2", "I3"], "amount": [100.0, 250.0, 80.0]})
payments = pd.DataFrame({"invoice_id": ["I1", "I3", "I4"], "amount": [100.0, 60.0, 40.0]})`,
    signature: 'def solve(invoices: pd.DataFrame, payments: pd.DataFrame) -> pd.DataFrame:', call: 'solve(invoices, payments)',
    expected: { columns: ['invoice_id', 'invoiced', 'paid', 'gap'], rows: [['I1', 100.0, 100.0, 0.0], ['I2', 250.0, null, 250.0], ['I3', 80.0, 60.0, 20.0], ['I4', null, 40.0, -40.0]], dtypes: { invoiced: 'float', paid: 'float', gap: 'float' } },
    hints: ['An outer merge keeps keys from both sides.', 'Rename the amount columns first, or use suffixes=.'],
    approaches: [
      { name: 'Outer merge', code: `def solve(invoices, payments):
    m = invoices.rename(columns={"amount": "invoiced"}).merge(
        payments.rename(columns={"amount": "paid"}), on="invoice_id", how="outer"
    )
    m["gap"] = m["invoiced"].fillna(0) - m["paid"].fillna(0)
    return m.sort_values("invoice_id")`, explanation: 'Keeping invoiced and paid as NaN shows what is missing, while the gap treats missing as 0. Both views matter in a reconciliation.', complexity: 'O(n + m).', whenToUse: 'Matching two sources: bank vs ledger, orders vs shipments.' },
      { name: 'concat on the index', code: `def solve(invoices, payments):
    inv = invoices.set_index("invoice_id")["amount"].rename("invoiced")
    pay = payments.set_index("invoice_id")["amount"].rename("paid")
    m = pd.concat([inv, pay], axis=1).sort_index()
    m["gap"] = m["invoiced"].fillna(0) - m["paid"].fillna(0)
    return m.rename_axis("invoice_id").reset_index()`, explanation: 'concat with axis=1 aligns Series on their index, which is an outer join by default. It is neat when both sides are keyed by the same ID.', complexity: 'O(n + m).', whenToUse: 'Comparing several metrics that share one key.' },
    ],
    mistakes: 'Without renaming, merge produces amount_x and amount_y. Filling invoiced with 0 before the report hides that I4 has no invoice at all.',
  },
  {
    id: 70, title: 'Avoid a Merge Explosion', difficulty: 'Medium', tags: ['merge/join', 'duplicates'],
    story: 'Revenue looks too high after joining sales to the price list. The price list has an accidental duplicate row for one product.',
    task: 'Return sale_id and revenue (qty × price) with exactly one row per sale.',
    setup: `sales = pd.DataFrame({"sale_id": ["S1", "S2", "S3", "S4"], "product": ["P1", "P2", "P2", "P3"], "qty": [2, 1, 3, 1]})
prices = pd.DataFrame({"product": ["P1", "P2", "P2", "P3"], "price": [5.0, 8.0, 8.0, 2.5]})`,
    signature: 'def solve(sales: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales, prices)',
    expected: { columns: ['sale_id', 'revenue'], rows: [['S1', 10.0], ['S2', 8.0], ['S3', 24.0], ['S4', 2.5]], dtypes: { revenue: 'float' } },
    hints: ['Check prices["product"].duplicated(). Every duplicate key multiplies the matching sales rows.', 'Deduplicate first, and use merge(..., validate="many_to_one") to guard against it.'],
    approaches: [
      { name: 'Deduplicate + validate', code: `def solve(sales, prices):
    clean = prices.drop_duplicates("product")
    m = sales.merge(clean, on="product", how="left", validate="many_to_one")
    return m.assign(revenue=m["qty"] * m["price"])[["sale_id", "revenue"]]`, explanation: 'validate="many_to_one" makes pandas raise MergeError if the right table still has duplicate keys, so the problem cannot come back silently.', complexity: 'O(n + m).', whenToUse: 'Every join to a lookup table in production code.' },
      { name: 'map from a unique lookup', code: `def solve(sales, prices):
    price = prices.drop_duplicates("product").set_index("product")["price"]
    return sales.assign(revenue=sales["qty"] * sales["product"].map(price))[["sale_id", "revenue"]]`, explanation: 'map() can never add rows. It raises if the lookup index is not unique, which is another built-in safety check.', complexity: 'O(n + m).', whenToUse: 'Adding one numeric attribute from a lookup.' },
    ],
    mistakes: 'A plain merge here returns 6 rows: S2 and S3 each appear twice, so revenue for P2 is doubled. Always compare len() before and after a join.',
  },
  {
    id: 71, title: 'Stack Two Monthly Exports', difficulty: 'Medium', tags: ['concat'],
    story: 'January and February orders come in separate files. February added a coupon column. You need one table with a month label.',
    task: 'Stack jan and feb into one table with columns order_id, amount, coupon and month ("2024-01" or "2024-02") and a fresh 0..n-1 index.',
    setup: `jan = pd.DataFrame({"order_id": [1, 2], "amount": [20, 35]})
feb = pd.DataFrame({"order_id": [3, 4], "amount": [15, 50], "coupon": ["SAVE5", None]})`,
    signature: 'def solve(jan: pd.DataFrame, feb: pd.DataFrame) -> pd.DataFrame:', call: 'solve(jan, feb)',
    expected: { columns: ['order_id', 'amount', 'coupon', 'month'], rows: [[1, 20, null, '2024-01'], [2, 35, null, '2024-01'], [3, 15, 'SAVE5', '2024-02'], [4, 50, null, '2024-02']] },
    hints: ['pd.concat([a, b]) aligns columns by name and fills missing ones with NaN.', 'Add the month to each part with assign() before stacking. ignore_index=True resets the index.'],
    approaches: [
      { name: 'assign + concat', code: `def solve(jan, feb):
    return pd.concat(
        [jan.assign(month="2024-01"), feb.assign(month="2024-02")],
        ignore_index=True,
    )[["order_id", "amount", "coupon", "month"]]`, explanation: 'Columns are aligned by name, so jan gets NaN in coupon. The final selection fixes the column order explicitly.', complexity: 'O(n).', whenToUse: 'Combining files with the same meaning, such as monthly or regional exports.' },
      { name: 'concat with keys', code: `def solve(jan, feb):
    both = pd.concat({"2024-01": jan, "2024-02": feb}, names=["month", "row"])
    out = both.reset_index(level="month").reset_index(drop=True)
    return out[["order_id", "amount", "coupon", "month"]]`, explanation: 'Passing a dict makes the keys an outer index level, so pandas labels the source for you. Good when stacking many files in a loop.', complexity: 'O(n).', whenToUse: 'Stacking a dict of DataFrames, for example one per file name.' },
    ],
    mistakes: 'DataFrame.append was removed in pandas 2.0, so use pd.concat. Without ignore_index=True you get duplicate index labels (0, 1, 0, 1), which breaks later loc lookups.',
  },
  {
    id: 72, title: 'Revenue by Region and Quarter', difficulty: 'Medium', tags: ['pivot/crosstab'],
    story: 'The board deck needs a small grid: regions as rows, quarters as columns, revenue in the cells, and 0 where a region sold nothing.',
    task: 'Return region, Q1 and Q2 with summed revenue (0 when empty), regions sorted A to Z.',
    setup: `sales = pd.DataFrame({
    "region": ["North", "North", "South", "South", "North", "East"],
    "quarter": ["Q1", "Q2", "Q1", "Q1", "Q1", "Q2"],
    "revenue": [100, 150, 80, 20, 50, 60],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales)',
    expected: { columns: ['region', 'Q1', 'Q2'], rows: [['East', 0, 60], ['North', 150, 150], ['South', 100, 0]] },
    hints: ['pivot_table(index=, columns=, values=, aggfunc="sum", fill_value=0).', 'reset_index() turns region back into a column. rename_axis(columns=None) removes the leftover "quarter" label.'],
    approaches: [
      { name: 'pivot_table', code: `def solve(sales):
    grid = sales.pivot_table(index="region", columns="quarter", values="revenue", aggfunc="sum", fill_value=0)
    return grid.reset_index().rename_axis(columns=None)`, explanation: 'pivot_table groups by index and columns together and aggregates duplicates. North Q1 has two rows (100 + 50).', complexity: 'O(n).', whenToUse: 'Report-style grids and Excel-like summaries.' },
      { name: 'groupby + unstack', code: `def solve(sales):
    grid = sales.groupby(["region", "quarter"])["revenue"].sum().unstack(fill_value=0)
    return grid.reset_index().rename_axis(columns=None)`, explanation: 'unstack() moves the inner index level (quarter) into columns. It is exactly what pivot_table does internally.', complexity: 'O(n).', whenToUse: 'When you already have a grouped Series from earlier steps.' },
    ],
    mistakes: 'pivot() (without _table) raises "Index contains duplicate entries" because North Q1 appears twice. Use pivot_table with an aggfunc.',
  },
  {
    id: 73, title: 'Pass and Fail by Class', difficulty: 'Medium', tags: ['pivot/crosstab'],
    story: 'The head teacher wants to see how many students passed and failed in each class.',
    task: 'Return class, fail and pass counts, one row per class sorted A to Z, with 0 where there are none.',
    setup: `exams = pd.DataFrame({
    "student": ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
    "class": ["A", "A", "B", "B", "B", "A", "C"],
    "result": ["pass", "fail", "pass", "pass", "fail", "pass", "fail"],
})`,
    signature: 'def solve(exams: pd.DataFrame) -> pd.DataFrame:', call: 'solve(exams)',
    expected: { columns: ['class', 'fail', 'pass'], rows: [['A', 1, 2], ['B', 1, 2], ['C', 1, 0]] },
    hints: ['pd.crosstab(rows, columns) counts combinations.', 'Then reset_index() and remove the column axis name.'],
    approaches: [
      { name: 'pd.crosstab', code: `def solve(exams):
    table = pd.crosstab(exams["class"], exams["result"])
    return table.reset_index().rename_axis(columns=None)`, explanation: 'crosstab is made for frequency tables. Pass normalize="index" to get pass rates per class instead of counts.', complexity: 'O(n).', whenToUse: 'Counting combinations of two categories.' },
      { name: 'groupby size + unstack', code: `def solve(exams):
    table = exams.groupby(["class", "result"]).size().unstack(fill_value=0)
    return table.reset_index().rename_axis(columns=None)`, explanation: 'size() counts rows per combination, and unstack spreads results into columns, filling missing combinations with 0.', complexity: 'O(n).', whenToUse: 'When the counts are one step in a larger groupby.' },
    ],
    mistakes: 'value_counts() on two columns gives a long table, not a grid. crosstab(..., margins=True) adds an "All" row and column, useful for reports but not wanted here.',
  },
  {
    id: 74, title: 'Customers by Age Group', difficulty: 'Medium', tags: ['binning'],
    story: 'Marketing segments customers into 18–24, 25–34, 35–49 and 50+. Every group should appear in the report, in age order.',
    task: 'Return age_group and customers (count), in the order 18-24, 25-34, 35-49, 50+.',
    setup: `customers = pd.DataFrame({
    "customer_id": [1, 2, 3, 4, 5, 6, 7],
    "age": [19, 25, 34, 35, 52, 24, 41],
})`,
    signature: 'def solve(customers: pd.DataFrame) -> pd.DataFrame:', call: 'solve(customers)',
    expected: { columns: ['age_group', 'customers'], rows: [['18-24', 2], ['25-34', 2], ['35-49', 2], ['50+', 1]] },
    hints: ['pd.cut with bins=[18, 25, 35, 50, np.inf] and right=False puts 25 into 25-34.', 'value_counts(sort=False) keeps the bin order.'],
    approaches: [
      { name: 'pd.cut + value_counts', code: `def solve(customers):
    groups = pd.cut(
        customers["age"],
        bins=[18, 25, 35, 50, np.inf],
        right=False,
        labels=["18-24", "25-34", "35-49", "50+"],
    )
    return groups.value_counts(sort=False).rename_axis("age_group").reset_index(name="customers")`, explanation: 'right=False means each bin includes its left edge: [25, 35) holds 25 to 34. The result is an ordered categorical, so the bins stay in age order.', complexity: 'O(n log bins).', whenToUse: 'Fixed business bands: ages, price ranges, order sizes.' },
      { name: 'groupby with observed=False', code: `def solve(customers):
    groups = pd.cut(customers["age"], bins=[18, 25, 35, 50, np.inf], right=False, labels=["18-24", "25-34", "35-49", "50+"])
    return customers.groupby(groups, observed=False).size().rename_axis("age_group").reset_index(name="customers")`, explanation: 'observed=False makes groupby show every category, even empty ones. That keeps the report shape stable from month to month.', complexity: 'O(n).', whenToUse: 'Reports that must always show every band.' },
    ],
    mistakes: 'With the default right=True, 25 falls into the first bin (18, 25]. Labels such as "18-24" must match the bin edges you chose.',
  },
  {
    id: 75, title: 'Order Size Quartiles', difficulty: 'Medium', tags: ['binning'],
    story: 'To compare small and large orders, the analyst splits orders into four equal-sized groups by amount: Q1 (smallest) to Q4 (largest).',
    task: 'Return order_id, amount and bucket ("Q1" to "Q4") using quartiles of amount.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "amount": [50, 10, 80, 30, 20, 70, 40, 60],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'amount', 'bucket'], rows: [[1, 50, 'Q3'], [2, 10, 'Q1'], [3, 80, 'Q4'], [4, 30, 'Q2'], [5, 20, 'Q1'], [6, 70, 'Q4'], [7, 40, 'Q2'], [8, 60, 'Q3']] },
    hints: ['pd.qcut(column, q=4) uses quantiles, so each bucket gets roughly the same number of rows.', 'Pass labels=["Q1", "Q2", "Q3", "Q4"].'],
    approaches: [
      { name: 'pd.qcut', code: `def solve(orders):
    return orders.assign(bucket=pd.qcut(orders["amount"], q=4, labels=["Q1", "Q2", "Q3", "Q4"]))`, explanation: 'qcut computes the 25th, 50th and 75th percentiles and cuts there. Compare with cut, which uses equal-width ranges.', complexity: 'O(n log n).', whenToUse: 'Relative segments: top 25% customers, deciles of spend.' },
      { name: 'Percentile rank', code: `def solve(orders):
    pct = orders["amount"].rank(pct=True)
    q = np.ceil(pct * 4).astype(int)
    return orders.assign(bucket="Q" + q.astype(str))`, explanation: 'rank(pct=True) gives each value its position between 0 and 1. Multiplying by 4 and rounding up gives the quartile. It handles ties more predictably than qcut.', complexity: 'O(n log n).', whenToUse: 'When qcut fails with "Bin edges must be unique" because of many repeated values.' },
    ],
    mistakes: 'qcut raises "Bin edges must be unique" when many values are equal (for example lots of zeros). Use rank(method="first") first, or duplicates="drop".',
  },
);
window.dispatchEvent(new Event('dojo:problems'));
