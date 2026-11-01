// Pandas, interview-grade set: Medium, batch 2.
export default [
  { t: 'Refund Rate by Payment Method', tags: ['merge', 'nunique', 'double counting'],
    story: 'A payment can be refunded in parts, so one payment may have several refund rows.',
    task: 'For each payment method, return method and rate: the share of its payments that were refunded at all, rounded to 2 decimals.',
    setup: `methods = pd.DataFrame({"method_id": [1, 2, 3], "method": ["Card", "Wallet", "Bank transfer"]})
payments = pd.DataFrame({"payment_id": [1, 2, 3, 4, 5, 6, 7, 8], "method_id": [1, 1, 1, 1, 2, 2, 3, 3], "amount": [1200, 800, 500, 300, 900, 600, 2000, 1500]})
refunds = pd.DataFrame({"payment_id": [1, 5, 7], "amount": [1200, 900, 2000]})`,
    hidden: [
      `methods = pd.DataFrame({"method_id": [1, 2, 3], "method": ["Card", "Wallet", "Bank transfer"]})
payments = pd.DataFrame({"payment_id": [1, 2, 3, 4, 5, 6, 7, 8], "method_id": [1, 1, 1, 1, 2, 2, 3, 3], "amount": [1200, 800, 500, 300, 900, 600, 2000, 1500]})
refunds = pd.DataFrame({"payment_id": [1, 1, 5, 7], "amount": [600, 600, 900, 2000]})`,
      `methods = pd.DataFrame({"method_id": [1, 2, 3], "method": ["Card", "Wallet", "Bank transfer"]})
payments = pd.DataFrame({"payment_id": [1, 2, 3, 4, 5, 6, 7, 8], "method_id": [1, 1, 1, 1, 2, 2, 3, 3], "amount": [1200, 800, 500, 300, 900, 600, 2000, 1500]})
refunds = pd.DataFrame({"payment_id": [2, 3, 6], "amount": [800, 500, 600]})`,
    ],
    sig: 'def solve(methods: pd.DataFrame, payments: pd.DataFrame, refunds: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(methods, payments, refunds):
    p = payments.copy()
    p["refunded"] = p["payment_id"].isin(refunds["payment_id"]).astype(int)
    g = p.merge(methods, on="method_id").groupby("method", as_index=False).agg(
        refunded=("refunded", "sum"), total=("refunded", "size")
    )
    g["rate"] = (g["refunded"] / g["total"]).round(2)
    return g[["method", "rate"]]`,
    wrong: [`def solve(methods, payments, refunds):
    r = refunds.merge(payments, on="payment_id")
    num = r.groupby("method_id", as_index=False).size().rename(columns={"size": "refunded"})
    den = payments.groupby("method_id", as_index=False).size().rename(columns={"size": "total"})
    g = den.merge(num, on="method_id", how="left").merge(methods, on="method_id")
    g["refunded"] = g["refunded"].fillna(0)
    g["rate"] = (g["refunded"] / g["total"]).round(2)
    return g[["method", "rate"]]`],
    hints: ['Ask of each payment whether a refund exists for it, with isin.', 'A boolean column summed is a count of payments, not of refund rows.'],
    why: 'isin answers the question once per payment, so a payment refunded in three instalments still counts once.',
    mistakes: 'Counting refund rows can push the share above 1 as soon as anything is refunded in parts.' },

  { t: 'Average Basket by Membership Tier', tags: ['groupby', 'merge', 'two levels'],
    story: 'An order holds any number of lines, each with a quantity and a unit price.',
    task: 'For each membership tier, return tier and avg_order: the average value of an order, rounded to 2 decimals.',
    setup: `members = pd.DataFrame({"member_id": [1, 2, 3, 4], "tier": ["gold", "silver", "gold", "silver"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13, 14], "member_id": [1, 1, 2, 3, 4]})
order_items = pd.DataFrame({"order_id": [10, 11, 12, 13, 14], "qty": [2, 1, 3, 1, 2], "price": [100, 400, 50, 900, 75]})`,
    hidden: [
      `members = pd.DataFrame({"member_id": [1, 2, 3, 4], "tier": ["gold", "silver", "gold", "silver"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13, 14], "member_id": [1, 1, 2, 3, 4]})
order_items = pd.DataFrame({"order_id": [10, 10, 10, 11, 12, 13, 14], "qty": [2, 1, 4, 1, 3, 1, 2], "price": [100, 300, 25, 400, 50, 900, 75]})`,
      `members = pd.DataFrame({"member_id": [1, 2, 3, 4], "tier": ["gold", "silver", "gold", "silver"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13, 14], "member_id": [1, 1, 2, 3, 4]})
order_items = pd.DataFrame({"order_id": [10, 11, 12, 13, 14], "qty": [1, 1, 1, 1, 1], "price": [100, 100, 900, 100, 900]})`,
    ],
    sig: 'def solve(members: pd.DataFrame, orders: pd.DataFrame, order_items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(members, orders, order_items):
    it = order_items.copy()
    it["value"] = it["qty"] * it["price"]
    ov = it.groupby("order_id", as_index=False)["value"].sum()
    m = ov.merge(orders, on="order_id").merge(members, on="member_id")
    g = m.groupby("tier", as_index=False)["value"].mean()
    g["avg_order"] = g["value"].round(2)
    return g[["tier", "avg_order"]]`,
    wrong: [`def solve(members, orders, order_items):
    it = order_items.copy()
    it["value"] = it["qty"] * it["price"]
    m = it.merge(orders, on="order_id").merge(members, on="member_id")
    g = m.groupby("tier", as_index=False)["value"].mean()
    g["avg_order"] = g["value"].round(2)
    return g[["tier", "avg_order"]]`],
    hints: ['Total each order before averaging.', 'An order with four lines would otherwise weigh four times as much.'],
    why: 'Collapsing to one row per order first makes the average an average over orders, which is what the question says.',
    mistakes: 'Averaging the lines weights orders by how many lines they happen to have.' },

  { t: 'Nights Sold by Room Type', tags: ['dates', 'merge', 'intervals'],
    story: 'A guest checking in on the 1st and out on the 5th slept four nights.',
    task: 'For each room type, return type, nights and revenue (nights times the nightly rate).',
    setup: `room_types = pd.DataFrame({"type_id": [1, 2], "type": ["Standard", "Suite"], "rate": [4000, 9000]})
rooms = pd.DataFrame({"room_id": [101, 102, 201], "type_id": [1, 1, 2]})
stays = pd.DataFrame({
    "stay_id": [1, 2, 3, 4],
    "room_id": [101, 101, 102, 201],
    "check_in": ["2024-07-01", "2024-07-05", "2024-07-03", "2024-07-02"],
    "check_out": ["2024-07-02", "2024-07-06", "2024-07-04", "2024-07-03"],
})`,
    hidden: [
      `room_types = pd.DataFrame({"type_id": [1, 2], "type": ["Standard", "Suite"], "rate": [4000, 9000]})
rooms = pd.DataFrame({"room_id": [101, 102, 201], "type_id": [1, 1, 2]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4], "room_id": [101, 101, 102, 201], "check_in": ["2024-07-01", "2024-07-05", "2024-07-03", "2024-07-02"], "check_out": ["2024-07-05", "2024-07-06", "2024-07-04", "2024-07-09"]})`,
      `room_types = pd.DataFrame({"type_id": [1, 2], "type": ["Standard", "Suite"], "rate": [4000, 9000]})
rooms = pd.DataFrame({"room_id": [101, 102, 201], "type_id": [1, 1, 2]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4], "room_id": [201, 201, 102, 101], "check_in": ["2024-07-01", "2024-07-05", "2024-07-03", "2024-07-02"], "check_out": ["2024-07-03", "2024-07-06", "2024-07-04", "2024-07-03"]})`,
    ],
    sig: 'def solve(room_types: pd.DataFrame, rooms: pd.DataFrame, stays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(room_types, rooms, stays):
    s = stays.copy()
    s["nights"] = (pd.to_datetime(s["check_out"]) - pd.to_datetime(s["check_in"])).dt.days
    m = s.merge(rooms, on="room_id").merge(room_types, on="type_id")
    g = m.groupby("type", as_index=False).agg(nights=("nights", "sum"), rate=("rate", "first"))
    g["revenue"] = g["nights"] * g["rate"]
    return g[["type", "nights", "revenue"]]`,
    wrong: [`def solve(room_types, rooms, stays):
    m = stays.merge(rooms, on="room_id").merge(room_types, on="type_id")
    g = m.groupby("type", as_index=False).agg(nights=("stay_id", "size"), rate=("rate", "first"))
    g["revenue"] = g["nights"] * g["rate"]
    return g[["type", "nights", "revenue"]]`],
    hints: ['The nights of a stay are the days between the two dates.', 'Subtracting datetimes gives a timedelta, and .dt.days turns it into a number.'],
    why: 'The date difference is the nights sold, which is the same as counting stays only while every stay is one night.',
    mistakes: 'Counting stays undercounts the moment somebody stays for a week.' },

  { t: 'Doctors With an Empty Diary', tags: ['merge', 'missing values', 'anti join'],
    story: 'An appointment can be filed before a slot is agreed, which leaves its day empty. The doctor is already attached.',
    task: 'Return specialty and doctor for the doctors who have no appointment at all.',
    setup: `specialties = pd.DataFrame({"specialty_id": [1, 2], "specialty": ["Cardiology", "Dermatology"]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9, 10], "specialty_id": [1, 1, 2, 2], "doctor": ["Rao", "Iyer", "Nair", "Das"]})
appointments = pd.DataFrame({"appt_id": [1, 2], "doctor_id": [7, 9], "day": ["2024-05-02", "2024-05-03"]})`,
    hidden: [
      `specialties = pd.DataFrame({"specialty_id": [1, 2], "specialty": ["Cardiology", "Dermatology"]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9, 10], "specialty_id": [1, 1, 2, 2], "doctor": ["Rao", "Iyer", "Nair", "Das"]})
appointments = pd.DataFrame({"appt_id": [1, 2, 3], "doctor_id": [7, 9, 8], "day": ["2024-05-02", "2024-05-03", None]})`,
      `specialties = pd.DataFrame({"specialty_id": [1, 2], "specialty": ["Cardiology", "Dermatology"]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9, 10], "specialty_id": [1, 1, 2, 2], "doctor": ["Rao", "Iyer", "Nair", "Das"]})
appointments = pd.DataFrame({"appt_id": [1, 2], "doctor_id": [8, 10], "day": ["2024-05-02", "2024-05-03"]})`,
    ],
    sig: 'def solve(specialties: pd.DataFrame, doctors: pd.DataFrame, appointments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(specialties, doctors, appointments):
    busy = set(appointments["doctor_id"])
    free = doctors[~doctors["doctor_id"].isin(busy)]
    out = free.merge(specialties, on="specialty_id")
    return out[["specialty", "doctor"]].reset_index(drop=True)`,
    wrong: [`def solve(specialties, doctors, appointments):
    m = doctors.merge(appointments, on="doctor_id", how="left")
    free = m[m["day"].isna()]
    out = free.merge(specialties, on="specialty_id")
    return out[["specialty", "doctor"]].reset_index(drop=True)`],
    hints: ['Having an appointment is about the appointment existing, not about its day being filled in.', 'isin on the doctor ids answers it directly.'],
    why: 'The doctor ids in the appointments table are the busy ones, whatever state the rest of the row is in.',
    mistakes: 'Testing a left-merged column for emptiness also catches a doctor whose appointment simply has no day yet.' },

  { t: 'Current Price With a Tie-Break', tags: ['sorting', 'drop_duplicates', 'ties'],
    story: 'Two price changes can be filed on the same day; the one entered later is the one that counts.',
    task: 'Return sku, supplier and price: the current price of every product.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
suppliers = pd.DataFrame({"product_id": [1, 2], "supplier": ["Alpha", "Beta"]})
price_changes = pd.DataFrame({
    "change_id": [1, 2, 3, 4],
    "product_id": [1, 1, 2, 2],
    "changed_on": ["2024-01-01", "2024-03-01", "2024-01-01", "2024-02-01"],
    "price": [100, 120, 500, 450],
})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
suppliers = pd.DataFrame({"product_id": [1, 2], "supplier": ["Alpha", "Beta"]})
price_changes = pd.DataFrame({"change_id": [1, 2, 5, 3, 4], "product_id": [1, 1, 1, 2, 2], "changed_on": ["2024-01-01", "2024-03-01", "2024-03-01", "2024-01-01", "2024-02-01"], "price": [100, 120, 130, 500, 450]})`,
      `products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
suppliers = pd.DataFrame({"product_id": [1, 2], "supplier": ["Alpha", "Beta"]})
price_changes = pd.DataFrame({"change_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "changed_on": ["2024-01-01", "2024-02-01", "2024-01-01", "2024-04-01"], "price": [100, 90, 500, 700]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, suppliers: pd.DataFrame, price_changes: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, suppliers, price_changes):
    c = price_changes.sort_values(["product_id", "changed_on", "change_id"])
    last = c.drop_duplicates("product_id", keep="last")
    out = last.merge(products, on="product_id").merge(suppliers, on="product_id")
    return out[["sku", "supplier", "price"]].reset_index(drop=True)`,
    wrong: [`def solve(products, suppliers, price_changes):
    last_day = price_changes.groupby("product_id", as_index=False)["changed_on"].max()
    last = price_changes.merge(last_day, on=["product_id", "changed_on"])
    out = last.merge(products, on="product_id").merge(suppliers, on="product_id")
    return out[["sku", "supplier", "price"]].reset_index(drop=True)`],
    hints: ['Sort by product, date and the change id, then keep the last row per product.', 'The question promises exactly one row per product.'],
    why: 'Sorting with the id as a final key makes the choice deterministic, and keep="last" takes the newest filing.',
    mistakes: 'Joining back on the latest date returns both rows when two changes share a day.' },

  { t: 'Above Their Own Class Average', tags: ['transform', 'groupby', 'merge'],
    story: 'Each student sits several subjects, and classes differ in how hard they are marked.',
    task: 'Return clazz, student and avg_score (rounded to 2 decimals) for the students whose own average is above the average of their class.',
    setup: `classes = pd.DataFrame({"class_id": [1], "clazz": ["Class A"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "class_id": [1, 1, 1, 1], "student": ["Asha", "Ben", "Chitra", "Dev"]})
scores = pd.DataFrame({
    "student_id": [1, 1, 2, 2, 3, 3, 4, 4],
    "subject": ["math", "science"] * 4,
    "score": [90, 80, 60, 50, 75, 85, 40, 60],
})`,
    hidden: [
      `classes = pd.DataFrame({"class_id": [1, 2], "clazz": ["Class A", "Class B"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "class_id": [1, 1, 2, 2], "student": ["Asha", "Ben", "Chitra", "Dev"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2, 3, 3, 4, 4], "subject": ["math", "science"] * 4, "score": [90, 80, 60, 50, 60, 60, 50, 50]})`,
      `classes = pd.DataFrame({"class_id": [1], "clazz": ["Class A"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "class_id": [1, 1, 1, 1], "student": ["Asha", "Ben", "Chitra", "Dev"]})
scores = pd.DataFrame({"student_id": [1, 1, 2, 2, 3, 3, 4, 4], "subject": ["math", "science"] * 4, "score": [50, 50, 95, 95, 75, 85, 40, 60]})`,
    ],
    sig: 'def solve(classes: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(classes, students, scores):
    sa = scores.groupby("student_id", as_index=False)["score"].mean()
    sa = sa.merge(students, on="student_id")
    sa["class_avg"] = sa.groupby("class_id")["score"].transform("mean")
    out = sa[sa["score"] > sa["class_avg"]].merge(classes, on="class_id")
    out["avg_score"] = out["score"].round(2)
    return out[["clazz", "student", "avg_score"]].reset_index(drop=True)`,
    wrong: [`def solve(classes, students, scores):
    sa = scores.groupby("student_id", as_index=False)["score"].mean()
    sa = sa.merge(students, on="student_id")
    out = sa[sa["score"] > sa["score"].mean()].merge(classes, on="class_id")
    out["avg_score"] = out["score"].round(2)
    return out[["clazz", "student", "avg_score"]].reset_index(drop=True)`],
    hints: ['Average twice: once per student, then per class.', 'transform("mean") puts the class average on every student row.'],
    why: 'The benchmark has to be the class the student is in, which transform broadcasts back to each row.',
    mistakes: 'One overall average agrees only while there is a single class.' },

  { t: 'Top Spender per Country', tags: ['groupby', 'sorting', 'ties'],
    story: 'Two people in the same country can spend exactly the same amount.',
    task: 'Return country, person and total for the biggest spender in each country. On a tie, report the name that comes first alphabetically.',
    setup: `countries = pd.DataFrame({"code": ["IN", "DE"], "country": ["India", "Germany"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4], "code": ["IN", "IN", "DE", "DE"], "person": ["Asha", "Ben", "Chitra", "Dev"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 2, 3, 4, 4], "amount": [500, 300, 400, 900, 200, 100]})`,
    hidden: [
      `countries = pd.DataFrame({"code": ["IN", "DE"], "country": ["India", "Germany"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4], "code": ["IN", "IN", "DE", "DE"], "person": ["Asha", "Ben", "Chitra", "Dev"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 2, 3, 4, 4], "amount": [500, 300, 800, 900, 600, 300]})`,
      `countries = pd.DataFrame({"code": ["IN", "DE"], "country": ["India", "Germany"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4], "code": ["IN", "IN", "DE", "DE"], "person": ["Asha", "Ben", "Chitra", "Dev"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 2, 3, 4, 4], "amount": [100, 100, 900, 100, 700, 100]})`,
    ],
    sig: 'def solve(countries: pd.DataFrame, users: pd.DataFrame, txns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(countries, users, txns):
    t = txns.merge(users, on="user_id")
    g = t.groupby(["code", "person"], as_index=False)["amount"].sum().rename(columns={"amount": "total"})
    g = g.sort_values(["code", "total", "person"], ascending=[True, False, True])
    top = g.drop_duplicates("code")
    out = top.merge(countries, on="code")
    return out[["country", "person", "total"]].reset_index(drop=True)`,
    wrong: [`def solve(countries, users, txns):
    t = txns.merge(users, on="user_id")
    g = t.groupby(["code", "person"], as_index=False)["amount"].sum().rename(columns={"amount": "total"})
    g["rk"] = g.groupby("code")["total"].rank(method="min", ascending=False)
    top = g[g["rk"] == 1]
    out = top.merge(countries, on="code")
    return out[["country", "person", "total"]].reset_index(drop=True)`],
    hints: ['Sort by country, total descending and name ascending, then keep the first row per country.', 'The question promises one row per country.'],
    why: 'The three-key sort encodes the tie-break, and drop_duplicates keeps exactly one row per country.',
    mistakes: 'A minimum rank keeps both tied people and breaks the one-row-per-country promise.' },

  { t: 'Items Always Bought Alone', tags: ['groupby', 'transform', 'all rows'],
    story: 'A shop wants the items customers never add to a basket with anything else.',
    task: 'Return item for the items that appear only in orders of a single item.',
    setup: `items = pd.DataFrame({"item_id": [1, 2, 3, 4], "item": ["Pen", "Notebook", "Lamp", "Mug"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13], "day": ["2024-02-01", "2024-02-02", "2024-02-03", "2024-02-04"]})
order_items = pd.DataFrame({"order_id": [10, 10, 11, 12, 13], "item_id": [1, 2, 3, 4, 4]})`,
    hidden: [
      `items = pd.DataFrame({"item_id": [1, 2, 3, 4], "item": ["Pen", "Notebook", "Lamp", "Mug"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13], "day": ["2024-02-01", "2024-02-02", "2024-02-03", "2024-02-04"]})
order_items = pd.DataFrame({"order_id": [10, 10, 11, 12, 13, 13], "item_id": [1, 2, 3, 4, 4, 1]})`,
      `items = pd.DataFrame({"item_id": [1, 2, 3, 4], "item": ["Pen", "Notebook", "Lamp", "Mug"]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13], "day": ["2024-02-01", "2024-02-02", "2024-02-03", "2024-02-04"]})
order_items = pd.DataFrame({"order_id": [10, 11, 12, 13], "item_id": [1, 2, 3, 4]})`,
    ],
    sig: 'def solve(items: pd.DataFrame, orders: pd.DataFrame, order_items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(items, orders, order_items):
    oi = order_items.copy()
    oi["basket"] = oi.groupby("order_id")["item_id"].transform("size")
    biggest = oi.groupby("item_id", as_index=False)["basket"].max()
    alone = biggest[biggest["basket"] == 1]
    out = alone.merge(items, on="item_id")
    return out[["item"]].reset_index(drop=True)`,
    wrong: [`def solve(items, orders, order_items):
    oi = order_items.copy()
    oi["basket"] = oi.groupby("order_id")["item_id"].transform("size")
    alone = oi[oi["basket"] == 1]
    out = alone.merge(items, on="item_id")
    return out[["item"]].drop_duplicates().reset_index(drop=True)`],
    hints: ['Every order the item appears in has to be a single-item order.', 'The largest basket it was ever in tells you that.'],
    why: 'Taking the maximum basket size per item asks about all of its orders at once.',
    mistakes: 'Filtering to single-item orders first only asks whether the item was ever alone.' },

  { t: 'Energy per Person by Region', tags: ['groupby', 'merge', 'denominator'],
    story: 'A household that has not sent a reading yet still houses people.',
    task: 'Return region and per_person: the total kWh recorded divided by the people living in the region, rounded to 2 decimals.',
    setup: `regions = pd.DataFrame({"region_id": [1, 2], "region": ["Coast", "Hills"]})
households = pd.DataFrame({"household_id": [10, 11, 12, 13], "region_id": [1, 1, 2, 2], "people": [4, 2, 3, 1]})
readings = pd.DataFrame({"household_id": [10, 11, 12, 13], "day": ["2024-03-01"] * 4, "kwh": [44, 10, 18, 6]})`,
    hidden: [
      `regions = pd.DataFrame({"region_id": [1, 2], "region": ["Coast", "Hills"]})
households = pd.DataFrame({"household_id": [10, 11, 12, 13], "region_id": [1, 1, 2, 2], "people": [4, 2, 3, 1]})
readings = pd.DataFrame({"household_id": [10, 10, 11, 12, 13], "day": ["2024-03-01", "2024-03-02", "2024-03-01", "2024-03-01", "2024-03-01"], "kwh": [24, 20, 10, 18, 6]})`,
      `regions = pd.DataFrame({"region_id": [1, 2], "region": ["Coast", "Hills"]})
households = pd.DataFrame({"household_id": [10, 11, 12, 13], "region_id": [1, 1, 2, 2], "people": [4, 2, 3, 1]})
readings = pd.DataFrame({"household_id": [10, 11, 12], "day": ["2024-03-01"] * 3, "kwh": [44, 10, 18]})`,
    ],
    sig: 'def solve(regions: pd.DataFrame, households: pd.DataFrame, readings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(regions, households, readings):
    kwh = readings.merge(households, on="household_id").groupby("region_id", as_index=False)["kwh"].sum()
    ppl = households.groupby("region_id", as_index=False)["people"].sum()
    g = kwh.merge(ppl, on="region_id").merge(regions, on="region_id")
    g["per_person"] = (g["kwh"] / g["people"]).round(2)
    return g[["region", "per_person"]]`,
    wrong: [`def solve(regions, households, readings):
    m = readings.merge(households, on="household_id")
    g = m.groupby("region_id", as_index=False).agg(kwh=("kwh", "sum"), people=("people", "sum"))
    g = g.merge(regions, on="region_id")
    g["per_person"] = (g["kwh"] / g["people"]).round(2)
    return g[["region", "per_person"]]`],
    hints: ['The people come from the households frame, the kWh from the readings.', 'Aggregate each side separately, then put them together.'],
    why: 'Totalling the people on the households frame counts each household once and keeps the ones that never reported.',
    mistakes: 'Summing people alongside the readings counts a household once per reading and forgets the silent ones.' },

  { t: 'Came Back Within Thirty Days', tags: ['groupby', 'merge', 'first row'],
    story: 'Retention is measured from the very first order: a customer counts as retained when they order again within 30 days of it.',
    task: 'Return channel and retained: how many customers came back within 30 days of their first order.',
    setup: `channels = pd.DataFrame({"channel_id": [1, 2], "channel": ["Organic", "Referral"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "channel_id": [1, 1, 2, 2]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13, 14, 15], "customer_id": [1, 1, 2, 3, 3, 4], "day": [1, 20, 5, 2, 10, 3]})`,
    hidden: [
      `channels = pd.DataFrame({"channel_id": [1, 2], "channel": ["Organic", "Referral"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "channel_id": [1, 1, 2, 2]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13, 14, 15], "customer_id": [1, 1, 1, 3, 3, 4], "day": [1, 100, 110, 2, 10, 3]})`,
      `channels = pd.DataFrame({"channel_id": [1, 2], "channel": ["Organic", "Referral"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "channel_id": [1, 1, 2, 2]})
orders = pd.DataFrame({"order_id": [10, 11, 12, 13, 14, 15], "customer_id": [1, 1, 2, 3, 3, 4], "day": [1, 20, 5, 2, 40, 3]})`,
    ],
    sig: 'def solve(channels: pd.DataFrame, customers: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(channels, customers, orders):
    first = orders.groupby("customer_id", as_index=False)["day"].min().rename(columns={"day": "d0"})
    o = orders.merge(first, on="customer_id")
    back = o[(o["day"] > o["d0"]) & (o["day"] - o["d0"] <= 30)]["customer_id"].unique()
    c = customers.copy()
    c["retained"] = c["customer_id"].isin(back).astype(int)
    g = c.merge(channels, on="channel_id").groupby("channel", as_index=False)["retained"].sum()
    return g`,
    wrong: [`def solve(channels, customers, orders):
    pair = orders.merge(orders, on="customer_id", suffixes=("_a", "_b"))
    pair = pair[(pair["day_b"] > pair["day_a"]) & (pair["day_b"] - pair["day_a"] <= 30)]
    back = pair["customer_id"].unique()
    c = customers.copy()
    c["retained"] = c["customer_id"].isin(back).astype(int)
    g = c.merge(channels, on="channel_id").groupby("channel", as_index=False)["retained"].sum()
    return g`],
    hints: ['Find each customer\'s first order day, then look for a later order inside the window.', 'Any two nearby orders is a different question.'],
    why: 'The window is anchored to the first order, so the comparison needs that date on every row.',
    mistakes: 'Comparing all pairs of orders retains a customer who vanished for months and then ordered twice in a week.' },

  { t: 'Punctuality by Airline', tags: ['left join', 'fillna', 'rate'],
    story: 'A flight that was never late has no row in the delay frame at all.',
    task: 'Return airline and late_rate: the share of its flights delayed by more than 15 minutes, rounded to 2 decimals.',
    setup: `airlines = pd.DataFrame({"airline_id": [1, 2], "airline": ["DojoAir", "SkyPanda"]})
flights = pd.DataFrame({"flight_id": [100, 101, 102, 103, 104], "airline_id": [1, 1, 1, 2, 2]})
delays = pd.DataFrame({"flight_id": [100, 101, 102, 103, 104], "minutes": [0, 40, 5, 0, 60]})`,
    hidden: [
      `airlines = pd.DataFrame({"airline_id": [1, 2], "airline": ["DojoAir", "SkyPanda"]})
flights = pd.DataFrame({"flight_id": [100, 101, 102, 103, 104], "airline_id": [1, 1, 1, 2, 2]})
delays = pd.DataFrame({"flight_id": [101, 104], "minutes": [40, 60]})`,
      `airlines = pd.DataFrame({"airline_id": [1, 2], "airline": ["DojoAir", "SkyPanda"]})
flights = pd.DataFrame({"flight_id": [100, 101, 102, 103, 104], "airline_id": [1, 1, 1, 2, 2]})
delays = pd.DataFrame({"flight_id": [100, 101, 102, 103, 104], "minutes": [20, 40, 16, 0, 60]})`,
    ],
    sig: 'def solve(airlines: pd.DataFrame, flights: pd.DataFrame, delays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(airlines, flights, delays):
    m = flights.merge(delays, on="flight_id", how="left")
    m["minutes"] = m["minutes"].fillna(0)
    m["late"] = (m["minutes"] > 15).astype(int)
    g = m.merge(airlines, on="airline_id").groupby("airline", as_index=False).agg(late=("late", "sum"), total=("late", "size"))
    g["late_rate"] = (g["late"] / g["total"]).round(2)
    return g[["airline", "late_rate"]]`,
    wrong: [`def solve(airlines, flights, delays):
    m = flights.merge(delays, on="flight_id")
    m["late"] = (m["minutes"] > 15).astype(int)
    g = m.merge(airlines, on="airline_id").groupby("airline", as_index=False).agg(late=("late", "sum"), total=("late", "size"))
    g["late_rate"] = (g["late"] / g["total"]).round(2)
    return g[["airline", "late_rate"]]`],
    hints: ['The flights are the population.', 'A missing delay row means zero minutes.'],
    why: 'Merging on the left and filling the gap with 0 keeps every flight in the denominator.',
    mistakes: 'A default inner merge measures the rate only over flights that have a delay row.' },

  { t: 'First Response Against the SLA', tags: ['groupby', 'min', 'merge'],
    story: 'An agent may reply to a ticket several times. The service promise is about the first reply.',
    task: 'Return priority and breaches: how many tickets had their first reply later than the promised minutes after opening.',
    setup: `priorities = pd.DataFrame({"priority_id": [1, 2], "priority": ["Urgent", "Normal"], "sla_minutes": [30, 240]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "priority_id": [1, 1, 2, 2], "opened_min": [0, 100, 0, 500]})
responses = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "at_min": [20, 180, 100, 600]})`,
    hidden: [
      `priorities = pd.DataFrame({"priority_id": [1, 2], "priority": ["Urgent", "Normal"], "sla_minutes": [30, 240]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "priority_id": [1, 1, 2, 2], "opened_min": [0, 100, 0, 500]})
responses = pd.DataFrame({"ticket_id": [1, 1, 2, 3, 3, 4], "at_min": [20, 400, 180, 100, 900, 600]})`,
      `priorities = pd.DataFrame({"priority_id": [1, 2], "priority": ["Urgent", "Normal"], "sla_minutes": [30, 240]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "priority_id": [1, 1, 2, 2], "opened_min": [0, 100, 0, 500]})
responses = pd.DataFrame({"ticket_id": [1, 2, 3, 4], "at_min": [40, 110, 100, 800]})`,
    ],
    sig: 'def solve(priorities: pd.DataFrame, tickets: pd.DataFrame, responses: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(priorities, tickets, responses):
    first = responses.groupby("ticket_id", as_index=False)["at_min"].min().rename(columns={"at_min": "first_at"})
    t = tickets.merge(first, on="ticket_id").merge(priorities, on="priority_id")
    bad = t[t["first_at"] - t["opened_min"] > t["sla_minutes"]]
    return bad.groupby("priority", as_index=False).size().rename(columns={"size": "breaches"})`,
    wrong: [`def solve(priorities, tickets, responses):
    last = responses.groupby("ticket_id", as_index=False)["at_min"].max().rename(columns={"at_min": "last_at"})
    t = tickets.merge(last, on="ticket_id").merge(priorities, on="priority_id")
    bad = t[t["last_at"] - t["opened_min"] > t["sla_minutes"]]
    return bad.groupby("priority", as_index=False).size().rename(columns={"size": "breaches"})`],
    hints: ['Reduce the replies to the earliest one per ticket.', 'The promise is measured against that first reply.'],
    why: 'A min per ticket is the first response time, which is what the promise covers.',
    mistakes: 'The last reply flags tickets that were answered promptly and then discussed for days.' },

  { t: 'Ratings From Enrolled Students Only', tags: ['merge', 'filtering', 'average'],
    story: 'Anyone can leave a rating, but only the ratings of students who actually took the course are published.',
    task: 'Return title and stars: the average stars from enrolled students, rounded to 2 decimals. Courses with no such rating are left out.',
    setup: `courses = pd.DataFrame({"course_id": [1, 2], "title": ["Intro to SQL", "Statistics 101"]})
enrollments = pd.DataFrame({"student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [1, 1, 2, 2]})
ratings = pd.DataFrame({"student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [1, 1, 2, 2], "stars": [5, 3, 4, 2]})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1, 2], "title": ["Intro to SQL", "Statistics 101"]})
enrollments = pd.DataFrame({"student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [1, 1, 2, 2]})
ratings = pd.DataFrame({"student": ["Asha", "Ben", "Esha", "Chitra", "Dev"], "course_id": [1, 1, 1, 2, 2], "stars": [5, 3, 1, 4, 2]})`,
      `courses = pd.DataFrame({"course_id": [1, 2], "title": ["Intro to SQL", "Statistics 101"]})
enrollments = pd.DataFrame({"student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [1, 1, 2, 2]})
ratings = pd.DataFrame({"student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [1, 1, 2, 2], "stars": [2, 2, 5, 5]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, enrollments: pd.DataFrame, ratings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, enrollments, ratings):
    ok = ratings.merge(enrollments, on=["student", "course_id"])
    g = ok.groupby("course_id", as_index=False)["stars"].mean()
    out = g.merge(courses, on="course_id")
    out["stars"] = out["stars"].round(2)
    return out[["title", "stars"]].reset_index(drop=True)`,
    wrong: [`def solve(courses, enrollments, ratings):
    g = ratings.groupby("course_id", as_index=False)["stars"].mean()
    out = g.merge(courses, on="course_id")
    out["stars"] = out["stars"].round(2)
    return out[["title", "stars"]].reset_index(drop=True)`],
    hints: ['A rating counts only when the same student is enrolled on the same course.', 'An inner merge on both keys does exactly that.'],
    why: 'Merging on the student and the course together is what ties the rating to a real enrolment.',
    mistakes: 'Averaging every rating lets a stranger move a course score.' },

  { t: 'Pick Error Rate per Warehouse', tags: ['isin', 'rate', 'double counting'],
    story: 'A single mis-pick can be logged under more than one error kind.',
    task: 'Return region and error_rate: the share of picks that went wrong at all, rounded to 2 decimals.',
    setup: `warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
picks = pd.DataFrame({"pick_id": [1, 2, 3, 4, 5, 6], "warehouse_id": [10, 10, 10, 10, 20, 20]})
errors = pd.DataFrame({"pick_id": [1, 5], "kind": ["wrong item", "short"]})`,
    hidden: [
      `warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
picks = pd.DataFrame({"pick_id": [1, 2, 3, 4, 5, 6], "warehouse_id": [10, 10, 10, 10, 20, 20]})
errors = pd.DataFrame({"pick_id": [1, 1, 5], "kind": ["wrong item", "damaged", "short"]})`,
      `warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
picks = pd.DataFrame({"pick_id": [1, 2, 3, 4, 5, 6], "warehouse_id": [10, 10, 10, 10, 20, 20]})
errors = pd.DataFrame({"pick_id": [2, 3, 6], "kind": ["short", "short", "wrong item"]})`,
    ],
    sig: 'def solve(warehouses: pd.DataFrame, picks: pd.DataFrame, errors: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(warehouses, picks, errors):
    p = picks.copy()
    p["bad"] = p["pick_id"].isin(errors["pick_id"]).astype(int)
    g = p.merge(warehouses, on="warehouse_id").groupby("region", as_index=False).agg(bad=("bad", "sum"), total=("bad", "size"))
    g["error_rate"] = (g["bad"] / g["total"]).round(2)
    return g[["region", "error_rate"]]`,
    wrong: [`def solve(warehouses, picks, errors):
    e = errors.merge(picks, on="pick_id")
    num = e.groupby("warehouse_id", as_index=False).size().rename(columns={"size": "bad"})
    den = picks.groupby("warehouse_id", as_index=False).size().rename(columns={"size": "total"})
    g = den.merge(num, on="warehouse_id", how="left").merge(warehouses, on="warehouse_id")
    g["bad"] = g["bad"].fillna(0)
    g["error_rate"] = (g["bad"] / g["total"]).round(2)
    return g[["region", "error_rate"]]`],
    hints: ['The numerator is a number of picks.', 'isin turns "this pick went wrong" into one unit per pick.'],
    why: 'Asking the question once per pick stops two error kinds on one pick from inflating the rate.',
    mistakes: 'Counting error rows can report a rate above 1.' },

  { t: 'Active Drivers per City and Month', tags: ['nunique', 'groupby', 'merge'],
    story: 'A driver is active in a month if they gave at least one ride in it.',
    task: 'Return city, month and active_drivers.',
    setup: `cities = pd.DataFrame({"city_id": [1, 2], "city": ["Metro A", "Town B"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12], "city_id": [1, 1, 2]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4, 5], "driver_id": [10, 11, 12, 10, 12], "month": ["2024-04", "2024-04", "2024-04", "2024-05", "2024-05"]})`,
    hidden: [
      `cities = pd.DataFrame({"city_id": [1, 2], "city": ["Metro A", "Town B"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12], "city_id": [1, 1, 2]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4, 5], "driver_id": [10, 10, 11, 12, 12], "month": ["2024-04", "2024-04", "2024-04", "2024-04", "2024-05"]})`,
      `cities = pd.DataFrame({"city_id": [1, 2], "city": ["Metro A", "Town B"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12], "city_id": [1, 1, 2]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4, 5], "driver_id": [10, 11, 12, 10, 11], "month": ["2024-04", "2024-05", "2024-05", "2024-05", "2024-04"]})`,
    ],
    sig: 'def solve(cities: pd.DataFrame, drivers: pd.DataFrame, rides: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(cities, drivers, rides):
    m = rides.merge(drivers, on="driver_id").merge(cities, on="city_id")
    g = m.groupby(["city", "month"], as_index=False)["driver_id"].nunique()
    return g.rename(columns={"driver_id": "active_drivers"})`,
    wrong: [`def solve(cities, drivers, rides):
    m = rides.merge(drivers, on="driver_id").merge(cities, on="city_id")
    g = m.groupby(["city", "month"], as_index=False).size()
    return g.rename(columns={"size": "active_drivers"})`],
    hints: ['Counting rides is not counting drivers.', 'nunique on the driver id counts each one once.'],
    why: 'A driver with three rides in a month is one active driver.',
    mistakes: 'Counting rows measures activity, not people.' },

  { t: 'Games Losing Revenue', tags: ['pivot', 'merge', 'months'],
    story: 'A studio reviews month 7 against month 6 for each of its games.',
    task: 'Return publisher and game for the games whose revenue in month 7 was lower than in month 6.',
    setup: `publishers = pd.DataFrame({"publisher_id": [1, 2], "publisher": ["Blue Studio", "Red Studio"]})
games = pd.DataFrame({"game_id": [10, 11, 12], "publisher_id": [1, 1, 2], "game": ["Comet Run", "Dune Drift", "Pixel Keep"]})
purchases = pd.DataFrame({
    "purchase_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "game_id": [10, 10, 10, 11, 11, 11, 12, 12],
    "month": [6, 6, 7, 6, 7, 7, 6, 7],
    "amount": [100] * 8,
})`,
    hidden: [
      `publishers = pd.DataFrame({"publisher_id": [1, 2], "publisher": ["Blue Studio", "Red Studio"]})
games = pd.DataFrame({"game_id": [10, 11, 12], "publisher_id": [1, 1, 2], "game": ["Comet Run", "Dune Drift", "Pixel Keep"]})
purchases = pd.DataFrame({"purchase_id": [1, 2, 3, 4, 5, 6, 7, 8], "game_id": [10, 10, 10, 11, 11, 11, 12, 12], "month": [6, 6, 7, 6, 7, 7, 6, 7], "amount": [50, 50, 500, 100, 100, 100, 100, 100]})`,
      `publishers = pd.DataFrame({"publisher_id": [1, 2], "publisher": ["Blue Studio", "Red Studio"]})
games = pd.DataFrame({"game_id": [10, 11, 12], "publisher_id": [1, 1, 2], "game": ["Comet Run", "Dune Drift", "Pixel Keep"]})
purchases = pd.DataFrame({"purchase_id": [1, 2, 3, 4, 5, 6, 7, 8], "game_id": [10, 10, 11, 11, 12, 12, 12, 10], "month": [6, 7, 6, 7, 6, 7, 7, 6], "amount": [100, 100, 300, 100, 100, 400, 100, 100]})`,
    ],
    sig: 'def solve(publishers: pd.DataFrame, games: pd.DataFrame, purchases: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(publishers, games, purchases):
    r = purchases.groupby(["game_id", "month"], as_index=False)["amount"].sum()
    p = r.pivot(index="game_id", columns="month", values="amount").reset_index()
    p.columns = ["game_id"] + ["m" + str(c) for c in p.columns[1:]]
    drop = p[p["m7"] < p["m6"]]
    out = drop.merge(games, on="game_id").merge(publishers, on="publisher_id")
    return out[["publisher", "game"]].reset_index(drop=True)`,
    wrong: [`def solve(publishers, games, purchases):
    r = purchases.groupby(["game_id", "month"], as_index=False).size().rename(columns={"size": "amount"})
    p = r.pivot(index="game_id", columns="month", values="amount").reset_index()
    p.columns = ["game_id"] + ["m" + str(c) for c in p.columns[1:]]
    drop = p[p["m7"] < p["m6"]]
    out = drop.merge(games, on="game_id").merge(publishers, on="publisher_id")
    return out[["publisher", "game"]].reset_index(drop=True)`],
    hints: ['Revenue is money, not a number of purchases.', 'A pivot puts the two months side by side.'],
    why: 'Summing the amounts per game and month gives the figures the question asks about.',
    mistakes: 'Counting purchases agrees only while every purchase costs the same.' },

  { t: 'Readmitted Within Thirty Days', tags: ['self merge', 'dates', 'intervals'],
    story: 'A readmission is counted from the day the patient went home, not from the day they first came in.',
    task: 'Return patient, ward and gap for every case where a patient was admitted again within 30 days of being discharged.',
    setup: `patients = pd.DataFrame({"patient_id": [1, 2, 3], "patient": ["Asha", "Ben", "Chitra"]})
wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Cardiology", "General"]})
admissions = pd.DataFrame({
    "admission_id": [1, 2, 3, 4, 5],
    "patient_id": [1, 1, 2, 2, 3],
    "ward_id": [1, 2, 1, 1, 2],
    "admit_day": [1, 20, 5, 60, 10],
    "discharge_day": [1, 20, 5, 60, 10],
})`,
    hidden: [
      `patients = pd.DataFrame({"patient_id": [1, 2, 3], "patient": ["Asha", "Ben", "Chitra"]})
wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Cardiology", "General"]})
admissions = pd.DataFrame({"admission_id": [1, 2, 3, 4, 5], "patient_id": [1, 1, 2, 2, 3], "ward_id": [1, 2, 1, 1, 2], "admit_day": [1, 20, 5, 60, 10], "discharge_day": [40, 20, 5, 60, 10]})`,
      `patients = pd.DataFrame({"patient_id": [1, 2, 3], "patient": ["Asha", "Ben", "Chitra"]})
wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Cardiology", "General"]})
admissions = pd.DataFrame({"admission_id": [1, 2, 3, 4, 5], "patient_id": [1, 1, 2, 2, 3], "ward_id": [1, 2, 1, 1, 2], "admit_day": [1, 40, 5, 25, 10], "discharge_day": [1, 40, 5, 25, 10]})`,
    ],
    sig: 'def solve(patients: pd.DataFrame, wards: pd.DataFrame, admissions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(patients, wards, admissions):
    m = admissions.merge(admissions, on="patient_id", suffixes=("_a", "_b"))
    m = m[(m["admission_id_b"] != m["admission_id_a"])
          & (m["admit_day_b"] >= m["discharge_day_a"])
          & (m["admit_day_b"] - m["discharge_day_a"] <= 30)].copy()
    m["gap"] = m["admit_day_b"] - m["discharge_day_a"]
    out = m.merge(patients, on="patient_id").merge(wards, left_on="ward_id_a", right_on="ward_id")
    return out[["patient", "ward", "gap"]].reset_index(drop=True)`,
    wrong: [`def solve(patients, wards, admissions):
    m = admissions.merge(admissions, on="patient_id", suffixes=("_a", "_b"))
    m = m[(m["admission_id_b"] != m["admission_id_a"])
          & (m["admit_day_b"] >= m["admit_day_a"])
          & (m["admit_day_b"] - m["admit_day_a"] <= 30)].copy()
    m["gap"] = m["admit_day_b"] - m["discharge_day_a"]
    out = m.merge(patients, on="patient_id").merge(wards, left_on="ward_id_a", right_on="ward_id")
    return out[["patient", "ward", "gap"]].reset_index(drop=True)`],
    hints: ['Which date starts the 30-day clock?', 'Merge the admissions to themselves on the patient.'],
    why: 'Measuring from the discharge day makes a long stay count properly.',
    mistakes: 'Measuring from the admission day counts the days the patient was still in hospital as if they were at home.' },

  { t: 'Promo Codes That Actually Discounted', tags: ['merge', 'filtering', 'groupby'],
    story: 'A promo code can be attached to an order and still take nothing off, either because it did not apply or because no discount row was written.',
    task: 'Return code, orders and discounted for the promo codes that really discounted something.',
    setup: `promos = pd.DataFrame({"code": ["SAVE10", "FREESHIP", "WELCOME"], "description": ["Ten off", "Free shipping", "New customers"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "code": ["SAVE10", "SAVE10", "FREESHIP", "WELCOME"], "total": [900, 1200, 500, 300]})
discounts = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 100, 50, 30]})`,
    hidden: [
      `promos = pd.DataFrame({"code": ["SAVE10", "FREESHIP", "WELCOME"], "description": ["Ten off", "Free shipping", "New customers"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "code": ["SAVE10", "SAVE10", "FREESHIP", "WELCOME"], "total": [900, 1200, 500, 300]})
discounts = pd.DataFrame({"order_id": [1, 2, 3, 4], "amount": [100, 0, 50, 30]})`,
      `promos = pd.DataFrame({"code": ["SAVE10", "FREESHIP", "WELCOME"], "description": ["Ten off", "Free shipping", "New customers"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "code": ["SAVE10", "SAVE10", "FREESHIP", "WELCOME"], "total": [900, 1200, 500, 300]})
discounts = pd.DataFrame({"order_id": [1, 3], "amount": [100, 50]})`,
    ],
    sig: 'def solve(promos: pd.DataFrame, orders: pd.DataFrame, discounts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(promos, orders, discounts):
    m = orders.merge(discounts, on="order_id")
    m = m[m["amount"] > 0]
    g = m.groupby("code", as_index=False).agg(orders=("order_id", "size"), discounted=("amount", "sum"))
    return g.merge(promos, on="code")[["code", "orders", "discounted"]]`,
    wrong: [`def solve(promos, orders, discounts):
    m = orders.merge(discounts, on="order_id", how="left")
    m["amount"] = m["amount"].fillna(0)
    g = m.groupby("code", as_index=False).agg(orders=("order_id", "size"), discounted=("amount", "sum"))
    return g.merge(promos, on="code")[["code", "orders", "discounted"]]`],
    hints: ['An order only counts when something was actually taken off it.', 'That means a discount row with a positive amount.'],
    why: 'Requiring the positive discount answers the question asked.',
    mistakes: 'Counting every order that carries the code credits codes that did nothing.' },

  { t: 'Readings Outside Their Sensor Range', tags: ['merge', 'per-row threshold', 'groupby'],
    story: 'Each kind of sensor has its own healthy range, published in the sensor type.',
    task: 'Return site, type and out_of_range for every sensor that recorded a reading outside its own range.',
    setup: `sensor_types = pd.DataFrame({"type_id": [1, 2], "type": ["Temperature", "Pressure"], "min_ok": [0, 0], "max_ok": [100, 100]})
sensors = pd.DataFrame({"sensor_id": [10, 11, 12], "type_id": [1, 2, 1], "site": ["Mill", "Dock", "Farm"]})
readings = pd.DataFrame({"sensor_id": [10, 10, 11, 11, 12, 12], "day": ["2024-02-01", "2024-02-02"] * 3, "value": [50, 120, 30, -5, 99, 101]})`,
    hidden: [
      `sensor_types = pd.DataFrame({"type_id": [1, 2], "type": ["Temperature", "Pressure"], "min_ok": [0, 20], "max_ok": [100, 40]})
sensors = pd.DataFrame({"sensor_id": [10, 11, 12], "type_id": [1, 2, 1], "site": ["Mill", "Dock", "Farm"]})
readings = pd.DataFrame({"sensor_id": [10, 10, 11, 11, 12, 12], "day": ["2024-02-01", "2024-02-02"] * 3, "value": [50, 120, 50, 60, 99, 101]})`,
      `sensor_types = pd.DataFrame({"type_id": [1, 2], "type": ["Temperature", "Pressure"], "min_ok": [60, 0], "max_ok": [110, 100]})
sensors = pd.DataFrame({"sensor_id": [10, 11, 12], "type_id": [1, 2, 1], "site": ["Mill", "Dock", "Farm"]})
readings = pd.DataFrame({"sensor_id": [10, 10, 11, 11, 12, 12], "day": ["2024-02-01", "2024-02-02"] * 3, "value": [50, 120, 30, -5, 99, 101]})`,
    ],
    sig: 'def solve(sensor_types: pd.DataFrame, sensors: pd.DataFrame, readings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sensor_types, sensors, readings):
    m = readings.merge(sensors, on="sensor_id").merge(sensor_types, on="type_id")
    bad = m[(m["value"] < m["min_ok"]) | (m["value"] > m["max_ok"])]
    g = bad.groupby(["site", "type"], as_index=False).size()
    return g.rename(columns={"size": "out_of_range"})`,
    wrong: [`def solve(sensor_types, sensors, readings):
    m = readings.merge(sensors, on="sensor_id").merge(sensor_types, on="type_id")
    bad = m[(m["value"] < 0) | (m["value"] > 100)]
    g = bad.groupby(["site", "type"], as_index=False).size()
    return g.rename(columns={"size": "out_of_range"})`],
    hints: ['The bounds come from the type of the sensor that produced the reading.', 'Two merges bring them onto the reading row.'],
    why: 'After the merges each reading sits next to its own bounds, so one comparison does the work.',
    mistakes: 'A fixed 0 to 100 happens to match while every type shares those bounds.' },

  { t: 'Loans in Arrears', tags: ['left join', 'fillna', 'filtering'],
    story: 'A loan that has never been paid has no payment rows at all.',
    task: 'Return product, loan, paid and scheduled_total for the loans that have paid less than they were scheduled to.',
    setup: `loan_products = pd.DataFrame({"product_id": [1, 2], "product": ["Personal", "Auto"]})
loans = pd.DataFrame({"loan_id": [100, 101, 102, 103], "product_id": [1, 1, 2, 2], "scheduled_total": [5000, 8000, 12000, 6000]})
payments = pd.DataFrame({"loan_id": [100, 101, 102, 103], "amount": [5000, 3000, 12000, 2000]})`,
    hidden: [
      `loan_products = pd.DataFrame({"product_id": [1, 2], "product": ["Personal", "Auto"]})
loans = pd.DataFrame({"loan_id": [100, 101, 102, 103], "product_id": [1, 1, 2, 2], "scheduled_total": [5000, 8000, 12000, 6000]})
payments = pd.DataFrame({"loan_id": [100, 102, 103], "amount": [5000, 12000, 2000]})`,
      `loan_products = pd.DataFrame({"product_id": [1, 2], "product": ["Personal", "Auto"]})
loans = pd.DataFrame({"loan_id": [100, 101, 102, 103], "product_id": [1, 1, 2, 2], "scheduled_total": [5000, 8000, 12000, 6000]})
payments = pd.DataFrame({"loan_id": [100, 100, 101, 102, 103], "amount": [2000, 3000, 8000, 6000, 6000]})`,
    ],
    sig: 'def solve(loan_products: pd.DataFrame, loans: pd.DataFrame, payments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(loan_products, loans, payments):
    paid = payments.groupby("loan_id", as_index=False)["amount"].sum().rename(columns={"amount": "paid"})
    l = loans.merge(paid, on="loan_id", how="left")
    l["paid"] = l["paid"].fillna(0).astype(int)
    bad = l[l["paid"] < l["scheduled_total"]]
    out = bad.merge(loan_products, on="product_id")
    return out[["product", "loan_id", "paid", "scheduled_total"]].rename(columns={"loan_id": "loan"}).reset_index(drop=True)`,
    wrong: [`def solve(loan_products, loans, payments):
    paid = payments.groupby("loan_id", as_index=False)["amount"].sum().rename(columns={"amount": "paid"})
    l = loans.merge(paid, on="loan_id")
    bad = l[l["paid"] < l["scheduled_total"]]
    out = bad.merge(loan_products, on="product_id")
    return out[["product", "loan_id", "paid", "scheduled_total"]].rename(columns={"loan_id": "loan"}).reset_index(drop=True)`],
    hints: ['The worst arrears are the loans with no payments at all.', 'A left merge keeps them, and the gap becomes 0.'],
    why: 'Giving every loan a paid figure, zero included, covers the loans that have never paid.',
    mistakes: 'A default inner merge drops them silently.' },
];
