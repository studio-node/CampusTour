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
    order_index,
    type
)
VALUES
    (
        'e5a9dfd2-0c88-419e-b891-0a62283b8abd',
        'North Commons Building',
        37.1075998404184, -113.5632042745055,
        'https://photos.smugmug.com/Campus-Photography/North-Plaza/2324/i-fZ79Jd5/0/MTc9rfdcRHR7RsG4DK2phC538t5LP36jStqxFVpcJ/L/_41A8108-L.jpg',
        'The North Commons Building is home to several important departments. The campus testing center, professional testing center, and many arts classrooms call this building home.',
        ARRAY['Academic', 'Arts'],
        false,
        27,
        'building'
    ),
    (
        'e5a9dfd2-0c88-419e-b891-0a62283b8abd',
        'Alumni House',
        37.09940277020713, -113.56910887988238,
        'https://photos.smugmug.com/Campus-Photography/Alumni-House/2425/i-4j757Zh/0/K9xLK6MTT8KrsHhf5pdZRvXJznP34F2v3dj866tGq/L/_41A8130%20copy-L.jpg',
        'The Stephen & Marcia Wade Alumni House at Utah Tech University offers a charming and elegant space for your next event or meeting and is located just across the street from the Trailblazer Stadium and Innovation Plaza. The great room includes access to the beautiful Truman Gardens, patio, bridal suite and full-size kitchen.',
        ARRAY['Alumni', 'Community'],
        false,
        28,
        'service'
    )
    ;


    (
        'e5a9dfd2-0c88-419e-b891-0a62283b8abd',
        'LOCATION_NAME',
        COORDS,
        'IMAGE_URL',
        'DESCRIPTION',
        ARRAY['',],
        false,
        26,
        'TYPE'
    ),


	-- building, landmark, housing, dining, athletics, academics, administration, outdoor_space, historical, service