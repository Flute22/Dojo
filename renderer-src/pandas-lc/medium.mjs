// Pandas, LeetCode-style set: Medium. Original problems. Each has a visible example plus hidden datasets;
// `ref` is the reference solution, `wrong` are tempting answers that pass the example but must fail a hidden dataset.
export default [
  { t: 'Second Highest Distinct Salary', tags: ['dedupe', 'edge case'],
    story: 'Payroll wants the salary one step below the top, but several people can share a salary, and tiny teams may not have a second level at all.',
    task: 'Return a single-row table with the column secondHighest: the second largest distinct salary. If there is no second distinct salary, the value must be missing (None / NaN).',
    setup: `emp = pd.DataFrame({"id": [1, 2, 3], "salary": [100, 200, 300]})`,
    hidden: [`emp = pd.DataFrame({"id": [1, 2, 3], "salary": [100, 300, 300]})`, `emp = pd.DataFrame({"id": [1], "salary": [500]})`],
    sig: 'def solve(emp: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(emp):
    vals = emp["salary"].drop_duplicates().sort_values(ascending=False)
    return pd.DataFrame({"secondHighest": [vals.iloc[1] if len(vals) > 1 else None]})`,
    wrong: [`def solve(emp):
    return pd.DataFrame({"secondHighest": [emp["salary"].nlargest(2).iloc[-1]]})`],
    hints: ['Two people on the top salary must count as one level.', 'Remove duplicates before ranking, and guard the case with fewer than two levels.'],
    why: 'Drop duplicate salaries, sort descending, and take position 1 only if it exists.',
    mistakes: 'nlargest(2) keeps duplicates, so a tie for first place is returned as the "second" value. Indexing position 1 of a one-row result raises IndexError.' },

  { t: 'Earning More Than the Boss', tags: ['self join', 'merge'],
    story: 'Each employee row stores the id of their manager. Compensation wants to know where the hierarchy is upside down.',
    task: 'Return the name of every employee whose salary is strictly greater than their direct manager\'s. People without a manager are never returned.',
    setup: `emp = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "name": ["Joe", "Henry", "Sam", "Max"],
    "salary": [70000, 80000, 60000, 90000],
    "managerId": [3, 4, np.nan, np.nan],
})`,
    hidden: [`emp = pd.DataFrame({
    "id": [1, 2, 3, 4, 5],
    "name": ["Ann", "Bo", "Cy", "Di", "Eli"],
    "salary": [50, 50, 70, 40, 90],
    "managerId": [2, 3, np.nan, 3, 3],
})`, `emp = pd.DataFrame({
    "id": [1, 2, 3],
    "name": ["Kim", "Lou", "Mia"],
    "salary": [10, 30, 20],
    "managerId": [np.nan, 1, 2],
})`],
    sig: 'def solve(emp: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(emp):
    m = emp.merge(emp, left_on="managerId", right_on="id", suffixes=("", "_mgr"))
    return m.loc[m["salary"] > m["salary_mgr"], ["name"]].reset_index(drop=True)`,
    wrong: [`def solve(emp):
    m = emp.merge(emp, left_on="managerId", right_on="id", suffixes=("", "_mgr"))
    return m.loc[m["salary"] >= m["salary_mgr"], ["name"]].reset_index(drop=True)`],
    hints: ['Join the table to itself: employee.managerId = manager.id.', 'Use a strict comparison. Equal pay is not "more".'],
    why: 'A self-merge puts every employee next to their manager\'s columns, so the comparison is a plain boolean mask. Rows without a manager have no match and disappear.',
    mistakes: 'Using >= includes people paid the same as their manager. Comparing to the company average answers a different question.' },

  { t: 'Top Three Pay Levels per Department', tags: ['groupby', 'rank', 'ties'],
    story: 'A department\'s "top three" means the three highest distinct pay levels, and everybody on those levels, even when several people share one.',
    task: 'Return dept, name and salary of every employee whose salary is among the 3 highest distinct salaries of their own department.',
    setup: `emp = pd.DataFrame({
    "name": ["Ana", "Ben", "Cai", "Dee", "Eli", "Fay"],
    "dept": ["IT", "IT", "IT", "IT", "HR", "HR"],
    "salary": [90, 80, 70, 60, 50, 40],
})`,
    hidden: [`emp = pd.DataFrame({
    "name": ["Ana", "Ben", "Cai", "Dee", "Eli"],
    "dept": ["IT", "IT", "IT", "IT", "IT"],
    "salary": [90, 90, 80, 70, 60],
})`, `emp = pd.DataFrame({
    "name": ["Gus", "Hal", "Ivy", "Jon", "Kay", "Lee"],
    "dept": ["HR", "Ops", "Ops", "Ops", "Ops", "Ops"],
    "salary": [10, 5, 5, 5, 4, 3],
})`],
    sig: 'def solve(emp: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(emp):
    r = emp.groupby("dept")["salary"].rank(method="dense", ascending=False)
    return emp.loc[r <= 3, ["dept", "name", "salary"]].reset_index(drop=True)`,
    wrong: [`def solve(emp):
    top = emp.sort_values("salary", ascending=False).groupby("dept").head(3)
    return top[["dept", "name", "salary"]].reset_index(drop=True)`],
    hints: ['Rank salaries inside each department, but give tied salaries the same rank with no gaps.', 'rank(method="dense") does exactly that.'],
    why: 'A dense rank gives equal salaries the same level and never skips a level, so "rank <= 3" keeps every person on the top three levels.',
    mistakes: 'head(3) after sorting cuts the list by rows, so people tied on the third level are lost and a tie on the first level wastes a slot.' },

  { t: 'Warmer Than the Day Before', tags: ['dates', 'merge', 'gaps'],
    story: 'A weather log has one row per recorded day, but some days were never recorded. "Yesterday" means the previous calendar day, not the previous row.',
    task: 'Return the day of every record whose temperature is higher than the temperature recorded on the previous calendar day. Days without a record for the day before are never returned.',
    setup: `weather = pd.DataFrame({
    "day": pd.to_datetime(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"]),
    "temp": [10, 25, 20, 30],
})`,
    hidden: [`weather = pd.DataFrame({
    "day": pd.to_datetime(["2024-01-01", "2024-01-03", "2024-01-04", "2024-01-05"]),
    "temp": [10, 20, 30, 30],
})`, `weather = pd.DataFrame({
    "day": pd.to_datetime(["2024-02-28", "2024-02-29", "2024-03-01", "2024-03-03"]),
    "temp": [5, 6, 7, 1],
})`],
    sig: 'def solve(weather: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(weather):
    prev = weather.assign(day=weather["day"] + pd.Timedelta(days=1))
    m = weather.merge(prev, on="day", suffixes=("", "_prev"))
    return m.loc[m["temp"] > m["temp_prev"], ["day"]].reset_index(drop=True)`,
    wrong: [`def solve(weather):
    w = weather.sort_values("day")
    return w.loc[w["temp"].diff() > 0, ["day"]].reset_index(drop=True)`],
    hints: ['Shift the dates by one day instead of shifting the rows.', 'Merge the table with a copy whose day is moved forward by one day.'],
    why: 'Adding one day to a copy and merging on the date pairs each day with its true previous day, and days with no partner simply drop out.',
    mistakes: 'diff() or shift() compare neighbouring rows, which are not neighbouring days when a day is missing.' },

  { t: 'Three in a Row', tags: ['runs', 'cumsum'],
    story: 'A sensor writes one reading per id. A reading counts as stuck when the same value shows up in at least three consecutive ids.',
    task: 'Return the distinct values (column num) that appear in at least three consecutive rows when ordered by id.',
    setup: `logs = pd.DataFrame({"id": [1, 2, 3, 4, 5, 6, 7], "num": [1, 1, 1, 2, 3, 2, 3]})`,
    hidden: [`logs = pd.DataFrame({"id": [1, 2, 3, 4, 5, 6, 7, 8], "num": [1, 2, 1, 1, 2, 3, 3, 3]})`, `logs = pd.DataFrame({"id": [8, 7, 6, 5, 4, 3, 2, 1], "num": [5, 4, 4, 4, 4, 9, 4, 9]})`],
    sig: 'def solve(logs: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(logs):
    s = logs.sort_values("id")
    run = (s["num"] != s["num"].shift()).cumsum()
    g = s.groupby(run)["num"].agg(["first", "size"])
    return pd.DataFrame({"num": g.loc[g["size"] >= 3, "first"].drop_duplicates().to_list()})`,
    wrong: [`def solve(logs):
    c = logs["num"].value_counts()
    return pd.DataFrame({"num": c[c >= 3].index.to_list()})`],
    hints: ['Number the runs: a new run starts whenever the value differs from the previous row.', 'Sort by id first; the input order is not guaranteed.'],
    why: 'Comparing each value with the previous one and taking a cumulative sum gives every run its own label. Run sizes of three or more mark the stuck values.',
    mistakes: 'Counting occurrences ignores whether they are adjacent. Forgetting to sort by id breaks the run detection on unordered input.' },

  { t: 'Came Back the Next Day', tags: ['dates', 'retention'],
    story: 'Growth tracks retention as the share of players who logged in again on the day right after their very first login.',
    task: 'Return one row with the column fraction: the number of such players divided by the number of all players, rounded to 2 decimals.',
    setup: `activity = pd.DataFrame({
    "player_id": [1, 1, 2, 2, 3],
    "event_date": pd.to_datetime(["2024-03-01", "2024-03-02", "2024-03-01", "2024-03-05", "2024-03-04"]),
    "games": [5, 6, 1, 2, 7],
})`,
    hidden: [`activity = pd.DataFrame({
    "player_id": [1, 1, 1, 2, 2],
    "event_date": pd.to_datetime(["2024-03-01", "2024-03-05", "2024-03-06", "2024-03-02", "2024-03-03"]),
    "games": [1, 1, 1, 1, 1],
})`, `activity = pd.DataFrame({
    "player_id": [4, 4, 5, 5, 6, 6],
    "event_date": pd.to_datetime(["2024-04-10", "2024-04-11", "2024-04-10", "2024-04-11", "2024-04-10", "2024-04-12"]),
    "games": [2, 2, 2, 2, 2, 2],
})`],
    sig: 'def solve(activity: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(activity):
    first = activity.groupby("player_id")["event_date"].transform("min")
    back = activity.loc[activity["event_date"] == first + pd.Timedelta(days=1), "player_id"].nunique()
    return pd.DataFrame({"fraction": [round(back / activity["player_id"].nunique(), 2)]})`,
    wrong: [`def solve(activity):
    a = activity[["player_id", "event_date"]].drop_duplicates()
    nxt = a.assign(event_date=a["event_date"] + pd.Timedelta(days=1))
    both = a.merge(nxt, on=["player_id", "event_date"])
    return pd.DataFrame({"fraction": [round(both["player_id"].nunique() / a["player_id"].nunique(), 2)]})`],
    hints: ['Find each player\'s first login date with a groupby transform.', 'Count distinct players that have a login exactly one day after it.'],
    why: 'transform("min") attaches the first login date to every row, so one comparison finds the next-day logins. nunique counts each player once.',
    mistakes: 'Looking for any two consecutive login days counts players who came back later but not right after their first login.' },

  { t: 'Swap Neighbouring Seats', tags: ['index math', 'sorting'],
    story: 'A teacher swaps the seats of every two students sitting next to each other: ids 1 and 2, 3 and 4, and so on. If the number of students is odd, the last student keeps their seat.',
    task: 'Return id and student after the swap, ordered by id.',
    o: true,
    setup: `seat = pd.DataFrame({"id": [1, 2, 3, 4], "student": ["Abbot", "Doris", "Emerson", "Green"]})`,
    hidden: [`seat = pd.DataFrame({"id": [1, 2, 3, 4, 5], "student": ["Abbot", "Doris", "Emerson", "Green", "Jeames"]})`, `seat = pd.DataFrame({"id": [3, 1, 2], "student": ["Cy", "Al", "Bo"]})`],
    sig: 'def solve(seat: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(seat):
    n = len(seat)
    i = seat["id"]
    new = np.where(i % 2 == 1, np.where(i < n, i + 1, i), i - 1)
    return seat.assign(id=new).sort_values("id")[["id", "student"]].reset_index(drop=True)`,
    wrong: [`def solve(seat):
    i = seat["id"]
    new = np.where(i % 2 == 1, i + 1, i - 1)
    return seat.assign(id=new).sort_values("id")[["id", "student"]].reset_index(drop=True)`],
    hints: ['Odd ids move up by one, even ids move down by one.', 'The last odd id has no partner when the count is odd.'],
    why: 'Compute the new id for every row with a vectorised condition, treating the final unpaired odd seat separately, then sort by the new id.',
    mistakes: 'Moving every odd id up sends the last student of an odd-sized class to a seat that does not exist.' },

  { t: 'Cancellation Rate of Trusted Trips', tags: ['merge', 'filtering', 'rate'],
    story: 'Ride support only looks at trips where neither the rider nor the driver is banned, and only within a reporting window.',
    task: 'For each day from 2024-03-01 to 2024-03-03 (both included) that has at least one qualifying trip, return day and rate: cancelled trips divided by all qualifying trips, rounded to 2 decimals. A trip is cancelled when its status starts with "cancelled". A trip qualifies when both its client and its driver are not banned.',
    setup: `trips = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6, 7],
    "client_id": [1, 2, 3, 1, 2, 1, 2],
    "driver_id": [10, 11, 12, 12, 10, 10, 12],
    "status": ["completed", "cancelled_by_driver", "completed", "cancelled_by_client", "completed", "completed", "completed"],
    "day": ["2024-03-01", "2024-03-01", "2024-03-01", "2024-03-02", "2024-03-02", "2024-03-05", "2024-03-02"],
})
users = pd.DataFrame({"user_id": [1, 2, 3, 10, 11, 12], "banned": ["No", "No", "Yes", "No", "No", "No"]})`,
    hidden: [`trips = pd.DataFrame({
    "id": [1, 2, 3],
    "client_id": [1, 1, 2],
    "driver_id": [10, 13, 10],
    "status": ["cancelled_by_client", "cancelled_by_driver", "completed"],
    "day": ["2024-03-01", "2024-03-01", "2024-03-01"],
})
users = pd.DataFrame({"user_id": [1, 2, 10, 13], "banned": ["No", "No", "No", "Yes"]})`, `trips = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "client_id": [1, 1, 1, 1],
    "driver_id": [10, 10, 10, 10],
    "status": ["cancelled_by_client", "completed", "completed", "cancelled_by_driver"],
    "day": ["2024-03-03", "2024-03-03", "2024-03-04", "2024-02-29"],
})
users = pd.DataFrame({"user_id": [1, 10], "banned": ["No", "No"]})`],
    sig: 'def solve(trips: pd.DataFrame, users: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(trips, users):
    ok = users.loc[users["banned"] == "No", "user_id"]
    t = trips[trips["client_id"].isin(ok) & trips["driver_id"].isin(ok) & trips["day"].between("2024-03-01", "2024-03-03")]
    rate = t["status"].str.startswith("cancelled").groupby(t["day"]).mean().round(2)
    return rate.rename("rate").reset_index()`,
    wrong: [`def solve(trips, users):
    ok = users.loc[users["banned"] == "No", "user_id"]
    t = trips[trips["client_id"].isin(ok) & trips["day"].between("2024-03-01", "2024-03-03")]
    rate = t["status"].str.startswith("cancelled").groupby(t["day"]).mean().round(2)
    return rate.rename("rate").reset_index()`],
    hints: ['Both the client and the driver must be in the not-banned list.', 'A boolean column averaged per group is a rate.'],
    why: 'Filter the trips with isin on both people and the date window, then the mean of a True/False "is cancelled" column per day is the rate.',
    mistakes: 'Checking only the client misses trips with a banned driver. between() on ISO date strings is inclusive on both ends, which is what is wanted here.' },

  { t: 'Sales in the First Year', tags: ['groupby', 'transform'],
    story: 'Every product has its own launch year: the first year it appears in the sales table.',
    task: 'For each product return all its sales rows from its own first year: product_id, first_year, quantity and price.',
    setup: `sales = pd.DataFrame({
    "sale_id": [1, 2, 3, 4],
    "product_id": [100, 100, 100, 200],
    "year": [2008, 2008, 2009, 2008],
    "quantity": [10, 12, 15, 5],
    "price": [5000, 5000, 5000, 9000],
})`,
    hidden: [`sales = pd.DataFrame({
    "sale_id": [1, 2, 3, 4, 5],
    "product_id": [100, 100, 200, 200, 200],
    "year": [2008, 2009, 2010, 2011, 2010],
    "quantity": [10, 12, 4, 6, 7],
    "price": [5000, 5000, 9000, 9500, 9000],
})`, `sales = pd.DataFrame({
    "sale_id": [1, 2, 3],
    "product_id": [7, 8, 8],
    "year": [2015, 2013, 2014],
    "quantity": [1, 2, 3],
    "price": [10, 20, 30],
})`],
    sig: 'def solve(sales: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(sales):
    first = sales.groupby("product_id")["year"].transform("min")
    r = sales.loc[sales["year"] == first, ["product_id", "year", "quantity", "price"]]
    return r.rename(columns={"year": "first_year"}).reset_index(drop=True)`,
    wrong: [`def solve(sales):
    r = sales.loc[sales["year"] == sales["year"].min(), ["product_id", "year", "quantity", "price"]]
    return r.rename(columns={"year": "first_year"}).reset_index(drop=True)`],
    hints: ['The first year is different for every product.', 'transform("min") keeps the original row count.'],
    why: 'Transform broadcasts each product\'s minimum year back to its rows, so a single comparison keeps exactly the first-year rows, including several sales in that year.',
    mistakes: 'The minimum year of the whole table is only right for products that launched first. Using drop_duplicates would lose repeated sales in the first year.' },

  { t: 'Monthly Approved and Total', tags: ['groupby', 'agg', 'zero groups'],
    story: 'Finance wants a monthly report per country that shows both all transactions and the approved ones, including months where nothing was approved.',
    task: 'For each (month, country) return month (YYYY-MM), country, trans_count, approved_count, trans_total_amount and approved_total_amount.',
    setup: `txns = pd.DataFrame({
    "id": [1, 2, 3, 4, 5],
    "country": ["US", "US", "US", "DE", "DE"],
    "state": ["approved", "declined", "approved", "approved", "approved"],
    "amount": [100, 50, 200, 300, 150],
    "trans_date": ["2024-01-05", "2024-01-20", "2024-02-02", "2024-01-11", "2024-01-30"],
})`,
    hidden: [`txns = pd.DataFrame({
    "id": [1, 2, 3, 4],
    "country": ["US", "US", "DE", "DE"],
    "state": ["declined", "declined", "approved", "declined"],
    "amount": [10, 20, 30, 40],
    "trans_date": ["2024-01-05", "2024-01-06", "2024-01-07", "2024-02-01"],
})`, `txns = pd.DataFrame({
    "id": [1, 2],
    "country": ["FR", "FR"],
    "state": ["approved", "declined"],
    "amount": [5, 6],
    "trans_date": ["2023-12-31", "2024-01-01"],
})`],
    sig: 'def solve(txns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(txns):
    t = txns.assign(month=txns["trans_date"].str[:7], ok=txns["state"] == "approved")
    t["ok_amount"] = t["amount"].where(t["ok"], 0)
    return t.groupby(["month", "country"]).agg(
        trans_count=("id", "size"),
        approved_count=("ok", "sum"),
        trans_total_amount=("amount", "sum"),
        approved_total_amount=("ok_amount", "sum"),
    ).reset_index()`,
    wrong: [`def solve(txns):
    t = txns.assign(month=txns["trans_date"].str[:7])
    a = t[t["state"] == "approved"].groupby(["month", "country"]).agg(approved_count=("id", "size"), approved_total_amount=("amount", "sum"))
    b = t.groupby(["month", "country"]).agg(trans_count=("id", "size"), trans_total_amount=("amount", "sum"))
    r = b.join(a, how="inner").reset_index()
    return r[["month", "country", "trans_count", "approved_count", "trans_total_amount", "approved_total_amount"]]`],
    hints: ['Add helper columns first: the month, an "approved" flag, and the amount counted only when approved.', 'Group once and aggregate all four numbers in a single agg call.'],
    why: 'Helper columns turn conditional counts and sums into plain sums, so one groupby produces every figure and no group is lost.',
    mistakes: 'Filtering to approved rows first (or inner-joining the two groupbys) removes groups with no approved transactions instead of reporting 0.' },

  { t: 'First Orders Delivered at Once', tags: ['sorting', 'drop_duplicates', 'percentage'],
    story: 'A delivery is immediate when the customer\'s preferred date equals the order date. The business only judges each customer by their first order.',
    task: 'Return one row with immediate_percentage: the percentage of customers whose first order (earliest order_date) was immediate, rounded to 2 decimals.',
    setup: `delivery = pd.DataFrame({
    "delivery_id": [1, 2, 3, 4],
    "customer_id": [1, 1, 2, 2],
    "order_date": ["2024-05-01", "2024-05-10", "2024-05-02", "2024-05-12"],
    "customer_pref_delivery_date": ["2024-05-01", "2024-05-15", "2024-05-05", "2024-05-12"],
})`,
    hidden: [`delivery = pd.DataFrame({
    "delivery_id": [1, 2, 3, 4, 5],
    "customer_id": [1, 1, 1, 2, 3],
    "order_date": ["2024-06-09", "2024-06-01", "2024-06-05", "2024-06-02", "2024-06-03"],
    "customer_pref_delivery_date": ["2024-06-20", "2024-06-01", "2024-06-05", "2024-06-04", "2024-06-03"],
})`, `delivery = pd.DataFrame({
    "delivery_id": [1, 2, 3],
    "customer_id": [8, 9, 9],
    "order_date": ["2024-07-01", "2024-07-08", "2024-07-02"],
    "customer_pref_delivery_date": ["2024-07-01", "2024-07-08", "2024-07-02"],
})`],
    sig: 'def solve(delivery: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(delivery):
    d = delivery.sort_values("order_date").drop_duplicates("customer_id")
    pct = (d["order_date"] == d["customer_pref_delivery_date"]).mean() * 100
    return pd.DataFrame({"immediate_percentage": [round(pct, 2)]})`,
    wrong: [`def solve(delivery):
    pct = (delivery["order_date"] == delivery["customer_pref_delivery_date"]).mean() * 100
    return pd.DataFrame({"immediate_percentage": [round(pct, 2)]})`],
    hints: ['Sort by order_date before keeping one row per customer.', 'The mean of a boolean column times 100 is a percentage.'],
    why: 'Sorting by date and dropping duplicate customers keeps each customer\'s earliest order. The boolean mean over those rows is the share of immediate first orders.',
    mistakes: 'Averaging over all orders weights customers with many orders more heavily. drop_duplicates without sorting keeps whichever row came first in the file.' },

  { t: 'Last Person Who Fits on the Bus', tags: ['cumsum', 'sorting'],
    story: 'People board a bus in queue order (the turn column) until the 1000 kg limit would be exceeded. Nobody boards after the first person who does not fit.',
    task: 'Return a one-row table with person_name: the last person who can board, i.e. the person with the largest turn whose cumulative weight is at most 1000.',
    setup: `queue = pd.DataFrame({
    "person_id": [5, 4, 3, 6, 1, 2],
    "person_name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Fay"],
    "weight": [250, 175, 350, 400, 500, 200],
    "turn": [1, 2, 3, 4, 5, 6],
})`,
    hidden: [`queue = pd.DataFrame({
    "person_id": [1, 2, 3, 4],
    "person_name": ["Gil", "Hal", "Ida", "Jo"],
    "weight": [500, 100, 300, 50],
    "turn": [3, 1, 2, 4],
})`, `queue = pd.DataFrame({
    "person_id": [1, 2],
    "person_name": ["Kit", "Lia"],
    "weight": [1000, 1],
    "turn": [2, 1],
})`],
    sig: 'def solve(queue: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(queue):
    q = queue.sort_values("turn")
    q = q[q["weight"].cumsum() <= 1000]
    return q.tail(1)[["person_name"]].reset_index(drop=True)`,
    wrong: [`def solve(queue):
    q = queue[queue["weight"].cumsum() <= 1000]
    return q.tail(1)[["person_name"]].reset_index(drop=True)`],
    hints: ['A running total only makes sense in boarding order.', 'Sort by turn first, then keep the rows whose cumulative weight is within the limit.'],
    why: 'Sorting by turn makes the cumulative sum follow the real queue. The last row that stays under the limit is the last passenger.',
    mistakes: 'The rows arrive in file order, not turn order, so cumsum() without sorting adds the wrong people together.' },

  { t: 'Count Accounts by Salary Band', tags: ['cut', 'value_counts', 'zero groups'],
    story: 'HR reports how many accounts are in each income band, and all three bands must always appear.',
    task: 'Bands: "Low Salary" (income strictly below 20000), "Average Salary" (20000 to 50000, both included) and "High Salary" (strictly above 50000). Return category and accounts_count for all three bands, 0 when empty.',
    setup: `accounts = pd.DataFrame({"id": [1, 2, 3, 4], "income": [90000, 12000, 30000, 8000]})`,
    hidden: [`accounts = pd.DataFrame({"id": [1, 2, 3, 4], "income": [20000, 50000, 19999, 50001]})`, `accounts = pd.DataFrame({"id": [1, 2], "income": [40000, 45000]})`],
    sig: 'def solve(accounts: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(accounts):
    labels = ["Low Salary", "Average Salary", "High Salary"]
    cat = pd.cut(accounts["income"], [-np.inf, 19999, 50000, np.inf], labels=labels)
    counts = cat.value_counts().reindex(labels, fill_value=0)
    return pd.DataFrame({"category": labels, "accounts_count": counts.to_numpy()})`,
    wrong: [`def solve(accounts):
    c = np.select([accounts["income"] < 20000, accounts["income"] <= 50000], ["Low Salary", "Average Salary"], "High Salary")
    vc = pd.Series(c).value_counts()
    return vc.rename_axis("category").reset_index(name="accounts_count")`],
    hints: ['Think about which band exactly 20000 and exactly 50000 belong to.', 'Reindex the counts against the full list of three bands so empty bands show 0.'],
    why: 'pd.cut assigns each income to a labelled band, and reindexing the counts against the label list guarantees one row per band.',
    mistakes: 'value_counts() only reports bands that occur, so an empty band silently disappears. Boundary values are the usual off-by-one trap.' },

  { t: 'Investments Worth Counting', tags: ['duplicated', 'masks'],
    story: 'An insurer sums the 2016 value of policies that are comparable (their 2015 value is shared by at least one other policy) and geographically unique (no other policy has the same latitude and longitude).',
    task: 'Return one row with tiv_2016: the sum of tiv_2016 over policies with a tiv_2015 that appears in at least one other policy AND a (lat, lon) pair that appears in no other policy. Round to 2 decimals.',
    setup: `insurance = pd.DataFrame({
    "pid": [1, 2, 3, 4],
    "tiv_2015": [10, 20, 10, 10],
    "tiv_2016": [5.0, 20.0, 30.0, 40.0],
    "lat": [10.0, 20.0, 30.0, 40.0],
    "lon": [10.0, 20.0, 30.0, 40.0],
})`,
    hidden: [`insurance = pd.DataFrame({
    "pid": [1, 2, 3, 4, 5],
    "tiv_2015": [10, 20, 10, 10, 20],
    "tiv_2016": [5.0, 20.0, 30.0, 40.0, 7.5],
    "lat": [10.0, 20.0, 20.0, 40.0, 50.0],
    "lon": [10.0, 20.0, 20.0, 40.0, 50.0],
})`, `insurance = pd.DataFrame({
    "pid": [1, 2, 3],
    "tiv_2015": [1, 1, 1],
    "tiv_2016": [1.25, 2.5, 3.0],
    "lat": [1.0, 1.0, 2.0],
    "lon": [1.0, 2.0, 2.0],
})`],
    sig: 'def solve(insurance: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(insurance):
    shared = insurance.duplicated("tiv_2015", keep=False)
    unique_loc = ~insurance.duplicated(["lat", "lon"], keep=False)
    return pd.DataFrame({"tiv_2016": [round(insurance.loc[shared & unique_loc, "tiv_2016"].sum(), 2)]})`,
    wrong: [`def solve(insurance):
    shared = insurance.duplicated("tiv_2015", keep=False)
    return pd.DataFrame({"tiv_2016": [round(insurance.loc[shared, "tiv_2016"].sum(), 2)]})`],
    hints: ['duplicated(keep=False) marks every member of a duplicate group, not just the later ones.', 'Combine both conditions with &.'],
    why: 'keep=False flags all rows that share a value, so one mask means "shared 2015 value" and the negated one means "unique location".',
    mistakes: 'Keeping the default keep="first" misses the first row of each duplicate group. Forgetting the location rule overcounts.' },

  { t: 'Most Connected Person', tags: ['concat', 'value_counts'],
    story: 'Every accepted friend request makes two people friends. A person\'s friend count includes the requests they sent and the ones they accepted.',
    task: 'Return id and num for the person (or people, if tied) with the most friends.',
    setup: `requests = pd.DataFrame({"requester_id": [1, 2, 4, 5], "accepter_id": [3, 3, 3, 6]})`,
    hidden: [`requests = pd.DataFrame({"requester_id": [5, 5, 5, 6], "accepter_id": [6, 7, 8, 7]})`, `requests = pd.DataFrame({"requester_id": [1, 2], "accepter_id": [2, 3]})`],
    sig: 'def solve(requests: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(requests):
    both = pd.concat([requests["requester_id"], requests["accepter_id"]])
    c = both.value_counts()
    top = c[c == c.max()]
    return pd.DataFrame({"id": top.index.to_numpy(), "num": top.to_numpy()})`,
    wrong: [`def solve(requests):
    c = requests["accepter_id"].value_counts()
    top = c[c == c.max()]
    return pd.DataFrame({"id": top.index.to_numpy(), "num": top.to_numpy()})`],
    hints: ['A friendship counts for both people involved.', 'Stack the two id columns into one Series, then count.'],
    why: 'Concatenating requester and accepter ids puts both sides of every friendship into one column, so value_counts gives each person\'s total.',
    mistakes: 'Counting only one of the two columns ignores half of every friendship. Taking only the first row of the sorted counts hides ties.' },

  { t: 'Crowded Stadium Days', tags: ['runs', 'consecutive ids'],
    story: 'A stadium is crowded on a visit when at least 100 people came. Auditors only flag crowds that last at least three consecutive ids.',
    task: 'Return id, visit_date and people of every row with people >= 100 that belongs to a stretch of at least 3 consecutive ids that all have people >= 100.',
    setup: `stadium = pd.DataFrame({
    "id": [1, 2, 3, 4, 5],
    "visit_date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
    "people": [10, 150, 160, 170, 20],
})`,
    hidden: [`stadium = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6],
    "visit_date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"],
    "people": [10, 150, 160, 170, 180, 20],
})`, `stadium = pd.DataFrame({
    "id": [1, 2, 3, 4, 5, 6, 7, 8],
    "visit_date": ["2024-02-01", "2024-02-02", "2024-02-03", "2024-02-04", "2024-02-05", "2024-02-06", "2024-02-07", "2024-02-08"],
    "people": [100, 100, 5, 99, 100, 101, 102, 3],
})`],
    sig: 'def solve(stadium: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(stadium):
    s = stadium.sort_values("id")
    big = s[s["people"] >= 100]
    run = big["id"] - np.arange(len(big))
    size = big.groupby(run)["id"].transform("size")
    return big.loc[size >= 3, ["id", "visit_date", "people"]].reset_index(drop=True)`,
    wrong: [`def solve(stadium):
    s = stadium.sort_values("id")
    big = s[s["people"] >= 100]
    if len(big) < 3:
        return big.iloc[0:0][["id", "visit_date", "people"]]
    return big[["id", "visit_date", "people"]].reset_index(drop=True)`],
    hints: ['In a run of consecutive ids, id minus the row number stays constant.', 'Count how many rows share the same constant.'],
    why: 'After keeping only crowded days, id - position is identical for ids that follow each other, so grouping by it finds the runs and their sizes.',
    mistakes: 'Counting crowded days overall mixes separate stretches. A gap in the ids breaks a run even if the days around it were crowded.' },

  { t: 'Largest Number That Appears Once', tags: ['value_counts', 'edge case'],
    story: 'A lottery audit looks for the largest number that was drawn exactly once. If every number repeated, there is no answer.',
    task: 'Return a one-row table with the column num: the largest number that appears exactly once in nums, or a missing value when there is none.',
    setup: `nums = pd.DataFrame({"num": [8, 3, 3, 1, 4, 5, 6]})`,
    hidden: [`nums = pd.DataFrame({"num": [8, 8, 3, 3, 1, 4, 5, 6]})`, `nums = pd.DataFrame({"num": [4, 4, 2, 2]})`],
    sig: 'def solve(nums: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(nums):
    vc = nums["num"].value_counts()
    singles = vc[vc == 1]
    return pd.DataFrame({"num": [singles.index.max() if len(singles) else None]})`,
    wrong: [`def solve(nums):
    return pd.DataFrame({"num": [nums["num"].max()]})`],
    hints: ['Count how often each number occurs first.', 'The "no answer" case needs an explicit check.'],
    why: 'value_counts finds numbers that occur once; the maximum of that index is the answer, with an explicit fallback for an empty set.',
    mistakes: 'max() of the raw column ignores repeats. max() of an empty index raises an error, so check its length first.' },

  { t: 'Five Days in a Row', tags: ['runs', 'dates', 'dedupe'],
    story: 'A streak badge is awarded to users who logged in on at least 5 consecutive calendar days. A user may log in several times a day.',
    task: 'Return the user_id of every user with a streak of 5 or more consecutive days.',
    setup: `logins = pd.DataFrame({
    "user_id": [1, 1, 1, 1, 1, 2, 2, 2],
    "login_date": pd.to_datetime(["2024-04-01", "2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05", "2024-04-01", "2024-04-02", "2024-04-04"]),
})`,
    hidden: [`logins = pd.DataFrame({
    "user_id": [3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4],
    "login_date": pd.to_datetime(["2024-04-01", "2024-04-02", "2024-04-04", "2024-04-05", "2024-04-06", "2024-04-01", "2024-04-01", "2024-04-02", "2024-04-03", "2024-04-04", "2024-04-05"]),
})`, `logins = pd.DataFrame({
    "user_id": [5, 5, 5, 5, 5, 5],
    "login_date": pd.to_datetime(["2024-05-01", "2024-05-01", "2024-05-02", "2024-05-03", "2024-05-04", "2024-05-04"]),
})`],
    sig: 'def solve(logins: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(logins):
    d = logins.drop_duplicates().sort_values(["user_id", "login_date"])
    key = d["login_date"] - pd.to_timedelta(d.groupby("user_id").cumcount(), unit="D")
    size = d.groupby(["user_id", key])["login_date"].transform("size")
    return d.loc[size >= 5, ["user_id"]].drop_duplicates().reset_index(drop=True)`,
    wrong: [`def solve(logins):
    n = logins.drop_duplicates().groupby("user_id")["login_date"].size()
    return pd.DataFrame({"user_id": n[n >= 5].index.to_numpy()})`],
    hints: ['Remove repeated logins on the same day first.', 'Within a streak, date minus position (cumcount) is constant.'],
    why: 'Subtracting each login\'s position from its date gives every streak one shared anchor date, so grouping by it measures streak lengths.',
    mistakes: 'Counting login days ignores gaps. Not removing same-day duplicates inflates streaks.' },

  { t: 'Orders in 2019 for Every Buyer', tags: ['merge', 'left join', 'fillna'],
    story: 'Marketing wants to know how many orders each registered user placed as a buyer in 2019, including users who bought nothing.',
    task: 'Return buyer_id, join_date and orders_in_2019 for every user in users. Orders are counted when order_date is in 2019.',
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3], "join_date": ["2018-01-01", "2018-02-09", "2018-01-19"]})
orders = pd.DataFrame({
    "order_id": [1, 2, 3, 4],
    "order_date": ["2019-08-01", "2018-08-02", "2019-08-03", "2019-08-04"],
    "buyer_id": [1, 1, 2, 3],
})`,
    hidden: [`users = pd.DataFrame({"user_id": [1, 2, 3], "join_date": ["2018-01-01", "2018-02-09", "2018-01-19"]})
orders = pd.DataFrame({
    "order_id": [1, 2, 3],
    "order_date": ["2019-01-01", "2020-01-01", "2019-12-31"],
    "buyer_id": [1, 2, 1],
})`, `users = pd.DataFrame({"user_id": [7, 8], "join_date": ["2019-03-03", "2019-04-04"]})
orders = pd.DataFrame({"order_id": [1], "order_date": ["2018-12-31"], "buyer_id": [7]})`],
    sig: 'def solve(users: pd.DataFrame, orders: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, orders):
    o = orders[orders["order_date"].str.startswith("2019")]
    n = o.groupby("buyer_id").size()
    out = users[["user_id", "join_date"]].rename(columns={"user_id": "buyer_id"})
    out["orders_in_2019"] = out["buyer_id"].map(n).fillna(0).astype(int)
    return out.reset_index(drop=True)`,
    wrong: [`def solve(users, orders):
    o = orders[orders["order_date"].str.startswith("2019")]
    n = o.groupby("buyer_id").size().rename("orders_in_2019").reset_index()
    out = users.merge(n, left_on="user_id", right_on="buyer_id")
    return out[["buyer_id", "join_date", "orders_in_2019"]].reset_index(drop=True)`],
    hints: ['Start from the users table so nobody is lost.', 'Missing counts after the lookup need to become 0.'],
    why: 'Count 2019 orders per buyer, then map the counts onto the full user list and fill the gaps with 0.',
    mistakes: 'An inner merge drops users with no 2019 orders. fillna(0) leaves floats, so cast back to int.' },

  { t: 'Price on the Reporting Date', tags: ['sorting', 'default value'],
    story: 'Each row records a price change for a product. A product\'s price at a date is the last change on or before that date. Before its first change a product costs 10.',
    task: 'Return product_id and price as of 2019-08-16 for every product that appears in prices.',
    setup: `prices = pd.DataFrame({
    "product_id": [1, 2, 1, 1, 2],
    "new_price": [20, 50, 30, 35, 65],
    "change_date": ["2019-08-14", "2019-08-14", "2019-08-15", "2019-08-20", "2019-08-18"],
})`,
    hidden: [`prices = pd.DataFrame({
    "product_id": [1, 2, 3],
    "new_price": [20, 50, 7],
    "change_date": ["2019-08-14", "2019-08-17", "2019-08-16"],
})`, `prices = pd.DataFrame({
    "product_id": [9, 9, 9],
    "new_price": [3, 4, 5],
    "change_date": ["2019-09-01", "2019-09-02", "2019-09-03"],
})`],
    sig: 'def solve(prices: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(prices):
    cut = (prices[prices["change_date"] <= "2019-08-16"]
           .sort_values("change_date").drop_duplicates("product_id", keep="last")
           .set_index("product_id")["new_price"])
    ids = pd.Series(prices["product_id"].unique(), name="product_id")
    return pd.DataFrame({"product_id": ids, "price": ids.map(cut).fillna(10).astype(int)})`,
    wrong: [`def solve(prices):
    cut = (prices[prices["change_date"] <= "2019-08-16"]
           .sort_values("change_date").drop_duplicates("product_id", keep="last"))
    return cut[["product_id", "new_price"]].rename(columns={"new_price": "price"}).reset_index(drop=True)`],
    hints: ['Keep only changes up to the date, then the latest per product.', 'Products with no change before the date still need a row.'],
    why: 'Filter to changes on or before the date, keep the last per product, then look prices up for every product id and default to 10.',
    mistakes: 'Filtering first removes products whose first change comes later, and they must still appear with the default price.' },

  { t: 'Seven-Day Moving Revenue', tags: ['rolling', 'groupby'],
    story: 'Several customers can pay on the same day. The dashboard shows revenue over a moving window of the current day and the 6 days before it.',
    task: 'First add up the amounts per day. Then, for every day that has 6 earlier days of data, return visited_on, amount (the 7-day sum) and average_amount (that sum divided by 7, rounded to 2 decimals). Days are consecutive.',
    o: true,
    setup: `customer = pd.DataFrame({
    "customer_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "visited_on": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07", "2024-01-08"],
    "amount": [100, 110, 120, 130, 140, 150, 160, 170],
})`,
    hidden: [`customer = pd.DataFrame({
    "customer_id": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "visited_on": ["2024-01-01", "2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07", "2024-01-08"],
    "amount": [50, 40, 110, 120, 130, 140, 150, 160, 170],
})`, `customer = pd.DataFrame({
    "customer_id": [1, 2, 3, 4, 5, 6, 7, 8],
    "visited_on": ["2024-02-26", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02", "2024-03-02", "2024-03-03"],
    "amount": [10, 20, 30, 40, 50, 60, 5, 70],
})`],
    sig: 'def solve(customer: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customer):
    d = customer.groupby("visited_on", as_index=False)["amount"].sum().sort_values("visited_on")
    d["amount"] = d["amount"].rolling(7).sum()
    d["average_amount"] = (d["amount"] / 7).round(2)
    return d.dropna(subset=["amount"]).reset_index(drop=True)`,
    wrong: [`def solve(customer):
    d = customer.sort_values("visited_on").reset_index(drop=True)
    d["window"] = d["amount"].rolling(7).sum()
    d["average_amount"] = (d["window"] / 7).round(2)
    d = d.dropna(subset=["window"])
    return d[["visited_on", "window", "average_amount"]].rename(columns={"window": "amount"}).reset_index(drop=True)`],
    hints: ['Collapse to one row per day before rolling.', 'rolling(7) leaves the first six results empty.'],
    why: 'Aggregating per day first makes one row per calendar day, so a 7-row rolling window is a 7-day window. The first six days have no full window and are dropped.',
    mistakes: 'Rolling over the raw payments mixes up rows and days when a day has several payments.' },

  { t: 'Prolific Rater and Top Movie', tags: ['groupby', 'tie-breaks'],
    story: 'A streaming service names two winners: the user who rated the most movies, and the movie with the best average rating in February 2020. Ties go to the alphabetically smaller name (user) or title (movie).',
    task: 'Return a one-row-per-winner table with a single column results: first the winning user\'s name, then the winning movie\'s title.',
    o: true,
    setup: `users = pd.DataFrame({"user_id": [1, 2, 3], "name": ["Daniel", "Monica", "Maria"]})
movies = pd.DataFrame({"movie_id": [1, 2, 3], "title": ["Avengers", "Frozen 2", "Joker"]})
ratings = pd.DataFrame({
    "movie_id": [1, 1, 1, 2, 2, 3, 3],
    "user_id": [1, 2, 3, 1, 2, 1, 2],
    "rating": [3, 4, 2, 4, 5, 3, 4],
    "created_at": pd.to_datetime(["2020-01-12", "2020-02-11", "2020-02-12", "2020-01-01", "2020-02-17", "2020-02-01", "2020-03-01"]),
})`,
    hidden: [`users = pd.DataFrame({"user_id": [1, 2], "name": ["Zed", "Abe"]})
movies = pd.DataFrame({"movie_id": [1, 2], "title": ["Up", "Alien"]})
ratings = pd.DataFrame({
    "movie_id": [1, 2, 1, 2],
    "user_id": [1, 1, 2, 2],
    "rating": [4, 4, 4, 4],
    "created_at": pd.to_datetime(["2020-02-01", "2020-02-02", "2020-02-03", "2020-02-04"]),
})`, `users = pd.DataFrame({"user_id": [1, 2, 3], "name": ["Eli", "Fay", "Gus"]})
movies = pd.DataFrame({"movie_id": [1, 2, 3], "title": ["Zorro", "Fargo", "Heat"]})
ratings = pd.DataFrame({
    "movie_id": [3, 3, 2, 1, 1],
    "user_id": [3, 3, 2, 2, 1],
    "rating": [5, 3, 4, 5, 3],
    "created_at": pd.to_datetime(["2020-02-10", "2020-02-11", "2020-02-12", "2020-02-13", "2020-01-31"]),
})`],
    sig: 'def solve(users: pd.DataFrame, movies: pd.DataFrame, ratings: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(users, movies, ratings):
    n = ratings.merge(users, on="user_id").groupby("name").size()
    best_user = sorted(n[n == n.max()].index)[0]
    feb = ratings[ratings["created_at"].dt.strftime("%Y-%m") == "2020-02"]
    a = feb.merge(movies, on="movie_id").groupby("title")["rating"].mean()
    best_movie = sorted(a[a == a.max()].index)[0]
    return pd.DataFrame({"results": [best_user, best_movie]})`,
    wrong: [`def solve(users, movies, ratings):
    n = ratings.groupby("user_id").size()
    uid = n.idxmax()
    best_user = users.loc[users["user_id"] == uid, "name"].iloc[0]
    feb = ratings[ratings["created_at"].dt.strftime("%Y-%m") == "2020-02"]
    a = feb.groupby("movie_id")["rating"].mean()
    mid = a.idxmax()
    best_movie = movies.loc[movies["movie_id"] == mid, "title"].iloc[0]
    return pd.DataFrame({"results": [best_user, best_movie]})`],
    hints: ['Collect every candidate that ties for the maximum, then take the alphabetically smallest.', 'idxmax() returns whichever tied label comes first in the index, not the alphabetical first.'],
    why: 'Filter all maximum-holders with a boolean mask on the value counts or means, and break ties with sorted() on the names.',
    mistakes: 'idxmax() returns one winner by index order, which is the user id or movie id order here, not the alphabetical tie-break the question asks for.' },

  { t: 'Seats Next to a Free Seat', tags: ['adjacency', 'gaps'],
    story: 'A cinema table lists seats by seat_id, and some seat ids may be missing because the seat does not exist. Two seats are adjacent only when their ids differ by exactly 1.',
    task: 'Return seat_id (ordered ascending) of every free seat that has a free seat with an id exactly one lower or one higher.',
    o: true,
    setup: `cinema = pd.DataFrame({"seat_id": [1, 2, 3, 4, 5], "free": [1, 0, 1, 1, 0]})`,
    hidden: [`cinema = pd.DataFrame({"seat_id": [1, 2, 4, 5, 6], "free": [1, 1, 1, 0, 1]})`, `cinema = pd.DataFrame({"seat_id": [5, 3, 4, 1, 2], "free": [1, 1, 1, 0, 1]})`],
    sig: 'def solve(cinema: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(cinema):
    f = cinema[cinema["free"] == 1]
    ids = set(f["seat_id"])
    keep = f["seat_id"].map(lambda s: (s - 1) in ids or (s + 1) in ids)
    return f.loc[keep, ["seat_id"]].sort_values("seat_id").reset_index(drop=True)`,
    wrong: [`def solve(cinema):
    c = cinema.sort_values("seat_id").reset_index(drop=True)
    free = c["free"] == 1
    keep = free & (free.shift(fill_value=False) | free.shift(-1, fill_value=False))
    return c.loc[keep, ["seat_id"]].reset_index(drop=True)`],
    hints: ['Adjacent means id +/- 1, not "next row".', 'A set of free ids makes the neighbour test cheap.'],
    why: 'Keep the free seats, put their ids in a set, and test whether id-1 or id+1 is also in it.',
    mistakes: 'shift() looks at neighbouring rows, which are not neighbouring seats when an id is missing or when the rows are unsorted.' },

  { t: 'Best Course per Student', tags: ['sorting', 'tie-breaks'],
    story: 'Each enrollment row has a grade. Registrars report every student\'s best course; if two courses share the best grade, they report the one with the smaller course_id.',
    task: 'Return student_id, course_id and grade of each student\'s best enrollment, ordered by student_id.',
    o: true,
    setup: `enrollments = pd.DataFrame({
    "student_id": [2, 2, 1, 1, 3],
    "course_id": [2, 3, 1, 2, 1],
    "grade": [95, 95, 90, 85, 100],
})`,
    hidden: [`enrollments = pd.DataFrame({
    "student_id": [1, 1, 1, 2],
    "course_id": [5, 3, 4, 9],
    "grade": [80, 80, 70, 60],
})`, `enrollments = pd.DataFrame({
    "student_id": [4, 4, 5],
    "course_id": [7, 6, 2],
    "grade": [90, 90, 55],
})`],
    sig: 'def solve(enrollments: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(enrollments):
    r = enrollments.sort_values(["student_id", "grade", "course_id"], ascending=[True, False, True])
    return r.drop_duplicates("student_id")[["student_id", "course_id", "grade"]].reset_index(drop=True)`,
    wrong: [`def solve(enrollments):
    r = enrollments.sort_values("grade", ascending=False, kind="stable").drop_duplicates("student_id")
    return r.sort_values("student_id")[["student_id", "course_id", "grade"]].reset_index(drop=True)`],
    hints: ['Sort with several keys: student, grade (high first), course_id (low first).', 'Then keep the first row per student.'],
    why: 'Sorting by all three keys makes the first row per student the best grade with the smallest course id among ties.',
    mistakes: 'Sorting by grade alone leaves ties in whatever order the file had them.' },

  { t: 'Label the Tree Nodes', tags: ['apply', 'edge case'],
    story: 'A tree table lists every node with its parent. A node with no parent is the Root, a node that is somebody\'s parent is Inner, and the rest are Leaf. A tree with a single node has just a Root.',
    task: 'Return id and type ("Root", "Inner" or "Leaf") for every node.',
    setup: `tree = pd.DataFrame({"id": [1, 2, 3, 4, 5], "p_id": [np.nan, 1, 1, 2, 2]})`,
    hidden: [`tree = pd.DataFrame({"id": [1], "p_id": [np.nan]})`, `tree = pd.DataFrame({"id": [1, 2, 3], "p_id": [2, 3, np.nan]})`],
    sig: 'def solve(tree: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(tree):
    parents = set(tree["p_id"].dropna())
    def label(r):
        if pd.isna(r["p_id"]):
            return "Root"
        return "Inner" if r["id"] in parents else "Leaf"
    return pd.DataFrame({"id": tree["id"], "type": tree.apply(label, axis=1)})`,
    wrong: [`def solve(tree):
    parents = set(tree["p_id"].dropna())
    def label(r):
        if r["id"] not in parents:
            return "Leaf"
        return "Root" if pd.isna(r["p_id"]) else "Inner"
    return pd.DataFrame({"id": tree["id"], "type": tree.apply(label, axis=1)})`],
    hints: ['Decide the Root case first: it has priority over everything else.', 'A node is Inner when its id appears in the p_id column.'],
    why: 'Check for a missing parent first, then check whether the node is a parent of somebody. The order of the checks matters.',
    mistakes: 'Checking "has no children" first labels a lone root as a Leaf.' },
];
