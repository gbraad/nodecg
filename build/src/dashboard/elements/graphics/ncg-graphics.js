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

		this.addEventListener('url-copy-success', () => {
			this.$.copyToast.show('Graphic URL copied to clipboard.');
		});
		this.addEventListener('url-copy-error', () => {
			this.$.copyToast.show('Failed to copy graphic URL to clipboard!');
		});
	}

	_isSingleInstance(registration) {
		return registration && registration.singleInstance;
	}
}

customElements.define('ncg-graphics', NcgGraphics);
