// https://github.com/dmonad/lib0

declare var TextEncoder: any
declare var TextDecoder: any

/**
 * Utility module to work with strings.
 *
 * @module string
 */

export const fromCharCode = String.fromCharCode
export const fromCodePoint = String.fromCodePoint

/**
 * @param {string} s
 * @return {string}
 */
const toLowerCase = (s: string): string => s.toLowerCase()

const trimLeftRegex = /^\s*/g

/**
 * @param {string} s
 * @return {string}
 */
export const trimLeft = (s: string): string => s.replace(trimLeftRegex, "")

const fromCamelCaseRegex = /([A-Z])/g

/**
 * @param {string} s
 * @param {string} separator
 * @return {string}
 */
export const fromCamelCase = (s: string, separator: string): string =>
  trimLeft(s.replace(fromCamelCaseRegex, (match: any) => `${separator}${toLowerCase(match)}`))

/**
 * Compute the utf8ByteLength
 * @param {string} str
 * @return {number}
 */
export const utf8ByteLength = (str: string | number | boolean): number => unescape(encodeURIComponent(str)).length

/**
 * @param {string} str
 * @return {Uint8Array}
 */
export const _encodeUtf8Polyfill = (str: string | number | boolean): Uint8Array => {
  const encodedString = unescape(encodeURIComponent(str))
  const len = encodedString.length
  const buf = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    buf[i] = /** @type {number} */ encodedString.codePointAt(i)!
  }
  return buf
}

/* istanbul ignore next */
export const utf8TextEncoder = /** @type {TextEncoder} */ new TextEncoder()

/**
 * @param {string} str
 * @return {Uint8Array}
 */
export const _encodeUtf8Native = (str: any): Uint8Array => utf8TextEncoder.encode(str)

/**
 * @param {string} str
 * @return {Uint8Array}
 */
/* istanbul ignore next */
export const encodeUtf8 = utf8TextEncoder ? _encodeUtf8Native : _encodeUtf8Polyfill

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
export const _decodeUtf8Polyfill = (buf: { length: any; subarray: (arg0: number, arg1: any) => any }): string => {
  let remainingLen = buf.length
  let encodedString = ""
  let bufPos = 0
  while (remainingLen > 0) {
    const nextLen = remainingLen < 10000 ? remainingLen : 10000
    const bytes = buf.subarray(bufPos, bufPos + nextLen)
    bufPos += nextLen
    // Starting with ES5.1 we can supply a generic array-like object as arguments
    encodedString += String.fromCodePoint.apply(null, /** @type {any} */ bytes)
    remainingLen -= nextLen
  }
  return decodeURIComponent(escape(encodedString))
}

/* istanbul ignore next */
export let utf8TextDecoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true })

/* istanbul ignore next */
if (utf8TextDecoder && utf8TextDecoder.decode(new Uint8Array()).length === 1) {
  // Safari doesn't handle BOM correctly.
  // This fixes a bug in Safari 13.0.5 where it produces a BOM the first time it is called.
  // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the first call and
  // utf8TextDecoder.decode(new Uint8Array()).length === 1 on the second call
  // Another issue is that from then on no BOM chars are recognized anymore
  /* istanbul ignore next */
  utf8TextDecoder = null
}

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
export const _decodeUtf8Native = (buf: any): string => /** @type {TextDecoder} */ utf8TextDecoder.decode(buf)

/**
 * @param {Uint8Array} buf
 * @return {string}
 */
/* istanbul ignore next */
export const decodeUtf8 = utf8TextDecoder ? _decodeUtf8Native : _decodeUtf8Polyfill

/**
 * @param {string} str The initial string
 * @param {number} index Starting position
 * @param {number} remove Number of characters to remove
 * @param {string} insert New content to insert
 */
export const splice = (str: string, index: any, remove: any, insert: string = "") =>
  str.slice(0, index) + insert + str.slice(index + remove)
