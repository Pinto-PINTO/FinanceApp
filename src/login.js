import React, { useState } from "react";
import { Wallet, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function Login({
  onLoginSuccess,
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
}) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Set session persistence (20 minutes handled by parent component)
      await setPersistence(auth, browserSessionPersistence);

      if (isLogin) {
        // Login existing user
        await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      } else {
        // Create new user
        await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
      }

      // Success - parent component will handle redirect
      onLoginSuccess();
    } catch (err) {
      // Handle Firebase errors
      let errorMessage = "An error occurred. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        errorMessage =
          "This email is already registered. Please login instead.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      } else if (err.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Wallet size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Finance Tracker
          </h1>
          <p className="text-blue-100">Manage your money with ease</p>
        </div>

        {/* Login/Signup Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Toggle Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
                setFormData({ email: "", password: "", confirmPassword: "" });
              }}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isLogin
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
                setFormData({ email: "", password: "", confirmPassword: "" });
              }}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                !isLogin
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle
                size={18}
                className="text-red-600 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  disabled={loading}
                  onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                  onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                At least 6 characters
              </p>
            </div>

            {/* Confirm Password Input (Sign Up only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    disabled={loading}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isLogin ? "Logging in..." : "Creating account..."}
                </span>
              ) : (
                <span>{isLogin ? "Login" : "Create Account"}</span>
              )}
            </button>
          </div>

          {/* Footer Text */}
          <div className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? (
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError("");
                    setFormData({
                      email: "",
                      password: "",
                      confirmPassword: "",
                    });
                  }}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError("");
                    setFormData({
                      email: "",
                      password: "",
                      confirmPassword: "",
                    });
                  }}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Session Info */}
        <div className="mt-6 text-center text-sm text-white text-opacity-80">
          <p>Your session will remain active for 20 minutes of inactivity</p>
        </div>
      </div>
    </div>
  );
}
