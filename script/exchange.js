function rand_big_int(min, max) {
    if (min > max) {
        throw new Error("where is your common sense, min can't be larger than max")
    }

    let dif = max - min

    let numerator = ""
    while (numerator < dif.toString().length) {
        numerator += Math.random().toString().split(".")[1].replace("e", "").replace("-", "")
    }

    numerator = numerator.slice(0, dif.toString().length)

    let denominator = "1" + "0".repeat(dif.toString().length)

    return min + (((dif + 1n) * BigInt(numerator)) / BigInt(denominator))
}

async function mod_exp(b, e, mod) {
    let result = 1n
    
    b = b % mod

    if (b === 0n) {
        return 0n
    }

    while (e > 0n) {
        if (e & 1n) {
            result = (result * b) % mod
        }

        e = e >> 1n
        b = (b * b) % mod
    }

    return result
}

async function encrypt(message, key) {
    let nonce = newNonce(24, localStorage.getItem("2wrpfhkeycounter"))

    return arrayBufferToHexString(AeadXChaCha20Poly1305(key, nonce, (new TextEncoder()).encode(message), new Uint8Array()))
}

async function decrypt(ciphertext, key) {
    let buffer = ciphertext
    let message = AeadXChaCha20Poly1305(key, buffer.subarray(0, 24), buffer.subarray(24, buffer.length - 16), new Uint8Array())

    return message.subarray(24, message.length - 16)
}

async function exchange(p, g, s_pub) {

    const c_pri = rand_big_int(1n, p - 2n)
    const c_pub = await mod_exp(g, c_pri, p)
    
    const secret_key = await mod_exp(s_pub, c_pri, p)

    const secret = arrayBufferToHexString(sha256(hexStringToUint8Array(secret_key.toString(16))))

    return { secret, c_pub }
}