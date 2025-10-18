import React, { useState, useEffect } from "react";
import { X, Upload, Check, Edit2, AlertCircle } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

export default function PdfUploadModal({
  onClose,
  categories,
  accounts,
  onBulkAdd,
}) {
  const [file, setFile] = useState(null);
  const [extractedTransactions, setExtractedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [editingIndex, setEditingIndex] = useState(null);

  // Set up PDF.js worker - Updated to match your version
  useEffect(() => {
    // Use the worker version that matches your installed pdfjs-dist package
    const pdfjsVersion = pdfjsLib.version || '4.0.379';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;
    
    console.log('PDF.js version:', pdfjsVersion);
  }, []);

  // Enhanced transaction parsing - handles multiple formats
  const parseTransactionLine = (line) => {
    const cleanLine = line.trim().replace(/\s+/g, " ");
    
    console.log("Parsing line:", cleanLine); // Debug log
    
    // Pattern 1: Description Amount Date (e.g., "TIM HORTONS 5.99 SEP02")
    let match = cleanLine.match(/^(.+?)\s+([\d,]+\.\d{2})\s+([A-Z]{3}\d{1,2})$/i);
    if (match) {
      console.log("Matched Pattern 1");
      return {
        description: match[1].trim(),
        amount: parseFloat(match[2].replace(",", "")),
        date: match[3],
        type: "expense"
      };
    }

    // Pattern 2: Date Description Amount (e.g., "SEP 02 TIM HORTONS 5.99")
    match = cleanLine.match(/^([A-Z]{3}\s*\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})$/i);
    if (match) {
      console.log("Matched Pattern 2");
      return {
        description: match[2].trim(),
        amount: parseFloat(match[3].replace(",", "")),
        date: match[1].replace(/\s+/, ""),
        type: "expense"
      };
    }

    // Pattern 3: DD/MM/YYYY or MM/DD/YYYY format
    match = cleanLine.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})$/);
    if (match) {
      console.log("Matched Pattern 3");
      return {
        description: match[2].trim(),
        amount: parseFloat(match[3].replace(",", "")),
        date: match[1],
        type: "expense"
      };
    }

    // Pattern 4: Deposit/Income patterns
    match = cleanLine.match(/^(MOBILE DEPOSIT|E-TRANSFER|E-TFR|DEPOSIT|INTEREST|CREDIT)\s*(.+?)?\s+([\d,]+\.\d{2})\s+([A-Z]{3}\d{1,2})?/i);
    if (match) {
      console.log("Matched Pattern 4 (Income)");
      return {
        description: match[1].trim() + (match[2] ? " " + match[2].trim() : ""),
        amount: parseFloat(match[3].replace(",", "")),
        date: match[4] || new Date().toISOString().split('T')[0],
        type: "income"
      };
    }

    // Pattern 5: Transfer patterns
    match = cleanLine.match(/^(TRANSFER|TFR|WIRE|SEND)\s*(.+?)?\s+([\d,]+\.\d{2})\s+([A-Z]{3}\d{1,2})?/i);
    if (match) {
      console.log("Matched Pattern 5 (Transfer)");
      return {
        description: match[1].trim() + (match[2] ? " " + match[2].trim() : ""),
        amount: parseFloat(match[3].replace(",", "")),
        date: match[4] || new Date().toISOString().split('T')[0],
        type: "expense"
      };
    }

    // Pattern 6: Amount at the beginning
    match = cleanLine.match(/^([\d,]+\.\d{2})\s+([A-Z]{3}\d{1,2})\s+(.+)$/i);
    if (match) {
      console.log("Matched Pattern 6");
      return {
        description: match[3].trim(),
        amount: parseFloat(match[1].replace(",", "")),
        date: match[2],
        type: "expense"
      };
    }

    // Pattern 7: More flexible - any line with amount and description
    match = cleanLine.match(/(.+?)\s+([\d,]+\.\d{2})/);
    if (match && match[1].length > 3) {
      console.log("Matched Pattern 7 (Flexible)");
      return {
        description: match[1].trim(),
        amount: parseFloat(match[2].replace(",", "")),
        date: new Date().toISOString().split('T')[0],
        type: "expense"
      };
    }

    return null;
  };

  // Smart categorization with confidence scoring
  const categorizeMerchant = (description) => {
    const descLower = description.toLowerCase();

    const categoryMappings = [
      {
        keywords: ["tim hortons", "starbucks", "coffee", "cafe", "restaurant", "pizza", "burger", "mcdonald", "subway", "food", "dining", "kfc", "wendys"],
        categoryName: "food",
        confidence: "high",
        suggestion: "Food"
      },
      {
        keywords: ["uber", "lyft", "taxi", "shell", "gas", "esso", "petro", "fuel", "parking", "transit", "bus"],
        categoryName: "transport",
        confidence: "high",
        suggestion: "Transport"
      },
      {
        keywords: ["walmart", "amazon", "dollarama", "store", "shop", "mall", "retail", "costco", "target"],
        categoryName: "shopping",
        confidence: "high",
        suggestion: "Shopping"
      },
      {
        keywords: ["netflix", "spotify", "prime", "entertainment", "movie", "cinema", "theatre", "disney"],
        categoryName: "entertainment",
        confidence: "high",
        suggestion: "Entertainment"
      },
      {
        keywords: ["insurance", "health", "medical", "doctor", "pharmacy", "prescription", "hospital"],
        categoryName: "health",
        confidence: "high",
        suggestion: "Healthcare"
      },
      {
        keywords: ["bell", "rogers", "telus", "hydro", "electric", "water", "utility", "internet", "phone", "cable"],
        categoryName: "utilities",
        confidence: "high",
        suggestion: "Utilities"
      },
      {
        keywords: ["tuition", "school", "education", "course", "university", "college", "books"],
        categoryName: "education",
        confidence: "high",
        suggestion: "Education"
      },
      {
        keywords: ["rent", "mortgage", "housing", "landlord", "property"],
        categoryName: "housing",
        confidence: "high",
        suggestion: "Housing"
      },
      {
        keywords: ["gym", "fitness", "yoga", "sports", "recreation"],
        categoryName: "fitness",
        confidence: "medium",
        suggestion: "Fitness"
      },
      {
        keywords: ["salon", "haircut", "spa", "beauty", "nail"],
        categoryName: "personal care",
        confidence: "high",
        suggestion: "Personal Care"
      }
    ];

    // Check for transfers/deposits (skip categorization)
    if (
      descLower.includes("e-transfer") ||
      descLower.includes("e-tfr") ||
      descLower.includes("transfer") ||
      descLower.includes("deposit") ||
      descLower.includes("pts to") ||
      /^(hx|hr)\d+/i.test(descLower)
    ) {
      return {
        category: null,
        confidence: "low",
        suggestion: "Transfer/Internal",
        skipCategory: true
      };
    }

    // Try to match against mappings
    for (const mapping of categoryMappings) {
      for (const keyword of mapping.keywords) {
        if (descLower.includes(keyword)) {
          const matchedCategory = categories.find(
            c => !c.parentId && c.name.toLowerCase().includes(mapping.categoryName)
          );
          
          if (matchedCategory) {
            return {
              category: matchedCategory,
              confidence: mapping.confidence,
              suggestion: mapping.suggestion
            };
          }
          
          return {
            category: null,
            confidence: mapping.confidence,
            suggestion: mapping.suggestion,
            suggestNewCategory: true
          };
        }
      }
    }

    return {
      category: null,
      confidence: "low",
      suggestion: "Uncategorized",
      suggestNewCategory: false
    };
  };

  // Convert various date formats to YYYY-MM-DD
  const normalizeDate = (dateStr, year = new Date().getFullYear()) => {
    const monthDayMatch = dateStr.match(/([A-Z]{3})(\d{1,2})/i);
    if (monthDayMatch) {
      const monthMap = {
        JAN: "01", FEB: "02", MAR: "03", APR: "04",
        MAY: "05", JUN: "06", JUL: "07", AUG: "08",
        SEP: "09", OCT: "10", NOV: "11", DEC: "12"
      };
      const month = monthMap[monthDayMatch[1].toUpperCase()];
      const day = monthDayMatch[2].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      let [_, first, second, yearPart] = slashMatch;
      const fullYear = yearPart.length === 2 ? `20${yearPart}` : yearPart;
      const month = first.padStart(2, "0");
      const day = second.padStart(2, "0");
      return `${fullYear}-${month}-${day}`;
    }

    return new Date().toISOString().split('T')[0];
  };

  // Enhanced PDF parsing with better line detection
  const parsePdfContent = async (pdfText) => {
    // Split by newlines properly
    const lines = pdfText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5); // Filter out very short lines
    
    const transactions = [];
    const currentYear = new Date().getFullYear();

    console.log("Total lines extracted:", lines.length);
    console.log("First 30 lines for debugging:");
    lines.slice(0, 30).forEach((line, idx) => {
      console.log(`Line ${idx + 1}: "${line}"`);
    });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip headers and balance lines
      if (
        line.toLowerCase().includes("balance forward") ||
        line.toLowerCase().includes("ending balance") ||
        line.toLowerCase().includes("starting balance") ||
        line.toLowerCase().includes("statement period") ||
        line.toLowerCase().includes("account number") ||
        line.toLowerCase().includes("statement date") ||
        line.toLowerCase().includes("withdrawal") ||
        line.toLowerCase().includes("deposit") && line.toLowerCase().includes("description") ||
        line.toLowerCase().includes("continued on") ||
        line.match(/^page\s*\d+$/i) ||
        line.match(/^\d+$/) ||
        line.length < 10
      ) {
        continue;
      }

      const parsed = parseTransactionLine(line);
      if (parsed) {
        console.log("✓ Successfully parsed transaction:", parsed);
        const normalizedDate = normalizeDate(parsed.date, currentYear);
        const categorization = categorizeMerchant(parsed.description);

        transactions.push({
          note: parsed.description,
          amount: parsed.amount,
          date: normalizedDate,
          type: parsed.type,
          suggestedCategory: categorization.category?.id || null,
          suggestedCategoryName: categorization.suggestion,
          confidence: categorization.confidence,
          skipCategory: categorization.skipCategory || false,
          suggestNewCategory: categorization.suggestNewCategory || false,
          accountId: accounts[0]?.id || "",
          needsReview: !categorization.category || categorization.confidence === "low"
        });
      }
    }

    console.log("✓ Total extracted transactions:", transactions.length);
    if (transactions.length > 0) {
      console.log("Sample transactions:", transactions.slice(0, 5));
    }
    return transactions;
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile || uploadedFile.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }

    setFile(uploadedFile);
    setLoading(true);

    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/standard_fonts/'
      });
      
      const pdf = await loadingTask.promise;
      console.log("PDF loaded successfully, pages:", pdf.numPages);

      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map(item => item.str)
            .join(" ");
          
          fullText += pageText + "\n";
          console.log(`Page ${i} extracted, characters: ${pageText.length}`);
        } catch (pageError) {
          console.error(`Error extracting page ${i}:`, pageError);
        }
      }

      console.log("Full text length:", fullText.length);

      if (fullText.length < 100) {
        alert("The PDF appears to be empty or text couldn't be extracted. Try a different file.");
        setLoading(false);
        return;
      }

      const transactions = await parsePdfContent(fullText);
      
      if (transactions.length === 0) {
        alert("No transactions found. Please ensure it's a valid bank statement.");
        setLoading(false);
        return;
      }

      setExtractedTransactions(transactions);
      setStep(2);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      
      let errorMessage = "Error parsing PDF. ";
      
      if (error.name === "InvalidPDFException") {
        errorMessage += "The file is not a valid PDF.";
      } else if (error.name === "MissingPDFException") {
        errorMessage += "The PDF file is missing or empty.";
      } else if (error.name === "UnknownErrorException" && error.message.includes("API version")) {
        errorMessage += "PDF library version mismatch. Please refresh the page and try again.";
      } else {
        errorMessage += "Please try another file or check if it's password protected.";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (index, categoryId) => {
    const updated = [...extractedTransactions];
    updated[index].suggestedCategory = categoryId;
    updated[index].needsReview = false;
    updated[index].suggestNewCategory = false;
    setExtractedTransactions(updated);
  };

  const handleAmountChange = (index, newAmount) => {
    const updated = [...extractedTransactions];
    updated[index].amount = parseFloat(newAmount) || 0;
    setExtractedTransactions(updated);
  };

  const handleDateChange = (index, newDate) => {
    const updated = [...extractedTransactions];
    updated[index].date = newDate;
    setExtractedTransactions(updated);
  };

  const handleTypeChange = (index, newType) => {
    const updated = [...extractedTransactions];
    updated[index].type = newType;
    setExtractedTransactions(updated);
  };

  const handleDeleteTransaction = (index) => {
    const updated = extractedTransactions.filter((_, i) => i !== index);
    setExtractedTransactions(updated);
  };

  const handleBulkImport = () => {
    const readyTransactions = extractedTransactions.filter(
      t => t.type === "income" || (t.suggestedCategory && !t.needsReview) || t.skipCategory
    );

    if (readyTransactions.length === 0) {
      alert("Please review and assign categories to all transactions");
      return;
    }

    const transactionsToImport = readyTransactions.map(t => ({
      type: t.type,
      amount: t.amount,
      category: t.type === "expense" && !t.skipCategory ? t.suggestedCategory : "",
      date: t.date,
      note: t.note,
      accountId: t.accountId
    }));

    onBulkAdd(transactionsToImport);
  };

  const getCategoryOptions = () => {
    const parentCategories = categories.filter(c => !c.parentId);
    const options = [];

    parentCategories.forEach(parent => {
      options.push({ ...parent, isParent: true });
      const subcategories = categories.filter(c => c.parentId === parent.id);
      subcategories.forEach(sub => {
        options.push({ ...sub, isSubcategory: true, parentName: parent.name });
      });
    });

    return options;
  };

  const getUniqueNewCategorySuggestions = () => {
    const suggestions = new Set();
    extractedTransactions.forEach(t => {
      if (t.suggestNewCategory && t.suggestedCategoryName !== "Uncategorized") {
        suggestions.add(t.suggestedCategoryName);
      }
    });
    return Array.from(suggestions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Import Bank Statement</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Upload Bank Statement (PDF)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload your bank statement PDF to automatically extract transactions
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
                disabled={loading}
              />
              <label
                htmlFor="pdf-upload"
                className={`inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  "Choose File"
                )}
              </label>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">
                Supported Formats:
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• PDF bank statements from any bank</li>
                <li>• Standard transaction formats (Date, Description, Amount)</li>
                <li>• Automatically detects income and expenses</li>
                <li>• Smart category suggestions based on merchant names</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">
                Tips for Best Results:
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Use clear, text-based PDF statements (not scanned images)</li>
                <li>• Ensure the PDF is not password protected</li>
                <li>• Review all transactions before importing</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Check className="text-green-600 mt-0.5" size={20} />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900">
                    {extractedTransactions.length} Transactions Extracted
                  </h3>
                  <p className="text-sm text-green-700">
                    Review and adjust categories before importing
                  </p>
                </div>
              </div>
            </div>

            {getUniqueNewCategorySuggestions().length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-purple-600 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-purple-900 mb-2">
                      Suggested New Categories
                    </h3>
                    <p className="text-sm text-purple-700 mb-2">
                      These categories were detected but don't exist in your budget:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueNewCategorySuggestions().map((suggestion, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
                        >
                          {suggestion}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      Tip: You can add these categories in the Categories section after importing
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-2">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">
                  {extractedTransactions.filter(t => t.needsReview && !t.skipCategory && t.type !== "income").length}
                </span>{" "}
                transactions need review
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setStep(1);
                    setExtractedTransactions([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Import{" "}
                  {
                    extractedTransactions.filter(
                      t => !t.needsReview || t.type === "income" || t.skipCategory
                    ).length
                  }{" "}
                  Transactions
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700">
                <div className="col-span-1">Date</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Amount</div>
                <div className="col-span-4">Category</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1">Actions</div>
              </div>

              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {extractedTransactions.map((trans, index) => (
                  <div
                    key={index}
                    className={`px-4 py-3 grid grid-cols-12 gap-2 items-center text-xs ${
                      trans.needsReview && !trans.skipCategory && trans.type !== "income"
                        ? "bg-yellow-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="col-span-1">
                      {editingIndex === index ? (
                        <input
                          type="date"
                          value={trans.date}
                          onChange={e => handleDateChange(index, e.target.value)}
                          className="w-full px-1 py-1 border rounded text-xs"
                        />
                      ) : (
                        <span className="text-gray-600">{trans.date.substring(5)}</span>
                      )}
                    </div>
                    
                    <div className="col-span-3 font-medium text-gray-900 truncate" title={trans.note}>
                      {trans.note}
                    </div>
                    
                    <div className="col-span-1">
                      {editingIndex === index ? (
                        <select
                          value={trans.type}
                          onChange={e => handleTypeChange(index, e.target.value)}
                          className="w-full px-1 py-1 border rounded text-xs"
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            trans.type === "income"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {trans.type}
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-1">
                      {editingIndex === index ? (
                        <input
                          type="number"
                          value={trans.amount}
                          onChange={e => handleAmountChange(index, e.target.value)}
                          className="w-full px-1 py-1 border rounded text-xs"
                          step="0.01"
                        />
                      ) : (
                        <span
                          className={`font-semibold ${
                            trans.type === "income" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {trans.type === "income" ? "+" : "-"}${trans.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-4">
                      {trans.type === "income" ? (
                        <span className="text-xs text-gray-500 italic">
                          Income (No category needed)
                        </span>
                      ) : trans.skipCategory ? (
                        <span className="text-xs text-gray-500 italic">
                          Transfer/Internal
                        </span>
                      ) : (
                        <div>
                          <select
                            value={trans.suggestedCategory || ""}
                            onChange={e => handleCategoryChange(index, e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-xs ${
                              trans.needsReview
                                ? "border-yellow-400 bg-yellow-50"
                                : "border-gray-300"
                            }`}
                          >
                            <option value="">
                              {trans.suggestNewCategory
                                ? `⚠️ ${trans.suggestedCategoryName} (Not found)`
                                : "Select category..."}
                            </option>
                            {getCategoryOptions().map(cat => (
                              <option
                                key={cat.id}
                                value={cat.id}
                                className={cat.isSubcategory ? "pl-4 text-gray-600" : ""}
                              >
                                {cat.isSubcategory ? "  → " : ""}
                                {cat.icon} {cat.name}
                                {cat.isSubcategory ? ` (${cat.parentName})` : ""}
                              </option>
                            ))}
                          </select>
                          {trans.suggestNewCategory && (
                            <p className="text-xs text-orange-600 mt-1">
                              Category not found - please select or create
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      {trans.type === "income" || trans.skipCategory ? (
                        <Check size={16} className="text-green-600" />
                      ) : trans.needsReview ? (
                        <AlertCircle size={16} className="text-yellow-600" />
                      ) : (
                        <Check size={16} className="text-green-600" />
                      )}
                    </div>
                    
                    <div className="col-span-1 flex gap-1">
                      <button
                        onClick={() =>
                          setEditingIndex(editingIndex === index ? null : index)
                        }
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Edit"
                      >
                        <Edit2 size={14} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(index)}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                Import Summary
              </h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total</div>
                  <div className="text-xl font-bold text-gray-900">
                    {extractedTransactions.length}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ready</div>
                  <div className="text-xl font-bold text-green-600">
                    {
                      extractedTransactions.filter(
                        t => !t.needsReview || t.type === "income" || t.skipCategory
                      ).length
                    }
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Need Review</div>
                  <div className="text-xl font-bold text-yellow-600">
                    {
                      extractedTransactions.filter(
                        t => t.needsReview && !t.skipCategory && t.type !== "income"
                      ).length
                    }
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Total Amount</div>
                  <div className="text-xl font-bold text-blue-600">
                    $
                    {extractedTransactions
                      .reduce((sum, t) => {
                        if (t.type === "income") return sum + t.amount;
                        return sum - t.amount;
                      }, 0)
                      .toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


