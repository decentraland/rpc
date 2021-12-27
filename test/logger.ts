declare var process: any
export function log(txt: any) {
  if (typeof txt == "string") process.stderr.write(txt + "\n")
  else process.stderr.write(JSON.stringify(txt) + "\n")
}
