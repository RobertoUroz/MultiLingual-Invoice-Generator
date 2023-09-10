define(
  ['printingUtils',
    'rasterizehtml'],
  function (printingTemplatesUtils,
    rasterizehtml) {
    "use strict";

    var instance = null;

    class margins {

      /**
       * Default Constructor
       * 
       * 
       * Created by: Roberto Uroz
       */
      constructor() {
        this.styleString = null;
        this.wrapper = null;
      }

      /*
       * PUBLIC
       */ 

      /**
       * Main Function of margins logic
       * @param {HTML DOM} html
       * @param {jsPDF} jspdf
       * @param {Object} margins
       * @param {Canvas} wrapper
       * @param {String} stylestring
       */
      async dividePages(html, jspdf, wrapper, stylestring) {
        this.styleString = stylestring;
        this.wrapper = wrapper;
        var heights = await this._getHeights(html, jspdf);
        var result;
        var numberPageObj = { "numberPage": 1 };
        var height_template = heights.element + heights.header + heights.footer;
        var check_height = heights.header + heights.footer;
        if (check_height > heights.page_size)
          return this.handleEvents(1);
        else
          if (height_template > heights.page_size) {
            return await this._divideDIVsInPages(html, heights);
          }
          else {
            result = await this.firstHeader(html.getElementById("[[header]]"));
            result = await this.addContent(result.body, html.getElementById("[[content]]"));
            result = await this.addFooter(result.body, html.getElementById("[[footer]]"), heights, numberPageObj);
            result = result.body;
            return { "element": result, "numberPage": numberPageObj, "heights": heights };
          }
      }

      /**
       * Add Header to pdf
       * @param {body DOM} element
       * @param {div DOM} header
       */
      addHeader(element, header) {
        return printingTemplatesUtils.stringToHTML(element.outerHTML + header.outerHTML); // + "<div style=\"padding-top: " + height_br + "px;\"></div>");
      }

      /**
       * Add first header to the pdf
       * @param {DIV DOM} header
       */
      firstHeader(header) {
        return printingTemplatesUtils.stringToHTML(header.outerHTML);// + "<div style=\"padding-top: " + height_br + "px;\"></div>");
      }

      /**
       * Add content of a page to the pdf
       * @param {body DOM} element
       * @param {div DOM} content
       */
      addContent(element, content) {
        if (element.outerHTML.includes("<body>"))
          return printingTemplatesUtils.stringToHTML(element.innerHTML + content.outerHTML);
        else
          return printingTemplatesUtils.stringToHTML(element.outerHTML + content.outerHTML);
      }

      /**
       * Add footer to last page of the pdf
       * @param {body DOM} element
       * @param {div DOM} footer
       * @param {Object} heights
       * @param {Object} numberPage
       */
      async addFooter(element, footer, heights, numberPage) {
        var page_i = element.innerHTML.lastIndexOf("[[header]]");
        page_i = element.innerHTML.lastIndexOf("<div", page_i);
        var wrapper_div = document.createElement("DIV");
        wrapper_div.id = "[[content]]";
        wrapper_div.style = element.children["[[content]]"].style;
        wrapper_div.innerHTML = element.innerHTML.substring(page_i);
        var divs = [wrapper_div];
        var divs_loaded = await this._loadDiv(divs);
        var height_br = heights.page_size - divs_loaded.divs_loaded[0] - heights.footer;
        this._cleanWrapper();
        console.log("height of the br for margin between content and footer: " + height_br);
        return printingTemplatesUtils.stringToHTML(element.outerHTML + footer.outerHTML.replace(/\[\[numberPage\]\]/g, numberPage.numberPage));
      }

      /*
       * PRIVATE
       */ 

      //get the different heights values from the header, content and footer in the pdf
      async _getHeights(html, jspdf, stylestring) {
        var element_hidden = html.getElementById("[[content]]").cloneNode(true);
        var header_hidden = html.getElementById("[[header]]").cloneNode(true);
        var footer_hidden = html.getElementById("[[footer]]").cloneNode(true);
        element_hidden.hidden = footer_hidden.hidden = header_hidden.hidden = false;
        if (footer_hidden.style.paddingBottom.includes("%"))
          footer_hidden.style.paddingBottom = jspdf.getPageHeight() * parseInt(footer_hidden.style.paddingBottom) / 100;
        var divs = [element_hidden, header_hidden, footer_hidden];
        var divs_loaded = await this._loadDiv(divs, stylestring);
        var heights = ({
          "page_size": jspdf.getPageHeight(),
          "page_width": jspdf.getPageWidth(),
          "element": divs_loaded.divs_loaded[0],
          "header": divs_loaded.divs_loaded[1],
          "footer": divs_loaded.divs_loaded[2]
        });
        this._cleanWrapper();
        if (heights.header == undefined)
          heights.header = 0;
        if (heights.footer == undefined)
          heights.footer = 0;
        console.log(heights);
        return heights;
      }

      //Load div to rasterizeHTML
      async _loadDiv(divs) {
        var heights = [], self = this, images = [];
        for (const div of divs) {
          if (div.outerHTML.includes("<body>"))
            console.log("Warning: Body in _loadDiv");
          var div_rasterize = this.styleString + div.outerHTML;
          await new Promise(function (resolve, reject) {
            rasterizehtml.drawHTML(div_rasterize, self.wrapper).then(function (result) {
              heights.push(result.image.height);
              images.push(result);
              return resolve();
            });
          });
        }
        return { "divs_loaded": heights, "images": images };
      }

      //Check the height of page_content
      async _checkHeight(page_content, this_page, new_content, heights) {
        if (new_content == undefined) //going from child or going from the upper levels in the DOM
          page_content.appendChild(this_page);
        else
          new_content.appendChild(this_page);
        var divs = [page_content];
        var divs_loaded = await this._loadDiv(divs);
        var overflowing = divs_loaded.divs_loaded[0] > (heights.page_size - heights.footer - heights.header);
        this._cleanWrapper();
        return overflowing;
      }

      //Divide all the divs of content into pages
      async _divideDIVsInPages(html, heights) {
        var element;
        var numberPage = { "numberPage": 1 };
        var page_content = document.createElement("DIV");
        var content = html.getElementById("[[content]]");
        var header = html.getElementById("[[header]]");
        var footer = html.getElementById("[[footer]]");
        page_content.id = "[[content]]";
        page_content.style = content.style;
        element = this.firstHeader(header).body;
        page_content.style.cssText = content.style.cssText;
        for (var i = 0; i < content.children.length; i++) {
          var child = content.children[i].cloneNode(true);
          //add child
          var overflowing = await this._checkHeight(page_content, child, undefined, heights);
          page_content.appendChild(child);
          if (overflowing) {
            element = await this._divideChildInPages(page_content, header, footer, element, child, heights, numberPage);
          }
        }
        //LAST PAGE
        element = await this.addContent(element, page_content);
        element = element.body;
        element = await this.addFooter(element, footer, heights, numberPage);
        element = element.body;
        return { "element": element, "numberPage": numberPage, "heights": heights };
      }

      //Divide the child that overflows the page between the actual page and next pages
      async _divideChildInPages(page_content, header, footer, element, child, heights, numberPage) {
        var overflowing;
        switch (child.nodeName) {
          case "P":
            do {
              var child_removed = page_content.removeChild(page_content.lastElementChild);
              console.log("Last child is child ? : " + child_removed == child);
              var element_p = await this._dividePBetweenTwoPages(child_removed, page_content, heights);
              page_content.appendChild(element_p.this_page);
              element = this.addContent(element, page_content).body;
              element = await this.addFooter(element, footer, heights, numberPage);
              element = element.body;
              numberPage.numberPage++;
              element = this.addHeader(element, header, heights).body;
              page_content.innerHTML = "";
              overflowing = await this._checkHeight(page_content, element_p.next_page, undefined, heights);
              page_content.appendChild(element_p.next_page);
            } while (overflowing);
            break;
          case "TABLE":
            do {
              var table = page_content.removeChild(page_content.lastElementChild);
              var element_table = await this._divideTableIntoTwo(table, page_content, heights);
              if (element_table.this_page != undefined)
                page_content.appendChild(element_table.this_page);
              element = this.addContent(element, page_content).body;
              element = await this.addFooter(element, footer, heights, numberPage);
              element = element.body;
              numberPage.numberPage++;
              element = this.addHeader(element, header, heights).body;
              page_content.innerHTML = "";
              overflowing = await this._checkHeight(page_content, element_table.next_page, undefined, heights);
              page_content.appendChild(element_table.next_page);
            } while (overflowing);
            break;
          default:
            var child_removed = page_content.removeChild(page_content.lastElementChild);
            element = this.addContent(element, page_content).body;
            element = await this.addFooter(element, footer, heights, numberPage);
            element = element.body;
            numberPage.numberPage++;
            element = this.addHeader(element, header, heights).body;
            page_content.innerHTML = "";
            page_content.appendChild(child_removed);
        }
        return element;
      }

      //Divide P Element between two pages
      async _dividePBetweenTwoPages(text, page_content, heights, new_content) {
        var this_page = document.createElement("P");
        var next_page = document.createElement("P");
        this_page.style.cssText = text.style.cssText;
        next_page.style.cssText = text.style.cssText;
        var i = 0, words = text.innerHTML.split(" "), overflowing = false;
        while (!overflowing && i <= words.length) {
          this_page.innerHTML = this_page.innerHTML + " " + words[i];
          overflowing = await this._checkHeight(page_content, this_page, new_content, heights);
          i++;
        }
        for (var j = i - 1; j < words.length; j++)
          next_page.innerHTML = next_page.innerHTML + " " + words[j];
        this_page.innerHTML = this_page.innerHTML.trim();
        this_page.innerHTML = this_page.innerHTML.substring(0, this_page.innerHTML.lastIndexOf(" "));
        next_page.innerHTML = next_page.innerHTML.trim();
        return { "this_page": this_page, "next_page": next_page };
      }

      //Divide TABLE Element between two pages
      async _divideTableIntoTwo(table, page_content, heights, new_content) {
        var this_page = document.createElement("TABLE");
        var next_page = document.createElement("TABLE");
        var overflowing;
        this_page.style.cssText = next_page.style.cssText = table.style.cssText;
        //copy thead and tfoot
        if (table.tHead != null) {
          this._copyTHead(table, this_page);
          this._copyTHead(table, next_page);
        }
        if (table.tFoot != null) {
          this._copyTFoot(table, this_page);
          this._copyTFoot(table, next_page);
        }
        //Check if there is space only with thead and tfoot
        overflowing = await this._checkHeight(page_content, this_page, new_content, heights);
        if (overflowing)
          return { "this_page": undefined, "next_page": table };
        //first iterate tbodies and then rows
        var tbody = 0, row;
        while (!overflowing && tbody < table.tBodies.length) {
          var tbody_info = table.tBodies[tbody];
          var new_tbody = document.createElement("TBODY");
          new_tbody.style = tbody_info.style;
          this_page.appendChild(new_tbody);
          row = 0;
          while (!overflowing && row < tbody_info.rows.length) {
            this._copyRow(tbody_info.rows[row], new_tbody.insertRow());
            overflowing = await this._checkHeight(page_content, this_page, new_content, heights);
            if (!overflowing)
              row++;
          }
          if (!overflowing)
            tbody++;
        }
        //delete last row from tbody in this page
        new_tbody.removeChild(new_tbody.lastElementChild);
        //tbody where is splitted
        var new_tbody_next_page = document.createElement("TBODY");
        next_page.appendChild(new_tbody_next_page);
        if (tbody <= table.tBodies.length) //check if tbody is bigger than length
          for (var j = row; j < table.tBodies[tbody].rows.length; j++) {
            this._copyRow(table.tBodies[tbody].rows[j], new_tbody_next_page.insertRow());
          }
        //next tbodies
        for (var i = tbody + 1; i < table.tBodies.length; i++) {
          this._copyTBody(table.tBodies[i], next_page.appendChild(document.createElement("TBODY")));
        }
        return { "this_page": this_page, "next_page": next_page };
      }

      //Copy tHead of TABLE
      _copyTHead(table, new_table) {
        var thead = table.tHead;
        let new_thead = new_table.createTHead();
        new_thead.outerHTML = thead.outerHTML;
      }

      //Copy tFoot of TABLE
      _copyTFoot(table, new_table) {
        var tfoot = table.tFoot;
        var new_tfoot = new_table.createTFoot();
        new_tfoot.outerHTML = tfoot.outerHTML;
      }

      //Copy Row of TABLE
      _copyRow(row, new_row) {
        //console.log(row);
        new_row.outerHTML = row.outerHTML;
      }

      //Copy tBody of TABLE
      _copyTBody(tbody, new_tbody) {
        new_tbody.outerHTML = tbody.outerHTML;
      }

      //Clean Canvas
      _cleanWrapper() {
        var ctx = this.wrapper.getContext("2d");
        ctx.clearRect(0, 0, this.wrapper.width, this.wrapper.height);
      }

      //Events handling
      handleEvents(event, details) {
        switch (event) {
          case 1:
            return(event + " Margins, footer and header bigger than the document. Cannot create pdf");
            break;
          case 2:
            return(event + " Something unexpected happened. Please, contact the administrator");
            break;
          default:
            return("Unknown event");
        }
      }

      /*
       * LEGACY CODE (not stable)
       */

      //Divide childs of the page recursively
      _divideChildsRecur(page_content, new_content, info_content, heights, margins, leftovers) { //leftovers must be the next page content
        if (info_content == undefined)
          return undefined;
        var height, child;
        //mirar si es p y if por si es p
        var i = 0;
        //leftovers is next page, will be deleting while the content is being appended
        for (j = 0; j < info_content.children.length; j++)
          leftovers.appendChild(info_content.children[j].cloneNode(true));
        do {
          // REFACTOR: Do not do a for everytime, only go deleting the child and save it so you know which is the next child
          child = leftovers.removeChild(leftovers.firstElementChild);
          overflowing = this._checkHeight(page_content, new_content, child, heights, margins);
          new_content.appendChild(child);
          //Need to add for with the right side

          if (!overflowing)
            i++;
        } while (overflowing && i < info_content.children.length);
        if (overflowing && i < info_content.children.length) {
          //There is no problem with the i + 1 because the precondition is that not all childs can be in the page
          if (child.children.length > 0 && (child.nodeName != "TABLE" && child.nodeName != "P")) {
            child = new_content.removeChild(new_content.lastElementChild);
            var this_page = document.createElement(child.nodeName);
            this_page.style.cssText = child.style.cssText;
            new_content.appendChild(this_page);
            var next_page = document.createElement(child.nodeName);
            next_page.style.cssText = child.style.cssText;
            leftovers.insertBefore(next_page, leftovers.firstElementChild);
            return this._divideChildsRecur(page_content, this_page, child, heights, margins, leftovers);
          }
          else if (child.nodeName == "P") {
            child = new_content.removeChild(new_content.lastElementChild);
            var element_p = this._dividePBetweenTwoPages(child, page_content, heights, margins, new_content);
            new_content.appendChild(element_p.this_page)
            leftovers.insertBefore(element_p.next_page, leftovers.firstElementChild);
            return { "this_page": new_content, "next_page": leftovers };
          }
          else if (child.nodeName == "TABLE") {
            child = new_content.removeChild(new_content.lastElementChild);
            var element_table = this._divideTableIntoTwo(child, page_content, heights, margins, new_content); //Retrieve table from this page and next page
            if (element_table.this_page != undefined)
              new_content.appendChild(element_table.this_page);
            leftovers.insertBefore(element_table.next_page, leftovers.firstElementChild);
            return { "this_page": new_content, "next_page": leftovers };
          }
          else if (child.length <= 0) {
            child = new_content.removeChild(new_content.lastElementChild);
            leftovers.insertBefore(child, leftovers.firstElementChild);
            return { "this_page": new_content, "next_page": leftovers };
          }
          else {
            return this.handleEvents(2);
          }
        }
        else if (i >= info_content.children.length && overflowing) {
          for (var j = 0; j < info_content.children.length; j++)
            new_content.appendChild(info_content.children[j].cloneNode(true));
          leftovers = undefined;
          return { "this_page": new_content, "next_page": leftovers };
        }
        else {
          return this.handleEvents(2);
        }
        //impossible to make the page_content in this page
        return { "this_page": undefined, "next_page": undefined };
      }

    }
    if (null === instance) {
      instance = new margins();
    }

    return instance;

  }
);