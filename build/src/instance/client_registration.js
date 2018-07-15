/* eslint-env browser */
/* global nodecg */
(function () {
	'use strict';

	let pathname = window.location.pathname;

	// If the pathname ends with /bundleName/ then we must be on index.html.
	if (pathname.endsWith(nodecg.bundleName + '/')) {
		pathname += 'index.html';
	}

	// The dashboard will have some kind of killswitch to destroy all instances of a singleInstance graphic.
	// This includes the active instance *and* all "busy" pages waiting for that graphic to become available.
	/* istanbul ignore next: cant cover navigates page */
	window.socket.on('graphic:killed', killedPath => {
		if (killedPath === pathname) {
			/* istanbul ignore next: cant cover navigates page */
			window.location.href = '/instance/killed.html?pathname=' + pathname;
		}
	});

	// On page load, register this socket with its URL pathname, so that the server can keep track of it.
	// In single-instance graphics, this registration will be rejected if the graphic is already open elsewhere.
	register();
	window.socket.on('reconnect', () => {
		register();
	});

	function register() {
		window.socket.emit('graphic:registerSocket', {
			pathName: pathname,
			bundleName: nodecg.bundleName,
			bundleVersion: nodecg.bundleVersion,
			bundleGit: nodecg.bundleGit
		}, accepted => {
			/* istanbul ignore if: cant cover navigates page */
			if (!accepted) {
				window.location.href = '/instance/busy.html?pathname=' + pathname;
			}
		});
	}
})();
