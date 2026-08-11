const PRINT_WIDTH = 40;
const SIGNATURE_BOX_LINES = 7;

/** Line feed. */
export const LF = '0A';
/** ESC/POS GS V A 0 — feed and partial cut, to tear the copies apart. */
export const PARTIAL_CUT = '0A1D564100';
/** ESC/POS GS V B 0 — feed and full cut, ends a slip. */
export const FULL_CUT = '0A1D564200';

/**
 * Convert String to HEX
 * @param num
 * @returns
 */
const str2hex = (num: string) => {
	let str = '';
	for (let i = 0; i < num.length; i++) {
		str += num.charCodeAt(i).toString(16);
	}
	return str;
};

/**
 * right align value in a string.
 * @param label
 * @param value
 * @param totalWidth
 * @returns
 */
const rightAlignValue = (label: string, valueStr: string, totalWidth: number) => {
	const value = valueStr ? valueStr + '' : 'N/A';
	// Asset descriptions and organisation names can be wider than the slip. Keep a
	// single separating space and let the printer wrap, rather than throwing on a
	// negative repeat count — and never truncate, slips settle billing disputes.
	const spacesToAdd = Math.max(totalWidth - label.length - value.length, 1);

	return label + ' '.repeat(spacesToAdd) + value;
};

/**
 * Center Align Value in a string
 * @param value
 * @param totalWidth
 */
const centerAlignValue = (value: string, totalWidth: number) => {
	const spacesToAdd = Math.max(totalWidth - value.length, 0);
	const leftSpaces = Math.floor(spacesToAdd / 2);
	return ' '.repeat(leftSpaces) + value + ' '.repeat(spacesToAdd - leftSpaces);
};

const signatureBox = (label: string, printArr: string[]) => {
	printArr.push(str2hex(label));
	printArr.push(str2hex('+' + '-'.repeat(PRINT_WIDTH - 2) + '+'));
	for (let i = 0; i < SIGNATURE_BOX_LINES; i++) {
		printArr.push(str2hex('|' + ' '.repeat(PRINT_WIDTH - 2) + '|'));
	}
	printArr.push(str2hex('+' + '-'.repeat(PRINT_WIDTH - 2) + '+'));
};

const signatureBoxes = (printArr: string[]) => {
	signatureBox('CUSTOMER SIGN:', printArr);
	signatureBox('DRIVER SIGN:', printArr);
};

const wrapText = (text: string, maxWidth: number): string[] => {
	const words = text.split(' ');
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxWidth) {
			currentLine += (currentLine ? ' ' : '') + word;
			continue;
		}
		if (currentLine) {
			lines.push(currentLine);
			currentLine = '';
		}
		// A single word can be wider than the slip (an unbroken organisation name),
		// so break it here instead of handing an oversized line to the aligners.
		let rest = word;
		while (rest.length > maxWidth) {
			lines.push(rest.slice(0, maxWidth));
			rest = rest.slice(maxWidth);
		}
		currentLine = rest;
	}
	if (currentLine) lines.push(currentLine);
	return lines;
};

export const printFormat = (printObj: any, type: string) => {
	const printArr = [];

	printArr.push(str2hex(centerAlignValue(`****  ${type}  ****`, PRINT_WIDTH)));
	printArr.push(LF);
	printArr.push(str2hex(centerAlignValue('FUELBUDDY FUEL SUPPLY LLC', PRINT_WIDTH)));
	printArr.push(LF);
	printArr.push(str2hex(rightAlignValue('BOWSER No', printObj?.vehicleRegistrationNumber, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('DRIVER No', printObj?.driverCode, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('Slip No', printObj?.slipNumber, PRINT_WIDTH)));
	printArr.push(LF);
	if (printObj?.customerName) {
		wrapText(printObj.customerName, PRINT_WIDTH).forEach((line) => {
			printArr.push(str2hex(centerAlignValue(line, PRINT_WIDTH)));
		});
	}
	printArr.push(LF);
	printArr.push(str2hex(rightAlignValue('ORDER No', printObj?.orderCode, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('ASSET No', printObj?.registrationNumber, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('PRODUCT', printObj?.productName, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('DATE', new Date(printObj?.orderDate).toLocaleDateString(), PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('START TIME', new Date(printObj?.startTime).toLocaleTimeString(), PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('END TIME', new Date(printObj?.endTime).toLocaleTimeString(), PRINT_WIDTH)));
	printArr.push(LF);
	printArr.push(str2hex(rightAlignValue('GROSS VOLUME', printObj?.unitOfMeasure, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('QUANTITY', printObj?.quantity, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('START TOT.', printObj?.startTotalizer, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('END TOT.', printObj?.endTotalizer, PRINT_WIDTH)));
	if (printObj?.odometerReading) {
		printArr.push(str2hex(rightAlignValue('ODOMETER', printObj?.odometerReading, PRINT_WIDTH)));
	}

	return printArr;
};

export const orderSummaryFormat = (printObj: any) => {
	const printArr = [];

	// Header
	printArr.push(str2hex(centerAlignValue('****  ORDER SUMMARY  ****', PRINT_WIDTH)));
	printArr.push(str2hex(centerAlignValue('FUELBUDDY FUEL SUPPLY LLC', PRINT_WIDTH)));

	// Truck, driver, date
	printArr.push(str2hex(rightAlignValue('ORDER No', printObj?.orderCode, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('TRUCK No', printObj?.bowserNumber, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('DRIVER', printObj?.driverName, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('DATE', printObj?.orderDate ? new Date(printObj.orderDate).toLocaleDateString() : 'N/A', PRINT_WIDTH)));
	printArr.push(LF);

	// Customer info
	if (printObj?.customerName) {
		wrapText(printObj.customerName, PRINT_WIDTH).forEach((line) => {
			printArr.push(str2hex(centerAlignValue(line, PRINT_WIDTH)));
		});
	}

	if (printObj?.customerLocation) {
		wrapText('LOCATION: ' + printObj.customerLocation, PRINT_WIDTH).forEach((line) => {
			printArr.push(str2hex(line));
		});
	}

	// Product & quantities
	printArr.push(str2hex(rightAlignValue('PRODUCT', printObj?.productName, PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('TIME', printObj?.closeTime ? new Date(printObj.closeTime).toLocaleTimeString() : 'N/A', PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('ASSETS', String(printObj?.assetsCount ?? 0), PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('VOLUME', Number(printObj?.deliveredQtyLiters || 0).toFixed(2) + 'L', PRINT_WIDTH)));

	signatureBoxes(printArr);
	return printArr;
}

export const deliverySlipDetailedFormat = (printObj: any): string[] => {
	const printArr: string[] = [];

	// Header
	printArr.push(str2hex(centerAlignValue('****  Dispensing SLIP  ****', PRINT_WIDTH)));
	printArr.push(LF);
	printArr.push(str2hex(centerAlignValue('FUELBUDDY FUEL SUPPLY LLC', PRINT_WIDTH)));
	printArr.push(LF);

	// Truck / driver / slip
	printArr.push(str2hex(rightAlignValue('BOWSER No', printObj?.vehicleRegistrationNumber || 'N/A', PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('DRIVER No', printObj?.driverCode || 'N/A', PRINT_WIDTH)));
	printArr.push(LF);

	// Customer name (centered, wrapped)
	wrapText(printObj?.customerName || 'N/A', PRINT_WIDTH).forEach((line) => {
		printArr.push(str2hex(centerAlignValue(line, PRINT_WIDTH)));
	});
	printArr.push(LF);

	// Order number
	printArr.push(str2hex(rightAlignValue('ORDER No', printObj?.orderCode || 'N/A', PRINT_WIDTH)));
	printArr.push(LF);

	// Assets
	const assets = printObj?.assets || [];

	let totalQty = 0;
	for (const asset of assets) {
		printArr.push(str2hex(rightAlignValue('ASSET No', asset.registrationNumber || 'N/A', PRINT_WIDTH)));
		printArr.push(str2hex(rightAlignValue('VOLUME', asset.quantity != null ? String(asset.quantity) + 'L' : 'N/A', PRINT_WIDTH)));
		const at = asset.endTime ? new Date(asset.endTime) : null;
		printArr.push(str2hex(rightAlignValue('TIME', at ? at.toLocaleTimeString() : 'N/A', PRINT_WIDTH)));
		printArr.push(str2hex(rightAlignValue('DATE', at ? at.toLocaleDateString() : 'N/A', PRINT_WIDTH)));
		if (asset.odometerReading) {
			printArr.push(str2hex(rightAlignValue('ODOMETER', asset.odometerReading, PRINT_WIDTH)));
		}
		printArr.push(str2hex('-'.repeat(PRINT_WIDTH)));
		totalQty += Number(asset.quantity) || 0;
	}

	printArr.push(str2hex(rightAlignValue('TOTAL QTY DISPENSED', totalQty.toFixed(2) + 'L', PRINT_WIDTH)));
	printArr.push(str2hex(rightAlignValue('TOTAL ASSETS', String(assets.length), PRINT_WIDTH)));
	printArr.push(LF);

	signatureBoxes(printArr);

	return printArr;
};

/**
 * Picks the slip layout for a print object. Every dispenser chose it the same way,
 * so it lives here; each dispenser only owns its own framing bytes.
 */
export const buildSlip = (printObj: any): string[] => {
	switch (printObj?.formatType) {
		case 'ORDER_SUMMARY':
			return orderSummaryFormat(printObj);

		case 'DELIVERY_SLIP_DETAILED':
			return deliverySlipDetailedFormat(printObj);

		// The original per-asset slip: a signed copy for the customer when the order
		// asked for a receipt, then the driver's copy, cut apart by 0A1D564100.
		default: {
			const printArr: string[] = [];
			if (printObj?.isReceiptRequired) {
				printArr.push(...printFormat(printObj, 'DISPENSING SLIP'));
				printArr.push(PARTIAL_CUT);
			}
			printArr.push(...printFormat(printObj, 'PRINT COPY'));
			return printArr;
		}
	}
};
