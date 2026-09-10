import MPEGMode from 'lamejs/src/js/MPEGMode.js'
import Lame from 'lamejs/src/js/Lame.js'
import BitStream from 'lamejs/src/js/BitStream.js'

const globalLame = globalThis as typeof globalThis & {
  MPEGMode?: unknown
  Lame?: unknown
  BitStream?: unknown
}
globalLame.MPEGMode = MPEGMode
globalLame.Lame = Lame
globalLame.BitStream = BitStream
