#!/usr/bin/env ts-node
/**
 * Neogi Dispenser Sale Workflow Example
 *
 * This example demonstrates a complete sale lifecycle:
 * 1. Check status (should be IDLE)
 * 2. Authorize sale (disable manual mode)
 * 3. Set preset volume
 * 4. Monitor status (CALL -> DISP -> IDLE)
 * 5. Read last transaction
 * 6. Clear sale
 */

import { createDispenser } from '../main';
import debug from 'debug';
import { getConfigFromEnv } from '../utils/envParser';

const debugLog = debug('dispenser:neogi-workflow');

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWorkflow() {
    const configuration = getConfigFromEnv();
    debugLog('Configuration: %O', configuration);

    console.log('Creating Neogi dispenser connection...');
    const dispenser = await createDispenser(configuration);

    try {
        // Step 1: Check initial status
        console.log('\n1. Checking initial status...');
        const initialStatus = await dispenser.execute(
            dispenser.readStatus,
            dispenser.processStatus
        );
        console.log('Status:', initialStatus);

        // Step 2: Read totalizer
        console.log('\n2. Reading totalizer...');
        const totalizer = await dispenser.execute(
            dispenser.totalizer,
            dispenser.processTotalizer
        );
        console.log('Totalizer:', totalizer, 'liters');

        // Step 3: Switch to remote mode
        console.log('\n3. Switching to remote mode...');
        await dispenser.execute(
            dispenser.authorizeSale,
            dispenser.processCommand
        );
        console.log('Remote mode activated');

        // Step 4: Set preset (10 liters)
        console.log('\n4. Setting preset to 10 liters...');
        await dispenser.execute(
            dispenser.setPreset,
            dispenser.processCommand,
            10
        );
        console.log('Preset set successfully');

        // Step 5: Monitor status (wait for user to lift nozzle)
        console.log('\n5. Waiting for nozzle to be lifted...');
        console.log('Please lift the nozzle to start dispensing');

        let statusCount = 0;
        while (statusCount < 30) { // Poll for 30 seconds
            await delay(1000);
            const currentStatus = await dispenser.execute(
                dispenser.readStatus,
                dispenser.processStatus
            );
            console.log(`   Current status: ${currentStatus.state}`);

            if (currentStatus.state === 'DISP') {
                console.log('Dispensing in progress!');
                break;
            }

            statusCount++;
        }

        // Step 6: Read sale after completion
        console.log('\n6. Reading last transaction...');
        const sale = await dispenser.execute(
            dispenser.readSale,
            dispenser.processReadSale
        );
        console.log('Sale details:', sale);

        // Step 7: Clear sale
        console.log('\n7. Clearing sale...');
        await dispenser.execute(
            dispenser.clearSale,
            dispenser.processCommand
        );
        console.log('Sale cleared');

        // Step 8: Final status
        console.log('\n8. Final status check...');
        const finalStatus = await dispenser.execute(
            dispenser.readStatus,
            dispenser.processStatus
        );
        console.log('Status:', finalStatus);

    } catch (error) {
        console.error('Error during workflow:', error);
    } finally {
        // Disconnect
        console.log('\nDisconnecting...');
        await new Promise<void>((resolve) => {
            dispenser.disconnect(() => {
                console.log('Disconnected successfully');
                resolve();
            });
        });
    }
}

// Run the workflow
runWorkflow().catch(console.error);
