package main

import (
	"github.com/labstack/echo/v4"
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
