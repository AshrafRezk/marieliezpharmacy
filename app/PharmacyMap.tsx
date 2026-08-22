"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const branches = [
  { name: "Al Golf Branch", area: "Nasr City", address: "23 Ahmed Tayseer St., Al Golf, Nasr City", position: [30.081708, 31.3271294] as [number, number], directions: "https://maps.app.goo.gl/itCe3b3ErhgemsJL6" },
  { name: "Tagamoa Branch", area: "New Cairo", address: "Highland Park Mall, El Andalus, New Cairo", position: [29.991139, 31.5088302] as [number, number], directions: "https://maps.app.goo.gl/u3yFYJGjR36xJw696?g_st=ac" },
];

function MapMotion({ active }: { active: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo(branches[active].position, 16, { duration: 2.2 }); }, [active, map]);
  return null;
}

export default function PharmacyMap() {
  const [active, setActive] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const icon = useMemo(() => L.divIcon({ className: "custom-map-marker", html: `<span><b>m</b><i>+</i></span>`, iconSize: [50, 58], iconAnchor: [25, 58], popupAnchor: [0, -55] }), []);
  useEffect(() => { if (!autoPlay) return; const timer = window.setInterval(() => setActive(value => (value + 1) % branches.length), 5500); return () => window.clearInterval(timer); }, [autoPlay]);
  const select = (index: number) => { setActive(index); setAutoPlay(false); };
  return <div className="map-experience">
    <div className="branch-selector">
      <div className="branch-selector-head"><span>OUR LOCATIONS</span><button onClick={() => setAutoPlay(!autoPlay)}>{autoPlay ? "Pause tour" : "Play tour"}</button></div>
      {branches.map((branch, index) => <button key={branch.name} className={`branch-choice ${active === index ? "active" : ""}`} onClick={() => select(index)}>
        <span className="branch-number">0{index + 1}</span><span><small>{branch.area}</small><strong>{branch.name}</strong><em>{branch.address}</em></span><b>→</b>
      </button>)}
      <a className="map-directions" href={branches[active].directions} target="_blank" rel="noreferrer">Directions to {branches[active].name} <span>↗</span></a>
      <p className="map-tour-note"><i className={autoPlay ? "playing" : ""}/> {autoPlay ? "Touring both branches automatically" : "Map tour paused"}</p>
    </div>
    <div className="real-map" onPointerDown={() => setAutoPlay(false)}>
      <MapContainer center={branches[0].position} zoom={16} scrollWheelZoom={true} zoomControl={true}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapMotion active={active} />
        {branches.map((branch, index) => <Marker key={branch.name} position={branch.position} icon={icon} eventHandlers={{ click: () => select(index) }}><Popup><strong>{branch.name}</strong><br/>{branch.address}</Popup></Marker>)}
      </MapContainer>
      <div className="map-status"><span>LIVE MAP</span><strong>{branches[active].area}</strong></div>
    </div>
  </div>;
}
