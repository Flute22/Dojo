// Pandas, interview-grade set: Medium, batch 3.
export default [
  { t: 'Share of Total Revenue by Category', tags: ['groupby', 'share', 'merge'],
    story: 'Finance wants to see how the revenue splits across categories.',
    task: 'Return category, revenue and share (the category\'s share of all revenue, rounded to 2 decimals).',
    setup: `categories = pd.DataFrame({"category_id": [1], "category": ["Stationery"]})
products = pd.DataFrame({"product_id": [10, 11], "category_id": [1, 1], "product": ["Pen", "Notebook"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3], "product_id": [10, 10, 11], "amount": [300, 200, 500]})`,
    hidden: [
      `categories = pd.DataFrame({"category_id": [1, 2], "category": ["Stationery", "Furniture"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "category_id": [1, 1, 2], "product": ["Pen", "Notebook", "Desk"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4], "product_id": [10, 10, 11, 12], "amount": [300, 200, 500, 1000]})`,
      `categories = pd.DataFrame({"category_id": [1, 2], "category": ["Stationery", "Furniture"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "category_id": [1, 2, 2], "product": ["Pen", "Desk", "Chair"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3], "product_id": [10, 11, 12], "amount": [250, 500, 250]})`,
    ],
    sig: 'def solve(categories: pd.DataFrame, products: pd.DataFrame, sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(categories, products, sales):
    m = sales.merge(products, on="product_id").merge(categories, on="category_id")
    g = m.groupby("category", as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    g["share"] = (g["revenue"] / g["revenue"].sum()).round(2)
    return g`,
    wrong: [`def solve(categories, products, sales):
    m = sales.merge(products, on="product_id").merge(categories, on="category_id")
    g = m.groupby("category", as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    g["share"] = (g["revenue"] / g["revenue"]).round(2)
    return g`],
    hints: ['The denominator is the revenue of every category together.', 'Sum the grouped column after grouping, not inside each group.'],
    why: 'Dividing each category by the total of the grouped frame gives its share of the whole.',
    mistakes: 'Dividing a group by itself always gives 1, which looks right while there is a single category.' },

  { t: 'Runner-Up Salary in Each Department', tags: ['drop_duplicates', 'rank', 'ties'],
    story: 'Two people in a department can be paid exactly the same.',
    task: 'Return department and runner_up: the second highest distinct salary. Departments without a second level are left out.',
    setup: `departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
employees = pd.DataFrame({"employee_id": [10, 11, 12, 13, 14], "dept_id": [1, 1, 1, 2, 2]})
salaries = pd.DataFrame({"employee_id": [10, 11, 12, 13, 14], "amount": [120000, 95000, 80000, 70000, 60000]})`,
    hidden: [
      `departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
employees = pd.DataFrame({"employee_id": [10, 11, 12, 13, 14], "dept_id": [1, 1, 1, 2, 2]})
salaries = pd.DataFrame({"employee_id": [10, 11, 12, 13, 14], "amount": [120000, 120000, 80000, 70000, 60000]})`,
      `departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Engineering", "Sales"]})
employees = pd.DataFrame({"employee_id": [10, 11, 12, 13, 14], "dept_id": [1, 1, 1, 2, 2]})
salaries = pd.DataFrame({"employee_id": [10, 11, 12, 13, 14], "amount": [90000, 95000, 95000, 70000, 70000]})`,
    ],
    sig: 'def solve(departments: pd.DataFrame, employees: pd.DataFrame, salaries: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(departments, employees, salaries):
    m = salaries.merge(employees, on="employee_id")[["dept_id", "amount"]].drop_duplicates()
    m["rk"] = m.groupby("dept_id")["amount"].rank(method="dense", ascending=False)
    second = m[m["rk"] == 2]
    out = second.merge(departments, on="dept_id")
    return out[["department", "amount"]].rename(columns={"amount": "runner_up"}).reset_index(drop=True)`,
    wrong: [`def solve(departments, employees, salaries):
    m = salaries.merge(employees, on="employee_id")[["dept_id", "amount"]]
    m = m.sort_values(["dept_id", "amount"], ascending=[True, False])
    m["rk"] = m.groupby("dept_id").cumcount() + 1
    second = m[m["rk"] == 2]
    out = second.merge(departments, on="dept_id")
    return out[["department", "amount"]].rename(columns={"amount": "runner_up"}).reset_index(drop=True)`],
    hints: ['Two people on the top salary are one pay level.', 'Drop duplicate salaries per department before ranking.'],
    why: 'Distinct salaries plus a dense rank gives pay levels rather than people.',
    mistakes: 'Numbering the people hands the runner-up slot to the second person on the top salary.' },

  { t: 'Quiet Customers This Quarter', tags: ['isin', 'dates', 'merge'],
    story: 'The second quarter of 2024 runs from 1 April to 30 June, both days included.',
    task: 'Return region and customer for the customers who placed no order inside that quarter.',
    setup: `regions = pd.DataFrame({"region_id": [1, 2], "region": ["West", "East"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "region_id": [1, 1, 2, 2], "customer": ["Asha", "Ben", "Chitra", "Dev"]})
orders = pd.DataFrame({"order_id": [10, 11], "customer_id": [1, 3], "day": ["2024-04-05", "2024-05-20"]})`,
    hidden: [
      `regions = pd.DataFrame({"region_id": [1, 2], "region": ["West", "East"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "region_id": [1, 1, 2, 2], "customer": ["Asha", "Ben", "Chitra", "Dev"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13], "customer_id": [1, 3, 2, 4], "day": ["2024-04-05", "2024-05-20", "2024-01-10", "2024-08-01"]})`,
      `regions = pd.DataFrame({"region_id": [1, 2], "region": ["West", "East"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "region_id": [1, 1, 2, 2], "customer": ["Asha", "Ben", "Chitra", "Dev"]})
orders = pd.DataFrame({"order_id": [10, 11], "customer_id": [2, 4], "day": ["2024-06-30", "2024-04-01"]})`,
    ],
    sig: 'def solve(regions: pd.DataFrame, customers: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(regions, customers, orders):
    inq = orders[orders["day"].between("2024-04-01", "2024-06-30")]["customer_id"]
    quiet = customers[~customers["customer_id"].isin(inq)]
    out = quiet.merge(regions, on="region_id")
    return out[["region", "customer"]].reset_index(drop=True)`,
    wrong: [`def solve(regions, customers, orders):
    quiet = customers[~customers["customer_id"].isin(orders["customer_id"])]
    out = quiet.merge(regions, on="region_id")
    return out[["region", "customer"]].reset_index(drop=True)`],
    hints: ['Narrow the orders to the quarter before asking who is missing.', 'between() on ISO date strings includes both ends.'],
    why: 'The window has to be applied to the orders first, or the question becomes "never ordered at all".',
    mistakes: 'A customer who ordered in January is quiet this quarter but not a stranger.' },

  { t: 'Invoice Tax by Country Rate', tags: ['merge', 'groupby', 'rounding'],
    story: 'Each invoice is taxed at the rate of its own country.',
    task: 'Return customer, net and tax (rounded to 2 decimals) for every invoice.',
    setup: `tax_rates = pd.DataFrame({"country": ["IN", "DE", "US"], "rate": [0.18, 0.18, 0.18]})
invoices = pd.DataFrame({"invoice_id": [1, 2, 3], "country": ["IN", "DE", "US"], "customer": ["Asha", "Ben", "Chitra"]})
invoice_lines = pd.DataFrame({"invoice_id": [1, 1, 2, 3, 3], "amount": [1000, 500, 4000, 2000, 500]})`,
    hidden: [
      `tax_rates = pd.DataFrame({"country": ["IN", "DE", "US"], "rate": [0.18, 0.19, 0.07]})
invoices = pd.DataFrame({"invoice_id": [1, 2, 3], "country": ["IN", "DE", "US"], "customer": ["Asha", "Ben", "Chitra"]})
invoice_lines = pd.DataFrame({"invoice_id": [1, 1, 2, 3, 3], "amount": [1000, 500, 4000, 2000, 500]})`,
      `tax_rates = pd.DataFrame({"country": ["IN", "DE", "US"], "rate": [0.05, 0.18, 0.18]})
invoices = pd.DataFrame({"invoice_id": [1, 2, 3], "country": ["IN", "DE", "US"], "customer": ["Asha", "Ben", "Chitra"]})
invoice_lines = pd.DataFrame({"invoice_id": [1, 1, 2, 3, 3], "amount": [1000, 500, 4000, 2000, 500]})`,
    ],
    sig: 'def solve(tax_rates: pd.DataFrame, invoices: pd.DataFrame, invoice_lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(tax_rates, invoices, invoice_lines):
    net = invoice_lines.groupby("invoice_id", as_index=False)["amount"].sum().rename(columns={"amount": "net"})
    m = net.merge(invoices, on="invoice_id").merge(tax_rates, on="country")
    m["tax"] = (m["net"] * m["rate"]).round(2)
    return m[["customer", "net", "tax"]].reset_index(drop=True)`,
    wrong: [`def solve(tax_rates, invoices, invoice_lines):
    net = invoice_lines.groupby("invoice_id", as_index=False)["amount"].sum().rename(columns={"amount": "net"})
    m = net.merge(invoices, on="invoice_id")
    m["tax"] = (m["net"] * 0.18).round(2)
    return m[["customer", "net", "tax"]].reset_index(drop=True)`],
    hints: ['The rate is a column on the row the invoice points at.', 'Total the lines first, then merge the rate.'],
    why: 'Merging the rate table keeps the tax right whatever each country charges.',
    mistakes: 'A hard-coded rate works until one country differs.' },

  { t: 'Busiest Hour at Each Station', tags: ['groupby', 'sorting', 'ties'],
    story: 'Each tap of a travel card records the station and the hour of day.',
    task: 'Return line, station, hour and taps for the busiest hour of each station. If two hours tie, report the earlier hour.',
    setup: `lines = pd.DataFrame({"line_id": [1, 2], "line": ["Blue Line", "Red Line"]})
stations = pd.DataFrame({"station_id": [10, 11], "line_id": [1, 2], "station": ["Harbour", "Museum"]})
taps = pd.DataFrame({"tap_id": [1, 2, 3, 4, 5, 6, 7], "station_id": [10, 10, 10, 11, 11, 11, 11], "hour": [8, 8, 9, 17, 18, 18, 18]})`,
    hidden: [
      `lines = pd.DataFrame({"line_id": [1, 2], "line": ["Blue Line", "Red Line"]})
stations = pd.DataFrame({"station_id": [10, 11], "line_id": [1, 2], "station": ["Harbour", "Museum"]})
taps = pd.DataFrame({"tap_id": [1, 2, 3, 4, 5, 6, 7], "station_id": [10, 10, 10, 10, 11, 11, 11], "hour": [8, 8, 9, 9, 18, 18, 17]})`,
      `lines = pd.DataFrame({"line_id": [1, 2], "line": ["Blue Line", "Red Line"]})
stations = pd.DataFrame({"station_id": [10, 11], "line_id": [1, 2], "station": ["Harbour", "Museum"]})
taps = pd.DataFrame({"tap_id": [1, 2, 3, 4, 5, 6, 7], "station_id": [10, 10, 10, 11, 11, 11, 11], "hour": [7, 9, 9, 17, 17, 18, 19]})`,
    ],
    sig: 'def solve(lines: pd.DataFrame, stations: pd.DataFrame, taps: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(lines, stations, taps):
    g = taps.groupby(["station_id", "hour"], as_index=False).size().rename(columns={"size": "taps"})
    g = g.sort_values(["station_id", "taps", "hour"], ascending=[True, False, True])
    top = g.drop_duplicates("station_id")
    out = top.merge(stations, on="station_id").merge(lines, on="line_id")
    return out[["line", "station", "hour", "taps"]].reset_index(drop=True)`,
    wrong: [`def solve(lines, stations, taps):
    g = taps.groupby(["station_id", "hour"], as_index=False).size().rename(columns={"size": "taps"})
    g["rk"] = g.groupby("station_id")["taps"].rank(method="min", ascending=False)
    top = g[g["rk"] == 1]
    out = top.merge(stations, on="station_id").merge(lines, on="line_id")
    return out[["line", "station", "hour", "taps"]].reset_index(drop=True)`],
    hints: ['One row per station, so the ordering has to settle a tie.', 'Sort by station, taps descending and hour ascending.'],
    why: 'The hour as a second sort key makes the choice deterministic and matches the rule in the question.',
    mistakes: 'A minimum rank keeps both tied hours.' },

  { t: 'Fill Rate per Supplier', tags: ['groupby', 'left join', 'rate'],
    story: 'A purchase order can be delivered in several drops, or not at all.',
    task: 'Return supplier and fill_rate: the share of the ordered quantity that arrived, rounded to 2 decimals.',
    setup: `suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Alpha", "Beta"]})
purchase_orders = pd.DataFrame({"po_id": [100, 101, 102, 103], "supplier_id": [1, 1, 2, 2], "ordered_qty": [50, 100, 40, 60]})
deliveries = pd.DataFrame({"po_id": [100, 101, 102, 103], "delivered_qty": [50, 80, 40, 30]})`,
    hidden: [
      `suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Alpha", "Beta"]})
purchase_orders = pd.DataFrame({"po_id": [100, 101, 102, 103], "supplier_id": [1, 1, 2, 2], "ordered_qty": [50, 100, 40, 60]})
deliveries = pd.DataFrame({"po_id": [100, 101, 102], "delivered_qty": [50, 80, 40]})`,
      `suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Alpha", "Beta"]})
purchase_orders = pd.DataFrame({"po_id": [100, 101, 102, 103], "supplier_id": [1, 1, 2, 2], "ordered_qty": [50, 100, 40, 60]})
deliveries = pd.DataFrame({"po_id": [100, 100, 101, 102, 103], "delivered_qty": [25, 25, 100, 20, 60]})`,
    ],
    sig: 'def solve(suppliers: pd.DataFrame, purchase_orders: pd.DataFrame, deliveries: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(suppliers, purchase_orders, deliveries):
    got = deliveries.groupby("po_id", as_index=False)["delivered_qty"].sum()
    po = purchase_orders.merge(got, on="po_id", how="left")
    po["delivered_qty"] = po["delivered_qty"].fillna(0)
    g = po.merge(suppliers, on="supplier_id").groupby("supplier", as_index=False).agg(
        delivered=("delivered_qty", "sum"), ordered=("ordered_qty", "sum")
    )
    g["fill_rate"] = (g["delivered"] / g["ordered"]).round(2)
    return g[["supplier", "fill_rate"]]`,
    wrong: [`def solve(suppliers, purchase_orders, deliveries):
    m = purchase_orders.merge(deliveries, on="po_id")
    g = m.merge(suppliers, on="supplier_id").groupby("supplier", as_index=False).agg(
        delivered=("delivered_qty", "sum"), ordered=("ordered_qty", "sum")
    )
    g["fill_rate"] = (g["delivered"] / g["ordered"]).round(2)
    return g[["supplier", "fill_rate"]]`],
    hints: ['Total the drops per order before comparing with what was ordered.', 'An order that never arrived counts as zero delivered.'],
    why: 'Aggregating the deliveries per order keeps the ordered quantity counted once and keeps empty orders in.',
    mistakes: 'Merging the drops directly repeats the ordered quantity once per drop and drops the orders that never came.' },

  { t: 'Average Handling Time Without the Worst Case', tags: ['transform', 'groupby', 'filtering'],
    story: 'One very long call can move a queue\'s average on its own, so the longest call in each queue is left out.',
    task: 'Return queue and avg_minutes: the average handling time after removing the queue\'s own longest call, rounded to 2 decimals.',
    setup: `queues = pd.DataFrame({"queue_id": [1, 2], "queue": ["Billing", "Technical"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "queue_id": [1, 1, 1, 2, 2, 2]})
handling = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "minutes": [10, 20, 95, 15, 25, 95]})`,
    hidden: [
      `queues = pd.DataFrame({"queue_id": [1, 2], "queue": ["Billing", "Technical"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "queue_id": [1, 1, 1, 2, 2, 2]})
handling = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "minutes": [10, 20, 200, 15, 25, 30]})`,
      `queues = pd.DataFrame({"queue_id": [1, 2], "queue": ["Billing", "Technical"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "queue_id": [1, 1, 1, 2, 2, 2]})
handling = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "minutes": [40, 40, 40, 10, 20, 30]})`,
    ],
    sig: 'def solve(queues: pd.DataFrame, tickets: pd.DataFrame, handling: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(queues, tickets, handling):
    m = handling.merge(tickets, on="ticket_id").merge(queues, on="queue_id")
    m["worst"] = m.groupby("queue")["minutes"].transform("max")
    keep = m[m["minutes"] < m["worst"]]
    g = keep.groupby("queue", as_index=False)["minutes"].mean()
    g["avg_minutes"] = g["minutes"].round(2)
    return g[["queue", "avg_minutes"]]`,
    wrong: [`def solve(queues, tickets, handling):
    m = handling.merge(tickets, on="ticket_id").merge(queues, on="queue_id")
    keep = m[m["minutes"] < m["minutes"].max()]
    g = keep.groupby("queue", as_index=False)["minutes"].mean()
    g["avg_minutes"] = g["minutes"].round(2)
    return g[["queue", "avg_minutes"]]`],
    hints: ['The call to drop is the longest one in that queue.', 'transform("max") puts each queue\'s worst case on its rows.'],
    why: 'A per-group maximum removes exactly one call from each queue.',
    mistakes: 'The overall maximum leaves the second queue\'s outlier in place.' },

  { t: 'Sold-Out Events', tags: ['filtering', 'merge', 'groupby'],
    story: 'A cancelled ticket goes back on sale, so it does not fill a seat.',
    task: 'Return venue, title, sold and capacity for the events whose live tickets reached the capacity of their venue.',
    setup: `venues = pd.DataFrame({"venue_id": [1, 2], "venue": ["Town Hall", "Garden Stage"], "capacity": [3, 2]})
events = pd.DataFrame({"event_id": [10, 11], "venue_id": [1, 2], "title": ["Jazz Night", "Poetry Slam"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "event_id": [10, 10, 10, 11], "status": ["sold"] * 4})`,
    hidden: [
      `venues = pd.DataFrame({"venue_id": [1, 2], "venue": ["Town Hall", "Garden Stage"], "capacity": [3, 2]})
events = pd.DataFrame({"event_id": [10, 11], "venue_id": [1, 2], "title": ["Jazz Night", "Poetry Slam"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5], "event_id": [10, 10, 10, 11, 11], "status": ["sold", "sold", "cancelled", "sold", "sold"]})`,
      `venues = pd.DataFrame({"venue_id": [1, 2], "venue": ["Town Hall", "Garden Stage"], "capacity": [3, 2]})
events = pd.DataFrame({"event_id": [10, 11], "venue_id": [1, 2], "title": ["Jazz Night", "Poetry Slam"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "event_id": [10, 11, 11, 11], "status": ["sold"] * 4})`,
    ],
    sig: 'def solve(venues: pd.DataFrame, events: pd.DataFrame, tickets: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(venues, events, tickets):
    live = tickets[tickets["status"] == "sold"]
    g = live.groupby("event_id", as_index=False).size().rename(columns={"size": "sold"})
    m = g.merge(events, on="event_id").merge(venues, on="venue_id")
    out = m[m["sold"] >= m["capacity"]]
    return out[["venue", "title", "sold", "capacity"]].reset_index(drop=True)`,
    wrong: [`def solve(venues, events, tickets):
    g = tickets.groupby("event_id", as_index=False).size().rename(columns={"size": "sold"})
    m = g.merge(events, on="event_id").merge(venues, on="venue_id")
    out = m[m["sold"] >= m["capacity"]]
    return out[["venue", "title", "sold", "capacity"]].reset_index(drop=True)`],
    hints: ['Only the live tickets occupy a seat.', 'Filter the status before counting.'],
    why: 'Counting only sold tickets makes the figure the seats actually gone.',
    mistakes: 'Counting every ticket reports events that are merely busy.' },

  { t: 'Patients on Several Drug Classes', tags: ['nunique', 'merge', 'filtering'],
    story: 'Two different drugs can belong to the same class.',
    task: 'Return patient and classes for the patients prescribed drugs from more than one class.',
    setup: `drug_classes = pd.DataFrame({"class_id": [1, 2, 3], "drug_class": ["Analgesic", "Antibiotic", "Antihistamine"]})
drugs = pd.DataFrame({"drug_id": [10, 11, 12, 13], "class_id": [1, 1, 2, 3], "drug": ["Paracet", "Ibufen", "Amoxil", "Cetiriz"]})
prescriptions = pd.DataFrame({"rx_id": [1, 2, 3, 4, 5, 6], "patient": ["Asha", "Asha", "Ben", "Chitra", "Chitra", "Dev"], "drug_id": [10, 12, 11, 13, 12, 10]})`,
    hidden: [
      `drug_classes = pd.DataFrame({"class_id": [1, 2, 3], "drug_class": ["Analgesic", "Antibiotic", "Antihistamine"]})
drugs = pd.DataFrame({"drug_id": [10, 11, 12, 13], "class_id": [1, 1, 2, 3], "drug": ["Paracet", "Ibufen", "Amoxil", "Cetiriz"]})
prescriptions = pd.DataFrame({"rx_id": [1, 2, 3, 4, 5, 6], "patient": ["Asha", "Asha", "Ben", "Chitra", "Chitra", "Dev"], "drug_id": [10, 11, 11, 13, 12, 10]})`,
      `drug_classes = pd.DataFrame({"class_id": [1, 2, 3], "drug_class": ["Analgesic", "Antibiotic", "Antihistamine"]})
drugs = pd.DataFrame({"drug_id": [10, 11, 12, 13], "class_id": [1, 1, 2, 3], "drug": ["Paracet", "Ibufen", "Amoxil", "Cetiriz"]})
prescriptions = pd.DataFrame({"rx_id": [1, 2, 3, 4, 5, 6], "patient": ["Asha", "Ben", "Ben", "Chitra", "Dev", "Dev"], "drug_id": [10, 12, 13, 13, 10, 11]})`,
    ],
    sig: 'def solve(drug_classes: pd.DataFrame, drugs: pd.DataFrame, prescriptions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(drug_classes, drugs, prescriptions):
    m = prescriptions.merge(drugs, on="drug_id").merge(drug_classes, on="class_id")
    g = m.groupby("patient", as_index=False)["class_id"].nunique().rename(columns={"class_id": "classes"})
    return g[g["classes"] > 1].reset_index(drop=True)`,
    wrong: [`def solve(drug_classes, drugs, prescriptions):
    m = prescriptions.merge(drugs, on="drug_id").merge(drug_classes, on="class_id")
    g = m.groupby("patient", as_index=False).size().rename(columns={"size": "classes"})
    return g[g["classes"] > 1].reset_index(drop=True)`],
    hints: ['Two prescriptions can still be one class.', 'nunique on the class id counts classes.'],
    why: 'Counting distinct classes answers the question; counting rows counts prescriptions.',
    mistakes: 'A patient on two painkillers is not on two classes.' },

  { t: 'Net Movement per Account', tags: ['where', 'merge', 'signed sum'],
    story: 'Both deposits and withdrawals are stored as positive amounts, with the kind in its own column.',
    task: 'Return account_type, holder and net for every account.',
    setup: `account_types = pd.DataFrame({"type_id": [1, 2], "account_type": ["Current", "Savings"]})
accounts = pd.DataFrame({"account_id": [100, 101, 102], "type_id": [1, 1, 2], "holder": ["Asha", "Ben", "Chitra"]})
entries = pd.DataFrame({"entry_id": [1, 2, 3, 4], "account_id": [100, 100, 101, 102], "kind": ["deposit"] * 4, "amount": [5000, 2000, 3000, 9000]})`,
    hidden: [
      `account_types = pd.DataFrame({"type_id": [1, 2], "account_type": ["Current", "Savings"]})
accounts = pd.DataFrame({"account_id": [100, 101, 102], "type_id": [1, 1, 2], "holder": ["Asha", "Ben", "Chitra"]})
entries = pd.DataFrame({"entry_id": [1, 2, 3, 4], "account_id": [100, 100, 101, 102], "kind": ["deposit", "withdrawal", "deposit", "withdrawal"], "amount": [5000, 2000, 3000, 9000]})`,
      `account_types = pd.DataFrame({"type_id": [1, 2], "account_type": ["Current", "Savings"]})
accounts = pd.DataFrame({"account_id": [100, 101, 102], "type_id": [1, 1, 2], "holder": ["Asha", "Ben", "Chitra"]})
entries = pd.DataFrame({"entry_id": [1, 2, 3, 4], "account_id": [100, 101, 101, 102], "kind": ["deposit", "withdrawal", "deposit", "deposit"], "amount": [1000, 500, 2000, 100]})`,
    ],
    sig: 'def solve(account_types: pd.DataFrame, accounts: pd.DataFrame, entries: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(account_types, accounts, entries):
    e = entries.copy()
    e["signed"] = np.where(e["kind"] == "deposit", e["amount"], -e["amount"])
    g = e.groupby("account_id", as_index=False)["signed"].sum().rename(columns={"signed": "net"})
    out = g.merge(accounts, on="account_id").merge(account_types, on="type_id")
    return out[["account_type", "holder", "net"]].reset_index(drop=True)`,
    wrong: [`def solve(account_types, accounts, entries):
    g = entries.groupby("account_id", as_index=False)["amount"].sum().rename(columns={"amount": "net"})
    out = g.merge(accounts, on="account_id").merge(account_types, on="type_id")
    return out[["account_type", "holder", "net"]].reset_index(drop=True)`],
    hints: ['A withdrawal has to count against the balance.', 'np.where gives each row its sign.'],
    why: 'Signing the rows before the sum is what makes it a net movement.',
    mistakes: 'Adding the amounts straight up is right only while nothing has been withdrawn.' },

  { t: 'Best Seller per Store by Revenue', tags: ['groupby', 'sorting', 'revenue'],
    story: 'Each sale row holds the units sold; the money depends on the product price.',
    task: 'Return store, product and revenue for the product that brought in the most money in each store.',
    setup: `stores = pd.DataFrame({"store_id": [1, 2], "store": ["Harbour Shop", "Hill Shop"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "product": ["Pen", "Mug", "Lamp"], "price": [100, 100, 100]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5], "store_id": [1, 1, 1, 2, 2], "product_id": [10, 11, 12, 10, 11], "units": [5, 3, 1, 2, 7]})`,
    hidden: [
      `stores = pd.DataFrame({"store_id": [1, 2], "store": ["Harbour Shop", "Hill Shop"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "product": ["Pen", "Mug", "Lamp"], "price": [10, 100, 900]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5], "store_id": [1, 1, 1, 2, 2], "product_id": [10, 11, 12, 10, 11], "units": [5, 3, 1, 2, 7]})`,
      `stores = pd.DataFrame({"store_id": [1, 2], "store": ["Harbour Shop", "Hill Shop"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "product": ["Pen", "Mug", "Lamp"], "price": [100, 100, 100]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5], "store_id": [1, 1, 1, 2, 2], "product_id": [10, 11, 12, 10, 11], "units": [1, 9, 2, 8, 1]})`,
    ],
    sig: 'def solve(stores: pd.DataFrame, products: pd.DataFrame, sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(stores, products, sales):
    m = sales.merge(products, on="product_id")
    m["revenue"] = m["units"] * m["price"]
    g = m.groupby(["store_id", "product"], as_index=False)["revenue"].sum()
    g = g.sort_values(["store_id", "revenue"], ascending=[True, False])
    top = g.drop_duplicates("store_id")
    out = top.merge(stores, on="store_id")
    return out[["store", "product", "revenue"]].reset_index(drop=True)`,
    wrong: [`def solve(stores, products, sales):
    m = sales.merge(products, on="product_id")
    m["revenue"] = m["units"] * m["price"]
    g = m.groupby(["store_id", "product"], as_index=False).agg(revenue=("revenue", "sum"), units=("units", "sum"))
    g = g.sort_values(["store_id", "units"], ascending=[True, False])
    top = g.drop_duplicates("store_id")
    out = top.merge(stores, on="store_id")
    return out[["store", "product", "revenue"]].reset_index(drop=True)`],
    hints: ['Rank by money, which needs the price.', 'Units and revenue only agree when every price is the same.'],
    why: 'Units times price is the revenue the question asks to rank by.',
    mistakes: 'Ranking by units crowns the cheap high-volume product.' },

  { t: 'Who Is Past the Feature Version', tags: ['dtypes', 'filtering', 'merge'],
    story: 'A feature shipped in version 8. The support team wants the people who can already use it.',
    task: 'Return person and version for the users whose installed version is 8 or newer.',
    setup: `app_versions = pd.DataFrame({"version": [7, 8, 9], "released_on": ["2024-01-01", "2024-02-01", "2024-03-01"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"], "country": ["IN", "DE", "US"]})
installs = pd.DataFrame({"user_id": [1, 2, 3], "version": [9, 7, 8]})`,
    hidden: [
      `app_versions = pd.DataFrame({"version": [7, 8, 9, 10, 11], "released_on": ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01", "2024-05-01"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"], "country": ["IN", "DE", "US"]})
installs = pd.DataFrame({"user_id": [1, 2, 3], "version": [10, 7, 11]})`,
      `app_versions = pd.DataFrame({"version": [7, 8, 9], "released_on": ["2024-01-01", "2024-02-01", "2024-03-01"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"], "country": ["IN", "DE", "US"]})
installs = pd.DataFrame({"user_id": [1, 2, 3], "version": [7, 8, 9]})`,
    ],
    sig: 'def solve(app_versions: pd.DataFrame, users: pd.DataFrame, installs: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(app_versions, users, installs):
    m = installs.merge(users, on="user_id").merge(app_versions, on="version")
    out = m[m["version"] >= 8]
    return out[["person", "version"]].reset_index(drop=True)`,
    wrong: [`def solve(app_versions, users, installs):
    m = installs.merge(users, on="user_id").merge(app_versions, on="version")
    out = m[m["version"].astype(str) >= "8"]
    return out[["person", "version"]].reset_index(drop=True)`],
    hints: ['Compare numbers as numbers.', 'As text, "10" sorts before "8".'],
    why: 'The version column is a number and should be compared as one.',
    mistakes: 'Comparing version strings makes a newer release look older.' },

  { t: 'Rooms Booked Twice Over', tags: ['self merge', 'intervals', 'merge'],
    story: 'A booking holds a room from the check-in day until the check-out day, which is free again for the next guest.',
    task: 'Return number, room_type, first_booking and second_booking for every pair of bookings that overlap on the same room, with the smaller booking id first.',
    setup: `room_types = pd.DataFrame({"type_id": [1, 2], "room_type": ["Standard", "Suite"]})
rooms = pd.DataFrame({"room_id": [101, 201], "type_id": [1, 2], "number": ["101", "201"]})
bookings = pd.DataFrame({
    "booking_id": [1, 2, 3],
    "room_id": [101, 101, 201],
    "check_in": ["2024-07-01", "2024-07-01", "2024-07-05"],
    "check_out": ["2024-07-02", "2024-07-02", "2024-07-06"],
})`,
    hidden: [
      `room_types = pd.DataFrame({"type_id": [1, 2], "room_type": ["Standard", "Suite"]})
rooms = pd.DataFrame({"room_id": [101, 201], "type_id": [1, 2], "number": ["101", "201"]})
bookings = pd.DataFrame({"booking_id": [1, 2, 3], "room_id": [101, 101, 201], "check_in": ["2024-07-01", "2024-07-03", "2024-07-05"], "check_out": ["2024-07-05", "2024-07-04", "2024-07-06"]})`,
      `room_types = pd.DataFrame({"type_id": [1, 2], "room_type": ["Standard", "Suite"]})
rooms = pd.DataFrame({"room_id": [101, 201], "type_id": [1, 2], "number": ["101", "201"]})
bookings = pd.DataFrame({"booking_id": [1, 2, 3, 4], "room_id": [101, 101, 201, 201], "check_in": ["2024-07-01", "2024-07-02", "2024-07-05", "2024-07-08"], "check_out": ["2024-07-02", "2024-07-03", "2024-07-09", "2024-07-10"]})`,
    ],
    sig: 'def solve(room_types: pd.DataFrame, rooms: pd.DataFrame, bookings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(room_types, rooms, bookings):
    m = bookings.merge(bookings, on="room_id", suffixes=("_a", "_b"))
    m = m[(m["booking_id_a"] < m["booking_id_b"])
          & (m["check_in_a"] < m["check_out_b"])
          & (m["check_in_b"] < m["check_out_a"])]
    out = m.merge(rooms, on="room_id").merge(room_types, on="type_id")
    return out[["number", "room_type", "booking_id_a", "booking_id_b"]].rename(
        columns={"booking_id_a": "first_booking", "booking_id_b": "second_booking"}
    ).reset_index(drop=True)`,
    wrong: [`def solve(room_types, rooms, bookings):
    m = bookings.merge(bookings, on="room_id", suffixes=("_a", "_b"))
    m = m[(m["booking_id_a"] < m["booking_id_b"]) & (m["check_in_a"] == m["check_in_b"])]
    out = m.merge(rooms, on="room_id").merge(room_types, on="type_id")
    return out[["number", "room_type", "booking_id_a", "booking_id_b"]].rename(
        columns={"booking_id_a": "first_booking", "booking_id_b": "second_booking"}
    ).reset_index(drop=True)`],
    hints: ['Two stays clash when each begins before the other ends.', 'Merge the bookings to themselves on the room.'],
    why: 'The overlap test covers every arrangement, including one booking sitting inside another.',
    mistakes: 'Comparing only the check-in days finds just the exact duplicates.' },

  { t: 'Orders Split Across Warehouses', tags: ['nunique', 'merge', 'filtering'],
    story: 'A big order can be shipped in several parcels, sometimes from the same warehouse twice.',
    task: 'Return customer and warehouses for the orders shipped from more than one warehouse.',
    setup: `warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
shipments = pd.DataFrame({"shipment_id": [100, 101, 102, 103], "order_id": [1, 1, 2, 3], "warehouse_id": [10, 20, 10, 20]})`,
    hidden: [
      `warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
shipments = pd.DataFrame({"shipment_id": [100, 101, 102, 103], "order_id": [1, 1, 2, 3], "warehouse_id": [10, 10, 10, 20]})`,
      `warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
shipments = pd.DataFrame({"shipment_id": [100, 101, 102, 103, 104], "order_id": [1, 2, 2, 3, 3], "warehouse_id": [10, 10, 20, 20, 10]})`,
    ],
    sig: 'def solve(warehouses: pd.DataFrame, orders: pd.DataFrame, shipments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(warehouses, orders, shipments):
    g = shipments.groupby("order_id", as_index=False)["warehouse_id"].nunique().rename(columns={"warehouse_id": "warehouses"})
    split = g[g["warehouses"] > 1]
    out = split.merge(orders, on="order_id")
    return out[["customer", "warehouses"]].reset_index(drop=True)`,
    wrong: [`def solve(warehouses, orders, shipments):
    g = shipments.groupby("order_id", as_index=False).size().rename(columns={"size": "warehouses"})
    split = g[g["warehouses"] > 1]
    out = split.merge(orders, on="order_id")
    return out[["customer", "warehouses"]].reset_index(drop=True)`],
    hints: ['Two parcels can come from one warehouse.', 'nunique counts warehouses, size counts parcels.'],
    why: 'Counting distinct warehouses answers the question.',
    mistakes: 'Counting parcels flags any order that shipped twice.' },

  { t: 'Cancellation Rate by Signup Cohort', tags: ['isin', 'groupby', 'rate'],
    story: 'A customer can cancel, come back and cancel again, which writes a second row.',
    task: 'Return month, campaign and cancel_rate: the share of the cohort\'s customers who have cancelled at least once, rounded to 2 decimals.',
    setup: `cohorts = pd.DataFrame({"month": ["2024-01", "2024-02"], "campaign": ["New Year", "Spring"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4, 5], "month": ["2024-01", "2024-01", "2024-01", "2024-02", "2024-02"]})
cancellations = pd.DataFrame({"customer_id": [1, 4], "day": ["2024-03-01", "2024-04-01"]})`,
    hidden: [
      `cohorts = pd.DataFrame({"month": ["2024-01", "2024-02"], "campaign": ["New Year", "Spring"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4, 5], "month": ["2024-01", "2024-01", "2024-01", "2024-02", "2024-02"]})
cancellations = pd.DataFrame({"customer_id": [1, 1, 4], "day": ["2024-03-01", "2024-05-01", "2024-04-01"]})`,
      `cohorts = pd.DataFrame({"month": ["2024-01", "2024-02"], "campaign": ["New Year", "Spring"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4, 5], "month": ["2024-01", "2024-01", "2024-01", "2024-02", "2024-02"]})
cancellations = pd.DataFrame({"customer_id": [2, 3, 5], "day": ["2024-03-01", "2024-03-02", "2024-04-01"]})`,
    ],
    sig: 'def solve(cohorts: pd.DataFrame, customers: pd.DataFrame, cancellations: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(cohorts, customers, cancellations):
    c = customers.copy()
    c["left"] = c["customer_id"].isin(cancellations["customer_id"]).astype(int)
    g = c.merge(cohorts, on="month").groupby(["month", "campaign"], as_index=False).agg(
        left=("left", "sum"), total=("left", "size")
    )
    g["cancel_rate"] = (g["left"] / g["total"]).round(2)
    return g[["month", "campaign", "cancel_rate"]]`,
    wrong: [`def solve(cohorts, customers, cancellations):
    num = cancellations.merge(customers, on="customer_id").groupby("month", as_index=False).size().rename(columns={"size": "left"})
    den = customers.groupby("month", as_index=False).size().rename(columns={"size": "total"})
    g = den.merge(num, on="month", how="left").merge(cohorts, on="month")
    g["left"] = g["left"].fillna(0)
    g["cancel_rate"] = (g["left"] / g["total"]).round(2)
    return g[["month", "campaign", "cancel_rate"]]`],
    hints: ['The numerator counts customers, not cancellation rows.', 'isin answers it once per customer.'],
    why: 'Asking the question per customer counts each person once however many times they left.',
    mistakes: 'Counting cancellation rows double counts anybody who came back and left again.' },

  { t: 'Commission by Ride Count Band', tags: ['merge_asof', 'bands', 'groupby'],
    story: 'The commission depends on how many rides the driver has given: 25% from 0 rides, 20% from 10 rides and 15% from 25 rides.',
    task: 'Return driver, rides, gross and commission (rounded to 2 decimals).',
    setup: `bands = pd.DataFrame({"min_rides": [0, 10, 25], "commission": [0.25, 0.2, 0.15]})
drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Asha", "Ben", "Chitra"]})
rides = pd.DataFrame({
    "ride_id": list(range(1, 46)),
    "driver_id": [1] * 10 + [2] * 10 + [3] * 25,
    "fare": [100] * 10 + [200] * 10 + [300] * 25,
})`,
    hidden: [
      `bands = pd.DataFrame({"min_rides": [0, 10, 25], "commission": [0.25, 0.2, 0.15]})
drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Asha", "Ben", "Chitra"]})
rides = pd.DataFrame({"ride_id": list(range(1, 17)), "driver_id": [1] * 12 + [2] * 3 + [3], "fare": [100] * 12 + [200] * 3 + [300]})`,
      `bands = pd.DataFrame({"min_rides": [0, 10, 25], "commission": [0.3, 0.1, 0.05]})
drivers = pd.DataFrame({"driver_id": [1, 2, 3], "driver": ["Asha", "Ben", "Chitra"]})
rides = pd.DataFrame({"ride_id": list(range(1, 46)), "driver_id": [1] * 10 + [2] * 10 + [3] * 25, "fare": [100] * 10 + [200] * 10 + [300] * 25})`,
    ],
    sig: 'def solve(bands: pd.DataFrame, drivers: pd.DataFrame, rides: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(bands, drivers, rides):
    g = rides.groupby("driver_id", as_index=False).agg(rides=("ride_id", "size"), gross=("fare", "sum"))
    g = g.sort_values("rides")
    b = bands.sort_values("min_rides")
    m = pd.merge_asof(g, b, left_on="rides", right_on="min_rides", direction="backward")
    m["commission"] = (m["gross"] * m["commission"]).round(2)
    out = m.merge(drivers, on="driver_id")
    return out[["driver", "rides", "gross", "commission"]].reset_index(drop=True)`,
    wrong: [`def solve(bands, drivers, rides):
    g = rides.groupby("driver_id", as_index=False).agg(rides=("ride_id", "size"), gross=("fare", "sum"))
    g = g.sort_values("rides")
    b = bands.sort_values("min_rides")
    m = pd.merge_asof(g, b, left_on="rides", right_on="min_rides", direction="forward")
    m["commission"] = (m["gross"] * m["commission"]).round(2)
    out = m.merge(drivers, on="driver_id")
    return out[["driver", "rides", "gross", "commission"]].reset_index(drop=True)`],
    hints: ['The band that applies is the one with the largest minimum at or below the ride count.', 'That is a backward merge_asof.'],
    why: 'Backward matching takes the last band whose threshold the driver has passed.',
    mistakes: 'Matching forward takes the next band up, which the driver has not reached.' },

  { t: 'Sessions That Went Nowhere', tags: ['isin', 'merge', 'levels'],
    story: 'A session can run several searches, and a click is recorded against the search it came from.',
    task: 'Return person and day for the sessions that ran at least one search and got no click at all.',
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
sessions = pd.DataFrame({"session_id": [10, 11, 12], "user_id": [1, 2, 3], "day": ["2024-06-01", "2024-06-01", "2024-06-02"]})
searches = pd.DataFrame({"search_id": [1, 2, 3], "session_id": [10, 11, 12], "term": ["lamp", "desk", "rug"]})
clicks = pd.DataFrame({"search_id": [2], "result_id": [500]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
sessions = pd.DataFrame({"session_id": [10, 11, 12], "user_id": [1, 2, 3], "day": ["2024-06-01", "2024-06-01", "2024-06-02"]})
searches = pd.DataFrame({"search_id": [1, 2, 3, 4], "session_id": [10, 11, 12, 10], "term": ["lamp", "desk", "rug", "shade"]})
clicks = pd.DataFrame({"search_id": [2, 4], "result_id": [500, 501]})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
sessions = pd.DataFrame({"session_id": [10, 11, 12], "user_id": [1, 2, 3], "day": ["2024-06-01", "2024-06-01", "2024-06-02"]})
searches = pd.DataFrame({"search_id": [1, 2, 3], "session_id": [10, 11, 12], "term": ["lamp", "desk", "rug"]})
clicks = pd.DataFrame({"search_id": [1, 2, 3], "result_id": [500, 501, 502]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, sessions: pd.DataFrame, searches: pd.DataFrame, clicks: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, sessions, searches, clicks):
    s = searches.copy()
    s["clicked"] = s["search_id"].isin(clicks["search_id"]).astype(int)
    per_session = s.groupby("session_id", as_index=False)["clicked"].sum()
    dead = per_session[per_session["clicked"] == 0]
    out = dead.merge(sessions, on="session_id").merge(users, on="user_id")
    return out[["person", "day"]].reset_index(drop=True)`,
    wrong: [`def solve(users, sessions, searches, clicks):
    dead = searches[~searches["search_id"].isin(clicks["search_id"])]
    out = dead.merge(sessions, on="session_id").merge(users, on="user_id")
    return out[["person", "day"]].drop_duplicates().reset_index(drop=True)`],
    hints: ['The question is about sessions, and a session can run more than one search.', 'Total the clicks per session before deciding.'],
    why: 'Marking each search as clicked and summing per session asks whether the whole session went nowhere.',
    mistakes: 'Listing the sessions of unclicked searches reports a session that did click on something else.' },

  { t: 'Below Reorder Level After Inbound Stock', tags: ['left join', 'fillna', 'filtering'],
    story: 'Stock already on its way to the warehouse counts towards cover. A product with nothing inbound has no row in that frame.',
    task: 'Return sku, on_hand, incoming and reorder_level for the products whose stock plus inbound is still below the reorder level.',
    setup: `products = pd.DataFrame({"product_id": [1, 2, 3], "sku": ["LAMP-01", "DESK-02", "RUG-03"], "reorder_level": [20, 10, 5]})
stock = pd.DataFrame({"product_id": [1, 2, 3], "on_hand": [12, 4, 9]})
inbound = pd.DataFrame({"product_id": [1, 2, 3], "qty": [5, 2, 1]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2, 3], "sku": ["LAMP-01", "DESK-02", "RUG-03"], "reorder_level": [20, 10, 5]})
stock = pd.DataFrame({"product_id": [1, 2, 3], "on_hand": [12, 4, 9]})
inbound = pd.DataFrame({"product_id": [1, 3], "qty": [5, 1]})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3], "sku": ["LAMP-01", "DESK-02", "RUG-03"], "reorder_level": [20, 10, 5]})
stock = pd.DataFrame({"product_id": [1, 2, 3], "on_hand": [12, 4, 9]})
inbound = pd.DataFrame({"product_id": [1, 2, 3], "qty": [20, 20, 20]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, stock: pd.DataFrame, inbound: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, stock, inbound):
    inc = inbound.groupby("product_id", as_index=False)["qty"].sum().rename(columns={"qty": "incoming"})
    m = products.merge(stock, on="product_id").merge(inc, on="product_id", how="left")
    m["incoming"] = m["incoming"].fillna(0).astype(int)
    out = m[m["on_hand"] + m["incoming"] < m["reorder_level"]]
    return out[["sku", "on_hand", "incoming", "reorder_level"]].reset_index(drop=True)`,
    wrong: [`def solve(products, stock, inbound):
    inc = inbound.groupby("product_id", as_index=False)["qty"].sum().rename(columns={"qty": "incoming"})
    m = products.merge(stock, on="product_id").merge(inc, on="product_id")
    out = m[m["on_hand"] + m["incoming"] < m["reorder_level"]]
    return out[["sku", "on_hand", "incoming", "reorder_level"]].reset_index(drop=True)`],
    hints: ['A product with nothing on its way still needs checking.', 'A left merge keeps it, and the gap becomes 0.'],
    why: 'Giving every product an incoming figure judges them all on their cover.',
    mistakes: 'An inner merge hides exactly the products with nothing arriving.' },

  { t: 'Teaching Outside Their Qualifications', tags: ['merge', 'indicator', 'many-to-many'],
    story: 'A teacher can be qualified in several subjects, listed in their own frame. The main subject is only the one they are filed under.',
    task: 'Return teacher, subject and day for the lessons taught by someone not qualified in that subject.',
    setup: `subjects = pd.DataFrame({"subject_id": [1, 2, 3], "subject": ["Maths", "Physics", "History"]})
teachers = pd.DataFrame({"teacher_id": [10, 11, 12], "teacher": ["Rao", "Iyer", "Nair"], "main_subject_id": [1, 2, 3]})
qualifications = pd.DataFrame({"teacher_id": [10, 11, 12], "subject_id": [1, 2, 3]})
lessons = pd.DataFrame({"lesson_id": [1, 2, 3, 4], "teacher_id": [10, 10, 11, 12], "subject_id": [1, 2, 2, 3], "day": ["2024-09-02", "2024-09-03", "2024-09-02", "2024-09-04"]})`,
    hidden: [
      `subjects = pd.DataFrame({"subject_id": [1, 2, 3], "subject": ["Maths", "Physics", "History"]})
teachers = pd.DataFrame({"teacher_id": [10, 11, 12], "teacher": ["Rao", "Iyer", "Nair"], "main_subject_id": [1, 2, 3]})
qualifications = pd.DataFrame({"teacher_id": [10, 10, 11, 12], "subject_id": [1, 2, 2, 3]})
lessons = pd.DataFrame({"lesson_id": [1, 2, 3, 4], "teacher_id": [10, 10, 11, 12], "subject_id": [1, 2, 2, 3], "day": ["2024-09-02", "2024-09-03", "2024-09-02", "2024-09-04"]})`,
      `subjects = pd.DataFrame({"subject_id": [1, 2, 3], "subject": ["Maths", "Physics", "History"]})
teachers = pd.DataFrame({"teacher_id": [10, 11, 12], "teacher": ["Rao", "Iyer", "Nair"], "main_subject_id": [1, 2, 3]})
qualifications = pd.DataFrame({"teacher_id": [10, 11, 12], "subject_id": [1, 2, 3]})
lessons = pd.DataFrame({"lesson_id": [1, 2, 3, 4], "teacher_id": [10, 11, 11, 12], "subject_id": [1, 3, 2, 3], "day": ["2024-09-02", "2024-09-03", "2024-09-02", "2024-09-04"]})`,
    ],
    sig: 'def solve(subjects: pd.DataFrame, teachers: pd.DataFrame, qualifications: pd.DataFrame, lessons: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(subjects, teachers, qualifications, lessons):
    q = qualifications.assign(ok=1)
    m = lessons.merge(q, on=["teacher_id", "subject_id"], how="left")
    bad = m[m["ok"].isna()]
    out = bad.merge(teachers, on="teacher_id").merge(subjects, on="subject_id")
    return out[["teacher", "subject", "day"]].reset_index(drop=True)`,
    wrong: [`def solve(subjects, teachers, qualifications, lessons):
    m = lessons.merge(teachers, on="teacher_id")
    bad = m[m["subject_id"] != m["main_subject_id"]]
    out = bad.merge(subjects, on="subject_id")
    return out[["teacher", "subject", "day"]].reset_index(drop=True)`],
    hints: ['Qualifications live in their own frame, one row per subject.', 'A left merge with a marker column shows which lessons found no qualification.'],
    why: 'The rule is about the qualification list, so the test is a left merge on both keys.',
    mistakes: 'Comparing with the main subject flags every teacher covering a second subject they are qualified for.' },

  { t: 'Called Back About the Same Issue', tags: ['self merge', 'dates', 'two keys'],
    story: 'A customer calling twice in a week about the same thing means the first answer did not work.',
    task: 'Return customer, issue and gap for the customers who opened two tickets on the same issue within 7 days of each other.',
    setup: `issues = pd.DataFrame({"issue_id": [1, 2], "issue": ["Billing", "Delivery"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 1, 2, 2, 3, 3], "issue_id": [1, 1, 1, 2, 2, 2], "day": [1, 4, 1, 30, 1, 20]})`,
    hidden: [
      `issues = pd.DataFrame({"issue_id": [1, 2], "issue": ["Billing", "Delivery"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 1, 2, 2, 3, 3], "issue_id": [1, 2, 1, 2, 2, 2], "day": [1, 4, 1, 30, 1, 6]})`,
      `issues = pd.DataFrame({"issue_id": [1, 2], "issue": ["Billing", "Delivery"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 1, 2, 2, 3, 3], "issue_id": [1, 1, 1, 1, 2, 2], "day": [1, 9, 1, 2, 1, 30]})`,
    ],
    sig: 'def solve(issues: pd.DataFrame, customers: pd.DataFrame, tickets: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(issues, customers, tickets):
    m = tickets.merge(tickets, on=["customer_id", "issue_id"], suffixes=("_a", "_b"))
    m = m[(m["day_b"] > m["day_a"]) & (m["day_b"] - m["day_a"] <= 7)].copy()
    m["gap"] = m["day_b"] - m["day_a"]
    out = m.merge(customers, on="customer_id").merge(issues, on="issue_id")
    return out[["customer", "issue", "gap"]].reset_index(drop=True)`,
    wrong: [`def solve(issues, customers, tickets):
    m = tickets.merge(tickets, on="customer_id", suffixes=("_a", "_b"))
    m = m[(m["day_b"] > m["day_a"]) & (m["day_b"] - m["day_a"] <= 7)].copy()
    m["gap"] = m["day_b"] - m["day_a"]
    out = m.merge(customers, on="customer_id").merge(issues, left_on="issue_id_a", right_on="issue_id")
    return out[["customer", "issue", "gap"]].reset_index(drop=True)`],
    hints: ['The two tickets must share the issue as well as the customer.', 'Merge on both keys at once.'],
    why: 'Merging on the customer and the issue is what makes it a repeat contact.',
    mistakes: 'Merging on the customer alone counts two unrelated calls in the same week.' },
];
