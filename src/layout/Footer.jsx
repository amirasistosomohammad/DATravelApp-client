import React from "react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 bg-light mt-auto">
      <div className="container-fluid px-4">
        <div className="d-flex align-items-center justify-content-between small">
          <div className="text-muted">
            &copy; {currentYear} DATravelApp: AN OFFICIAL TRAVEL ORDER
            MANAGEMENT SYSTEM. All rights reserved.
          </div>
        </div>
      </div>
    </footer>   
  );
};

export default Footer;
