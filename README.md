# qrtoy

Apps stored in QR codes, *almost* completely offline.

`index.html` loads a data URL stored in the URL fragment into an iframe. `s.js`, a service worker, allows this to work offline after the first visit. 

## Why almost offline?

QR codes can store a lot of data, but making it easily runnable limits us to URLs. The obvious solution would be storing a website inside a data URL like `data:text/html,<div>hello world</div>`, but due to security issues, [all modern browsers have blocked top-level navigation to data URLs](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data#security_issues).

There are alternatives to URLs. URIs starting with `tel:`, `mailto:`, `spotify:` etc. open in their respective apps, but nothing is as programmable and as ubiquitous as a web browser. 

Without data URLs or an existing installed app, we're left with regular URLs that require internet to load. However, we can use service workers to cache the website and serve all subsequent visits completely offline until the cache expires. This happens after 7 days without use in Safari; otherwise only when the cache is full or manually cleared.

## URL format

The fragment or hash of a URL is everything that comes after `#`. Normally it scrolls to a specific part of a page, but nothing happens if there is no match. It's never sent to the server which makes it nice for storing arbitrary data.

Here we just set the data URL as the fragment.

`data:text/html,<div>hello world</div>` -> [`https://zhengkyl.github.io/qrtoy#data:text/html,<div>hello world</div>`](https://zhengkyl.github.io/qrtoy#data:text/html,%3Cdiv%3Ehello%20world%3C/div%3E")

On page load, the fragment is set as an iframe's src.

## Design decisions

Since the URL depends on the website to be run, it doesn't have to be self-contained like a data URL. An argument could be made for using a basic demo framework e.g. [js1024](https://js1024.fun/), [p5.js](https://p5js.org/), [shadertoy](https://www.shadertoy.com/), [dwitter](https://www.dwitter.net), etc and only storing compressed code in the URL.

Ultimately, I chose to stick to data URLs instead of a custom format to keep apps easily reusable/shareable without relying on this website.

## Related projects

https://github.com/Kuberwastaken/backdooms
  - Doom as data URL inside QR code

https://mattkc.com/etc/snakeqr
  - Snake windows executable inside QR code

https://github.com/thisaislan/qrgame
  - Custom game format inside QR code loadable with app 
