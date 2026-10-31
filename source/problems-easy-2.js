// Pandas Dojo — Problems 26–50 (Easy, part 2)
window.DOJO_PROBLEMS = window.DOJO_PROBLEMS || [];
window.DOJO_PROBLEMS.push(
  {
    id: 26, title: 'City Stats from a Nested Dict', difficulty: 'Easy', tags: ['creating dataframes'],
    story: 'An API returns order stats as a dictionary keyed by city, with each city holding its own small dictionary of numbers.',
    task: 'Build a DataFrame with columns city, orders and revenue, one row per city, in the dictionary\'s order.',
    setup: `stats = {
    "Lagos": {"orders": 120, "revenue": 3400.0},
    "Accra": {"orders": 85, "revenue": 2100.5},
    "Nairobi": {"orders": 97, "revenue": 2875.0},
}`,
    signature: 'def solve(stats: dict) -> pd.DataFrame:', call: 'solve(stats)',
    expected: { columns: ['city', 'orders', 'revenue'], rows: [['Lagos', 120, 3400.0], ['Accra', 85, 2100.5], ['Nairobi', 97, 2875.0]], dtypes: { revenue: 'float' } },
    hints: ['pd.DataFrame.from_dict(stats, orient="index") makes the outer keys the rows.', 'Then turn the index into a city column.'],
    approaches: [
      { name: 'from_dict(orient="index")', code: `def solve(stats):
    df = pd.DataFrame.from_dict(stats, orient="index")
    return df.rename_axis("city").reset_index()`, explanation: 'orient="index" treats each outer key as a row label and each inner dict as that row\'s values. rename_axis names the index before it becomes a column.', complexity: 'O(rows × fields).', whenToUse: 'JSON objects keyed by an ID.' },
      { name: 'List of records', code: `def solve(stats):
    rows = [{"city": city, **values} for city, values in stats.items()]
    return pd.DataFrame(rows)`, explanation: 'Unpacks each inner dict into a record that also carries its key. **values copies the inner fields into the new dict.', complexity: 'O(rows × fields).', whenToUse: 'When you also need to rename or reshape fields while building.' },
    ],
    mistakes: 'pd.DataFrame(stats) without orient makes cities the columns, which is the transpose of what you want. Use .T or orient="index".',
  },
  {
    id: 27, title: 'Add a Revenue Column', difficulty: 'Easy', tags: ['creating dataframes', 'selecting columns'],
    story: 'Each order line has a quantity and a unit price. Finance wants the line revenue next to them.',
    task: 'Return item, qty, unit_price and revenue (qty × unit_price).',
    setup: `lines = pd.DataFrame({
    "item": ["pen", "book", "bag", "ink", "pad"],
    "qty": [3, 1, 2, 4, 5],
    "unit_price": [1.5, 12.0, 25.0, 2.25, 3.0],
})`,
    signature: 'def solve(lines: pd.DataFrame) -> pd.DataFrame:', call: 'solve(lines)',
    expected: { columns: ['item', 'qty', 'unit_price', 'revenue'], rows: [['pen', 3, 1.5, 4.5], ['book', 1, 12.0, 12.0], ['bag', 2, 25.0, 50.0], ['ink', 4, 2.25, 9.0], ['pad', 5, 3.0, 15.0]], dtypes: { unit_price: 'float', revenue: 'float' } },
    hints: ['Arithmetic between two columns works row by row: lines["qty"] * lines["unit_price"].', 'assign(revenue=...) returns a new DataFrame with the extra column.'],
    approaches: [
      { name: 'assign()', code: `def solve(lines):
    return lines.assign(revenue=lines["qty"] * lines["unit_price"])`, explanation: 'Column maths is vectorised and aligned by index. assign never changes the input DataFrame.', complexity: 'O(n).', whenToUse: 'Adding derived columns, especially in method chains.' },
      { name: 'Copy, then set a column', code: `def solve(lines):
    out = lines.copy()
    out["revenue"] = out["qty"] * out["unit_price"]
    return out`, explanation: 'The classic bracket assignment. copy() protects the caller\'s DataFrame from being modified.', complexity: 'O(n).', whenToUse: 'Step-by-step scripts where you add several columns one at a time.' },
    ],
    mistakes: 'Looping over rows to multiply values is slow and unnecessary. Writing lines["revenue"] = ... directly changes the input table for every later caller.',
  },
  {
    id: 28, title: 'Table Size and Missing Cells', difficulty: 'Easy', tags: ['basic stats', 'missing values'],
    story: 'Before analysing a new HR export, you write a quick health check: how big is it, and how many cells are empty?',
    task: 'Return a one-row DataFrame with rows, columns and missing_cells (total NaN/None cells).',
    setup: `staff = pd.DataFrame({
    "emp_id": [1, 2, 3, 4, 5, 6],
    "name": ["Ama", "Bo", "Cleo", "Dev", "Eko", "Fai"],
    "dept": ["IT", None, "HR", "IT", "Sales", "HR"],
    "salary": [52000, 61000, np.nan, 58000, np.nan, 47000],
})`,
    signature: 'def solve(staff: pd.DataFrame) -> pd.DataFrame:', call: 'solve(staff)',
    expected: { columns: ['rows', 'columns', 'missing_cells'], rows: [[6, 4, 3]] },
    hints: ['staff.shape is a (rows, columns) tuple.', 'isna() gives True/False per cell. Summing twice counts them all.'],
    approaches: [
      { name: 'shape + isna().sum().sum()', code: `def solve(staff):
    n_rows, n_cols = staff.shape
    return pd.DataFrame({"rows": [n_rows], "columns": [n_cols], "missing_cells": [int(staff.isna().sum().sum())]})`, explanation: 'The first sum counts missing cells per column, and the second adds those up.', complexity: 'O(rows × columns).', whenToUse: 'Quick data-quality checks when a file arrives.' },
      { name: 'NumPy values', code: `def solve(staff):
    return pd.DataFrame([{
        "rows": len(staff),
        "columns": len(staff.columns),
        "missing_cells": int(staff.isna().to_numpy().sum()),
    }])`, explanation: 'to_numpy() turns the mask into one 2-D array, so a single sum counts everything.', complexity: 'O(rows × columns).', whenToUse: 'Very wide tables, where one NumPy sum is slightly faster.' },
    ],
    mistakes: 'staff.size counts all cells (24), not rows. count() counts non-missing values, so it is the opposite of what you need here.',
  },
  {
    id: 29, title: 'Most Recent Sessions', difficulty: 'Easy', tags: ['loc/iloc'],
    story: 'The session log is in time order. You want a quick look at the three most recent sessions.',
    task: 'Return the last 3 rows with the columns session_id and pages.',
    setup: `sessions = pd.DataFrame({
    "session_id": ["s1", "s2", "s3", "s4", "s5", "s6"],
    "user": ["u1", "u2", "u1", "u3", "u2", "u4"],
    "pages": [3, 8, 1, 5, 2, 7],
})`,
    signature: 'def solve(sessions: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sessions)',
    expected: { columns: ['session_id', 'pages'], rows: [['s4', 5], ['s5', 2], ['s6', 7]] },
    hints: ['tail(3) returns the last three rows.', 'Negative positions work with iloc: iloc[-3:].'],
    approaches: [
      { name: 'tail()', code: `def solve(sessions):
    return sessions.tail(3)[["session_id", "pages"]]`, explanation: 'tail(n) is the counterpart of head(n) and keeps the original order.', complexity: 'O(k).', whenToUse: 'Checking the latest records in a log.' },
      { name: 'iloc with negative positions', code: `def solve(sessions):
    return sessions.iloc[-3:][["session_id", "pages"]]`, explanation: 'Negative positions count from the end, like Python lists. iloc[-3:] means "from the third-last row to the end".', complexity: 'O(k).', whenToUse: 'Positional slices from the end, such as iloc[-10:-5].' },
    ],
    mistakes: 'tail() only means "most recent" if the table is sorted by time. Sort first when you are not sure.',
  },
  {
    id: 30, title: 'A Block of Rows and Columns', difficulty: 'Easy', tags: ['loc/iloc'],
    story: 'A colleague asks for "rows 3 to 5 and the price and stock columns" of the product table to paste into a slide.',
    task: 'Return the 3rd, 4th and 5th rows with the columns price and stock.',
    setup: `products = pd.DataFrame({
    "product": ["Green Tea", "Chai", "Earl Grey", "Jasmine", "Rooibos", "Oolong"],
    "price": [4.5, 5.0, 4.75, 6.25, 3.9, 7.1],
    "stock": [120, 0, 45, 30, 75, 12],
    "rating": [4.6, 4.8, 4.1, 4.4, 3.9, 4.7],
})`,
    signature: 'def solve(products: pd.DataFrame) -> pd.DataFrame:', call: 'solve(products)',
    expected: { columns: ['price', 'stock'], rows: [[4.75, 45], [6.25, 30], [3.9, 75]], dtypes: { price: 'float' } },
    hints: ['Rows 3 to 5 (counting from 1) are positions 2, 3 and 4.', 'iloc[2:5] stops before position 5.'],
    approaches: [
      { name: 'iloc rows + column names', code: `def solve(products):
    return products.iloc[2:5][["price", "stock"]]`, explanation: 'Positions for the rows and names for the columns keep the code robust if columns are reordered later.', complexity: 'O(k).', whenToUse: 'Most positional row selections.' },
      { name: 'iloc on both axes', code: `def solve(products):
    return products.iloc[2:5, 1:3]`, explanation: 'Columns 1 and 2 are price and stock. Short, but it breaks silently if someone inserts a new column.', complexity: 'O(k).', whenToUse: 'Quick one-off exploration only.' },
    ],
    mistakes: 'People count from 1 and Python counts from 0, so "row 3" is position 2. iloc[2:5] excludes position 5, while loc[2:5] would include label 5.',
  },
  {
    id: 31, title: 'Fix One Stock Count', difficulty: 'Easy', tags: ['loc/iloc'],
    story: 'A warehouse recount found 40 units of Matcha, but the system still shows 0. You need to correct that single value.',
    task: 'Set the stock of the product "Matcha" to 40 and return the whole table.',
    setup: `products = pd.DataFrame({
    "product": ["Green Tea", "Matcha", "Chai"],
    "stock": [120, 0, 45],
})`,
    signature: 'def solve(products: pd.DataFrame) -> pd.DataFrame:', call: 'solve(products)',
    expected: { columns: ['product', 'stock'], rows: [['Green Tea', 120], ['Matcha', 40], ['Chai', 45]] },
    hints: ['Use loc with a row mask and a column name on the left side of =.', 'Work on a copy so the input stays unchanged.'],
    approaches: [
      { name: 'loc[mask, column] = value', code: `def solve(products):
    out = products.copy()
    out.loc[out["product"] == "Matcha", "stock"] = 40
    return out`, explanation: 'One loc call selects the cell and assigns to it. This is the safe way to update values in pandas.', complexity: 'O(n) for the mask.', whenToUse: 'Every conditional update.' },
      { name: 'mask() on the column', code: `def solve(products):
    return products.assign(stock=products["stock"].mask(products["product"] == "Matcha", 40))`, explanation: 'mask(cond, value) replaces values where the condition is True and returns a new Series, so the input never changes.', complexity: 'O(n).', whenToUse: 'Conditional updates inside method chains.' },
    ],
    mistakes: 'Chained indexing like out[out["product"] == "Matcha"]["stock"] = 40 updates a temporary copy, raises SettingWithCopyWarning, and leaves the table unchanged.',
  },
  {
    id: 32, title: 'Tea Products', difficulty: 'Easy', tags: ['boolean filtering', 'string methods'],
    story: 'The shop is planning a tea promotion and needs every product whose name mentions "tea", in any capitalisation.',
    task: 'Return the product column for products whose name contains "tea" (case-insensitive).',
    setup: `catalog = pd.DataFrame({
    "product": ["Green Tea", "Coffee Beans", "Iced tea", "Teapot", "Mug"],
    "price": [4.5, 9.0, 3.5, 22.0, 6.0],
})`,
    signature: 'def solve(catalog: pd.DataFrame) -> pd.DataFrame:', call: 'solve(catalog)',
    expected: { columns: ['product'], rows: [['Green Tea'], ['Iced tea'], ['Teapot']] },
    hints: ['catalog["product"].str.contains("tea", case=False) gives a True/False mask.', 'Select the column with double brackets to keep a DataFrame.'],
    approaches: [
      { name: 'str.contains(case=False)', code: `def solve(catalog):
    mask = catalog["product"].str.contains("tea", case=False)
    return catalog.loc[mask, ["product"]]`, explanation: 'case=False ignores capitalisation. Pass regex=False for plain text searches with special characters like "+".', complexity: 'O(n × name length).', whenToUse: 'Keyword search in text columns.' },
      { name: 'Lowercase first', code: `def solve(catalog):
    return catalog[catalog["product"].str.lower().str.contains("tea")][["product"]]`, explanation: 'Lowercasing first is explicit and works the same way in other tools, such as SQL with LOWER().', complexity: 'O(n × name length).', whenToUse: 'When you lowercase the column for other reasons too.' },
    ],
    mistakes: '"Teapot" matches because it contains "tea". To match whole words only, use a regex like r"\\btea\\b". A missing name makes contains return NaN, so pass na=False.',
  },
  {
    id: 33, title: 'Exclude Cancelled and Refunded', difficulty: 'Easy', tags: ['boolean filtering'],
    story: 'Net sales should only include orders that were not cancelled or refunded.',
    task: 'Return all columns for orders whose status is not "cancelled" and not "refunded".',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6],
    "status": ["paid", "cancelled", "paid", "refunded", "shipped", "paid"],
    "amount": [30, 45, 12, 60, 80, 25],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'status', 'amount'], rows: [[1, 'paid', 30], [3, 'paid', 12], [5, 'shipped', 80], [6, 'paid', 25]] },
    hints: ['isin(["cancelled", "refunded"]) marks the rows to drop.', 'Flip it with ~.'],
    approaches: [
      { name: '~isin()', code: `def solve(orders):
    return orders[~orders["status"].isin(["cancelled", "refunded"])]`, explanation: 'isin checks membership against a list, and ~ keeps everything else.', complexity: 'O(n).', whenToUse: 'Excluding a list of values.' },
      { name: 'query with not in', code: `def solve(orders):
    excluded = ["cancelled", "refunded"]
    return orders.query("status not in @excluded")`, explanation: 'The @ prefix lets query() use a Python variable, so the exclusion list can come from configuration.', complexity: 'O(n).', whenToUse: 'Filters driven by settings or user input.' },
    ],
    mistakes: 'orders["status"] != "cancelled" | ... without parentheses raises an error. Missing statuses (NaN) are kept by ~isin, so decide whether that is what you want.',
  },
  {
    id: 34, title: 'Three Most Expensive Products', difficulty: 'Easy', tags: ['sorting'],
    story: 'The homepage shows a "premium picks" row with the three most expensive products.',
    task: 'Return product and price for the 3 highest prices, most expensive first.',
    setup: `catalog = pd.DataFrame({
    "product": ["lamp", "rug", "vase", "chair", "desk", "stool"],
    "price": [45.0, 120.0, 30.0, 85.0, 210.0, 25.0],
})`,
    signature: 'def solve(catalog: pd.DataFrame) -> pd.DataFrame:', call: 'solve(catalog)',
    expected: { columns: ['product', 'price'], rows: [['desk', 210.0], ['rug', 120.0], ['chair', 85.0]], dtypes: { price: 'float' } },
    hints: ['nlargest(3, "price") returns the top 3 rows by price.', 'Or sort descending and take head(3).'],
    approaches: [
      { name: 'nlargest()', code: `def solve(catalog):
    return catalog.nlargest(3, "price")`, explanation: 'nlargest finds the top rows without sorting the whole table and returns them in descending order.', complexity: 'O(n log k).', whenToUse: 'Top-N lists on large tables.' },
      { name: 'sort_values + head', code: `def solve(catalog):
    return catalog.sort_values("price", ascending=False).head(3)`, explanation: 'Sorts everything and keeps the first three. Easier to extend with a tie-break column.', complexity: 'O(n log n).', whenToUse: 'When ties need a second sort key.' },
    ],
    mistakes: 'nlargest only works on numeric columns. sort_values without ascending=False gives the cheapest products.',
  },
  {
    id: 35, title: 'Orders in March', difficulty: 'Easy', tags: ['boolean filtering', 'datetime'],
    story: 'The March sales review needs every order placed between 1 and 31 March 2024. Dates are stored as ISO text.',
    task: 'Return order_id and order_date for orders in March 2024.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6],
    "order_date": ["2024-02-28", "2024-03-01", "2024-03-15", "2024-03-31", "2024-04-01", "2023-03-10"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['order_id', 'order_date'], rows: [[2, '2024-03-01'], [3, '2024-03-15'], [4, '2024-03-31']] },
    hints: ['ISO dates (YYYY-MM-DD) compare correctly as text.', 'Or convert with pd.to_datetime and check .dt.year and .dt.month.'],
    approaches: [
      { name: 'between() on ISO strings', code: `def solve(orders):
    return orders[orders["order_date"].between("2024-03-01", "2024-03-31")]`, explanation: 'Because ISO dates sort like numbers, a text range check works. This only holds for zero-padded YYYY-MM-DD strings.', complexity: 'O(n).', whenToUse: 'Quick filters on clean ISO date text.' },
      { name: 'Datetime parts', code: `def solve(orders):
    d = pd.to_datetime(orders["order_date"])
    return orders[(d.dt.year == 2024) & (d.dt.month == 3)]`, explanation: 'Converting to datetime works for any date format and avoids month-length mistakes (no need to know March has 31 days).', complexity: 'O(n).', whenToUse: 'Any non-ISO date format, or monthly filters in loops.' },
    ],
    mistakes: 'Checking only the month also matches March 2023. With timestamps such as "2024-03-31 18:00", the text range "2024-03-31" excludes the evening, so compare with "< 2024-04-01" instead.',
  },
  {
    id: 36, title: 'Columns in Alphabetical Order', difficulty: 'Easy', tags: ['selecting columns', 'sorting'],
    story: 'A data dictionary lists columns alphabetically. To compare it with the real table, you reorder the table\'s columns the same way.',
    task: 'Return the table with its columns sorted A to Z.',
    setup: `items = pd.DataFrame({
    "price": [4.5, 9.0],
    "name": ["Tea", "Coffee"],
    "id": [1, 2],
    "category": ["drink", "drink"],
})`,
    signature: 'def solve(items: pd.DataFrame) -> pd.DataFrame:', call: 'solve(items)',
    expected: { columns: ['category', 'id', 'name', 'price'], rows: [['drink', 1, 'Tea', 4.5], ['drink', 2, 'Coffee', 9.0]], dtypes: { price: 'float' } },
    hints: ['sorted(items.columns) gives the names in order. Select with them.', 'Or sort the column axis: sort_index(axis=1).'],
    approaches: [
      { name: 'Select sorted names', code: `def solve(items):
    return items[sorted(items.columns)]`, explanation: 'Selecting with a list reorders the columns to match the list.', complexity: 'O(n × columns).', whenToUse: 'Any custom column order.' },
      { name: 'sort_index(axis=1)', code: `def solve(items):
    return items.sort_index(axis=1)`, explanation: 'Column labels form an index too, so sort_index can sort them. axis=1 means columns.', complexity: 'O(columns log columns).', whenToUse: 'Method chains.' },
    ],
    mistakes: 'Uppercase letters sort before lowercase ones ("Zip" before "age"). Use key=str.lower when names have mixed case.',
  },
  {
    id: 37, title: 'Biggest Moves First', difficulty: 'Easy', tags: ['sorting'],
    story: 'The market recap leads with the stocks that moved the most today, up or down.',
    task: 'Return ticker and change sorted by the size of the change (absolute value), largest first.',
    setup: `moves = pd.DataFrame({
    "ticker": ["ACME", "BOLT", "CORE", "DYNA", "EPIC"],
    "change": [-3.2, 1.5, 4.0, -0.5, 2.1],
})`,
    signature: 'def solve(moves: pd.DataFrame) -> pd.DataFrame:', call: 'solve(moves)',
    expected: { columns: ['ticker', 'change'], rows: [['CORE', 4.0], ['ACME', -3.2], ['EPIC', 2.1], ['BOLT', 1.5], ['DYNA', -0.5]], dtypes: { change: 'float' } },
    hints: ['sort_values(key=...) sorts by a transformed value without changing the data.', 'key=lambda s: s.abs().'],
    approaches: [
      { name: 'sort_values(key=abs)', code: `def solve(moves):
    return moves.sort_values("change", key=lambda s: s.abs(), ascending=False)`, explanation: 'key transforms the column only for sorting, so the original signs stay in the output.', complexity: 'O(n log n).', whenToUse: 'Sorting by magnitude, length or a cleaned version of text.' },
      { name: 'Helper column', code: `def solve(moves):
    return (
        moves.assign(size=moves["change"].abs())
        .sort_values("size", ascending=False)
        .drop(columns="size")
    )`, explanation: 'A temporary column makes the sort key visible, which helps when debugging.', complexity: 'O(n log n).', whenToUse: 'Older pandas versions, or when the key is reused.' },
    ],
    mistakes: 'Sorting by change descending puts the big drop (ACME) near the bottom. Remember to drop helper columns before returning.',
  },
  {
    id: 38, title: 'Prefix the Score Columns', difficulty: 'Easy', tags: ['renaming'],
    story: 'Quarter 1 scores will be merged with later quarters, so each score column needs a "q1_" prefix. The student column must keep its name.',
    task: 'Rename math and art to q1_math and q1_art. Keep student unchanged.',
    setup: `scores = pd.DataFrame({
    "student": ["Ari", "Bo", "Cy"],
    "math": [78, 92, 65],
    "art": [88, 70, 95],
})`,
    signature: 'def solve(scores: pd.DataFrame) -> pd.DataFrame:', call: 'solve(scores)',
    expected: { columns: ['student', 'q1_math', 'q1_art'], rows: [['Ari', 78, 88], ['Bo', 92, 70], ['Cy', 65, 95]] },
    hints: ['add_prefix("q1_") renames every column, including student.', 'Build a rename dict for every column except student.'],
    approaches: [
      { name: 'Dict comprehension + rename', code: `def solve(scores):
    mapping = {c: f"q1_{c}" for c in scores.columns if c != "student"}
    return scores.rename(columns=mapping)`, explanation: 'Builds the old-to-new mapping in one line and leaves the key column alone.', complexity: 'O(columns).', whenToUse: 'Renaming a rule-based subset of columns.' },
      { name: 'set_index + add_prefix', code: `def solve(scores):
    return scores.set_index("student").add_prefix("q1_").reset_index()`, explanation: 'Moving student into the index protects it, because add_prefix only renames columns.', complexity: 'O(n).', whenToUse: 'Many value columns that all get the same prefix.' },
    ],
    mistakes: 'scores.add_prefix("q1_") alone gives q1_student, which then breaks merges on student.',
  },
  {
    id: 39, title: 'Readable Payment Status', difficulty: 'Easy', tags: ['renaming', 'apply/map/np.where'],
    story: 'The billing system stores status as a single letter: P, U or R. The finance report should show full words.',
    task: 'Return invoice and status with P → paid, U → unpaid and R → refunded.',
    setup: `bills = pd.DataFrame({
    "invoice": ["I1", "I2", "I3", "I4", "I5"],
    "status": ["P", "U", "P", "R", "U"],
})`,
    signature: 'def solve(bills: pd.DataFrame) -> pd.DataFrame:', call: 'solve(bills)',
    expected: { columns: ['invoice', 'status'], rows: [['I1', 'paid'], ['I2', 'unpaid'], ['I3', 'paid'], ['I4', 'refunded'], ['I5', 'unpaid']] },
    hints: ['replace({"P": "paid", ...}) swaps values that match.', 'map(dict) does the same but gives NaN for unknown codes.'],
    approaches: [
      { name: 'replace()', code: `def solve(bills):
    return bills.assign(status=bills["status"].replace({"P": "paid", "U": "unpaid", "R": "refunded"}))`, explanation: 'replace changes matching values and leaves everything else as it is.', complexity: 'O(n).', whenToUse: 'Fixing a few known values while keeping the rest.' },
      { name: 'map()', code: `def solve(bills):
    labels = {"P": "paid", "U": "unpaid", "R": "refunded"}
    return bills.assign(status=bills["status"].map(labels))`, explanation: 'map translates every value through the dict. Unknown codes become NaN, which makes them easy to find.', complexity: 'O(n).', whenToUse: 'Full translations where every value should be known.' },
    ],
    mistakes: 'A new code like "X" silently survives replace(). After map(), check status.isna().sum() to catch unknown codes.',
  },
  {
    id: 40, title: 'Delivery Time Summary', difficulty: 'Easy', tags: ['basic stats'],
    story: 'The operations weekly needs four numbers about delivery times: the fastest, the slowest, the average and the median.',
    task: 'Return a one-row DataFrame with min_minutes, max_minutes, mean_minutes and median_minutes. Ignore missing times.',
    setup: `deliveries = pd.DataFrame({
    "delivery_id": ["D1", "D2", "D3", "D4", "D5", "D6"],
    "minutes": [25, 40, 35, np.nan, 50, 30],
})`,
    signature: 'def solve(deliveries: pd.DataFrame) -> pd.DataFrame:', call: 'solve(deliveries)',
    expected: { columns: ['min_minutes', 'max_minutes', 'mean_minutes', 'median_minutes'], rows: [[25.0, 50.0, 36.0, 35.0]], dtypes: { min_minutes: 'float', max_minutes: 'float', mean_minutes: 'float', median_minutes: 'float' } },
    hints: ['agg(["min", "max", "mean", "median"]) computes all four at once.', 'Reshape the result into one row.'],
    approaches: [
      { name: 'agg with a list', code: `def solve(deliveries):
    stats = deliveries["minutes"].agg(["min", "max", "mean", "median"])
    return stats.add_suffix("_minutes").to_frame().T.reset_index(drop=True)`, explanation: 'agg returns a Series indexed by statistic name. add_suffix renames min to min_minutes and so on, and .T makes it a row.', complexity: 'O(n) plus O(n log n) for the median.', whenToUse: 'Several statistics on one column.' },
      { name: 'One method per metric', code: `def solve(deliveries):
    m = deliveries["minutes"]
    return pd.DataFrame({
        "min_minutes": [m.min()], "max_minutes": [m.max()],
        "mean_minutes": [m.mean()], "median_minutes": [m.median()],
    })`, explanation: 'Very explicit. Each metric can get its own rounding or rule later.', complexity: 'O(n) per metric.', whenToUse: 'KPI rows with mixed rules.' },
    ],
    mistakes: 'The mean (36) is pulled up by the slow 50-minute delivery, and the median (35) is not. Report both when data is skewed.',
  },
  {
    id: 41, title: 'Score Spread', difficulty: 'Easy', tags: ['basic stats'],
    story: 'A teacher wants to know how spread out the test scores are, not just the average.',
    task: 'Return a one-row DataFrame with mean, std (sample standard deviation, rounded to 2) and score_range (max − min).',
    setup: `tests = pd.DataFrame({
    "student": ["a", "b", "c", "d", "e"],
    "score": [60, 70, 80, 90, 100],
})`,
    signature: 'def solve(tests: pd.DataFrame) -> pd.DataFrame:', call: 'solve(tests)',
    expected: { columns: ['mean', 'std', 'score_range'], rows: [[80.0, 15.81, 40]], dtypes: { mean: 'float', std: 'float' } },
    hints: ['Series.std() uses the sample formula (ddof=1) by default.', 'score_range is max() − min().'],
    approaches: [
      { name: 'Series methods', code: `def solve(tests):
    s = tests["score"]
    return pd.DataFrame({"mean": [s.mean()], "std": [round(s.std(), 2)], "score_range": [s.max() - s.min()]})`, explanation: 'mean, std, max and min are all one-pass NumPy operations under the hood.', complexity: 'O(n).', whenToUse: 'Spread summaries for any metric.' },
      { name: 'describe()', code: `def solve(tests):
    d = tests["score"].describe()
    return pd.DataFrame({"mean": [d["mean"]], "std": [round(d["std"], 2)], "score_range": [d["max"] - d["min"]]})`, explanation: 'describe() already contains mean, std, min and max, so one call gives everything.', complexity: 'O(n log n) because of the quartiles.', whenToUse: 'First look at a numeric column.' },
    ],
    mistakes: 'np.std(tests["score"].to_numpy()) uses ddof=0 and gives 14.14, a different answer. Say which formula you used in a report.',
  },
  {
    id: 42, title: 'Missing Values per Column', difficulty: 'Easy', tags: ['missing values', 'basic stats'],
    story: 'Before a CRM migration, you report what share of each field is empty.',
    task: 'Return column and missing_pct (rounded to 1) for every column, in the table\'s column order.',
    setup: `contacts = pd.DataFrame({
    "name": ["Ada", "Ben", "Cy", "Dee", "Eli"],
    "email": ["ada@x.com", None, "cy@x.com", None, "eli@x.com"],
    "phone": ["555-1", "555-2", None, "555-4", "555-5"],
})`,
    signature: 'def solve(contacts: pd.DataFrame) -> pd.DataFrame:', call: 'solve(contacts)',
    expected: { columns: ['column', 'missing_pct'], rows: [['name', 0.0], ['email', 40.0], ['phone', 20.0]], dtypes: { missing_pct: 'float' } },
    hints: ['isna().mean() gives the share of missing values per column, because True counts as 1.', 'Multiply by 100 and turn the Series into a DataFrame.'],
    approaches: [
      { name: 'isna().mean()', code: `def solve(contacts):
    pct = contacts.isna().mean().mul(100).round(1)
    return pct.rename_axis("column").reset_index(name="missing_pct")`, explanation: 'The mean of a True/False column is the share of True values. That trick is used everywhere in pandas.', complexity: 'O(rows × columns).', whenToUse: 'Data-quality reports.' },
      { name: 'Counts ÷ rows', code: `def solve(contacts):
    pct = contacts.isna().sum() / len(contacts) * 100
    return pd.DataFrame({"column": pct.index, "missing_pct": pct.round(1).values})`, explanation: 'Spells out the formula, so it is clear what the denominator is.', complexity: 'O(rows × columns).', whenToUse: 'When reviewers prefer explicit arithmetic.' },
    ],
    mistakes: 'Empty strings ("") are not NaN, so they are not counted. Replace them first with replace("", np.nan) if they mean missing.',
  },
  {
    id: 43, title: 'Ticket Status Counts with Missing', difficulty: 'Easy', tags: ['value_counts', 'missing values'],
    story: 'The support lead wants every ticket counted, including tickets that have no status yet.',
    task: 'Return status and tickets, using "missing" for tickets without a status, sorted by tickets descending and then status.',
    setup: `tickets = pd.DataFrame({
    "ticket": [1, 2, 3, 4, 5, 6, 7],
    "status": ["open", "closed", "open", None, "open", None, "closed"],
})`,
    signature: 'def solve(tickets: pd.DataFrame) -> pd.DataFrame:', call: 'solve(tickets)',
    expected: { columns: ['status', 'tickets'], rows: [['open', 3], ['closed', 2], ['missing', 2]] },
    hints: ['value_counts() drops missing values unless you pass dropna=False.', 'Filling missing values with "missing" first is the simplest route.'],
    approaches: [
      { name: 'fillna, then value_counts', code: `def solve(tickets):
    counts = tickets["status"].fillna("missing").value_counts().reset_index(name="tickets")
    return counts.sort_values(["tickets", "status"], ascending=[False, True])`, explanation: 'Filling first turns missing into a normal category with a readable name.', complexity: 'O(n).', whenToUse: 'Reports where missing values must be visible.' },
      { name: 'value_counts(dropna=False)', code: `def solve(tickets):
    counts = tickets["status"].value_counts(dropna=False)
    counts.index = counts.index.fillna("missing")
    out = counts.rename_axis("status").reset_index(name="tickets")
    return out.sort_values(["tickets", "status"], ascending=[False, True])`, explanation: 'dropna=False keeps a NaN entry in the result, and you rename it afterwards.', complexity: 'O(n).', whenToUse: 'When you must not modify the original column.' },
    ],
    mistakes: 'Plain value_counts() reports only 5 tickets. Ties (closed and missing, both 2) need an explicit tie-break to be stable.',
  },
  {
    id: 44, title: 'Sessions by City and Device', difficulty: 'Easy', tags: ['value_counts'],
    story: 'The UX team wants to know which city–device combinations are most common.',
    task: 'Return city, device and sessions (count), sorted by sessions descending.',
    setup: `sessions = pd.DataFrame({
    "city": ["Lagos", "Lagos", "Accra", "Lagos", "Accra", "Lagos"],
    "device": ["mobile", "mobile", "mobile", "desktop", "mobile", "mobile"],
})`,
    signature: 'def solve(sessions: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sessions)',
    expected: { columns: ['city', 'device', 'sessions'], rows: [['Lagos', 'mobile', 3], ['Accra', 'mobile', 2], ['Lagos', 'desktop', 1]] },
    hints: ['DataFrame.value_counts(["city", "device"]) counts combinations of columns.', 'reset_index(name="sessions") gives a tidy table.'],
    approaches: [
      { name: 'DataFrame.value_counts()', code: `def solve(sessions):
    return sessions.value_counts(["city", "device"]).reset_index(name="sessions")`, explanation: 'DataFrame.value_counts counts unique rows over the chosen columns and sorts by count.', complexity: 'O(n).', whenToUse: 'Frequency of combinations.' },
      { name: 'groupby().size()', code: `def solve(sessions):
    counts = sessions.groupby(["city", "device"]).size().reset_index(name="sessions")
    return counts.sort_values("sessions", ascending=False)`, explanation: 'Same counts, but groupby sorts alphabetically, so you sort by count yourself.', complexity: 'O(n).', whenToUse: 'When you also need other aggregates per combination.' },
    ],
    mistakes: 'Counting city and device separately loses the combination. A rare combination missing from the data does not show as 0. Use crosstab for a full grid.',
  },
  {
    id: 45, title: 'Distinct Values per Column', difficulty: 'Easy', tags: ['unique/nunique'],
    story: 'Profiling a new table: how many different values does each column have? Low counts suggest categories, high counts suggest IDs.',
    task: 'Return column and distinct (number of distinct non-missing values), in column order.',
    setup: `orders = pd.DataFrame({
    "customer": ["C1", "C2", "C1", "C3", "C2"],
    "product": ["mug", "mug", "tee", "mug", "cap"],
    "city": ["Oslo", "Oslo", "Oslo", None, "Bergen"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:', call: 'solve(orders)',
    expected: { columns: ['column', 'distinct'], rows: [['customer', 3], ['product', 3], ['city', 2]] },
    hints: ['DataFrame.nunique() returns one count per column.', 'Turn the Series into a DataFrame with named columns.'],
    approaches: [
      { name: 'DataFrame.nunique()', code: `def solve(orders):
    return orders.nunique().rename_axis("column").reset_index(name="distinct")`, explanation: 'nunique skips NaN by default. Pass dropna=False to count missing values as one extra value.', complexity: 'O(rows × columns).', whenToUse: 'Profiling and choosing which columns to make categorical.' },
      { name: 'Dict comprehension', code: `def solve(orders):
    counts = {c: orders[c].nunique() for c in orders.columns}
    return pd.DataFrame({"column": list(counts), "distinct": list(counts.values())})`, explanation: 'Loops over columns explicitly, which is handy if each column needs its own rule.', complexity: 'O(rows × columns).', whenToUse: 'Custom profiling logic per column.' },
    ],
    mistakes: 'len(orders["city"].unique()) counts None as a value and gives 3. nunique() is the safer default.',
  },
  {
    id: 46, title: 'Products in First-Seen Order', difficulty: 'Easy', tags: ['unique/nunique'],
    story: 'A launch timeline should list products in the order they first appeared in the sales log, each only once.',
    task: 'Return a single column product with each product once, in order of first appearance.',
    setup: `sales = pd.DataFrame({
    "day": [1, 1, 2, 2, 3, 3, 4],
    "product": ["tea", "mug", "tea", "pot", "mug", "cup", "pot"],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:', call: 'solve(sales)',
    expected: { columns: ['product'], rows: [['tea'], ['mug'], ['pot'], ['cup']] },
    hints: ['unique() keeps the order of first appearance.', 'drop_duplicates() does the same on a DataFrame.'],
    approaches: [
      { name: 'unique()', code: `def solve(sales):
    return pd.DataFrame({"product": sales["product"].unique()})`, explanation: 'unique() is hash-based and does not sort, so the first-seen order is preserved.', complexity: 'O(n).', whenToUse: 'Distinct values where order matters.' },
      { name: 'drop_duplicates()', code: `def solve(sales):
    return sales[["product"]].drop_duplicates()`, explanation: 'Stays a DataFrame and keeps the first occurrence of each value.', complexity: 'O(n).', whenToUse: 'Distinct combinations of several columns.' },
    ],
    mistakes: 'sorted(set(...)) loses the first-seen order. A plain set has no reliable order at all.',
  },
  {
    id: 47, title: 'Count Duplicate Rows', difficulty: 'Easy', tags: ['dropping', 'duplicates'],
    story: 'An export was run twice by mistake, so some rows appear more than once. Before cleaning, you measure the damage.',
    task: 'Return a one-row DataFrame with total_rows, duplicate_rows (exact repeats of an earlier row) and unique_rows.',
    setup: `log = pd.DataFrame({
    "order_id": [1, 2, 3, 2, 4, 5, 3],
    "amount": [10, 20, 30, 20, 40, 50, 30],
})`,
    signature: 'def solve(log: pd.DataFrame) -> pd.DataFrame:', call: 'solve(log)',
    expected: { columns: ['total_rows', 'duplicate_rows', 'unique_rows'], rows: [[7, 2, 5]] },
    hints: ['duplicated() marks every repeat of an earlier row as True.', 'Sum it to count repeats.'],
    approaches: [
      { name: 'duplicated().sum()', code: `def solve(log):
    dups = int(log.duplicated().sum())
    return pd.DataFrame({"total_rows": [len(log)], "duplicate_rows": [dups], "unique_rows": [len(log) - dups]})`, explanation: 'The first occurrence is not a duplicate, only later copies are, so unique + duplicates = total.', complexity: 'O(n).', whenToUse: 'Data-quality checks before deduplicating.' },
      { name: 'Compare with drop_duplicates()', code: `def solve(log):
    unique = len(log.drop_duplicates())
    return pd.DataFrame([{"total_rows": len(log), "duplicate_rows": len(log) - unique, "unique_rows": unique}])`, explanation: 'Counts the rows that would remain after cleaning, and derives the duplicates from that.', complexity: 'O(n).', whenToUse: 'When you are about to drop duplicates anyway.' },
    ],
    mistakes: 'duplicated(keep=False) marks all copies, including the first, and gives 4 instead of 2.',
  },
  {
    id: 48, title: 'Drop Contacts Without Email', difficulty: 'Easy', tags: ['dropping', 'missing values'],
    story: 'An email campaign can only use contacts with an email address. A missing phone number is fine.',
    task: 'Return all columns for contacts that have an email.',
    setup: `contacts = pd.DataFrame({
    "name": ["Ada", "Ben", "Cy", "Dee", "Eli", "Fay"],
    "email": ["ada@x.com", None, "cy@x.com", "dee@x.com", None, "fay@x.com"],
    "phone": ["555-1", "555-2", None, "555-4", "555-5", "555-6"],
})`,
    signature: 'def solve(contacts: pd.DataFrame) -> pd.DataFrame:', call: 'solve(contacts)',
    expected: { columns: ['name', 'email', 'phone'], rows: [['Ada', 'ada@x.com', '555-1'], ['Cy', 'cy@x.com', null], ['Dee', 'dee@x.com', '555-4'], ['Fay', 'fay@x.com', '555-6']] },
    hints: ['dropna() removes rows with missing values in any column by default.', 'Use subset=["email"] to only look at email.'],
    approaches: [
      { name: 'dropna(subset=)', code: `def solve(contacts):
    return contacts.dropna(subset=["email"])`, explanation: 'subset limits which columns are checked, so Cy (no phone) stays.', complexity: 'O(n).', whenToUse: 'Removing rows that lack required fields.' },
      { name: 'notna() mask', code: `def solve(contacts):
    return contacts[contacts["email"].notna()]`, explanation: 'Same result as a boolean filter, and easy to combine with other conditions.', complexity: 'O(n).', whenToUse: 'When the rule has more parts, such as "has email and opted in".' },
    ],
    mistakes: 'dropna() without subset also removes Cy, because Cy has no phone. Empty strings are not NaN, so dropna keeps them.',
  },
  {
    id: 49, title: 'Remove Temporary Columns', difficulty: 'Easy', tags: ['dropping', 'selecting columns'],
    story: 'A notebook left helper columns behind, all starting with "tmp_". They must not reach the final report.',
    task: 'Return the table without any column whose name starts with "tmp_".',
    setup: `report = pd.DataFrame({
    "region": ["North", "South"],
    "tmp_flag": [True, False],
    "revenue": [500, 300],
    "tmp_rank": [1, 2],
})`,
    signature: 'def solve(report: pd.DataFrame) -> pd.DataFrame:', call: 'solve(report)',
    expected: { columns: ['region', 'revenue'], rows: [['North', 500], ['South', 300]] },
    hints: ['report.columns.str.startswith("tmp_") gives a True/False mask over column names.', 'Use ~ with loc[:, mask].'],
    approaches: [
      { name: 'Column mask', code: `def solve(report):
    return report.loc[:, ~report.columns.str.startswith("tmp_")]`, explanation: 'String methods work on the column Index, giving a mask that loc can apply to columns.', complexity: 'O(columns) + O(n).', whenToUse: 'Dropping columns by naming pattern.' },
      { name: 'drop() with a list', code: `def solve(report):
    temp = [c for c in report.columns if c.startswith("tmp_")]
    return report.drop(columns=temp)`, explanation: 'Builds the list of columns to remove first, so you can print or log them.', complexity: 'O(columns) + O(n).', whenToUse: 'When the dropped columns should be visible in logs.' },
    ],
    mistakes: 'str.contains("tmp") would also drop a column such as "temperature_tmpl". Use startswith for prefixes.',
  },
  {
    id: 50, title: 'Strip Header and Total Rows', difficulty: 'Easy', tags: ['dropping', 'loc/iloc'],
    story: 'A spreadsheet export repeated the header as the first data row and added a TOTAL row at the bottom. Neither is real data.',
    task: 'Return the table without its first and last rows. Keep the values as they are.',
    setup: `raw = pd.DataFrame({
    "product": ["product", "Tea", "Coffee", "Cocoa", "TOTAL"],
    "price": ["price", "4.5", "6.0", "3.25", "13.75"],
})`,
    signature: 'def solve(raw: pd.DataFrame) -> pd.DataFrame:', call: 'solve(raw)',
    expected: { columns: ['product', 'price'], rows: [['Tea', '4.5'], ['Coffee', '6.0'], ['Cocoa', '3.25']] },
    hints: ['iloc[1:-1] skips the first row and stops before the last.', 'Or drop the labels raw.index[[0, -1]].'],
    approaches: [
      { name: 'iloc[1:-1]', code: `def solve(raw):
    return raw.iloc[1:-1]`, explanation: 'Positional slicing from the second row to the one before the last, whatever the labels are.', complexity: 'O(n).', whenToUse: 'Trimming known junk rows from exports.' },
      { name: 'drop() first and last labels', code: `def solve(raw):
    return raw.drop(index=raw.index[[0, -1]])`, explanation: 'Looks up the labels at the first and last positions and drops them by label.', complexity: 'O(n).', whenToUse: 'When the rows to drop are found by position but removed by label.' },
    ],
    mistakes: 'Because of the header row, price is text. Convert it with pd.to_numeric after trimming. When reading files, read_csv(skiprows=1, skipfooter=1, engine="python") avoids the junk in the first place.',
  },
);
window.dispatchEvent(new Event('dojo:problems'));
