import { SerialPort } from 'serialport';
import debug from 'debug';

const debugLog = debug('dispenser:find-printer-port');
// Define the hardware ID and attribute ID you want to search for
export const hardwareId = '0403';
export const attributeId = '6001';

// excludePath: the dispenser's own port. Neogi and the TMU220B printer are both FTDI 0403:6001,
// so without this the first match is the port the dispenser already holds.
export async function findPrinterPort(hardwareId: string, attributeId: string, excludePath?: string) {
	try {
		debugLog(`Finding printer port with hardware ID: ${hardwareId}, and attribute ID: ${attributeId}: %o`, arguments);
		const foundPort = (await SerialPort.list()).find((port) => {
			return port.vendorId === hardwareId && port.productId === attributeId && port.path !== excludePath;
		});

		if (foundPort) {
			return foundPort.path;
		} else {
			throw new Error('Printer port not found');
		}
	} catch (error) {
		throw error;
	}
}
