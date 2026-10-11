import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const Home = () => {
  const [state] = useState("Sign up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, setPendingCredentials } = useAuth();

  // If redirected from an unauthorized attempt
  const redirectNotice = location.state?.message;

  const onSubmitHandler = (event) => {
    event.preventDefault();
    setErrorMessage("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // 1. Full name validation
    if (!trimmedName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    // 2. Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address (e.g., user@example.com).");
      return;
    }

    // 3. Password validation
    if (!trimmedPassword || trimmedPassword.length < 4) {
      setErrorMessage("Please enter a password with at least 4 characters.");
      return;
    }

    // Store credentials for step 2 role selection
    setPendingCredentials({
      name: trimmedName,
      email: trimmedEmail,
    });

    navigate("/LogInfo");
  };

  // If the user is already authenticated
  if (isAuthenticated && user) {
    return (
      <div className="page-transition min-h-[80vh] flex flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>

        <div className="flex flex-col gap-5 p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg bg-white">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium">
            <span className="text-base">✓</span>
            <span>You are currently authenticated as <strong>{user.role}</strong>.</span>
          </div>

          <p className="text-sm text-gray-600">
            Access your dashboards below, or log out to sign in with different credentials.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/Homeowner")}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-md font-semibold text-sm transition shadow-sm text-center"
            >
              Go to Homeowner Dashboard →
            </button>

            <button
              onClick={() => navigate("/operator")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-md font-semibold text-sm transition shadow-sm text-center"
            >
              Go to Operator Dashboard →
            </button>

            <button
              onClick={() => logout()}
              className="border border-red-300 text-red-600 hover:bg-red-50 py-2 px-4 rounded-md font-medium text-sm transition text-center mt-2"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      /*makes the welcome in the center*/
      onSubmit={onSubmitHandler}
      className="page-transition min-h-[80vh] flex flex-col items-center justify-center gap-4"
    >
      <h1 className="text-3xl font-bold">Welcome</h1>

      {/* Access Denied Warning (shown when trying to access Homeowner or Operator without logging in) */}
      {redirectNotice && (
        <div className="flex items-center gap-2 p-3 min-w-[340px] sm:min-w-96 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-xs font-semibold shadow-sm animate-fadeIn">
          <span className="text-base">🔒</span>
          <span>{redirectNotice}</span>
        </div>
      )}

      {/* Validation error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 min-w-[340px] sm:min-w-96 bg-red-50 border border-red-300 text-red-800 rounded-lg text-xs font-medium shadow-sm animate-fadeIn">
          <span className="text-base">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg bg-white">
        <p className="text-2xl font-semibold">
          {state === "Sign up" ? "Log in" : "Login"}
        </p>

        <p>Please use your credentials to log in</p>

        <div>
          <p className="font-medium text-xs text-gray-700 mb-1">Full Name</p>
          <input
            type="text"
            onChange={(e) => {
              setName(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            value={name}
            placeholder="e.g. Alex Morgan"
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <p className="font-medium text-xs text-gray-700 mb-1">Email</p>
          <input
            type="email"
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            value={email}
            placeholder="e.g. alex.morgan@carolina.rr.com"
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <p className="font-medium text-xs text-gray-700 mb-1">Password</p>
          <input
            type="password"
            onChange={(e) => {
              setPassword(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            value={password}
            placeholder="••••••••"
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/*button stuff */}
        <button
          type="submit"
          //*w-40 sets to a specific width
          className="bg-blue-500 hover:bg-blue-600 text-white w-40 py-2 rounded-md text-base font-medium transition cursor-pointer mt-2"
        >
          {state === "Sign up" ? "Log in" : "Login"}
        </button>
      </div>
    </form>
  );
};

export default Home;