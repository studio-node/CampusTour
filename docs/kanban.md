# Kanban Board: Utah Tech Campus Tour App

This Kanban board helps track the development progress of the app.

## Columns

- **Backlog**: Tasks yet to be started. These are typically derived from the requirements and specifications documents.
- **To Do**: Tasks planned for the current development cycle/sprint.
- **In Progress**: Tasks currently being worked on.
- **Done**: Completed and verified tasks.
- **Blocked**: Tasks that cannot proceed due to external dependencies or issues.

---

## Tasks

### Backlog



- **Styling & UI Polish**
  - [ ] Basic responsive UI for different screen sizes.
- **Documentation**
  - [ ] Write README for developers (setup, build, run instructions).
  - [ ] Document any complex components or logic.
- **Usage Tracking (Initial Considerations - TBD)**
  - [ ] Research and select an analytics solution (e.g., Firebase Analytics, Expo Analytics).
  - [ ] Plan what specific events to track for: buildings viewed, tours started/completed, interest selections.
- **Build & Deployment (Placeholders)**
  - [ ] Configure build process with Expo Application Services (EAS).
  - [ ] Prepare for App Store/Play Store submission (metadata, screenshots).

### To Do

- **Backend/Remote Content**
  - [ ] Define API/structure for remote building data and tour configurations if different from `locations.js`.


### In Progress


### Done

- [x] `docs/README.md` created.
- [x] `docs/functional-specifications.md` created.
- [x] `docs/technical-specifications.md` created.
- [x] `docs/data-model.md` created.
- [x] `docs/ui-ux-guidelines.md` created.
- [x] `docs/kanban.md` created.
- [x] Create initial project documentation structure (`docs` folder). (This task)
- **Project Setup & Configuration**
  - [x] Initialize React Native project with Expo.
  - [x] Configure ESLint, Prettier for code quality.
  - [x] Set up basic folder structure (components, screens, assets, navigation, services).
  - [x] Create `locations.js` file with the defined structure (data to be filled by user).
- **Core App Navigation**
  - [x] Implement tab-based navigation (Map Tab, Tour Tab).
  - [x] Basic screen setup for Map and Tour tabs.
- **Map Tab Functionality**
  - [x] Integrate Apple Maps (iOS) / Google Maps (Android).
  - [x] Display campus buildings as markers from `locations.js`.
  - [x] Show user's current location.
  - [x] Implement "recenter map" button.
  - [x] Handle marker click to navigate to Building Info Page (placeholder for now).
- **Building Info Page**
  - [x] Create Building Info Page screen.
  - [x] Display building details (name, image, description) from `locations.js`.
- **Tour Tab Functionality - Phase 1 (Default Tour)**
  - [x] Implement UI for displaying a list of tour stops.
  - [x] Load default tour from a predefined sequence using `locations.js` data.
  - [x] For each tour stop:
    - [x] Display building name, picture, basic description.
    - [x] "Details" button: navigates to Building Info Page.
    - [x] "Location" button: jumps to Map tab, focused on the building.
- **Tour Tab Functionality - Phase 2 (Interest-Based Tour)**
  - [x] Design and implement interest selection UI.
  - [x] Logic to filter `locations.js` based on selected interests.
  - [x] Generate and display tour based on selected interests and custom order.
- **Styling & UI Polish**
  - [x] Apply Utah Tech branding (colors, fonts) - _requires branding guidelines_.
  - [x] Ensure consistent icons and labels.
- **Backend/Remote Content (Initial Considerations - TBD)**
  - [x] Research options for remote content updates (e.g., JSON file on a server, simple CMS).


### Blocked

- [ ] Styling & UI Polish: _Waiting for official Utah Tech branding guidelines (colors, fonts)_.

---

**How to Use:**

- **Moving Tasks**: Copy and paste task lines between columns.
- **Updating Status**: Change `[ ]` to `[x]` when a task or sub-task is completed.
- **Adding Details**: Add sub-tasks or notes under main tasks as needed.
