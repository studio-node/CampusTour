import { GoogleGenAI, Type } from "@google/genai";


async function generateTour(ai, locations, interests) {
    try {
        const prompt = makePrompt(locations, interests);

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
        
        const response = await ai.models.generateContent(options);
        
        
        if (!response || !response.text) {
            throw new Error('Invalid response from Google GenAI - no text content');
        }
        
        let jsoned;
        try {
            jsoned = JSON.parse(response.text);
        } catch (parseError) {
            console.error('Failed to parse GenAI response as JSON:', response.text);
            throw new Error(`Failed to parse GenAI response: ${parseError.message}`);
        }
        
        if (!Array.isArray(jsoned)) {
            throw new Error('GenAI response is not an array as expected');
        }
        
        return jsoned;
    } catch (error) {
        console.error('Error in generateTour:', error);
        throw error; // Re-throw to be handled by the main handler
    }
}

function makePrompt(locations, interests) {
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

export const handler = async (event) => {
  // let responseyy = {
  //     statusCode: 200,
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Access-Control-Allow-Origin': '*', // Add CORS if needed
  //       'Access-Control-Allow-Headers': 'Content-Type',
  //       'Access-Control-Allow-Methods': 'POST, OPTIONS'
  //     },
  //     body: event.body,
  // };
  
  // return responseyy;
  try {

      
      // Check if GEMINI_TOKEN is set
      if (!process.env.GEMINI_TOKEN) {
        throw new Error('GEMINI_TOKEN environment variable is not set');
      }
      
      // Validate event.body exists
      if (!event.body) {
        throw new Error('Request body is missing');
      }
    
      
      let body;
      try {
        body = JSON.parse(JSON.stringify(event.body));
      } catch (parseError) {
        // throw new Error(`Failed to parse request body: ${parseError.message}`);
      }

      let response2 = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Add CORS if needed
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify(body),
      };
      return response;  
      
      
      // Validate required fields (handle both lowercase and uppercase)
      const locations = body.locations || body.Locations;
      const interests = body.interests || body.Interests;
      
      if (!locations || !interests) {
        throw new Error('Missing required fields: locations and/or interests');
      }
      
      const ai = new GoogleGenAI({apiKey: process.env.GEMINI_TOKEN});
    
      const newTour = await generateTour(ai, locations, interests);
      
    
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Add CORS if needed
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify(newTour),
      };
      return response;
  } catch (error) {
    console.error('Error in handler:', error);
    const response = {
      statusCode: 500, // Changed from 400 to 500 for internal server errors
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
    return response;
  }
};
