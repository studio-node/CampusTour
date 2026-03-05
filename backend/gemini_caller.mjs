import { GoogleGenAI, Type } from "@google/genai";


export default class GeminiCaller {

  static ai = new GoogleGenAI({apiKey: process.env.GEMINI_TOKEN});
  
  static async generateTour(locations, interests) {
    if (process.env.NODE_ENV === 'DEV') {
      return [
        "dea95d28-cc6c-488c-992a-6ab01f18d02a",
        "5183194d-05c5-4c49-86f6-38928b01fd73",
        "8eeec2d1-91ca-4649-847c-afa47279f6e5",
        "27f109ef-e5a8-4507-99f2-82dc949a7d5f",
        "f2a12cf5-6108-4fba-99be-9dedd97f8a8b",
        "48ffd687-5055-4f61-ba05-604215c39b92",
        "4e0ef166-b03f-4f80-84c8-a09fa98e84dc",
        "8773d1c3-bf4a-4a1f-bdfd-f268c233247a",
        "a33edd7a-6e88-4299-b5c1-433d6ed34db1",
        "1146a237-3e9b-4288-a9bc-3c245044aa7b",
        "3dc5ca20-0c5b-49fd-8eb4-7d91240aa263"
      ];
    }

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
    
    I need you to generate an appropriate campus tour based on the user's selected interests. Return the
    generated tour as an array of \`location_id\`. All tours should at least include the library, 
    student center, and recreation center/gym. If the number of locations that match the interest list is less than 8, 
    you should fill out the rest of the tour with important locations like the dining hall, student union, 
    bookstore, health center, residence halls, etc. Use your best judgment on which ones to add to create a diverse, 
    interesting tour until you have at least 8 locations. If the number of locations that match the interest list is 
    greater than 14, you should try to keep the list under 14 by removing some of the locations that are less important 
    or are somewhat redundant with other locations.
    `;
  }
}
