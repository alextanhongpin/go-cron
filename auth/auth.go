package auth

import (
	"encoding/json"
	"errors"
	"net/http"
)

var errUnauthorizedUser = errors.New("The password or username provided is incorrect")

// Auth defines the schema for authentication
type Auth struct {
	Username  string `json:"username"`
	Password  string `json:"password"`
	_username string
	_password string
	_enabled  bool
}

// Authorize validates if the email and password is valid
func (a Auth) Authorize() error {
	if !a._enabled {
		return nil
	}
	if a.Username != a._username || a.Password != a._password {
		return errUnauthorizedUser
	}
	return nil
}

func (a *Auth) SetupBasicAuth(username, password string) {
	a._username = username
	a._password = password
	a._enabled = true
}

func (a *Auth) EncodeAuthFromRequest(r *http.Request) error {
	if !a._enabled {
		return nil
	}
	json.NewDecoder(r.Body).Decode(&a)
	return a.Authorize()
}
