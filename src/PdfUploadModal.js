import React, { useState } from "react";
import { X, Upload, AlertCircle, Loader, Trash2, Edit2, Check } from "lucide-react";
import * as XLSX from "xlsx";

export default function XlsxUploadModal({
  onClose,
  categories,
  accounts,
  onBulkAdd,
}) {
  const [file, setFile] = useState(null);
  const [extractedTransactions, setExtractedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const parentCategories = categories.filter(c => !c.parentId);
  const getSubcategories = (parentId) => categories.filter(c => c.parentId === parentId);

  // Smart categorization based on description
  const suggestCategory = (description) => {
    if (!description) return { categoryId: "", type: "expense" };

    const descLower = description.toLowerCase();

    // Income keywords
    if (
      descLower.includes("deposit") ||
      descLower.includes("e-transfer") ||
      descLower.includes("claimsecure") ||
      descLower.includes("mobile deposit")
    ) {
      return { categoryId: "", type: "income" };
    }

    // Transfer keywords
    if (descLower.match(/\bhx\d+\b/) || descLower.match(/\bhr\d+\b/) || descLower.includes("tfr")) {
      return { categoryId: "", type: "transfer" };
    }

    // Category mappings
    const categoryMappings = [
      {
        keywords: ["tim hortons", "starbucks", "coffee", "restaurant", "chung", "pizza", "burger", "food", "cafe"],
        name: "Food",
      },
      {
        keywords: ["uber", "lyft", "taxi", "shell", "gas", "esso", "petro", "fuel"],
        name: "Transport",
      },
      {
        keywords: ["gibson", "walmart", "amazon", "nayax", "vending", "store", "shop", "jd sport"],
        name: "Shopping",
      },
      {
        keywords: ["netflix", "spotify", "entertainment", "movie", "cinema"],
        name: "Entertainment",
      },
      {
        keywords: ["bell", "rogers", "hydro", "utility", "internet", "phone"],
        name: "Utilities",
      },
      {
        keywords: ["hospital", "pharmacy", "clinic", "doctor", "health"],
        name: "Healthcare",
      },
    ];

    for (const mapping of categoryMappings) {
      if (mapping.keywords.some(kw => descLower.includes(kw))) {
        const matchingCat = parentCategories.find(
          c => c.name.toLowerCase() === mapping.name.toLowerCase()
        );

        if (matchingCat) {
          return { categoryId: matchingCat.id, type: "expense", suggestionName: matchingCat.name };
        }
      }
    }

    return { categoryId: "", type: "expense" };
  };

  // Parse date in various formats
  const parseDate = (dateValue) => {
    if (!dateValue) return "";

    // If it's already a string in YYYY-MM-DD format
    if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    // Handle Excel serial dates
    if (typeof dateValue === "number") {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }

    // Try parsing string dates
    if (typeof dateValue === "string") {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    }

    return "";
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || selectedFile.name.endsWith(".xlsx"))) {
      setFile(selectedFile);
      setStep(1);
      setExtractedTransactions([]);
    } else {
      alert("Please upload a valid Excel (.xlsx) file.");
      setFile(null);
    }
  };

  // Extract transactions from XLSX
  const handleExtract = async () => {
    if (!file) return;

    setLoading(true);
    setExtractedTransactions([]);

    try {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet);

          if (rows.length === 0) {
            alert("No transactions found in the Excel file.");
            setLoading(false);
            return;
          }

          const transactions = rows
            .filter(row => {
              // Skip header and summary rows
              if (!row.Date || !row.Amount) return false;
              const desc = (row.Description || "").toString().toLowerCase();
              if (desc.includes("beginning balance") || desc.includes("ending balance")) return false;
              return true;
            })
            .map((row, index) => {
              const amount = parseFloat(String(row.Amount).replace(/[$,]/g, ""));
              const suggestion = suggestCategory(row.Description);
              const isIncome = suggestion.type === "income";
              const isTransfer = suggestion.type === "transfer";

              return {
                id: Date.now() + index,
                date: parseDate(row.Date),
                note: (row.Description || "").trim(),
                amount: Math.abs(amount),
                type: isIncome ? "income" : isTransfer ? "transfer" : "expense",
                category: suggestion.categoryId,
                subCategory: "",
                accountId: accounts[0]?.id || "",
                suggestedCategoryName: suggestion.suggestionName || "Uncategorized",
                needsReview: !isIncome && !isTransfer && !suggestion.categoryId,
                isIncome,
                isTransfer,
              };
            })
            .filter(t => t.date); // Only include transactions with valid dates

          if (transactions.length === 0) {
            alert("No valid transactions found. Please check your Excel format.");
            setLoading(false);
            return;
          }

          setExtractedTransactions(transactions);
          setStep(2);
        } catch (error) {
          console.error("Error parsing Excel:", error);
          alert("Error parsing Excel file. Please ensure it has Date, Type, Description, and Amount columns.");
        } finally {
          setLoading(false);
        }
      };

      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file.");
      setLoading(false);
    }
  };

  // Update transaction
  const handleUpdateTransaction = (id, updates) => {
    setExtractedTransactions(prev =>
      prev.map(trans => {
        if (trans.id === id) {
          const updated = { ...trans, ...updates };

          // Update needsReview flag
          if (updates.category !== undefined || updates.type !== undefined) {
            const type = updates.type !== undefined ? updates.type : trans.type;
            const category = updates.category !== undefined ? updates.category : trans.category;
            updated.needsReview = type === "expense" && !category;
          }

          return updated;
        }
        return trans;
      })
    );
  };

  // Delete transaction
  const handleDeleteTransaction = (id) => {
    setExtractedTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Start editing
  const handleStartEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditForm({ ...transaction });
  };

  // Save edit
  const handleSaveEdit = () => {
    handleUpdateTransaction(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  // Bulk add
  const handleBulkAdd = async () => {
    const readyTransactions = extractedTransactions
      .filter(t => !t.needsReview)
      .map(t => ({
        type: t.type,
        amount: t.amount,
        date: t.date,
        note: t.note,
        accountId: t.accountId,
        category: t.type === "expense" ? (t.subCategory || t.category || "") : "",
      }));

    if (readyTransactions.length === 0) {
      alert("No transactions ready to import. Please review highlighted rows.");
      return;
    }

    setIsBulkAdding(true);
    await onBulkAdd(readyTransactions);
    setIsBulkAdding(false);
  };

  const readyCount = extractedTransactions.filter(t => !t.needsReview).length;
  const needsReviewCount = extractedTransactions.filter(t => t.needsReview).length;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Import Bank Statement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload size={48} className="mx-auto text-blue-500 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {file ? file.name : "Upload Bank Statement (XLSX)"}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Select an Excel file with Date, Type, Description, and Amount columns
                </p>
                <input
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="hidden"
                  id="xlsx-upload"
                />
                <label
                  htmlFor="xlsx-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  {file ? "Change File" : "Select XLSX"}
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Excel file with columns: Date, Type, Description, Amount</li>
                  <li>• Transactions will be auto-categorized based on description</li>
                  <li>• Review all transactions before bulk import</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleExtract}
                  disabled={!file || loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading && <Loader size={18} className="animate-spin" />}
                  {loading ? "Extracting..." : "Extract Transactions"}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <AlertCircle size={20} className="text-yellow-500" />
                <p>
                  Review extracted transactions. <span className="font-semibold text-red-600">Red rows need attention.</span>
                </p>
              </div>

              {/* Stats */}
              <div className="bg-gray-100 p-4 rounded-lg grid grid-cols-4 gap-4 text-center border">
                <div>
                  <div className="text-gray-600 text-sm">Total</div>
                  <div className="text-2xl font-bold text-gray-800">{extractedTransactions.length}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Ready</div>
                  <div className="text-2xl font-bold text-green-600">{readyCount}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Need Review</div>
                  <div className="text-2xl font-bold text-red-600">{needsReviewCount}</div>
                </div>
                <div>
                  <div className="text-gray-600 text-sm">Total Amount</div>
                  <div className="text-2xl font-bold text-blue-600">
                    $
                    {extractedTransactions
                      .reduce((sum, t) => sum + (t.isIncome ? t.amount : -t.amount), 0)
                      .toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Date</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase flex-1">Description</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20">Type</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Category</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Subcategory</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Account</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {extractedTransactions.map((t) => {
                      const subCats = getSubcategories(t.category);
                      const isEditing = editingId === t.id;

                      return (
                        <tr key={t.id} className={t.needsReview ? "bg-red-50" : "hover:bg-gray-50"}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            ) : (
                              t.date
                            )}
                          </td>
                          <td className="px-3 py-2 max-w-xs">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editForm.note}
                                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            ) : (
                              <div className="truncate" title={t.note}>
                                {t.note}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editForm.amount}
                                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                className="w-full px-2 py-1 border rounded text-xs"
                                step="0.01"
                              />
                            ) : (
                              <span className={t.isIncome ? "text-green-600" : "text-red-600"}>
                                {t.isIncome ? "+" : "-"}${t.amount.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <select
                                value={editForm.type}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-xs"
                              >
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                                <option value="transfer">Transfer</option>
                              </select>
                            ) : (
                              <span className="capitalize text-xs">{t.type}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {!isEditing && t.isIncome || t.isTransfer ? (
                              <span className="text-xs text-gray-500">N/A</span>
                            ) : isEditing ? (
                              <select
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value, subCategory: "" })}
                                className={`w-full px-2 py-1 border rounded text-xs ${t.needsReview ? "border-red-400" : ""}`}
                              >
                                <option value="">-- Select --</option>
                                {parentCategories.map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={t.category}
                                onChange={(e) => handleUpdateTransaction(t.id, { category: e.target.value, subCategory: "" })}
                                className={`w-full px-2 py-1 border rounded text-xs ${t.needsReview ? "border-red-400" : ""}`}
                              >
                                <option value="">-- Select --</option>
                                {parentCategories.map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {subCats.length > 0 && !t.isIncome && !t.isTransfer ? (
                              isEditing ? (
                                <select
                                  value={editForm.subCategory}
                                  onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  <option value="">-- Optional --</option>
                                  {subCats.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.icon} {sub.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select
                                  value={t.subCategory}
                                  onChange={(e) => handleUpdateTransaction(t.id, { subCategory: e.target.value })}
                                  className="w-full px-2 py-1 border rounded text-xs"
                                >
                                  <option value="">-- Optional --</option>
                                  {subCats.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.icon} {sub.name}
                                    </option>
                                  ))}
                                </select>
                              )
                            ) : (
                              <span className="text-xs text-gray-500">--</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <select
                                value={editForm.accountId}
                                onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-xs"
                              >
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value={t.accountId}
                                onChange={(e) => handleUpdateTransaction(t.id, { accountId: e.target.value })}
                                className="w-full px-2 py-1 border rounded text-xs"
                              >
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex gap-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                                    title="Save"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(t)}
                                    className="p-1 hover:bg-blue-100 rounded"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} className="text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTransaction(t.id)}
                                    className="p-1 hover:bg-red-100 rounded"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} className="text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="p-5 border-t flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Back
            </button>
            <button
              onClick={handleBulkAdd}
              disabled={isBulkAdding || readyCount === 0}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400"
            >
              {isBulkAdding && <Loader size={20} className="animate-spin" />}
              Import {readyCount} Transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}