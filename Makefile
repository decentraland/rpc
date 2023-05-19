PROTOBUF_VERSION = 22.2
PROTOC ?= protoc
UNAME := $(shell uname)
PROTO_FILES := $(wildcard src/*.proto)
export PATH := node_modules/.bin:/usr/local/include/:protoc3/bin:$(PATH)

ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

ifeq ($(UNAME),Darwin)
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-osx-x86_64.zip
else
PROTOBUF_ZIP = protoc-$(PROTOBUF_VERSION)-linux-x86_64.zip
endif

install_compiler:
	@# remove local folder
	rm -rf protoc3 || true

	@# Make sure you grab the latest version
	curl -OL https://github.com/protocolbuffers/protobuf/releases/download/v$(PROTOBUF_VERSION)/$(PROTOBUF_ZIP)

	@# Unzip
	unzip $(PROTOBUF_ZIP) -d protoc3
	@# delete the files
	rm $(PROTOBUF_ZIP)

	@# move protoc to /usr/local/bin/
	chmod +x protoc3/bin/protoc

install: install_compiler
	npm install

test:
	${PROTOC} \
		--plugin=./node_modules/.bin/protoc-gen-dcl_ts_proto \
		--dcl_ts_proto_opt=esModuleInterop=true,returnObservable=false,outputServices=generic-definitions \
		--dcl_ts_proto_out="$(PWD)/test/codegen" \
		-I="$(PWD)/test/codegen" \
		"$(PWD)/test/codegen/client.proto"
	SIMMULATE_JITTER=false node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS) --coverage $(TEST_FILE)
	SIMMULATE_JITTER=true node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS) $(TEST_FILE)
	$(MAKE) integration-example

test-watch:
	INSTRUMENT_TRANSPORT=true node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

build:
	node_modules/.bin/ts-node scripts/generate-proto-file.ts
	@rm -rf dist || true
	@mkdir -p dist
	${PROTOC} \
		--plugin=./node_modules/.bin/protoc-gen-dcl_ts_proto \
		--dcl_ts_proto_opt=esModuleInterop=true \
		--dcl_ts_proto_out="$(PWD)/src/protocol" \
		-I="$(PWD)/src/protocol" \
		"$(PWD)/src/protocol/index.proto"
	@cp -r src/protocol dist/protocol
	rm dist/protocol/*.ts || true
	./node_modules/.bin/tsc -p tsconfig.json
	rm -rf node_modules/@microsoft/api-extractor/node_modules/typescript || true
	./node_modules/.bin/api-extractor run $(LOCAL_ARG) --typescript-compiler-folder ./node_modules/typescript

cheap-perf:
	./perf.sh

inspect:
	node_modules/.bin/tsc -p test/benchmarks/tsconfig.json
	node --inspect-brk test/benchmarks/compiled/test/benchmarks/allocation-bench.js

integration-example:
	@cd example; ./build.sh
	@TS_NODE_PROJECT="example/tsconfig.json" node_modules/.bin/ts-node ./example/integration.ts

.PHONY: build test cheap-perf integration-example inspect
