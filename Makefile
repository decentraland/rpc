PROTOBUF_VERSION = 3.19.1
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
	npm i -D ts-protoc-gen
	npm i -S google-protobuf@$(PROTOBUF_VERSION)
	npm i -S @types/google-protobuf@latest

test:
	${PROTOC} "--js_out=binary,import_style=commonjs_strict:$(PWD)/test/codegen" \
		--ts_out="$(PWD)/test/codegen" \
		-I="$(PWD)/test/codegen" \
		"$(PWD)/test/codegen/client.proto"
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS) --coverage $(TEST_FILE)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS) --coverage

build:
	node_modules/.bin/ts-node scripts/generate-proto-file.ts
	node_modules/.bin/pbjs -t static-module -w commonjs -o src/protocol/pbjs.js src/protocol/index.proto
	node_modules/.bin/pbts -o src/protocol/pbjs.d.ts src/protocol/pbjs.js
	@rm -rf dist || true
	@mkdir -p dist
	${PROTOC} "--js_out=binary,import_style=commonjs_strict:$(PWD)/src/protocol" \
		--ts_out="$(PWD)/src/protocol" \
		-I="$(PWD)/src/protocol" \
		"$(PWD)/src/protocol/index.proto"
	@echo 'exports.default = proto;' >> ./src/protocol/index_pb.js
	@cp -r src/protocol dist/protocol
	./node_modules/.bin/tsc -p tsconfig.json
	rm -rf node_modules/@microsoft/api-extractor/node_modules/typescript || true
	./node_modules/.bin/api-extractor run $(LOCAL_ARG) --typescript-compiler-folder ./node_modules/typescript

cheap-perf:
	@time node_modules/.bin/ts-node test/bench.ts

.PHONY: build test cheap-perf
