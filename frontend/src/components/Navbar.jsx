import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/IMG_0426.jpg";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const linkStyle = ({ isActive }) =>
    isActive
      ? "text-blue-600 border-b-2 border-blue-600 pb-1"
      : "text-gray-700 hover:text-blue-600 pb-1";

  const handleProtectedClick = (e, pageName, destinationPath) => {
    if (!isAuthenticated) {
      e.preventDefault();
      navigate("/", {
        state: {
          requiresAuth: true,
          message: `🔒 Access restricted: Please submit your login to view the ${pageName} page.`,
        },
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", {
      state: {
        message: "You have been logged out successfully.",
      },
    });
  };

  return (
    <nav className="flex flex-col sm:flex-row items-center justify-between py-4 px-4 sm:px-6 border-b border-gray-300 gap-3">
      {/* Gives an icon and brand */}
      <NavLink to="/" className="flex items-center gap-2">
        <img
          src={logo}
          alt="Grid Pulse logo"
          className="h-8 w-8 rounded-full object-cover"
        />
        <span className="font-bold text-gray-700 text-base">Grid Pulse</span>
      </NavLink>

      {/* Navigation Links and Auth Controls */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-medium">
        <ul className="flex items-center gap-5">
          <li>
            <NavLink to="/" className={linkStyle}>
              HOME
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/Homeowner"
              onClick={(e) => handleProtectedClick(e, "Homeowner", "/Homeowner")}
              className={linkStyle}
              title={!isAuthenticated ? "Login required to access" : "Homeowner dashboard"}
            >
              <span className="flex items-center gap-1">
                HOMEOWNER
                {!isAuthenticated && (
                  <span className="text-[10px] text-gray-400" title="Login required">🔒</span>
                )}
              </span>
            </NavLink>
          </li>

          <li>
            <NavLink
              to="/operator"
              onClick={(e) => handleProtectedClick(e, "Operator", "/operator")}
              className={linkStyle}
              title={!isAuthenticated ? "Login required to access" : "Operator dashboard"}
            >
              <span className="flex items-center gap-1">
                OPERATOR
                {!isAuthenticated && (
                  <span className="text-[10px] text-gray-400" title="Login required">🔒</span>
                )}
              </span>
            </NavLink>
          </li>
        </ul>

        {/* User Status / Logout Button */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2.5 pl-2 border-l border-gray-300">
            <div className="flex items-center gap-1.5 bg-gray-100 py-1 px-2.5 rounded-lg text-gray-700 text-[11px]">
              <span className="font-semibold text-gray-900 truncate max-w-[120px]">{user.name}</span>
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold text-[10px]">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded text-xs font-semibold transition"
              title="Log out of Grid Pulse"
            >
              Log Out
            </button>
          </div>
        ) : (
          <div className="pl-2 border-l border-gray-300">
            <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              🔒 Not Logged In
            </span>
          </div>
        )}
      </div>
    </nav>
  );
};

// Export puts Navbar on the page
export default Navbar;