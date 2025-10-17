import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Plus, X, Edit2, Trash2, Home, List, BarChart3, Settings, 
  AlertCircle, ChevronLeft, TrendingUp, TrendingDown, Landmark, Banknote 
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, query, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, setLogLevel 
} from 'firebase/firestore';


// =================================================================
// FIREBASE MODULE EMULATION (from user's firebase.js)
// NOTE: Since I cannot access your environment variables, I use 
// mock values for a runnable, self-contained file.
// In your local environment, process.env variables would be defined.
// =================================================================

// Mock Environment Variables (Simulating loading from process.env)
const mockEnv = {
    REACT_APP_FIREBASE_API_KEY: 'AIzaSyCzkRtdKY0HM8XzYsY_0kih1-Ck58_ommc',
    REACT_APP_FIREBASE_AUTH_DOMAIN: 'financetrackerapp-75842.firebaseapp.com',
    REACT_APP_FIREBASE_PROJECT_ID: 'financetrackerapp-75842',
    REACT_APP_FIREBASE_STORAGE_BUCKET: 'financetrackerapp-75842.firebasestorage.app',
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '1051498012571',
    REACT_APP_FIREBASE_APP_ID: '1:1051498012571:web:589ce9080de392e2d8b3e',
    REACT_APP_FIREBASE_MEASUREMENT_ID: 'G-X85CK0RQ1E',
};

const firebaseConfig = {
    apiKey: mockEnv.REACT_APP_FIREBASE_API_KEY,
    authDomain: mockEnv.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: mockEnv.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: mockEnv.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: mockEnv.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: mockEnv.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase (Equivalent to your 'firebase.js' exports)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Set debug logging for Firestore
setLogLevel('debug');

// =================================================================
// APP COMPONENT START
// =================================================================

// Helper function to format currency
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
}).format(amount);

// Initial state for forms
const initialTransactionFormData = {
  description: '',
  amount: 0,
  type: 'expense', // 'income' or 'expense'
  date: new Date().toISOString().substring(0, 10),
  accountId: '',
  categoryId: '',
};

const initialAccountFormData = {
  name: '',
  initialBalance: 0,
  type: 'checking',
  color: '#4ECDC4',
};

const initialCategoryFormData = {
  name: '',
  type: 'expense', // 'income' or 'expense'
  icon: '💰', // Placeholder for a simple icon/emoji
};


export default function App() {
  // --- FIREBASE STATE ---
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const appId = firebaseConfig.projectId; // Use project ID for artifact scoping

  // --- APPLICATION DATA STATE ---
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // --- UI/FORM STATE ---
  const [currentScreen, setCurrentScreen] = useState('home');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showToast, setShowToast] = useState({ message: '', type: '', id: 0 });
  
  // Transaction Form State
  const [transactionFormData, setTransactionFormData] = useState(initialTransactionFormData);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Settings Form States
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState(initialCategoryFormData);
  const [editingCategory, setEditingCategory] = useState(null);

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountFormData, setAccountFormData] = useState(initialAccountFormData);
  const [editingAccount, setEditingAccount] = useState(null);

  // --- FIREBASE AUTHENTICATION (Runs once on load) ---
  useEffect(() => {
    let unsubscribe;
    
    // 1. Authentication Listener (uses the globally initialized 'auth')
    try {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
          console.log("User authenticated:", user.uid);
        } else {
          // If no user is logged in, sign in anonymously as a fallback
          const anonUser = await signInAnonymously(auth);
          setUserId(anonUser.user.uid);
          console.log("Signed in anonymously:", anonUser.user.uid);
        }
        setIsAuthReady(true);
      });
    } catch (error) {
        console.error("Firebase Auth Error:", error);
        setIsAuthReady(true);
    }

    return () => {
        if(unsubscribe) unsubscribe();
    };
  }, []); // Empty dependency array ensures it runs only once

  // --- FIREBASE DATA LISTENERS (Runs after successful authentication) ---
  useEffect(() => {
    // Only proceed if Firebase is ready and we have a userId
    if (!userId || !isAuthReady) return;

    // Base path for user-specific private data
    // /artifacts/{appId}/users/{userId}/
    const basePath = `artifacts/${appId}/users/${userId}`;

    // 1. Transactions Listener
    const transactionsRef = collection(db, `${basePath}/transactions`);
    const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by date (newest first)
      setTransactions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      console.log("Transactions updated:", data.length);
    }, (error) => console.error("Error fetching transactions:", error));

    // 2. Accounts Listener
    const accountsRef = collection(db, `${basePath}/accounts`);
    const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccounts(data);
      console.log("Accounts updated:", data.length);
    }, (error) => console.error("Error fetching accounts:", error));

    // 3. Categories Listener
    const categoriesRef = collection(db, `${basePath}/categories`);
    const unsubscribeCategories = onSnapshot(categoriesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(data);
      console.log("Categories updated:", data.length);
    }, (error) => console.error("Error fetching categories:", error));

    // Cleanup function
    return () => {
      unsubscribeTransactions();
      unsubscribeAccounts();
      unsubscribeCategories();
    };
  }, [userId, isAuthReady, appId]);

  // --- UTILITY AND DATA TRANSFORMATION ---

  // Calculate Account Balances and Total Balance
  const { totalBalance, accountBalances } = useMemo(() => {
    const balances = accounts.reduce((acc, account) => {
      acc[account.id] = account.initialBalance || 0;
      return acc;
    }, {});

    transactions.forEach(t => {
      if (t.accountId && balances.hasOwnProperty(t.accountId)) {
        if (t.type === 'income') {
          balances[t.accountId] += t.amount;
        } else if (t.type === 'expense') {
          balances[t.accountId] -= t.amount;
        }
      }
    });

    const overallBalance = Object.values(balances).reduce((sum, balance) => sum + balance, 0);
    return {
      totalBalance: overallBalance,
      accountBalances: balances,
    };
  }, [accounts, transactions]);


  // --- TOAST NOTIFICATION ---
  const showNotification = (message, type = 'success') => {
    setShowToast({ message, type, id: Date.now() });
    setTimeout(() => setShowToast({ message: '', type: '', id: 0 }), 3000);
  };

  // --- CRUD OPERATIONS ---

  // Base function to get document path
  const getDocPath = (collectionName, id) => doc(db, `artifacts/${appId}/users/${userId}/${collectionName}`, id);
  // Base function to get collection path
  const getCollectionPath = (collectionName) => collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`);
  

  // --- Transactions CRUD ---
  const handleAddOrUpdateTransaction = async () => {
    if (!userId) return showNotification('Authentication failed. Please refresh.', 'error');
    if (!transactionFormData.description || transactionFormData.amount <= 0 || !transactionFormData.accountId) {
      return showNotification('Please fill out all required fields.', 'warning');
    }
    
    const dataToSave = {
      ...transactionFormData,
      amount: parseFloat(transactionFormData.amount),
      // Add a creation timestamp if it's a new record
      createdAt: editingTransaction ? editingTransaction.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingTransaction) {
        await updateDoc(getDocPath('transactions', editingTransaction.id), dataToSave);
        showNotification('Transaction updated successfully!', 'success');
      } else {
        await addDoc(getCollectionPath('transactions'), dataToSave);
        showNotification('Transaction added successfully!', 'success');
      }
      // Reset form and close modal
      setTransactionFormData(initialTransactionFormData);
      setEditingTransaction(null);
      setShowAddModal(false);
    } catch (e) {
      console.error("Error saving transaction: ", e);
      showNotification('Failed to save transaction.', 'error');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!userId) return showNotification('Authentication failed. Please refresh.', 'error');
    try {
      await deleteDoc(getDocPath('transactions', id));
      showNotification('Transaction deleted.', 'success');
    } catch (e) {
      console.error("Error deleting transaction: ", e);
      showNotification('Failed to delete transaction.', 'error');
    }
  };

  const startEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setTransactionFormData({ 
      ...transaction, 
      date: transaction.date.substring(0, 10), // Ensure date format is YYYY-MM-DD
      amount: transaction.amount.toString(), // Convert to string for form input
    });
    setShowAddModal(true);
  };

  const resetTransactionForm = () => {
    setTransactionFormData(initialTransactionFormData);
    setEditingTransaction(null);
    setShowAddModal(false);
  };
  
  // --- Accounts CRUD ---
  const handleAddOrUpdateAccount = async () => {
    if (!userId) return showNotification('Authentication failed. Please refresh.', 'error');
    if (!accountFormData.name || accountFormData.initialBalance === null) {
      return showNotification('Please fill out all account fields.', 'warning');
    }

    const dataToSave = {
      ...accountFormData,
      initialBalance: parseFloat(accountFormData.initialBalance),
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editingAccount) {
        await updateDoc(getDocPath('accounts', editingAccount.id), dataToSave);
        showNotification('Account updated!', 'success');
      } else {
        await addDoc(getCollectionPath('accounts'), dataToSave);
        showNotification('Account added!', 'success');
      }
      setAccountFormData(initialAccountFormData);
      setEditingAccount(null);
      setShowAccountForm(false);
    } catch (e) {
      console.error("Error saving account: ", e);
      showNotification('Failed to save account.', 'error');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!userId) return showNotification('Authentication failed. Please refresh.', 'error');
    
    // Safety check: Cannot delete account if it has transactions
    const hasTransactions = transactions.some(t => t.accountId === id);
    if (hasTransactions) {
      return showNotification('Cannot delete account with existing transactions. Delete transactions first.', 'error');
    }

    try {
      await deleteDoc(getDocPath('accounts', id));
      showNotification('Account deleted.', 'success');
    } catch (e) {
      console.error("Error deleting account: ", e);
      showNotification('Failed to delete account.', 'error');
    }
  };

  // --- Categories CRUD ---
  const handleAddOrUpdateCategory = async () => {
    if (!userId) return showNotification('Authentication failed. Please refresh.', 'error');
    if (!categoryFormData.name) {
      return showNotification('Category name is required.', 'warning');
    }

    const dataToSave = {
      ...categoryFormData,
      createdAt: editingCategory ? editingCategory.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      if (editingCategory) {
        await updateDoc(getDocPath('categories', editingCategory.id), dataToSave);
        showNotification('Category updated!', 'success');
      } else {
        await addDoc(getCollectionPath('categories'), dataToSave);
        showNotification('Category added!', 'success');
      }
      setCategoryFormData(initialCategoryFormData);
      setEditingCategory(null);
      setShowCategoryForm(false);
    } catch (e) {
      console.error("Error saving category: ", e);
      showNotification('Failed to save category.', 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!userId) return showNotification('Authentication failed. Please refresh.', 'error');
    
    // Safety check: Cannot delete category if it is used in a transaction
    const isUsed = transactions.some(t => t.categoryId === id);
    if (isUsed) {
      return showNotification('Cannot delete category in use.', 'error');
    }

    try {
      await deleteDoc(getDocPath('categories', id));
      showNotification('Category deleted.', 'success');
    } catch (e) {
      console.error("Error deleting category: ", e);
      showNotification('Failed to delete category.', 'error');
    }
  };
  
  // --- UI COMPONENTS ---

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      <p className="mt-4 text-lg text-gray-600 font-medium">Authenticating and loading data...</p>
      <p className="mt-2 text-sm text-gray-400">User ID: {userId || 'Signing in...'}</p>
    </div>
  );

  const Toast = () => (
    <div 
      key={showToast.id} 
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white transition-opacity duration-300 ${
        showToast.message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      } ${showToast.type === 'error' ? 'bg-red-500' : showToast.type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'}`}
      role="alert"
    >
      {showToast.message}
    </div>
  );
  
  const Sidebar = () => (
    <nav className="p-4 bg-gray-800 text-white w-full sm:w-64 h-full flex flex-col fixed sm:static z-20 transition-transform duration-300 transform sm:translate-x-0">
      <h1 className="text-2xl font-bold mb-8 flex items-center">
        <Banknote className="w-6 h-6 mr-2" />
        Finance Tracker
      </h1>
      <div className="flex-grow">
        <NavItem icon={Home} label="Dashboard" screen="home" />
        <NavItem icon={List} label="Transactions" screen="transactions" />
        <NavItem icon={BarChart3} label="Analysis" screen="analysis" />
        <NavItem icon={Settings} label="Settings" screen="settings" />
      </div>
      <div className="text-sm text-gray-400 p-2 border-t border-gray-700 mt-4 break-words">
          <p className="font-semibold">Project ID (App ID):</p>
          <p className="text-xs">{appId}</p>
          <p className="font-semibold mt-1">User ID:</p>
          <p className="text-xs">{userId || 'Loading...'}</p>
      </div>
    </nav>
  );

  const NavItem = ({ icon: Icon, label, screen }) => (
    <button
      onClick={() => setCurrentScreen(screen)}
      className={`flex items-center w-full p-3 rounded-lg transition duration-150 mb-2 ${
        currentScreen === screen ? 'bg-indigo-600 font-semibold' : 'hover:bg-gray-700'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </button>
  );

  const Dashboard = () => {
    // Top 5 recent transactions
    const recentTransactions = transactions.slice(0, 5);

    // Calculate Net Flow for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const monthlyFlow = transactions.reduce((acc, t) => {
      const tDate = new Date(t.date);
      if (tDate >= thirtyDaysAgo) {
        if (t.type === 'income') acc.income += t.amount;
        else if (t.type === 'expense') acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0 });

    const StatCard = ({ title, value, icon: Icon, colorClass, isCurrency = true }) => (
      <div className={`p-5 rounded-xl shadow-lg ${colorClass} text-white`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium opacity-80">{title}</h3>
          <Icon className="w-6 h-6 opacity-70" />
        </div>
        <p className="mt-1 text-3xl font-bold">
          {isCurrency ? formatCurrency(value) : value}
        </p>
      </div>
    );

    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Balance"
            value={totalBalance}
            icon={Wallet}
            colorClass="bg-indigo-500"
          />
          <StatCard
            title="Monthly Income (Last 30 Days)"
            value={monthlyFlow.income}
            icon={TrendingUp}
            colorClass="bg-green-500"
          />
          <StatCard
            title="Monthly Expenses (Last 30 Days)"
            value={monthlyFlow.expense}
            icon={TrendingDown}
            colorClass="bg-red-500"
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 flex justify-between items-center">
              Recent Transactions
              <button 
                onClick={() => setCurrentScreen('transactions')} 
                className="text-indigo-500 hover:text-indigo-700 text-sm font-medium"
              >
                View All
              </button>
            </h3>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map(t => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No recent transactions. Start by adding one!</p>
            )}
          </div>

          {/* Account Overview */}
          <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 flex justify-between items-center">
              Account Overview
            </h3>
            {accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map(account => (
                  <div key={account.id} className="flex justify-between items-center p-3 rounded-lg shadow-sm" style={{ borderLeft: `4px solid ${account.color}` }}>
                    <div>
                      <p className="font-medium text-gray-700">{account.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{account.type}</p>
                    </div>
                    <p className={`font-semibold ${accountBalances[account.id] < 0 ? 'text-red-500' : 'text-gray-800'}`}>
                      {formatCurrency(accountBalances[account.id])}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No accounts added yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const TransactionRow = ({ transaction }) => {
    const account = accounts.find(a => a.id === transaction.accountId);
    const category = categories.find(c => c.id === transaction.categoryId);
    const isExpense = transaction.type === 'expense';
    const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
    const sign = isExpense ? '-' : '+';
    
    return (
      <div className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg transition border-b border-gray-100 last:border-b-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-xl">
            {category?.icon || (isExpense ? '🛒' : '⭐')}
          </div>
          <div>
            <p className="font-medium text-gray-800">{transaction.description}</p>
            <p className="text-xs text-gray-500">{category?.name || 'Uncategorized'} &middot; {account?.name || 'No Account'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-semibold ${amountColor}`}>
            {sign}{formatCurrency(transaction.amount)}
          </p>
          <p className="text-xs text-gray-400">
            {transaction.date}
          </p>
          <div className='flex gap-2 mt-1'>
            <button onClick={() => startEditTransaction(transaction)} className='text-indigo-500 hover:text-indigo-700 p-1 rounded-full'>
              <Edit2 className='w-4 h-4' />
            </button>
            <button onClick={() => handleDeleteTransaction(transaction.id)} className='text-red-500 hover:text-red-700 p-1 rounded-full'>
              <Trash2 className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TransactionsView = () => (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">All Transactions</h2>
      <button 
        onClick={() => {
          resetTransactionForm();
          setShowAddModal(true);
        }} 
        className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center shadow-md"
      >
        <Plus className="w-5 h-5 mr-2" />
        Add New Transaction
      </button>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {transactions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {transactions.map(t => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        ) : (
          <p className="p-6 text-gray-500 italic">No transactions recorded yet.</p>
        )}
      </div>
    </div>
  );

  const AddTransactionModal = () => {
    // Determine which category options to show based on transaction type
    const categoryOptions = categories.filter(c => c.type === transactionFormData.type);

    return (
      <Modal title={editingTransaction ? 'Edit Transaction' : 'New Transaction'} onClose={resetTransactionForm}>
        <div className="space-y-4">
          <div className='flex gap-4'>
            <button 
              onClick={() => setTransactionFormData(prev => ({ ...prev, type: 'expense' }))}
              className={`flex-1 py-2 rounded-lg font-medium transition ${transactionFormData.type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Expense
            </button>
            <button 
              onClick={() => setTransactionFormData(prev => ({ ...prev, type: 'income' }))}
              className={`flex-1 py-2 rounded-lg font-medium transition ${transactionFormData.type === 'income' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Income
            </button>
          </div>
          
          <Input 
            label="Description" 
            type="text" 
            value={transactionFormData.description} 
            onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })} 
          />
          <Input 
            label="Amount" 
            type="number" 
            min="0.01"
            step="0.01"
            value={transactionFormData.amount} 
            onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: e.target.value })} 
          />
          <Input 
            label="Date" 
            type="date" 
            value={transactionFormData.date} 
            onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })} 
          />
          
          <Select 
            label="Account" 
            value={transactionFormData.accountId} 
            onChange={(e) => setTransactionFormData({ ...transactionFormData, accountId: e.target.value })}
            options={accounts.map(a => ({ value: a.id, label: a.name }))}
            placeholder="Select an account"
          />

          <Select 
            label="Category" 
            value={transactionFormData.categoryId} 
            onChange={(e) => setTransactionFormData({ ...transactionFormData, categoryId: e.target.value })}
            options={categoryOptions.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
            placeholder="Select a category"
          />

          <button onClick={handleAddOrUpdateTransaction} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition mt-4 shadow-lg">
            {editingTransaction ? 'Update Transaction' : 'Add Transaction'}
          </button>
        </div>
      </Modal>
    );
  };
  
  const SettingsView = () => (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings & Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccountManagement />
        <CategoryManagement />
      </div>

      {showAccountForm && (
        <AccountFormModal />
      )}
      {showCategoryForm && (
        <CategoryFormModal />
      )}
    </div>
  );
  
  const AccountManagement = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700 flex justify-between items-center">
        Accounts
        <button onClick={() => {
          setAccountFormData(initialAccountFormData);
          setEditingAccount(null);
          setShowAccountForm(true);
        }} className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium">
          <Plus className="w-4 h-4 mr-1" /> New Account
        </button>
      </h3>
      <div className="space-y-3">
        {accounts.length > 0 ? (
          accounts.map(account => (
            <div key={account.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center border-l-4" style={{ borderLeftColor: account.color }}>
              <div>
                <p className="font-medium text-gray-800">{account.name} ({account.type})</p>
                <p className="text-sm text-gray-500">Balance: {formatCurrency(accountBalances[account.id])}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingAccount(account); setAccountFormData(account); setShowAccountForm(true); }}
                  className='text-indigo-500 hover:text-indigo-700 p-1 rounded-full'
                >
                  <Edit2 className='w-4 h-4' />
                </button>
                <button 
                  onClick={() => handleDeleteAccount(account.id)} 
                  className='text-red-500 hover:text-red-700 p-1 rounded-full'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">No accounts defined.</p>
        )}
      </div>
    </div>
  );

  const AccountFormModal = () => (
    <Modal 
      title={editingAccount ? 'Edit Account' : 'Add New Account'} 
      onClose={() => setShowAccountForm(false)}
    >
      <div className="space-y-4">
        <Input 
          label="Account Name" 
          type="text" 
          value={accountFormData.name} 
          onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })} 
        />
        <Input 
          label="Initial Balance" 
          type="number" 
          step="0.01"
          value={accountFormData.initialBalance} 
          onChange={(e) => setAccountFormData({ ...accountFormData, initialBalance: e.target.value })} 
        />
        <Select 
          label="Account Type" 
          value={accountFormData.type} 
          onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })}
          options={['checking', 'savings', 'cash', 'credit'].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
        />
        <div>
          <label className="text-sm font-medium block mb-2">Color</label>
          <div className="flex gap-2">
            {['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#6A0572'].map(color => (
              <button 
                key={color} 
                onClick={() => setAccountFormData({ ...accountFormData, color })} 
                className={`w-8 h-8 rounded-lg border-2 transition ${accountFormData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'}`} 
                style={{ backgroundColor: color }} 
              />
            ))}
          </div>
        </div>
        <button onClick={handleAddOrUpdateAccount} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition mt-4 shadow-lg">
          {editingAccount ? 'Update Account' : 'Add Account'}
        </button>
      </div>
    </Modal>
  );

  const CategoryManagement = () => (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-700 flex justify-between items-center">
        Categories
        <button onClick={() => {
          setCategoryFormData(initialCategoryFormData);
          setEditingCategory(null);
          setShowCategoryForm(true);
        }} className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm font-medium">
          <Plus className="w-4 h-4 mr-1" /> New Category
        </button>
      </h3>
      <div className="space-y-3">
        {categories.length > 0 ? (
          categories.map(cat => (
            <div key={cat.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
              <p className="font-medium text-gray-800">{cat.icon} {cat.name}</p>
              <div className='flex gap-2'>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${cat.type === 'expense' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
                  {cat.type}
                </span>
                <button 
                  onClick={() => { setEditingCategory(cat); setCategoryFormData(cat); setShowCategoryForm(true); }}
                  className='text-indigo-500 hover:text-indigo-700 p-1 rounded-full'
                >
                  <Edit2 className='w-4 h-4' />
                </button>
                <button 
                  onClick={() => handleDeleteCategory(cat.id)} 
                  className='text-red-500 hover:text-red-700 p-1 rounded-full'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500 italic">No categories defined.</p>
        )}
      </div>
    </div>
  );

  const CategoryFormModal = () => (
    <Modal 
      title={editingCategory ? 'Edit Category' : 'Add New Category'} 
      onClose={() => setShowCategoryForm(false)}
    >
      <div className="space-y-4">
        <Input 
          label="Category Name" 
          type="text" 
          value={categoryFormData.name} 
          onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} 
        />
        <Select 
          label="Type" 
          value={categoryFormData.type} 
          onChange={(e) => setCategoryFormData({ ...categoryFormData, type: e.target.value })}
          options={['expense', 'income'].map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
        />
        <Input 
          label="Icon (Emoji)" 
          type="text" 
          maxLength="2"
          value={categoryFormData.icon} 
          onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })} 
        />
        <button onClick={handleAddOrUpdateCategory} className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition mt-4 shadow-lg">
          {editingCategory ? 'Update Category' : 'Add Category'}
        </button>
      </div>
    </Modal>
  );

  const Modal = ({ children, title, onClose }) => (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );

  const Input = ({ label, type, value, onChange, ...props }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={onChange} 
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-base"
        {...props}
      />
    </div>
  );

  const Select = ({ label, value, onChange, options, placeholder }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
      <select 
        value={value} 
        onChange={onChange} 
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 text-base appearance-none"
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  // --- MAIN RENDER LOGIC ---

  if (!isAuthReady) {
    return <LoadingState />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Dashboard />;
      case 'transactions':
        return <TransactionsView />;
      case 'settings':
        return <SettingsView />;
      case 'analysis':
        return <div className="p-6"><h2 className="text-3xl font-bold">Analysis (Coming Soon)</h2><p className="text-gray-500 mt-2">Charts and insights will go here.</p></div>
      default:
        return <Dashboard />;
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased flex flex-col sm:flex-row">
      {/* Sidebar for desktop */}
      <div className="hidden sm:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-grow sm:ml-64 p-0 w-full">
        {renderScreen()}
      </main>

      {/* Mobile Navigation (Bottom Bar) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 shadow-2xl">
        <div className="flex justify-around items-center h-16">
          <NavItem icon={Home} label="Dashboard" screen="home" />
          <NavItem icon={List} label="Txns" screen="transactions" />
          <button 
            onClick={() => {
              resetTransactionForm();
              setShowAddModal(true);
            }} 
            className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg -mt-6 flex items-center justify-center transform transition hover:scale-105"
          >
            <Plus className="w-6 h-6" />
          </button>
          <NavItem icon={BarChart3} label="Analysis" screen="analysis" />
          <NavItem icon={Settings} label="Settings" screen="settings" />
        </div>
      </div>

      {/* Modal */}
      {showAddModal && <AddTransactionModal />}

      {/* Toast Notification */}
      <Toast />
    </div>
  );
}
