// Rewritten originals: Pandas Hard (problems 76-100). Same ground as before -- ranking, running totals,
// lags, buckets -- but each question spans several frames and asks for more than one derived column.
export default [
  { t: 'Pay Rank Against Project Load', tags: ['rank', 'left merge', 'missing values'], o: true,
    story: 'HR wants pay compared inside each department, next to the project hours the person carries.',
    task: 'Return department, name, salary, rnk (dense rank of salary inside the department, highest = 1), hours (total assigned hours, 0 when none) and pay_per_hour (salary / hours rounded to 2 decimals, NaN for anyone with no hours). Order by department, rnk, then name.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Asha", "Ben", "Chitra"], "dept_id": [1, 1, 2], "salary": [180000, 120000, 90000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
assignments = pd.DataFrame({"employee_id": [1, 2, 3], "hours": [100, 60, 45]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Asha", "Ben", "Chitra"], "dept_id": [1, 1, 2], "salary": [180000, 120000, 90000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
assignments = pd.DataFrame({"employee_id": [1, 3], "hours": [100, 45]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 2, 2], "salary": [120000, 120000, 90000, 70000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
assignments = pd.DataFrame({"employee_id": [1, 2, 3, 4], "hours": [100, 50, 45, 10]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame, departments: pd.DataFrame, assignments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees, departments, assignments):
    h = assignments.groupby("employee_id", as_index=False)["hours"].sum()
    e = employees.merge(departments, on="dept_id").merge(h, on="employee_id", how="left")
    e["rnk"] = e.groupby("dept_id")["salary"].rank(method="dense", ascending=False).astype(int)
    e["pay_per_hour"] = (e["salary"] / e["hours"]).round(2)
    e["hours"] = e["hours"].fillna(0).astype(int)
    return e.sort_values(["department", "rnk", "name"])[["department", "name", "salary", "rnk", "hours", "pay_per_hour"]].reset_index(drop=True)`,
    wrong: [`def solve(employees, departments, assignments):
    h = assignments.groupby("employee_id", as_index=False)["hours"].sum()
    e = employees.merge(departments, on="dept_id").merge(h, on="employee_id")
    e["rnk"] = e.groupby("dept_id")["salary"].rank(method="dense", ascending=False).astype(int)
    e["pay_per_hour"] = (e["salary"] / e["hours"]).round(2)
    e["hours"] = e["hours"].astype(int)
    return e.sort_values(["department", "rnk", "name"])[["department", "name", "salary", "rnk", "hours", "pay_per_hour"]].reset_index(drop=True)`],
    hints: ['Total the hours per employee before merging.', 'A left merge keeps the people who are on no project.'],
    why: 'The hours are a different grain, so they are aggregated first and brought alongside with a left merge that cannot lose anybody.',
    mistakes: 'A plain merge drops every employee with no assignment, which is exactly who a workload report is looking for.' },

  { t: 'Best Paid Who Actually Ships', tags: ['sorting', 'groupby', 'isin'], o: true,
    story: 'A bonus goes to the best-paid person in each department who is on a project. If nobody in the department is, it falls back to the best paid overall.',
    task: "Return department, name, salary and source ('project' when anyone in the department is on a project, otherwise 'fallback'). Pick the highest-paid person among those on projects, else the highest paid in the department, breaking salary ties by name. Order by department.",
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Asha", "Ben", "Chitra"], "dept_id": [1, 1, 2], "salary": [180000, 120000, 90000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
assignments = pd.DataFrame({"employee_id": [1, 3], "hours": [100, 45]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Asha", "Ben", "Chitra"], "dept_id": [1, 1, 2], "salary": [180000, 120000, 90000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
assignments = pd.DataFrame({"employee_id": [2], "hours": [60]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 2, 2], "salary": [180000, 180000, 90000, 95000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
assignments = pd.DataFrame({"employee_id": [1, 2, 3], "hours": [10, 20, 30]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame, departments: pd.DataFrame, assignments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees, departments, assignments):
    e = employees.merge(departments, on="dept_id").copy()
    e["shipped"] = e["employee_id"].isin(assignments["employee_id"]).astype(int)
    e["any_shipped"] = e.groupby("dept_id")["shipped"].transform("max")
    e = e.sort_values(["dept_id", "shipped", "salary", "name"], ascending=[True, False, False, True])
    top = e.groupby("dept_id", as_index=False).head(1).copy()
    top["source"] = np.where(top["any_shipped"] == 1, "project", "fallback")
    return top.sort_values("department")[["department", "name", "salary", "source"]].reset_index(drop=True)`,
    wrong: [`def solve(employees, departments, assignments):
    e = employees.merge(departments, on="dept_id").copy()
    e["any_shipped"] = e["employee_id"].isin(assignments["employee_id"]).groupby(e["dept_id"]).transform("max").astype(int)
    e = e.sort_values(["dept_id", "salary", "name"], ascending=[True, False, True])
    top = e.groupby("dept_id", as_index=False).head(1).copy()
    top["source"] = np.where(top["any_shipped"] == 1, "project", "fallback")
    return top.sort_values("department")[["department", "name", "salary", "source"]].reset_index(drop=True)`],
    hints: ['Sort by the project flag first and the salary second.', 'The fallback then costs nothing extra.'],
    why: 'Putting the project people ahead in the sort makes the first row of each department right under both rules at once.',
    mistakes: 'Sorting by salary alone hands the bonus to the best-paid person whether or not they are on anything.' },

  { t: 'Third Highest Pay Level per Department', tags: ['drop_duplicates', 'cumcount', 'clip'], o: true,
    story: 'Compensation reviews the third pay level in each department, and small departments do not have three.',
    task: 'Return department, salary and levels_available: the 3rd highest distinct salary in the department, or its lowest distinct salary when there are fewer than three. Order by department.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5, 6], "dept_id": [1, 1, 1, 2, 2, 2], "salary": [180000, 140000, 110000, 90000, 80000, 70000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5], "dept_id": [1, 1, 1, 2, 2], "salary": [180000, 140000, 110000, 90000, 80000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5, 6], "dept_id": [1, 1, 1, 2, 2, 2], "salary": [180000, 180000, 110000, 90000, 80000, 70000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame, departments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees, departments):
    lv = employees[["dept_id", "salary"]].drop_duplicates().sort_values(["dept_id", "salary"], ascending=[True, False])
    lv["rn"] = lv.groupby("dept_id").cumcount() + 1
    lv["levels"] = lv.groupby("dept_id")["salary"].transform("size")
    pick = lv[lv["rn"] == np.minimum(3, lv["levels"])]
    out = pick.merge(departments, on="dept_id").rename(columns={"levels": "levels_available"})
    return out.sort_values("department")[["department", "salary", "levels_available"]].reset_index(drop=True)`,
    wrong: [`def solve(employees, departments):
    lv = employees[["dept_id", "salary"]].drop_duplicates().sort_values(["dept_id", "salary"], ascending=[True, False])
    lv["rn"] = lv.groupby("dept_id").cumcount() + 1
    lv["levels"] = lv.groupby("dept_id")["salary"].transform("size")
    pick = lv[lv["rn"] == 3]
    out = pick.merge(departments, on="dept_id").rename(columns={"levels": "levels_available"})
    return out.sort_values("department")[["department", "salary", "levels_available"]].reset_index(drop=True)`],
    hints: ['Drop duplicate salaries first: a level is a salary, not a person.', 'Count the levels in the same pass and take the smaller of 3 and that count.'],
    why: 'Counting the levels per department lets one expression ask for the third, or the last when there is no third.',
    mistakes: 'Hard-coding the third row silently drops every department too small to have one.' },

  { t: 'Running Revenue by Channel', tags: ['cumsum', 'groupby', 'share'], o: true,
    story: 'Finance wants revenue to accumulate per channel, and also what each channel was worth in its month.',
    task: 'For delivered orders, return month, channel, revenue, running_revenue (cumulative within the channel) and pct_of_month (the channel\'s share of that month, 1 decimal). Order by month, channel.',
    setup: `orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "month": ["2024-01", "2024-01", "2024-02", "2024-02"], "channel": ["web", "web", "web", "web"], "status": ["delivered", "delivered", "delivered", "cancelled"]})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 200, 400, 900]})`,
    hidden: [
      `orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "month": ["2024-01", "2024-01", "2024-02", "2024-02"], "channel": ["web", "app", "web", "app"], "status": ["delivered"] * 4})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 300, 400, 200]})`,
      `orders = pd.DataFrame({"order_id": [1, 2, 3], "month": ["2024-01", "2024-02", "2024-03"], "channel": ["web", "web", "web"], "status": ["delivered"] * 3})
items = pd.DataFrame({"order_id": [1, 2, 3], "amount": [50, 150, 300]})`,
    ],
    sig: 'def solve(orders: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders, items):
    o = orders[orders["status"] == "delivered"].merge(items, on="order_id")
    m = o.groupby(["month", "channel"], as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    m = m.sort_values(["channel", "month"])
    m["running_revenue"] = m.groupby("channel")["revenue"].cumsum()
    m["pct_of_month"] = (100.0 * m["revenue"] / m.groupby("month")["revenue"].transform("sum")).round(1)
    return m.sort_values(["month", "channel"])[["month", "channel", "revenue", "running_revenue", "pct_of_month"]].reset_index(drop=True)`,
    wrong: [`def solve(orders, items):
    o = orders[orders["status"] == "delivered"].merge(items, on="order_id")
    m = o.groupby(["month", "channel"], as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    m = m.sort_values(["month", "channel"])
    m["running_revenue"] = m["revenue"].cumsum()
    m["pct_of_month"] = (100.0 * m["revenue"] / m.groupby("month")["revenue"].transform("sum")).round(1)
    return m[["month", "channel", "revenue", "running_revenue", "pct_of_month"]].reset_index(drop=True)`],
    hints: ['Sort by channel and month before the cumulative sum.', 'The share is a transform over the month, not the channel.'],
    why: 'Two different groupings in one frame: the running total follows the channel, the share follows the month.',
    mistakes: 'A plain cumsum runs straight through the channels and mixes them together.' },

  { t: 'Growth and What New Customers Brought', tags: ['lag', 'first order', 'groupby'], o: true,
    story: 'Revenue is growing, but the board wants to know how much came from customers buying for the first time.',
    task: 'For delivered orders, return month, revenue, prev_revenue, growth_pct ((revenue - prev) / prev * 100, 1 decimal) and new_customer_revenue: the part of the month from customers whose first delivered order was that month. Oldest month first.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2], "customer_id": [1, 2], "month": ["2024-01", "2024-02"], "status": ["delivered", "delivered"]})
items = pd.DataFrame({"order_id": [1, 2], "amount": [100, 150]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 1, 2], "month": ["2024-01", "2024-01", "2024-02"], "status": ["delivered"] * 3})
items = pd.DataFrame({"order_id": [1, 2, 3], "amount": [100, 40, 150]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 2, 1], "month": ["2024-01", "2024-02", "2024-02"], "status": ["delivered"] * 3})
items = pd.DataFrame({"order_id": [1, 2, 3], "amount": [100, 150, 60]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, items):
    o = orders[orders["status"] == "delivered"].merge(items, on="order_id").copy()
    o["first_month"] = o.groupby("customer_id")["month"].transform("min")
    o["new_amount"] = np.where(o["month"] == o["first_month"], o["amount"], 0)
    m = o.groupby("month", as_index=False).agg(revenue=("amount", "sum"), new_customer_revenue=("new_amount", "sum"))
    m = m.sort_values("month")
    m["prev_revenue"] = m["revenue"].shift()
    m["growth_pct"] = (100.0 * (m["revenue"] - m["prev_revenue"]) / m["prev_revenue"]).round(1)
    return m[["month", "revenue", "prev_revenue", "growth_pct", "new_customer_revenue"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, items):
    o = orders[orders["status"] == "delivered"].merge(items, on="order_id").copy()
    once = o.groupby("customer_id")["order_id"].transform("size") == 1
    o["new_amount"] = np.where(once, o["amount"], 0)
    m = o.groupby("month", as_index=False).agg(revenue=("amount", "sum"), new_customer_revenue=("new_amount", "sum"))
    m = m.sort_values("month")
    m["prev_revenue"] = m["revenue"].shift()
    m["growth_pct"] = (100.0 * (m["revenue"] - m["prev_revenue"]) / m["prev_revenue"]).round(1)
    return m[["month", "revenue", "prev_revenue", "growth_pct", "new_customer_revenue"]].reset_index(drop=True)`],
    hints: ['Work out each customer\'s first delivered month, then compare every order with it.', 'A transform puts that month on every row.'],
    why: 'Once the first month sits beside each order, "new customer revenue" is a conditional sum in the same groupby.',
    mistakes: 'Treating one-order customers as the new ones misses a customer who ordered twice in the month they arrived.' },

  { t: 'Top Two Products per Category, With the Gap', tags: ['rank', 'transform', 'merge'], o: true,
    story: 'A category page shows the two best sellers, and merchandising wants to know how far behind the runner-up is.',
    task: 'Over delivered orders, return category, product, revenue, rk (rank within the category by revenue, highest first, ties sharing a rank) and gap_to_leader (the category leader\'s revenue minus this one), keeping ranks 1 and 2. Order by category, rk, product.',
    setup: `products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Notebook", "Pen", "Planner"], "category": ["Stationery"] * 3})
orders = pd.DataFrame({"order_id": [1, 2, 3], "status": ["delivered", "delivered", "cancelled"]})
lines = pd.DataFrame({"order_id": [1, 2, 3], "product_id": [1, 2, 3], "amount": [500, 300, 900]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2, 3, 4], "product": ["Notebook", "Pen", "Lamp", "Bottle"], "category": ["Stationery", "Stationery", "Home", "Home"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "status": ["delivered"] * 4})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 2, 3, 4], "amount": [500, 300, 900, 100]})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Notebook", "Pen", "Planner"], "category": ["Stationery"] * 3})
orders = pd.DataFrame({"order_id": [1, 2, 3], "status": ["delivered"] * 3})
lines = pd.DataFrame({"order_id": [1, 2, 3], "product_id": [1, 2, 3], "amount": [400, 400, 100]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, orders, lines):
    d = lines.merge(orders[orders["status"] == "delivered"], on="order_id").merge(products, on="product_id")
    p = d.groupby(["category", "product"], as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    p["rk"] = p.groupby("category")["revenue"].rank(method="min", ascending=False).astype(int)
    p["gap_to_leader"] = p.groupby("category")["revenue"].transform("max") - p["revenue"]
    top = p[p["rk"] <= 2]
    return top.sort_values(["category", "rk", "product"])[["category", "product", "revenue", "rk", "gap_to_leader"]].reset_index(drop=True)`,
    wrong: [`def solve(products, orders, lines):
    d = lines.merge(orders[orders["status"] == "delivered"], on="order_id").merge(products, on="product_id")
    p = d.groupby(["category", "product"], as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    p["rk"] = p.groupby("category")["revenue"].rank(method="min", ascending=False).astype(int)
    p["gap_to_leader"] = p["revenue"].max() - p["revenue"]
    top = p[p["rk"] <= 2]
    return top.sort_values(["category", "rk", "product"])[["category", "product", "revenue", "rk", "gap_to_leader"]].reset_index(drop=True)`],
    hints: ['The leader is the maximum inside the category.', 'transform("max") puts it on every row of that category.'],
    why: 'Grouped transforms give each row its own category leader, so the gap means what it says.',
    mistakes: 'Using the overall maximum measures every category against the biggest one in the shop.' },

  { t: 'Customers Who Make Up Half the Revenue', tags: ['cumsum', 'share', 'pareto'], o: true,
    story: 'Account management wants the smallest group of customers that together account for half of delivered revenue.',
    task: 'Return name, revenue, pct (share of total, 1 decimal) and running_pct (cumulative share by revenue descending, 1 decimal), keeping customers up to and including the first whose running share reaches 50. Order by revenue descending, then name.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2], "customer_id": [1, 2], "status": ["delivered", "cancelled"]})
items = pd.DataFrame({"order_id": [1, 2], "amount": [400, 900]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2, 3], "name": ["Asha", "Ben", "Chitra"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 2, 3], "status": ["delivered"] * 3})
items = pd.DataFrame({"order_id": [1, 2, 3], "amount": [400, 300, 300]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 2, 3, 4], "status": ["delivered"] * 4})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 100, 100, 100]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, items):
    d = orders[orders["status"] == "delivered"].merge(items, on="order_id").merge(customers, on="customer_id")
    c = d.groupby("name", as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    c = c.sort_values(["revenue", "name"], ascending=[False, True]).reset_index(drop=True)
    total = c["revenue"].sum()
    c["pct"] = (100.0 * c["revenue"] / total).round(1)
    c["running_pct"] = (100.0 * c["revenue"].cumsum() / total).round(1)
    cut = c.index[c["running_pct"] >= 50][0]
    return c.loc[:cut, ["name", "revenue", "pct", "running_pct"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, items):
    d = orders[orders["status"] == "delivered"].merge(items, on="order_id").merge(customers, on="customer_id")
    c = d.groupby("name", as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    c = c.sort_values(["revenue", "name"], ascending=[False, True]).reset_index(drop=True)
    total = c["revenue"].sum()
    c["pct"] = (100.0 * c["revenue"] / total).round(1)
    c["running_pct"] = (100.0 * c["revenue"].cumsum() / c["revenue"].cumsum()).round(1)
    cut = c.index[c["running_pct"] >= 50][0]
    return c.loc[:cut, ["name", "revenue", "pct", "running_pct"]].reset_index(drop=True)`],
    hints: ['The running share divides by the grand total, not by itself.', 'Keep rows up to and including the one that crosses the line.'],
    why: 'A cumulative sum over the same order as the ranking is what makes the Pareto cut-off meaningful.',
    mistakes: 'Dividing the running total by itself gives 100 on every row and stops the list at the first customer.' },

  { t: 'Shrinking Gaps Between Orders', tags: ['shift', 'groupby', 'dates'], o: true,
    story: 'Marketing wants to know whether customers are coming back faster than they used to.',
    task: "Return name, order_id, days_since_prev, prev_gap (the gap before that one) and trend ('faster', 'slower' or 'same'), for orders that have both gaps. Order by name, order_id.",
    setup: `customers = pd.DataFrame({"customer_id": [1], "name": ["Asha"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 1, 1, 1], "day": [1, 11, 31, 36]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 2, 1, 2, 1, 2], "day": [1, 2, 11, 20, 31, 25]})`,
      `customers = pd.DataFrame({"customer_id": [1], "name": ["Asha"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 1, 1, 1], "day": [1, 11, 21, 31]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders):
    o = orders.sort_values(["customer_id", "day"]).copy()
    o["days_since_prev"] = o.groupby("customer_id")["day"].diff()
    o["prev_gap"] = o.groupby("customer_id")["days_since_prev"].shift()
    o = o.dropna(subset=["days_since_prev", "prev_gap"]).copy()
    o["trend"] = np.where(o["days_since_prev"] < o["prev_gap"], "faster",
                          np.where(o["days_since_prev"] > o["prev_gap"], "slower", "same"))
    o["days_since_prev"] = o["days_since_prev"].astype(int)
    o["prev_gap"] = o["prev_gap"].astype(int)
    out = o.merge(customers, on="customer_id")
    return out.sort_values(["name", "order_id"])[["name", "order_id", "days_since_prev", "prev_gap", "trend"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders):
    o = orders.sort_values(["customer_id", "day"]).copy()
    o["days_since_prev"] = o["day"].diff()
    o["prev_gap"] = o["days_since_prev"].shift()
    o = o.dropna(subset=["days_since_prev", "prev_gap"]).copy()
    o["trend"] = np.where(o["days_since_prev"] < o["prev_gap"], "faster",
                          np.where(o["days_since_prev"] > o["prev_gap"], "slower", "same"))
    o["days_since_prev"] = o["days_since_prev"].astype(int)
    o["prev_gap"] = o["prev_gap"].astype(int)
    out = o.merge(customers, on="customer_id")
    return out.sort_values(["name", "order_id"])[["name", "order_id", "days_since_prev", "prev_gap", "trend"]].reset_index(drop=True)`],
    hints: ['Both the gap and the gap before it are per customer.', 'Group before diff, and group again before shift.'],
    why: 'Each step has to stay inside the customer, or one customer\'s rhythm leaks into the next.',
    mistakes: 'An ungrouped diff produces a gap between two different people\'s orders as soon as there are two customers.' },

  { t: 'Spend Quartiles Within Each Segment', tags: ['buckets', 'groupby', 'rank'], o: true,
    story: 'A CRM campaign splits each customer segment into four spend groups of its own.',
    task: "Return segment, name, spend, quartile ((position - 1) * 4 // n + 1 where position is 1-based by spend descending then name, and n is the size of the segment), segment_avg (1 decimal) and vs_avg ('above' or 'at or below'). Order by segment, spend descending, then name.",
    setup: `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "segment": ["retail"] * 4})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 2, 3, 4], "status": ["delivered"] * 4})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [400, 300, 200, 100]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "segment": ["retail", "retail", "corporate", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 2, 3, 4], "status": ["delivered"] * 4})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [400, 300, 200, 100]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "segment": ["retail"] * 4})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 2, 3, 4], "status": ["delivered", "delivered", "delivered", "cancelled"]})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [400, 300, 200, 100]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, items):
    d = orders[orders["status"] == "delivered"].merge(items, on="order_id").merge(customers, on="customer_id")
    s = d.groupby(["segment", "name"], as_index=False)["amount"].sum().rename(columns={"amount": "spend"})
    s = s.sort_values(["segment", "spend", "name"], ascending=[True, False, True]).reset_index(drop=True)
    s["pos"] = s.groupby("segment").cumcount() + 1
    s["n"] = s.groupby("segment")["spend"].transform("size")
    s["quartile"] = ((s["pos"] - 1) * 4 // s["n"] + 1).astype(int)
    s["segment_avg"] = s.groupby("segment")["spend"].transform("mean").round(1)
    s["vs_avg"] = np.where(s["spend"] > s.groupby("segment")["spend"].transform("mean"), "above", "at or below")
    return s[["segment", "name", "spend", "quartile", "segment_avg", "vs_avg"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, items):
    d = orders[orders["status"] == "delivered"].merge(items, on="order_id").merge(customers, on="customer_id")
    s = d.groupby(["segment", "name"], as_index=False)["amount"].sum().rename(columns={"amount": "spend"})
    s = s.sort_values(["segment", "spend", "name"], ascending=[True, False, True]).reset_index(drop=True)
    s["pos"] = np.arange(1, len(s) + 1)
    s["n"] = len(s)
    s["quartile"] = ((s["pos"] - 1) * 4 // s["n"] + 1).astype(int)
    s["segment_avg"] = s.groupby("segment")["spend"].transform("mean").round(1)
    s["vs_avg"] = np.where(s["spend"] > s.groupby("segment")["spend"].transform("mean"), "above", "at or below")
    return s[["segment", "name", "spend", "quartile", "segment_avg", "vs_avg"]].reset_index(drop=True)`],
    hints: ['The position and the size are both per segment.', 'cumcount gives the position inside the group.'],
    why: 'Buckets only mean something against the size of the group they divide, so both numbers come from the segment.',
    mistakes: 'Numbering the rows across the whole frame buckets the segments against each other instead of within themselves.' },

  { t: 'Last Order and What Changed', tags: ['shift', 'groupby', 'tail'], o: true,
    story: 'Customer success opens an account on its latest delivered order and wants to see whether it beat the one before.',
    task: 'Return name, order_id, day, total, prev_total (the customer\'s previous delivered order) and change (total minus prev_total), one row per customer with a delivered order. Order by name.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 1, 2, 2], "day": [1, 5, 2, 6], "status": ["delivered"] * 4})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 150, 200, 120]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 1, 1, 2], "day": [1, 5, 9, 2], "status": ["delivered"] * 4})
items = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 400, 150, 200]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "name": ["Asha", "Ben"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 1, 2], "day": [1, 5, 2], "status": ["delivered", "cancelled", "delivered"]})
items = pd.DataFrame({"order_id": [1, 2, 3], "amount": [100, 150, 200]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, items):
    t = orders[orders["status"] == "delivered"].merge(items, on="order_id")
    t = t.groupby(["customer_id", "order_id", "day"], as_index=False)["amount"].sum().rename(columns={"amount": "total"})
    t = t.sort_values(["customer_id", "day"]).copy()
    t["prev_total"] = t.groupby("customer_id")["total"].shift()
    last = t.groupby("customer_id", as_index=False).tail(1).copy()
    last["change"] = last["total"] - last["prev_total"]
    out = last.merge(customers, on="customer_id")
    return out.sort_values("name")[["name", "order_id", "day", "total", "prev_total", "change"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, items):
    t = orders[orders["status"] == "delivered"].merge(items, on="order_id")
    t = t.groupby(["customer_id", "order_id", "day"], as_index=False)["amount"].sum().rename(columns={"amount": "total"})
    t = t.sort_values(["customer_id", "day"]).copy()
    last = t.groupby("customer_id", as_index=False).tail(1).copy()
    earlier = t.groupby("customer_id", as_index=False).head(-1).groupby("customer_id", as_index=False)["total"].min()
    last = last.merge(earlier.rename(columns={"total": "prev_total"}), on="customer_id", how="left")
    last["change"] = last["total"] - last["prev_total"]
    out = last.merge(customers, on="customer_id")
    return out.sort_values("name")[["name", "order_id", "day", "total", "prev_total", "change"]].reset_index(drop=True)`],
    hints: ['Shift before you cut down to the last row.', 'Filtering first throws away the row the shift needs.'],
    why: 'The previous order has to be found while it is still in the frame, which is why the shift comes before the tail.',
    mistakes: 'Taking the smallest earlier order looks the same with two orders and goes wrong the moment there are three.' },

  { t: 'Moving Average and Trips per Driver', tags: ['rolling', 'nunique', 'groupby'], o: true,
    story: 'Daily completed-trip counts are noisy, and operations also wants to see how hard the drivers on the road were working.',
    task: 'Return day, trips, active_drivers (distinct drivers with a completed trip), moving_avg (average trips over that day and the 2 days before it, 2 decimals) and trips_per_driver (2 decimals). Oldest day first.',
    setup: `drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Arun", "Bina", "Chet"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "driver_id": [1, 2, 3, 1], "day": [1, 2, 3, 4], "status": ["completed"] * 4})`,
    hidden: [
      `drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Arun", "Bina", "Chet"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4, 5], "driver_id": [1, 2, 2, 3, 1], "day": [1, 2, 2, 3, 4], "status": ["completed"] * 5})`,
      `drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Arun", "Bina", "Chet"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "driver_id": [1, 2, 3, 1], "day": [1, 2, 3, 4], "status": ["completed", "completed", "cancelled", "completed"]})`,
    ],
    sig: 'def solve(drivers: pd.DataFrame, trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(drivers, trips):
    t = trips[trips["status"] == "completed"].merge(drivers, on="driver_id")
    d = t.groupby("day", as_index=False).agg(trips=("trip_id", "size"), active_drivers=("driver_id", "nunique"))
    d = d.sort_values("day")
    d["moving_avg"] = d["trips"].rolling(3, min_periods=1).mean().round(2)
    d["trips_per_driver"] = (d["trips"] / d["active_drivers"]).round(2)
    return d[["day", "trips", "active_drivers", "moving_avg", "trips_per_driver"]].reset_index(drop=True)`,
    wrong: [`def solve(drivers, trips):
    t = trips[trips["status"] == "completed"].merge(drivers, on="driver_id")
    d = t.groupby("day", as_index=False).agg(trips=("trip_id", "size"), active_drivers=("driver_id", "size"))
    d = d.sort_values("day")
    d["moving_avg"] = d["trips"].rolling(3, min_periods=1).mean().round(2)
    d["trips_per_driver"] = (d["trips"] / d["active_drivers"]).round(2)
    return d[["day", "trips", "active_drivers", "moving_avg", "trips_per_driver"]].reset_index(drop=True)`],
    hints: ['Total the trips per day before the window touches anything.', 'Distinct drivers is not the same as rows.'],
    why: 'Rolling over the daily rows is what makes the window mean three days, and nunique counts drivers rather than their trips.',
    mistakes: 'Counting rows for the drivers inflates the figure the moment one driver takes two trips in a day.' },

  { t: 'City Leaderboard With a Cancellation Penalty', tags: ['left merge', 'conditional sum', 'rank'], o: true,
    story: 'Each city ranks its drivers on earnings, minus 100 for every trip the driver cancelled. Drivers with no trips still appear.',
    task: 'Return city, driver, earnings (completed fares, 0 when none), cancelled (trips with status cancelled_by_driver), net_score (earnings - 100 * cancelled) and rk (rank within the city by net_score, highest first, ties sharing a rank). Order by city, rk, driver.',
    setup: `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3], "driver_id": [1, 1, 2], "status": ["completed", "cancelled_by_driver", "completed"], "fare": [300.0, np.nan, 150.0]})`,
    hidden: [
      `drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Arun", "Bina", "Chet"], "city": ["Mumbai", "Mumbai", "Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3], "driver_id": [1, 1, 2], "status": ["completed", "cancelled_by_driver", "completed"], "fare": [300.0, np.nan, 150.0]})`,
      `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Delhi"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3], "driver_id": [1, 2, 2], "status": ["completed", "completed", "cancelled_by_driver"], "fare": [300.0, 400.0, np.nan]})`,
    ],
    sig: 'def solve(drivers: pd.DataFrame, trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(drivers, trips):
    t = trips.copy()
    t["earn"] = np.where(t["status"] == "completed", t["fare"].fillna(0), 0)
    t["canc"] = (t["status"] == "cancelled_by_driver").astype(int)
    g = t.groupby("driver_id", as_index=False).agg(earnings=("earn", "sum"), cancelled=("canc", "sum"))
    d = drivers.merge(g, on="driver_id", how="left")
    d["earnings"] = d["earnings"].fillna(0).astype(int)
    d["cancelled"] = d["cancelled"].fillna(0).astype(int)
    d["net_score"] = d["earnings"] - 100 * d["cancelled"]
    d["rk"] = d.groupby("city")["net_score"].rank(method="min", ascending=False).astype(int)
    return d.sort_values(["city", "rk", "driver"])[["city", "driver", "earnings", "cancelled", "net_score", "rk"]].reset_index(drop=True)`,
    wrong: [`def solve(drivers, trips):
    t = trips.copy()
    t["earn"] = np.where(t["status"] == "completed", t["fare"].fillna(0), 0)
    t["canc"] = (t["status"] == "cancelled_by_driver").astype(int)
    g = t.groupby("driver_id", as_index=False).agg(earnings=("earn", "sum"), cancelled=("canc", "sum"))
    d = drivers.merge(g, on="driver_id")
    d["earnings"] = d["earnings"].astype(int)
    d["cancelled"] = d["cancelled"].astype(int)
    d["net_score"] = d["earnings"] - 100 * d["cancelled"]
    d["rk"] = d.groupby("city")["net_score"].rank(method="min", ascending=False).astype(int)
    return d.sort_values(["city", "rk", "driver"])[["city", "driver", "earnings", "cancelled", "net_score", "rk"]].reset_index(drop=True)`],
    hints: ['Start from the drivers, not the trips.', 'A left merge is what keeps a driver who never drove.'],
    why: 'The leaderboard is about drivers, so the driver frame drives the merge and the missing totals become zeros.',
    mistakes: 'An inner merge quietly removes the drivers with no trips, who are the ones a leaderboard most needs to show.' },

  { t: 'The Two Busiest Hours in Each City', tags: ['groupby', 'rank', 'share'], o: true,
    story: 'Supply planning wants the two peak hours of the day in every city.',
    task: 'Over completed trips, return city, hour, trips, fare (total) and pct_of_city (the hour\'s share of that city\'s completed trips, 1 decimal), keeping the two hours with the most trips in each city (ties broken by fare descending, then hour). Order by city, trips descending, fare descending, hour.',
    setup: `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "driver_id": [1, 1, 2, 2], "city": ["Mumbai"] * 4, "hour": [8, 8, 18, 22], "status": ["completed"] * 4, "fare": [200, 300, 400, 100]})`,
    hidden: [
      `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Delhi"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4, 5], "driver_id": [1, 1, 2, 2, 2], "city": ["Mumbai", "Mumbai", "Delhi", "Delhi", "Delhi"], "hour": [8, 18, 9, 9, 20], "status": ["completed"] * 5, "fare": [200, 300, 400, 100, 250]})`,
      `drivers = pd.DataFrame({"driver_id": [1, 2], "driver": ["Arun", "Bina"], "city": ["Mumbai", "Mumbai"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "driver_id": [1, 1, 2, 2], "city": ["Mumbai"] * 4, "hour": [8, 8, 18, 18], "status": ["completed", "completed", "completed", "cancelled"], "fare": [200, 300, 400, 100]})`,
    ],
    sig: 'def solve(drivers: pd.DataFrame, trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(drivers, trips):
    t = trips[trips["status"] == "completed"].merge(drivers[["driver_id"]], on="driver_id")
    h = t.groupby(["city", "hour"], as_index=False).agg(trips=("trip_id", "size"), fare=("fare", "sum"))
    h["pct_of_city"] = (100.0 * h["trips"] / h.groupby("city")["trips"].transform("sum")).round(1)
    h = h.sort_values(["city", "trips", "fare", "hour"], ascending=[True, False, False, True])
    top = h.groupby("city", as_index=False).head(2)
    return top[["city", "hour", "trips", "fare", "pct_of_city"]].reset_index(drop=True)`,
    wrong: [`def solve(drivers, trips):
    t = trips[trips["status"] == "completed"].merge(drivers[["driver_id"]], on="driver_id")
    h = t.groupby(["city", "hour"], as_index=False).agg(trips=("trip_id", "size"), fare=("fare", "sum"))
    h["pct_of_city"] = (100.0 * h["trips"] / h["trips"].sum()).round(1)
    h = h.sort_values(["city", "trips", "fare", "hour"], ascending=[True, False, False, True])
    top = h.groupby("city", as_index=False).head(2)
    return top[["city", "hour", "trips", "fare", "pct_of_city"]].reset_index(drop=True)`],
    hints: ['The share is out of the city, not out of everything.', 'transform("sum") over the city gives the right denominator.'],
    why: 'Each city is its own market, so the denominator has to be the city\'s own traffic.',
    mistakes: 'Dividing by the grand total makes every city look small the moment there is more than one.' },

  { t: 'Fares Against the Rider\'s Own Average', tags: ['expanding', 'shift', 'groupby'], o: true,
    story: 'Pricing wants each completed fare set against what that rider had been paying up to then.',
    task: "Return rider, day, fare, prev_fare and avg_before (the mean of that rider's earlier completed fares, 2 decimals), plus verdict ('above' or 'at or below' avg_before), for trips that have an earlier trip. Order by rider, day.",
    setup: `riders = pd.DataFrame({"rider_id": [1, 2], "rider": ["Ria", "Sam"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "rider_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "status": ["completed"] * 4, "fare": [200, 200, 300, 300]})`,
    hidden: [
      `riders = pd.DataFrame({"rider_id": [1, 2], "rider": ["Ria", "Sam"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4, 5], "rider_id": [1, 1, 1, 2, 2], "day": [1, 2, 3, 1, 2], "status": ["completed"] * 5, "fare": [100, 300, 200, 300, 300]})`,
      `riders = pd.DataFrame({"rider_id": [1, 2], "rider": ["Ria", "Sam"]})
trips = pd.DataFrame({"trip_id": [1, 2, 3, 4], "rider_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "status": ["completed", "cancelled", "completed", "completed"], "fare": [200, 900, 300, 500]})`,
    ],
    sig: 'def solve(riders: pd.DataFrame, trips: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(riders, trips):
    t = trips[trips["status"] == "completed"].sort_values(["rider_id", "day"]).copy()
    t["prev_fare"] = t.groupby("rider_id")["fare"].shift()
    t["avg_before"] = t.groupby("rider_id")["fare"].apply(lambda s: s.shift().expanding().mean()).reset_index(level=0, drop=True)
    t = t.dropna(subset=["prev_fare"]).copy()
    t["verdict"] = np.where(t["fare"] > t["avg_before"], "above", "at or below")
    t["prev_fare"] = t["prev_fare"].astype(int)
    t["avg_before"] = t["avg_before"].round(2)
    out = t.merge(riders, on="rider_id")
    return out.sort_values(["rider", "day"])[["rider", "day", "fare", "prev_fare", "avg_before", "verdict"]].reset_index(drop=True)`,
    wrong: [`def solve(riders, trips):
    t = trips[trips["status"] == "completed"].sort_values(["rider_id", "day"]).copy()
    t["prev_fare"] = t.groupby("rider_id")["fare"].shift()
    t["avg_before"] = t.groupby("rider_id")["fare"].expanding().mean().reset_index(level=0, drop=True)
    t = t.dropna(subset=["prev_fare"]).copy()
    t["verdict"] = np.where(t["fare"] > t["avg_before"], "above", "at or below")
    t["prev_fare"] = t["prev_fare"].astype(int)
    t["avg_before"] = t["avg_before"].round(2)
    out = t.merge(riders, on="rider_id")
    return out.sort_values(["rider", "day"])[["rider", "day", "fare", "prev_fare", "avg_before", "verdict"]].reset_index(drop=True)`],
    hints: ['"Up to then" does not include the fare you are judging.', 'Shift before the expanding mean.'],
    why: 'Shifting first excludes the current fare from its own benchmark, which is the whole point of the comparison.',
    mistakes: 'An expanding mean that includes the current row drags the benchmark towards the fare and hides the outliers.' },

  { t: 'Ties in the Gradebook', tags: ['rank', 'dense_rank', 'groupby'], o: true,
    story: 'Prize-giving has to deal with students who scored exactly the same in a course and term.',
    task: 'Return course, term, student, score, rk (rank within course and term, highest first, ties sharing the lowest rank), d_rk (dense rank over the same order) and tied (how many students share that score), keeping only shared scores. Order by course, term, score descending, student.',
    setup: `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2, 3], "student": ["Aarav", "Bhavna", "Chirag"]})
scores = pd.DataFrame({"student_id": [1, 2, 3], "course_id": [1, 1, 1], "term": ["T1"] * 3, "score": [88, 88, 70]})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1], "course": ["Math"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Aarav", "Bhavna", "Chirag", "Disha"]})
scores = pd.DataFrame({"student_id": [1, 2, 3, 4], "course_id": [1, 1, 1, 1], "term": ["T1"] * 4, "score": [95, 95, 88, 88]})`,
      `courses = pd.DataFrame({"course_id": [1, 2], "course": ["Math", "Physics"]})
students = pd.DataFrame({"student_id": [1, 2], "student": ["Aarav", "Bhavna"]})
scores = pd.DataFrame({"student_id": [1, 2, 1, 2], "course_id": [1, 1, 2, 2], "term": ["T1", "T1", "T1", "T1"], "score": [80, 80, 60, 70]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, students, scores):
    s = scores.merge(students, on="student_id").merge(courses, on="course_id").copy()
    g = s.groupby(["course_id", "term"])["score"]
    s["rk"] = g.rank(method="min", ascending=False).astype(int)
    s["d_rk"] = g.rank(method="dense", ascending=False).astype(int)
    s["tied"] = s.groupby(["course_id", "term", "score"])["student_id"].transform("size")
    t = s[s["tied"] > 1]
    return t.sort_values(["course", "term", "score", "student"], ascending=[True, True, False, True])[["course", "term", "student", "score", "rk", "d_rk", "tied"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, students, scores):
    s = scores.merge(students, on="student_id").merge(courses, on="course_id").copy()
    g = s.groupby(["course_id", "term"])["score"]
    s["rk"] = g.rank(method="min", ascending=False).astype(int)
    s["d_rk"] = g.rank(method="min", ascending=False).astype(int)
    s["tied"] = s.groupby(["course_id", "term", "score"])["student_id"].transform("size")
    t = s[s["tied"] > 1]
    return t.sort_values(["course", "term", "score", "student"], ascending=[True, True, False, True])[["course", "term", "student", "score", "rk", "d_rk", "tied"]].reset_index(drop=True)`],
    hints: ['"min" leaves a gap after a tie; "dense" does not.', 'Add the score to the grouping to count who shares it.'],
    why: 'The two ranking methods differ only after a tie, which is exactly the rows this report keeps.',
    mistakes: 'Using the same method twice looks right while the tie is at the top and diverges as soon as something sits above it.' },

  { t: 'Top Quarter of Each Class by Term', tags: ['buckets', 'groupby', 'transform'], o: true,
    story: 'Each class publishes its strongest quarter for every term.',
    task: 'Return class, term, student, total (that student\'s scores in the term) and class_avg (1 decimal), keeping the first quarter of each class and term by total descending then student, where the quarter is (position - 1) * 4 // n + 1. Order by class, term, total descending, student.',
    setup: `students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Aarav", "Bhavna", "Chirag", "Disha"], "class": ["A"] * 4})
scores = pd.DataFrame({"student_id": [1, 2, 3, 4], "term": ["T1"] * 4, "score": [90, 80, 70, 60]})`,
    hidden: [
      `students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Aarav", "Bhavna", "Chirag", "Disha"], "class": ["A", "A", "B", "B"]})
scores = pd.DataFrame({"student_id": [1, 2, 3, 4], "term": ["T1"] * 4, "score": [90, 80, 70, 60]})`,
      `students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Aarav", "Bhavna", "Chirag", "Disha"], "class": ["A"] * 4})
scores = pd.DataFrame({"student_id": [1, 2, 3, 4, 1, 2, 3, 4], "term": ["T1"] * 4 + ["T2"] * 4, "score": [90, 80, 70, 60, 50, 95, 65, 75]})`,
    ],
    sig: 'def solve(students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(students, scores):
    t = scores.merge(students, on="student_id").groupby(["class", "term", "student"], as_index=False)["score"].sum()
    t = t.rename(columns={"score": "total"}).sort_values(["class", "term", "total", "student"], ascending=[True, True, False, True]).reset_index(drop=True)
    t["pos"] = t.groupby(["class", "term"]).cumcount() + 1
    t["n"] = t.groupby(["class", "term"])["total"].transform("size")
    t["q"] = (t["pos"] - 1) * 4 // t["n"] + 1
    t["class_avg"] = t.groupby(["class", "term"])["total"].transform("mean").round(1)
    return t[t["q"] == 1][["class", "term", "student", "total", "class_avg"]].reset_index(drop=True)`,
    wrong: [`def solve(students, scores):
    t = scores.merge(students, on="student_id").groupby(["class", "term", "student"], as_index=False)["score"].sum()
    t = t.rename(columns={"score": "total"}).sort_values(["class", "term", "total", "student"], ascending=[True, True, False, True]).reset_index(drop=True)
    t["pos"] = np.arange(1, len(t) + 1)
    t["n"] = len(t)
    t["q"] = (t["pos"] - 1) * 4 // t["n"] + 1
    t["class_avg"] = t.groupby(["class", "term"])["total"].transform("mean").round(1)
    return t[t["q"] == 1][["class", "term", "student", "total", "class_avg"]].reset_index(drop=True)`],
    hints: ['Class and term together make the group.', 'Both the position and the size come from that group.'],
    why: 'Each class and term is ranked on its own, so the bucket arithmetic uses that group\'s size.',
    mistakes: 'Numbering across the whole frame puts the strongest class\'s students in the top quarter and nobody else.' },

  { t: 'Running Balance and the Low Point', tags: ['cumsum', 'cummin', 'merge'], o: true,
    story: 'Risk reads each account as a statement and wants to see how low it ever went.',
    task: 'Return owner, day, amount, running_balance (cumulative by day) and min_so_far (the lowest running balance up to and including that row). Order by owner, day.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "amount": [500, 300, 800, 200]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "amount": [500, -300, 800, 200]})`,
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 1], "day": [1, 2, 3], "amount": [100, -400, 600]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["running_balance"] = t.groupby("account_id")["amount"].cumsum()
    t["min_so_far"] = t.groupby("account_id")["running_balance"].cummin()
    out = t.merge(accounts, on="account_id")
    return out.sort_values(["owner", "day"])[["owner", "day", "amount", "running_balance", "min_so_far"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["running_balance"] = t.groupby("account_id")["amount"].cumsum()
    t["min_so_far"] = t.groupby("account_id")["running_balance"].transform("min")
    out = t.merge(accounts, on="account_id")
    return out.sort_values(["owner", "day"])[["owner", "day", "amount", "running_balance", "min_so_far"]].reset_index(drop=True)`],
    hints: ['"So far" means a running minimum, not the minimum of everything.', 'cummin walks the rows in order.'],
    why: 'A running minimum answers what was known at each point, which is what a statement shows.',
    mistakes: 'The group minimum reports a low point the account had not reached yet, which only looks right while the balance never falls.' },

  { t: 'Biggest Withdrawal and What Was Left', tags: ['cumsum', 'idxmin', 'filtering'], o: true,
    story: 'Each account\'s largest withdrawal gets a second look, with the balance it left behind.',
    task: 'Return owner, day, amount and balance_after (the running balance right after that transaction) for the largest withdrawal of each account (ties broken by the earlier day). Only accounts with a withdrawal. Order by owner.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "amount": [-200, -500, -100, -400], "kind": ["withdrawal"] * 4})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5], "account_id": [1, 1, 1, 2, 2], "day": [1, 2, 3, 1, 2], "amount": [-200, 900, -500, -100, -400], "kind": ["withdrawal", "deposit", "withdrawal", "withdrawal", "withdrawal"]})`,
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 2], "day": [1, 2, 1], "amount": [-200, -500, 300], "kind": ["withdrawal", "withdrawal", "deposit"]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["balance_after"] = t.groupby("account_id")["amount"].cumsum()
    w = t[t["kind"] == "withdrawal"].sort_values(["account_id", "amount", "day"])
    pick = w.groupby("account_id", as_index=False).head(1)
    out = pick.merge(accounts, on="account_id")
    return out.sort_values("owner")[["owner", "day", "amount", "balance_after"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    w = transactions[transactions["kind"] == "withdrawal"].sort_values(["account_id", "day"]).copy()
    w["balance_after"] = w.groupby("account_id")["amount"].cumsum()
    w = w.sort_values(["account_id", "amount", "day"])
    pick = w.groupby("account_id", as_index=False).head(1)
    out = pick.merge(accounts, on="account_id")
    return out.sort_values("owner")[["owner", "day", "amount", "balance_after"]].reset_index(drop=True)`],
    hints: ['The balance has to be built from every transaction.', 'Filter to withdrawals only after the running total exists.'],
    why: 'A balance is the sum of everything that happened, so the deposits in between cannot be dropped first.',
    mistakes: 'Filtering before the cumulative sum silently leaves the deposits out of the balance.' },

  { t: 'Withdrawals That Were Tight', tags: ['shift', 'cumsum', 'case'], o: true,
    story: 'A withdrawal that takes more than half of what is in the account is worth flagging.',
    task: "Return owner, day, amount, balance_before (the running balance before that transaction, 0 for the first) and tight ('yes' when balance_before is less than twice the size of the withdrawal, else 'no'), for withdrawals only. Order by owner, day.",
    setup: `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3, 4], "account_id": [1, 1, 2, 2], "day": [1, 2, 1, 2], "amount": [300, -500, 2000, -100], "kind": ["deposit", "withdrawal", "deposit", "withdrawal"]})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1], "owner": ["Asha"]})
transactions = pd.DataFrame({"txn_id": [1, 2], "account_id": [1, 1], "day": [1, 2], "amount": [700, -500], "kind": ["deposit", "withdrawal"]})`,
      `accounts = pd.DataFrame({"account_id": [1, 2], "owner": ["Asha", "Ben"]})
transactions = pd.DataFrame({"txn_id": [1, 2, 3], "account_id": [1, 1, 2], "day": [1, 2, 1], "amount": [300, -100, -50], "kind": ["deposit", "withdrawal", "withdrawal"]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, transactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["balance_before"] = t.groupby("account_id")["amount"].cumsum() - t["amount"]
    w = t[t["kind"] == "withdrawal"].copy()
    w["tight"] = np.where(w["balance_before"] < -2 * w["amount"], "yes", "no")
    out = w.merge(accounts, on="account_id")
    return out.sort_values(["owner", "day"])[["owner", "day", "amount", "balance_before", "tight"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, transactions):
    t = transactions.sort_values(["account_id", "day"]).copy()
    t["balance_before"] = t.groupby("account_id")["amount"].cumsum() - t["amount"]
    w = t[t["kind"] == "withdrawal"].copy()
    w["tight"] = np.where(w["balance_before"] < -w["amount"], "yes", "no")
    out = w.merge(accounts, on="account_id")
    return out.sort_values(["owner", "day"])[["owner", "day", "amount", "balance_before", "tight"]].reset_index(drop=True)`],
    hints: ['The amount is negative, so twice its size is -2 * amount.', 'The balance before is the running total minus this row.'],
    why: 'Subtracting the current amount from the running total gives the balance as it stood just before the withdrawal.',
    mistakes: 'Comparing against the withdrawal itself only flags one that would overdraw, which is a stricter rule than the one asked for.' },

  { t: 'Longest Gap per User', tags: ['sorting', 'diff', 'idxmax'], o: true,
    story: 'Product wants each user\'s longest silence, and what finally brought them back.',
    task: 'Return name, gap_started, gap_ended, gap_min and next_event (the event that ended the gap) for the longest gap between consecutive events of each user, breaking ties by the earlier end. Order by name.',
    setup: `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 1, 2, 2, 2], "minute": [0, 10, 100, 0, 5, 20], "event_type": ["login", "view", "purchase", "login", "view", "logout"]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 1, 2, 2, 2], "minute": [100, 0, 10, 20, 0, 5], "event_type": ["purchase", "login", "view", "logout", "login", "view"]})`,
      `users = pd.DataFrame({"user_id": [1], "name": ["Ana"]})
events = pd.DataFrame({"event_id": [1, 2, 3], "user_id": [1, 1, 1], "minute": [0, 50, 60], "event_type": ["login", "view", "purchase"]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    e = events.sort_values(["user_id", "minute"]).copy()
    e["prev"] = e.groupby("user_id")["minute"].shift()
    e = e.dropna(subset=["prev"]).copy()
    e["gap_min"] = (e["minute"] - e["prev"]).astype(int)
    e = e.sort_values(["user_id", "gap_min", "minute"], ascending=[True, False, True])
    pick = e.groupby("user_id", as_index=False).head(1).copy()
    pick["gap_started"] = pick["prev"].astype(int)
    out = pick.merge(users, on="user_id")
    return out.sort_values("name")[["name", "gap_started", "minute", "gap_min", "event_type"]].rename(columns={"minute": "gap_ended", "event_type": "next_event"}).reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    e = events.copy()
    e["prev"] = e.groupby("user_id")["minute"].shift()
    e = e.dropna(subset=["prev"]).copy()
    e["gap_min"] = (e["minute"] - e["prev"]).astype(int)
    e = e.sort_values(["user_id", "gap_min", "minute"], ascending=[True, False, True])
    pick = e.groupby("user_id", as_index=False).head(1).copy()
    pick["gap_started"] = pick["prev"].astype(int)
    out = pick.merge(users, on="user_id")
    return out.sort_values("name")[["name", "gap_started", "minute", "gap_min", "event_type"]].rename(columns={"minute": "gap_ended", "event_type": "next_event"}).reset_index(drop=True)`],
    hints: ['A shift follows the frame\'s order, not the clock.', 'Sort by user and time before shifting.'],
    why: 'The gap between consecutive events only means anything once the events are in time order.',
    mistakes: 'Shifting an unsorted frame produces negative gaps and the wrong neighbour as soon as the rows arrive out of order.' },

  { t: 'Sessions, Their Length and Their Events', tags: ['sessionization', 'cumsum', 'groupby'], o: true,
    story: 'Analytics groups a user\'s events into sessions: a gap of more than 30 minutes starts a new one.',
    task: 'Return name, session_no (1, 2, ... per user in time order), started, ended, events and minutes (last minus first). Order by name, session_no.',
    setup: `users = pd.DataFrame({"user_id": [1], "name": ["Ana"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 1, 1], "minute": [0, 10, 100, 110]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1], "name": ["Ana"]})
events = pd.DataFrame({"event_id": [1, 2, 3], "user_id": [1, 1, 1], "minute": [0, 30, 70]})`,
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 2, 2], "minute": [0, 100, 0, 5]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    e = events.sort_values(["user_id", "minute"]).copy()
    gap = e["minute"] - e.groupby("user_id")["minute"].shift()
    e["new_session"] = (gap.isna() | (gap > 30)).astype(int)
    e["session_no"] = e.groupby("user_id")["new_session"].cumsum()
    g = e.groupby(["user_id", "session_no"], as_index=False).agg(started=("minute", "min"), ended=("minute", "max"), events=("event_id", "size"))
    g["minutes"] = g["ended"] - g["started"]
    out = g.merge(users, on="user_id")
    return out.sort_values(["name", "session_no"])[["name", "session_no", "started", "ended", "events", "minutes"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    e = events.sort_values(["user_id", "minute"]).copy()
    gap = e["minute"] - e.groupby("user_id")["minute"].shift()
    e["new_session"] = (gap.isna() | (gap >= 30)).astype(int)
    e["session_no"] = e.groupby("user_id")["new_session"].cumsum()
    g = e.groupby(["user_id", "session_no"], as_index=False).agg(started=("minute", "min"), ended=("minute", "max"), events=("event_id", "size"))
    g["minutes"] = g["ended"] - g["started"]
    out = g.merge(users, on="user_id")
    return out.sort_values(["name", "session_no"])[["name", "session_no", "started", "ended", "events", "minutes"]].reset_index(drop=True)`],
    hints: ['Mark the first event of each session with a 1, then take a running sum.', 'A gap of exactly 30 minutes is still the same session.'],
    why: 'A running sum over a 0/1 flag numbers the sessions, and the rule says more than 30, not 30 or more.',
    mistakes: 'Using >= splits a session at exactly the boundary, which no data shows until a gap lands on it.' },

  { t: 'What Users Did First, and Whether They Bought', tags: ['first', 'left merge', 'missing values'], o: true,
    story: 'Onboarding wants each user\'s very first action, and how long it took them to buy, if they ever did.',
    task: 'Return name, first_event, first_minute and minutes_to_purchase (first purchase minus first event, NaN when there was none), for users with events. Order by name.',
    setup: `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 2, 2], "minute": [0, 15, 0, 40], "event_type": ["login", "purchase", "login", "purchase"]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 2, 2], "minute": [0, 15, 0, 40], "event_type": ["login", "purchase", "login", "view"]})`,
      `users = pd.DataFrame({"user_id": [1, 2], "name": ["Ana", "Bo"]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4], "user_id": [1, 1, 2, 2], "minute": [5, 15, 0, 40], "event_type": ["view", "purchase", "login", "purchase"]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    e = events.sort_values(["user_id", "minute"])
    first = e.groupby("user_id", as_index=False).head(1)[["user_id", "minute", "event_type"]]
    first = first.rename(columns={"minute": "first_minute", "event_type": "first_event"})
    buy = e[e["event_type"] == "purchase"].groupby("user_id", as_index=False)["minute"].min().rename(columns={"minute": "bought"})
    m = first.merge(buy, on="user_id", how="left").merge(users, on="user_id")
    m["minutes_to_purchase"] = m["bought"] - m["first_minute"]
    return m.sort_values("name")[["name", "first_event", "first_minute", "minutes_to_purchase"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    e = events.sort_values(["user_id", "minute"])
    first = e.groupby("user_id", as_index=False).head(1)[["user_id", "minute", "event_type"]]
    first = first.rename(columns={"minute": "first_minute", "event_type": "first_event"})
    buy = e[e["event_type"] == "purchase"].groupby("user_id", as_index=False)["minute"].min().rename(columns={"minute": "bought"})
    m = first.merge(buy, on="user_id").merge(users, on="user_id")
    m["minutes_to_purchase"] = m["bought"] - m["first_minute"]
    return m.sort_values("name")[["name", "first_event", "first_minute", "minutes_to_purchase"]].reset_index(drop=True)`],
    hints: ['Everyone with an event gets a row, buyer or not.', 'A left merge leaves the non-buyers with NaN.'],
    why: 'The first action and the first purchase are separate questions, joined on the left so one cannot delete the other.',
    mistakes: 'An inner merge drops every user who never bought, which is most of the funnel.' },

  { t: 'Cumulative Signups by Plan', tags: ['cumsum', 'groupby', 'isin'], o: true,
    story: 'Growth tracks signups per plan as they accumulate, and how many of them ever did anything.',
    task: 'Return day, plan, signups, activated (signups that day and plan with at least one event), running_by_plan (cumulative within the plan) and running_all (cumulative overall by day then plan). Order by day, plan.',
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3, 4], "day": [1, 1, 2, 3], "plan": ["free"] * 4})
events = pd.DataFrame({"event_id": [1, 2, 3], "user_id": [1, 2, 3]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2, 3, 4], "day": [1, 1, 2, 3], "plan": ["free", "pro", "free", "pro"]})
events = pd.DataFrame({"event_id": [1, 2, 3], "user_id": [1, 2, 3]})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3], "day": [1, 2, 3], "plan": ["free"] * 3})
events = pd.DataFrame({"event_id": [1], "user_id": [2]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, events):
    u = users.copy()
    u["active"] = u["user_id"].isin(events["user_id"]).astype(int)
    a = u.groupby(["day", "plan"], as_index=False).agg(signups=("user_id", "size"), activated=("active", "sum"))
    a = a.sort_values(["plan", "day"])
    a["running_by_plan"] = a.groupby("plan")["signups"].cumsum()
    a = a.sort_values(["day", "plan"])
    a["running_all"] = a["signups"].cumsum()
    return a[["day", "plan", "signups", "activated", "running_by_plan", "running_all"]].reset_index(drop=True)`,
    wrong: [`def solve(users, events):
    u = users.copy()
    u["active"] = u["user_id"].isin(events["user_id"]).astype(int)
    a = u.groupby(["day", "plan"], as_index=False).agg(signups=("user_id", "size"), activated=("active", "sum"))
    a = a.sort_values(["day", "plan"])
    a["running_by_plan"] = a["signups"].cumsum()
    a["running_all"] = a["signups"].cumsum()
    return a[["day", "plan", "signups", "activated", "running_by_plan", "running_all"]].reset_index(drop=True)`],
    hints: ['Sort by plan and day before the per-plan running total.', 'The overall one needs the rows back in day order.'],
    why: 'The two totals accumulate over different orderings, so each gets its own sort before the cumsum.',
    mistakes: 'One cumsum used for both makes the per-plan figure run straight through the other plans.' },

  { t: 'Median Pay per Department, and Who Is Nearest', tags: ['median', 'transform', 'idxmin'], o: true,
    story: 'Compensation wants the median salary of each department, and the person sitting closest to it.',
    task: 'Return department, median_salary (1 decimal), nearest (the employee closest to it, ties by name) and salary. Order by department.',
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5, 6], "name": ["Asha", "Ben", "Chitra", "Dev", "Esha", "Farid"], "dept_id": [1, 1, 1, 2, 2, 2], "salary": [100000, 120000, 140000, 60000, 80000, 100000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4, 5, 6], "name": ["Asha", "Ben", "Chitra", "Dev", "Esha", "Farid"], "dept_id": [1, 1, 1, 2, 2, 2], "salary": [100000, 120000, 400000, 60000, 80000, 100000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 2, 2], "salary": [100000, 140000, 60000, 80000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame, departments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees, departments):
    e = employees.merge(departments, on="dept_id").copy()
    e["median_salary"] = e.groupby("dept_id")["salary"].transform("median").round(1)
    e["off"] = (e["salary"] - e["median_salary"]).abs()
    e = e.sort_values(["department", "off", "name"])
    pick = e.groupby("department", as_index=False).head(1)
    return pick.sort_values("department")[["department", "median_salary", "name", "salary"]].rename(columns={"name": "nearest"}).reset_index(drop=True)`,
    wrong: [`def solve(employees, departments):
    e = employees.merge(departments, on="dept_id").copy()
    e["median_salary"] = e.groupby("dept_id")["salary"].transform("mean").round(1)
    e["off"] = (e["salary"] - e["median_salary"]).abs()
    e = e.sort_values(["department", "off", "name"])
    pick = e.groupby("department", as_index=False).head(1)
    return pick.sort_values("department")[["department", "median_salary", "name", "salary"]].rename(columns={"name": "nearest"}).reset_index(drop=True)`],
    hints: ['The median is not the mean.', 'They agree on an evenly spread department and part company on a skewed one.'],
    why: 'The median is the middle value, which is why compensation asks for it: one very large salary does not move it.',
    mistakes: 'The mean looks identical on a tidy department and is dragged away by a single outlier.' },

  { t: 'Pay Against Department and Title Peers', tags: ['transform', 'case', 'merge'], o: true,
    story: 'A pay review asks whether someone is ahead of their department, ahead of others with the same title, or both.',
    task: "Return department, name, title, salary, dept_avg and title_avg (both 1 decimal) and above: 'both', 'department only', 'title only' or 'neither'. Order by department, name.",
    setup: `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 2, 2], "title": ["Engineer"] * 4, "salary": [120000, 100000, 90000, 70000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
    hidden: [
      `employees = pd.DataFrame({"employee_id": [1, 2, 3, 4], "name": ["Asha", "Ben", "Chitra", "Dev"], "dept_id": [1, 1, 2, 2], "title": ["Engineer", "Manager", "Engineer", "Manager"], "salary": [120000, 100000, 90000, 70000]})
departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})`,
      `employees = pd.DataFrame({"employee_id": [1, 2, 3], "name": ["Asha", "Ben", "Chitra"], "dept_id": [1, 1, 1], "title": ["Engineer"] * 3, "salary": [100000, 100000, 100000]})
departments = pd.DataFrame({"dept_id": [1], "department": ["Engineering"]})`,
    ],
    sig: 'def solve(employees: pd.DataFrame, departments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(employees, departments):
    e = employees.merge(departments, on="dept_id").copy()
    da = e.groupby("dept_id")["salary"].transform("mean")
    ta = e.groupby("title")["salary"].transform("mean")
    e["dept_avg"] = da.round(1)
    e["title_avg"] = ta.round(1)
    e["above"] = np.where((e["salary"] > da) & (e["salary"] > ta), "both",
                   np.where(e["salary"] > da, "department only",
                     np.where(e["salary"] > ta, "title only", "neither")))
    return e.sort_values(["department", "name"])[["department", "name", "title", "salary", "dept_avg", "title_avg", "above"]].reset_index(drop=True)`,
    wrong: [`def solve(employees, departments):
    e = employees.merge(departments, on="dept_id").copy()
    da = e.groupby("dept_id")["salary"].transform("mean")
    ta = e["salary"].mean()
    e["dept_avg"] = da.round(1)
    e["title_avg"] = round(ta, 1)
    e["above"] = np.where((e["salary"] > da) & (e["salary"] > ta), "both",
                   np.where(e["salary"] > da, "department only",
                     np.where(e["salary"] > ta, "title only", "neither")))
    return e.sort_values(["department", "name"])[["department", "name", "title", "salary", "dept_avg", "title_avg", "above"]].reset_index(drop=True)`],
    hints: ['Two transforms, two different groupings.', 'The title average has nothing to do with the department.'],
    why: 'Grouped transforms let one row be measured against two separate peer groups without any self join.',
    mistakes: 'The company average stands in for the title average only while everyone shares one title.' },
];
