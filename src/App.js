import React, { useState, useMemo, useEffect } from "react";
import {
  Lock,
  Wallet,
  Plus,
  X,
  Edit2,
  Trash2,
  Home,
  List,
  BarChart3,
  Settings,
  AlertCircle,
  ChevronLeft,
  Upload,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import * as dbService from "./dbService";
import { getUserPreferences, updateUserPreferences } from "./dbService";
import { getTransfers, addTransfer, deleteTransfer } from "./dbService";
import XlsxUploadModal from "./XlsxUploadModal";
import AIInsights from "./Aiinsights";

export default function FinanceTrackerApp({ user, onLogout }) {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [viewingAccountDetail, setViewingAccountDetail] = useState(false); 
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const emojis = [
    "🍔", "🚗", "🛍️", "📄", "🎬", "🥗", "🛒", "💼", "✈️", "📚", "🎮", "💇",
    "🏋️", "🍕", "⛽", "🏠", "📱", "🎁", "💳", "🎓", "📺", "🌳", "🚴", "⚡",
    "🎪", "🍷", "🎸", "🎨", "🔧", "🌸",
  ];

  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const [homeLayout, setHomeLayout] = useState("layout1");
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [showImportHelp, setShowImportHelp] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [transfers, setTransfers] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [transactionFilters, setTransactionFilters] = useState({
    dateFrom: "",
    dateTo: "",
    type: "",
    category: "",
    categoryType: "",
    minAmount: "",
    maxAmount: "",
    searchNote: "",
    month: new Date().toISOString().slice(0, 7),
  });

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    accountId: "",
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    icon: "",
    color: "#95E1D3",
    type: "need",
    budget: 0,
  });

  const [subcategoryFormData, setSubcategoryFormData] = useState({
    name: "",
    icon: "",
    budget: 0,
  });

  const [accountFormData, setAccountFormData] = useState({
    name: "",
    balance: "",
    color: "#4ECDC4",
    type: "checking",
  });

  const getFilteredTransactions = () => {
    return transactions.filter((trans) => {
      if (transactionFilters.month) {
        if (!trans.date.startsWith(transactionFilters.month)) return false;
      }
      if (transactionFilters.dateFrom && trans.date < transactionFilters.dateFrom) return false;
      if (transactionFilters.dateTo && trans.date > transactionFilters.dateTo) return false;
      if (transactionFilters.type && transactionFilters.type !== "all" && trans.type !== transactionFilters.type) return false;
      if (transactionFilters.category && trans.category !== transactionFilters.category) return false;
      if (transactionFilters.categoryType && transactionFilters.categoryType !== "all") {
        const cat = categories.find((c) => c.id === trans.category);
        if (!cat || cat.type !== transactionFilters.categoryType) return false;
      }
      if (transactionFilters.minAmount && trans.amount < parseFloat(transactionFilters.minAmount)) return false;
      if (transactionFilters.maxAmount && trans.amount > parseFloat(transactionFilters.maxAmount)) return false;
      if (transactionFilters.searchNote) {
        const searchLower = transactionFilters.searchNote.toLowerCase();
        const noteLower = (trans.note || "").toLowerCase();
        const catName = categories.find((c) => c.id === trans.category)?.name || "";
        if (!noteLower.includes(searchLower) && !catName.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  };

  const handlePreviousMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month - 2, 1);
    setCurrentMonth(newDate.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const newDate = new Date(year, month, 1);
    setCurrentMonth(newDate.toISOString().slice(0, 7));
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(new Date().toISOString().slice(0, 7));
  };

  const getMonthDisplay = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isCurrentMonth = () => {
    return currentMonth === new Date().toISOString().slice(0, 7);
  };

  const getMonthTransactions = () => {
    return transactions.filter(t => t.date.startsWith(currentMonth));
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const [categoriesData, transactionsData, accountsData, transfersData] =
          await Promise.all([
            dbService.getCategories(user.uid),
            dbService.getTransactions(user.uid),
            dbService.getAccounts(user.uid),
            dbService.getTransfers(user.uid).catch(() => []),
          ]);
        setCategories(categoriesData);
        setTransactions(transactionsData);
        setAccounts(accountsData);
        setTransfers(transfersData || []);
        if (accountsData.length > 0) {
          setFormData((prev) => ({ ...prev, accountId: accountsData[0].id }));
        }
        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [user]);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      try {
        const prefs = await getUserPreferences(user.uid);
        if (prefs && prefs.homeLayout) setHomeLayout(prefs.homeLayout);
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    };
    loadPreferences();
  }, [user]);

  useEffect(() => {
    if (currentScreen === "transactions") {
      setTransactionFilters(prev => ({ ...prev, month: currentMonth }));
    }
  }, [currentScreen, currentMonth]);

  const stats = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    const totalIncome = monthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = monthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const totalAccountBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const categorySpending = categories.filter((c) => !c.parentId).map((cat) => {
      const directSpent = monthTransactions.filter((t) => t.type === "expense" && t.category === cat.id).reduce((sum, t) => sum + t.amount, 0);
      const subcats = categories.filter((sc) => sc.parentId === cat.id);
      const subSpent = monthTransactions.filter((t) => t.type === "expense" && subcats.find((sc) => sc.id === t.category)).reduce((sum, t) => sum + t.amount, 0);
      const totalSpent = directSpent + subSpent;
      return {
        ...cat,
        spent: totalSpent,
        remaining: Math.max(0, cat.budget - totalSpent),
        percentage: cat.budget > 0 ? (totalSpent / cat.budget) * 100 : 0,
      };
    });
    return { totalIncome, totalExpenses, totalAccountBalance, categorySpending };
  }, [transactions, categories, accounts, currentMonth]);

  const handleAddTransaction = async () => {
    if (!formData.amount || formData.amount <= 0 || (formData.type === "expense" && !formData.category) || !formData.accountId) return;
    const transactionData = { ...formData, amount: parseFloat(parseFloat(formData.amount).toFixed(2)) };
    try {
      const account = accounts.find(a => a.id === formData.accountId);
      if (!account) { alert("Please select a valid account"); return; }
      if (editingTransaction) {
        const oldEffect = editingTransaction.type === "income" ? parseFloat(editingTransaction.amount.toFixed(2)) : -parseFloat(editingTransaction.amount.toFixed(2));
        const newEffect = transactionData.type === "income" ? parseFloat(transactionData.amount.toFixed(2)) : -parseFloat(transactionData.amount.toFixed(2));
        const netChange = parseFloat((newEffect - oldEffect).toFixed(2));
        const oldAccount = accounts.find(a => a.id === editingTransaction.accountId);
        const newAccount = accounts.find(a => a.id === transactionData.accountId);
        await dbService.updateTransaction(user.uid, editingTransaction.id, transactionData);
        if (oldAccount.id === newAccount.id) {
          const updatedBalance = parseFloat((oldAccount.balance + netChange).toFixed(2));
          await dbService.updateAccount(user.uid, oldAccount.id, { balance: updatedBalance });
          setAccounts(accounts.map(a => a.id === oldAccount.id ? { ...a, balance: updatedBalance } : a));
        } else {
          const oldAccountNewBalance = parseFloat((oldAccount.balance - oldEffect).toFixed(2));
          const newAccountNewBalance = parseFloat((newAccount.balance + newEffect).toFixed(2));
          await dbService.updateAccount(user.uid, oldAccount.id, { balance: oldAccountNewBalance });
          await dbService.updateAccount(user.uid, newAccount.id, { balance: newAccountNewBalance });
          setAccounts(accounts.map(a => {
            if (a.id === oldAccount.id) return { ...a, balance: oldAccountNewBalance };
            if (a.id === newAccount.id) return { ...a, balance: newAccountNewBalance };
            return a;
          }));
        }
        setTransactions(transactions.map((t) => t.id === editingTransaction.id ? { ...transactionData, id: t.id } : t));
        setEditingTransaction(null);
      } else {
        const newTransaction = await dbService.addTransaction(user.uid, transactionData);
        const balanceChange = transactionData.type === "income" ? parseFloat(transactionData.amount.toFixed(2)) : -parseFloat(transactionData.amount.toFixed(2));
        const newBalance = parseFloat((account.balance + balanceChange).toFixed(2));
        await dbService.updateAccount(user.uid, account.id, { balance: newBalance });
        setTransactions([newTransaction, ...transactions]);
        setAccounts(accounts.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
      }
      setFormData({ type: "expense", amount: "", category: "", date: new Date().toISOString().split("T")[0], note: "", accountId: accounts[0]?.id || "" });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Error saving transaction. Please try again.");
    }
  };

  const handleBulkAddTransactions = async (transactionsArray) => {
    try {
      const addedTransactions = [];
      const accountBalanceChanges = {};
      for (const transactionData of transactionsArray) {
        const exactAmount = parseFloat(parseFloat(transactionData.amount).toFixed(2));
        const transactionWithExactAmount = { ...transactionData, amount: exactAmount };
        const newTransaction = await dbService.addTransaction(user.uid, transactionWithExactAmount);
        addedTransactions.push(newTransaction);
        if (!accountBalanceChanges[transactionData.accountId]) accountBalanceChanges[transactionData.accountId] = 0;
        const change = transactionData.type === "income" ? exactAmount : -exactAmount;
        accountBalanceChanges[transactionData.accountId] = parseFloat((accountBalanceChanges[transactionData.accountId] + change).toFixed(2));
      }
      const updatedAccounts = [...accounts];
      for (const [accountId, change] of Object.entries(accountBalanceChanges)) {
        const account = updatedAccounts.find(a => a.id === accountId);
        if (account) {
          const newBalance = parseFloat((account.balance + change).toFixed(2));
          await dbService.updateAccount(user.uid, accountId, { balance: newBalance });
          account.balance = newBalance;
        }
      }
      setAccounts(updatedAccounts);
      setTransactions([...addedTransactions, ...transactions]);
      setShowPdfUploadModal(false);
      alert(`Successfully imported ${addedTransactions.length} transactions!`);
    } catch (error) {
      console.error("Error importing transactions:", error);
      alert("Error importing some transactions. Please try again.");
    }
  };

  const handleDeleteTransactionWithBalance = async (transaction) => {
    try {
      const account = accounts.find(a => a.id === transaction.accountId);
      if (account) {
        const newBalance = transaction.type === "income" ? account.balance - transaction.amount : account.balance + transaction.amount;
        await dbService.updateAccount(user.uid, account.id, { balance: newBalance });
        setAccounts(accounts.map(a => a.id === account.id ? { ...a, balance: newBalance } : a));
      }
      await dbService.deleteTransaction(user.uid, transaction.id);
      setTransactions(transactions.filter((t) => t.id !== transaction.id));
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Error deleting transaction. Please try again.");
    }
  };

  const handleAddCategory = async () => {
    if (!categoryFormData.name || !categoryFormData.budget || !categoryFormData.icon) return;
    try {
      if (editingCategory) {
        await dbService.updateCategory(user.uid, editingCategory.id, categoryFormData);
        setCategories(categories.map((c) => c.id === editingCategory.id ? { ...editingCategory, ...categoryFormData } : c));
        setEditingCategory(null);
      } else {
        const newCategory = await dbService.addCategory(user.uid, { ...categoryFormData, parentId: null });
        setCategories([...categories, newCategory]);
      }
      setCategoryFormData({ name: "", icon: "", color: "#95E1D3", type: "need", budget: 0 });
      setShowCategoryForm(false);
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Error saving category. Please try again.");
    }
  };

  const handleAddSubcategory = async () => {
    if (!subcategoryFormData.name || !subcategoryFormData.budget || !subcategoryFormData.icon) return;
    try {
      if (editingSubcategory) {
        await dbService.updateCategory(user.uid, editingSubcategory.id, subcategoryFormData);
        setCategories(categories.map((c) => c.id === editingSubcategory.id ? { ...editingSubcategory, ...subcategoryFormData } : c));
        setEditingSubcategory(null);
      } else {
        const parentCat = categories.find((c) => c.id === selectedCategoryId);
        const newSubcategory = await dbService.addCategory(user.uid, {
          name: subcategoryFormData.name,
          icon: subcategoryFormData.icon,
          budget: subcategoryFormData.budget,
          color: parentCat.color,
          type: parentCat.type,
          parentId: selectedCategoryId,
        });
        setCategories([...categories, newSubcategory]);
      }
      setSubcategoryFormData({ name: "", icon: "", budget: 0 });
      setShowSubcategoryForm(false);
    } catch (error) {
      console.error("Error saving subcategory:", error);
      alert("Error saving subcategory. Please try again.");
    }
  };

  const handleAddAccount = async () => {
    if (!accountFormData.name || !accountFormData.balance) return;
    const accountData = { ...accountFormData, balance: parseFloat(accountFormData.balance) };
    try {
      if (editingAccount) {
        await dbService.updateAccount(user.uid, editingAccount.id, accountData);
        setAccounts(accounts.map((a) => a.id === editingAccount.id ? { ...editingAccount, ...accountData } : a));
        setEditingAccount(null);
      } else {
        const newAccount = await dbService.addAccount(user.uid, accountData);
        setAccounts([...accounts, newAccount]);
      }
      setAccountFormData({ name: "", balance: "", color: "#4ECDC4", type: "checking" });
      setShowAccountForm(false);
    } catch (error) {
      console.error("Error saving account:", error);
      alert("Error saving account. Please try again.");
    }
  };

  const handlePasswordReset = async (newPassword) => {
    try {
      const { updatePassword } = await import("firebase/auth");
      await updatePassword(user, newPassword);
      alert("Password updated successfully!");
      setShowPasswordModal(false);
    } catch (error) {
      alert("Error updating password: " + error.message);
    }
  };

  const handleLayoutChange = async (layout) => {
    setHomeLayout(layout);
    setShowLayoutModal(false);
    try {
      await updateUserPreferences(user.uid, { homeLayout: layout });
    } catch (error) {
      console.error("Error saving layout preference:", error);
    }
  };

  const customConfirm = (message) => {
    return window.confirm(message);
  };

  const handleTransfer = async () => {
    if (!transferFormData.fromAccountId || !transferFormData.toAccountId || !transferFormData.amount || transferFormData.amount <= 0) {
      alert("Please fill in all transfer details");
      return;
    }
    if (transferFormData.fromAccountId === transferFormData.toAccountId) {
      alert("Cannot transfer to the same account");
      return;
    }
    try {
      if (!user || !user.uid) {
        alert("User not authenticated properly");
        return;
      }
      const amount = parseFloat(parseFloat(transferFormData.amount).toFixed(2));
      const fromAccount = accounts.find(a => a.id === transferFormData.fromAccountId);
      const toAccount = accounts.find(a => a.id === transferFormData.toAccountId);
      if (!fromAccount || !toAccount) {
        alert("Invalid accounts selected");
        return;
      }
      if (fromAccount.balance < amount) {
        alert(`Insufficient funds in ${fromAccount.name}. Available: $${fromAccount.balance.toFixed(2)}`);
        return;
      }
      const transferData = {
        fromAccountId: transferFormData.fromAccountId,
        toAccountId: transferFormData.toAccountId,
        amount: amount,
        note: transferFormData.note || "Account Transfer",
        date: transferFormData.date,
        timestamp: new Date().toISOString(),
      };
      const newTransfer = await addTransfer(user.uid, transferData);
      const newFromBalance = parseFloat((fromAccount.balance - amount).toFixed(2));
      const newToBalance = parseFloat((toAccount.balance + amount).toFixed(2));
      await dbService.updateAccount(user.uid, fromAccount.id, { balance: newFromBalance });
      await dbService.updateAccount(user.uid, toAccount.id, { balance: newToBalance });
      setAccounts(accounts.map(a => {
        if (a.id === fromAccount.id) return { ...a, balance: newFromBalance };
        if (a.id === toAccount.id) return { ...a, balance: newToBalance };
        return a;
      }));
      setTransfers([newTransfer, ...transfers]);
      setTransferFormData({ fromAccountId: "", toAccountId: "", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
      setShowTransferModal(false);
      alert("Transfer completed successfully!");
    } catch (error) {
      console.error("Error processing transfer:", error);
      alert(`Error processing transfer: ${error.message}`);
    }
  };

  const handleDeleteTransfer = async (transfer) => {
    if (!customConfirm("Delete this transfer? This will reverse the transaction.")) return;
    try {
      const fromAccount = accounts.find(a => a.id === transfer.fromAccountId);
      const toAccount = accounts.find(a => a.id === transfer.toAccountId);
      if (!fromAccount || !toAccount) {
        alert("Cannot reverse transfer - accounts not found");
        return;
      }
      const newFromBalance = parseFloat((fromAccount.balance + transfer.amount).toFixed(2));
      const newToBalance = parseFloat((toAccount.balance - transfer.amount).toFixed(2));
      await dbService.updateAccount(user.uid, fromAccount.id, { balance: newFromBalance });
      await dbService.updateAccount(user.uid, toAccount.id, { balance: newToBalance });
      await deleteTransfer(user.uid, transfer.id);
      setAccounts(accounts.map(a => {
        if (a.id === fromAccount.id) return { ...a, balance: newFromBalance };
        if (a.id === toAccount.id) return { ...a, balance: newToBalance };
        return a;
      }));
      setTransfers(transfers.filter(t => t.id !== transfer.id));
    } catch (error) {
      console.error("Error deleting transfer:", error);
      alert("Error deleting transfer. Please try again.");
    }
  };

  const AccountDetailView = ({ account, setViewingAccountDetail, setSelectedAccountId }) => {
    const [filter, setFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const accountTransactions = getMonthTransactions().filter(t => t.accountId === account.id);
    const accountTransfers = transfers.filter(t => (t.fromAccountId === account.id || t.toAccountId === account.id) && t.date.startsWith(currentMonth));
    const getFilteredItems = () => {
      let filteredTrans = [];
      let filteredTransf = [];
      if (filter === "all") {
        filteredTrans = accountTransactions;
        filteredTransf = accountTransfers;
      } else if (filter === "expense") {
        filteredTrans = accountTransactions.filter(t => t.type === "expense");
      } else if (filter === "income") {
        filteredTrans = accountTransactions.filter(t => t.type === "income");
      } else if (filter === "transfer") {
        filteredTransf = accountTransfers;
      }
      const combined = [
        ...filteredTrans.map(t => ({ ...t, itemType: 'transaction' })),
        ...filteredTransf.map(t => ({ ...t, itemType: 'transfer' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      return combined;
    };
    const allItems = getFilteredItems();
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = allItems.slice(startIndex, endIndex);
    useEffect(() => { setCurrentPage(1); }, [filter]);
    const totalIncome = accountTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = accountTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    const transfersIn = accountTransfers.filter(t => t.toAccountId === account.id).reduce((sum, t) => sum + t.amount, 0);
    const transfersOut = accountTransfers.filter(t => t.fromAccountId === account.id).reduce((sum, t) => sum + t.amount, 0);
    const handleBackClick = () => { setViewingAccountDetail(false); setSelectedAccountId(null); };
    return (
      <div className="space-y-4 sm:space-y-6">
        <button onClick={handleBackClick} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 px-2 sm:px-3 py-2 rounded-lg transition-colors text-sm sm:text-base">
          <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          Back to Accounts
        </button>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: account.color }}>
              <Wallet size={24} className="sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{account.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 capitalize">{account.type} Account</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Current Balance</div>
              <div className="text-base sm:text-xl font-bold" style={{ color: account.color }}>${account.balance.toFixed(2)}</div>
            </div>
            <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Income</div>
              <div className="text-base sm:text-xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Expenses</div>
              <div className="text-base sm:text-xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
              <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Net Transfers</div>
              <div className={`text-base sm:text-xl font-bold ${transfersIn - transfersOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {transfersIn - transfersOut >= 0 ? '+' : ''}${(transfersIn - transfersOut).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Transactions for {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button onClick={() => setFilter("all")} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-lg transition-colors ${filter === "all" ? "bg-blue-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>All ({accountTransactions.length + accountTransfers.length})</button>
              <button onClick={() => setFilter("expense")} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-lg transition-colors ${filter === "expense" ? "bg-red-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>Expenses ({accountTransactions.filter(t => t.type === "expense").length})</button>
              <button onClick={() => setFilter("income")} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-lg transition-colors ${filter === "income" ? "bg-green-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>Income ({accountTransactions.filter(t => t.type === "income").length})</button>
              <button onClick={() => setFilter("transfer")} className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm font-medium rounded-lg transition-colors ${filter === "transfer" ? "bg-purple-600 text-white shadow-md" : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"}`}>Transfers ({accountTransfers.length})</button>
            </div>
          </div>
          {allItems.length > 0 && <div className="mb-3 sm:mb-4 text-[10px] sm:text-sm text-gray-600">Showing {startIndex + 1} - {Math.min(endIndex, allItems.length)} of {allItems.length} transactions</div>}
          <div className="space-y-2 mb-4 sm:mb-6">
            {paginatedItems.length > 0 ? paginatedItems.map((item) => {
              if (item.itemType === 'transfer') {
                const isOutgoing = item.fromAccountId === account.id;
                const otherAccount = isOutgoing ? accounts.find(a => a.id === item.toAccountId) : accounts.find(a => a.id === item.fromAccountId);
                return (
                  <div key={`transfer-${item.id}`} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          <ArrowRight size={16} className="sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                            <span className="truncate">{isOutgoing ? 'Transfer to' : 'Transfer from'} {otherAccount?.name || 'Unknown'}</span>
                            <span className="px-1.5 sm:px-2 py-0.5 bg-purple-600 text-white text-[8px] sm:text-xs rounded-full font-semibold whitespace-nowrap">Transfer</span>
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-600">{item.date} • {item.note}</div>
                        </div>
                      </div>
                      <div className={`text-sm sm:text-lg font-bold whitespace-nowrap ml-2 ${isOutgoing ? "text-red-600" : "text-green-600"}`}>{isOutgoing ? "-" : "+"}${item.amount.toFixed(2)}</div>
                    </div>
                  </div>
                );
              } else {
                const cat = categories.find(c => c.id === item.category);
                return (
                  <div key={`transaction-${item.id}`} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                        <span className="text-xl sm:text-2xl flex-shrink-0">{cat ? cat.icon : item.type === "income" ? "💰" : "💸"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-gray-900 mb-0.5 sm:mb-1 truncate">{item.note || cat?.name || "Transaction"}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{item.date} • {cat?.name || item.type}</div>
                        </div>
                      </div>
                      <div className={`text-sm sm:text-lg font-bold whitespace-nowrap ml-2 ${item.type === "income" ? "text-green-600" : "text-red-600"}`}>{item.type === "income" ? "+" : "-"}${item.amount.toFixed(2)}</div>
                    </div>
                  </div>
                );
              }
            }) : (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <div className="text-3xl sm:text-4xl mb-2">🔭</div>
                <p className="text-xs sm:text-sm">No {filter !== "all" ? filter + " " : ""}transactions this month</p>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3 sm:pt-4">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}>Previous</button>
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-[200px] sm:max-w-none">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg font-medium text-xs sm:text-sm transition-colors ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>{page}</button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}>Next</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 sm:p-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold">Finance Tracker</h1>
          <div className="relative">
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 sm:gap-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 transition-all">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xs sm:text-sm">{user?.email?.[0]?.toUpperCase() || "U"}</span>
              </div>
              <span className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">{user?.email || "User"}</span>
            </button>
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg py-2 z-50">
                  <div className="px-3 sm:px-4 py-2 border-b border-gray-100">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">Signed in</p>
                  </div>
                  <button onClick={() => { setShowProfileMenu(false); setShowPasswordModal(true); }} className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Lock size={14} className="sm:w-4 sm:h-4" /> Change Password
                  </button>
                  <button onClick={() => { setShowProfileMenu(false); onLogout(); }} className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <X size={14} className="sm:w-4 sm:h-4" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 sm:p-6 pb-20 sm:pb-24">
        {selectedCategoryId ? (
          <div className="space-y-3 sm:space-y-4">
            <button onClick={() => setSelectedCategoryId(null)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 sm:mb-4 text-sm sm:text-base">
              <ChevronLeft size={18} className="sm:w-5 sm:h-5" /> Back
            </button>
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="text-3xl sm:text-4xl">{categories.find((c) => c.id === selectedCategoryId)?.icon}</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{categories.find((c) => c.id === selectedCategoryId)?.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 capitalize">{categories.find((c) => c.id === selectedCategoryId)?.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-[10px] sm:text-sm text-gray-600">Budget</div>
                  <div className="text-base sm:text-2xl font-bold text-blue-600">${categories.find((c) => c.id === selectedCategoryId)?.budget.toFixed(2)}</div>
                </div>
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-[10px] sm:text-sm text-gray-600">Spent</div>
                  <div className="text-base sm:text-2xl font-bold text-red-600">${getMonthTransactions().filter((t) => t.category === selectedCategoryId || categories.filter((sc) => sc.parentId === selectedCategoryId).find((sc) => sc.id === t.category)).reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</div>
                </div>
                <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                  <div className="text-[10px] sm:text-sm text-gray-600">Remaining</div>
                  <div className="text-base sm:text-2xl font-bold text-green-600">${Math.max(0, categories.find((c) => c.id === selectedCategoryId)?.budget - getMonthTransactions().filter((t) => t.category === selectedCategoryId || categories.filter((sc) => sc.parentId === selectedCategoryId).find((sc) => sc.id === t.category)).reduce((sum, t) => sum + t.amount, 0)).toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h3 className="text-base sm:text-lg font-bold">All Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {getMonthTransactions().filter((t) => t.category === selectedCategoryId || categories.filter((sc) => sc.parentId === selectedCategoryId).find((sc) => sc.id === t.category)).map((trans) => {
                  const transcat = categories.find((c) => c.id === trans.category);
                  const acc = accounts.find((a) => a.id === trans.accountId);
                  return (
                    <div key={trans.id} className="p-3 sm:p-4 hover:bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div>
                          <div className="text-xs sm:text-sm font-medium">{transcat?.name} - {trans.note || "Transaction"}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500">{trans.date} • {acc?.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-xs sm:text-sm font-semibold text-red-600">-${trans.amount.toFixed(2)}</div>
                        <button onClick={() => { setEditingTransaction(trans); setFormData(trans); setShowAddModal(true); }} className="p-1.5 sm:p-2 hover:bg-gray-200 rounded"><Edit2 size={14} className="sm:w-4 sm:h-4" /></button>
                        <button onClick={() => handleDeleteTransactionWithBalance(trans)} className="p-1.5 sm:p-2 hover:bg-red-100 rounded"><Trash2 size={14} className="sm:w-4 sm:h-4 text-red-600" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentScreen === "home" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <button onClick={handlePreviousMonth} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={20} className="sm:w-6 sm:h-6 text-gray-600" /></button>
                    <div className="text-center flex-1">
                      <h2 className="text-xl sm:text-3xl font-bold text-gray-900">{getMonthDisplay()}</h2>
                      <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1">{getMonthTransactions().length} transactions this month</p>
                    </div>
                    <button onClick={handleNextMonth} disabled={isCurrentMonth()} className={`p-1.5 sm:p-2 rounded-lg transition-colors ${isCurrentMonth() ? "text-gray-300 cursor-not-allowed" : "hover:bg-gray-100 text-gray-600"}`}><ChevronLeft size={20} className="sm:w-6 sm:h-6 rotate-180" /></button>
                  </div>
                  {!isCurrentMonth() && (
                    <div className="mt-3 sm:mt-4 text-center">
                      <button onClick={handleCurrentMonth} className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition-colors">Back to Current Month</button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setShowLayoutModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <Settings size={14} className="sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm font-medium">Change Layout</span>
                  </button>
                </div>

                {homeLayout === "layout1" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white shadow-md">
                        <div className="text-xs sm:text-sm font-medium text-green-100">Total Income</div>
                        <div className="text-lg sm:text-3xl font-bold">${stats.totalIncome.toFixed(2)}</div>
                      </div>
                      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 sm:p-6 text-white shadow-md">
                        <div className="text-xs sm:text-sm font-medium text-red-100">Total Expenses</div>
                        <div className="text-lg sm:text-3xl font-bold">${stats.totalExpenses.toFixed(2)}</div>
                      </div>
                      <div className={`bg-gradient-to-br ${stats.totalIncome - stats.totalExpenses >= 0 ? "from-blue-500 to-blue-600" : "from-orange-500 to-orange-600"} rounded-xl p-4 sm:p-6 text-white shadow-md`}>
                        <div className="text-xs sm:text-sm font-medium text-blue-100">Remaining</div>
                        <div className="text-lg sm:text-3xl font-bold">${(stats.totalIncome - stats.totalExpenses).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">Budget Overview</h3>
                      <div className="space-y-3 sm:space-y-4">
                        {stats.categorySpending.map((cat) => (
                          <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="cursor-pointer hover:bg-gray-50 p-2 sm:p-3 rounded-lg transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs sm:text-sm font-medium text-gray-700">{cat.icon} {cat.name}</span>
                              <span className="text-xs sm:text-sm font-semibold text-gray-800">${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.percentage > 100 ? "#EF4444" : cat.color }} />
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{cat.percentage.toFixed(0)}% used</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">Recent Transactions</h3>
                      <div className="space-y-2 sm:space-y-3">
                        {getMonthTransactions().slice(0, 5).map((trans) => {
                          const cat = categories.find((c) => c.id === trans.category);
                          const parentCat = cat && categories.find((c) => c.id === cat.parentId);
                          return (
                            <div key={trans.id} className="p-2 sm:p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                              <div className="flex items-start justify-between mb-1 sm:mb-2">
                                <div className="flex items-start gap-2 sm:gap-3">
                                  <span className="text-base sm:text-lg">{cat ? cat.icon : "💰"}</span>
                                  <div>
                                    <div className="text-xs sm:text-sm font-medium">{trans.note || "Transaction"}</div>
                                    <div className="text-[10px] sm:text-xs text-gray-500">{cat ? cat.name : "Income"} {parentCat ? `(${parentCat.name})` : ""}</div>
                                    <div className="text-[8px] sm:text-[10px] text-gray-400">{trans.date}</div>
                                  </div>
                                </div>
                                <div className={`text-xs sm:text-sm font-semibold ${trans.type === "income" ? "text-green-600" : "text-red-600"}`}>{trans.type === "income" ? "+" : "-"}${trans.amount.toFixed(2)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {homeLayout === "layout2" && (
                  <>
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div><div className="text-[10px] sm:text-sm text-blue-100">Income</div><div className="text-base sm:text-2xl font-bold">${stats.totalIncome.toFixed(2)}</div></div>
                        <div><div className="text-[10px] sm:text-sm text-blue-100">Expenses</div><div className="text-base sm:text-2xl font-bold">${stats.totalExpenses.toFixed(2)}</div></div>
                        <div><div className="text-[10px] sm:text-sm text-blue-100">Balance</div><div className="text-base sm:text-2xl font-bold">${(stats.totalIncome - stats.totalExpenses).toFixed(2)}</div></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div><h3 className="text-base sm:text-lg font-bold text-gray-800">Needs</h3></div>
                        <div className="space-y-2 sm:space-y-3">
                          {stats.categorySpending.filter((cat) => cat.type === "need").map((cat) => (
                            <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="cursor-pointer p-2 sm:p-3 border border-gray-100 rounded-lg hover:border-red-300 transition-colors">
                              <div className="flex items-center justify-between mb-1 sm:mb-2">
                                <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-base sm:text-xl">{cat.icon}</span><span className="text-xs sm:text-sm font-medium">{cat.name}</span></div>
                                <span className="text-[10px] sm:text-xs font-semibold text-gray-600">${cat.spent.toFixed(0)} / ${cat.budget.toFixed(0)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5"><div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(cat.percentage, 100)}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div><h3 className="text-base sm:text-lg font-bold text-gray-800">Wants</h3></div>
                        <div className="space-y-2 sm:space-y-3">
                          {stats.categorySpending.filter((cat) => cat.type === "want").map((cat) => (
                            <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="cursor-pointer p-2 sm:p-3 border border-gray-100 rounded-lg hover:border-blue-300 transition-colors">
                              <div className="flex items-center justify-between mb-1 sm:mb-2">
                                <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-base sm:text-xl">{cat.icon}</span><span className="text-xs sm:text-sm font-medium">{cat.name}</span></div>
                                <span className="text-[10px] sm:text-xs font-semibold text-gray-600">${cat.spent.toFixed(0)} / ${cat.budget.toFixed(0)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(cat.percentage, 100)}%` }} /></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">Recent Activity</h3>
                      <div className="space-y-1.5 sm:space-y-2">
                        {getMonthTransactions().slice(0, 5).map((trans) => {
                          const cat = categories.find((c) => c.id === trans.category);
                          return (
                            <div key={trans.id} className="flex items-center justify-between p-1.5 sm:p-2 hover:bg-gray-50 rounded">
                              <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-base sm:text-lg">{cat ? cat.icon : "💰"}</span><div><div className="text-xs sm:text-sm font-medium">{trans.note || cat?.name || "Transaction"}</div><div className="text-[8px] sm:text-[10px] text-gray-500">{trans.date}</div></div></div>
                              <div className={`text-xs sm:text-sm font-semibold ${trans.type === "income" ? "text-green-600" : "text-red-600"}`}>{trans.type === "income" ? "+" : "-"}${trans.amount.toFixed(2)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {homeLayout === "layout3" && (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100"><div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Income</div><div className="text-sm sm:text-xl font-bold text-green-600">${stats.totalIncome.toFixed(2)}</div></div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100"><div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Expenses</div><div className="text-sm sm:text-xl font-bold text-red-600">${stats.totalExpenses.toFixed(2)}</div></div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100"><div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Remaining</div><div className="text-sm sm:text-xl font-bold text-blue-600">${(stats.totalIncome - stats.totalExpenses).toFixed(2)}</div></div>
                      <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-100"><div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Accounts</div><div className="text-sm sm:text-xl font-bold text-purple-600">${stats.totalAccountBalance.toFixed(2)}</div></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm sm:text-md font-bold mb-2 sm:mb-3 text-gray-800">Top Categories</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {stats.categorySpending.sort((a, b) => b.spent - a.spent).slice(0, 6).map((cat) => (
                            <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="flex items-center justify-between p-1.5 sm:p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-base sm:text-lg">{cat.icon}</span><span className="text-xs sm:text-sm font-medium">{cat.name}</span></div>
                              <div className="text-right"><div className="text-xs sm:text-sm font-semibold text-gray-800">${cat.spent.toFixed(0)}</div><div className="text-[8px] sm:text-[10px] text-gray-500">{cat.percentage.toFixed(0)}%</div></div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
                        <h3 className="text-sm sm:text-md font-bold mb-2 sm:mb-3 text-gray-800">Recent Transactions</h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {getMonthTransactions().slice(0, 6).map((trans) => {
                            const cat = categories.find((c) => c.id === trans.category);
                            return (
                              <div key={trans.id} className="flex items-center justify-between p-1.5 sm:p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-sm sm:text-base">{cat ? cat.icon : "💰"}</span><div><div className="text-[10px] sm:text-xs font-medium truncate max-w-[120px] sm:max-w-none">{trans.note || cat?.name || "Transaction"}</div><div className="text-[8px] sm:text-[10px] text-gray-400">{trans.date}</div></div></div>
                                <div className={`text-[10px] sm:text-xs font-semibold ${trans.type === "income" ? "text-green-600" : "text-red-600"}`}>{trans.type === "income" ? "+" : "-"}${trans.amount.toFixed(2)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {homeLayout === "layout4" && (
                  <>
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        <div className="text-center"><div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Total Income</div><div className="text-xl sm:text-3xl font-bold text-green-600 mb-0.5 sm:mb-1">${stats.totalIncome.toFixed(2)}</div><div className="text-[8px] sm:text-xs text-gray-400">This period</div></div>
                        <div className="text-center border-l border-r border-gray-100"><div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Total Expenses</div><div className="text-xl sm:text-3xl font-bold text-red-600 mb-0.5 sm:mb-1">${stats.totalExpenses.toFixed(2)}</div><div className="text-[8px] sm:text-xs text-gray-400">{stats.categorySpending.length} categories</div></div>
                        <div className="text-center"><div className="text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">Net Balance</div><div className={`text-xl sm:text-3xl font-bold mb-0.5 sm:mb-1 ${stats.totalIncome - stats.totalExpenses >= 0 ? "text-blue-600" : "text-orange-600"}`}>${(stats.totalIncome - stats.totalExpenses).toFixed(2)}</div><div className="text-[8px] sm:text-xs text-gray-400">{((stats.totalExpenses / (stats.totalIncome || 1)) * 100).toFixed(1)}% spent</div></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
                      <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-gray-800">Budget Performance</h3>
                      <div className="space-y-3 sm:space-y-4">
                        {stats.categorySpending.map((cat) => {
                          const isOverBudget = cat.percentage > 100;
                          const isNearLimit = cat.percentage > 80 && cat.percentage <= 100;
                          return (
                            <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="cursor-pointer border border-gray-100 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-2 sm:mb-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl" style={{ backgroundColor: cat.color + "20" }}>{cat.icon}</div>
                                  <div><div className="text-sm sm:text-base font-semibold text-gray-900">{cat.name}</div><div className="text-[8px] sm:text-xs text-gray-500 capitalize">{cat.type} • Budget: ${cat.budget.toFixed(2)}</div></div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-base sm:text-lg font-bold ${isOverBudget ? "text-red-600" : isNearLimit ? "text-orange-600" : "text-gray-900"}`}>${cat.spent.toFixed(2)}</div>
                                  <div className={`text-[8px] sm:text-xs font-medium ${isOverBudget ? "text-red-600" : isNearLimit ? "text-orange-600" : "text-green-600"}`}>{cat.percentage.toFixed(0)}% used</div>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: isOverBudget ? "#EF4444" : isNearLimit ? "#F97316" : cat.color }} />
                              </div>
                              {isOverBudget && <div className="text-[8px] sm:text-xs text-red-600 mt-1 sm:mt-2 font-medium">⚠️ Over budget by ${(cat.spent - cat.budget).toFixed(2)}</div>}
                              {isNearLimit && !isOverBudget && <div className="text-[8px] sm:text-xs text-orange-600 mt-1 sm:mt-2 font-medium">⚠️ ${cat.remaining.toFixed(2)} remaining</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentScreen === "transactions" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold">All Transactions</h2>
                    <button onClick={() => setShowImportHelp(true)} className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" title="Learn how to import transactions"><HelpCircle size={16} className="sm:w-[18px] sm:h-[18px]" /></button>
                  </div>
                  <div className="flex gap-2 sm:gap-3 flex-wrap">
                    <button onClick={() => setShowPdfUploadModal(true)} className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"><Upload size={14} className="sm:w-[18px] sm:h-[18px]" /> Import XLSX</button>
                    <a href="https://app.statementparser.ai/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"><Upload size={14} className="sm:w-[18px] sm:h-[18px]" /> Convert Statement to XLSX</a>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">Filter Transactions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">From Date</label><input type="date" value={transactionFilters.dateFrom} onChange={(e) => setTransactionFilters({ ...transactionFilters, dateFrom: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" /></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">To Date</label><input type="date" value={transactionFilters.dateTo} onChange={(e) => setTransactionFilters({ ...transactionFilters, dateTo: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" /></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Type</label><select value={transactionFilters.type} onChange={(e) => setTransactionFilters({ ...transactionFilters, type: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"><option value="">All Types</option><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option></select></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Category Type</label><select value={transactionFilters.categoryType} onChange={(e) => setTransactionFilters({ ...transactionFilters, categoryType: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"><option value="">All Categories</option><option value="need">Needs</option><option value="want">Wants</option></select></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Category</label><select value={transactionFilters.category} onChange={(e) => setTransactionFilters({ ...transactionFilters, category: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"><option value="">All Categories</option>{categories.filter((c) => !c.parentId).map((cat) => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}</select></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Min Amount</label><input type="number" value={transactionFilters.minAmount} onChange={(e) => setTransactionFilters({ ...transactionFilters, minAmount: e.target.value })} placeholder="0.00" step="0.01" className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" /></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Max Amount</label><input type="number" value={transactionFilters.maxAmount} onChange={(e) => setTransactionFilters({ ...transactionFilters, maxAmount: e.target.value })} placeholder="9999.99" step="0.01" className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" /></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Search</label><input type="text" value={transactionFilters.searchNote} onChange={(e) => setTransactionFilters({ ...transactionFilters, searchNote: e.target.value })} placeholder="Search by note or category..." className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" /></div>
                    <div><label className="block text-[10px] sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Month</label><div className="flex gap-1 sm:gap-2"><select value={transactionFilters.month} onChange={(e) => setTransactionFilters({ ...transactionFilters, month: e.target.value })} className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"><option value="">All Time</option>{Array.from({ length: 12 }, (_, i) => { const date = new Date(); date.setMonth(date.getMonth() - i); const monthStr = date.toISOString().slice(0, 7); const display = date.toLocaleDateString("en-US", { month: "long", year: "numeric" }); return (<option key={monthStr} value={monthStr}>{display}</option>); })}</select><button onClick={() => { setTransactionFilters({ ...transactionFilters, month: currentMonth }); }} className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-[10px] sm:text-sm font-medium whitespace-nowrap">This Month</button><button onClick={() => { setTransactionFilters({ ...transactionFilters, month: "" }); }} className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 text-[10px] sm:text-sm font-medium whitespace-nowrap">All Time</button></div></div>
                  </div>
                  <div className="mt-3 sm:mt-4 flex gap-1.5 sm:gap-2"><button onClick={() => setTransactionFilters({ dateFrom: "", dateTo: "", type: "", category: "", categoryType: "", minAmount: "", maxAmount: "", searchNote: "", month: currentMonth })} className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-xs sm:text-sm transition-colors">Clear Filters</button></div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-3 sm:p-4"><p className="text-[10px] sm:text-sm text-gray-700">Showing <span className="font-semibold text-blue-600">{getFilteredTransactions().length}</span> of <span className="font-semibold text-gray-600">{transactions.length}</span> transactions{Object.values(transactionFilters).some((v) => v) && (<span className="text-gray-500 ml-1 sm:ml-2">(filters applied)</span>)}</p></div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {getFilteredTransactions().length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {getFilteredTransactions().map((trans) => {
                        const cat = categories.find((c) => c.id === trans.category);
                        const acc = accounts.find((a) => a.id === trans.accountId);
                        return (
                          <div key={trans.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start gap-2 sm:gap-4">
                              <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                                <span className="text-xl sm:text-2xl flex-shrink-0">{cat ? cat.icon : "💰"}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <div className="text-xs sm:text-sm font-semibold text-gray-900">{cat ? cat.name : "Income"}</div>
                                    {cat && (<span className="inline-flex items-center px-1 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-xs font-medium bg-gray-100 text-gray-700 capitalize">{cat.type}</span>)}
                                  </div>
                                  {trans.note && <p className="text-[10px] sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">{trans.note}</p>}
                                  <div className="flex items-center gap-1.5 sm:gap-3 mt-0.5 sm:mt-2 text-[8px] sm:text-xs text-gray-500"><span>{trans.date}</span>{acc && <span>•</span>}{acc && <span>{acc.name}</span>}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                <div className="text-right"><div className={`text-xs sm:text-lg font-bold ${trans.type === "income" ? "text-green-600" : "text-red-600"}`}>{trans.type === "income" ? "+" : "-"}${trans.amount.toFixed(2)}</div></div>
                                <div className="flex gap-0.5 sm:gap-1">
                                  <button onClick={() => { setEditingTransaction(trans); setFormData(trans); setShowAddModal(true); }} className="p-1.5 sm:p-2 hover:bg-blue-100 rounded-lg transition-colors" title="Edit"><Edit2 size={14} className="sm:w-4 sm:h-4 text-blue-600" /></button>
                                  <button onClick={() => handleDeleteTransactionWithBalance(trans)} className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg transition-colors" title="Delete"><Trash2 size={14} className="sm:w-4 sm:h-4 text-red-600" /></button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 sm:p-12 text-center"><div className="text-gray-400 text-3xl sm:text-5xl mb-2 sm:mb-3">📋</div><h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">No transactions found</h3><p className="text-[10px] sm:text-sm text-gray-500">Try adjusting your filters or import transactions to get started.</p></div>
                  )}
                </div>
              </div>
            )}

            {currentScreen === "categories" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl font-bold">Categories</h2>
                  <button onClick={() => { setCategoryFormData({ name: "", icon: "", color: "#95E1D3", type: "need", budget: 0 }); setEditingCategory(null); setShowCategoryForm(true); }} className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium">+ Add Category</button>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {categories.filter((c) => !c.parentId).map((cat) => (
                    <div key={cat.id}>
                      <div className="flex justify-between items-center p-3 sm:p-4 border border-gray-100 rounded-lg hover:border-gray-200">
                        <div className="flex items-center gap-2 sm:gap-3"><span className="text-xl sm:text-2xl">{cat.icon}</span><div><div className="text-sm sm:text-base font-medium">{cat.name}</div><div className="text-[8px] sm:text-xs text-gray-500">Budget: ${cat.budget} • {cat.type}</div></div></div>
                        <div className="flex gap-1.5 sm:gap-2">
                          <button onClick={() => { setSelectedCategoryId(cat.id); setShowSubcategoryForm(true); setEditingSubcategory(null); setSubcategoryFormData({ name: "", icon: "", budget: 0 }); }} className="px-1.5 sm:px-3 py-1 bg-blue-50 text-blue-600 rounded text-[8px] sm:text-xs font-medium hover:bg-blue-100">+ Subcategory</button>
                          <button onClick={() => { setEditingCategory(cat); setCategoryFormData(cat); setShowCategoryForm(true); }} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded"><Edit2 size={14} className="sm:w-4 sm:h-4" /></button>
                          <button onClick={async () => { await dbService.deleteCategory(user.uid, cat.id); const subcatIds = categories.filter((c) => c.parentId === cat.id).map((c) => c.id); for (const id of subcatIds) { await dbService.deleteCategory(user.uid, id); } setCategories(categories.filter((c) => c.id !== cat.id && c.parentId !== cat.id)); }} className="p-1.5 sm:p-2 hover:bg-red-100 rounded"><Trash2 size={14} className="sm:w-4 sm:h-4 text-red-600" /></button>
                        </div>
                      </div>
                      {categories.filter((sc) => sc.parentId === cat.id).length > 0 && (
                        <div className="ml-4 sm:ml-8 mt-1.5 sm:mt-2 space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                          {categories.filter((sc) => sc.parentId === cat.id).map((subcat) => (
                            <div key={subcat.id} className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-base sm:text-xl">{subcat.icon}</span><div><div className="text-xs sm:text-sm font-medium">{subcat.name}</div><div className="text-[8px] sm:text-xs text-gray-500">Budget: ${subcat.budget}</div></div></div>
                              <div className="flex gap-1.5 sm:gap-2">
                                <button onClick={() => { setEditingSubcategory(subcat); setSubcategoryFormData(subcat); setSelectedCategoryId(cat.id); setShowSubcategoryForm(true); }} className="p-1.5 sm:p-2 hover:bg-gray-200 rounded"><Edit2 size={14} className="sm:w-4 sm:h-4" /></button>
                                <button onClick={async () => { await dbService.deleteCategory(user.uid, subcat.id); setCategories(categories.filter((c) => c.id !== subcat.id)); }} className="p-1.5 sm:p-2 hover:bg-red-100 rounded"><Trash2 size={14} className="sm:w-4 sm:h-4 text-red-600" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentScreen === "accounts" && (
  <div className="space-y-4 sm:space-y-6">
    {viewingAccountDetail && selectedAccountId && accounts.find((a) => a.id === selectedAccountId) ? (
      <AccountDetailView account={accounts.find((a) => a.id === selectedAccountId)} setViewingAccountDetail={setViewingAccountDetail} setSelectedAccountId={setSelectedAccountId} />
    ) : (
      <>
        {/* Header with Transfer Button - Improved for mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Bank Accounts</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                Total Balance: <span className="font-semibold text-gray-900">${stats.totalAccountBalance.toFixed(2)}</span>
              </p>
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={() => { 
                  setTransferFormData({ 
                    fromAccountId: accounts[0]?.id || "", 
                    toAccountId: accounts[1]?.id || "", 
                    amount: "", 
                    note: "", 
                    date: new Date().toISOString().split("T")[0] 
                  }); 
                  setShowTransferModal(true); 
                }} 
                disabled={accounts.length < 2} 
                className={`flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 hover:shadow-lg transition-all ${
                  accounts.length < 2 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                title={accounts.length < 2 ? "Need at least 2 accounts to transfer" : "Transfer money between accounts"}
              >
                <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span>Transfer</span>
              </button>
              <button 
                onClick={() => { 
                  setAccountFormData({ name: "", balance: "", color: "#4ECDC4", type: "checking" }); 
                  setEditingAccount(null); 
                  setShowAccountForm(true); 
                }} 
                className="flex-1 sm:flex-none bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Your Accounts Section - Completely redesigned for mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Your Accounts</h3>
              <p className="text-xs text-gray-500 mt-0.5">{accounts.length} account{accounts.length !== 1 ? "s" : ""} total</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {accounts.map((acc) => {
              const accountTransactions = getMonthTransactions().filter((t) => t.accountId === acc.id);
              const accountTransfers = transfers.filter((t) => 
                (t.fromAccountId === acc.id || t.toAccountId === acc.id) && 
                t.date.startsWith(currentMonth)
              );
              
              return (
                <div 
                  key={acc.id} 
                  className="border border-gray-100 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all cursor-pointer active:bg-gray-50"
                  onClick={() => { 
                    setSelectedAccountId(acc.id); 
                    setViewingAccountDetail(true); 
                  }}
                >
                  {/* Account Card - Mobile optimized layout */}
                  <div className="p-3 sm:p-4" style={{ backgroundColor: acc.color + "08" }}>
                    {/* Top row: Account name and balance */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                          style={{ backgroundColor: acc.color }}
                        >
                          <Wallet size={20} className="sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{acc.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{acc.type}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-lg sm:text-2xl font-bold" style={{ color: acc.color }}>
                          ${acc.balance.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Bottom row: Stats - Mobile friendly grid */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 mb-0.5">Income</div>
                        <div className="text-xs sm:text-sm font-semibold text-green-600">
                          +${accountTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 mb-0.5">Expenses</div>
                        <div className="text-xs sm:text-sm font-semibold text-red-600">
                          -${accountTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-gray-500 mb-0.5">Transfers</div>
                        <div className="text-xs sm:text-sm font-semibold text-purple-600">
                          {accountTransfers.length}
                        </div>
                      </div>
                    </div>
                    
                    {/* Edit/Delete buttons - Only visible on hover/tap */}
                    <div className="flex justify-end gap-1 mt-2 pt-1">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingAccount(acc); 
                          setAccountFormData(acc); 
                          setShowAccountForm(true); 
                        }} 
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit account"
                      >
                        <Edit2 size={14} className="text-gray-500" />
                      </button>
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          const hasTransactions = transactions.some((t) => t.accountId === acc.id); 
                          const hasTransfers = transfers.some((t) => 
                            t.fromAccountId === acc.id || t.toAccountId === acc.id
                          ); 
                          if (hasTransactions || hasTransfers) { 
                            alert("Cannot delete account with transactions or transfers. Please delete or move all transactions first."); 
                            return; 
                          } 
                          if (!customConfirm(`Delete ${acc.name}?`)) return; 
                          await dbService.deleteAccount(user.uid, acc.id); 
                          setAccounts(accounts.filter((a) => a.id !== acc.id)); 
                        }} 
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        aria-label="Delete account"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Empty state */}
          {accounts.length === 0 && (
            <div className="text-center py-8">
              <Wallet size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">No accounts yet</p>
              <button 
                onClick={() => { 
                  setAccountFormData({ name: "", balance: "", color: "#4ECDC4", type: "checking" }); 
                  setEditingAccount(null); 
                  setShowAccountForm(true); 
                }} 
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + Add Your First Account
              </button>
            </div>
          )}
        </div>

        {/* Transfer History - Improved for mobile */}
        {transfers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Transfer History</h3>
              <p className="text-xs text-gray-500 mt-0.5">Recent money transfers between accounts</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 sm:max-h-96 overflow-y-auto">
              {transfers.slice(0, 20).map((transfer) => {
                const fromAcc = accounts.find((a) => a.id === transfer.fromAccountId);
                const toAcc = accounts.find((a) => a.id === transfer.toAccountId);
                return (
                  <div key={transfer.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      {/* Left side - Transfer details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[100px]"
                            style={{ backgroundColor: fromAcc?.color + "20", color: fromAcc?.color }}
                          >
                            {fromAcc?.name || "Unknown"}
                          </span>
                          <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[100px]"
                            style={{ backgroundColor: toAcc?.color + "20", color: toAcc?.color }}
                          >
                            {toAcc?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 truncate">{transfer.note}</div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(transfer.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      </div>
                      
                      {/* Right side - Amount and delete */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm sm:text-base font-bold text-purple-600">
                            ${transfer.amount.toFixed(2)}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteTransfer(transfer)} 
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          aria-label="Reverse transfer"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    )}
  </div>
)}

            {currentScreen === "ai" && (
              <AIInsights transactions={transactions} categories={categories} accounts={accounts} stats={stats} />
            )}

            {currentScreen === "budget" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Budget Tracker</h2>
                <div className="space-y-4 sm:space-y-6">
                  {stats.categorySpending.map((cat) => {
                    const isOverBudget = cat.percentage > 100;
                    return (
                      <div key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className="cursor-pointer hover:bg-gray-50 p-3 sm:p-4 rounded-lg transition-colors">
                        <div className="flex justify-between items-center mb-1 sm:mb-2">
                          <div className="flex items-center gap-1.5 sm:gap-2"><span className="text-xl sm:text-2xl">{cat.icon}</span><span className="text-xs sm:text-base font-medium">{cat.name}</span>{isOverBudget && <AlertCircle size={14} className="sm:w-4 sm:h-4 text-red-600" />}</div>
                          <div className="text-right"><div className={`text-xs sm:text-base font-semibold ${isOverBudget ? "text-red-600" : "text-gray-800"}`}>${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)}</div><div className="text-[8px] sm:text-xs text-gray-500">{cat.percentage.toFixed(0)}% used</div></div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3"><div className="h-full rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: isOverBudget ? "#EF4444" : cat.color }} /></div>
                        {isOverBudget && <div className="text-[8px] sm:text-xs text-red-600 mt-1">Over by ${(cat.spent - cat.budget).toFixed(2)}</div>}
                        {!isOverBudget && <div className="text-[8px] sm:text-xs text-green-600 mt-1">${cat.remaining.toFixed(2)} remaining</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button onClick={() => setShowAddModal(true)} className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-40"><Plus size={24} className="sm:w-6 sm:h-6" /></button>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg safe-bottom">
        <div className="max-w-6xl mx-auto grid grid-cols-6 px-2 py-1.5 sm:px-4 sm:py-3">
          <button onClick={() => setCurrentScreen("home")} className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-lg transition-colors ${currentScreen === "home" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><Home size={18} className="sm:w-5 sm:h-5" /><span className="text-[9px] sm:text-xs">Home</span></button>
          <button onClick={() => setCurrentScreen("transactions")} className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-lg transition-colors ${currentScreen === "transactions" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><List size={18} className="sm:w-5 sm:h-5" /><span className="text-[9px] sm:text-xs">Trans</span></button>
          <button onClick={() => setCurrentScreen("categories")} className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-lg transition-colors ${currentScreen === "categories" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><Settings size={18} className="sm:w-5 sm:h-5" /><span className="text-[9px] sm:text-xs">Cats</span></button>
          <button onClick={() => setCurrentScreen("accounts")} className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-lg transition-colors ${currentScreen === "accounts" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><Wallet size={18} className="sm:w-5 sm:h-5" /><span className="text-[9px] sm:text-xs">Accts</span></button>
          <button onClick={() => setCurrentScreen("budget")} className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-lg transition-colors ${currentScreen === "budget" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><BarChart3 size={18} className="sm:w-5 sm:h-5" /><span className="text-[9px] sm:text-xs">Budget</span></button>
          <button onClick={() => setCurrentScreen("ai")} className={`flex flex-col items-center gap-0.5 sm:gap-1 p-1 sm:p-2 rounded-lg transition-colors ${currentScreen === "ai" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"}`}><span style={{ fontSize: 16 }} className="sm:text-xl">✦</span><span className="text-[9px] sm:text-xs">AI</span></button>
        </div>
      </div>

      {/* Modals remain the same but with responsive classes added */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">{editingTransaction ? "Edit" : "Add"} Transaction</h2>
              <button onClick={() => { setShowAddModal(false); setEditingTransaction(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex gap-1.5 sm:gap-2">
                <button onClick={() => setFormData({ ...formData, type: "expense" })} className={`flex-1 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${formData.type === "expense" ? "bg-red-600 text-white" : "bg-gray-100"}`}>Expense</button>
                <button onClick={() => setFormData({ ...formData, type: "income" })} className={`flex-1 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm ${formData.type === "income" ? "bg-green-600 text-white" : "bg-gray-100"}`}>Income</button>
              </div>
              <div><label className="text-xs sm:text-sm font-medium">Amount</label><input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="0.00" step="0.01" /></div>
              {formData.type === "expense" && (
                <>
                  <div><label className="text-xs sm:text-sm font-medium">Category</label><select value={(() => { const selectedCat = categories.find((c) => c.id === formData.category); if (selectedCat && selectedCat.parentId) return selectedCat.parentId; return formData.category || ""; })()} onChange={(e) => { setFormData({ ...formData, category: e.target.value }); }} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm"><option value="">Select a category</option>{categories.filter((c) => !c.parentId).map((cat) => (<option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>))}</select></div>
                  {formData.category && (() => { const selectedCat = categories.find((c) => c.id === formData.category); const mainCatId = selectedCat?.parentId || formData.category; const subcats = categories.filter((sc) => sc.parentId === mainCatId); return subcats.length > 0 ? (<div><label className="text-xs sm:text-sm font-medium">Subcategory (Optional)</label><select value={formData.category} onChange={(e) => { setFormData({ ...formData, category: e.target.value }); }} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm"><option value={mainCatId}>{categories.find((c) => c.id === mainCatId)?.name} (Main)</option>{subcats.map((subcat) => (<option key={subcat.id} value={subcat.id}>{subcat.icon} {subcat.name}</option>))}</select></div>) : null; })()}
                </>
              )}
              <div><label className="text-xs sm:text-sm font-medium">Account</label><select value={formData.accountId} onChange={(e) => setFormData({ ...formData, accountId: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm">{accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}</select></div>
              <div><label className="text-xs sm:text-sm font-medium">Date</label><input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Note</label><input type="text" value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="Optional note" /></div>
              <button onClick={handleAddTransaction} className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-700">{editingTransaction ? "Update" : "Add"} Transaction</button>
            </div>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg sm:text-xl font-bold">{editingCategory ? "Edit" : "Add"} Category</h2><button onClick={() => { setShowCategoryForm(false); setEditingCategory(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button></div>
            <div className="space-y-3 sm:space-y-4">
              <div><label className="text-xs sm:text-sm font-medium">Category Name</label><input type="text" value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="e.g., Transport" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Select Emoji</label><div className="grid grid-cols-6 gap-1 sm:gap-2 mt-1 sm:mt-2 p-2 sm:p-3 border rounded-lg bg-gray-50 max-h-32 sm:max-h-40 overflow-y-auto">{emojis.map((emoji) => (<button key={emoji} onClick={() => setCategoryFormData({ ...categoryFormData, icon: emoji })} className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-lg transition-all ${categoryFormData.icon === emoji ? "bg-blue-500 scale-125" : "hover:bg-gray-200"}`}>{emoji}</button>))}</div></div>
              <div><label className="text-xs sm:text-sm font-medium">Budget Amount</label><input type="number" value={categoryFormData.budget} onChange={(e) => setCategoryFormData({ ...categoryFormData, budget: parseFloat(e.target.value) || 0 })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="0.00" step="0.01" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Category Type</label><select value={categoryFormData.type} onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm"><option value="need">Need</option><option value="want">Want</option></select></div>
              <div><label className="text-xs sm:text-sm font-medium">Color</label><div className="flex gap-1.5 sm:gap-2 mt-1 sm:mt-2">{["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"].map((color) => (<button key={color} onClick={() => setCategoryFormData({ ...categoryFormData, color })} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg border-2 ${categoryFormData.color === color ? "border-gray-800" : "border-gray-300"}`} style={{ backgroundColor: color }} />))}</div></div>
              <button onClick={handleAddCategory} className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-700">{editingCategory ? "Update" : "Add"} Category</button>
            </div>
          </div>
        </div>
      )}

      {showSubcategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg sm:text-xl font-bold">{editingSubcategory ? "Edit" : "Add"} Subcategory</h2><button onClick={() => { setShowSubcategoryForm(false); setEditingSubcategory(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button></div>
            <div className="space-y-3 sm:space-y-4">
              <div><label className="text-xs sm:text-sm font-medium">Subcategory Name</label><input type="text" value={subcategoryFormData.name} onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, name: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="e.g., Bus" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Select Emoji</label><div className="grid grid-cols-6 gap-1 sm:gap-2 mt-1 sm:mt-2 p-2 sm:p-3 border rounded-lg bg-gray-50 max-h-32 sm:max-h-40 overflow-y-auto">{emojis.map((emoji) => (<button key={emoji} onClick={() => setSubcategoryFormData({ ...subcategoryFormData, icon: emoji })} className={`text-xl sm:text-2xl p-1.5 sm:p-2 rounded-lg transition-all ${subcategoryFormData.icon === emoji ? "bg-blue-500 scale-125" : "hover:bg-gray-200"}`}>{emoji}</button>))}</div></div>
              <div><label className="text-xs sm:text-sm font-medium">Budget Amount</label><input type="number" value={subcategoryFormData.budget} onChange={(e) => setSubcategoryFormData({ ...subcategoryFormData, budget: parseFloat(e.target.value) || 0 })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="0.00" step="0.01" /></div>
              <button onClick={handleAddSubcategory} className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-700">{editingSubcategory ? "Update" : "Add"} Subcategory</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg sm:text-xl font-bold">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button></div>
            <div className="space-y-3 sm:space-y-4">
              <div><label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">New Password</label><input type="password" id="newPassword" className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" placeholder="Enter new password (min 6 characters)" /></div>
              <div><label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">Confirm New Password</label><input type="password" id="confirmPassword" className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm" placeholder="Confirm new password" /></div>
              <button onClick={() => { const newPass = document.getElementById("newPassword").value; const confirmPass = document.getElementById("confirmPassword").value; if (!newPass || newPass.length < 6) { alert("Password must be at least 6 characters"); return; } if (newPass !== confirmPass) { alert("Passwords do not match"); return; } handlePasswordReset(newPass); }} className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-700">Update Password</button>
            </div>
          </div>
        </div>
      )}

      {showLayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4 sm:mb-6"><h2 className="text-xl sm:text-2xl font-bold">Choose Your Layout</h2><button onClick={() => setShowLayoutModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Layout options remain the same */}
              <button onClick={() => handleLayoutChange("layout1")} className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${homeLayout === "layout1" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}><div className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Classic View</div><div className="text-[10px] sm:text-sm text-gray-600 mb-2 sm:mb-3">Traditional card layout with overview stats and detailed budget progress bars</div><div className="bg-white rounded p-1.5 sm:p-2 border border-gray-100"><div className="grid grid-cols-3 gap-0.5 sm:gap-1 mb-1 sm:mb-2"><div className="h-5 sm:h-8 bg-green-200 rounded"></div><div className="h-5 sm:h-8 bg-red-200 rounded"></div><div className="h-5 sm:h-8 bg-blue-200 rounded"></div></div><div className="h-10 sm:h-16 bg-gray-100 rounded mb-0.5 sm:mb-1"></div><div className="h-10 sm:h-16 bg-gray-100 rounded"></div></div></button>
              <button onClick={() => handleLayoutChange("layout2")} className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${homeLayout === "layout2" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}><div className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Needs vs Wants</div><div className="text-[10px] sm:text-sm text-gray-600 mb-2 sm:mb-3">Split view showing essential expenses separate from discretionary spending</div><div className="bg-white rounded p-1.5 sm:p-2 border border-gray-100"><div className="h-5 sm:h-8 bg-gradient-to-r from-blue-300 to-purple-300 rounded mb-1 sm:mb-2"></div><div className="grid grid-cols-2 gap-1 sm:gap-2"><div className="space-y-0.5 sm:space-y-1"><div className="h-3 sm:h-4 bg-red-200 rounded"></div><div className="h-3 sm:h-4 bg-red-200 rounded"></div></div><div className="space-y-0.5 sm:space-y-1"><div className="h-3 sm:h-4 bg-blue-200 rounded"></div><div className="h-3 sm:h-4 bg-blue-200 rounded"></div></div></div></div></button>
              <button onClick={() => handleLayoutChange("layout3")} className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${homeLayout === "layout3" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}><div className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Compact Dashboard</div><div className="text-[10px] sm:text-sm text-gray-600 mb-2 sm:mb-3">Condensed view with top categories and recent activity side by side</div><div className="bg-white rounded p-1.5 sm:p-2 border border-gray-100"><div className="grid grid-cols-4 gap-0.5 sm:gap-1 mb-1 sm:mb-2"><div className="h-4 sm:h-6 bg-green-200 rounded"></div><div className="h-4 sm:h-6 bg-red-200 rounded"></div><div className="h-4 sm:h-6 bg-blue-200 rounded"></div><div className="h-4 sm:h-6 bg-purple-200 rounded"></div></div><div className="grid grid-cols-2 gap-1 sm:gap-2"><div className="h-8 sm:h-12 bg-gray-100 rounded"></div><div className="h-8 sm:h-12 bg-gray-100 rounded"></div></div></div></button>
              <button onClick={() => handleLayoutChange("layout4")} className={`p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${homeLayout === "layout4" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}><div className="font-bold text-sm sm:text-lg mb-1 sm:mb-2">Detailed Analytics</div><div className="text-[10px] sm:text-sm text-gray-600 mb-2 sm:mb-3">In-depth performance view with warnings for over-budget categories</div><div className="bg-white rounded p-1.5 sm:p-2 border border-gray-100"><div className="grid grid-cols-3 gap-0.5 sm:gap-1 mb-1 sm:mb-2"><div className="h-5 sm:h-8 bg-green-200 rounded"></div><div className="h-5 sm:h-8 bg-red-200 rounded"></div><div className="h-5 sm:h-8 bg-blue-200 rounded"></div></div><div className="space-y-0.5 sm:space-y-1"><div className="h-5 sm:h-8 bg-gray-100 rounded"></div><div className="h-5 sm:h-8 bg-gray-100 rounded"></div></div></div></button>
            </div>
          </div>
        </div>
      )}

      {showAccountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg sm:text-xl font-bold">{editingAccount ? "Edit" : "Add"} Account</h2><button onClick={() => { setShowAccountForm(false); setEditingAccount(null); }} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button></div>
            <div className="space-y-3 sm:space-y-4">
              <div><label className="text-xs sm:text-sm font-medium">Account Name</label><input type="text" value={accountFormData.name} onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="e.g., My Checking" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Balance</label><input type="number" value={accountFormData.balance} onChange={(e) => setAccountFormData({ ...accountFormData, balance: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="0.00" step="0.01" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Account Type</label><select value={accountFormData.type} onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm"><option value="checking">Checking</option><option value="savings">Savings</option><option value="cash">Cash</option><option value="credit">Credit Card</option></select></div>
              <div><label className="text-xs sm:text-sm font-medium">Color</label><div className="flex gap-1.5 sm:gap-2 mt-1 sm:mt-2">{["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"].map((color) => (<button key={color} onClick={() => setAccountFormData({ ...accountFormData, color })} className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg border-2 ${accountFormData.color === color ? "border-gray-800" : "border-gray-300"}`} style={{ backgroundColor: color }} />))}</div></div>
              <button onClick={handleAddAccount} className="w-full bg-blue-600 text-white py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-700">{editingAccount ? "Update" : "Add"} Account</button>
            </div>
          </div>
        </div>
      )}

      {showPdfUploadModal && (
        <XlsxUploadModal onClose={() => setShowPdfUploadModal(false)} categories={categories} accounts={accounts} onBulkAdd={handleBulkAddTransactions} />
      )}

      {showImportHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white"><h2 className="text-xl sm:text-2xl font-bold text-gray-900">How to Import Transactions</h2><button onClick={() => setShowImportHelp(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} className="sm:w-6 sm:h-6" /></button></div>
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="space-y-2 sm:space-y-3"><div className="flex items-start gap-2 sm:gap-3"><div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center"><span className="text-blue-600 font-bold text-xs sm:text-sm">1</span></div><div><h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">Import XLSX</h3><p className="text-[10px] sm:text-sm text-gray-600 mb-1 sm:mb-2">Upload an Excel file directly with your bank transactions. Perfect if you already have your data in spreadsheet format.</p><div className="bg-blue-50 border border-blue-200 rounded p-2 sm:p-3 text-[8px] sm:text-xs text-gray-700 space-y-0.5 sm:space-y-1"><p><strong>Required columns:</strong> Date, Type, Description, Amount</p><p><strong>Format:</strong> .xlsx files only</p><p><strong>Auto-categorization:</strong> Transactions are automatically categorized based on merchant names</p></div></div></div></div>
              <div className="border-t border-gray-200"></div>
              <div className="space-y-2 sm:space-y-3"><div className="flex items-start gap-2 sm:gap-3"><div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center"><span className="text-purple-600 font-bold text-xs sm:text-sm">2</span></div><div><h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-0.5 sm:mb-1">Convert Statement to XLSX</h3><p className="text-[10px] sm:text-sm text-gray-600 mb-1 sm:mb-2">Have a PDF bank statement? Use our converter tool to extract and convert it to an Excel file.</p><div className="bg-purple-50 border border-purple-200 rounded p-2 sm:p-3 text-[8px] sm:text-xs text-gray-700 space-y-0.5 sm:space-y-1"><p><strong>Supported formats:</strong> Bank statement PDFs</p><p><strong>Service:</strong> Powered by Statement Parser</p><p><strong>Next step:</strong> Download the generated XLSX and import it using the "Import XLSX" button</p></div></div></div></div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2"><h4 className="font-semibold text-gray-900 text-xs sm:text-sm">Typical Workflow:</h4><div className="text-[8px] sm:text-xs text-gray-700 space-y-0.5 sm:space-y-1"><p>1. Have a PDF bank statement? → Click "Convert Statement to XLSX"</p><p>2. Download the converted Excel file</p><p>3. Return here and click "Import XLSX"</p><p>4. Review and verify all transactions</p><p>5. Import to your account</p></div></div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2"><h4 className="font-semibold text-green-900 text-xs sm:text-sm">💡 Tips:</h4><ul className="text-[8px] sm:text-xs text-green-800 space-y-0.5 sm:space-y-1"><li>• Review all highlighted (red) transactions before importing</li><li>• You can edit, categorize, or delete any transaction</li><li>• Categories are auto-suggested based on merchant names</li><li>• All transactions marked as "ready" will be imported</li></ul></div>
              <button onClick={() => setShowImportHelp(false)} className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg font-medium text-xs sm:text-sm hover:bg-blue-700 transition-colors">Got it!</button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full mx-2 sm:mx-0">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg sm:text-xl font-bold">Transfer Money</h2><button onClick={() => setShowTransferModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={18} className="sm:w-5 sm:h-5" /></button></div>
            <div className="space-y-3 sm:space-y-4">
              <div><label className="text-xs sm:text-sm font-medium">From Account</label><select value={transferFormData.fromAccountId} onChange={(e) => setTransferFormData({ ...transferFormData, fromAccountId: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm"><option value="">Select account</option>{accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toFixed(2)})</option>))}</select></div>
              <div className="flex justify-center"><div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center"><ArrowRight size={16} className="sm:w-5 sm:h-5 text-white transform rotate-90" /></div></div>
              <div><label className="text-xs sm:text-sm font-medium">To Account</label><select value={transferFormData.toAccountId} onChange={(e) => setTransferFormData({ ...transferFormData, toAccountId: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm"><option value="">Select account</option>{accounts.map((acc) => (<option key={acc.id} value={acc.id}>{acc.name} (${acc.balance.toFixed(2)})</option>))}</select></div>
              <div><label className="text-xs sm:text-sm font-medium">Amount</label><input type="number" value={transferFormData.amount} onChange={(e) => setTransferFormData({ ...transferFormData, amount: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="0.00" step="0.01" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Date</label><input type="date" value={transferFormData.date} onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" /></div>
              <div><label className="text-xs sm:text-sm font-medium">Note (Optional)</label><input type="text" value={transferFormData.note} onChange={(e) => setTransferFormData({ ...transferFormData, note: e.target.value })} className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-lg mt-0.5 sm:mt-1 text-xs sm:text-sm" placeholder="e.g., Monthly savings" /></div>
              <button onClick={handleTransfer} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-1.5 sm:py-3 rounded-lg font-medium text-xs sm:text-sm hover:shadow-lg transition-all">Transfer ${transferFormData.amount || "0.00"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}