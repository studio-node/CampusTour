# Kanban for building the analytics and Admind Dashboard


## SupaBase
- **Table Setup**
  - [X] Set up table with provided schema.


## Mobile App

- **Setup**
  - [ ] Create a session_id for each user per day with async storage to be included with each export to the database
  
- **Exporting Data**
  - [ ] Export selected interests after the user selects them with `event_type`: `interests-chosen`. Populate the `metadata` column with this data
  - [ ] Export when users start their tour with `event_type`: `tour-start`
  - [ ] Export when users finish their tour (when all tour stops have been marked as complete) with `event_type`: `tour-finish`
  - [ ] Use geofencing to determine how long users spend at each location after they leave at that location. For now, use a radius of 0.05 miles to determine if the user is "at" the location. Export this data in the `metadata` column with a key of `duration`
