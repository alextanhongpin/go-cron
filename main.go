package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"

	"github.com/alextanhongpin/go-cron/auth"
	"github.com/alextanhongpin/go-cron/cron"
)

var c *cron.Task
var a auth.Auth

var t *template.Template

// The job to be executed. This is where you place your logic
func job() {
	c.IsExecuting = true
	// do something
	fmt.Printf("Executing cron job at time=%v\n", time.Now())
	c.IsExecuting = false
	c.Counter++
}

func main() {
	var (
		spec = flag.String("spec", "*/10 * * * * *", "Runs every ten seconds")
		run  = flag.Bool("run", false, "Run the cron immediately when the application starts")
		port = flag.Int("port", 8080, "The server's port")
	)
	flag.Parse()

	t = template.Must(template.ParseFiles("templates/index.html"))

	a.SetupBasicAuth("john.doe", "123456")

	c = cron.New()
	c.Spec = *spec
	c.Cron.AddFunc(c.Spec, job)
	c.Start()

	if *run == true {
		// Run once
		job()
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		c.Update()
		t.Execute(w, c)
	})
	mux.HandleFunc("/crons", cronHandler)
	mux.HandleFunc("/crons/start", startHandler)
	mux.HandleFunc("/crons/stop", stopHandler)
	mux.HandleFunc("/ws", wsHandler)

	log.Printf("Listening to port *:%d. Press ctrl + c to cancel.", *port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", *port), mux))
}

func startHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not supported", http.StatusMethodNotAllowed)
		return
	}
	err := a.EncodeAuthFromRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	c.Start()
	c.Update()
	json.NewEncoder(w).Encode(c)
}
func stopHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Method not supported", http.StatusMethodNotAllowed)
		return
	}
	err := a.EncodeAuthFromRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	c.Stop()
	c.Update()
	json.NewEncoder(w).Encode(c)
}

func cronHandler(w http.ResponseWriter, r *http.Request) {
	method := r.Method
	switch method {
	case "GET":
		err := c.ParseSpec(c.Spec)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		c.Update()
		json.NewEncoder(w).Encode(c)
		break
	case "POST":
		err := a.EncodeAuthFromRequest(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		s := r.URL.Query().Get("spec")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		err = c.ParseSpec(s)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		c.Stop()
		c = nil
		c = cron.New()
		c.Spec = s
		c.Cron.AddFunc(c.Spec, job)
		c.Start()

		c.Update()
		json.NewEncoder(w).Encode(c)
		break
	}
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("Origin") != "http://"+r.Host {
		http.Error(w, "Origin not allowed", 403)
		return
	}
	conn, err := websocket.Upgrade(w, r, w.Header(), 1024, 1024)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
	}

	go echo(conn)
}

type Message struct {
	Event string `json:"event"`
}

func echo(conn *websocket.Conn) {
	for {
		m := Message{}

		err := conn.ReadJSON(&m)
		if err != nil {
			fmt.Println("Error reading json.", err)
		}

		if m.Event == "tick" {
			fmt.Printf("Got message: %#v\n", m)
			c.Update()
			if err = conn.WriteJSON(c); err != nil {
				fmt.Println(err)
			}
		}
	}
}