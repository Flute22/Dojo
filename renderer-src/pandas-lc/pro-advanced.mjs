// Pandas, interview-grade set: Advanced. Whiteboard puzzles: recursion to a fixpoint, sweep lines, FIFO allocation,
// interval merging, multi-level tie-breaks. Expect 30 minutes or more each, across four or more tables.
export default [
  { t: 'Explode a Bill of Materials', tags: ['iterative expansion', 'merge', 'left join'],
    story: 'A product is built from sub-assemblies, which are built from other parts, down to the parts that are bought in. A part with no children of its own is bought in. Each bill-of-materials row says how many of the child go into one of the parent.',
    task: 'For every build order return build, part, gross_need, to_buy (after using what is on hand) and lead_days (the longest supplier lead time for that part).',
    setup: `products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5, 6], "product": ["Bike", "Frame", "Wheel", "Tube", "Steel", "Spoke"]})
bom = pd.DataFrame({
    "parent_id": [1, 1, 2, 3, 3],
    "child_id": [2, 3, 5, 4, 6],
    "qty": [1, 1, 1, 1, 1],
})
inventory = pd.DataFrame({"product_id": [4, 5, 6], "on_hand": [1, 0, 2]})
suppliers = pd.DataFrame({
    "product_id": [4, 4, 5, 6],
    "supplier": ["Alpha", "Beta", "Gamma", "Delta"],
    "lead_days": [5, 9, 3, 7],
})
build_orders = pd.DataFrame({"product_id": [1], "qty": [1]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5, 6], "product": ["Bike", "Frame", "Wheel", "Tube", "Steel", "Spoke"]})
bom = pd.DataFrame({"parent_id": [1, 1, 2, 3, 3], "child_id": [2, 3, 5, 4, 6], "qty": [1, 2, 3, 1, 2]})
inventory = pd.DataFrame({"product_id": [4, 5, 6], "on_hand": [1, 0, 2]})
suppliers = pd.DataFrame({"product_id": [4, 4, 5, 6], "supplier": ["Alpha", "Beta", "Gamma", "Delta"], "lead_days": [5, 9, 3, 7]})
build_orders = pd.DataFrame({"product_id": [1], "qty": [1]})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5, 6], "product": ["Bike", "Frame", "Wheel", "Tube", "Steel", "Spoke"]})
bom = pd.DataFrame({"parent_id": [1, 1, 2, 3, 3], "child_id": [2, 3, 5, 4, 6], "qty": [1, 1, 1, 1, 1]})
inventory = pd.DataFrame({"product_id": [4, 5, 6], "on_hand": [1, 0, 2]})
suppliers = pd.DataFrame({"product_id": [4, 4, 5, 6], "supplier": ["Alpha", "Beta", "Gamma", "Delta"], "lead_days": [5, 9, 3, 7]})
build_orders = pd.DataFrame({"product_id": [1], "qty": [2]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, bom: pd.DataFrame, inventory: pd.DataFrame, suppliers: pd.DataFrame, build_orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, bom, inventory, suppliers, build_orders):
    level = pd.DataFrame({
        "root": build_orders["product_id"],
        "pid": build_orders["product_id"],
        "q": build_orders["qty"],
    })
    levels = [level]
    while True:
        nxt = levels[-1].merge(bom, left_on="pid", right_on="parent_id")
        if nxt.empty:
            break
        levels.append(pd.DataFrame({"root": nxt["root"], "pid": nxt["child_id"], "q": nxt["q"] * nxt["qty"]}))
    ex = pd.concat(levels, ignore_index=True)
    ex = ex[~ex["pid"].isin(bom["parent_id"])]
    g = ex.groupby(["root", "pid"], as_index=False)["q"].sum().rename(columns={"q": "gross_need"})
    g = g.merge(inventory, left_on="pid", right_on="product_id", how="left")
    g["on_hand"] = g["on_hand"].fillna(0)
    g["to_buy"] = (g["gross_need"] - g["on_hand"]).clip(lower=0).astype(int)
    lead = suppliers.groupby("product_id", as_index=False)["lead_days"].max()
    g = g.merge(lead, left_on="pid", right_on="product_id", how="left", suffixes=("", "_s"))
    g = g.merge(products, left_on="root", right_on="product_id").rename(columns={"product": "build"})
    g = g.merge(products, left_on="pid", right_on="product_id").rename(columns={"product": "part"})
    return g[["build", "part", "gross_need", "to_buy", "lead_days"]].reset_index(drop=True)`,
    wrong: [`def solve(products, bom, inventory, suppliers, build_orders):
    level = pd.DataFrame({
        "root": build_orders["product_id"],
        "pid": build_orders["product_id"],
        "q": build_orders["qty"],
    })
    levels = [level]
    while True:
        nxt = levels[-1].merge(bom, left_on="pid", right_on="parent_id")
        if nxt.empty:
            break
        levels.append(pd.DataFrame({"root": nxt["root"], "pid": nxt["child_id"], "q": nxt["qty"]}))
    ex = pd.concat(levels, ignore_index=True)
    ex = ex[~ex["pid"].isin(bom["parent_id"])]
    g = ex.groupby(["root", "pid"], as_index=False)["q"].sum().rename(columns={"q": "gross_need"})
    g = g.merge(inventory, left_on="pid", right_on="product_id", how="left")
    g["on_hand"] = g["on_hand"].fillna(0)
    g["to_buy"] = (g["gross_need"] - g["on_hand"]).clip(lower=0).astype(int)
    lead = suppliers.groupby("product_id", as_index=False)["lead_days"].max()
    g = g.merge(lead, left_on="pid", right_on="product_id", how="left", suffixes=("", "_s"))
    g = g.merge(products, left_on="root", right_on="product_id").rename(columns={"product": "build"})
    g = g.merge(products, left_on="pid", right_on="product_id").rename(columns={"product": "part"})
    return g[["build", "part", "gross_need", "to_buy", "lead_days"]].reset_index(drop=True)`],
    hints: ['Expand one level at a time and carry the running quantity with you.', 'A part is bought in when it never appears as a parent.'],
    why: 'Each level multiplies the quantity needed so far by the quantity on the edge, so a part reached through two sub-assemblies is added up by the final groupby.',
    mistakes: 'Keeping only the edge quantity loses every multiplier above it, which looks right while all the quantities happen to be 1.' },

  { t: 'Fewest Hops to a Flagged Account', tags: ['graph search', 'time ordering', 'cycle guard'],
    story: 'Money moves between accounts on numbered days. A chain of transfers only makes sense if each transfer happens strictly after the one that fed it, and a chain never passes through the same account twice.',
    task: 'Starting from account 1, return bank, holder and hops for every flagged account money can reach, where hops is the fewest transfers needed.',
    setup: `banks = pd.DataFrame({"bank_id": [1, 2], "bank": ["Northbank", "Seabank"]})
accounts = pd.DataFrame({
    "account_id": [1, 2, 3, 4, 5],
    "bank_id": [1, 1, 2, 2, 1],
    "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"],
})
transfers = pd.DataFrame({
    "transfer_id": [1, 2, 3, 4, 5],
    "src": [1, 2, 3, 1, 5],
    "dst": [2, 3, 4, 5, 4],
    "day": [1, 2, 3, 1, 4],
    "amount": [5000, 4000, 3500, 2000, 1800],
})
flags = pd.DataFrame({"account_id": [4], "reason": ["sanctions list"]})`,
    hidden: [
      `banks = pd.DataFrame({"bank_id": [1, 2], "bank": ["Northbank", "Seabank"]})
accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "bank_id": [1, 1, 2, 2, 1], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
transfers = pd.DataFrame({"transfer_id": [1, 2, 3, 4, 5], "src": [1, 2, 3, 1, 5], "dst": [2, 3, 4, 5, 4], "day": [1, 2, 3, 5, 2], "amount": [5000, 4000, 3500, 2000, 1800]})
flags = pd.DataFrame({"account_id": [4], "reason": ["sanctions list"]})`,
      `banks = pd.DataFrame({"bank_id": [1, 2], "bank": ["Northbank", "Seabank"]})
accounts = pd.DataFrame({"account_id": [1, 2, 3, 4, 5], "bank_id": [1, 1, 2, 2, 1], "holder": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
transfers = pd.DataFrame({"transfer_id": [1, 2, 3, 4, 5], "src": [1, 2, 3, 1, 5], "dst": [2, 3, 4, 5, 4], "day": [1, 2, 3, 1, 4], "amount": [5000, 4000, 3500, 2000, 1800]})
flags = pd.DataFrame({"account_id": [3], "reason": ["sanctions list"]})`,
    ],
    sig: 'def solve(banks: pd.DataFrame, accounts: pd.DataFrame, transfers: pd.DataFrame, flags: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(banks, accounts, transfers, flags):
    edges = list(zip(transfers["src"], transfers["dst"], transfers["day"]))
    best = {}
    stack = [(1, 0, (1,), 0)]
    while stack:
        acct, day, seen, hops = stack.pop()
        for s, d, dy in edges:
            if s != acct or dy <= day or d in seen:
                continue
            if hops + 1 < best.get(d, 10 ** 9):
                best[d] = hops + 1
            stack.append((d, dy, seen + (d,), hops + 1))
    hit = flags[flags["account_id"].isin(best.keys())].copy()
    hit["hops"] = [best[a] for a in hit["account_id"]]
    out = hit.merge(accounts, on="account_id").merge(banks, on="bank_id")
    return out[["bank", "holder", "hops"]].reset_index(drop=True)`,
    wrong: [`def solve(banks, accounts, transfers, flags):
    edges = list(zip(transfers["src"], transfers["dst"], transfers["day"]))
    best = {}
    stack = [(1, (1,), 0)]
    while stack:
        acct, seen, hops = stack.pop()
        for s, d, dy in edges:
            if s != acct or d in seen:
                continue
            if hops + 1 < best.get(d, 10 ** 9):
                best[d] = hops + 1
            stack.append((d, seen + (d,), hops + 1))
    hit = flags[flags["account_id"].isin(best.keys())].copy()
    hit["hops"] = [best[a] for a in hit["account_id"]]
    out = hit.merge(accounts, on="account_id").merge(banks, on="bank_id")
    return out[["bank", "holder", "hops"]].reset_index(drop=True)`],
    hints: ['Carry the day of the last transfer and the accounts already visited along with each partial chain.', 'The visited set is what stops a cycle from looping forever.'],
    why: 'The day travels with the chain so the next transfer can be required to be later, and the visited accounts keep the search finite.',
    mistakes: 'Dropping the day finds shortcuts that run backwards in time, which no money could actually take.' },

  { t: 'Peak Occupancy per Ward', tags: ['sweep line', 'cumsum', 'intervals'],
    story: 'A stay occupies a bed from the minute the patient arrives until the minute they leave, and the leaving minute is already free for the next patient.',
    task: 'Return ward, peak, at_min (the earliest minute the peak is reached) and patients (how many different patients stayed there) for every ward.',
    setup: `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "Maternity"], "beds": [3, 2]})
patients = pd.DataFrame({"patient_id": [1, 2, 3, 4, 5], "patient": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
stays = pd.DataFrame({
    "stay_id": [1, 2, 3, 4, 5],
    "patient_id": [1, 2, 3, 4, 5],
    "ward_id": [1, 1, 1, 2, 2],
    "in_min": [0, 50, 200, 0, 70],
    "out_min": [100, 150, 300, 60, 120],
})`,
    hidden: [
      `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "Maternity"], "beds": [3, 2]})
patients = pd.DataFrame({"patient_id": [1, 2, 3, 4, 5], "patient": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4, 5], "patient_id": [1, 2, 3, 4, 5], "ward_id": [1, 1, 1, 2, 2], "in_min": [0, 50, 200, 0, 60], "out_min": [100, 150, 300, 60, 120]})`,
      `wards = pd.DataFrame({"ward_id": [1, 2], "ward": ["Intensive Care", "Maternity"], "beds": [3, 2]})
patients = pd.DataFrame({"patient_id": [1, 2, 3, 4, 5], "patient": ["Asha", "Ben", "Chitra", "Dev", "Esha"]})
stays = pd.DataFrame({"stay_id": [1, 2, 3, 4, 5], "patient_id": [1, 2, 3, 4, 5], "ward_id": [1, 1, 1, 2, 2], "in_min": [0, 50, 60, 0, 70], "out_min": [100, 150, 300, 60, 120]})`,
    ],
    sig: 'def solve(wards: pd.DataFrame, patients: pd.DataFrame, stays: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(wards, patients, stays):
    ins = stays[["ward_id", "in_min"]].rename(columns={"in_min": "t"}).assign(d=1)
    outs = stays[["ward_id", "out_min"]].rename(columns={"out_min": "t"}).assign(d=-1)
    ev = pd.concat([ins, outs], ignore_index=True).sort_values(["ward_id", "t", "d"])
    ev["cur"] = ev.groupby("ward_id")["d"].cumsum()
    peak = ev.groupby("ward_id", as_index=False)["cur"].max().rename(columns={"cur": "peak"})
    hit = ev.merge(peak, on="ward_id")
    hit = hit[hit["cur"] == hit["peak"]]
    at = hit.groupby("ward_id", as_index=False)["t"].min().rename(columns={"t": "at_min"})
    n = stays.groupby("ward_id", as_index=False)["patient_id"].nunique().rename(columns={"patient_id": "patients"})
    out = peak.merge(at, on="ward_id").merge(n, on="ward_id").merge(wards, on="ward_id")
    return out[["ward", "peak", "at_min", "patients"]].reset_index(drop=True)`,
    wrong: [`def solve(wards, patients, stays):
    ins = stays[["ward_id", "in_min"]].rename(columns={"in_min": "t"}).assign(d=1)
    outs = stays[["ward_id", "out_min"]].rename(columns={"out_min": "t"}).assign(d=-1)
    ev = pd.concat([ins, outs], ignore_index=True).sort_values(["ward_id", "t", "d"], ascending=[True, True, False])
    ev["cur"] = ev.groupby("ward_id")["d"].cumsum()
    peak = ev.groupby("ward_id", as_index=False)["cur"].max().rename(columns={"cur": "peak"})
    hit = ev.merge(peak, on="ward_id")
    hit = hit[hit["cur"] == hit["peak"]]
    at = hit.groupby("ward_id", as_index=False)["t"].min().rename(columns={"t": "at_min"})
    n = stays.groupby("ward_id", as_index=False)["patient_id"].nunique().rename(columns={"patient_id": "patients"})
    out = peak.merge(at, on="ward_id").merge(n, on="ward_id").merge(wards, on="ward_id")
    return out[["ward", "peak", "at_min", "patients"]].reset_index(drop=True)`],
    hints: ['Turn every stay into an arrival of +1 and a departure of -1, then run a cumulative sum along the timeline.', 'At the same minute, which event has to be applied first?'],
    why: 'The running total after each event is the occupancy, and its maximum is the peak. Sorting the delta ascending applies departures before arrivals at the same minute, which is what an exclusive leaving time means.',
    mistakes: 'Applying arrivals first at the same minute makes a hand-over look like an overlap and reports a peak that never happened.' },

  { t: 'Cheapest Route With Legal Connections', tags: ['graph search', 'per-row threshold', 'loops'],
    story: 'All flights run on the same day, with times as minute counts. A passenger changing planes needs at least the connecting airport\'s published minimum, and never visits the same airport twice.',
    task: 'For every request return request_id, from_ap, to_ap and cheapest: the lowest total price of a journey of at most three flights that respects every connection minimum.',
    setup: `airports = pd.DataFrame({
    "code": ["A", "B", "C", "D"],
    "city": ["Alphaville", "Betatown", "Gammacity", "Deltaport"],
    "min_connect": [45, 45, 45, 45],
})
flights = pd.DataFrame({
    "flight_id": [1, 2, 3, 4, 5],
    "from_ap": ["A", "B", "A", "C", "A"],
    "to_ap": ["B", "D", "C", "D", "D"],
    "dep_min": [100, 300, 100, 250, 90],
    "arr_min": [200, 400, 200, 350, 500],
    "price": [50, 50, 60, 10, 200],
})
requests = pd.DataFrame({"request_id": [1], "from_ap": ["A"], "to_ap": ["D"]})`,
    hidden: [
      `airports = pd.DataFrame({"code": ["A", "B", "C", "D"], "city": ["Alphaville", "Betatown", "Gammacity", "Deltaport"], "min_connect": [45, 45, 90, 45]})
flights = pd.DataFrame({"flight_id": [1, 2, 3, 4, 5], "from_ap": ["A", "B", "A", "C", "A"], "to_ap": ["B", "D", "C", "D", "D"], "dep_min": [100, 300, 100, 250, 90], "arr_min": [200, 400, 200, 350, 500], "price": [50, 50, 60, 10, 200]})
requests = pd.DataFrame({"request_id": [1], "from_ap": ["A"], "to_ap": ["D"]})`,
      `airports = pd.DataFrame({"code": ["A", "B", "C", "D"], "city": ["Alphaville", "Betatown", "Gammacity", "Deltaport"], "min_connect": [45, 45, 45, 45]})
flights = pd.DataFrame({"flight_id": [1, 2, 3, 4, 5], "from_ap": ["A", "B", "A", "C", "A"], "to_ap": ["B", "D", "C", "D", "D"], "dep_min": [100, 300, 100, 250, 90], "arr_min": [200, 400, 200, 350, 500], "price": [50, 50, 60, 5, 200]})
requests = pd.DataFrame({"request_id": [1], "from_ap": ["A"], "to_ap": ["D"]})`,
    ],
    sig: 'def solve(airports: pd.DataFrame, flights: pd.DataFrame, requests: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(airports, flights, requests):
    mc = dict(zip(airports["code"], airports["min_connect"]))
    legs = list(zip(flights["from_ap"], flights["to_ap"], flights["dep_min"], flights["arr_min"], flights["price"]))
    rows = []
    for _, rq in requests.iterrows():
        best = None
        stack = [(rq["from_ap"], -1, 0, 0, (rq["from_ap"],))]
        while stack:
            ap, arr, cost, nlegs, seen = stack.pop()
            if ap == rq["to_ap"] and nlegs > 0:
                best = cost if best is None else min(best, cost)
            if nlegs == 3:
                continue
            for f_from, f_to, dep, f_arr, price in legs:
                if f_from != ap or f_to in seen:
                    continue
                if nlegs > 0 and dep - arr < mc[ap]:
                    continue
                stack.append((f_to, f_arr, cost + price, nlegs + 1, seen + (f_to,)))
        rows.append((rq["request_id"], rq["from_ap"], rq["to_ap"], best))
    return pd.DataFrame(rows, columns=["request_id", "from_ap", "to_ap", "cheapest"])`,
    wrong: [`def solve(airports, flights, requests):
    legs = list(zip(flights["from_ap"], flights["to_ap"], flights["dep_min"], flights["arr_min"], flights["price"]))
    rows = []
    for _, rq in requests.iterrows():
        best = None
        stack = [(rq["from_ap"], -1, 0, 0, (rq["from_ap"],))]
        while stack:
            ap, arr, cost, nlegs, seen = stack.pop()
            if ap == rq["to_ap"] and nlegs > 0:
                best = cost if best is None else min(best, cost)
            if nlegs == 3:
                continue
            for f_from, f_to, dep, f_arr, price in legs:
                if f_from != ap or f_to in seen:
                    continue
                if nlegs > 0 and dep <= arr:
                    continue
                stack.append((f_to, f_arr, cost + price, nlegs + 1, seen + (f_to,)))
        rows.append((rq["request_id"], rq["from_ap"], rq["to_ap"], best))
    return pd.DataFrame(rows, columns=["request_id", "from_ap", "to_ap", "cheapest"])`],
    hints: ['Grow partial journeys: where you are, when you landed, what you have paid, which airports you have used.', 'The minimum that matters is the one at the airport you are standing in.'],
    why: 'The connection test compares the next departure with the arrival being held, against the minimum of the current airport, so that lookup has to happen inside the search.',
    mistakes: 'Requiring only a later departure buys an itinerary nobody could actually fly.' },

  { t: 'Monthly Revenue Movement', tags: ['cross merge', 'shift', 'cohort'], o: true,
    story: 'A customer\'s monthly revenue is the price of the plan they are on at the end of the month. A plan change is one subscription ending and another starting, and a subscription with no end day is still running.',
    task: 'Return month, new_mrr, expansion, contraction and churn for every month, ordered by month. Expansion and contraction are the size of the change, not the new amount.',
    setup: `months = pd.DataFrame({
    "seq": [1, 2, 3],
    "month": ["2024-01", "2024-02", "2024-03"],
    "last_day": ["2024-01-31", "2024-02-29", "2024-03-31"],
})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
plans = pd.DataFrame({"plan_id": [10, 11, 12], "plan": ["Basic", "Plus", "Pro"], "price": [300, 600, 1200]})
subscriptions = pd.DataFrame({
    "sub_id": [100, 101, 102, 103],
    "customer_id": [1, 1, 2, 3],
    "plan_id": [10, 11, 11, 12],
    "start_day": ["2024-01-05", "2024-02-10", "2024-01-10", "2024-03-01"],
    "end_day": ["2024-02-10", None, "2024-02-20", None],
})`,
    hidden: [
      `months = pd.DataFrame({"seq": [1, 2, 3], "month": ["2024-01", "2024-02", "2024-03"], "last_day": ["2024-01-31", "2024-02-29", "2024-03-31"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
plans = pd.DataFrame({"plan_id": [10, 11, 12], "plan": ["Basic", "Plus", "Pro"], "price": [300, 600, 1200]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102, 103], "customer_id": [1, 1, 2, 3], "plan_id": [10, 11, 11, 12], "start_day": ["2024-01-05", "2024-02-10", "2024-01-10", "2024-03-01"], "end_day": ["2024-02-10", None, "2024-02-29", None]})`,
      `months = pd.DataFrame({"seq": [1, 2, 3], "month": ["2024-01", "2024-02", "2024-03"], "last_day": ["2024-01-31", "2024-02-29", "2024-03-31"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"]})
plans = pd.DataFrame({"plan_id": [10, 11, 12], "plan": ["Basic", "Plus", "Pro"], "price": [300, 600, 1200]})
subscriptions = pd.DataFrame({"sub_id": [100, 101, 102, 103], "customer_id": [1, 1, 2, 3], "plan_id": [11, 10, 11, 12], "start_day": ["2024-01-05", "2024-02-10", "2024-01-10", "2024-03-01"], "end_day": ["2024-02-10", None, "2024-02-20", None]})`,
    ],
    sig: 'def solve(months: pd.DataFrame, customers: pd.DataFrame, plans: pd.DataFrame, subscriptions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(months, customers, plans, subscriptions):
    sm = subscriptions.merge(plans, on="plan_id").merge(months, how="cross")
    live = sm[(sm["start_day"] <= sm["last_day"]) & (sm["end_day"].isna() | (sm["end_day"] > sm["last_day"]))]
    cur = live.groupby(["seq", "month", "customer_id"], as_index=False)["price"].sum()
    grid = months[["seq", "month"]].merge(customers[["customer_id"]], how="cross")
    g = grid.merge(cur, on=["seq", "month", "customer_id"], how="left")
    g["price"] = g["price"].fillna(0)
    prev = g[["seq", "customer_id", "price"]].copy()
    prev["seq"] = prev["seq"] + 1
    prev = prev.rename(columns={"price": "prev"})
    j = g.merge(prev, on=["seq", "customer_id"], how="left")
    j["prev"] = j["prev"].fillna(0)
    j["new_mrr"] = np.where((j["prev"] == 0) & (j["price"] > 0), j["price"], 0)
    j["expansion"] = np.where((j["prev"] > 0) & (j["price"] > j["prev"]), j["price"] - j["prev"], 0)
    j["contraction"] = np.where((j["price"] > 0) & (j["price"] < j["prev"]), j["prev"] - j["price"], 0)
    j["churn"] = np.where((j["prev"] > 0) & (j["price"] == 0), j["prev"], 0)
    out = j.groupby("month", as_index=False)[["new_mrr", "expansion", "contraction", "churn"]].sum()
    for c in ["new_mrr", "expansion", "contraction", "churn"]:
        out[c] = out[c].astype(int)
    return out.sort_values("month").reset_index(drop=True)`,
    wrong: [`def solve(months, customers, plans, subscriptions):
    sm = subscriptions.merge(plans, on="plan_id").merge(months, how="cross")
    live = sm[(sm["start_day"] <= sm["last_day"]) & (sm["end_day"].isna() | (sm["end_day"] >= sm["last_day"]))]
    cur = live.groupby(["seq", "month", "customer_id"], as_index=False)["price"].sum()
    grid = months[["seq", "month"]].merge(customers[["customer_id"]], how="cross")
    g = grid.merge(cur, on=["seq", "month", "customer_id"], how="left")
    g["price"] = g["price"].fillna(0)
    prev = g[["seq", "customer_id", "price"]].copy()
    prev["seq"] = prev["seq"] + 1
    prev = prev.rename(columns={"price": "prev"})
    j = g.merge(prev, on=["seq", "customer_id"], how="left")
    j["prev"] = j["prev"].fillna(0)
    j["new_mrr"] = np.where((j["prev"] == 0) & (j["price"] > 0), j["price"], 0)
    j["expansion"] = np.where((j["prev"] > 0) & (j["price"] > j["prev"]), j["price"] - j["prev"], 0)
    j["contraction"] = np.where((j["price"] > 0) & (j["price"] < j["prev"]), j["prev"] - j["price"], 0)
    j["churn"] = np.where((j["prev"] > 0) & (j["price"] == 0), j["prev"], 0)
    out = j.groupby("month", as_index=False)[["new_mrr", "expansion", "contraction", "churn"]].sum()
    for c in ["new_mrr", "expansion", "contraction", "churn"]:
        out[c] = out[c].astype(int)
    return out.sort_values("month").reset_index(drop=True)`],
    hints: ['Build one revenue number per customer per month, zero included, before comparing anything.', 'Shifting the month sequence by one turns "last month" into a merge key.'],
    why: 'A cross merge of months and customers gives a complete grid, so a customer who leaves still has a zero row to compare against, and the four movements are four conditions on the same two numbers.',
    mistakes: 'Whether a subscription ending on the last day of the month still counts decides which month the churn lands in, so that comparison has to be strictly after the month end.' },

  { t: 'Cost of Goods Sold, FIFO', tags: ['cumsum', 'allocation', 'merge'],
    story: 'Stock arrives in lots, each with its own unit cost, and is shipped out oldest lot first. Only shipments from the North region are in this report, and the warehouse never ships more than it received.',
    task: 'Return product and cogs: the cost of the goods shipped from North, taking units from the oldest lots first.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "product": ["Widget", "Gadget"]})
warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
lots = pd.DataFrame({
    "lot_id": [1, 2, 3, 4],
    "product_id": [1, 1, 2, 2],
    "received_day": ["2024-01-01", "2024-02-01", "2024-01-05", "2024-02-05"],
    "qty": [10, 10, 5, 5],
    "unit_cost": [5, 5, 8, 8],
})
shipments = pd.DataFrame({
    "shipment_id": [100, 101, 102],
    "product_id": [1, 2, 1],
    "warehouse_id": [10, 10, 20],
    "day": ["2024-03-01", "2024-03-02", "2024-03-03"],
    "qty": [12, 3, 5],
})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Widget", "Gadget"]})
warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
lots = pd.DataFrame({"lot_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "received_day": ["2024-01-01", "2024-02-01", "2024-01-05", "2024-02-05"], "qty": [10, 10, 5, 5], "unit_cost": [4, 9, 8, 8]})
shipments = pd.DataFrame({"shipment_id": [100, 101, 102], "product_id": [1, 2, 1], "warehouse_id": [10, 10, 20], "day": ["2024-03-01", "2024-03-02", "2024-03-03"], "qty": [12, 3, 5]})`,
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Widget", "Gadget"]})
warehouses = pd.DataFrame({"warehouse_id": [10, 20], "region": ["North", "South"]})
lots = pd.DataFrame({"lot_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "received_day": ["2024-01-01", "2024-02-01", "2024-01-05", "2024-02-05"], "qty": [10, 10, 5, 5], "unit_cost": [5, 5, 8, 8]})
shipments = pd.DataFrame({"shipment_id": [100, 101, 102, 103], "product_id": [1, 2, 1, 1], "warehouse_id": [10, 10, 20, 10], "day": ["2024-03-01", "2024-03-02", "2024-03-03", "2024-03-04"], "qty": [12, 3, 5, 8]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, warehouses: pd.DataFrame, lots: pd.DataFrame, shipments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, warehouses, lots, shipments):
    s = shipments.merge(warehouses, on="warehouse_id")
    need = s[s["region"] == "North"].groupby("product_id", as_index=False)["qty"].sum()
    need = need.rename(columns={"qty": "need"})
    l = lots.sort_values(["product_id", "received_day", "lot_id"]).copy()
    l["before"] = l.groupby("product_id")["qty"].cumsum() - l["qty"]
    m = l.merge(need, on="product_id")
    take = np.minimum(m["qty"], np.maximum(0, m["need"] - m["before"]))
    m["cost"] = take * m["unit_cost"]
    g = m.groupby("product_id", as_index=False)["cost"].sum()
    out = g.merge(products, on="product_id")
    out["cogs"] = out["cost"].astype(int)
    return out[["product", "cogs"]].reset_index(drop=True)`,
    wrong: [`def solve(products, warehouses, lots, shipments):
    s = shipments.merge(warehouses, on="warehouse_id")
    need = s[s["region"] == "North"].groupby("product_id", as_index=False)["qty"].sum()
    need = need.rename(columns={"qty": "need"})
    l = lots.copy()
    l["value"] = l["qty"] * l["unit_cost"]
    avg = l.groupby("product_id", as_index=False).agg(value=("value", "sum"), units=("qty", "sum"))
    avg["unit"] = avg["value"] / avg["units"]
    m = need.merge(avg, on="product_id")
    g = m.merge(products, on="product_id")
    g["cogs"] = (g["need"] * g["unit"]).astype(int)
    return g[["product", "cogs"]].reset_index(drop=True)`],
    hints: ['For each lot, how many of the shipped units fall inside it? A running total of the earlier lots tells you.', 'Clip the share taken from a lot to the lot size and to zero.'],
    why: 'A cumulative sum minus the lot itself says how many units were already taken before this lot, so the lot supplies the smaller of its own size and what is left. That is FIFO in one pass.',
    mistakes: 'A weighted average price charges the same whatever the order, which only matches while every lot cost the same.' },

  { t: 'Session Funnel by Acquisition Channel', tags: ['sessionization', 'cumsum', 'groupby'],
    story: 'Events carry a minute count. A new session starts when more than 30 minutes have passed since the user\'s previous event, and a session converts when a checkout happens inside it.',
    task: 'Return channel, sessions, converting and rate (rounded to 2 decimals) for every acquisition channel.',
    setup: `channels = pd.DataFrame({"channel_id": [1, 2], "channel": ["Organic", "Paid Social"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4], "channel_id": [1, 1, 2, 2]})
events = pd.DataFrame({
    "event_id": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "user_id": [1, 1, 1, 2, 2, 3, 3, 4, 4],
    "ts": [0, 10, 20, 0, 15, 0, 25, 0, 5],
    "name": ["view", "cart", "checkout", "view", "cart", "view", "checkout", "view", "view"],
})`,
    hidden: [
      `channels = pd.DataFrame({"channel_id": [1, 2], "channel": ["Organic", "Paid Social"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4], "channel_id": [1, 1, 2, 2]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6, 7, 8, 9], "user_id": [1, 1, 1, 1, 1, 2, 3, 3, 4], "ts": [0, 10, 20, 400, 410, 0, 0, 25, 0], "name": ["view", "cart", "checkout", "view", "cart", "view", "view", "checkout", "view"]})`,
      `channels = pd.DataFrame({"channel_id": [1, 2], "channel": ["Organic", "Paid Social"]})
users = pd.DataFrame({"user_id": [1, 2, 3, 4], "channel_id": [1, 1, 2, 2]})
events = pd.DataFrame({"event_id": [1, 2, 3, 4, 5, 6, 7, 8, 9], "user_id": [1, 1, 1, 2, 2, 3, 3, 4, 4], "ts": [0, 10, 20, 0, 15, 0, 25, 0, 5], "name": ["view", "cart", "checkout", "view", "checkout", "view", "cart", "view", "view"]})`,
    ],
    sig: 'def solve(channels: pd.DataFrame, users: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(channels, users, events):
    e = events.merge(users, on="user_id").sort_values(["user_id", "ts", "event_id"])
    gap = e.groupby("user_id")["ts"].diff()
    e["new"] = gap.isna() | (gap > 30)
    e["sid"] = e.groupby("user_id")["new"].cumsum()
    sess = e.groupby(["channel_id", "user_id", "sid"], as_index=False).agg(
        conv=("name", lambda s: int((s == "checkout").any()))
    )
    g = sess.groupby("channel_id", as_index=False).agg(sessions=("conv", "size"), converting=("conv", "sum"))
    g["rate"] = (g["converting"] / g["sessions"]).round(2)
    out = g.merge(channels, on="channel_id")
    return out[["channel", "sessions", "converting", "rate"]].reset_index(drop=True)`,
    wrong: [`def solve(channels, users, events):
    e = events.merge(users, on="user_id")
    per_user = e.groupby(["channel_id", "user_id"], as_index=False).agg(
        conv=("name", lambda s: int((s == "checkout").any()))
    )
    g = per_user.groupby("channel_id", as_index=False).agg(sessions=("conv", "size"), converting=("conv", "sum"))
    g["rate"] = (g["converting"] / g["sessions"]).round(2)
    out = g.merge(channels, on="channel_id")
    return out[["channel", "sessions", "converting", "rate"]].reset_index(drop=True)`],
    hints: ['Flag every event that starts a session, then a cumulative sum of those flags numbers them.', 'A gap of exactly 30 minutes is still the same session.'],
    why: 'The running total of session-start flags gives each event its session number, so one row per user and session becomes the population to measure.',
    mistakes: 'Counting users instead of sessions agrees while nobody comes back, and diverges the moment somebody has a second visit.' },

  { t: 'Group Standings With Head-to-Head', tags: ['tie-breaks', 'concat', 'self merge'],
    story: 'A win is 3 points and a draw 1, and any points deducted by the committee come off the total. Teams level on points are separated by the points they took from each other, then by goal difference, then by name.',
    task: 'Return pool, team, points and place, where 1 is top of the pool.',
    setup: `pools = pd.DataFrame({"pool_id": [1], "pool": ["Group A"]})
teams = pd.DataFrame({"team_id": [1, 2, 3, 4], "pool_id": [1, 1, 1, 1], "team": ["Lions", "Bears", "Wolves", "Eagles"]})
matches = pd.DataFrame({
    "match_id": [1, 2, 3, 4, 5, 6],
    "home_id": [1, 1, 1, 2, 2, 3],
    "away_id": [2, 3, 4, 3, 4, 4],
    "home_goals": [3, 2, 1, 2, 1, 0],
    "away_goals": [0, 1, 0, 0, 1, 2],
})
penalties = pd.DataFrame({"team_id": [], "points": []})`,
    hidden: [
      `pools = pd.DataFrame({"pool_id": [1], "pool": ["Group A"]})
teams = pd.DataFrame({"team_id": [1, 2, 3, 4], "pool_id": [1, 1, 1, 1], "team": ["Lions", "Bears", "Wolves", "Eagles"]})
matches = pd.DataFrame({"match_id": [1, 2, 3, 4, 5, 6], "home_id": [1, 1, 3, 3, 4, 2], "away_id": [2, 4, 1, 2, 3, 4], "home_goals": [3, 1, 2, 1, 5, 2], "away_goals": [0, 0, 1, 0, 0, 1]})
penalties = pd.DataFrame({"team_id": [], "points": []})`,
      `pools = pd.DataFrame({"pool_id": [1], "pool": ["Group A"]})
teams = pd.DataFrame({"team_id": [1, 2, 3, 4], "pool_id": [1, 1, 1, 1], "team": ["Lions", "Bears", "Wolves", "Eagles"]})
matches = pd.DataFrame({"match_id": [1, 2, 3, 4, 5, 6], "home_id": [1, 1, 1, 2, 2, 3], "away_id": [2, 3, 4, 3, 4, 4], "home_goals": [3, 2, 1, 2, 1, 0], "away_goals": [0, 1, 0, 0, 1, 2]})
penalties = pd.DataFrame({"team_id": [1], "points": [6]})`,
    ],
    sig: 'def solve(pools: pd.DataFrame, teams: pd.DataFrame, matches: pd.DataFrame, penalties: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(pools, teams, matches, penalties):
    h = matches.rename(columns={"home_id": "team_id", "away_id": "opp_id", "home_goals": "gf", "away_goals": "ga"})
    a = matches.rename(columns={"away_id": "team_id", "home_id": "opp_id", "away_goals": "gf", "home_goals": "ga"})
    long = pd.concat([h[["team_id", "opp_id", "gf", "ga"]], a[["team_id", "opp_id", "gf", "ga"]]], ignore_index=True)
    long["won"] = np.where(long["gf"] > long["ga"], 3, np.where(long["gf"] == long["ga"], 1, 0))
    long["gdiff"] = long["gf"] - long["ga"]
    base = long.groupby("team_id", as_index=False).agg(pts=("won", "sum"), gd=("gdiff", "sum"))
    base = teams.merge(base, on="team_id", how="left")
    base[["pts", "gd"]] = base[["pts", "gd"]].fillna(0)
    if len(penalties):
        ded = penalties.groupby("team_id", as_index=False)["points"].sum()
        base = base.merge(ded, on="team_id", how="left")
        base["pts"] = base["pts"] - base["points"].fillna(0)
        base = base.drop(columns=["points"])
    pt = base[["team_id", "pts", "pool_id"]].rename(columns={"pts": "tp", "pool_id": "tpool"})
    op = base[["team_id", "pts", "pool_id"]].rename(columns={"team_id": "opp_id", "pts": "op", "pool_id": "opool"})
    lv = long.merge(pt, on="team_id").merge(op, on="opp_id")
    lv = lv[(lv["tp"] == lv["op"]) & (lv["tpool"] == lv["opool"])]
    head = lv.groupby("team_id", as_index=False)["won"].sum().rename(columns={"won": "h2h"})
    base = base.merge(head, on="team_id", how="left")
    base["h2h"] = base["h2h"].fillna(0)
    base = base.sort_values(["pool_id", "pts", "h2h", "gd", "team"], ascending=[True, False, False, False, True])
    base["place"] = base.groupby("pool_id").cumcount() + 1
    out = base.merge(pools, on="pool_id")
    out["points"] = out["pts"].astype(int)
    return out[["pool", "team", "points", "place"]].reset_index(drop=True)`,
    wrong: [`def solve(pools, teams, matches, penalties):
    h = matches.rename(columns={"home_id": "team_id", "away_id": "opp_id", "home_goals": "gf", "away_goals": "ga"})
    a = matches.rename(columns={"away_id": "team_id", "home_id": "opp_id", "away_goals": "gf", "home_goals": "ga"})
    long = pd.concat([h[["team_id", "opp_id", "gf", "ga"]], a[["team_id", "opp_id", "gf", "ga"]]], ignore_index=True)
    long["won"] = np.where(long["gf"] > long["ga"], 3, np.where(long["gf"] == long["ga"], 1, 0))
    long["gdiff"] = long["gf"] - long["ga"]
    base = long.groupby("team_id", as_index=False).agg(pts=("won", "sum"), gd=("gdiff", "sum"))
    base = teams.merge(base, on="team_id", how="left")
    base[["pts", "gd"]] = base[["pts", "gd"]].fillna(0)
    if len(penalties):
        ded = penalties.groupby("team_id", as_index=False)["points"].sum()
        base = base.merge(ded, on="team_id", how="left")
        base["pts"] = base["pts"] - base["points"].fillna(0)
    base = base.sort_values(["pool_id", "pts", "gd", "team"], ascending=[True, False, False, True])
    base["place"] = base.groupby("pool_id").cumcount() + 1
    out = base.merge(pools, on="pool_id")
    out["points"] = out["pts"].astype(int)
    return out[["pool", "team", "points", "place"]].reset_index(drop=True)`],
    hints: ['Turn every match into two rows, one per team, so points and goal difference are one groupby.', 'The head-to-head total is a second pass over those rows, restricted to opponents on the same points.'],
    why: 'A long form of the matches makes the per-team figures easy, and joining the points back on both the team and the opponent isolates the matches that decide a tie. Sorting by all four keys then numbers the pool.',
    mistakes: 'Going straight from points to goal difference ignores the rule that decides most real group stages.' },

  { t: 'Customer Minutes Lost to Outages', tags: ['interval merging', 'cummax', 'groupby'],
    story: 'A feeder serves many customers, and an outage on it cuts power to all of them. Outages can overlap, and an outage no crew was dispatched to is a false alarm that never happened.',
    task: 'Return feeder, minutes (counting overlapping outages once), customers and cmi (minutes times customers) for every feeder with at least one real outage.',
    setup: `feeders = pd.DataFrame({"feeder_id": [1, 2], "feeder": ["Mill Feeder", "Dock Feeder"]})
customers = pd.DataFrame({
    "customer_id": [1, 2, 3, 4, 5],
    "feeder_id": [1, 1, 1, 2, 2],
    "customer": ["Flat 1A", "Flat 1B", "House 3", "Shed 9", "Pier 4"],
})
outages = pd.DataFrame({
    "outage_id": [1, 2, 3, 4, 5],
    "feeder_id": [1, 1, 2, 2, 1],
    "start_min": [0, 120, 0, 200, 400],
    "end_min": [60, 180, 30, 260, 420],
})
crews = pd.DataFrame({"outage_id": [1, 2, 3, 4], "crew": ["Red", "Blue", "Red", "Green"]})`,
    hidden: [
      `feeders = pd.DataFrame({"feeder_id": [1, 2], "feeder": ["Mill Feeder", "Dock Feeder"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4, 5], "feeder_id": [1, 1, 1, 2, 2], "customer": ["Flat 1A", "Flat 1B", "House 3", "Shed 9", "Pier 4"]})
outages = pd.DataFrame({"outage_id": [1, 2, 3, 4, 5], "feeder_id": [1, 1, 2, 2, 1], "start_min": [0, 30, 0, 200, 400], "end_min": [60, 180, 30, 260, 420]})
crews = pd.DataFrame({"outage_id": [1, 2, 3, 4], "crew": ["Red", "Blue", "Red", "Green"]})`,
      `feeders = pd.DataFrame({"feeder_id": [1, 2], "feeder": ["Mill Feeder", "Dock Feeder"]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 4, 5], "feeder_id": [1, 1, 1, 2, 2], "customer": ["Flat 1A", "Flat 1B", "House 3", "Shed 9", "Pier 4"]})
outages = pd.DataFrame({"outage_id": [1, 2, 3, 4, 5], "feeder_id": [1, 1, 2, 2, 1], "start_min": [0, 120, 0, 200, 400], "end_min": [60, 180, 30, 260, 420]})
crews = pd.DataFrame({"outage_id": [1, 2, 3, 4, 5], "crew": ["Red", "Blue", "Red", "Green", "Amber"]})`,
    ],
    sig: 'def solve(feeders: pd.DataFrame, customers: pd.DataFrame, outages: pd.DataFrame, crews: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(feeders, customers, outages, crews):
    o = outages[outages["outage_id"].isin(crews["outage_id"])]
    o = o.sort_values(["feeder_id", "start_min", "end_min"]).copy()
    o["pm"] = o.groupby("feeder_id")["end_min"].transform(lambda s: s.cummax().shift())
    o["new"] = o["pm"].isna() | (o["start_min"] > o["pm"])
    o["grp"] = o.groupby("feeder_id")["new"].cumsum()
    m = o.groupby(["feeder_id", "grp"], as_index=False).agg(a=("start_min", "min"), b=("end_min", "max"))
    m["mins"] = m["b"] - m["a"]
    tot = m.groupby("feeder_id", as_index=False)["mins"].sum().rename(columns={"mins": "minutes"})
    cust = customers.groupby("feeder_id", as_index=False)["customer_id"].size().rename(columns={"size": "customers"})
    out = tot.merge(cust, on="feeder_id").merge(feeders, on="feeder_id")
    out["cmi"] = out["minutes"] * out["customers"]
    return out[["feeder", "minutes", "customers", "cmi"]].reset_index(drop=True)`,
    wrong: [`def solve(feeders, customers, outages, crews):
    o = outages[outages["outage_id"].isin(crews["outage_id"])].copy()
    o["mins"] = o["end_min"] - o["start_min"]
    tot = o.groupby("feeder_id", as_index=False)["mins"].sum().rename(columns={"mins": "minutes"})
    cust = customers.groupby("feeder_id", as_index=False)["customer_id"].size().rename(columns={"size": "customers"})
    out = tot.merge(cust, on="feeder_id").merge(feeders, on="feeder_id")
    out["cmi"] = out["minutes"] * out["customers"]
    return out[["feeder", "minutes", "customers", "cmi"]].reset_index(drop=True)`],
    hints: ['Merge the outages of a feeder into stretches before adding minutes.', 'An outage starts a new stretch only when it begins after the furthest end seen so far.'],
    why: 'A cumulative maximum of the earlier ends, shifted by one row, is the furthest the power was already off. Flagging the rows that start later and running a cumulative sum labels the stretches.',
    mistakes: 'Adding the raw durations counts an overlap twice and reports more lost minutes than the clock allows.' },

  { t: 'Blocked by a Prerequisite Chain', tags: ['transitive closure', 'fixpoint', 'merge'],
    story: 'A course can require other courses, and those have requirements of their own. A student must have finished everything in the chain, however deep, before a course is open to them.',
    task: 'Return code, chain (the length of the longest requirement chain) and blocked (how many enrolled students are missing at least one course anywhere in that chain) for every course.',
    setup: `courses = pd.DataFrame({"course_id": [1, 2, 3, 4], "code": ["CS101", "CS201", "CS301", "MA100"]})
prereqs = pd.DataFrame({"course_id": [2, 3, 3], "requires_id": [1, 2, 4]})
enrollments = pd.DataFrame({
    "enrollment_id": [900, 901, 902, 903],
    "student": ["Asha", "Ben", "Chitra", "Dev"],
    "course_id": [2, 3, 3, 1],
})
completions = pd.DataFrame({
    "student": ["Asha", "Ben", "Ben", "Ben", "Chitra", "Chitra", "Chitra"],
    "course_id": [1, 1, 2, 4, 2, 4, 1],
})`,
    hidden: [
      `courses = pd.DataFrame({"course_id": [1, 2, 3, 4], "code": ["CS101", "CS201", "CS301", "MA100"]})
prereqs = pd.DataFrame({"course_id": [2, 3, 3], "requires_id": [1, 2, 4]})
enrollments = pd.DataFrame({"enrollment_id": [900, 901, 902, 903], "student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [2, 3, 3, 1]})
completions = pd.DataFrame({"student": ["Asha", "Ben", "Ben", "Ben", "Chitra", "Chitra"], "course_id": [1, 1, 2, 4, 2, 4]})`,
      `courses = pd.DataFrame({"course_id": [1, 2, 3, 4], "code": ["CS101", "CS201", "CS301", "MA100"]})
prereqs = pd.DataFrame({"course_id": [2, 3, 3, 4], "requires_id": [1, 2, 4, 1]})
enrollments = pd.DataFrame({"enrollment_id": [900, 901, 902, 903], "student": ["Asha", "Ben", "Chitra", "Dev"], "course_id": [2, 3, 3, 1]})
completions = pd.DataFrame({"student": ["Asha", "Ben", "Ben", "Ben", "Chitra", "Chitra", "Chitra"], "course_id": [1, 1, 2, 4, 2, 4, 1]})`,
    ],
    sig: 'def solve(courses: pd.DataFrame, prereqs: pd.DataFrame, enrollments: pd.DataFrame, completions: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(courses, prereqs, enrollments, completions):
    edges = list(zip(prereqs["course_id"], prereqs["requires_id"]))
    depth = {(c, r): 1 for c, r in edges}
    changed = True
    while changed:
        changed = False
        for (c, r) in list(depth):
            for (c2, r2) in edges:
                if c2 != r:
                    continue
                d = depth[(c, r)] + 1
                if depth.get((c, r2), 0) < d:
                    depth[(c, r2)] = d
                    changed = True
    done = set(zip(completions["student"], completions["course_id"]))
    rows = []
    for cid, code in zip(courses["course_id"], courses["code"]):
        reqs = [r for (c, r) in depth if c == cid]
        chain = max([depth[(cid, r)] for r in reqs], default=0)
        students = enrollments.loc[enrollments["course_id"] == cid, "student"]
        blocked = sum(1 for s in students if any((s, r) not in done for r in reqs))
        rows.append((code, chain, blocked))
    return pd.DataFrame(rows, columns=["code", "chain", "blocked"])`,
    wrong: [`def solve(courses, prereqs, enrollments, completions):
    edges = list(zip(prereqs["course_id"], prereqs["requires_id"]))
    depth = {(c, r): 1 for c, r in edges}
    changed = True
    while changed:
        changed = False
        for (c, r) in list(depth):
            for (c2, r2) in edges:
                if c2 != r:
                    continue
                d = depth[(c, r)] + 1
                if depth.get((c, r2), 0) < d:
                    depth[(c, r2)] = d
                    changed = True
    done = set(zip(completions["student"], completions["course_id"]))
    rows = []
    for cid, code in zip(courses["course_id"], courses["code"]):
        reqs = [r for (c, r) in depth if c == cid]
        direct = list(prereqs.loc[prereqs["course_id"] == cid, "requires_id"])
        chain = max([depth[(cid, r)] for r in reqs], default=0)
        students = enrollments.loc[enrollments["course_id"] == cid, "student"]
        blocked = sum(1 for s in students if any((s, r) not in done for r in direct))
        rows.append((code, chain, blocked))
    return pd.DataFrame(rows, columns=["code", "chain", "blocked"])`],
    hints: ['Close the requirement graph first: every course paired with everything below it, and how far down it sits.', 'Keep growing the pairs until nothing changes.'],
    why: 'Repeatedly extending each pair through another edge reaches a fixpoint on a requirement graph with no cycles, and both answers read that closure.',
    mistakes: 'Checking only the direct requirements lets through a student who skipped something two levels down.' },
];
