import React, { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import Login from "./login";
import FinanceTrackerApp from "./App";
import OnboardingFlow from "./OnboardingFlow";
import { checkUserSetup } from "./dbService";

export default function AuthWrapper() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check authentication state on mount
  // Check authentication state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        console.log(
          "Auth state changed:",
          currentUser ? "User logged in" : "No user"
        );

        if (currentUser) {
          // Check if session has expired (20 minutes from last activity)
          const storedLastActivity = localStorage.getItem("lastActivity");
          if (storedLastActivity) {
            const timeSinceLastActivity =
              Date.now() - parseInt(storedLastActivity);
            const twentyMinutes = 20 * 60 * 1000;

            if (timeSinceLastActivity >= twentyMinutes) {
              console.log("Session expired due to inactivity");
              signOut(auth);
              localStorage.removeItem("lastActivity");
              setUser(null);
              setLoading(false);
              setCheckingSetup(false);
              return;
            }
          }

          // Check if user has completed setup
          try {
            const setupComplete = await checkUserSetup(currentUser.uid);
            setIsSetupComplete(setupComplete);
          } catch (error) {
            console.error("Error checking setup:", error);
            setIsSetupComplete(false);
          }

          // Update last activity
          localStorage.setItem("lastActivity", Date.now().toString());
          setLastActivity(Date.now());
        } else {
          localStorage.removeItem("lastActivity");
          setIsSetupComplete(false);
        }

        setUser(currentUser);
        setLoading(false);
        setCheckingSetup(false);
      },
      (error) => {
        console.error("Auth state error:", error);
        setLoading(false);
        setCheckingSetup(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle 20-minute inactivity timeout
  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const resetTimer = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem("lastActivity", now.toString());
    };

    // Add event listeners for user activity
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // Check inactivity every 30 seconds
    const interval = setInterval(() => {
      const storedLastActivity = localStorage.getItem("lastActivity");
      if (!storedLastActivity) return;

      const inactiveTime = Date.now() - parseInt(storedLastActivity);
      const twentyMinutes = 20 * 60 * 1000; // 20 minutes in milliseconds

      if (inactiveTime >= twentyMinutes) {
        console.log("Logging out due to inactivity");
        handleLogout();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      clearInterval(interval);
    };
  }, [user, lastActivity]);

  const handleLoginSuccess = () => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem("lastActivity", now.toString());
    // User state will be updated automatically by onAuthStateChanged
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("lastActivity");
      setUser(null);
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Show loading spinner while checking auth state
  if (loading || checkingSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && !isSetupComplete) {
    return (
      <OnboardingFlow user={user} onComplete={() => setIsSetupComplete(true)} />
    );
  }

  // If user is logged in and setup is complete, show Finance Tracker App
  return <FinanceTrackerApp user={user} onLogout={handleLogout} />;
}
