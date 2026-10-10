# qrtoy

tiny apps inside QR codes, _almost_ completely offline.

Add a data URL after [`https://qrtoy.github.io#`](https://qrtoy.github.io#) like so [`https://qrtoy.github.io#data:text/html,<div>hello world</div>`](https://qrtoy.github.io#data:text/html,%3Cdiv%3Ehello%20world%3C/div%3E")

On page load, that fragment (everything after `#`) is loaded into an iframe. URL fragments normally scroll to a specific part of a page, but since they're [never sent to the server](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment), it's a convenient place to store state; in our case, entire apps.

After you visit a `qrtoy.github.io` app URL, you can load any other `qrtoy.github.io` app URL without internet, because the app "bootloader" (`public/index.html`) is permanently cached by a service worker (`public/s.js`).

## Questions

### Why almost offline?

QR codes can store a lot of data, but making it easily runnable limits us to URLs. The obvious solution would be storing a website inside a data URL like `data:text/html,<div>hello world</div>`, but due to security issues, [all modern browsers have blocked top-level navigation to data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data#security_issues).

There are alternatives to URLs. URIs starting with `tel:`, `mailto:`, `spotify:` etc. open in their respective apps, but none of these are as programmable and ubiquitous as a web browser.

Without data URLs or a preinstalled app, we're left with regular URLs that require internet to load. However, service workers let us cache the website and serve all subsequent visits completely offline. This works until the browser cache runs out of space, is manually cleared, or after 7 days without use in Safari.

### Why a data URL?

Since the app already depends on the qrtoy website to run, it doesn't technically have to be self-contained like a data URL. An argument could be made for using a basic demo framework e.g. [js1024](https://js1024.fun/), [p5.js](https://p5js.org/), [shadertoy](https://www.shadertoy.com/), [dwitter](https://www.dwitter.net), etc and only storing custom code or configuration in the URL.

Ultimately, this project is about storing an entire app in the url, and I like that data URLs are usable by themselves.

### What about Alphanumeric mode or compression?

QR codes have an efficient encoding mode for alphanumeric content, but it cannot encode `#` or even `?`. Using multiple encoding modes is possible, but support in QR code generator is uncommon. If you need this functionality, check out my [`furious-qr`](https://github.com/zhengkyl/furious-qr) library, in use at  [qrframe.kylezhe.ng](https://qrframe.kylezhe.ng), and choose the mixed multi-segment encoder.

The first version (e0993d2) of this project did use a compressed binary format stored in an Alphanumeric segment, but I think a plaintext format is more interesting.

## Similar projects

- [itty-bitty](https://github.com/arfct/itty-bitty) - Sites stored (compressed) inside URL fragments
- [backdooms](https://github.com/Kuberwastaken/backdooms) - Doom as a data URL inside a QR code
- [snakeqr](https://mattkc.com/etc/snakeqr) - Snake Windows executable inside a QR code
- [qrgame](https://github.com/thisaislan/qrgame) - Custom game format inside QR codes loadable with app
