/*<FILE_LICENSE>
 * Azos (A to Z Application Operating System) Framework
 * The A to Z Foundation (a.k.a. Azist) licenses this file to you under the MIT license.
 * See the LICENSE file in the project root for more information.
</FILE_LICENSE>*/

import { html } from "../../ui";
import { CaseBase } from "./case-base";
import * as types from "azos/types";

import "../../parts/button";
import "../../parts/text-field";

import "../../vcl/time/scheduler";
import { getDailyAvailable } from "./fetch-scheduling-data";

const rangeData = getDailyAvailable();
export class CaseScheduler extends CaseBase {

  firstUpdated() {
    super.firstUpdated();
    this.#loadSchedulingItems();
  }

  refresh() {
    this.schTest.purge();
    this.#loadSchedulingItems();
  }

  #loadSchedulingItems() {
    this.schTest.beginChanges();
    try {
      for (let i = 0; i < rangeData.length; i++) {
        const one = rangeData[i];
        const day = types.asDate(one.day, false, true);
        if (i === 0) { this.schTest.enabledStartDate = day; }
        for (let j = 0; j < one.hours.parsed.length; j++) {
          const span = one.hours.parsed[j];
          this.schTest.addItem({
            id: `n-${i}-${j}`,
            day: day,
            caption: null,//nothing for now
            startTimeMins: span.sta,
            durationMins: span.dur,
            data: { span, day },
          });
        }
      }
    } finally {
      this.schTest.endChanges();
    }
  }

  btnAddItem() {
    const startTimeMins = this.sta.value.split(":").map(Number).reduce((p, c, i) => p += i === 0 ? c * 60 : c, 0);
    const endTimeMins = this.fin.value.split(":").map(Number).reduce((p, c, i) => p += i === 0 ? c * 60 : c, 0);
    const duration = endTimeMins - startTimeMins;
    if (duration <= 0) {
      this.fin.error = new types.ValidationError(this.effectiveSchema, "EndTime", null, "End time should be after start time");
      return;
    }
    const caption = this.caption.value || null;
    const [year, month, date] = this.date.value.split("-").map(Number)
    const day = new Date(year, month - 1, date);
    day.setHours(0, 0, 0, 0);
    this.schTest.beginChanges();
    this.schTest.addItem({
      id: Math.random() > 0.5 ? null : `n-${Math.random() * 10}`,
      caption,
      startTimeMins,
      durationMins: duration,
      day,
    });
    this.schTest.endChanges();
  }

  schOnSelected(evt) {
    const { selectedItems } = evt.detail;
    console.log(selectedItems);
  }

  renderControl() {
    return html`
<h2>Scheduler</h2>
<div>
    <az-text title="Start" id="sta" scope="this" dataKind="time" value="13:00"></az-text>
    <az-text title="End" id="fin" scope="this" dataKind="time" value="13:30"></az-text>
    <az-text title="Date" id="date" scope="this" dataKind="date" value="${(new Date()).toISOString().split("T")[0]}"></az-text>
    <az-text title="Caption" id="caption" scope="this"></az-text>
    <az-button title="Add Item" @click="${() => this.btnAddItem()}"></az-button>
</div>

<az-time-block-picker id="schTest" scope="this"
    @selected="${this.schOnSelected}"
    xenabledStartDate="2024-12-28"
    xenabledEndDate="2025-1-6"
></az-time-block-picker>
    `;
  }
}

window.customElements.define("az-case-scheduler", CaseScheduler);
