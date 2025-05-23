# Kanban Board: Utah Tech Campus Tour App

This Kanban board helps track the development progress of the app.

## Columns

- **Backlog**: Tasks yet to be started. These are typically derived from the requirements and specifications documents.
- **To Do**: Tasks planned for the current development cycle/sprint.
- **In Progress**: Tasks currently being worked on.
- **Needs Review / QA**: Tasks completed by the developer and awaiting review or quality assurance testing.
- **Done**: Completed and verified tasks.
- **Blocked**: Tasks that cannot proceed due to external dependencies or issues.

---

## Tasks

### Backlog

- **Project Setup & Configuration**
  - [x] Initialize React Native project with Expo.
  - [ ] Configure ESLint, Prettier for code quality.
  - [ ] Set up basic folder structure (components, screens, assets, navigation, services).
  - [ ] Create `locations.js` file with the defined structure (data to be filled by user).
- **Core App Navigation**
  - [ ] Implement tab-based navigation (Map Tab, Tour Tab).
  - [ ] Basic screen setup for Map and Tour tabs.
- **Map Tab Functionality**
  - [ ] Integrate Apple Maps (iOS) / Google Maps (Android).
  - [ ] Display campus buildings as markers from `locations.js`.
  - [ ] Show user's current location.
  - [ ] Implement "recenter map" button.
  - [ ] Handle marker click to navigate to Building Info Page (placeholder).
- **Building Info Page**
  - [ ] Create Building Info Page screen.
  - [ ] Display building details (name, image, description) from `locations.js`.
- **Tour Tab Functionality - Phase 1 (Default Tour)**
  - [ ] Implement UI for displaying a list of tour stops.
  - [ ] Load default tour from a predefined sequence using `locations.js` data.
  - [ ] For each tour stop:
    - [ ] Display building name, picture, basic description.
    - [ ] "Details" button: navigates to Building Info Page.
    - [ ] "Location" button: jumps to Map tab, focused on the building.
- **Tour Tab Functionality - Phase 2 (Interest-Based Tour)**
  - [ ] Design and implement interest selection UI.
  - [ ] Logic to filter `locations.js` based on selected interests.
  - [ ] Generate and display tour based on selected interests and custom order.
- **Styling & UI Polish**
  - [ ] Apply Utah Tech branding (colors, fonts) - _requires branding guidelines_.
  - [ ] Ensure consistent icons and labels.
  - [ ] Basic responsive UI for different screen sizes.
- **Offline Capability & Caching**
  - [ ] Implement data caching for `locations.js`.
  - [ ] Ensure app loads cached data when offline.
  - [ ] Handle map behavior when offline (e.g., display cached tiles if possible, or a message).
- **Backend/Remote Content (Initial Considerations - TBD)**
  - [ ] Research options for remote content updates (e.g., JSON file on a server, simple CMS).
  - [ ] Define API/structure for remote building data and tour configurations if different from `locations.js`.
- **Usage Tracking (Initial Considerations - TBD)**
  - [ ] Research and select an analytics solution (e.g., Firebase Analytics, Expo Analytics).
  - [ ] Plan what specific events to track for: buildings viewed, tours started/completed, interest selections.
- **Testing & QA**
  - [ ] Unit tests for key functions (e.g., tour generation logic).
  - [ ] Component tests for UI elements.
  - [ ] End-to-end testing on iOS (Expo Go on iPhone).
  - [ ] End-to-end testing on Android (Emulator/Device).
- **Documentation**
  - [x] Create initial project documentation structure (`docs` folder). (This task)
  - [ ] Write README for developers (setup, build, run instructions).
  - [ ] Document any complex components or logic.
- **Build & Deployment (Placeholders)**
  - [ ] Configure build process with Expo Application Services (EAS).
  - [ ] Create development builds for testing.
  - [ ] Prepare for App Store/Play Store submission (metadata, screenshots).

### To Do

- _(Move tasks from Backlog here as they are prioritized)_

### In Progress

- _(Developer moves tasks here when they start working on them)_

### Needs Review / QA

- _(Tasks move here after development for checking)_

### Done

- [x] `docs/README.md` created.
- [x] `docs/functional-specifications.md` created.
- [x] `docs/technical-specifications.md` created.
- [x] `docs/data-model.md` created.
- [x] `docs/ui-ux-guidelines.md` created.
- [x] `docs/kanban.md` created.

### Blocked

- [ ] Styling & UI Polish: _Waiting for official Utah Tech branding guidelines (colors, fonts)_.

---

**How to Use:**

- **Moving Tasks**: Copy and paste task lines between columns.
- **Updating Status**: Change `[ ]` to `[x]` when a task or sub-task is completed.
- **Adding Details**: Add sub-tasks or notes under main tasks as needed.
