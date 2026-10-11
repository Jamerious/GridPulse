import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LogInfo = () => {
  const [choice, setChoice] = useState("");

  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();

    // Only continue if the user chose an option
    if (choice === "Homeowner") {
      navigate("/Homeowner");
    } else if (choice === "Operator"){
      navigate("/operator");
    };
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="page-transition min-h-[80vh] flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-10 p-14 min-w-[340px] sm:min-w-[460px] border rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold">Logging in as?</h1>

        <div className="flex flex-col gap-6 text-lg">
          <label>
            {/* Gives bubble select choice */}
            <input
              type="radio"
              name="choice"
              value="Homeowner"
              onChange={(e) => setChoice(e.target.value)}
              required
            />
            {" "}I am a Homeowner
          </label>

          <label>
            {/* Gives bubble select choice */}
            <input
              type="radio"
              name="choice"
              value="Operator"
              onChange={(e) => setChoice(e.target.value)}
            />
            {" "}I am an Operator
          </label>
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white w-40 py-2 rounded-md text-base"
        >
          Submit
        </button>
      </div>
    </form>
  );
};

export default LogInfo;