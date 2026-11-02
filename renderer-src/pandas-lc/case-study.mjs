// Case Study: ten business questions about one company, Ridgeway Outfitters, an outdoor-gear retailer.
// Every question uses the same tables and column names, so the context carries from one to the next:
//   products(product_id, product, category, unit_cost)   regions(region_id, region)
//   customers(customer_id, customer, segment)            orders(order_id, customer_id, region_id, quarter)
//   lines(order_id, product_id, qty, unit_price, discount)  returns(order_id, product_id, qty_returned)
// The story is the request as a manager would make it; `measure` pins down the rules so there is one answer.
export default [
  { t: 'Products Losing Money Across Regions', tags: ['profit', 'groupby', 'filtering'], o: true,
    story: 'The merchandising lead at Ridgeway Outfitters wants the products that are losing money consistently across regions, so they can be repriced or dropped.',
    measure: [
      'Profit on a line = (unit price - unit cost) x quantity - discount.',
      'A product loses money in a region when its total profit there is below zero.',
      'Consistently means losing money in more than 3 regions.',
    ],
    task: 'Return product, regions_losing and total_loss (its losses in those regions added up, as a positive number), largest total_loss first, ties by product.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
regions = pd.DataFrame({"region_id": [1, 2, 3, 4, 5], "region": ["North", "South", "East", "West", "Central"]})
orders = pd.DataFrame({"order_id": list(range(1, 11)), "customer_id": [1] * 10, "region_id": [1, 2, 3, 4, 5] * 2, "quarter": [1] * 10})
lines = pd.DataFrame({"order_id": list(range(1, 11)), "product_id": [1] * 5 + [2] * 5, "qty": [1] * 10, "unit_price": [90, 90, 90, 90, 150, 40, 40, 40, 80, 80], "discount": [0] * 10})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
regions = pd.DataFrame({"region_id": [1, 2, 3, 4, 5], "region": ["North", "South", "East", "West", "Central"]})
orders = pd.DataFrame({"order_id": list(range(1, 12)), "customer_id": [1] * 11, "region_id": [1, 2, 3, 4, 5] * 2 + [1], "quarter": [1] * 11})
lines = pd.DataFrame({"order_id": list(range(1, 12)), "product_id": [1] * 5 + [2] * 5 + [1], "qty": [1] * 11, "unit_price": [90, 90, 90, 90, 150, 40, 40, 40, 80, 80, 200], "discount": [0] * 11})`,
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
regions = pd.DataFrame({"region_id": [1, 2, 3, 4, 5], "region": ["North", "South", "East", "West", "Central"]})
orders = pd.DataFrame({"order_id": list(range(1, 11)), "customer_id": [1] * 10, "region_id": [1, 2, 3, 4, 5] * 2, "quarter": [1] * 10})
lines = pd.DataFrame({"order_id": list(range(1, 11)), "product_id": [1] * 5 + [2] * 5, "qty": [1] * 10, "unit_price": [90, 90, 90, 90, 150, 40, 40, 40, 40, 80], "discount": [0] * 10})`,
    ],
    sig: 'def solve(products: pd.DataFrame, regions: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, regions, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id").merge(regions, on="region_id")
    d["profit"] = (d["unit_price"] - d["unit_cost"]) * d["qty"] - d["discount"]
    pr = d.groupby(["product", "region"], as_index=False)["profit"].sum()
    loss = pr[pr["profit"] < 0]
    g = loss.groupby("product", as_index=False).agg(regions_losing=("region", "size"), total_loss=("profit", "sum"))
    g = g[g["regions_losing"] > 3].copy()
    g["total_loss"] = (-g["total_loss"]).astype(int)
    return g.sort_values(["total_loss", "product"], ascending=[False, True]).reset_index(drop=True)`,
    wrong: [`def solve(products, regions, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id").merge(regions, on="region_id")
    d["profit"] = (d["unit_price"] - d["unit_cost"]) * d["qty"] - d["discount"]
    bad = d[d["profit"] < 0]
    g = bad.groupby("product", as_index=False).agg(regions_losing=("region", "nunique"), total_loss=("profit", "sum"))
    g = g[g["regions_losing"] > 3].copy()
    g["total_loss"] = (-g["total_loss"]).astype(int)
    return g.sort_values(["total_loss", "product"], ascending=[False, True]).reset_index(drop=True)`],
    hints: ['Total the profit per product and region before deciding whether that region is a loss.', 'Then count the losing regions per product.'],
    why: 'A region is judged on its total, so one bad sale in a region that made money overall does not count against the product.',
    mistakes: 'Counting regions that contain any losing line flags a product for a single discounted sale in a region that was profitable overall.' },

  { t: 'Top Customers Who Lose Us Money', tags: ['percentile', 'profit', 'ranking'], o: true,
    story: 'Finance suspects some of Ridgeway\'s biggest customers are actually costing money. They want the top 10% of customers by sales whose overall profit is negative.',
    measure: [
      'Sales on a line = unit price x quantity - discount; a customer\'s sales add up their lines.',
      'Profit = sales - unit cost x quantity.',
      'The top 10% is the 10% of customers who placed an order, rounded up (so 15 customers gives 2), ranked by sales, ties by customer_id.',
    ],
    task: 'Return customer, sales and profit for the top-10% customers whose profit is below zero, highest sales first.',
    setup: `products = pd.DataFrame({"product_id": [1], "product": ["Tent"], "category": ["Camping"], "unit_cost": [50]})
customers = pd.DataFrame({"customer_id": list(range(1, 11)), "customer": ["Asha", "Ben", "Chitra", "Dev", "Esha", "Farid", "Gita", "Hari", "Isha", "Jai"], "segment": ["retail"] * 10})
orders = pd.DataFrame({"order_id": list(range(1, 11)), "customer_id": list(range(1, 11)), "region_id": [1] * 10, "quarter": [1] * 10})
lines = pd.DataFrame({"order_id": list(range(1, 11)), "product_id": [1] * 10, "qty": [10] + [2] * 9, "unit_price": [40] + [80] * 9, "discount": [0] * 10})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1], "product": ["Tent"], "category": ["Camping"], "unit_cost": [50]})
customers = pd.DataFrame({"customer_id": list(range(1, 11)), "customer": ["Asha", "Ben", "Chitra", "Dev", "Esha", "Farid", "Gita", "Hari", "Isha", "Jai"], "segment": ["retail"] * 10})
orders = pd.DataFrame({"order_id": list(range(1, 11)), "customer_id": list(range(1, 11)), "region_id": [1] * 10, "quarter": [1] * 10})
lines = pd.DataFrame({"order_id": list(range(1, 11)), "product_id": [1] * 10, "qty": [10, 5] + [2] * 8, "unit_price": [40, 80] + [80] * 8, "discount": [300, 0] + [0] * 8})`,
      `products = pd.DataFrame({"product_id": [1], "product": ["Tent"], "category": ["Camping"], "unit_cost": [50]})
customers = pd.DataFrame({"customer_id": list(range(1, 16)), "customer": ["Asha", "Ben", "Chitra", "Dev", "Esha", "Farid", "Gita", "Hari", "Isha", "Jai", "Kavya", "Lal", "Meera", "Nikhil", "Om"], "segment": ["retail"] * 15})
orders = pd.DataFrame({"order_id": list(range(1, 16)), "customer_id": list(range(1, 16)), "region_id": [1] * 15, "quarter": [1] * 15})
lines = pd.DataFrame({"order_id": list(range(1, 16)), "product_id": [1] * 15, "qty": [10, 6] + [2] * 13, "unit_price": [40, 45] + [80] * 13, "discount": [0] * 15})`,
    ],
    sig: 'def solve(products: pd.DataFrame, customers: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, customers, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["sales"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["sales"] - d["unit_cost"] * d["qty"]
    c = d.groupby("customer_id", as_index=False)[["sales", "profit"]].sum().merge(customers, on="customer_id")
    k = int(np.ceil(0.1 * len(c)))
    top = c.sort_values(["sales", "customer_id"], ascending=[False, True]).head(k)
    out = top[top["profit"] < 0]
    return out[["customer", "sales", "profit"]].reset_index(drop=True)`,
    wrong: [`def solve(products, customers, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["gross"] = d["unit_price"] * d["qty"]
    d["sales"] = d["gross"] - d["discount"]
    d["profit"] = d["sales"] - d["unit_cost"] * d["qty"]
    c = d.groupby("customer_id", as_index=False)[["gross", "sales", "profit"]].sum().merge(customers, on="customer_id")
    k = int(np.ceil(0.1 * len(c)))
    top = c.sort_values(["gross", "customer_id"], ascending=[False, True]).head(k)
    out = top[top["profit"] < 0]
    return out[["customer", "sales", "profit"]].reset_index(drop=True)`, `def solve(products, customers, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["sales"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["sales"] - d["unit_cost"] * d["qty"]
    c = d.groupby("customer_id", as_index=False)[["sales", "profit"]].sum().merge(customers, on="customer_id")
    k = max(1, int(0.1 * len(c)))
    top = c.sort_values(["sales", "customer_id"], ascending=[False, True]).head(k)
    out = top[top["profit"] < 0]
    return out[["customer", "sales", "profit"]].reset_index(drop=True)`],
    hints: ['Rank on sales after discounts, the same figure you report.', 'Ten per cent of 15 customers is 1.5, and the rule says round up.'],
    why: 'The ranking and the report use the same net sales figure, and the cut-off is rounded up as the rule says.',
    mistakes: 'Ranking on sales before discount promotes a customer who was heavily discounted, and rounding down quietly drops the customer at the edge of the top tenth.' },

  { t: 'Discounts That Turned a Sale Into a Loss', tags: ['profit', 'groupby', 'conditions'], o: true,
    story: 'Sales ops at Ridgeway think some discounts went too far. They want the orders that would have made money without the discount, but lost money once it was applied.',
    measure: [
      'An order\'s profit before discount = the sum over its lines of (unit price - unit cost) x quantity.',
      'Its profit after discount subtracts every line\'s discount.',
      'A discount turned the order into a loss when it was profitable before the discount and below zero after it.',
    ],
    task: 'Return order_id, customer, profit_before and profit_after for those orders, ordered by order_id.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 2, 1], "region_id": [1, 1, 2], "quarter": [1, 1, 2]})
products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
lines = pd.DataFrame({"order_id": [1, 2, 3], "product_id": [1, 1, 2], "qty": [1, 2, 1], "unit_price": [150, 150, 90], "discount": [80, 20, 0]})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1, 2, 1, 2], "region_id": [1, 1, 2, 2], "quarter": [1, 1, 2, 2]})
products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 1], "qty": [1, 2, 1, 1], "unit_price": [150, 150, 90, 70], "discount": [80, 20, 0, 10]})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": [1, 2, 1], "region_id": [1, 1, 2], "quarter": [1, 1, 2]})
products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
lines = pd.DataFrame({"order_id": [1, 2, 3], "product_id": [1, 1, 2], "qty": [1, 2, 1], "unit_price": [150, 150, 90], "discount": [80, 150, 0]})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, products: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, products, lines):
    d = lines.merge(products, on="product_id")
    d["before"] = (d["unit_price"] - d["unit_cost"]) * d["qty"]
    d["after"] = d["before"] - d["discount"]
    o = d.groupby("order_id", as_index=False)[["before", "after"]].sum()
    hit = o[(o["before"] > 0) & (o["after"] < 0)]
    out = hit.merge(orders, on="order_id").merge(customers, on="customer_id")
    out = out.rename(columns={"before": "profit_before", "after": "profit_after"})
    return out.sort_values("order_id")[["order_id", "customer", "profit_before", "profit_after"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, products, lines):
    d = lines.merge(products, on="product_id")
    d["before"] = (d["unit_price"] - d["unit_cost"]) * d["qty"]
    d["after"] = d["before"] - d["discount"]
    o = d.groupby("order_id", as_index=False)[["before", "after"]].sum()
    hit = o[o["after"] < 0]
    out = hit.merge(orders, on="order_id").merge(customers, on="customer_id")
    out = out.rename(columns={"before": "profit_before", "after": "profit_after"})
    return out.sort_values("order_id")[["order_id", "customer", "profit_before", "profit_after"]].reset_index(drop=True)`],
    hints: ['The question has two halves: profitable before, and a loss after.', 'An order that was already losing money was not turned into a loss by its discount.'],
    why: 'Both conditions are needed, because the point is to find the discount that did the damage.',
    mistakes: 'Keeping every order that ends in a loss blames the discount for orders that were priced below cost to begin with.' },

  { t: 'High Returns in More Than One Region', tags: ['ratio', 'left merge', 'groupby'], o: true,
    story: 'Customer service at Ridgeway is drowning in returns for some products. They want the products with a high return rate in at least two regions, which points at the product rather than one bad batch.',
    measure: [
      'A product\'s return rate in a region = units returned there divided by units sold there.',
      'High means a return rate above 20%.',
      'A product with no returns in a region has a rate of 0 there.',
    ],
    task: 'Return product and high_return_regions for the products with a high return rate in at least two regions, ordered by product.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "product": ["Boots", "Jacket"], "category": ["Footwear", "Apparel"], "unit_cost": [60, 80]})
regions = pd.DataFrame({"region_id": [1, 2, 3], "region": ["North", "South", "East"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": [1] * 5, "region_id": [1, 2, 3, 1, 2], "quarter": [1] * 5})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "product_id": [1, 1, 1, 2, 2], "qty": [10, 10, 10, 10, 10], "unit_price": [100] * 5, "discount": [0] * 5})
returns = pd.DataFrame({"order_id": [1, 2, 4, 5], "product_id": [1, 1, 2, 2], "qty_returned": [3, 3, 1, 3]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Boots", "Jacket"], "category": ["Footwear", "Apparel"], "unit_cost": [60, 80]})
regions = pd.DataFrame({"region_id": [1, 2, 3], "region": ["North", "South", "East"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "customer_id": [1] * 6, "region_id": [1, 2, 3, 1, 2, 1], "quarter": [1] * 6})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "product_id": [1, 1, 1, 2, 2, 2], "qty": [10, 10, 10, 10, 10, 1], "unit_price": [100] * 6, "discount": [0] * 6})
returns = pd.DataFrame({"order_id": [1, 2, 4, 5, 6], "product_id": [1, 1, 2, 2, 2], "qty_returned": [3, 3, 1, 3, 1]})`,
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Boots", "Jacket"], "category": ["Footwear", "Apparel"], "unit_cost": [60, 80]})
regions = pd.DataFrame({"region_id": [1, 2, 3], "region": ["North", "South", "East"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": [1] * 5, "region_id": [1, 2, 3, 1, 2], "quarter": [1] * 5})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "product_id": [1, 1, 1, 2, 2], "qty": [10, 10, 10, 10, 10], "unit_price": [100] * 5, "discount": [0] * 5})
returns = pd.DataFrame({"order_id": [1, 2, 4, 5], "product_id": [1, 1, 2, 2], "qty_returned": [3, 1, 1, 3]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, regions: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame, returns: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, regions, orders, lines, returns):
    sold = lines.merge(orders, on="order_id").groupby(["product_id", "region_id"], as_index=False)["qty"].sum()
    back = returns.merge(orders, on="order_id").groupby(["product_id", "region_id"], as_index=False)["qty_returned"].sum()
    m = sold.merge(back, on=["product_id", "region_id"], how="left")
    m["qty_returned"] = m["qty_returned"].fillna(0)
    m["rate"] = m["qty_returned"] / m["qty"]
    high = m[m["rate"] > 0.2]
    g = high.groupby("product_id", as_index=False).size().rename(columns={"size": "high_return_regions"})
    g = g[g["high_return_regions"] >= 2].merge(products, on="product_id")
    return g.sort_values("product")[["product", "high_return_regions"]].reset_index(drop=True)`,
    wrong: [`def solve(products, regions, orders, lines, returns):
    ln = lines.merge(returns, on=["order_id", "product_id"], how="left")
    ln["qty_returned"] = ln["qty_returned"].fillna(0)
    ln["rate"] = ln["qty_returned"] / ln["qty"]
    ln = ln.merge(orders, on="order_id")
    m = ln.groupby(["product_id", "region_id"], as_index=False)["rate"].mean()
    high = m[m["rate"] > 0.2]
    g = high.groupby("product_id", as_index=False).size().rename(columns={"size": "high_return_regions"})
    g = g[g["high_return_regions"] >= 2].merge(products, on="product_id")
    return g.sort_values("product")[["product", "high_return_regions"]].reset_index(drop=True)`],
    hints: ['Add up the units sold and the units returned per product and region, then divide.', 'Averaging per-order rates lets a one-unit order count as much as a hundred-unit one.'],
    why: 'A rate over a region is total returned over total sold, which weights every unit equally.',
    mistakes: 'Averaging the return rate of each order makes one small order with a single return look like a crisis.' },

  { t: 'Best-Selling Is Not Most Profitable', tags: ['ranking', 'groupby', 'comparison'], o: true,
    story: 'Ridgeway\'s regional managers stock up on what sells. The CFO wants to know in which regions the category bringing in the most revenue is not the one making the most profit.',
    measure: [
      'Revenue on a line = unit price x quantity - discount.',
      'Profit = revenue - unit cost x quantity.',
      'Best-selling means the most revenue in the region; most profitable means the most profit. Ties go to the category name that comes first alphabetically.',
    ],
    task: 'Return region, best_selling and most_profitable for the regions where these are different categories, ordered by region.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Rope"], "category": ["Camping", "Climbing"], "unit_cost": [90, 30]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["North", "South"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1] * 4, "region_id": [1, 1, 2, 2], "quarter": [1] * 4})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 2, 1, 2], "qty": [10, 5, 2, 6], "unit_price": [100] * 4, "discount": [0] * 4})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Rope"], "category": ["Camping", "Climbing"], "unit_cost": [90, 30]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["North", "South"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1] * 4, "region_id": [1, 1, 2, 2], "quarter": [1] * 4})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 2, 1, 2], "qty": [10, 5, 2, 6], "unit_price": [100, 300, 100, 100], "discount": [0] * 4})`,
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Rope"], "category": ["Camping", "Climbing"], "unit_cost": [90, 30]})
regions = pd.DataFrame({"region_id": [1, 2], "region": ["North", "South"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1] * 4, "region_id": [1, 1, 2, 2], "quarter": [1] * 4})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 2, 1, 2], "qty": [10, 5, 8, 6], "unit_price": [100] * 4, "discount": [0] * 4})`,
    ],
    sig: 'def solve(products: pd.DataFrame, regions: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, regions, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id").merge(regions, on="region_id")
    d["revenue"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["revenue"] - d["unit_cost"] * d["qty"]
    g = d.groupby(["region", "category"], as_index=False)[["revenue", "profit"]].sum()
    best = (g.sort_values(["region", "revenue", "category"], ascending=[True, False, True])
              .groupby("region").head(1)[["region", "category"]].rename(columns={"category": "best_selling"}))
    prof = (g.sort_values(["region", "profit", "category"], ascending=[True, False, True])
              .groupby("region").head(1)[["region", "category"]].rename(columns={"category": "most_profitable"}))
    m = best.merge(prof, on="region")
    m = m[m["best_selling"] != m["most_profitable"]]
    return m.sort_values("region").reset_index(drop=True)`,
    wrong: [`def solve(products, regions, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id").merge(regions, on="region_id")
    d["revenue"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["revenue"] - d["unit_cost"] * d["qty"]
    g = d.groupby(["region", "category"], as_index=False)[["qty", "profit"]].sum()
    best = (g.sort_values(["region", "qty", "category"], ascending=[True, False, True])
              .groupby("region").head(1)[["region", "category"]].rename(columns={"category": "best_selling"}))
    prof = (g.sort_values(["region", "profit", "category"], ascending=[True, False, True])
              .groupby("region").head(1)[["region", "category"]].rename(columns={"category": "most_profitable"}))
    m = best.merge(prof, on="region")
    m = m[m["best_selling"] != m["most_profitable"]]
    return m.sort_values("region").reset_index(drop=True)`],
    hints: ['Best-selling is measured in money, not in units.', 'Rank the categories twice inside each region, once on revenue and once on profit.'],
    why: 'Revenue is what the question calls selling, and it differs from units the moment two categories are priced differently.',
    mistakes: 'Ranking on units sold calls a cheap, high-volume category the best seller even when a pricier one brought in more money.' },

  { t: 'Customers Whose Profit Fell Every Quarter', tags: ['pivot', 'trend', 'missing values'], o: true,
    story: 'The account team at Ridgeway wants to catch customers drifting away. They want the customers whose profit has fallen every single quarter this year, not just from the start of the year to the end.',
    measure: [
      'A customer\'s quarterly profit is the profit on the orders they placed in that quarter: (unit price - unit cost) x quantity - discount.',
      'A quarter with no orders counts as a profit of 0.',
      'Falling every quarter means Q2 below Q1, Q3 below Q2 and Q4 below Q3.',
    ],
    task: 'Return customer, q1, q2, q3 and q4 for those customers, ordered by customer.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "retail"]})
orders = pd.DataFrame({"order_id": list(range(1, 9)), "customer_id": [1, 1, 1, 1, 2, 2, 2, 2], "region_id": [1] * 8, "quarter": [1, 2, 3, 4] * 2})
products = pd.DataFrame({"product_id": [1], "product": ["Tent"], "category": ["Camping"], "unit_cost": [50]})
lines = pd.DataFrame({"order_id": list(range(1, 9)), "product_id": [1] * 8, "qty": [4, 3, 2, 1, 1, 2, 3, 4], "unit_price": [150] * 8, "discount": [0] * 8})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "retail"]})
orders = pd.DataFrame({"order_id": list(range(1, 9)), "customer_id": [1, 1, 1, 1, 2, 2, 2, 2], "region_id": [1] * 8, "quarter": [1, 2, 3, 4] * 2})
products = pd.DataFrame({"product_id": [1], "product": ["Tent"], "category": ["Camping"], "unit_cost": [50]})
lines = pd.DataFrame({"order_id": list(range(1, 9)), "product_id": [1] * 8, "qty": [4, 3, 2, 1, 4, 2, 3, 1], "unit_price": [150] * 8, "discount": [0] * 8})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "retail"]})
orders = pd.DataFrame({"order_id": list(range(1, 8)), "customer_id": [1, 1, 1, 2, 2, 2, 2], "region_id": [1] * 7, "quarter": [1, 2, 3, 1, 2, 3, 4]})
products = pd.DataFrame({"product_id": [1], "product": ["Tent"], "category": ["Camping"], "unit_cost": [50]})
lines = pd.DataFrame({"order_id": list(range(1, 8)), "product_id": [1] * 7, "qty": [4, 3, 2, 1, 2, 3, 4], "unit_price": [150] * 7, "discount": [0] * 7})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, products: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, products, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["profit"] = (d["unit_price"] - d["unit_cost"]) * d["qty"] - d["discount"]
    q = d.pivot_table(index="customer_id", columns="quarter", values="profit", aggfunc="sum")
    q = q.reindex(columns=[1, 2, 3, 4]).fillna(0)
    falling = q[(q[2] < q[1]) & (q[3] < q[2]) & (q[4] < q[3])]
    out = falling.reset_index()
    out.columns = ["customer_id", "q1", "q2", "q3", "q4"]
    out = out.merge(customers, on="customer_id")
    for c in ["q1", "q2", "q3", "q4"]:
        out[c] = out[c].astype(int)
    return out.sort_values("customer")[["customer", "q1", "q2", "q3", "q4"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, products, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["profit"] = (d["unit_price"] - d["unit_cost"]) * d["qty"] - d["discount"]
    q = d.pivot_table(index="customer_id", columns="quarter", values="profit", aggfunc="sum")
    q = q.reindex(columns=[1, 2, 3, 4]).fillna(0)
    falling = q[q[4] < q[1]]
    out = falling.reset_index()
    out.columns = ["customer_id", "q1", "q2", "q3", "q4"]
    out = out.merge(customers, on="customer_id")
    for c in ["q1", "q2", "q3", "q4"]:
        out[c] = out[c].astype(int)
    return out.sort_values("customer")[["customer", "q1", "q2", "q3", "q4"]].reset_index(drop=True)`],
    hints: ['Put the four quarters side by side, one row per customer.', 'Every step has to go down, not just the first and last.'],
    why: 'Pivoting gives each customer a row of four quarters, and checking each step is what consistently falling means.',
    mistakes: 'Comparing only Q1 with Q4 calls a customer who bounced back in Q3 a steady decline.' },

  { t: 'Sold Below Cost', tags: ['profit', 'filtering', 'groupby'], o: true,
    story: 'Ridgeway\'s pricing analyst wants every product that was ever sold below cost, and what those sales cost the company in total.',
    measure: [
      'A line was sold below cost when its net price per unit is below the unit cost; net price per unit = (unit price x quantity - discount) / quantity.',
      'What it cost us is the shortfall on those lines: unit cost x quantity - (unit price x quantity - discount).',
      'Each line is judged on its own, not the product\'s average price.',
    ],
    task: 'Return product, lines_below_cost and shortfall for every product with at least one such line, largest shortfall first, ties by product.',
    setup: `products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Tent", "Stove", "Lamp"], "category": ["Camping"] * 3, "unit_cost": [100, 50, 20]})
lines = pd.DataFrame({"order_id": [1, 2, 3], "product_id": [1, 2, 3], "qty": [2, 1, 5], "unit_price": [90, 60, 30], "discount": [0, 20, 0]})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Tent", "Stove", "Lamp"], "category": ["Camping"] * 3, "unit_cost": [100, 50, 20]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 2, 3, 1], "qty": [2, 1, 5, 2], "unit_price": [90, 60, 30, 150], "discount": [0, 20, 0, 0]})`,
      `products = pd.DataFrame({"product_id": [1, 2, 3], "product": ["Tent", "Stove", "Lamp"], "category": ["Camping"] * 3, "unit_cost": [100, 50, 20]})
lines = pd.DataFrame({"order_id": [1, 2, 3], "product_id": [1, 2, 3], "qty": [2, 1, 5], "unit_price": [90, 60, 15], "discount": [0, 20, 0]})`,
    ],
    sig: 'def solve(products: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, lines):
    d = lines.merge(products, on="product_id")
    d["net"] = d["unit_price"] * d["qty"] - d["discount"]
    below = d[d["net"] / d["qty"] < d["unit_cost"]].copy()
    below["shortfall"] = below["unit_cost"] * below["qty"] - below["net"]
    g = below.groupby("product", as_index=False).agg(lines_below_cost=("order_id", "size"), shortfall=("shortfall", "sum"))
    g["shortfall"] = g["shortfall"].astype(int)
    return g.sort_values(["shortfall", "product"], ascending=[False, True]).reset_index(drop=True)`,
    wrong: [`def solve(products, lines):
    d = lines.merge(products, on="product_id")
    d["net"] = d["unit_price"] * d["qty"] - d["discount"]
    g = d.groupby(["product", "unit_cost"], as_index=False).agg(net=("net", "sum"), qty=("qty", "sum"), lines_below_cost=("order_id", "size"))
    g = g[g["net"] / g["qty"] < g["unit_cost"]].copy()
    g["shortfall"] = (g["unit_cost"] * g["qty"] - g["net"]).astype(int)
    return g.sort_values(["shortfall", "product"], ascending=[False, True])[["product", "lines_below_cost", "shortfall"]].reset_index(drop=True)`],
    hints: ['Judge each line before you add anything up.', 'Spread the discount over the units on that line to get the price actually charged.'],
    why: 'Filtering lines first finds every individual sale below cost, however well the product did elsewhere.',
    mistakes: 'Averaging the price per product first hides a below-cost sale behind a profitable one.' },

  { t: 'Segments Below the Company Margin', tags: ['ratio', 'groupby', 'comparison'], o: true,
    story: 'Ridgeway sells to retail, corporate and online customers. The board wants to know which segments run on a thinner margin than the company as a whole.',
    measure: [
      'Revenue on a line = unit price x quantity - discount; profit = revenue - unit cost x quantity.',
      'Margin = total profit divided by total revenue, as a percentage.',
      'The company margin is the same ratio over every line, not an average of the segments.',
    ],
    task: 'Return segment, margin and company_margin (both rounded to 1 decimal) for the segments below the company margin, lowest margin first.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"], "segment": ["retail", "corporate", "online"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 1, 2, 2, 3, 3], "region_id": [1] * 6, "quarter": [1] * 6})
products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5, 6], "product": ["Tent", "Stove", "Rope", "Boots", "Lamp", "Jacket"], "category": ["Camping"] * 6, "unit_cost": [90, 80, 50, 60, 95, 85]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "product_id": [1, 2, 3, 4, 5, 6], "qty": [10] * 6, "unit_price": [100] * 6, "discount": [0] * 6})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"], "segment": ["retail", "corporate", "online"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 1, 2, 2, 3, 3], "region_id": [1] * 6, "quarter": [1] * 6})
products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5, 6], "product": ["Tent", "Stove", "Rope", "Boots", "Lamp", "Jacket"], "category": ["Camping"] * 6, "unit_cost": [90, 80, 50, 60, 95, 85]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "product_id": [1, 2, 3, 4, 5, 6], "qty": [100, 10, 10, 10, 10, 10], "unit_price": [100] * 6, "discount": [0] * 6})`,
      `customers = pd.DataFrame({"customer_id": [1, 2, 3], "customer": ["Asha", "Ben", "Chitra"], "segment": ["retail", "corporate", "online"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "customer_id": [1, 1, 2, 2, 3, 3], "region_id": [1] * 6, "quarter": [1] * 6})
products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5, 6], "product": ["Tent", "Stove", "Rope", "Boots", "Lamp", "Jacket"], "category": ["Camping"] * 6, "unit_cost": [40, 30, 90, 95, 55, 50]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5, 6], "product_id": [1, 2, 3, 4, 5, 6], "qty": [10] * 6, "unit_price": [100] * 6, "discount": [0] * 6})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, products: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, products, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id").merge(customers, on="customer_id")
    d["revenue"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["revenue"] - d["unit_cost"] * d["qty"]
    company = 100.0 * d["profit"].sum() / d["revenue"].sum()
    g = d.groupby("segment", as_index=False)[["revenue", "profit"]].sum()
    g["margin"] = 100.0 * g["profit"] / g["revenue"]
    g = g[g["margin"] < company].copy()
    g["margin"] = g["margin"].round(1)
    g["company_margin"] = round(company, 1)
    return g.sort_values("margin")[["segment", "margin", "company_margin"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, products, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id").merge(customers, on="customer_id")
    d["revenue"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["revenue"] - d["unit_cost"] * d["qty"]
    o = d.groupby(["order_id", "segment"], as_index=False)[["revenue", "profit"]].sum()
    o["m"] = 100.0 * o["profit"] / o["revenue"]
    company = o["m"].mean()
    g = o.groupby("segment", as_index=False)["m"].mean().rename(columns={"m": "margin"})
    g = g[g["margin"] < company].copy()
    g["margin"] = g["margin"].round(1)
    g["company_margin"] = round(company, 1)
    return g.sort_values("margin")[["segment", "margin", "company_margin"]].reset_index(drop=True)`],
    hints: ['A margin over a group is total profit over total revenue.', 'Averaging the margins of individual orders treats a tiny order like a huge one.'],
    why: 'Dividing the totals weights every unit of revenue equally, which is what a margin for a segment or a company means.',
    mistakes: 'Averaging per-order margins agrees only while every order is the same size, and drifts as soon as one big order dominates.' },

  { t: 'Profitable Only Because of One Order', tags: ['groupby', 'loops', 'what-if'], o: true,
    story: 'Ridgeway\'s sales director suspects some "profitable" accounts are really one lucky deal propping up a string of losses. Find the customers who would be loss-making without their single best order.',
    measure: [
      'Profit on an order = the sum over its lines of (unit price x quantity - discount) - unit cost x quantity.',
      'A customer\'s lifetime profit adds up all their orders. Only customers with at least two orders and a lifetime profit above zero are considered.',
      'Their best order is the most profitable one (ties go to the lowest order_id). The customer qualifies if lifetime profit minus that order is below zero.',
    ],
    task: 'Return customer, lifetime_profit, best_order and profit_without_it, ordered by customer.',
    setup: `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": [1, 1, 1, 2, 2], "region_id": [1] * 5, "quarter": [1] * 5})
products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [500, 300]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "product_id": [1, 1, 2, 1, 2], "qty": [1] * 5, "unit_price": [1000, 300, 200, 800, 400], "discount": [0] * 5})`,
    hidden: [
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": [1, 1, 1, 2, 2], "region_id": [1] * 5, "quarter": [1] * 5})
products = pd.DataFrame({"product_id": [1, 2, 3, 4, 5], "product": ["Tent", "Stove", "Rope", "Boots", "Lamp"], "category": ["Camping"] * 5, "unit_cost": [950, 100, 400, 500, 300]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "product_id": [1, 2, 3, 4, 5], "qty": [1] * 5, "unit_price": [1000, 500, 100, 800, 400], "discount": [0] * 5})`,
      `customers = pd.DataFrame({"customer_id": [1, 2], "customer": ["Asha", "Ben"], "segment": ["retail", "corporate"]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": [1, 1, 1, 2, 2], "region_id": [1] * 5, "quarter": [1] * 5})
products = pd.DataFrame({"product_id": [1, 2, 3, 4], "product": ["Tent", "Stove", "Rope", "Boots"], "category": ["Camping"] * 4, "unit_cost": [500, 300, 200, 900]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "product_id": [1, 1, 2, 3, 4], "qty": [1] * 5, "unit_price": [1000, 300, 200, 800, 400], "discount": [0] * 5})`,
    ],
    sig: 'def solve(customers: pd.DataFrame, orders: pd.DataFrame, products: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(customers, orders, products, lines):
    d = lines.merge(products, on="product_id")
    d["revenue"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["revenue"] - d["unit_cost"] * d["qty"]
    o = d.groupby("order_id", as_index=False)[["revenue", "profit"]].sum().merge(orders, on="order_id")
    rows = []
    for cid, g in o.groupby("customer_id"):
        life = g["profit"].sum()
        if len(g) < 2 or life <= 0:
            continue
        best = g.sort_values(["profit", "order_id"], ascending=[False, True]).iloc[0]
        rest = life - best["profit"]
        if rest < 0:
            rows.append((cid, int(life), int(best["order_id"]), int(rest)))
    r = pd.DataFrame(rows, columns=["customer_id", "lifetime_profit", "best_order", "profit_without_it"])
    out = r.merge(customers, on="customer_id")
    return out.sort_values("customer")[["customer", "lifetime_profit", "best_order", "profit_without_it"]].reset_index(drop=True)`,
    wrong: [`def solve(customers, orders, products, lines):
    d = lines.merge(products, on="product_id")
    d["revenue"] = d["unit_price"] * d["qty"] - d["discount"]
    d["profit"] = d["revenue"] - d["unit_cost"] * d["qty"]
    o = d.groupby("order_id", as_index=False)[["revenue", "profit"]].sum().merge(orders, on="order_id")
    rows = []
    for cid, g in o.groupby("customer_id"):
        life = g["profit"].sum()
        if len(g) < 2 or life <= 0:
            continue
        best = g.sort_values(["revenue", "order_id"], ascending=[False, True]).iloc[0]
        rest = life - best["profit"]
        if rest < 0:
            rows.append((cid, int(life), int(best["order_id"]), int(rest)))
    r = pd.DataFrame(rows, columns=["customer_id", "lifetime_profit", "best_order", "profit_without_it"])
    out = r.merge(customers, on="customer_id")
    return out.sort_values("customer")[["customer", "lifetime_profit", "best_order", "profit_without_it"]].reset_index(drop=True)`],
    hints: ['Work out each order\'s profit first, then look at each customer\'s orders together.', 'The order that props the account up is the most profitable one, not the biggest.'],
    why: 'Removing the most profitable order is the only way to see whether the rest of the account stands on its own.',
    mistakes: 'Removing the largest order by revenue takes out a big but thin deal and leaves the real prop in place.' },

  { t: 'Products That Flipped From Profit to Loss', tags: ['shift', 'trend', 'groupby'], o: true,
    story: 'The category team at Ridgeway wants an early warning: the products that made money in one quarter and then lost money in the very next quarter they sold in.',
    measure: [
      'A product\'s quarterly profit = its profit across every order in that quarter: (unit price - unit cost) x quantity - discount.',
      'Only quarters in which the product sold count, in quarter order.',
      'It flipped in a quarter when that quarter is a loss and the quarter just before it (the previous one it sold in) was a profit.',
    ],
    task: 'Return product, quarter (the quarter of the loss), previous_profit and loss (as a positive number) for every flip, ordered by product then quarter.',
    setup: `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1] * 4, "region_id": [1] * 4, "quarter": [1, 2, 1, 2]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "qty": [1] * 4, "unit_price": [200, 50, 30, 80], "discount": [0] * 4})`,
    hidden: [
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": [1] * 5, "region_id": [1] * 5, "quarter": [1, 2, 1, 2, 3]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "product_id": [1, 1, 2, 2, 1], "qty": [1] * 5, "unit_price": [200, 50, 30, 80, 70], "discount": [0] * 5})`,
      `products = pd.DataFrame({"product_id": [1, 2], "product": ["Tent", "Stove"], "category": ["Camping", "Camping"], "unit_cost": [100, 50]})
orders = pd.DataFrame({"order_id": [1, 2, 3, 4], "customer_id": [1] * 4, "region_id": [1] * 4, "quarter": [1, 2, 1, 2]})
lines = pd.DataFrame({"order_id": [1, 2, 3, 4], "product_id": [1, 1, 2, 2], "qty": [1] * 4, "unit_price": [200, 50, 90, 40], "discount": [0] * 4})`,
    ],
    sig: 'def solve(products: pd.DataFrame, orders: pd.DataFrame, lines: pd.DataFrame) -> pd.DataFrame:',
    ref: `def solve(products, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["profit"] = (d["unit_price"] - d["unit_cost"]) * d["qty"] - d["discount"]
    q = d.groupby(["product", "quarter"], as_index=False)["profit"].sum().sort_values(["product", "quarter"])
    q["prev"] = q.groupby("product")["profit"].shift()
    flip = q[(q["profit"] < 0) & (q["prev"] > 0)].copy()
    flip["previous_profit"] = flip["prev"].astype(int)
    flip["loss"] = (-flip["profit"]).astype(int)
    return flip.sort_values(["product", "quarter"])[["product", "quarter", "previous_profit", "loss"]].reset_index(drop=True)`,
    wrong: [`def solve(products, orders, lines):
    d = lines.merge(orders, on="order_id").merge(products, on="product_id")
    d["profit"] = (d["unit_price"] - d["unit_cost"]) * d["qty"] - d["discount"]
    q = d.groupby(["product", "quarter"], as_index=False)["profit"].sum().sort_values(["product", "quarter"])
    q["first"] = q.groupby("product")["profit"].transform("first")
    q["start"] = q.groupby("product")["quarter"].transform("min")
    flip = q[(q["profit"] < 0) & (q["first"] > 0) & (q["quarter"] > q["start"])].copy()
    flip["previous_profit"] = flip["first"].astype(int)
    flip["loss"] = (-flip["profit"]).astype(int)
    return flip.sort_values(["product", "quarter"])[["product", "quarter", "previous_profit", "loss"]].reset_index(drop=True)`],
    hints: ['Compare each quarter with the one immediately before it for that product.', 'A shift inside the product gives you that previous quarter.'],
    why: 'A flip is about the step from one quarter to the next, so the comparison has to be with the immediately previous quarter.',
    mistakes: 'Comparing with the first quarter reports a second loss in a row as a fresh flip.' },
];
