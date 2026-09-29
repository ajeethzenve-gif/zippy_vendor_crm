import zippyLogo from "../assest/logo/zippy_logo.jpeg";
import React from "react";
import "../styles/Header.css";

/* =========================================================
   SEARCH ICON
========================================================= */




/* =========================================================
   USER ICON
========================================================= */

function UserIcon() {
  return (
    <svg
      className="user-icon-svg"
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M5 20C5.8 16.5 8.2 14.5 12 14.5C15.8 14.5 18.2 16.5 19 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


/* =========================================================
   HEADER COMPONENT
========================================================= */

function Header() {
  return (
    <header className="dashboard-header">

      {/* =====================================================
          HEADER TOP
      ===================================================== */}

      <div className="header-top">

        {/* ===================================================
            LEFT SIDE
        =================================================== */}

        <div className="brand-section">

          {/* Logo */}

          <div className="brand-logo">
            <img
              src={zippyLogo}
              alt="Zippy Vendor CRM"
            />
          </div>


          {/* Title */}

          <h1 className="brand-title">
            Zippy Vendor CRM
          </h1>

        </div>


        {/* ===================================================
            RIGHT SIDE
        =================================================== */}

        <div className="header-actions">

          {/* =================================================
              SEARCH
          ================================================= */}




        </div>

      </div>

    </header>
  );
}

export default Header;