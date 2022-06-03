#!/bin/bash

node_modules/.bin/tsc -p test/benchmarks/tsconfig.json
rm ./*.log || true
time node --prof --trace-deopt test/benchmarks/compiled/test/benchmarks/allocation-bench.js
time node --prof --trace-deopt test/benchmarks/compiled/test/benchmarks/bench.js
EXIT_CODE=$?
for f in *.log; do node --prof-process "$f"; done
exit $EXIT_CODE