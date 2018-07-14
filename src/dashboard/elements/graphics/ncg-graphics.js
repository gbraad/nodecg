/**
 * @customElement
 * @polymer
 * @appliesMixin Polymer.MutableData
 */
class NcgGraphics extends Polymer.MutableData(Polymer.Element) {
	static get is() {
		return 'ncg-graphics';
	}

	static get properties() {
		return {
			bundlesWithGraphics: {
				type: Array,
				value: window.__renderData__.bundles.filter(bundle => {
					return bundle.graphics && bundle.graphics.length > 0;
				})
			},
			_graphicInstances: Array
		};
	}

	ready() {
		super.ready();
		const instancesList = this.$.instancesList;
		const empty = this.$['instancesList-empty'];
		const instancesRep = new NodeCG.Replicant('graphics:instances', 'nodecg');

		instancesRep.on('change', newVal => {
			console.log(JSON.stringify(newVal, null, 2));
			this._graphicInstances = newVal;
		});

		// Observe #instancesList
		const observer = new MutationObserver(() => {
			if (instancesList.firstChild) {
				instancesList.style.display = 'block';
				empty.style.display = 'none';
			} else {
				instancesList.style.display = 'none';
				empty.style.display = 'flex';
			}
		});

		observer.observe(instancesList, {
			childList: true,
			subtree: true
		});
	}

	connectedCallback() {
		super.connectedCallback();

		Polymer.RenderStatus.beforeNextRender(this, () => {
			// 2017-08-26 Firefox seems to return an Array here instead of a NodeList.
			// This is a problem, because Clipboard.js specifically doesn't accept Arrays (???).
			// If `buttons` is an array, then we just iterate over it and make a separate Clipboard
			// instance for each, rather than one instance for the whole collection.
			const buttons = this.shadowRoot.querySelectorAll('.copyButton');
			if (Array.isArray(buttons)) {
				buttons.forEach(button => {
					const clipboard = new Clipboard(button);
					this._initClipboard(clipboard);
				});
			} else {
				const clipboard = new Clipboard(buttons);
				this._initClipboard(clipboard);
			}
		});
	}

	calcShortUrl(graphicUrl) {
		return graphicUrl.split('/').slice(4).join('/');
	}

	_initClipboard(clipboard) {
		clipboard.on('success', () => {
			this.$.copyToast.show('Graphic URL copied to clipboard.');
		});
		clipboard.on('error', e => {
			this.$.copyToast.show('Failed to copy graphic URL to clipboard!');
			console.error(e);
		});
	}

	_computeFullGraphicUrl(url) {
		const a = document.createElement('a');
		a.href = url;
		let absUrl = a.href;

		if (window.ncgConfig.login.enabled && window.token) {
			absUrl += `?key=${window.token}`;
		}

		return absUrl;
	}

	_isSingleInstance(registration) {
		return registration && registration.singleInstance;
	}
}

customElements.define('ncg-graphics', NcgGraphics);
