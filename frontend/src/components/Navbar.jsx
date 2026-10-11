import { NavLink } from "react-router-dom";
import logo from "../assets/IMG_0426.jpg";

const Navbar = () => {
  const linkStyle = ({ isActive }) =>
    isActive
      ? "text-blue-600 border-b-2 border-blue-600 pb-1"
      : "text-gray-700 hover:text-blue-600 pb-1";

  return (
    <nav className="flex items-center justify-between py-4 px-6 border-b border-gray-300">
      {/* Gives an icon */}
      <NavLink to="/" className="flex items-center gap-2">
        <img
          src={logo}
          alt="Grid Pulse logo"
          className="h-8 w-8 rounded-full object-cover"
        />

        <span className="font-bold text-gray-700">Grid Pulse</span>
      </NavLink>

      {/* Adding items to the navigation bar */}
      <ul className="flex items-center gap-6 text-xs font-medium">
        <li>
          <NavLink to="/" className={linkStyle}>
            HOME
          </NavLink>
        </li>

        <li>
          <NavLink to="/contact" className={linkStyle}>
            CONTACT
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

// Export puts Navbar on the page
export default Navbar;