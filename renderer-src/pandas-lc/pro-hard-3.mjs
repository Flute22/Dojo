// Pandas, interview-grade set: Hard, batch 3.
export default [
  { t: 'Payouts That Do Not Reconcile', tags: ['groupby', 'merge', 'reconciliation'],
    story: 'A payout gathers order amounts and takes fees off the top. Fees can be charged in more than one line.',
    task: 'Return merchant, payout, expected and amount for the payouts whose items minus fees do not match what was paid out.',
    setup: `merchants = pd.DataFrame({"merchant_id": [1, 2], "merchant": ["Corner Shop", "Big Store"]})
payouts = pd.DataFrame({"payout_id": [100, 101], "merchant_id": [1, 2], "amount": [900, 1700]})
payout_items = pd.DataFrame({"payout_id": [100, 100, 101, 101], "order_amount": [500, 500, 1000, 1000]})
fees = pd.DataFrame({"payout_id": [100, 101], "amount": [100, 200]})`,
    hidden: [
      `merchants = pd.DataFrame({"merchant_id": [1, 2], "merchant": ["Corner Shop", "Big Store"]})
payouts = pd.DataFrame({"payout_id": [100, 101], "merchant_id": [1, 2], "amount": [900, 1700]})
payout_items = pd.DataFrame({"payout_id": [100, 100, 101, 101], "order_amount": [500, 500, 1000, 1000]})
fees = pd.DataFrame({"payout_id": [100, 100, 101], "amount": [50, 50, 200]})`,
      `merchants = pd.DataFrame({"merchant_id": [1, 2], "merchant": ["Corner Shop", "Big Store"]})
payouts = pd.DataFrame({"payout_id": [100, 101], "merchant_id": [1, 2], "amount": [900, 1700]})
payout_items = pd.DataFrame({"payout_id": [100, 100, 101, 101], "order_amount": [500, 500, 1000, 900]})
fees = pd.DataFrame({"payout_id": [100, 101], "amount": [100, 200]})`,
    ],
    sig: 'def solve(merchants: pd.DataFrame, payouts: pd.DataFrame, payout_items: pd.DataFrame, fees: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(merchants, payouts, payout_items, fees):
    items = payout_items.groupby("payout_id", as_index=False)["order_amount"].sum()
    fee = fees.groupby("payout_id", as_index=False)["amount"].sum().rename(columns={"amount": "fee"})
    p = payouts.merge(items, on="payout_id", how="left").merge(fee, on="payout_id", how="left")
    p["order_amount"] = p["order_amount"].fillna(0)
    p["fee"] = p["fee"].fillna(0)
    p["expected"] = (p["order_amount"] - p["fee"]).astype(int)
    bad = p[p["expected"] != p["amount"]]
    out = bad.merge(merchants, on="merchant_id")
    return out[["merchant", "payout_id", "expected", "amount"]].rename(columns={"payout_id": "payout"}).reset_index(drop=True)`,
    wrong: [`def solve(merchants, payouts, payout_items, fees):
    m = payouts.merge(payout_items, on="payout_id").merge(fees, on="payout_id", suffixes=("", "_fee"))
    g = m.groupby(["payout_id", "merchant_id", "amount"], as_index=False).agg(
        items=("order_amount", "sum"), fee=("amount_fee", "first")
    )
    g["expected"] = (g["items"] - g["fee"]).astype(int)
    bad = g[g["expected"] != g["amount"]]
    out = bad.merge(merchants, on="merchant_id")
    return out[["merchant", "payout_id", "expected", "amount"]].rename(columns={"payout_id": "payout"}).reset_index(drop=True)`],
    hints: ['Items and fees are two separate totals per payout.', 'Aggregate each one before putting them next to the payout.'],
    why: 'Separate aggregations stop a second fee line from multiplying the item rows.',
    mistakes: 'Merging both frames at once repeats the items once per fee and the sums go wrong.' },

  { t: 'Closing Stock per Month', tags: ['cumsum', 'merge', 'months'], o: true,
    story: 'Stock carries over: what is left at the end of a month opens the next one.',
    task: 'Return month and closing: the quantity of the product left at the end of each month, ordered by month.',
    setup: `products = pd.DataFrame({"product_id": [1], "sku": ["LAMP-01"]})
months = pd.DataFrame({"seq": [1], "month": ["2024-01"]})
receipts = pd.DataFrame({"product_id": [1], "month": ["2024-01"], "qty": [100]})
issues = pd.DataFrame({"product_id": [1], "month": ["2024-01"], "qty": [40]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1], "sku": ["LAMP-01"]})
months = pd.DataFrame({"seq": [1, 2, 3], "month": ["2024-01", "2024-02", "2024-03"]})
receipts = pd.DataFrame({"product_id": [1, 1], "month": ["2024-01", "2024-02"], "qty": [100, 50]})
issues = pd.DataFrame({"product_id": [1, 1, 1], "month": ["2024-01", "2024-02", "2024-03"], "qty": [40, 30, 20]})`,
      `products = pd.DataFrame({"product_id": [1], "sku": ["LAMP-01"]})
months = pd.DataFrame({"seq": [1, 2], "month": ["2024-01", "2024-02"]})
receipts = pd.DataFrame({"product_id": [1, 1], "month": ["2024-01", "2024-02"], "qty": [80, 10]})
issues = pd.DataFrame({"product_id": [1, 1], "month": ["2024-01", "2024-02"], "qty": [30, 5]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, months: pd.DataFrame, receipts: pd.DataFrame, issues: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, months, receipts, issues):
    r = receipts.groupby("month", as_index=False)["qty"].sum().rename(columns={"qty": "inq"})
    i = issues.groupby("month", as_index=False)["qty"].sum().rename(columns={"qty": "outq"})
    m = months.merge(r, on="month", how="left").merge(i, on="month", how="left").sort_values("seq")
    m["inq"] = m["inq"].fillna(0)
    m["outq"] = m["outq"].fillna(0)
    m["closing"] = (m["inq"] - m["outq"]).cumsum().astype(int)
    return m[["month", "closing"]].reset_index(drop=True)`,
    wrong: [`def solve(products, months, receipts, issues):
    r = receipts.groupby("month", as_index=False)["qty"].sum().rename(columns={"qty": "inq"})
    i = issues.groupby("month", as_index=False)["qty"].sum().rename(columns={"qty": "outq"})
    m = months.merge(r, on="month", how="left").merge(i, on="month", how="left").sort_values("seq")
    m["inq"] = m["inq"].fillna(0)
    m["outq"] = m["outq"].fillna(0)
    m["closing"] = (m["inq"] - m["outq"]).astype(int)
    return m[["month", "closing"]].reset_index(drop=True)`],
    hints: ['Closing stock is everything received so far minus everything issued so far.', 'cumsum over the months in order does that.'],
    why: 'A cumulative sum of the monthly movements is the balance carried forward.',
    mistakes: 'The month\'s own movement is the change, not the balance.' },

  { t: 'Users Logging In Less and Complaining', tags: ['pivot', 'merge', 'two signals'],
    story: 'A customer whose usage falls while they are also raising tickets is worth calling.',
    task: 'Return person, plan, m1, m2 and tickets for the users whose logins fell from month 1 to 2 and who raised at least one ticket in month 2.',
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"], "plan": ["pro", "free", "pro"]})
logins = pd.DataFrame({"user_id": [1, 1, 2, 2, 3, 3], "month": [1, 2, 1, 2, 1, 2], "logins": [20, 5, 10, 12, 8, 2]})
tickets = pd.DataFrame({"ticket_id": [1, 2], "user_id": [1, 3], "month": [2, 2], "subject": ["Slow", "Crash"]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"], "plan": ["pro", "free", "pro"]})
logins = pd.DataFrame({"user_id": [1, 1, 2, 2, 3, 3], "month": [1, 2, 1, 2, 1, 2], "logins": [20, 5, 10, 12, 8, 2]})
tickets = pd.DataFrame({"ticket_id": [1, 2, 3], "user_id": [1, 2, 2], "month": [2, 2, 2], "subject": ["Slow", "Billing", "Refund"]})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"], "plan": ["pro", "free", "pro"]})
logins = pd.DataFrame({"user_id": [1, 1, 2, 2, 3, 3], "month": [1, 2, 1, 2, 1, 2], "logins": [20, 25, 10, 12, 8, 2]})
tickets = pd.DataFrame({"ticket_id": [1, 2], "user_id": [1, 3], "month": [2, 2], "subject": ["Slow", "Crash"]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, logins: pd.DataFrame, tickets: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, logins, tickets):
    p = logins.pivot(index="user_id", columns="month", values="logins").reset_index()
    p.columns = ["user_id", "m1", "m2"]
    t = tickets[tickets["month"] == 2].groupby("user_id", as_index=False).size().rename(columns={"size": "tickets"})
    m = p.merge(t, on="user_id", how="left")
    m["tickets"] = m["tickets"].fillna(0).astype(int)
    bad = m[(m["m2"] < m["m1"]) & (m["tickets"] > 0)]
    out = bad.merge(users, on="user_id")
    return out[["person", "plan", "m1", "m2", "tickets"]].reset_index(drop=True)`,
    wrong: [`def solve(users, logins, tickets):
    p = logins.pivot(index="user_id", columns="month", values="logins").reset_index()
    p.columns = ["user_id", "m1", "m2"]
    t = tickets[tickets["month"] == 2].groupby("user_id", as_index=False).size().rename(columns={"size": "tickets"})
    m = p.merge(t, on="user_id", how="left")
    m["tickets"] = m["tickets"].fillna(0).astype(int)
    bad = m[(m["m2"] < m["m1"]) | (m["tickets"] > 0)]
    out = bad.merge(users, on="user_id")
    return out[["person", "plan", "m1", "m2", "tickets"]].reset_index(drop=True)`],
    hints: ['Both signals have to be present.', 'Combine the two masks with &.'],
    why: 'The call list is the intersection of falling usage and a complaint.',
    mistakes: 'An OR puts a happy customer who asked a billing question on the list.' },

  { t: 'Route Margin Including Costless Trips', tags: ['groupby', 'merge', 'fillna'],
    story: 'A trip whose costs have not been filed yet has no cost row at all.',
    task: 'Return route, revenue, cost and margin for every route.',
    setup: `routes = pd.DataFrame({"route_id": [1, 2], "route": ["DEL-BOM", "BOM-BLR"]})
trips = pd.DataFrame({"trip_id": [10, 11, 12], "route_id": [1, 1, 2], "day": ["2024-05-01", "2024-05-02", "2024-05-01"]})
costs = pd.DataFrame({"trip_id": [10, 11, 12], "amount": [400, 500, 300]})
revenues = pd.DataFrame({"trip_id": [10, 11, 12], "amount": [900, 700, 500]})`,
    hidden: [
      `routes = pd.DataFrame({"route_id": [1, 2], "route": ["DEL-BOM", "BOM-BLR"]})
trips = pd.DataFrame({"trip_id": [10, 11, 12], "route_id": [1, 1, 2], "day": ["2024-05-01", "2024-05-02", "2024-05-01"]})
costs = pd.DataFrame({"trip_id": [10, 12], "amount": [400, 300]})
revenues = pd.DataFrame({"trip_id": [10, 11, 12], "amount": [900, 700, 500]})`,
      `routes = pd.DataFrame({"route_id": [1, 2], "route": ["DEL-BOM", "BOM-BLR"]})
trips = pd.DataFrame({"trip_id": [10, 11, 12], "route_id": [1, 1, 2], "day": ["2024-05-01", "2024-05-02", "2024-05-01"]})
costs = pd.DataFrame({"trip_id": [10, 11, 12], "amount": [400, 500, 300]})
revenues = pd.DataFrame({"trip_id": [10, 11, 12], "amount": [500, 400, 900]})`,
    ],
    sig: 'def solve(routes: pd.DataFrame, trips: pd.DataFrame, costs: pd.DataFrame, revenues: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(routes, trips, costs, revenues):
    t = trips.merge(costs.rename(columns={"amount": "cost"}), on="trip_id", how="left")
    t = t.merge(revenues.rename(columns={"amount": "revenue"}), on="trip_id", how="left")
    t["cost"] = t["cost"].fillna(0)
    t["revenue"] = t["revenue"].fillna(0)
    g = t.groupby("route_id", as_index=False).agg(revenue=("revenue", "sum"), cost=("cost", "sum"))
    g["margin"] = g["revenue"] - g["cost"]
    out = g.merge(routes, on="route_id")
    return out[["route", "revenue", "cost", "margin"]].reset_index(drop=True)`,
    wrong: [`def solve(routes, trips, costs, revenues):
    t = trips.merge(costs.rename(columns={"amount": "cost"}), on="trip_id")
    t = t.merge(revenues.rename(columns={"amount": "revenue"}), on="trip_id")
    g = t.groupby("route_id", as_index=False).agg(revenue=("revenue", "sum"), cost=("cost", "sum"))
    g["margin"] = g["revenue"] - g["cost"]
    out = g.merge(routes, on="route_id")
    return out[["route", "revenue", "cost", "margin"]].reset_index(drop=True)`],
    hints: ['A trip with no cost row still earned its revenue.', 'Both merges go on the left.'],
    why: 'Left merges keep every trip and fill the gaps with zero.',
    mistakes: 'An inner merge drops the trip entirely, so its revenue vanishes too.' },

  { t: 'Promotions Overlapping on a Product', tags: ['self merge', 'intervals', 'merge'],
    story: 'Two promotions must never cover the same product at the same time, or the till does not know which discount to apply.',
    task: 'Return sku, promo_a and promo_b for the products covered by two promotions whose date ranges overlap, the earlier-starting one first.',
    setup: `promotions = pd.DataFrame({
    "promo_id": [1, 2, 3],
    "promo": ["Spring Sale", "Clearance", "Loyalty"],
    "start_day": ["2024-03-01", "2024-03-20", "2024-04-01"],
    "end_day": ["2024-03-31", "2024-03-25", "2024-04-10"],
})
products = pd.DataFrame({"product_id": [10, 11], "sku": ["LAMP-01", "DESK-02"]})
promo_products = pd.DataFrame({"promo_id": [1, 2, 3], "product_id": [10, 10, 11]})`,
    hidden: [
      `promotions = pd.DataFrame({"promo_id": [1, 2, 3], "promo": ["Spring Sale", "Clearance", "Loyalty"], "start_day": ["2024-03-01", "2024-03-20", "2024-04-01"], "end_day": ["2024-03-22", "2024-03-25", "2024-04-10"]})
products = pd.DataFrame({"product_id": [10, 11], "sku": ["LAMP-01", "DESK-02"]})
promo_products = pd.DataFrame({"promo_id": [1, 2, 3], "product_id": [10, 10, 11]})`,
      `promotions = pd.DataFrame({"promo_id": [1, 2, 3], "promo": ["Spring Sale", "Clearance", "Loyalty"], "start_day": ["2024-03-01", "2024-03-10", "2024-04-01"], "end_day": ["2024-03-05", "2024-03-25", "2024-04-10"]})
products = pd.DataFrame({"product_id": [10, 11], "sku": ["LAMP-01", "DESK-02"]})
promo_products = pd.DataFrame({"promo_id": [1, 2, 3], "product_id": [10, 10, 11]})`,
    ],
    sig: 'def solve(promotions: pd.DataFrame, products: pd.DataFrame, promo_products: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(promotions, products, promo_products):
    pp = promo_products.merge(promotions, on="promo_id")
    pair = pp.merge(pp, on="product_id", suffixes=("_a", "_b"))
    pair = pair[(pair["start_day_a"] < pair["start_day_b"]) & (pair["end_day_a"] >= pair["start_day_b"])]
    out = pair.merge(products, on="product_id")
    return out[["sku", "promo_a", "promo_b"]].reset_index(drop=True)`,
    wrong: [`def solve(promotions, products, promo_products):
    pp = promo_products.merge(promotions, on="promo_id")
    pair = pp.merge(pp, on="product_id", suffixes=("_a", "_b"))
    pair = pair[(pair["start_day_a"] < pair["start_day_b"]) & (pair["end_day_a"] >= pair["end_day_b"])]
    out = pair.merge(products, on="product_id")
    return out[["sku", "promo_a", "promo_b"]].reset_index(drop=True)`],
    hints: ['An overlap starts when the earlier promotion is still running on the day the later one begins.', 'Compare the first one\'s end with the second one\'s start.'],
    why: 'That test catches every overlap, including a short promotion inside a long one.',
    mistakes: 'Comparing the two end days only finds a promotion that completely contains another.' },

  { t: 'Products Bought by the Same Customer', tags: ['self merge', 'drop_duplicates', 'pairs'],
    story: 'A cross-sell pair is two different products the same customer has bought, whether in one order or across several.',
    task: 'Return product_a, product_b and customers: how many customers bought both, with the smaller product id first.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "product": ["Lamp", "Desk", "Rug"]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "customer_id": [1, 1, 2], "day": ["2024-05-01", "2024-06-01", "2024-05-02"]})
order_items = pd.DataFrame({"order_id": [100, 100, 102], "product_id": [10, 11, 12]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "product": ["Lamp", "Desk", "Rug"]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "customer_id": [1, 1, 2], "day": ["2024-05-01", "2024-06-01", "2024-05-02"]})
order_items = pd.DataFrame({"order_id": [100, 101, 102], "product_id": [10, 11, 12]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "product": ["Lamp", "Desk", "Rug"]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "customer_id": [1, 1, 2], "day": ["2024-05-01", "2024-06-01", "2024-05-02"]})
order_items = pd.DataFrame({"order_id": [100, 100, 101, 101, 102, 102, 102], "product_id": [10, 11, 10, 11, 12, 10, 11]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, products: pd.DataFrame, orders: pd.DataFrame, order_items: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, products, orders, order_items):
    cp = order_items.merge(orders, on="order_id")[["customer_id", "product_id"]].drop_duplicates()
    pair = cp.merge(cp, on="customer_id", suffixes=("_a", "_b"))
    pair = pair[pair["product_id_b"] > pair["product_id_a"]]
    g = pair.groupby(["product_id_a", "product_id_b"], as_index=False).size().rename(columns={"size": "customers"})
    g = g.merge(products, left_on="product_id_a", right_on="product_id").rename(columns={"product": "product_a"})
    g = g.merge(products, left_on="product_id_b", right_on="product_id").rename(columns={"product": "product_b"})
    return g[["product_a", "product_b", "customers"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, products, orders, order_items):
    oi = order_items.merge(orders, on="order_id")
    pair = oi.merge(oi, on="order_id", suffixes=("_a", "_b"))
    pair = pair[pair["product_id_b"] > pair["product_id_a"]]
    g = pair.groupby(["product_id_a", "product_id_b"], as_index=False).size().rename(columns={"size": "customers"})
    g = g.merge(products, left_on="product_id_a", right_on="product_id").rename(columns={"product": "product_a"})
    g = g.merge(products, left_on="product_id_b", right_on="product_id").rename(columns={"product": "product_b"})
    return g[["product_a", "product_b", "customers"]].reset_index(drop=True)`],
    hints: ['The pair belongs to the customer, not to one order.', 'Reduce to the distinct products per customer first.'],
    why: 'Distinct customer-product pairs let a pair span two orders and stop a repeat purchase from counting twice.',
    mistakes: 'Pairing inside an order misses the customer who bought the two things on different days.' },

  { t: 'Patients on Interacting Drugs', tags: ['self merge', 'intervals', 'lookup'],
    story: 'Two drugs only interact if the patient is taking them at the same time. The interacting pairs are listed once, in either order.',
    task: 'Return patient, drug_a, drug_b and severity for the patients taking two interacting drugs on overlapping days.',
    setup: `patients = pd.DataFrame({"patient_id": [1, 2, 3], "patient": ["Asha", "Ben", "Chitra"]})
drugs = pd.DataFrame({"drug_id": [10, 11, 12], "drug": ["Warfin", "Aspira", "Cetiriz"]})
prescriptions = pd.DataFrame({"rx_id": [1, 2, 3, 4], "patient_id": [1, 1, 2, 3], "drug_id": [10, 11, 10, 12], "from_day": [1, 10, 1, 1], "to_day": [30, 20, 10, 30]})
interactions = pd.DataFrame({"drug_a": [10], "drug_b": [11], "severity": ["high"]})`,
    hidden: [
      `patients = pd.DataFrame({"patient_id": [1, 2, 3], "patient": ["Asha", "Ben", "Chitra"]})
drugs = pd.DataFrame({"drug_id": [10, 11, 12], "drug": ["Warfin", "Aspira", "Cetiriz"]})
prescriptions = pd.DataFrame({"rx_id": [1, 2, 3, 4, 5], "patient_id": [1, 1, 2, 2, 3], "drug_id": [10, 11, 10, 11, 12], "from_day": [1, 10, 1, 20, 1], "to_day": [30, 20, 10, 30, 30]})
interactions = pd.DataFrame({"drug_a": [10], "drug_b": [11], "severity": ["high"]})`,
      `patients = pd.DataFrame({"patient_id": [1, 2, 3], "patient": ["Asha", "Ben", "Chitra"]})
drugs = pd.DataFrame({"drug_id": [10, 11, 12], "drug": ["Warfin", "Aspira", "Cetiriz"]})
prescriptions = pd.DataFrame({"rx_id": [1, 2, 3, 4], "patient_id": [1, 1, 2, 3], "drug_id": [10, 11, 10, 12], "from_day": [1, 10, 1, 1], "to_day": [5, 20, 10, 30]})
interactions = pd.DataFrame({"drug_a": [10], "drug_b": [11], "severity": ["high"]})`,
    ],
    sig: 'def solve(patients: pd.DataFrame, drugs: pd.DataFrame, prescriptions: pd.DataFrame, interactions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(patients, drugs, prescriptions, interactions):
    pair = prescriptions.merge(prescriptions, on="patient_id", suffixes=("_a", "_b"))
    pair = pair[(pair["drug_id_a"] != pair["drug_id_b"])
                & (pair["from_day_a"] <= pair["to_day_b"])
                & (pair["from_day_b"] <= pair["to_day_a"])]
    m = pair.merge(interactions, left_on=["drug_id_a", "drug_id_b"], right_on=["drug_a", "drug_b"])
    m = m.merge(patients, on="patient_id")
    m = m.merge(drugs, left_on="drug_id_a", right_on="drug_id").rename(columns={"drug": "name_a"})
    m = m.merge(drugs, left_on="drug_id_b", right_on="drug_id", suffixes=("", "_y")).rename(columns={"drug": "name_b"})
    return m[["patient", "name_a", "name_b", "severity"]].rename(
        columns={"name_a": "drug_a", "name_b": "drug_b"}
    ).reset_index(drop=True)`,
    wrong: [`def solve(patients, drugs, prescriptions, interactions):
    pair = prescriptions.merge(prescriptions, on="patient_id", suffixes=("_a", "_b"))
    pair = pair[pair["drug_id_a"] != pair["drug_id_b"]]
    m = pair.merge(interactions, left_on=["drug_id_a", "drug_id_b"], right_on=["drug_a", "drug_b"])
    m = m.merge(patients, on="patient_id")
    m = m.merge(drugs, left_on="drug_id_a", right_on="drug_id").rename(columns={"drug": "name_a"})
    m = m.merge(drugs, left_on="drug_id_b", right_on="drug_id", suffixes=("", "_y")).rename(columns={"drug": "name_b"})
    return m[["patient", "name_a", "name_b", "severity"]].rename(
        columns={"name_a": "drug_a", "name_b": "drug_b"}
    ).reset_index(drop=True)`],
    hints: ['Two courses overlap when each starts on or before the other ends.', 'The interaction list decides which pairs matter.'],
    why: 'Both the dates and the lookup have to hold for a real clash.',
    mistakes: 'Without the dates the query flags a patient who finished one drug before starting the other.' },

  { t: 'Teachers Above Their School Average', tags: ['transform', 'groupby', 'merge'],
    story: 'Schools differ in size, so a fair comparison is within the school.',
    task: 'Return school, teacher and lessons for the teachers with more lessons than the average teacher at their own school.',
    setup: `schools = pd.DataFrame({"school_id": [1], "school": ["Riverside"]})
teachers = pd.DataFrame({"teacher_id": [10, 11, 12], "school_id": [1, 1, 1], "teacher": ["Rao", "Iyer", "Nair"]})
lessons = pd.DataFrame({"lesson_id": [1, 2, 3, 4, 5, 6], "teacher_id": [10, 10, 10, 11, 12, 12], "day": ["2024-09-02"] * 6})`,
    hidden: [
      `schools = pd.DataFrame({"school_id": [1, 2], "school": ["Riverside", "Hilltop"]})
teachers = pd.DataFrame({"teacher_id": [10, 11, 12, 13], "school_id": [1, 1, 2, 2], "teacher": ["Rao", "Iyer", "Nair", "Das"]})
lessons = pd.DataFrame({"lesson_id": list(range(1, 10)), "teacher_id": [10, 10, 10, 10, 11, 11, 11, 12, 13], "day": ["2024-09-02"] * 9})`,
      `schools = pd.DataFrame({"school_id": [1], "school": ["Riverside"]})
teachers = pd.DataFrame({"teacher_id": [10, 11, 12], "school_id": [1, 1, 1], "teacher": ["Rao", "Iyer", "Nair"]})
lessons = pd.DataFrame({"lesson_id": [1, 2, 3, 4, 5, 6], "teacher_id": [10, 11, 11, 11, 12, 12], "day": ["2024-09-02"] * 6})`,
    ],
    sig: 'def solve(schools: pd.DataFrame, teachers: pd.DataFrame, lessons: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(schools, teachers, lessons):
    n = lessons.groupby("teacher_id", as_index=False).size().rename(columns={"size": "lessons"})
    t = n.merge(teachers, on="teacher_id")
    t["school_avg"] = t.groupby("school_id")["lessons"].transform("mean")
    out = t[t["lessons"] > t["school_avg"]].merge(schools, on="school_id")
    return out[["school", "teacher", "lessons"]].reset_index(drop=True)`,
    wrong: [`def solve(schools, teachers, lessons):
    n = lessons.groupby("teacher_id", as_index=False).size().rename(columns={"size": "lessons"})
    t = n.merge(teachers, on="teacher_id")
    out = t[t["lessons"] > t["lessons"].mean()].merge(schools, on="school_id")
    return out[["school", "teacher", "lessons"]].reset_index(drop=True)`],
    hints: ['The average is the one of the teacher\'s own school.', 'transform("mean") broadcasts it back.'],
    why: 'A per-school benchmark is what makes the comparison fair.',
    mistakes: 'One overall average matches only while there is a single school.' },

  { t: 'Journeys With No Tap Out', tags: ['merge', 'ordering', 'pairing'],
    story: 'A journey is a tap in followed by a tap out by the same card. A tap out recorded before the tap in belongs to an earlier journey.',
    task: 'Return card, station and at_min for the taps in that were never followed by a tap out.',
    setup: `stations = pd.DataFrame({"station_id": [1, 2], "station": ["Harbour", "Museum"]})
passengers = pd.DataFrame({"passenger_id": [1, 2, 3], "card": ["C-1", "C-2", "C-3"]})
taps = pd.DataFrame({
    "tap_id": [1, 2, 3, 4, 5],
    "passenger_id": [1, 1, 2, 3, 3],
    "station_id": [1, 2, 1, 2, 1],
    "kind": ["in", "out", "in", "in", "out"],
    "at_min": [100, 130, 200, 300, 340],
})`,
    hidden: [
      `stations = pd.DataFrame({"station_id": [1, 2], "station": ["Harbour", "Museum"]})
passengers = pd.DataFrame({"passenger_id": [1, 2, 3], "card": ["C-1", "C-2", "C-3"]})
taps = pd.DataFrame({"tap_id": [1, 2, 3, 4, 5], "passenger_id": [1, 1, 2, 3, 3], "station_id": [1, 2, 1, 2, 1], "kind": ["in", "out", "in", "in", "out"], "at_min": [100, 90, 200, 300, 340]})`,
      `stations = pd.DataFrame({"station_id": [1, 2], "station": ["Harbour", "Museum"]})
passengers = pd.DataFrame({"passenger_id": [1, 2, 3], "card": ["C-1", "C-2", "C-3"]})
taps = pd.DataFrame({"tap_id": [1, 2, 3, 4, 5], "passenger_id": [1, 1, 2, 2, 3], "station_id": [1, 2, 1, 2, 2], "kind": ["in", "out", "in", "out", "in"], "at_min": [100, 130, 200, 260, 300]})`,
    ],
    sig: 'def solve(stations: pd.DataFrame, passengers: pd.DataFrame, taps: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(stations, passengers, taps):
    ins = taps[taps["kind"] == "in"]
    outs = taps[taps["kind"] == "out"][["passenger_id", "at_min"]].rename(columns={"at_min": "out_min"})
    m = ins.merge(outs, on="passenger_id", how="left")
    m["later"] = (m["out_min"] > m["at_min"]).fillna(False)
    paired = m.groupby("tap_id", as_index=False)["later"].max()
    dead = ins.merge(paired, on="tap_id")
    dead = dead[~dead["later"]]
    out = dead.merge(passengers, on="passenger_id").merge(stations, on="station_id")
    return out[["card", "station", "at_min"]].reset_index(drop=True)`,
    wrong: [`def solve(stations, passengers, taps):
    ins = taps[taps["kind"] == "in"]
    out_ids = set(taps[taps["kind"] == "out"]["passenger_id"])
    dead = ins[~ins["passenger_id"].isin(out_ids)]
    out = dead.merge(passengers, on="passenger_id").merge(stations, on="station_id")
    return out[["card", "station", "at_min"]].reset_index(drop=True)`],
    hints: ['The tap out has to come after the tap in.', 'Compare the two minutes, not just the card.'],
    why: 'Pairing on the card and then requiring a later minute is what makes it a matching tap out.',
    mistakes: 'Any tap out by that card closes the journey, even one recorded earlier in the day.' },

  { t: 'Order Lines Still Outstanding', tags: ['groupby', 'left join', 'fillna'],
    story: 'A line can be shipped in several parcels, or not shipped at all.',
    task: 'Return customer, sku, ordered and shipped for the order lines that are not fully shipped.',
    setup: `orders = pd.DataFrame({"order_id": [1, 2], "customer": ["Asha", "Ben"]})
products = pd.DataFrame({"product_id": [10, 11], "sku": ["LAMP-01", "DESK-02"]})
order_lines = pd.DataFrame({"line_id": [100, 101, 102], "order_id": [1, 1, 2], "product_id": [10, 11, 10], "qty": [5, 2, 3]})
shipment_lines = pd.DataFrame({"order_line_id": [100, 101, 102], "qty": [5, 1, 3]})`,
    hidden: [
      `orders = pd.DataFrame({"order_id": [1, 2], "customer": ["Asha", "Ben"]})
products = pd.DataFrame({"product_id": [10, 11], "sku": ["LAMP-01", "DESK-02"]})
order_lines = pd.DataFrame({"line_id": [100, 101, 102], "order_id": [1, 1, 2], "product_id": [10, 11, 10], "qty": [5, 2, 3]})
shipment_lines = pd.DataFrame({"order_line_id": [100, 102], "qty": [5, 3]})`,
      `orders = pd.DataFrame({"order_id": [1, 2], "customer": ["Asha", "Ben"]})
products = pd.DataFrame({"product_id": [10, 11], "sku": ["LAMP-01", "DESK-02"]})
order_lines = pd.DataFrame({"line_id": [100, 101, 102], "order_id": [1, 1, 2], "product_id": [10, 11, 10], "qty": [5, 2, 3]})
shipment_lines = pd.DataFrame({"order_line_id": [100, 100, 101, 102], "qty": [2, 3, 2, 1]})`,
    ],
    sig: 'def solve(orders: pd.DataFrame, products: pd.DataFrame, order_lines: pd.DataFrame, shipment_lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(orders, products, order_lines, shipment_lines):
    sent = shipment_lines.groupby("order_line_id", as_index=False)["qty"].sum().rename(columns={"qty": "shipped"})
    l = order_lines.merge(sent, left_on="line_id", right_on="order_line_id", how="left")
    l["shipped"] = l["shipped"].fillna(0).astype(int)
    bad = l[l["shipped"] < l["qty"]]
    out = bad.merge(orders, on="order_id").merge(products, on="product_id")
    return out[["customer", "sku", "qty", "shipped"]].rename(columns={"qty": "ordered"}).reset_index(drop=True)`,
    wrong: [`def solve(orders, products, order_lines, shipment_lines):
    sent = shipment_lines.groupby("order_line_id", as_index=False)["qty"].sum().rename(columns={"qty": "shipped"})
    l = order_lines.merge(sent, left_on="line_id", right_on="order_line_id")
    bad = l[l["shipped"] < l["qty"]]
    out = bad.merge(orders, on="order_id").merge(products, on="product_id")
    return out[["customer", "sku", "qty", "shipped"]].rename(columns={"qty": "ordered"}).reset_index(drop=True)`],
    hints: ['A line nobody has shipped is the most outstanding of all.', 'A left merge keeps it with zero shipped.'],
    why: 'Giving every line a shipped figure judges them all.',
    mistakes: 'An inner merge drops the lines with no parcel at all.' },

  { t: 'Average Rate and Revenue per Room', tags: ['groupby', 'two denominators', 'merge'],
    story: 'The average daily rate is the money taken divided by the nights sold. Revenue per available room divides the same money by every room-night on sale.',
    task: 'Return hotel, adr and revpar, both rounded to 2 decimals. Room-nights on sale are the hotel\'s rooms times its nights open.',
    setup: `hotels = pd.DataFrame({"hotel_id": [1, 2], "hotel": ["Harbour Inn", "Hill Lodge"], "nights_open": [10, 10]})
rooms = pd.DataFrame({"room_id": [101, 102, 201], "hotel_id": [1, 1, 2]})
stays = pd.DataFrame({"stay_id": [1, 2, 3], "room_id": [101, 102, 201], "nights": [2, 3, 4], "paid": [8000, 9000, 20000]})`,
    hidden: [
      `hotels = pd.DataFrame({"hotel_id": [1, 2], "hotel": ["Harbour Inn", "Hill Lodge"], "nights_open": [10, 10]})
rooms = pd.DataFrame({"room_id": [101, 102, 201], "hotel_id": [1, 1, 2]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4], "room_id": [101, 102, 201, 201], "nights": [2, 3, 4, 1], "paid": [8000, 9000, 20000, 6000]})`,
      `hotels = pd.DataFrame({"hotel_id": [1, 2], "hotel": ["Harbour Inn", "Hill Lodge"], "nights_open": [10, 10]})
rooms = pd.DataFrame({"room_id": [101, 102, 103, 201], "hotel_id": [1, 1, 1, 2]})
stays = pd.DataFrame({"stay_id": [1, 2, 3], "room_id": [101, 102, 201], "nights": [2, 3, 4], "paid": [8000, 9000, 20000]})`,
    ],
    sig: 'def solve(hotels: pd.DataFrame, rooms: pd.DataFrame, stays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(hotels, rooms, stays):
    s = stays.merge(rooms, on="room_id")
    g = s.groupby("hotel_id", as_index=False).agg(paid=("paid", "sum"), nights=("nights", "sum"))
    n_rooms = rooms.groupby("hotel_id", as_index=False).size().rename(columns={"size": "rooms"})
    m = g.merge(n_rooms, on="hotel_id").merge(hotels, on="hotel_id")
    m["adr"] = (m["paid"] / m["nights"]).round(2)
    m["revpar"] = (m["paid"] / (m["rooms"] * m["nights_open"])).round(2)
    return m[["hotel", "adr", "revpar"]].reset_index(drop=True)`,
    wrong: [`def solve(hotels, rooms, stays):
    s = stays.merge(rooms, on="hotel_id" if "hotel_id" in stays.columns else "room_id")
    g = s.groupby("hotel_id", as_index=False).agg(paid=("paid", "sum"), nights=("nights", "sum"), rooms=("room_id", "size"))
    m = g.merge(hotels, on="hotel_id")
    m["adr"] = (m["paid"] / m["nights"]).round(2)
    m["revpar"] = (m["paid"] / (m["rooms"] * m["nights_open"])).round(2)
    return m[["hotel", "adr", "revpar"]].reset_index(drop=True)`],
    hints: ['The rooms on sale come from the rooms frame, not from the number of stays.', 'Count the rooms separately.'],
    why: 'Counting the hotel\'s rooms once gives the right denominator for revpar.',
    mistakes: 'Counting the joined rows counts stays, which matches only while every room was sold exactly once.' },

  { t: 'Delinquency Buckets on Loan Schedules', tags: ['buckets', 'dates', 'groupby'], o: true,
    story: 'Overdue is measured against 2024-07-01. A loan counts as overdue only while its scheduled amount is still unpaid.',
    task: 'Return label and overdue for every ageing bucket, ordered by label. Every bucket appears, with 0 when it holds nothing.',
    setup: `buckets = pd.DataFrame({"label": ["1-30", "31-60", "61+"], "min_days": [1, 31, 61], "max_days": [30, 60, 100000]})
loans = pd.DataFrame({"loan_id": [1, 2, 3, 4], "borrower": ["Asha", "Ben", "Chitra", "Dev"]})
schedules = pd.DataFrame({"loan_id": [1, 2, 3, 4], "due_day": ["2024-06-01", "2024-05-20", "2024-03-01", "2024-05-01"], "amount": [1000, 500, 3000, 2000]})
payments = pd.DataFrame({"loan_id": [], "amount": []})`,
    hidden: [
      `buckets = pd.DataFrame({"label": ["1-30", "31-60", "61+"], "min_days": [1, 31, 61], "max_days": [30, 60, 100000]})
loans = pd.DataFrame({"loan_id": [1, 2, 3, 4], "borrower": ["Asha", "Ben", "Chitra", "Dev"]})
schedules = pd.DataFrame({"loan_id": [1, 2, 3, 4], "due_day": ["2024-06-01", "2024-05-20", "2024-03-01", "2024-05-01"], "amount": [1000, 500, 3000, 2000]})
payments = pd.DataFrame({"loan_id": [3, 4], "amount": [3000, 2000]})`,
      `buckets = pd.DataFrame({"label": ["1-30", "31-60", "61+"], "min_days": [1, 31, 61], "max_days": [30, 60, 100000]})
loans = pd.DataFrame({"loan_id": [1, 2, 3, 4], "borrower": ["Asha", "Ben", "Chitra", "Dev"]})
schedules = pd.DataFrame({"loan_id": [1, 2, 3, 4], "due_day": ["2024-06-20", "2024-06-10", "2024-06-01", "2024-06-02"], "amount": [1000, 2000, 3000, 500]})
payments = pd.DataFrame({"loan_id": [], "amount": []})`,
    ],
    sig: 'def solve(buckets: pd.DataFrame, loans: pd.DataFrame, schedules: pd.DataFrame, payments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(buckets, loans, schedules, payments):
    paid = {}
    if len(payments):
        for lid, amt in payments.groupby("loan_id")["amount"].sum().items():
            paid[lid] = amt
    s = schedules.copy()
    s["paid"] = [paid.get(l, 0) for l in s["loan_id"]]
    s = s[s["paid"] < s["amount"]].copy()
    s["days"] = (pd.Timestamp("2024-07-01") - pd.to_datetime(s["due_day"])).dt.days
    rows = []
    for _, b in buckets.iterrows():
        inside = s[(s["days"] >= b["min_days"]) & (s["days"] <= b["max_days"])]
        rows.append((b["label"], int(inside["amount"].sum())))
    r = pd.DataFrame(rows, columns=["label", "overdue"])
    return r.sort_values("label").reset_index(drop=True)`,
    wrong: [`def solve(buckets, loans, schedules, payments):
    paid = {}
    if len(payments):
        for lid, amt in payments.groupby("loan_id")["amount"].sum().items():
            paid[lid] = amt
    s = schedules.copy()
    s["paid"] = [paid.get(l, 0) for l in s["loan_id"]]
    s = s[s["paid"] < s["amount"]].copy()
    s["days"] = (pd.Timestamp("2024-07-01") - pd.to_datetime(s["due_day"])).dt.days
    s["label"] = pd.cut(s["days"], [0, 30, 60, 10 ** 9], labels=["1-30", "31-60", "61+"])
    g = s.groupby("label", as_index=False, observed=True)["amount"].sum().rename(columns={"amount": "overdue"})
    return g.sort_values("label").reset_index(drop=True)`],
    hints: ['Start from the buckets so the empty ones survive.', 'Walk the bucket frame and total what falls inside each band.'],
    why: 'Driving the report from the buckets guarantees a row for each band.',
    mistakes: 'Grouping the schedules by a cut only reports the bands that happen to be occupied.' },

  { t: 'Moderation Items Past Their Target', tags: ['groupby', 'fillna', 'per-row threshold'],
    story: 'Each queue promises to decide within its own number of minutes. An item nobody has touched is measured against the clock at minute 400.',
    task: 'Return queue, item and minutes for the items that missed their queue\'s target.',
    setup: `queues = pd.DataFrame({"queue_id": [1, 2], "queue": ["Images", "Comments"], "target_min": [60, 60]})
items = pd.DataFrame({"item_id": [1, 2, 3, 4], "queue_id": [1, 1, 2, 2], "created_min": [0, 10, 0, 20]})
actions = pd.DataFrame({"item_id": [1, 3], "at_min": [30, 200], "decision": ["remove", "keep"]})`,
    hidden: [
      `queues = pd.DataFrame({"queue_id": [1, 2], "queue": ["Images", "Comments"], "target_min": [60, 300]})
items = pd.DataFrame({"item_id": [1, 2, 3, 4], "queue_id": [1, 1, 2, 2], "created_min": [0, 10, 0, 20]})
actions = pd.DataFrame({"item_id": [1, 3], "at_min": [30, 200], "decision": ["remove", "keep"]})`,
      `queues = pd.DataFrame({"queue_id": [1, 2], "queue": ["Images", "Comments"], "target_min": [60, 60]})
items = pd.DataFrame({"item_id": [1, 2, 3, 4], "queue_id": [1, 1, 2, 2], "created_min": [0, 10, 0, 20]})
actions = pd.DataFrame({"item_id": [1, 2, 3], "at_min": [30, 500, 200], "decision": ["remove", "keep", "keep"]})`,
    ],
    sig: 'def solve(queues: pd.DataFrame, items: pd.DataFrame, actions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(queues, items, actions):
    first = actions.groupby("item_id", as_index=False)["at_min"].min()
    m = items.merge(first, on="item_id", how="left")
    m["at_min"] = m["at_min"].fillna(400)
    m["minutes"] = (m["at_min"] - m["created_min"]).astype(int)
    m = m.merge(queues, on="queue_id")
    out = m[m["minutes"] > m["target_min"]]
    return out[["queue", "item_id", "minutes"]].rename(columns={"item_id": "item"}).reset_index(drop=True)`,
    wrong: [`def solve(queues, items, actions):
    first = actions.groupby("item_id", as_index=False)["at_min"].min()
    m = items.merge(first, on="item_id", how="left")
    m["at_min"] = m["at_min"].fillna(400)
    m["minutes"] = (m["at_min"] - m["created_min"]).astype(int)
    m = m.merge(queues, on="queue_id")
    out = m[m["minutes"] > 60]
    return out[["queue", "item_id", "minutes"]].rename(columns={"item_id": "item"}).reset_index(drop=True)`],
    hints: ['The target is a column on the queue.', 'Compare the minutes against that column.'],
    why: 'Reading the target from the queue keeps working when one queue is given more time.',
    mistakes: 'A hard-coded 60 judges a generous queue by a strict promise.' },

  { t: 'Unfair Matches by Skill Gap', tags: ['self merge', 'per-row threshold', 'abs'],
    story: 'Each mode sets the biggest skill gap it will tolerate inside a match.',
    task: 'Return mode, player_a, player_b and gap for the matches whose two players are further apart in skill than the mode allows.',
    setup: `matches = pd.DataFrame({"match_id": [1, 2], "mode": ["Ranked", "Casual"], "max_gap": [200, 200]})
players = pd.DataFrame({"player_id": [10, 11, 12, 13], "player": ["Asha", "Ben", "Chitra", "Dev"], "skill": [1500, 1550, 900, 1800]})
participants = pd.DataFrame({"match_id": [1, 1, 2, 2], "player_id": [10, 11, 12, 13]})`,
    hidden: [
      `matches = pd.DataFrame({"match_id": [1, 2], "mode": ["Ranked", "Casual"], "max_gap": [200, 1000]})
players = pd.DataFrame({"player_id": [10, 11, 12, 13], "player": ["Asha", "Ben", "Chitra", "Dev"], "skill": [1500, 1550, 900, 1800]})
participants = pd.DataFrame({"match_id": [1, 1, 2, 2], "player_id": [10, 11, 12, 13]})`,
      `matches = pd.DataFrame({"match_id": [1, 2], "mode": ["Ranked", "Casual"], "max_gap": [200, 200]})
players = pd.DataFrame({"player_id": [10, 11, 12, 13], "player": ["Asha", "Ben", "Chitra", "Dev"], "skill": [1500, 1550, 900, 1800]})
participants = pd.DataFrame({"match_id": [1, 1, 2, 2], "player_id": [10, 13, 12, 11]})`,
    ],
    sig: 'def solve(matches: pd.DataFrame, players: pd.DataFrame, participants: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(matches, players, participants):
    p = participants.merge(players, on="player_id")
    pair = p.merge(p, on="match_id", suffixes=("_a", "_b"))
    pair = pair[pair["player_id_b"] > pair["player_id_a"]].copy()
    pair["gap"] = (pair["skill_a"] - pair["skill_b"]).abs()
    m = pair.merge(matches, on="match_id")
    out = m[m["gap"] > m["max_gap"]]
    return out[["mode", "player_a", "player_b", "gap"]].reset_index(drop=True)`,
    wrong: [`def solve(matches, players, participants):
    p = participants.merge(players, on="player_id")
    pair = p.merge(p, on="match_id", suffixes=("_a", "_b"))
    pair = pair[pair["player_id_b"] > pair["player_id_a"]].copy()
    pair["gap"] = (pair["skill_a"] - pair["skill_b"]).abs()
    m = pair.merge(matches, on="match_id")
    out = m[m["gap"] > 200]
    return out[["mode", "player_a", "player_b", "gap"]].reset_index(drop=True)`],
    hints: ['The tolerance comes from the match.', 'Compare the gap against that column.'],
    why: 'Reading the limit from the match keeps a casual game from being judged by the ranked standard.',
    mistakes: 'A hard-coded 200 works only while both modes agree.' },

  { t: 'Sample Ratio Mismatch', tags: ['nunique', 'merge', 'share'],
    story: 'If a variant is assigned half the users but sees a different share of the exposures, the experiment cannot be trusted.',
    task: 'Return variant, assigned_share and exposed_share, both rounded to 2 decimals. A user exposed twice is one exposed user.',
    setup: `experiments = pd.DataFrame({"experiment_id": [1], "name": ["Checkout Redesign"]})
assignments = pd.DataFrame({"experiment_id": [1, 1, 1, 1], "user_id": [1, 2, 3, 4], "variant": ["control", "control", "treatment", "treatment"]})
exposures = pd.DataFrame({"experiment_id": [1, 1, 1, 1], "user_id": [1, 2, 3, 4], "day": ["2024-05-01", "2024-05-01", "2024-05-01", "2024-05-02"]})`,
    hidden: [
      `experiments = pd.DataFrame({"experiment_id": [1], "name": ["Checkout Redesign"]})
assignments = pd.DataFrame({"experiment_id": [1, 1, 1, 1], "user_id": [1, 2, 3, 4], "variant": ["control", "control", "treatment", "treatment"]})
exposures = pd.DataFrame({"experiment_id": [1, 1, 1, 1, 1], "user_id": [1, 1, 2, 3, 4], "day": ["2024-05-01", "2024-05-02", "2024-05-01", "2024-05-01", "2024-05-02"]})`,
      `experiments = pd.DataFrame({"experiment_id": [1], "name": ["Checkout Redesign"]})
assignments = pd.DataFrame({"experiment_id": [1, 1, 1, 1], "user_id": [1, 2, 3, 4], "variant": ["control", "control", "treatment", "treatment"]})
exposures = pd.DataFrame({"experiment_id": [1, 1, 1], "user_id": [1, 2, 3], "day": ["2024-05-01", "2024-05-01", "2024-05-01"]})`,
    ],
    sig: 'def solve(experiments: pd.DataFrame, assignments: pd.DataFrame, exposures: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(experiments, assignments, exposures):
    a = assignments[assignments["experiment_id"] == 1]
    an = a.groupby("variant", as_index=False).size().rename(columns={"size": "assigned"})
    x = exposures[exposures["experiment_id"] == 1].merge(a, on=["experiment_id", "user_id"])
    xn = x.groupby("variant", as_index=False)["user_id"].nunique().rename(columns={"user_id": "exposed"})
    g = an.merge(xn, on="variant")
    g["assigned_share"] = (g["assigned"] / g["assigned"].sum()).round(2)
    g["exposed_share"] = (g["exposed"] / g["exposed"].sum()).round(2)
    return g[["variant", "assigned_share", "exposed_share"]]`,
    wrong: [`def solve(experiments, assignments, exposures):
    a = assignments[assignments["experiment_id"] == 1]
    an = a.groupby("variant", as_index=False).size().rename(columns={"size": "assigned"})
    x = exposures[exposures["experiment_id"] == 1].merge(a, on=["experiment_id", "user_id"])
    xn = x.groupby("variant", as_index=False).size().rename(columns={"size": "exposed"})
    g = an.merge(xn, on="variant")
    g["assigned_share"] = (g["assigned"] / g["assigned"].sum()).round(2)
    g["exposed_share"] = (g["exposed"] / g["exposed"].sum()).round(2)
    return g[["variant", "assigned_share", "exposed_share"]]`],
    hints: ['The exposure share is about users, not exposure rows.', 'nunique on the user id.'],
    why: 'Counting users keeps a chatty user from tipping the balance, which is the point of the check.',
    mistakes: 'Counting rows reports a mismatch that is really just one busy user.' },

  { t: 'Picks per Hour Excluding Breaks', tags: ['groupby', 'merge', 'rate'],
    story: 'Breaks come off the paid shift, and a long shift can have more than one.',
    task: 'Return worker and units_per_hour, rounded to 2 decimals.',
    setup: `workers = pd.DataFrame({"worker_id": [1, 2], "worker": ["Asha", "Ben"]})
shifts = pd.DataFrame({"shift_id": [10, 11, 12], "worker_id": [1, 1, 2], "minutes": [480, 480, 480]})
breaks = pd.DataFrame({"shift_id": [10, 11, 12], "minutes": [60, 60, 60]})
picks = pd.DataFrame({"pick_id": [1, 2, 3], "shift_id": [10, 11, 12], "units": [100, 140, 210]})`,
    hidden: [
      `workers = pd.DataFrame({"worker_id": [1, 2], "worker": ["Asha", "Ben"]})
shifts = pd.DataFrame({"shift_id": [10, 11, 12], "worker_id": [1, 1, 2], "minutes": [480, 480, 480]})
breaks = pd.DataFrame({"shift_id": [10, 10, 11, 12], "minutes": [60, 30, 60, 60]})
picks = pd.DataFrame({"pick_id": [1, 2, 3], "shift_id": [10, 11, 12], "units": [100, 140, 210]})`,
      `workers = pd.DataFrame({"worker_id": [1, 2], "worker": ["Asha", "Ben"]})
shifts = pd.DataFrame({"shift_id": [10, 11, 12], "worker_id": [1, 1, 2], "minutes": [480, 480, 480]})
breaks = pd.DataFrame({"shift_id": [10, 11, 12], "minutes": [60, 60, 60]})
picks = pd.DataFrame({"pick_id": [1, 2, 3, 4], "shift_id": [10, 10, 11, 12], "units": [100, 50, 140, 210]})`,
    ],
    sig: 'def solve(workers: pd.DataFrame, shifts: pd.DataFrame, breaks: pd.DataFrame, picks: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(workers, shifts, breaks, picks):
    b = breaks.groupby("shift_id", as_index=False)["minutes"].sum().rename(columns={"minutes": "break_min"})
    p = picks.groupby("shift_id", as_index=False)["units"].sum()
    s = shifts.merge(b, on="shift_id", how="left").merge(p, on="shift_id", how="left")
    s["break_min"] = s["break_min"].fillna(0)
    s["units"] = s["units"].fillna(0)
    s["working"] = s["minutes"] - s["break_min"]
    g = s.groupby("worker_id", as_index=False).agg(units=("units", "sum"), working=("working", "sum"))
    g["units_per_hour"] = (g["units"] / (g["working"] / 60.0)).round(2)
    out = g.merge(workers, on="worker_id")
    return out[["worker", "units_per_hour"]].reset_index(drop=True)`,
    wrong: [`def solve(workers, shifts, breaks, picks):
    s = shifts.merge(breaks.rename(columns={"minutes": "break_min"}), on="shift_id").merge(picks, on="shift_id")
    s["working"] = s["minutes"] - s["break_min"]
    g = s.groupby("worker_id", as_index=False).agg(units=("units", "sum"), working=("working", "sum"))
    g["units_per_hour"] = (g["units"] / (g["working"] / 60.0)).round(2)
    out = g.merge(workers, on="worker_id")
    return out[["worker", "units_per_hour"]].reset_index(drop=True)`],
    hints: ['Picks and breaks are two separate totals per shift.', 'Aggregate each before touching the shift.'],
    why: 'Separate aggregations stop a second break or a second pick from multiplying the other side.',
    mistakes: 'Merging both frames repeats the shift and the working minutes are counted twice.' },

  { t: 'Invoices Still Unpaid After Three Attempts', tags: ['filtering', 'groupby', 'merge'],
    story: 'Billing retries a failed charge. After three failures a human steps in.',
    task: 'Return customer, invoice, amount and failures for the unpaid invoices with at least three failed attempts.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
invoices = pd.DataFrame({"invoice_id": [100, 101, 102], "customer_id": [1, 2, 3], "amount": [600, 900, 300], "paid": [0, 0, 1]})
attempts = pd.DataFrame({
    "invoice_id": [100, 100, 100, 101, 102, 102],
    "at_day": ["2024-05-01", "2024-05-03", "2024-05-05", "2024-05-02", "2024-05-01", "2024-05-04"],
    "result": ["failed", "failed", "failed", "failed", "failed", "succeeded"],
})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
invoices = pd.DataFrame({"invoice_id": [100, 101, 102], "customer_id": [1, 2, 3], "amount": [600, 900, 300], "paid": [0, 0, 1]})
attempts = pd.DataFrame({"invoice_id": [100, 100, 101, 101, 101, 102], "at_day": ["2024-05-01", "2024-05-03", "2024-05-02", "2024-05-04", "2024-05-06", "2024-05-01"], "result": ["failed"] * 6})`,
      `customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
invoices = pd.DataFrame({"invoice_id": [100, 101, 102], "customer_id": [1, 2, 3], "amount": [600, 900, 300], "paid": [1, 0, 0]})
attempts = pd.DataFrame({"invoice_id": [100, 100, 100, 101, 102, 102, 102], "at_day": ["2024-05-01", "2024-05-03", "2024-05-05", "2024-05-02", "2024-05-01", "2024-05-02", "2024-05-03"], "result": ["failed", "failed", "failed", "failed", "failed", "failed", "succeeded"]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, invoices: pd.DataFrame, attempts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, invoices, attempts):
    f = attempts[attempts["result"] == "failed"]
    g = f.groupby("invoice_id", as_index=False).size().rename(columns={"size": "failures"})
    m = invoices[invoices["paid"] == 0].merge(g, on="invoice_id")
    bad = m[m["failures"] >= 3]
    out = bad.merge(customers, on="customer_id")
    return out[["customer", "invoice_id", "amount", "failures"]].rename(columns={"invoice_id": "invoice"}).reset_index(drop=True)`,
    wrong: [`def solve(customers, invoices, attempts):
    g = attempts.groupby("invoice_id", as_index=False).size().rename(columns={"size": "failures"})
    m = invoices[invoices["paid"] == 0].merge(g, on="invoice_id")
    bad = m[m["failures"] >= 3]
    out = bad.merge(customers, on="customer_id")
    return out[["customer", "invoice_id", "amount", "failures"]].rename(columns={"invoice_id": "invoice"}).reset_index(drop=True)`],
    hints: ['Only failed attempts count towards the three.', 'Filter the result before counting.'],
    why: 'Counting failures rather than attempts keeps an invoice that finally went through off the escalation list.',
    mistakes: 'Counting every attempt escalates an invoice that succeeded on the third try.' },

  { t: 'Supplier Lead Time Reliability', tags: ['merge', 'dates', 'rate'],
    story: 'An order that has not arrived yet has no receipt row, and counts as not on time.',
    task: 'Return supplier and on_time: the share of its orders received by the promised day, rounded to 2 decimals.',
    setup: `suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Alpha", "Beta"]})
purchase_orders = pd.DataFrame({"po_id": [100, 101, 102, 103], "supplier_id": [1, 1, 2, 2], "promised_day": ["2024-05-10", "2024-05-20", "2024-05-15", "2024-05-25"]})
receipts = pd.DataFrame({"po_id": [100, 101, 102, 103], "received_day": ["2024-05-09", "2024-05-20", "2024-05-18", "2024-05-24"]})`,
    hidden: [
      `suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Alpha", "Beta"]})
purchase_orders = pd.DataFrame({"po_id": [100, 101, 102, 103], "supplier_id": [1, 1, 2, 2], "promised_day": ["2024-05-10", "2024-05-20", "2024-05-15", "2024-05-25"]})
receipts = pd.DataFrame({"po_id": [100, 101, 103], "received_day": ["2024-05-09", "2024-05-20", "2024-05-24"]})`,
      `suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Alpha", "Beta"]})
purchase_orders = pd.DataFrame({"po_id": [100, 101, 102, 103], "supplier_id": [1, 1, 2, 2], "promised_day": ["2024-05-10", "2024-05-20", "2024-05-15", "2024-05-25"]})
receipts = pd.DataFrame({"po_id": [100, 101, 102, 103], "received_day": ["2024-05-11", "2024-05-21", "2024-05-18", "2024-05-24"]})`,
    ],
    sig: 'def solve(suppliers: pd.DataFrame, purchase_orders: pd.DataFrame, receipts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(suppliers, purchase_orders, receipts):
    m = purchase_orders.merge(receipts, on="po_id", how="left")
    m["on_time"] = (m["received_day"].notna() & (m["received_day"] <= m["promised_day"])).astype(int)
    g = m.merge(suppliers, on="supplier_id").groupby("supplier", as_index=False).agg(
        ok=("on_time", "sum"), total=("on_time", "size")
    )
    g["on_time"] = (g["ok"] / g["total"]).round(2)
    return g[["supplier", "on_time"]]`,
    wrong: [`def solve(suppliers, purchase_orders, receipts):
    m = purchase_orders.merge(receipts, on="po_id")
    m["on_time"] = (m["received_day"] <= m["promised_day"]).astype(int)
    g = m.merge(suppliers, on="supplier_id").groupby("supplier", as_index=False).agg(
        ok=("on_time", "sum"), total=("on_time", "size")
    )
    g["on_time"] = (g["ok"] / g["total"]).round(2)
    return g[["supplier", "on_time"]]`],
    hints: ['The population is the orders, not the receipts.', 'A left merge keeps the orders that never arrived.'],
    why: 'Driving from the orders keeps the undelivered ones in the denominator, where they belong.',
    mistakes: 'An inner merge rewards a supplier for the orders it has not sent.' },

  { t: 'Creative Fatigue in the Second Half', tags: ['pivot', 'rate', 'merge'],
    story: 'A creative\'s run is split into two halves. Fatigue shows up as a click-through rate that falls in the second half.',
    task: 'Return creative, first_half and second_half (rates rounded to 2 decimals) for the creatives whose rate fell.',
    setup: `creatives = pd.DataFrame({"creative_id": [1, 2], "creative": ["Blue Banner", "Red Banner"]})
impressions = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 6, 7, 8], "creative_id": [1, 1, 1, 1, 2, 2, 2, 2], "half": [1, 1, 2, 2, 1, 1, 2, 2]})
clicks = pd.DataFrame({"impression_id": [1, 2, 3, 5, 7, 8]})`,
    hidden: [
      `creatives = pd.DataFrame({"creative_id": [1, 2], "creative": ["Blue Banner", "Red Banner"]})
impressions = pd.DataFrame({"impression_id": [1, 2, 3, 4, 9, 5, 6, 7, 8], "creative_id": [1, 1, 1, 1, 1, 2, 2, 2, 2], "half": [1, 1, 2, 2, 2, 1, 1, 2, 2]})
clicks = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 7, 8]})`,
      `creatives = pd.DataFrame({"creative_id": [1, 2], "creative": ["Blue Banner", "Red Banner"]})
impressions = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 6, 7, 8], "creative_id": [1, 1, 1, 1, 2, 2, 2, 2], "half": [1, 1, 2, 2, 1, 1, 2, 2]})
clicks = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 6, 7]})`,
    ],
    sig: 'def solve(creatives: pd.DataFrame, impressions: pd.DataFrame, clicks: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(creatives, impressions, clicks):
    i = impressions.copy()
    i["clicked"] = i["impression_id"].isin(clicks["impression_id"]).astype(int)
    g = i.groupby(["creative_id", "half"], as_index=False).agg(imps=("clicked", "size"), clicks=("clicked", "sum"))
    g["ctr"] = g["clicks"] / g["imps"]
    p = g.pivot(index="creative_id", columns="half", values="ctr").reset_index()
    p.columns = ["creative_id", "first_half", "second_half"]
    bad = p[p["second_half"] < p["first_half"]].copy()
    bad["first_half"] = bad["first_half"].round(2)
    bad["second_half"] = bad["second_half"].round(2)
    out = bad.merge(creatives, on="creative_id")
    return out[["creative", "first_half", "second_half"]].reset_index(drop=True)`,
    wrong: [`def solve(creatives, impressions, clicks):
    i = impressions.copy()
    i["clicked"] = i["impression_id"].isin(clicks["impression_id"]).astype(int)
    g = i.groupby(["creative_id", "half"], as_index=False).agg(imps=("clicked", "size"), clicks=("clicked", "sum"))
    g["ctr"] = g["clicks"] / g["imps"]
    p = g.pivot(index="creative_id", columns="half", values="clicks").reset_index()
    p.columns = ["creative_id", "c1", "c2"]
    r = g.pivot(index="creative_id", columns="half", values="ctr").reset_index()
    r.columns = ["creative_id", "first_half", "second_half"]
    m = p.merge(r, on="creative_id")
    bad = m[m["c2"] < m["c1"]].copy()
    bad["first_half"] = bad["first_half"].round(2)
    bad["second_half"] = bad["second_half"].round(2)
    out = bad.merge(creatives, on="creative_id")
    return out[["creative", "first_half", "second_half"]].reset_index(drop=True)`],
    hints: ['Compare rates, not click counts.', 'The halves can carry different numbers of impressions.'],
    why: 'Only the ratio is comparable when the halves are different sizes.',
    mistakes: 'Counting clicks agrees while both halves are the same size and diverges as soon as they are not.' },

  { t: 'Nurse Ratio Breaches', tags: ['merge', 'per-row threshold', 'ratio'],
    story: 'Each ward has a rule for how many patients one nurse can look after.',
    task: 'Return ward, day, patients, nurses and limit_per_nurse for the ward days that went over the rule.',
    setup: `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "General"], "max_patients_per_nurse": [2, 2]})
rosters = pd.DataFrame({"ward_id": [1, 1, 2, 2], "day": ["2024-06-01", "2024-06-02"] * 2, "nurses": [3, 2, 2, 2]})
census = pd.DataFrame({"ward_id": [1, 1, 2, 2], "day": ["2024-06-01", "2024-06-02"] * 2, "patients": [6, 5, 12, 11]})`,
    hidden: [
      `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "General"], "max_patients_per_nurse": [2, 6]})
rosters = pd.DataFrame({"ward_id": [1, 1, 2, 2], "day": ["2024-06-01", "2024-06-02"] * 2, "nurses": [3, 2, 2, 2]})
census = pd.DataFrame({"ward_id": [1, 1, 2, 2], "day": ["2024-06-01", "2024-06-02"] * 2, "patients": [6, 5, 12, 11]})`,
      `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "General"], "max_patients_per_nurse": [2, 2]})
rosters = pd.DataFrame({"ward_id": [1, 1, 2, 2], "day": ["2024-06-01", "2024-06-02"] * 2, "nurses": [3, 2, 2, 2]})
census = pd.DataFrame({"ward_id": [1, 1, 2, 2], "day": ["2024-06-01", "2024-06-02"] * 2, "patients": [6, 4, 12, 13]})`,
    ],
    sig: 'def solve(wards: pd.DataFrame, rosters: pd.DataFrame, census: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(wards, rosters, census):
    m = census.merge(rosters, on=["ward_id", "day"]).merge(wards, on="ward_id")
    out = m[m["patients"] > m["nurses"] * m["max_patients_per_nurse"]]
    return out[["ward", "day", "patients", "nurses", "max_patients_per_nurse"]].rename(
        columns={"max_patients_per_nurse": "limit_per_nurse"}
    ).reset_index(drop=True)`,
    wrong: [`def solve(wards, rosters, census):
    m = census.merge(rosters, on=["ward_id", "day"]).merge(wards, on="ward_id")
    out = m[m["patients"] > m["nurses"] * 2]
    return out[["ward", "day", "patients", "nurses", "max_patients_per_nurse"]].rename(
        columns={"max_patients_per_nurse": "limit_per_nurse"}
    ).reset_index(drop=True)`],
    hints: ['The allowed load is the nurses on duty times the ward\'s own figure.', 'Read the ratio from the ward row.'],
    why: 'The limit is a column, so a general ward is not judged by the intensive care rule.',
    mistakes: 'A hard-coded 2 flags wards that are staffed exactly as their rule requires.' },
];
