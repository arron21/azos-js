/*<FILE_LICENSE>
 * Azos (A to Z Application Operating System) Framework
 * The A to Z Foundation (a.k.a. Azist) licenses this file to you under the MIT license.
 * See the LICENSE file in the project root for more information.
</FILE_LICENSE>*/

import { css, html } from "../../ui";
import { CaseBase } from "./case-base";

import "../../parts/lookup";
import "../../parts/button";

export class CaseLookup extends CaseBase {
  static styles = css`
:host{display:flex;}
:host > az-text{min-width:200px;}
  `;
  states = JSON.stringify({ "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming" });
  countries = JSON.stringify({ USA: "United States of America", CA: "Canada", MX: "Mexico", CN: "China" });


  selectAddress(event) {
    if (event.cancelable) event.preventDefault();
    console.log(event.detail.value);
    const { street1, street2, city, state, zip, country } = event.detail.value;
    this.tbStreet1.setValueFromInput(street1);
    this.tbStreet2.setValueFromInput(street2);
    this.tbCity.setValueFromInput(city);
    this.tbState.setValueFromInput(state);
    this.tbZip.setValueFromInput(zip);
    this.tbCountry.setValueFromInput(country);
    this.requestUpdate();
  }

  renderControl() {
    return html`
<!--h2>Testing az-lookup</h2-->
<az-text id="tbStreet1" scope="this" title="Street 1" lookupId="lkpAddress" placeholder="Start typing to search"></az-text>
<az-text id="tbStreet2" scope="this" title="Street 2"></az-text>
<az-text id="tbCity" scope="this" title="City"></az-text>
<az-text id="tbState" scope="this" title="State" lookupId="lkpFromValueList" valueList="${this.states}"></az-text>
<az-text id="tbZip" scope="this" title="Zip"></az-text>
<az-text id="tbCountry" scope="this" title="Country" lookupId="lkpFromValueList" valueList="${this.countries}"></az-text>
<xyz-address-lookup id="lkpAddress" scope="this" @lookupSelect="${address => this.selectAddress(address)}"></xyz-address-lookup>
<az-lookup id="lkpFromValueList" scope="this" maxItems=10 minItems=3></az-lookup>
    `;
  }
}

window.customElements.define("az-case-lookup", CaseLookup);
