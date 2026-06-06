
import { GoogleGenAI, Type } from "@google/genai";
import { DictionaryEntry } from "../types";

const CHUNK_SIZE = 4000; // Daha hızlı yanıt için ideal parça boyutu

export const processRawData = async (
  rawText: string, 
  onProgress?: (current: number, total: number) => void
): Promise<DictionaryEntry[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Metni parçalara böl
  const chunks: string[] = [];
  for (let i = 0; i < rawText.length; i += CHUNK_SIZE) {
    chunks.push(rawText.slice(i, i + CHUNK_SIZE));
  }

  const allEntries: DictionaryEntry[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (onProgress) onProgress(i + 1, chunks.length);

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Sana verilen metin parçasını sözlük formatına dönüştür. 
                 Sadece JSON döndür. Boş metinler için [] döndür.
                 Gereksiz açıklama yapma, sadece veriyi temizle.
                 JSON Şeması: Array<{ word: string, definition: string, type?: string, example?: string }>
                 
                 Metin:
                 ${chunks[i]}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              definition: { type: Type.STRING },
              type: { type: Type.STRING },
              example: { type: Type.STRING }
            },
            required: ["word", "definition"]
          }
        }
      }
    });

    try {
      const chunkEntries = JSON.parse(response.text || "[]");
      allEntries.push(...chunkEntries);
    } catch (error) {
      console.error(`Chunk ${i} parsing error:`, error);
    }
  }

  return allEntries;
};
