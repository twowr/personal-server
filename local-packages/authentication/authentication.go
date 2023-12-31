package auth

import (
	"fmt"
	"math/big"
	"net/http"
	"strings"

	"github.com/gofor-little/env"
)

type authenticationState bool

const (
	Authenticated   authenticationState = true
	Unauthenticated authenticationState = false
)

var authenticateRequests = make(map[string]big.Int)

var authenticatedUsers = make(map[string][32]byte)

func init() {
	if err := env.Load(".env"); err != nil {
		panic(err)
	}
}

func CheckAuthentication(w http.ResponseWriter, r *http.Request) (authenticationState, [32]byte) {
	if key, ok := authenticatedUsers[strings.Split(r.RemoteAddr, ":")[0]]; ok {
		return Authenticated, key
	}

	http.Error(w, "Unauthoried", http.StatusUnauthorized)
	return Unauthenticated, *new([32]byte)
}

func VerifyCreds(username string, passwordInput string) (authenticationState, error) {
	password, err := env.MustGet(username)
	if err != nil {
		return Unauthenticated, err
	}

	if password != passwordInput {
		return Unauthenticated, fmt.Errorf("wrong password")
	}

	return Authenticated, nil
}

func GetAuthenticatedUser(user string) [32]byte {
	return authenticatedUsers[user]
}

func GetAuthenticatedUsers() map[string][32]byte {
	return authenticatedUsers
}

func AddAuthenticatedUser(user string, key [32]byte) {
	authenticatedUsers[user] = key
}

func RemoveAuthenticatedUser(user string) {
	delete(authenticatedUsers, user)
}

func GetAuthenticateRequest(user string) big.Int {
	return authenticateRequests[user]
}
func GetAuthenticateRequests() map[string]big.Int {
	return authenticateRequests
}

func AddAuthenticateRequest(user string, s_secret big.Int) {
	authenticateRequests[user] = s_secret
}

func RemoveAuthenticateRequest(user string) {
	delete(authenticateRequests, user)
}
