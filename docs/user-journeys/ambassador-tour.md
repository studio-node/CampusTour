# Ambassador User Journey

If the ambassador is using the app, it means they are giving a guided tour using the app and those that are on the tour will also have the app open. Both will be discussed here. This experience will be like the self-guided journey, but the tour will be controlled by the ambassador, and the users' experience will be managed by the ambassador using our server using websockets.


## Ambassador

### Pre-Tour Section

- User-Type Selection
    - Self-guided 
    - Ambassador-led group 
        - [ ] Tour taker  
        - [x] Ambassador 
            - Button at top with <button>I'm an ambassador</button> or something like that 

- Sign-In / Sign-Up screen
    - Sign-In
        - Ambassador signs into their account if the this is the first time they've downloaded the app
    - Sign-Up
        - Ambassador creates an account with required info
            - Email
            - Name
            - Password (will be stored encrypted) 
            - **NOT** school 
                - Their name and email will be in the system already from school creating ambassador role

- Tour type (scheduled vs impromptu)
    - Scheduled
        - Select Tour groups
            - Some info about each group
            - Tap group for details
            - Can see tour for the group
    - Impromptu
        - Creates tour group
        - Invite tour members
        - Complete survey
  
- Create Tour 
    - Create QR Code for tour-group to scan and start tour
    - Choose minimum/default tour stops (users will be able to add their own after)
    - Choose tour length
    - Group Roster
        - As users join the group session they will be displayed in a list 
        - Ambassador clicks "done" when all users are in


### Actual tour Screen

> For the ambassadors, the app from here will be very similar to standard users, just with extra features and sections.


- Menu navigation (maybe hamburger menu)
    - Finish tour
    - Invite new members
    - Tour members list
    > After tour is finished there's a "Finish Tour" pop up
    > Try to stop tour sessions from going on forever

- Map Tab
    - This will show all the tour stops **AND** all the interest points that might not be shown to standard users and the tour-group
    - Most detailed map

- Tour Tab
    - Stops **are** rearrangeable 
    - Stops **can** be deleted
    - Stops **can** be added

    - Stop Detail Screen
        - This will contain all of the data that each stop has, including additional speaker notes to help the ambassador in their tour
        > The current stop's details screen will be what is broadcasted to the group's devices

- User ping modal
    - So users don't have to physically raise their hand and for quieter users so they don't have to speak up over a group
    - When someone in the tour group pings the ambassador it will pop up a little modal with that user's name. It will also vibrate a little bit.




## Guided Tour Group


### Pre-Tour Section

- User-Type Selection
    - Self-guided 
    - Ambassador-led group 
        - [x] Tour taker 
        - [ ] Ambassador 

- QR-Code Scan Screen
    - Camera will scan the ambassadors phone with the QR code to join tour-session

- Interest Selection
    - Users will select their interests here 
        - Maybe limit them to not add too many stops?
    - Click done to submit interests and wait for everybody else
        - Waiting screen when done


### Actual tour Screen

> This will be a more locked down version of the standard-user app

- Map Screen
    - This will just show the tour stops by default. Users can use map legend to show additional stops and points of interest

- Current Stop Tab (**ASK ABOUT DOING THIS FOR ALL APP USERS**)
    - Shows the stop detail screen for the current stop

- Tour Screen
    - Stop cards can only be viewed
    - Stops **aren't** rearrangeable 
    - Stops **can't** be deleted
    - Stops **can't** be added

    - Stop Detail Screen
        - This will contain the basic data for each stop, same as standard-user
        > The current stop's details screen will be what is broadcasted to the group's devices (maybe in `Current Stop` tab)

- Ping Ambassador Button
    - This will be like a flight-attendant call button where it will ping the ambassador to bring attention that user
    - Kind of like a "raise hand" button on Zoom


