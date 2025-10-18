import React, { useState } from "react";
import {
  Wallet,
  ArrowRight,
  CheckCircle,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react";
import { completeUserSetup, addAccount, addCategory } from "./dbService";

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [accountData, setAccountData] = useState({
    name: "",
    balance: "",
    type: "checking",
    color: "#4ECDC4",
  });

  const defaultCategories = [
    {
      name: "Transport",
      icon: "🚗",
      budget: 200,
      type: "need",
      color: "#FF6B6B",
    },
    { name: "Food", icon: "🍔", budget: 400, type: "need", color: "#4ECDC4" },
    {
      name: "Housing",
      icon: "🏠",
      budget: 1000,
      type: "need",
      color: "#FFE66D",
    },
    {
      name: "Utilities",
      icon: "💡",
      budget: 150,
      type: "need",
      color: "#95E1D3",
    },
    {
      name: "Healthcare",
      icon: "⚕️",
      budget: 100,
      type: "need",
      color: "#F38181",
    },
    {
      name: "Insurance",
      icon: "🛡️",
      budget: 200,
      type: "need",
      color: "#AA96DA",
    },
    {
      name: "Education",
      icon: "📚",
      budget: 100,
      type: "want",
      color: "#FF6B6B",
    },
    {
      name: "Entertainment",
      icon: "🎬",
      budget: 150,
      type: "want",
      color: "#4ECDC4",
    },
    {
      name: "Shopping",
      icon: "🛍️",
      budget: 200,
      type: "want",
      color: "#FFE66D",
    },
    { name: "Travel", icon: "✈️", budget: 300, type: "want", color: "#95E1D3" },
    {
      name: "Gifts & Donations",
      icon: "🎁",
      budget: 100,
      type: "want",
      color: "#F38181",
    },
    {
      name: "Personal Care",
      icon: "💅",
      budget: 100,
      type: "want",
      color: "#AA96DA",
    },
    {
      name: "Hobbies",
      icon: "🎨",
      budget: 150,
      type: "want",
      color: "#FF6B6B",
    },
  ];

  const [categories, setCategories] = useState(defaultCategories);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    icon: "",
    budget: 0,
    type: "need",
    color: "#95E1D3",
  });

  const [loading, setLoading] = useState(false);

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
    "⚕️",
    "🛡️",
    "💡",
    "💅",
    "🎯",
    "🎭",
    "🎵",
    "📷",
    "🏥",
    "🚌",
  ];

  const handleComplete = async () => {
    if (step === 2 && (!accountData.name || !accountData.balance)) {
      alert("Please fill in all account details");
      return;
    }

    if (step === 3) {
      setLoading(true);
      try {
        // Create the first account
        await addAccount(user.uid, {
          name: accountData.name,
          balance: parseFloat(accountData.balance),
          type: accountData.type,
          color: accountData.color,
        });

        // Create all categories
        for (const category of categories) {
          await addCategory(user.uid, {
            ...category,
            parentId: null,
          });
        }

        // Mark setup as complete
        await completeUserSetup(user.uid, user.email);

        onComplete();
      } catch (error) {
        console.error("Error completing setup:", error);
        alert("Error setting up account. Please try again.");
        setLoading(false);
      }
    }
  };

  const handleUpdateCategory = (index, field, value) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const handleDeleteCategory = (index) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleAddNewCategory = () => {
    if (!newCategory.name || !newCategory.icon || !newCategory.budget) {
      alert("Please fill in all category details");
      return;
    }
    setCategories([...categories, newCategory]);
    setNewCategory({
      name: "",
      icon: "",
      budget: 0,
      type: "need",
      color: "#95E1D3",
    });
    setShowAddCategory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Step 1: Welcome Section */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-6">
              <Wallet size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Finance Tracker!
            </h1>
            <p className="text-gray-600 mb-2">
              Hi{" "}
              <span className="font-semibold text-blue-600">{user.email}</span>
            </p>
            <p className="text-gray-600 mb-8">
              Let's set up your account in just 3 simple steps.
            </p>

            <div className="space-y-4 text-left bg-blue-50 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle
                  size={20}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    Track Your Spending
                  </div>
                  <div className="text-sm text-gray-600">
                    Monitor income and expenses
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle
                  size={20}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    Manage Budgets
                  </div>
                  <div className="text-sm text-gray-600">
                    Set limits for categories
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle
                  size={20}
                  className="text-blue-600 mt-0.5 flex-shrink-0"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    Multiple Accounts
                  </div>
                  <div className="text-sm text-gray-600">
                    Track checking, savings, and more
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Step 2: Account Setup */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="w-20 h-1 bg-blue-600"></div>
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Add Your First Account
              </h2>
              <p className="text-gray-600 text-center">
                This will be your primary account for tracking transactions.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountData.name}
                  onChange={(e) =>
                    setAccountData({ ...accountData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., My Checking Account"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Balance
                </label>
                <input
                  type="number"
                  value={accountData.balance}
                  onChange={(e) =>
                    setAccountData({ ...accountData, balance: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={accountData.type}
                  onChange={(e) =>
                    setAccountData({ ...accountData, type: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="cash">Cash</option>
                  <option value="credit">Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose a Color
                </label>
                <div className="flex gap-3">
                  {[
                    "#4ECDC4",
                    "#FF6B6B",
                    "#FFE66D",
                    "#95E1D3",
                    "#F38181",
                    "#AA96DA",
                  ].map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccountData({ ...accountData, color })}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        accountData.color === color
                          ? "border-gray-800 scale-110"
                          : "border-gray-300"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!accountData.name || !accountData.balance}
                  className={`flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ${
                    !accountData.name || !accountData.balance
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:scale-105"
                  }`}
                >
                  Next
                  <ArrowRight size={20} className="inline ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Categories Setup */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <div className="w-20 h-1 bg-blue-600"></div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                Customize Your Budget Categories
              </h2>
              <p className="text-gray-600 text-center mb-2">
                We've suggested some common categories. Feel free to edit,
                remove, or add your own!
              </p>
              <p className="text-sm text-gray-500 text-center">
                You can always modify these later in settings.
              </p>
            </div>

            <div className="mb-4">
              <button
                onClick={() => setShowAddCategory(true)}
                className="w-full py-2 px-4 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Plus size={20} />
                Add Custom Category
              </button>
            </div>

            <div className="space-y-3 mb-6">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  {editingCategory === index ? (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) =>
                            handleUpdateCategory(index, "name", e.target.value)
                          }
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                          placeholder="Category name"
                        />
                        <input
                          type="number"
                          value={category.budget}
                          onChange={(e) =>
                            handleUpdateCategory(
                              index,
                              "budget",
                              parseFloat(e.target.value)
                            )
                          }
                          className="w-24 px-3 py-2 border rounded-lg text-sm"
                          placeholder="Budget"
                          step="0.01"
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <select
                          value={category.type}
                          onChange={(e) =>
                            handleUpdateCategory(index, "type", e.target.value)
                          }
                          className="px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="need">Need</option>
                          <option value="want">Want</option>
                        </select>
                        <div className="flex gap-1">
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
                                handleUpdateCategory(index, "color", color)
                              }
                              className={`w-6 h-6 rounded border-2 ${
                                category.color === color
                                  ? "border-gray-800"
                                  : "border-gray-300"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="ml-auto px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {category.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${category.budget}/month • {category.type}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCategory(index)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(index)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading || categories.length === 0}
                className={`flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ${
                  loading || categories.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:scale-105"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Setting up...
                  </span>
                ) : (
                  "Complete Setup"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showAddCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Add Custom Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Pets"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Emoji
                  </label>
                  <div className="grid grid-cols-8 gap-2 p-3 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() =>
                          setNewCategory({ ...newCategory, icon: emoji })
                        }
                        className={`text-2xl p-2 rounded-lg transition-all ${
                          newCategory.icon === emoji
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
                  <label className="block text-sm font-medium mb-1">
                    Monthly Budget
                  </label>
                  <input
                    type="number"
                    value={newCategory.budget}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        budget: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newCategory.type}
                    onChange={(e) =>
                      setNewCategory({ ...newCategory, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="need">Need</option>
                    <option value="want">Want</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
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
                          setNewCategory({ ...newCategory, color })
                        }
                        className={`w-8 h-8 rounded-lg border-2 ${
                          newCategory.color === color
                            ? "border-gray-800"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowAddCategory(false);
                      setNewCategory({
                        name: "",
                        icon: "",
                        budget: 0,
                        type: "need",
                        color: "#95E1D3",
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewCategory}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
