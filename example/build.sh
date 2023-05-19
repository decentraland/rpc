#!/bin/bash

# replace this with your own protoc
../protoc3/bin/protoc \
		--plugin=../node_modules/.bin/protoc-gen-dcl_ts_proto \
		--dcl_ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
		--dcl_ts_proto_out="$(pwd)" -I="$(pwd)" \
		"$(pwd)/api.proto"
