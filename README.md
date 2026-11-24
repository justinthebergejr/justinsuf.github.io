The source code for my website, [justin](https://justi.zone).

The listening indicator uses the public
[Last.fm Last Played](https://github.com/biancarosa/lastfm-last-played) proxy
for `JustinSUF`. It refreshes every 30 seconds while the page is visible,
shows the most recent track when playback stops, and hides if unavailable.
This depends on a third-party service; no Last.fm API key is stored in the site.
