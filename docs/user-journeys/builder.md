# Tour Builder User Journey

This will be a web app that will basically have to be accessed on PC (it just would a pain to build a tour otherwise). I'm thinking this will be the dashboard for the school. You can build the tour, edit your tour, view your useage data and analytics, set up user profiles for ambassadors and stuff, and any other stuff the school would need to manage. 


### Pre-building Section

- **Sign-up / Sign-in**
    - Sign-up
        - This needs to be discussed more 
            - pay first?
            - How to get schools to sign up
    - Sign-in
        - Email
        - Password


# Building Section

## Dept Builder

This is where the dept chairs will be inputting the content and collateral for Waypoints that are assgined to them by "admin" (the recruiting dept).

- **What they can add**
    - Description
    - Tags
        - Interests
        - Careers 
        - Majors
    - Location Features
    - Card image url/upload
    - Talking Points
        - What makes this interesting
        - Why go here
        - History
        - Fun facts
        - Traditions
        - Culture

## Admin Builder


- **Locations List**
    - Cards for each location
        - Delete location
        - Edit location
        - Image and some info like tags and description, similar to tour screen in mobile app

- **Add a Stop**
    - Input Fields
        - Field Descriptions
        - Required or not
        - Selecting
            - Dropdown
            - Text Input / Search
        - Actual Fields ([table schema here](../supabase_table_schemas.md))
            - Name
            - Coordinates
                > Thinking about doing a map with selector to fill these in 
                - latitude
                - longitude
            - Image Url
                - Must be online fetchable image
            - Description
            - Features
            - Tags
                - Interests
                - Why go here
                - History
                - Fun facts
                - Traditions
                - Culture
                > Try and avoid multiple of same tag types i.e. `sport vs sports`
            - is_tour_stop (change to default tour stop)
            - Order Index
                - For deciding tour order
            - No-Go Zones
    


