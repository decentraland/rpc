#!/bin/bash

node_modules/.bin/tsc -p test/benchmarks/tsconfig.json
rm ./*.log || true
time node --prof test/benchmarks/compilated/test/benchmarks/bench.js
EXIT_CODE=$?
for f in *.log; do node --prof-process "$f"; done
exit $EXIT_CODE