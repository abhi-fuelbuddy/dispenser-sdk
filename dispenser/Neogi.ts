import debug from 'debug';
import { BaseDispenser } from './base/BaseDispenser';
import { TotalizerResponse } from './interface/IDispenser';

const debugLog = debug('dispenser:Neogi');

export class Neogi extends BaseDispenser {
	/**
	 * Calculate checksum for Neogi protocol
	 * Sum of ASCII character codes mod 100 (last 2 DECIMAL digits)
	 * Example: sum=1240 → checksum="40"
	 */
	calculateChecksum(data: string): string {
		let sum = 0;
		for (let i = 0; i < data.length; i++) {
			sum += data.charCodeAt(i);
		}
		// Protocol uses last 2 decimal digits (mod 100), NOT hex!
		return (sum % 100).toString(10).padStart(2, '0');
	}

	/**
	 * Parse response - handles TWO formats:
	 * 1. Simple acks (NO checksum): #OK%, #STIDLE%, #STCALL%, #STDISP%, #INVALID%
	 * 2. Data replies (WITH checksum): #VT0000004142.02#40%
	 */
	parseResponse(res: string): { command: string; data: string; checksum?: string; isSimpleAck: boolean } {
		// Convert hex to ASCII if needed
		const ascii = res.startsWith('#') ? res : this.hex2a(res);
		debugLog('parseResponse - ASCII: %s', ascii);

		// Check for simple ack format (no second '#')
		if (!ascii.includes('#', 1)) {
			const match = ascii.match(/#([A-Z0-9]+)%/);
			if (match) {
				debugLog('parseResponse - Simple ack detected: %s', match[1]);
				return {
					command: match[1].length >= 2 ? match[1].substring(0, 2) : match[1],
					data: match[1].length > 2 ? match[1].substring(2) : '',
					isSimpleAck: true
				};
			}
		}

		// Data reply format with checksum: #<CMD><DATA>#<CHECKSUM>%
		const match = ascii.match(/#(.+?)#(\d{2})%/); // \d{2} for decimal digits
		if (!match) {
			throw new Error(`Invalid response format: ${ascii}`);
		}

		const content = match[1];
		const checksum = match[2];

		// Validate checksum for data replies
		const calculatedChecksum = this.calculateChecksum(content);
		if (calculatedChecksum !== checksum) {
			throw new Error(
				`Checksum validation failed. Expected: ${calculatedChecksum}, Got: ${checksum}, Content: ${content}`
			);
		}

		debugLog('parseResponse - Data reply with valid checksum');
		return {
			command: content.substring(0, 2),
			data: content.substring(2),
			checksum,
			isSimpleAck: false
		};
	}

	/**
	 * Build simple command with carriage return terminator (Category 1)
	 * Used for: VT, ST, LT, RV, HS, DM, AM, TP, CT, etc.
	 */
	buildCommand(cmd: string): string {
		return cmd + '\r';
	}

	/**
	 * Build command with checksum wrapper (Category 2)
	 * Format: #<data>#<checksum>%
	 * Used for: SL, SR, SE, SK, SP, SM1, SM2, SV, SA
	 */
	buildCommandWithChecksum(data: string): string {
		const checksum = this.calculateChecksum(data);
		return `#${data}#${checksum}%`;
	}

	/**
	 * Build preset command: #SL<8-digit value><vehicle no>#<checksum>%
	 * @param value Volume in liters (will be converted to format 00001050 for 10.50L)
	 * @param vehicleNo Optional 12-character vehicle number
	 */
	buildPresetCommand(value: number, vehicleNo?: string): string {
		// Convert to 8 digits with 2 decimal places (multiply by 100)
		const volumeValue = Math.floor(value * 100);
		const paddedValue = volumeValue.toString().padStart(8, '0');

		// Vehicle number is optional, default to spaces if not provided
		const vehicle = vehicleNo ? vehicleNo.padEnd(12, ' ').substring(0, 12) : '            ';

		// Category 2 command - wrap with checksum
		const data = `SL${paddedValue}${vehicle}`;
		return this.buildCommandWithChecksum(data);
	}

	/**
	 * Override write method to handle ASCII strings (not hex)
	 * BaseDispenser.write() treats strings as hex, but Neogi uses ASCII
	 */
	protected async write(data: Buffer | string, _command?: string): Promise<boolean> {
		let buffer: Buffer;

		if (Buffer.isBuffer(data)) {
			buffer = data;
		} else {
			// Convert ASCII string to Buffer (not hex!)
			buffer = Buffer.from(data, 'ascii');
		}

		debugLog('write: %s bytes - %s', buffer.length, buffer.toString('ascii').replace(/\r/g, '\\r').replace(/\n/g, '\\n'));

		return this.connection.write(buffer);
	}

	// ==================== COMMAND METHODS ====================

	async totalizer() {
		debugLog('totalizer');
		const cmd = this.buildCommand('VT');
		await this.write(cmd, 'totalizer');
		return await this.dispenserResponse();
	}

	async readStatus() {
		debugLog('readStatus');
		const cmd = this.buildCommand('ST');
		await this.write(cmd, 'readStatus');
		return await this.dispenserResponse();
	}

	async authorizeSale() {
		debugLog('authorizeSale');
		// DM = Disable Manual mode (switch to remote)
		const cmd = this.buildCommand('DM');
		await this.write(cmd, 'authorizeSale');
		return await this.dispenserResponse();
	}

	async setPreset(quantity: number, _productId?: number) {
		debugLog('setPreset - quantity: %s', quantity);
		const cmd = this.buildPresetCommand(quantity);
		await this.write(cmd, 'setPreset');
		return await this.dispenserResponse();
	}

	async cancelPreset() {
		debugLog('cancelPreset');
		const cmd = this.buildCommand('CT');
		await this.write(cmd, 'cancelPreset');
		return await this.dispenserResponse();
	}

	async readSale() {
		debugLog('readSale');
		const cmd = this.buildCommand('LT');
		await this.write(cmd, 'readSale');
		return await this.dispenserResponse();
	}

	async pumpStop() {
		debugLog('pumpStop');
		const cmd = this.buildCommand('TP');
		await this.write(cmd, 'pumpStop');
		return await this.dispenserResponse();
	}

	async suspendSale() {
		debugLog('suspendSale');
		// TP = Terminate Pump (suspend)
		const cmd = this.buildCommand('TP');
		await this.write(cmd, 'suspendSale');
		return await this.dispenserResponse();
	}

	async resumeSale() {
		debugLog('resumeSale');
		// Re-authorize with SL command
		const cmd = this.buildCommand('SL');
		await this.write(cmd, 'resumeSale');
		return await this.dispenserResponse();
	}

	async clearSale() {
		debugLog('clearSale');
		// First cancel transaction
		const cancelCmd = this.buildCommand('CT');
		await this.write(cancelCmd, 'clearSale:CT');
		await this.dispenserResponse();

		// Then enable manual mode
		const manualCmd = this.buildCommand('AM');
		await this.write(manualCmd, 'clearSale:AM');
		return await this.dispenserResponse();
	}

	async switchToRemote() {
		debugLog('switchToRemote');
		const cmd = this.buildCommand('DM');
		await this.write(cmd, 'switchToRemote');
		return await this.dispenserResponse();
	}

	async switchToLocal() {
		debugLog('switchToLocal');
		const cmd = this.buildCommand('AM');
		await this.write(cmd, 'switchToLocal');
		return await this.dispenserResponse();
	}

	// ==================== PROCESSING METHODS ====================

	processTotalizer(res: string): number {
		debugLog('processTotalizer - res: %s', res);
		const parsed = this.parseResponse(res);

		// VT response format: #VT0000004142.02#40%
		// Extract numeric value from data
		const value = parseFloat(parsed.data.trim());
		debugLog('processTotalizer: %s', value);
		return value;
	}

	processTotalizerWithBatch(res: string): TotalizerResponse {
		const totalizer = this.processTotalizer(res);
		const returnObj = {
			totalizer,
			batchNumber: 0, // Neogi protocol doesn't support batch numbers
			timestamp: new Date().getTime(),
		};
		debugLog('processTotalizerWithBatch: %o', returnObj);
		return returnObj;
	}

	processStatus(res: string) {
		debugLog('processStatus - res: %s', res);
		const parsed = this.parseResponse(res);

		// ST response: IDLE, CALL, or DISP
		const state = parsed.data.trim();
		const returnObj = { state };
		debugLog('processStatus: %o', returnObj);
		return returnObj;
	}

	processCommand(res: string): boolean {
		debugLog('processCommand - res: %s', res);

		// Convert to ASCII if hex
		const ascii = res.startsWith('#') ? res : this.hex2a(res);

		// Check for #OK% response
		if (ascii.includes('#OK#') || ascii.includes('OK')) {
			debugLog('processCommand: success');
			return true;
		}

		throw new Error(`Command failed: ${ascii}`);
	}

	processReadSale(res: string) {
		debugLog('processReadSale - res: %s', res);
		const parsed = this.parseResponse(res);

		// LT response is 190 characters with transaction data
		// Format: volume, amount, etc. (specific parsing depends on actual format)
		const data = parsed.data;

		// Parse based on fixed positions (adjust based on actual protocol spec)
		const returnObj = {
			volume: data.substring(0, 10).trim(),
			amount: data.substring(10, 20).trim(),
			unitPrice: data.substring(20, 30).trim(),
			// Add more fields as needed based on actual 190-char format
		};

		debugLog('processReadSale: %o', returnObj);
		return returnObj;
	}

	// ==================== STATUS CHECK METHODS ====================

	isIdle(res: string): boolean {
		const status = this.processStatus(res);
		const result = status.state === 'IDLE';
		debugLog('isIdle: %s', result);
		return result;
	}

	isDispensing(res: string): boolean {
		const status = this.processStatus(res);
		const result = status.state === 'DISP';
		debugLog('isDispensing: %s', result);
		return result;
	}

	isReadyForPreset(res: string): boolean {
		const status = this.processStatus(res);
		const result = status.state === 'IDLE';
		debugLog('isReadyForPreset: %s', result);
		return result;
	}

	isOnline(res: string): boolean {
		// If we can read status, dispenser is online
		try {
			this.processStatus(res);
			debugLog('isOnline: true');
			return true;
		} catch (e) {
			debugLog('isOnline: false');
			return false;
		}
	}

	isPresetAvailable(): boolean {
		debugLog('isPresetAvailable: true');
		return true;
	}

	isNozzleCheckRequired(): boolean {
		debugLog('isNozzleCheckRequired: true');
		return true;
	}

	isPrinterAvailable(): boolean {
		debugLog('isPrinterAvailable: false');
		return false;
	}

	isSaleCloseable(res: string): boolean {
		const status = this.processStatus(res);
		const result = status.state === 'IDLE';
		debugLog('isSaleCloseable: %s', result);
		return result;
	}

	checkType(): string {
		debugLog('checkType: NEOGI');
		return 'NEOGI';
	}
}
