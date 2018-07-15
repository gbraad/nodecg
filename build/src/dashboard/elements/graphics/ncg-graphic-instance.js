(function () {
	'use strict';

	/**
	 * @customElement
	 * @polymer
	 * @appliesMixin Polymer.MutableData
	 */
	class NcgGraphicInstance extends Polymer.MutableData(Polymer.Element) {
		static get is() {
			return 'ncg-graphic-instance';
		}

		static get properties() {
			return {};
		}
	}

	customElements.define(NcgGraphicInstance.is, NcgGraphicInstance);
})();
