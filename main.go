package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"strconv"

	"github.com/labstack/echo/v4"
)

func main() {
	var port uint64 = 3006
	var err error

	args := os.Args[1:]

	if len(args) != 0 {
		port, err = strconv.ParseUint(args[0], 10, 0)
		if err != nil || port < 2 {
			fmt.Println("Invalid port specified")

			os.Exit(1)
		}
	}

	address := ":" + strconv.FormatUint(port, 10)

	e := echo.New()
	e.HideBanner = true
	e.Static("/", "web")
	e.GET("/r/*", getSubreddit)

	go func() {
		e.Logger.Fatal(e.Start(address))
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	if err = e.Shutdown(context.Background()); err != nil {
		e.Logger.Fatal(err)
	}
}

func getSubreddit(c echo.Context) error {
	return c.File("web/reddit.html")
}
