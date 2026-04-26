import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResponse, ImageAttachment, ProjectType, Platform } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "A creative name for the project (e.g., 'Modern Glass Toggle', 'Fintech Mobile Dashboard')",
    },
    html: {
      type: Type.STRING,
      description: "Semantic HTML. For websites, include sections. For UI, include the app shell.",
    },
    css: {
      type: Type.STRING,
      description: "Standard CSS for secondary styling. Note: Tailwind IS available via CDN in the output environment, so you can use Tailwind classes in HTML OR custom CSS here.",
    },
    js: {
      type: Type.STRING,
      description: "ES Modules JavaScript. Use GSAP for complex animations if needed.",
    },
  },
  required: ["name", "html", "css", "js"],
};

export const generateInteraction = async (
  prompt: string,
  projectType: ProjectType,
  platform?: Platform,
  context?: string,
  image?: ImageAttachment
): Promise<GenerationResponse> => {
  const ai = getAI();
  
  const typeContext = {
    'component': 'an isolated, reusable high-fidelity micro-interaction component.',
    'ui': `a functional ${platform} application interface. ${platform === 'mobile' ? 'Design for a 390x844 viewport (iPhone size).' : 'Design for a desktop browser 1280x800 viewport.'}`,
    'website': 'a multi-section, responsive professional website landing page.'
  }[projectType];

  const systemInstruction = `
    You are a world-class Lead Product Designer and Creative Technologist. 
    Your task is to build ${typeContext}
    
    GUIDELINES:
    1. STYLE: You have Tailwind CSS (CDN) available. Prefer using Tailwind utility classes for layout and common styling to keep the HTML scannable. Use the "css" block for complex effects, glassmorphism, or custom animations that Tailwind cannot easily handle.
    2. ANIMATION: Use GSAP for timelines or complex interactions. Import it via "import gsap from 'gsap';".
    3. INTERACTIVITY: Everything you build must be functional. Tabs should switch, buttons should have active states, and modals (if any) should work.
    4. FIDELITY: Maintain high design standards—think Apple, Linear, or Stripe aesthetics. 
    5. SPECIFICITY: 
       - If ProjectType is "ui" (mobile): Include a status bar, bottom navigation, and mobile-specific patterns.
       - If ProjectType is "ui" (desktop): Include a sidebar or top navigation, and complex dashboard patterns.
       - If ProjectType is "website": Include a hero section, features, testimonials, and a footer.
  `;

  const userText = context 
    ? `Existing Project Code:
       ${context}
       
       Update/Refinement Request: "${prompt}"
       Type: ${projectType} ${platform ? `(${platform})` : ''}
       
       Continue with the same style but apply the requested changes.`
    : `Build project: "${prompt}"
       Type: ${projectType} ${platform ? `(${platform})` : ''}
       
       Requirements:
       - Follow high-end design trends.
       - Use Tailwind for core layout.
       - Use GSAP for any motion.`;

  const parts: any[] = [{ text: userText }];
  
  if (image) {
    parts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: GENERATION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  
  try {
    return JSON.parse(text.trim());
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("AI output was not valid JSON. Please try again.");
  }
};