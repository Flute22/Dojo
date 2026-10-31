// Unit tests for the Excel formula engine: formulas whose correct Excel results are known.
//   node scripts/test-excel-engine.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'renderer-src', 'tracks');
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['excel-engine.js', 'excel-functions.js', 'excel-wb.js', 'excel-grade.js']) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
const XL = ctx.DojoXL;

const wb = new XL.Workbook();
wb.addSheet('Data'); wb.addSheet('Lookup');
wb.load('Data', 'A1', [
  ['Name', 'Dept', 'Sales', 'Date', 'Qty'],
  ['Asha', 'North', 1200, '2024-01-15', 3],
  ['Ben', 'South', 800, '2024-02-20', 2],
  ['Chitra', 'North', 1500, '2024-03-05', 5],
  ['Dev', 'East', 950, '2024-03-28', 1],
  ['Esha', 'South', 1100, '2024-04-10', 4],
  ['Farid', 'North', 700, '2024-05-01', 2],
  ['Gita', 'East', null, '2024-05-22', 3],
]);
wb.load('Lookup', 'A1', [['Dept', 'Manager', 'Target'], ['North', 'Ravi', 3000], ['South', 'Sita', 2000], ['East', 'Omar', 1000]]);
wb.define('Total', 'Data!$C$2:$C$8');

// [formula, expected]; expected may be number, string, boolean, '#ERR', or an array (2D) for spill results.
const T = [
  ['=1+2*3', 7], ['=(1+2)*3', 9], ['=2^3^2', 64], ['=-2^2', 4], ['=10/4', 2.5], ['=10/0', '#DIV/0!'], ['=50%', 0.5], ['=5&"x"', '5x'], ['="a"&"b"', 'ab'],
  ['=1=1', true], ['=2<1', false], ['="a"="A"', true], ['=1<>2', true], ['=7>=7', true],
  ['=SUM(Data!C2:C8)', 6250], ['=SUM(1,2,3)', 6], ['=AVERAGE(Data!C2:C8)', 6250 / 6], ['=MIN(Data!C2:C8)', 700], ['=MAX(Data!C2:C8)', 1500],
  ['=COUNT(Data!C2:C8)', 6], ['=COUNTA(Data!C2:C8)', 6], ['=COUNTBLANK(Data!C2:C8)', 1], ['=COUNTA(Data!B2:B8)', 7],
  ['=SUMIF(Data!B2:B8,"North",Data!C2:C8)', 3400], ['=SUMIF(Data!C2:C8,">1000")', 3800], ['=COUNTIF(Data!B2:B8,"North")', 3], ['=COUNTIF(Data!B2:B8,"*th")', 5], ['=COUNTIF(Data!C2:C8,">=1000")', 3],
  ['=SUMIFS(Data!C2:C8,Data!B2:B8,"North",Data!C2:C8,">1000")', 2700], ['=COUNTIFS(Data!B2:B8,"North",Data!E2:E8,">2")', 2], ['=AVERAGEIF(Data!B2:B8,"North",Data!C2:C8)', 3400 / 3],
  ['=AVERAGEIFS(Data!C2:C8,Data!B2:B8,"South")', 950], ['=MAXIFS(Data!C2:C8,Data!B2:B8,"North")', 1500], ['=MINIFS(Data!C2:C8,Data!B2:B8,"North")', 700],
  ['=SUMPRODUCT(Data!C2:C8,Data!E2:E8)', 1200 * 3 + 800 * 2 + 1500 * 5 + 950 + 1100 * 4 + 700 * 2],
  ['=SUMPRODUCT((Data!B2:B8="North")*Data!C2:C8)', 3400], ['=SUMPRODUCT(--(Data!B2:B8="North"))', 3], ['=SUMPRODUCT((Data!B2:B8="North")*(Data!E2:E8>2))', 2],
  ['=SUM(IF(Data!B2:B8="North",Data!C2:C8,0))', 3400], ['=SUMPRODUCT(1/COUNTIF(Data!B2:B8,Data!B2:B8))', 3],
  ['=ROUND(2.5,0)', 3], ['=ROUND(-2.5,0)', -3], ['=ROUND(3.14159,2)', 3.14], ['=ROUND(1234.5,-2)', 1200], ['=ROUNDUP(3.141,2)', 3.15], ['=ROUNDDOWN(3.999,2)', 3.99], ['=INT(-3.5)', -4], ['=MOD(10,3)', 1], ['=MOD(-10,3)', 2], ['=ABS(-4)', 4], ['=SQRT(16)', 4], ['=POWER(2,10)', 1024], ['=CEILING(4.2,0.5)', 4.5], ['=FLOOR(4.7,0.5)', 4.5], ['=TRUNC(8.9)', 8],
  ['=MEDIAN(Data!C2:C8)', 1025], ['=LARGE(Data!C2:C8,2)', 1200], ['=SMALL(Data!C2:C8,1)', 700], ['=RANK(1200,Data!C2:C8)', 2], ['=RANK(1200,Data!C2:C8,1)', 5], ['=PERCENTILE(Data!C2:C8,0.5)', 1025], ['=QUARTILE(Data!C2:C8,1)', 837.5], ['=MODE(Data!E2:E8)', 3], ['=ROUND(STDEV(Data!C2:C8),2)', 290.55], ['=ROUND(STDEV.P(Data!C2:C8),2)', 265.23],
  ['=IF(1>2,"a","b")', 'b'], ['=IF(Data!C2>1000,"high","low")', 'high'], ['=IFS(Data!C3>1000,"A",Data!C3>500,"B",TRUE,"C")', 'B'], ['=IFERROR(1/0,"oops")', 'oops'], ['=IFNA(NA(),"none")', 'none'], ['=AND(1<2,2<3)', true], ['=OR(1>2,2>3)', false], ['=NOT(FALSE)', true], ['=SWITCH(2,1,"a",2,"b","z")', 'b'], ['=CHOOSE(2,"x","y","z")', 'y'],
  ['=ISBLANK(Data!C8)', true], ['=ISNUMBER(Data!C2)', true], ['=ISTEXT(Data!A2)', true], ['=ISERROR(1/0)', true], ['=ISEVEN(4)', true],
  ['=LEFT("Hello",2)', 'He'], ['=RIGHT("Hello",3)', 'llo'], ['=MID("Hello",2,3)', 'ell'], ['=LEN("Hello")', 5], ['=UPPER("ab")', 'AB'], ['=LOWER("AB")', 'ab'], ['=PROPER("john smith")', 'John Smith'], ['=TRIM("  a   b  ")', 'a b'], ['=CONCATENATE("a","b")', 'ab'], ['=CONCAT("a","b","c")', 'abc'],
  ['=TEXTJOIN(", ",TRUE,"a","","c")', 'a, c'], ['=SUBSTITUTE("a-b-c","-","/")', 'a/b/c'], ['=SUBSTITUTE("a-b-c","-","/",2)', 'a-b/c'], ['=FIND("l","Hello")', 3], ['=SEARCH("L","Hello")', 3], ['=REPLACE("abcdef",2,3,"X")', 'aXef'], ['=REPT("ab",3)', 'ababab'], ['=EXACT("a","A")', false], ['=VALUE("42")', 42], ['=TEXTBEFORE("a@b.com","@")', 'a'], ['=TEXTAFTER("a@b.com","@")', 'b.com'],
  ['=TEXT(1234.5,"#,##0.00")', '1,234.50'], ['=TEXT(0.256,"0.0%")', '25.6%'], ['=TEXT(DATE(2024,3,5),"dd-mmm-yyyy")', '05-Mar-2024'], ['=TEXT(DATE(2024,3,5),"dddd")', 'Tuesday'], ['=TEXT(DATE(2024,3,5),"mmmm yyyy")', 'March 2024'], ['=TEXT(5,"000")', '005'], ['=TEXT(-1234.5,"$#,##0.00")', '-$1,234.50'],
  ['=DATE(2024,1,31)+1', 45323], ['=YEAR(Data!D2)', 2024], ['=MONTH(Data!D3)', 2], ['=DAY(Data!D4)', 5], ['=WEEKDAY(DATE(2024,3,5))', 3], ['=WEEKDAY(DATE(2024,3,5),2)', 2], ['=EOMONTH(DATE(2024,1,15),0)', 45322], ['=EOMONTH(DATE(2024,1,31),1)', 45351], ['=EDATE(DATE(2024,1,31),1)', 45351],
  ['=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"Y")', 4], ['=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"M")', 49], ['=DATEDIF(DATE(2024,1,15),DATE(2024,3,10),"D")', 55], ['=DATEDIF(DATE(2020,1,15),DATE(2024,3,10),"YM")', 1], ['=DAYS(DATE(2024,3,1),DATE(2024,2,1))', 29], ['=NETWORKDAYS(DATE(2024,3,1),DATE(2024,3,15))', 11],
  ['=VLOOKUP("South",Lookup!A2:C4,2,FALSE)', 'Sita'], ['=VLOOKUP("Zed",Lookup!A2:C4,2,FALSE)', '#N/A'], ['=VLOOKUP(1200,Data!C2:C8,1,TRUE)', 1200], ['=HLOOKUP("Manager",Lookup!A1:C4,2,FALSE)', 'Ravi'],
  ['=XLOOKUP("East",Lookup!A2:A4,Lookup!B2:B4)', 'Omar'], ['=XLOOKUP("Zed",Lookup!A2:A4,Lookup!B2:B4,"none")', 'none'], ['=XLOOKUP(2500,Lookup!C2:C4,Lookup!B2:B4,"",-1)', 'Sita'], ['=XLOOKUP("so*",Lookup!A2:A4,Lookup!B2:B4,"",2)', 'Sita'],
  ['=MATCH("South",Lookup!A2:A4,0)', 2], ['=MATCH(1100,Data!C2:C8,0)', 5], ['=INDEX(Lookup!A2:C4,2,2)', 'Sita'], ['=INDEX(Lookup!B2:B4,3)', 'Omar'], ['=INDEX(Lookup!B2:B4,MATCH("East",Lookup!A2:A4,0))', 'Omar'], ['=LOOKUP(2500,Lookup!C2:C4,Lookup!B2:B4)', 'Sita'],
  ['=INDEX(Data!A2:A8,MATCH(MAX(Data!C2:C8),Data!C2:C8,0))', 'Chitra'], ['=INDEX(Data!A2:A8,MATCH(1,(Data!B2:B8="North")*(Data!C2:C8>1000),0))', 'Asha'],
  ['=Total', [[1200], [800], [1500], [950], [1100], [700], [null]]], ['=SUM(Total)', 6250],
  ['=PMT(0.05/12,60,-20000)', 377.4253], ['=ROUND(FV(0.06,10,-100),2)', 1318.08], ['=ROUND(PV(0.08,5,-1000),2)', 3992.71], ['=ROUND(NPV(0.1,100,200,300),2)', 481.59], ['=ROUND(IPMT(0.01,1,12,1000),2)', -10], ['=ROUND(PPMT(0.01,1,12,1000),2)', -78.85],
  ['=ROW()', 1], ['=COLUMN()', 1], ['=ROWS(Data!A1:A8)', 8], ['=COLUMNS(Data!A1:E1)', 5], ['=SUBTOTAL(9,Data!C2:C8)', 6250], ['=LET(x,5,y,x*2,x+y)', 15],
  ['=XYZ(1)', '#NAME?'], ['="a"+1', '#VALUE!'], ['=NA()', '#N/A'], ['=SUM(Data!C2:C8)+', '#NAME?'],
  // dynamic arrays (spilled); compared as the anchor value followed by the spill
  ['=SEQUENCE(3)', [[1], [2], [3]]], ['=SEQUENCE(2,2)', [[1, 2], [3, 4]]], ['=SORT(Lookup!C2:C4)', [[1000], [2000], [3000]]], ['=SORT(Lookup!C2:C4,1,-1)', [[3000], [2000], [1000]]],
  ['=UNIQUE(Data!B2:B8)', [['North'], ['South'], ['East']]], ['=FILTER(Data!A2:A8,Data!B2:B8="North")', [['Asha'], ['Chitra'], ['Farid']]], ['=FILTER(Data!A2:C8,Data!C2:C8>1000)', [['Asha', 'North', 1200], ['Chitra', 'North', 1500], ['Esha', 'South', 1100]]],
  ['=FILTER(Data!A2:A8,Data!C2:C8>5000,"none")', 'none'], ['=TRANSPOSE(Lookup!A1:C1)', [['Dept'], ['Manager'], ['Target']]], ['=SORTBY(Lookup!A2:A4,Lookup!C2:C4,-1)', [['North'], ['South'], ['East']]], ['=LEFT(Data!A2:A4,2)', [['As'], ['Be'], ['Ch']]], ['=Data!C2:C4*2', [[2400], [1600], [3000]]],
  ['=UNIQUE(Data!B2:B8,,TRUE)', '#CALC!'], ['=ROWS(UNIQUE(Data!B2:B8))', 3], ['=SUM(FILTER(Data!C2:C8,Data!B2:B8="North"))', 3400], ['=TEXTJOIN(", ",TRUE,UNIQUE(Data!B2:B8))', 'North, South, East'], ['=COUNTA(UNIQUE(Data!B2:B8))', 3], ['=INDEX(SORT(Data!C2:C8,1,-1),2)', 1200], ['=SUM(LARGE(Data!C2:C8,{1,2}))', 2700],
];

let fail = 0;
const sheet = wb.sheet('Data');
T.forEach(([f, exp], idx) => {
  const sName = 'Calc';
  if (!wb.sheet(sName)) wb.addSheet(sName);
  const calc = wb.sheet(sName);
  for (const [k] of calc.cells) calc.cells.delete(k);
  wb.setRaw(sName, 'A1', f);
  wb.recalc();
  const arr = Array.isArray(exp);
  let got;
  if (arr) { got = exp.map((row, i) => row.map((_, j) => wb.valueAt(calc, i, j))); }
  else got = wb.valueAt(calc, 0, 0);
  const norm = (v) => (XL.isErr(v) ? v.err : v);
  const same = (a, b) => (typeof b === 'number' && typeof a === 'number' ? Math.abs(a - b) < 1e-4 * Math.max(1, Math.abs(b)) : a === b);
  const ok = arr ? exp.every((row, i) => row.every((v, j) => same(norm(got[i][j]), v))) : same(norm(got), exp);
  if (!ok) { fail++; console.log(`FAIL #${idx + 1} ${f}\n   expected ${JSON.stringify(exp)}\n   got      ${JSON.stringify(arr ? got.map((r) => r.map(norm)) : norm(got))}`); }
});
void sheet;

// spill blocking and formatting
{
  const w = new XL.Workbook(); w.addSheet('S');
  w.setRaw('S', 'A1', '=SEQUENCE(3)'); w.setRaw('S', 'A2', 5); w.recalc();
  const blocked = XL.isErr(w.value('S', 'A1')) && w.value('S', 'A1').err === '#SPILL!';
  if (!blocked) { fail++; console.log('FAIL spill should be blocked by a filled cell'); }
  const fmts = [[1234.567, '#,##0.00', '1,234.57'], [0.1234, '0.0%', '12.3%'], [-5, '0;[Red]-0', '-5'], [45000, 'yyyy-mm-dd', '2023-03-15'], [5, '0.0"x"', '5.0x'], [1234, '$#,##0', '$1,234'], [0.5, 'h:mm', '12:00'], [1234567, '#,##0', '1,234,567'], [7, '000', '007'], [1e-3, '0.00', '0.00']];
  fmts.forEach(([v, f, e]) => { const g = XL.formatValue(v, f); if (g !== e) { fail++; console.log(`FAIL format ${v} with ${f}: expected ${e}, got ${g}`); } });
  const inp = [['2024-03-05', 45356], ['12%', 0.12], ['$1,200', 1200], ['1,234', 1234], ['TRUE', true], ['abc', 'abc'], ["'007", '007'], ['3/5/2024', 45356]];
  inp.forEach(([t, e]) => { const g = XL.parseInput(t).raw; if (g !== e) { fail++; console.log(`FAIL parseInput(${t}): expected ${e}, got ${g}`); } });
  const sh = [['=A1+B$2', 1, 2, '=C2+D$2'], ['=SUM($A1:B$3)', 1, 1, '=SUM($A2:C$3)'], ['=Sheet2!A1', 1, 0, '=Sheet2!A2'], ['=A:A', 0, 1, '=B:B']];
  sh.forEach(([f, dr, dc, e]) => { const g = XL.shiftFormula(f, dr, dc); if (g !== e) { fail++; console.log(`FAIL shift ${f} (${dr},${dc}): expected ${e}, got ${g}`); } });
}
console.log(`${T.length} formulas checked, ${fail} failure${fail === 1 ? '' : 's'}.`);
process.exit(fail ? 1 : 0);
