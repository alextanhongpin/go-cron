package auth

import (
	"errors"
)

var errUnauthorizedUser = errors.New("The password or username provided is incorrect")

// Auth defines the schema for authentication
type Auth struct {
	username string
	password string
	enabled  bool
}

// Authorize validates if the email and password is valid
func (a Auth) Authorize(username, password string) error {
	if !a.enabled {
		return nil
	}
	if a.username != username || a.password != password {
		return errUnauthorizedUser
	}
	return nil
}

func New(username, password string) *Auth {
	if username == "" {
		username = "admin"
	}
	if password == "" {
		password = "123456"
	}
	return &Auth{
		username: username,
		password: password,
		enabled:  true,
	}
}
