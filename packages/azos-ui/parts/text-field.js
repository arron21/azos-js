/*<FILE_LICENSE>
 * Azos (A to Z Application Operating System) Framework
 * The A to Z Foundation (a.k.a. Azist) licenses this file to you under the MIT license.
 * See the LICENSE file in the project root for more information.
</FILE_LICENSE>*/

import { isOneOf, asString, normalizeUSPhone } from 'azos/strings';
import { html, parseRank, parseStatus, noContent } from '../ui.js';
import { baseStyles, textFieldStyles } from './styles.js';
import { FieldPart } from './field-part.js';
import { DATA_KIND } from 'azos/types';


export class TextField extends FieldPart {
  static properties = {
    /** Aligns input value left, center, or right. Default: left. */
    alignValue: { type: String },

    /** Determines number of rows when textarea is rendered (default: 4 rows) */
    height: { type: Number },

    /** Determines if this field is a single-line input, password, or
     *  textarea (multi-line block input) */
    itemType: { type: String },

    /** Ghosted text that will be replaced by user input */
    placeholder: { type: String },

    /** Defines resize attribute for textarea
     * (none | both | horizontal | vertical | block | inline) */
    resize: { type: String },

    /** True for multiline text fields */
    multiline: { type: Boolean}
  }

  static styles = [baseStyles, textFieldStyles];

  constructor() { super(); }


  /** True if text input is <input type="password"> */
  get isPassword() { return isOneOf(this.itemType, ["password", "pass", "pw", "masked"]); }

  /** True if text input is <input type="date"> */
  get isDate() { return isOneOf(this.itemType, ["date", "calendar", "day", "month", "year"]); }

  /** True if text input is <input type="text"> */
  get isInputText() { return !this.isTextArea && !this.isPassword && !this.isDate; }

  /** True if alignValue is a valid value */
  get isValidAlign() { return isOneOf(this.alignValue, ["left", "center", "right"]); }



  #tbChange(e) {
    const v = e.target.value;
    this.setValueFromInput(v);//this may cause validation error but will set this.rawValue
    this.inputChanged();
  }

  focus(){
    const t = this.$("tbData");
    if (!t) return;
    window.queueMicrotask(() => t.focus());
  }

  prepareInputValue(v){
    if (v===null || v===undefined) return null;
    if (this.dataKind === DATA_KIND.TEL){
      return normalizeUSPhone(v);
    }
    return v;
  }

  /** Override to convert a value into the one displayed in a text input */
  // eslint-disable-next-line no-unused-vars
  prepareValueForInput(v, isRawValue = false){
    return asString(v) ?? "";
  }

  renderInput() {
    const clsRank = `${parseRank(this.rank, true)}`;
    const clsStatusBg = `${parseStatus(this.effectiveStatus, true, "Bg")}`;

    let val = this.value;
    if ((val === undefined || val === null) && this.error)
      val = this.prepareValueForInput(this.rawValue, true);
    else
      val = this.prepareValueForInput(val, false);

    //console.info("Will render this value: " + describe(val));

    if (this.multiline){
      return  html`
      <textarea
        class="${clsRank} ${clsStatusBg} ${this.isValidAlign ? `text-${this.alignValue}` : ''} ${this.isReadonly ? 'readonlyInput' : ''}"
        id="tbData"
        maxLength="${this.maxLength ? this.maxLength : noContent}"
        minLength="${this.minLength ? this.minLength : noContent}"
        placeholder="${this.placeholder}"
        rows="${this.height ? this.height : "4"}"
        .value="${val}"
        .disabled=${this.isDisabled}
        .required=${this.isRequired}
        ?readonly=${this.isReadonly}
        @change="${this.#tbChange}"
        part="field"
        style="resize: ${this.resize}"
        ></textarea>`;
    }

    return html`
    <input
      class="${clsRank} ${clsStatusBg} ${this.isValidAlign ? `text-${this.alignValue}` : ''} ${this.isReadonly ? 'readonlyInput' : ''}"
      id="tbData"
      maxLength="${this.maxLength ? this.maxLength : noContent}"
      minLength="${this.minLength ? this.minLength : noContent}"
      placeholder="${this.placeholder}"
      type="${this.isInputText ? "text" : this.isPassword ? "password" : "date"}"
      .value="${val}"
      .disabled=${this.isDisabled}
      .required=${this.isRequired}
      ?readonly=${this.isReadonly}
      @change="${this.#tbChange}"
      part="field"
      autocomplete="off"
    />`;

  // This was here prior to Jan 2025 refactoring. Garbage
  //// const tb = this.$("tbData");
  ////  if (tb) tb.value = val;
  }
}

window.customElements.define("az-text", TextField);
