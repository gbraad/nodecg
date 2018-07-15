'use strict';

// Native
const path = require('path');

// Packages
const test = require('ava');
const axios = require('axios');
const replace = require('replace-in-file');

// Ours
require('./helpers/nodecg-and-webdriver')(test, {tabs: ['dashboard', 'single-instance']}); // Must be first.
const C = require('./helpers/test-constants');
const e = require('./helpers/test-environment');

test.beforeEach(async () => {
	await e.browser.client.switchTab(e.browser.tabs.singleInstance);
});

test('singleInstance - scripts get injected into /instance/*.html routes', async t => {
	const response = await axios.get(`${C.ROOT_URL}instance/killed.html`);
	t.is(response.status, 200);
	t.true(response.data.includes('<script src="/nodecg-api.min.js">'));
	t.true(response.data.includes('<script src="/socket.io/socket.io.js"></script>'));
});

test.serial.cb('singleInstance - shouldn\'t enter an infinite redirect loop when including a polymer element that loads an external stylesheet', t => {
	const registration = require('../lib/graphics/registration');

	function cb(url) {
		if (url === '/bundles/test-bundle/graphics/single_instance.html') {
			throw new Error('The graphic must have gotten redirected.');
		}
	}

	process.nextTick(() => {
		registration.once('graphicAvailable', cb);
	});

	setTimeout(() => {
		registration.removeListener('graphicAvailable', cb);
		t.end();
	}, 5000);
});

test.serial('singleInstance - should redirect to busy.html when the instance is already taken', async t => {
	await e.browser.client.newWindow(C.SINGLE_INSTANCE_URL);
	await e.sleep(1000);
	t.is(
		await e.browser.client.getUrl(),
		`${C.ROOT_URL}instance/busy.html?pathname=/bundles/test-bundle/graphics/single_instance.html`
	);
});

test.serial('singleInstance - should redirect to killed.html when the instance is killed', async t => {
	await e.browser.client.switchTab(e.browser.tabs.dashboard);
	await e.browser.client.execute(() => {
		document.querySelector('ncg-dashboard').shadowRoot
			.querySelector('ncg-graphics').shadowRoot
			.querySelector('ncg-graphics-bundle').shadowRoot
			.querySelectorAll('ncg-graphic')[1].shadowRoot
			.querySelector('ncg-graphic-instance').$.killButton.click();
	});

	await e.browser.client.switchTab(e.browser.tabs.singleInstance);
	t.is(
		await e.browser.client.getUrl(),
		`${C.ROOT_URL}instance/killed.html?pathname=/bundles/test-bundle/graphics/single_instance.html`
	);
});

test.serial('singleInstance - should allow the graphic to be taken after being killed', async t => {
	await e.browser.client.newWindow(C.SINGLE_INSTANCE_URL);
	await e.sleep(500);
	t.is(await e.browser.client.getUrl(), C.SINGLE_INSTANCE_URL);
});

test.serial('refreshAll button', async t => {
	await e.browser.client.newWindow(C.GRAPHIC_URL);
	await e.browser.client.executeAsync(done => {
		if (window.__nodecgRegistrationAccepted__) {
			finish();
		} else {
			window.addEventListener('nodecg-registration-accepted', finish);
		}

		function finish() {
			window.__refreshMarker__ = '__refreshMarker__';
			done();
		}
	});
	const graphicTabId = await e.browser.client.getCurrentTabId();

	await e.browser.client.switchTab(e.browser.tabs.dashboard);
	await e.browser.client.execute(() => {
		document.querySelector('ncg-dashboard').shadowRoot
			.querySelector('ncg-graphics').shadowRoot
			.querySelector('ncg-graphics-bundle').shadowRoot
			.querySelectorAll('ncg-graphic')[0].$.reloadButton.click();
	});

	await e.browser.client.switchTab(graphicTabId);
	const response = await e.browser.client.executeAsync(done => {
		if (window.__nodecgRegistrationAccepted__) {
			finish();
		} else {
			window.addEventListener('nodecg-registration-accepted', finish);
		}

		function finish() {
			done(window.__refreshToken__);
		}
	});
	t.is(response.value, null);
});

test.serial('refresh button', async t => {
	await e.browser.client.newWindow(C.GRAPHIC_URL);
	await e.browser.client.executeAsync(done => {
		if (window.__nodecgRegistrationAccepted__) {
			finish();
		} else {
			window.addEventListener('nodecg-registration-accepted', finish);
		}

		function finish() {
			window.__refreshMarker__ = '__refreshMarker__';
			done();
		}
	});
	const graphicTabId = await e.browser.client.getCurrentTabId();

	await e.browser.client.switchTab(e.browser.tabs.dashboard);
	await e.browser.client.execute(() => {
		document.querySelector('ncg-dashboard').shadowRoot
			.querySelector('ncg-graphics').shadowRoot
			.querySelector('ncg-graphics-bundle').shadowRoot
			.querySelectorAll('ncg-graphic')[0].shadowRoot
			.querySelectorAll('ncg-graphic-instance')[1].$.reloadButton.click();
	});

	await e.browser.client.switchTab(graphicTabId);
	const response = await e.browser.client.executeAsync(done => {
		if (window.__nodecgRegistrationAccepted__) {
			finish();
		} else {
			window.addEventListener('nodecg-registration-accepted', finish);
		}

		function finish() {
			done(window.__refreshToken__);
		}
	});
	await e.browser.client.close(); // We don't need the coverage data from this tab.
	t.is(response.value, null);
});

test.serial('displays a warning when an instance is out of date', async t => {
	replace.sync({
		files: path.resolve(process.env.NODECG_ROOT, 'bundles/test-bundle/package.json'),
		from: '"version": "0.0.1"',
		to: '"version": "0.0.2"'
	});

	await e.sleep(1500);

	await e.browser.client.switchTab(e.browser.tabs.dashboard);
	const response = await e.browser.client.execute(() => {
		const element = document.querySelector('ncg-dashboard').shadowRoot
			.querySelector('ncg-graphics').shadowRoot
			.querySelector('ncg-graphics-bundle').shadowRoot
			.querySelectorAll('ncg-graphic')[0].shadowRoot
			.querySelector('ncg-graphic-instance[status="out-of-date"]');

		return element ? element.$.status.textContent.trim() : undefined;
	});

	t.is(response.value, 'Potentially Out of Date');
});
