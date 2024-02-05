// #include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

uint32_t rotr(unsigned char n, uint32_t x) {
    return (x >> n) | (x << (32 - n));
}

uint32_t Ch(uint32_t x, uint32_t y, uint32_t z) {
    return (x & y) ^ ((~x) & z);
}

uint32_t Maj(uint32_t x, uint32_t y, uint32_t z) {
    return (x & y) ^ (x & z) ^ (y & z);
}

uint32_t SIGMA0(uint32_t x) {
    return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

uint32_t SIGMA1(uint32_t x) {
    return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

uint32_t sigma0(uint32_t x) {
    return rotr(7, x) ^ rotr(18, x) ^ (x >> 3);
}

uint32_t sigma1(uint32_t x) {
    return rotr(17, x) ^ rotr(19, x) ^ (x >> 10);
}

int sha256(char* dest, char* message, unsigned long long message_bit_len) {
    const uint32_t K[64] = {
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    };

    const unsigned long long message_byte_len = message_bit_len / 8;

    //n - 1 + (64 - ((n - 1)%64)) round to smallest multiple of 64
    //adding padding cancel out the 1
    const unsigned long long buf_len = message_byte_len + 8 + (64 - ((message_byte_len + 8) % 64));
    unsigned char* buf = malloc(buf_len);

    for (unsigned long long i = 0; i < message_byte_len; i++) {
        buf[i] = message[i];
    }

    buf[message_byte_len] = 0x80;

    for (unsigned long long i = message_byte_len + 1; i < buf_len - 8; i++) {
        buf[i] = 0;
    }

    for (char i = 0; i < 8; i++) {
        buf[buf_len - 8 + i] = ((char*)&message_bit_len)[7 - i];
    }

    uint32_t H[8] = {
        0x6a09e667,
        0xbb67ae85,
        0x3c6ef372,
        0xa54ff53a,
        0x510e527f,
        0x9b05688c,
        0x1f83d9ab,
        0x5be0cd19,
    };

    for (unsigned long long i = 0; i < buf_len; i += 64) {
        uint32_t M[16];
        for (char j = 0; j < 16; j++) {
            char buf_offset = j * 4;
            M[j] = ((uint32_t)buf[i + buf_offset] << 24) | ((uint32_t)buf[i + buf_offset + 1] << 16) | ((uint32_t)buf[i + buf_offset + 2] << 8) | (uint32_t)buf[i + buf_offset + 3];
        }

        uint32_t W[64];
        for (char t = 0; t < 16; t++) {
            W[t] = M[t];
        }

        for (char t = 16; t < 64; t++) {
            W[t] = sigma1(W[t - 2]) + W[t - 7] + sigma0(W[t - 15]) + W[t- 16];
        }

        uint32_t a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (char t = 0; t < 64; t++) {
            const uint32_t T1 = h + SIGMA1(e) + Ch(e, f, g) + K[t] + W[t];
            const uint32_t T2 = SIGMA0(a) + Maj(a, b, c);
            h = g;
            g = f;
            f = e;
            e = d + T1;
            d = c;
            c = b;
            b = a;
            a = T1 + T2;
        }

        H[0] = a + H[0];
        H[1] = b + H[1];
        H[2] = c + H[2];
        H[3] = d + H[3];
        H[4] = e + H[4];
        H[5] = f + H[5];
        H[6] = g + H[6];
        H[7] = h + H[7];
    }

    char* buf2[8] = {
        (char*)(&H[0]),
        (char*)(&H[1]),
        (char*)(&H[2]),
        (char*)(&H[3]),
        (char*)(&H[4]),
        (char*)(&H[5]),
        (char*)(&H[6]),
        (char*)(&H[7]),
    };

    for (char i = 0; i < 32; i++) {
        dest[i] = (buf2[i / 4])[3 - (i % 4)];
    }

    free(buf);
    return 0;
}

// int main() {
//     unsigned long long num = 0xefffffffffffffff;
//     unsigned char* a = (unsigned char*)&num;
//     printf("balls: %u, %u\n", a[0], a[7]);

//     char* msg = "1";
//     char buf[32];
//     char* out = buf;

//     sha256(out, msg, 1*8);

//     for (char i = 0; i < 32; i++) {
//         printf("%02x", (unsigned char)out[i]);
//     }

//     printf("\n");
//     return 0;
// }