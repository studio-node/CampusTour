# Functional Specifications

This document outlines the functional requirements for the Utah Tech Campus Tour App, based on the [main requirements document](../planning/utah-tech-tour-app-requirements.md).

## 1. General App Functionality

- **Guest-Based Access**: The application will not require user login or authentication.
- **Internet Connectivity**: While an internet connection is recommended for optimal performance (e.g., map loading, content updates), the app should be designed to function offline with cached data where possible.
- **Usage Data Tracking**: The app will track certain user interactions, such as buildings viewed and tour engagement. (Details in Section 5)
- **Remote Content Updates**: The content of the app, particularly building information and tour details, should be updateable remotely without requiring a new app store submission.

## 2. Tab-Based Navigation

The app will feature a simple two-tab navigation system:

### 2.1 Map Tab

- **Campus Map Display**: Shows an interactive map of the Utah Tech campus.
  - Buildings will be represented as labeled points or markers on the map.
- **Platform-Specific Maps**: Utilizes Apple Maps on iOS devices and Google Maps on Android devices.
- **User Location**: Displays the user's current geographical location on the map.
- **Recenter Button**: A dedicated button will allow users to recenter the map view on their current location.
- **Building Information Access**: Clicking on a building point/marker will navigate the user to a detailed information page for that specific building. Data for this page will be sourced from the `locations.js` file.

### 2.2 Tour Tab

- **Interest-Based Tour Generation**:
  - **Optional Interest Selection**: Upon entering the Tour tab, users will be presented with an option to select their areas of interest (e.g., Arts, Computing, Exercise Science, Rock Climbing, Medical Sciences).
  - **Customized Tour**: If interests are selected, the app will generate a guided tour route that prioritizes buildings relevant to those interests.
  - **Default Tour**: If the user skips the interest selection, a predefined default tour of campus highlights will be shown.
- **Tour Stop Display**: Each stop in the generated tour will display:
  - Building Name
  - A representative picture of the building.
  - A basic description of the building.
  - **Action Buttons**:
    - **Details**: Opens the detailed building information page (same as accessed from the Map Tab).
    - **Location**: Switches to the Map Tab and focuses the map view on the selected building's location.
- **Custom Tour Order**: The sequence of buildings in any tour (interest-based or default) will follow a custom-defined order, not one automatically calculated by distance or other algorithms.

## 3. Building Information Page

- Accessed via the Map Tab (clicking a marker) or the Tour Tab (clicking "Details" on a tour stop).
- Displays detailed information about a specific building, including:
  - Name
  - Image
  - Full Description (functions, fun facts, activities, academic programs)
  - Associated interests/tags

## 4. Offline Functionality

- The app should cache essential data (building information, tour paths) to allow for offline use.
- Map functionality might be limited offline, depending on the native map capabilities (iOS/Android).

## 5. Usage Tracking & Admin Functionality (Summary)

- **Tracked Data**:
  - Views per building.
  - Number of tours started.
  - Number of tours completed.
  - Most common interest selections.
- **Administrative Capabilities (Future/Backend)**:
  - Update building data (details, images, coordinates, descriptions, interests).
  - Add or remove interest tags.
  - Modify associations between buildings and interest tags.

*(Refer to Section 8 of the main requirements document for more details on administrative functionality, which likely involves a backend component.)* 