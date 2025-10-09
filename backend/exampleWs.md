# Tour group

```json
{
  "type": "join_session",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc"  
  }
}

```

# Ambassador

```json
{
  "type": "auth",
  "payload": { "sub": "0a939b8f-0d00-4895-bb08-f881bbdfe8c8" }
}
  
{
  "type": "create_session",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc",
    "ambassador_id": "0a939b8f-0d00-4895-bb08-f881bbdfe8c8",
    "initial_structure": { "stops": [] }
  }
}


{
  "type": "tour:start",
  "payload": { "tourId": "ad3b271a-6843-4c50-bc1e-aa818032bde0" }
}


{
  "type": "tour:state_update",
  "payload": {
    "tourId": "ad3b271a-6843-4c50-bc1e-aa818032bde0",
    "state": { "current_location_id": "f2a12cf5-6108-4fba-99be-9dedd97f8a8b", "visited_locations": ["f2a12cf5-6108-4fba-99be-9dedd97f8a8b"] }
  }
}
```