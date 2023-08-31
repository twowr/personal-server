package auth

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gofor-little/env"
)

type authenticationState bool

const (
	Authenticated   authenticationState = true
	Unauthenticated authenticationState = false
)

var authenticatedUsers = make(map[string]time.Time)

var sessionLimit = time.Date(0, 0, 1, 0, 0, 0, 0, time.Now().Location())

func init() {
	if err := env.Load(); err != nil {
		panic(err)
	}
}

func CheckAuthentication(w http.ResponseWriter, r *http.Request) authenticationState {
	if expireDate, ok := authenticatedUsers[strings.Split(r.RemoteAddr, ":")[0]]; ok {
		if time.Now().After(expireDate) {
			delete(authenticatedUsers, strings.Split(r.RemoteAddr, ":")[0])
			http.Error(w, "Session time expired", http.StatusUnauthorized)
			return Unauthenticated
		}

		return Authenticated
	}

	http.Error(w, "Unauthoried", http.StatusUnauthorized)
	return Unauthenticated
}

func VerifyCreds(username string, passwordInput string) authenticationState {
	password, err := env.MustGet(username)
	if err != nil {
		fmt.Println(err)
		return Unauthenticated
	}

	if password != passwordInput {
		fmt.Println("wrong password")
		return Unauthenticated
	}

	return Authenticated
}

func GetCurrentAuthenticatedUsers() map[string]time.Time {
	return authenticatedUsers
}

func AddAuthenticatedUser(user string) {
	authenticatedUsers[user] = time.Now().AddDate(sessionLimit.Year(), int(sessionLimit.Month()), sessionLimit.Day())
}
