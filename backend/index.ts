import express, { json } from 'express';
import GeminiCaller from './gemini_caller.js';
import { supabaseUrl, supabaseAnonKey } from './secrets.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getLocations } from './supabase.js';

// const app = express();
// const port = 3000;

// app.get('/', (req, res) => {
//     res.send('Hello World!');
// });

// app.listen(port, () => {
//     return console.log(`Express is listening at http://localhost:${port}`);
// });




function makeLocationsArrayForLambda(locations: any[]) {
    let locationObjects = [];
    for (let location of locations) {
        locationObjects.push({
            id: location.id,
            name: location.name,
            description: location.description,
            interests: location.interests,
        });
    }
    
    return locationObjects;
}




async function main() {

    // let bod = [{"id":"5da9189d-b530-4167-99c5-68026f23a4aa","name":"Smith Computing Center","description":"Focuses on computer science and software engineering programs. Many Graphic design classes are held here.","interests":["Computers","Technology","Engineering","Graphic Design","Programming"]},{"id":"f2a12cf5-6108-4fba-99be-9dedd97f8a8b","name":"Burns Arena","description":"The Burns Arena is a multi-purpose arena that is home to the men's and women's basketball, volleyball, and other teams. It is also used for concerts and other events.","interests":["Sports","Basketball","Events","Offices","Student Life","Volleyball"]},{"id":"5183194d-05c5-4c49-86f6-38928b01fd73","name":"Bison Statue","description":"The Bison Statue is the symbol of Utah Tech. It is located in front of the Holland Centennial Commons and is a popular spot for photos.","interests":["Landmark","Statue"]},{"id":"136bd1b1-f0e1-4a75-ab3a-efc8d7625765","name":"Library - Holland Centennial Commons","description":"The Library is a hub for students to study, read, and learn. It is also home to the several important university offices and recourses.","interests":["Reading","Studying","Research","Student Recourses"]},{"id":"5e8f578d-41ba-43e9-abdb-117cdeb64a3a","name":"Human Perfomance Center (HPC)","description":"The Human Performance Center (HPC) is an on-campus \"Active Learning. Active Life\" facility for Utah Tech University students, faculty, and staff. It is home to multiple gyms, sport courts, dance studios, 2 tracks, an indoor pool, a rock climbing wall, and E-sports lounge, and many classrooms.","interests":["Sports","Working Out","Dance","Running","Classrooms","Events","Student Life","Swimming","Rock Climbing","E-sports"]},{"id":"8f1d0307-251c-405f-9e1e-d55b0c9401bb","name":"Gardner Student Center","description":"The Gardner Student Center is a hub for students to study, eat, and socialize. It is also home to the University's student life offices and recourses.","interests":["Student Life","Food"]},{"id":"f8b689b6-b7b0-46bb-94e1-cb2e55e80998","name":"The Science, Engineering, and Technology Building (SET)","description":"The Science, Engineering & Technology (SET) Building at Utah Tech University is home to labs and classroom spaces including Physics, Chemistry, Biology, Geo Sciences, Mechanical Engineering, Technology, and Computer labs as well as faculty offices and other support spaces.","interests":["Science","Engineering","Technology","Labs"]},{"id":"a92e9747-62c6-465c-b7c7-fddd56c2e6cc","name":"Snow Math and Science Center","description":"The Snow Math and Science Center houses the Math and Science departments, as well as some Physics and Chemistry labs.","interests":["Science","Math","Labs"]},{"id":"1c958bf6-3e52-426f-a864-b997e8dcaae1","name":"Graff Fine Arts Center","description":"The Graff Fine Arts Center is home to the Music, Theatre, and Art departments, as well as the University's art gallery.","interests":["Music","Theater","Art"]},{"id":"ffb7c39d-6aba-4311-9e87-5eea47062a98","name":"Atkin Admin Buildings","description":"The Atkin Admin Buildings are the administrative offices for the university. They are home to the Office of the President, the Office of the Provost, the Office of the Vice President for Academic Affairs, and the Office of the Vice President for Student Affairs.","interests":["Administration","Offices"]},{"id":"8eeec2d1-91ca-4649-847c-afa47279f6e5","name":"O.C. Tanner Fountain","description":"The O.C. Tanner Fountain is a symbol of the university. It is located in the center of the campus and is a popular spot for photos. The fountains is also the site of the True Trailblazer tradition","interests":["Landmark","Traditions"]},{"id":"bea38dcb-56e9-45e7-9283-72e2338bf13e","name":"College of Education","description":"The College of Education promotes holistic teaching and learning with studies in education, family studies and human development, and interdisciplinary arts and sciences.","interests":["Academics","Education","Family Studies","Human Development","Interdisciplinary Arts and Sciences"]},{"id":"8773d1c3-bf4a-4a1f-bdfd-f268c233247a","name":"Campus View Suites 1 (CVS 1)","description":"Campus View Suites is a four-story, suite-style, on-campus single student housing complex accommodating up to 352 students.","interests":["Housing","Student Life"]},{"id":"a33edd7a-6e88-4299-b5c1-433d6ed34db1","name":"Campus View Suites 2 (CVS 2)","description":"Campus View Suites is a five-story, suite-style, on-campus single student housing complex accommodating up to 534 students.","interests":["Housing","Student Life"]},{"id":"1146a237-3e9b-4288-a9bc-3c245044aa7b","name":"Campus View Suites 3 (CVS 3)","description":"Campus View Suites is a four-story, suite-style, on-campus single student housing complex accommodating up to 352 students.","interests":["Housing","Student Life"]},{"id":"27f109ef-e5a8-4507-99f2-82dc949a7d5f","name":"The Clocktower","description":"The Clocktower is a symbol of the university. It is located in the center of the campus and is a popular spot for photos.","interests":["Landmark","Traditions"]},{"id":"e575594b-3a2e-4222-b420-a1a443a2f87b","name":"Udvar Hazy School of Business","description":"The Udvar Hazy School of Business is a business school that is located in the center of the campus.","interests":["Business","Finance","Accounting","Management","Marketing","Economics"]},{"id":"049253e6-0f2a-4df8-82a5-d84aa9b88b02","name":"Jennings Communication Building","description":"The Jennings Communication Building is a communication school that is located in the center of the campus.","interests":["Communication","Journalism","Public Relations","Advertising","Marketing"]},{"id":"48ffd687-5055-4f61-ba05-604215c39b92","name":"Greater Zion Stadium","description":"Greater Zion Stadium is home to several of the school's sports teams. It is used for football, soccer, clubs, and other events.","interests":["Athletics","Football","Soccer","Clubs","Events","Student Life","Traditions"]},{"id":"de3128c6-851d-48b7-a9ab-ec17c2da06b4","name":"General Classroom Building","description":"The new general classroom facility will house many programs from the university's College of Humanities and Social Sciences. The 120,000 square foot facility will include 53 teaching spaces and 125 faculty offices promoting Utah Tech's “active learning, active life” approach to education.","interests":["Academics","Humanities","Social Sciences","Education","Student Life","Traditions"]},{"id":"dea95d28-cc6c-488c-992a-6ab01f18d02a","name":"Institute of Religion - The Church of Jesus Christ of Latter-day Saints","description":"The Institute of Religion is a building of the Church of Jesus Christ of Latter-day Saints. It is used for religious services and other student activities. All students are welcome at the Institute buidling, regardless of religious preference.","interests":["Religion","Latter-day Saints","Student Life"]},{"id":"4e0ef166-b03f-4f80-84c8-a09fa98e84dc","name":"Sand Volleyball Courts","description":"The sand volleyball courts are a popular spot for students to play volleyball and participate in intramurals.","interests":["Student Life","Intramurals","Volleyball","Athletics"]},{"id":"3dc5ca20-0c5b-49fd-8eb4-7d91240aa263","name":"Abby Apartments","description":"Abby Apartments are a great choice for students looking for on-campus apartment-style living. Conveniently located on the southeast side of campus, Abby Apartments are close to the new sand volleyball pits, recreation field area, fitness center, and football and baseball stadiums.","interests":["Housing","Student Life"]},{"id":"7d7a2111-bf20-484f-b127-8d349cff7fbf","name":"Atwood Innovation Plaza","description":"Formerly an elementary school, the Atwood Innovation Plaza is home to many local businesses and startups. It has several office spaces and resources for both students and the community.","interests":["Business","Startups","Offices","Community","Services"]},{"id":"99515e1b-3796-4494-ae19-9b320fbbc088","name":"North Commons Building","description":"The North Commons Building is home to several important departments. The campus testing center, professional testing center, and many arts classrooms call this building home.","interests":["Academic","Arts"]},{"id":"541b2b92-d2e0-4ff1-bd6e-e8c59784e7dc","name":"University Plaza","description":"University Plaza is 4 different buildings that house several university services.","interests":["Services","University","Offices","Community","Student Life"]},{"id":"d4f6c739-34ca-48af-97fc-bcd738b3d89b","name":"Alumni House","description":"The Stephen & Marcia Wade Alumni House at Utah Tech University offers a charming and elegant space for your next event or meeting and is located just across the street from the Trailblazer Stadium and Innovation Plaza. The great room includes access to the beautiful Truman Gardens, patio, bridal suite and full-size kitchen.","interests":["Alumni","Community"]}]

    // let stringed = JSON.stringify(bod);


    // console.log("body:", JSON.parse(stringed));
    // return;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);


    const locations = await getLocations("e5a9dfd2-0c88-419e-b891-0a62283b8abd", supabase);

    // console.log("locations:", JSON.stringify(locations));

    const interests = ["Arts", "Student Life", "Sports", "Clubs", "Academic", "Campus Activities"];

    const locsArray = makeLocationsArrayForLambda(locations);

    // console.log("locsArray:", JSON.stringify(locsArray));

    let response = await fetch("https://v7mn4ph6s2bmprajq6b3znlkta0muliy.lambda-url.us-west-1.on.aws/", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
        },
        // body: "PLEASE WORK"
        body: JSON.stringify({
            locations: locsArray,
            interests: interests
        })
    })


    console.log("response.body:", await JSON.parse(await response.text()));

    // const tour = await GeminiCaller.generateTour(locations, interests);
    // console.log("tour:", tour);
}


main();
