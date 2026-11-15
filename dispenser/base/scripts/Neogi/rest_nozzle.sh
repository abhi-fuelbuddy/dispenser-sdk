#!/usr/bin/env bash

set -e

nozzlePin=${VITE_MAIN_DISPENSER_AUTHORIZATION_PIN:-26}

# 3.3 V is what the motherboard reads as a nozzle at home position.
pinctrl set ${nozzlePin} op dh

# Run the command and capture its output
pin_state=$(pinctrl get ${nozzlePin})

# Check if the pin state contains "hi"
if [[ $pin_state == *"hi"* ]]; then
    echo "true"
else
    echo "false"
fi
