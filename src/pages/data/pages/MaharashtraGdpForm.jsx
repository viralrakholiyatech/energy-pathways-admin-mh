import { memo, useState } from "react";
import { FiSave, FiRotateCcw, FiChevronUp, FiChevronDown } from "react-icons/fi";
import WorkbookInputTable, { NumericInput } from "../components/WorkbookInputTable";
import sheetRows from "../schemas/mhGdp.json";

// Column C labels the trajectory row. A Chosen column heading is not a selection row.
const rows = sheetRows.filter(({ cells }) =>
  !/^(?:choose|chosen)(?: scenario)?$/i.test(String(cells.C?.[1] ?? "").trim())
);

const draftKey = "mh-admin:gdp:workbook-draft:v1";
const initial = {};
const blocks = [];
const scenarioProjectionTables = new Set([22, 30]);
// Keep each worksheet row intact. Empty worksheet rows separate table cards.
const growthTitle = rows.find(row => row.row === 13).cells.C[1];
const header = rows.find(row => row.row === 15).cells;
const periods = Object.keys(header).filter(col => col !== "C" && col !== "D");
function growthField(row, col) {
  const [kind, value] = row.cells[col];
  if (kind === "formula") return null;
  const key = col + row.row;
  initial[key] = value;
  return { key, label: "GDP " + key, unit: kind === "percent" ? "%" : "" };
}
const scenarios = rows.filter(row => row.row >= 16 && row.row <= 19).map(row => ({
  id: row.row, label: row.cells.C[1], description: row.cells.D[1],
  assumption: growthField(row, "F"), cells: periods.map(col => growthField(row, col))
}));
const industryParts = [79, 98, 117, 136].map(start => {
  const cells = rows.find(row => row.row === start).cells;
  return [cells.C[1].trim(), start, start + 15, cells.B[1]];
});
for (const row of rows.filter(item => item.row > 20)) {
  if (row.row >= 77 && row.row < 174 && !industryParts.some(([,start,end]) => row.row >= start && row.row <= end)) continue;
  const last = blocks[blocks.length - 1];
  if (!last || [59,69,77,174,185,193,515,526].includes(row.row) || row.row > last.end + 1) {
    blocks.push({ start: row.row, rows: [], columns: new Set() });
  }
  const block = blocks[blocks.length - 1];
  block.rows.push(row);
  block.end = row.row;
  for (const [col, [kind, value]] of Object.entries(row.cells)) {
    // The main GDP and sectoral projections end at the 2070 column (T).
    if (block.start >= 22 && block.start <= 48 && !/^(C|D|F|[H-T])$/.test(col)) continue;
    if ((block.start === 59 || block.start === 69) && !/^[C-T]$/.test(col)) continue;
    if (block.start >= 79 && block.start <= 151 && !/^[B-T]$/.test(col)) continue;
    if (row.row >= 528 && !/^[H-T]$/.test(col) && col !== "D") continue;
    block.columns.add(col);
    if (kind === "number" || kind === "percent") initial[col + row.row] = value;
  }
}
for (const block of blocks) {
  block.columns = Array.from(block.columns).sort((a,b) => a.length - b.length || a.localeCompare(b));
  // Keep calculations inside the timeline and any named or populated side tables.
  // Drop only the formula-only tail beyond the workbook timeline.
  while (block.columns.length) {
    const col = block.columns[block.columns.length - 1];
    if (col.length === 1 && col <= "T") break;
    if (block.rows.some(row => row.cells[col] && row.cells[col][0] !== "formula")) break;
    block.columns.pop();
  }
}

function sheetText(n) { return rows.find(row => row.row === n).cells.C[1].trim(); }
const sectionLayout = [
  {title:"Transport", description:"Passenger and freight demand by growth scenario and demand level.", parts:[["Passenger Transport",59,64],["Freight Transport",69,74]]},
  {title:"Industry", description:"Base-year production, growth assumptions and manually entered projections.", parts:industryParts},
  {title:"Telecom", description:"Growth assumptions for base transceiver stations.", parts:[[sheetText(175),177,181]]},
  {title:"Agriculture", description:"Gross irrigated area.", parts:[[sheetText(187),189,190]]},
  {title:sheetText(193), description:"Appliance penetration and appliances per household.", parts:[[sheetText(195),195,329],[sheetText(330),330,514]]},
  {title:sheetText(515), description:"Commercial floor space.", parts:[[sheetText(517),519,522]]},
  {title:sheetText(526), description:"Crop demand and exports.", parts:[[sheetText(528),528,584],[sheetText(585),585,629]]},
];
const transportColumns = Array.from("CDEFGHIJKLMNOPQRST");
const yearHeaders = rows.find(row => row.row === 23).cells;


const SheetRow = memo(function SheetRow({ row, columns, first, draft, change }) {
  return <tr className={first ? "bg-gray-50 text-xs font-medium text-gray-500" : "border-t border-gray-100 text-gray-800"}>
    {columns.map(col => {
      const ref = col + row.row;
      const [kind,value] = row.cells[col] || [];
      let content = value;
      if (kind === "number" || kind === "percent") {
        content = <NumericInput definition={{ key:ref, label:"GDP " + ref, unit:kind === "percent" ? "%" : "" }}
          value={draft[ref] ?? value} inputPrefix="mh-gdp" onChange={change} onBlur={() => {}} />;
      } else if (kind === "formula") {
        content = <span className="block text-right text-gray-400">-</span>;
      } else if (kind === "label" && /^-?\d+\.\d{10,}$/.test(value)) {
        content = String(Number(Number(value).toPrecision(15)));
      }
      return <td key={col} data-cell={kind ? ref : undefined} className="whitespace-nowrap px-3 py-2.5">{content}</td>;
    })}
  </tr>;
});

function DataTable({ title, columns, headers, data, draft, change }) {
  return <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
    <h4 className="border-b px-4 py-4 text-sm font-semibold text-gray-900">{title}</h4>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{title}</caption>
      <thead className="bg-gray-50 text-xs text-gray-500"><tr>{columns.map((col,i) =>
        <th key={col} scope="col" className="whitespace-nowrap px-3 py-3 font-medium">{headers[i]}</th>)}</tr></thead>
      <tbody>{data.map(row => <SheetRow key={row.row} row={row} columns={columns} draft={draft} change={change}/>)}</tbody>
    </table></div>
  </section>;
}

function ResidentialTables({ penetration, draft, change }) {
  const areas = penetration ? [["Urban",197],["Rural",264]] : [["Urban",332],["Rural",424]];
  const count = penetration ? 11 : 16;
  const columns = Array.from(penetration ? "DGHIJKLMNOPQRST" : "DHIJKLMNOPQRST");
  const headers = columns.map(col => col === "D" ? "Appliance" : col === "G" ? "CAGR" : yearHeaders[col][1]);
  return areas.map(([area,first]) => <section key={area} className="space-y-4">
    <h4 className="text-sm font-semibold">{area}</h4>
    {[0,1,2,3].map(index => {
      const start = first + index * (count + 2);
      const data = rows.filter(row => row.row > start && row.row <= start + count).map(row => {
        if (row.cells.D?.[0] !== "formula") return row;
        const original = rows.find(r => r.row === first + row.row - start);
        return {...row, cells:{...row.cells,D:original.cells.D}};
      });
      return <DataTable key={start} title={"Trajectory " + (index + 1)} columns={columns} headers={headers}
        data={data} draft={draft} change={change}/>;
    })}
  </section>);
}

export default function MaharashtraGdpForm() {
  const [draft, setDraft] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(draftKey)) || {}; } catch { return {}; }
  });
  const [closed, setClosed] = useState({});
  const [notice,setNotice] = useState("");
  function change(ref,value) {
    setDraft(previous => ({ ...previous, [ref]: value }));
    setNotice("");
  }
  function save(event) {
    event.preventDefault();
    const invalid = Object.keys(draft).find(ref => ref in initial && (String(draft[ref]).trim() === "" || !Number.isFinite(Number(draft[ref]))));
    if (invalid) {
      setNotice("Enter a number for GDP " + invalid + ".");
      event.currentTarget.elements.namedItem(invalid)?.focus();
      return;
    }
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
      setNotice("GDP draft saved in this tab.");
    } catch { setNotice("Could not save the draft in this tab."); }
  }
  return <form className="space-y-5 pb-3" onSubmit={save}>
    <WorkbookInputTable title={growthTitle} firstColumn={header.C[1]} showUnit={false}
      metadataColumns={[{ key: "description", label: header.D[1] }, { key: "assumption", label: "" }]}
      columns={periods.map(col => header[col][1])} rows={scenarios}
      form={{ values: { ...initial, ...draft }, errors: {}, inputPrefix: "mh-gdp", emptyLabel: "-",
        isErrorVisible: () => false, onBlur: () => {}, onChange: change }} />
    {blocks.filter(block => block.start >= 22 && block.start < 55).map(block => {
      const [heading, ...body] = block.rows;
      const title = heading.cells.C[1].trim();
      // The workbook places CAGR and year cells beside the title on the same line.
      const headingData = { ...heading, cells: { ...heading.cells, C: ["label", ""] } };
      return <section key={block.start} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-gray-900">{title}</h3></div>
        <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody className="divide-y divide-gray-100">
            {!scenarioProjectionTables.has(block.start) && <SheetRow row={headingData} columns={block.columns} first draft={draft} change={change}/>}
            {body.map(row => <SheetRow key={row.row} row={row} columns={block.columns}
              first={row.cells.C?.[1] === "Trajectory"} draft={draft} change={change}/>)}
          </tbody>
        </table></div>
      </section>;
    })}
    <h2 className="text-base font-bold text-gray-900">Trajectory for Demand Activity</h2>
    {sectionLayout.map(({title,description,parts}, i) => <section key={parts[0][1]} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <h2><button type="button" aria-expanded={!closed[parts[0][1]]} onClick={() => setClosed(prev => ({...prev,[parts[0][1]]:!prev[parts[0][1]]}))}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:p-5">
        <span className="flex min-w-0 items-center gap-3"><span><span className="block text-base font-bold text-gray-900">{i === 0 ? 1 : i+2}. {title}</span>
          <span className="mt-1 block text-xs font-normal text-gray-500">{description}</span></span></span>
        {closed[parts[0][1]] ? <FiChevronDown/> : <FiChevronUp/>}
      </button></h2>
      {!closed[parts[0][1]] && <div className="space-y-6 border-t border-gray-100 p-4 sm:p-6">{parts.map(([name,start,end,number],j) =>
        <section key={start} className="space-y-4">
          {![177,189,519].includes(start) && <h3 className="border-b border-gray-200 pb-3 text-sm font-bold text-gray-800">{number || [(i === 0 ? 1 : i+2),j+1].join(".")} {name}</h3>}
          {(start === 528 || start === 585) ? rows.filter(row => row.row > start && row.row <= end &&
            /^(Trajectory [1-4]|Fixed exports)$/i.test(row.cells.C?.[1]?.trim())).map(row =>
              <DataTable key={row.row} title={row.cells.C[1].trim()} columns={Array.from("DHIJKLMNOPQRST")}
                headers={["Crop", ...Array.from("HIJKLMNOPQRST", col => yearHeaders[col][1])]}
                data={rows.filter(item => item.row > row.row && item.row <= row.row + 9)}
                draft={draft} change={change}/>) :
            start === 519 ? <DataTable title={name} columns={Array.from("CHIJKLMNOPQRST")}
            headers={["", ...Array.from("HIJKLMNOPQRST", col => yearHeaders[col][1])]}
            data={rows.filter(row => row.row >= start && row.row <= end)} draft={draft} change={change}/> :
            start === 177 || start === 189 ? <DataTable title={name} columns={Object.keys(rows.find(r => r.row === start).cells)}
            headers={Object.values(rows.find(r => r.row === start).cells).map(cell => cell[1])}
            data={rows.filter(r => r.row > start && r.row <= end)} draft={draft} change={change}/> :
            title === "Residential buildings" ? <ResidentialTables penetration={start === 195} draft={draft} change={change}/> :
            blocks.filter(b => b.start >= start && b.start <= end).map(block => {
            const tableRows = block.rows.filter(r => r.row >= start && r.row <= end && !(start === 528 && r.row === 528));
            if (title === "Industry") {
              const [, headerRow, ...industryRows] = tableRows;
              return <div key={start} className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full border-collapse text-left text-sm"><caption className="sr-only">{name}</caption>
                  <thead className="bg-gray-50 text-xs text-gray-500"><tr>{block.columns.map(col =>
                    <th key={col} scope="col" className="whitespace-nowrap px-3 py-3 font-medium">{headerRow.cells[col]?.[1]}</th>)}</tr></thead>
                  <tbody>{industryRows.map(row => <SheetRow key={row.row} row={row} columns={block.columns} draft={draft} change={change}/>)}</tbody>
                </table>
              </div>;
            }
            // A worksheet section marker is already displayed by the surrounding heading.
            const firstCells = tableRows[0].cells;
            if (tableRows.length === 1 && Object.keys(firstCells).every(col => col === "B" || col === "C") &&
                [name, title].includes(firstCells.C?.[1]?.trim())) return null;
            if ((block.start === 59 || block.start === 69)) {
              const title = tableRows[0].cells.C[1];
              const transportHeader = tableRows[1].cells;
              const transportRows = tableRows.slice(2).map(row => ({
  ...row, cells: { ...row.cells, C: ["label", Number(row.cells.C[1]) * 100 + "%"] }
}));
              return <section key={block.start} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-gray-900">{title}</h3></div>
                <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
                  <caption className="sr-only">{title}</caption>
                  <thead className="bg-gray-50 text-xs text-gray-500"><tr>{transportColumns.map(col =>
                    <th key={col} scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                      {col >= "H" ? yearHeaders[col][1] : transportHeader[col][1].trim()}
                    </th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">{transportRows.map(row =>
                    <SheetRow key={row.row} row={row} columns={transportColumns} draft={draft} change={change}/>)}</tbody>
                </table></div>
              </section>;
            }
            const caption = Object.values(tableRows[0].cells).find(([kind,text]) => kind === "label" && /[A-Za-z]{2}/.test(text))?.[1] || name;
            return <section key={block.start} className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-4 sm:px-5"><h3 className="text-sm font-semibold text-gray-900">{caption}</h3></div>
              <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><caption className="sr-only">{caption}</caption>
                <tbody className="divide-y divide-gray-100">{tableRows.map((row,k) => <SheetRow key={row.row} row={row} columns={block.columns} first={k === 0} draft={draft} change={change}/>)}</tbody>
              </table></div>
            </section>;
          })}
        </section>)}</div>}
    </section>)}
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
      <div><p className="text-sm font-semibold text-gray-800">GDP inputs</p><p role="status" className="mt-1 text-xs text-gray-500">{notice || "Drafts stay in this browser tab."}</p></div>
      <div className="flex items-center gap-2">
        <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {if(window.confirm("Restore GDP workbook values?")) {setDraft({});setNotice("Defaults restored. Save to keep them.");}}}><FiRotateCcw/>Restore defaults</button>
        <button type="button" className="rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {if(window.confirm("Clear all GDP inputs?")) {setDraft(Object.fromEntries(Object.keys(initial).map(k => [k,""])));setNotice("GDP fields cleared.");}}}>Clear fields</button>
        <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><FiSave/>Save GDP draft</button>
      </div>
    </div>
  </form>;
}