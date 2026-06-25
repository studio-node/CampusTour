# Base Prompt

This project is for a campus tour app and supporting services that I am building for my university, but it will ultimately be sold other schools, so we have to load lots of data dynamically. I am in the middle of building it at the moment, and I need your help. There are 4 major components of this product: 

- **mobile app** 
    - Where the actual campus tours happen and is what this is all built around
    - User Types:
        - self-guided
        - ambassador-led
        - ambassador
- **webapp** 
    - Where ambassador-led users sign up for tour-appointments, but more importantly where the admin dashboard and managment utilities are
    - User Types:
        - school admin
        - builder (a user that the school admin delegates editing access for one location to)
        - ambassador (to see their scheduled tours)
- **backend**
    - Handles some key parts of the project, but isn't a full backend as SupaBase handles many of those thigns
    - Current list of what is handled here (this is subject to change):
        - tour generation (call to Gemini API)
        - walking direction fetching (Google Routes API)
        - ambassador-led tour session handling and managment (websockets) 
- **SupaBase**
    - This is where a lot of our backend/server type funcionality is at
    - If you need to see our entire schema, read @supabase/supabase_schema.sql
    - List of what all is here:
        - User Auth
        - All database stuff


This is just a high-level overview of what is here and what we are working on. Ask any questions you need to know to better understand what is going on, architecture, business logic, etc.
