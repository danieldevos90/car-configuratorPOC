"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import {
  vehicles,
  type ConfigPart,
  type ExclusivePartGroup,
  type VehicleDefinition,
} from "@/config/catalog";
import { calipers, interiors, paints, type Finish } from "@/config/finishes";
import { activeBuildId } from "@/lib/part-visibility";
import { DESKTOP_MEDIA } from "@/lib/scene-quality";
import type { CameraId } from "@/config/finishes";
import { useConfigurator, type ConfigSection } from "@/store/configurator-store";

const tabs: { section: ConfigSection; label: string }[] = [
  { section: "paint", label: "Exterior" },
  { section: "kit", label: "Parts" },
  { section: "interior", label: "Interior" },
  { section: "summary", label: "Summary" },
];

const categoryLabel: Record<string, string> = {
  kit: "Kit",
  wheels: "Wheels",
  lights: "Lights",
  interior: "Trim",
  mechanical: "Mechanical",
  body: "Body",
};

const optionCode = (index: number) => String.fromCharCode(65 + index);

function slotChoice(vehicle: VehicleDefinition, slot: ExclusivePartGroup, hidden: readonly string[]) {
  const index = Math.max(0, slot.partIds.findIndex((id) => !hidden.includes(id)));
  const part = vehicle.parts.find((item) => item.id === slot.partIds[index]);
  return { index, id: slot.partIds[index], label: part?.optionLabel ?? part?.label ?? "" };
}

function optionSwatch(part: ConfigPart, paintId: string, contrastPaintId: string) {
  const tone = part.finish?.tone;
  if (tone === "paint") return finishById(paints, paintId).color;
  if (tone === "contrast") return finishById(paints, contrastPaintId).color;
  return part.swatch;
}

function requiredSlots(vehicle: VehicleDefinition) {
  return (vehicle.exclusiveGroups ?? []).filter((group) => group.required);
}

function slotPartIds(vehicle: VehicleDefinition) {
  return new Set(requiredSlots(vehicle).flatMap((group) => group.partIds));
}

function finishById(list: Finish[], id: string) {
  return list.find((item) => item.id === id) ?? list[0];
}

function Swatches({
  value,
  onChange,
  labelPrefix = "",
}: {
  value: string;
  onChange: (id: string) => void;
  labelPrefix?: string;
}) {
  return (
    <div className="swatch-grid" role="radiogroup">
      {paints.map((item) => {
        const active = value === item.id;
        return (
          <div key={item.id} className="swatch-cell">
            <button
              type="button"
              role="radio"
              aria-checked={active}
              className={`swatch ${active ? "is-active" : ""}`}
              onClick={() => onChange(item.id)}
              aria-label={`${labelPrefix}${item.label}`}
              title={item.label}
            >
              <span style={{ background: item.color }} />
              {active && <Check size={12} aria-hidden />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function FinishChips({
  list,
  value,
  onChange,
  disabled,
}: {
  list: Finish[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="chip-grid" role="radiogroup">
      {list.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`chip ${active ? "is-active" : ""}`}
            onClick={() => onChange(item.id)}
            disabled={disabled}
          >
            <i style={{ background: item.color }} aria-hidden />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function PaintSection() {
  const vehicle = vehicles[useConfigurator((s) => s.vehicleId)];
  const paintId = useConfigurator((s) => s.paintId);
  const contrastPaintId = useConfigurator((s) => s.contrastPaintId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const setPaint = useConfigurator((s) => s.setPaint);
  const setContrastPaint = useConfigurator((s) => s.setContrastPaint);
  const setCaliper = useConfigurator((s) => s.setCaliper);
  const hasContrast = (vehicle.contrastPaintMaterials?.length ?? 0) > 0;
  const hasCalipers = vehicle.caliperMaterials.length > 0;

  return (
    <>
      <div className="option-block">
        <div className="option-head">
          <h2>Body colour</h2>
          <span>{finishById(paints, paintId).label}</span>
        </div>
        <Swatches value={paintId} onChange={setPaint} />
      </div>
      {hasContrast && (
        <div className="option-block">
          <div className="option-head">
            <h2>Contrast colour</h2>
            <span>{finishById(paints, contrastPaintId).label}</span>
          </div>
          <p className="hint">Duo-tone roof and window storage boxes.</p>
          <Swatches value={contrastPaintId} onChange={setContrastPaint} labelPrefix="Contrast " />
        </div>
      )}
      {hasCalipers && (
        <div className="option-block">
          <div className="option-head">
            <h2>Brake calipers</h2>
            <span>{finishById(calipers, caliperId).label}</span>
          </div>
          <FinishChips list={calipers} value={caliperId} onChange={setCaliper} />
        </div>
      )}
    </>
  );
}

function InteriorSection() {
  const vehicle = vehicles[useConfigurator((s) => s.vehicleId)];
  const interiorId = useConfigurator((s) => s.interiorId);
  const setInterior = useConfigurator((s) => s.setInterior);
  const hasLeather = vehicle.leatherMaterials.length > 0;
  return (
    <div className="option-block">
      <div className="option-head">
        <h2>Cabin leather</h2>
        <span>{finishById(interiors, interiorId).label}</span>
      </div>
      {!hasLeather && (
        <p className="hint">This model has no named leather materials.</p>
      )}
      <FinishChips
        list={interiors}
        value={interiorId}
        onChange={setInterior}
        disabled={!hasLeather}
      />
    </div>
  );
}

function BuildSection() {
  const vehicle = vehicles[useConfigurator((s) => s.vehicleId)];
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const selectedPartId = useConfigurator((s) => s.selectedPartId);
  const applyBuild = useConfigurator((s) => s.applyBuild);
  const togglePart = useConfigurator((s) => s.togglePart);
  const focusPart = useConfigurator((s) => s.focusPart);
  const paintId = useConfigurator((s) => s.paintId);
  const contrastPaintId = useConfigurator((s) => s.contrastPaintId);
  const currentBuild = activeBuildId(vehicle, hiddenPartIds);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedPartId]);

  return (
    <>
      <div className="option-block">
        <div className="option-head">
          <h2>Build</h2>
          <span>{vehicle.builds?.find((b) => b.id === currentBuild)?.label ?? "Custom"}</span>
        </div>
        <div className="segmented segmented--lg" role="radiogroup" aria-label="Build">
          {vehicle.builds?.map((build) => (
            <button
              key={build.id}
              type="button"
              role="radio"
              aria-checked={currentBuild === build.id}
              className={currentBuild === build.id ? "is-active" : ""}
              onClick={() => applyBuild(build.id)}
            >
              {build.label}
            </button>
          ))}
        </div>
        <p className="hint">
          {vehicle.builds?.find((b) => b.id === currentBuild)?.description ??
            "Custom mix of options."}
        </p>
      </div>

      <div className="option-block">
        <h2>Per part</h2>
        <div className="slot-list">
          {requiredSlots(vehicle).map((slot) => {
            const choice = slotChoice(vehicle, slot, hiddenPartIds);
            const selected = slot.partIds.includes(selectedPartId ?? "");
            return (
              <div
                key={slot.id}
                ref={selected ? selectedRef : undefined}
                className={`slot-row ${selected ? "is-selected" : ""}`}
                data-slot-id={slot.id}
              >
                <button
                  type="button"
                  className="slot-head"
                  onClick={() => focusPart(choice.id)}
                  title={`Show ${slot.label.toLowerCase()}`}
                >
                  <span>{slot.label}</span>
                  <small>
                    {optionCode(choice.index)} · {choice.label}
                  </small>
                </button>
                <div className="option-grid" role="radiogroup" aria-label={slot.label}>
                  {slot.partIds.map((id, index) => {
                    const part = vehicle.parts.find((item) => item.id === id);
                    if (!part) return null;
                    const on = id === choice.id;
                    const swatch = optionSwatch(part, paintId, contrastPaintId);
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`option-card ${on ? "is-active" : ""}`}
                        onClick={() => (on ? focusPart(id) : togglePart(id))}
                        title={part.description ?? part.optionLabel}
                      >
                        <span className="option-code" aria-hidden>
                          {optionCode(index)}
                        </span>
                        <span className="option-name">{part.optionLabel ?? part.label}</span>
                        {swatch ? (
                          <i className="option-swatch" style={{ background: swatch }} aria-hidden />
                        ) : part.nodeNames.length === 0 ? (
                          <i className="option-swatch is-none" aria-hidden />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SwitchRow({
  part,
  on,
  selected,
  onToggle,
  onFocus,
}: {
  part: ConfigPart;
  on: boolean;
  selected: boolean;
  onToggle: () => void;
  onFocus: () => void;
}) {
  return (
    <div className={`switch-row ${selected ? "is-selected" : ""}`}>
      <button type="button" className="switch-copy" onClick={onFocus}>
        <span>{part.label}</span>
        {part.description && <small>{part.description}</small>}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={part.label}
        className="switch"
        onClick={onToggle}
      >
        <span aria-hidden />
      </button>
    </div>
  );
}

function AccessoriesSection() {
  const vehicle = vehicles[useConfigurator((s) => s.vehicleId)];
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const selectedPartId = useConfigurator((s) => s.selectedPartId);
  const togglePart = useConfigurator((s) => s.togglePart);
  const focusPart = useConfigurator((s) => s.focusPart);
  const accessories = vehicle.parts.filter((part) => part.accessory);
  if (!accessories.length) return null;
  return (
    <div className="option-block">
      <h2>Accessories</h2>
      <div className="switch-list">
        {accessories.map((part) => (
          <SwitchRow
            key={part.id}
            part={part}
            on={!hiddenPartIds.includes(part.id)}
            selected={selectedPartId === part.id}
            onToggle={() => togglePart(part.id)}
            onFocus={() => focusPart(part.id)}
          />
        ))}
      </div>
    </div>
  );
}

/** Visibility toggles for model review (body, engine, interior…). */
function InspectorSection({ collapsible }: { collapsible: boolean }) {
  const vehicle = vehicles[useConfigurator((s) => s.vehicleId)];
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const selectedPartId = useConfigurator((s) => s.selectedPartId);
  const togglePart = useConfigurator((s) => s.togglePart);
  const setSelectedPart = useConfigurator((s) => s.setSelectedPart);
  const groups = useMemo(() => {
    const slots = slotPartIds(vehicle);
    const map = new Map<string, ConfigPart[]>();
    for (const part of vehicle.parts) {
      if (slots.has(part.id) || part.accessory) continue;
      const list = map.get(part.category) ?? [];
      list.push(part);
      map.set(part.category, list);
    }
    return [...map.entries()];
  }, [vehicle]);
  if (!groups.length) return null;

  const body = groups.map(([category, parts]) => (
    <div key={category} className="part-group">
      <h3>{categoryLabel[category] ?? category}</h3>
      {parts.map((part) => {
        const on = !hiddenPartIds.includes(part.id);
        return (
          <div
            key={part.id}
            className={`part-row ${on ? "is-on" : ""} ${selectedPartId === part.id ? "is-selected" : ""}`}
          >
            <button
              type="button"
              className="part-row-main"
              onClick={() => setSelectedPart(part.id)}
              aria-pressed={selectedPartId === part.id}
            >
              <span>{part.label}</span>
            </button>
            <button
              type="button"
              className="part-row-toggle"
              aria-label={`${on ? "Hide" : "Show"} ${part.label}`}
              aria-pressed={on}
              onClick={() => togglePart(part.id)}
            >
              {on ? "On" : "Off"}
            </button>
          </div>
        );
      })}
    </div>
  ));

  if (!collapsible) return <div className="option-block">{body}</div>;
  return (
    <details className="inspector">
      <summary>Model inspector</summary>
      {body}
    </details>
  );
}

function SummarySection() {
  const vehicle = vehicles[useConfigurator((s) => s.vehicleId)];
  const paintId = useConfigurator((s) => s.paintId);
  const contrastPaintId = useConfigurator((s) => s.contrastPaintId);
  const interiorId = useConfigurator((s) => s.interiorId);
  const caliperId = useConfigurator((s) => s.caliperId);
  const hiddenPartIds = useConfigurator((s) => s.hiddenPartIds);
  const resetConfiguration = useConfigurator((s) => s.resetConfiguration);
  const setConfigSection = useConfigurator((s) => s.setConfigSection);
  const hidden = new Set(hiddenPartIds);
  const build = vehicle.builds?.find((b) => b.id === activeBuildId(vehicle, hiddenPartIds));
  const accessories = vehicle.parts.filter((part) => part.accessory);
  const hasContrast = (vehicle.contrastPaintMaterials?.length ?? 0) > 0;

  const rows: { section: ConfigSection; title: string; items: [string, string][] }[] = [
    {
      section: "paint",
      title: "Exterior",
      items: [
        ["Body colour", finishById(paints, paintId).label],
        ...(hasContrast
          ? ([["Contrast colour", finishById(paints, contrastPaintId).label]] as [string, string][])
          : []),
        ...(vehicle.caliperMaterials.length
          ? ([["Brake calipers", finishById(calipers, caliperId).label]] as [string, string][])
          : []),
      ],
    },
    ...(vehicle.builds?.length
      ? [
          {
            section: "kit" as const,
            title: `Parts · ${build?.label ?? "Custom"}`,
            items: requiredSlots(vehicle).map((slot): [string, string] => {
              const choice = slotChoice(vehicle, slot, hiddenPartIds);
              return [slot.label, `${optionCode(choice.index)} · ${choice.label}`];
            }),
          },
        ]
      : []),
    ...(accessories.length
      ? [
          {
            section: "kit" as const,
            title: "Accessories",
            items: accessories.map((part): [string, string] => [
              part.label,
              hidden.has(part.id) ? "—" : "Included",
            ]),
          },
        ]
      : []),
    {
      section: "interior",
      title: "Interior",
      items: [["Cabin leather", finishById(interiors, interiorId).label]],
    },
  ];

  return (
    <>
      {rows.map((row, index) => (
        <section key={row.title} className="summary-block">
          <header>
            <h2>
              <span>{String(index + 1).padStart(2, "0")}</span> {row.title}
            </h2>
            <button type="button" className="link-btn" onClick={() => setConfigSection(row.section)}>
              Edit
            </button>
          </header>
          <dl>
            {row.items.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className={value === "—" ? "is-muted" : ""}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <button type="button" className="ghost-btn" onClick={resetConfiguration}>
        <RotateCcw size={14} aria-hidden />
        Reset configuration
      </button>
    </>
  );
}

/** Offset of `node` inside the scroll container's content box. */
function offsetIn(container: HTMLElement, node: HTMLElement) {
  return (
    node.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop
  );
}

/** Scroll events from programmatic jumps are ignored for this long. */
const JUMP_LOCK_MS = 1800;

function cameraForKitSlot(slotId: string): CameraId {
  return slotId === "wheels" ? "wheels" : "three-quarter";
}

function syncKitSlotCamera(container: HTMLElement) {
  const anchor = container.scrollTop + 80;
  let slotId: string | null = null;
  let bestTop = -Infinity;
  container.querySelectorAll<HTMLElement>("[data-slot-id]").forEach((row) => {
    const top = offsetIn(container, row);
    if (top <= anchor && top > bestTop) {
      bestTop = top;
      slotId = row.dataset.slotId ?? null;
    }
  });
  if (!slotId) return;
  const next = cameraForKitSlot(slotId);
  const { cameraId, setCamera } = useConfigurator.getState();
  if (cameraId !== next) setCamera(next);
}

export function ConfigRail() {
  const [mobile, setMobile] = useState(false);
  const vehicleId = useConfigurator((s) => s.vehicleId);
  const panelOpen = useConfigurator((s) => s.panelOpen);
  const configSection = useConfigurator((s) => s.configSection);
  const setConfigSection = useConfigurator((s) => s.setConfigSection);
  const setActiveSection = useConfigurator((s) => s.setActiveSection);
  const vehicle = vehicles[vehicleId];
  const hasBuilds = (vehicle.builds?.length ?? 0) > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Partial<Record<ConfigSection, HTMLElement | null>>>({});
  const spiedSection = useRef<ConfigSection | null>(null);
  const jumpLockUntil = useRef(0);

  useLayoutEffect(() => {
    const query = window.matchMedia(DESKTOP_MEDIA);
    const sync = () => setMobile(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /** Section changes from elsewhere (tabs, 3D pick, cabin camera, Edit links) scroll the page. */
  useEffect(() => {
    if (spiedSection.current === configSection) {
      spiedSection.current = null;
      return;
    }
    const container = scrollRef.current;
    const selectedRow =
      configSection === "kit"
        ? container?.querySelector<HTMLElement>(".slot-row.is-selected, .switch-row.is-selected")
        : null;
    const target = selectedRow ?? sectionRefs.current[configSection];
    if (!container || !target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    jumpLockUntil.current = performance.now() + JUMP_LOCK_MS;
    container.scrollTo({
      top: Math.max(0, offsetIn(container, target) - (selectedRow ? 48 : 0)),
      behavior: reduced ? "auto" : "smooth",
    });
    if (configSection === "kit") {
      window.setTimeout(() => {
        if (scrollRef.current) syncKitSlotCamera(scrollRef.current);
      }, JUMP_LOCK_MS);
    }
  }, [configSection]);

  function onScroll() {
    const container = scrollRef.current;
    if (!container || performance.now() < jumpLockUntil.current) return;
    let current = tabs[0].section;
    for (const { section } of tabs) {
      const node = sectionRefs.current[section];
      if (node && offsetIn(container, node) <= container.scrollTop + 32) current = section;
    }
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
      current = tabs[tabs.length - 1].section;
    }
    const state = useConfigurator.getState();
    if (current !== state.configSection) {
      spiedSection.current = current;
      setActiveSection(current);
    }
    if (current === "kit") syncKitSlotCamera(container);
  }

  if (!vehicle) return null;

  return (
    <aside
      id="config-rail"
      className={`config-rail ${mobile ? "is-sheet" : ""}`}
      aria-label="Configurator"
      aria-hidden={!panelOpen}
      inert={!panelOpen ? true : undefined}
    >
      <div className="rail-head">
        <div>
          <p className="rail-kicker">{vehicle.year}</p>
          <h1>{vehicle.name}</h1>
          {!mobile && <p className="rail-sub">{vehicle.subtitle}</p>}
        </div>
      </div>

      <nav className="rail-tabs" aria-label="Configurator sections">
        {tabs.map((item) => (
          <button
            key={item.section}
            type="button"
            aria-current={configSection === item.section ? "true" : undefined}
            className={configSection === item.section ? "is-active" : ""}
            onClick={() => setConfigSection(item.section)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="rail-scroll" ref={scrollRef} onScroll={onScroll}>
        {tabs.map((item, index) => (
          <section
            key={item.section}
            ref={(node) => {
              sectionRefs.current[item.section] = node;
            }}
            className="rail-page"
            aria-labelledby={`rail-page-${item.section}`}
          >
            <h2 className="rail-page-title" id={`rail-page-${item.section}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </h2>
            {item.section === "paint" && <PaintSection />}
            {item.section === "kit" &&
              (hasBuilds ? (
                <>
                  <BuildSection />
                  <AccessoriesSection />
                  <InspectorSection collapsible />
                </>
              ) : (
                <InspectorSection collapsible={false} />
              ))}
            {item.section === "interior" && <InteriorSection />}
            {item.section === "summary" && <SummarySection />}
          </section>
        ))}
      </div>
    </aside>
  );
}
