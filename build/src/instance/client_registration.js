/* eslint-env browser */
/* global nodecg */
(function () {
	'use strict';

	let pathname = window.location.pathname;

	// If the pathname ends with /bundleName/ then we must be on index.html.
	if (pathname.endsWith(nodecg.bundleName + '/')) {
		pathname += 'index.html';
	}

	/* istanbul ignore next: cant cover navigates page */
	window.socket.on('graphic:kill', instance => {
		if (!instance) {
			return;
		}

		if (instance.socketId === window.socket.id) {
			/* istanbul ignore next: cant cover navigates page */
			window.location.href = '/instance/killed.html?pathname=' + pathname;
		}
	});

	/* istanbul ignore next: cant cover navigates page */
	window.socket.on('graphic:refresh', instance => {
		if (!instance) {
			return;
		}

		if (instance.socketId === window.socket.id) {
			/* istanbul ignore next: cant cover navigates page */
			window.location.reload();
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
			timestamp: Date.now(),
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
