import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUploadCloud,
  FiFileText,
  FiCheck,
  FiX
} from "react-icons/fi";
import Swal from "sweetalert2";
import Layout from "../../components/Layout";
import { getToken, clearSession } from "../../utils/auth";
import uploadErrorMessage from './utils/uploadError';

// Main workbook sections
const ALL_SHEETS = [
  "GDP", "I", "II", "III", "IV",
  "V", "VI", "VII", "VIII", "IX",
  "X", "XI", "XII", "XIII", "XIV",
  "XV", "XVI", "XVII"
];

const toast = (icon, title, text) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    text,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  });

const DataUpload = () => {
  const navigate = useNavigate();
  const [selectedSheet, setSelectedSheet] = useState("GDP");

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadInFlight = useRef(false);
  const [uploadError, setUploadError] = useState("");

  // Open upload modal for a specific sheet or current selected
  const handleOpenUpload = (sheetName = selectedSheet) => {
    setSelectedSheet(sheetName);
    setSelectedFile(null);
    setUploadError("");
    setIsUploadModalOpen(true);
  };

  // Navigate to Data Update page for the selected sheet
  const handleSheetClick = (sheetName) => {
    setSelectedSheet(sheetName);
    navigate(`/admin/data-update?sheet=${encodeURIComponent(sheetName)}`);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    if (uploadInFlight.current) return;
    setUploadError("");
    const validExtensions = [".xlsx", ".xls"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      setSelectedFile(null);
      setUploadError("Please select an Excel (.xlsx or .xls) file.");
      return;
    }
    if (!file.size) { setSelectedFile(null); setUploadError("The selected file is empty."); return; }
    setSelectedFile(file);
  };

  // Submit file upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (uploadInFlight.current) return;
    if (!selectedFile) {
      toast("warning", "No file selected", "Please choose a file to upload.");
      return;
    }

    const token = getToken();
    if (!token || token === "admin-session-token") { clearSession(); navigate("/login", { replace: true }); return; }
    uploadInFlight.current = true;
    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      // Also covers files selected by drag and drop. Send the original binary file.
      formData.set("file", selectedFile, selectedFile.name);
      // Let the browser set multipart/form-data with its matching boundary.
      const response = await fetch("/api/admin/upload-excel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(uploadErrorMessage(result, response.status));
      }

      toast(
        "success",
        "Upload Successful",
        result?.message || "Excel inputs updated successfully."
      );
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    } catch (error) {
      setUploadError(error.message || "Upload failed. Please try again.");
    } finally {
      uploadInFlight.current = false;
      setUploading(false);
    }
  };

  return (
    <Layout>
      {/* Top Header: Title & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl lg:text-[28px] font-bold text-gray-900 tracking-tight">
            Data Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload or add data for sheets from GDP to XVII
          </p>
        </div>

        {/* Breadcrumb */}
        {/* <div className="flex items-center gap-1.5 text-sm text-gray-400 self-start sm:self-auto">
          <span
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
            onClick={() => navigate("/admin/dashboard")}
          >
            Home
          </span>
          <span className="text-gray-400">&gt;</span>
          <span className="text-gray-700 font-medium">Data Upload</span>
        </div> */}
      </div>

      {/* Upload Data Card */}
      <div className="bg-[#edf4fe] border border-[#dbeafe] rounded-2xl p-6 lg:p-7 mb-6 transition-all duration-200 hover:shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-sm">
              <FiUploadCloud className="text-2xl" />
            </div>
            <div>
              <h2 className="text-[19px] font-bold text-gray-900">
                Upload Data
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Upload an Excel workbook to update data across its sheets.
              </p>
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
                <strong className="font-semibold">Note: </strong>
                Only change static data values in the workbook. Keep sheet names, formulas, and the workbook structure unchanged.
              </p>
              <a href="/samples/MPSEC-sample.xlsx" download="MPSEC_UpdatedVersion 22nd Oct (1) (1).xlsx"
                className="inline-flex mt-3 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
                Download sample Excel
              </a>
            </div>
          </div>

          <button
            onClick={() => handleOpenUpload(selectedSheet)}
            className="inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition duration-150 shrink-0 self-start sm:self-auto"
          >
            <FiUploadCloud className="text-base" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Select Sheet Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-6 lg:p-8">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-[19px] font-bold text-gray-900">
              Select Sheet
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose a sheet from GDP to XVII to view its data.
            </p>
          </div>

        </div>

        {/* Sheets Grid (5 columns on desktop matching image) */}
        {(
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {ALL_SHEETS.map((sheet) => {
              const isSelected = selectedSheet === sheet;
              return (
                <button
                  key={sheet}
                  type="button"
                  onClick={() => handleSheetClick(sheet)}
                  title={`Open Update ${sheet} Data`}
                  className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer hover:scale-[1.02] active:scale-[0.99] ${isSelected
                      ? "border-2 border-[#2563eb] bg-[#f0f6ff] shadow-sm ring-1 ring-blue-500/20"
                      : "border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                >
                  <FiFileText
                    className={`text-[20px] shrink-0 transition-colors ${isSelected
                        ? "text-[#2563eb]"
                        : "text-gray-400 group-hover:text-[#2563eb]"
                      }`}
                  />
                  <span
                    className={`text-sm font-semibold truncate ${isSelected ? "text-[#1d4ed8]" : "text-gray-800 group-hover:text-[#1d4ed8]"
                      }`}
                  >
                    {sheet}
                  </span>
                  {isSelected && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#2563eb]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload File Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <form method="post" encType="multipart/form-data" onSubmit={handleUploadSubmit} className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg p-6 sm:p-7 relative animate-in zoom-in-95 duration-150">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => !uploading && setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
            >
              <FiX className="text-xl" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center text-xl shrink-0">
                <FiUploadCloud />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Upload Excel Workbook
                </h3>
                <p className="text-xs text-gray-500">
                  Select or drag and drop an Excel (.xlsx, .xls) workbook
                </p>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-150 ${isDragging
                  ? "border-blue-500 bg-blue-50/60"
                  : selectedFile
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-gray-300 hover:border-gray-400 bg-gray-50/50"
                }`}
              onClick={() => !uploading && document.getElementById("modal-file-input")?.click()}
            >
              <input
                id="modal-file-input"
                name="file"
                type="file"
                accept=".xlsx,.xls"
                disabled={uploading}
                aria-label="Excel workbook"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                    <FiCheck />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FiUploadCloud className="text-3xl text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">
                    Click to browse or drag & drop your file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Updates data across all sheets in the workbook.
                  </p>
                </div>
              )}
            </div>

            {uploadError && <p role="alert" className="mt-4 text-sm text-red-700">{uploadError}</p>}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <FiUploadCloud />
                    <span>Upload & Process</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default DataUpload;
