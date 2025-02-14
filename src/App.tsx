import React, { useRef, useState, useEffect } from 'react';
import { Circle, Square, Pencil, Eraser, Download, Undo2, Redo2, Slash } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

type Tool = 'marker' | 'line' | 'circle' | 'rectangle' | 'eraser';
type BrushStyle = 'normal' | 'crayon' | 'ink';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [tool, setTool] = useState<Tool>('marker');
  const [lineWidth, setLineWidth] = useState(5);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('normal');
  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastPoints = useRef<{ x: number; y: number; pressure: number }[]>([]);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', 
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialState]);
    setHistoryIndex(0);
  }, []);

  const applyCrayonEffect = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const pressure = Math.random() * 0.5 + 0.5; // Simulate varying pressure
    lastPoints.current.push({ x, y, pressure });
    if (lastPoints.current.length > 4) lastPoints.current.shift();

    ctx.beginPath();
    ctx.moveTo(lastPoints.current[0].x, lastPoints.current[0].y);

    for (let i = 1; i < lastPoints.current.length; i++) {
      const point = lastPoints.current[i];
      const prevPoint = lastPoints.current[i - 1];
      
      // Create textured effect with multiple small lines
      for (let j = 0; j < 3; j++) {
        const offsetX = (Math.random() - 0.5) * lineWidth * 0.5;
        const offsetY = (Math.random() - 0.5) * lineWidth * 0.5;
        ctx.moveTo(prevPoint.x + offsetX, prevPoint.y + offsetY);
        ctx.lineTo(point.x + offsetX, point.y + offsetY);
      }
    }
    
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  };

  const applyInkEffect = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    lastPoints.current.push({ x, y, pressure: Math.random() });
    if (lastPoints.current.length > 5) lastPoints.current.shift();

    ctx.beginPath();
    if (lastPoints.current.length >= 2) {
      const point = lastPoints.current[lastPoints.current.length - 1];
      const prevPoint = lastPoints.current[lastPoints.current.length - 2];
      
      // Create flowing ink effect
      const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
      const distance = Math.sqrt(Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2));
      
      ctx.lineWidth = lineWidth * (1 + Math.sin(distance * 0.5) * 0.5);
      ctx.moveTo(prevPoint.x, prevPoint.y);
      
      // Add slight curve to simulate ink flow
      const ctrl1x = prevPoint.x + Math.cos(angle - Math.PI/6) * distance * 0.3;
      const ctrl1y = prevPoint.y + Math.sin(angle - Math.PI/6) * distance * 0.3;
      const ctrl2x = point.x - Math.cos(angle + Math.PI/6) * distance * 0.3;
      const ctrl2y = point.y - Math.sin(angle + Math.PI/6) * distance * 0.3;
      
      ctx.bezierCurveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, point.x, point.y);
      ctx.stroke();
    }
  };

  const applyBrushStyle = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    switch (brushStyle) {
      case 'crayon':
        applyCrayonEffect(ctx, x, y);
        break;
      case 'ink':
        applyInkEffect(ctx, x, y);
        break;
      default:
        ctx.lineTo(x, y);
        ctx.stroke();
    }
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setHistoryIndex(prev => prev - 1);
    const imageData = history[historyIndex - 1];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setHistoryIndex(prev => prev + 1);
    const imageData = history[historyIndex + 1];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);
    lastMousePos.current = pos;
    lastPoints.current = [{ x: pos.x, y: pos.y, pressure: 1 }];

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    lastMousePos.current = pos;

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    } else if (tool === 'marker') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      applyBrushStyle(ctx, pos.x, pos.y);
    } else {
      const prevState = history[historyIndex];
      if (prevState) {
        ctx.putImageData(prevState, 0, 0);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2)
        );
        ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      } else if (tool === 'rectangle') {
        ctx.rect(
          startPos.x,
          startPos.y,
          pos.x - startPos.x,
          pos.y - startPos.y
        );
      }
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
      lastPoints.current = [];
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    draw(e);
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    lastPoints.current = [{ x: pos.x, y: pos.y, pressure: 1 }];
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const ToolButton = ({ tool: t, icon: Icon, label }: { tool: Tool, icon: React.ElementType, label: string }) => (
    <div className="flex flex-col items-center">
      <button
        className={`p-2 rounded ${tool === t ? 'bg-blue-100' : ''} hover:bg-blue-50 transition-colors`}
        onClick={() => setTool(t)}
        title={label}
      >
        <Icon size={24} />
      </button>
      <span className="text-xs mt-1">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-6">
        <div className="mb-4 flex flex-wrap items-start gap-6">
          <div className="flex gap-2 relative">
            {colors.map((c) => (
              <button
                key={c}
                className={`w-8 h-8 rounded-full ${
                  color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                } hover:scale-110 transition-transform`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
            <button
              className={`w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:scale-110 transition-transform ${
                showColorPicker ? 'ring-2 ring-offset-2 ring-blue-500' : ''
              }`}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Custom Color"
            />
            {showColorPicker && (
              <div className="absolute top-full mt-2 z-10 bg-white p-2 rounded-lg shadow-xl">
                <HexColorPicker color={color} onChange={setColor} />
              </div>
            )}
          </div>
          <div className="flex gap-6 border-l pl-6">
            <ToolButton tool="marker" icon={Pencil} label="Marker" />
            <ToolButton tool="line" icon={Slash} label="Line" />
            <ToolButton tool="circle" icon={Circle} label="Circle" />
            <ToolButton tool="rectangle" icon={Square} label="Square" />
            <ToolButton tool="eraser" icon={Eraser} label="Eraser" />
          </div>
          <div className="flex gap-6 border-l pl-6">
            <div className="flex flex-col items-center">
              <button
                className="p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                onClick={undo}
                disabled={historyIndex <= 0}
                title="Undo"
              >
                <Undo2 size={24} />
              </button>
              <span className="text-xs mt-1">Undo</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="p-2 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
              >
                <Redo2 size={24} />
              </button>
              <span className="text-xs mt-1">Redo</span>
            </div>
            <div className="flex flex-col items-center">
              <button
                className="p-2 rounded hover:bg-gray-100 transition-colors"
                onClick={downloadCanvas}
                title="Download"
              >
                <Download size={24} />
              </button>
              <span className="text-xs mt-1">Save</span>
            </div>
          </div>
          <div className="flex items-center gap-4 border-l pl-6">
            <div className="flex items-center gap-2">
              <label htmlFor="lineWidth" className="text-sm font-medium">Line Width:</label>
              <input
                type="range"
                id="lineWidth"
                min="1"
                max="50"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
            <div className="flex gap-2">
              {['normal', 'crayon', 'ink'].map((style) => (
                <button
                  key={style}
                  className={`px-3 py-1 rounded text-sm ${
                    brushStyle === style ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setBrushStyle(style as BrushStyle)}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="border border-gray-300 rounded-lg w-full h-[600px] cursor-crosshair shadow-inner bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        />
      </div>
    </div>
  );
}

export default App;