#!/usr/bin/env bash

set -e

nozzlePin=${VITE_MAIN_DISPENSER_AUTHORIZATION_PIN:-26}

# 0 V is what the motherboard reads as a lifted nozzle, same level the physical switch gave
# when lifted. Driving high here would register the nozzle as resting instead.
pinctrl set ${nozzlePin} op dl

# Run the command and capture its output
pin_state=$(pinctrl get ${nozzlePin})

# Check if the pin state contains "lo"
if [[ $pin_state == *"lo"* ]]; then
    echo "true"
else
    echo "false"
fi
