"use client";

import { Gauge, ScanSearch } from "lucide-react";
import { vehicles } from "@/config/catalog";
import { useConfigurator } from "@/store/configurator-store";

export function TopBar() {
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const setVehicle = useConfigurator((s) => s.setVehicle);
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

      <div className="model-switch" role="tablist" aria-label="Vehicle">
        {Object.values(vehicles).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === vehicleId}
            className={item.id === vehicleId ? "is-active" : ""}
            onClick={() => setVehicle(item.id)}
          >
            {item.id === "retro" ? "Retro" : "OEM"}
          </button>
        ))}
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
