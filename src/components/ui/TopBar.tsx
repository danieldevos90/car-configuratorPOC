"use client";

import { Gauge, ScanSearch } from "lucide-react";
import { vehicles } from "@/config/catalog";
import { useConfigurator } from "@/store/configurator-store";

export function TopBar() {
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const auditOpen = useConfigurator((s) => s.auditOpen);
  const setAuditOpen = useConfigurator((s) => s.setAuditOpen);
  const vehicle = vehicles[vehicleId];

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">GW</span>
        <div>
          <p className="brand-kicker">Gelände Werke</p>
          <p className="brand-title">Configurator atelier</p>
        </div>
      </div>

      <div className="topbar-title" aria-hidden>
        <p className="topbar-title-main">{vehicle.name}</p>
        <p className="topbar-title-sub">{vehicle.subtitle}</p>
      </div>

      <div className="topbar-meta">
        <p>
          <Gauge size={14} aria-hidden />
          {(vehicle.audit.triangles / 1_000_000).toFixed(1)}M tris
        </p>
        <button
          type="button"
          className="icon-btn"
          aria-pressed={auditOpen}
          aria-label={auditOpen ? "Close GLB audit" : "Open GLB audit"}
          onClick={() => setAuditOpen(!auditOpen)}
        >
          <ScanSearch size={16} />
          <span className="btn-label">Audit</span>
        </button>
      </div>
    </header>
  );
}
