import WebSocket from 'ws';

function connect() {
    console.log('Attemping to connect...');
    const ws = new WebSocket('ws://localhost:3001/ws?playerId=testSub&realm=genesis');

    ws.on('open', () => {
        console.log('Connected to server');

        // Send a snapshot
        const snapshotData = {
            type: 'snapshot_taken',
            data: {
                x: 100,
                y: 200,
                realm: 'genesis',
                visiblePlayers: ['p2', 'p3'],
                caption: 'Test Snapshot'
            },
            timestamp: Date.now()
        };

        ws.send(JSON.stringify(snapshotData));
        console.log('Sent snapshot data');
    });

    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        console.log('Received:', msg);

        if (msg.type === 'snapshot_saved') {
            console.log('✅ Snapshot verification PASSED');
            process.exit(0);
        }
    });

    ws.on('error', (err) => {
        console.error('WS Error:', err.message);
        // Don't exit, let retry logic handle or manual timeout
    });

    return ws;
}

let attempt = 0;
const maxAttempts = 5;

function tryConnect() {
    attempt++;
    if (attempt > maxAttempts) {
        console.error('Failed to connect after multiple attempts');
        process.exit(1);
    }

    try {
        const ws = connect();
        ws.on('error', () => {
            // If error on open, retry
            console.log(`Retrying in 2s... (${attempt}/${maxAttempts})`);
            setTimeout(tryConnect, 2000);
        });
    } catch (e) {
        console.log(`Connection failed, retrying in 2s... (${attempt}/${maxAttempts})`);
        setTimeout(tryConnect, 2000);
    }
}

tryConnect();

setTimeout(() => {
    console.log('Global Timeout waiting for test completion');
    process.exit(1);
}, 20000);
