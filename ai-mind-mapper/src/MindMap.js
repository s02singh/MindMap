import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import axios from 'axios';
import './MindMap.css';
import { CSSTransition, TransitionGroup } from 'react-transition-group'; // Import for animations
import { DragDropContext, Droppable, Draggable as DnDDraggable } from 'react-beautiful-dnd';



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

  // New state variables
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState([]);

  const addNode = (idea, position = null) => {
    const newNode = {
      id: nodes.length + 1,
      label: idea,
      position: position || {
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

  // Function to generate ideas
  const handleGenerateIdeas = async () => {
    if (!userInput) return;
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/generate_ideas', {
        input: userInput,
        expand: false,
        limit: 3,
      });
      const { ideas } = response.data;
      setGeneratedIdeas(ideas);
      console.log('Generated Ideas:', ideas); // Add this line
      setUserInput('');
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  // Function to expand a node with AI-generated ideas
  const expandNode = async (node) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5001/generate_ideas', {
        input: node.label,
        expand: true,
        limit: 3,
      });
      const { ideas } = response.data;
      const newNodes = [];
      const newConnections = [];
      ideas.forEach((idea, index) => {
        const angle = (2 * Math.PI * index) / ideas.length;
        const radius = 150;
        const newNode = {
          id: nodes.length + 1 + index,
          label: idea,
          position: {
            x: node.position.x + radius * Math.cos(angle),
            y: node.position.y + radius * Math.sin(angle),
          },
        };
        newNodes.push(newNode);
        newConnections.push({
          id: Date.now() + index,
          from: node.id,
          to: newNode.id,
        });
      });
      setNodes([...nodes, ...newNodes]);
      setConnections([...connections, ...newConnections]);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  // New function for AI-based auto restructure
  const handleAutoRestructure = async () => {
    if (nodes.length < 2) {
      alert('Need at least two nodes to restructure.');
      return;
    }
    setLoading(true);
    try {
      // Prepare node data
      const nodeData = nodes.map((node) => ({
        id: node.id,
        label: node.label,
      }));
      const response = await axios.post('http://localhost:5001/auto_restructure', {
        nodes: nodeData,
      });
      const { connections: newConnections } = response.data;
      // Update connections
      setConnections([...connections, ...newConnections]);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
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
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter main idea"
        />
        <button onClick={handleGenerateIdeas}>Generate Ideas</button>
        <button onClick={() => addNode('New Idea')}>Add Idea</button>
        <button onClick={() => handleZoom('in')}>Zoom In</button>
        <button onClick={() => handleZoom('out')}>Zoom Out</button>
        <button onClick={() => setConnectMode(!connectMode)}>
          {connectMode ? 'Exit Connect Mode' : 'Enter Connect Mode'}
        </button>
        <button onClick={handleAutoRestructure}>Auto Restructure</button>
      </div>
      <div className="main-content">
        {/* Sidebar with generated ideas */}
        <div className="sidebar">
           <h3>Generated Ideas</h3>
  {loading && <div className="loading">Loading...</div>}
  {generatedIdeas.map((idea, index) => (
    <div key={index} className="idea-card">
      {idea}
    </div>
  ))}
</div>


        {/* Mind map area */}
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
              const x1 = fromNode.position.x + 60;
              const y1 = fromNode.position.y + 60;
              const x2 = toNode.position.x + 60;
              const y2 = toNode.position.y + 60;
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
                    stroke={isSelected ? 'blue' : 'cyan'}
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
                x1={tempLine.fromNode.position.x + 60}
                y1={tempLine.fromNode.position.y + 60}
                x2={tempLine.toPosition.x}
                y2={tempLine.toPosition.y}
                stroke="cyan"
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
              expandNode={expandNode}
            />
          ))}
        </div>
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
  expandNode,
}) {
  const nodeRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);

  const handleMouseDown = (e) => {
    if (connectMode) {
      e.preventDefault();
      e.stopPropagation();
      onNodeMouseDown(node, e);
    } else {
      setSelectedNode(node.id);
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleChange = (e) => {
    setEditLabel(e.target.value);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Update the node's label
    const updatedNodes = nodes.map((n) =>
      n.id === node.id ? { ...n, label: editLabel } : n
    );
    setNodes(updatedNodes);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    expandNode(node);
  };

  const nodeElement = (
    <div
      ref={nodeRef}
      id={`node-${node.id}`}
      className={`node ${selectedNode === node.id ? 'selected' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {isEditing ? (
        <input
          type="text"
          value={editLabel}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        node.label
      )}
    </div>
  );

  if (connectMode) {
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

// DraggableIdea component remains the same
function DraggableIdea({ idea, addNode, zoom }) {
  const ideaRef = useRef(null);

  const handleStart = () => {
    // Add any visual feedback when dragging starts
  };

  const handleStop = (e, data) => {
    const mindmapRect = document.querySelector('.mindmap').getBoundingClientRect();
    const x = (data.x - mindmapRect.left) / zoom;
    const y = (data.y - mindmapRect.top) / zoom;

    // If dropped inside the mindmap area
    if (
      x >= 0 &&
      x <= mindmapRect.width / zoom &&
      y >= 0 &&
      y <= mindmapRect.height / zoom
    ) {
      addNode(idea, { x, y });
      // Optionally remove the idea from the sidebar
    }
  };

  return (
    <Draggable
      nodeRef={ideaRef}
      onStart={handleStart}
      onStop={handleStop}
      bounds="body"
    >
      <div ref={ideaRef} className="idea-card">
        {idea}
      </div>
    </Draggable>
  );
}

export default MindMap;
