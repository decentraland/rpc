import { BinaryReader } from "google-protobuf"

export function getMessageType(reader: BinaryReader): number | null {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      return null
    }
    var field = reader.getFieldNumber()
    switch (field) {
      case 1 /* message_type */:
        var value = /** @type {number} */ reader.readInt32()
        return value
      default:
        reader.skipField()
        break
    }
  }
  return null
}

export function getMessageId(reader: BinaryReader): number | null {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      return null
    }
    var field = reader.getFieldNumber()
    switch (field) {
      case 2 /* message_id */:
        var value = /** @type {number} */ reader.readInt32()
        return value
      default:
        reader.skipField()
        break
    }
  }
  return null
}
