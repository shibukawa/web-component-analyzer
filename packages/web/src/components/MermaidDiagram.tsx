import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { Theme } from '../types/theme';
import { ZoomControls } from './ZoomControls';
import { CopyButton } from './CopyButton';

interface MermaidDiagramProps {
  code: string;
  theme: Theme;
}

export function MermaidDiagram({ code, theme }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Initialize Mermaid with theme configuration
  useEffect(() => {
    const isDark = theme.mode === 'dark';
    
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',  // Use base theme to allow full customization
      themeVariables: {
        // Primary colors for input props (blue tones)
        // Light: #E3F2FD (very light blue) → Dark: #1a3a4a (dark blue)
        primaryColor: isDark ? '#1a3a4a' : '#E3F2FD',
        primaryTextColor: isDark ? '#ffffff' : '#1e1e1e',
        primaryBorderColor: isDark ? '#2196F3' : '#2196F3',
        
        // Secondary colors for processes (purple tones)
        // Light: #F3E5F5 (very light purple) → Dark: #3a1a4a (dark purple)
        secondaryColor: isDark ? '#3a1a4a' : '#F3E5F5',
        secondaryTextColor: isDark ? '#ffffff' : '#1e1e1e',
        secondaryBorderColor: isDark ? '#9C27B0' : '#9C27B0',
        
        // Tertiary colors for data stores (green tones)
        // Light: #E8F5E9 (very light green) → Dark: #1a3a1a (dark green)
        tertiaryColor: isDark ? '#1a3a1a' : '#E8F5E9',
        tertiaryTextColor: isDark ? '#ffffff' : '#1e1e1e',
        tertiaryBorderColor: isDark ? '#4CAF50' : '#4CAF50',
        
        // Background and text
        background: theme.colors.background,
        mainBkg: isDark ? '#2d2d2d' : '#ffffff',
        textColor: theme.colors.foreground,
        
        // Node styling - override all node backgrounds
        nodeBorder: isDark ? '#555555' : theme.colors.border,
        nodeTextColor: theme.colors.foreground,
        
        // Line/edge colors
        lineColor: isDark ? '#999999' : '#666666',
        edgeLabelBackground: isDark ? '#1e1e1e' : '#ffffff',
        
        // Cluster/subgraph styling for conditional rendering
        clusterBkg: isDark ? '#1a1a1a' : '#f5f5f5',
        clusterBorder: isDark ? '#555555' : '#cccccc',
        
        // Flowchart specific colors to override defaults (matching original color scheme)
        ...(isDark ? {
          // Dark mode: Override all flowchart node types with dark versions of original colors
          fillType0: '#1a3a4a',  // Dark blue (input props)
          fillType1: '#3a2a1a',  // Dark orange (JSX elements, output props)
          fillType2: '#3a1a4a',  // Dark purple (processes)
          fillType3: '#1a3a1a',  // Dark green (data stores)
          fillType4: '#1a3a3a',  // Dark cyan (context data)
          fillType5: '#3a2a1a',  // Dark orange variant (context functions)
          fillType6: '#1a3a1a',  // Dark green variant (exported handlers)
          fillType7: '#2a2a3a',  // Dark blue-gray (other)
        } : {
          // Light mode: Use original bright colors
          fillType0: '#E3F2FD',  // Light blue (input props)
          fillType1: '#FFF3E0',  // Light orange (JSX elements, output props)
          fillType2: '#F3E5F5',  // Light purple (processes)
          fillType3: '#E8F5E9',  // Light green (data stores)
          fillType4: '#E1F5FE',  // Light cyan (context data)
          fillType5: '#FFF9C4',  // Light yellow (context functions)
          fillType6: '#E8F5E9',  // Light green variant (exported handlers)
          fillType7: '#F5F5F5',  // Light gray (other)
        }),
        
        // Additional contrast improvements for dark mode
        ...(isDark && {
          // Ensure good contrast for all node types
          noteBkgColor: '#3a3a3a',
          noteTextColor: '#e0e0e0',
          noteBorderColor: '#666666',
          
          // Actor/participant colors (if used)
          actorBkg: '#2d2d2d',
          actorBorder: '#555555',
          actorTextColor: '#e0e0e0',
          
          // Label backgrounds
          labelBoxBkgColor: '#2d2d2d',
          labelBoxBorderColor: '#555555',
          labelTextColor: '#e0e0e0',
          
          // Grid and axis (if applicable)
          gridColor: '#444444',
          
          // Critical/error states
          critBkgColor: '#8b2e2e',
          critBorderColor: '#c74444',
          
          // Done/success states
          doneBkgColor: '#2e5c2e',
          doneBorderColor: '#4a8c4a',
          
          // Active/selected states
          activeTaskBkgColor: '#3a4a5a',
          activeTaskBorderColor: '#5a7a9a',
        }),
      },
      flowchart: {
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
        diagramPadding: 20,
        useMaxWidth: true,
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
  }, [theme]);

  // Zoom functions
  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Apply transform to SVG
  useEffect(() => {
    if (svgContainerRef.current) {
      const svg = svgContainerRef.current.querySelector('svg');
      if (svg) {
        svg.style.transform = `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`;
        svg.style.transformOrigin = 'center center';
        svg.style.transition = isPanning ? 'none' : 'transform 0.2s ease-out';
      }
    }
  }, [scale, panOffset, isPanning]);

  // Mouse wheel zoom
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) {return;}

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Determine zoom direction
      const delta = e.deltaY > 0 ? -1 : 1;
      const zoomFactor = 1.1;
      
      setScale(prevScale => {
        const newScale = delta > 0 ? prevScale * zoomFactor : prevScale / zoomFactor;
        return Math.max(0.1, Math.min(5, newScale));
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Pan functionality with mouse drag
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) {return;}

    const handleMouseDown = (e: MouseEvent) => {
      // Only pan with left mouse button
      if (e.button !== 0) {return;}
      
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) {return;}
      
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    const handleMouseLeave = () => {
      setIsPanning(false);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isPanning, panStart, panOffset]);

  // Render diagram when code or theme changes
  useEffect(() => {
    console.log('=== MERMAID DIAGRAM RENDER TRIGGERED ===');
    console.log('Code length:', code.length);
    console.log('Code preview (first 200 chars):', code.substring(0, 200));
    
    if (!svgContainerRef.current || !code) {
      console.log('Skipping render: no container or no code');
      return;
    }

    const renderDiagram = async () => {
      try {
        // Generate unique ID for each render
        renderIdRef.current += 1;
        const id = `mermaid-diagram-${renderIdRef.current}`;
        console.log('Rendering with ID:', id);

        // Clear previous content
        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = '';
        }

        // Render the diagram
        const { svg } = await mermaid.render(id, code);
        console.log('Mermaid render successful, SVG length:', svg.length);

        // Insert the SVG
        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svg;
          
          // Ensure SVG renders crisply at any zoom level
          const svgElement = svgContainerRef.current.querySelector('svg');
          if (svgElement) {
            // Preserve aspect ratio and ensure sharp rendering
            svgElement.style.shapeRendering = 'geometricPrecision';
            svgElement.style.textRendering = 'geometricPrecision';
            // Ensure SVG scales properly
            svgElement.style.maxWidth = 'none';
            svgElement.style.height = 'auto';
          }
        }

        // Reset zoom and pan when new diagram is rendered
        setScale(1);
        setPanOffset({ x: 0, y: 0 });
      } catch (error) {
        // Handle rendering errors gracefully
        console.error('Mermaid rendering error:', error);
        
        if (svgContainerRef.current) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          svgContainerRef.current.innerHTML = `
            <div style="
              color: ${theme.colors.error};
              padding: 20px;
              border: 2px solid ${theme.colors.error};
              border-radius: 8px;
              background: ${theme.mode === 'dark' ? '#2a1a1a' : '#fff5f5'};
            ">
              <h3 style="margin-top: 0;">Diagram Rendering Error</h3>
              <p style="margin: 10px 0;">Failed to render the Mermaid diagram.</p>
              <details style="margin-top: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Error Details</summary>
                <pre style="
                  margin-top: 10px;
                  padding: 10px;
                  background: ${theme.mode === 'dark' ? '#1a1a1a' : '#f0f0f0'};
                  border-radius: 4px;
                  overflow-x: auto;
                  font-size: 12px;
                ">${errorMessage}</pre>
              </details>
              <details style="margin-top: 10px;">
                <summary style="cursor: pointer; font-weight: bold;">Mermaid Code</summary>
                <pre style="
                  margin-top: 10px;
                  padding: 10px;
                  background: ${theme.mode === 'dark' ? '#1a1a1a' : '#f0f0f0'};
                  border-radius: 4px;
                  overflow-x: auto;
                  font-size: 12px;
                  white-space: pre-wrap;
                ">${code}</pre>
              </details>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [code, theme]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        ref={svgContainerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '20px',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'row',
          gap: '12px',
          alignItems: 'flex-end',
        }}
      >
        <CopyButton code={code} />
        <ZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleResetZoom}
          scale={scale}
        />
      </div>
    </div>
  );
}
