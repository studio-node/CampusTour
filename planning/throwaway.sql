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
        'Abby Apartments',
        37.100020206616755, -113.56366468827675,
        'https://housing.utahtech.edu/wp-content/uploads/sites/17/2019/08/AbbyBanner3.jpg',
        'Abby Apartments are a great choice for students looking for on-campus apartment-style living. Conveniently located on the southeast side of campus, Abby Apartments are close to the new sand volleyball pits, recreation field area, fitness center, and football and baseball stadiums.',
        ARRAY['Housing', 'Student Life'],
        false,
        26,
        'housing'
    ),
    (
        'e5a9dfd2-0c88-419e-b891-0a62283b8abd',
        'Atwood Innovation Plaza',
        37.10057641899174, -113.5697264806724,
        'https://photos.smugmug.com/Campus-Photography/Atwood-Innovation-Plaza/2324/i-kgkHzdw/0/MggJVf5r5vLXnXfQvwtccjLr5ghVR6MXzjrrDfzBd/L/Innovation%20Plaza%201-L.jpg',
        'Formerly an elementary school, the Atwood Innovation Plaza is home to many local businesses and startups. It has several office spaces and resources for both students and the community.',
        ARRAY['Business', 'Startups', 'Offices', 'Community', 'Services'],
        false,
        27,
        'service'
    ),
    (
        'e5a9dfd2-0c88-419e-b891-0a62283b8abd',
        'University Plaza',
        37.106978184066755, -113.56061940087966,
        'https://chambermaster.blob.core.windows.net/images/customers/1117/members/3071/photos/GALLERY_MAIN/stgeorge_aerial_close_crop.jpg',
        'University Plaza is 4 different buildings that house several university services.',
        ARRAY['Services', 'University', 'Offices', 'Community', 'Student Life'],
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