// Pandas, interview-grade set: Hard. Onsite-round questions: four or more tables, two or three techniques each,
// and a trap a reasonable first answer falls into.
export default [
  { t: 'Last-Click Attribution Within Seven Days', tags: ['merge_asof', 'attribution', 'filtering'],
    story: 'A growth team credits a sale to the campaign of the customer\'s most recent click before the sale, as long as that click is within the previous 7 days. Test accounts never count, and a refunded sale earns no credit. Days are plain day numbers.',
    task: 'Return campaign, sales and revenue for every campaign that earned credit.',
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3, 4], "country": ["IN", "DE", "US", "IN"], "is_test": [0, 0, 0, 1]})
campaigns = pd.DataFrame({"campaign_id": [10, 11, 12], "campaign": ["Search Brand", "Search Generic", "Display Retarget"]})
clicks = pd.DataFrame({
    "click_id": [1, 2, 3, 4],
    "campaign_id": [10, 11, 12, 10],
    "user_id": [1, 2, 3, 4],
    "day": [1, 2, 3, 3],
})
orders = pd.DataFrame({
    "order_id": [100, 101, 102, 103],
    "user_id": [1, 2, 3, 4],
    "day": [5, 4, 20, 4],
    "amount": [1200, 800, 500, 9999],
})
refunds = pd.DataFrame({"order_id": [], "day": []})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1, 2, 3, 4], "country": ["IN", "DE", "US", "IN"], "is_test": [0, 0, 0, 1]})
campaigns = pd.DataFrame({"campaign_id": [10, 11, 12], "campaign": ["Search Brand", "Search Generic", "Display Retarget"]})
clicks = pd.DataFrame({"click_id": [1, 2, 3, 4, 5], "campaign_id": [10, 11, 12, 10, 11], "user_id": [1, 2, 3, 4, 1], "day": [1, 2, 3, 3, 4]})
orders = pd.DataFrame({"order_id": [100, 101, 102, 103], "user_id": [1, 2, 3, 4], "day": [5, 4, 20, 4], "amount": [1200, 800, 500, 9999]})
refunds = pd.DataFrame({"order_id": [], "day": []})`,
      `users = pd.DataFrame({"user_id": [1, 2, 3, 4], "country": ["IN", "DE", "US", "IN"], "is_test": [0, 0, 0, 1]})
campaigns = pd.DataFrame({"campaign_id": [10, 11, 12], "campaign": ["Search Brand", "Search Generic", "Display Retarget"]})
clicks = pd.DataFrame({"click_id": [1, 2, 3, 4], "campaign_id": [10, 11, 12, 10], "user_id": [1, 2, 3, 4], "day": [1, 2, 3, 3]})
orders = pd.DataFrame({"order_id": [100, 101, 102, 103], "user_id": [1, 2, 3, 4], "day": [5, 4, 20, 4], "amount": [1200, 800, 500, 9999]})
refunds = pd.DataFrame({"order_id": [100], "day": [9]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, campaigns: pd.DataFrame, clicks: pd.DataFrame, orders: pd.DataFrame, refunds: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, campaigns, clicks, orders, refunds):
    o = orders.merge(users, on="user_id")
    o = o[(o["is_test"] == 0) & ~o["order_id"].isin(refunds["order_id"])]
    o = o.sort_values("day")
    c = clicks.sort_values("day")
    m = pd.merge_asof(o, c, on="day", by="user_id", direction="backward",
                      tolerance=7, allow_exact_matches=False)
    m = m.dropna(subset=["campaign_id"])
    m["campaign_id"] = m["campaign_id"].astype(int)
    g = m.groupby("campaign_id", as_index=False).agg(sales=("order_id", "size"), revenue=("amount", "sum"))
    out = g.merge(campaigns, on="campaign_id")
    return out[["campaign", "sales", "revenue"]].reset_index(drop=True)`,
    wrong: [`def solve(users, campaigns, clicks, orders, refunds):
    o = orders.merge(users, on="user_id")
    o = o[(o["is_test"] == 0) & ~o["order_id"].isin(refunds["order_id"])]
    m = o.merge(clicks, on="user_id", suffixes=("", "_c"))
    m = m[(m["day_c"] < m["day"]) & (m["day"] - m["day_c"] <= 7)]
    g = m.groupby("campaign_id", as_index=False).agg(sales=("order_id", "nunique"), revenue=("amount", "sum"))
    out = g.merge(campaigns, on="campaign_id")
    return out[["campaign", "sales", "revenue"]].reset_index(drop=True)`],
    hints: ['pd.merge_asof matches each sale with the nearest earlier click of the same user; tolerance limits how far back it looks.', 'allow_exact_matches=False makes the click strictly earlier than the sale.'],
    why: 'merge_asof gives each sale exactly one owning click, so the sale is counted once however many campaigns the customer touched. Sales with no click inside the window come back as NaN and are dropped.',
    mistakes: 'A plain merge of clicks onto orders repeats the sale once per click, which inflates both the count and the revenue as soon as somebody clicks twice.' },

  { t: 'Devices Shared by a Fraud Ring', tags: ['drop_duplicates', 'merge', 'double counting'],
    story: 'A risk team looks for devices that several different accounts sign in from. People sign in repeatedly, and an account can have many flagged transactions.',
    task: 'Return fingerprint, accounts and flagged_total for the devices used by at least 3 different accounts whose combined flagged amount, counting each account once, is more than 10000.',
    setup: `accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
devices = pd.DataFrame({"device_id": [90, 91, 92], "fingerprint": ["fp-aa", "fp-bb", "fp-cc"]})
logins = pd.DataFrame({
    "account_id": [1, 2, 3, 4, 5, 1, 2, 3],
    "device_id": [90, 90, 90, 91, 91, 92, 92, 92],
    "day": [1, 2, 3, 4, 5, 6, 7, 8],
})
txns = pd.DataFrame({
    "txn_id": [1, 2, 3, 4, 5, 6],
    "account_id": [1, 2, 3, 4, 5, 1],
    "amount": [6000, 5000, 2000, 9000, 500, 4000],
    "flagged": [1, 1, 1, 1, 1, 0],
})`,
    hidden: [
      `accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
devices = pd.DataFrame({"device_id": [90, 91, 92], "fingerprint": ["fp-aa", "fp-bb", "fp-cc"]})
logins = pd.DataFrame({"account_id": [1, 1, 1, 2, 4, 5, 1, 2, 3], "device_id": [90, 90, 90, 90, 91, 91, 92, 92, 92], "day": [1, 2, 9, 2, 4, 5, 6, 7, 8]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6], "account_id": [1, 2, 3, 4, 5, 1], "amount": [6000, 5000, 2000, 9000, 500, 4000], "flagged": [1, 1, 1, 1, 1, 0]})`,
      `accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
devices = pd.DataFrame({"device_id": [90, 91, 92], "fingerprint": ["fp-aa", "fp-bb", "fp-cc"]})
logins = pd.DataFrame({"account_id": [1, 2, 3, 4, 5, 1, 2, 3], "device_id": [90, 90, 90, 91, 91, 92, 92, 92], "day": [1, 2, 3, 4, 5, 6, 7, 8]})
txns = pd.DataFrame({"txn_id": [1, 2, 3, 4, 5, 6], "account_id": [1, 1, 2, 3, 3, 4], "amount": [3000, 3000, 5000, 300, 200, 9000], "flagged": [1, 1, 1, 1, 1, 1]})`,
    ],
    sig: 'def solve(accounts: pd.DataFrame, devices: pd.DataFrame, logins: pd.DataFrame, txns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts, devices, logins, txns):
    flagged = txns[txns["flagged"] == 1].groupby("account_id")["amount"].sum().rename("flagged")
    pair = logins[["device_id", "account_id"]].drop_duplicates()
    m = pair.merge(flagged, on="account_id", how="left")
    m["flagged"] = m["flagged"].fillna(0)
    g = m.groupby("device_id", as_index=False).agg(accounts=("account_id", "size"), flagged_total=("flagged", "sum"))
    g = g[(g["accounts"] >= 3) & (g["flagged_total"] > 10000)]
    out = g.merge(devices, on="device_id")
    out["flagged_total"] = out["flagged_total"].astype(int)
    return out[["fingerprint", "accounts", "flagged_total"]].reset_index(drop=True)`,
    wrong: [`def solve(accounts, devices, logins, txns):
    m = logins.merge(txns[txns["flagged"] == 1], on="account_id")
    g = m.groupby("device_id", as_index=False).agg(accounts=("account_id", "size"), flagged_total=("amount", "sum"))
    g = g[(g["accounts"] >= 3) & (g["flagged_total"] > 10000)]
    out = g.merge(devices, on="device_id")
    return out[["fingerprint", "accounts", "flagged_total"]].reset_index(drop=True)`],
    hints: ['Reduce the logins to one row per device and account before counting anything.', 'Total each account\'s flagged amount once, then attach it to those pairs.'],
    why: 'Dropping duplicate device-account pairs makes the count a count of accounts, and joining a pre-aggregated per-account total keeps the money from being added more than once.',
    mistakes: 'Merging the raw tables multiplies rows: a repeated login or a second flagged transaction inflates both the account count and the total.' },

  { t: 'Departments Short of Cover', tags: ['anti join', 'merge', 'groupby'],
    story: 'Rosters are planned in advance, and a doctor who later goes on leave for a day does not work the shifts rostered for that day. Shift times are minute counts within the day.',
    task: 'Return department, day, covered and required for every department and day where the hours actually covered fall short of the requirement. Hours are shift minutes divided by 60.',
    setup: `departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Emergency", "Radiology"], "required_hours": [16, 8]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9], "dept_id": [1, 1, 2], "doctor": ["Rao", "Iyer", "Nair"]})
shifts = pd.DataFrame({
    "shift_id": [1, 2, 3, 4, 5, 6],
    "doctor_id": [7, 8, 9, 7, 8, 9],
    "day": ["2024-06-01", "2024-06-01", "2024-06-01", "2024-06-02", "2024-06-02", "2024-06-02"],
    "start_min": [480, 960, 540, 480, 840, 600],
    "end_min": [960, 1440, 1020, 840, 1200, 900],
})
leaves = pd.DataFrame({"doctor_id": [], "day": []})`,
    hidden: [
      `departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Emergency", "Radiology"], "required_hours": [16, 8]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9], "dept_id": [1, 1, 2], "doctor": ["Rao", "Iyer", "Nair"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4, 5, 6], "doctor_id": [7, 8, 9, 7, 8, 9], "day": ["2024-06-01", "2024-06-01", "2024-06-01", "2024-06-02", "2024-06-02", "2024-06-02"], "start_min": [480, 960, 540, 480, 840, 600], "end_min": [960, 1440, 1020, 840, 1200, 900]})
leaves = pd.DataFrame({"doctor_id": [8, 9], "day": ["2024-06-01", "2024-06-02"]})`,
      `departments = pd.DataFrame({"dept_id": [1, 2], "department": ["Emergency", "Radiology"], "required_hours": [16, 8]})
doctors = pd.DataFrame({"doctor_id": [7, 8, 9], "dept_id": [1, 1, 2], "doctor": ["Rao", "Iyer", "Nair"]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4, 5, 6], "doctor_id": [7, 8, 9, 7, 8, 9], "day": ["2024-06-01", "2024-06-01", "2024-06-01", "2024-06-02", "2024-06-02", "2024-06-02"], "start_min": [480, 960, 540, 480, 840, 600], "end_min": [960, 1200, 1020, 840, 1200, 1080]})
leaves = pd.DataFrame({"doctor_id": [], "day": []})`,
    ],
    sig: 'def solve(departments: pd.DataFrame, doctors: pd.DataFrame, shifts: pd.DataFrame, leaves: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(departments, doctors, shifts, leaves):
    off = set(zip(leaves["doctor_id"], leaves["day"]))
    keep = [(d, dy) not in off for d, dy in zip(shifts["doctor_id"], shifts["day"])]
    s = shifts[keep].copy()
    s["hours"] = (s["end_min"] - s["start_min"]) / 60.0
    m = s.merge(doctors, on="doctor_id").merge(departments, on="dept_id")
    g = m.groupby(["department", "day", "required_hours"], as_index=False)["hours"].sum()
    g = g[g["hours"] < g["required_hours"]]
    g = g.rename(columns={"hours": "covered", "required_hours": "required"})
    return g[["department", "day", "covered", "required"]].reset_index(drop=True)`,
    wrong: [`def solve(departments, doctors, shifts, leaves):
    s = shifts.copy()
    s["hours"] = (s["end_min"] - s["start_min"]) / 60.0
    m = s.merge(doctors, on="doctor_id").merge(departments, on="dept_id")
    g = m.groupby(["department", "day", "required_hours"], as_index=False)["hours"].sum()
    g = g[g["hours"] < g["required_hours"]]
    g = g.rename(columns={"hours": "covered", "required_hours": "required"})
    return g[["department", "day", "covered", "required"]].reset_index(drop=True)`],
    hints: ['A rostered shift only counts if its doctor is not on leave that same day.', 'Matching on two columns at once is easiest with a set of pairs, or with a merge and indicator.'],
    why: 'The leave table has to remove shifts on the doctor and day together, before the hours are added up. Dividing by 60.0 keeps the half hours, which matters right at the requirement.',
    mistakes: 'Ignoring leave reports the roster as planned rather than the cover the ward actually had.' },

  { t: 'Transit Time in Working Days', tags: ['searchsorted', 'calendar', 'merge'],
    story: 'Each lane promises a transit time in working days. The calendar says which days the network runs; everything else is a weekend or a holiday.',
    task: 'Return shipment_id, from_city, to_city, transit and sla for the shipments that took longer than their lane promises. Transit is the number of working days after the shipping day, up to and including the delivery day.',
    setup: `hubs = pd.DataFrame({"code": ["DEL", "BOM", "BLR"], "city": ["Delhi", "Mumbai", "Bengaluru"]})
lanes = pd.DataFrame({"lane_id": [1, 2, 3], "from_hub": ["DEL", "BOM", "DEL"], "to_hub": ["BOM", "BLR", "BLR"], "sla_days": [2, 3, 2]})
shipments = pd.DataFrame({
    "shipment_id": [900, 901, 902, 903],
    "lane_id": [1, 1, 2, 3],
    "ship_day": ["2024-09-02", "2024-09-02", "2024-09-03", "2024-09-04"],
    "deliver_day": ["2024-09-04", "2024-09-05", "2024-09-06", "2024-09-05"],
})
calendar = pd.DataFrame({
    "day": ["2024-09-02", "2024-09-03", "2024-09-04", "2024-09-05", "2024-09-06", "2024-09-07", "2024-09-08"],
    "is_working": [1, 1, 1, 1, 1, 1, 1],
})`,
    hidden: [
      `hubs = pd.DataFrame({"code": ["DEL", "BOM", "BLR"], "city": ["Delhi", "Mumbai", "Bengaluru"]})
lanes = pd.DataFrame({"lane_id": [1, 2, 3], "from_hub": ["DEL", "BOM", "DEL"], "to_hub": ["BOM", "BLR", "BLR"], "sla_days": [2, 3, 2]})
shipments = pd.DataFrame({"shipment_id": [900, 901, 902, 903], "lane_id": [1, 1, 2, 3], "ship_day": ["2024-09-02", "2024-09-02", "2024-09-03", "2024-09-04"], "deliver_day": ["2024-09-04", "2024-09-05", "2024-09-06", "2024-09-05"]})
calendar = pd.DataFrame({"day": ["2024-09-02", "2024-09-03", "2024-09-04", "2024-09-05", "2024-09-06", "2024-09-07", "2024-09-08"], "is_working": [1, 0, 1, 1, 1, 0, 0]})`,
      `hubs = pd.DataFrame({"code": ["DEL", "BOM", "BLR"], "city": ["Delhi", "Mumbai", "Bengaluru"]})
lanes = pd.DataFrame({"lane_id": [1, 2, 3], "from_hub": ["DEL", "BOM", "DEL"], "to_hub": ["BOM", "BLR", "BLR"], "sla_days": [2, 3, 2]})
shipments = pd.DataFrame({"shipment_id": [900, 901, 902, 903], "lane_id": [1, 1, 2, 3], "ship_day": ["2024-09-02", "2024-09-02", "2024-09-03", "2024-09-04"], "deliver_day": ["2024-09-04", "2024-09-05", "2024-09-07", "2024-09-05"]})
calendar = pd.DataFrame({"day": ["2024-09-02", "2024-09-03", "2024-09-04", "2024-09-05", "2024-09-06", "2024-09-07", "2024-09-08"], "is_working": [1, 1, 1, 1, 1, 1, 1]})`,
    ],
    sig: 'def solve(hubs: pd.DataFrame, lanes: pd.DataFrame, shipments: pd.DataFrame, calendar: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(hubs, lanes, shipments, calendar):
    work = np.sort(calendar.loc[calendar["is_working"] == 1, "day"].to_numpy())
    s = shipments.merge(lanes, on="lane_id")
    a = np.searchsorted(work, s["ship_day"].to_numpy(), side="right")
    b = np.searchsorted(work, s["deliver_day"].to_numpy(), side="right")
    s["transit"] = b - a
    s = s[s["transit"] > s["sla_days"]]
    s = s.merge(hubs, left_on="from_hub", right_on="code").rename(columns={"city": "from_city"})
    s = s.merge(hubs, left_on="to_hub", right_on="code").rename(columns={"city": "to_city"})
    s = s.rename(columns={"sla_days": "sla"})
    return s[["shipment_id", "from_city", "to_city", "transit", "sla"]].reset_index(drop=True)`,
    wrong: [`def solve(hubs, lanes, shipments, calendar):
    s = shipments.merge(lanes, on="lane_id")
    s["transit"] = (pd.to_datetime(s["deliver_day"]) - pd.to_datetime(s["ship_day"])).dt.days
    s = s[s["transit"] > s["sla_days"]]
    s = s.merge(hubs, left_on="from_hub", right_on="code").rename(columns={"city": "from_city"})
    s = s.merge(hubs, left_on="to_hub", right_on="code").rename(columns={"city": "to_city"})
    s = s.rename(columns={"sla_days": "sla"})
    return s[["shipment_id", "from_city", "to_city", "transit", "sla"]].reset_index(drop=True)`],
    hints: ['Count how many working days fall in the range instead of subtracting the dates.', 'np.searchsorted on the sorted working days gives those counts in one shot.'],
    why: 'Two searchsorted calls with side="right" give the number of working days up to each date, and their difference counts the days strictly after the shipping day up to the delivery day.',
    mistakes: 'A plain date difference counts weekends and holidays as transit, so it flags shipments that were never late and misses the ones that were.' },

  { t: 'Cabins Sold Past Capacity', tags: ['merge', 'two-key join', 'status filter'],
    story: 'Seat capacity depends on the aircraft flying the route, and cancelled bookings free their seat again.',
    task: 'Return code, day, cabin, booked and seats for every flight and cabin where live bookings are more than the seats available.',
    setup: `aircraft = pd.DataFrame({"aircraft_id": [1, 2], "model": ["A320", "B777"]})
cabins = pd.DataFrame({
    "aircraft_id": [1, 1, 2, 2],
    "cabin": ["Economy", "Business", "Economy", "Business"],
    "seats": [3, 2, 4, 1],
})
flights = pd.DataFrame({
    "flight_id": [500, 501, 502],
    "code": ["DJ101", "DJ202", "DJ303"],
    "aircraft_id": [1, 2, 1],
    "day": ["2024-08-01", "2024-08-01", "2024-08-02"],
})
bookings = pd.DataFrame({
    "booking_id": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "flight_id": [500, 500, 500, 500, 500, 501, 501, 502, 502],
    "cabin": ["Economy", "Economy", "Economy", "Economy", "Business", "Business", "Business", "Economy", "Economy"],
    "status": ["booked", "booked", "booked", "booked", "booked", "booked", "booked", "booked", "booked"],
})`,
    hidden: [
      `aircraft = pd.DataFrame({"aircraft_id": [1, 2], "model": ["A320", "B777"]})
cabins = pd.DataFrame({"aircraft_id": [1, 1, 2, 2], "cabin": ["Economy", "Business", "Economy", "Business"], "seats": [3, 2, 4, 1]})
flights = pd.DataFrame({"flight_id": [500, 501, 502], "code": ["DJ101", "DJ202", "DJ303"], "aircraft_id": [1, 2, 1], "day": ["2024-08-01", "2024-08-01", "2024-08-02"]})
bookings = pd.DataFrame({"booking_id": [1, 2, 3, 4, 5, 6, 7, 8, 9], "flight_id": [500, 500, 500, 500, 500, 501, 501, 502, 502], "cabin": ["Economy", "Economy", "Economy", "Economy", "Business", "Business", "Business", "Economy", "Economy"], "status": ["booked", "booked", "cancelled", "booked", "booked", "booked", "cancelled", "booked", "booked"]})`,
      `aircraft = pd.DataFrame({"aircraft_id": [1, 2], "model": ["A320", "B777"]})
cabins = pd.DataFrame({"aircraft_id": [1, 1, 2, 2], "cabin": ["Economy", "Business", "Economy", "Business"], "seats": [3, 2, 4, 1]})
flights = pd.DataFrame({"flight_id": [500, 501, 502], "code": ["DJ101", "DJ202", "DJ303"], "aircraft_id": [1, 2, 1], "day": ["2024-08-01", "2024-08-01", "2024-08-02"]})
bookings = pd.DataFrame({"booking_id": [1, 2, 3, 4, 5, 6, 7, 8, 9], "flight_id": [500, 500, 500, 500, 500, 500, 501, 502, 502], "cabin": ["Economy", "Economy", "Economy", "Business", "Business", "Business", "Economy", "Economy", "Economy"], "status": ["booked", "booked", "booked", "booked", "booked", "booked", "booked", "booked", "booked"]})`,
    ],
    sig: 'def solve(aircraft: pd.DataFrame, cabins: pd.DataFrame, flights: pd.DataFrame, bookings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(aircraft, cabins, flights, bookings):
    b = bookings[bookings["status"] == "booked"]
    m = b.merge(flights, on="flight_id")
    g = m.groupby(["code", "day", "cabin", "aircraft_id"], as_index=False).agg(booked=("booking_id", "size"))
    g = g.merge(cabins, on=["aircraft_id", "cabin"])
    g = g[g["booked"] > g["seats"]]
    return g[["code", "day", "cabin", "booked", "seats"]].reset_index(drop=True)`,
    wrong: [`def solve(aircraft, cabins, flights, bookings):
    m = bookings.merge(flights, on="flight_id")
    g = m.groupby(["code", "day", "cabin", "aircraft_id"], as_index=False).agg(booked=("booking_id", "size"))
    g = g.merge(cabins, on=["aircraft_id", "cabin"])
    g = g[g["booked"] > g["seats"]]
    return g[["code", "day", "cabin", "booked", "seats"]].reset_index(drop=True)`],
    hints: ['The seat count is found by the aircraft of the flight and the cabin of the booking together.', 'Carry aircraft_id through the grouping so the merge has both keys.'],
    why: 'Merging on a list of two columns reaches the right cabins row, and filtering to live bookings first makes the count the number of seats actually taken.',
    mistakes: 'Counting every booking regardless of status reports flights that are merely busy, not oversold.' },

  { t: 'A/B Test With Contaminated Users', tags: ['nunique', 'groupby', 'first exposure'],
    story: 'Experiment 1 is being read out. A user only counts once they have been exposed, and a buggy rollout assigned a few users to both variants.',
    task: 'For experiment 1 return variant, users, converted and rate (rounded to 2 decimals). A user counts as converted if they have a conversion on or after their first exposure. Users assigned to more than one variant are dropped entirely.',
    setup: `experiments = pd.DataFrame({"experiment_id": [1, 2], "name": ["Checkout Redesign", "Search Ranking"]})
assignments = pd.DataFrame({
    "experiment_id": [1, 1, 1, 1, 1, 2],
    "user_id": [1, 2, 3, 4, 5, 1],
    "variant": ["control", "control", "treatment", "treatment", "treatment", "control"],
})
exposures = pd.DataFrame({
    "experiment_id": [1, 1, 1, 1, 1, 2],
    "user_id": [1, 2, 3, 4, 5, 1],
    "day": ["2024-05-01", "2024-05-02", "2024-05-01", "2024-05-03", "2024-05-04", "2024-05-01"],
})
conversions = pd.DataFrame({
    "user_id": [1, 3, 4, 5],
    "day": ["2024-05-03", "2024-05-02", "2024-05-05", "2024-04-28"],
    "value": [500, 700, 300, 900],
})`,
    hidden: [
      `experiments = pd.DataFrame({"experiment_id": [1, 2], "name": ["Checkout Redesign", "Search Ranking"]})
assignments = pd.DataFrame({"experiment_id": [1, 1, 1, 1, 1, 1, 2], "user_id": [1, 2, 3, 4, 5, 2, 1], "variant": ["control", "control", "treatment", "treatment", "treatment", "treatment", "control"]})
exposures = pd.DataFrame({"experiment_id": [1, 1, 1, 1, 1, 2], "user_id": [1, 2, 3, 4, 5, 1], "day": ["2024-05-01", "2024-05-02", "2024-05-01", "2024-05-03", "2024-05-04", "2024-05-01"]})
conversions = pd.DataFrame({"user_id": [1, 3, 4, 5], "day": ["2024-05-03", "2024-05-02", "2024-05-05", "2024-04-28"], "value": [500, 700, 300, 900]})`,
      `experiments = pd.DataFrame({"experiment_id": [1, 2], "name": ["Checkout Redesign", "Search Ranking"]})
assignments = pd.DataFrame({"experiment_id": [1, 1, 1, 1, 1, 2], "user_id": [1, 2, 3, 4, 5, 1], "variant": ["control", "control", "treatment", "treatment", "treatment", "control"]})
exposures = pd.DataFrame({"experiment_id": [1, 1, 1, 1, 1, 2], "user_id": [1, 2, 3, 4, 5, 1], "day": ["2024-05-01", "2024-05-02", "2024-05-01", "2024-05-03", "2024-05-04", "2024-05-01"]})
conversions = pd.DataFrame({"user_id": [1, 3, 4, 5, 2], "day": ["2024-05-03", "2024-05-02", "2024-05-05", "2024-05-04", "2024-05-01"], "value": [500, 700, 300, 900, 100]})`,
    ],
    sig: 'def solve(experiments: pd.DataFrame, assignments: pd.DataFrame, exposures: pd.DataFrame, conversions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(experiments, assignments, exposures, conversions):
    a = assignments[assignments["experiment_id"] == 1]
    n = a.groupby("user_id")["variant"].nunique()
    clean = a[a["user_id"].isin(n[n == 1].index)].drop_duplicates("user_id")
    first = exposures[exposures["experiment_id"] == 1].groupby("user_id")["day"].min().rename("d0")
    pop = clean.merge(first, on="user_id")
    c = conversions.merge(pop[["user_id", "d0"]], on="user_id")
    won = c.loc[c["day"] >= c["d0"], "user_id"].unique()
    pop["conv"] = pop["user_id"].isin(won).astype(int)
    g = pop.groupby("variant", as_index=False).agg(users=("user_id", "size"), converted=("conv", "sum"))
    g["rate"] = (g["converted"] / g["users"]).round(2)
    return g`,
    wrong: [`def solve(experiments, assignments, exposures, conversions):
    a = assignments[assignments["experiment_id"] == 1]
    first = exposures[exposures["experiment_id"] == 1].groupby("user_id")["day"].min().rename("d0")
    pop = a.merge(first, on="user_id")
    c = conversions.merge(pop[["user_id", "d0"]].drop_duplicates(), on="user_id")
    won = c.loc[c["day"] >= c["d0"], "user_id"].unique()
    pop["conv"] = pop["user_id"].isin(won).astype(int)
    g = pop.groupby("variant", as_index=False).agg(users=("user_id", "size"), converted=("conv", "sum"))
    g["rate"] = (g["converted"] / g["users"]).round(2)
    return g`],
    hints: ['Build the readable population first: one variant per user, exposed at least once.', 'nunique per user tells you who was assigned twice.'],
    why: 'Keeping only users with a single variant, then joining their first exposure, gives a clean population whose conversions can be dated against that exposure.',
    mistakes: 'Reading straight off the assignments table counts a contaminated user in both arms and moves both rates.' },

  { t: 'Imbalance Cost With Missing Readings', tags: ['left join', 'fillna', 'merge'],
    story: 'Each site forecasts its daily consumption, and the grid charges for the gap between forecast and actual at the site\'s tariff price. A meter that failed to report has no reading row at all, which the grid treats as zero consumption.',
    task: 'Return site and cost: the sum over forecast days of the absolute difference in kWh times the tariff price.',
    setup: `tariffs = pd.DataFrame({"tariff_id": [1, 2], "tariff": ["Firm", "Flexible"], "imbalance_price": [4, 9]})
meters = pd.DataFrame({"meter_id": [10, 11, 12], "tariff_id": [1, 2, 1], "site": ["Mill Road", "Dock Yard", "Hill Farm"]})
forecasts = pd.DataFrame({
    "meter_id": [10, 10, 11, 11, 12],
    "day": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-02", "2024-02-01"],
    "kwh": [100, 120, 80, 90, 50],
})
readings = pd.DataFrame({
    "meter_id": [10, 10, 11, 11, 12],
    "day": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-02", "2024-02-01"],
    "kwh": [110, 100, 80, 60, 55],
})`,
    hidden: [
      `tariffs = pd.DataFrame({"tariff_id": [1, 2], "tariff": ["Firm", "Flexible"], "imbalance_price": [4, 9]})
meters = pd.DataFrame({"meter_id": [10, 11, 12], "tariff_id": [1, 2, 1], "site": ["Mill Road", "Dock Yard", "Hill Farm"]})
forecasts = pd.DataFrame({"meter_id": [10, 10, 11, 11, 12], "day": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-02", "2024-02-01"], "kwh": [100, 120, 80, 90, 50]})
readings = pd.DataFrame({"meter_id": [10, 10, 11, 12], "day": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-01"], "kwh": [110, 100, 80, 55]})`,
      `tariffs = pd.DataFrame({"tariff_id": [1, 2], "tariff": ["Firm", "Flexible"], "imbalance_price": [4, 2]})
meters = pd.DataFrame({"meter_id": [10, 11, 12], "tariff_id": [1, 2, 1], "site": ["Mill Road", "Dock Yard", "Hill Farm"]})
forecasts = pd.DataFrame({"meter_id": [10, 10, 11, 11, 12], "day": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-02", "2024-02-01"], "kwh": [100, 120, 80, 90, 50]})
readings = pd.DataFrame({"meter_id": [10, 10, 11, 11, 12], "day": ["2024-02-01", "2024-02-02", "2024-02-01", "2024-02-02", "2024-02-01"], "kwh": [110, 100, 80, 60, 55]})`,
    ],
    sig: 'def solve(tariffs: pd.DataFrame, meters: pd.DataFrame, forecasts: pd.DataFrame, readings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(tariffs, meters, forecasts, readings):
    m = forecasts.merge(readings, on=["meter_id", "day"], how="left", suffixes=("_f", "_a"))
    m["kwh_a"] = m["kwh_a"].fillna(0)
    m = m.merge(meters, on="meter_id").merge(tariffs, on="tariff_id")
    m["cost"] = (m["kwh_f"] - m["kwh_a"]).abs() * m["imbalance_price"]
    g = m.groupby("site", as_index=False)["cost"].sum()
    g["cost"] = g["cost"].astype(int)
    return g`,
    wrong: [`def solve(tariffs, meters, forecasts, readings):
    m = forecasts.merge(readings, on=["meter_id", "day"], suffixes=("_f", "_a"))
    m = m.merge(meters, on="meter_id").merge(tariffs, on="tariff_id")
    m["cost"] = (m["kwh_f"] - m["kwh_a"]).abs() * m["imbalance_price"]
    g = m.groupby("site", as_index=False)["cost"].sum()
    g["cost"] = g["cost"].astype(int)
    return g`],
    hints: ['The forecast days are the spine of the report; readings may or may not be there.', 'A missing actual is 0, not a row to drop.'],
    why: 'Merging readings onto forecasts with how="left" keeps the failed days, and filling the gap with 0 charges the whole forecast, as the question says.',
    mistakes: 'A default inner merge drops exactly the expensive days and understates the bill.' },

  { t: 'Two Weeks of Currency Inflation', tags: ['groupby', 'self merge', 'consecutive'],
    story: 'A game\'s economy team watches the currency players hold. Faucets add currency, sinks remove it, and buying an item removes its cost as well.',
    task: 'Return player and first_week for the players whose net currency grew in two consecutive weeks, where first_week is the earliest such pair. Net growth means faucets minus sinks minus item costs is strictly positive.',
    setup: `players = pd.DataFrame({"player_id": [1, 2, 3], "player": ["Asha", "Ben", "Chitra"]})
currency_events = pd.DataFrame({
    "event_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    "player_id": [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
    "week": [10, 10, 11, 11, 10, 10, 11, 11, 10, 10, 12, 12],
    "kind": ["faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink"],
    "amount": [500, 100, 400, 50, 300, 400, 600, 100, 200, 100, 900, 100],
})
items = pd.DataFrame({"item_id": [50, 51], "item": ["Mount", "Cape"], "cost": [350, 120]})
purchases = pd.DataFrame({"player_id": [], "item_id": [], "week": []})`,
    hidden: [
      `players = pd.DataFrame({"player_id": [1, 2, 3], "player": ["Asha", "Ben", "Chitra"]})
currency_events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "player_id": [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], "week": [10, 10, 11, 11, 10, 10, 11, 11, 10, 10, 12, 12], "kind": ["faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink"], "amount": [500, 100, 400, 50, 300, 400, 600, 100, 200, 100, 900, 100]})
items = pd.DataFrame({"item_id": [50, 51], "item": ["Mount", "Cape"], "cost": [350, 120]})
purchases = pd.DataFrame({"player_id": [1], "item_id": [50], "week": [11]})`,
      `players = pd.DataFrame({"player_id": [1, 2, 3], "player": ["Asha", "Ben", "Chitra"]})
currency_events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "player_id": [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], "week": [10, 10, 11, 11, 10, 10, 11, 11, 10, 10, 11, 11], "kind": ["faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink", "faucet", "sink"], "amount": [500, 100, 400, 50, 300, 400, 600, 100, 200, 100, 900, 100]})
items = pd.DataFrame({"item_id": [50, 51], "item": ["Mount", "Cape"], "cost": [350, 120]})
purchases = pd.DataFrame({"player_id": [], "item_id": [], "week": []})`,
    ],
    sig: 'def solve(players: pd.DataFrame, currency_events: pd.DataFrame, items: pd.DataFrame, purchases: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(players, currency_events, items, purchases):
    ev = currency_events.copy()
    ev["signed"] = np.where(ev["kind"] == "faucet", ev["amount"], -ev["amount"])
    net = ev.groupby(["player_id", "week"], as_index=False)["signed"].sum()
    spend = {}
    if len(purchases):
        pu = purchases.merge(items, on="item_id")
        for (p, w), c in pu.groupby(["player_id", "week"])["cost"].sum().items():
            spend[(p, w)] = c
    net["bal"] = net["signed"] - [spend.get((p, w), 0) for p, w in zip(net["player_id"], net["week"])]
    pos = net[net["bal"] > 0]
    nxt = pos.assign(week=pos["week"] - 1)
    pairs = pos.merge(nxt, on=["player_id", "week"], suffixes=("", "_n"))
    g = pairs.groupby("player_id", as_index=False)["week"].min().rename(columns={"week": "first_week"})
    out = g.merge(players, on="player_id")
    return out[["player", "first_week"]].reset_index(drop=True)`,
    wrong: [`def solve(players, currency_events, items, purchases):
    ev = currency_events.copy()
    ev["signed"] = np.where(ev["kind"] == "faucet", ev["amount"], -ev["amount"])
    net = ev.groupby(["player_id", "week"], as_index=False)["signed"].sum()
    net["bal"] = net["signed"]
    pos = net[net["bal"] > 0]
    nxt = pos.assign(week=pos["week"] - 1)
    pairs = pos.merge(nxt, on=["player_id", "week"], suffixes=("", "_n"))
    g = pairs.groupby("player_id", as_index=False)["week"].min().rename(columns={"week": "first_week"})
    out = g.merge(players, on="player_id")
    return out[["player", "first_week"]].reset_index(drop=True)`],
    hints: ['Work out one net number per player and week, remembering that a purchase is a sink too.', 'Shifting the week by one and merging finds the consecutive pairs.'],
    why: 'Signing the events makes the per-week balance a single sum, and item costs come in through the items table. Merging the positive weeks against themselves shifted by one week finds a week whose successor is also positive.',
    mistakes: 'Leaving purchases out of the sinks makes the economy look inflationary when the currency was actually spent.' },

  { t: 'Upgraded Within Ninety Days', tags: ['self merge', 'dates', 'filtering'],
    story: 'Customers cancel and come back. Marketing only counts a win-back when the customer had actually paid for the subscription that ended, and came back on a more expensive plan.',
    task: 'Return customer, old_plan, new_plan and gap_days for every case where a subscription ended, the same customer started another one no more than 90 days later, and the new plan costs strictly more. The ended subscription must have a paid invoice.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "customer": ["Asha", "Ben", "Chitra", "Dev"]})
plans = pd.DataFrame({"plan_id": [10, 11, 12], "plan": ["Basic", "Plus", "Pro"], "price": [300, 600, 1200]})
subscriptions = pd.DataFrame({
    "sub_id": [100, 101, 102, 103, 104, 105, 106, 107],
    "customer_id": [1, 1, 2, 2, 3, 3, 4, 4],
    "plan_id": [10, 11, 11, 12, 12, 10, 10, 11],
    "start_day": ["2024-01-01", "2024-03-20", "2024-01-15", "2024-04-01", "2024-01-10", "2024-02-20", "2024-01-05", "2024-06-01"],
    "end_day": ["2024-03-01", None, "2024-02-15", None, "2024-02-10", None, "2024-01-20", None],
})
invoices = pd.DataFrame({"sub_id": [100, 102, 104, 106], "amount": [300, 600, 1200, 300], "paid": [1, 1, 1, 0]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "customer": ["Asha", "Ben", "Chitra", "Dev"]})
plans = pd.DataFrame({"plan_id": [10, 11, 12], "plan": ["Basic", "Plus", "Pro"], "price": [300, 600, 1200]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102, 103, 104, 105, 106, 107], "customer_id": [1, 1, 2, 2, 3, 3, 4, 4], "plan_id": [10, 10, 11, 12, 12, 10, 10, 11], "start_day": ["2024-01-01", "2024-03-20", "2024-01-15", "2024-04-01", "2024-01-10", "2024-02-20", "2024-01-05", "2024-06-01"], "end_day": ["2024-03-01", None, "2024-02-15", None, "2024-02-10", None, "2024-01-20", None]})
invoices = pd.DataFrame({"sub_id": [100, 102, 104, 106], "amount": [300, 600, 1200, 300], "paid": [1, 1, 1, 0]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2, 3, 4], "customer": ["Asha", "Ben", "Chitra", "Dev"]})
plans = pd.DataFrame({"plan_id": [10, 11, 12], "plan": ["Basic", "Plus", "Pro"], "price": [300, 600, 1200]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102, 103, 104, 105, 106, 107], "customer_id": [1, 1, 2, 2, 3, 3, 4, 4], "plan_id": [10, 11, 11, 12, 12, 10, 10, 11], "start_day": ["2024-01-01", "2024-03-20", "2024-01-15", "2024-04-01", "2024-01-10", "2024-02-20", "2024-01-05", "2024-03-01"], "end_day": ["2024-03-01", None, "2024-02-15", None, "2024-02-10", None, "2024-01-20", None]})
invoices = pd.DataFrame({"sub_id": [100, 102, 104, 106], "amount": [300, 600, 1200, 300], "paid": [0, 1, 1, 1]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, plans: pd.DataFrame, subscriptions: pd.DataFrame, invoices: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, plans, subscriptions, invoices):
    s = subscriptions.copy()
    s["start"] = pd.to_datetime(s["start_day"])
    s["end"] = pd.to_datetime(s["end_day"])
    paid = set(invoices.loc[invoices["paid"] == 1, "sub_id"])
    old = s[s["end"].notna() & s["sub_id"].isin(paid)]
    m = old.merge(s, on="customer_id", suffixes=("_o", "_n"))
    gap = (m["start_n"] - m["end_o"]).dt.days
    m = m[(m["sub_id_o"] != m["sub_id_n"]) & (gap >= 0) & (gap <= 90)].copy()
    m["gap_days"] = (m["start_n"] - m["end_o"]).dt.days
    m = m.merge(plans, left_on="plan_id_o", right_on="plan_id").rename(columns={"plan": "old_plan", "price": "old_price"})
    m = m.merge(plans, left_on="plan_id_n", right_on="plan_id").rename(columns={"plan": "new_plan", "price": "new_price"})
    m = m[m["new_price"] > m["old_price"]]
    out = m.merge(customers, on="customer_id")
    return out[["customer", "old_plan", "new_plan", "gap_days"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, plans, subscriptions, invoices):
    s = subscriptions.copy()
    s["start"] = pd.to_datetime(s["start_day"])
    s["end"] = pd.to_datetime(s["end_day"])
    paid = set(invoices.loc[invoices["paid"] == 1, "sub_id"])
    old = s[s["end"].notna() & s["sub_id"].isin(paid)]
    m = old.merge(s, on="customer_id", suffixes=("_o", "_n"))
    gap = (m["start_n"] - m["end_o"]).dt.days
    m = m[(m["sub_id_o"] != m["sub_id_n"]) & (gap >= 0) & (gap <= 90)].copy()
    m["gap_days"] = (m["start_n"] - m["end_o"]).dt.days
    m = m.merge(plans, left_on="plan_id_o", right_on="plan_id").rename(columns={"plan": "old_plan", "price": "old_price"})
    m = m.merge(plans, left_on="plan_id_n", right_on="plan_id").rename(columns={"plan": "new_plan", "price": "new_price"})
    m = m[m["new_price"] >= m["old_price"]]
    out = m.merge(customers, on="customer_id")
    return out[["customer", "old_plan", "new_plan", "gap_days"]].reset_index(drop=True)`],
    hints: ['Merge the subscriptions to themselves on the customer, then bring the plan prices in on both sides.', 'The running subscription has no end day and can only be the new side.'],
    why: 'Both plan rows are needed to compare prices, so plans is merged twice under different names. A date difference in days gives the window test.',
    mistakes: 'Accepting an equal price counts a sideways move at the same money as a win-back.' },

  { t: 'Top Three Net Sellers per Region', tags: ['rank', 'ties', 'left join'],
    story: 'A marketplace measures a product by what it keeps: sales minus whatever came back as a return. Only some sales have a return row.',
    task: 'Return region, product and net for every product whose net revenue is among the 3 highest distinct net values in its region, ties included.',
    setup: `products = pd.DataFrame({"product_id": [1, 2, 3, 4], "product": ["Lamp", "Desk", "Chair", "Rug"]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["North", "South"]})
sales = pd.DataFrame({
    "sale_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "product_id": [1, 2, 3, 4, 1, 2, 3, 4],
    "region_id": [1, 1, 1, 1, 2, 2, 2, 2],
    "amount": [400, 300, 200, 100, 90, 80, 70, 60],
})
returns = pd.DataFrame({"sale_id": [], "amount": []})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2, 3, 4], "product": ["Lamp", "Desk", "Chair", "Rug"]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["North", "South"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6, 7, 8], "product_id": [1, 2, 3, 4, 1, 2, 3, 4], "region_id": [1, 1, 1, 1, 2, 2, 2, 2], "amount": [400, 300, 300, 100, 90, 80, 80, 60]})
returns = pd.DataFrame({"sale_id": [], "amount": []})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3, 4], "product": ["Lamp", "Desk", "Chair", "Rug"]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["North", "South"]})
sales = pd.DataFrame({"sale_id": [1, 2, 3, 4, 5, 6, 7, 8], "product_id": [1, 2, 3, 4, 1, 2, 3, 4], "region_id": [1, 1, 1, 1, 2, 2, 2, 2], "amount": [400, 300, 200, 100, 90, 80, 70, 60]})
returns = pd.DataFrame({"sale_id": [1, 5], "amount": [350, 85]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, regions: pd.DataFrame, sales: pd.DataFrame, returns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, regions, sales, returns):
    r = returns.rename(columns={"amount": "returned"})
    s = sales.merge(r, on="sale_id", how="left")
    s["returned"] = s["returned"].fillna(0)
    s["net"] = s["amount"] - s["returned"]
    g = s.groupby(["region_id", "product_id"], as_index=False)["net"].sum()
    g["rk"] = g.groupby("region_id")["net"].rank(method="dense", ascending=False)
    g = g[g["rk"] <= 3]
    out = g.merge(regions, on="region_id").merge(products, on="product_id")
    out["net"] = out["net"].astype(int)
    return out[["region", "product", "net"]].reset_index(drop=True)`,
    wrong: [`def solve(products, regions, sales, returns):
    r = returns.rename(columns={"amount": "returned"})
    s = sales.merge(r, on="sale_id", how="left")
    s["returned"] = s["returned"].fillna(0)
    s["net"] = s["amount"] - s["returned"]
    g = s.groupby(["region_id", "product_id"], as_index=False)["net"].sum()
    g = g.groupby("region_id", group_keys=False).apply(lambda x: x.nlargest(3, "net"))
    out = g.merge(regions, on="region_id").merge(products, on="product_id")
    out["net"] = out["net"].astype(int)
    return out[["region", "product", "net"]].reset_index(drop=True)`],
    hints: ['Returns only exist for some sales, so they join on the left and the gap is 0.', 'Which ranking method gives tied products the same place and keeps them all?'],
    why: 'A dense rank over the net totals numbers the distinct values, so keeping ranks up to 3 keeps every product sharing one of the top three figures.',
    mistakes: 'nlargest(3) cuts the list at three rows and silently drops a product tied for third.' }
];
