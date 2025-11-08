For ambassador-led tours, it currently is a big pain to test ambassador-led sessions. I want to create a little js program to test an ambassador-led tour. I want to run it with node and for it to take command line arguments. The only argument for now should be `user-type`, which should be either `ambassador` or `group`. Based on that argument, it should act as the provided user-type. The program should connect via websockets to `wss://campustourbackend.onrender.com`. 

For group members, it should only need the following message to connect:
```json
{
  "type": "join_session",
  "payload": {
    "tourId": "cdb9d53f-89de-4a57-8735-a052bfeb3dbc"  
  }
}
```

For ambassadors, You first need to connect and 'authenticate'. Then, go through the mobile portion of this project to see how you need to format rest of the messages. 
