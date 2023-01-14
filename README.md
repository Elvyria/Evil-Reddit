<div align="center">
  <p>
    <h1>
      <a href="https://github.com/Elvyria/Evil-Reddit">
        <img src="/logo.png" alt="Evil-Reddit" width="110"/>
      </a>
      <br/>
      Evil-Reddit
    </h1>
    <h4>Lightweight and distraction free way to browse Reddit.</h4>
  </p>
  <p>
    <a href="https://github.com/Elvyria/Evil-Reddit/actions?query=workflow:Build">
      <img alt="Build Status" src="https://img.shields.io/github/actions/workflow/status/Elvyria/Evil-Reddit/build.yml?style=for-the-badge">
    </a>
    <a href="https://evil-reddit.web.app/r/unixporn">
      <img alt="Website" src="https://img.shields.io/website?down_message=red&label=demo&style=for-the-badge&up_color=orange&up_message=outdated&url=https%3A%2F%2Fevil-reddit.web.app%2Fr%2Funixporn">
    </a>
  </p>
</div>

## Preview

![preview](/preview.jpg)

## Index

- [Features](#features)
- [Install](#install)
- [Build](#build)
- [Known-Issues](#known-issues)
- [Troubleshooting](#troubleshooting)

## Features

- Media oriented
- Low memory footprint
- MP4 videos instead of GIFs
- Easily customizable

## Install
1. [Clone](https://github.com/Elvyria/Evil-Reddit/archive/master.zip) repository or do so with git
```
git clone https://github.com/Elvyria/Evil-Reddit
```
2. Get artifact from latest [successful workflow](https://github.com/Elvyria/Evil-Reddit/actions?query=workflow:Build+is:success), unpack and move all .js files to `Evil-Reddit/web/js`
3. Get server for your platform from ![project releases](https://github.com/Elvyria/Evil-Reddit/releases/latest) and drop it into root folder.
4. Launch server from root directory
```
./server [port=3006]
```
5. [/r/unixporn](http://127.0.0.1:3006/r/unixporn), [/r/awwnime](http://127.0.0.1:3006/r/awwnime), /r/...


## Build

```
git clone https://github.com/Elvyria/Evil-Reddit
cd Evil-Reddit/web
yarn install
yarn product
cd ..
go build -ldflags="-s -w"
./Evil-Reddit [port=3006]
```

## Known-Issues

  * Some subreddits doesn't provide hints and image previews turning all image posts into links.
  * Videos (.hls streams) cannot be played in Chrome due to blocked controls.

## Troubleshooting

  * Firefox
    * Cross-Origin Request Blocked - Disable enhanced tracking protection for page
