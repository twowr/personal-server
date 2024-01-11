function hexStringToUint8Array(hex) {
    let flag = true
    for (char in hex) {
        if (char != "0") {
            flag = false
            break
        }
    }

    if (flag) {
        return new Uint8Array(0)
    }

    //padding
    if (hex.length % 2 === 1) {
        hex = "0" + hex
    }

    let byteLength = hex.length / 2
    let ui8arr = new Uint8Array(byteLength)

    let byteIndex = 0
    for (let i = 0; i < hex.length; i += 2) {
        ui8arr[byteIndex] = parseInt(hex.slice(i, i + 2), 16)
        byteIndex++
    }

    return ui8arr
}

function arrayBufferToHexString(buffer) {
    return [...new Uint8Array(buffer)]
            .map(b => { return b.toString(16).padStart(2, "0") })
            .join("")
}

function number64bitToUint8Array(num, littleEndian) {
    const buffer = new ArrayBuffer(8)
    const dataView = new DataView(buffer)
    dataView.setBigUint64(0, BigInt(num), littleEndian)
    const uint8array = new Uint8Array(buffer)

    return uint8array
}

function number32bitToUint8Array(num, littleEndian) {
    const buffer = new ArrayBuffer(4)
    const dataView = new DataView(buffer)
    dataView.setUint32(0, num, littleEndian)
    const uint8array = new Uint8Array(buffer)

    return uint8array
}

//NIST.FIPS.180-4
function sha256(message_uint8array) {
    //w=32

    //addition modulo 2^w
    function addw32(x, y) {
        var lsw = (x & 0xffff) + (y & 0xffff)
        var msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16)
        return (msw << 16) | (lsw & 0xffff)
    }

    function ROTR(n, x) {
        return (((x >>> n) & 0xffffffff) | ((x << (32 - n)) & 0xffffffff)) >>> 0
    }


    function Ch(x, y, z) {
        return ((x & y) ^ ((~x) & z)) >>> 0
    }

    function Maj(x, y, z) {
        return ((x & y) ^ (x & z) ^ (y & z)) >>> 0
    }

    function SIGMA0(x) {
        return (ROTR(2, x) ^ ROTR(13, x) ^ ROTR(22, x)) >>> 0
    }

    function SIGMA1(x) {
        return (ROTR(6, x) ^ ROTR(11, x) ^ ROTR(25, x)) >>> 0
    }

    function sigma0(x) {
        return (ROTR(7, x) ^ ROTR(18, x) ^ (x >>> 3)) >>> 0
    }

    function sigma1(x) {
        return (ROTR(17, x) ^ ROTR(19, x) ^ (x >>> 10)) >>> 0
    }

    //first 32 bits of the fractional parts of the cube roots of the first sixty-four prime numbers
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]

    //*   Preprocessing   *//
    //padding
    let messageBuffer = new Uint8Array(message_uint8array)
    //append the bit '1' to the end of the message
    //due to message being a Uint8Array, we have to append 8 bits at once (7 extra '0' bits)
    messageBuffer = new Uint8Array([...messageBuffer, 0b10000000])
    //followed by k zero bits, where k is the smallest, non-negative solution to the equation l + 1 + k ≡ 448 mod 512
    //k ≡ 448 - l - 1 mod 512
    //k ≡ -64 - l - 1 mod 512
    //k ≡ -(64 + l + 1) mod 512
    //smallest k
    //k = (-(64 + l + 1) mod 512)
    //we added 7 extra '0' bits
    //k = (-(64 + l + (1 + 7)) mod 512)
    //due to javascript
    //k = ((-(64 + l + 8) % 512) + 512) % 512
    //k will always be a multiple of 8 because 512, 64, 8 and l have a factor of 8
    //l have an 8 factor because l is the message length in bit and message is a Uint8Array
    //Uint8 padding amount = k/8 = (((-(64 + l + 8) % 512) + 512) % 512) / 8
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray#length
    //filled with zeros (from the website)

    //Append the 64-bit block that is equal to the number l expressed using a binary representation
    const l = message_uint8array.length * 8
    messageBuffer = new Uint8Array([
        ...messageBuffer,
        ...(new Uint8Array(   ((((-(64 + l + 8) % 512) + 512) % 512) / 8)   )),
        ...number64bitToUint8Array(l),
    ])

    //The length of the padded message should now be a multiple of 512 bits

    //initial value
    let H = [
        0x6a09e667,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19,
    ]

    //*   Computation   *//
    for (let i = 0; i < messageBuffer.length; i += 64) {
        //the 512 bits of the input block may be expressed as sixteen 32-bit words
        let M = new Uint32Array(16)
        for (let j = 0; j < 16; j++) {
            let j1 = j * 4
            //rearrange every 4 Uint8 in message buffer into a 32bit word
            M[j] = (messageBuffer[i + j1] << (8*3)) | (messageBuffer[i + j1 + 1] << (8*2)) | (messageBuffer[i + j1 + 2] << (8*1)) | messageBuffer[i + j1 + 3]
        }

        //message schedule
        let W = new Uint32Array(64)
        //1. Prepare the message schedule
        //0 ≤ t ≤ 15
        for (let t = 0; t < 16; t++) {
            W[t] = M[t]
        }
        //16 ≤ t ≤ 63
        for (let t = 16; t < 64; t++) {
            W[t] = addw32(addw32(sigma1(W[t - 2]), W[t - 7]), addw32(sigma0(W[t - 15]), W[t - 16]))
        }

        //2. Initialize the eight working variables
        let a = H[0],
            b = H[1],
            c = H[2],
            d = H[3],
            e = H[4],
            f = H[5],
            g = H[6],
            h = H[7]
        
        //3.
        for (let t = 0; t < 64; t++) {
            const T1 = addw32(addw32(addw32(h, SIGMA1(e)), addw32(Ch(e ,f, g), K[t])), W[t])
            const T2 = addw32(SIGMA0(a), Maj(a, b, c))
            h = g
            g = f
            f = e
            e = addw32(d, T1)
            d = c
            c = b
            b = a
            a = addw32(T1, T2)
        }

        //4. Compute the intermediate hash value H
        H[0] = addw32(a, H[0])
        H[1] = addw32(b, H[1])
        H[2] = addw32(c, H[2])
        H[3] = addw32(d, H[3])
        H[4] = addw32(e, H[4])
        H[5] = addw32(f, H[5])
        H[6] = addw32(g, H[6])
        H[7] = addw32(h, H[7])
    }

    let finalHash = new Uint8Array(32)
    for (let i = 0; i < 8; i++) {
        const hashUint8 = number32bitToUint8Array(H[i], false)
        finalHash.set(hashUint8, i * 4)
    }

    return finalHash
}

//addition modulo 2^32
function add32(x, y) {
    var lsw = (x & 0xffff) + (y & 0xffff)
    var msw = (x >>> 16) + (y >>> 16) + (lsw >>> 16)
    return ((msw << 16) | (lsw & 0xffff)) >>> 0
}

function rotateLeft32(x, n) {
    return (((x << n) & 0xffffffff) | ((x >>> (32 - n)) & 0xffffffff)) >>> 0
}

function quarterRound(state_uint32array, x, y, z, w) {
    state_uint32array[x] = add32(state_uint32array[x], state_uint32array[y])
    state_uint32array[w] ^= state_uint32array[x]
    state_uint32array[w] = rotateLeft32(state_uint32array[w], 16)
    state_uint32array[z] = add32(state_uint32array[z], state_uint32array[w])
    state_uint32array[y] ^= state_uint32array[z]
    state_uint32array[y] = rotateLeft32(state_uint32array[y], 12)
    state_uint32array[x] = add32(state_uint32array[x], state_uint32array[y])
    state_uint32array[w] ^= state_uint32array[x]
    state_uint32array[w] = rotateLeft32(state_uint32array[w], 8)
    state_uint32array[z] = add32(state_uint32array[z], state_uint32array[w])
    state_uint32array[y] ^= state_uint32array[z]
    state_uint32array[y] = rotateLeft32(state_uint32array[y], 7)

    return state_uint32array
}

function swapEndianNum32(num) {
    return (((num >>> (8 * 3)) & 0x000000ff) | ((num << (8 * 3)) & 0xff000000) | ((num >>> (8 * 1)) & 0x0000ff00) | ((num << (8 * 1)) & 0x00ff0000)) >>> 0
}

function swapEndianArray32(array) {
    return (new Uint8Array([...array])).reverse()
}

function ChaCha20Block(key_uint8array_32elements_little_endian, counter_uint32, nonce_uint8array_12elements_little_endian) {
    let key_uint32array_8elements_little_endian = new Uint32Array(8)
    for (let i = 0; i < 32; i++) {
        key_uint32array_8elements_little_endian[Math.floor(i / 4)] |= key_uint8array_32elements_little_endian[31 - i] << (8 * (i % 4))
    }

    let nonce_uint32array_3elements_little_endian = new Uint32Array(3)
    for (let i = 0; i < 12; i++) {
        nonce_uint32array_3elements_little_endian[Math.floor(i / 4)] |= nonce_uint8array_12elements_little_endian[11 - i] << (8 * (i % 4))
    }

    let state = new Uint32Array([
        0x61707865, 0x3320646e, 0x79622d32, 0x6b206574,
        ...key_uint32array_8elements_little_endian,
        counter_uint32, ...nonce_uint32array_3elements_little_endian
    ])

    const initialState = new Uint32Array(state)

    for (let i = 0; i < 10; i++) {
        state = quarterRound(state, 0, 4, 8, 12)
        state = quarterRound(state, 1, 5, 9, 13)
        state = quarterRound(state, 2, 6, 10, 14)
        state = quarterRound(state, 3, 7, 11, 15)
        state = quarterRound(state, 0, 5, 10, 15)
        state = quarterRound(state, 1, 6, 11, 12)
        state = quarterRound(state, 2, 7, 8, 13)
        state = quarterRound(state, 3, 4, 9, 14)
    }

    //add v along the process
    const bigEndianState = state.map((v, i) => {
        return swapEndianNum32(add32(v, initialState[i]))
    })

    let result = new Uint8Array()

    bigEndianState.forEach(s => {
        result = new Uint8Array([...result, ...number32bitToUint8Array(s, false)])
    })

    return result
}

function HChaCha20(key_uint8array_32elements_little_endian, nonce_uint8array_16elements_little_endian) {
    let key_uint32array_8elements_little_endian = new Uint32Array(8)
    for (let i = 0; i < 32; i++) {
        key_uint32array_8elements_little_endian[Math.floor(i / 4)] |= key_uint8array_32elements_little_endian[31 - i] << (8 * (i % 4))
    }

    let nonce_uint32array_4elements_little_endian = new Uint32Array(4)
    for (let i = 0; i < 16; i++) {
        nonce_uint32array_4elements_little_endian[Math.floor(i / 4)] |= nonce_uint8array_16elements_little_endian[15 - i] << (8 * (i % 4))
    }

    let state = new Uint32Array([
        0x61707865, 0x3320646e, 0x79622d32, 0x6b206574,
        ...key_uint32array_8elements_little_endian,
        ...nonce_uint32array_4elements_little_endian
    ])

    for (let i = 0; i < 10; i++) {
        state = quarterRound(state, 0, 4, 8, 12)
        state = quarterRound(state, 1, 5, 9, 13)
        state = quarterRound(state, 2, 6, 10, 14)
        state = quarterRound(state, 3, 7, 11, 15)
        state = quarterRound(state, 0, 5, 10, 15)
        state = quarterRound(state, 1, 6, 11, 12)
        state = quarterRound(state, 2, 7, 8, 13)
        state = quarterRound(state, 3, 4, 9, 14)
    }

    //take first and last row
    let result = new Uint8Array()

    for (let i = 0; i < 4; i++) {
        result = new Uint8Array([...result, ...number32bitToUint8Array(state[i], true)])
    }

    for (let i = 12; i < 16; i++) {
        result = new Uint8Array([...result, ...number32bitToUint8Array(state[i], true)])
    }

    return result
}

function ChaCha20Encrypt(key_uint8array_32elements_little_endian, counter_uint32, nonce_uint8array_12elements_little_endian, plaintext_uint8array) {
    let encryptedMessage = new Uint8Array(plaintext_uint8array.length)
    for (let j = 0; j < Math.floor(plaintext_uint8array.length / 64); j++) {
        let keyStream = ChaCha20Block(key_uint8array_32elements_little_endian, counter_uint32 + j, nonce_uint8array_12elements_little_endian)
        let block = plaintext_uint8array.subarray(j * 64, (j + 1) * 64)
        for (let i = 0; i < 64; i++) {
            encryptedMessage[(j * 64) + i] = keyStream[i] ^ block[i]
        }
    }

    if ((plaintext_uint8array.length % 64) != 0) {
        let j = Math.floor(plaintext_uint8array.length / 64)
        let keyStream = ChaCha20Block(key_uint8array_32elements_little_endian, counter_uint32 + j, nonce_uint8array_12elements_little_endian)
        let block = plaintext_uint8array.subarray(j * 64, plaintext_uint8array.length)
        for (let i = 0; i < 64; i++) {
            encryptedMessage[(j * 64) + i] = keyStream[i] ^ block[i]
        }
    }

    return encryptedMessage
}

function XChaCha20Encrypt(key_uint8array_32elements_little_endian, nonce_uint8array_24elements_little_endian, plaintext_uint8array) {
    let subKey = HChaCha20(key_uint8array_32elements_little_endian, new Uint8Array([...nonce_uint8array_24elements_little_endian.subarray(8, 24)])).reverse()

    let chacha20Nonce = (new Uint8Array([
        0x0, 0x0, 0x0, 0x0,
        ...((new Uint8Array([...nonce_uint8array_24elements_little_endian.subarray(0, 8)])).reverse())
    ])).reverse()

    let bulkCounter = 1

    return ChaCha20Encrypt(subKey, bulkCounter, chacha20Nonce, plaintext_uint8array)
}

function clamp(r) {
    return r & 0x0ffffffc0ffffffc0ffffffc0fffffffn
}

function poly1305Mac(message_uint8array, key_uint8array_32elements) {
    let r = clamp(BigInt("0x" + arrayBufferToHexString(key_uint8array_32elements.subarray(0, 16).reverse())))
    let s = BigInt("0x" + arrayBufferToHexString(key_uint8array_32elements.subarray(16, 32).reverse()))

    let a = 0n
    const p = (1n<<130n)-5n

    for (let i = 1; i < Math.ceil(message_uint8array.length / 16) + 1; i++) {
        let n = BigInt("0x01" + arrayBufferToHexString(
            message_uint8array.subarray((i - 1) * 16, i * 16).reverse()
        ))

        a += n
        a = (r * a) % p
    }
    
    a += s

    const aString = a.toString(16)
    const offset = aString.length - 32 < 0 ? 0 : aString.length - 32

    return hexStringToUint8Array(aString.substring(offset, aString.length).padStart(32, "0")).reverse()
}

function poly1305KeyGen(key, nonce) {
    const counter = 0
    const block = ChaCha20Block(key, counter, nonce)
    return block.subarray(0, 32)
}

function pad16(x) {
    if (x.length % 16 === 0) {
        return new Uint8Array()
    } else {
        return new Uint8Array(16 - (x.length % 16))
    }
}

//shift concat iv and constant to nonce to the function caller
function AeadChaCha20Poly1305(key_uint8array_32elements, nonce_uint8array_12elements, plaintext_uint8array, aad_uint8array) {
    let nonce = new Uint8Array([
        ...nonce_uint8array_12elements
    ]).reverse()

    let key = (new Uint8Array([...key_uint8array_32elements])).reverse()

    let otk = poly1305KeyGen(key, nonce)
    let cipherText = ChaCha20Encrypt(key, 1, nonce, plaintext_uint8array)

    let macData = new Uint8Array([
        ...(new Uint8Array(aad_uint8array)), ...pad16(aad_uint8array),
        ...cipherText, ...pad16(cipherText),
        ...number64bitToUint8Array(aad_uint8array.length, true),
        ...number64bitToUint8Array(cipherText.length, true)
    ])

    let tag = poly1305Mac(macData, otk)

    return new Uint8Array([...cipherText, ...tag])
}

function AeadXChaCha20Poly1305(key_uint8array_32elements, nonce_uint8array_24elements, plaintext_uint8array, aad_uint8array) {
    let subKey = HChaCha20(
        (new Uint8Array([...key_uint8array_32elements])).reverse(),
        (new Uint8Array([...nonce_uint8array_24elements.subarray(0, 16)])).reverse()
    )

    let nonce = new Uint8Array([
        0x00, 0x00, 0x00, 0x00,
        ...nonce_uint8array_24elements.subarray(16, 24)
    ])

    return new Uint8Array([...nonce_uint8array_24elements, ...AeadChaCha20Poly1305(subKey, nonce, plaintext_uint8array, aad_uint8array)])
}

function newNonce(nonceLength, counter) {
    let nonce = new Uint8Array(nonceLength)
    if (nonceLength < 16) {
        throw new Error("nonce length too short idiot")
    }

    let source1 = poly1305KeyGen(
        new Uint8Array([
            ...number64bitToUint8Array(Date.now(), true),
            ...number64bitToUint8Array(Date.now(), false),
            ...number64bitToUint8Array(Date.now(), false),
            ...number64bitToUint8Array(Date.now(), true),
        ]),
        new Uint8Array([
            ...number64bitToUint8Array(Date.now(), false),
            ...number64bitToUint8Array(Date.now(), true).subarray(0, 4),
        ])
    )

    nonce = new Uint8Array([
        ...source1.subarray(0, Math.min(source1.length, nonceLength)),
        ...(new Uint8Array(nonceLength - Math.min(source1.length, nonceLength)))
    ])

    nonce = new Uint8Array([
        ...nonce.subarray(0, nonceLength - 4),
        ...number64bitToUint8Array(counter, true).subarray(0, 4)
    ])

    return nonce
}