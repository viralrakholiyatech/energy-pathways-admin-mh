
import EmptySheetPage from './pages/EmptySheetPage';
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiRotateCcw, FiSave } from "react-icons/fi";
import Layout from "../../components/Layout";

// Workbook pages
import MaharashtraGdpForm from "./pages/MaharashtraGdpForm";
import MaharashtraSectionI from "./pages/MaharashtraSectionI";
import MaharashtraSheetTabs from "./pages/MaharashtraSheetTabs";
import BioenergyUpdateForm from "./pages/BioenergyUpdateForm";

import GridStorageUpdateForm from "./pages/GridStorageUpdateForm";


const ALL_SHEETS = [
  "GDP", "I", "II", "III", "IV",
  "V", "VI", "VII", "VIII", "IX",
  "X", "XI", "XII", "XIII", "XIV",
  "XV", "XVI", "XVII"
];

const SHEET_DESCRIPTIONS = {
  GDP: "GDP growth assumptions and demand inputs for Maharashtra",
  I: "Hydrocarbon fuel power generation: gas, coal and carbon capture storage",
  II: "Category II: Nuclear Power Generation (Capacity, Plant Load Factors & Capex/Opex)",
  III: "Hydro Power Generation (Large Hydro)",
  IV: "Renewable power generation",
  V: "Category V: Bioenergy Power & Feedstock Generation (Biomass, 1G/2G Biofuels, Algae & Feedstock)",
  VI: "Waste to Electricity",
  VII: "Category VII: Electricity Grid, Transmission, Storage & Balancing (Trade, T&D Losses & Battery Storage)",
  VIII: "Green Hydrogen",
  IX: "Stress",
  X: "Buildings",
  XI: "Industry",
  XII: "Transport",
  XIII: "Cooking",
  XIV: "Agriculture",
  XV: "Fossil fuel production",
  XVI: "No worksheet available",
  XVII: "Refining and energy trade",
};

function ReadOnlyDraftControls({ sheet }) {
  return <div className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">Section {sheet} inputs</p>
        <p className="mt-1 text-xs text-gray-500">Data entry is currently unavailable.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 opacity-50 cursor-not-allowed"><FiRotateCcw aria-hidden="true" />Restore defaults</button>
        <button type="button" disabled className="rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 opacity-50 cursor-not-allowed">Clear fields</button>
        <button type="button" disabled className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm opacity-50 cursor-not-allowed"><FiSave aria-hidden="true" />Save Section {sheet} draft</button>
      </div>
    </div>
  </div>;
}

const DataUpdate = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected sheet from query param, default to GDP
  const requestedSheet = searchParams.get("sheet") || "GDP";
  const isXVTab = ["XV.a", "XV.b", "XV.c"].includes(requestedSheet);
  const sheetParam = isXVTab ? "XV" : requestedSheet.startsWith("XVII.") ? "XVII" : requestedSheet;
  const [currentSheet, setCurrentSheet] = useState(sheetParam);

  // Sync state if URL search param changes
  useEffect(() => {
    if (sheetParam) {
      setCurrentSheet(sheetParam);
    }
  }, [sheetParam]);

  const handleSelectSheet = (sheetName) => {
    setCurrentSheet(sheetName);
    setSearchParams({ sheet: sheetName });
  };

  return (
    <Layout>
      {/* Top Header: Title, Subtitle & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin/data-upload")}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
              title="Back to Data Upload"
            >
              <FiArrowLeft className="text-xl" />
            </button>
            <h1 className="text-2xl lg:text-[28px] font-bold text-gray-900 tracking-tight">
              Update {currentSheet} Data
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1 pl-9">
            {SHEET_DESCRIPTIONS[currentSheet] || `Update ${currentSheet} projection data`}
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-400 self-start sm:self-auto">
          <span
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={() => navigate("/admin/data-upload")}
          >
            Data Upload
          </span>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-700 font-medium">Update {currentSheet} Data</span>
        </div>
      </div>

      {/* Sheet Switcher Pills (Horizontal Scrollable) */}
      <div className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-3 mb-5 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
            Sheets:
          </span>
          {ALL_SHEETS.map((sheet) => {
            const isSelected = currentSheet === sheet;
            return (
              <button
                key={sheet}
                onClick={() => handleSelectSheet(sheet)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? "bg-[#2563eb] text-white shadow-sm ring-2 ring-blue-500/20"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/80"
                }`}
              >
                {sheet}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sheet Content: Dedicated form for each workbook section */}
      {currentSheet === "GDP" && <MaharashtraGdpForm />}
      {currentSheet === "I" && <MaharashtraSectionI />}
      {currentSheet === "II" && <MaharashtraSectionI key="II" section="II" />}
      {currentSheet === "III" && <MaharashtraSectionI key="III" section="III" />}
      {currentSheet === "IV" && <MaharashtraSectionI key="IV" section="IV" />}
      {currentSheet === "V" && <BioenergyUpdateForm readOnlyControls={<ReadOnlyDraftControls sheet="V" />} />}
      {currentSheet === "VI" && <MaharashtraSectionI key="VI" section="VI" />}
      {currentSheet === "VII" && <GridStorageUpdateForm readOnlyControls={<ReadOnlyDraftControls sheet="VII" />} />}
      {currentSheet === "VIII" && <MaharashtraSectionI key="VIII" section="VIII" />}
      {currentSheet === "XV" && <MaharashtraSheetTabs key="XV" section="XV" selectedTab={isXVTab ? requestedSheet : "XV.a"} onSelectTab={sheet => setSearchParams({ sheet })} />}
      {['IX', 'XVI'].includes(currentSheet) && <EmptySheetPage sheet={currentSheet} />}
      {currentSheet === "X" && <MaharashtraSheetTabs section="X" />}
      {currentSheet === "XI" && <MaharashtraSectionI key="XI" section="XI" />}
      {currentSheet === "XII" && <MaharashtraSheetTabs key="XII" section="XII" />}
      {currentSheet === "XIII" && <MaharashtraSectionI key="XIII" section="XIII" />}
      {currentSheet === "XIV" && <MaharashtraSectionI key="XIV" section="XIV" />}
      {currentSheet === "XVII" && <MaharashtraSheetTabs key="XVII" section="XVII" selectedTab={requestedSheet === "XVII.b" ? "XVII.b" : "XVII.a"} onSelectTab={sheet => setSearchParams({ sheet })} />}
      {currentSheet !== "GDP" && currentSheet !== "I" && currentSheet !== "II" && currentSheet !== "III" && currentSheet !== "IV" && currentSheet !== "V" && currentSheet !== "VI" && currentSheet !== "VII" && currentSheet !== "VIII" && currentSheet !== "IX" && currentSheet !== "X" && currentSheet !== "XI" && currentSheet !== "XII" && currentSheet !== "XIII" && currentSheet !== "XIV" && currentSheet !== "XV" && currentSheet !== "XVII" && <ReadOnlyDraftControls sheet={currentSheet} />}
    </Layout>
  );
};

export default DataUpdate;
