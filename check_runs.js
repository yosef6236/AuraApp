const https = require('https');
https.get('https://api.github.com/repos/yosef6236/AuraApp/actions/runs', { headers: { 'User-Agent': 'node.js' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const runs = JSON.parse(data).workflow_runs;
        for(let run of runs.slice(0, 3)) {
            console.log(`Run ID: ${run.id}, Status: ${run.status}, Conclusion: ${run.conclusion}, Commit: ${run.head_commit.message.substring(0, 30)}... (${run.head_sha.substring(0, 7)})`);
        }
    });
});
