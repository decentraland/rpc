// https://github.com/dmonad/lib0

/**
 * Utility functions to work with buffers (Uint8Array).
 *
 * @module buffer
 */

import * as encoding from "./encoding"
import * as decoding from "./decoding"

/**
 * @param {number} len
 */
export const createUint8ArrayFromLen = (len: number) => new Uint8Array(len)

/**
 * Create Uint8Array with initial content from buffer
 *
 * @param {ArrayBuffer} buffer
 * @param {number} byteOffset
 * @param {number} length
 */
export const createUint8ArrayViewFromArrayBuffer = (buffer: ArrayBuffer, byteOffset: number, length: number) =>
  new Uint8Array(buffer, byteOffset, length)

/**
 * Create Uint8Array with initial content from buffer
 *
 * @param {ArrayBuffer} buffer
 */
export const createUint8ArrayFromArrayBuffer = (buffer: ArrayBuffer) => new Uint8Array(buffer)

/**
 * Copy the content of an Uint8Array view to a new ArrayBuffer.
 *
 * @param {Uint8Array} uint8Array
 * @return {Uint8Array}
 */
export const copyUint8Array = (uint8Array: Uint8Array): Uint8Array => {
  const newBuf = createUint8ArrayFromLen(uint8Array.byteLength)
  newBuf.set(uint8Array)
  return newBuf
}

/**
 * Encode anything as a UInt8Array. It's a pun on typescripts's `any` type.
 * See encoding.writeAny for more information.
 *
 * @param {any} data
 * @return {Uint8Array}
 */
export const encodeAny = (data: any): Uint8Array => {
  const encoder = encoding.createEncoder()
  encoding.writeAny(encoder, data)
  return encoding.toUint8Array(encoder)
}

/**
 * Decode an any-encoded value.
 *
 * @param {Uint8Array} buf
 * @return {any}
 */
export const decodeAny = (buf: Uint8Array): any => decoding.readAny(decoding.createDecoder(buf))
