export type ProtoField = {
  number: number
  name: string
  type: string
  repeated: boolean
}

export type ProtoMessage = {
  name: string
  fields: ProtoField[]
  extending: string[]
}

export type ProtoEnum = {
  name: string
  values: Record<string, number>
}

export function field(type: string, name: string, number: number, repeated?: boolean): ProtoField {
  return {
    type,
    name,
    number,
    repeated: repeated || false,
  }
}

export function isProtoMessage(o: any): o is ProtoMessage {
  if (o && o.fields && o.extending) {
    return true
  }
  return false
}
export function isProtoEnum(o: any): o is ProtoEnum {
  if (o && o.name && o.values) {
    return true
  }
  return false
}

export function protoDsl() {
  const names = new Map<string, ProtoMessage | ProtoEnum>()

  return {
    addMessage(name: string, fields: ProtoField[], extending?: string[]) {
      if (names.has(name)) throw new Error("Duplicated name")
      const message: ProtoMessage = {
        name,
        fields,
        extending: extending || [],
      }
      names.set(name, message)
    },
    addEnum(name: string, values: Record<string, number>) {
      if (names.has(name)) throw new Error("Duplicated name")
      const message: ProtoEnum = {
        name,
        values,
      }
      names.set(name, message)
    },
    validate() {
      let didChange = true

      // populate all inheritance
      while (didChange) {
        didChange = false

        for (const [name, value] of names) {
          if (isProtoMessage(value)) {
            for (const extendingName of value.extending) {
              const extending = names.get(extendingName)
              if (!extending) throw new Error(`Name ${extendingName} is not registered`)
              if (!isProtoMessage(extending)) throw new Error(`Messages can only extend messages`)
              value.fields.push(...extending.fields)
              didChange = true
            }
            value.extending.length = 0
          }
        }
      }

      return names
    },
  }
}
