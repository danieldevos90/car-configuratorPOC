"use client";

import { Gauge, ScanSearch } from "lucide-react";
import { buildPresetList } from "@/config/build-presets";
import { vehicles } from "@/config/catalog";
import { useConfigurator } from "@/store/configurator-store";

export function TopBar() {
  const buildPresetId = useConfigurator((s) => s.buildPresetId);
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const setBuildPreset = useConfigurator((s) => s.setBuildPreset);
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

      <div className="model-switch" role="tablist" aria-label="Build">
        {buildPresetList.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="tab"
            aria-selected={preset.id === buildPresetId}
            title={preset.description}
            className={preset.id === buildPresetId ? "is-active" : ""}
            onClick={() => setBuildPreset(preset.id)}
          >
            {preset.label}
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
