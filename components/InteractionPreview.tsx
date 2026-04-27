
import React, { useMemo, useEffect, useRef } from 'react';
import { GeneratedInteraction, SelectedElement } from '../types';

interface InteractionPreviewProps {
  interaction: GeneratedInteraction;
  onElementSelected?: (element: SelectedElement | null) => void;
  activeTweaks?: Record<string, string | number>;
  editable?: boolean;
}

const InteractionPreview: React.FC<InteractionPreviewProps> = ({ 
  interaction, 
  onElementSelected,
  activeTweaks = {},
  editable = false
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMobile = interaction.projectType === 'ui' && interaction.platform === 'mobile';
  const isDesktop = interaction.projectType === 'ui' && interaction.platform === 'desktop';
  const isWebsite = interaction.projectType === 'website';

  // Apply tweaks to the iframe without reloading
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      const win = iframeRef.current.contentWindow;
      Object.entries(activeTweaks).forEach(([prop, val]) => {
        win.document.documentElement.style.setProperty(prop, String(val));
      });
    }
  }, [activeTweaks]);

  // Handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED' && onElementSelected) {
        onElementSelected(event.data.element);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onElementSelected]);

  const srcDoc = useMemo(() => {
    const tweakStyles = Object.entries(activeTweaks)
      .map(([prop, val]) => `${prop}: ${val};`)
      .join('\n');

    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
        <script type="importmap">
        {
          "imports": {
            "gsap": "https://esm.sh/gsap@3.12.5"
          }
        }
        </script>
        <style>
          :root {
            ${tweakStyles}
          }
          * { box-sizing: border-box; }
          html, body { 
            margin: 0; 
            padding: 0;
            width: 100%;
            height: 100%;
            ${(isMobile || isDesktop || isWebsite) ? 'display: block;' : 'display: flex; align-items: center; justify-content: center;'}
            background: #ffffff;
            overflow-x: hidden; 
            font-family: "Inter", sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          
          #interaction-root {
            width: 100%;
            height: 100%;
            ${(isMobile || isDesktop || isWebsite) ? 'display: block;' : 'display: flex; align-items: center; justify-content: center;'}
          }

          /* Luminal Selection Highlighting */
          ${editable ? `
          .luminal-hover {
            outline: 2px solid #6366f1 !important;
            outline-offset: -2px !important;
            cursor: pointer !important;
          }
          .luminal-selected {
            outline: 2px dashed #ec4899 !important;
            outline-offset: -2px !important;
            box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.1) !important;
          }
          ` : ''}

          ${interaction.css}
        </style>
      </head>
      <body>
        <div id="interaction-root">
          ${interaction.html}
        </div>
        <script type="module">
          ${interaction.js}

          ${editable ? `
          const root = document.getElementById('interaction-root');
          let currentSelected = null;

          function getSelector(el) {
            if (el.id) return '#' + el.id;
            if (el.className) {
              const classes = Array.from(el.classList)
                .filter(c => !c.startsWith('luminal-'))
                .join('.');
              if (classes) return el.tagName.toLowerCase() + '.' + classes;
            }
            return el.tagName.toLowerCase();
          }

          root.addEventListener('mouseover', (e) => {
            if (e.target === root) return;
            e.target.classList.add('luminal-hover');
          });

          root.addEventListener('mouseout', (e) => {
            e.target.classList.remove('luminal-hover');
          });

          root.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (currentSelected) currentSelected.classList.remove('luminal-selected');
            
            currentSelected = e.target;
            currentSelected.classList.add('luminal-selected');

            const styles = window.getComputedStyle(currentSelected);
            const rect = currentSelected.getBoundingClientRect();

            window.parent.postMessage({ 
              type: 'ELEMENT_SELECTED', 
              element: {
                selector: getSelector(currentSelected),
                tagName: currentSelected.tagName,
                styles: {
                  backgroundColor: styles.backgroundColor,
                  color: styles.color,
                  fontSize: styles.fontSize,
                  fontFamily: styles.fontFamily,
                  padding: styles.padding,
                  margin: styles.margin,
                  borderRadius: styles.borderRadius,
                  borderColor: styles.borderColor
                },
                rect: {
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height
                }
              } 
            }, '*');
          });
          ` : ''}
        </script>
      </body>
    </html>
  `;
  }, [interaction.id, interaction.html, interaction.css, interaction.js, interaction.projectType, interaction.platform, activeTweaks, editable]);

  const containerStyles = useMemo(() => {
    if (isMobile) {
      return { width: '390px', height: '844px', borderRadius: '48px', border: '12px solid #1a1a1a', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)' };
    }
    if (isDesktop || isWebsite) {
      return { width: '100%', height: '100%', borderRadius: '0px', border: 'none' };
    }
    return { width: '100%', height: '100%', borderRadius: '40px', border: 'none' };
  }, [isMobile, isDesktop, isWebsite]);

  return (
    <div className="w-full h-[800px] bg-[#050505] flex items-center justify-center overflow-hidden p-8">
      <div 
        className="transition-all duration-700 ease-in-out bg-white overflow-hidden relative"
        style={containerStyles}
      >
        {isMobile && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center">
             <div className="w-8 h-1 bg-gray-800 rounded-full" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={interaction.id}
          srcDoc={srcDoc}
          title="Interaction Preview"
          className="w-full h-full border-none pointer-events-auto"
          sandbox="allow-scripts allow-modals allow-popups allow-same-origin"
        />
      </div>
    </div>
  );
};

export default InteractionPreview;
