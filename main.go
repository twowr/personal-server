package main

import (
	"fmt"
	"log"
	"net/http"

	epHandler "pfh/local-packages/endpointHandler"

	"github.com/gofor-little/env"
)

func main() {
	http.HandleFunc("/favicon.ico", handleIcon)
	http.HandleFunc("/", epHandler.MainHandler)
	http.HandleFunc(string(epHandler.Storage), epHandler.StorageHandler)
	http.HandleFunc(string(epHandler.Image), epHandler.ImageHandler)
	http.HandleFunc(string(epHandler.Audio), epHandler.AudioHandler)
	http.HandleFunc(string(epHandler.Countdown), epHandler.CountdownHandler)
	http.HandleFunc(string(epHandler.Upload), epHandler.UploadHandler)
	http.HandleFunc(string(epHandler.Authenticate), epHandler.AuthenticateHandler)

	if err := env.Load(".env"); err != nil {
		log.Fatal(err)
	}

	port, err := env.MustGet("PORT")
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("listening on port", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
		return
	}
}

func handleIcon(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "favicon.ico")
}
