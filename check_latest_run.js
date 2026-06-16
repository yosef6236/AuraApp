const https = require('https');
https.get('https://api.github.com/repos/yosef6236/AuraApp/actions/runs/27309542501/jobs', { headers: { 'User-Agent': 'node.js' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const jobs = JSON.parse(data);
        for(let step of jobs.jobs[0].steps) {
            console.log(`Step: ${step.name}, Status: ${step.status}, Conclusion: ${step.conclusion}`);
        }
    });
});
