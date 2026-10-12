"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { vehicles } from "@/config/catalog";
import { useConfigurator } from "@/store/configurator-store";

function format(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

export function AuditPanel() {
  const open = useConfigurator((s) => s.auditOpen);
  const setAuditOpen = useConfigurator((s) => s.setAuditOpen);
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const vehicle = vehicles[vehicleId];
  const { audit } = vehicle;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuditOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setAuditOpen]);

  return (
    <div
      className={`audit-overlay ${open ? "is-open" : ""}`}
      role="presentation"
      aria-hidden={!open}
      inert={!open ? true : undefined}
      onClick={() => setAuditOpen(false)}
    >
      <section
        className="audit-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="rail-kicker">GLB audit</p>
            <h2 id="audit-title">{audit.fileName}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setAuditOpen(false)}
            aria-label="Close audit"
          >
            <X size={16} />
          </button>
        </header>

        <dl className="audit-stats">
          <div>
            <dt>Size</dt>
            <dd>{audit.sizeMb.toFixed(1)} MB</dd>
          </div>
          <div>
            <dt>Triangles</dt>
            <dd>{format(audit.triangles)}</dd>
          </div>
          <div>
            <dt>Vertices</dt>
            <dd>{format(audit.vertices)}</dd>
          </div>
          <div>
            <dt>Nodes / meshes</dt>
            <dd>
              {audit.nodes} / {audit.meshes}
            </dd>
          </div>
          <div>
            <dt>Materials</dt>
            <dd>{audit.materials}</dd>
          </div>
          <div>
            <dt>Textures</dt>
            <dd>
              {audit.textures} · {audit.textureMb.toFixed(0)} MB
            </dd>
          </div>
        </dl>

        <h3>Issues for web delivery</h3>
        <ul className="audit-issues">
          {audit.issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>

        <h3>Configurator contract</h3>
        <p className="hint">
          Paint: {vehicle.paintMaterials.join(", ") || "—"} · Leather:{" "}
          {vehicle.leatherMaterials.join(", ") || "—"} · Calipers:{" "}
          {vehicle.caliperMaterials.join(", ") || "—"}
        </p>
      </section>
    </div>
  );
}
