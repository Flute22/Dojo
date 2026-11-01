// Pandas, interview-grade set: Hard, batch 2.
export default [
  { t: 'Week-One Retention by Plan', tags: ['cohort', 'isin', 'merge'],
    story: 'Everyone in this report signed up in week 10. A session from a device of kind "bot" is traffic, not a person.',
    task: 'Return plan, signups, retained and rate (rounded to 2 decimals): how many users had a real session in week 11.',
    setup: `plans = pd.DataFrame({"plan_id": [1, 2], "plan": ["Free", "Pro"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4, 5], "plan_id": [1, 1, 1, 2, 2], "signup_week": [10] * 5})
devices = pd.DataFrame({"device_id": [100, 101, 102], "kind": ["phone", "laptop", "bot"]})
sessions = pd.DataFrame({"session_id": [1, 2, 3, 4, 5], "user_id": [1, 2, 3, 4, 5], "device_id": [100, 101, 100, 101, 100], "week": [11, 11, 13, 11, 12]})`,
    hidden: [
      `plans = pd.DataFrame({"plan_id": [1, 2], "plan": ["Free", "Pro"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4, 5], "plan_id": [1, 1, 1, 2, 2], "signup_week": [10] * 5})
devices = pd.DataFrame({"device_id": [100, 101, 102], "kind": ["phone", "laptop", "bot"]})
sessions = pd.DataFrame({"session_id": [1, 2, 3, 4, 5], "user_id": [1, 2, 3, 4, 5], "device_id": [100, 102, 100, 101, 102], "week": [11, 11, 13, 11, 11]})`,
      `plans = pd.DataFrame({"plan_id": [1, 2], "plan": ["Free", "Pro"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4, 5], "plan_id": [1, 1, 1, 2, 2], "signup_week": [10] * 5})
devices = pd.DataFrame({"device_id": [100, 101, 102], "kind": ["phone", "laptop", "bot"]})
sessions = pd.DataFrame({"session_id": [1, 2, 3, 4, 5], "user_id": [1, 2, 3, 4, 5], "device_id": [100, 100, 100, 101, 100], "week": [11, 11, 11, 11, 11]})`,
    ],
    sig: 'def solve(plans: pd.DataFrame, users: pd.DataFrame, devices: pd.DataFrame, sessions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(plans, users, devices, sessions):
    s = sessions.merge(devices, on="device_id")
    real = s[(s["week"] == 11) & (s["kind"] != "bot")]["user_id"]
    u = users.copy()
    u["retained"] = u["user_id"].isin(real).astype(int)
    g = u.merge(plans, on="plan_id").groupby("plan", as_index=False).agg(
        signups=("retained", "size"), retained=("retained", "sum")
    )
    g["rate"] = (g["retained"] / g["signups"]).round(2)
    return g`,
    wrong: [`def solve(plans, users, devices, sessions):
    real = sessions[sessions["week"] == 11]["user_id"]
    u = users.copy()
    u["retained"] = u["user_id"].isin(real).astype(int)
    g = u.merge(plans, on="plan_id").groupby("plan", as_index=False).agg(
        signups=("retained", "size"), retained=("retained", "sum")
    )
    g["rate"] = (g["retained"] / g["signups"]).round(2)
    return g`],
    hints: ['The users are the population, and a user is retained when a real session exists in week 11.', 'The device kind lives one merge away from the session.'],
    why: 'Joining the device onto the session lets the bot traffic be dropped before the retention is measured.',
    mistakes: 'Counting any session in week 11 lets a crawler retain a user who never came back.' },

  { t: 'Funnel Steps Reached in Order', tags: ['merge', 'ordering', 'funnel'],
    story: 'A session only counts as reaching a step if it passed every earlier step first, each one later than the one before.',
    task: 'Return step and sessions: how many sessions reached each funnel step.',
    setup: `steps = pd.DataFrame({"step_no": [1, 2, 3], "step": ["view", "cart", "checkout"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
sessions = pd.DataFrame({"session_id": [10, 11, 12], "user_id": [1, 2, 3]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6], "session_id": [10, 10, 10, 11, 11, 12], "step_no": [1, 2, 3, 1, 2, 1], "ts": [0, 10, 20, 0, 15, 0]})`,
    hidden: [
      `steps = pd.DataFrame({"step_no": [1, 2, 3], "step": ["view", "cart", "checkout"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
sessions = pd.DataFrame({"session_id": [10, 11, 12], "user_id": [1, 2, 3]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6], "session_id": [10, 10, 10, 11, 11, 12], "step_no": [1, 2, 3, 2, 1, 1], "ts": [0, 10, 20, 0, 15, 0]})`,
      `steps = pd.DataFrame({"step_no": [1, 2, 3], "step": ["view", "cart", "checkout"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
sessions = pd.DataFrame({"session_id": [10, 11, 12], "user_id": [1, 2, 3]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6], "session_id": [10, 10, 10, 11, 11, 11], "step_no": [1, 2, 3, 1, 2, 3], "ts": [0, 10, 20, 0, 5, 9]})`,
    ],
    sig: 'def solve(steps: pd.DataFrame, users: pd.DataFrame, sessions: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(steps, users, sessions, events):
    first = events.groupby(["session_id", "step_no"], as_index=False)["ts"].min()
    p = first.pivot(index="session_id", columns="step_no", values="ts")
    rows = []
    for n in steps["step_no"]:
        ok = pd.Series(True, index=p.index)
        for k in range(1, n + 1):
            ok &= p[k].notna() if k in p.columns else False
        for k in range(1, n):
            ok &= p[k] < p[k + 1]
        rows.append((int(n), int(ok.sum())))
    r = pd.DataFrame(rows, columns=["step_no", "sessions"])
    return r.merge(steps, on="step_no")[["step", "sessions"]]`,
    wrong: [`def solve(steps, users, sessions, events):
    g = events.groupby("step_no", as_index=False)["session_id"].nunique()
    g = g.rename(columns={"session_id": "sessions"})
    return g.merge(steps, on="step_no")[["step", "sessions"]]`],
    hints: ['A session reaches a step only when every earlier step has an earlier timestamp.', 'A pivot of the first time per step makes the comparison easy.'],
    why: 'Pivoting gives one row per session with a column per step, so the order can be checked with plain comparisons.',
    mistakes: 'Counting the sessions that logged a step credits the ones that jumped straight in.' },

  { t: 'Stock Ageing Buckets', tags: ['buckets', 'reindex', 'dates'], o: true,
    story: 'Stock is aged against 2024-07-01: a lot received on 2024-06-20 has been held 11 days.',
    task: 'Return label and qty for every ageing bucket, ordered by label. Every bucket appears, with 0 when it holds nothing.',
    setup: `buckets = pd.DataFrame({"label": ["0-30", "31-90", "91+"], "min_days": [0, 31, 91], "max_days": [30, 90, 100000]})
products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
lots = pd.DataFrame({
    "lot_id": [1, 2, 3, 4, 5],
    "product_id": [1, 1, 2, 2, 2],
    "received_day": ["2024-06-20", "2024-05-01", "2024-06-25", "2024-05-10", "2024-01-01"],
    "qty": [10, 5, 8, 4, 3],
})`,
    hidden: [
      `buckets = pd.DataFrame({"label": ["0-30", "31-90", "91+"], "min_days": [0, 31, 91], "max_days": [30, 90, 100000]})
products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
lots = pd.DataFrame({"lot_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "received_day": ["2024-06-20", "2024-05-01", "2024-06-25", "2024-05-10"], "qty": [10, 5, 8, 4]})`,
      `buckets = pd.DataFrame({"label": ["0-30", "31-90", "91+"], "min_days": [0, 31, 91], "max_days": [30, 90, 100000]})
products = pd.DataFrame({"product_id": [1, 2], "sku": ["LAMP-01", "DESK-02"]})
lots = pd.DataFrame({"lot_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "received_day": ["2024-06-20", "2024-06-21", "2024-06-25", "2024-06-26"], "qty": [10, 5, 8, 4]})`,
    ],
    sig: 'def solve(buckets: pd.DataFrame, products: pd.DataFrame, lots: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(buckets, products, lots):
    l = lots.copy()
    l["age"] = (pd.Timestamp("2024-07-01") - pd.to_datetime(l["received_day"])).dt.days
    out = []
    for _, b in buckets.iterrows():
        inside = l[(l["age"] >= b["min_days"]) & (l["age"] <= b["max_days"])]
        out.append((b["label"], int(inside["qty"].sum())))
    r = pd.DataFrame(out, columns=["label", "qty"])
    return r.sort_values("label").reset_index(drop=True)`,
    wrong: [`def solve(buckets, products, lots):
    l = lots.copy()
    l["age"] = (pd.Timestamp("2024-07-01") - pd.to_datetime(l["received_day"])).dt.days
    l["label"] = pd.cut(l["age"], [-1, 30, 90, 10 ** 9], labels=["0-30", "31-90", "91+"])
    g = l.groupby("label", as_index=False, observed=True)["qty"].sum()
    return g.sort_values("label").reset_index(drop=True)`],
    hints: ['The buckets are the spine of the report, so walk them.', 'An empty bucket still needs its row.'],
    why: 'Driving the report from the bucket frame guarantees one row per bucket whatever the data holds.',
    mistakes: 'Grouping the lots by a cut only reports the buckets that happen to be occupied.' },

  { t: 'Churned Revenue by Reason', tags: ['sorting', 'drop_duplicates', 'merge'],
    story: 'A customer can leave, come back and leave again. Only the most recent departure explains where their revenue went.',
    task: 'Return reason and mrr_lost: the monthly revenue lost through each reason.',
    setup: `reasons = pd.DataFrame({"reason_id": [1, 2, 3], "reason": ["Too expensive", "Missing feature", "Switched vendor"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
subscriptions = pd.DataFrame({"customer_id": [1, 2, 3], "mrr": [600, 1200, 300]})
cancellations = pd.DataFrame({"cancel_id": [1, 2, 3], "customer_id": [1, 2, 3], "reason_id": [1, 2, 1], "day": ["2024-03-01", "2024-03-05", "2024-03-09"]})`,
    hidden: [
      `reasons = pd.DataFrame({"reason_id": [1, 2, 3], "reason": ["Too expensive", "Missing feature", "Switched vendor"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
subscriptions = pd.DataFrame({"customer_id": [1, 2, 3], "mrr": [600, 1200, 300]})
cancellations = pd.DataFrame({"cancel_id": [1, 2, 3, 4], "customer_id": [1, 1, 2, 3], "reason_id": [1, 3, 2, 1], "day": ["2024-03-01", "2024-05-01", "2024-03-05", "2024-03-09"]})`,
      `reasons = pd.DataFrame({"reason_id": [1, 2, 3], "reason": ["Too expensive", "Missing feature", "Switched vendor"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
subscriptions = pd.DataFrame({"customer_id": [1, 2, 3], "mrr": [600, 1200, 300]})
cancellations = pd.DataFrame({"cancel_id": [1, 2, 3], "customer_id": [1, 2, 3], "reason_id": [2, 2, 3], "day": ["2024-03-01", "2024-03-05", "2024-03-09"]})`,
    ],
    sig: 'def solve(reasons: pd.DataFrame, customers: pd.DataFrame, subscriptions: pd.DataFrame, cancellations: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(reasons, customers, subscriptions, cancellations):
    c = cancellations.sort_values(["customer_id", "day", "cancel_id"])
    last = c.drop_duplicates("customer_id", keep="last")
    m = last.merge(subscriptions, on="customer_id").merge(reasons, on="reason_id")
    g = m.groupby("reason", as_index=False)["mrr"].sum().rename(columns={"mrr": "mrr_lost"})
    return g`,
    wrong: [`def solve(reasons, customers, subscriptions, cancellations):
    m = cancellations.merge(subscriptions, on="customer_id").merge(reasons, on="reason_id")
    g = m.groupby("reason", as_index=False)["mrr"].sum().rename(columns={"mrr": "mrr_lost"})
    return g`],
    hints: ['Reduce the cancellations to the latest one per customer first.', 'Sort by customer and day, then keep the last.'],
    why: 'Only one departure per customer can own their revenue, so the frame has to be reduced before anything is summed.',
    mistakes: 'A customer who left twice has their revenue counted under both reasons, so the total exceeds what actually left.' },

  { t: 'Driver Utilisation Across Shifts', tags: ['left join', 'fillna', 'rate'],
    story: 'A driver can be online for a whole shift without a single ride.',
    task: 'Return city, driver and utilisation: the share of online minutes spent on rides, rounded to 2 decimals.',
    setup: `cities = pd.DataFrame({"city_id": [1, 2], "city": ["Metro A", "Town B"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12], "city_id": [1, 1, 2], "driver": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [100, 101, 102, 103], "driver_id": [10, 10, 11, 12], "online_min": [300, 200, 400, 100]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4], "shift_id": [100, 101, 102, 103], "duration_min": [150, 50, 100, 80]})`,
    hidden: [
      `cities = pd.DataFrame({"city_id": [1, 2], "city": ["Metro A", "Town B"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12], "city_id": [1, 1, 2], "driver": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [100, 101, 102, 103], "driver_id": [10, 10, 11, 12], "online_min": [300, 200, 400, 100]})
rides = pd.DataFrame({"ride_id": [1, 2, 3], "shift_id": [100, 102, 103], "duration_min": [150, 100, 80]})`,
      `cities = pd.DataFrame({"city_id": [1, 2], "city": ["Metro A", "Town B"]})
drivers = pd.DataFrame({"driver_id": [10, 11, 12], "city_id": [1, 1, 2], "driver": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [100, 101, 102, 103], "driver_id": [10, 10, 11, 12], "online_min": [300, 200, 400, 100]})
rides = pd.DataFrame({"ride_id": [1, 2, 3, 4, 5], "shift_id": [100, 100, 101, 102, 103], "duration_min": [100, 50, 150, 40, 10]})`,
    ],
    sig: 'def solve(cities: pd.DataFrame, drivers: pd.DataFrame, shifts: pd.DataFrame, rides: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(cities, drivers, shifts, rides):
    busy = rides.groupby("shift_id", as_index=False)["duration_min"].sum()
    s = shifts.merge(busy, on="shift_id", how="left")
    s["duration_min"] = s["duration_min"].fillna(0)
    g = s.merge(drivers, on="driver_id").merge(cities, on="city_id").groupby(["city", "driver"], as_index=False).agg(
        busy=("duration_min", "sum"), online=("online_min", "sum")
    )
    g["utilisation"] = (g["busy"] / g["online"]).round(2)
    return g[["city", "driver", "utilisation"]]`,
    wrong: [`def solve(cities, drivers, shifts, rides):
    m = shifts.merge(rides, on="shift_id")
    g = m.merge(drivers, on="driver_id").merge(cities, on="city_id").groupby(["city", "driver"], as_index=False).agg(
        busy=("duration_min", "sum"), online=("online_min", "sum")
    )
    g["utilisation"] = (g["busy"] / g["online"]).round(2)
    return g[["city", "driver", "utilisation"]]`],
    hints: ['Total the rides per shift first.', 'An empty shift still contributes its online minutes.'],
    why: 'Aggregating the rides per shift keeps the online minutes counted once and keeps idle shifts in the denominator.',
    mistakes: 'Merging the rides directly repeats a shift once per ride and drops the shifts with none.' },

  { t: 'Velocity Rule Over a Sliding Window', tags: ['self merge', 'sliding window', 'groupby'],
    story: 'The rule is about any stretch of time as long as the window, not about clock hours.',
    task: 'Return holder and worst: the largest number of transactions inside a window of the rule\'s length, for the cards that broke the rule.',
    setup: `merchants = pd.DataFrame({"merchant_id": [1, 2], "merchant": ["Corner Shop", "Big Store"]})
cards = pd.DataFrame({"card_id": [500, 501], "holder": ["Asha", "Ben"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5], "card_id": [500, 500, 500, 501, 501], "merchant_id": [1, 1, 2, 1, 2], "at_min": [10, 20, 30, 100, 400]})
rules = pd.DataFrame({"rule_id": [1], "window_min": [60], "max_txns": [2]})`,
    hidden: [
      `merchants = pd.DataFrame({"merchant_id": [1, 2], "merchant": ["Corner Shop", "Big Store"]})
cards = pd.DataFrame({"card_id": [500, 501], "holder": ["Asha", "Ben"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5], "card_id": [500, 500, 500, 501, 501], "merchant_id": [1, 1, 2, 1, 2], "at_min": [50, 70, 90, 100, 400]})
rules = pd.DataFrame({"rule_id": [1], "window_min": [60], "max_txns": [2]})`,
      `merchants = pd.DataFrame({"merchant_id": [1, 2], "merchant": ["Corner Shop", "Big Store"]})
cards = pd.DataFrame({"card_id": [500, 501], "holder": ["Asha", "Ben"]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5], "card_id": [500, 500, 501, 501, 501], "merchant_id": [1, 1, 2, 1, 2], "at_min": [10, 20, 30, 40, 50]})
rules = pd.DataFrame({"rule_id": [1], "window_min": [60], "max_txns": [2]})`,
    ],
    sig: 'def solve(merchants: pd.DataFrame, cards: pd.DataFrame, txns: pd.DataFrame, rules: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(merchants, cards, txns, rules):
    w = int(rules["window_min"].iloc[0])
    cap = int(rules["max_txns"].iloc[0])
    m = txns.merge(txns, on="card_id", suffixes=("_a", "_b"))
    m = m[(m["at_min_b"] >= m["at_min_a"]) & (m["at_min_b"] < m["at_min_a"] + w)]
    counts = m.groupby(["card_id", "txn_id_a"], as_index=False).size()
    worst = counts.groupby("card_id", as_index=False)["size"].max().rename(columns={"size": "worst"})
    bad = worst[worst["worst"] > cap]
    out = bad.merge(cards, on="card_id")
    return out[["holder", "worst"]].reset_index(drop=True)`,
    wrong: [`def solve(merchants, cards, txns, rules):
    w = int(rules["window_min"].iloc[0])
    cap = int(rules["max_txns"].iloc[0])
    t = txns.copy()
    t["bucket"] = t["at_min"] // w
    counts = t.groupby(["card_id", "bucket"], as_index=False).size()
    worst = counts.groupby("card_id", as_index=False)["size"].max().rename(columns={"size": "worst"})
    bad = worst[worst["worst"] > cap]
    out = bad.merge(cards, on="card_id")
    return out[["holder", "worst"]].reset_index(drop=True)`],
    hints: ['Anchor a window at every transaction of the card and count what falls inside it.', 'A self merge on the card with a time range does exactly that.'],
    why: 'Anchoring on each transaction is a sliding window, which is what the rule describes.',
    mistakes: 'Fixed clock buckets miss a burst that straddles a boundary, which is how a fraudster slips through.' },

  { t: 'Doctors Over Their Panel Cap', tags: ['filtering', 'merge', 'groupby'],
    story: 'A patient who has moved away still has a record but is no longer on the panel.',
    task: 'Return specialty, doctor, panel and panel_cap for the doctors whose active panel is larger than their specialty allows.',
    setup: `specialties = pd.DataFrame({"specialty_id": [1, 2], "specialty": ["General", "Cardiology"], "panel_cap": [3, 2]})
doctors = pd.DataFrame({"doctor_id": [10, 11, 12], "specialty_id": [1, 1, 2], "doctor": ["Rao", "Iyer", "Nair"]})
patients = pd.DataFrame({"patient_id": [1, 2, 3, 4, 5, 6, 7, 8], "doctor_id": [10, 10, 10, 10, 11, 12, 12, 12], "status": ["active"] * 8})`,
    hidden: [
      `specialties = pd.DataFrame({"specialty_id": [1, 2], "specialty": ["General", "Cardiology"], "panel_cap": [3, 2]})
doctors = pd.DataFrame({"doctor_id": [10, 11, 12], "specialty_id": [1, 1, 2], "doctor": ["Rao", "Iyer", "Nair"]})
patients = pd.DataFrame({"patient_id": [1, 2, 3, 4, 5, 6, 7, 8], "doctor_id": [10, 10, 10, 10, 11, 12, 12, 12], "status": ["active", "active", "moved away", "active", "active", "active", "moved away", "active"]})`,
      `specialties = pd.DataFrame({"specialty_id": [1, 2], "specialty": ["General", "Cardiology"], "panel_cap": [3, 2]})
doctors = pd.DataFrame({"doctor_id": [10, 11, 12], "specialty_id": [1, 1, 2], "doctor": ["Rao", "Iyer", "Nair"]})
patients = pd.DataFrame({"patient_id": [1, 2, 3, 4, 5, 6, 7, 8], "doctor_id": [11, 11, 11, 11, 10, 12, 12, 12], "status": ["active"] * 8})`,
    ],
    sig: 'def solve(specialties: pd.DataFrame, doctors: pd.DataFrame, patients: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(specialties, doctors, patients):
    active = patients[patients["status"] == "active"]
    g = active.groupby("doctor_id", as_index=False).size().rename(columns={"size": "panel"})
    m = g.merge(doctors, on="doctor_id").merge(specialties, on="specialty_id")
    out = m[m["panel"] > m["panel_cap"]]
    return out[["specialty", "doctor", "panel", "panel_cap"]].reset_index(drop=True)`,
    wrong: [`def solve(specialties, doctors, patients):
    g = patients.groupby("doctor_id", as_index=False).size().rename(columns={"size": "panel"})
    m = g.merge(doctors, on="doctor_id").merge(specialties, on="specialty_id")
    out = m[m["panel"] > m["panel_cap"]]
    return out[["specialty", "doctor", "panel", "panel_cap"]].reset_index(drop=True)`],
    hints: ['Only active patients sit on the panel.', 'The cap arrives through the doctor\'s specialty.'],
    why: 'Filtering the status before counting makes the figure the real panel size.',
    mistakes: 'Counting every record keeps patients who have left on the list.' },

  { t: 'Refund and Chargeback Exposure', tags: ['groupby', 'merge', 'double counting'],
    story: 'An order can be refunded in parts and charged back as well.',
    task: 'Return merchant, revenue, exposure and share (rounded to 2 decimals) for the merchants whose exposure share is above 0.1.',
    setup: `merchants = pd.DataFrame({"merchant_id": [1, 2, 3], "merchant": ["Corner Shop", "Big Store", "Kiosk"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "merchant_id": [1, 1, 2, 2, 3, 3], "amount": [1000, 1000, 2000, 2000, 500, 500]})
refunds = pd.DataFrame({"order_id": [1, 3], "amount": [300, 100]})
chargebacks = pd.DataFrame({"order_id": [5], "amount": [200]})`,
    hidden: [
      `merchants = pd.DataFrame({"merchant_id": [1, 2, 3], "merchant": ["Corner Shop", "Big Store", "Kiosk"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "merchant_id": [1, 1, 2, 2, 3, 3], "amount": [1000, 1000, 2000, 2000, 500, 500]})
refunds = pd.DataFrame({"order_id": [1, 3, 5], "amount": [300, 100, 50]})
chargebacks = pd.DataFrame({"order_id": [5], "amount": [200]})`,
      `merchants = pd.DataFrame({"merchant_id": [1, 2, 3], "merchant": ["Corner Shop", "Big Store", "Kiosk"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "merchant_id": [1, 1, 2, 2, 3, 3], "amount": [1000, 1000, 2000, 2000, 500, 500]})
refunds = pd.DataFrame({"order_id": [1, 1, 3], "amount": [150, 150, 100]})
chargebacks = pd.DataFrame({"order_id": [5], "amount": [200]})`,
    ],
    sig: 'def solve(merchants: pd.DataFrame, orders: pd.DataFrame, refunds: pd.DataFrame, chargebacks: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(merchants, orders, refunds, chargebacks):
    rev = orders.groupby("merchant_id", as_index=False)["amount"].sum().rename(columns={"amount": "revenue"})
    r = refunds.merge(orders[["order_id", "merchant_id"]], on="order_id").groupby("merchant_id", as_index=False)["amount"].sum()
    c = chargebacks.merge(orders[["order_id", "merchant_id"]], on="order_id").groupby("merchant_id", as_index=False)["amount"].sum()
    g = rev.merge(r, on="merchant_id", how="left", suffixes=("", "_r")).merge(c, on="merchant_id", how="left", suffixes=("", "_c"))
    g["exposure"] = g["amount"].fillna(0) + g["amount_c"].fillna(0)
    g = g.merge(merchants, on="merchant_id")
    g["share"] = (g["exposure"] / g["revenue"]).round(2)
    out = g[g["exposure"] / g["revenue"] > 0.1].copy()
    out["exposure"] = out["exposure"].astype(int)
    return out[["merchant", "revenue", "exposure", "share"]].reset_index(drop=True)`,
    wrong: [`def solve(merchants, orders, refunds, chargebacks):
    m = orders.merge(refunds, on="order_id", how="left", suffixes=("", "_r")).merge(chargebacks, on="order_id", how="left", suffixes=("", "_c"))
    m["exposure"] = m["amount_r"].fillna(0) + m["amount_c"].fillna(0)
    g = m.groupby("merchant_id", as_index=False).agg(revenue=("amount", "sum"), exposure=("exposure", "sum"))
    g = g.merge(merchants, on="merchant_id")
    g["share"] = (g["exposure"] / g["revenue"]).round(2)
    out = g[g["exposure"] / g["revenue"] > 0.1].copy()
    out["exposure"] = out["exposure"].astype(int)
    return out[["merchant", "revenue", "exposure", "share"]].reset_index(drop=True)`],
    hints: ['Revenue, refunds and chargebacks are three different sets of rows.', 'Aggregate each one on its own before putting them together.'],
    why: 'Separate aggregations keep each figure over its own rows, whatever repeats elsewhere.',
    mistakes: 'Merging two optional frames onto the orders repeats an order once per refund and inflates the revenue too.' },

  { t: 'Top Two Products per Category, Net of Returns', tags: ['rank', 'left join', 'ties'],
    story: 'Money that came back reduces what a product really brought in.',
    task: 'Return category, product and net for the products whose net revenue is among the two highest net figures in their category, ties included.',
    setup: `categories = pd.DataFrame({"category_id": [1, 2], "category": ["Lighting", "Seating"]})
products = pd.DataFrame({"product_id": [10, 11, 12, 13, 14, 15], "category_id": [1, 1, 1, 2, 2, 2], "product": ["Lamp", "Bulb", "Shade", "Chair", "Stool", "Bench"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6], "product_id": [10, 11, 12, 13, 14, 15], "amount": [900, 600, 300, 800, 500, 200]})
returns = pd.DataFrame({"sale_id": [], "amount": []})`,
    hidden: [
      `categories = pd.DataFrame({"category_id": [1, 2], "category": ["Lighting", "Seating"]})
products = pd.DataFrame({"product_id": [10, 11, 12, 13, 14, 15], "category_id": [1, 1, 1, 2, 2, 2], "product": ["Lamp", "Bulb", "Shade", "Chair", "Stool", "Bench"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6], "product_id": [10, 11, 12, 13, 14, 15], "amount": [900, 600, 300, 800, 500, 200]})
returns = pd.DataFrame({"sale_id": [1, 4], "amount": [700, 700]})`,
      `categories = pd.DataFrame({"category_id": [1, 2], "category": ["Lighting", "Seating"]})
products = pd.DataFrame({"product_id": [10, 11, 12, 13, 14, 15], "category_id": [1, 1, 1, 2, 2, 2], "product": ["Lamp", "Bulb", "Shade", "Chair", "Stool", "Bench"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6], "product_id": [10, 11, 12, 13, 14, 15], "amount": [900, 900, 300, 800, 800, 200]})
returns = pd.DataFrame({"sale_id": [], "amount": []})`,
    ],
    sig: 'def solve(categories: pd.DataFrame, products: pd.DataFrame, sales: pd.DataFrame, returns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(categories, products, sales, returns):
    r = returns.rename(columns={"amount": "returned"})
    s = sales.merge(r, on="sale_id", how="left")
    s["returned"] = s["returned"].fillna(0)
    s["net"] = s["amount"] - s["returned"]
    g = s.merge(products, on="product_id").groupby(["category_id", "product"], as_index=False)["net"].sum()
    g["rk"] = g.groupby("category_id")["net"].rank(method="dense", ascending=False)
    top = g[g["rk"] <= 2].merge(categories, on="category_id")
    top["net"] = top["net"].astype(int)
    return top[["category", "product", "net"]].reset_index(drop=True)`,
    wrong: [`def solve(categories, products, sales, returns):
    g = sales.merge(products, on="product_id").groupby(["category_id", "product"], as_index=False)["amount"].sum()
    g = g.rename(columns={"amount": "net"})
    g["rk"] = g.groupby("category_id")["net"].rank(method="dense", ascending=False)
    top = g[g["rk"] <= 2].merge(categories, on="category_id")
    top["net"] = top["net"].astype(int)
    return top[["category", "product", "net"]].reset_index(drop=True)`],
    hints: ['Subtract the returns before ranking anything.', 'A dense rank keeps products that tie on net.'],
    why: 'A big return can push a product out of the top two, so the ranking has to run on the net figure.',
    mistakes: 'Ranking the gross sales reports a product whose money mostly came back.' },

  { t: 'Students at Risk in a Term', tags: ['groupby', 'merge', 'two conditions'],
    story: 'A student is at risk in a term when they attended less than 80% of sessions in it and also averaged under 50 in its assessments.',
    task: 'Return student, term, attendance and avg_score (both rounded to 2 decimals) for the students at risk.',
    setup: `terms = pd.DataFrame({"term_id": [1], "term": ["Autumn"]})
students = pd.DataFrame({"student_id": [1, 2, 3], "student": ["Asha", "Ben", "Chitra"]})
attendance = pd.DataFrame({"student_id": [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], "term_id": [1] * 12, "present": [1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]})
assessments = pd.DataFrame({"student_id": [1, 1, 2, 2, 3, 3], "term_id": [1] * 6, "score": [40, 50, 70, 80, 30, 40]})`,
    hidden: [
      `terms = pd.DataFrame({"term_id": [1, 2], "term": ["Autumn", "Spring"]})
students = pd.DataFrame({"student_id": [1, 2, 3], "student": ["Asha", "Ben", "Chitra"]})
attendance = pd.DataFrame({"student_id": [1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3], "term_id": [1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1], "present": [1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]})
assessments = pd.DataFrame({"student_id": [1, 1, 1, 1, 3, 3], "term_id": [1, 1, 2, 2, 1, 1], "score": [40, 50, 90, 90, 30, 40]})`,
      `terms = pd.DataFrame({"term_id": [1], "term": ["Autumn"]})
students = pd.DataFrame({"student_id": [1, 2, 3], "student": ["Asha", "Ben", "Chitra"]})
attendance = pd.DataFrame({"student_id": [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], "term_id": [1] * 12, "present": [1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0]})
assessments = pd.DataFrame({"student_id": [1, 1, 2, 2, 3, 3], "term_id": [1] * 6, "score": [60, 70, 70, 80, 30, 40]})`,
    ],
    sig: 'def solve(terms: pd.DataFrame, students: pd.DataFrame, attendance: pd.DataFrame, assessments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(terms, students, attendance, assessments):
    a = attendance.groupby(["student_id", "term_id"], as_index=False)["present"].mean().rename(columns={"present": "attendance"})
    s = assessments.groupby(["student_id", "term_id"], as_index=False)["score"].mean().rename(columns={"score": "avg_score"})
    m = a.merge(s, on=["student_id", "term_id"])
    bad = m[(m["attendance"] < 0.8) & (m["avg_score"] < 50)].copy()
    out = bad.merge(students, on="student_id").merge(terms, on="term_id")
    out["attendance"] = out["attendance"].round(2)
    out["avg_score"] = out["avg_score"].round(2)
    return out[["student", "term", "attendance", "avg_score"]].reset_index(drop=True)`,
    wrong: [`def solve(terms, students, attendance, assessments):
    a = attendance.groupby("student_id", as_index=False)["present"].mean().rename(columns={"present": "attendance"})
    s = assessments.groupby(["student_id", "term_id"], as_index=False)["score"].mean().rename(columns={"score": "avg_score"})
    m = a.merge(s, on="student_id")
    bad = m[(m["attendance"] < 0.8) & (m["avg_score"] < 50)].copy()
    out = bad.merge(students, on="student_id").merge(terms, on="term_id")
    out["attendance"] = out["attendance"].round(2)
    out["avg_score"] = out["avg_score"].round(2)
    return out[["student", "term", "attendance", "avg_score"]].reset_index(drop=True)`],
    hints: ['Both figures are per student and term.', 'Group both frames by the pair of keys.'],
    why: 'Keeping the term in both groupings makes the two conditions apply to the same term.',
    mistakes: 'Attendance per student is right while there is a single term, and wrong as soon as a student has a good term and a bad one.' },

  { t: 'Gaps Between Shifts at a Site', tags: ['shift', 'clip', 'groupby'],
    story: 'Shifts at a site can follow each other with a gap, or overlap when two people are on at once.',
    task: 'Return site and uncovered: the total minutes with nobody on duty between the first and last shift of the site.',
    setup: `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"]})
staff = pd.DataFrame({"staff_id": [10, 11, 12], "staff": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "site_id": [1, 1, 2, 2], "staff_id": [10, 11, 12, 10], "start_min": [0, 360, 0, 300], "end_min": [300, 600, 240, 480]})`,
    hidden: [
      `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"]})
staff = pd.DataFrame({"staff_id": [10, 11, 12], "staff": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "site_id": [1, 1, 2, 2], "staff_id": [10, 11, 12, 10], "start_min": [0, 200, 0, 300], "end_min": [300, 600, 240, 480]})`,
      `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"]})
staff = pd.DataFrame({"staff_id": [10, 11, 12], "staff": ["Asha", "Ben", "Chitra"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "site_id": [1, 1, 1, 2], "staff_id": [10, 11, 10, 12], "start_min": [0, 360, 700, 0], "end_min": [300, 600, 900, 240]})`,
    ],
    sig: 'def solve(sites: pd.DataFrame, staff: pd.DataFrame, shifts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sites, staff, shifts):
    s = shifts.sort_values(["site_id", "start_min", "end_min"]).copy()
    s["prev_end"] = s.groupby("site_id")["end_min"].shift()
    s["gap"] = (s["start_min"] - s["prev_end"]).clip(lower=0)
    g = s.groupby("site_id", as_index=False)["gap"].sum()
    g["uncovered"] = g["gap"].fillna(0).astype(int)
    out = g.merge(sites, on="site_id")
    return out[["site", "uncovered"]].reset_index(drop=True)`,
    wrong: [`def solve(sites, staff, shifts):
    s = shifts.sort_values(["site_id", "start_min", "end_min"]).copy()
    s["prev_end"] = s.groupby("site_id")["end_min"].shift()
    s["gap"] = s["start_min"] - s["prev_end"]
    g = s.groupby("site_id", as_index=False)["gap"].sum()
    g["uncovered"] = g["gap"].fillna(0).astype(int)
    out = g.merge(sites, on="site_id")
    return out[["site", "uncovered"]].reset_index(drop=True)`],
    hints: ['A gap is the start of a shift minus the end of the one before, but never below zero.', 'clip(lower=0) does that.'],
    why: 'Clamping at zero stops an overlap from cancelling out a real gap elsewhere in the day.',
    mistakes: 'A negative gap quietly subtracts cover that never existed.' },

  { t: 'Peak Demand Charge by Month', tags: ['groupby', 'max', 'merge'],
    story: 'The demand charge is based on the single highest half-hour reading of the month at that site, whichever meter produced it.',
    task: 'Return site, month, peak and charge (the peak times the tariff charge).',
    setup: `tariffs = pd.DataFrame({"tariff_id": [1], "tariff": ["Industrial"], "demand_charge": [50]})
sites = pd.DataFrame({"site_id": [1, 2], "tariff_id": [1, 1], "site": ["Mill Road", "Dock Yard"]})
meters = pd.DataFrame({"meter_id": [10, 11, 12], "site_id": [1, 1, 2]})
readings = pd.DataFrame({"meter_id": [10, 10, 11, 12], "month": ["2024-01"] * 4, "kwh": [30, 50, 20, 70]})`,
    hidden: [
      `tariffs = pd.DataFrame({"tariff_id": [1], "tariff": ["Industrial"], "demand_charge": [50]})
sites = pd.DataFrame({"site_id": [1, 2], "tariff_id": [1, 1], "site": ["Mill Road", "Dock Yard"]})
meters = pd.DataFrame({"meter_id": [10, 11, 12], "site_id": [1, 1, 2]})
readings = pd.DataFrame({"meter_id": [10, 10, 11, 12, 10, 12], "month": ["2024-01", "2024-01", "2024-01", "2024-01", "2024-02", "2024-02"], "kwh": [30, 50, 20, 70, 90, 10]})`,
      `tariffs = pd.DataFrame({"tariff_id": [1], "tariff": ["Industrial"], "demand_charge": [50]})
sites = pd.DataFrame({"site_id": [1, 2], "tariff_id": [1, 1], "site": ["Mill Road", "Dock Yard"]})
meters = pd.DataFrame({"meter_id": [10, 11, 12], "site_id": [1, 1, 2]})
readings = pd.DataFrame({"meter_id": [10, 10, 11, 12], "month": ["2024-01"] * 4, "kwh": [80, 50, 20, 70]})`,
    ],
    sig: 'def solve(tariffs: pd.DataFrame, sites: pd.DataFrame, meters: pd.DataFrame, readings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(tariffs, sites, meters, readings):
    m = readings.merge(meters, on="meter_id").merge(sites, on="site_id").merge(tariffs, on="tariff_id")
    g = m.groupby(["site", "month"], as_index=False).agg(peak=("kwh", "max"), charge_rate=("demand_charge", "first"))
    g["charge"] = g["peak"] * g["charge_rate"]
    return g[["site", "month", "peak", "charge"]]`,
    wrong: [`def solve(tariffs, sites, meters, readings):
    m = readings.merge(meters, on="meter_id").merge(sites, on="site_id").merge(tariffs, on="tariff_id")
    m["peak"] = m.groupby("site")["kwh"].transform("max")
    g = m.groupby(["site", "month"], as_index=False).agg(peak=("peak", "max"), charge_rate=("demand_charge", "first"))
    g["charge"] = g["peak"] * g["charge_rate"]
    return g[["site", "month", "peak", "charge"]]`],
    hints: ['The peak is per site and month together.', 'Group by both keys.'],
    why: 'Grouping by site and month takes the maximum inside each month.',
    mistakes: 'A peak over the whole period charges every month at the worst month\'s level.' },

  { t: 'Invoices Converted at the Right Rate', tags: ['merge_asof', 'sorting', 'merge'],
    story: 'A rate is filed on a day and holds until the next one. An invoice is converted at the rate in force on its own date.',
    task: 'Return customer, local_total and usd_total (rounded to 2 decimals) for every invoice.',
    setup: `currencies = pd.DataFrame({"code": ["EUR", "INR"], "currency": ["Euro", "Rupee"]})
rates = pd.DataFrame({"code": ["EUR", "INR"], "day": ["2024-01-01", "2024-01-01"], "to_usd": [1.1, 0.012]})
invoices = pd.DataFrame({"invoice_id": [1, 2], "code": ["EUR", "INR"], "day": ["2024-02-10", "2024-02-20"], "customer": ["Asha", "Ben"]})
invoice_lines = pd.DataFrame({"invoice_id": [1, 1, 2], "amount": [100, 200, 10000]})`,
    hidden: [
      `currencies = pd.DataFrame({"code": ["EUR", "INR"], "currency": ["Euro", "Rupee"]})
rates = pd.DataFrame({"code": ["EUR", "EUR", "INR"], "day": ["2024-01-01", "2024-02-01", "2024-01-01"], "to_usd": [1.1, 1.5, 0.012]})
invoices = pd.DataFrame({"invoice_id": [1, 2], "code": ["EUR", "INR"], "day": ["2024-02-10", "2024-02-20"], "customer": ["Asha", "Ben"]})
invoice_lines = pd.DataFrame({"invoice_id": [1, 1, 2], "amount": [100, 200, 10000]})`,
      `currencies = pd.DataFrame({"code": ["EUR", "INR"], "currency": ["Euro", "Rupee"]})
rates = pd.DataFrame({"code": ["EUR", "EUR", "INR", "INR"], "day": ["2024-01-01", "2024-03-01", "2024-01-01", "2024-02-15"], "to_usd": [1.1, 2.0, 0.012, 0.02]})
invoices = pd.DataFrame({"invoice_id": [1, 2], "code": ["EUR", "INR"], "day": ["2024-02-10", "2024-02-20"], "customer": ["Asha", "Ben"]})
invoice_lines = pd.DataFrame({"invoice_id": [1, 1, 2], "amount": [100, 200, 10000]})`,
    ],
    sig: 'def solve(currencies: pd.DataFrame, rates: pd.DataFrame, invoices: pd.DataFrame, invoice_lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(currencies, rates, invoices, invoice_lines):
    net = invoice_lines.groupby("invoice_id", as_index=False)["amount"].sum().rename(columns={"amount": "local_total"})
    inv = invoices.merge(net, on="invoice_id")
    inv["d"] = pd.to_datetime(inv["day"])
    r = rates.copy()
    r["d"] = pd.to_datetime(r["day"])
    m = pd.merge_asof(inv.sort_values("d"), r.sort_values("d")[["code", "d", "to_usd"]],
                      on="d", by="code", direction="backward")
    m["usd_total"] = (m["local_total"] * m["to_usd"]).round(2)
    return m[["customer", "local_total", "usd_total"]].reset_index(drop=True)`,
    wrong: [`def solve(currencies, rates, invoices, invoice_lines):
    net = invoice_lines.groupby("invoice_id", as_index=False)["amount"].sum().rename(columns={"amount": "local_total"})
    inv = invoices.merge(net, on="invoice_id")
    latest = rates.sort_values("day").drop_duplicates("code", keep="last")
    m = inv.merge(latest[["code", "to_usd"]], on="code")
    m["usd_total"] = (m["local_total"] * m["to_usd"]).round(2)
    return m[["customer", "local_total", "usd_total"]].reset_index(drop=True)`],
    hints: ['pd.merge_asof matches each invoice with the newest rate not after its date.', 'Both frames have to be sorted by that date.'],
    why: 'Backward matching per currency is exactly "the rate in force on that day".',
    mistakes: 'The newest rate overall values old invoices at today\'s rate.' },

  { t: 'Repeat Offenders Under One Policy', tags: ['groupby', 'filtering', 'merge'],
    story: 'A report can be dismissed rather than upheld, and a user can be reported under different policies.',
    task: 'Return handle, policy and upheld for the users with at least two upheld reports under the same policy.',
    setup: `policies = pd.DataFrame({"policy_id": [1, 2], "policy": ["Spam", "Harassment"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "handle": ["asha", "ben", "chitra"]})
reports = pd.DataFrame({"report_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 2, 3, 3, 3], "policy_id": [1, 1, 1, 2, 2, 2], "upheld": [1] * 6})`,
    hidden: [
      `policies = pd.DataFrame({"policy_id": [1, 2], "policy": ["Spam", "Harassment"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "handle": ["asha", "ben", "chitra"]})
reports = pd.DataFrame({"report_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 2, 3, 3, 3], "policy_id": [1, 1, 1, 2, 2, 2], "upheld": [1, 0, 1, 1, 1, 0]})`,
      `policies = pd.DataFrame({"policy_id": [1, 2], "policy": ["Spam", "Harassment"]})
users = pd.DataFrame({"user_id": [1, 2, 3], "handle": ["asha", "ben", "chitra"]})
reports = pd.DataFrame({"report_id": [1, 2, 3, 4, 5, 6], "user_id": [1, 1, 2, 2, 3, 3], "policy_id": [1, 2, 1, 2, 2, 2], "upheld": [1] * 6})`,
    ],
    sig: 'def solve(policies: pd.DataFrame, users: pd.DataFrame, reports: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(policies, users, reports):
    r = reports[reports["upheld"] == 1]
    g = r.groupby(["user_id", "policy_id"], as_index=False).size().rename(columns={"size": "upheld"})
    bad = g[g["upheld"] >= 2]
    out = bad.merge(users, on="user_id").merge(policies, on="policy_id")
    return out[["handle", "policy", "upheld"]].reset_index(drop=True)`,
    wrong: [`def solve(policies, users, reports):
    g = reports.groupby(["user_id", "policy_id"], as_index=False).size().rename(columns={"size": "upheld"})
    bad = g[g["upheld"] >= 2]
    out = bad.merge(users, on="user_id").merge(policies, on="policy_id")
    return out[["handle", "policy", "upheld"]].reset_index(drop=True)`],
    hints: ['Only upheld reports count.', 'Group by the user and the policy together.'],
    why: 'Filtering before grouping counts the reports that were actually upheld under one rule.',
    mistakes: 'Counting every report punishes a user whose reports were dismissed.' },

  { t: 'Bins Holding Incompatible Goods', tags: ['self merge', 'lookup', 'merge'],
    story: 'Some goods must not share a bin. The pairs that clash are listed once, in either order.',
    task: 'Return zone, product_a and product_b for the bins holding two products whose classes clash, with the smaller product id first.',
    setup: `classes = pd.DataFrame({"class_id": [1, 2, 3], "class_name": ["Food", "Chemicals", "Textiles"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "class_id": [1, 2, 3], "product": ["Rice", "Bleach", "Towels"]})
bins = pd.DataFrame({"bin_id": [100, 101, 102], "zone": ["A1", "A2", "B1"]})
placements = pd.DataFrame({"bin_id": [100, 100, 101, 102], "product_id": [10, 11, 10, 11]})
incompatible = pd.DataFrame({"class_a": [1], "class_b": [2]})`,
    hidden: [
      `classes = pd.DataFrame({"class_id": [1, 2, 3], "class_name": ["Food", "Chemicals", "Textiles"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "class_id": [1, 2, 3], "product": ["Rice", "Bleach", "Towels"]})
bins = pd.DataFrame({"bin_id": [100, 101, 102], "zone": ["A1", "A2", "B1"]})
placements = pd.DataFrame({"bin_id": [100, 100, 101, 101, 102], "product_id": [10, 11, 10, 12, 11]})
incompatible = pd.DataFrame({"class_a": [1], "class_b": [2]})`,
      `classes = pd.DataFrame({"class_id": [1, 2, 3], "class_name": ["Food", "Chemicals", "Textiles"]})
products = pd.DataFrame({"product_id": [10, 11, 12], "class_id": [1, 2, 3], "product": ["Rice", "Bleach", "Towels"]})
bins = pd.DataFrame({"bin_id": [100, 101, 102], "zone": ["A1", "A2", "B1"]})
placements = pd.DataFrame({"bin_id": [100, 100, 101, 101, 102], "product_id": [10, 11, 11, 12, 10]})
incompatible = pd.DataFrame({"class_a": [1, 2], "class_b": [2, 3]})`,
    ],
    sig: 'def solve(classes: pd.DataFrame, products: pd.DataFrame, bins: pd.DataFrame, placements: pd.DataFrame, incompatible: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(classes, products, bins, placements, incompatible):
    p = placements.merge(products, on="product_id")
    pair = p.merge(p, on="bin_id", suffixes=("_a", "_b"))
    pair = pair[pair["product_id_a"] < pair["product_id_b"]]
    bad = set()
    for a, b in zip(incompatible["class_a"], incompatible["class_b"]):
        bad.add((a, b))
        bad.add((b, a))
    keep = [(ca, cb) in bad for ca, cb in zip(pair["class_id_a"], pair["class_id_b"])]
    out = pair[keep].merge(bins, on="bin_id")
    return out[["zone", "product_a", "product_b"]].reset_index(drop=True)`,
    wrong: [`def solve(classes, products, bins, placements, incompatible):
    p = placements.merge(products, on="product_id")
    pair = p.merge(p, on="bin_id", suffixes=("_a", "_b"))
    pair = pair[(pair["product_id_a"] < pair["product_id_b"]) & (pair["class_id_a"] != pair["class_id_b"])]
    out = pair.merge(bins, on="bin_id")
    return out[["zone", "product_a", "product_b"]].reset_index(drop=True)`],
    hints: ['The clash is whatever the lookup frame says, in either direction.', 'Build a set of both orderings first.'],
    why: 'Consulting the incompatibility list applies the real rule.',
    mistakes: 'Treating any two different classes as a clash flags perfectly legal bins.' },

  { t: 'Crew Over the Duty Limit in a Day', tags: ['self merge', 'sliding window', 'merge'],
    story: 'A duty starts at a minute and lasts a number of minutes. The limit applies to any 24-hour stretch, 1440 minutes, starting at one of the crew member\'s own duties.',
    task: 'Return name, role and worst_minutes for the crew whose duty minutes inside such a stretch exceed their role limit.',
    setup: `roles = pd.DataFrame({"role_id": [1, 2], "role": ["Pilot", "Cabin"], "max_minutes": [600, 720]})
crew = pd.DataFrame({"crew_id": [10, 11, 12], "role_id": [1, 1, 2], "name": ["Asha", "Ben", "Chitra"]})
duties = pd.DataFrame({"duty_id": [1, 2, 3, 4, 5], "crew_id": [10, 10, 11, 12, 12], "start_min": [0, 400, 0, 0, 600], "minutes": [300, 350, 200, 500, 300]})`,
    hidden: [
      `roles = pd.DataFrame({"role_id": [1, 2], "role": ["Pilot", "Cabin"], "max_minutes": [600, 720]})
crew = pd.DataFrame({"crew_id": [10, 11, 12], "role_id": [1, 1, 2], "name": ["Asha", "Ben", "Chitra"]})
duties = pd.DataFrame({"duty_id": [1, 2, 3, 4, 5], "crew_id": [10, 10, 11, 12, 12], "start_min": [1300, 1700, 0, 0, 600], "minutes": [300, 350, 200, 500, 300]})`,
      `roles = pd.DataFrame({"role_id": [1, 2], "role": ["Pilot", "Cabin"], "max_minutes": [700, 700]})
crew = pd.DataFrame({"crew_id": [10, 11, 12], "role_id": [1, 1, 2], "name": ["Asha", "Ben", "Chitra"]})
duties = pd.DataFrame({"duty_id": [1, 2, 3, 4, 5], "crew_id": [10, 10, 11, 12, 12], "start_min": [0, 400, 0, 0, 600], "minutes": [300, 350, 200, 500, 300]})`,
    ],
    sig: 'def solve(roles: pd.DataFrame, crew: pd.DataFrame, duties: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(roles, crew, duties):
    m = duties.merge(duties, on="crew_id", suffixes=("_a", "_b"))
    m = m[(m["start_min_b"] >= m["start_min_a"]) & (m["start_min_b"] < m["start_min_a"] + 1440)]
    tot = m.groupby(["crew_id", "duty_id_a"], as_index=False)["minutes_b"].sum()
    worst = tot.groupby("crew_id", as_index=False)["minutes_b"].max().rename(columns={"minutes_b": "worst_minutes"})
    g = worst.merge(crew, on="crew_id").merge(roles, on="role_id")
    out = g[g["worst_minutes"] > g["max_minutes"]]
    return out[["name", "role", "worst_minutes"]].reset_index(drop=True)`,
    wrong: [`def solve(roles, crew, duties):
    d = duties.copy()
    d["day"] = d["start_min"] // 1440
    tot = d.groupby(["crew_id", "day"], as_index=False)["minutes"].sum()
    worst = tot.groupby("crew_id", as_index=False)["minutes"].max().rename(columns={"minutes": "worst_minutes"})
    g = worst.merge(crew, on="crew_id").merge(roles, on="role_id")
    out = g[g["worst_minutes"] > g["max_minutes"]]
    return out[["name", "role", "worst_minutes"]].reset_index(drop=True)`],
    hints: ['Anchor the stretch at each duty and total what falls inside it.', 'A self merge with a range filter is the rolling window.'],
    why: 'Anchoring on the crew member\'s own duties is what "any 24-hour stretch" means.',
    mistakes: 'Fixed 24-hour blocks miss a pair of duties that straddles a boundary.' },

  { t: 'Sellers With Two Months of Falling Ratings', tags: ['pivot', 'merge', 'months'],
    story: 'A marketplace watches for sellers whose service is sliding, month after month.',
    task: 'Return seller, m1, m2 and m3 (averages rounded to 2 decimals) for the sellers whose average rating fell from month 1 to 2 and again from 2 to 3.',
    setup: `sellers = pd.DataFrame({"seller_id": [1, 2], "seller": ["Alpha", "Beta"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "seller_id": [1, 1, 1, 2, 2, 2], "month": [1, 2, 3, 1, 2, 3]})
reviews = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "stars": [5, 4, 3, 3, 4, 5]})`,
    hidden: [
      `sellers = pd.DataFrame({"seller_id": [1, 2], "seller": ["Alpha", "Beta"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "seller_id": [1, 1, 1, 2, 2, 2], "month": [1, 2, 3, 1, 2, 3]})
reviews = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "stars": [5, 3, 4, 3, 4, 5]})`,
      `sellers = pd.DataFrame({"seller_id": [1, 2], "seller": ["Alpha", "Beta"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "seller_id": [1, 1, 1, 2, 2, 2], "month": [1, 2, 3, 1, 2, 3]})
reviews = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "stars": [4, 3, 2, 5, 4, 3]})`,
    ],
    sig: 'def solve(sellers: pd.DataFrame, orders: pd.DataFrame, reviews: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sellers, orders, reviews):
    m = reviews.merge(orders, on="order_id")
    g = m.groupby(["seller_id", "month"], as_index=False)["stars"].mean()
    p = g.pivot(index="seller_id", columns="month", values="stars").reset_index()
    p.columns = ["seller_id", "m1", "m2", "m3"]
    bad = p[(p["m2"] < p["m1"]) & (p["m3"] < p["m2"])].copy()
    for c in ["m1", "m2", "m3"]:
        bad[c] = bad[c].round(2)
    out = bad.merge(sellers, on="seller_id")
    return out[["seller", "m1", "m2", "m3"]].reset_index(drop=True)`,
    wrong: [`def solve(sellers, orders, reviews):
    m = reviews.merge(orders, on="order_id")
    g = m.groupby(["seller_id", "month"], as_index=False)["stars"].mean()
    p = g.pivot(index="seller_id", columns="month", values="stars").reset_index()
    p.columns = ["seller_id", "m1", "m2", "m3"]
    bad = p[p["m3"] < p["m1"]].copy()
    for c in ["m1", "m2", "m3"]:
        bad[c] = bad[c].round(2)
    out = bad.merge(sellers, on="seller_id")
    return out[["seller", "m1", "m2", "m3"]].reset_index(drop=True)`],
    hints: ['Both steps down have to hold.', 'A pivot puts the three months side by side.'],
    why: 'Comparing each month with the one before catches a real slide.',
    mistakes: 'Comparing the first month with the last accepts a seller who dipped and recovered.' },

  { t: 'Proration on a Mid-Month Upgrade', tags: ['merge', 'arithmetic', 'rounding'],
    story: 'A billing month is 30 days. When a subscription moves to another plan on day d, the old plan is charged for the days before d and the new plan from day d onwards.',
    task: 'Return customer and due (rounded to 2 decimals) for every subscription that changed plan.',
    setup: `plans = pd.DataFrame({"plan_id": [1, 2], "plan": ["Basic", "Pro"], "price": [300, 900]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102], "customer": ["Asha", "Ben", "Chitra"], "plan_id": [1, 1, 2]})
changes = pd.DataFrame({"sub_id": [100, 101], "day": [1, 1], "new_plan_id": [2, 2]})`,
    hidden: [
      `plans = pd.DataFrame({"plan_id": [1, 2], "plan": ["Basic", "Pro"], "price": [300, 900]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102], "customer": ["Asha", "Ben", "Chitra"], "plan_id": [1, 1, 2]})
changes = pd.DataFrame({"sub_id": [100, 101], "day": [11, 1], "new_plan_id": [2, 2]})`,
      `plans = pd.DataFrame({"plan_id": [1, 2], "plan": ["Basic", "Pro"], "price": [300, 900]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102], "customer": ["Asha", "Ben", "Chitra"], "plan_id": [1, 1, 2]})
changes = pd.DataFrame({"sub_id": [100, 101], "day": [21, 16], "new_plan_id": [2, 2]})`,
    ],
    sig: 'def solve(plans: pd.DataFrame, subscriptions: pd.DataFrame, changes: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(plans, subscriptions, changes):
    m = changes.merge(subscriptions, on="sub_id")
    m = m.merge(plans, left_on="plan_id", right_on="plan_id").rename(columns={"price": "old_price"})
    m = m.merge(plans, left_on="new_plan_id", right_on="plan_id", suffixes=("", "_new")).rename(columns={"price": "new_price"})
    m["due"] = (m["old_price"] * (m["day"] - 1) / 30.0 + m["new_price"] * (30 - m["day"] + 1) / 30.0).round(2)
    return m[["customer", "due"]].reset_index(drop=True)`,
    wrong: [`def solve(plans, subscriptions, changes):
    m = changes.merge(subscriptions, on="sub_id")
    m = m.merge(plans, left_on="new_plan_id", right_on="plan_id").rename(columns={"price": "new_price"})
    m["due"] = m["new_price"].round(2)
    return m[["customer", "due"]].reset_index(drop=True)`],
    hints: ['Split the 30 days at the change and charge each part at its own price.', 'Merging plans twice gives both prices.'],
    why: 'The old plan covers day 1 up to the day before the change, the new plan the rest.',
    mistakes: 'Charging the new price for the whole month only matches when the change lands on day 1.' },

  { t: 'Users Past the Frequency Cap', tags: ['groupby', 'merge', 'per-row threshold'],
    story: 'Each campaign sets its own cap on how often one person should see it.',
    task: 'Return person, campaign, seen and frequency_cap for the people who saw a campaign more often than its cap.',
    setup: `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Spring Shoes", "Winter Coats"], "frequency_cap": [2, 2]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
impressions = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 6, 7], "campaign_id": [1, 1, 1, 1, 2, 2, 2], "user_id": [1, 1, 1, 2, 3, 3, 3]})`,
    hidden: [
      `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Spring Shoes", "Winter Coats"], "frequency_cap": [2, 5]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
impressions = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 6, 7], "campaign_id": [1, 1, 1, 1, 2, 2, 2], "user_id": [1, 1, 1, 2, 3, 3, 3]})`,
      `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Spring Shoes", "Winter Coats"], "frequency_cap": [2, 2]})
users = pd.DataFrame({"user_id": [1, 2, 3], "person": ["Asha", "Ben", "Chitra"]})
impressions = pd.DataFrame({"impression_id": [1, 2, 3, 4, 5, 6, 7], "campaign_id": [1, 1, 1, 1, 2, 2, 2], "user_id": [1, 2, 2, 2, 3, 3, 1]})`,
    ],
    sig: 'def solve(campaigns: pd.DataFrame, users: pd.DataFrame, impressions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(campaigns, users, impressions):
    g = impressions.groupby(["campaign_id", "user_id"], as_index=False).size().rename(columns={"size": "seen"})
    m = g.merge(campaigns, on="campaign_id").merge(users, on="user_id")
    out = m[m["seen"] > m["frequency_cap"]]
    return out[["person", "campaign", "seen", "frequency_cap"]].reset_index(drop=True)`,
    wrong: [`def solve(campaigns, users, impressions):
    g = impressions.groupby(["campaign_id", "user_id"], as_index=False).size().rename(columns={"size": "seen"})
    m = g.merge(campaigns, on="campaign_id").merge(users, on="user_id")
    out = m[m["seen"] > 2]
    return out[["person", "campaign", "seen", "frequency_cap"]].reset_index(drop=True)`],
    hints: ['The cap is a column on the campaign.', 'Compare the count against that column.'],
    why: 'Reading the cap from the campaign keeps a tolerant campaign from being judged by a strict one.',
    mistakes: 'A hard-coded 2 works only while every campaign agrees.' },

  { t: 'Bed Turnaround Time', tags: ['shift', 'groupby', 'sorting'],
    story: 'The turnaround is the days a bed sits empty between one patient leaving and the next arriving. Stays are not entered in the order they happened.',
    task: 'Return ward and avg_turnaround (rounded to 2 decimals) for every ward.',
    setup: `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "Maternity"]})
beds = pd.DataFrame({"bed_id": [10, 11, 12], "ward_id": [1, 1, 2], "label": ["ICU-1", "ICU-2", "MAT-1"]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4, 5, 6], "bed_id": [10, 10, 11, 11, 12, 12], "in_day": [1, 5, 1, 6, 1, 6], "out_day": [3, 7, 2, 8, 4, 9]})`,
    hidden: [
      `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "Maternity"]})
beds = pd.DataFrame({"bed_id": [10, 11, 12], "ward_id": [1, 1, 2], "label": ["ICU-1", "ICU-2", "MAT-1"]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4, 5, 6], "bed_id": [10, 10, 10, 11, 12, 12], "in_day": [1, 5, 9, 1, 1, 6], "out_day": [3, 7, 11, 2, 4, 9]})`,
      `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "Maternity"]})
beds = pd.DataFrame({"bed_id": [10, 11, 12], "ward_id": [1, 1, 2], "label": ["ICU-1", "ICU-2", "MAT-1"]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4, 5, 6], "bed_id": [10, 10, 11, 11, 12, 12], "in_day": [5, 1, 1, 6, 1, 6], "out_day": [7, 3, 2, 8, 4, 9]})`,
    ],
    sig: 'def solve(wards: pd.DataFrame, beds: pd.DataFrame, stays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(wards, beds, stays):
    s = stays.sort_values(["bed_id", "in_day"]).copy()
    s["prev_out"] = s.groupby("bed_id")["out_day"].shift()
    s["gap"] = s["in_day"] - s["prev_out"]
    g = s.dropna(subset=["gap"]).merge(beds, on="bed_id").groupby("ward_id", as_index=False)["gap"].mean()
    out = g.merge(wards, on="ward_id")
    out["avg_turnaround"] = out["gap"].round(2)
    return out[["ward", "avg_turnaround"]].reset_index(drop=True)`,
    wrong: [`def solve(wards, beds, stays):
    s = stays.sort_values(["bed_id", "stay_id"]).copy()
    s["prev_out"] = s.groupby("bed_id")["out_day"].shift()
    s["gap"] = s["in_day"] - s["prev_out"]
    g = s.dropna(subset=["gap"]).merge(beds, on="bed_id").groupby("ward_id", as_index=False)["gap"].mean()
    out = g.merge(wards, on="ward_id")
    out["avg_turnaround"] = out["gap"].round(2)
    return out[["ward", "avg_turnaround"]].reset_index(drop=True)`],
    hints: ['The previous stay is the previous one in date order, not in row order.', 'Sort by bed and arrival before shifting.'],
    why: 'Sorting by the arrival day makes the shifted discharge the real previous one.',
    mistakes: 'Sorting by the row id works only while the file happens to be in order.' },
];
