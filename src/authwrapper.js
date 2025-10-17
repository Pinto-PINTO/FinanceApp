import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import Login from "./login";
import FinanceTrackerApp from "./App";

export default function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        console.log(
          "Auth state changed:",
          currentUser ? "User logged in" : "No user"
        );
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          setLastActivity(Date.now());
        }
      },
      (error) => {
        console.error("Auth state error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle 20-minute inactivity timeout
  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const resetTimer = () => {
      setLastActivity(Date.now());
    };

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Check inactivity every minute
    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const twentyMinutes = 20 * 60 * 1000; // 20 minutes in milliseconds

      if (inactiveTime >= twentyMinutes) {
        handleLogout();
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
  }, [user, lastActivity]);

  const handleLoginSuccess = () => {
    setLastActivity(Date.now());
    // User state will be updated automatically by onAuthStateChanged
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user is logged in, show Login page
  if (!user) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        auth={auth}
        signInWithEmailAndPassword={signInWithEmailAndPassword}
        createUserWithEmailAndPassword={createUserWithEmailAndPassword}
        setPersistence={setPersistence}
        browserSessionPersistence={browserSessionPersistence}
      />
    );
  }

  // If user is logged in, show Finance Tracker App
  return <FinanceTrackerApp user={user} onLogout={handleLogout} />;
}
