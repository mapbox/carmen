#!/usr/bin/env bash

set -euo pipefail

failures=0
success=0

for file in bench/*.js; do
    echo "Running $file"
    FAILED=0
    node $file || FAILED=1
    if [[ ${FAILED} != 0 ]]; then
        echo "***** ERROR: $file failed to run *****"
        failures=$((failures+1))
    else
        success=$((success+1))
    fi
done

if [[ ${failures} == 0 ]]; then
    echo "Success: All ${success} benchmarks ran to completion without errors"
    exit 0
else
    echo "Error: $failures benchmarks failed to run (${success} succeeded)"
    exit 1
fi