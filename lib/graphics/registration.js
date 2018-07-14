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

io.on('connection', socket => {
	socket.on('graphic:registerSocket', ({pathName, bundleName, bundleGit}, cb) => {
		if (pathName.endsWith(`/${bundleName}/graphics/`)) {
			pathName += 'index.html';
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
		if (existingPathRegistration && graphicManifest.singleInstance) {
			cb(existingPathRegistration.socketId === socket.id);
			return;
		}

		if (!existingSocketRegistration) {
			addRegistration({
				bundleName,
				bundleGit,
				pathName,
				socketId: socket.id,
				singleInstance: graphicManifest.singleInstance
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

	socket.on('killGraphic', url => {
		io.emit('graphic:killed', url);
	});

	socket.on('disconnect', () => {
		// Unregister the socket.
		const removedRegistration = removeRegistration(socket.id);
		if (removedRegistration.singleInstance) {
			app.emit('graphicAvailable', removedRegistration.pathName);
		}
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

function addRegistration({bundleName, bundleGit, pathName, socketId, singleInstance}) {
	instancesRep.value.push({
		bundleName,
		bundleGit,
		pathName,
		socketId,
		singleInstance
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

