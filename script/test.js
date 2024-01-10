function run_test(test_case, test_function, test_name) {
    let score = 0
    test_case.forEach(test => {
        if (test_function(test.in) == test.out) {
            score += 1
        }
    })

    let testName = test_name == undefined ? test_function.toString() : test_name

    console.log(testName, " test completed")
    console.log("result: ", score, "/", test_case.length)
}

run_test([
    { in: (new TextEncoder()).encode(""), out: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
    { in: (new TextEncoder()).encode("a"), out: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb" },
    { in: (new TextEncoder()).encode("ab"), out: "fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603" },
    { in: (new TextEncoder()).encode("abc"), out: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad" },
    { in: (new TextEncoder()).encode("abcd"), out: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589" },
    { in: (new TextEncoder()).encode("abcde"), out: "36bbe50ed96841d10443bcb670d6554f0a34b761be67ec9c4a8ad2c0c44ca42c" },
    { in: (new TextEncoder()).encode("abd981236abc865ad74c85b856ad65d867ca56a978665c67b896598d5c9586ad65c6586ddcbacdbfffff"), out: "d1ec42a722028341605a41ab9c73302c6368a3db164dc52b08d490639f3cb008" },
], (in_object) => {
    return arrayBufferToHexString(sha256(in_object))
})

run_test([
    { in: [ 0xffffffff, 0x1 ], out: 0 },
    { in: [ 0xffffffff, 0x2 ], out: 1 },
    { in: [ 0x1, 0xffffffff ], out: 0 },
    { in: [ 0x2, 0xffffffff ], out: 1 },
], (in_object) => {
    return add32(in_object[0], in_object[1])
})

run_test([
    { in: [ 0xfffffff0, 3 * 4 ], out: 0xffff0fff },
    { in: [ 0xf0ffffff, 4 * 4 ], out: 0xfffff0ff },
    { in: [ 0xfffffff1, 1 ], out: 0xffffffe3 },
    { in: [ 0x8ffffff1, 1 ], out: 0x1fffffe3 },
], (in_object) => {
    return rotateLeft32(in_object[0], in_object[1])
})

run_test([
    { in: [ 0xfffffff0, 3 * 4 ], out: 0xffff0fff },
    { in: [ 0xf0ffffff, 4 * 4 ], out: 0xfffff0ff },
    { in: [ 0xfffffff1, 1 ], out: 0xffffffe3 },
    { in: [ 0x8ffffff1, 1 ], out: 0x1fffffe3 },
], (in_object) => {
    return rotateLeft32(in_object[0], in_object[1])
})

run_test([
    { in: { input: new Uint32Array([0x11111111, 0x01020304, 0x9b8d6f43, 0x01234567]),
            output: new Uint32Array([0xea2a92f4, 0xcb1cf8ce, 0x4581472e, 0x5881c4bb]),
            index: [ 0, 1, 2, 3 ]}, out: true },
    { in: { input: new Uint32Array([
        0x879531e0, 0xc5ecf37d, 0x516461b1, 0xc9a62f8a,
        0x44c20ef3, 0x3390af7f, 0xd9fc690b, 0x2a5f714c,
        0x53372767, 0xb00a5631, 0x974c541a, 0x359e9963,
        0x5c971061, 0x3d631689, 0x2098d9d6, 0x91dbd320,
    ]), output: new Uint32Array([
        0x879531e0, 0xc5ecf37d, 0xbdb886dc, 0xc9a62f8a,
        0x44c20ef3, 0x3390af7f, 0xd9fc690b, 0xcfacafd2,
        0xe46bea80, 0xb00a5631, 0x974c541a, 0x359e9963,
        0x5c971061, 0xccc07c79, 0x2098d9d6, 0x91dbd320,
    ]), index: [ 2, 7, 8, 13 ]}, out: true },
], (inp) => {
    let testArray = new Uint32Array()
    testArray = quarterRound(inp.input, inp.index[0], inp.index[1], inp.index[2], inp.index[3])

    if (testArray === inp.output) return true
    if (testArray == null || inp.output == null) return false

    for (let i = 0; i < testArray.length; i++) {
        if (testArray[i] !== inp.output[i]) return false
    }

    return true
})

run_test([
    { in: 0x00010203, out: 0x03020100 },
    { in: 0x1a2b3c4d, out: 0x4d3c2b1a },
    { in: 0xcafebabe, out: 0xbebafeca },
], swapEndianNum32, "swapEndianNum32")

run_test([{
    in: { 
        key: (new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
            0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
        ])).reverse(),
        counter: 1,
        nonce: (new Uint8Array([
            0x00, 0x00, 0x00, 0x09, 0x00, 0x00, 0x00, 0x4a, 0x00, 0x00, 0x00, 0x00
        ])).reverse(),
        output: new Uint8Array([
            0x10, 0xf1, 0xe7, 0xe4, 0xd1, 0x3b, 0x59, 0x15, 0x50, 0x0f, 0xdd, 0x1f, 0xa3, 0x20, 0x71, 0xc4,
            0xc7, 0xd1, 0xf4, 0xc7, 0x33, 0xc0, 0x68, 0x03, 0x04, 0x22, 0xaa, 0x9a, 0xc3, 0xd4, 0x6c, 0x4e,
            0xd2, 0x82, 0x64, 0x46, 0x07, 0x9f, 0xaa, 0x09, 0x14, 0xc2, 0xd7, 0x05, 0xd9, 0x8b, 0x02, 0xa2,
            0xb5, 0x12, 0x9c, 0xd1, 0xde, 0x16, 0x4e, 0xb9, 0xcb, 0xd0, 0x83, 0xe8, 0xa2, 0x50, 0x3c, 0x4e,
        ])
    },
    out: true
}], (in_object) => {
    let testResult = ChaCha20Block(in_object.key, in_object.counter, in_object.nonce)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) return false
    }
    return true
}, "ChaCha20 Block")

run_test([
    {
        in: { 
            key: (new Uint8Array([
                0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
                0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
            ])).reverse(),
            nonce: (new Uint8Array([
                0x00, 0x00, 0x00, 0x09, 0x00, 0x00, 0x00, 0x4a, 0x00, 0x00, 0x00, 0x00, 0x31, 0x41, 0x59, 0x27
            ])).reverse(),
            output: new Uint8Array([
                0x82, 0x41, 0x3b, 0x42, 0x27, 0xb2, 0x7b, 0xfe, 0xd3, 0x0e, 0x42, 0x50, 0x8a, 0x87, 0x7d, 0x73, 
                0xa0, 0xf9, 0xe4, 0xd5, 0x8a, 0x74, 0xa8, 0x53, 0xc1, 0x2e, 0xc4, 0x13, 0x26, 0xd3, 0xec, 0xdc, 
            ])
        },
        out: true
    },
    {
        in: { 
            key: (new Uint8Array([
                0x01, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f
            ])).reverse(),
            nonce: (new Uint8Array([
                0x00, 0x10, 0x00, 0x39, 0x00, 0x00, 0x60, 0x4a, 0x00, 0x00, 0xa0, 0x00, 0x31, 0x41, 0x59, 0x27
            ])).reverse(),
            output: hexStringToUint8Array("0442c773b95809beea8b091681bf9a085ea2542df71d750f71bccaf8d7dc9edc")
        },
        out: true
    },
    {
        in: { 
            key: (new Uint8Array([
                0x69, 0x42, 0x00, 0xca, 0xfe, 0xba, 0xbe, 0x77, 0x88, 0x99, 0xaa, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
            ])).reverse(),
            nonce: (new Uint8Array([
                0x10, 0x10, 0x90, 0x39, 0x10, 0x50, 0x60, 0x4a, 0xad, 0x00, 0xa3, 0x10, 0x31, 0x91, 0x59, 0x27,
            ])).reverse(),
            output: hexStringToUint8Array("dc459fbc1e8362f1b1f6d661d053dd25aa275cee8a82772afbbb6bffa0a872dc")
        },
        out: true
    },
], (in_object) => {
    let testResult = HChaCha20(in_object.key, in_object.nonce)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) return false
    }
    return true
}, "HChaCha20")

run_test([
    {
        in: { 
            key: (new Uint8Array([
                0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
                0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
            ])).reverse(),
            counter: 1,
            nonce: (new Uint8Array([
                0x00, 0x00, 0x00, 0x00,
                0x00, 0x00, 0x00, 0x4a,
                0x00, 0x00, 0x00, 0x00,
            ])).reverse(),
            plaintext: (new TextEncoder()).encode("Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."),
            output: new Uint8Array([
                0x6e, 0x2e, 0x35, 0x9a, 0x25, 0x68, 0xf9, 0x80, 0x41, 0xba, 0x07, 0x28, 0xdd, 0x0d, 0x69, 0x81,
                0xe9, 0x7e, 0x7a, 0xec, 0x1d, 0x43, 0x60, 0xc2, 0x0a, 0x27, 0xaf, 0xcc, 0xfd, 0x9f, 0xae, 0x0b,
                0xf9, 0x1b, 0x65, 0xc5, 0x52, 0x47, 0x33, 0xab, 0x8f, 0x59, 0x3d, 0xab, 0xcd, 0x62, 0xb3, 0x57,
                0x16, 0x39, 0xd6, 0x24, 0xe6, 0x51, 0x52, 0xab, 0x8f, 0x53, 0x0c, 0x35, 0x9f, 0x08, 0x61, 0xd8,
                0x07, 0xca, 0x0d, 0xbf, 0x50, 0x0d, 0x6a, 0x61, 0x56, 0xa3, 0x8e, 0x08, 0x8a, 0x22, 0xb6, 0x5e,
                0x52, 0xbc, 0x51, 0x4d, 0x16, 0xcc, 0xf8, 0x06, 0x81, 0x8c, 0xe9, 0x1a, 0xb7, 0x79, 0x37, 0x36,
                0x5a, 0xf9, 0x0b, 0xbf, 0x74, 0xa3, 0x5b, 0xe6, 0xb4, 0x0b, 0x8e, 0xed, 0xf2, 0x78, 0x5e, 0x42,
                0x87, 0x4d,
            ])
        },
        out: true
    },
    {
        in: { 
            key: (new Uint8Array([
                0x69, 0x42, 0x00, 0xca, 0xfe, 0xba, 0xbe, 0x77, 0x88, 0x99, 0xaa, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
                0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
            ])).reverse(),
            counter: 69,
            nonce: (new Uint8Array([
                0x00, 0x50, 0x60, 0x4a,
                0xad, 0x00, 0xa3, 0x10,
                0x31, 0x91, 0x59, 0x27,
            ])).reverse(),
            plaintext: (new TextEncoder()).encode("age is just a number"),
            output: hexStringToUint8Array("19c3b9e98fb4db1df33acf8943b3d0cff50794c4")
        },
        out: true
    },
    {
        in: { 
            key: (new Uint8Array([
                0x69, 0x42, 0x00, 0xca, 0xfe, 0xba, 0xbe, 0x77, 0x88, 0x99, 0xaa, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
                0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
            ])).reverse(),
            counter: 69,
            nonce: (new Uint8Array([
                0x00, 0x50, 0x60, 0x4a,
                0xad, 0x00, 0xa3, 0x10,
                0x31, 0x91, 0x59, 0x27,
            ])).reverse(),
            plaintext: (new TextEncoder()).encode("The dhole (pronounced \"dole\") is also known as the Asiatic wilddog, red dog, and whistling dog. It is about the size of a German shepherd but looks more like a long-legged fox. This highly elusive and skilled jumper is classified with wolves, coyotes, jackals, and foxesin the taxonomic family Canidae."),
            output: hexStringToUint8Array("2cccb9e982af941be36993d950fcd0d5ed0b92d376bb012f76c3b10d4c07c19b86ce10aaf14345f59e1b50746948d304334984950aeaf01108d4a45b21ba985b94c1829afa1153a5e149d402377fff8db3366a786ed8c4d53d5737e136cf30d1c21699e6bab75dd3b61098dfd9db3cbea806cbbd4ba6f85c8a739092c1a2272d0996836d34afe6252e0bf9de79bb8307702d33d26007ad44e1d77f1d4857e948749478aba05ea69ebb1dc020706482f7cce8320595cd8d2b1ad338f4951e681ae242306e3f68f193f4806b0a2bd76136de8709214078701840133d96d519188da460021ec789609b69c2d171b8a43af78c49dbc6dd870053b142e1ebb9e8b586cde8094278d1bd30e022c594e23ac3644f1d6de7d3344cc5a9a3395da923306d178f0f3d19bb0d666e5f40da55b9")
        },
        out: true
    },
], (in_object) => {
    let testResult = ChaCha20Encrypt(in_object.key, in_object.counter, in_object.nonce, in_object.plaintext)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) return false
    }
    return true
}, "ChaCha20 Encrypt")

run_test([
    {
        in: { 
            key: (new Uint8Array([
                0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f,
                0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
            ])).reverse(),
            nonce: (new TextEncoder()).encode("@ABCDEFGHIJKLMNOPQRSTUVX").reverse(),
            plaintext: (new TextEncoder()).encode(
                "The dhole (pronounced \"dole\") is also known as the Asiatic wilddog, red dog, and whistling dog. It is about the size of a German shepherd but looks more like a long-legged fox. This highly elusive and skilled jumper is classified with wolves, coyotes, jackals, and foxesin the taxonomic family Canidae."
            ),
            output: hexStringToUint8Array("7d0a2e6b7f7c65a236542630294e063b7ab9b555a5d5149aa21e4ae1e4fbce87ecc8e08a8b5e350abe622b2ffa617b202cfad72032a3037e76ffdcdc4376ee413111467214dd1ca4054f8d488df8c423b4068e529cbfbf15bfa50a4670834c0115870c1dfa7b9467e949b9fd3c9e4c36af0c5b94cc3fc38e69b07dc72bb4de0e5cab6a0aca3ce37695966558e59cfd4b5530f77f12be03d50eb03361e1ef49fd487e28db1a025a2fb83b1bce7b7e7ca2395e5554982f830dd345f016fe8b457ad38fd84906a14afa88b2ea9e8e93b464eb8f88513fe703f64266136fd49cbc73dab93919cce9539e75135e064279d48e2f7c68273e9c216f2eea77f897b826fcdaf8a4832b4d6abb30dc67e8ecedb0471a7b3ddd9a8ef8ea0b6d307026dd5f86cb9779f61b1763468b6774ac9be2")
        },
        out: true
    },
    {
        in: { 
            key: (new Uint8Array([
                0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f,
                0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
            ])).reverse(),
            nonce: (new TextEncoder()).encode("@ABCDEFGHIJKLMNOPQRSTUVX").reverse(),
            plaintext: (new TextEncoder()).encode(
                "Hello world!"
            ),
            output: hexStringToUint8Array("6107272774347da121186a61")
        },
        out: true
    },
    {
        in: { 
            key: (new Uint8Array([
                0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77, 0x27,
                0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77, 0x27, 0x72, 0x77
            ])).reverse(),
            nonce: (new TextEncoder()).encode("@ABCDEFGHIJKLMNOPQRSTUVX").reverse(),
            plaintext: (new TextEncoder()).encode(
                "WHEN YOU SEE IT!!! WHEN YOU FUCKING SEE IT 727 WHEN YOU FUCKING SEE IT"
            ),
            output: hexStringToUint8Array("04a06ba5ae6463ceab8ae07823377d2dbd7eb9c745021838f3b584f1a50ad73a346dfe58893fd8ff5ff3c7ac43602b4b9f33fa7d1fbb09edcfa9fdfe06dd24b1e8929cf93510")
        },
        out: true
    },
], (in_object) => {
    let testResult = XChaCha20Encrypt(in_object.key, in_object.nonce, in_object.plaintext)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) return false
    }
    return true
}, "XChaCha20 Encrypt")

run_test([{
    in: { 
        message: (new TextEncoder()).encode("Cryptographic Forum Research Group"),
        key: (new Uint8Array([
            0x85, 0xd6, 0xbe, 0x78, 0x57, 0x55, 0x6d, 0x33,
            0x7f, 0x44, 0x52, 0xfe, 0x42, 0xd5, 0x06, 0xa8,
            0x01, 0x03, 0x80, 0x8a, 0xfb, 0x0d, 0xb2, 0xfd,
            0x4a, 0xbf, 0xf6, 0xaf, 0x41, 0x49, 0xf5, 0x1b,
        ])),
        output: new Uint8Array([
            0xa8, 0x06, 0x1d, 0xc1, 0x30, 0x51, 0x36, 0xc6, 0xc2, 0x2b, 0x8b, 0xaf, 0x0c, 0x01, 0x27, 0xa9
        ])
    },
    out: true
}], (in_object) => {
    let testResult = poly1305Mac(in_object.message, in_object.key)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) {
            console.log(testResult[i].toString(16), in_object.output[i].toString(16))
            return false
        }
    }
    return true
}, "poly1305 Mac")

run_test([{
    in: { 
        key: new Uint32Array([
            0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f,
            0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
        ]).reverse(),
        nonce: (new Uint32Array([
            0x00, 0x00, 0x00, 0x00,
            0x00, 0x01, 0x02, 0x03,
            0x04, 0x05, 0x06, 0x07
        ])).reverse(),
        output: new Uint8Array([
            0x8a, 0xd5, 0xa0, 0x8b, 0x90, 0x5f, 0x81, 0xcc, 0x81, 0x50, 0x40, 0x27, 0x4a, 0xb2, 0x94, 0x71,
            0xa8, 0x33, 0xb6, 0x37, 0xe3, 0xfd, 0x0d, 0xa5, 0x08, 0xdb, 0xb8, 0xe2, 0xfd, 0xd1, 0xa6, 0x46,
        ])
    },
    out: true
}], (in_object) => {
    let testResult = poly1305KeyGen(in_object.key, in_object.nonce)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) {
            console.log(testResult[i].toString(16), in_object.output[i].toString(16))
            return false
        }
    }
    return true
}, "poly1305 Key Gen")

run_test([
    {
        in: {
            plaintext: (new TextEncoder()).encode("Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."),
            aad: new Uint8Array([0x50, 0x51, 0x52, 0x53, 0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7,]),
            key: new Uint32Array([
                0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f,
                0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
            ]),
            nonce: new Uint8Array([0x07, 0x00, 0x00, 0x00, ...(new TextEncoder()).encode("@ABCDEFG"),]),

            output: new Uint8Array([
                0xd3, 0x1a, 0x8d, 0x34, 0x64, 0x8e, 0x60, 0xdb, 0x7b, 0x86, 0xaf, 0xbc, 0x53, 0xef, 0x7e, 0xc2,
                0xa4, 0xad, 0xed, 0x51, 0x29, 0x6e, 0x08, 0xfe, 0xa9, 0xe2, 0xb5, 0xa7, 0x36, 0xee, 0x62, 0xd6,
                0x3d, 0xbe, 0xa4, 0x5e, 0x8c, 0xa9, 0x67, 0x12, 0x82, 0xfa, 0xfb, 0x69, 0xda, 0x92, 0x72, 0x8b,
                0x1a, 0x71, 0xde, 0x0a, 0x9e, 0x06, 0x0b, 0x29, 0x05, 0xd6, 0xa5, 0xb6, 0x7e, 0xcd, 0x3b, 0x36,
                0x92, 0xdd, 0xbd, 0x7f, 0x2d, 0x77, 0x8b, 0x8c, 0x98, 0x03, 0xae, 0xe3, 0x28, 0x09, 0x1b, 0x58,
                0xfa, 0xb3, 0x24, 0xe4, 0xfa, 0xd6, 0x75, 0x94, 0x55, 0x85, 0x80, 0x8b, 0x48, 0x31, 0xd7, 0xbc,
                0x3f, 0xf4, 0xde, 0xf0, 0x8e, 0x4b, 0x7a, 0x9d, 0xe5, 0x76, 0xd2, 0x65, 0x86, 0xce, 0xc6, 0x4b,
                0x61, 0x16,
                0x1a, 0xe1, 0x0b, 0x59, 0x4f, 0x09, 0xe2, 0x6a, 0x7e, 0x90, 0x2e, 0xcb, 0xd0, 0x60, 0x06, 0x91,
            ])
        },
        out: true
    }
], (in_object) => {
    let testResult = AeadChaCha20Poly1305(in_object.key, in_object.nonce, in_object.plaintext, in_object.aad)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) {
            console.log(testResult[i].toString(16), in_object.output[i].toString(16))
            return false
        }
    }
    return true
}, "AEAD ChaCha20 Poly1305")

run_test([
    {
        in: {
            plaintext: (new TextEncoder()).encode("Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."),
            aad: new Uint8Array([]),
            key: new Uint32Array([
                0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x8d, 0x8e, 0x8f,
                0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0x9b, 0x9c, 0x9d, 0x9e, 0x9f,
            ]),
            nonce: (new TextEncoder()).encode("@ABCDEFGHIJKLMNOPQRSTUVX"),

            output: hexStringToUint8Array("404142434445464748494a4b4c4d4e4f505152535455565865032f227e672aaf3d102e073e4f1c386abab35ee19a50deb91a4ae3aeb7c687bf89e39fc459675deb350c69bb5b7b372bea9b0561a5046c7aeedcd2456faa4a301a137209d61da415499a44cbf6d867e019831b89bea709a3a706026c910c523f814911e77b826af350a9fd2a93097fa84ba5de3e4d0c044edc2068abf2054590dd")
        },
        out: true
    }
], (in_object) => {
    let testResult = AeadXChaCha20Poly1305(in_object.key, in_object.nonce, in_object.plaintext, in_object.aad)
    if (testResult === in_object.output) return true
    if (testResult == null || in_object.output == null) return false
    if (testResult.length !== in_object.output.length) return false

    for (let i = 0; i < testResult.length; i++) {
        if (testResult[i] !== in_object.output[i]) {
            console.log(testResult[i].toString(16), in_object.output[i].toString(16))
            return false
        }
    }
    return true
}, "AEAD XChaCha20 Poly1305")