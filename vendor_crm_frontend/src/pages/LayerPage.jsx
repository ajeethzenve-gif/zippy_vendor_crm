import React from "react";
import { Link, useNavigate } from "react-router-dom";

import SearchBar from "../components/SearchBar";


export default function LayerPage({ layer }) {
  const navigate = useNavigate();

  return (
    <div className="layer-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="layer-header">
        <div className="layer-header-content">
          {/* Title */}
          <section className="layer-head">
            <div className="layer-tag">
              {layer.group} · {layer.n}
            </div>

            <h1>
              {layer.name}
            </h1>

            <p>
              {layer.detail}
            </p>
          </section>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="wrap">

        <section className="layer-body">

          {/* =================================================
              STAT
          ================================================= */}

          <div className="layer-stat-block">

            <div className="stat-value">
              {layer.stat.value}
            </div>

            <div className="stat-label">
              {layer.stat.label}
            </div>

            <div className="stat-sub">
              {layer.stat.sub}
            </div>

          </div>

          {/* =================================================
              CURRENT RECORDS
          ================================================= */}

          <div>

            <p className="layer-table-title">
              Current records
            </p>

            <div className="layer-table">

              {layer.rows.map((r, i) => (
                <div
                  className="layer-table-row"
                  key={i}
                >

                  <div>

                    <div className="name">
                      {r.label}
                    </div>

                    <div className="note">
                      {r.note}
                    </div>

                  </div>

                  <span
                    className={`pill ${
                      /needs|pending|changes/i.test(r.tag)
                        ? "warn"
                        : ""
                    }`}
                  >
                    {r.tag}
                  </span>

                </div>
              ))}

            </div>

          </div>

        </section>

        {/* =================================================
            FOOTER NOTE
        ================================================= */}

        <div className="footer-note">

          This is a static preview layer in the clone.{" "}

          <Link
            to="/storefront"
            style={{
              color: "var(--brass-deep)",
            }}
          >
            The Storefront layer
          </Link>{" "}
          is fully interactive.

        </div>

      </div>

    </div>
  );
}