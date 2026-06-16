const https = require('https');
https.get('https://api.github.com/repos/yosef6236/AuraApp/actions/runs/27309542501/jobs', { headers: { 'User-Agent': 'node.js' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const jobs = JSON.parse(data);
        const jobId = jobs.jobs[0].id;
        https.get(`https://api.github.com/repos/yosef6236/AuraApp/actions/jobs/${jobId}/logs`, { headers: { 'User-Agent': 'node.js' } }, (res3) => {
             if(res3.statusCode === 302) {
                 https.get(res3.headers.location, (res4) => {
                     let logData = '';
                     res4.on('data', c => logData += c);
                     res4.on('end', () => console.log(logData.slice(-3000)));
                 });
             }
        });
    });
});
