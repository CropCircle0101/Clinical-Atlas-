"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as LibreMap } from "maplibre-gl";
import { Expand, LocateFixed, MapPin, Search, LoaderCircle, Info } from "lucide-react";
import type { Clinic } from "@/lib/types";

export default function ClinicMap({
  clinics,
  selectedId,
  onSelect,
  onSearchArea,
}: {
  clinics: Clinic[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSearchArea: (bounds: [number, number, number, number]) => void;
}) {
  const container = useRef<HTMLDivElement>(null),
    mapRef = useRef<LibreMap | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(false),
    [moved, setMoved] = useState(false);
  const clinicsRef = useRef(clinics),
    onSelectRef = useRef(onSelect);
  clinicsRef.current = clinics;
  onSelectRef.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    let map: LibreMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        style:
          process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
          "https://tiles.stadiamaps.com/styles/alidade_smooth.json",
        center: [-98.8, 38.7],
        zoom: 3.15,
        minZoom: 1.5,
        maxZoom: 16,
        attributionControl: { compact: true },
        renderWorldCopies: false,
      });
    } catch {
      setError(true);
      return;
    }
    mapRef.current = map;
    let initialized = false,
      initialFit = false;
    const fitInitial = () => {
      if (initialized && !initialFit && container.current && container.current.clientWidth > 100) {
        map.fitBounds(
          [
            [-125, 24],
            [-66, 50],
          ],
          { padding: 30, duration: 0 },
        );
        initialFit = true;
      }
    };
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("error", () => setError(true));
    map.on("dragend", () => setMoved(true));
    map.on("zoomend", () => setMoved(true));
    map.on("load", () => {
      setError(false);
      map.addSource("clinics", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 38,
      });
      map.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "clinics",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0e7971",
          "circle-radius": ["step", ["get", "point_count"], 24, 10, 29],
          "circle-opacity": 0.13,
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "clinics",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#126f68",
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 23],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "clinics",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Open Sans Bold"],
          "text-size": 12,
        },
        paint: { "text-color": "#fff" },
      });
      map.addLayer({
        id: "point-glow",
        type: "circle",
        source: "clinics",
        filter: ["!", ["has", "point_count"]],
        paint: { "circle-color": "#24867c", "circle-radius": 17, "circle-opacity": 0.12 },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: "clinics",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#16786d",
          "circle-radius": 10,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      map.addLayer({
        id: "point-numbers",
        type: "symbol",
        source: "clinics",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["to-string", ["get", "number"]],
          "text-font": ["Open Sans Bold"],
          "text-size": 10,
        },
        paint: { "text-color": "#fff" },
      });
      map.addLayer({
        id: "selected",
        type: "circle",
        source: "clinics",
        filter: ["==", ["get", "id"], ""],
        paint: {
          "circle-color": "#182c3c",
          "circle-radius": 13,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 3,
        },
      });
      map.addLayer({
        id: "selected-number",
        type: "symbol",
        source: "clinics",
        filter: ["==", ["get", "id"], ""],
        layout: {
          "text-field": ["to-string", ["get", "number"]],
          "text-font": ["Open Sans Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#fff" },
      });
      map.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f || f.geometry.type !== "Point") return;
        try {
          const zoom = await (map.getSource("clinics") as GeoJSONSource).getClusterExpansionZoom(
            Number(f.properties.cluster_id),
          );
          map.easeTo({ center: f.geometry.coordinates as [number, number], zoom });
        } catch {
          /* A replaced source can invalidate an in-flight cluster. */
        }
      });
      for (const layer of ["points", "selected"]) {
        map.on("click", layer, (e) => {
          const id = e.features?.[0]?.properties.id;
          if (id) onSelectRef.current(String(id));
        });
      }
      for (const layer of ["clusters", "points", "selected"]) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }
      initialized = true;
      fitInitial();
      setReady(true);
    });
    const resize = new ResizeObserver(() => {
      map.resize();
      fitInitial();
    });
    resize.observe(container.current);
    return () => {
      resize.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const features = clinics.flatMap((c, index) =>
      c.locations.map((l) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [l.longitude, l.latitude] },
        properties: { id: c.id, number: index + 1 },
      })),
    );
    (map.getSource("clinics") as GeoJSONSource)?.setData({ type: "FeatureCollection", features });
    if (clinics.length && clinics.length < 10) {
      const points = features.map((f) => f.geometry.coordinates as [number, number]);
      const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { padding: 85, maxZoom: 10, duration: 650 });
    }
  }, [clinics, ready]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter("selected", ["==", ["get", "id"], selectedId ?? ""]);
    map.setFilter("selected-number", ["==", ["get", "id"], selectedId ?? ""]);
    const clinic = clinicsRef.current.find((c) => c.id === selectedId);
    const l =
      clinic?.locations.find((l) => l.id === clinic.matchedLocationId) ?? clinic?.locations[0];
    if (l)
      map.easeTo({
        center: [l.longitude, l.latitude],
        zoom: Math.max(map.getZoom(), 13),
        duration: 650,
      });
  }, [selectedId, ready]);
  const selected = clinics.find((c) => c.id === selectedId);
  const reset = () => {
    mapRef.current?.fitBounds(
      [
        [-125, 24],
        [-66, 50],
      ],
      { padding: 35, duration: 700 },
    );
    setMoved(false);
  };
  return (
    <section className="map-panel" aria-label="Interactive map of clinic locations">
      <div
        ref={container}
        className="map-canvas"
        role="region"
        aria-label="US clinic map. Use the result cards as an accessible alternative."
      />
      {!ready && !error && (
        <div className="map-loading">
          <LoaderCircle className="spin" size={24} />
          <span>Opening your atlas…</span>
        </div>
      )}
      <div className="map-top">
        <span className="map-country">
          <span className="live-dot" /> UNITED STATES
        </span>
        <button className="map-tool" aria-label="Reset map to continental US" onClick={reset}>
          <Expand size={16} />
        </button>
      </div>
      {moved && ready && (
        <button
          className="search-area"
          onClick={() => {
            const b = mapRef.current?.getBounds();
            if (b) {
              onSearchArea([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
              setMoved(false);
            }
          }}
        >
          <Search size={14} />
          Search this area
        </button>
      )}
      {selected && (
        <div className="map-selected">
          <span className="selected-pin">
            <MapPin size={19} />
          </span>
          <div>
            <strong>{selected.name}</strong>
            <span>
              {selected.locations[0]?.city}, {selected.locations[0]?.state} ·{" "}
              {selected.isDemo ? "Fictional demo" : "Reviewed listing"}
            </span>
          </div>
          <button aria-label="Close selected clinic" onClick={() => onSelect("")}>
            ×
          </button>
        </div>
      )}
      <button
        className="map-all"
        onClick={() =>
          mapRef.current?.fitBounds(
            [
              [-162, 18],
              [-66, 72],
            ],
            { padding: 30, duration: 800 },
          )
        }
      >
        <LocateFixed size={14} /> All 50 states
      </button>
      <div className="map-legend">
        <span className="legend-pin" />
        Clinic location <span className="legend-cluster">2</span>Nearby clinics
      </div>
      {error && (
        <div className="map-error">
          <Info size={15} />
          <span>
            Map tiles couldn’t load. Results are still available. Check network access and your map
            provider configuration.
          </span>
        </div>
      )}
    </section>
  );
}
