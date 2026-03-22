const Footer = () => {
  return (
    <footer className="text-center py-6 text-gray-400 text-[13px] border-t border-gray-100 bg-white mt-auto">
      <p className="m-0">
        &copy; {new Date().getFullYear()} University for Development Studies
      </p>
      <p className="mt-1 text-[11px]">
        Third Trimester Field Practical Programme (TTFPP) Management System
      </p>
    </footer>
  );
};

export default Footer;
