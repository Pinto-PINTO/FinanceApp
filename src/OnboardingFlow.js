import React, { useState } from "react";
import { Wallet, ArrowRight, CheckCircle } from "lucide-react";
import { completeUserSetup, addAccount } from "./dbService";

export default function OnboardingFlow({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [accountData, setAccountData] = useState({
    name: "",
    balance: "",
    type: "checking",
    color: "#4ECDC4",
  });
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!accountData.name || !accountData.balance) {
      alert("Please fill in all account details");
      return;
    }

    setLoading(true);
    try {
      // Create the first account
      await addAccount(user.uid, {
        name: accountData.name,
        balance: parseFloat(accountData.balance),
        type: accountData.type,
        color: accountData.color,
      });

      // Mark setup as complete
      await completeUserSetup(user.uid, user.email);

      onComplete();
    } catch (error) {
      console.error("Error completing setup:", error);
      alert("Error setting up account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Welcome Section */}
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
              Let's set up your first bank account to get started tracking your
              finances.
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

        {/* Account Setup */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Add Your First Account
            </h2>
            <p className="text-gray-600 mb-6">
              This will be your primary account for tracking transactions.
            </p>

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
                  onClick={handleComplete}
                  disabled={loading}
                  className={`flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ${
                    loading
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
          </div>
        )}
      </div>
    </div>
  );
}
