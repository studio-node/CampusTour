# Technical Specifications

This document details the technical aspects of the Utah Tech Campus Tour App, based on the [main requirements document](../planning/utah-tech-tour-app-requirements.md).

## 1. Technology Stack

- **Core Framework**: React Native
- **Development Environment**: Expo
- **Mapping Services**:
  - Apple Maps (for iOS platform)
  - Google Maps (for Android platform)

## 2. Platform Requirements

- **Target Mobile Platforms**:
  - **iOS**: The application must be compatible with the latest two major versions of iOS.
  - **Android**: The application must be compatible with the latest two major versions of Android.

### 2.1 Development and Testing Environment

- **Development Machine**: Windows machine utilizing Ubuntu WSL (Windows Subsystem for Linux).
- **Testing Command**: Development and testing will primarily use the command `npx expo start --tunnel`.
- **Testing Device**: Testing will be conducted using the Expo Go application on a personal iPhone.

## 3. Non-Functional Requirements

- **Performance**:
  - **Load Time**: The main screen of the application (home screen) must load in under 3 seconds.
- **Offline Capability**:
  - The app must be designed to work offline using cached data. This includes building information and predefined tour paths. Full map interactivity may be limited offline.
- **Content Management**:
  - Tour content, including building details and interest tags, must be remotely updateable. This implies a basic backend system or a remote configuration file (details to be determined - TBD).
- **Resource Efficiency**:
  - The application should be lightweight to minimize storage space.
  - It should be battery-efficient to ensure prolonged use without significant power drain.

## 4. Data Storage

- **Local Data**: A static `locations.js` file will be used to store all building data initially. (See [Data Model](./data-model.md) for format).
- **Cached Data**: For offline functionality, relevant data from `locations.js` and tour configurations will be cached on the device.

## 5. Build and Deployment

- Specific build and deployment processes will be defined as development progresses, utilizing Expo's build services for creating standalone app binaries for iOS and Android.

## 6. Usage Tracking Implementation (High-Level)

- Implementation details for usage tracking (e.g., choice of analytics platform) are to be determined. The focus will be on tracking key interactions as outlined in the functional specifications and section 8 of the main requirements document.

## 7. Admin Functionality (Backend Considerations)

- The ability to update building data and manage interest tags remotely suggests the need for a simple backend API or a remote configuration file (e.g., JSON hosted servicio) that the app can fetch and parse.
- The specifics of this backend or remote configuration are marked as TBD in the main requirements document.
