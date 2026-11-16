#!/usr/bin/env bash

set -e

nozzlePin=${VITE_MAIN_DISPENSER_AUTHORIZATION_PIN:-26}

# Driving the sense line low stops delivery, the state the switch reported with the
# nozzle back on its hook.
pinctrl set ${nozzlePin} op dl

# Run the command and capture its output
pin_state=$(pinctrl get ${nozzlePin})

# Check if the pin state contains "lo"
if [[ $pin_state == *"lo"* ]]; then
    echo "true"
else
    echo "false"
fi
