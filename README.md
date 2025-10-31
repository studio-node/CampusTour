# Campus Tour
> UT SCHOOL ID: e5a9dfd2-0c88-419e-b891-0a62283b8abd


## How to use Ambassador-led tour tester ([here](./backend/test/test_amb_led.cjs))

Before you run it, make sure the tour you're trying to use 
isn't in `live_tour_sessions`. Just delete it if it's in there.

- Group
  - `node test_amb_led.js --user-type group`
- Ambassador
  - `node test_amb_led.js --user-type ambassador`
- Optional override flags:
  - `--tour-id <example-tour-id>`
  - `--ambassador-id <example-ambassador-id>`




# General Notes I've made

> These are all **maybes**

- Make it so one school can have multiple campuses
- Games or interactive section with each stop

## TODO

- Do emails with confirmation codes
- Cut fat from gemini requests
- media (maybe not mvp)

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

