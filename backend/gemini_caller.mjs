import { GoogleGenAI, Type } from "@google/genai";


export default class GeminiCaller {

  static ai = new GoogleGenAI({apiKey: process.env.GEMINI_TOKEN});
  
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
    let jsoned = JSON.parse(response.text);
    return jsoned;
  }
  
  static makePrompt(locations, interests) {
    const jsonLocations = JSON.stringify(locations);
    const jsonInterests = JSON.stringify(interests);

    return `
    I have the following locations on a college campus:
    ${jsonLocations}
    
    Given the following interests selected by the user: 
    ${jsonInterests}
    
    I need you generate an appropriate tour using the interests selected by the user. Return the
    generated tour as an array of location_ids.
    `;
  }
}
