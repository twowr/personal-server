package encryption_test

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"io"
	"math/big"
)

const (
	diffie_key_size int = 2048
)

func NewPublicKeyPair() (p big.Int, g big.Int) {
	p0, err := rand.Prime(rand.Reader, diffie_key_size)
	if err != nil {
		fmt.Println(err)
		return *big.NewInt(-1), *big.NewInt(-1)
	}

	g0, err := rand.Int(rand.Reader, big.NewInt(5-2))
	if err != nil {
		fmt.Println(err)
		return *big.NewInt(-1), *big.NewInt(-1)
	}
	g0 = new(big.Int).Add(g0, big.NewInt(2))

	return *p0, *g0
}

func GetExchangeMaterial(p big.Int, g big.Int) (secret big.Int, public big.Int) {
	secret0, err := rand.Int(rand.Reader, new(big.Int).Sub(&p, big.NewInt(1+1)))
	if err != nil {
		fmt.Println(err)
		return *big.NewInt(-1), *big.NewInt(-1)
	}
	secret0 = new(big.Int).Add(secret0, big.NewInt(1)) //secret0 ∈ (0, p - 1)

	return *secret0, *new(big.Int).Exp(&g, secret0, &p)
}

func SolveSecretKey(ce_public big.Int, s_secret big.Int, p big.Int) (key [32]byte) {
	return sha256.Sum256(new(big.Int).Exp(&ce_public, &s_secret, &p).Bytes())
}

func Aes256Encrypt(key [32]byte, message []byte) (Encrypted []byte, Error error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return make([]byte, 0), err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return make([]byte, 0), err
	}

	nonce := make([]byte, aesgcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return make([]byte, 0), err
	}

	result := aesgcm.Seal(nil, nonce, message, nil)
	result = append(nonce, result...)

	return result, nil
}

func Aes256Decrypt(key [32]byte, encrypted []byte) ([]byte, error) {
	block, err := aes.NewCipher(key[:])
	if err != nil {
		return make([]byte, 0), nil
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return make([]byte, 0), err
	}

	nonceSize := aesgcm.NonceSize()
	if len(encrypted) < nonceSize {
		return make([]byte, 0), fmt.Errorf("ciphertext is too short")
	}

	nonce, encrypted_message := encrypted[:nonceSize], encrypted[nonceSize:]

	message, err := aesgcm.Open(nil, nonce[:], encrypted_message, nil)
	if err != nil {
		return make([]byte, 0), err
	}

	return message, nil
}
