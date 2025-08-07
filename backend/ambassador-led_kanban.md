# Ambassador-Led Tour WebSocket Kanban Board

## To Do



### Mobile App (React Native)

- [ ] **Ambassador Tour Control UI:**
    - [ ] On the `tour-details` or a new "Live Tour" screen, add controls for the ambassador to manage the tour.
    - [ ] Implement UI to start a session and display the join code/QR code.
    - [ ] Create buttons to "Set as Current Stop", "Mark as Visited", "Add/Remove Stop".
    - [ ] Wire up UI controls to send the corresponding WebSocket events.
    - [ ] Implement a listener for `ambassador:ping` and display a notification.
- [ ] **Tour Member Experience UI:**
    - [ ] Create a screen for users to join a tour using a code.
    - [ ] Implement logic to listen for `tour:state_update` and dynamically update the `(tabs)/current.tsx` screen.
    - [ ] Ensure the `(tabs)/tour.tsx` screen is read-only and reflects progress based on server events.
    - [ ] Add a "Ping Ambassador" button that sends the `ambassador:ping` event.
- [ ] **State Management:** Use a state management solution (or React Context) to share the live tour state across different tabs/screens (`map`, `current`, `tour`).


## Blocked

### Mobile App (React Native)



## In Progress

### Mobile App (React Native)

- [ ] **Ambassador Tour Control UI:**
    - [ ] Implement Start tour functionality to create session with server 

## Done

### Mobile App (React Native)

- [x] **Integrate WebSocket Client:** Add `socket.io-client` or a similar library to the mobile project.
- [x] **Connection Manager:** Create a service or hook to manage the WebSocket connection state.






### Backend (Node.js + WebSockets)

- [x] **Setup WebSocket Server:** Integrate `socket.io` or `ws` into the existing Node.js backend.
- [x] **Tour Session Management:**
    - [x] Design a system for managing live tour "rooms" or "sessions".
    - [x] Implement `create_session` logic for ambassadors.
    - [x] Implement `join_session` logic for tour members (using a tour code/ID).
    - [x] Handle user disconnections and reconnections gracefully.
- [x] **Define WebSocket Event Schema:**
    - [x] **Ambassador -> Server -> Group:**
        - `tour:state_update` (e.g., current stop changed, stop marked as visited).
        - `tour:structure_update` (e.g., stops added, removed, or reordered).
        - `tour:end` (to terminate the session for all participants).
- [x] **Tour Member -> Server -> Ambassador:**
    - `ambassador:ping` (for the "raise hand" feature).
- [x] **Data Persistence:** Persist critical tour session state (e.g., current stop, progress) to Supabase to handle server restarts or long disconnects.






