// Pandas, interview-grade set: Advanced, batch 3.
export default [
  { t: 'Buses Bunching at a Stop', tags: ['shift', 'per-row threshold', 'merge'],
    story: 'Each route promises a minimum headway. Two buses arriving closer together than that are bunching.',
    task: 'Return route, stop, at_min and gap for every arrival that came too soon after the one before it at the same stop.',
    setup: `routes = pd.DataFrame({"route_id": [1], "route": ["R1"], "min_headway": [5]})
stops = pd.DataFrame({"stop_id": [10], "stop": ["Harbour"]})
arrivals = pd.DataFrame({"arrival_id": [1, 2, 3], "route_id": [1, 1, 1], "stop_id": [10, 10, 10], "at_min": [0, 3, 20]})`,
    hidden: [
      `routes = pd.DataFrame({"route_id": [1], "route": ["R1"], "min_headway": [12]})
stops = pd.DataFrame({"stop_id": [10], "stop": ["Harbour"]})
arrivals = pd.DataFrame({"arrival_id": [1, 2, 3], "route_id": [1, 1, 1], "stop_id": [10, 10, 10], "at_min": [0, 8, 20]})`,
      `routes = pd.DataFrame({"route_id": [1, 2], "route": ["R1", "R2"], "min_headway": [5, 10]})
stops = pd.DataFrame({"stop_id": [10, 11], "stop": ["Harbour", "Market"]})
arrivals = pd.DataFrame({"arrival_id": [1, 2, 3, 4], "route_id": [1, 1, 2, 2], "stop_id": [10, 10, 11, 11], "at_min": [0, 3, 0, 6]})`,
    ],
    sig: 'def solve(routes: pd.DataFrame, stops: pd.DataFrame, arrivals: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(routes, stops, arrivals):
    a = arrivals.sort_values(["route_id", "stop_id", "at_min"]).copy()
    a["prev"] = a.groupby(["route_id", "stop_id"])["at_min"].shift()
    a["gap"] = a["at_min"] - a["prev"]
    m = a.merge(routes, on="route_id").merge(stops, on="stop_id")
    bad = m[m["gap"] < m["min_headway"]].copy()
    bad["gap"] = bad["gap"].astype(int)
    return bad.sort_values(["route", "at_min"])[["route", "stop", "at_min", "gap"]].reset_index(drop=True)`,
    wrong: [`def solve(routes, stops, arrivals):
    a = arrivals.sort_values(["route_id", "stop_id", "at_min"]).copy()
    a["prev"] = a.groupby(["route_id", "stop_id"])["at_min"].shift()
    a["gap"] = a["at_min"] - a["prev"]
    m = a.merge(routes, on="route_id").merge(stops, on="stop_id")
    bad = m[m["gap"] < 5].copy()
    bad["gap"] = bad["gap"].astype(int)
    return bad.sort_values(["route", "at_min"])[["route", "stop", "at_min", "gap"]].reset_index(drop=True)`],
    hints: ['The threshold is a column on the route, not a number in the query.', 'Shift within route and stop.'],
    why: 'Comparing the gap against the route\'s own headway asks the question the operator actually asked.',
    mistakes: 'A hard-coded five minutes happens to be right for one route and wrong for every other.' },

  { t: 'Days Present in Each Tax Year', tags: ['intervals', 'clipping', 'cross merge'], o: true,
    story: 'A stay has a first and a last day, both counted. Tax years are given as day ranges.',
    task: 'Return person, year and days for every year in which the person was present at all.',
    setup: `years = pd.DataFrame({"year": [2023, 2024], "start_day": [1, 366], "end_day": [365, 730]})
people = pd.DataFrame({"person_id": [1], "person": ["Asha"]})
stays = pd.DataFrame({"stay_id": [1], "person_id": [1], "start_day": [10], "end_day": [20]})`,
    hidden: [
      `years = pd.DataFrame({"year": [2023, 2024], "start_day": [1, 366], "end_day": [365, 730]})
people = pd.DataFrame({"person_id": [1], "person": ["Asha"]})
stays = pd.DataFrame({"stay_id": [1], "person_id": [1], "start_day": [360], "end_day": [370]})`,
      `years = pd.DataFrame({"year": [2023, 2024], "start_day": [1, 366], "end_day": [365, 730]})
people = pd.DataFrame({"person_id": [1, 2], "person": ["Asha", "Ben"]})
stays = pd.DataFrame({"stay_id": [1, 2, 3], "person_id": [1, 1, 2], "start_day": [10, 400, 350], "end_day": [20, 410, 380]})`,
    ],
    sig: 'def solve(years: pd.DataFrame, people: pd.DataFrame, stays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(years, people, stays):
    m = stays.merge(years, how="cross", suffixes=("", "_y"))
    lo = np.maximum(m["start_day"], m["start_day_y"])
    hi = np.minimum(m["end_day"], m["end_day_y"])
    m["days"] = np.maximum(0, hi - lo + 1)
    g = m.groupby(["person_id", "year"], as_index=False)["days"].sum()
    g = g[g["days"] > 0]
    out = g.merge(people, on="person_id")
    out["days"] = out["days"].astype(int)
    return out.sort_values(["person", "year"])[["person", "year", "days"]].reset_index(drop=True)`,
    wrong: [`def solve(years, people, stays):
    m = stays.merge(years, how="cross", suffixes=("", "_y"))
    m = m[(m["start_day"] >= m["start_day_y"]) & (m["start_day"] <= m["end_day_y"])].copy()
    m["days"] = m["end_day"] - m["start_day"] + 1
    g = m.groupby(["person_id", "year"], as_index=False)["days"].sum()
    out = g.merge(people, on="person_id")
    out["days"] = out["days"].astype(int)
    return out.sort_values(["person", "year"])[["person", "year", "days"]].reset_index(drop=True)`],
    hints: ['Clip the stay to the year before counting days.', 'An overlap of zero or less means the year does not apply.'],
    why: 'The overlap between the stay and the year is the only part of the stay that belongs to that year.',
    mistakes: 'Putting the whole stay in the year it started gives one year too many days and the next year none.' },

  { t: 'Claims Paid by Development Lag', tags: ['cross merge', 'cumulative', 'merge'], o: true,
    story: 'Claims are paid some months after the accident month that the policy was exposed in. The lag is how many months later.',
    task: 'Return month, lag and paid_to_date for lags 0, 1 and 2 of every accident month, ordered by month then lag.',
    setup: `accidents = pd.DataFrame({"month": ["2024-01"], "label": ["January"]})
policies = pd.DataFrame({"policy_id": [1, 2], "month": ["2024-01", "2024-01"]})
claims = pd.DataFrame({"policy_id": [1, 1, 2], "lag": [0, 1, 0], "amount": [100, 50, 200]})`,
    hidden: [
      `accidents = pd.DataFrame({"month": ["2024-01", "2024-02"], "label": ["January", "February"]})
policies = pd.DataFrame({"policy_id": [1, 2, 3], "month": ["2024-01", "2024-01", "2024-02"]})
claims = pd.DataFrame({"policy_id": [1, 1, 2, 3, 3], "lag": [0, 1, 0, 0, 2], "amount": [100, 50, 200, 70, 30]})`,
      `accidents = pd.DataFrame({"month": ["2024-01"], "label": ["January"]})
policies = pd.DataFrame({"policy_id": [1, 2], "month": ["2024-01", "2024-01"]})
claims = pd.DataFrame({"policy_id": [1, 1, 2], "lag": [2, 2, 1], "amount": [100, 50, 200]})`,
    ],
    sig: 'def solve(accidents: pd.DataFrame, policies: pd.DataFrame, claims: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accidents, policies, claims):
    c = claims.merge(policies, on="policy_id")
    grid = accidents[["month"]].merge(pd.DataFrame({"lag": [0, 1, 2]}), how="cross")
    rows = []
    for _, g in grid.iterrows():
        inside = c[(c["month"] == g["month"]) & (c["lag"] <= g["lag"])]
        rows.append((g["month"], g["lag"], int(inside["amount"].sum())))
    r = pd.DataFrame(rows, columns=["month", "lag", "paid_to_date"])
    return r.sort_values(["month", "lag"]).reset_index(drop=True)`,
    wrong: [`def solve(accidents, policies, claims):
    c = claims.merge(policies, on="policy_id")
    grid = accidents[["month"]].merge(pd.DataFrame({"lag": [0, 1, 2]}), how="cross")
    rows = []
    for _, g in grid.iterrows():
        inside = c[c["lag"] <= g["lag"]]
        rows.append((g["month"], g["lag"], int(inside["amount"].sum())))
    r = pd.DataFrame(rows, columns=["month", "lag", "paid_to_date"])
    return r.sort_values(["month", "lag"]).reset_index(drop=True)`],
    hints: ['A claim belongs to the accident month of its policy.', 'Total everything up to and including the lag.'],
    why: 'The triangle needs one row per accident month and lag, with the payments of that month only.',
    mistakes: 'Dropping the month filter pours every accident month into every row.' },

  { t: 'Latency at the 95th Percentile', tags: ['percentile', 'groupby', 'sorting'],
    story: 'Latency samples are collected per service and region. The 95th percentile is the smallest sample with at least 95 per cent of the samples at or below it.',
    task: 'Return service and p95 for every service.',
    setup: `services = pd.DataFrame({"service_id": [1], "service": ["checkout"]})
regions = pd.DataFrame({"region_id": [1], "region": ["eu-west"]})
samples = pd.DataFrame({"sample_id": list(range(1, 21)), "service_id": [1] * 20, "region_id": [1] * 20, "ms": [100] * 20})`,
    hidden: [
      `services = pd.DataFrame({"service_id": [1], "service": ["checkout"]})
regions = pd.DataFrame({"region_id": [1], "region": ["eu-west"]})
samples = pd.DataFrame({"sample_id": list(range(1, 21)), "service_id": [1] * 20, "region_id": [1] * 20, "ms": list(range(1, 21))})`,
      `services = pd.DataFrame({"service_id": [1, 2], "service": ["checkout", "search"]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["eu-west", "us-east"]})
samples = pd.DataFrame({"sample_id": list(range(1, 21)), "service_id": [1] * 10 + [2] * 10, "region_id": [1] * 10 + [2] * 10, "ms": [10, 20, 30, 40, 50, 60, 70, 80, 90, 1000] + [5] * 9 + [500]})`,
    ],
    sig: 'def solve(services: pd.DataFrame, regions: pd.DataFrame, samples: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(services, regions, samples):
    rows = []
    for sid, g in samples.groupby("service_id"):
        v = sorted(g["ms"].tolist())
        i = int(np.ceil(0.95 * len(v))) - 1
        rows.append((sid, int(v[i])))
    p = pd.DataFrame(rows, columns=["service_id", "p95"])
    out = p.merge(services, on="service_id")
    return out.sort_values("service")[["service", "p95"]].reset_index(drop=True)`,
    wrong: [`def solve(services, regions, samples):
    g = samples.groupby("service_id", as_index=False)["ms"].mean().rename(columns={"ms": "p95"})
    g["p95"] = g["p95"].astype(int)
    out = g.merge(services, on="service_id")
    return out.sort_values("service")[["service", "p95"]].reset_index(drop=True)`],
    hints: ['Sort the samples and step to the rank that covers 95 per cent of them.', 'Round the rank up.'],
    why: 'A percentile is a position in the sorted samples, which is why a long tail moves it and barely moves the average.',
    mistakes: 'The mean agrees only when every sample is the same, and hides exactly the slow requests the measure exists for.' },

  { t: 'Carts Abandoned Then Recovered', tags: ['time window', 'merge', 'filtering'],
    story: 'A cart that produced no order within an hour counts as abandoned. Some of those customers come back much later and order anyway.',
    task: 'Return person, cart_id and recovered_min: the first order more than 60 minutes after the cart, for carts that were abandoned.',
    setup: `users = pd.DataFrame({"user_id": [1], "person": ["Asha"]})
carts = pd.DataFrame({"cart_id": [10], "user_id": [1], "at_min": [0]})
orders = pd.DataFrame({"order_id": [100], "cart_id": [10], "at_min": [200]})`,
    hidden: [
      `users = pd.DataFrame({"user_id": [1], "person": ["Asha"]})
carts = pd.DataFrame({"cart_id": [10], "user_id": [1], "at_min": [0]})
orders = pd.DataFrame({"order_id": [100], "cart_id": [10], "at_min": [10]})`,
      `users = pd.DataFrame({"user_id": [1, 2], "person": ["Asha", "Ben"]})
carts = pd.DataFrame({"cart_id": [10, 11], "user_id": [1, 2], "at_min": [0, 100]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "cart_id": [10, 11, 11], "at_min": [30, 400, 500]})`,
    ],
    sig: 'def solve(users: pd.DataFrame, carts: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, carts, orders):
    m = carts.merge(orders, on="cart_id", suffixes=("_c", "_o"))
    quick = set(m[m["at_min_o"] - m["at_min_c"] <= 60]["cart_id"])
    late = m[~m["cart_id"].isin(quick) & (m["at_min_o"] - m["at_min_c"] > 60)]
    g = late.groupby(["cart_id", "user_id"], as_index=False)["at_min_o"].min()
    g = g.rename(columns={"at_min_o": "recovered_min"})
    out = g.merge(users, on="user_id")
    return out.sort_values("cart_id")[["person", "cart_id", "recovered_min"]].reset_index(drop=True)`,
    wrong: [`def solve(users, carts, orders):
    m = carts.merge(orders, on="cart_id", suffixes=("_c", "_o"))
    g = m.groupby(["cart_id", "user_id"], as_index=False)["at_min_o"].min()
    g = g.rename(columns={"at_min_o": "recovered_min"})
    out = g.merge(users, on="user_id")
    return out.sort_values("cart_id")[["person", "cart_id", "recovered_min"]].reset_index(drop=True)`],
    hints: ['A cart that ordered inside the hour was never abandoned.', 'Rule those carts out before looking for the late order.'],
    why: 'Recovery only means something for a cart that was abandoned first, so the quick orders have to be excluded.',
    mistakes: 'Taking the earliest order of every cart counts a normal, immediate purchase as a recovery.' },

  { t: 'Too Little Rest Between Shifts', tags: ['shift', 'per-row threshold', 'merge'],
    story: 'Each role sets a minimum rest in minutes between the end of one shift and the start of the next.',
    task: 'Return staff, role, start_min and rest for every shift that started without enough rest.',
    setup: `roles = pd.DataFrame({"role_id": [1], "role": ["Driver"], "min_rest": [480]})
staff = pd.DataFrame({"staff_id": [1], "staff": ["Asha"], "role_id": [1]})
shifts = pd.DataFrame({"shift_id": [1, 2], "staff_id": [1, 1], "start_min": [0, 600], "end_min": [480, 900]})`,
    hidden: [
      `roles = pd.DataFrame({"role_id": [1], "role": ["Driver"], "min_rest": [100]})
staff = pd.DataFrame({"staff_id": [1], "staff": ["Asha"], "role_id": [1]})
shifts = pd.DataFrame({"shift_id": [1, 2], "staff_id": [1, 1], "start_min": [0, 600], "end_min": [480, 900]})`,
      `roles = pd.DataFrame({"role_id": [1, 2], "role": ["Driver", "Guard"], "min_rest": [480, 200]})
staff = pd.DataFrame({"staff_id": [1, 2], "staff": ["Asha", "Ben"], "role_id": [1, 2]})
shifts = pd.DataFrame({"shift_id": [1, 2, 3, 4], "staff_id": [1, 1, 2, 2], "start_min": [0, 600, 0, 700], "end_min": [480, 900, 480, 1000]})`,
    ],
    sig: 'def solve(roles: pd.DataFrame, staff: pd.DataFrame, shifts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(roles, staff, shifts):
    s = shifts.sort_values(["staff_id", "start_min"]).copy()
    s["prev_end"] = s.groupby("staff_id")["end_min"].shift()
    s["rest"] = s["start_min"] - s["prev_end"]
    m = s.merge(staff, on="staff_id").merge(roles, on="role_id")
    bad = m[m["rest"] < m["min_rest"]].copy()
    bad["rest"] = bad["rest"].astype(int)
    return bad.sort_values(["staff", "start_min"])[["staff", "role", "start_min", "rest"]].reset_index(drop=True)`,
    wrong: [`def solve(roles, staff, shifts):
    s = shifts.sort_values(["staff_id", "start_min"]).copy()
    s["prev_end"] = s.groupby("staff_id")["end_min"].shift()
    s["rest"] = s["start_min"] - s["prev_end"]
    m = s.merge(staff, on="staff_id").merge(roles, on="role_id")
    bad = m[m["rest"] < 480].copy()
    bad["rest"] = bad["rest"].astype(int)
    return bad.sort_values(["staff", "start_min"])[["staff", "role", "start_min", "rest"]].reset_index(drop=True)`],
    hints: ['The rule lives on the role.', 'The rest runs from the previous shift\'s end to this one\'s start.'],
    why: 'Joining the role brings its own minimum to each shift, so every role is judged by its own rule.',
    mistakes: 'A fixed eight hours reports breaches for a role that never promised eight hours.' },

  { t: 'Expected Arrivals Against Capacity', tags: ['expected value', 'merge', 'groupby'],
    story: 'Not everyone who books turns up. Each airline has its own show rate.',
    task: 'Return gate and expected (rounded to 2 decimals) for the gates whose expected arrivals exceed their capacity.',
    setup: `gates = pd.DataFrame({"gate_id": [1], "gate": ["A1"], "capacity": [100]})
airlines = pd.DataFrame({"airline_id": [1], "airline": ["Blue Air"]})
flights = pd.DataFrame({"flight_id": [10], "gate_id": [1], "airline_id": [1], "booked": [120]})
rates = pd.DataFrame({"airline_id": [1], "show_rate": [1.0]})`,
    hidden: [
      `gates = pd.DataFrame({"gate_id": [1], "gate": ["A1"], "capacity": [100]})
airlines = pd.DataFrame({"airline_id": [1], "airline": ["Blue Air"]})
flights = pd.DataFrame({"flight_id": [10], "gate_id": [1], "airline_id": [1], "booked": [120]})
rates = pd.DataFrame({"airline_id": [1], "show_rate": [0.8]})`,
      `gates = pd.DataFrame({"gate_id": [1, 2], "gate": ["A1", "B2"], "capacity": [100, 100]})
airlines = pd.DataFrame({"airline_id": [1, 2], "airline": ["Blue Air", "Red Jet"]})
flights = pd.DataFrame({"flight_id": [10, 11, 12], "gate_id": [1, 1, 2], "airline_id": [1, 2, 2], "booked": [80, 80, 200]})
rates = pd.DataFrame({"airline_id": [1, 2], "show_rate": [0.9, 0.5]})`,
    ],
    sig: 'def solve(gates: pd.DataFrame, airlines: pd.DataFrame, flights: pd.DataFrame, rates: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(gates, airlines, flights, rates):
    f = flights.merge(rates, on="airline_id")
    f["expected"] = f["booked"] * f["show_rate"]
    g = f.groupby("gate_id", as_index=False)["expected"].sum()
    out = g.merge(gates, on="gate_id")
    out = out[out["expected"] > out["capacity"]].copy()
    out["expected"] = out["expected"].round(2)
    return out.sort_values("gate")[["gate", "expected"]].reset_index(drop=True)`,
    wrong: [`def solve(gates, airlines, flights, rates):
    g = flights.groupby("gate_id", as_index=False)["booked"].sum().rename(columns={"booked": "expected"})
    out = g.merge(gates, on="gate_id")
    out = out[out["expected"] > out["capacity"]].copy()
    out["expected"] = out["expected"].round(2)
    return out.sort_values("gate")[["gate", "expected"]].reset_index(drop=True)`],
    hints: ['Weight each flight by its airline\'s show rate.', 'Total per gate, then compare with the capacity.'],
    why: 'Expected arrivals are bookings times the chance of turning up, which is what makes the forecast useful.',
    mistakes: 'Counting bookings raises an alarm for a gate that will be comfortably empty.' },

  { t: 'Net Exposure per Netting Set', tags: ['signed sum', 'abs', 'groupby'],
    story: 'Trades in a netting set offset each other. A buy is positive and a sell negative.',
    task: 'Return set_name and net: the size of the netted position, as a positive number.',
    setup: `sets = pd.DataFrame({"set_id": [1], "set_name": ["NS-1"]})
counterparties = pd.DataFrame({"counterparty_id": [1], "counterparty": ["Bank A"]})
trades = pd.DataFrame({"trade_id": [1, 2], "set_id": [1, 1], "counterparty_id": [1, 1], "side": ["buy", "buy"], "amount": [100, 50]})`,
    hidden: [
      `sets = pd.DataFrame({"set_id": [1], "set_name": ["NS-1"]})
counterparties = pd.DataFrame({"counterparty_id": [1], "counterparty": ["Bank A"]})
trades = pd.DataFrame({"trade_id": [1, 2], "set_id": [1, 1], "counterparty_id": [1, 1], "side": ["buy", "sell"], "amount": [100, 50]})`,
      `sets = pd.DataFrame({"set_id": [1, 2], "set_name": ["NS-1", "NS-2"]})
counterparties = pd.DataFrame({"counterparty_id": [1, 2], "counterparty": ["Bank A", "Bank B"]})
trades = pd.DataFrame({"trade_id": [1, 2, 3, 4], "set_id": [1, 1, 2, 2], "counterparty_id": [1, 1, 2, 2], "side": ["buy", "sell", "sell", "sell"], "amount": [100, 140, 30, 20]})`,
    ],
    sig: 'def solve(sets: pd.DataFrame, counterparties: pd.DataFrame, trades: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sets, counterparties, trades):
    t = trades.copy()
    t["signed"] = np.where(t["side"] == "buy", t["amount"], -t["amount"])
    g = t.groupby("set_id", as_index=False)["signed"].sum()
    g["net"] = g["signed"].abs().astype(int)
    out = g.merge(sets, on="set_id")
    return out.sort_values("set_name")[["set_name", "net"]].reset_index(drop=True)`,
    wrong: [`def solve(sets, counterparties, trades):
    g = trades.groupby("set_id", as_index=False)["amount"].sum().rename(columns={"amount": "net"})
    out = g.merge(sets, on="set_id")
    return out.sort_values("set_name")[["set_name", "net"]].reset_index(drop=True)`],
    hints: ['Sign the amounts first, add them, and take the size at the end.', 'Netting is the whole point of the set.'],
    why: 'The signed total is the position that is actually at risk once the offsetting trades cancel.',
    mistakes: 'Adding the sizes reports gross exposure, which can be many times the real figure.' },

  { t: 'Products That Fall Off the Shelf', tags: ['cumsum', 'capacity', 'merge'],
    story: 'Products are placed on a shelf in position order. Anything whose running width passes the end of the shelf will not fit.',
    task: 'Return shelf and product for every product that does not fit.',
    setup: `categories = pd.DataFrame({"category_id": [1], "category": ["Lighting"]})
shelves = pd.DataFrame({"shelf_id": [1], "shelf": ["S1"], "length_cm": [100]})
products = pd.DataFrame({"product_id": [1], "shelf_id": [1], "category_id": [1], "product": ["Floor Lamp"], "width_cm": [120], "position": [1]})`,
    hidden: [
      `categories = pd.DataFrame({"category_id": [1], "category": ["Lighting"]})
shelves = pd.DataFrame({"shelf_id": [1], "shelf": ["S1"], "length_cm": [100]})
products = pd.DataFrame({"product_id": [1, 2], "shelf_id": [1, 1], "category_id": [1, 1], "product": ["Desk Lamp", "Floor Lamp"], "width_cm": [60, 60], "position": [1, 2]})`,
      `categories = pd.DataFrame({"category_id": [1, 2], "category": ["Lighting", "Seating"]})
shelves = pd.DataFrame({"shelf_id": [1, 2], "shelf": ["S1", "S2"], "length_cm": [100, 50]})
products = pd.DataFrame({"product_id": [1, 2, 3], "shelf_id": [1, 1, 2], "category_id": [1, 1, 2], "product": ["Desk Lamp", "Wall Lamp", "Stool"], "width_cm": [40, 40, 60], "position": [1, 2, 1]})`,
    ],
    sig: 'def solve(categories: pd.DataFrame, shelves: pd.DataFrame, products: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(categories, shelves, products):
    p = products.sort_values(["shelf_id", "position"]).copy()
    p["used"] = p.groupby("shelf_id")["width_cm"].cumsum()
    m = p.merge(shelves, on="shelf_id")
    bad = m[m["used"] > m["length_cm"]]
    return bad.sort_values(["shelf", "position"])[["shelf", "product"]].reset_index(drop=True)`,
    wrong: [`def solve(categories, shelves, products):
    m = products.merge(shelves, on="shelf_id")
    bad = m[m["width_cm"] > m["length_cm"]]
    return bad.sort_values(["shelf", "position"])[["shelf", "product"]].reset_index(drop=True)`],
    hints: ['Add the widths up along the shelf.', 'A product can be narrow and still be pushed off the end.'],
    why: 'What matters is the space already taken by everything placed before it.',
    mistakes: 'Comparing a single width to the shelf only catches a product that is too wide on its own.' },

  { t: 'Machines Overdue for Service', tags: ['left merge', 'per-row threshold', 'missing values'],
    story: 'Every machine type has its own service interval in days. A machine never serviced is measured from the day it was installed. Today is day 100.',
    task: 'Return machine and days_since for every machine that is overdue.',
    setup: `types = pd.DataFrame({"type_id": [1], "type": ["Pump"], "interval_days": [30]})
machines = pd.DataFrame({"machine_id": [1], "type_id": [1], "machine": ["P-1"], "installed_day": [10]})
services = pd.DataFrame({"service_id": [1], "machine_id": [1], "day": [20]})`,
    hidden: [
      `types = pd.DataFrame({"type_id": [1], "type": ["Pump"], "interval_days": [30]})
machines = pd.DataFrame({"machine_id": [1, 2], "type_id": [1, 1], "machine": ["P-1", "P-2"], "installed_day": [10, 10]})
services = pd.DataFrame({"service_id": [1], "machine_id": [1], "day": [20]})`,
      `types = pd.DataFrame({"type_id": [1, 2], "type": ["Pump", "Fan"], "interval_days": [30, 90]})
machines = pd.DataFrame({"machine_id": [1, 2], "type_id": [1, 2], "machine": ["P-1", "F-1"], "installed_day": [10, 10]})
services = pd.DataFrame({"service_id": [1, 2], "machine_id": [1, 2], "day": [90, 20]})`,
    ],
    sig: 'def solve(types: pd.DataFrame, machines: pd.DataFrame, services: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(types, machines, services):
    last = services.groupby("machine_id", as_index=False)["day"].max()
    m = machines.merge(last, on="machine_id", how="left").merge(types, on="type_id")
    m["since_day"] = m["day"].fillna(m["installed_day"])
    m["days_since"] = (100 - m["since_day"]).astype(int)
    bad = m[m["days_since"] >= m["interval_days"]]
    return bad.sort_values("machine")[["machine", "days_since"]].reset_index(drop=True)`,
    wrong: [`def solve(types, machines, services):
    last = services.groupby("machine_id", as_index=False)["day"].max()
    m = machines.merge(last, on="machine_id").merge(types, on="type_id")
    m["days_since"] = (100 - m["day"]).astype(int)
    bad = m[m["days_since"] >= m["interval_days"]]
    return bad.sort_values("machine")[["machine", "days_since"]].reset_index(drop=True)`],
    hints: ['A machine with no service row is the one most likely overdue.', 'Keep every machine and fall back to the install day.'],
    why: 'The left merge keeps the machines with no history, which are exactly the ones a maintenance report must not lose.',
    mistakes: 'An inner merge quietly drops the machine that has never been serviced at all.' },

  { t: 'Letter Grades by Percentile Band', tags: ['percentile', 'bands', 'merge'],
    story: 'Grades are set on the curve. A student\'s percentile is the share of scores in their course at or below their own, as a number out of 100.',
    task: 'Return student and grade for every student, ordered by student.',
    setup: `bands = pd.DataFrame({"label": ["C", "B", "A"], "min_pct": [0, 51, 76], "max_pct": [50, 75, 100]})
courses = pd.DataFrame({"course_id": [1], "course": ["Statistics"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Asha", "Ben", "Chitra", "Dev"]})
scores = pd.DataFrame({"course_id": [1, 1, 1, 1], "student_id": [1, 2, 3, 4], "score": [25, 50, 75, 100]})`,
    hidden: [
      `bands = pd.DataFrame({"label": ["C", "B", "A"], "min_pct": [0, 51, 76], "max_pct": [50, 75, 100]})
courses = pd.DataFrame({"course_id": [1], "course": ["Statistics"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Asha", "Ben", "Chitra", "Dev"]})
scores = pd.DataFrame({"course_id": [1, 1, 1, 1], "student_id": [1, 2, 3, 4], "score": [10, 20, 30, 40]})`,
      `bands = pd.DataFrame({"label": ["C", "B", "A"], "min_pct": [0, 51, 76], "max_pct": [50, 75, 100]})
courses = pd.DataFrame({"course_id": [1, 2], "course": ["Statistics", "Algebra"]})
students = pd.DataFrame({"student_id": [1, 2, 3, 4], "student": ["Asha", "Ben", "Chitra", "Dev"]})
scores = pd.DataFrame({"course_id": [1, 1, 2, 2], "student_id": [1, 2, 3, 4], "score": [10, 90, 70, 95]})`,
    ],
    sig: 'def solve(bands: pd.DataFrame, courses: pd.DataFrame, students: pd.DataFrame, scores: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(bands, courses, students, scores):
    rows = []
    for cid, g in scores.groupby("course_id"):
        n = len(g)
        for sid, sc in zip(g["student_id"], g["score"]):
            pct = (g["score"] <= sc).sum() / n * 100
            band = bands[(bands["min_pct"] <= pct) & (bands["max_pct"] >= pct)]["label"].iloc[0]
            rows.append((sid, band))
    r = pd.DataFrame(rows, columns=["student_id", "grade"])
    out = r.merge(students, on="student_id")
    return out.sort_values("student")[["student", "grade"]].reset_index(drop=True)`,
    wrong: [`def solve(bands, courses, students, scores):
    rows = []
    for sid, sc in zip(scores["student_id"], scores["score"]):
        band = bands[(bands["min_pct"] <= sc) & (bands["max_pct"] >= sc)]["label"].iloc[0]
        rows.append((sid, band))
    r = pd.DataFrame(rows, columns=["student_id", "grade"])
    out = r.merge(students, on="student_id")
    return out.sort_values("student")[["student", "grade"]].reset_index(drop=True)`],
    hints: ['The bands are percentiles, not marks.', 'Work out each student\'s standing inside their own course first.'],
    why: 'A curve ranks a student against their course, so the same mark can earn different grades in different courses.',
    mistakes: 'Reading the mark as a percentile gives a whole cohort the bottom grade when the paper was hard.' },

  { t: 'Longest Row of Free Seats', tags: ['gaps and islands', 'cumsum', 'merge'],
    story: 'A booking takes a single seat. A family wants seats next to each other.',
    task: 'Return row_label and longest: the longest stretch of consecutive free seats in the row.',
    setup: `rows_df = pd.DataFrame({"row_id": [1], "row_label": ["A"]})
seats = pd.DataFrame({"seat_id": [101, 102, 103, 104, 105], "row_id": [1] * 5, "seat_no": [1, 2, 3, 4, 5]})
bookings = pd.DataFrame({"booking_id": [1], "seat_id": [101]})`,
    hidden: [
      `rows_df = pd.DataFrame({"row_id": [1], "row_label": ["A"]})
seats = pd.DataFrame({"seat_id": [101, 102, 103, 104, 105], "row_id": [1] * 5, "seat_no": [1, 2, 3, 4, 5]})
bookings = pd.DataFrame({"booking_id": [1, 2], "seat_id": [101, 103]})`,
      `rows_df = pd.DataFrame({"row_id": [1, 2], "row_label": ["A", "B"]})
seats = pd.DataFrame({"seat_id": [101, 102, 103, 201, 202, 203], "row_id": [1, 1, 1, 2, 2, 2], "seat_no": [1, 2, 3, 1, 2, 3]})
bookings = pd.DataFrame({"booking_id": [1, 2], "seat_id": [102, 201]})`,
    ],
    sig: 'def solve(rows_df: pd.DataFrame, seats: pd.DataFrame, bookings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(rows_df, seats, bookings):
    s = seats.sort_values(["row_id", "seat_no"]).copy()
    s["taken"] = s["seat_id"].isin(bookings["seat_id"]).astype(int)
    s["grp"] = s.groupby("row_id")["taken"].cumsum()
    free = s[s["taken"] == 0]
    runs = free.groupby(["row_id", "grp"], as_index=False).size()
    g = runs.groupby("row_id", as_index=False)["size"].max().rename(columns={"size": "longest"})
    out = rows_df.merge(g, on="row_id", how="left")
    out["longest"] = out["longest"].fillna(0).astype(int)
    return out.sort_values("row_label")[["row_label", "longest"]].reset_index(drop=True)`,
    wrong: [`def solve(rows_df, seats, bookings):
    s = seats.copy()
    s["taken"] = s["seat_id"].isin(bookings["seat_id"]).astype(int)
    free = s[s["taken"] == 0]
    g = free.groupby("row_id", as_index=False).size().rename(columns={"size": "longest"})
    out = rows_df.merge(g, on="row_id", how="left")
    out["longest"] = out["longest"].fillna(0).astype(int)
    return out.sort_values("row_label")[["row_label", "longest"]].reset_index(drop=True)`],
    hints: ['A running count of taken seats labels each stretch of free ones.', 'Measure the stretches, then take the biggest.'],
    why: 'Seats next to each other form a run, and only the runs answer the family\'s question.',
    mistakes: 'Counting free seats agrees only when they all happen to sit together.' },

  { t: 'Intervals Where Demand Beats Staffing', tags: ['ratio', 'per-row threshold', 'merge'],
    story: 'Each site agrees a maximum number of jobs per person in an interval.',
    task: 'Return site, at_min and ratio (rounded to 2 decimals) for every interval over the site\'s limit.',
    setup: `sites = pd.DataFrame({"site_id": [1], "site": ["Depot"], "max_ratio": [5.0]})
intervals = pd.DataFrame({"interval_id": [1], "at_min": [480]})
load = pd.DataFrame({"site_id": [1], "interval_id": [1], "demand": [60], "staff": [10]})`,
    hidden: [
      `sites = pd.DataFrame({"site_id": [1], "site": ["Depot"], "max_ratio": [8.0]})
intervals = pd.DataFrame({"interval_id": [1], "at_min": [480]})
load = pd.DataFrame({"site_id": [1], "interval_id": [1], "demand": [60], "staff": [10]})`,
      `sites = pd.DataFrame({"site_id": [1, 2], "site": ["Depot", "Yard"], "max_ratio": [5.0, 2.0]})
intervals = pd.DataFrame({"interval_id": [1, 2], "at_min": [480, 540]})
load = pd.DataFrame({"site_id": [1, 1, 2, 2], "interval_id": [1, 2, 1, 2], "demand": [60, 20, 30, 10], "staff": [10, 10, 10, 10]})`,
    ],
    sig: 'def solve(sites: pd.DataFrame, intervals: pd.DataFrame, load: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sites, intervals, load):
    m = load.merge(sites, on="site_id").merge(intervals, on="interval_id")
    m["ratio"] = m["demand"] / m["staff"]
    bad = m[m["ratio"] > m["max_ratio"]].copy()
    bad["ratio"] = bad["ratio"].round(2)
    return bad.sort_values(["site", "at_min"])[["site", "at_min", "ratio"]].reset_index(drop=True)`,
    wrong: [`def solve(sites, intervals, load):
    m = load.merge(sites, on="site_id").merge(intervals, on="interval_id")
    m["ratio"] = m["demand"] / m["staff"]
    bad = m[m["ratio"] > 5].copy()
    bad["ratio"] = bad["ratio"].round(2)
    return bad.sort_values(["site", "at_min"])[["site", "at_min", "ratio"]].reset_index(drop=True)`],
    hints: ['Each site has its own limit.', 'Compare the ratio against the column, not a constant.'],
    why: 'The agreed limit differs by site, so the comparison has to come from the site row.',
    mistakes: 'Hard-coding five is right for one site and misses or invents breaches at the others.' },

  { t: 'Leaky Water Meters', tags: ['min', 'groupby', 'merge'],
    story: 'Overnight a household should use nothing at some point. A meter whose flow never drops to zero between hours 1 and 4 is leaking.',
    task: 'Return meter, household and min_flow for every leaking meter.',
    setup: `households = pd.DataFrame({"household_id": [1], "household": ["12 Oak Street"]})
meters = pd.DataFrame({"meter_id": [1], "household_id": [1], "meter": ["M-1"]})
readings = pd.DataFrame({"reading_id": [1, 2, 3, 4], "meter_id": [1, 1, 1, 1], "hour": [1, 2, 3, 4], "flow": [3, 3, 3, 3]})`,
    hidden: [
      `households = pd.DataFrame({"household_id": [1], "household": ["12 Oak Street"]})
meters = pd.DataFrame({"meter_id": [1], "household_id": [1], "meter": ["M-1"]})
readings = pd.DataFrame({"reading_id": [1, 2, 3, 4], "meter_id": [1, 1, 1, 1], "hour": [1, 2, 3, 4], "flow": [0, 6, 6, 6]})`,
      `households = pd.DataFrame({"household_id": [1, 2], "household": ["12 Oak Street", "9 Elm Road"]})
meters = pd.DataFrame({"meter_id": [1, 2], "household_id": [1, 2], "meter": ["M-1", "M-2"]})
readings = pd.DataFrame({"reading_id": [1, 2, 3, 4, 5, 6, 7, 8], "meter_id": [1, 1, 1, 1, 2, 2, 2, 2], "hour": [1, 2, 3, 4, 1, 2, 3, 4], "flow": [2, 5, 2, 9, 0, 0, 1, 0]})`,
    ],
    sig: 'def solve(households: pd.DataFrame, meters: pd.DataFrame, readings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(households, meters, readings):
    night = readings[(readings["hour"] >= 1) & (readings["hour"] <= 4)]
    g = night.groupby("meter_id", as_index=False)["flow"].min().rename(columns={"flow": "min_flow"})
    g = g[g["min_flow"] > 0]
    out = g.merge(meters, on="meter_id").merge(households, on="household_id")
    return out.sort_values("meter")[["meter", "household", "min_flow"]].reset_index(drop=True)`,
    wrong: [`def solve(households, meters, readings):
    night = readings[(readings["hour"] >= 1) & (readings["hour"] <= 4)]
    g = night.groupby("meter_id", as_index=False)["flow"].mean().rename(columns={"flow": "min_flow"})
    g = g[g["min_flow"] > 0]
    g["min_flow"] = g["min_flow"].astype(int)
    out = g.merge(meters, on="meter_id").merge(households, on="household_id")
    return out.sort_values("meter")[["meter", "household", "min_flow"]].reset_index(drop=True)`],
    hints: ['A leak means the flow never stops.', 'The smallest reading of the night decides it.'],
    why: 'One zero reading proves the water can stop, which rules a leak out however high the other hours were.',
    mistakes: 'An average stays above zero for a household that simply used a lot of water once.' },

  { t: 'Holdings That Drifted Too Far', tags: ['share', 'tolerance', 'merge'],
    story: 'Each portfolio has a tolerance in percentage points, and each asset a target share of the portfolio.',
    task: 'Return portfolio, asset, share and drift, both rounded to 2 decimals, for every holding outside its tolerance.',
    setup: `portfolios = pd.DataFrame({"portfolio_id": [1], "portfolio": ["Balanced"], "tolerance": [5.0]})
assets = pd.DataFrame({"asset_id": [1, 2], "asset": ["Equity", "Bonds"], "target_pct": [60.0, 40.0]})
holdings = pd.DataFrame({"portfolio_id": [1, 1], "asset_id": [1, 2], "value": [700, 300]})`,
    hidden: [
      `portfolios = pd.DataFrame({"portfolio_id": [1], "portfolio": ["Balanced"], "tolerance": [15.0]})
assets = pd.DataFrame({"asset_id": [1, 2], "asset": ["Equity", "Bonds"], "target_pct": [60.0, 40.0]})
holdings = pd.DataFrame({"portfolio_id": [1, 1], "asset_id": [1, 2], "value": [700, 300]})`,
      `portfolios = pd.DataFrame({"portfolio_id": [1, 2], "portfolio": ["Balanced", "Growth"], "tolerance": [5.0, 1.0]})
assets = pd.DataFrame({"asset_id": [1, 2], "asset": ["Equity", "Bonds"], "target_pct": [60.0, 40.0]})
holdings = pd.DataFrame({"portfolio_id": [1, 1, 2, 2], "asset_id": [1, 2, 1, 2], "value": [660, 340, 630, 370]})`,
    ],
    sig: 'def solve(portfolios: pd.DataFrame, assets: pd.DataFrame, holdings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(portfolios, assets, holdings):
    h = holdings.copy()
    total = h.groupby("portfolio_id")["value"].transform("sum")
    h["share"] = h["value"] / total * 100
    m = h.merge(portfolios, on="portfolio_id").merge(assets, on="asset_id")
    m["drift"] = m["share"] - m["target_pct"]
    bad = m[m["drift"].abs() > m["tolerance"]].copy()
    bad["share"] = bad["share"].round(2)
    bad["drift"] = bad["drift"].round(2)
    return bad.sort_values(["portfolio", "asset"])[["portfolio", "asset", "share", "drift"]].reset_index(drop=True)`,
    wrong: [`def solve(portfolios, assets, holdings):
    h = holdings.copy()
    total = h.groupby("portfolio_id")["value"].transform("sum")
    h["share"] = h["value"] / total * 100
    m = h.merge(portfolios, on="portfolio_id").merge(assets, on="asset_id")
    m["drift"] = m["share"] - m["target_pct"]
    bad = m[m["drift"].abs() > 5].copy()
    bad["share"] = bad["share"].round(2)
    bad["drift"] = bad["drift"].round(2)
    return bad.sort_values(["portfolio", "asset"])[["portfolio", "asset", "share", "drift"]].reset_index(drop=True)`],
    hints: ['The share is the holding over the portfolio total.', 'The tolerance belongs to the portfolio.'],
    why: 'Each portfolio sets how far it is willing to drift, so the threshold comes from its own row.',
    mistakes: 'Five points is the right band for one mandate and the wrong one for a tighter or looser portfolio.' },

  { t: 'How Alike Are Two Viewers', tags: ['set similarity', 'pairs', 'merge'],
    story: 'Two viewers are alike when they have watched the same titles. The measure is the shared titles over all the titles either of them watched.',
    task: 'Return a, b and jaccard (rounded to 2 decimals) for every pair of viewers, with a before b in the viewer order.',
    setup: `viewers = pd.DataFrame({"viewer_id": [1, 2], "viewer": ["Asha", "Ben"]})
titles = pd.DataFrame({"title_id": [1, 2, 3], "title": ["Dune", "Heat", "Up"]})
views = pd.DataFrame({"view_id": [1, 2, 3, 4], "viewer_id": [1, 1, 2, 2], "title_id": [1, 2, 1, 2]})`,
    hidden: [
      `viewers = pd.DataFrame({"viewer_id": [1, 2], "viewer": ["Asha", "Ben"]})
titles = pd.DataFrame({"title_id": [1, 2, 3], "title": ["Dune", "Heat", "Up"]})
views = pd.DataFrame({"view_id": [1, 2, 3, 4], "viewer_id": [1, 1, 2, 2], "title_id": [1, 2, 1, 3]})`,
      `viewers = pd.DataFrame({"viewer_id": [1, 2, 3], "viewer": ["Asha", "Ben", "Chitra"]})
titles = pd.DataFrame({"title_id": [1, 2, 3], "title": ["Dune", "Heat", "Up"]})
views = pd.DataFrame({"view_id": [1, 2, 3, 4, 5], "viewer_id": [1, 1, 2, 3, 3], "title_id": [1, 2, 1, 1, 2]})`,
    ],
    sig: 'def solve(viewers: pd.DataFrame, titles: pd.DataFrame, views: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(viewers, titles, views):
    watched = {int(v): set(views[views["viewer_id"] == v]["title_id"]) for v in viewers["viewer_id"]}
    name = dict(zip(viewers["viewer_id"], viewers["viewer"]))
    ids = sorted(watched)
    rows = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            union = watched[a] | watched[b]
            inter = watched[a] & watched[b]
            rows.append((name[a], name[b], round(len(inter) / len(union), 2)))
    return pd.DataFrame(rows, columns=["a", "b", "jaccard"])`,
    wrong: [`def solve(viewers, titles, views):
    watched = {int(v): set(views[views["viewer_id"] == v]["title_id"]) for v in viewers["viewer_id"]}
    name = dict(zip(viewers["viewer_id"], viewers["viewer"]))
    ids = sorted(watched)
    rows = []
    for i, a in enumerate(ids):
        for b in ids[i + 1:]:
            inter = watched[a] & watched[b]
            rows.append((name[a], name[b], round(len(inter) / len(watched[a]), 2)))
    return pd.DataFrame(rows, columns=["a", "b", "jaccard"])`],
    hints: ['The denominator is everything either viewer watched.', 'Sets make both the overlap and the union easy.'],
    why: 'Dividing by the union keeps the measure symmetric, so the pair has one score however you order it.',
    mistakes: 'Dividing by one viewer\'s own titles gives two different answers for the same pair.' },

  { t: 'Cheapest Way to Fill the Demand', tags: ['allocation', 'cumsum', 'sorting'],
    story: 'Demand is filled from the cheapest supplier first, up to that supplier\'s capacity, then the next cheapest.',
    task: 'Return supplier, taken and cost for every supplier that supplies something, cheapest first.',
    setup: `products = pd.DataFrame({"product_id": [1], "product": ["Widget"]})
suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Acme", "Bolt"]})
offers = pd.DataFrame({"supplier_id": [1, 2], "product_id": [1, 1], "price": [5, 7], "capacity": [100, 100]})
demand = pd.DataFrame({"product_id": [1], "units": [80]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1], "product": ["Widget"]})
suppliers = pd.DataFrame({"supplier_id": [1, 2], "supplier": ["Acme", "Bolt"]})
offers = pd.DataFrame({"supplier_id": [1, 2], "product_id": [1, 1], "price": [5, 7], "capacity": [100, 100]})
demand = pd.DataFrame({"product_id": [1], "units": [150]})`,
      `products = pd.DataFrame({"product_id": [1], "product": ["Widget"]})
suppliers = pd.DataFrame({"supplier_id": [1, 2, 3], "supplier": ["Acme", "Bolt", "Crux"]})
offers = pd.DataFrame({"supplier_id": [1, 2, 3], "product_id": [1, 1, 1], "price": [9, 4, 6], "capacity": [50, 40, 30]})
demand = pd.DataFrame({"product_id": [1], "units": [90]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, suppliers: pd.DataFrame, offers: pd.DataFrame, demand: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, suppliers, offers, demand):
    need = int(demand["units"].iloc[0])
    o = offers.sort_values("price").copy()
    o["before"] = o["capacity"].cumsum() - o["capacity"]
    left = (need - o["before"]).clip(lower=0)
    o["taken"] = np.minimum(o["capacity"], left).astype(int)
    o["cost"] = (o["taken"] * o["price"]).astype(int)
    o = o[o["taken"] > 0]
    out = o.merge(suppliers, on="supplier_id")
    return out.sort_values("price")[["supplier", "taken", "cost"]].reset_index(drop=True)`,
    wrong: [`def solve(products, suppliers, offers, demand):
    need = int(demand["units"].iloc[0])
    o = offers.sort_values("price").head(1).copy()
    o["taken"] = need
    o["cost"] = (o["taken"] * o["price"]).astype(int)
    out = o.merge(suppliers, on="supplier_id")
    return out.sort_values("price")[["supplier", "taken", "cost"]].reset_index(drop=True)`],
    hints: ['A cheap supplier can only give what its capacity allows.', 'A running total of capacity says how much is still needed when a supplier\'s turn comes.'],
    why: 'The prefix of capacities in price order is exactly how much the cheaper suppliers already covered.',
    mistakes: 'Buying everything from the cheapest supplier ignores its capacity and understates the bill.' },

  { t: 'Energy Cost of Lift Journeys', tags: ['abs', 'per-row rate', 'groupby'],
    story: 'A journey costs energy per floor travelled, up or down, at a rate that depends on the lift model.',
    task: 'Return lift and kwh for every lift.',
    setup: `models = pd.DataFrame({"model_id": [1], "model": ["L200"], "kwh_per_floor": [2]})
lifts = pd.DataFrame({"lift_id": [1], "model_id": [1], "lift": ["Lift A"]})
journeys = pd.DataFrame({"journey_id": [1, 2], "lift_id": [1, 1], "from_floor": [0, 0], "to_floor": [5, 3]})`,
    hidden: [
      `models = pd.DataFrame({"model_id": [1], "model": ["L200"], "kwh_per_floor": [2]})
lifts = pd.DataFrame({"lift_id": [1], "model_id": [1], "lift": ["Lift A"]})
journeys = pd.DataFrame({"journey_id": [1, 2], "lift_id": [1, 1], "from_floor": [5, 3], "to_floor": [0, 0]})`,
      `models = pd.DataFrame({"model_id": [1, 2], "model": ["L200", "L400"], "kwh_per_floor": [2, 5]})
lifts = pd.DataFrame({"lift_id": [1, 2], "model_id": [1, 2], "lift": ["Lift A", "Lift B"]})
journeys = pd.DataFrame({"journey_id": [1, 2, 3, 4], "lift_id": [1, 1, 2, 2], "from_floor": [0, 4, 2, 7], "to_floor": [4, 1, 7, 2]})`,
    ],
    sig: 'def solve(models: pd.DataFrame, lifts: pd.DataFrame, journeys: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(models, lifts, journeys):
    j = journeys.copy()
    j["floors"] = (j["to_floor"] - j["from_floor"]).abs()
    m = j.merge(lifts, on="lift_id").merge(models, on="model_id")
    m["kwh"] = m["floors"] * m["kwh_per_floor"]
    g = m.groupby("lift", as_index=False)["kwh"].sum()
    g["kwh"] = g["kwh"].astype(int)
    return g.sort_values("lift").reset_index(drop=True)`,
    wrong: [`def solve(models, lifts, journeys):
    j = journeys.copy()
    j["floors"] = j["to_floor"] - j["from_floor"]
    m = j.merge(lifts, on="lift_id").merge(models, on="model_id")
    m["kwh"] = m["floors"] * m["kwh_per_floor"]
    g = m.groupby("lift", as_index=False)["kwh"].sum()
    g["kwh"] = g["kwh"].astype(int)
    return g.sort_values("lift").reset_index(drop=True)`],
    hints: ['Going down costs energy too.', 'Take the size of the floor difference.'],
    why: 'Distance travelled has no sign, so the difference has to be taken as a magnitude.',
    mistakes: 'A signed difference subtracts the downward journeys and can report a lift that used no energy at all.' },

  { t: 'Orders Waiting on One Missing Part', tags: ['groupby', 'merge', 'counting'],
    story: 'An order ships once every line can be filled from stock. Some orders are held up by a single part.',
    task: 'Return order_id and part for the orders with exactly one line that cannot be filled.',
    setup: `parts = pd.DataFrame({"part_id": [1, 2], "part": ["Bolt", "Nut"]})
orders = pd.DataFrame({"order_id": [100], "customer": ["Asha"]})
lines = pd.DataFrame({"order_id": [100, 100], "part_id": [1, 2], "qty": [5, 2]})
stock = pd.DataFrame({"part_id": [1, 2], "on_hand": [0, 10]})`,
    hidden: [
      `parts = pd.DataFrame({"part_id": [1, 2], "part": ["Bolt", "Nut"]})
orders = pd.DataFrame({"order_id": [100], "customer": ["Asha"]})
lines = pd.DataFrame({"order_id": [100, 100], "part_id": [1, 2], "qty": [5, 2]})
stock = pd.DataFrame({"part_id": [1, 2], "on_hand": [0, 0]})`,
      `parts = pd.DataFrame({"part_id": [1, 2], "part": ["Bolt", "Nut"]})
orders = pd.DataFrame({"order_id": [100, 101], "customer": ["Asha", "Ben"]})
lines = pd.DataFrame({"order_id": [100, 100, 101, 101], "part_id": [1, 2, 1, 2], "qty": [5, 2, 1, 1]})
stock = pd.DataFrame({"part_id": [1, 2], "on_hand": [3, 0]})`,
    ],
    sig: 'def solve(parts: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame, stock: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(parts, orders, lines, stock):
    m = lines.merge(stock, on="part_id")
    short = m[m["qty"] > m["on_hand"]]
    counts = short.groupby("order_id", as_index=False).size()
    only = counts[counts["size"] == 1]["order_id"]
    out = short[short["order_id"].isin(only)].merge(parts, on="part_id")
    return out.sort_values("order_id")[["order_id", "part"]].reset_index(drop=True)`,
    wrong: [`def solve(parts, orders, lines, stock):
    m = lines.merge(stock, on="part_id")
    short = m[m["qty"] > m["on_hand"]]
    out = short.merge(parts, on="part_id")
    return out.sort_values("order_id")[["order_id", "part"]].reset_index(drop=True)`],
    hints: ['Count the short lines per order before reporting any of them.', 'Only the orders with exactly one belong in the answer.'],
    why: 'An order held up by one part is nearly ready, which is why the count per order is the filter.',
    mistakes: 'Listing every short line reports an order that is missing half its parts as a quick win.' },

  { t: 'Repeat Donors Who Increased Their Gift', tags: ['shift', 'groupby', 'merge'],
    story: 'Gifts are dated. The fundraising team wants the donors whose latest gift beat the one immediately before it.',
    task: 'Return donor, previous and latest for every such donor.',
    setup: `campaigns = pd.DataFrame({"campaign_id": [1], "campaign": ["Spring Appeal"]})
donors = pd.DataFrame({"donor_id": [1], "donor": ["Asha"]})
gifts = pd.DataFrame({"gift_id": [1, 2], "donor_id": [1, 1], "campaign_id": [1, 1], "day": [1, 2], "amount": [50, 80]})`,
    hidden: [
      `campaigns = pd.DataFrame({"campaign_id": [1], "campaign": ["Spring Appeal"]})
donors = pd.DataFrame({"donor_id": [1], "donor": ["Asha"]})
gifts = pd.DataFrame({"gift_id": [1, 2, 3], "donor_id": [1, 1, 1], "campaign_id": [1, 1, 1], "day": [1, 2, 3], "amount": [50, 100, 80]})`,
      `campaigns = pd.DataFrame({"campaign_id": [1, 2], "campaign": ["Spring Appeal", "Winter Appeal"]})
donors = pd.DataFrame({"donor_id": [1, 2], "donor": ["Asha", "Ben"]})
gifts = pd.DataFrame({"gift_id": [1, 2, 3, 4], "donor_id": [1, 1, 2, 2], "campaign_id": [1, 2, 1, 2], "day": [1, 5, 2, 6], "amount": [50, 90, 70, 60]})`,
    ],
    sig: 'def solve(campaigns: pd.DataFrame, donors: pd.DataFrame, gifts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(campaigns, donors, gifts):
    g = gifts.sort_values(["donor_id", "day"]).copy()
    g["prev"] = g.groupby("donor_id")["amount"].shift()
    last = g.groupby("donor_id", as_index=False).tail(1)
    up = last[last["amount"] > last["prev"]].copy()
    up["previous"] = up["prev"].astype(int)
    up["latest"] = up["amount"].astype(int)
    out = up.merge(donors, on="donor_id")
    return out.sort_values("donor")[["donor", "previous", "latest"]].reset_index(drop=True)`,
    wrong: [`def solve(campaigns, donors, gifts):
    g = gifts.sort_values(["donor_id", "day"]).copy()
    lo = g.groupby("donor_id", as_index=False)["amount"].min().rename(columns={"amount": "previous"})
    last = g.groupby("donor_id", as_index=False).tail(1)[["donor_id", "amount"]].rename(columns={"amount": "latest"})
    m = lo.merge(last, on="donor_id")
    up = m[m["latest"] > m["previous"]]
    out = up.merge(donors, on="donor_id")
    return out.sort_values("donor")[["donor", "previous", "latest"]].reset_index(drop=True)`],
    hints: ['Compare the latest gift with the one just before it in date order.', 'A shift inside the donor gives that gift.'],
    why: 'The question is about the most recent change, so the comparison is against the immediately preceding gift.',
    mistakes: 'Using the donor\'s smallest gift calls a falling donor an increase, because the floor was set years ago.' },
];
