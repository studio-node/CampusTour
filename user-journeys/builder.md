# Tour Builder User Journey

This will be a web app that will basically have to be accessed on PC (it just would a pain to build a tour otherwise). I'm thinking this will be the dashboard for the school. You can build the tour, edit your tour, view your useage data and analytics, set up user profiles for ambassadors and stuff, and any other stuff the school would need to manage. 


## Pre-building Section

- **Sign-up / Sign-in**
    - Sign-up
        - This needs to be discussed more 
            - pay first?
            - How to get schools to sign up
    - Sign-in
        - Email
        - Password


## Building Section

- **Locations List**
    - Cards for each location
        - Delete location
        - Edit location
        - Image and some info like tags and description

- **Add a Stop**
    - Input Fields
        - Field Descriptions
        - Required or not
        - Actual Fields ([table schema here](../supabase_table_schemas.md))
            - Name
            - Coordinates
                > Thinking about doing a map with selector to fill these in 
                - latitude
                - longitude
            - Image Url
                - Must be online fetchable image
            - Description
            - Interests
                > Try and avoid multiple of same interest types i.e. `sport vs sports`
                - Dropdown
                - Text Input / Search
            - is_tour_stop (change to default tour stop)
            - Order Index
                - For deciding tour order
            - **MORE WILL BE ADDED HERE...**
                - 

        