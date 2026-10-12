"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { vehicles } from "@/config/catalog";
import { calipers, interiors, paints } from "@/config/finishes";
import { useConfigurator } from "@/store/configurator-store";

const tabs = ["Paint", "Interior", "Kit"] as const;

const categoryLabel: Record<string, string> = {
  kit: "Kit",
  wheels: "Wheels",
  lights: "Lights",
  interior: "Trim",
  mechanical: "Mechanical",
  body: "Body",
};

type MobileStep =
  | { id: string; label: string; kind: "paint" | "calipers" | "interior" }
  | {
      id: string;
      label: string;
      kind: "parts";
      parts: (typeof vehicles)["retro"]["parts"];
    };

function chunk<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

export function ConfigRail() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Paint");
  const [mobile, setMobile] = useState(false);
  const [step, setStep] = useState(0);
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const paintId = useConfigurator((s) => s.paintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const selectedPartId = useConfigurator((s) => s.selectedPartId);
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const setPaint = useConfigurator((s) => s.setPaint);
  const setInterior = useConfigurator((s) => s.setInterior);
  const setCamera = useConfigurator((s) => s.setCamera);
  const setCaliper = useConfigurator((s) => s.setCaliper);
  const togglePart = useConfigurator((s) => s.togglePart);
  const setSelectedPart = useConfigurator((s) => s.setSelectedPart);

  const vehicle = vehicles[vehicleId];
  const paint = paints.find((item) => item.id === paintId);
  const groupedParts = useMemo(() => {
    const groups = new Map<string, typeof vehicle.parts>();
    for (const part of vehicle.parts) {
      const list = groups.get(part.category) ?? [];
      list.push(part);
      groups.set(part.category, list);
    }
    return [...groups.entries()];
  }, [vehicle]);

  const mobileSteps = useMemo(() => {
    const list: MobileStep[] = [{ id: "paint", label: "Colour", kind: "paint" }];
    if (vehicle.caliperMaterials.length > 0) {
      list.push({ id: "calipers", label: "Calipers", kind: "calipers" });
    }
    list.push({ id: "interior", label: "Cabin", kind: "interior" });
    for (const [category, parts] of groupedParts) {
      const name = categoryLabel[category] ?? category;
      const groups = chunk(parts, 4);
      groups.forEach((group, index) => {
        list.push({
          id: `${category}-${index}`,
          label: groups.length > 1 ? `${name} ${index + 1}` : name,
          kind: "parts",
          parts: group,
        });
      });
    }
    return list;
  }, [groupedParts, vehicle.caliperMaterials.length]);

  useLayoutEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const stepIndex = Math.min(step, Math.max(mobileSteps.length - 1, 0));
  const currentStep = mobileSteps[stepIndex];

  function goToStep(next: number) {
    const clamped = Math.max(0, Math.min(next, mobileSteps.length - 1));
    setStep(clamped);
    if (mobileSteps[clamped]?.kind === "interior") setCamera("cabin");
  }

  if (!vehicle || !currentStep) return null;

  return (
    <aside
      id="config-rail"
      className={`config-rail ${mobile ? "is-stepped" : ""}`}
      aria-label="Configurator"
      aria-hidden={!panelOpen}
      inert={!panelOpen ? true : undefined}
    >
      <div className="rail-head">
        <p className="rail-kicker">{vehicle.year}</p>
        <h1>{vehicle.name}</h1>
        <p className="rail-sub">{vehicle.subtitle}</p>
      </div>

      {mobile ? (
        <div className="rail-steps" aria-label="Configurator steps">
          <button
            type="button"
            className="step-nav"
            aria-label="Previous step"
            disabled={stepIndex === 0}
            onClick={() => goToStep(stepIndex - 1)}
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <div className="step-copy">
            <p className="rail-kicker">
              {stepIndex + 1} / {mobileSteps.length}
            </p>
            <p className="step-title">{currentStep.label}</p>
          </div>
          <button
            type="button"
            className="step-nav"
            aria-label="Next step"
            disabled={stepIndex === mobileSteps.length - 1}
            onClick={() => goToStep(stepIndex + 1)}
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="rail-tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "is-active" : ""}
              onClick={() => {
                setTab(item);
                if (item === "Interior") setCamera("cabin");
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {((mobile && currentStep.kind === "paint") || (!mobile && tab === "Paint")) && (
        <section className="rail-section">
          <h2>Body colour</h2>
          <p className="hint">
            Maps to {vehicle.paintMaterials.join(", ") || "unnamed paint"} in the
            GLB.
          </p>
          <div className="swatch-grid">
            {paints.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`swatch ${paintId === item.id ? "is-active" : ""}`}
                onClick={() => setPaint(item.id)}
                aria-pressed={paintId === item.id}
                aria-label={item.label}
              >
                <span style={{ background: item.color }} />
                {paintId === item.id && <Check size={12} />}
              </button>
            ))}
          </div>
          <p className="swatch-label">{paint?.label}</p>

          {!mobile && vehicle.caliperMaterials.length > 0 && (
            <>
              <h2>Calipers</h2>
              <div className="choice-list">
                {calipers.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={caliperId === item.id ? "is-active" : ""}
                    onClick={() => setCaliper(item.id)}
                  >
                    <i style={{ background: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {mobile && currentStep.kind === "calipers" && (
        <section className="rail-section">
          <div className="choice-list">
            {calipers.map((item) => (
              <button
                key={item.id}
                type="button"
                className={caliperId === item.id ? "is-active" : ""}
                onClick={() => setCaliper(item.id)}
              >
                <i style={{ background: item.color }} />
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {((mobile && currentStep.kind === "interior") ||
        (!mobile && tab === "Interior")) && (
        <section className="rail-section">
          <h2>Cabin leather</h2>
          <p className="hint">
            {vehicle.leatherMaterials.length
              ? "Applies to seat and perforation materials."
              : "This GLB has no named leather materials — paint still live-updates."}
          </p>
          <div className="choice-list">
            {interiors.map((item) => (
              <button
                key={item.id}
                type="button"
                className={interiorId === item.id ? "is-active" : ""}
                onClick={() => setInterior(item.id)}
                disabled={vehicle.leatherMaterials.length === 0}
              >
                <i style={{ background: item.color }} />
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {!mobile && tab === "Kit" && (
        <section className="rail-section">
          <h2>Named groups</h2>
          <p className="hint">Click the model or toggle a group from the GLB node tree.</p>
          {groupedParts.map(([category, parts]) => (
            <div key={category} className="part-group">
              <h3>{category}</h3>
              {parts.map((part) => {
                const on = !hiddenPartIds.includes(part.id);
                const selected = selectedPartId === part.id;
                return (
                  <button
                    key={part.id}
                    type="button"
                    className={`part-row ${on ? "is-on" : ""} ${selected ? "is-selected" : ""}`}
                    onClick={() => {
                      setSelectedPart(part.id);
                      togglePart(part.id);
                    }}
                    aria-pressed={on}
                  >
                    <span>{part.label}</span>
                    <small>{part.nodeNames.length} nodes</small>
                  </button>
                );
              })}
            </div>
          ))}
        </section>
      )}

      {mobile && currentStep.kind === "parts" && (
        <section className="rail-section">
          <div className="choice-list">
            {currentStep.parts.map((part) => {
              const on = !hiddenPartIds.includes(part.id);
              const selected = selectedPartId === part.id;
              return (
                <button
                  key={part.id}
                  type="button"
                  className={`part-row ${on ? "is-on" : ""} ${selected ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedPart(part.id);
                    togglePart(part.id);
                  }}
                  aria-pressed={on}
                >
                  <span>{part.label}</span>
                  <small>{part.nodeNames.length}</small>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </aside>
  );
}
