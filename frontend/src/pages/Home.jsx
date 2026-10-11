import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const Home = () => {
  const [state] = useState("Sign up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //navigate to another page
  const navigate = useNavigate();

  const onSubmitHandler = (event) => {
    event.preventDefault();

if (name && email && password) {
  //was a dash separating them before
      navigate("/LogInfo");
    }

  };

  return (
    <form
    /*makes the welcome in the center*/
       onSubmit={onSubmitHandler}
  className="min-h-[80vh] flex flex-col items-center justify-center gap-4"
    >

      <h1 className="text-3xl font-bold">Welcome</h1>


      <div className="flex flex-col gap-3 p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg">
        

        <p className="text-2xl font-semibold">
          {state === "Sign up" ? "Log in" : "Login"}
        </p>

        <p>Please use your credentials to log in</p>

        <div>
          <p>Full Name</p>
          <input
            type="text"
            onChange={(e) => setName(e.target.value)}
            value={name}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded"
          />
        </div>

        <div>
          <p>Email</p>
          <input
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded"
          />
        </div>

        <div>
          <p>Password</p>
          <input
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            required
            className="w-full px-3 py-2 border border-zinc-300 rounded"
          />
        </div>
{/*button stuff */}
        <button
          type="submit"
          
          //*w-40 sets to a specific width

          className="bg-blue-500 text-white w-40 py-2 rounded-md text-base"
        >
          {state === "Sign up" ? "Log in" : "Login"}
        </button>
      </div>
    </form>
  );
};

export default Home;