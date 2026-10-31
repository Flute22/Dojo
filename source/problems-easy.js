// Pandas Dojo — Problems 1–25 (Easy)
// Schema: { id, title, difficulty, tags, story, task, setup, signature, call,
//           expected: { columns, rows, dtypes? }, ignoreOrder?, checkDtype?,
//           hints: [..], approaches: [{ name, code, explanation, complexity, whenToUse }], mistakes }
// pd and np are available in setup and solution code.
window.DOJO_PROBLEMS = window.DOJO_PROBLEMS || [];
window.DOJO_PROBLEMS.push(
  {
    id: 1,
    title: 'Build a Product Catalog',
    difficulty: 'Easy',
    tags: ['creating dataframes'],
    story: 'You run a small online tea shop. Your supplier emailed three plain Python lists: product names, prices, and units in stock. You want them in one table so you can start analysing the catalog.',
    task: 'Build a DataFrame with the columns product, price and in_stock (in that order), one row per product, in the original order.',
    setup: `names = ["Green Tea", "Chai", "Earl Grey", "Jasmine", "Rooibos"]
prices = [4.5, 5.0, 4.75, 6.25, 3.9]
stock = [120, 0, 45, 30, 75]`,
    signature: 'def solve(names: list, prices: list, stock: list) -> pd.DataFrame:',
    call: 'solve(names, prices, stock)',
    expected: {
      columns: ['product', 'price', 'in_stock'],
      rows: [['Green Tea', 4.5, 120], ['Chai', 5.0, 0], ['Earl Grey', 4.75, 45], ['Jasmine', 6.25, 30], ['Rooibos', 3.9, 75]],
      dtypes: { price: 'float' },
    },
    hints: [
      'pd.DataFrame accepts a dictionary: each key becomes a column name and each list becomes that column.',
      'pd.DataFrame({"product": names, ...}). Dictionaries keep insertion order, so the columns come out in the order you write them.',
    ],
    approaches: [
      {
        name: 'Dictionary of lists',
        code: `def solve(names, prices, stock):
    return pd.DataFrame({
        "product": names,
        "price": prices,
        "in_stock": stock,
    })`,
        explanation: 'Each key becomes a column name and each list becomes the column values. If the lists have different lengths, pandas raises a ValueError, which protects you from silently misaligned data.',
        complexity: 'O(n) time and memory. pandas copies the lists into typed NumPy arrays (float64 for price, int64 for in_stock).',
        whenToUse: 'The default when data arrives column by column, for example arrays from an API or quick test data.',
      },
      {
        name: 'Rows with zip()',
        code: `def solve(names, prices, stock):
    rows = list(zip(names, prices, stock))
    return pd.DataFrame(rows, columns=["product", "price", "in_stock"])`,
        explanation: 'zip() pairs the i-th item of each list into a tuple, so you get one tuple per row. Column names are passed separately. Be aware that zip() stops at the shortest list, so a missing value drops a row without any warning.',
        complexity: 'O(n). Builds an intermediate list of tuples, so it uses a little more memory.',
        whenToUse: 'When data naturally comes as rows: database cursor results, CSV readers, or loops that build one record at a time.',
      },
      {
        name: 'List of records (dicts)',
        code: `def solve(names, prices, stock):
    records = [
        {"product": n, "price": p, "in_stock": s}
        for n, p, s in zip(names, prices, stock)
    ]
    return pd.DataFrame.from_records(records)`,
        explanation: 'Each dict is one row with named fields. Column order follows the keys of the first record, and keys missing from a record become NaN.',
        complexity: 'O(n), the slowest of the three because of the per-row dicts. Fine for thousands of rows.',
        whenToUse: 'JSON-like data from web APIs, where every row already has field names.',
      },
    ],
    mistakes: 'pd.DataFrame(names, prices, stock) does not create three columns: the second argument is index and the third is columns. Also, zip() silently truncates to the shortest list, so check len() when lists come from different sources.',
  },
  {
    id: 2,
    title: 'Daily Store Revenue from Records',
    difficulty: 'Easy',
    tags: ['creating dataframes', 'missing values'],
    story: 'Every evening your three shops send a small JSON message with the day\'s revenue. Some messages are incomplete, and one shop adds a free-text note you do not need.',
    task: 'Build a DataFrame from records with exactly the columns date, store and revenue, in that order. A missing revenue should become NaN. Ignore any other keys.',
    setup: `records = [
    {"date": "2024-03-01", "store": "Downtown", "revenue": 1840.0},
    {"date": "2024-03-01", "store": "Airport", "revenue": 2310.5, "note": "busy flight day"},
    {"date": "2024-03-01", "store": "Mall"},
    {"store": "Downtown", "date": "2024-03-02", "revenue": 1675.25},
    {"date": "2024-03-02", "store": "Airport", "revenue": 1990.0},
    {"date": "2024-03-02", "store": "Mall", "revenue": 0.0},
]`,
    signature: 'def solve(records: list) -> pd.DataFrame:',
    call: 'solve(records)',
    expected: {
      columns: ['date', 'store', 'revenue'],
      rows: [
        ['2024-03-01', 'Downtown', 1840.0], ['2024-03-01', 'Airport', 2310.5], ['2024-03-01', 'Mall', null],
        ['2024-03-02', 'Downtown', 1675.25], ['2024-03-02', 'Airport', 1990.0], ['2024-03-02', 'Mall', 0.0],
      ],
      dtypes: { revenue: 'float' },
    },
    hints: [
      'pd.DataFrame(records) turns a list of dicts into rows. A key that is missing from a record becomes NaN.',
      'Pass columns=[...] to choose which keys to keep and in which order. Extra keys like note are dropped.',
    ],
    approaches: [
      {
        name: 'DataFrame with columns=',
        code: `def solve(records):
    return pd.DataFrame(records, columns=["date", "store", "revenue"])`,
        explanation: 'For a list of dicts, columns= works as a selector: only those keys are kept, in that order, and any key that is missing becomes NaN. Key order inside each dict does not matter.',
        complexity: 'O(rows × columns).',
        whenToUse: 'JSON-like rows where you already know the schema you want.',
      },
      {
        name: 'Build everything, then select',
        code: `def solve(records):
    df = pd.DataFrame(records)
    return df[["date", "store", "revenue"]]`,
        explanation: 'Builds all keys (including note) and then selects. Easy to read, but it raises KeyError if no record has a revenue key at all. The first approach would create an all-NaN column instead.',
        complexity: 'O(rows × all keys). Slightly more memory for the unused columns.',
        whenToUse: 'Exploring data where you first want to see every field that exists.',
      },
      {
        name: 'json_normalize + reindex',
        code: `def solve(records):
    df = pd.json_normalize(records)
    return df.reindex(columns=["date", "store", "revenue"])`,
        explanation: 'json_normalize also flattens nested dicts, so {"store": {"name": "Mall"}} becomes a store.name column. reindex(columns=...) picks columns and creates missing ones as NaN, never raising.',
        complexity: 'O(rows × keys), plus the cost of walking nested structures.',
        whenToUse: 'Nested API responses, such as orders with a nested customer object.',
      },
    ],
    mistakes: 'pd.DataFrame(records) on its own keeps the extra note column. Writing 0 for a missing revenue hides the gap: NaN means unknown, 0 means no sales. Keep them distinct.',
  },
  {
    id: 3,
    title: 'Customer Contact List',
    difficulty: 'Easy',
    tags: ['selecting columns'],
    story: 'Marketing wants to send a thank-you email to every customer. They only need each customer\'s name and email address, not their purchase history.',
    task: 'Return only the name and email columns, in that order.',
    setup: `customers = pd.DataFrame({
    "customer_id": [101, 102, 103, 104, 105, 106],
    "name": ["Amara Okafor", "Liam Chen", "Sofia Rossi", "Noah Patel", "Yuki Tanaka", "Elena García"],
    "email": ["amara@mail.com", "liam.c@mail.com", None, "noah.p@mail.com", "yuki@mail.com", "elena.g@mail.com"],
    "city": ["Lagos", "Toronto", "Milan", "Pune", "Osaka", "Madrid"],
    "lifetime_value": [420.5, 1310.0, 89.9, 760.25, 2045.0, 310.0],
})`,
    signature: 'def solve(customers: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(customers)',
    expected: {
      columns: ['name', 'email'],
      rows: [
        ['Amara Okafor', 'amara@mail.com'], ['Liam Chen', 'liam.c@mail.com'], ['Sofia Rossi', null],
        ['Noah Patel', 'noah.p@mail.com'], ['Yuki Tanaka', 'yuki@mail.com'], ['Elena García', 'elena.g@mail.com'],
      ],
    },
    hints: [
      'Put a list of column names inside the brackets: df[[...]].',
      'The outer [] is the selection and the inner [] is a Python list. A single bracket, df["name"], returns a Series.',
    ],
    approaches: [
      {
        name: 'Double brackets',
        code: `def solve(customers):
    return customers[["name", "email"]]`,
        explanation: 'Passing a list of names returns a new DataFrame with those columns in the order of the list.',
        complexity: 'O(n) to copy the selected columns.',
        whenToUse: 'Everyday column selection. It is the most readable form.',
      },
      {
        name: '.loc with all rows',
        code: `def solve(customers):
    return customers.loc[:, ["name", "email"]]`,
        explanation: 'The : means all rows, and the list picks the columns. The same pattern extends to filtering rows at the same time: loc[mask, cols]. It is also the safe form when you later assign values.',
        complexity: 'O(n).',
        whenToUse: 'When you select rows and columns together, or plan to assign into the selection.',
      },
      {
        name: 'filter(items=)',
        code: `def solve(customers):
    return customers.filter(items=["name", "email"])`,
        explanation: 'filter keeps the listed columns and silently ignores names that do not exist. That is handy for optional columns, but it can also hide a typo. It also supports like= and regex= for pattern-based selection.',
        complexity: 'O(n).',
        whenToUse: 'Selecting columns by pattern, for example every column that starts with "q1_".',
      },
    ],
    mistakes: 'customers["name", "email"] (single brackets with two names) looks for one column called ("name", "email") and raises KeyError. If you plan to modify the selection, add .copy() to avoid SettingWithCopyWarning.',
  },
  {
    id: 4,
    title: 'Numeric Columns Only',
    difficulty: 'Easy',
    tags: ['selecting columns', 'dtypes'],
    story: 'HR wants a quick correlation analysis of employee numbers. First you need a table with only the numeric columns. Zip codes are stored as text on purpose, because some start with 0.',
    task: 'Return a DataFrame with only the numeric columns, in their original order.',
    setup: `employees = pd.DataFrame({
    "emp_id": [1, 2, 3, 4, 5, 6],
    "name": ["Grace", "Omar", "Mei", "Lucas", "Priya", "Tom"],
    "department": ["Sales", "IT", "IT", "Finance", "Sales", "HR"],
    "salary": [52000, 78000, 81000, 66000, np.nan, 49000],
    "zip_code": ["02139", "10001", "94105", "60601", "02139", "73301"],
    "years": [3, 7, 9, 5, 2, 1],
})`,
    signature: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(employees)',
    expected: {
      columns: ['emp_id', 'salary', 'years'],
      rows: [[1, 52000.0, 3], [2, 78000.0, 7], [3, 81000.0, 9], [4, 66000.0, 5], [5, null, 2], [6, 49000.0, 1]],
      dtypes: { salary: 'float' },
    },
    hints: [
      'Every column has a dtype. Look at employees.dtypes: text columns show as object.',
      'select_dtypes(include="number") keeps int and float columns.',
    ],
    approaches: [
      {
        name: 'select_dtypes',
        code: `def solve(employees):
    return employees.select_dtypes(include="number")`,
        explanation: 'Keeps every column whose dtype is a number (int or float). salary is float64 because it contains NaN, and it still counts as numeric.',
        complexity: 'O(n × selected columns).',
        whenToUse: 'Preparing data for describe(), corr(), or scaling, where only numbers make sense.',
      },
      {
        name: 'Check each column\'s dtype',
        code: `from pandas.api.types import is_numeric_dtype

def solve(employees):
    cols = [c for c in employees.columns if is_numeric_dtype(employees[c])]
    return employees[cols]`,
        explanation: 'Loops over column names and keeps those that pass is_numeric_dtype. More code, but you can add your own rules, for example "numeric and not an id column".',
        complexity: 'O(columns) to decide, then O(n) to copy.',
        whenToUse: 'When the rule for which columns to keep has exceptions.',
      },
      {
        name: 'Boolean mask over dtypes',
        code: `def solve(employees):
    is_num = employees.dtypes.apply(lambda t: t.kind in "iuf")
    return employees.loc[:, is_num]`,
        explanation: 'Each dtype has a one-letter kind: i (signed int), u (unsigned int), f (float), O (object). The result is a True/False Series indexed by column name, which .loc uses to pick columns.',
        complexity: 'O(columns) + O(n).',
        whenToUse: 'When you want precise control over which number types count, such as excluding bool.',
      },
    ],
    mistakes: 'Converting zip_code to int drops the leading zero (02139 becomes 2139), so identifiers should stay as text. Note that is_numeric_dtype() treats bool columns as numeric while select_dtypes("number") does not.',
  },
  {
    id: 5,
    title: 'First Three Sessions',
    difficulty: 'Easy',
    tags: ['loc/iloc'],
    story: 'Your analytics export of website sessions uses the session number as the index, starting at 1001. You want a quick look at the first three rows.',
    task: 'Return the first 3 rows with only the page and duration_sec columns.',
    setup: `sessions = pd.DataFrame(
    {
        "user": ["u_17", "u_04", "u_17", "u_22", "u_09", "u_04", "u_31"],
        "page": ["/home", "/pricing", "/blog", "/home", "/signup", "/docs", "/pricing"],
        "duration_sec": [35, 212, 48, 5, 130, 301, 77],
        "device": ["mobile", "desktop", "mobile", "tablet", "desktop", "desktop", "mobile"],
    },
    index=[1001, 1002, 1003, 1004, 1005, 1006, 1007],
)`,
    signature: 'def solve(sessions: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(sessions)',
    expected: {
      columns: ['page', 'duration_sec'],
      rows: [['/home', 35], ['/pricing', 212], ['/blog', 48]],
    },
    hints: [
      'iloc selects by position (0, 1, 2…), loc selects by label (here 1001, 1002…).',
      'sessions.iloc[:3] gives the first three rows. Then select the two columns.',
    ],
    approaches: [
      {
        name: 'head() + column list',
        code: `def solve(sessions):
    return sessions.head(3)[["page", "duration_sec"]]`,
        explanation: 'head(3) returns the first three rows by position, whatever the index labels are. Then the column list picks the two columns.',
        complexity: 'O(k) for k rows.',
        whenToUse: 'Quick inspection. It reads almost like English.',
      },
      {
        name: 'iloc for rows and columns',
        code: `def solve(sessions):
    cols = [sessions.columns.get_loc(c) for c in ["page", "duration_sec"]]
    return sessions.iloc[:3, cols]`,
        explanation: 'iloc works only with positions, so get_loc() turns column names into positions. Then one iloc call slices both axes, without hard-coding numbers like 1 and 2.',
        complexity: 'O(k).',
        whenToUse: 'When you need positional slicing on both axes, for example in a loop over windows of rows.',
      },
      {
        name: 'loc with labels',
        code: `def solve(sessions):
    return sessions.loc[1001:1003, ["page", "duration_sec"]]`,
        explanation: 'Label slicing includes the end label, so 1003 is part of the result (Python slices exclude the end). It only works because you know the labels, and it breaks if the export starts at a different number.',
        complexity: 'O(k) with a sorted index.',
        whenToUse: 'When labels have meaning, such as dates in a time-series index.',
      },
    ],
    mistakes: 'sessions.loc[:3] returns zero rows here, because loc looks for labels up to 3 and the labels start at 1001. Remember that loc slices include the end label, while iloc slices exclude it.',
  },
  {
    id: 6,
    title: 'Look Up Patient Visits',
    difficulty: 'Easy',
    tags: ['loc/iloc', 'index'],
    story: 'A hospital stores visits with visit_id as the index. A nurse asks for two specific visits for a follow-up call: V103 and V107.',
    task: 'Return visits V103 and V107 (in that order) with the columns visit_id, patient and department. visit_id must be a normal column in your result.',
    setup: `visits = pd.DataFrame({
    "visit_id": ["V101", "V102", "V103", "V104", "V105", "V106", "V107", "V108"],
    "patient": ["R. Singh", "A. Moreau", "J. Smith", "L. Novak", "J. Smith", "K. Ito", "M. Haddad", "A. Moreau"],
    "department": ["Cardiology", "ER", "Orthopedics", "ER", "Cardiology", "Pediatrics", "Neurology", "ER"],
    "wait_min": [25, 5, 40, np.nan, 15, 30, 55, 10],
}).set_index("visit_id")`,
    signature: 'def solve(visits: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(visits)',
    expected: {
      columns: ['visit_id', 'patient', 'department'],
      rows: [['V103', 'J. Smith', 'Orthopedics'], ['V107', 'M. Haddad', 'Neurology']],
    },
    hints: [
      'Because visit_id is the index, visits.loc["V103"] finds that row by label. Pass a list of labels to get several rows.',
      'After selecting, call .reset_index() to turn the index back into a column.',
    ],
    approaches: [
      {
        name: 'loc with a list of labels',
        code: `def solve(visits):
    picked = visits.loc[["V103", "V107"], ["patient", "department"]]
    return picked.reset_index()`,
        explanation: 'loc takes a list of row labels and a list of columns. The rows come back in the order of your list. reset_index() moves visit_id from the index into the first column.',
        complexity: 'O(k) lookups on a hash-based index.',
        whenToUse: 'Fetching known records by ID. Index lookups are fast on large tables.',
      },
      {
        name: 'isin() on the index',
        code: `def solve(visits):
    mask = visits.index.isin(["V103", "V107"])
    return visits.loc[mask, ["patient", "department"]].reset_index()`,
        explanation: 'Builds a True/False mask from the index. Rows keep the table\'s order (not the list\'s order), and IDs that do not exist are ignored instead of raising KeyError.',
        complexity: 'O(n) to scan the index.',
        whenToUse: 'When some IDs may be missing, such as a lookup list sent by another team.',
      },
      {
        name: 'Reset first, then filter a column',
        code: `def solve(visits):
    flat = visits.reset_index()
    keep = flat["visit_id"].isin(["V103", "V107"])
    return flat.loc[keep, ["visit_id", "patient", "department"]]`,
        explanation: 'Turns the index into a regular column first, so everything after is ordinary column filtering. Many analysts prefer keeping IDs as columns until they really need an index.',
        complexity: 'O(n).',
        whenToUse: 'Pipelines where an index would be lost or confusing in later merges.',
      },
    ],
    mistakes: 'Forgetting reset_index() leaves visit_id in the index, so your result looks like it is missing a column. Also, loc with a label that does not exist raises KeyError. Use isin() or reindex() when IDs might be missing.',
  },
  {
    id: 7,
    title: 'Every Other Trading Day',
    difficulty: 'Easy',
    tags: ['loc/iloc'],
    story: 'To make a lighter chart of a stock\'s closing prices, you keep every second trading day: the first, third, fifth, and so on.',
    task: 'Return every second row, starting from the first, with the columns date and close.',
    setup: `prices = pd.DataFrame({
    "date": ["2024-05-01", "2024-05-02", "2024-05-03", "2024-05-06", "2024-05-07",
             "2024-05-08", "2024-05-09", "2024-05-10", "2024-05-13"],
    "ticker": ["ACME"] * 9,
    "close": [101.2, 102.8, 101.9, 103.4, 104.1, 103.7, 105.0, 104.6, 106.3],
    "volume": [12000, 15300, 11800, 17650, 16400, 9900, 21000, 14250, 18800],
})`,
    signature: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(prices)',
    expected: {
      columns: ['date', 'close'],
      rows: [['2024-05-01', 101.2], ['2024-05-03', 101.9], ['2024-05-07', 104.1], ['2024-05-09', 105.0], ['2024-05-13', 106.3]],
      dtypes: { close: 'float' },
    },
    hints: [
      'Python slices accept a step: start:stop:step.',
      'prices.iloc[::2] takes rows 0, 2, 4, …',
    ],
    approaches: [
      {
        name: 'iloc with a step',
        code: `def solve(prices):
    return prices.iloc[::2][["date", "close"]]`,
        explanation: '::2 means from the start to the end in steps of 2. iloc uses positions, so it works whatever the index labels are.',
        complexity: 'O(n/2).',
        whenToUse: 'Down-sampling rows for charts or quick previews of long tables.',
      },
      {
        name: 'Positional mask with NumPy',
        code: `def solve(prices):
    keep = np.arange(len(prices)) % 2 == 0
    return prices.loc[keep, ["date", "close"]]`,
        explanation: 'np.arange gives the positions 0..n-1. The modulo turns them into a True/False mask. This generalises easily: % 3 == 1 means every third row starting at the second.',
        complexity: 'O(n) for the mask.',
        whenToUse: 'Rules that a simple slice cannot express, or combining a positional rule with other conditions.',
      },
      {
        name: 'Index modulo (only with a default index)',
        code: `def solve(prices):
    return prices.loc[prices.index % 2 == 0, ["date", "close"]]`,
        explanation: 'This works here only because the index is the default 0..n-1. After filtering or sorting, labels are no longer positions, and this picks the wrong rows without any error.',
        complexity: 'O(n).',
        whenToUse: 'Rarely. It is shown as a warning about mixing up labels and positions.',
      },
    ],
    mistakes: 'Treating index labels as positions (the third approach) breaks after any filter or sort. Use iloc or np.arange when you mean positions.',
  },
  {
    id: 8,
    title: 'High-Value Orders',
    difficulty: 'Easy',
    tags: ['boolean filtering'],
    story: 'Finance wants to review every order above $100. Some orders have no amount yet because payment is still processing.',
    task: 'Return all columns for orders where amount is greater than 100. Orders with a missing amount should not be included.',
    setup: `orders = pd.DataFrame({
    "order_id": [5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008],
    "customer": ["Ana", "Ben", "Chloe", "Dev", "Ana", "Femi", "Gus", "Hana"],
    "amount": [89.99, 150.0, 100.0, np.nan, 320.5, 45.0, 100.01, 210.0],
    "status": ["shipped", "shipped", "pending", "pending", "shipped", "cancelled", "shipped", "pending"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['order_id', 'customer', 'amount', 'status'],
      rows: [[5002, 'Ben', 150.0, 'shipped'], [5005, 'Ana', 320.5, 'shipped'], [5007, 'Gus', 100.01, 'shipped'], [5008, 'Hana', 210.0, 'pending']],
      dtypes: { amount: 'float' },
    },
    hints: [
      'orders["amount"] > 100 gives a True/False Series. Put it inside orders[...] to keep the True rows.',
      'Any comparison with NaN is False, so missing amounts drop out on their own.',
    ],
    approaches: [
      {
        name: 'Boolean mask',
        code: `def solve(orders):
    return orders[orders["amount"] > 100]`,
        explanation: 'The comparison runs on the whole column at once (vectorised) and returns True/False per row. Indexing with that mask keeps the True rows.',
        complexity: 'O(n), vectorised in NumPy.',
        whenToUse: 'The everyday way to filter rows.',
      },
      {
        name: 'query()',
        code: `def solve(orders):
    return orders.query("amount > 100")`,
        explanation: 'query() takes the condition as a string and lets you use column names directly. It reads well in long method chains. You can reference Python variables with @, for example query("amount > @limit").',
        complexity: 'O(n). On large tables it can use numexpr for speed.',
        whenToUse: 'Method chains and conditions that combine many columns.',
      },
      {
        name: 'Named mask with .gt() and .loc',
        code: `def solve(orders):
    is_high_value = orders["amount"].gt(100)
    return orders.loc[is_high_value]`,
        explanation: '.gt() is the method form of >. Naming the mask documents the business rule, and loc[mask] is the safe form when you later assign, for example orders.loc[is_high_value, "review"] = True.',
        complexity: 'O(n).',
        whenToUse: 'When the same rule is reused or needs a clear name in a report.',
      },
    ],
    mistakes: '"Above $100" excludes exactly 100.00, so use > rather than >=. NaN > 100 is False, so missing amounts disappear silently. If you need to see them, check orders["amount"].isna() separately.',
  },
  {
    id: 9,
    title: 'Shipped Orders to Key Cities',
    difficulty: 'Easy',
    tags: ['boolean filtering'],
    story: 'Your logistics partner is auditing deliveries to Lagos and Nairobi. They need every order that has been shipped to either city.',
    task: 'Return all columns for orders with status equal to "shipped" and city equal to Lagos or Nairobi.',
    setup: `orders = pd.DataFrame({
    "order_id": [7101, 7102, 7103, 7104, 7105, 7106, 7107, 7108, 7109],
    "city": ["Lagos", "Accra", "Nairobi", "Lagos", "Kampala", "Nairobi", "Lagos", "Accra", "Nairobi"],
    "status": ["shipped", "shipped", "pending", "shipped", "shipped", "shipped", "returned", "pending", "shipped"],
    "items": [2, 1, 4, 3, 1, 2, 5, 2, 1],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['order_id', 'city', 'status', 'items'],
      rows: [[7101, 'Lagos', 'shipped', 2], [7104, 'Lagos', 'shipped', 3], [7106, 'Nairobi', 'shipped', 2], [7109, 'Nairobi', 'shipped', 1]],
    },
    hints: [
      'Combine conditions with & (and) and | (or). Wrap each condition in parentheses.',
      'orders["city"].isin(["Lagos", "Nairobi"]) is cleaner than two == checks joined with |.',
    ],
    approaches: [
      {
        name: 'Named masks with & and isin()',
        code: `def solve(orders):
    shipped = orders["status"] == "shipped"
    target_city = orders["city"].isin(["Lagos", "Nairobi"])
    return orders[shipped & target_city]`,
        explanation: 'Each condition is its own named mask, so there are no precedence problems. isin() checks membership in a list in one vectorised step.',
        complexity: 'O(n). isin uses a hash table, so long lists stay fast.',
        whenToUse: 'Most real filters. Named masks make the business rules easy to review.',
      },
      {
        name: 'query() with in',
        code: `def solve(orders):
    return orders.query("status == 'shipped' and city in ['Lagos', 'Nairobi']")`,
        explanation: 'Inside query() you can write and, or and in like normal Python, and pandas translates them into vectorised operations.',
        complexity: 'O(n).',
        whenToUse: 'Readable one-liners and filters that you might store as configuration strings.',
      },
      {
        name: 'Explicit | with parentheses',
        code: `def solve(orders):
    is_shipped = orders["status"] == "shipped"
    in_city = (orders["city"] == "Lagos") | (orders["city"] == "Nairobi")
    return orders[is_shipped & in_city]`,
        explanation: 'This spells out the "or". In Python, & and | are evaluated before ==, so each comparison needs its own parentheses.',
        complexity: 'O(n), one pass per comparison.',
        whenToUse: 'When the "or" conditions are on different columns and isin() does not apply.',
      },
    ],
    mistakes: 'Using and / or between Series raises "The truth value of a Series is ambiguous". Writing orders.status == "shipped" & orders.city == "Lagos" without parentheses fails because & runs before ==.',
  },
  {
    id: 10,
    title: 'Students Who Need Support',
    difficulty: 'Easy',
    tags: ['boolean filtering'],
    story: 'A school wants to offer extra tutoring. A student qualifies if their exam score is below 50 or their attendance is below 75%.',
    task: 'Return student, score and attendance for students with score below 50 OR attendance below 0.75.',
    setup: `students = pd.DataFrame({
    "student": ["Aisha", "Bruno", "Carmen", "Dmitri", "Esi", "Farid", "Greta", "Hiro"],
    "grade": [10, 11, 10, 12, 11, 10, 12, 11],
    "score": [72, 45, 50, 88, 39, 67, 49.5, 91],
    "attendance": [0.92, 0.81, 0.74, 0.70, 0.95, 0.75, 0.88, 0.60],
})`,
    signature: 'def solve(students: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(students)',
    expected: {
      columns: ['student', 'score', 'attendance'],
      rows: [['Bruno', 45.0, 0.81], ['Carmen', 50.0, 0.74], ['Dmitri', 88.0, 0.7], ['Esi', 39.0, 0.95], ['Greta', 49.5, 0.88], ['Hiro', 91.0, 0.6]],
      dtypes: { score: 'float', attendance: 'float' },
    },
    hints: [
      'Use | for "or". Each side needs its own parentheses.',
      'Filter and pick columns in one step with .loc[mask, ["student", "score", "attendance"]].',
    ],
    approaches: [
      {
        name: '| with .loc',
        code: `def solve(students):
    needs_help = (students["score"] < 50) | (students["attendance"] < 0.75)
    return students.loc[needs_help, ["student", "score", "attendance"]]`,
        explanation: 'Either condition being True is enough. loc applies the row mask and the column list together.',
        complexity: 'O(n).',
        whenToUse: 'Standard rule-based segmentation.',
      },
      {
        name: 'query() with or',
        code: `def solve(students):
    flagged = students.query("score < 50 or attendance < 0.75")
    return flagged[["student", "score", "attendance"]]`,
        explanation: 'The rule reads exactly like the business definition, which helps when a non-programmer reviews it.',
        complexity: 'O(n).',
        whenToUse: 'Rules that need to be easy to read and change.',
      },
      {
        name: 'Negate the "doing fine" rule',
        code: `def solve(students):
    doing_fine = (students["score"] >= 50) & (students["attendance"] >= 0.75)
    return students.loc[~doing_fine, ["student", "score", "attendance"]]`,
        explanation: '~ flips True and False. Sometimes the business defines the good group, and everyone else needs help. Careful: a NaN score makes the comparison False, so ~ would flag that student. That may or may not be what you want.',
        complexity: 'O(n).',
        whenToUse: 'When the healthy group is the one that is clearly defined.',
      },
    ],
    mistakes: 'Using & instead of | finds students who fail both rules. Exactly 50 or exactly 0.75 does not qualify, because the rule says "below".',
  },
  {
    id: 11,
    title: 'Deliveries in a Distance Band',
    difficulty: 'Easy',
    tags: ['boolean filtering'],
    story: 'A courier company pays a flat fee for medium-distance trips: from 2 km to 5 km, including both ends.',
    task: 'Return delivery_id, courier and distance_km for deliveries between 2 and 5 km inclusive, in the original order.',
    setup: `deliveries = pd.DataFrame({
    "delivery_id": ["D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10"],
    "courier": ["Kofi", "Lena", "Kofi", "Ravi", "Lena", "Ravi", "Kofi", "Lena", "Ravi", "Kofi"],
    "distance_km": [1.8, 2.0, 3.4, 5.0, 5.1, np.nan, 4.25, 0.9, 2.75, 7.3],
    "minutes": [12, 15, 22, 31, 35, 18, 27, 8, 19, 44],
})`,
    signature: 'def solve(deliveries: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(deliveries)',
    expected: {
      columns: ['delivery_id', 'courier', 'distance_km'],
      rows: [['D02', 'Lena', 2.0], ['D03', 'Kofi', 3.4], ['D04', 'Ravi', 5.0], ['D07', 'Kofi', 4.25], ['D09', 'Ravi', 2.75]],
      dtypes: { distance_km: 'float' },
    },
    hints: [
      'Series.between(left, right) checks left <= x <= right.',
      'By default between() includes both ends (inclusive="both").',
    ],
    approaches: [
      {
        name: 'between()',
        code: `def solve(deliveries):
    in_band = deliveries["distance_km"].between(2, 5)
    return deliveries.loc[in_band, ["delivery_id", "courier", "distance_km"]]`,
        explanation: 'between() makes range checks short and clear. Use inclusive="left", "right" or "neither" when the business rule excludes an end.',
        complexity: 'O(n).',
        whenToUse: 'Price bands, age groups, date windows and any other range rule.',
      },
      {
        name: 'Two comparisons',
        code: `def solve(deliveries):
    d = deliveries["distance_km"]
    return deliveries.loc[(d >= 2) & (d <= 5), ["delivery_id", "courier", "distance_km"]]`,
        explanation: 'Spells out both boundaries. It is useful when the two ends need different columns or different rules.',
        complexity: 'O(n).',
        whenToUse: 'Ranges where each side has a separate business meaning.',
      },
      {
        name: 'Chained comparison in query()',
        code: `def solve(deliveries):
    return deliveries.query("2 <= distance_km <= 5")[["delivery_id", "courier", "distance_km"]]`,
        explanation: 'query() supports the maths-style chain a <= x <= b. Plain Python on a Series does not, as the mistakes note explains.',
        complexity: 'O(n).',
        whenToUse: 'Readable one-line range filters.',
      },
    ],
    mistakes: 'Writing 2 <= deliveries["distance_km"] <= 5 outside query() raises "The truth value of a Series is ambiguous". NaN distances are never between anything, so they are excluded.',
  },
  {
    id: 12,
    title: 'Top Earners First',
    difficulty: 'Easy',
    tags: ['sorting'],
    story: 'For the annual pay review, HR wants employees listed from highest to lowest salary. When two people earn the same, they should appear alphabetically by name.',
    task: 'Return all columns sorted by salary descending, then by name ascending.',
    setup: `employees = pd.DataFrame({
    "name": ["Nadia", "Ivan", "Bea", "Kwame", "Lucia", "Arjun", "Zoe"],
    "department": ["IT", "Sales", "IT", "Finance", "Sales", "IT", "Finance"],
    "salary": [72000, 58000, 72000, 91000, 58000, 64000, 91000],
})`,
    signature: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(employees)',
    expected: {
      columns: ['name', 'department', 'salary'],
      rows: [['Kwame', 'Finance', 91000], ['Zoe', 'Finance', 91000], ['Bea', 'IT', 72000], ['Nadia', 'IT', 72000], ['Arjun', 'IT', 64000], ['Ivan', 'Sales', 58000], ['Lucia', 'Sales', 58000]],
    },
    hints: [
      'sort_values accepts a list of columns: by=["salary", "name"].',
      'ascending also takes a list, one value per column: [False, True].',
    ],
    approaches: [
      {
        name: 'Multi-column sort',
        code: `def solve(employees):
    return employees.sort_values(["salary", "name"], ascending=[False, True])`,
        explanation: 'pandas sorts by salary first and uses name only to break ties. Each column gets its own direction.',
        complexity: 'O(n log n).',
        whenToUse: 'Any ranking with a tie-break, which is most real rankings.',
      },
      {
        name: 'Two stable sorts',
        code: `def solve(employees):
    by_name = employees.sort_values("name")
    return by_name.sort_values("salary", ascending=False, kind="stable")`,
        explanation: 'A stable sort keeps the existing order of tied rows. Sorting by the secondary key first and then by the main key with kind="stable" gives the same result. This is how multi-key sorting works under the hood.',
        complexity: 'Two O(n log n) sorts.',
        whenToUse: 'When the tie-break is added in a later step of a pipeline.',
      },
    ],
    mistakes: 'ascending=False on its own also sorts names Z→A. Without an explicit tie-break, the default sort is not stable, so equal salaries can come out in any order between runs.',
  },
  {
    id: 13,
    title: 'Deliveries Needing Investigation',
    difficulty: 'Easy',
    tags: ['sorting', 'missing values'],
    story: 'Delivery logs with no recorded time must be investigated first. After those, the operations team wants the slowest deliveries at the top.',
    task: 'Return all columns sorted by minutes descending, with missing minutes placed first. Keep missing rows in their original order.',
    setup: `deliveries = pd.DataFrame({
    "order_id": [301, 302, 303, 304, 305, 306, 307, 308],
    "courier": ["Ama", "Joe", "Ama", "Sven", "Joe", "Sven", "Ama", "Joe"],
    "minutes": [34.0, np.nan, 18.5, 52.0, 41.0, np.nan, 27.0, 60.5],
})`,
    signature: 'def solve(deliveries: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(deliveries)',
    expected: {
      columns: ['order_id', 'courier', 'minutes'],
      rows: [[302, 'Joe', null], [306, 'Sven', null], [308, 'Joe', 60.5], [304, 'Sven', 52.0], [305, 'Joe', 41.0], [301, 'Ama', 34.0], [307, 'Ama', 27.0], [303, 'Ama', 18.5]],
      dtypes: { minutes: 'float' },
    },
    hints: [
      'sort_values puts NaN last by default, even when sorting descending.',
      'There is a parameter for that: na_position="first".',
    ],
    approaches: [
      {
        name: 'na_position="first"',
        code: `def solve(deliveries):
    return deliveries.sort_values("minutes", ascending=False, na_position="first")`,
        explanation: 'na_position controls where missing values go, independently of the sort direction.',
        complexity: 'O(n log n).',
        whenToUse: 'Data-quality reviews where incomplete records should be seen first.',
      },
      {
        name: 'Helper flag column',
        code: `def solve(deliveries):
    return (
        deliveries.assign(is_missing=deliveries["minutes"].isna())
        .sort_values(["is_missing", "minutes"], ascending=[False, False])
        .drop(columns="is_missing")
    )`,
        explanation: 'An explicit flag makes the rule visible, and it generalises to "put rows matching any rule first", such as VIP customers or overdue orders.',
        complexity: 'O(n log n) plus one temporary column.',
        whenToUse: 'Custom priority rules that na_position cannot express.',
      },
      {
        name: 'Split and concat',
        code: `def solve(deliveries):
    missing = deliveries[deliveries["minutes"].isna()]
    known = deliveries[deliveries["minutes"].notna()].sort_values("minutes", ascending=False)
    return pd.concat([missing, known])`,
        explanation: 'Splits the table into two parts, sorts only the part that needs it, and stacks them with pd.concat. Very easy to read and to extend with more groups.',
        complexity: 'O(n log n). Creates two temporary frames.',
        whenToUse: 'When each group needs different handling before being combined.',
      },
    ],
    mistakes: 'NaN goes last by default, even with ascending=False. Using fillna(999) to push missing values up works but invents data. Avoid putting fake numbers in a column you might later average.',
  },
  {
    id: 14,
    title: 'Triage Order in the ER',
    difficulty: 'Easy',
    tags: ['sorting'],
    story: 'In the emergency room, patients are seen by triage level: Critical first, then Urgent, then Routine. Within each level, whoever arrived first is seen first.',
    task: 'Return all columns sorted by triage level (Critical, then Urgent, then Routine) and then by arrival time ascending.',
    setup: `er = pd.DataFrame({
    "patient": ["P. Adeyemi", "S. Kowalski", "M. Silva", "T. Nguyen", "R. Gupta", "L. Fischer", "K. Mensah"],
    "triage": ["Routine", "Critical", "Urgent", "Routine", "Critical", "Urgent", "Urgent"],
    "arrival": ["08:05", "08:40", "08:12", "07:58", "09:01", "08:30", "07:45"],
})`,
    signature: 'def solve(er: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(er)',
    expected: {
      columns: ['patient', 'triage', 'arrival'],
      rows: [['S. Kowalski', 'Critical', '08:40'], ['R. Gupta', 'Critical', '09:01'], ['K. Mensah', 'Urgent', '07:45'], ['M. Silva', 'Urgent', '08:12'], ['L. Fischer', 'Urgent', '08:30'], ['T. Nguyen', 'Routine', '07:58'], ['P. Adeyemi', 'Routine', '08:05']],
    },
    hints: [
      'Alphabetical order would give Critical, Routine, Urgent, which is wrong. Turn each level into a number first.',
      'A dict such as {"Critical": 0, "Urgent": 1, "Routine": 2} with .map() gives you a sortable rank.',
    ],
    approaches: [
      {
        name: 'Map to a rank column',
        code: `def solve(er):
    rank = {"Critical": 0, "Urgent": 1, "Routine": 2}
    return (
        er.assign(level=er["triage"].map(rank))
        .sort_values(["level", "arrival"])
        .drop(columns="level")
    )`,
        explanation: 'map() replaces each label with its rank. You sort by the rank, then drop the helper column. The arrival times are zero-padded "HH:MM" strings, so they sort correctly as text.',
        complexity: 'O(n log n).',
        whenToUse: 'One-off custom orders. The rule is right there in the dict.',
      },
      {
        name: 'Ordered Categorical',
        code: `def solve(er):
    levels = pd.CategoricalDtype(["Critical", "Urgent", "Routine"], ordered=True)
    return er.astype({"triage": levels}).sort_values(["triage", "arrival"])`,
        explanation: 'An ordered categorical remembers the business order, so sorting, min(), max() and comparisons like er.triage < "Routine" all follow it. It also saves memory on large tables.',
        complexity: 'O(n log n). Sorting on integer category codes is fast.',
        whenToUse: 'Columns with a fixed, meaningful order (sizes, ratings, stages) that you will use again and again.',
      },
      {
        name: 'sort_values(key=...)',
        code: `def solve(er):
    rank = {"Critical": 0, "Urgent": 1, "Routine": 2}
    return er.sort_values(
        ["triage", "arrival"],
        key=lambda col: col.map(rank) if col.name == "triage" else col,
    )`,
        explanation: 'key= transforms the values only for sorting, without changing the data. It runs on every sort column separately, which is why the function checks col.name.',
        complexity: 'O(n log n).',
        whenToUse: 'Sorting by a transformed value (lowercase text, absolute value, rank) without extra columns.',
      },
    ],
    mistakes: 'Sorting the text directly gives alphabetical order. With sort_values(key=...), the function runs on every "by" column, so mapping arrival through the rank dict would turn it into NaN.',
  },
  {
    id: 15,
    title: 'Snake-Case Column Names',
    difficulty: 'Easy',
    tags: ['renaming'],
    story: 'An export from the sales tool has messy headers with capitals, spaces and stray whitespace. Your team uses snake_case for every column.',
    task: 'Rename every column: remove outer spaces, make it lowercase, and replace inner spaces with underscores. Keep the data unchanged.',
    setup: `orders = pd.DataFrame({
    " Order ID": [9001, 9002, 9003, 9004, 9005],
    "Customer Name": ["Iris Park", "Mateo Cruz", "Hannah Berg", "Ola Nordmann", "Ravi Shah"],
    "Order Total ": [58.4, 120.0, 35.75, 220.1, 99.99],
    "Ship City": ["Seoul", "Lima", "Oslo", "Bergen", "Mumbai"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['order_id', 'customer_name', 'order_total', 'ship_city'],
      rows: [[9001, 'Iris Park', 58.4, 'Seoul'], [9002, 'Mateo Cruz', 120.0, 'Lima'], [9003, 'Hannah Berg', 35.75, 'Oslo'], [9004, 'Ola Nordmann', 220.1, 'Bergen'], [9005, 'Ravi Shah', 99.99, 'Mumbai']],
      dtypes: { order_total: 'float' },
    },
    hints: [
      'df.columns is an Index of strings, and it has a .str accessor just like a Series.',
      'Chain .str.strip(), .str.lower() and .str.replace(" ", "_").',
    ],
    approaches: [
      {
        name: 'String methods on the column Index',
        code: `def solve(orders):
    out = orders.copy()
    out.columns = out.columns.str.strip().str.lower().str.replace(" ", "_")
    return out`,
        explanation: 'The .str accessor works on the column Index as well, so all names are cleaned in one vectorised chain. copy() keeps the caller\'s DataFrame unchanged.',
        complexity: 'O(number of columns).',
        whenToUse: 'Standardising headers right after loading a file.',
      },
      {
        name: 'rename() with a function',
        code: `def solve(orders):
    return orders.rename(columns=lambda c: c.strip().lower().replace(" ", "_"))`,
        explanation: 'rename() accepts a function that is called once per column name. It returns a new DataFrame, so it fits nicely into method chains.',
        complexity: 'O(number of columns).',
        whenToUse: 'Inside a cleaning pipeline written as a method chain.',
      },
      {
        name: 'Explicit mapping dict',
        code: `def solve(orders):
    mapping = {
        " Order ID": "order_id",
        "Customer Name": "customer_name",
        "Order Total ": "order_total",
        "Ship City": "ship_city",
    }
    return orders.rename(columns=mapping)`,
        explanation: 'The most explicit option: every old name is mapped by hand. Keys that do not exist are ignored silently, so pass errors="raise" to catch typos.',
        complexity: 'O(number of columns).',
        whenToUse: 'When new names are not a simple formula, for example "Dept" to "department".',
      },
    ],
    mistakes: 'Forgetting strip() gives _order_id and order_total_. Assigning df.columns = [...] directly changes the caller\'s DataFrame, so copy first if the original is used elsewhere.',
  },
  {
    id: 16,
    title: 'Sales Report Headers',
    difficulty: 'Easy',
    tags: ['renaming', 'selecting columns'],
    story: 'A legacy system exports regional sales with short codes as headers. For the monthly report you only need three of the columns, with readable names.',
    task: 'Return the columns rgn, qty and amt renamed to region, units and revenue (in that order). Drop all other columns.',
    setup: `sales = pd.DataFrame({
    "rgn": ["North", "South", "East", "West", "North", "East"],
    "sku": ["A-100", "A-100", "B-220", "C-310", "B-220", "C-310"],
    "qty": [120, 85, 40, 60, 95, 30],
    "amt": [2400.0, 1700.0, 1880.0, 1260.0, 4465.0, 630.0],
    "rep_code": ["N7", "S2", "E1", "W4", "N7", "E1"],
})`,
    signature: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(sales)',
    expected: {
      columns: ['region', 'units', 'revenue'],
      rows: [['North', 120, 2400.0], ['South', 85, 1700.0], ['East', 40, 1880.0], ['West', 60, 1260.0], ['North', 95, 4465.0], ['East', 30, 630.0]],
      dtypes: { revenue: 'float' },
    },
    hints: [
      'Select the three columns first and then rename them, or rename first and select the new names.',
      'rename(columns={"rgn": "region", ...}) takes a dict of old name to new name.',
    ],
    approaches: [
      {
        name: 'One dict drives select and rename',
        code: `def solve(sales):
    mapping = {"rgn": "region", "qty": "units", "amt": "revenue"}
    return sales[list(mapping)].rename(columns=mapping)`,
        explanation: 'list(mapping) gives the keys in insertion order, so a single dict decides both which columns to keep and what to call them. Change it in one place.',
        complexity: 'O(n × 3).',
        whenToUse: 'Report extracts and API outputs with a fixed schema.',
      },
      {
        name: 'set_axis()',
        code: `def solve(sales):
    return sales[["rgn", "qty", "amt"]].set_axis(["region", "units", "revenue"], axis=1)`,
        explanation: 'set_axis replaces all column labels by position. It is chain-friendly, but the order of the two lists must match exactly.',
        complexity: 'O(n × 3).',
        whenToUse: 'Renaming every column at once after a selection.',
      },
      {
        name: 'Build a new DataFrame',
        code: `def solve(sales):
    return pd.DataFrame({
        "region": sales["rgn"],
        "units": sales["qty"],
        "revenue": sales["amt"],
    })`,
        explanation: 'Very explicit, and you can transform values while building, for example sales["amt"].round(0). The Series are aligned on their index.',
        complexity: 'O(n × 3).',
        whenToUse: 'When the output columns need light calculations as well as new names.',
      },
    ],
    mistakes: 'A misspelled key in the rename dict (such as "amnt") does nothing and raises no error. Pass errors="raise" to rename() to catch it.',
  },
  {
    id: 17,
    title: 'Order KPIs at a Glance',
    difficulty: 'Easy',
    tags: ['basic stats'],
    story: 'Your manager wants four numbers for today\'s stand-up: total revenue, average order value, the largest order, and how many orders have a recorded amount.',
    task: 'Return a one-row DataFrame with total_revenue, avg_order_value (rounded to 2 decimals), largest_order and orders_with_amount. Ignore missing amounts.',
    setup: `orders = pd.DataFrame({
    "order_id": [8001, 8002, 8003, 8004, 8005, 8006, 8007],
    "amount": [120.0, 75.5, np.nan, 210.25, 60.0, np.nan, 99.75],
    "channel": ["web", "app", "web", "store", "app", "web", "store"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['total_revenue', 'avg_order_value', 'largest_order', 'orders_with_amount'],
      rows: [[565.5, 113.1, 210.25, 5]],
      dtypes: { total_revenue: 'float', avg_order_value: 'float', largest_order: 'float' },
    },
    hints: [
      'The Series methods .sum(), .mean(), .max() and .count() all skip NaN by default.',
      'Wrap the four numbers in a dict of one-item lists: pd.DataFrame({"total_revenue": [total], ...}).',
    ],
    approaches: [
      {
        name: 'Dict of scalars',
        code: `def solve(orders):
    amount = orders["amount"]
    return pd.DataFrame({
        "total_revenue": [amount.sum()],
        "avg_order_value": [round(amount.mean(), 2)],
        "largest_order": [amount.max()],
        "orders_with_amount": [amount.count()],
    })`,
        explanation: 'Each metric is one clear line, and the one-item lists make a single row. count() counts non-missing values only.',
        complexity: 'Four O(n) passes. Trivial at any realistic size.',
        whenToUse: 'KPI cards and summary rows for dashboards.',
      },
      {
        name: 'agg() with a list, then reshape',
        code: `def solve(orders):
    stats = orders["amount"].agg(["sum", "mean", "max", "count"])
    out = stats.to_frame().T.reset_index(drop=True)
    out.columns = ["total_revenue", "avg_order_value", "largest_order", "orders_with_amount"]
    out["avg_order_value"] = out["avg_order_value"].round(2)
    return out`,
        explanation: 'agg() computes several statistics in one call and returns a Series. to_frame().T turns it into one row. Note that count becomes 5.0 here, because the whole Series is float.',
        complexity: 'O(n) per statistic.',
        whenToUse: 'When the list of statistics comes from configuration or user input.',
      },
      {
        name: 'describe() plus sum',
        code: `def solve(orders):
    d = orders["amount"].describe()
    return pd.DataFrame({
        "total_revenue": [orders["amount"].sum()],
        "avg_order_value": [round(d["mean"], 2)],
        "largest_order": [d["max"]],
        "orders_with_amount": [int(d["count"])],
    })`,
        explanation: 'describe() returns count, mean, std, min, quartiles and max in one go, which is great for a first look at a column. It has no sum, so that is added separately.',
        complexity: 'O(n log n) because of the quartiles.',
        whenToUse: 'Exploratory analysis, when you want the full distribution anyway.',
      },
    ],
    mistakes: 'len(orders) counts all 7 rows, including missing amounts. count() counts only the 5 non-missing values. np.mean on a raw array with NaN returns nan, while pandas methods skip NaN.',
  },
  {
    id: 18,
    title: 'Average Score per Subject',
    difficulty: 'Easy',
    tags: ['basic stats'],
    story: 'Teachers want to know which subject is strongest across the class. Scores are stored as one column per subject, and one reading score is missing.',
    task: 'Return subject and avg_score (rounded to 1 decimal) for math, reading and science, sorted by avg_score descending.',
    setup: `scores = pd.DataFrame({
    "student": ["Ari", "Bo", "Cy", "Dee", "Eli", "Fay"],
    "math": [78, 92, 65, 88, 71, 84],
    "reading": [85, 79, 90, np.nan, 74, 88],
    "science": [70, 95, 72, 81, 69, 90],
})`,
    signature: 'def solve(scores: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(scores)',
    expected: {
      columns: ['subject', 'avg_score'],
      rows: [['reading', 83.2], ['math', 79.7], ['science', 79.5]],
      dtypes: { avg_score: 'float' },
    },
    hints: [
      'scores[["math", "reading", "science"]].mean() returns one average per column, as a Series.',
      'Turn the Series into a DataFrame with .reset_index() and name the columns.',
    ],
    approaches: [
      {
        name: 'mean() + reset_index()',
        code: `def solve(scores):
    avg = scores[["math", "reading", "science"]].mean().round(1)
    out = avg.rename_axis("subject").reset_index(name="avg_score")
    return out.sort_values("avg_score", ascending=False)`,
        explanation: 'DataFrame.mean() works column by column and skips NaN. rename_axis names the index, and reset_index(name=...) names the values column.',
        complexity: 'O(n × subjects).',
        whenToUse: 'Wide tables where each column is a measure.',
      },
      {
        name: 'select_dtypes + agg',
        code: `def solve(scores):
    avg = scores.select_dtypes("number").agg("mean").round(1)
    out = pd.DataFrame({"subject": avg.index, "avg_score": avg.values})
    return out.sort_values("avg_score", ascending=False)`,
        explanation: 'Picks every numeric column automatically, so a new subject column is included without code changes. The result is built explicitly from the index and values.',
        complexity: 'O(n × subjects).',
        whenToUse: 'When subjects or metrics change over time.',
      },
      {
        name: 'Long format with melt + groupby',
        code: `def solve(scores):
    long = scores.melt(id_vars="student", var_name="subject", value_name="score")
    out = long.groupby("subject", as_index=False)["score"].mean()
    out["score"] = out["score"].round(1)
    out = out.rename(columns={"score": "avg_score"})
    return out.sort_values("avg_score", ascending=False)`,
        explanation: 'melt turns the wide table into one row per student per subject. From there, groupby gives per-subject results, and you can just as easily add filters or other statistics.',
        complexity: 'O(n × subjects) memory for the long table.',
        whenToUse: 'When you will also plot, filter or join by subject. Long format is what most tools expect.',
      },
    ],
    mistakes: 'scores.mean() on the whole DataFrame fails in pandas 2.x because student is text. Select numeric columns or pass numeric_only=True. Also, mean() skips NaN, so reading is averaged over 5 students, not 6.',
  },
  {
    id: 19,
    title: 'Best Closing Day',
    difficulty: 'Easy',
    tags: ['basic stats'],
    story: 'An investor wants a one-line summary of a stock over two weeks: the lowest close, the highest close, the date of the highest close, and the gap between them.',
    task: 'Return a one-row DataFrame with min_close, max_close, best_date and price_range (max minus min, rounded to 2 decimals). If the highest close happens on more than one day, use the earliest date.',
    setup: `prices = pd.DataFrame({
    "date": ["2024-06-03", "2024-06-04", "2024-06-05", "2024-06-06", "2024-06-07",
             "2024-06-10", "2024-06-11", "2024-06-12", "2024-06-13", "2024-06-14"],
    "close": [48.20, 47.85, 49.10, 50.35, 49.90, 51.05, 50.40, 51.05, 50.10, 49.75],
})`,
    signature: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(prices)',
    expected: {
      columns: ['min_close', 'max_close', 'best_date', 'price_range'],
      rows: [[47.85, 51.05, '2024-06-10', 3.2]],
      dtypes: { min_close: 'float', max_close: 'float', price_range: 'float' },
    },
    hints: [
      'idxmax() returns the index label of the largest value, and the first one if there is a tie.',
      'Use that label with .loc to fetch the date.',
    ],
    approaches: [
      {
        name: 'idxmax() + loc',
        code: `def solve(prices):
    close = prices["close"]
    best_row = close.idxmax()
    return pd.DataFrame({
        "min_close": [close.min()],
        "max_close": [close.max()],
        "best_date": [prices.loc[best_row, "date"]],
        "price_range": [round(close.max() - close.min(), 2)],
    })`,
        explanation: 'idxmax() tells you where the maximum is, and .loc fetches any other column from that row. Ties resolve to the first occurrence, which matches the rule.',
        complexity: 'O(n).',
        whenToUse: 'Finding "the row with the best X", such as best day, top customer or slowest delivery.',
      },
      {
        name: 'Sort with an explicit tie-break',
        code: `def solve(prices):
    top = prices.sort_values(["close", "date"], ascending=[False, True]).iloc[0]
    low = prices["close"].min()
    return pd.DataFrame({
        "min_close": [low],
        "max_close": [top["close"]],
        "best_date": [top["date"]],
        "price_range": [round(top["close"] - low, 2)],
    })`,
        explanation: 'Sorting makes the tie-break rule explicit (earliest date) instead of relying on the order of the data. That matters if the data might arrive unsorted.',
        complexity: 'O(n log n).',
        whenToUse: 'When the tie-break must be guaranteed, not just a side effect of row order.',
      },
      {
        name: 'nlargest(1)',
        code: `def solve(prices):
    top = prices.nlargest(1, "close", keep="first").iloc[0]
    low = prices["close"].min()
    return pd.DataFrame({
        "min_close": [low],
        "max_close": [top["close"]],
        "best_date": [top["date"]],
        "price_range": [round(top["close"] - low, 2)],
    })`,
        explanation: 'nlargest(k) returns the top k rows without a full sort. keep="first" keeps the first of tied rows, and keep="all" would return both 51.05 days.',
        complexity: 'O(n log k), faster than a full sort for small k.',
        whenToUse: 'Top-N lists such as the top 10 products or the 5 worst days.',
      },
    ],
    mistakes: 'prices["close"].max() gives the value, not the date. idxmax() returns a label, so use it with loc, not iloc. The two only match when the index is the default 0..n-1.',
  },
  {
    id: 20,
    title: 'Orders per Payment Method',
    difficulty: 'Easy',
    tags: ['value_counts'],
    story: 'The payments team is deciding which providers to keep. They want to know how many orders used each payment method.',
    task: 'Return the columns payment_method and count, sorted from most to least used.',
    setup: `orders = pd.DataFrame({
    "order_id": range(1, 13),
    "payment_method": ["card", "paypal", "card", "bank_transfer", "card", "apple_pay",
                       "paypal", "card", "apple_pay", "card", "paypal", "card"],
    "amount": [25.0, 40.5, 12.99, 300.0, 18.0, 22.5, 61.0, 9.99, 33.3, 75.0, 14.0, 52.25],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['payment_method', 'count'],
      rows: [['card', 6], ['paypal', 3], ['apple_pay', 2], ['bank_transfer', 1]],
    },
    hints: [
      'value_counts() counts each distinct value and sorts by count, highest first.',
      'In pandas 2.x, .value_counts().reset_index() gives the columns payment_method and count directly.',
    ],
    approaches: [
      {
        name: 'value_counts() + reset_index()',
        code: `def solve(orders):
    return orders["payment_method"].value_counts().reset_index()`,
        explanation: 'value_counts() returns a Series named count, indexed by the payment method. reset_index() turns both into columns.',
        complexity: 'O(n) hashing plus a sort of the distinct values.',
        whenToUse: 'The quickest frequency table for one column.',
      },
      {
        name: 'groupby().size()',
        code: `def solve(orders):
    return (
        orders.groupby("payment_method")
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )`,
        explanation: 'size() counts rows per group. groupby sorts groups alphabetically, so you sort by count yourself. This form extends naturally to several grouping columns and other aggregations.',
        complexity: 'O(n) plus sorting.',
        whenToUse: 'When counts are one step of a bigger groupby analysis.',
      },
    ],
    mistakes: 'In pandas 1.x reset_index() produced the columns "index" and "payment_method". In 2.x the count column is named "count". value_counts() drops NaN by default, so pass dropna=False to count missing values too.',
  },
  {
    id: 21,
    title: 'Device Share of Sessions',
    difficulty: 'Easy',
    tags: ['value_counts'],
    story: 'The design team must decide whether to focus on mobile. They want each device\'s share of sessions, ignoring sessions where the device was not recorded.',
    task: 'Return device and share_pct (a percentage rounded to 1 decimal), sorted by share descending.',
    setup: `sessions = pd.DataFrame({
    "session_id": range(1, 12),
    "device": ["mobile", "desktop", "mobile", None, "tablet", "mobile",
               "desktop", "mobile", None, "mobile", "desktop"],
    "pages": [3, 7, 2, 1, 4, 5, 9, 2, 1, 6, 3],
})`,
    signature: 'def solve(sessions: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(sessions)',
    expected: {
      columns: ['device', 'share_pct'],
      rows: [['mobile', 55.6], ['desktop', 33.3], ['tablet', 11.1]],
      dtypes: { share_pct: 'float' },
    },
    hints: [
      'value_counts(normalize=True) returns proportions between 0 and 1 instead of counts.',
      'Multiply by 100, round(1), then reset_index(name="share_pct").',
    ],
    approaches: [
      {
        name: 'value_counts(normalize=True)',
        code: `def solve(sessions):
    share = sessions["device"].value_counts(normalize=True).mul(100).round(1)
    return share.reset_index(name="share_pct")`,
        explanation: 'normalize=True divides each count by the number of non-missing values, so the shares add up to 100%.',
        complexity: 'O(n).',
        whenToUse: 'Quick mix and share breakdowns.',
      },
      {
        name: 'Counts divided by total',
        code: `def solve(sessions):
    counts = sessions["device"].value_counts()
    share = (counts / counts.sum() * 100).round(1)
    return share.reset_index(name="share_pct")`,
        explanation: 'Same result, but the denominator is visible in the code. That makes it easy to switch to a different total later.',
        complexity: 'O(n).',
        whenToUse: 'When reviewers need to see exactly how the percentage is calculated.',
      },
      {
        name: 'Explicit denominator with groupby',
        code: `def solve(sessions):
    known = sessions.dropna(subset=["device"])
    share = known.groupby("device").size().div(len(known)).mul(100).round(1)
    return share.reset_index(name="share_pct").sort_values("share_pct", ascending=False)`,
        explanation: 'First decides which rows count (known devices), then divides by that number. Useful when the denominator needs its own filter, such as logged-in sessions only.',
        complexity: 'O(n).',
        whenToUse: 'Metrics where the definition of "all" is part of the business logic.',
      },
    ],
    mistakes: 'Dividing by len(sessions) (11) instead of the 9 sessions with a known device gives shares that do not add up to 100%. Decide on the denominator explicitly and mention it in the report.',
  },
  {
    id: 22,
    title: 'Distinct Departments',
    difficulty: 'Easy',
    tags: ['unique/nunique'],
    story: 'HR is building a dropdown menu of departments for a new form. Some employee records do not have a department yet.',
    task: 'Return a single column called department with each distinct department once, sorted A to Z, without missing values.',
    setup: `employees = pd.DataFrame({
    "emp_id": [11, 12, 13, 14, 15, 16, 17, 18],
    "department": ["Sales", "IT", None, "Finance", "IT", "Sales", "Legal", None],
})`,
    signature: 'def solve(employees: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(employees)',
    expected: {
      columns: ['department'],
      rows: [['Finance'], ['IT'], ['Legal'], ['Sales']],
    },
    hints: [
      'unique() returns each distinct value once, and that includes None/NaN.',
      'Use dropna() first, then unique(), then sort.',
    ],
    approaches: [
      {
        name: 'dropna + unique + sorted',
        code: `def solve(employees):
    depts = employees["department"].dropna().unique()
    return pd.DataFrame({"department": sorted(depts)})`,
        explanation: 'unique() keeps values in order of first appearance and returns a NumPy array. sorted() orders it, and the dict wraps it back into a DataFrame.',
        complexity: 'O(n) for unique plus O(k log k) to sort k values.',
        whenToUse: 'Building lookup lists and dropdown options.',
      },
      {
        name: 'Stay in pandas with drop_duplicates',
        code: `def solve(employees):
    return (
        employees[["department"]]
        .dropna()
        .drop_duplicates()
        .sort_values("department")
        .reset_index(drop=True)
    )`,
        explanation: 'Keeps everything as a DataFrame throughout. drop_duplicates also works on several columns at once, such as distinct (department, city) pairs.',
        complexity: 'O(n) plus sorting.',
        whenToUse: 'When you need distinct combinations of several columns.',
      },
      {
        name: 'value_counts() index',
        code: `def solve(employees):
    depts = employees["department"].value_counts().index
    return pd.DataFrame({"department": depts.sort_values()})`,
        explanation: 'The index of value_counts() is the list of distinct non-missing values. A small bonus: you also get how often each one appears, if you keep the counts.',
        complexity: 'O(n).',
        whenToUse: 'When you want the distinct values and their frequencies together.',
      },
    ],
    mistakes: 'sorted() on values that still include None raises TypeError, because Python cannot compare str and NoneType. Drop missing values first. unique() returns an array, not a DataFrame, so wrap it before returning.',
  },
  {
    id: 23,
    title: 'Customers, Products and Cities',
    difficulty: 'Easy',
    tags: ['unique/nunique'],
    story: 'The quarterly report needs a "reach" line: how many different customers bought something, how many different products sold, and in how many cities.',
    task: 'Return a one-row DataFrame with customers, products and cities: the number of distinct values in customer_id, product and city. Count values exactly as stored and do not count missing cities.',
    setup: `orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "customer_id": ["C01", "C02", "C01", "C03", "C04", "C02", "C05", "C01", "C06", "C04"],
    "product": ["mug", "tee", "mug", "cap", "tee", "mug", "poster", "cap", "mug", "tee"],
    "city": ["Lisbon", "Porto", "Lisbon", None, "Faro", "Porto", "Lisbon", "Lisbon", "porto", "Faro"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['customers', 'products', 'cities'],
      rows: [[6, 4, 4]],
    },
    hints: [
      'Series.nunique() counts distinct values and ignores NaN by default.',
      'DataFrame.nunique() does it for every column at once. Then reshape the result into one row.',
    ],
    approaches: [
      {
        name: 'nunique() per column',
        code: `def solve(orders):
    return pd.DataFrame({
        "customers": [orders["customer_id"].nunique()],
        "products": [orders["product"].nunique()],
        "cities": [orders["city"].nunique()],
    })`,
        explanation: 'One clear line per metric. nunique() skips NaN unless you pass dropna=False.',
        complexity: 'O(n) per column.',
        whenToUse: 'KPI rows where each metric may need its own rule.',
      },
      {
        name: 'DataFrame.nunique() + reshape',
        code: `def solve(orders):
    counts = orders[["customer_id", "product", "city"]].nunique()
    counts.index = ["customers", "products", "cities"]
    return counts.to_frame().T.reset_index(drop=True)`,
        explanation: 'Counts all three columns in one call, renames the index, then transposes the Series into a single row.',
        complexity: 'O(n × columns).',
        whenToUse: 'Profiling many columns at once, for example in a data-quality check.',
      },
      {
        name: 'Python sets',
        code: `def solve(orders):
    return pd.DataFrame([{
        "customers": len(set(orders["customer_id"])),
        "products": len(set(orders["product"])),
        "cities": len(set(orders["city"].dropna())),
    }])`,
        explanation: 'A set keeps one copy of each value. Unlike nunique(), a set counts None as a value, which is why the city column needs dropna().',
        complexity: 'O(n), but slower than pandas on large columns.',
        whenToUse: 'When you also need the distinct values themselves for set maths, such as customers who bought both A and B.',
      },
    ],
    mistakes: '"porto" and "Porto" are counted as two cities. In a real report, clean the text first with .str.strip().str.title(). You will practise that in the Medium set.',
  },
  {
    id: 24,
    title: 'Remove Internal Columns',
    difficulty: 'Easy',
    tags: ['dropping'],
    story: 'You are sharing an orders table with a partner. Before sending it, you must remove the cost price and the internal notes.',
    task: 'Return the orders table without the cost_price and internal_note columns. Keep the other columns in their original order.',
    setup: `orders = pd.DataFrame({
    "order_id": [41, 42, 43, 44, 45],
    "customer": ["Kemi", "Jon", "Ines", "Raj", "Mia"],
    "total": [64.0, 18.5, 120.0, 42.75, 9.99],
    "cost_price": [38.0, 11.0, 70.5, 25.0, 6.0],
    "internal_note": ["vip", None, "check address", None, "refund once"],
    "status": ["paid", "paid", "refunded", "paid", "paid"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['order_id', 'customer', 'total', 'status'],
      rows: [[41, 'Kemi', 64.0, 'paid'], [42, 'Jon', 18.5, 'paid'], [43, 'Ines', 120.0, 'refunded'], [44, 'Raj', 42.75, 'paid'], [45, 'Mia', 9.99, 'paid']],
      dtypes: { total: 'float' },
    },
    hints: [
      'drop() removes rows or columns by label.',
      'Use drop(columns=[...]) so pandas knows you mean columns.',
    ],
    approaches: [
      {
        name: 'drop(columns=...)',
        code: `def solve(orders):
    return orders.drop(columns=["cost_price", "internal_note"])`,
        explanation: 'Returns a new DataFrame without those columns. It raises KeyError if a name does not exist. Pass errors="ignore" if a column may or may not be there.',
        complexity: 'O(n × remaining columns).',
        whenToUse: 'Removing a few known columns, the most common case.',
      },
      {
        name: 'Keep the complement with isin()',
        code: `def solve(orders):
    hidden = ["cost_price", "internal_note"]
    return orders.loc[:, ~orders.columns.isin(hidden)]`,
        explanation: 'Builds a mask over the column names and keeps every column that is not in the hidden list. Missing names never raise an error.',
        complexity: 'O(n × remaining columns).',
        whenToUse: 'When the list of private columns is configuration that might include names not present in every file.',
      },
      {
        name: 'List comprehension',
        code: `def solve(orders):
    hidden = {"cost_price", "internal_note"}
    return orders[[c for c in orders.columns if c not in hidden]]`,
        explanation: 'Plain Python over the column names. You can extend the rule easily, for example dropping every column that starts with "internal_".',
        complexity: 'O(columns) to decide, O(n) to copy.',
        whenToUse: 'Rule-based column removal.',
      },
    ],
    mistakes: 'orders.drop(["cost_price", "internal_note"]) without columns= looks for row labels and raises KeyError. orders.drop(..., inplace=True) returns None, so return orders.drop(...) with inplace=True gives you None.',
  },
  {
    id: 25,
    title: 'Remove Cancelled and Empty Orders',
    difficulty: 'Easy',
    tags: ['dropping', 'boolean filtering'],
    story: 'Before calculating units sold, the warehouse team wants to remove orders that were cancelled and orders with a quantity of zero.',
    task: 'Drop rows where status is "cancelled" or quantity is 0. Return all columns for the remaining rows in their original order.',
    setup: `orders = pd.DataFrame({
    "order_id": [601, 602, 603, 604, 605, 606, 607, 608],
    "product": ["lamp", "rug", "lamp", "vase", "chair", "rug", "vase", "lamp"],
    "quantity": [1, 2, 0, 1, 4, 1, 0, 3],
    "status": ["complete", "cancelled", "complete", "complete", "cancelled", "complete", "complete", "complete"],
})`,
    signature: 'def solve(orders: pd.DataFrame) -> pd.DataFrame:',
    call: 'solve(orders)',
    expected: {
      columns: ['order_id', 'product', 'quantity', 'status'],
      rows: [[601, 'lamp', 1, 'complete'], [604, 'vase', 1, 'complete'], [606, 'rug', 1, 'complete'], [608, 'lamp', 3, 'complete']],
    },
    hints: [
      'Describe the rows to remove with a mask, then keep the opposite with ~.',
      'bad = (orders["status"] == "cancelled") | (orders["quantity"] == 0)',
    ],
    approaches: [
      {
        name: 'Keep the opposite with ~',
        code: `def solve(orders):
    bad = (orders["status"] == "cancelled") | (orders["quantity"] == 0)
    return orders[~bad]`,
        explanation: 'It is often easier to describe what to remove. ~ flips the mask so you keep everything else.',
        complexity: 'O(n).',
        whenToUse: 'Cleaning steps described as exclusion rules.',
      },
      {
        name: 'drop(index=...)',
        code: `def solve(orders):
    bad = (orders["status"] == "cancelled") | (orders["quantity"] == 0)
    return orders.drop(index=orders[bad].index)`,
        explanation: 'Finds the index labels of the bad rows and drops them. It reads like the instruction, but it depends on unique index labels: with duplicate labels it can drop more rows than you expect.',
        complexity: 'O(n).',
        whenToUse: 'When you already have a list of row labels to remove, for example from an audit.',
      },
      {
        name: 'query() for the rows to keep',
        code: `def solve(orders):
    return orders.query("status != 'cancelled' and quantity != 0")`,
        explanation: 'Writes the keep rule directly. Note the difference from quantity > 0, which would also drop negative quantities such as returns. Make sure the rule matches the business meaning.',
        complexity: 'O(n).',
        whenToUse: 'Readable filters in a cleaning pipeline.',
      },
    ],
    mistakes: 'drop(index=...) uses labels, not positions. After earlier filters, labels are no longer 0..n-1. The result keeps gaps in the index (0, 3, 5, 7), which is fine for analysis, but call reset_index(drop=True) before using iloc.',
  },
);
window.dispatchEvent(new Event('dojo:problems'));
