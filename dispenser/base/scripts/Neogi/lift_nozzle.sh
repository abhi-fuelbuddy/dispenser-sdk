#!/usr/bin/env bash

set -e

nozzlePin=${VITE_MAIN_DISPENSER_AUTHORIZATION_PIN:-26}

# Driving the sense line high is what lets the dispenser deliver fuel, the state the
# physical nozzle switch used to report when the driver lifted it.
pinctrl set ${nozzlePin} op dh
pinctrl set ${nozzlePin} op dh
pinctrl set 26 op dh

echo "true"
# Run the command and capture its output
# pin_state=$(pinctrl get ${nozzlePin})

# Check if the pin state contains "hi"
# if [[ $pin_state == *"hi"* ]]; then
#     echo "true"
# else
#     echo "false"
# fi
