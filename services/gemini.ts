import { GoogleGenerativeAI } from "@google/generative-ai";

const getAIClient = () => {
  const metaEnv = (import.meta as any).env || {};
  // Prioritize environment variables, but fall back to the provided key if missing
  const apiKey = metaEnv.VITE_API_KEY || metaEnv.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined) || "AIzaSyDrK28IHOxcee3vpwD9kgW9ygS6L3HjuR8";
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Please check your .env file or Vercel Environment Variables.");
    return null;
  }
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI:", error);
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
  if (!ai) return "AI Service Unavailable (Missing API Key)";

  let prompt = "";
  
  if (type === 'description') {
    prompt = `Create a short, engaging description for a physical education session about "${topic}". Include 3 key learning objectives. Keep it under 150 words.`;
  } else {
    prompt = `Create 3 multiple choice exam questions for a PE class session about "${topic}". Include the correct answer. Format as simple text.`;
  }

  try {
    // Updated to gemini-2.5-flash as per coding guidelines
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "No content generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('404')) {
        return "Error: Model not found. Please ensure the API Key has access to Generative Language API.";
    }
    return "Failed to generate content. Please check your API key and try again.";
  }
};

export const extractStudentNamesFromImage = async (imageFile: File): Promise<string[]> => {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Service Unavailable. Check API Key.");

  const base64Data = await fileToGenerativePart(imageFile);
  const prompt = "Extract the list of student names from this image. Return ONLY the names, one per line. Do not include numbers, grades, dates, or headers. Just the First and Last names.";
  
  try {
    // Updated to gemini-2.5-flash as per coding guidelines
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const imagePart = {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Data
      }
    };
    
    const result = await model.generateContent([imagePart, { text: prompt }]);
    const response = await result.response;
    const text = response.text() || "";
    
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
    Analyze this image of a grade sheet (handwritten or printed). 
    Extract the student names and their scores for Term 1, Term 2, and Term 3 (if available).
    
    Return a STRICT JSON array of objects. Do not wrap in markdown code blocks.
    Structure:
    [
      { "name": "Student Name", "note1": 15, "note2": 14, "note3": 0 }
    ]
    
    Rules:
    - If a note is missing, use 0.
    - Extract as accurately as possible.
    - Return ONLY the JSON.
  `;

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const imagePart = {
      inlineData: {
        mimeType: imageFile.type,
        data: base64Data
      }
    };

    const result = await model.generateContent([imagePart, { text: prompt }]);
    const response = await result.response;
    let text = response.text();

    // Clean up markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Grade Extraction Error:", error);
    throw new Error("Failed to extract grades from image.");
  }
};