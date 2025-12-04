import { GoogleGenAI, Type } from "@google/genai";

const getAIClient = () => {
  let apiKey = "";
  try {
    // Safely check if process is defined (Node.js/Build env) before accessing env
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || "";
    }
  } catch (e) {
    console.warn("Environment variable access failed.");
  }
  
  if (!apiKey) {
    console.error("Gemini API Key is missing. Please check your environment variables.");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return null;
  }
};

const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateSessionContent = async (topic: string, type: 'description' | 'quiz'): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable (Missing or Invalid API Key)";

  let prompt = "";
  
  if (type === 'description') {
    prompt = `Create a short, engaging description for a physical education session about "${topic}". Include 3 key learning objectives. Keep it under 150 words.`;
  } else {
    prompt = `Create 3 multiple choice exam questions for a PE class session about "${topic}". Include the correct answer. Format as simple text.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No content generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return "Failed to generate content. Please check your API key settings.";
  }
};

export const extractStudentNamesFromImage = async (imageFile: File): Promise<string[]> => {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Service Unavailable. Check API Key.");

  const base64Data = await fileToGenerativePart(imageFile);
  const prompt = "Extract the list of student names from this image. Return ONLY the names, one per line. Do not include numbers, grades, dates, or headers. Just the First and Last names.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });
    
    const text = response.text || "";
    return text.split('\n').map(name => name.trim()).filter(name => name.length > 0);
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Failed to extract names from image. Please check your API key.");
  }
};

export const extractGradesFromImage = async (imageFile: File): Promise<any[]> => {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Service Unavailable");

  const base64Data = await fileToGenerativePart(imageFile);
  const prompt = `
    Analyze this image of a grade sheet. 
    Extract the student names and their scores for Term 1, Term 2, and Term 3.
    If a note is missing, use 0.
    Extract as accurately as possible.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              note1: { type: Type.NUMBER },
              note2: { type: Type.NUMBER },
              note3: { type: Type.NUMBER }
            }
          }
        }
      }
    });

    let text = response.text;
    if (!text) return [];

    // Clean up any markdown formatting if present (e.g. ```json ... ```)
    text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Grade Extraction Error:", error);
    throw new Error("Failed to extract grades from image.");
  }
};