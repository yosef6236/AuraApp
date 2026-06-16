const https = require('https');
https.get('https://api.github.com/repos/yosef6236/AuraApp/actions/runs', { headers: { 'User-Agent': 'node.js' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const runs = JSON.parse(data);
        const url = runs.workflow_runs[0].jobs_url;
        https.get(url, { headers: { 'User-Agent': 'node.js' } }, (res2) => {
            let data2 = '';
            res2.on('data', chunk => data2 += chunk);
            res2.on('end', () => {
                const jobs = JSON.parse(data2);
                const jobId = jobs.jobs[0].id;
                https.get(`https://api.github.com/repos/yosef6236/AuraApp/actions/jobs/${jobId}/logs`, { headers: { 'User-Agent': 'node.js' } }, (res3) => {
                     if(res3.statusCode === 302) {
                         https.get(res3.headers.location, (res4) => {
                             let logData = '';
                             res4.on('data', c => logData += c);
                             res4.on('end', () => console.log(logData.slice(-2000)));
                         });
                     } else {
                         console.log("No logs redirect. Status:", res3.statusCode);
                     }
                });
            });
        });
    });
});
