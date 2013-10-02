chrome.browserAction.setBadgeBackgroundColor({
    "color": [49, 49, 49, 255]
})

chrome.browserAction.onClicked.addListener(function (tab) {
    check()
    window.open('http://retin.us')
});

chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.check) {
        check()
    }
});

function setCount(cnt) {
    chrome.browserAction.setBadgeText({
        text: cnt + ''
    })
}

function check() {
    $.getJSON('http://retin.us/subscription/unreadCount', function (data) {
        data && (data.count === 0 ? setCount('') : setCount(data.count))
    })
}

check()
setInterval(check, 1000 * 60 * 30); //check every half hour
