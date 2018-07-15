(function () {
	'use strict';

	/**
	 * @customElement
	 * @polymer
	 * @appliesMixin Polymer.MutableData
	 */
	class NcgGraphicsBundle extends Polymer.MutableData(Polymer.Element) {
		static get is() {
			return 'ncg-graphics-bundle';
		}

		static get properties() {
			return {
				bundle: Object,
				instances: Array
			};
		}

		_calcGraphicInstances(bundle, graphic, instances) {
			if (!graphic || !Array.isArray(instances)) {
				return [];
			}

			return instances.filter(instance => {
				return instance.bundleName === bundle.name &&
					instance.pathName === graphic.url;
			});
		}
	}

	customElements.define(NcgGraphicsBundle.is, NcgGraphicsBundle);
})();
