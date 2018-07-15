'use strict';

// Native
const path = require('path');

// Packages
const app = require('express')();

// Ours
const bundles = require('../bundle-manager');
const injectScripts = require('../util').injectScripts;
const io = require('../server').getIO();
const Replicant = require('../replicant');

const BUILD_PATH = path.join(__dirname, '../../build/src/instance');
const instancesRep = new Replicant('graphics:instances', 'nodecg', {
	schemaPath: path.resolve(__dirname, '../../schemas/graphics%3Ainstances.json'),
	persistent: false
});

bundles.on('bundleChanged', updateInstanceStatuses);
bundles.on('gitChanged', updateInstanceStatuses);

io.on('connection', socket => {
	socket.on('graphic:registerSocket', (regRequest, cb) => {
		const bundleName = regRequest.bundleName;
		let pathName = regRequest.pathName;
		if (pathName.endsWith(`/${bundleName}/graphics/`)) {
			pathName += 'index.html';
		}

		const bundle = bundles.find(bundleName);
		if (!bundle) {
			cb(false);
			return;
		}

		const graphicManifest = findGraphicManifest({bundleName, pathName});
		if (!graphicManifest) {
			cb(false);
			return;
		}

		const existingSocketRegistration = findRegistrationBySocketId(socket.id);
		const existingPathRegistration = findRegistrationByPathName(pathName);

		// If there is an existing registration with this pathName,
		// and this is a singleInstance graphic,
		// then deny the registration, unless the socket ID matches.
		if (existingPathRegistration && !existingPathRegistration.open && graphicManifest.singleInstance) {
			cb(existingPathRegistration.socketId === socket.id);
			return;
		}

		if (existingSocketRegistration) {
			existingSocketRegistration.open = true;
		} else {
			addRegistration({
				...regRequest,
				ipv4: socket.request.connection.remoteAddress,
				socketId: socket.id,
				singleInstance: Boolean(graphicManifest.singleInstance),
				potentiallyOutOfDate: calcBundleGitMismatch(bundle, regRequest) ||
				calcBundleVersionMismatch(bundle, regRequest)
			});

			if (graphicManifest.singleInstance) {
				app.emit('graphicOccupied', pathName);
			}
		}

		cb(true);
	});

	socket.on('isGraphicAvailable', (pathName, cb) => {
		cb(!findRegistrationByPathName(pathName));
	});

	socket.on('graphic:requestRefreshAll', (graphic, cb) => {
		io.emit('graphic:refreshAll', graphic);
		if (typeof cb === 'function') {
			cb();
		}
	});

	socket.on('graphic:requestRefresh', (instance, cb) => {
		io.emit('graphic:refresh', instance);
		if (typeof cb === 'function') {
			cb();
		}
	});

	socket.on('graphic:requestKill', (instance, cb) => {
		io.emit('graphic:kill', instance);
		if (typeof cb === 'function') {
			cb();
		}
	});

	socket.on('disconnect', () => {
		// Unregister the socket.
		const registration = findRegistrationBySocketId(socket.id);
		if (!registration) {
			return;
		}

		registration.open = false;
		if (registration.singleInstance) {
			app.emit('graphicAvailable', registration.pathName);
		}

		setTimeout(() => {
			removeRegistration(socket.id);
		}, 5000);
	});
});

app.get('/instance/*', (req, res, next) => {
	const resName = req.path.split('/').slice(2).join('/');

	// If it's a HTML file, inject the graphic setup script and serve that
	// otherwise, send the file unmodified
	if (resName.endsWith('.html')) {
		const fileLocation = path.join(BUILD_PATH, resName);
		injectScripts(fileLocation, 'graphic', {}, html => res.send(html));
	} else {
		return next();
	}
});

module.exports = app;

function findGraphicManifest({pathName, bundleName}) {
	const bundle = bundles.find(bundleName);
	if (!bundle) {
		return;
	}

	return bundle.graphics.find(graphic => {
		return graphic.url === pathName;
	});
}

function addRegistration(registration) {
	instancesRep.value.push({
		...registration,
		open: true
	});
}

function removeRegistration(socketId) {
	const registrationIndex = instancesRep.value.findIndex(instance => {
		return instance.socketId === socketId;
	});

	if (registrationIndex < 0) {
		return false;
	}

	return instancesRep.value.splice(registrationIndex, 1)[0];
}

function findRegistrationBySocketId(socketId) {
	return instancesRep.value.find(instance => {
		return instance.socketId === socketId;
	});
}

function findRegistrationByPathName(pathName) {
	return instancesRep.value.find(instance => {
		return instance.pathName === pathName;
	});
}

function calcBundleGitMismatch(bundle, regRequest) {
	if (regRequest.bundleGit && !bundle.git) {
		return true;
	}

	if (!regRequest.bundleGit && bundle.git) {
		return true;
	}

	return regRequest.bundleGit.hash !== bundle.git.hash;
}

function calcBundleVersionMismatch(bundle, regRequest) {
	return bundle.version !== regRequest.bundleVersion;
}

function updateInstanceStatuses() {
	console.log('updateInstanceStatuses');
	instancesRep.value.forEach(instance => {
		const bundleName = instance.bundleName;
		const pathName = instance.pathName;
		const bundle = bundles.find(bundleName);
		if (!bundle) {
			return;
		}

		const graphicManifest = findGraphicManifest({bundleName, pathName});
		if (!graphicManifest) {
			return;
		}

		instance.potentiallyOutOfDate = calcBundleGitMismatch(bundle, instance) ||
			calcBundleVersionMismatch(bundle, instance);
		instance.singleInstance = Boolean(graphicManifest.singleInstance);
	});
}
