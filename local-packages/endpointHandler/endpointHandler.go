package epHandler

import (
	"encoding/hex"
	"fmt"
	"io/fs"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	auth "pfh/local-packages/authentication"
	encryption "pfh/local-packages/encryption"

	"github.com/gabriel-vasile/mimetype"
	"github.com/inhies/go-bytesize"
)

type webPath string

type serverPath string

const (
	Storage   webPath = "/storage/"
	Image     webPath = "/image/"
	Audio     webPath = "/audio/"
	File      webPath = "/file/"
	Countdown webPath = "/countdown/"
	// Upload       webPath = "/upload/"
	Authenticate webPath = "/authenticate/"
	Script       webPath = "/script/"
	Test         webPath = "/test/"
)

var storageMountPoint = [...]string{"storage"}

var (
	ImageExtension []string = []string{".png", ".jpg"}
	AudioExtension []string = []string{".mp3", ".wav"}
)

func (path webPath) sanitize() webPath {
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
	if len(resultPath) <= 0 || resultPath[0] != '/' {
		resultPath = "/" + resultPath
	}
	return webPath(resultPath)
}

func (path webPath) toServerPath() serverPath {
	tokens := strings.Split(string(path), "/")

	if len(tokens) < 2 {
		return "./err.err"
	}

	service := tokens[1]

	switch service {
	case "storage":
		return serverPath("." + path)
	case "file":
		return serverPath("./" + strings.Join(tokens[2:], "/"))
	case "script":
		return serverPath("." + path)
	default:
		return "./err.err"
	}
}

func ScriptHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)

	switch r.Method {
	case http.MethodGet:
		requestedPath := webPath(r.URL.Path)
		requestedPath = requestedPath.sanitize()

		w.Header().Set("Content-Type", "application/javascript")
		w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")

		fileData, err := os.ReadFile(string(requestedPath.toServerPath()))
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		_, err = w.Write(fileData)
		if err != nil {
			fmt.Println("wtf file serve failed bruh")
			return
		}
	default:
		fmt.Fprintf(w, "no")
	}
}

func StorageHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)

	switch r.Method {
	case http.MethodGet:
		requestedPath := webPath(r.URL.Path)
		requestedPath = requestedPath.sanitize()
		fmt.Println(requestedPath)

		dir, err := os.Stat(string(requestedPath.toServerPath()))
		if err != nil {
			fmt.Println(err)
			fmt.Fprint(w, err.Error())
			return
		}

		switch dir.IsDir() {
		case true:
			files, err := os.ReadDir(string(requestedPath.toServerPath()))
			if err != nil {
				fmt.Println(err)
				fmt.Fprint(w, err.Error())
				return
			}

			type File struct {
				IsDir   string
				Name    string
				Path    string
				LastMod string
				Size    string
			}

			data := struct {
				Title  string
				Files  []File
				Length int
				Size   string
			}{
				Title:  dir.Name(),
				Files:  []File{},
				Length: 0,
				Size:   "0.0kb",
			}

			for _, file := range files {
				if file.Name()[0] == 46 {
					continue
				}
				fileInfo, err := file.Info()
				lastMod := fmt.Sprintf("%d/%d/%d %d:%d", fileInfo.ModTime().Year(), fileInfo.ModTime().Month(), fileInfo.ModTime().Day(), fileInfo.ModTime().Hour(), fileInfo.ModTime().Minute())
				if err != nil {
					fmt.Println(err)
					lastMod = err.Error()
				}

				var sizeText string
				size, err := bytesize.Parse(fmt.Sprint(fileInfo.Size()) + "B")
				if err != nil {
					fmt.Println(err)
					sizeText = err.Error()
				} else {
					bytesize.LongUnits = false
					bytesize.Format = "%.0f "

					sizeText = size.String()
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
					Path:    string(requestedPath) + "/" + file.Name(),
					LastMod: lastMod,
					Size:    sizeText,
				})
				data.Length = len(data.Files)
			}

			tmpl, err := template.ParseFiles("folder.html")
			if err != nil {
				rawWriteDirContent(w, requestedPath)
				return
			}

			tmpl.Execute(w, data)
		case false:
			data := struct {
				Path string
			}{
				Path: r.Host + "/file" + string(requestedPath),
			}

			tmpl, err := template.ParseFiles("file.html")
			if err != nil {
				fmt.Println(err)
				fmt.Fprint(w, err.Error())
				return
			}

			tmpl.Execute(w, data)
		}
	default:
		fmt.Fprintf(w, "no")
	}
}

func rawWriteDirContent(w http.ResponseWriter, requestedPath webPath) {
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
			string(requestedPath)[1:]+"/"+file.Name(),
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

func FileHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)

	switch r.Method {
	case http.MethodGet:
		requestedPath := webPath(r.URL.Path)
		requestedPath = requestedPath.sanitize()

		dir, err := os.Stat(string(requestedPath.toServerPath()))
		if err != nil {
			fmt.Println(err)
			fmt.Fprint(w, err.Error())
			return
		}

		switch dir.IsDir() {
		case true:
			files, err := os.ReadDir(string(requestedPath.toServerPath()))
			if err != nil {
				fmt.Println(err)
				fmt.Fprint(w, err.Error())
				return
			}

			type File struct {
				IsDir   string
				Name    string
				Path    string
				LastMod string
				Size    string
			}

			data := struct {
				Title  string
				Files  []File
				Length int
				Size   string
			}{
				Title:  dir.Name(),
				Files:  []File{},
				Length: 0,
				Size:   "0.0kb",
			}

			for _, file := range files {
				if file.Name()[0] == 46 {
					continue
				}
				fileInfo, err := file.Info()
				lastMod := fmt.Sprintf("%d/%d/%d %d:%d", fileInfo.ModTime().Year(), fileInfo.ModTime().Month(), fileInfo.ModTime().Day(), fileInfo.ModTime().Hour(), fileInfo.ModTime().Minute())
				if err != nil {
					fmt.Println(err)
					lastMod = err.Error()
				}

				var sizeText string
				size, err := bytesize.Parse(fmt.Sprint(fileInfo.Size()) + "B")
				if err != nil {
					fmt.Println(err)
					sizeText = err.Error()
				} else {
					bytesize.LongUnits = false
					bytesize.Format = "%.0f "

					sizeText = size.String()
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
					Size:    sizeText,
				})
				data.Length = len(data.Files)
			}

			tmpl, err := template.ParseFiles("folder.html")
			if err != nil {
				rawWriteDirContent(w, requestedPath)
				return
			}

			tmpl.Execute(w, data)
		case false:
			var key [32]byte
			if state, secret_key := auth.CheckAuthentication(w, r); state != auth.Authenticated {
				return
			} else {
				key = secret_key
			}

			fileData, err := os.ReadFile(string(requestedPath.toServerPath()))
			if err != nil {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}

			encrypted, err := encryption.Encrypt(key, fileData)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			contentType, err := mimetype.DetectFile(string(requestedPath.toServerPath()))
			if err != nil {
				fmt.Println(err)
			}

			w.Header().Set("Content-Type", contentType.String())

			_, err = w.Write(encrypted)
			if err != nil {
				fmt.Println("wtf file serve failed bruh")
				return
			}
		}
	default:
		fmt.Fprintf(w, "no")
	}
}

func AuthenticateHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)

	userAddress := strings.Split(r.RemoteAddr, ":")[0]

	tmpl, err := template.ParseFiles("authenticate.html")
	if err != nil {
		fmt.Println(err)
		fmt.Fprint(w, err.Error())
		return
	}

	type exchangeStruct struct {
		ResultMessage string
		P             string
		G             string
		ServerPublic  string
		Exchange      bool
	}

	startExchange := func(message string) {
		fmt.Println("exchange started")
		p, g := encryption.NewPublicKeyPair()
		serverSecret, serverPublic := encryption.GetExchangeMaterial(p, g)

		auth.AddAuthenticateRequest(userAddress, serverSecret)

		data := exchangeStruct{
			ResultMessage: message,
			P:             p.Text(10) + "n", //+ "n" because it's the BigInt format in javascript
			G:             g.Text(10) + "n",
			ServerPublic:  serverPublic.Text(10) + "n",
			Exchange:      true,
		}

		tmpl.Execute(w, data)
	}

	switch r.Method {
	case http.MethodGet:
		startExchange("")
	case http.MethodPost:
		if r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			http.Error(w, "Error processing submitted data", http.StatusBadRequest)
			//manual request removal here instead of defer to preserve the request on initalizing condition
			auth.RemoveAuthenticateRequest(userAddress)
			return
		}

		r.ParseForm()

		//initate new authenticate request
		if r.FormValue("username") == "-1" && r.FormValue("password") == "-1" {
			startExchange("New authenticate request generated")
			return
		}

		//can use defer now
		defer auth.RemoveAuthenticateRequest(userAddress)

		p, success := new(big.Int).SetString(strings.Replace(r.FormValue("p"), "n", "", -1), 10)
		if !success {
			http.Error(w, "Error processing submitted data", http.StatusBadRequest)
			return
		}

		clientPublic, success := new(big.Int).SetString(r.FormValue("c_pub"), 10)
		if !success {
			fmt.Println(r.FormValue("c_pub"))
			http.Error(w, "Error processing submitted data", http.StatusBadRequest)
			return
		}

		serverSecret := auth.GetAuthenticateRequest(userAddress)

		secret_key := encryption.SolveSecretKey(*clientPublic, serverSecret, *p)

		hexDecodeUsername, err := hex.DecodeString(r.FormValue("username"))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		hexDecodePassword, err := hex.DecodeString(r.FormValue("password"))
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		username, err := encryption.Decrypt(secret_key, hexDecodeUsername)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		password, err := encryption.Decrypt(secret_key, hexDecodePassword)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		fmt.Println("exchange end reached")

		var responseMessage string
		authState, err := auth.VerifyCreds(string(username), string(password))

		if err != nil {
			fmt.Println(err)
			responseMessage = "Authentication failed, press login again before submiting another login request"
		}

		if authState == auth.Authenticated {
			auth.AddAuthenticatedUser(userAddress, secret_key)
			responseMessage = "Authenticate Successfully"
		}

		data := exchangeStruct{
			ResultMessage: responseMessage,
			P:             "-1n",
			G:             "-1n",
			ServerPublic:  "-1n",
			Exchange:      false,
		}

		tmpl.Execute(w, data)
	}
}

func MainHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	switch r.Method {
	case http.MethodGet:
		http.ServeFile(w, r, "home.txt")
	default:
		fmt.Fprintf(w, "no")
	}
}

func ImageHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)

	requestedPath := webPath(string(Storage))
	if r.URL.Path != string(Image) {
		requestedPath = webPath("/" + strings.Replace(r.URL.Path, string(Image), "", 1)).sanitize()
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
				ImageAddress: string(address), //r.Host + "/" + string(address) doesn't work for some reason
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

func AudioHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)

	requestedPath := webPath(string(Storage))
	if r.URL.Path != string(Audio) {
		requestedPath = webPath("/" + strings.Replace(r.URL.Path, string(Audio), "", 1)).sanitize()
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

	err = filepath.Walk(string(requestedPath.toServerPath()),
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

	if err != nil {
		fmt.Println(err)
		fmt.Fprint(w, err.Error())
		return
	}

	tmpl.Execute(w, data)
}

// func UploadHandler(w http.ResponseWriter, r *http.Request) {
// 	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
// 	if auth.CheckAuthentication(w, r) != auth.Authenticated {
// 		return
// 	}

// 	tmpl, err := template.ParseFiles("upload.html")
// 	if err != nil {
// 		fmt.Println(err)
// 		fmt.Fprint(w, err.Error())
// 		return
// 	}

// 	data := struct {
// 		MountPoints []string
// 	}{
// 		MountPoints: storageMountPoint[:],
// 	}

// 	tmpl.Execute(w, data)
// }

func CountdownHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println(r.RemoteAddr, "on", r.URL.Path)
	http.ServeFile(w, r, "countdown.html")
}

func TestHandler(w http.ResponseWriter, r *http.Request) {
	file, err := os.ReadFile("home.txt")
	if err != nil {
		fmt.Fprint(w, err)
	}

	w.Header().Set("Accept-Ranges", "bytes")
	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("THGR-encryption", "false")

	w.Write(file)
}
