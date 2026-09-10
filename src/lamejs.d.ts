declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, sampleRate: number, kbps: number)
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array
    flush(): Int8Array
  }
  const lamejs: { Mp3Encoder: typeof Mp3Encoder }
  export default lamejs
}

declare module 'lamejs/src/js/MPEGMode.js' {
  const MPEGMode: unknown
  export default MPEGMode
}

declare module 'lamejs/src/js/Lame.js' {
  const Lame: unknown
  export default Lame
}

declare module 'lamejs/src/js/BitStream.js' {
  const BitStream: unknown
  export default BitStream
}
