import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

// Check if user has completed setup
export const checkUserSetup = async (userId) => {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() && userDoc.data().isSetupComplete;
};

// Complete user setup
export const completeUserSetup = async (userId, email) => {
  await setDoc(doc(db, "users", userId), {
    email,
    isSetupComplete: true,
    createdAt: new Date().toISOString(),
  });
};

// ===== CATEGORIES =====
export const getCategories = async (userId) => {
  const categoriesRef = collection(db, "users", userId, "categories");
  const snapshot = await getDocs(categoriesRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addCategory = async (userId, categoryData) => {
  const categoriesRef = collection(db, "users", userId, "categories");
  const docRef = await addDoc(categoriesRef, categoryData);
  return { id: docRef.id, ...categoryData };
};

export const updateCategory = async (userId, categoryId, categoryData) => {
  const categoryRef = doc(db, "users", userId, "categories", categoryId);
  await updateDoc(categoryRef, categoryData);
};

export const deleteCategory = async (userId, categoryId) => {
  const categoryRef = doc(db, "users", userId, "categories", categoryId);
  await deleteDoc(categoryRef);
};

// ===== TRANSACTIONS =====
export const getTransactions = async (userId) => {
  const transactionsRef = collection(db, "users", userId, "transactions");
  const q = query(transactionsRef, orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addTransaction = async (userId, transactionData) => {
  const transactionsRef = collection(db, "users", userId, "transactions");
  const docRef = await addDoc(transactionsRef, transactionData);
  return { id: docRef.id, ...transactionData };
};

export const updateTransaction = async (
  userId,
  transactionId,
  transactionData
) => {
  const transactionRef = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId
  );
  await updateDoc(transactionRef, transactionData);
};

export const deleteTransaction = async (userId, transactionId) => {
  const transactionRef = doc(
    db,
    "users",
    userId,
    "transactions",
    transactionId
  );
  await deleteDoc(transactionRef);
};

// ===== ACCOUNTS =====
export const getAccounts = async (userId) => {
  const accountsRef = collection(db, "users", userId, "accounts");
  const snapshot = await getDocs(accountsRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addAccount = async (userId, accountData) => {
  const accountsRef = collection(db, "users", userId, "accounts");
  const docRef = await addDoc(accountsRef, accountData);
  return { id: docRef.id, ...accountData };
};

export const updateAccount = async (userId, accountId, accountData) => {
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await updateDoc(accountRef, accountData);
};

export const deleteAccount = async (userId, accountId) => {
  const accountRef = doc(db, "users", userId, "accounts", accountId);
  await deleteDoc(accountRef);
};

// ===== USER PREFERENCES =====
export const getUserPreferences = async (userId) => {
  const userDoc = await getDoc(doc(db, "users", userId));
  return userDoc.exists() ? userDoc.data().preferences : null;
};

export const updateUserPreferences = async (userId, preferences) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { preferences });
};
