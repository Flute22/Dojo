/* Dojo Excel: starting workbooks for the questions, and the question registry. */
(function (root) {
  'use strict';
  const XL = root.DojoXL;
  const D = root.DOJO_XL_DATA = root.DOJO_XL_DATA || {};
  const HEAD = { b: true };
  const header = (wb, sheet, row, plain) => { if (!plain) wb.format(sheet, row, HEAD); };
  const mk = (wb, name) => wb.sheet(name) || wb.addSheet(name);

  // ---- Sales: 20 sales lines, columns A:G ----------------------------------------------------------------
  const SALES = [
    ['2024-01-05', 'North', 'Asha', 'Pen', 100, 20], ['2024-01-12', 'South', 'Ben', 'Notebook', 40, 80], ['2024-01-19', 'East', 'Chitra', 'Bag', 5, 1200],
    ['2024-01-26', 'West', 'Dev', 'Lamp', 8, 650], ['2024-02-02', 'North', 'Asha', 'Notebook', 60, 80], ['2024-02-09', 'South', 'Esha', 'Pen', 150, 20],
    ['2024-02-16', 'East', 'Chitra', 'Lamp', 6, 650], ['2024-02-23', 'West', 'Farid', 'Bag', 4, 1200], ['2024-03-01', 'North', 'Gita', 'Pen', 200, 20],
    ['2024-03-08', 'South', 'Ben', 'Bag', 3, 1200], ['2024-03-15', 'East', 'Hari', 'Notebook', 70, 80], ['2024-03-22', 'West', 'Dev', 'Pen', 120, 20],
    ['2024-03-29', 'North', 'Asha', 'Lamp', 10, 650], ['2024-04-05', 'South', 'Esha', 'Notebook', 55, 80], ['2024-04-12', 'East', 'Chitra', 'Pen', 90, 20],
    ['2024-04-19', 'West', 'Farid', 'Lamp', 7, 650], ['2024-04-26', 'North', 'Gita', 'Bag', 6, 1200], ['2024-05-03', 'South', 'Ben', 'Lamp', 9, 650],
    ['2024-05-10', 'East', 'Hari', 'Pen', 130, 20], ['2024-05-17', 'West', 'Dev', 'Notebook', 45, 80],
  ];
  /** opts: rev (fill Revenue formulas), total (totals row 23), plain (unstyled headers), tax (rate in J1), disc (discount in J1) */
  D.sales = (wb, o = {}) => {
    const s = 'Sales'; mk(wb, s);
    wb.load(s, 'A1', [['Date', 'Region', 'Rep', 'Product', 'Units', 'Price', 'Revenue']].concat(SALES));
    wb.format(s, 'A2:A21', { fmt: 'yyyy-mm-dd' });
    header(wb, s, 'A1:G1', o.plain);
    if (o.rev) wb.formula(s, 'G2:G21', '=E2*F2');
    if (o.total) { wb.load(s, 'A23', [['Total']]); wb.format(s, 'A23', HEAD); if (o.rev) wb.set(s, 'G23', '=SUM(G2:G21)'); }
    if (o.tax) { wb.load(s, 'I1', [['Tax rate']]); wb.set(s, 'J1', 0.18); wb.format(s, 'J1', { fmt: '0%' }); }
    if (o.disc) { wb.load(s, 'I1', [['Discount']]); wb.set(s, 'J1', 0.1); wb.format(s, 'J1', { fmt: '0%' }); }
    if (o.fmtPrice) wb.format(s, 'F2:G21', { fmt: '#,##0.00' });
    return wb;
  };

  // ---- Staff: 12 people ---------------------------------------------------------------------------------------------
  D.staff = (wb, o = {}) => {
    const s = 'Staff'; mk(wb, s);
    wb.load(s, 'A1', [['ID', 'First', 'Last', 'Dept', 'Title', 'Salary', 'Joined', 'Rating'],
      [101, 'Asha', 'Rao', 'Engineering', 'Engineer', 95000, '2019-06-03', 4.2], [102, 'Ben', 'Shah', 'Sales', 'Executive', 62000, '2020-02-17', 3.8],
      [103, 'Chitra', 'Iyer', 'Engineering', 'Lead', 130000, '2017-09-11', 4.6], [104, 'Dev', 'Menon', 'Finance', 'Analyst', 71000, '2021-01-25', 3.5],
      [105, 'Esha', 'Nair', 'HR', 'Manager', 88000, '2018-04-30', 4.0], [106, 'Farid', 'Khan', 'Sales', 'Manager', 99000, '2016-11-14', 4.4],
      [107, 'Gita', 'Roy', 'Engineering', 'Engineer', 91000, '2022-03-07', 3.9], [108, 'Hari', 'Das', 'Finance', 'Manager', 112000, '2015-08-19', 4.7],
      [109, 'Isha', 'Jain', 'Sales', 'Executive', 58000, '2023-05-22', 3.2], [110, 'Jai', 'Pillai', 'Engineering', 'Intern', 30000, '2024-01-08', 3.6],
      [111, 'Kavya', 'Bose', 'HR', 'Executive', 54000, '2022-10-03', 4.1], [112, 'Lal', 'Gupta', 'Support', 'Agent', 38000, '2021-07-12', 3.3]]);
    wb.format(s, 'G2:G13', { fmt: 'yyyy-mm-dd' });
    header(wb, s, 'A1:H1', o.plain);
    mk(wb, 'Depts');
    wb.load('Depts', 'A1', [['Dept', 'Head', 'Budget'], ['Engineering', 'Chitra', 500000], ['Sales', 'Farid', 300000], ['Finance', 'Hari', 250000], ['HR', 'Esha', 150000], ['Support', 'Lal', 90000]]);
    header(wb, 'Depts', 'A1:C1', o.plain);
    return wb;
  };

  // ---- Marks: 12 students --------------------------------------------------------------------------------------------
  const MARKS = [['Asha', 88, 76, 91], ['Ben', 45, 52, 38], ['Chitra', 67, 71, 80], ['Dev', 92, 95, 89], ['Esha', 34, 41, 47], ['Farid', 58, 63, 55],
    ['Gita', 77, 82, 74], ['Hari', 49, 36, 58], ['Isha', 83, 79, 88], ['Jai', 61, 54, 66], ['Kavya', 95, 91, 97], ['Lal', 29, 44, 35]];
  /** opts: total (F = total), avg (G = average, rounded 1 dp), result (H = Pass/Fail), grades (Grades sheet) */
  D.marks = (wb, o = {}) => {
    const s = 'Marks'; mk(wb, s);
    wb.load(s, 'A1', [['Roll', 'Name', 'Math', 'Science', 'English', 'Total', 'Average', 'Result']].concat(MARKS.map((m, i) => [i + 1, ...m])));
    header(wb, s, 'A1:H1', o.plain);
    if (o.total) wb.formula(s, 'F2:F13', '=SUM(C2:E2)');
    if (o.avg) wb.formula(s, 'G2:G13', '=ROUND(AVERAGE(C2:E2),1)');
    if (o.result) wb.formula(s, 'H2:H13', '=IF(G2>=50,"Pass","Fail")');
    if (o.grades) { mk(wb, 'Grades'); wb.load('Grades', 'A1', [['Min', 'Grade'], [0, 'F'], [40, 'D'], [50, 'C'], [60, 'B'], [75, 'A']]); header(wb, 'Grades', 'A1:B1', o.plain); }
    return wb;
  };

  // ---- Orders: 18 orders, price list, customers --------------------------------------------------------------------------
  D.orders = (wb, o = {}) => {
    const s = 'Orders'; mk(wb, s);
    wb.load(s, 'A1', [['OrderID', 'Date', 'Customer', 'Item', 'Qty', 'Status'],
      [5001, '2024-02-01', 'Asha', 'Pen', 50, 'Delivered'], [5002, '2024-02-03', 'Ben', 'Mouse', 2, 'Delivered'], [5003, '2024-02-07', 'Chitra', 'Bag', 1, 'Late'],
      [5004, '2024-02-10', 'Dev', 'Lamp', 3, 'Delivered'], [5005, '2024-02-14', 'Asha', 'Keyboard', 1, 'Shipped'], [5006, '2024-02-18', 'Esha', 'Notebook', 20, 'Delivered'],
      [5007, '2024-02-21', 'Ben', 'Headset', 1, 'Cancelled'], [5008, '2024-02-25', 'Farid', 'Bottle', 4, 'Late'], [5009, '2024-03-02', 'Chitra', 'Pen', 100, 'Delivered'],
      [5010, '2024-03-06', 'Gita', 'Mouse', 3, 'Delivered'], [5011, '2024-03-11', 'Asha', 'Bag', 2, 'Delivered'], [5012, '2024-03-15', 'Hari', 'Keyboard', 2, 'Late'],
      [5013, '2024-03-19', 'Dev', 'Headset', 1, 'Delivered'], [5014, '2024-03-24', 'Esha', 'Lamp', 2, 'Shipped'], [5015, '2024-03-28', 'Ben', 'Notebook', 30, 'Delivered'],
      [5016, '2024-04-02', 'Farid', 'Bottle', 6, 'Delivered'], [5017, '2024-04-08', 'Gita', 'Pen', 80, 'Cancelled'], [5018, '2024-04-12', 'Hari', 'Mouse', 1, 'Delivered']]);
    wb.format(s, 'B2:B19', { fmt: 'yyyy-mm-dd' });
    header(wb, s, 'A1:F1', o.plain);
    mk(wb, 'Prices');
    wb.load('Prices', 'A1', [['Item', 'Price', 'Category'], ['Pen', 20, 'Stationery'], ['Notebook', 80, 'Stationery'], ['Bag', 1200, 'Accessories'], ['Lamp', 650, 'Home'], ['Bottle', 300, 'Home'], ['Mouse', 700, 'Electronics'], ['Keyboard', 1500, 'Electronics'], ['Headset', 1800, 'Electronics']]);
    header(wb, 'Prices', 'A1:C1', o.plain);
    mk(wb, 'Customers');
    wb.load('Customers', 'A1', [['Customer', 'City', 'Tier'], ['Asha', 'Mumbai', 'Gold'], ['Ben', 'Delhi', 'Silver'], ['Chitra', 'Pune', 'Gold'], ['Dev', 'Mumbai', 'Bronze'], ['Esha', 'Delhi', 'Silver'], ['Farid', 'Chennai', 'Bronze'], ['Gita', 'Pune', 'Silver'], ['Hari', 'Chennai', 'Gold']]);
    header(wb, 'Customers', 'A1:C1', o.plain);
    if (o.price) wb.formula(s, 'G2:G19', '=VLOOKUP(D2,Prices!$A$2:$B$9,2,FALSE)');
    if (o.amount) { wb.formula(s, 'G2:G19', '=VLOOKUP(D2,Prices!$A$2:$B$9,2,FALSE)'); wb.formula(s, 'H2:H19', '=E2*G2'); }
    if (o.price || o.amount) { wb.set(s, 'G1', 'Unit price'); if (o.amount) wb.set(s, 'H1', 'Amount'); header(wb, s, 'G1:H1', o.plain); }
    return wb;
  };

  // ---- Monthly: revenue and cost for six months; a rep x month matrix -----------------------------------------------------------
  D.monthly = (wb, o = {}) => {
    const s = 'Monthly'; mk(wb, s);
    wb.load(s, 'A1', [['Month', 'Revenue', 'Cost'], ['Jan', 42000, 30000], ['Feb', 45500, 31200], ['Mar', 43800, 30500], ['Apr', 51200, 34800], ['May', 56400, 37900], ['Jun', 53900, 36100]]);
    header(wb, s, 'A1:C1', o.plain);
    if (o.matrix) {
      mk(wb, 'Matrix');
      wb.load('Matrix', 'A1', [['Rep', 'Jan', 'Feb', 'Mar', 'Apr'], ['Asha', 12, 15, 11, 18], ['Ben', 9, 7, 14, 10], ['Chitra', 20, 18, 22, 19], ['Dev', 8, 11, 9, 13]]);
      header(wb, 'Matrix', 'A1:E1', o.plain);
    }
    return wb;
  };

  // ---- Raw: messy text ------------------------------------------------------------------------------------------------------------
  D.raw = (wb, o = {}) => {
    const s = 'Raw'; mk(wb, s);
    wb.load(s, 'A1', [['Code', 'Name', 'Email', 'Address'],
      ['IN-2024-0042', '  asha RAO ', 'Asha.Rao@dojo.com', 'Mumbai, MH - 400001'], ['US-2023-0107', 'BEN shah', 'BEN.SHAH@DOJO.COM', 'Delhi, DL - 110001'],
      ['UK-2024-0015', 'chitra  Iyer', 'chitra.iyer@gmail.com', 'Pune, MH - 411001'], ['IN-2022-0230', ' DEV menon', 'Dev.Menon@dojo.com', 'Mumbai, MH - 400050'],
      ['US-2024-0008', 'Esha NAIR  ', 'esha.nair@outlook.com', 'Chennai, TN - 600001'], ['IN-2023-0099', 'farid KHAN', 'Farid.Khan@dojo.com', 'Delhi, DL - 110045'],
      ['UK-2022-0310', 'gita roy', 'gita.roy@gmail.com', 'Pune, MH - 411014'], ['IN-2024-0150', 'HARI das', 'Hari.Das@dojo.com', 'Chennai, TN - 600020']]);
    header(wb, s, 'A1:D1', o.plain);
    return wb;
  };

  // ---- Finance: loan inputs, cash flows, budget ---------------------------------------------------------------------------------------
  D.finance = (wb, o = {}) => {
    const s = 'Loan'; mk(wb, s);
    wb.load(s, 'A1', [['Principal', 500000], ['Annual rate', 0.085], ['Years', 5], ['Payments per year', 12]]);
    wb.format(s, 'B1', { fmt: '#,##0' }); wb.format(s, 'B2', { fmt: '0.0%' });
    wb.format(s, 'A1:A4', HEAD);
    mk(wb, 'Cash');
    wb.load('Cash', 'A1', [['Year', 'Cash flow'], [0, -100000], [1, 30000], [2, 35000], [3, 40000], [4, 25000], [5, 20000]]);
    header(wb, 'Cash', 'A1:B1', o.plain);
    wb.load('Cash', 'D1', [['Discount rate'], [0.1]]); wb.format('Cash', 'D2', { fmt: '0%' });
    mk(wb, 'Budget');
    wb.load('Budget', 'A1', [['Category', 'Budget', 'Actual'], ['Rent', 24000, 24000], ['Salaries', 90000, 94500], ['Marketing', 15000, 17200], ['Travel', 8000, 5600], ['Software', 6000, 6450], ['Training', 5000, 3100]]);
    header(wb, 'Budget', 'A1:C1', o.plain);
    return wb;
  };

  // ---- Tasks: a small project plan -------------------------------------------------------------------------------------------------------
  D.tasks = (wb, o = {}) => {
    const s = 'Tasks'; mk(wb, s);
    wb.load(s, 'A1', [['Task', 'Start', 'End', 'Owner'],
      ['Design', '2024-03-01', '2024-03-12', 'Asha'], ['Build', '2024-03-13', '2024-04-05', 'Ben'], ['Test', '2024-04-08', '2024-04-19', 'Chitra'], ['Docs', '2024-03-20', '2024-04-02', 'Dev'],
      ['Launch', '2024-04-22', '2024-04-26', 'Esha'], ['Review', '2024-04-29', '2024-05-10', 'Farid'], ['Train', '2024-05-06', '2024-05-17', 'Gita'], ['Support', '2024-05-20', '2024-06-28', 'Hari']]);
    wb.format(s, 'B2:C9', { fmt: 'yyyy-mm-dd' });
    header(wb, s, 'A1:D1', o.plain);
    mk(wb, 'Holidays');
    wb.load('Holidays', 'A1', [['Holiday'], ['2024-03-29'], ['2024-05-01'], ['2024-05-23']]);
    wb.format('Holidays', 'A2:A4', { fmt: 'yyyy-mm-dd' });
    header(wb, 'Holidays', 'A1', o.plain);
    return wb;
  };

  // ---- registry --------------------------------------------------------------------------------------------------------------------------
  root.DOJO_XL = root.DOJO_XL || [];
  const LEVEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard', advanced: 'Advanced' };
  /** Table helpers for the LeetCode-style questions. TBL writes rows (first row = bold header) at "at" on a sheet;
      PUT returns a hidden-case patch that clears "clear" and writes new rows at "at" (default A2). */
  root.DOJO_XL_TBL = (wb, sheet, rows, at) => {
    mk(wb, sheet); const a1 = at || 'A1'; wb.load(sheet, a1, rows);
    const p = XL.parseAddr(a1); wb.format(sheet, XL.addr(p.r, p.c) + ':' + XL.addr(p.r, p.c + rows[0].length - 1), HEAD);
    return wb;
  };
  root.DOJO_XL_PUT = (sheet, clear, rows, at) => (wb) => { wb.clear(sheet, clear, { contents: true }); wb.load(sheet, at || 'A2', rows); return wb; };
  /** DOJO_XL_LC('medium', [...]): LeetCode-style questions. Same as DOJO_XL_ADD, but each question has hidden: [patch(wb), ...]
      (alternative input data) and wrong: [solution(wb), ...] (tempting answers that must pass the example and fail a hidden case). */
  root.DOJO_XL_LC = function (level, list) {
    list.forEach((q) => { q.lc = true; });
    root.DOJO_XL_ADD(level, list);
  };
  /** DOJO_XL_ADD('easy', [...]): numbers questions in file order, like the SQL track. d = dataset id or [id, options]. */
  root.DOJO_XL_ADD = function (level, list) {
    list.forEach((q) => {
      q.id = root.DOJO_XL.length + 1;
      q.difficulty = LEVEL[level];
      if (!q.data) { const [id, opt] = [].concat(q.d); q.data = (wb) => { D[id](wb, opt || {}); if (q.prep) q.prep(wb); }; }
      root.DOJO_XL.push(q);
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
