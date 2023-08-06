package main

import (
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/gabriel-vasile/mimetype"
)

type webPath string

type serverPath string

const (
	Storage   webPath = "/storage/"
	Image     webPath = "/image/"
	Audio     webPath = "/audio/"
	Countdown webPath = "/countdown/"
)

var (
	ImageExtension []string = []string{".png", ".jpg"}
	AudioExtension []string = []string{".mp3", ".wav"}
)

func (path webPath) sanitizeDot() webPath {
	resultPath := fmt.Sprintf(".%v", path)
	base := filepath.Base(resultPath)
	offset := func() int {
		if resultPath[len(resultPath)-1:] == "/" {
			return 1
		}
		return 0
	}()
	resultPath = resultPath[:len(resultPath)-len(base)-offset]
	resultPath = strings.ReplaceAll(resultPath, ".", "") + base
	return webPath(resultPath)
}

func (path webPath) toServerPath() serverPath {
	return serverPath("." + path)
}

func main() {
	http.HandleFunc("/", mainRequestHandler)
	http.HandleFunc("/favicon.ico", handleIcon)
	http.HandleFunc(string(Storage), storageRequestHandler)
	http.HandleFunc(string(Image), imageHandler)
	http.HandleFunc(string(Audio), audioHandler)
	http.HandleFunc(string(Countdown), countdownHandler)

	fmt.Println("listening on port 61102")
	if err := http.ListenAndServe(":61102", nil); err != nil {
		log.Fatal(err)
		return
	}
}

func mainRequestHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	switch r.Method {
	case http.MethodGet:
		http.ServeFile(w, r, "home.txt")
	default:
		fmt.Fprintf(w, "no")
	}
}

func storageRequestHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	switch r.Method {
	case http.MethodGet:
		requestedPath := webPath(r.URL.Path)
		requestedPath = requestedPath.sanitizeDot()

		dir, err := os.Stat(string(requestedPath.toServerPath()))
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

			type File struct {
				IsDir   string
				Name    string
				Path    string
				LastMod string
			}

			data := struct {
				Title string
				Files []File
			}{
				Title: dir.Name(),
				Files: []File{},
			}

			files, err := os.ReadDir(string(requestedPath.toServerPath()))
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
					Path:    string(requestedPath)[1:] + "/" + file.Name(),
					LastMod: lastMod,
				})
			}

			tmpl.Execute(w, data)
		case false:
			contentType, err := mimetype.DetectFile(string(requestedPath.toServerPath()))
			if err != nil {
				fmt.Println(err)
			}

			w.Header().Set("Content-Type", contentType.String())
			w.Header().Set("Content-Disposition", "inline")
			http.ServeFile(w, r, string(requestedPath.toServerPath()))
		}
	default:
		fmt.Fprintf(w, "no")
	}
}

func imageHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	requestedPath := webPath(string(Storage))
	if r.URL.Path != string(Image) {
		requestedPath = webPath("/" + strings.Replace(r.URL.Path, string(Image), "", 1)).sanitizeDot()
	}

	tmpl, err := template.ParseFiles("image.html")
	if err != nil {
		fmt.Println(err)
		fmt.Fprint(w, err.Error())
		return
	}

	type Img struct {
		ImageAddress string
		Name         string
	}

	data := struct {
		CurrentPath string
		Images      []Img
	}{
		CurrentPath: string(requestedPath),
		Images:      []Img{},
	}

	walkErr := filepath.Walk(string(requestedPath.toServerPath()),
		func(path string, _info fs.FileInfo, _err error) error {
			if len(strings.Split(path, ".")) != 2 {
				return nil
			}
			storagePath, err := filepath.Abs("./storage")
			if err != nil {
				return err
			}

			address := webPath(strings.Replace(path, storagePath, "", 1))
			address = webPath(strings.ReplaceAll(string(address), "\\", "/"))

			extFilter := ImageExtension
			match := false
			for _, ext := range extFilter {
				if filepath.Ext(string(address)) == ext {
					match = true
					break
				}
			}

			if !match {
				return nil
			}

			data.Images = append(data.Images, Img{
				ImageAddress: strings.Repeat("../", strings.Count(filepath.Clean(r.URL.Path), "\\")) + string(address), //r.Host + "/" + string(address) doesn't work for some reason
				Name:         filepath.Base(string(address)),
			})

			return nil
		})

	if walkErr != nil {
		fmt.Println(walkErr)
		fmt.Fprint(w, walkErr.Error())
		return
	}

	tmpl.Execute(w, data)
}

func audioHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	requestedPath := webPath(string(Storage))
	if r.URL.Path != string(Audio) {
		requestedPath = webPath("/" + strings.Replace(r.URL.Path, string(Audio), "", 1)).sanitizeDot()
	}

	tmpl, err := template.ParseFiles("audio.html")
	if err != nil {
		fmt.Println(err)
		fmt.Fprint(w, err.Error())
		return
	}

	type Audio struct {
		AudioAddress string
		Name         string
	}

	data := struct {
		CurrentPath string
		Audios      []Audio
	}{
		CurrentPath: string(requestedPath),
		Audios:      []Audio{},
	}

	walkErr := filepath.Walk(string(requestedPath.toServerPath()),
		func(path string, _info fs.FileInfo, _err error) error {
			if len(strings.Split(path, ".")) != 2 {
				return nil
			}
			storagePath, err := filepath.Abs("./storage")
			if err != nil {
				return err
			}

			address := webPath(strings.Replace(path, storagePath, "", 1))
			address = webPath(strings.ReplaceAll(string(address), "\\", "/"))

			extFilter := AudioExtension
			match := false
			for _, ext := range extFilter {
				if filepath.Ext(string(address)) == ext {
					match = true
					break
				}
			}

			if !match {
				return nil
			}

			data.Audios = append(data.Audios, Audio{
				AudioAddress: strings.Repeat("../", strings.Count(filepath.Clean(r.URL.Path), "\\")) + string(address), //r.Host + "/" + string(address) doesn't work for some reason
				Name:         filepath.Base(string(address)),
			})

			return nil
		})

	if walkErr != nil {
		fmt.Println(walkErr)
		fmt.Fprint(w, walkErr.Error())
		return
	}

	tmpl.Execute(w, data)
}

func countdownHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	http.ServeFile(w, r, "countdown.html")
}

func rawWriteDirContent(w http.ResponseWriter, r *http.Request, requestedPath webPath) {
	files, err := os.ReadDir(string(requestedPath.toServerPath()))
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
				return string(requestedPath)[1:] + "/" + file.Name()
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
