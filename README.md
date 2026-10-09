# qrtoy

Apps storable in QR codes, _almost_ completely offline.

Add a data URL after [`https://qrtoy.github.io#`](https://qrtoy.github.io#) like so [`https://qrtoy.github.io#data:text/html,<div>hello world</div>`](https://qrtoy.github.io#data:text/html,%3Cdiv%3Ehello%20world%3C/div%3E")

On page load, that fragment (everything after `#`) is loaded into an iframe. URL fragments normally scroll to a specific part of a page, but we use it to store the entire app. Most importantly, [fragments are never sent to the server](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment) so your app is private.

After you visit any `qrtoy.github.io` URL, you should be able to visit any other `qrtoy.github.io` URL without internet.

## Why almost offline?

QR codes can store a lot of data, but making it easily runnable limits us to URLs. The obvious solution would be storing a website inside a data URL like `data:text/html,<div>hello world</div>`, but due to security issues, [all modern browsers have blocked top-level navigation to data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data#security_issues).

There are alternatives to URLs. URIs starting with `tel:`, `mailto:`, `spotify:` etc. open in their respective apps, but none of these are as programmable or as ubiquitous as a web browser.

Without data URLs or a preinstalled app, we're left with regular URLs that require internet to load. However, we can use service workers to cache the website and serve all subsequent visits completely offline. This works until the browser cache runs out of space, is manually cleared, or after 7 days without use in Safari.

`index.html` is the minimal ~600 bytes needed to bootstrap an app from a data URL. After the first load, `s.js` caches `index.html` for offline use in ~200 bytes. It doesn't need to be that small; I just thought it was fun.

## Why a data URL?

Since the app already depends on the qrtoy website to run, it doesn't technically have to be self-contained like a data URL. An argument could be made for using a basic demo framework e.g. [js1024](https://js1024.fun/), [p5.js](https://p5js.org/), [shadertoy](https://www.shadertoy.com/), [dwitter](https://www.dwitter.net), etc and only storing compressed code or arguments in the URL.

Ultimately, I think creating a custom format/encoder/decoder makes this a different project, and I like that data URLs are usable without this website.

## Related projects

https://github.com/arfct/itty-bitty

- Sites stored (compressed) inside URL fragments

https://github.com/Kuberwastaken/backdooms

- Doom as data URL inside QR code

https://mattkc.com/etc/snakeqr

- Snake windows executable inside QR code

https://github.com/thisaislan/qrgame

- Custom game format inside QR code loadable with app
