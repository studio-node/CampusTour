import { GoogleGenAI, Type } from "@google/genai";
import ACCESS_TOKEN from "./gemini_key.js";


export default class GeminiCaller {

  static ai = new GoogleGenAI({apiKey: ACCESS_TOKEN});
  
  static async generateTour(locations, interests) {

    const prompt = this.makePrompt(locations, interests);

    const options = {
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    };
    
    const response = await this.ai.models.generateContent(options);
    console.log(response.text);
    
    let jsoned = JSON.parse(response.text);
    console.log("jsoned", jsoned);
  }
  
  static makePrompt(locations, interests) {
    return `
    I have the following locations on a college campus:
    ${locations}
    
    Given the following interests selected by the user: 
    ${interests}
    
    I need you generate an appropriate tour using the interests selected by the user. Return the
    generated tour as an array of location_ids.
    `;
  }
}
