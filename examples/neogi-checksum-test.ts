#!/usr/bin/env ts-node
/**
 * Neogi Checksum Validation Test
 *
 * This script tests the checksum calculation and response parsing
 * for the Neogi dispenser protocol without requiring hardware.
 */

// Test helper class that contains only the protocol logic
class NeogiProtocolTester {
    calculateChecksum(data: string): string {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data.charCodeAt(i);
        }
        return (sum % 256).toString(16).toUpperCase().padStart(2, '0');
    }

    parseResponse(res: string): { command: string; data: string; checksum: string } {
        const ascii = res;
        const match = ascii.match(/#(.+?)#([0-9A-F]{2})%/);
        if (!match) {
            throw new Error(`Invalid response format: ${ascii}`);
        }
        const content = match[1];
        const checksum = match[2];
        const calculatedChecksum = this.calculateChecksum(content);
        if (calculatedChecksum !== checksum) {
            throw new Error(
                `Checksum validation failed. Expected: ${calculatedChecksum}, Got: ${checksum}`
            );
        }
        return {
            command: content.substring(0, 2),
            data: content.substring(2),
            checksum
        };
    }

    buildCommand(cmd: string): string {
        return cmd + '\r';
    }

    buildPresetCommand(value: number, vehicleNo?: string): string {
        const volumeValue = Math.floor(value * 100);
        const paddedValue = volumeValue.toString().padStart(8, '0');
        const vehicle = vehicleNo ? vehicleNo.padEnd(12, ' ').substring(0, 12) : '            ';
        return `SL${paddedValue}${vehicle}\r`;
    }
}

const neogi = new NeogiProtocolTester();

console.log('Neogi Checksum and Protocol Tests\n');
console.log('=' .repeat(50));

// Test 1: Checksum calculation
console.log('\n1. Testing checksum calculation:');
const testData1 = 'VT0000004142.02';
const checksum1 = neogi.calculateChecksum(testData1);
console.log(`Data: "${testData1}"`);
console.log(`Checksum: ${checksum1}`);
console.log(`Expected format: #${testData1}#${checksum1}%`);

// Test 2: Response parsing with correct checksum
console.log('\n2. Testing response parsing:');
const testResponseData = 'VT0000004142.02';
const correctChecksum = neogi.calculateChecksum(testResponseData);
const testResponse = `#${testResponseData}#${correctChecksum}%`;
try {
    const parsed = neogi.parseResponse(testResponse);
    console.log(`Response: "${testResponse}"`);
    console.log(`Command: ${parsed.command}`);
    console.log(`Data: ${parsed.data}`);
    console.log(`Checksum: ${parsed.checksum}`);
    console.log('✓ Parsing successful');
} catch (error) {
    console.error('✗ Parsing failed:', error);
}

// Test 3: Preset command building
console.log('\n3. Testing preset command building:');
const presetVolume = 10.50;
const presetCmd = neogi.buildPresetCommand(presetVolume);
console.log(`Volume: ${presetVolume} liters`);
console.log(`Command: "${presetCmd}"`);
console.log(`Expected: SL00001050            \\r`);

// Test 4: Preset with vehicle number
console.log('\n4. Testing preset with vehicle number:');
const vehicleNo = 'ABC123';
const presetCmdWithVehicle = neogi.buildPresetCommand(presetVolume, vehicleNo);
console.log(`Volume: ${presetVolume} liters`);
console.log(`Vehicle: ${vehicleNo}`);
console.log(`Command: "${presetCmdWithVehicle}"`);

// Test 5: Simple command building
console.log('\n5. Testing simple command building:');
const statusCmd = neogi.buildCommand('ST');
console.log(`Command: ST`);
console.log(`Built: "${statusCmd}"`);
console.log(`Expected: "ST\\r"`);

// Test 6: Process status
console.log('\n6. Testing status parsing:');
const statusStates = ['IDLE', 'CALL', 'DISP'];
for (const state of statusStates) {
    const statusData = `ST${state}`;
    const statusChecksum = neogi.calculateChecksum(statusData);
    const response = `#${statusData}#${statusChecksum}%`;
    try {
        const parsed = neogi.parseResponse(response);
        console.log(`Response: "${response}" -> State: ${parsed.data}`);
    } catch (error) {
        console.error(`Error processing "${response}":`, error);
    }
}

// Test 7: Process totalizer
console.log('\n7. Testing totalizer parsing:');
const totalizerData = 'VT0000004142.02';
const totalizerChecksum = neogi.calculateChecksum(totalizerData);
const totalizerResponse = `#${totalizerData}#${totalizerChecksum}%`;
try {
    const parsed = neogi.parseResponse(totalizerResponse);
    console.log(`Response: "${totalizerResponse}"`);
    console.log(`Command: ${parsed.command}`);
    console.log(`Data: ${parsed.data}`);
} catch (error) {
    console.error('Error:', error);
}

// Test 8: Invalid checksum
console.log('\n8. Testing invalid checksum detection:');
const invalidResponse = '#VT0000004142.02#FF%';
try {
    neogi.parseResponse(invalidResponse);
    console.log('✗ Failed to detect invalid checksum');
} catch (error) {
    console.log('✓ Invalid checksum correctly detected');
    console.log(`Error: ${(error as Error).message}`);
}

console.log('\n' + '='.repeat(50));
console.log('Tests completed\n');
