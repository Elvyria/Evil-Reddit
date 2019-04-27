package main

import (
	"github.com/labstack/echo"
)

func main() {
	e := echo.New()
	e.Static("/", "web")
	e.Logger.Fatal(e.Start(":3006"))
}
