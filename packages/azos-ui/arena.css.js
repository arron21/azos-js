/*<FILE_LICENSE>
 * Azos (A to Z Application Operating System) Framework
 * The A to Z Foundation (a.k.a. Azist) licenses this file to you under the MIT license.
 * See the LICENSE file in the project root for more information.
</FILE_LICENSE>*/

import { css } from "./ui.js";

export const ARENA_STYLES = css`

header{
  position: fixed;
  min-width: 360px;
  left: 0px;
  width: 100%;
  top: 0px;
  z-index: 100;
  margin-top: 0px;
  padding-top: 0px;
  background-color: #404040;
  box-shadow: 0px 0px 12px rgba(0,0,0, 0.35);
  color: #d0d0d0;
}

      header .social-buttons{
        position: fixed;
        right: 0px;
        top:  calc(50% - 96px);
        z-index: 500;
        overflow: hidden;
      }

      header .social-buttons a{
        display: block;
      }

      header .social-buttons svg{
        width: 48px; height: 48px;
      }

      header .side-menu{
        display: block;
        position: fixed;
        z-index: 200;
        left: 0;
        top: 0;
        width: 0;
        height: 100vh;
        background:#f09020;
        opacity: 0.95;
        color: #fff;
        transition: 0.5s;
        font-size: 1.5em;
        overflow: hidden;
      }

      header .side-menu_expanded{
        width: 250px;
      }

      header .side-menu .close-button{
        font-size: 1.4em;
        position: absolute;
        top: 2px;
        right: 2px;
        margin-top: -10px;
      }

      header .side-menu a{
        text-decoration:  none;
        color: inherit;
        transition: 0.3s;
      }
      header .side-menu a:hover{
        color: #d8d8d8;
      }

      header .side-menu ul{
        list-style: none;
        padding: 28px 24px 8px 48px;
      }

      header .side-menu li{
        padding: 8px;
      }

      header .menu{
        float: left;
        width: 58px;
        height: 100%;
        display: block;
        background:#f09020;
      }

      header .menu svg{
        display: block;
        margin: 8px auto 8px auto;
        width: 30px;
        height: 30px;

        stroke: #f0f0f0;
        stroke-width: 4px;
      }



      header .title{
        float: left;
        display: block;
        font-size: 1.6rem;
        padding: 6px 2px 0px 8px;
        XXcolor: #dbdbdb;
        color: var(--paper);
        letter-spacing:  -1.5px;
      }


      header .user{
        float: right;
        display: block;
        text-align: right;
        font-size: 0.9rem;
        padding: 20px 8px 0px 4px;
      }

/* ------------------- */

main{
  padding: 40px 16px 16px 16px;
  text-align: justify;
}

/* ------------------- */

footer{
  background-color: #606060;
  color: #aaa;
  padding: 10px;
}

      /*footer .bottom-menu{
      }*/

      footer .bottom-menu a{
        text-decoration:  none;
        color: #a8a8a0;
        transition: 0.3s;
        font-size: 1.1em;
      }
      footer .bottom-menu a:hover{
        color: #e8e8d8;
      }

      footer .bottom-menu ul{
        list-style: none;
        padding: 28px 10px 10px 32px;
      }

      footer .bottom-menu li{
        padding: 2px;
      }

      footer .contact{
        position: relative;
        top: -3em;
        text-align: right;
        font-size: 0.75em;
        opacity: 0.5;
      }

      footer .contact .line{
        display: block;
      }
`;
