$(window).bind('beforeunload', function(){
    chrome.runtime.sendMessage({check: true});
})