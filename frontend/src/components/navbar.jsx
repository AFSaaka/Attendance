import udsLogo from "../assets/udslogo.ico";

const Navbar = ({ onLogout, userEmail }) => {
  return (
    <nav className="bg-white px-[5%] py-2.5 flex justify-between items-center shadow-md sticky top-0 z-1000">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2.5">
        <img src={udsLogo} alt="UDS" className="w-9" />
        <span className="font-bold text-[#198104] text-lg">
          TTFPP Attendance Portal
        </span>
      </div>

      {/* Right: Email + Logout */}
      <div className="flex items-center gap-5">
        {userEmail && (
          <span className="text-[13px] text-gray-500 hidden sm:block">
            {userEmail}
          </span>
        )}
        <button
          onClick={onLogout}
          className="bg-red-50 hover:bg-red-600 border border-red-300 text-red-600 hover:text-white px-4 py-1.5 rounded-md text-[13px] font-semibold cursor-pointer transition-all duration-300"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
