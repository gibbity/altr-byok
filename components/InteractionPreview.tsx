
import React, { useMemo } from 'react';
import { GeneratedInteraction } from '../types';

interface InteractionPreviewProps {
  interaction: GeneratedInteraction;
}

const InteractionPreview: React.FC<InteractionPreviewProps> = ({ interaction }) => {
  const isMobile = interaction.projectType === 'ui' && interaction.platform === 'mobile';
  const isDesktop = interaction.projectType === 'ui' && interaction.platform === 'desktop';
  const isWebsite = interaction.projectType === 'website';

  const srcDoc = useMemo(() => `
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

          ${interaction.css}
        </style>
      </head>
      <body>
        <div id="interaction-root">
          ${interaction.html}
        </div>
        <script type="module">
          ${interaction.js}
        </script>
      </body>
    </html>
  `, [interaction.id, interaction.html, interaction.css, interaction.js, interaction.projectType, interaction.platform]);

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
