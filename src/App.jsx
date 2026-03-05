import { useState, useCallback } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  Controls,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

const nodeStyle = {
  padding: 12,
  border: "1px solid #2e2e2e",
  borderRadius: 8,
  background: "#1f1f23",
  color: "#fff",
  fontSize: 14,
  fontWeight: 500,
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [webServiceOpen, setWebServiceOpen] = useState(false);
  const [dataFlowOpen, setDataFlowOpen] = useState(false);

  const [selectedNode, setSelectedNode] = useState(null);

  const [showApiModal, setShowApiModal] = useState(false);
  const [showDataFlowModal, setShowDataFlowModal] = useState(false);

  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);

  const [leftSelected, setLeftSelected] = useState(null);
  const [rightSelected, setRightSelected] = useState(null);

  const [previewData, setPreviewData] = useState([]);

  const [apiForm, setApiForm] = useState({
    name: "",
    url: "",
    method: "GET",
    headers: "",
  });

  /* ---------------- REACT FLOW ---------------- */
  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );

  /* ---------------- CREATE NODES ---------------- */
  const createApiNode = () => {
    const id = `api-${nodes.length + 1}`;

    const newNode = {
      id,
      position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: "API Service", type: "api" },
      style: { ...nodeStyle, border: "1px solid #6366f1" },
    };

    setNodes((prev) => [...prev, newNode]);
  };

  const createDataFlowNode = () => {
    const id = `flow-${nodes.length + 1}`;

    const newNode = {
      id,
      position: { x: 250 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: "Data Flow Node", type: "dataflow" },
      style: { ...nodeStyle, border: "1px solid #f59e0b" },
    };

    setNodes((prev) => [...prev, newNode]);
  };

  /* ---------------- NODE DOUBLE CLICK ---------------- */
  const onNodeDoubleClick = (event, node) => {
    setSelectedNode(node);

    /* API NODE */
    if (node.data.type === "api") {
      setApiForm(node.data.config || { name: "", url: "", method: "GET", headers: "" });
      setShowApiModal(true);
    }

    /* DATA FLOW NODE */
    if (node.data.type === "dataflow") {
      // 🔹 Find all edges where this node is the target
      const connectedEdges = edges.filter((e) => e.target === node.id);
      const apiNodes = connectedEdges
        .map((e) => nodes.find((n) => n.id === e.source && n.data.type === "api"))
        .filter((n) => n && n.data.apiResponse);

      if (!apiNodes.length) {
        alert("No API connected with data.");
        return;
      }

      // 🔹 Merge all API responses
      let mergedData = [];
      apiNodes.forEach((n) => {
        if (Array.isArray(n.data.apiResponse)) {
          mergedData = mergedData.concat(n.data.apiResponse);
        }
      });

      // 🔹 All unique fields
      const allFields = Array.from(new Set(mergedData.flatMap((row) => Object.keys(row))));

      const savedTables = node.data.selectedTables || [];

      setSelectedTables(savedTables);
      setAvailableTables(allFields.filter((t) => !savedTables.includes(t)));
      setPreviewData(mergedData);

      setShowDataFlowModal(true);
    }
  };

  /* ---------------- TABLE SELECTOR ---------------- */
  const moveRight = () => {
    if (!leftSelected) return;
    setSelectedTables([...selectedTables, leftSelected]);
    setAvailableTables(availableTables.filter((t) => t !== leftSelected));
    setLeftSelected(null);
  };

  const moveLeft = () => {
    if (!rightSelected) return;
    setAvailableTables([...availableTables, rightSelected]);
    setSelectedTables(selectedTables.filter((t) => t !== rightSelected));
    setRightSelected(null);
  };

  /* ---------------- SAVE API ---------------- */
  const saveApiConfig = async () => {
    setShowApiModal(false);

    try {
      let headers = {};
      if (apiForm.headers) headers = JSON.parse(apiForm.headers);

      const response = await fetch(apiForm.url, { method: apiForm.method, headers });
      const data = await response.json();

      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNode.id
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: apiForm.name || "API Service",
                  config: apiForm,
                  apiResponse: data,
                },
              }
            : n
        )
      );
    } catch (err) {
      alert("API Error: " + err.message);
    }
  };

  /* ---------------- SAVE DATA FLOW ---------------- */
  const saveDataFlowConfig = () => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, selectedTables } }
          : n
      )
    );
    setShowDataFlowModal(false);
  };

  /* ---------------- TABLE PREVIEW ---------------- */
  const renderPreviewTable = () => {
    if (!previewData.length || !selectedTables.length) return null;

    return (
      <div style={tableContainer}>
        <div style={tableTitle}>Data Preview</div>
        <table style={table}>
          <thead>
            <tr>
              {selectedTables.map((col) => (
                <th key={col} style={th}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewData.slice(0, 10).map((row, i) => (
              <tr key={i}>
                {selectedTables.map((col) => (
                  <td key={col} style={td}>{String(row[col] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div style={layout}>
      <div style={canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={onNodeDoubleClick}
          fitView
        >
          <Background color="#2e2e2e" gap={20} />
          <Controls />
        </ReactFlow>
      </div>

      {/* SIDEBAR */}
      <div style={sidebar}>
        <div style={sidebarHeader}>Hierarchy</div>
        <div style={sidebarItem} onClick={() => setWebServiceOpen(!webServiceOpen)}>
          {webServiceOpen ? "▼" : "▶"} Web Services
        </div>
        {webServiceOpen && (
          <div style={subItemContainer}>
            <div style={subItem} onClick={createApiNode}>API</div>
          </div>
        )}

        <div style={sidebarItem} onClick={() => setDataFlowOpen(!dataFlowOpen)}>
          {dataFlowOpen ? "▼" : "▶"} Data Flow
        </div>
        {dataFlowOpen && (
          <div style={subItemContainer}>
            <div style={subItem} onClick={createDataFlowNode}>Node</div>
          </div>
        )}
      </div>

      {/* API MODAL */}
      {showApiModal && (
        <div style={modalOverlay}>
          <div style={modal}>
            <div style={modalTitle}>API Configuration</div>
            <input
              style={input} placeholder="API Name" value={apiForm.name}
              onChange={(e) => setApiForm({ ...apiForm, name: e.target.value })}
            />
            <input
              style={input} placeholder="URL" value={apiForm.url}
              onChange={(e) => setApiForm({ ...apiForm, url: e.target.value })}
            />
            <select
              style={input} value={apiForm.method}
              onChange={(e) => setApiForm({ ...apiForm, method: e.target.value })}
            >
              <option>GET</option>
              <option>POST</option>
            </select>
            <input
              style={input} placeholder="Headers JSON" value={apiForm.headers}
              onChange={(e) => setApiForm({ ...apiForm, headers: e.target.value })}
            />
            <div style={modalButtons}>
              <button style={primaryButton} onClick={saveApiConfig}>Save</button>
              <button style={secondaryButton} onClick={() => setShowApiModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* DATA FLOW MODAL */}
      {showDataFlowModal && (
        <div style={modalOverlay}>
          <div style={{ ...modal, width: 750 }}>
            <div style={modalTitle}>Select Fields</div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div>Available</div>
                {availableTables.map((t) => (
                  <div
                    key={t}
                    onClick={() => setLeftSelected(t)}
                    style={{ padding: 8, cursor: "pointer", background: leftSelected === t ? "#6366f1" : "" }}
                  >
                    {t}
                  </div>
                ))}
              </div>
              <div style={selectorButtons}>
                <button onClick={moveRight}>➡</button>
                <button onClick={moveLeft}>⬅</button>
              </div>
              <div style={{ flex: 1 }}>
                <div>Selected</div>
                {selectedTables.map((t) => (
                  <div
                    key={t}
                    onClick={() => setRightSelected(t)}
                    style={{ padding: 8, cursor: "pointer", background: rightSelected === t ? "#6366f1" : "" }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
            {renderPreviewTable()}
            <div style={modalButtons}>
              <button style={primaryButton} onClick={saveDataFlowConfig}>Save</button>
              <button style={secondaryButton} onClick={() => setShowDataFlowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const layout = { display: "flex", width: "100vw", height: "100vh", background: "#0f0f11" };
const canvas = { flex: 1 };
const sidebar = { width: 260, background: "#17171a", borderLeft: "1px solid #2e2e2e", padding: 20, color: "#fff" };
const sidebarHeader = { fontSize: 16, fontWeight: 600, marginBottom: 15 };
const sidebarItem = { padding: "8px 6px", cursor: "pointer" };
const subItemContainer = { paddingLeft: 15 };
const subItem = { padding: "6px 0", cursor: "pointer", color: "#aaa" };
const modalOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center" };
const modal = { width: 400, background: "#1c1c1f", borderRadius: 10, padding: 25, color: "#fff" };
const modalTitle = { fontSize: 18, marginBottom: 20 };
const input = { padding: 8, borderRadius: 6, border: "1px solid #333", background: "#2a2a2e", color: "#fff", marginBottom: 10, width: "100%" };
const modalButtons = { marginTop: 20, display: "flex", gap: 10 };
const primaryButton = { padding: "8px 14px", background: "#6366f1", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer" };
const secondaryButton = { padding: "8px 14px", background: "#2a2a2e", border: "1px solid #444", borderRadius: 6, color: "#fff" };
const selectorButtons = { display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 };
const tableContainer = { marginTop: 25, background: "#141417", borderRadius: 8, padding: 15 };
const tableTitle = { marginBottom: 10, fontWeight: 600 };
const table = { width: "100%", borderCollapse: "collapse" };
const th = { textAlign: "left", borderBottom: "1px solid #333", padding: 8 };
const td = { padding: 8, borderBottom: "1px solid #222" };

export default App;