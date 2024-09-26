import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import './MindMap.css';

function MindMap() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [connectMode, setConnectMode] = useState(false);
  const [tempLine, setTempLine] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const mindmapRef = useRef(null);

  const addNode = (idea) => {
    const newNode = {
      id: nodes.length + 1,
      label: idea,
      position: {
        x: Math.random() * 600 + 100,
        y: Math.random() * 400 + 100,
      },
    };
    setNodes([...nodes, newNode]);
  };

  const handleZoom = (direction) => {
    if (direction === 'in') setZoom((prev) => prev + 0.1);
    if (direction === 'out' && zoom > 0.2) setZoom((prev) => prev - 0.1);
  };

  const handleNodeMouseDown = (node, e) => {
    if (!connectMode) return;
    e.preventDefault();
    e.stopPropagation();
    const mindmapRect = mindmapRef.current.getBoundingClientRect();
    const x = (e.clientX - mindmapRect.left) / zoom;
    const y = (e.clientY - mindmapRect.top) / zoom;
    setTempLine({ fromNode: node, toPosition: { x, y } });
    setIsDragging(true);
  };

  const handleLineClick = (e, connection) => {
    e.stopPropagation();
    setSelectedConnection(connection);
  };

  const deleteConnection = () => {
    setConnections(connections.filter((conn) => conn.id !== selectedConnection.id));
    setSelectedConnection(null);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e) => {
        e.preventDefault();
        const mindmapRect = mindmapRef.current.getBoundingClientRect();
        const x = (e.clientX - mindmapRect.left) / zoom;
        const y = (e.clientY - mindmapRect.top) / zoom;
        setTempLine((prev) => ({ ...prev, toPosition: { x, y } }));
      };

      const handleMouseUp = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const mindmapRect = mindmapRef.current.getBoundingClientRect();
        const x = (e.clientX - mindmapRect.left) / zoom;
        const y = (e.clientY - mindmapRect.top) / zoom;

        const targetNode = nodes.find((node) => {
          const nodeX = node.position.x;
          const nodeY = node.position.y;
          return (
            x >= nodeX &&
            x <= nodeX + 100 &&
            y >= nodeY &&
            y <= nodeY + 100 &&
            node.id !== tempLine.fromNode.id
          );
        });

        if (targetNode) {
          // Check if the connection already exists
          const connectionExists = connections.some(
            (conn) =>
              (conn.from === tempLine.fromNode.id && conn.to === targetNode.id) ||
              (conn.from === targetNode.id && conn.to === tempLine.fromNode.id)
          );

          if (!connectionExists) {
            const newConnection = {
              id: Date.now(),
              from: tempLine.fromNode.id,
              to: targetNode.id,
            };
            setConnections([...connections, newConnection]);
          }
        }
        setTempLine(null);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, tempLine, zoom, nodes, connections]);

  return (
    <div className="mindmap-container">
      <div className="controls">
        <button onClick={() => addNode('New Idea')}>Add Idea</button>
        <button onClick={() => handleZoom('in')}>Zoom In</button>
        <button onClick={() => handleZoom('out')}>Zoom Out</button>
        <button onClick={() => setConnectMode(!connectMode)}>
          {connectMode ? 'Exit Connect Mode' : 'Enter Connect Mode'}
        </button>
      </div>
      <div
        className="mindmap"
        ref={mindmapRef}
        style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
        onClick={() => setSelectedConnection(null)}
      >
        <svg className="connections">
          {connections.map((connection) => {
            const fromNode = nodes.find((node) => node.id === connection.from);
            const toNode = nodes.find((node) => node.id === connection.to);
            if (!fromNode || !toNode) return null;
            const isSelected = selectedConnection && selectedConnection.id === connection.id;
            const x1 = fromNode.position.x + 50;
            const y1 = fromNode.position.y + 50;
            const x2 = toNode.position.x + 50;
            const y2 = toNode.position.y + 50;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g
                key={connection.id}
                onClick={(e) => handleLineClick(e, connection)}
                style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="10"
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isSelected ? 'blue' : 'red'}
                  strokeWidth="2"
                />
                {isSelected && (
                  <foreignObject
                    x={midX - 15}
                    y={midY - 15}
                    width={30}
                    height={30}
                  >
                    <div
                      className="delete-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnection();
                      }}
                    >
                      ❌
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
          {tempLine && (
            <line
              x1={tempLine.fromNode.position.x + 50}
              y1={tempLine.fromNode.position.y + 50}
              x2={tempLine.toPosition.x}
              y2={tempLine.toPosition.y}
              stroke="red"
              strokeWidth="2"
            />
          )}
        </svg>
        {nodes.map((node) => (
          <NodeComponent
            key={node.id}
            node={node}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            nodes={nodes}
            setNodes={setNodes}
            connectMode={connectMode}
            onNodeMouseDown={handleNodeMouseDown}
          />
        ))}
      </div>
    </div>
  );
}

function NodeComponent({
  node,
  selectedNode,
  setSelectedNode,
  nodes,
  setNodes,
  connectMode,
  onNodeMouseDown,
}) {
  const nodeRef = useRef(null);

  const handleMouseDown = (e) => {
    if (connectMode) {
      e.preventDefault();
      e.stopPropagation();
      onNodeMouseDown(node, e);
    } else {
      setSelectedNode(node.id);
    }
  };

  const nodeElement = (
    <div
      ref={nodeRef}
      id={`node-${node.id}`}
      className={`node ${selectedNode === node.id ? 'selected' : ''}`}
      onMouseDown={handleMouseDown}
      style={{ background: '#fff' }}
    >
      {node.label}
    </div>
  );

  if (connectMode) {
    // Position node manually when not draggable
    return (
      <div
        style={{
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
        }}
      >
        {nodeElement}
      </div>
    );
  } else {
    // Wrap node in Draggable component when not in connect mode
    return (
      <Draggable
        nodeRef={nodeRef}
        position={node.position}
        onDrag={(e, data) => {
          const updatedNodes = nodes.map((n) =>
            n.id === node.id ? { ...n, position: { x: data.x, y: data.y } } : n
          );
          setNodes(updatedNodes);
        }}
      >
        {nodeElement}
      </Draggable>
    );
  }
}

export default MindMap;
