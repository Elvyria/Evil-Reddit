<p align="center">
  <img src="./logo.png" width="128">
  <h1 align="center">Evil-Reddit</h1>
</p>

## Overview
Self hosted reddit viewer created to replace slow and bloated [reddit.com](https://www.reddit.com) with something faster.

<img src="./preview.jpg">

## Usage

Clone repository and visit `web` directory
```
yarn install
yarn product
```

Build or start server from root directory
```
go build
```
or
```
go run main.go
```

Open browser and visit `127.0.0.1:3006/r/unixporn`, enjoy.

Edit `web/config.json` according to your environment.

Server is just an example, you can always write your own.  
Just make sure to redirect all `/r/*` requests to `web/reddit.html`

## Troubleshooting
If something doesn't work - lookup console messages in browser tools, it should help you identify the problem

  * Cross-Origin Request Blocked - Firefox ? Disable enhanced tracking protection for page (Don't disable uBlock Origin or any other adblock extension, or else iframes will eat your firstborn)

  * GIFs doesn't play - Allow browser to autoplay videos, all gifs are replaced with videos for performance and traffic reasons.
