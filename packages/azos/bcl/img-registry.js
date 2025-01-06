/*<FILE_LICENSE>
 * Azos (A to Z Application Operating System) Framework
 * The A to Z Foundation (a.k.a. Azist) licenses this file to you under the MIT license.
 * See the LICENSE file in the project root for more information.
</FILE_LICENSE>*/


/*
  SVG Stock Images provided by

  GOOGLE FONTS Project https://fonts.google.com/icons
  under Apache 2.0 License https://www.apache.org/licenses/LICENSE-2.0.html

Copyright 2024 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
 Image source settings
 =====================

 Google Fonts
    https://fonts.google.com/icons?icon.set=Material+Symbols&selected=Material+Symbols+Outlined:close:FILL@0;wght@200;GRAD@0;opsz@24&icon.size=24&icon.color=%23e8eaed&icon.style=Sharp

 Google Fonts Icon Parameters:
    Weight: 200
    Grade: 0
    Optical Size: 24
    Style: Material Symbols (New), Sharp
*/


import { isNonEmptyString, isOf } from "../aver.js";
import { config, ConfigNode, makeNew } from "../conf.js";
import { CONTENT_TYPE } from "../coreconsts.js";
import { dflt } from "../strings.js";
import { Module } from "../modules.js";

/** Contains a registry of {@link ImageRecord} instances which describe images.
 * The registry keeps images by their logical URI strings, resolving each request
 * by selecting the most appropriate image record for the requested URI.
 * Image records are image data record variations containing: `format`, `theme`, `media`, `isoLanguage`.
 * Use {@link resolveSpec} method to get images from string spec like `jpg://welcome-banner-hello1?iso=deu&theme=bananas&media=print`
  */
export class ImageRegistry extends Module {

  //stores mappings of: URI -> [bucket] , bucket contains records that we get the best by score
  #map;

  constructor(app, cfg) {
    super(app, cfg);

    this.#map = new Map();

    cfg = cfg.get("images", "imgs");

    if (!cfg) cfg = config(STOCK_IMAGES).root;
    for (const cfgRec of cfg.getChildren(false)) {
      const uri = isNonEmptyString(cfgRec.getString("uri"));
      const rec = makeNew(ImageRecord, cfgRec, null, ImageRecord);
      this.register(uri, rec);
    }
  }

  /**
   * Tries to resolve a request for an image identified by the specified URI (id) of specific image format (e.g. `svg`|`png`)
   * and optionally matching on `isoLanguage`, `theme`, and `media` specifiers.
   * The system tries to return the BEST matching image record as determined by the pattern match based on record scoring system.
   * @returns {ImageRecord | null} a best matching ImageRecord or null if not found
   */
  resolve(uri, format, { isoLang, theme, media } = {}) {
    isNonEmptyString(uri);
    isNonEmptyString(format);
    isoLang = dflt(isoLang, "eng"); // US English
    theme = dflt(theme, "any"); // theme agnostic
    media = dflt(media, "ico64"); // icon64 virtual pixels

    const bucket = this.#map.get(uri);
    if (!bucket) return null;

    //RECORD SCORE algorithm:
    //while linear search is slow, in reality you would rarely get more than 2-3 records per bucket array
    let bestRec = null;
    for (const rec of bucket) {

      if (rec.format !== format) continue;
      if (rec.isoLang && rec.isoLang !== isoLang) continue;
      if (rec.theme && rec.theme !== theme) continue;
      if (rec.media && rec.media !== media) continue;

      if (bestRec === null || rec.score > bestRec.score) bestRec = rec;
    }

    return bestRec;
  }

  /**
   * Tries to resolve an image specifier - a convoluted URL string containing a request for an image identified by the specified URI (id) of specific image format (e.g. `svg`|`png`)
   * and optionally matching on `isoLanguage`, `theme`, and `media` specifiers.
   * The specifier format is that of URL having the form:  `format://uri?iso=isoLangCode&theme=themeId&media=mediaId`, where query params are optional.
   * The system tries to return the BEST matching image record as determined by the pattern match based on record scoring system.
   * @param {string | null} [iso=null] Pass language ISO code which will be used as a default when the spec does not contain a specific code. You can also set `$session` in the spec to override it with this value
   * @param {string | null} [theme=null] Pass theme id which will be used as a default when the spec does not contain a specific theme. You can also set `$session` in the spec to override it with this value
   * @returns {ImageRecord | null} a best matching ImageRecord or null if not found
   * @example
   *  resolveSpec("svg://file-open");
   *  resolveSpec("png://business-logo?media=print");
   *  resolveSpec("jpg://welcome-banner-hello1?iso=deu&theme=bananas&media=print");
   *  resolveSpec("jpg://welcome-banner-hello1?iso=$session&theme=$session&media=print");// take ISO and theme from user session
   */
  resolveSpec(spec, iso = null, theme = null){
    const url = new URL(isNonEmptyString(spec));
    let imgUri     = url.host;
    let imgFormat  = url.protocol.slice(0, -1); //`svg`, not `svg:`
    let imgIsoLang = url.searchParams.get("iso");
    let imgTheme = url.searchParams.get("theme");
    let imgMedia = url.searchParams.get("media");

    if (!imgIsoLang || imgIsoLang === "$session") imgIsoLang = iso ?? this.app.session.isoLang;
    if (!imgTheme || imgTheme === "$session") imgTheme = theme ?? this.app.session.theme;

    const resolved = this.resolve(imgUri, imgFormat, {imgIsoLang, imgTheme, imgMedia});
    return resolved;
  }

  /** Returns an iterable of all image URIs loaded.
   * To go through all images you can loop through this result and the call {@link getRecords} for each
   */
  getUris(){ return this.#map.keys(); }

  /** Returns an array of {@link ImageRecord} for the specified URI or null if does not exist
   * @returns {ImageRecord[]}
  */
  getRecords(uri){
    isNonEmptyString(uri);
    return this.#map.get(uri) ?? null;
  }

  /**
   * Puts an image record in the registry, creating necessary data structures internally
   * @param {string} uri - non-empty uri string identifier
   * @param {ImageRecord} iRec - non-null `ImageRecord` instance to register
   */
  register(uri, iRec) {
    isNonEmptyString(uri);
    isOf(iRec, ImageRecord);

    ///will put into existing bucket or a new one into map
    let bucket = this.#map.get(uri);
    if (!bucket) {
      bucket = [];
      this.#map.set(uri, bucket);
    }
    bucket.push(iRec);
  }

  /** Deletes all records for the URI bucket returning true, or false if such URI is not found
   * @returns {boolean} true if found and deleted
  */
  unregisterRecords(uri) {
    isNonEmptyString(uri);
    return this.#map.delete(uri);
  }

}//ImageRegistry class

/** Provides information about a single image representation: (format, iso, theme, media) */
export class ImageRecord {

  #format;
  #isoLang;
  #theme;
  #media;
  #score = 0;
  #contentType;
  #content;

  /** @param {ConfigNode} cfg */
  constructor(cfg) {
    isOf(cfg, ConfigNode);

    // required
    this.#format = isNonEmptyString(cfg.getString(["format", "fmt", "f"], null));

    this.#isoLang = cfg.getString(["isoLang", "lang", "iso", "i"], null);
    this.#theme = cfg.getString(["theme", "t"], null);
    this.#media = cfg.getString(["media", "m"], null);

    this.#contentType = cfg.getString(["contentType", "ctp"], CONTENT_TYPE.IMG_SVG);
    this.#content = cfg.getString(["content", "img", "image", "c"]);

    if (this.#media) this.#score += 1_000;
    if (this.#isoLang) this.#score += 100;
    if (this.#theme) this.#score += 1;
  }

  /** Required image format, such as `svg`, `png`, `jpg` etc. */
  get format() { return this.#format; }

  /** Optional language ISO string code or null, e.g. `eng`, */
  get isoLang() { return this.#isoLang; }

  /** Optional theme string specifier or null */
  get theme() { return this.#theme; }

  /** Optional media specifier or null, e.g. `print` */
  get media() { return this.#media; }

  /** Records score. It is higher the more fields are populated. Importance: (media = 1000, isoLang = 100, theme = 1) */
  get score() { return this.#score; }

  /** Image content: string or custom binary array, or an instruction how to get content. Use {@link produceContent} method to get actual image script/bytes */
  get content() { return this.#content; }

  /** Image content MIME type e.g. `image/png` */
  get contentType() { return this.#contentType; }

  /** Call this method to get the actual image content such as PNG byte[] or SVG text.
   * Keep in mind, the {@link content} property may only contain a reference (in future version) to the image stored elsewhere.
   * You need to call this method to get the actual materialized content, e.g. fetched from network (and cached) by first calling async {@link materialize}
   */
  produceContent() { return { sc: 200, ctp: this.#contentType, content: this.#content }; }

  /** Async method which materializes the referenced content. This is reserved for future */
  async materialize(){ return true; }
}




/** Configuration snippet provides base stock system icons/images. */
// TODO: Remove "fill" attribute from paths, rects, etc. INSTEAD Control color with CSS styles/classes (forces default SVG fill color to 0x00000)
export const STOCK_IMAGES = Object.freeze([
  {
    uri: "xyz-test-cmd2",
    f: "svg",
    c: `<svg viewBox="0 0 24 24"><path d="M18.7491 9.70957V9.00497C18.7491 5.13623 15.7274 2 12 2C8.27256 2 5.25087 5.13623 5.25087 9.00497V9.70957C5.25087 10.5552 5.00972 11.3818 4.5578 12.0854L3.45036 13.8095C2.43882 15.3843 3.21105 17.5249 4.97036 18.0229C9.57274 19.3257 14.4273 19.3257 19.0296 18.0229C20.789 17.5249 21.5612 15.3843 20.5496 13.8095L19.4422 12.0854C18.9903 11.3818 18.7491 10.5552 18.7491 9.70957Z"/><path d="M10 9H14L10 13H14" stroke-linejoin="round"/><path d="M7.5 19C8.15503 20.7478 9.92246 22 12 22C14.0775 22 15.845 20.7478 16.5 19" ></svg>`
  }, {
    uri: "adlib-new-query",
    f: "svg",
    c: `<svg viewBox="0 0 28 28"><rect width="6" height="28" x="11" y="0" fill="white"/><rect width="28" height="6" x="0" y="11"></svg>`
  }, {
    uri: "adlib-prefill-query",
    f: "svg",
    c: `<svg viewBox="0 0 28 28"><path d="M3 20.5V25h4.5l13.3-13.3-4.5-4.5L3 20.5zM24.7 8.3c.4-.4.4-1 0-1.4l-3.6-3.6c-.4-.4-1-.4-1.4 0L17 5.6l4.5 4.5 3.2-3.3z"/><rect x="18" y="18" width="2" height="8"/><rect x="15" y="21" width="8" height="2"></svg>`
  }, {
    uri: "cmd-chronicle-filter",
    f: "svg",
    c: `<svg viewBox="0 0 24 24"><path d="M22 3.58002H2C1.99912 5.28492 2.43416 6.96173 3.26376 8.45117C4.09337 9.94062 5.29 11.1932 6.73999 12.09C7.44033 12.5379 8.01525 13.1565 8.41062 13.8877C8.80598 14.6189 9.00879 15.4388 9 16.27V21.54L15 20.54V16.25C14.9912 15.4188 15.194 14.599 15.5894 13.8677C15.9847 13.1365 16.5597 12.5178 17.26 12.07C18.7071 11.175 19.9019 9.92554 20.7314 8.43988C21.5608 6.95422 21.9975 5.28153 22 3.58002Z" stroke-linecap="round" stroke-linejoin="round"></svg>`
  },
]);

/** Library of Common Material Icons (filled standard style) */
export const ICONS = Object.freeze([
  {
    uri: "icon-arrow-down",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M460-760v483.15L228.31-508.54 200-480l280 280 280-280-28.31-28.54L500-276.85V-760h-40Z"></svg>`
  }, {
    uri: "icon-arrow-left",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M396.15-267.69 183.85-480l212.3-212.31 28.31 28.77L260.92-500h515.23v40H260.92l163.54 163.54-28.31 28.77Z"></svg>`
  }, {
    uri: "icon-arrow-right",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m547.69-267.69-28.31-28.77L682.92-460H200v-40h482.92L519.38-663.54l28.31-28.77L760-480 547.69-267.69Z"></svg>`
  }, {
    uri: "icon-arrow-up",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M460-200v-483.15L228.31-451.46 200-480l280-280 280 280-28.31 28.54L500-683.15V-200h-40Z"></svg>`
  }, {
    uri: "icon-attach",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M693.85-338.46q0 90.88-62.62 154.67Q568.62-120 478.08-120t-153.54-63.79q-63-63.79-63-154.67v-349.23q0-63.46 43.65-107.89Q348.85-840 412.31-840q63.46 0 107.11 44.42 43.66 44.43 43.66 107.89v330.77q0 35.23-24.59 60.69-24.58 25.46-59.92 25.46t-60.8-25.06q-25.46-25.06-25.46-61.09v-332.31h40v332.31q0 19.15 13.11 32.65 13.12 13.5 32.27 13.5 19.16 0 32.27-13.5 13.12-13.5 13.12-32.65v-331.54q-.23-46.62-32.06-79.08Q459.2-800 412.31-800q-46.53 0-78.65 32.85-32.12 32.84-32.12 79.46v349.23q-.23 74.08 51.31 126.27Q404.38-160 478.36-160q72.92 0 123.97-52.19t51.52-126.27v-350.77h40v350.77Z"></svg>`
  }, {
    uri: "icon-block",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480.13-120q-74.67 0-140.41-28.34-65.73-28.34-114.36-76.92-48.63-48.58-76.99-114.26Q120-405.19 120-479.87q0-74.67 28.34-140.41 28.34-65.73 76.92-114.36 48.58-48.63 114.26-76.99Q405.19-840 479.87-840q74.67 0 140.41 28.34 65.73 28.34 114.36 76.92 48.63 48.58 76.99 114.26Q840-554.81 840-480.13q0 74.67-28.34 140.41-28.34 65.73-76.92 114.36-48.58 48.63-114.26 76.99Q554.81-120 480.13-120Zm-.13-40q58.59 0 112.83-20.58 54.25-20.57 98.55-59.73L240.31-691.38q-38.39 44.3-59.35 98.55Q160-538.59 160-480q0 134 93 227t227 93Zm239.69-108.62q39.16-44.3 59.73-98.55Q800-421.41 800-480q0-134-93-227t-227-93q-58.86 0-113.35 20.19-54.5 20.19-98.03 60.12l451.07 451.07Z"></svg>`
  }, {
    uri: "icon-bolt",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m422-232 207-248H469l29-227-185 267h139l-30 208Zm-55.85 107.38 40-275.38h-170l299.23-431.54h18.47L514.62-520h200l-330 395.38h-18.47ZM471-470Z"></svg>`
  }, {
    uri: "icon-calendar",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M224.62-120q-27.62 0-46.12-18.5Q160-157 160-184.62v-510.76q0-27.62 18.5-46.12Q197-760 224.62-760h70.76v-89.23h43.08V-760h286.16v-89.23h40V-760h70.76q27.62 0 46.12 18.5Q800-723 800-695.38v510.76q0 27.62-18.5 46.12Q763-120 735.38-120H224.62Zm0-40h510.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-350.76H200v350.76q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69ZM200-575.39h560v-119.99q0-9.24-7.69-16.93-7.69-7.69-16.93-7.69H224.62q-9.24 0-16.93 7.69-7.69 7.69-7.69 16.93v119.99Zm0 0V-720-575.39Zm280 181.54q-12.38 0-21.58-9.19-9.19-9.19-9.19-21.58 0-12.38 9.19-21.57 9.2-9.19 21.58-9.19 12.38 0 21.58 9.19 9.19 9.19 9.19 21.57 0 12.39-9.19 21.58-9.2 9.19-21.58 9.19Zm-160 0q-12.38 0-21.58-9.19-9.19-9.19-9.19-21.58 0-12.38 9.19-21.57 9.2-9.19 21.58-9.19 12.38 0 21.58 9.19 9.19 9.19 9.19 21.57 0 12.39-9.19 21.58-9.2 9.19-21.58 9.19Zm320 0q-12.38 0-21.58-9.19-9.19-9.19-9.19-21.58 0-12.38 9.19-21.57 9.2-9.19 21.58-9.19 12.38 0 21.58 9.19 9.19 9.19 9.19 21.57 0 12.39-9.19 21.58-9.2 9.19-21.58 9.19ZM480-240q-12.38 0-21.58-9.19-9.19-9.19-9.19-21.58 0-12.38 9.19-21.58 9.2-9.19 21.58-9.19 12.38 0 21.58 9.19 9.19 9.2 9.19 21.58 0 12.39-9.19 21.58Q492.38-240 480-240Zm-160 0q-12.38 0-21.58-9.19-9.19-9.19-9.19-21.58 0-12.38 9.19-21.58 9.2-9.19 21.58-9.19 12.38 0 21.58 9.19 9.19 9.2 9.19 21.58 0 12.39-9.19 21.58Q332.38-240 320-240Zm320 0q-12.38 0-21.58-9.19-9.19-9.19-9.19-21.58 0-12.38 9.19-21.58 9.2-9.19 21.58-9.19 12.38 0 21.58 9.19 9.19 9.2 9.19 21.58 0 12.39-9.19 21.58Q652.38-240 640-240Z"></svg>`
  }, {
    uri: "icon-cancel",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m336-307.69 144-144 144 144L652.31-336l-144-144 144-144L624-652.31l-144 144-144-144L307.69-624l144 144-144 144L336-307.69ZM480.13-120q-74.67 0-140.41-28.34-65.73-28.34-114.36-76.92-48.63-48.58-76.99-114.26Q120-405.19 120-479.87q0-74.67 28.34-140.41 28.34-65.73 76.92-114.36 48.58-48.63 114.26-76.99Q405.19-840 479.87-840q74.67 0 140.41 28.34 65.73 28.34 114.36 76.92 48.63 48.58 76.99 114.26Q840-554.81 840-480.13q0 74.67-28.34 140.41-28.34 65.73-76.92 114.36-48.58 48.63-114.26 76.99Q554.81-120 480.13-120Zm-.13-40q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"></svg>`
  }, {
    uri: "icon-check",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M382-267.69 183.23-466.46 211.77-495 382-324.77 748.23-691l28.54 28.54L382-267.69Z"></svg>`
  }, {
    uri: "icon-chevron-left",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M560-267.69 347.69-480 560-692.31 588.31-664l-184 184 184 184L560-267.69Z"></svg>`
  }, {
    uri: "icon-chevron-right",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m531.69-480-184-184L376-692.31 588.31-480 376-267.69 347.69-296l184-184Z"></svg>`
  }, {
    uri: "icon-close",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M256-227.69 227.69-256l224-224-224-224L256-732.31l224 224 224-224L732.31-704l-224 224 224 224L704-227.69l-224-224-224 224Z"></svg>`
  }, {
    uri: "icon-copy",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M364.62-280q-27.62 0-46.12-18.5Q300-317 300-344.62v-430.76q0-27.62 18.5-46.12Q337-840 364.62-840h310.76q27.62 0 46.12 18.5Q740-803 740-775.38v430.76q0 27.62-18.5 46.12Q703-280 675.38-280H364.62Zm0-40h310.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-430.76q0-9.24-7.69-16.93-7.69-7.69-16.93-7.69H364.62q-9.24 0-16.93 7.69-7.69 7.69-7.69 16.93v430.76q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69Zm-120 160q-27.62 0-46.12-18.5Q180-197 180-224.61v-470.77h40v470.77q0 9.23 7.69 16.92 7.69 7.69 16.93 7.69h350.76v40H244.62ZM340-320v-480 480Z"></svg>`
  }, {
    uri: "icon-cut",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m775.38-138.46-292.3-292.31L358.31-306q8.77 15 12.92 31.62 4.15 16.61 4.15 34.38 0 54.58-38.84 93.44-38.84 38.87-93.38 38.87-54.54 0-93.47-38.84-38.92-38.85-38.92-93.39t38.86-93.46q38.87-38.93 93.45-38.93 17.77 0 34.38 4.16 16.62 4.15 31.62 12.92L433.85-480 309.08-604.77q-15 8.77-31.62 12.92-16.61 4.16-34.38 4.16-54.58 0-93.45-38.84-38.86-38.85-38.86-93.39t38.84-93.46q38.84-38.93 93.39-38.93 54.54 0 93.46 38.87 38.92 38.86 38.92 93.44 0 17.77-4.15 34.38Q367.08-669 358.31-654l490.92 490.92v24.62h-73.85ZM584.62-532.31l-49.24-49.23 240-240h73.85v24.62L584.62-532.31Zm-341.54-95.38q38.07 0 65.19-27.12 27.11-27.11 27.11-65.19t-27.11-65.19q-27.12-27.12-65.19-27.12-38.08 0-65.2 27.12-27.11 27.11-27.11 65.19t27.11 65.19q27.12 27.12 65.2 27.12Zm240 147.69Zm-240 332.31q38.07 0 65.19-27.12 27.11-27.11 27.11-65.19t-27.11-65.19q-27.12-27.12-65.19-27.12-38.08 0-65.2 27.12-27.11 27.11-27.11 65.19t27.11 65.19q27.12 27.12 65.2 27.12Z"></svg>`
  }, {
    uri: "icon-day",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480-360q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm0 40q-66.85 0-113.42-46.58Q320-413.15 320-480t46.58-113.42Q413.15-640 480-640t113.42 46.58Q640-546.85 640-480t-46.58 113.42Q546.85-320 480-320ZM200-460H60v-40h140v40Zm700 0H760v-40h140v40ZM460-760v-140h40v140h-40Zm0 700v-140h40v140h-40ZM269.85-663.85l-86.39-83.92 27.77-29.77 84.46 85.39-25.84 28.3Zm478.92 481.39-84.69-85.62 26.07-28.07 86.39 83.92-27.77 29.77Zm-84.92-507.69 83.92-86.39 29.77 27.77-85.39 84.46-28.3-25.84ZM182.46-211.23l85.62-84.69 26.54 26.07-83.16 87.16-29-28.54ZM480-480Z"></svg>`
  }, {
    uri: "icon-delete",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M304.62-160q-26.85 0-45.74-18.88Q240-197.77 240-224.62V-720h-40v-40h160v-30.77h240V-760h160v40h-40v495.38q0 27.62-18.5 46.12Q683-160 655.38-160H304.62ZM680-720H280v495.38q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92h350.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93V-720ZM392.31-280h40v-360h-40v360Zm135.38 0h40v-360h-40v360ZM280-720v520-520Z"></svg>`
  }, {
    uri: "icon-download",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480-336.92 338.46-478.46l28.31-28.77L460-414v-346h40v346l93.23-93.23 28.31 28.77L480-336.92ZM264.62-200q-27.62 0-46.12-18.5Q200-237 200-264.62v-96.92h40v96.92q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69h430.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-96.92h40v96.92q0 27.62-18.5 46.12Q723-200 695.38-200H264.62Z"></svg>`
  }, {
    uri: "icon-downloading",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M439.77-122q-68.31-7.23-126.5-38.27-58.19-31.04-100.81-79.15-42.61-48.12-66.65-110.2-24.04-62.07-24.04-130.61 0-138.85 90.96-241.19 90.96-102.35 228.04-117.04v40q-120.23 17-199.62 107.11-79.38 90.12-79.38 211.12t79 211.11q79 90.12 199 107.12v40Zm40-185.69L307.23-480.46 335.77-509l124 124v-267.31h40V-385l123.77-123.77L652.08-480 479.77-307.69Zm40 185.69v-40q43-6 82.5-21.85 39.5-15.84 73.5-42.61l30.31 28.77q-41.62 30.84-88.7 49.5-47.07 18.65-97.61 26.19Zm158-610.46q-35-26-74.5-43t-82.5-23v-40q50.54 6.77 97.23 25.81 46.69 19.03 88.08 49.88l-28.31 30.31Zm84.31 476.77-28.31-28.54q26-34 42-73.5t22-82.5h40.46q-6.46 50.54-25.77 97.73-19.31 47.19-50.38 86.81Zm35.69-264.54q-6-43-22-82.5t-42-73.5l29.85-30.08q29.53 41.16 48.3 88.35 18.77 47.19 26.31 97.73h-40.46Z"></svg>`
  }, {
    uri: "icon-download-done",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M382-352.31 198.85-535.46 227.38-564 382-409.38 732.62-760l28.53 28.54L382-352.31ZM240-200v-40h480v40H240Z"></svg>`
  }, {
    uri: "icon-dropdown",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480-387.69 327.69-540h304.62L480-387.69Z"></svg>`
  }, {
    uri: "icon-edit",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M200-200h43.92l427.93-427.92-43.93-43.93L200-243.92V-200Zm-40 40v-100.77l527.23-527.77q6.15-5.48 13.57-8.47 7.43-2.99 15.49-2.99t15.62 2.54q7.55 2.54 13.94 9.15l42.69 42.93q6.61 6.38 9.04 14 2.42 7.63 2.42 15.25 0 8.13-2.74 15.56-2.74 7.42-8.72 13.57L260.77-160H160Zm600.77-556.31-44.46-44.46 44.46 44.46ZM649.5-649.5l-21.58-22.35 43.93 43.93-22.35-21.58Z"></svg>`
  }, {
    uri: "icon-file",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M340-260h280v-40H340v40Zm0-160h280v-40H340v40Zm-75.38 300q-27.62 0-46.12-18.5Q200-157 200-184.62v-590.76q0-27.62 18.5-46.12Q237-840 264.62-840H580l180 180v475.38q0 27.62-18.5 46.12Q723-120 695.38-120H264.62ZM560-640v-160H264.62q-9.24 0-16.93 7.69-7.69 7.69-7.69 16.93v590.76q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69h430.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93V-640H560ZM240-800v160-160 640-640Z"></svg>`
  }, {
    uri: "icon-file-tree",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M620-140v-120H460v-400H340v120H100v-280h240v120h280v-120h240v280H620v-120H500v360h120v-120h240v280H620ZM140-780v200-200Zm520 400v200-200Zm0-400v200-200Zm0 200h160v-200H660v200Zm0 400h160v-200H660v200ZM140-580h160v-200H140v200Z"></svg>`
  }, {
    uri: "icon-filter",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M470.77-200q-13.15 0-21.96-8.81T440-230.77v-223.08L224.15-726.77q-8.07-10.77-2.19-22Q227.85-760 240.77-760h478.46q12.92 0 18.81 11.23 5.88 11.23-2.19 22L520-453.85v223.08q0 13.15-8.81 21.96T489.23-200h-18.46ZM480-468l198-252H282l198 252Zm0 0Z"></svg>`
  }, {
    uri: "icon-flag",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M240-140v-620h287.69l16 80H760v320H552.31l-16-80H280v300h-40Zm260-420Zm86 160h134v-240H510l-16-80H280v240h290l16 80Z"></svg>`
  }, {
    uri: "icon-folder",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M184.62-200q-27.62 0-46.12-18.5Q120-237 120-264.62v-430.76q0-27.62 18.5-46.12Q157-760 184.62-760h199.23l80 80h311.53q27.62 0 46.12 18.5Q840-643 840-615.38v350.76q0 27.62-18.5 46.12Q803-200 775.38-200H184.62Zm0-40h590.76q10.77 0 17.7-6.92 6.92-6.93 6.92-17.7v-350.76q0-10.77-6.92-17.7-6.93-6.92-17.7-6.92H447.77l-80-80H184.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v430.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92ZM160-240v-480 480Z"></svg>`
  }, {
    uri: "icon-folder-new",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M580-340h40v-80h80v-40h-80v-80h-40v80h-80v40h80v80ZM184.62-200q-27.62 0-46.12-18.5Q120-237 120-264.62v-430.76q0-27.62 18.5-46.12Q157-760 184.62-760h199.23l80 80h311.53q27.62 0 46.12 18.5Q840-643 840-615.38v350.76q0 27.62-18.5 46.12Q803-200 775.38-200H184.62Zm0-40h590.76q10.77 0 17.7-6.92 6.92-6.93 6.92-17.7v-350.76q0-10.77-6.92-17.7-6.93-6.92-17.7-6.92H447.77l-80-80H184.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v430.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92ZM160-240v-480 480Z"></svg>`
  }, {
    uri: "icon-folder-open",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M180-200q-25.31 0-42.65-17.35Q120-234.69 120-260v-435.38q0-25.31 19.65-44.97Q159.31-760 184.62-760h199.23l80 80h311.53q20.7 0 36.12 11.19 15.42 11.19 21.58 28.81H447.77l-80-80H184.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v430.76q0 8.47 4.23 13.85 4.23 5.39 11.15 9.23L266-544.62h648.62l-90.7 302.24q-5.69 19.07-21.8 30.73Q786-200 766.15-200H180Zm37.08-40h564.46l78.92-264.62H296L217.08-240Zm0 0L296-504.62 217.08-240ZM160-640v-80 80Z"></svg>`
  }, {
    uri: "icon-gear",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m405.38-120-14.46-115.69q-19.15-5.77-41.42-18.16-22.27-12.38-37.88-26.53L204.92-235l-74.61-130 92.23-69.54q-1.77-10.84-2.92-22.34-1.16-11.5-1.16-22.35 0-10.08 1.16-21.19 1.15-11.12 2.92-25.04L130.31-595l74.61-128.46 105.93 44.61q17.92-14.92 38.77-26.92 20.84-12 40.53-18.54L405.38-840h149.24l14.46 116.46q23 8.08 40.65 18.54 17.65 10.46 36.35 26.15l109-44.61L829.69-595l-95.31 71.85q3.31 12.38 3.7 22.73.38 10.34.38 20.42 0 9.31-.77 19.65-.77 10.35-3.54 25.04L827.92-365l-74.61 130-107.23-46.15q-18.7 15.69-37.62 26.92-18.92 11.23-39.38 17.77L554.62-120H405.38ZM440-160h78.23L533-268.31q30.23-8 54.42-21.96 24.2-13.96 49.27-38.27L736.46-286l39.77-68-87.54-65.77q5-17.08 6.62-31.42 1.61-14.35 1.61-28.81 0-15.23-1.61-28.81-1.62-13.57-6.62-29.88L777.77-606 738-674l-102.08 42.77q-18.15-19.92-47.73-37.35-29.57-17.42-55.96-23.11L520-800h-79.77l-12.46 107.54q-30.23 6.46-55.58 20.81-25.34 14.34-50.42 39.42L222-674l-39.77 68L269-541.23q-5 13.46-7 29.23t-2 32.77q0 15.23 2 30.23t6.23 29.23l-86 65.77L222-286l99-42q23.54 23.77 48.88 38.12 25.35 14.34 57.12 22.34L440-160Zm38.92-220q41.85 0 70.93-29.08 29.07-29.07 29.07-70.92t-29.07-70.92Q520.77-580 478.92-580q-42.07 0-71.04 29.08-28.96 29.07-28.96 70.92t28.96 70.92Q436.85-380 478.92-380ZM480-480Z"></svg>`
  }, {
    uri: "icon-grid",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M160-520v-280h280v280H160Zm0 360v-280h280v280H160Zm360-360v-280h280v280H520Zm0 360v-280h280v280H520ZM200-560h200v-200H200v200Zm360 0h200v-200H560v200Zm0 360h200v-200H560v200Zm-360 0h200v-200H200v200Zm360-360Zm0 160Zm-160 0Zm0-160Z"></svg>`
  }, {
    uri: "icon-group",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M103.85-215.38v-65.85q0-27.85 14.42-47.89 14.42-20.03 38.76-32.02 52.05-24.78 103.35-39.51 51.31-14.73 123.47-14.73 72.15 0 123.46 14.73 51.31 14.73 103.35 39.51 24.34 11.99 38.76 32.02 14.43 20.04 14.43 47.89v65.85h-560Zm640 0v-67.7q0-34.77-14.08-65.64-14.07-30.87-39.92-52.97 29.46 6 56.77 16.65 27.3 10.66 54 23.96 26 13.08 40.77 33.47 14.76 20.4 14.76 44.53v67.7h-112.3Zm-360-289.24q-49.5 0-84.75-35.25t-35.25-84.75q0-49.5 35.25-84.75t84.75-35.25q49.5 0 84.75 35.25t35.25 84.75q0 49.5-35.25 84.75t-84.75 35.25Zm290.77-120q0 49.5-35.25 84.75t-84.75 35.25q-2.54 0-6.47-.57-3.92-.58-6.46-1.27 20.33-24.9 31.24-55.24 10.92-30.34 10.92-63.01t-11.43-62.44q-11.42-29.77-30.73-55.62 3.23-1.15 6.46-1.5 3.23-.35 6.47-.35 49.5 0 84.75 35.25t35.25 84.75ZM143.85-255.38h480v-25.85q0-14.08-7.04-24.62-7.04-10.53-25.27-20.15-44.77-23.92-94.39-36.65-49.61-12.73-113.3-12.73-63.7 0-113.31 12.73-49.62 12.73-94.39 36.65-18.23 9.62-25.27 20.15-7.03 10.54-7.03 24.62v25.85Zm240-289.24q33 0 56.5-23.5t23.5-56.5q0-33-23.5-56.5t-56.5-23.5q-33 0-56.5 23.5t-23.5 56.5q0 33 23.5 56.5t56.5 23.5Zm0 289.24Zm0-369.24Z"></svg>`
  }, {
    uri: "icon-heart",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m480-173.85-30.31-27.38q-97.92-89.46-162-153.15-64.07-63.7-101.15-112.35-37.08-48.65-51.81-88.04Q120-594.15 120-634q0-76.31 51.85-128.15Q223.69-814 300-814q52.77 0 99 27t81 78.54Q514.77-760 561-787q46.23-27 99-27 76.31 0 128.15 51.85Q840-710.31 840-634q0 39.85-14.73 79.23-14.73 39.39-51.81 88.04-37.08 48.65-100.77 112.35Q609-290.69 510.31-201.23L480-173.85Zm0-54.15q96-86.77 158-148.65 62-61.89 98-107.39t50-80.61q14-35.12 14-69.35 0-60-40-100t-100-40q-47.77 0-88.15 27.27-40.39 27.27-72.31 82.11h-39.08q-32.69-55.61-72.69-82.5Q347.77-774 300-774q-59.23 0-99.62 40Q160-694 160-634q0 34.23 14 69.35 14 35.11 50 80.61t98 107q62 61.5 158 149.04Zm0-273Z"></svg>`
  }, {
    uri: "icon-help",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M481.12-270.77q13.26 0 22.38-9.16t9.12-22.42q0-13.27-9.16-22.38-9.16-9.12-22.43-9.12-13.26 0-22.38 9.16-9.11 9.16-9.11 22.43 0 13.26 9.16 22.38 9.16 9.11 22.42 9.11Zm-20.66-132.46h38.62q1.54-26.08 9.8-42.39 8.27-16.3 34.04-41.61 26.77-26.77 39.85-47.96 13.08-21.19 13.08-49.06 0-47.29-33.23-75.37-33.23-28.07-78.62-28.07-43.15 0-73.27 23.46-30.11 23.46-44.11 53.92l36.76 15.23q9.62-21.84 27.5-38.61 17.89-16.77 51.58-16.77 38.92 0 56.85 21.34 17.92 21.35 17.92 46.97 0 20.77-11.23 37.11-11.23 16.35-29.23 32.89-34.77 32.07-45.54 54.38-10.77 22.31-10.77 54.54ZM480.13-120q-74.67 0-140.41-28.34-65.73-28.34-114.36-76.92-48.63-48.58-76.99-114.26Q120-405.19 120-479.87q0-74.67 28.34-140.41 28.34-65.73 76.92-114.36 48.58-48.63 114.26-76.99Q405.19-840 479.87-840q74.67 0 140.41 28.34 65.73 28.34 114.36 76.92 48.63 48.58 76.99 114.26Q840-554.81 840-480.13q0 74.67-28.34 140.41-28.34 65.73-76.92 114.36-48.58 48.63-114.26 76.99Q554.81-120 480.13-120Zm-.13-40q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"></svg>`
  }, {
    uri: "icon-history",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M478.46-160q-121.84 0-212.42-79.58Q175.46-319.15 161.23-440h40.46Q218-336.77 295.73-268.38 373.46-200 478.46-200q117 0 198.5-81.5t81.5-198.5q0-117-81.5-198.5T478.46-760q-62.08 0-116.69 26.23-54.62 26.23-96.39 72.23h99.24v40H198.46v-166.15h40v95.54q46.39-50.93 108.73-79.39Q409.54-800 478.46-800q66.54 0 124.73 25.04t101.69 68.54q43.5 43.5 68.54 101.69 25.04 58.19 25.04 124.73t-25.04 124.73q-25.04 58.19-68.54 101.69-43.5 43.5-101.69 68.54Q545-160 478.46-160Zm128.16-165.85L460.77-471.69V-680h40v191.69l134.15 134.16-28.3 28.3Z"></svg>`
  }, {
    uri: "icon-home",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M240-200h147.69v-235.38h184.62V-200H720v-360L480-741.54 240-560v360Zm-40 40v-420l280-211.54L760-580v420H532.31v-235.38H427.69V-160H200Zm280-310.77Z"></svg>`
  }, {
    uri: "icon-info",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M460-300h40v-220h-40v220Zm20-276.92q10.46 0 17.54-7.08 7.08-7.08 7.08-17.54 0-10.46-7.08-17.54-7.08-7.07-17.54-7.07-10.46 0-17.54 7.07-7.08 7.08-7.08 17.54 0 10.46 7.08 17.54 7.08 7.08 17.54 7.08Zm.13 456.92q-74.67 0-140.41-28.34-65.73-28.34-114.36-76.92-48.63-48.58-76.99-114.26Q120-405.19 120-479.87q0-74.67 28.34-140.41 28.34-65.73 76.92-114.36 48.58-48.63 114.26-76.99Q405.19-840 479.87-840q74.67 0 140.41 28.34 65.73 28.34 114.36 76.92 48.63 48.58 76.99 114.26Q840-554.81 840-480.13q0 74.67-28.34 140.41-28.34 65.73-76.92 114.36-48.58 48.63-114.26 76.99Q554.81-120 480.13-120Zm-.13-40q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"></svg>`
  }, {
    uri: "icon-label",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M184.62-200q-26.66 0-45.64-18.98T120-264.62v-430.76q0-26.66 18.98-45.64T184.62-760h408.46q15.34 0 29.07 6.66t22.62 18.42L840-480 644.77-225.08q-8.89 11.76-22.62 18.42-13.73 6.66-29.07 6.66H184.62Zm0-40h408.46q6.15 0 11.15-2.31t8.85-6.92L790-480 613.08-710.77q-3.85-4.61-8.85-6.92-5-2.31-11.15-2.31H184.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v430.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92Zm204.61-240Z"></svg>`
  }, {
    uri: "icon-login",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M479.23-160v-40h256.15q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-510.76q0-9.24-7.69-16.93-7.69-7.69-16.93-7.69H479.23v-40h256.15q27.62 0 46.12 18.5Q800-763 800-735.38v510.76q0 27.62-18.5 46.12Q763-160 735.38-160H479.23Zm-28.46-178.46-28.08-28.77L515.46-460H160v-40h355.46l-92.77-92.77 28.08-28.77L592.31-480 450.77-338.46Z"></svg>`
  }, {
    uri: "icon-logout",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M224.62-160q-27.62 0-46.12-18.5Q160-197 160-224.62v-510.76q0-27.62 18.5-46.12Q197-800 224.62-800h256.15v40H224.62q-9.24 0-16.93 7.69-7.69 7.69-7.69 16.93v510.76q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69h256.15v40H224.62Zm433.84-178.46-28.08-28.77L723.15-460H367.69v-40h355.46l-92.77-92.77 28.08-28.77L800-480 658.46-338.46Z"></svg>`
  }, {
    uri: "icon-menu",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M160-269.23v-40h640v40H160ZM160-460v-40h640v40H160Zm0-190.77v-40h640v40H160Z"></svg>`
  }, {
    uri: "icon-more-h",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M258.46-440q-16.5 0-28.25-11.75T218.46-480q0-16.5 11.75-28.25T258.46-520q16.5 0 28.25 11.75T298.46-480q0 16.5-11.75 28.25T258.46-440ZM480-440q-16.5 0-28.25-11.75T440-480q0-16.5 11.75-28.25T480-520q16.5 0 28.25 11.75T520-480q0 16.5-11.75 28.25T480-440Zm221.54 0q-16.5 0-28.25-11.75T661.54-480q0-16.5 11.75-28.25T701.54-520q16.5 0 28.25 11.75T741.54-480q0 16.5-11.75 28.25T701.54-440Z"></svg>`
  }, {
    uri: "icon-more-v",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480-218.46q-16.5 0-28.25-11.75T440-258.46q0-16.5 11.75-28.25T480-298.46q16.5 0 28.25 11.75T520-258.46q0 16.5-11.75 28.25T480-218.46ZM480-440q-16.5 0-28.25-11.75T440-480q0-16.5 11.75-28.25T480-520q16.5 0 28.25 11.75T520-480q0 16.5-11.75 28.25T480-440Zm0-221.54q-16.5 0-28.25-11.75T440-701.54q0-16.5 11.75-28.25T480-741.54q16.5 0 28.25 11.75T520-701.54q0 16.5-11.75 28.25T480-661.54Z"></svg>`
  }, {
    uri: "icon-night",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M482.31-160q-133.34 0-226.67-93.33-93.33-93.34-93.33-226.67 0-121.54 79.23-210.77t196.15-105.38q3.23 0 6.35.23 3.11.23 6.11.69-20.23 28.23-32.03 62.81-11.81 34.57-11.81 72.42 0 106.67 74.66 181.33Q555.64-404 662.31-404q38.07 0 72.54-11.81 34.46-11.81 61.92-32.04.46 3 .69 6.12.23 3.11.23 6.35-15.38 116.92-104.61 196.15T482.31-160Zm0-40q88 0 158-48.5t102-126.5q-20 5-40 8t-40 3q-123 0-209.5-86.5T366.31-660q0-20 3-40t8-40q-78 32-126.5 102t-48.5 158q0 116 82 198t198 82Zm-10-270Z"></svg>`
  }, {
    uri: "icon-open-in-new",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M224.62-160q-27.62 0-46.12-18.5Q160-197 160-224.62v-510.76q0-27.62 18.5-46.12Q197-800 224.62-800h224.61v40H224.62q-9.24 0-16.93 7.69-7.69 7.69-7.69 16.93v510.76q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69h510.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-224.61h40v224.61q0 27.62-18.5 46.12Q763-160 735.38-160H224.62Zm164.92-201.23-28.31-28.31L731.69-760H560v-40h240v240h-40v-171.69L389.54-361.23Z"></svg>`
  }, {
    uri: "icon-play",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M360-272.31v-415.38L686.15-480 360-272.31ZM400-480Zm0 134 211.54-134L400-614v268Z"></svg>`
  }, {
    uri: "icon-power",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480.13-120q-74.67 0-140.41-28.35-65.73-28.35-114.36-76.95-48.63-48.6-76.99-114.3Q120-405.3 120-480q0-74.77 28.04-139.96 28.04-65.19 77.42-114.58l28.31 28.31q-44 44-68.89 101.76Q160-546.72 160-480q0 134 93 227t227 93q134 0 227-93t93-227q0-67-24.88-124.62-24.89-57.61-68.89-101.61l28.31-28.31q49.38 49.39 77.42 114.58T840-479.67q0 74.21-28.34 139.95-28.34 65.73-76.92 114.36-48.58 48.63-114.26 76.99Q554.81-120 480.13-120ZM460-440v-400h40v400h-40Z"></svg>`
  }, {
    uri: "icon-question-mark",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M453.23-338.46q0-54.85 16.81-91.5 16.81-36.66 69.19-82.5 36.39-32.92 54.81-62.5t18.42-66.66q0-53.3-36.73-88.76-36.73-35.47-100.35-35.47-51.76 0-82.5 24.08-30.73 24.08-49.42 59.92l-43-20.15q25.62-50.92 68.54-80.62 42.92-29.69 106.38-29.69 88.85 0 136.89 50.81 48.04 50.81 48.04 118.96 0 43.85-19.19 80.12-19.2 36.27-55.97 68.96-55.15 48.54-69.5 79.19-14.34 30.65-14.34 75.81h-48.08ZM475.38-120q-16.07 0-28.03-11.96-11.97-11.96-11.97-28.04t11.97-28.04Q459.31-200 475.38-200q16.08 0 28.04 11.96T515.38-160q0 16.08-11.96 28.04T475.38-120Z"></svg>`
  }, {
    uri: "icon-redo",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M373.69-240q-78.54 0-134.19-54.54-55.65-54.54-55.65-132.38 0-77.85 55.65-132 55.65-54.16 134.19-54.16h309.69L564.77-731.69 593.08-760 760-593.08 593.08-426.15l-28.31-28.31 118.61-118.62H373.69q-62.23 0-106.04 42.31-43.8 42.31-43.8 103.85 0 61.54 43.8 104.23Q311.46-280 373.69-280h290.16v40H373.69Z"></svg>`
  }, {
    uri: "icon-refresh",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M483.08-200q-117.25 0-198.63-81.34-81.37-81.34-81.37-198.54 0-117.2 81.37-198.66Q365.83-760 483.08-760q71.3 0 133.54 33.88 62.23 33.89 100.3 94.58V-760h40v209.23H547.69v-40h148q-31.23-59.85-87.88-94.54Q551.15-720 483.08-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h42.46Q725.08-310.15 651-255.08 576.92-200 483.08-200Z"></svg>`
  }, {
    uri: "icon-remove",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M240-460v-40h480v40H240Z"></svg>`
  }, {
    uri: "icon-save",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M800-663.08v438.46q0 27.62-18.5 46.12Q763-160 735.38-160H224.62q-27.62 0-46.12-18.5Q160-197 160-224.62v-510.76q0-27.62 18.5-46.12Q197-800 224.62-800h438.46L800-663.08ZM760-646 646-760H224.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v510.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92h510.76q10.77 0 17.7-6.92 6.92-6.93 6.92-17.7V-646ZM480-298.46q33.08 0 56.54-23.46T560-378.46q0-33.08-23.46-56.54T480-458.46q-33.08 0-56.54 23.46T400-378.46q0 33.08 23.46 56.54T480-298.46ZM270.77-569.23h296.92v-120H270.77v120ZM200-646v446-560 114Z"></svg>`
  }, {
    uri: "icon-search",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M779.38-153.85 528.92-404.31q-30 25.54-69 39.54t-78.38 14q-96.1 0-162.67-66.53-66.56-66.53-66.56-162.57 0-96.05 66.53-162.71 66.53-66.65 162.57-66.65 96.05 0 162.71 66.56Q610.77-676.1 610.77-580q0 41.69-14.77 80.69t-38.77 66.69l250.46 250.47-28.31 28.3ZM381.54-390.77q79.61 0 134.42-54.81 54.81-54.8 54.81-134.42 0-79.62-54.81-134.42-54.81-54.81-134.42-54.81-79.62 0-134.42 54.81-54.81 54.8-54.81 134.42 0 79.62 54.81 134.42 54.8 54.81 134.42 54.81Z"></svg>`
  }, {
    uri: "icon-star",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143Zm-61 83.92 49.62-212.54-164.93-142.84 217.23-18.85L480-777.69l85.08 200.38 217.23 18.85-164.93 142.84L667-203.08 480-315.92 293-203.08ZM480-470Z"></svg>`
  }, {
    uri: "icon-support",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M520-149.23 517.69-240H460q-125.08 0-212.54-87.46T160-540q0-125.08 87.46-212.54T460-840q62.54 0 117.12 23.42 54.57 23.43 95.3 64.16t64.16 95.3Q760-602.54 760-540q0 61.15-17.96 117.46-17.96 56.31-49.69 106.46-31.73 50.16-76 92.39-44.27 42.23-96.35 74.46ZM560-226q71-60 115.5-140.5T720-540q0-109-75.5-184.5T460-800q-109 0-184.5 75.5T200-540q0 109 75.5 184.5T460-280h100v54Zm-98.69-111.15q12.38 0 20.92-8.54 8.54-8.54 8.54-20.93 0-12.38-8.54-20.92-8.54-8.54-20.92-8.54-12.39 0-20.93 8.54-8.53 8.54-8.53 20.92 0 12.39 8.53 20.93 8.54 8.54 20.93 8.54Zm-17.46-117h35.38q1.54-24.62 9.46-38.93 7.93-14.3 37.62-44 17.23-17.23 27.31-35.15 10.07-17.92 10.07-41.15 0-43.31-29.88-68.04-29.89-24.73-72.27-24.73-37.08 0-62.85 20.27-25.77 20.26-37.77 48.34l32.93 12.77q8.07-17.77 23.61-32.35 15.54-14.57 44.08-14.57 33.92 0 50.11 18.46 16.2 18.46 16.2 40.31 0 20.07-10.39 33.96-10.38 13.88-26.69 30.19-28.85 25.39-37.89 45.58-9.03 20.19-9.03 49.04ZM460-513Z"></svg>`
  }, {
    uri: "icon-sync",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M186.15-186.15v-40H310l-42.15-41.7q-46.62-45.23-67.23-99.23-20.62-54-20.62-109.38 0-96.39 54.96-174.42Q289.92-728.92 380-762.31v42.46q-72.77 30.62-116.38 96.97Q220-556.54 220-476.46q0 48.84 18.54 94.81 18.54 45.96 57.61 85.03l40.77 40.77v-121.07h40v190.77H186.15ZM580-197.69v-42.46q72.77-30.62 116.38-96.97Q740-403.46 740-483.54q0-48.84-18.54-94.81-18.54-45.96-57.61-85.03l-40.77-40.77v121.07h-40v-190.77h190.77v40H650l42.15 41.7q45.93 45.92 66.89 99.57Q780-538.92 780-483.54q0 96.39-54.96 174.42Q670.08-231.08 580-197.69Z"></svg>`
  }, {
    uri: "icon-undo",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M296.15-240v-40h290.16q62.23 0 106.04-42.69 43.8-42.69 43.8-104.23 0-61.54-43.8-103.85-43.81-42.31-106.04-42.31H276.62l118.61 118.62-28.31 28.31L200-593.08 366.92-760l28.31 28.31-118.61 118.61h309.69q78.54 0 134.19 54.16 55.65 54.15 55.65 132 0 77.84-55.65 132.38Q664.85-240 586.31-240H296.15Z"></svg>`
  }, {
    uri: "icon-upload",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M460-336.92v-346l-93.23 93.23-28.31-28.77L480-760l141.54 141.54-28.31 28.77L500-682.92v346h-40ZM264.62-200q-27.62 0-46.12-18.5Q200-237 200-264.62v-96.92h40v96.92q0 9.24 7.69 16.93 7.69 7.69 16.93 7.69h430.76q9.24 0 16.93-7.69 7.69-7.69 7.69-16.93v-96.92h40v96.92q0 27.62-18.5 46.12Q723-200 695.38-200H264.62Z"></svg>`
  }, {
    uri: "icon-user",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M480-504.62q-49.5 0-84.75-35.25T360-624.62q0-49.5 35.25-84.75T480-744.62q49.5 0 84.75 35.25T600-624.62q0 49.5-35.25 84.75T480-504.62ZM200-215.38v-65.85q0-24.77 14.42-46.35 14.43-21.57 38.81-33.5 56.62-27.15 113.31-40.73 56.69-13.57 113.46-13.57 56.77 0 113.46 13.57 56.69 13.58 113.31 40.73 24.38 11.93 38.81 33.5Q760-306 760-281.23v65.85H200Zm40-40h480v-25.85q0-13.31-8.58-25-8.57-11.69-23.73-19.77-49.38-23.92-101.83-36.65-52.45-12.73-105.86-12.73t-105.86 12.73Q321.69-349.92 272.31-326q-15.16 8.08-23.73 19.77-8.58 11.69-8.58 25v25.85Zm240-289.24q33 0 56.5-23.5t23.5-56.5q0-33-23.5-56.5t-56.5-23.5q-33 0-56.5 23.5t-23.5 56.5q0 33 23.5 56.5t56.5 23.5Zm0-80Zm0 369.24Z"></svg>`
  }, {
    uri: "icon-user-add",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M730-420v-120H610v-40h120v-120h40v120h120v40H770v120h-40Zm-370-84.62q-49.5 0-84.75-35.25T240-624.62q0-49.5 35.25-84.75T360-744.62q49.5 0 84.75 35.25T480-624.62q0 49.5-35.25 84.75T360-504.62ZM80-215.38v-65.85q0-24.77 14.42-46.35 14.43-21.57 38.81-33.5 56.62-27.15 113.31-40.73 56.69-13.57 113.46-13.57 56.77 0 113.46 13.57 56.69 13.58 113.31 40.73 24.38 11.93 38.81 33.5Q640-306 640-281.23v65.85H80Zm40-40h480v-25.85q0-13.31-8.58-25-8.57-11.69-23.73-19.77-49.38-23.92-101.83-36.65-52.45-12.73-105.86-12.73t-105.86 12.73Q201.69-349.92 152.31-326q-15.16 8.08-23.73 19.77-8.58 11.69-8.58 25v25.85Zm240-289.24q33 0 56.5-23.5t23.5-56.5q0-33-23.5-56.5t-56.5-23.5q-33 0-56.5 23.5t-23.5 56.5q0 33 23.5 56.5t56.5 23.5Zm0-80Zm0 369.24Z"></svg>`
  }, {
    uri: "icon-user-circle",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M247.85-260.62q51-36.69 108.23-58.03Q413.31-340 480-340t123.92 21.35q57.23 21.34 108.23 58.03 39.62-41 63.73-96.84Q800-413.31 800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 66.69 24.12 122.54 24.11 55.84 63.73 96.84ZM480.02-460q-50.56 0-85.29-34.71Q360-529.42 360-579.98q0-50.56 34.71-85.29Q429.42-700 479.98-700q50.56 0 85.29 34.71Q600-630.58 600-580.02q0 50.56-34.71 85.29Q530.58-460 480.02-460ZM480-120q-75.31 0-141-28.04t-114.31-76.65Q176.08-273.31 148.04-339 120-404.69 120-480t28.04-141q28.04-65.69 76.65-114.31 48.62-48.61 114.31-76.65Q404.69-840 480-840t141 28.04q65.69 28.04 114.31 76.65 48.61 48.62 76.65 114.31Q840-555.31 840-480t-28.04 141q-28.04 65.69-76.65 114.31-48.62 48.61-114.31 76.65Q555.31-120 480-120Zm0-40q55.31 0 108.85-19.35 53.53-19.34 92.53-52.96-39-31.31-90.23-49.5Q539.92-300 480-300q-59.92 0-111.54 17.81-51.61 17.81-89.84 49.88 39 33.62 92.53 52.96Q424.69-160 480-160Zm0-340q33.69 0 56.85-23.15Q560-546.31 560-580t-23.15-56.85Q513.69-660 480-660t-56.85 23.15Q400-613.69 400-580t23.15 56.85Q446.31-500 480-500Zm0-80Zm0 350Z"></svg>`
  }, {
    uri: "icon-user-gear",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M400-504.62q-49.5 0-84.75-35.25T280-624.62q0-49.5 35.25-84.75T400-744.62q49.5 0 84.75 35.25T520-624.62q0 49.5-35.25 84.75T400-504.62ZM120-215.38v-65.85q0-27.62 13.92-47.77 13.93-20.15 39.31-32.08 48.69-23.69 100.39-39 51.69-15.3 126.38-15.3h9.38q3.7 0 8.93.46-4.16 10.3-6.58 20.19-2.42 9.88-4.65 19.35H400q-67.15 0-117.12 13.76-49.96 13.77-90.57 35.62-18.23 9.62-25.27 20.15-7.04 10.54-7.04 24.62v25.85h252q2.92 9.46 7.15 20.34 4.23 10.89 9.31 19.66H120Zm528.46 19.23-5.84-46.16q-16.62-3.46-31.35-11.65-14.73-8.19-26.5-20.81l-43.39 17.23-16.92-28.77L561.23-314q-6.61-17.08-6.61-35.23t6.61-35.23l-36-29.23 16.92-28.77 42.62 18q11-12.62 26.11-20.42 15.12-7.81 31.74-11.27l5.84-46.16h33.85l5.07 46.16q16.62 3.46 31.74 11.38 15.11 7.92 26.11 20.77l42.62-18.46 16.92 29.23-36 29.23q6.61 16.86 6.61 35.12 0 18.26-6.61 34.88l36.77 27.69-16.92 28.77-43.39-17.23q-11.77 12.62-26.5 20.81t-31.35 11.65l-5.07 46.16h-33.85Zm16.22-80.77q29.86 0 51.05-21.26 21.19-21.26 21.19-51.12 0-29.85-21.26-51.05-21.26-21.19-51.11-21.19-29.86 0-51.05 21.26-21.19 21.26-21.19 51.12 0 29.85 21.26 51.04 21.26 21.2 51.11 21.2ZM400-544.62q33 0 56.5-23.5t23.5-56.5q0-33-23.5-56.5t-56.5-23.5q-33 0-56.5 23.5t-23.5 56.5q0 33 23.5 56.5t56.5 23.5Zm0-80Zm12 369.24Z"></svg>`
  }, {
    uri: "icon-user-remove",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="M644.62-540v-40h200v40h-200ZM360-504.62q-49.5 0-84.75-35.25T240-624.62q0-49.5 35.25-84.75T360-744.62q49.5 0 84.75 35.25T480-624.62q0 49.5-35.25 84.75T360-504.62ZM80-215.38v-65.85q0-24.77 14.42-46.35 14.43-21.57 38.81-33.5 56.62-27.15 113.31-40.73 56.69-13.57 113.46-13.57 56.77 0 113.46 13.57 56.69 13.58 113.31 40.73 24.38 11.93 38.81 33.5Q640-306 640-281.23v65.85H80Zm40-40h480v-25.85q0-13.31-8.58-25-8.57-11.69-23.73-19.77-49.38-23.92-101.83-36.65-52.45-12.73-105.86-12.73t-105.86 12.73Q201.69-349.92 152.31-326q-15.16 8.08-23.73 19.77-8.58 11.69-8.58 25v25.85Zm240-289.24q33 0 56.5-23.5t23.5-56.5q0-33-23.5-56.5t-56.5-23.5q-33 0-56.5 23.5t-23.5 56.5q0 33 23.5 56.5t56.5 23.5Zm0-80Zm0 369.24Z"></svg>`
  }, {
    uri: "icon-wrench",
    f: "svg",
    c: `<svg viewBox="0 -960 960 960"><path d="m712.15-139.69-262-262.46q-22.3 10.3-45.51 16.23-23.21 5.92-49.26 5.92-91.66 0-155.83-64.17-64.17-64.16-64.17-155.83 0-26 5.77-50.04T158-696.15l141.38 139.84 99.7-99.69-138.31-139.85q22.08-11.07 45.42-17.61 23.34-6.54 49.19-6.54 91.67 0 155.84 64.17 64.16 64.16 64.16 155.83 0 27.62-5.53 50.81-5.54 23.19-16.62 43.96l262.46 262q8.93 9.19 8.93 22.21 0 13.02-8.76 21.77l-61.26 61.27q-8.75 8.75-21.14 7.98-12.38-.77-21.31-9.69Zm22.08-35 46.23-46.23-276.77-276.77q15.69-21.54 23.69-48.04 8-26.5 8-54.27 0-73.08-56.57-131.04Q422.23-789 333.69-778l99.39 99.38q9.69 9.7 9.69 22.62 0 12.92-9.69 22.62L322-522.31q-9.69 9.69-22.62 9.69-12.92 0-22.61-9.69l-99.39-99.38q-8.69 97 50.04 149.34Q286.15-420 355.38-420q26.52 0 53.03-7.62 26.51-7.61 49.05-23.84l276.77 276.77ZM472-484.92Z"></svg>`
  }
]);
