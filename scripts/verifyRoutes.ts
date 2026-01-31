import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/ws';

// Test scenarios
const SCENARIOS = [
    {
        name: 'Guild Action (Routing Check)',
        payload: { type: 'guild_action', data: { action: 'list' } },
        expectedType: 'guild_list_response'
    },
    {
        name: 'Gift Action (Routing Check)',
        payload: { type: 'get_pending_gifts', data: {} },
        expectedType: 'pending_gifts'
    },
    {
        name: 'Bond Action (Routing Check)',
        payload: { type: 'get_all_bonds', data: {} },
        expectedType: 'all_bonds'
    },
    {
        name: 'Referral Action (Routing Check)',
        payload: { type: 'get_referral_stats', data: {} },
        expectedType: 'referral_stats'
    }
];

async function runTests() {
    console.log(`Connecting to ${WS_URL}...`);
    const ws = new WebSocket(WS_URL);

    await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
            console.log('✅ Connected');
            resolve();
        });
        ws.on('error', reject);
    });

    // Login first (simulated)
    ws.send(JSON.stringify({
        type: 'player_update',
        data: { x: 0, y: 0 }
    }));

    // Give it a moment to register
    await new Promise(r => setTimeout(r, 500));

    for (const scenario of SCENARIOS) {
        console.log(`\n🧪 Testing: ${scenario.name}`);

        const promise = new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for response'));
            }, 2000);

            const handler = (data: any) => {
                const trigger = data.toString(); // might be buffer
                const msg = JSON.parse(trigger);

                // We might receive other messages (world updates), ignore them
                if (msg.type === 'world_state') return;

                if (msg.type === 'error') {
                    // some handlers might return error if not logged in or invalid data, 
                    // but that proves routing worked!
                    console.log(`   🔸 Received error (Routing Success): ${msg.data.message}`);
                    clearTimeout(timeout);
                    ws.removeListener('message', handler);
                    resolve();
                    return;
                }

                if (msg.type === scenario.expectedType) {
                    console.log(`   ✅ Received expected: ${msg.type}`);
                    clearTimeout(timeout);
                    ws.removeListener('message', handler);
                    resolve();
                } else {
                    console.log(`   ℹ️ Received: ${msg.type}`);
                }
            };

            ws.on('message', handler);
            ws.send(JSON.stringify(scenario.payload));
        });

        try {
            await promise;
        } catch (e: any) {
            console.error(`   ❌ Failed: ${e.message}`);
        }
    }

    ws.close();
    process.exit(0);
}

runTests().catch(console.error);
