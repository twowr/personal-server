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
    const algorithm = { name: "AES-GCM", iv: crypto.getRandomValues(new Uint8Array(12)) }

    const ciphertextBuffer = await crypto.subtle.encrypt(
        algorithm,
        await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]),
        message
    )

    const ciphertextWithNonce = new Uint8Array([...algorithm.iv, ...new Uint8Array(ciphertextBuffer)])

    return arrayBufferToHexString(ciphertextWithNonce)
}

async function decrypt(ciphertextWithNonce, key) {
    const algorithm = { name: 'AES-GCM', iv: ciphertextWithNonce.slice(0, 12) };

    const keyBuffer = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    const messageBuffer = await crypto.subtle.decrypt(algorithm, keyBuffer, ciphertextWithNonce.slice(12));

    return messageBuffer;
}

function arrayBufferToHexString(buffer) {
    return [...new Uint8Array(buffer)]
            .map(b => { return b.toString(16).padStart(2, "0") })
            .join("")
}

function hexStringToUint8Array(hex) {
    if (BigInt("0x" + hex) === 0n) {
        console.log(hex)
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


async function sha256(message) {
    // hash the message
    const hashBuffer = await crypto.subtle.digest("SHA-256", message)

    // convert ArrayBuffer to Array
    const hashArray = new Uint8Array(hashBuffer)

    // convert bytes to hex string                  
    const hashHex = arrayBufferToHexString(hashArray)
    return hashHex;
}

async function exchange(p, g, s_pub) {

    const c_pri = rand_big_int(1n, p - 2n)
    const c_pub = await mod_exp(g, c_pri, p)
    
    const secret_key = await mod_exp(s_pub, c_pri, p)

    const secret = await sha256(hexStringToUint8Array(secret_key.toString(16)))

    return { secret, c_pub }
}

export { rand_big_int, mod_exp, encrypt, decrypt, arrayBufferToHexString, hexStringToUint8Array, sha256, exchange }