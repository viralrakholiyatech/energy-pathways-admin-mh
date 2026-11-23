import React from "react";

const Footer = () => {
  return (
    <footer className="mt-auto py-5 px-6 lg:px-8 border-t border-gray-200/80 bg-transparent flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
      <div>
        © 2026 MP Energy Pathways. All rights reserved.
      </div>
      {/* <div className="flex items-center gap-4">
        <button className="hover:text-gray-800 transition">Privacy</button>
        <span className="text-gray-300">|</span>
        <button className="hover:text-gray-800 transition">Terms</button>
        <span className="text-gray-300">|</span>
        <button className="hover:text-gray-800 transition">Support</button>
      </div> */}
    </footer>
  );
};

export default Footer;
