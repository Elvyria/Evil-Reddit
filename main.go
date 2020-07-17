package main

import (
	// "net/http"
	"github.com/labstack/echo"
)

func main() {
	e := echo.New()
	e.Static("/", "web")
	e.GET("/r/*", getSubreddit)
	e.Logger.Fatal(e.Start(":3006"))
}

func getSubreddit(c echo.Context) error {
	return c.File("web/reddit.html")
}
