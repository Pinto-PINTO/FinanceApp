import React, { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────
// Google Gemini API - Free tier
// ─────────────────────────────────────────────
async function askGemini(system, user) {
  const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
  
  if (!API_KEY) {
    console.error("Missing Gemini API key");
    return getMockResponse(system, user);
  }

  const MODEL_NAME = "gemini-2.5-flash";
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${system}\n\n${user}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error("No response from Gemini");
    }
    
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return getMockResponse(system, user);
  }
}

// Mock responses as fallback
function getMockResponse(system, user) {
  const incomeMatch = user.match(/Income: \$([\d,]+)/);
  const expenseMatch = user.match(/Expenses: \$([\d,]+)/);
  const savingsMatch = user.match(/Savings Rate: ([\d.]+)%/);
  
  const income = incomeMatch ? parseFloat(incomeMatch[1].replace(/,/g, '')) : 0;
  const expenses = expenseMatch ? parseFloat(expenseMatch[1].replace(/,/g, '')) : 0;
  const savingsRate = savingsMatch ? parseFloat(savingsMatch[1]) : 0;
  const net = income - expenses;
  
  const overBudgetMatch = user.match(/OVER-BUDGET CATEGORIES\n([\s\S]*?)\n\n/);
  const hasOverBudget = overBudgetMatch && overBudgetMatch[1].includes("over by");
  
  const transMatch = user.match(/Transactions: (\d+)/);
  const transactionCount = transMatch ? parseInt(transMatch[1]) : 0;
  
  if (system.includes("Financial Health Score")) {
    let score, rating, summary;
    if (savingsRate >= 20) {
      score = 85 + Math.floor(Math.random() * 10);
      rating = "Excellent";
      summary = `You're saving ${savingsRate}% of your income, which puts you well ahead of financial recommendations.`;
    } else if (savingsRate >= 10) {
      score = 65 + Math.floor(Math.random() * 15);
      rating = "Good";
      summary = `You're saving ${savingsRate}% of your income, which is decent but has room for improvement.`;
    } else if (savingsRate > 0) {
      score = 45 + Math.floor(Math.random() * 15);
      rating = "Fair";
      summary = `You're saving ${savingsRate}% of your income, which is below the recommended 20%.`;
    } else {
      score = 25 + Math.floor(Math.random() * 20);
      rating = "Critical";
      summary = `You're spending ${Math.abs(net).toFixed(0)} more than you earn. This requires immediate attention.`;
    }
    
    return `SCORE: ${score}/100
RATING: ${rating}
SUMMARY: ${summary}
STRENGTHS:
- ${net >= 0 ? `Positive cash flow of $${net.toFixed(0)}` : "You're tracking your finances"}
- ${transactionCount > 0 ? `${transactionCount} transactions analyzed` : "Budget tracking active"}
WEAKNESSES:
- ${savingsRate < 20 ? `Savings rate of ${savingsRate}% below 20% target` : "Room for investment growth"}
- ${hasOverBudget ? "Multiple categories exceeding budget" : "Consider optimizing variable expenses"}
BEST ACTION: ${savingsRate < 20 ? "Increase savings by 5% this month" : "Start investing your surplus"}`;
  }
  
  if (system.includes("30-Day Forecast")) {
    const projectedExpenses = expenses * 1.02;
    const projectedSavings = Math.max(0, income - projectedExpenses);
    return `PROJECTED EXPENSES: $${projectedExpenses.toFixed(0)}
PROJECTED SAVINGS: $${projectedSavings.toFixed(0)}
BIGGEST RISK: ${hasOverBudget ? "Over-budget categories continuing to grow" : "Unexpected expenses"}
BEST OPPORTUNITY: Reduce expenses by 10% to save $${(expenses * 0.1).toFixed(0)}
NARRATIVE: Based on your recent spending patterns, you're on track for ${projectedSavings > 0 ? "positive" : "negative"} cash flow next month.
WARNING: Watch for recurring subscriptions and impulse purchases.`;
  }
  
  if (system.includes("Anomaly Detection")) {
    return `ANOMALIES FOUND: ${hasOverBudget ? 2 : 0}
RISK LEVEL: ${hasOverBudget ? "Medium" : "Low"}
PATTERNS:
- ${hasOverBudget ? "Budget overruns detected in multiple categories" : "Spending patterns are stable"}
- Transaction frequency is ${transactionCount > 50 ? "high" : "normal"}
- ${net < 0 ? "Cash flow is negative" : "Cash flow is positive"}
MOST CONCERNING: ${hasOverBudget ? "Budget overruns could compound over time" : "No critical anomalies detected"}
RECOMMENDATION: ${hasOverBudget ? "Review and adjust category budgets" : "Continue monitoring for unusual spikes"}`;
  }
  
  if (system.includes("Savings Optimizer")) {
    const potentialSavings = Math.max(100, Math.floor(expenses * 0.15));
    return `POTENTIAL MONTHLY SAVINGS: $${potentialSavings}
QUICK WINS (this week):
- Review all subscriptions: save $25-50
- Cook 2 more meals at home: save $30-60
- Use cashback apps: save $10-20
THIS MONTH:
- Negotiate bills (internet, phone, insurance): save $30-100
- Set up automatic savings transfer: save $${Math.floor(potentialSavings * 0.4)} automatically
- Use 24-hour rule for non-essential purchases over $50
LONG TERM: Build a 3-6 month emergency fund, then focus on retirement investing.
BEST SINGLE MOVE: Automate a transfer of $${Math.floor(potentialSavings * 0.3)} to savings on each payday.`;
  }
  
  return "Analysis complete. Focus on reducing non-essential spending and increasing your savings rate.";
}

// ─────────────────────────────────────────────
// Build financial context string from live data
// ─────────────────────────────────────────────
function buildContext({ transactions, categories, accounts, stats }) {
  const rate = stats.totalIncome > 0
    ? (((stats.totalIncome - stats.totalExpenses) / stats.totalIncome) * 100).toFixed(1)
    : "0";

  const topCats = [...stats.categorySpending]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8)
    .map(c => `• ${c.icon} ${c.name}: $${c.spent.toFixed(0)}/$${c.budget.toFixed(0)} budget (${c.percentage.toFixed(0)}%)`)
    .join("\n");

  const over = stats.categorySpending
    .filter(c => c.percentage > 100)
    .map(c => `• ${c.name}: over by $${(c.spent - c.budget).toFixed(0)}`)
    .join("\n") || "None";

  const recent = transactions.slice(0, 15).map(t => {
    const cat = categories.find(c => c.id === t.category);
    return `${t.date} | ${t.type === "income" ? "INCOME" : "EXPENSE"} | $${t.amount.toFixed(2)} | ${cat?.name || "Uncategorized"} | ${t.note || ""}`;
  }).join("\n");

  const accs = accounts.map(a => `• ${a.name} (${a.type}): $${a.balance.toFixed(2)}`).join("\n");

  return `FINANCIAL SNAPSHOT
Income: $${stats.totalIncome.toFixed(2)} | Expenses: $${stats.totalExpenses.toFixed(2)} | Net: $${(stats.totalIncome - stats.totalExpenses).toFixed(2)} | Savings Rate: ${rate}%
Accounts: ${accounts.length} | Categories: ${categories.filter(c => !c.parentId).length} | Transactions: ${transactions.length}

ACCOUNTS
${accs || "None"}

CATEGORY SPENDING
${topCats || "None"}

OVER-BUDGET CATEGORIES
${over}

RECENT TRANSACTIONS (last 15)
${recent || "None"}`;
}

// ─────────────────────────────────────────────
// Analysis module definitions
// ─────────────────────────────────────────────
const MODULES = [
  {
    id: "health",
    icon: "💚",
    label: "Financial Health Score",
    accent: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    bar: "bg-emerald-500",
    btnClass: "bg-emerald-600 hover:bg-emerald-700",
    system: `You are a certified financial analyst. Score the user's financial health 0–100 from their real data. Be direct and specific. Format exactly as:

SCORE: [number]/100
RATING: [Excellent / Good / Fair / Poor / Critical]
SUMMARY: [2 sentence summary]
STRENGTHS:
- [specific strength with numbers]
- [specific strength with numbers]
WEAKNESSES:
- [specific weakness with numbers]
- [specific weakness with numbers]
BEST ACTION: [single most impactful thing to do right now]`,
    question: (ctx) => `Score this financial data:\n\n${ctx}`,
  },
  {
    id: "forecast",
    icon: "📈",
    label: "30-Day Forecast",
    accent: "text-blue-600",
    badge: "bg-blue-50 text-blue-700 border border-blue-200",
    bar: "bg-blue-500",
    btnClass: "bg-blue-600 hover:bg-blue-700",
    system: `You are a predictive financial analyst. Forecast the next 30 days from the user's spending patterns. Use real dollar amounts. Format exactly as:

PROJECTED EXPENSES: $[amount]
PROJECTED SAVINGS: $[amount]
BIGGEST RISK: [category — why it's risky]
BEST OPPORTUNITY: [specific saving opportunity with $ amount]
NARRATIVE: [3 sentences describing their financial trajectory]
WARNING: [one specific thing to watch for]`,
    question: (ctx) => `Forecast the next 30 days from this data:\n\n${ctx}`,
  },
  {
    id: "anomalies",
    icon: "🔍",
    label: "Anomaly Detection",
    accent: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    bar: "bg-amber-500",
    btnClass: "bg-amber-600 hover:bg-amber-700",
    system: `You are a forensic financial analyst. Detect unusual patterns, outliers, and suspicious spending in the data. Format exactly as:

ANOMALIES FOUND: [number]
RISK LEVEL: [Low / Medium / High]
PATTERNS:
- [pattern with specific numbers]
- [pattern with specific numbers]
- [pattern with specific numbers]
MOST CONCERNING: [the single most unusual finding]
RECOMMENDATION: [what to do about it]`,
    question: (ctx) => `Detect anomalies in this financial data:\n\n${ctx}`,
  },
  {
    id: "savings",
    icon: "🎯",
    label: "Savings Optimizer",
    accent: "text-purple-600",
    badge: "bg-purple-50 text-purple-700 border border-purple-200",
    bar: "bg-purple-500",
    btnClass: "bg-purple-600 hover:bg-purple-700",
    system: `You are a savings optimization expert. Find concrete ways to save more money, referencing real categories and amounts. Format exactly as:

POTENTIAL MONTHLY SAVINGS: $[amount]
QUICK WINS (this week):
- [action]: save $[amount]
- [action]: save $[amount]
THIS MONTH:
- [action]: save $[amount]
- [action]: save $[amount]
LONG TERM: [2 sentence strategy]
BEST SINGLE MOVE: [highest-impact single change]`,
    question: (ctx) => `Find savings opportunities in this data:\n\n${ctx}`,
  },
];

// ─────────────────────────────────────────────
// Parse structured AI response into display sections
// ─────────────────────────────────────────────
function parseText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const out = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const bullet = line.replace(/^[-•]\s*/, "");
      if (current) {
        current.bullets = current.bullets || [];
        current.bullets.push(bullet);
      } else {
        if (out.length && out[out.length - 1].bullets)
          out[out.length - 1].bullets.push(bullet);
        else out.push({ bullets: [bullet] });
      }
      continue;
    }
    const colon = line.indexOf(":");
    if (colon > 0 && colon <= 30) {
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim();
      if (/^[A-Z][A-Z\s()]+$/.test(key)) {
        if (current) out.push(current);
        current = { key, value: val, bullets: [] };
        continue;
      }
    }
    if (current) {
      current.value = current.value ? `${current.value} ${line}` : line;
    } else {
      out.push({ text: line });
    }
  }
  if (current) out.push(current);
  return out;
}

// ─────────────────────────────────────────────
// Loading Spinner Component
// ─────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="relative">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      <span className="text-sm text-gray-500 animate-pulse">AI is thinking...</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Single analysis card
// ─────────────────────────────────────────────
function AnalysisCard({ mod, result, loading, onRun }) {
  const sections = result ? parseText(result) : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{mod.icon}</span>
          <h3 className="text-lg font-bold text-gray-900">{mod.label}</h3>
        </div>
        <button
          onClick={onRun}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${loading ? "bg-gray-300 cursor-not-allowed" : mod.btnClass}`}
        >
          {loading ? (
            <>
              <LoadingSpinner />
            </>
          ) : result ? (
            "Re-run"
          ) : (
            "Analyze"
          )}
        </button>
      </div>

      {!loading && !result && (
        <p className="text-sm text-gray-400">
          Click <span className="font-medium text-gray-600">Analyze</span> to run this against your live financial data.
        </p>
      )}

      {loading && (
        <div className="space-y-3">
          {[80, 60, 90, 50, 70].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-gray-100 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {sections.map((s, i) => (
            <div key={i}>
              {s.key && <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${mod.accent}`}>{s.key}</p>}
              {s.value && <p className={`text-sm leading-relaxed ${s.key ? "font-medium text-gray-800" : "text-gray-600"}`}>{s.value}</p>}
              {s.text && <p className="text-sm text-gray-700 leading-relaxed">{s.text}</p>}
              {s.bullets && s.bullets.length > 0 && (
                <ul className="mt-1.5 space-y-1.5">
                  {s.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className={`mt-1 text-xs ${mod.accent}`}>▸</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Chat advisor
// ─────────────────────────────────────────────
function ChatAdvisor({ financialContext }) {
  const [msgs, setMsgs] = useState([
    {
      role: "ai",
      text: "Hi! I'm your AI financial advisor. I have your complete financial data loaded. Ask me anything — spending habits, budget advice, savings goals, or what to focus on.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  const send = async () => {
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: msg }]);
    setBusy(true);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const reply = await askGemini(
        `You are a personal financial advisor. Here is the user's complete financial data:\n\n${financialContext}\n\nAnswer questions conversationally but precisely, always referencing their actual numbers.`,
        msg,
      );
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Connection error — please try again." }]);
    } finally {
      setBusy(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const suggestions = [
    "Where am I wasting money?",
    "How much can I save this month?",
    "Which budget needs the most attention?",
    "Am I on track financially?",
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">💬</span>
          <h3 className="text-lg font-bold text-gray-900">Ask Your Advisor</h3>
        </div>

        {msgs.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto space-y-3">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl rounded-bl-sm px-4 py-3 flex gap-1">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="p-4 bg-gray-50 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask anything about your finances…"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${busy || !input.trim() ? "bg-gray-300 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90"}`}
        >
          {busy ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            "Send"
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main AIInsights screen
// ─────────────────────────────────────────────
export default function AIInsights({ transactions, categories, accounts, stats }) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [runningAll, setRunningAll] = useState(false);

  const ctx = buildContext({ transactions, categories, accounts, stats });
  const hasData = transactions.length > 0 || accounts.length > 0;

  const runModule = async (mod) => {
    setLoading((l) => ({ ...l, [mod.id]: true }));
    try {
      const result = await askGemini(mod.system, mod.question(ctx));
      setResults((r) => ({ ...r, [mod.id]: result }));
    } catch (e) {
      setResults((r) => ({ ...r, [mod.id]: "Error connecting. Please try again." }));
    } finally {
      setLoading((l) => ({ ...l, [mod.id]: false }));
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    await Promise.all(MODULES.map((m) => runModule(m)));
    setRunningAll(false);
  };

  const net = stats.totalIncome - stats.totalExpenses;
  const savingsRate = stats.totalIncome > 0 ? (((stats.totalIncome - stats.totalExpenses) / stats.totalIncome) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-md">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold mb-1">AI Financial Intelligence</h2>
          </div>
          {hasData && (
            <button
              onClick={runAll}
              disabled={runningAll}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white transition-all ${runningAll ? "opacity-60 cursor-not-allowed text-gray-400" : "text-blue-600 hover:bg-blue-50"}`}
            >
              {runningAll ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  Running all…
                </>
              ) : (
                "✦ Run All"
              )}
            </button>
          )}
        </div>

        {hasData && (
          <div className="flex gap-4 mt-5 flex-wrap">
            {[
              { label: "Net Balance", val: `$${net.toFixed(0)}`, sub: net >= 0 ? "positive" : "negative" },
              { label: "Savings Rate", val: `${savingsRate}%`, sub: "of income" },
              { label: "Over Budget", val: stats.categorySpending.filter((c) => c.percentage > 100).length, sub: "categories" },
              { label: "Transactions", val: transactions.length, sub: "recorded" },
            ].map((s) => (
              <div key={s.label} className="bg-white bg-opacity-15 rounded-lg px-4 py-2.5">
                <div className="text-xs text-blue-100 font-medium mb-0.5">{s.label}</div>
                <div className="text-xl font-bold">{s.val}</div>
                <div className="text-xs text-blue-200">{s.sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!hasData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No data yet</h3>
          <p className="text-sm text-gray-500">Add some transactions and accounts first, then come back for AI analysis.</p>
        </div>
      )}

      {hasData && (
        <>
          {MODULES.map((mod) => (
            <AnalysisCard key={mod.id} mod={mod} result={results[mod.id]} loading={loading[mod.id] || false} onRun={() => runModule(mod)} />
          ))}
          <ChatAdvisor financialContext={ctx} />
        </>
      )}
    </div>
  );
}