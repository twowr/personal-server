package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/gabriel-vasile/mimetype"
)

func mainRequestHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	switch r.Method {
	case http.MethodGet:
		fmt.Fprint(w, "|  go to path /storage to see available content\n")
		fmt.Fprint(w, "|             ^^^^^^^^                         \n")
		fmt.Fprint(w, "|____> IPADDRESS:61102/storage\n\n")
		fmt.Fprint(w, "every endpoint you request after /storage\n")
		fmt.Fprint(w, "will request an entry from the server filesystem\n")
		fmt.Fprint(w, "e.g.\n")
		fmt.Fprint(w, "                          |‾‾‾> the public folder\n")
		fmt.Fprint(w, "IPADDRESS:61102/storage/public\n")
		fmt.Fprint(w, "                   |___> the storage folder\n\n")
		fmt.Fprint(w, "the above address will display the content of the public folder\n")
		fmt.Fprint(w, "if a request is not a folder\n\n")
		fmt.Fprint(w, "IPADDRESS:61102/storage/public/publicText.txt\n")
		fmt.Fprint(w, "                                     |___> file name can contain spaces\n")
		fmt.Fprint(w, "the file content will be displayed if possible\n")
		fmt.Fprint(w, "NOTE: only request to the /storage path will be treated this way\n")
		fmt.Fprint(w, "      more storage path might be added in the future but most\n")
		fmt.Fprint(w, "      base path will be reserved for features, not storage")
	default:
		fmt.Fprintf(w, "no")
	}
}

type File struct {
	IsDir   string
	Name    string
	Path    string
	LastMod string
}

type PageData struct {
	Title string
	Files []File
}

func storageRequestHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	switch r.Method {
	case http.MethodGet:
		requestedPath := fmt.Sprintf(".%v", r.URL.Path)
		base := filepath.Base(requestedPath)
		offset := func() int {
			if requestedPath[len(requestedPath)-1:] == "/" {
				return 1
			}
			return 0
		}()
		requestedPath = requestedPath[:len(requestedPath)-len(base)-offset]
		requestedPath = "." + strings.ReplaceAll(requestedPath, ".", "") + base

		dir, err := os.Stat(requestedPath)
		if err != nil {
			fmt.Println(err)
			fmt.Fprint(w, err.Error())
			return
		}

		switch dir.IsDir() {
		case true:
			tmpl, err := template.ParseFiles("folder.html")
			if err != nil {
				rawWriteDirContent(w, r, requestedPath)
			}

			data := PageData{
				Title: dir.Name(),
				Files: []File{},
			}

			files, err := os.ReadDir(requestedPath)
			if err != nil {
				fmt.Println(err)
				fmt.Fprint(w, err.Error())
				return
			}

			for _, file := range files {
				fileInfo, err := file.Info()
				var lastMod = fmt.Sprintf("%d/%d/%d %d:%d", fileInfo.ModTime().Year(), fileInfo.ModTime().Month(), fileInfo.ModTime().Day(), fileInfo.ModTime().Hour(), fileInfo.ModTime().Minute())
				if err != nil {
					fmt.Println(err)
					lastMod = err.Error()
				}
				data.Files = append(data.Files, File{
					IsDir: func() string {
						if file.IsDir() {
							return "FOLDER"
						} else {
							return "FILE"
						}
					}(),
					Name:    file.Name(),
					Path:    requestedPath[1:] + "/" + file.Name(),
					LastMod: lastMod,
				})
			}

			tmpl.Execute(w, data)
		case false:
			contentType, err := mimetype.DetectFile(requestedPath)
			if err != nil {
				fmt.Println(err)
			}

			w.Header().Set("Content-Type", contentType.String())
			w.Header().Set("Content-Disposition", "inline")
			http.ServeFile(w, r, requestedPath)
		}
	default:
		fmt.Fprintf(w, "no")
	}
}

func imageHandler(w http.ResponseWriter, r *http.Request) {

}

func rawWriteDirContent(w http.ResponseWriter, r *http.Request, requestedPath string) {
	files, err := os.ReadDir(requestedPath)
	if err != nil {
		fmt.Println(err)
		fmt.Fprint(w, err.Error())
		return
	}

	for _, file := range files {
		fmt.Fprintf(w, "\n%v %v\nPath: %v\nLast modification: %v\n\n",
			func() string {
				if file.IsDir() {
					return "FOLDER"
				} else {
					return "FILE"
				}
			}(),
			file.Name(),
			func() string {
				return requestedPath[1:] + "/" + file.Name()
			}(),
			func() string {
				fileInfo, err := file.Info()
				if err != nil {
					fmt.Println(err)
					fmt.Fprint(w, err.Error())
					return err.Error()
				}

				return fmt.Sprintf("%d/%d/%d %d:%d", fileInfo.ModTime().Year(), fileInfo.ModTime().Month(), fileInfo.ModTime().Day(), fileInfo.ModTime().Hour(), fileInfo.ModTime().Minute())
			}(),
		)
	}
}

func handleIcon(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "favicon.ico")
}

func main() {
	http.HandleFunc("/", mainRequestHandler)
	http.HandleFunc("/favicon.ico", handleIcon)
	http.HandleFunc("/storage/", storageRequestHandler)
	http.HandleFunc("/image/", imageHandler)

	fmt.Println("listening on port 61102")
	if err := http.ListenAndServe(":61102", nil); err != nil {
		log.Fatal(err)
		return
	}
}
