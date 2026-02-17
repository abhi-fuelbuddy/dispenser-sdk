#!/usr/bin/env ts-node

import { createDispenser } from '../main';
import debug from 'debug';
import { getConfigFromEnv } from '../utils/envParser';

const debugLog = debug('dispenser:main');
const configuration = getConfigFromEnv();
debugLog('Configuration: %O', configuration);

createDispenser(configuration).then((dispenser) => {
	// // Neogi uses LT command which returns full transaction details
	// // Other dispensers may return order completion status
	// const isNeogi = dispenser.checkType?.() === 'NEOGI';
	// const processor = isNeogi
	// 	? dispenser.processReadSale
	// 	: dispenser.isOrderComplete;

	// debugLog('Dispenser type: %s, Using processor: %s',
	// 	dispenser.checkType?.() || 'Unknown',
	// 	isNeogi ? 'processReadSale' : 'isOrderComplete'
	// );

	dispenser.execute(dispenser.readSale, dispenser.isOrderComplete).then((response) => {
		dispenser.disconnect(() => {
			console.log('Disconnected');
		});
		console.log(response);
	});
});
