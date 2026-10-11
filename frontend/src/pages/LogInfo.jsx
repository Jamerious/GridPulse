import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LogInfo = () => {
  const [choice, setChoice] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login, pendingCredentials } = useAuth();

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!choice) {
      setError("Please select a role to complete logging in.");
      return;
    }

    // Successfully finalize login and set authenticated state
    login(choice);

    // Navigate to the respective dashboard
    if (choice === "Homeowner") {
      navigate("/Homeowner");
    } else if (choice === "Operator") {
      navigate("/operator");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="page-transition min-h-[80vh] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-8 p-10 sm:p-14 min-w-[340px] sm:min-w-[460px] border rounded-xl shadow-lg bg-white">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-900">Logging in as?</h1>
          {pendingCredentials?.name && (
            <p className="text-xs text-gray-500">
              Welcome, <span className="font-semibold text-gray-700">{pendingCredentials.name}</span>! Select your account role:
            </p>
          )}
        </div>

        {error && (
          <div className="w-full text-center p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-5 text-base sm:text-lg w-full max-w-xs">
          <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
            choice === "Homeowner"
              ? "border-blue-600 bg-blue-50/60 font-semibold text-blue-900 shadow-2xs"
              : "border-gray-200 hover:border-gray-300 text-gray-700"
          }`}>
            <input
              type="radio"
              name="choice"
              value="Homeowner"
              checked={choice === "Homeowner"}
              onChange={(e) => {
                setChoice(e.target.value);
                setError("");
              }}
              required
              className="accent-blue-600 w-4 h-4 cursor-pointer"
            />
            <span>🏠 I am a Homeowner</span>
          </label>

          <label className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
            choice === "Operator"
              ? "border-indigo-600 bg-indigo-50/60 font-semibold text-indigo-900 shadow-2xs"
              : "border-gray-200 hover:border-gray-300 text-gray-700"
          }`}>
            <input
              type="radio"
              name="choice"
              value="Operator"
              checked={choice === "Operator"}
              onChange={(e) => {
                setChoice(e.target.value);
                setError("");
              }}
              className="accent-indigo-600 w-4 h-4 cursor-pointer"
            />
            <span>⚡ I am an Operator</span>
          </label>
        </div>

        <div className="flex flex-col items-center gap-3 w-full">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white w-44 py-2.5 rounded-md text-base font-semibold transition cursor-pointer shadow-sm"
          >
            Submit & Enter
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs text-gray-500 hover:text-gray-800 hover:underline"
          >
            ← Back to credentials
          </button>
        </div>
      </div>
    </form>
  );
};

export default LogInfo;