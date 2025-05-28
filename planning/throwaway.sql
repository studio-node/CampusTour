-- Insert data into the locations table
INSERT INTO locations (
    school_id,
    name,
    latitude,
    longitude,
    image_url,
    description,
    interests,
    is_tour_stop,
    order_index
)
VALUES
    (
        '4336a78d-abb5-43f9-96e4-04d3beabc4c2',
        'AMerica first',
        37.675545214686615, 
        -113.07289167243661,
        'https://images.sidearmdev.com/crop?url=https%3a%2f%2fdxbhsrqyrr690.cloudfront.net%2fsidearm.nextgen.sites%2fsuuni.sidearmsports.com%2fimages%2f2019%2f1%2f17%2fDSC01196.jpg&height=360&width=600&type=webp&gravity=smart',
        'The Burns Arena is a multi-purpose arena that is home to the men''s and women''s basketball, volleyball, and other teams. It is also used for concerts and other events.',
        ARRAY['Sports', 'Basketball', 'Events', 'Offices', 'Student Life', 'Volleyball'],
        true,
        1
    ),
    (
        '4336a78d-abb5-43f9-96e4-04d3beabc4c2',
        'Engineering, and Technology Building',
        37.67647929657242, 
        -113.07293995217279
        'https://www.suu.edu/advising/images/advisor-directory/bus.jpg',
        'The Science, Engineering & Technology (SET) Building at Utah Tech University is home to labs and classroom spaces including Physics, Chemistry, Biology, Geo Sciences, Mechanical Engineering, Technology, and Computer labs as well as faculty offices and other support spaces.',
        ARRAY['Science', 'Engineering', 'Technology', 'Labs'],
        true,
        2
    );