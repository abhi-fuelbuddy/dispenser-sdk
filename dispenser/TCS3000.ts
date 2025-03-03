import debug from 'debug';
import { BaseDispenser } from './base/BaseDispenser';
import { AutoDetectTypes } from '@serialport/bindings-cpp';
import { SerialPort } from 'serialport';
import { DispenserOptions } from '../main';

const debugLog = debug('dispenser:tcs3000');
export class TCS3000 extends BaseDispenser {
	private totalizerBuffer = Buffer.from([0x7e, 0x01, 0x00, 0x40, 0x1e, 0x00, 0x47]);
	private read_preset = Buffer.from([0x7e, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x83]);
	private read_sale = Buffer.from([0x7e, 0x01, 0x00, 0x40, 0x2b, 0x00, 0x95]);
	private read_status = Buffer.from([0x7e, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x83]);

	private pump_start = Buffer.from([0x7e, 0x01, 0x00, 0x40, 0x1f, 0x00, 0x83]);
	private pump_stop = Buffer.from([0x7e, 0x01, 0x00, 0x20, 0x3b, 0x00, 0xdc]);

	private cancel_preset = Buffer.from([0x7e, 0x01, 0x00, 0x20, 0x36, 0x00, 0x55]);

	private authorize = Buffer.from([0x7e, 0x01, 0x00, 0x20, 0x3c, 0x01, 0x03, 0xa8]);
	private clear_sale = [0x7e, 0x01, 0x00, 0x20, 0x3e, 0x00, 0x23];
	private suspend_sale = [0x7e, 0x01, 0x00, 0x20, 0x39, 0x00, 0x4d];
	private resume_sale = [0x7e, 0x01, 0x00, 0x20, 0x3a, 0x00, 0x18];

	private crc_array: number[] = [
		0, 94, 188, 226, 97, 63, 221, 131, 194, 156, 126, 32, 163, 253, 31, 65, 157, 195, 33, 127, 252, 162, 64, 30, 95, 1, 227, 189, 62,
		96, 130, 220, 35, 125, 159, 193, 66, 28, 254, 160, 225, 191, 93, 3, 128, 222, 60, 98, 190, 224, 2, 92, 223, 129, 99, 61, 124, 34,
		192, 158, 29, 67, 161, 255, 70, 24, 250, 164, 39, 121, 155, 197, 132, 218, 56, 102, 229, 187, 89, 7, 219, 133, 103, 57, 186, 228, 6,
		88, 25, 71, 165, 251, 120, 38, 196, 154, 101, 59, 217, 135, 4, 90, 184, 230, 167, 249, 27, 69, 198, 152, 122, 36, 248, 166, 68, 26,
		153, 199, 37, 123, 58, 100, 134, 216, 91, 5, 231, 185, 140, 210, 48, 110, 237, 179, 81, 15, 78, 16, 242, 172, 47, 113, 147, 205, 17,
		79, 173, 243, 112, 46, 204, 146, 211, 141, 111, 49, 178, 236, 14, 80, 175, 241, 19, 77, 206, 144, 114, 44, 109, 51, 209, 143, 12,
		82, 176, 238, 50, 108, 142, 208, 83, 13, 239, 177, 240, 174, 76, 18, 145, 207, 45, 115, 202, 148, 118, 40, 171, 245, 23, 73, 8, 86,
		180, 234, 105, 55, 213, 139, 87, 9, 235, 181, 54, 104, 138, 212, 149, 203, 41, 119, 244, 170, 72, 22, 233, 183, 85, 11, 136, 214,
		52, 106, 43, 117, 151, 201, 74, 20, 246, 168, 116, 42, 200, 150, 21, 75, 169, 247, 182, 232, 10, 84, 215, 137, 107, 53,
	];

	printer: SerialPort<AutoDetectTypes>;
	constructor(socket: SerialPort, printer: SerialPort, options?: DispenserOptions) {
		super(socket, options);
		this.printer = printer;
	}

	checkType() {
		return 'TCS3000';
	}

	async totalizer() {
		debugLog('totalizer', 'Read_Totalizer');
		await this.connection.write(this.totalizerBuffer);
		return await this.dispenserResponse();
	}

	async readPreset() {
		debugLog('readPreset', 'Read_Status');
		await this.connection.write(this.read_preset); // same command to get data on isoil
		return await this.dispenserResponse();
	}

	// TODO: Need to set this up
	async readSale() {
		debugLog('readSale', 'Read_Sale');
		await this.connection.write(this.read_sale); // same command to get data on isoil
		return await this.dispenserResponse();
	}

	// TODO: Need to set this up
	async readStatus() {
		debugLog('readStatus', 'Read_Status');
		await this.connection.write(this.read_status); // response needs some statuses to be hardcoded .. will see
		return await this.dispenserResponse();
	}

	async pumpStart() {
		debugLog('startPump', 'Pump_Start');
		await this.connection.write(this.pump_start);
		return await this.dispenserResponse();
	}

	async pumpStop() {
		debugLog('stopPump', 'Pump_Stop');
		await this.connection.write(this.pump_stop);
		return await this.dispenserResponse();
	}

	async authorizeSale() {
		debugLog('authorizeSale', 'Start');
		await this.connection.write(this.authorize);
		return await this.dispenserResponse();
	}

	async setPreset(quantity: number) {
		debugLog('setPreset', `Preset_QTY=${quantity}`);
		// TODO: implement this
		// this.connection.send(`Preset_QTY=${quantity}`);
		return await this.sendPreset(quantity);
	}

	async sendPreset(quantity: number) {
		let crc = 0;
		const buffer_array = [];
		const volumePrecursor = [0x7e, 0x01, 0x00, 0x20, 0x38, 0x0b, 0x03, 0x03, 0xf7];

		// Calculate partial CRC for the precursor
		for (const byte of volumePrecursor) {
			crc = this.crc_array[crc ^ byte];
			buffer_array.push(byte);
		}

		// Convert quantity to hex representation
		const hexQuantity = this.doubleToHex(quantity); // Convert the quantity to a hex string

		// Calculate CRC for the hex representation
		for (let i = 0; i < hexQuantity.length; i += 2) {
			const byte = this.hexStringToByte(hexQuantity, i);
			crc = this.crc_array[crc ^ byte];
			buffer_array.push(byte);
		}
		buffer_array.push(crc);

		debugLog('sendPreset: %s', buffer_array.map((item) => item.toString(16).padStart(2, '0')).join(' '));

		await this.connection.write(Buffer.from(buffer_array));
		return await this.dispenserResponse();
	}

	async cancelPreset() {
		debugLog('cancelPreset', 'Cancel_Preset');
		await this.connection.write(this.cancel_preset);
		return await this.dispenserResponse();
	}

	async suspendSale() {
		debugLog('suspendSale', 'Stop');
		await this.connection.write(this.suspend_sale);
		return await this.dispenserResponse();
	}

	async resumeSale() {
		debugLog('resumeSale', 'Resume_Sale');
		await this.connection.write(this.resume_sale);
		return await this.dispenserResponse();
	}

	async clearSale() {
		debugLog('clearSale', 'Clear_Sale');
		await this.connection.write(this.clear_sale);
		return await this.dispenserResponse();
	}

	hasExternalPump() {
		debugLog('hasExternalPump', 'External_Pump');
		return 'false';
	}

	// // readExternalPumpStatus() {
	// //     debugLog("readExternalPumpStatus", "External_Pump_Status");
	// //     this.connection.send("External_Pump_Status");
	// // }

	// // startExternalPump() {
	// //     debugLog("startExternalPump", "External_Pump_Start");
	// //     this.connection.send("External_Pump_Start");
	// // }

	// // stopExternalPump() {
	// //     debugLog("stopExternalPump", "External_Pump_Stop");
	// //     this.connection.send("External_Pump_Stop");
	// // }

	// readAuthorization() {
	//     debugLog("readAuthorization", "Read_Authorization");
	//     this.connection.send("Read_Authorization");
	// }

	processTotalizer(res: string) {
		debugLog('processTotalizer: %s', res);
		const response = this.hexToNumber(res.slice(16, -2));
		debugLog('processTotalizer: %o', response);
		return response;
	}

	processTotalizerWithBatch(res: string) {
		debugLog('processTotalizerWithBatch: %s', res);
		const response = {
			totalizer: this.processTotalizer(res),
			batchNumber: undefined,
			timestamp: new Date().getTime(),
		};
		debugLog('processTotalizerWithBatch: %o', response);
		return response;
	}

	processCommand(res: string, args: any, fnName: string) {
		debugLog('processCommandArguments: %o', arguments);
		console.log('processCommandArguments: %o', arguments);

		if (fnName === 'suspendSale') {
			if (res.includes('0043') || res.includes('0023')) {
				debugLog('processCommand: %s', 'Command success for suspend');
				return true;
			}
			debugLog('processCommand: %s', 'Command failed! check for status');
			// throw Error('Command failed! check for status for pause');
			return false;
		}

		if (fnName === 'resumeSale') {
			if (res.includes('0023')) {
				debugLog('processCommand: %s', 'Command success for resume');
				return true;
			}
			debugLog('processCommand: %s', 'Command failed! check for status');
			// throw Error('Command failed! check for status for resume');
			return false;
		}

		if (fnName === 'authorizeSale') {
			const commandData = res.slice(14);
			return commandData[1] == '3';
		}

		if (fnName === 'pumpStop') {
			const errorBytes = res.slice(12);
			return errorBytes[0] === '0' && errorBytes[1] === '0';
		}

		if (fnName === 'printReceipt') {
			debugLog('processCommand: %s', `Response for ${fnName} = ${res}`);
			return res === 'true';
		}

		debugLog('processCommand: %s', res);
		if (res.includes('0011') || res.includes('0064') || res.includes('0044')) {
			debugLog('processCommand: %s', 'Command success');
			return true;
		}

		debugLog('processCommand: %s || %s', 'Command failed! check for status with response', res);
		return false;
	}

	processReadSale(res: string) {
		debugLog('processReadSale: %s', res);
		const response = this.hexToNumber(res.slice(16, -2));
		debugLog('processReadSale: %s: %o', response);
		return response;
	}

	processStatus(res: string) {
		debugLog('processStatus: %s', res);
		const statusBit = res.slice(16, -2);
		const statusMap = new Map([
			['00', 'ERROR'],
			['01', 'IDLE'],
			['02', 'ACTIVE'],
			['03', 'AIR (Air detected)'],
			['04', 'PAUSED'],
			['05', 'STOPPED'],
			['06', 'TCKT_PENDING'],
			['07', 'PRINTING'],
		]);
		return { status: statusMap.get(statusBit) };
	}

	isPumpStopped(res: string) {
		debugLog('isPumpStoppedArgs: %s', res);
		const status = this.processStatus(res);
		debugLog('isPumpStopped: %o', status);
		if (status.status == 'STOPPED') {
			debugLog('isPumpStopped: %s', 'true');
			return true;
		}

		debugLog('isPumpStopped: %s', 'false');
		return false;
	}

	isDispensing(res: string) {
		debugLog('isDispensing: %s', res);
		const status = this.processStatus(res);
		if (status.status == 'ACTIVE') {
			return true;
		}

		return false;
	}

	isIdle(res: string) {
		debugLog('isIdle: %s', res);
		const status = this.processStatus(res);
		if (status.status == 'IDLE') {
			return true;
		}

		return false;
	}

	/**
	 * isOrderComplete
	 *
	 * @param res
	 * @param quantity
	 * @returns
	 */
	isOrderComplete(res: string, quantity: number) {
		debugLog('isOrderComplete: %s', res);
		const readsale = this.processReadSale(res);

		if (readsale > quantity - 1) {
			const response = {
				status: true,
				percentage: this.toFixedNumber((readsale / quantity) * 100.0, 2),
				// currentFlowRate: this.processFlowRate(res),
				// averageFlowRate: this.processAverageFlowRate(res),
				// batchNumber: this.processBatchNumber(res),
				dispensedQty: this.toFixedNumber(readsale, 2),
			};

			debugLog('isOrderComplete: %o', response);
			return response;
		}

		const response = {
			status: false,
			percentage: this.toFixedNumber((readsale / quantity) * 100.0, 2),
			// currentFlowRate: this.processFlowRate(res),
			// averageFlowRate: this.processAverageFlowRate(res),
			// batchNumber: this.processBatchNumber(res),
			dispensedQty: this.toFixedNumber(readsale, 2),
		};

		debugLog('isOrderComplete: %o', response);
		return response;
	}

	isOnline(res: string): boolean {
		const status = this.processStatus(res);
		if (status.status) {
			return true;
		}
		return false;
	}

	isPresetVerified() {
		return true; // can't check in this dispenser
	}

	hasChecksBeforePumpStart() {
		debugLog('hasChecksBeforePumpStart: %s', 'false');
		return false;
	}

	isReadyForPreset(res: string) {
		debugLog('isReadyForPresetArgs: %o', arguments);
		const dispenserStatus = this.processStatus(res);
		if (dispenserStatus.status === 'IDLE') {
			debugLog('isReadyForPreset: %s', 'true');
			return true;
		}
		debugLog('isReadyForPreset: %s', 'false');
		return false;
	}

	isNozzleOnHook() {
		debugLog('isNozzleOnHook: %s', 'true');
		return true;
	}

	isNozzleOffHook() {
		debugLog('isNozzleOffHook: %s', 'true');
		return true;
	}

	isPresetAvailable() {
		debugLog('isPresetAvailable: %s', 'true');
		return true;
	}

	isNozzleCheckRequired() {
		return false;
	}

	isPrinterAvailable() {
		debugLog('isPrinterAvailable: %s', 'true');
		return true;
	}

	isSaleCloseable(res: string) {
		debugLog('isSaleCloseableArgs', arguments);
		const dispenserStatus = this.processStatus(res);
		if (['STOPPED', 'TCKT_PENDING'].includes(dispenserStatus.status!)) {
			debugLog('isSaleCloseable: %s', 'true');
			return true;
		}

		debugLog('isSaleCloseable: %s', 'false');
		return false;
	}

	isSaleSuspended(res: string) {
		debugLog('isSaleSuspendedArgs', arguments);
		const dispenserStatus = this.processStatus(res);
		if (dispenserStatus.status == 'PAUSED') {
			debugLog('isSaleSuspended: %s', 'true');
			return true;
		}

		debugLog('isSaleSuspended: %s', 'false');
		return false;
	}

	printReceipt(printObj: any) {
		const printWidth = 40;
		const printArr = [];

		debugLog('printReceipt: %o', printObj);

		if (printObj?.isReceiptRequired) {
			printArr.push(this.str2hex(this.centerAlignValue('****  CUSTOMER COPY  ****', printWidth)));
			printArr.push('0A');
			printArr.push(this.str2hex(this.centerAlignValue('FUELBUDDY FUEL SUPPLY LLC', printWidth)));
			printArr.push('0A');
			printArr.push(this.str2hex(this.rightAlignValue('BOWSER No', printObj?.vehicleRegistrationNumber, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('ASSET No', printObj?.registrationNumber, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('DATE', printObj?.orderDate, printWidth)));
			printArr.push('0A');
			printArr.push(this.str2hex(this.rightAlignValue('DRIVER', printObj?.driverCode, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('CUSTOMER', printObj?.customerCode, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('ORDER No', printObj?.orderCode, printWidth)));
			printArr.push('0A');
			printArr.push(this.str2hex(this.rightAlignValue('Batch No', printObj?.batchCode, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('START TIME', new Date(printObj?.startTime).toLocaleTimeString(), printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('END TIME', new Date(printObj?.endTime).toLocaleTimeString(), printWidth)));
			printArr.push('0A');
			printArr.push(this.str2hex(this.rightAlignValue('PRODUCT', printObj?.productName, printWidth)));
			printArr.push('0A');
			printArr.push(this.str2hex(this.rightAlignValue('DELIVERED', printObj?.quantity, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('START TOT.', printObj?.startTotalizer, printWidth)));
			printArr.push(this.str2hex(this.rightAlignValue('END TOT.', printObj?.endTotalizer, printWidth)));
			if (printObj?.odometerReading) {
				printArr.push(this.str2hex(this.rightAlignValue('ODOMETER', printObj?.odometerReading, printWidth)));
			}
			printArr.push('0A');
			printArr.push(this.str2hex(this.rightAlignValue('GROSS VOLUME', printObj?.unitOfMeasure, printWidth)));
			printArr.push('0A0A1D564100');
		}

		printArr.push(this.str2hex(this.centerAlignValue('****  PRINT COPY  ****', printWidth)));
		printArr.push('0A');
		printArr.push(this.str2hex(this.centerAlignValue('FUELBUDDY FUEL SUPPLY LLC', printWidth)));
		printArr.push('0A');
		printArr.push(this.str2hex(this.rightAlignValue('BOWSER No', printObj?.vehicleRegistrationNumber, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('ASSET No', printObj?.registrationNumber, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('DATE', new Date(printObj?.orderDate).toLocaleDateString(), printWidth)));
		printArr.push('0A');
		printArr.push(this.str2hex(this.rightAlignValue('DRIVER ID', printObj?.driverCode, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('CUSTOMER ID', printObj?.customerCode, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('ORDER No', printObj?.orderCode, printWidth)));
		printArr.push('0A');
		printArr.push(this.str2hex(this.rightAlignValue('Batch No', printObj?.batchCode, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('START TIME', new Date(printObj?.startTime).toLocaleTimeString(), printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('END TIME', new Date(printObj?.endTime).toLocaleTimeString(), printWidth)));
		printArr.push('0A');
		printArr.push(this.str2hex(this.rightAlignValue('PRODUCT', printObj?.productName, printWidth)));
		printArr.push('0A');
		printArr.push(this.str2hex(this.rightAlignValue('DELIVERED', printObj?.quantity, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('START TOT.', printObj?.startTotalizer, printWidth)));
		printArr.push(this.str2hex(this.rightAlignValue('END TOT.', printObj?.endTotalizer, printWidth)));
		if (printObj?.odometerReading) {
			printArr.push(this.str2hex(this.rightAlignValue('ODOMETER', printObj?.odometerReading, printWidth)));
		}
		printArr.push('0A');
		printArr.push(this.str2hex(this.rightAlignValue('GROSS VOLUME', printObj?.unitOfMeasure, printWidth)));

		debugLog('printReceipt: %s', `${printArr.join('0A')}0A0A1D564200`);
		return this.printOrder(`${printArr.join('0A')}0A0A1D564200`);
	}

	printOrder(printText: string): boolean {
		if (!this.printer) {
			debugLog('Printer is required for TCS3000 dispenser');
			return false;
		}

		const buffer = Buffer.from(printText, 'hex');
		this.printer.write(buffer);
		return true;
	}
}
