# Tour group

```json
{
  "type": "join_session",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc",
    "leadId": "0ed17b61-7cc0-4add-99b0-c08285bb56e6"
  }
}
// jhlglj: dd4f832d-794d-4452-bb08-1e0e0211a35a

```

# Ambassador

```json
// Apparently this isn't used now lol. Oh well, I don't know if it's really necessary
{
  "type": "auth",
  "payload": { "sub": "0a939b8f-0d00-4895-bb08-f881bbdfe8c8" }
}
 
// Maybe get rid of initial structure thing and make that be in the 
// `tour_appointments` table. Then it would just be fetched in the server.
{
  "type": "create_session",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc",
    "ambassador_id": "0a939b8f-0d00-4895-bb08-f881bbdfe8c8",
    "initial_structure": { 
      "stops": [] 
    }
  }
}

// "dea95d28-cc6c-488c-992a-6ab01f18d02a",
// "5183194d-05c5-4c49-86f6-38928b01fd73",
// "8eeec2d1-91ca-4649-847c-afa47279f6e5",
// "27f109ef-e5a8-4507-99f2-82dc949a7d5f",
// "f2a12cf5-6108-4fba-99be-9dedd97f8a8b",
// "48ffd687-5055-4f61-ba05-604215c39b92",
// "4e0ef166-b03f-4f80-84c8-a09fa98e84dc",
// "8773d1c3-bf4a-4a1f-bdfd-f268c233247a",
// "a33edd7a-6e88-4299-b5c1-433d6ed34db1",
// "1146a237-3e9b-4288-a9bc-3c245044aa7b",
// "3dc5ca20-0c5b-49fd-8eb4-7d91240aa263"

{
  "type": "tour:start",
  "payload": { "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc" }
}

{
  "type": "tour:tour-list-changed",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc",
    "newTourStructure": [
      "dea95d28-cc6c-488c-992a-6ab01f18d02a",
      "5183194d-05c5-4c49-86f6-38928b01fd73",
      "8eeec2d1-91ca-4649-847c-afa47279f6e5",
      "27f109ef-e5a8-4507-99f2-82dc949a7d5f",
      "f2a12cf5-6108-4fba-99be-9dedd97f8a8b",
      "48ffd687-5055-4f61-ba05-604215c39b92",
      "3dc5ca20-0c5b-49fd-8eb4-7d91240aa263"
    ]
  }
}

{
  "type": "tour:state_update",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc",
    "state": { 
      "current_location_id": "27f109ef-e5a8-4507-99f2-82dc949a7d5f", 
      "visited_locations": [
        "dea95d28-cc6c-488c-992a-6ab01f18d02a",
        "5183194d-05c5-4c49-86f6-38928b01fd73",
        "8eeec2d1-91ca-4649-847c-afa47279f6e5"
      ] 
    }
  }
}

{
  "type": "tour:end",
  "payload": { "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc" }
}

```