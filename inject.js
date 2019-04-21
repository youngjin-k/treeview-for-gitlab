// function injectScript(filePath) {
//     const script = document.createElement('script');
//     script.setAttribute('type', 'text/javascript');
//     script.setAttribute('src', filePath);
//     $('head').append(script);
// }
//
// injectScript(chrome.extension.getURL('content.js'));

const s = document.createElement('script');
s.src = chrome.runtime.getURL('content.js');
s.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);
