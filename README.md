# Campus Tour

This project is for a Campus tour app and supporting services that I am building for my Univserity, but it will be for many schools. I am in the middle of building it at the moment, and I need your help. You can find all the overaching documentation for this project in DOCS. I am in the process of handling the ambassador-led tour part of this product. The next part I need to accomplish this is a websocket managed tour that works by the ambassador leading the tour from their phone. They are who marks each tour stop as completed, not the user. The server for this portion will be the one in the BACKEND folder. I need you to go through the mobile app and see what all we need to do to accomplish this, and then create a to-do list to accomplish this. Ask me questions you need to better understand what is wanted here. 



## Questions for Clarification
Q: Ambassador Authentication: Should ambassadors use the same Supabase Auth system as regular users, or do they need a separate authentication flow?
Q: QR Code Format: What information should the QR codes contain? Tour session ID, school ID, appointment ID, or a combination?
Q: Tour Session Limits: Should there be limits on:
Q: Number of participants per tour?
Q: Tour session duration?
Q: Number of concurrent tours per ambassador?
Q: Offline Functionality: How should the app handle network disconnections during an active tour? Should participants cache the tour data?
Q: Tour Stop Advancement: Should tour stops advance automatically based on location, or only when the ambassador manually advances them?
Impromptu Tours: For impromptu tours, how should participants discover and join them? Should there be a discovery mechanism or only QR codes?
Tour Completion: What should happen when a tour ends? Should there be analytics tracking, feedback collection, or lead capture?
Error Handling: How should the system handle scenarios like:
Ambassador disconnects mid-tour
All participants disconnect
Tour runs longer than scheduled


## UT SCHOOL ID: e5a9dfd2-0c88-419e-b891-0a62283b8abd


- Create tour
  - Assign Ambassador
  - Schedule Time
    - Use a maximum of 2 tours per 1 hour block
  - 
- See tours
  - Tour groups are clickable to show more details
  - In details
    - Edit assigned ambassador
    - Add ambassador


## TODO

- change how university select is structured so it works better with new setup
- media (maybe not mvp)





# General Ideas with no rhyme or reason

> These are all **maybes**

- Make it so one school can have multiple campuses
- Games or interactive section with each stop






### Ways to close and reference an issue in commit message:
- `fix #xxx`
- `fixes #xxx`
- `fixed #xxx`
- `close #xxx`
- `closes #xxx`
- `closed #xxx`
- `resolve #xxx`
- `resolves #xxx`
- `resolved #xxx`

## Other Apps

### [Yale Walking tour](https://apps.apple.com/us/app/yale-admissions-campus-tour/id1221482922)
- Carousel at bottom of map screen of stops
- Numbered map markers
- More guided tour w/ numbered stops
- Audio snippets 
- Long explanations for each stop
- **MapBox**
    - [Github for React-Native Package](https://github.com/rnmapbox/maps)
    - [Getting Started for React-Native](https://github.com/rnmapbox/maps/blob/main/docs/GettingStarted.md)

