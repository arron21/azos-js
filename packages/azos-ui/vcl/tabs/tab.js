/*<FILE_LICENSE>
 * Azos (A to Z Application Operating System) Framework
 * The A to Z Foundation (a.k.a. Azist) licenses this file to you under the MIT license.
 * See the LICENSE file in the project root for more information.
</FILE_LICENSE>*/

import * as aver from "azos/aver";
import * as types from "azos/types";

import { Block } from "../../blocks";
import { html } from "../../ui";
import { TabView } from "./tab-view";
import { Command } from "../../cmd";

window.Command = Command;

import "../../parts/button";

export class Tab extends Block {
  static #idSeed = 0;

  static properties = {
    active: { type: Boolean, reflect: true },
    minWidth: { type: Number },
    maxWidth: { type: Number },
    canClose: { type: Boolean },
    iconPath: { type: String },
    slot: { type: String, reflect: true },
    data: { type: Object },
    showCommands: { type: Boolean },
  };

  #id;
  get id() { return this.#id; }

  #iconPath;
  get iconPath() { return this.#iconPath; }
  set iconPath(v) { this.#iconPath = v; }

  #isAbsent = false;
  get isAbsent() { return this.#isAbsent; }
  set isAbsent(v) {
    v = types.asBool(v);
    if (this.#isAbsent === v) return;
    const tabView = this.tabView;
    if (!v) {
      this.#isAbsent = false;
    } else {
      if (this.active && !(tabView?.unselectActiveTab())) return;
      this.#isAbsent = true;
    }
    tabView?.requestUpdate();
  }

  #canClose = true;
  get canClose() { return this.#canClose; }
  set canClose(v) { this.#canClose = v; }

  get active() { return this === this.tabView.activeTab; }
  get order() { return this.tabView.tabs.findIndex(tab => tab === this); }

  get previousTab() { return this.#getPreviousSibling(false); }
  get previousVisibleTab() { return this.#getPreviousSibling(true); }

  get nextTab() { return this.#getNextSibling(false); }
  get nextVisibleTab() { return this.#getNextSibling(true); }

  #commands = null;
  get commands() { return this.#commands; }
  set commands(v) {
    if (types.isAssigned(v)) aver.isArray(v).forEach(one => aver.isOf(one, Command));
    const oldCommands = this.#commands;
    this.#commands = v ?? null;
    this.requestUpdate("commands", oldCommands);
  }

  #getNextSibling(visibleOnly = true) {
    const tabView = this.tabView;
    const totalTabs = tabView.tabs.length;
    const idx = this.order;
    if (idx < 0) return null;
    if (totalTabs === 0) return null;

    let t;
    for (let i = idx + 1; i < totalTabs; i++) {
      t = this.tabView.tabs[i];
      if (visibleOnly && t.isAbsent === true) continue;
      return t;
    }
    return null;
  }

  #getPreviousSibling(visibleOnly = true) {
    const tabView = this.tabView;
    const totalTabs = tabView.tabs.length;
    const idx = this.order;
    if (idx < 0) return null;
    if (totalTabs === 0) return null;

    let t;
    for (let i = idx - 1; i >= 0; i--) {
      t = this.tabView.tabs[i];
      if (visibleOnly && t.isAbsent === true) continue;
      return t;
    }
    return null;
  }

  get tabView() { return this.parentNode; }

  constructor(title, data = null) {
    super();
    this.title = aver.isNonEmptyString(title);
    this.data = data;
    this.#id = ++Tab.#idSeed;
  }

  requestUpdate(...args) {
    super.requestUpdate.call(this, ...args);
    if (this.tabView?.requestUpdate) this.tabView.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();
    aver.isOf(this.parentNode, TabView);
  }

  /** Within the tabView, makes this tab active. */
  activate() { this.tabView.activeTab = this; }

  /** Within the tabView, closes this tab and discards it. */
  async close(force = false) { return this.tabView.closeTab(this, force); }

  /** @param {number} stepCount negative for left, positive for right */
  move(stepCount, visibleOnly = true) {
    if (stepCount === 0) return;

    const tabs = visibleOnly ? this.tabView.visibleTabs : this.tabView.tabs;
    const currentIndex = this.order;
    const count = tabs.length;

    let newIndex = currentIndex + stepCount;

    if (newIndex < 0) return;
    if (newIndex > count - 1) return;

    let beforeTab;
    if (newIndex === count - 1) beforeTab = null;
    else if (newIndex === 0) beforeTab = tabs[0];
    else {
      if (stepCount < 0 && newIndex !== 0) newIndex -= 1
      beforeTab = tabs[newIndex].nextElementSibling;
    }

    this.tabView.moveTab(this, beforeTab);
  }

  renderCommands() {
    return html`
<div class="toolbar">
${this.commands?.map(cmd => html`<az-button @click="${() => cmd.exec()}" title="${cmd.icon ? cmd.icon : ""} ${cmd.title}"></az-button>`)}
</div>
`;
  }
  renderControl() { return html`<slot></slot>`; }
}
