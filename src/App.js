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
} from "lucide-react";
import * as dbService from "./dbService";

export default function FinanceTrackerApp({ user, onLogout }) {
  const [currentScreen, setCurrentScreen] = useState("home");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const emojis = [
    "🍔",
    "🚗",
    "🛍️",
    "📄",
    "🎬",
    "🥗",
    "🛒",
    "💼",
    "✈️",
    "📚",
    "🎮",
    "💇",
    "🏋️",
    "🍕",
    "⛽",
    "🏠",
    "📱",
    "🎁",
    "💳",
    "🎓",
    "📺",
    "🌳",
    "🚴",
    "⚡",
    "🎪",
    "🍷",
    "🎸",
    "🎨",
    "🔧",
    "🌸",
  ];

  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

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

  // Load data from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const [categoriesData, transactionsData, accountsData] =
          await Promise.all([
            dbService.getCategories(user.uid),
            dbService.getTransactions(user.uid),
            dbService.getAccounts(user.uid),
          ]);

        setCategories(categoriesData);
        setTransactions(transactionsData);
        setAccounts(accountsData);

        // Set default account if available
        if (accountsData.length > 0) {
          setFormData((prev) => ({
            ...prev,
            accountId: accountsData[0].id,
          }));
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [user]);

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalAccountBalance = accounts.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    const categorySpending = categories
      .filter((c) => !c.parentId)
      .map((cat) => {
        const directSpent = transactions
          .filter((t) => t.type === "expense" && t.category === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const subcats = categories.filter((sc) => sc.parentId === cat.id);
        const subSpent = transactions
          .filter(
            (t) =>
              t.type === "expense" && subcats.find((sc) => sc.id === t.category)
          )
          .reduce((sum, t) => sum + t.amount, 0);
        const totalSpent = directSpent + subSpent;

        return {
          ...cat,
          spent: totalSpent,
          remaining: Math.max(0, cat.budget - totalSpent),
          percentage: cat.budget > 0 ? (totalSpent / cat.budget) * 100 : 0,
        };
      });

    return {
      totalIncome,
      totalExpenses,
      totalAccountBalance,
      categorySpending,
    };
  }, [transactions, categories, accounts]);

  const handleAddTransaction = async () => {
    if (
      !formData.amount ||
      formData.amount <= 0 ||
      (formData.type === "expense" && !formData.category)
    )
      return;

    const transactionData = {
      ...formData,
      amount: parseFloat(formData.amount),
    };

    try {
      if (editingTransaction) {
        await dbService.updateTransaction(
          user.uid,
          editingTransaction.id,
          transactionData
        );
        setTransactions(
          transactions.map((t) =>
            t.id === editingTransaction.id
              ? { ...transactionData, id: t.id }
              : t
          )
        );
        setEditingTransaction(null);
      } else {
        const newTransaction = await dbService.addTransaction(
          user.uid,
          transactionData
        );
        setTransactions([newTransaction, ...transactions]);
      }

      setFormData({
        type: "expense",
        amount: "",
        category: "",
        date: new Date().toISOString().split("T")[0],
        note: "",
        accountId: accounts[0]?.id || "",
      });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("Error saving transaction. Please try again.");
    }
  };

  const handleAddCategory = async () => {
    if (
      !categoryFormData.name ||
      !categoryFormData.budget ||
      !categoryFormData.icon
    )
      return;

    try {
      if (editingCategory) {
        await dbService.updateCategory(
          user.uid,
          editingCategory.id,
          categoryFormData
        );
        setCategories(
          categories.map((c) =>
            c.id === editingCategory.id
              ? { ...editingCategory, ...categoryFormData }
              : c
          )
        );
        setEditingCategory(null);
      } else {
        const newCategory = await dbService.addCategory(user.uid, {
          ...categoryFormData,
          parentId: null,
        });
        setCategories([...categories, newCategory]);
      }

      setCategoryFormData({
        name: "",
        icon: "",
        color: "#95E1D3",
        type: "need",
        budget: 0,
      });
      setShowCategoryForm(false);
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Error saving category. Please try again.");
    }
  };

  const handleAddSubcategory = async () => {
    if (
      !subcategoryFormData.name ||
      !subcategoryFormData.budget ||
      !subcategoryFormData.icon
    )
      return;

    try {
      if (editingSubcategory) {
        await dbService.updateCategory(
          user.uid,
          editingSubcategory.id,
          subcategoryFormData
        );
        setCategories(
          categories.map((c) =>
            c.id === editingSubcategory.id
              ? { ...editingSubcategory, ...subcategoryFormData }
              : c
          )
        );
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

    const accountData = {
      ...accountFormData,
      balance: parseFloat(accountFormData.balance),
    };

    try {
      if (editingAccount) {
        await dbService.updateAccount(user.uid, editingAccount.id, accountData);
        setAccounts(
          accounts.map((a) =>
            a.id === editingAccount.id
              ? { ...editingAccount, ...accountData }
              : a
          )
        );
        setEditingAccount(null);
      } else {
        const newAccount = await dbService.addAccount(user.uid, accountData);
        setAccounts([...accounts, newAccount]);
      }

      setAccountFormData({
        name: "",
        balance: "",
        color: "#4ECDC4",
        type: "checking",
      });
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Finance Tracker</h1>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg px-4 py-2 transition-all"
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              <span className="text-sm font-medium">
                {user?.email || "User"}
              </span>
            </button>

            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-500">Signed in</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPasswordModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Lock size={16} />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <X size={16} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 pb-24">
        {selectedCategoryId ? (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
            >
              <ChevronLeft size={20} />
              Back
            </button>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">
                  {categories.find((c) => c.id === selectedCategoryId)?.icon}
                </span>
                <div>
                  <h2 className="text-2xl font-bold">
                    {categories.find((c) => c.id === selectedCategoryId)?.name}
                  </h2>
                  <p className="text-sm text-gray-500 capitalize">
                    {categories.find((c) => c.id === selectedCategoryId)?.type}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Budget</div>
                  <div className="text-2xl font-bold text-blue-600">
                    $
                    {categories
                      .find((c) => c.id === selectedCategoryId)
                      ?.budget.toFixed(2)}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Spent</div>
                  <div className="text-2xl font-bold text-red-600">
                    $
                    {transactions
                      .filter(
                        (t) =>
                          t.category === selectedCategoryId ||
                          categories
                            .filter((sc) => sc.parentId === selectedCategoryId)
                            .find((sc) => sc.id === t.category)
                      )
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toFixed(2)}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Remaining</div>
                  <div className="text-2xl font-bold text-green-600">
                    $
                    {Math.max(
                      0,
                      categories.find((c) => c.id === selectedCategoryId)
                        ?.budget -
                        transactions
                          .filter(
                            (t) =>
                              t.category === selectedCategoryId ||
                              categories
                                .filter(
                                  (sc) => sc.parentId === selectedCategoryId
                                )
                                .find((sc) => sc.id === t.category)
                          )
                          .reduce((sum, t) => sum + t.amount, 0)
                    ).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold">All Transactions</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {transactions
                  .filter(
                    (t) =>
                      t.category === selectedCategoryId ||
                      categories
                        .filter((sc) => sc.parentId === selectedCategoryId)
                        .find((sc) => sc.id === t.category)
                  )
                  .map((trans) => {
                    const transcat = categories.find(
                      (c) => c.id === trans.category
                    );
                    const acc = accounts.find((a) => a.id === trans.accountId);
                    return (
                      <div
                        key={trans.id}
                        className="p-4 hover:bg-gray-50 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              {transcat?.name} - {trans.note || "Transaction"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {trans.date} • {acc?.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold text-red-600">
                            -${trans.amount.toFixed(2)}
                          </div>
                          <button
                            onClick={() => {
                              setEditingTransaction(trans);
                              setFormData(trans);
                              setShowAddModal(true);
                            }}
                            className="p-2 hover:bg-gray-200 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              await dbService.deleteTransaction(
                                user.uid,
                                trans.id
                              );
                              setTransactions(
                                transactions.filter((t) => t.id !== trans.id)
                              );
                            }}
                            className="p-2 hover:bg-red-100 rounded"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-md">
                    <div className="text-sm font-medium text-green-100">
                      Total Income
                    </div>
                    <div className="text-3xl font-bold">
                      ${stats.totalIncome.toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-md">
                    <div className="text-sm font-medium text-red-100">
                      Total Expenses
                    </div>
                    <div className="text-3xl font-bold">
                      ${stats.totalExpenses.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`bg-gradient-to-br ${
                      stats.totalIncome - stats.totalExpenses >= 0
                        ? "from-blue-500 to-blue-600"
                        : "from-orange-500 to-orange-600"
                    } rounded-xl p-6 text-white shadow-md`}
                  >
                    <div className="text-sm font-medium text-blue-100">
                      Remaining
                    </div>
                    <div className="text-3xl font-bold">
                      ${(stats.totalIncome - stats.totalExpenses).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Budget Overview
                  </h3>
                  <div className="space-y-4">
                    {stats.categorySpending.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {cat.icon} {cat.name}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">
                            ${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(cat.percentage, 100)}%`,
                              backgroundColor:
                                cat.percentage > 100 ? "#EF4444" : cat.color,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {cat.percentage.toFixed(0)}% used
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Recent Transactions
                  </h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((trans) => {
                      const cat = categories.find(
                        (c) => c.id === trans.category
                      );
                      const parentCat =
                        cat && categories.find((c) => c.id === cat.parentId);
                      return (
                        <div
                          key={trans.id}
                          className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3">
                              <span className="text-lg">
                                {cat ? cat.icon : "💰"}
                              </span>
                              <div>
                                <div className="text-sm font-medium">
                                  {trans.note || "Transaction"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {cat ? cat.name : "Income"}{" "}
                                  {parentCat ? `(${parentCat.name})` : ""}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {trans.date}
                                </div>
                              </div>
                            </div>
                            <div
                              className={`text-sm font-semibold ${
                                trans.type === "income"
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {trans.type === "income" ? "+" : "-"}$
                              {trans.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {currentScreen === "transactions" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold">All Transactions</h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {transactions.map((trans) => {
                    const cat = categories.find((c) => c.id === trans.category);
                    return (
                      <div
                        key={trans.id}
                        className="p-4 hover:bg-gray-50 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {cat ? cat.icon : "💰"}
                          </span>
                          <div>
                            <div className="text-sm font-medium">
                              {cat ? cat.name : "Income"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {trans.date}
                            </div>
                            {trans.note && (
                              <div className="text-xs text-gray-400">
                                {trans.note}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className={`text-sm font-semibold ${
                              trans.type === "income"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {trans.type === "income" ? "+" : "-"}$
                            {trans.amount.toFixed(2)}
                          </div>
                          <button
                            onClick={() => {
                              setEditingTransaction(trans);
                              setFormData(trans);
                              setShowAddModal(true);
                            }}
                            className="p-2 hover:bg-gray-200 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              await dbService.deleteTransaction(
                                user.uid,
                                trans.id
                              );
                              setTransactions(
                                transactions.filter((t) => t.id !== trans.id)
                              );
                            }}
                            className="p-2 hover:bg-red-100 rounded"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentScreen === "categories" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Categories</h2>
                  <button
                    onClick={() => {
                      setCategoryFormData({
                        name: "",
                        icon: "",
                        color: "#95E1D3",
                        type: "need",
                        budget: 0,
                      });
                      setEditingCategory(null);
                      setShowCategoryForm(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    + Add Category
                  </button>
                </div>
                <div className="space-y-3">
                  {categories
                    .filter((c) => !c.parentId)
                    .map((cat) => (
                      <div key={cat.id}>
                        <div className="flex justify-between items-center p-4 border border-gray-100 rounded-lg hover:border-gray-200">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{cat.icon}</span>
                            <div>
                              <div className="font-medium">{cat.name}</div>
                              <div className="text-xs text-gray-500">
                                Budget: ${cat.budget} • {cat.type}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                setShowSubcategoryForm(true);
                                setEditingSubcategory(null);
                                setSubcategoryFormData({
                                  name: "",
                                  icon: "",
                                  budget: 0,
                                });
                              }}
                              className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100"
                            >
                              + Subcategory
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setCategoryFormData(cat);
                                setShowCategoryForm(true);
                              }}
                              className="p-2 hover:bg-gray-100 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={async () => {
                                await dbService.deleteCategory(
                                  user.uid,
                                  cat.id
                                );
                                const subcatIds = categories
                                  .filter((c) => c.parentId === cat.id)
                                  .map((c) => c.id);
                                for (const id of subcatIds) {
                                  await dbService.deleteCategory(user.uid, id);
                                }
                                setCategories(
                                  categories.filter(
                                    (c) =>
                                      c.id !== cat.id && c.parentId !== cat.id
                                  )
                                );
                              }}
                              className="p-2 hover:bg-red-100 rounded"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </button>
                          </div>
                        </div>
                        {categories.filter((sc) => sc.parentId === cat.id)
                          .length > 0 && (
                          <div className="ml-8 mt-2 space-y-2 mb-3">
                            {categories
                              .filter((sc) => sc.parentId === cat.id)
                              .map((subcat) => (
                                <div
                                  key={subcat.id}
                                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">
                                      {subcat.icon}
                                    </span>
                                    <div>
                                      <div className="text-sm font-medium">
                                        {subcat.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Budget: ${subcat.budget}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingSubcategory(subcat);
                                        setSubcategoryFormData(subcat);
                                        setSelectedCategoryId(cat.id);
                                        setShowSubcategoryForm(true);
                                      }}
                                      className="p-2 hover:bg-gray-200 rounded"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await dbService.deleteCategory(
                                          user.uid,
                                          subcat.id
                                        );
                                        setCategories(
                                          categories.filter(
                                            (c) => c.id !== subcat.id
                                          )
                                        );
                                      }}
                                      className="p-2 hover:bg-red-100 rounded"
                                    >
                                      <Trash2
                                        size={16}
                                        className="text-red-600"
                                      />
                                    </button>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Bank Accounts</h2>
                  <button
                    onClick={() => {
                      setAccountFormData({
                        name: "",
                        balance: "",
                        color: "#4ECDC4",
                        type: "checking",
                      });
                      setEditingAccount(null);
                      setShowAccountForm(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    + Add
                  </button>
                </div>
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex justify-between items-center p-4 border border-gray-100 rounded-lg"
                      style={{ backgroundColor: acc.color + "10" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: acc.color }}
                        >
                          <Wallet size={20} className="text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{acc.name}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {acc.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className="text-lg font-bold"
                          style={{ color: acc.color }}
                        >
                          ${acc.balance.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setAccountFormData(acc);
                              setShowAccountForm(true);
                            }}
                            className="p-2 hover:bg-gray-200 rounded"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={async () => {
                              await dbService.deleteAccount(user.uid, acc.id);
                              setAccounts(
                                accounts.filter((a) => a.id !== acc.id)
                              );
                            }}
                            className="p-2 hover:bg-red-100 rounded"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Balance</span>
                    <span className="text-2xl font-bold">
                      ${stats.totalAccountBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentScreen === "budget" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-6">Budget Tracker</h2>
                <div className="space-y-6">
                  {stats.categorySpending.map((cat) => {
                    const isOverBudget = cat.percentage > 100;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="cursor-pointer hover:bg-gray-50 p-4 rounded-lg transition-colors"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="font-medium">{cat.name}</span>
                            {isOverBudget && (
                              <AlertCircle size={16} className="text-red-600" />
                            )}
                          </div>
                          <div className="text-right">
                            <div
                              className={`font-semibold ${
                                isOverBudget ? "text-red-600" : "text-gray-800"
                              }`}
                            >
                              ${cat.spent.toFixed(2)} / ${cat.budget.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {cat.percentage.toFixed(0)}% used
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(cat.percentage, 100)}%`,
                              backgroundColor: isOverBudget
                                ? "#EF4444"
                                : cat.color,
                            }}
                          />
                        </div>
                        {isOverBudget && (
                          <div className="text-xs text-red-600 mt-1">
                            Over by ${(cat.spent - cat.budget).toFixed(2)}
                          </div>
                        )}
                        {!isOverBudget && (
                          <div className="text-xs text-green-600 mt-1">
                            ${cat.remaining.toFixed(2)} remaining
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <Plus size={28} />
      </button>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto grid grid-cols-5 px-4 py-3">
          <button
            onClick={() => setCurrentScreen("home")}
            className={`flex flex-col items-center gap-1 ${
              currentScreen === "home" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <Home size={20} />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setCurrentScreen("transactions")}
            className={`flex flex-col items-center gap-1 ${
              currentScreen === "transactions"
                ? "text-blue-600"
                : "text-gray-400"
            }`}
          >
            <List size={20} />
            <span className="text-xs">Transactions</span>
          </button>
          <button
            onClick={() => setCurrentScreen("categories")}
            className={`flex flex-col items-center gap-1 ${
              currentScreen === "categories" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <Settings size={20} />
            <span className="text-xs">Categories</span>
          </button>
          <button
            onClick={() => setCurrentScreen("accounts")}
            className={`flex flex-col items-center gap-1 ${
              currentScreen === "accounts" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <Wallet size={20} />
            <span className="text-xs">Accounts</span>
          </button>
          <button
            onClick={() => setCurrentScreen("budget")}
            className={`flex flex-col items-center gap-1 ${
              currentScreen === "budget" ? "text-blue-600" : "text-gray-400"
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-xs">Budget</span>
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingTransaction ? "Edit" : "Add"} Transaction
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTransaction(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                    formData.type === "expense"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setFormData({ ...formData, type: "income" })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                    formData.type === "income"
                      ? "bg-green-600 text-white"
                      : "bg-gray-100"
                  }`}
                >
                  Income
                </button>
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              {formData.type === "expense" && (
                <>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={(() => {
                        const selectedCat = categories.find(
                          (c) => c.id === formData.category
                        );
                        if (selectedCat && selectedCat.parentId) {
                          return selectedCat.parentId;
                        }
                        return formData.category || "";
                      })()}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          category: e.target.value,
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                    >
                      <option value="">Select a category</option>
                      {categories
                        .filter((c) => !c.parentId)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon} {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  {formData.category &&
                    (() => {
                      const selectedCat = categories.find(
                        (c) => c.id === formData.category
                      );
                      const mainCatId =
                        selectedCat?.parentId || formData.category;
                      const subcats = categories.filter(
                        (sc) => sc.parentId === mainCatId
                      );

                      return subcats.length > 0 ? (
                        <div>
                          <label className="text-sm font-medium">
                            Subcategory (Optional)
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                category: e.target.value,
                              });
                            }}
                            className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                          >
                            <option value={mainCatId}>
                              {categories.find((c) => c.id === mainCatId)?.name}{" "}
                              (Main)
                            </option>
                            {subcats.map((subcat) => (
                              <option key={subcat.id} value={subcat.id}>
                                {subcat.icon} {subcat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null;
                    })()}
                </>
              )}
              <div>
                <label className="text-sm font-medium">Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      accountId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Note</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="Optional note"
                />
              </div>
              <button
                onClick={handleAddTransaction}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                {editingTransaction ? "Update" : "Add"} Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCategory ? "Edit" : "Add"} Category
              </h2>
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategory(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="e.g., Transport"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Select Emoji</label>
                <div className="grid grid-cols-6 gap-2 mt-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() =>
                        setCategoryFormData({
                          ...categoryFormData,
                          icon: emoji,
                        })
                      }
                      className={`text-2xl p-2 rounded-lg transition-all ${
                        categoryFormData.icon === emoji
                          ? "bg-blue-500 scale-125"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Budget Amount</label>
                <input
                  type="number"
                  value={categoryFormData.budget}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      budget: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Category Type</label>
                <select
                  value={categoryFormData.type}
                  onChange={(e) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                >
                  <option value="need">Need</option>
                  <option value="want">Want</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-2">
                  {[
                    "#FF6B6B",
                    "#4ECDC4",
                    "#FFE66D",
                    "#95E1D3",
                    "#F38181",
                    "#AA96DA",
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setCategoryFormData({ ...categoryFormData, color })
                      }
                      className={`w-8 h-8 rounded-lg border-2 ${
                        categoryFormData.color === color
                          ? "border-gray-800"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddCategory}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                {editingCategory ? "Update" : "Add"} Category
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubcategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSubcategory ? "Edit" : "Add"} Subcategory
              </h2>
              <button
                onClick={() => {
                  setShowSubcategoryForm(false);
                  setEditingSubcategory(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subcategory Name</label>
                <input
                  type="text"
                  value={subcategoryFormData.name}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="e.g., Bus"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Select Emoji</label>
                <div className="grid grid-cols-6 gap-2 mt-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() =>
                        setSubcategoryFormData({
                          ...subcategoryFormData,
                          icon: emoji,
                        })
                      }
                      className={`text-2xl p-2 rounded-lg transition-all ${
                        subcategoryFormData.icon === emoji
                          ? "bg-blue-500 scale-125"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Budget Amount</label>
                <input
                  type="number"
                  value={subcategoryFormData.budget}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      budget: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <button
                onClick={handleAddSubcategory}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                {editingSubcategory ? "Update" : "Add"} Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Change Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                onClick={() => {
                  const newPass = document.getElementById("newPassword").value;
                  const confirmPass =
                    document.getElementById("confirmPassword").value;

                  if (!newPass || newPass.length < 6) {
                    alert("Password must be at least 6 characters");
                    return;
                  }
                  if (newPass !== confirmPass) {
                    alert("Passwords do not match");
                    return;
                  }
                  handlePasswordReset(newPass);
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {showAccountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingAccount ? "Edit" : "Add"} Account
              </h2>
              <button
                onClick={() => {
                  setShowAccountForm(false);
                  setEditingAccount(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Account Name</label>
                <input
                  type="text"
                  value={accountFormData.name}
                  onChange={(e) =>
                    setAccountFormData({
                      ...accountFormData,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="e.g., My Checking"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Balance</label>
                <input
                  type="number"
                  value={accountFormData.balance}
                  onChange={(e) =>
                    setAccountFormData({
                      ...accountFormData,
                      balance: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account Type</label>
                <select
                  value={accountFormData.type}
                  onChange={(e) =>
                    setAccountFormData({
                      ...accountFormData,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg mt-1 text-sm"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="cash">Cash</option>
                  <option value="credit">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2 mt-2">
                  {[
                    "#FF6B6B",
                    "#4ECDC4",
                    "#FFE66D",
                    "#95E1D3",
                    "#F38181",
                    "#AA96DA",
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setAccountFormData({ ...accountFormData, color })
                      }
                      className={`w-8 h-8 rounded-lg border-2 ${
                        accountFormData.color === color
                          ? "border-gray-800"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleAddAccount}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                {editingAccount ? "Update" : "Add"} Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
