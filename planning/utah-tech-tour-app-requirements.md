
# Utah Tech Campus Tour App — Requirements Document

## 1. Overview

The Utah Tech Campus Tour app is a mobile application designed to guide users through an interactive tour of Utah Tech University's campus in St. George, Utah. The app allows users to explore buildings, view detailed information, and create custom tour experiences based on personal interests.

## 2. Purpose

The app aims to:
- Introduce prospective students, visitors, and new students to campus buildings.
- Provide building-specific information such as functions, fun facts, activities, and academic programs.
- Enable guided, interest-based tours.

## 3. Target Audience

- Prospective students visiting campus
- First-year students learning the layout
- General visitors to Utah Tech University 
- Family or Friends that come along with prospective students for campus tours

## 4. Platform Requirements

- **Technology Stack**:
  - React Native
  - Expo
  - Apple Maps (iOS) / Google Maps (Android)
- **Platforms**:
  - iOS (latest two major versions)
  - Android (latest two major versions)

### 4.1 Build and Testing

This app will be developed on a Windows machine using an Ubuntu WSL. To run and test during development, I will run using `npx expo start --tunnel` and use the Expo Go app on my personal iPhone  


## 5. Functional Requirements

### 5.1 General

- App is guest-based (no login).
- Internet connection is recommended for full functionality but not required.
- Usage data will be tracked.
- Content can be updated remotely.

### 5.2 Tabs

#### Map Tab

- Displays campus buildings as labeled points on the map.
- Uses Apple Maps on iOS, Google Maps on Android.
- Shows user's current location.
- Button to recenter map on the user's location.
- Clicking a point opens a building info page (pulled from `locations.js`).

#### Tour Tab

- Starts with optional user interest selection (e.g., Arts, Computing, Exercise Science, Rock Climbing, Medical Sciences, etc.).
- Generates a tour based on selected interests.
- If skipped, shows a default tour.
- Each stop shows:
  - Building name
  - Picture
  - Basic description
  - Two buttons:
    - **Details**: opens building info page
    - **Location**: jumps to map tab focused on the building
- Buildings appear in a custom-defined order (not automatically calculated).

## 6. Data Requirements

### 6.1 `locations.js` File Format

The app will use a static file to define all building data. The format should resemble:

```js
export const locations = [
  {
    id: 'b001',
    name: 'Smith Computing Center',
    coordinates: { latitude: 37.0955, longitude: -113.5752 },
    image: 'https://example.com/images/smith.jpg',
    description: 'Focuses on computer science and software engineering programs.',
    interests: ['Computing'],
    isTourStop: true
  },
  ...
];
```

> You just need to create the file, I will fill it in following the format above

## 7. Non-Functional Requirements

- App must load quickly (under 3 seconds for home screen).
- Designed to work offline with cached data.
- Remotely updateable tour content via basic backend (TBD).
- Lightweight and battery-efficient.

## 8. Usage Tracking & Admin Functionality

- Track:
  - Which buildings are viewed
  - How many tours are started/completed
  - Most common interest selections
- Ability to:
  - Update building data without redeploying the app
  - Add or remove interest tags and associated buildings

> A backend admin panel or remote config file is recommended for content management.

## 9. UI Design Guidelines

- Clean, modern UI
- Simple tab-based navigation (Map and Tour)
- Use Utah Tech branding colors and fonts
- Consistent icons and labels
- Accessibility support can be added in a future version

## 10. Navigation Flow

```
[Launch App]
    |
    |---> [Map Tab] --(Click Marker)--> [Building Info Page]
    |
    |---> [Tour Tab]
             |
             |---> [Select Interests] --(Skip or Confirm)-->
             |
             |---> [Tour Overview] --(Details / Location)--> [Info Page or Map Tab]
```
