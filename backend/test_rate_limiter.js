function sleep(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

for (let i = 0; i < 17; i++) {
    sleep(1000);
    const response = await fetch('http://localhost:3000/generate-tour', {
        method: 'POST',
        body: JSON.stringify({
            school_id: '123',
            interests: ['123']
        })
    })
    console.log(response.status, await response.text());
}

// const response = await fetch('http://localhost:3000/generate-tour', {
//     method: 'POST',
//     body: JSON.stringify({
//         school_id: '123',
//         interests: ['123']
//     })
// })
// console.log(response.status, await response.text());