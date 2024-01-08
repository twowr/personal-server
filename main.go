package main

import (
	"fmt"
	"log"
	"net/http"

	auth "pfh/local-packages/authentication"
	epHandler "pfh/local-packages/endpointHandler"

	"github.com/eiannone/keyboard"
	"github.com/gofor-little/env"
)

func main() {
	http.HandleFunc("/favicon.ico", handleIcon)
	http.HandleFunc("/", epHandler.MainHandler)
	http.HandleFunc(string(epHandler.Storage), epHandler.StorageHandler)
	http.HandleFunc(string(epHandler.Image), epHandler.ImageHandler)
	http.HandleFunc(string(epHandler.Audio), epHandler.AudioHandler)
	http.HandleFunc(string(epHandler.Countdown), epHandler.CountdownHandler)
	// http.HandleFunc(string(epHandler.Upload), epHandler.UploadHandler)
	http.HandleFunc(string(epHandler.Authenticate), epHandler.AuthenticateHandler)
	http.HandleFunc(string(epHandler.Script), epHandler.ScriptHandler)
	http.HandleFunc(string(epHandler.Test), epHandler.TestHandler)

	if err := env.Load(".env"); err != nil {
		log.Fatal(err)
	}

	port, err := env.MustGet("PORT")
	if err != nil {
		log.Fatal(err)
	}

	keysEvents, err := keyboard.GetKeys(10)
	if err != nil {
		panic(err)
	}
	defer func() {
		_ = keyboard.Close()
	}()

	fmt.Println("down arrow to print current users id")
	fmt.Println("up arrow to print current authenticate requests id")

	go func() {
		for {
			event := <-keysEvents
			if event.Err != nil {
				panic(event.Err)
			}
			if event.Key == keyboard.KeyEsc {
				break
			}
			if event.Key == keyboard.KeyArrowDown {
				fmt.Println(auth.GetAuthenticatedUsers())
			}
			if event.Key == keyboard.KeyArrowUp {
				fmt.Println(auth.GetAuthenticateRequests())
			}
		}
	}()

	fmt.Println("listening on port", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
		return
	}
}

func handleIcon(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "favicon.ico")
}
