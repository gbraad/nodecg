(function () {
	'use strict';

	/**
	 * @customElement
	 * @polymer
	 */
	class NcgGraphic extends Polymer.Element {
		static get is() {
			return 'ncg-graphic';
		}

		static get properties() {
			return {
				graphic: {
					type: Object
				},
				responsiveMode: {
					type: String,
					reflectToAttribute: true,
					computed: '_computeResponsiveMode(_wide, _medium, _narrow)'
				},
				_collapseOpened: {
					type: Boolean
				},
				_wide: {
					type: Boolean
				},
				_medium: {
					type: Boolean
				},
				_narrow: {
					type: Boolean
				}
			};
		}

		ready() {
			super.ready();

			const clipboard = new Clipboard(this.$.copyButton);
			this._initClipboard(clipboard);
		}

		toggleCollapse() {
			this.$.instancesCollapse.toggle();
		}

		_computeResponsiveMode(_wide, _medium, _narrow) {
			if (_wide) {
				return 'wide';
			}

			if (_medium) {
				return 'medium';
			}

			if (_narrow) {
				return 'narrow';
			}
		}

		_initClipboard(clipboard) {
			clipboard.on('success', () => {
				this.dispatchEvent(new CustomEvent('url-copy-success', {bubbles: true, composed: true}));
				this.$.copyToast.show('Graphic URL copied to clipboard.');
			});
			clipboard.on('error', e => {
				this.dispatchEvent(new CustomEvent('url-copy-error', {bubbles: true, composed: true}));
				this.$.copyToast.show('Failed to copy graphic URL to clipboard!');
				console.error(e);
			});
		}

		_calcShortUrl(graphicUrl) {
			return graphicUrl.split('/').slice(4).join('/');
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

		_computeCollapseIcon(_collapseOpened) {
			return _collapseOpened ? 'unfold-less' : 'unfold-more';
		}
	}

	customElements.define(NcgGraphic.is, NcgGraphic);
})();
