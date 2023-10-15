define(
  ['rasterizehtml', 'jsbarcode'],
  function (rasterizehtml, jsbarcode) {
    "use strict";

    var instance = null;

    class printingTemplatesUtil {

      /**
       * Default Constructor
       * 
       * 
       * Created by: Roberto Uroz
       */
      constructor() {
        this.styleString = null;
      }

      /**
       * Draw all the pages for jsPDF
       * @param {HTML DOM} final_html_document
       * @param {HTML String} html_file_document
       * @param {Canvas DOM} wrapper_canvas
       * @param {jsPDF} doc
       * @param {Object} attachments
       * @param {Object} heights
       * @param {Object} pages_info
       * @param {String} styleString
       */
      async drawPages(final_html_document, html_file_document, wrapper_canvas, doc, attachments, heights, pages_info, styleString) {
        self = this;
        self.styleString = styleString;
        var html = final_html_document.body;
        var page = "";
        for (var div of html.children) {
          if (div.id == "[[footer]]") {
            if (styleString)
              page = styleString + page;
            await new Promise(function (resolve, reject) {
              rasterizehtml.drawHTML(page, wrapper_canvas).then(async function (result) {
                await self._addPage(result, doc, wrapper_canvas);
                await self._addFooter(doc, wrapper_canvas, self.stringToHTML(div.outerHTML), heights, pages_info);
                doc.addPage();
                wrapper_canvas.height = doc.getPageHeight();
                wrapper_canvas.width = doc.getPageWidth();
                wrapper_canvas.style.height = doc.getPageHeight() + "px";
                wrapper_canvas.style.width = doc.getPageWidth() + "px";
                return resolve();
              });
            });
            page = "";
          }
          else {
            page += div.outerHTML;
          }
        }
        if (attachments.length > 0) {
          await this._addAttachments(attachments, doc, wrapper_canvas, html_file_document, heights, pages_info);
        } else {
          doc.deletePage(doc.internal.getNumberOfPages());
        }
      }

      /**
       * Calculate the total pages that attachments will need before inserting them
       * @param {Array} attachments
       * @param {jsPDF} doc
       * @param {Object} heights
       */
      async calculatePagesAttachments(attachments, doc, heights) {
        if (attachments.length > 0) {
          var pageHeight = doc.getPageHeight(), attachments_height = 0;
          for (const attach of attachments) {
            await new Promise(function (resolve, reject) {
              var image = new Image();
              image.src = attach;
              image.onload = function () {
                attachments_height += image.height + 20;
                return resolve();
              }
            });
          }
          var pages = Math.ceil(attachments_height / pageHeight);
          attachments_height += heights.header * pages + heights.footer * pages;
          var pages_diff = Math.ceil(attachments_height / pageHeight);
          while (pages != pages_diff) {
            attachments_height += heights.header * (pages_diff - pages) + heights.footer * (pages_diff - pages);
            pages = pages_diff;
            pages_diff = Math.ceil(attachments_height / pageHeight);
          }
          return pages;
        } else {
          return 0;
        }
      }

      /**
       * Add header and footer blank when there is no header or footer
       * @param {body DOM} body
       */
      addMissingHeaderAndFooter(body) {
        var result = body;
        if (result.outerHTML.indexOf("[[header]]") == -1) {
          var header = document.createElement("DIV");
          header.id = "[[header]]";
          result.appendChild(header);
        }
        if (result.outerHTML.indexOf("[[footer]]") == -1) {
          var footer = document.createElement("DIV");
          footer.id = "[[footer]]";
          result.appendChild(footer);
        }
        return result;
      }

      /**
       * Add total pages for field [[totalPages]]
       * @param {body DOM} element
       * @param {Number} numberOfTotalPages
       */
      addTotalPages(element, numberOfTotalPages) {
        return element.innerHTML.replace(/\[\[totalPages\]\]/g, numberOfTotalPages);
      }

      /**
       * Add today date to the pdf changing the fields with [[currentDate]]
       * @param {body DOM} element
       */
      addTodayDate(element) {
        return element.innerHTML.replace(/\[\[currentDate\]\]/g, dateUtil.getCurrentDate(dateUtil.DF6));
      }

      /**
       * Create barcodes with jsBarcode
       * @param {body DOM} element
       */
      createBarCodes(element) {
        var barcodes = element.getElementsByClassName("[[barcode]]");
        for (var i = 0; i < barcodes.length; i++) {
          var j = barcodes[i];
          jsbarcode(barcodes[i]).init();
        }
        return element;
      }

      /**
       * Add eSignature when the input is an array of strings, not going with regions approach. One eSignature for one field
       * @param {body DOM} element
       * @param {Array} eSignatures
       */
      addESignature(element, eSignatures) {
        for (var i = 0; i < eSignatures.length; i++) {
          var regex = new RegExp("\\[\\[" + eSignatures[i].id + "\\]\\]", "g");
          element.innerHTML = element.innerHTML.replace(regex, eSignatures[i].data);
        }
        return element;
      }

      /**
       * Set the width of the divs [content, header, footer] calculating the padding they have
       * @param {body DOM} element
       */
      setMaximumWidthOfPage(element) {
        for (var child of element.children) {
          var pad_left = parseInt(child.style.paddingLeft);
          pad_left = !pad_left ? 0 : pad_left;
          var pad_right = parseInt(child.style.paddingRight);
          pad_right = !pad_right ? 0 : pad_right;
          var width = 100 - pad_left - pad_right + "%";
          child.outerHTML = child.outerHTML.replace("[[maximumWidth]]", width);
        }
        return element.outerHTML;
      }

      /**
       * Get the styling from input and translates it so PTE can add the styling to the pdf
       * @param {String} html
       * @param {String} stylesheet
       */
      processStyling(html, stylesheet) {
        var styleString;
        if (html.indexOf("<style>") != -1) {
          styleString = html.substring(html.indexOf("<style>"), html.indexOf("</style>") + 8);
          return styleString;
        }
        else if (stylesheet) {
          styleString = styleSheet;
          return styleString;
        }
        return "";
      }

      /**
       * Convert an html string to html DOM object
       * @param {String} str
       */
      stringToHTML(str) {
        var parser = new DOMParser();
        var tmp_str = str.replace(/\n/g, "");
        var doc = parser.parseFromString(tmp_str, 'text/html');
        return doc;
      }

      /**
       * prepare Wrapper height and width and styling, wrapper must be the iframe, if create is true, then create a canvas, if false, only set everything (also canvas) with the width and height told
       * @param {iframe DOM} wrapper
       * @param {Object} iframe_dimensions
       * @param {String} cssText
       * @param {Boolean} create
       * @param {Object} canvas_dimensions
       */
      prepareWrapper(wrapper, iframe_dimensions, cssText, create, canvas_dimensions) {
        wrapper.contentWindow.document.body.style.cssText = cssText;
        wrapper.width = iframe_dimensions.width;
        wrapper.height = iframe_dimensions.height;
        wrapper.contentWindow.document.body.style.height = iframe_dimensions.height + "px";
        wrapper.contentWindow.document.body.style.width = iframe_dimensions.width + "px";
        if (create) {
          var canvas = document.createElement("CANVAS");
          canvas.id = "wrapper_canvas";
          wrapper.contentWindow.document.body.appendChild(canvas);
        }
        var wrapper_canvas = wrapper.contentWindow.document.getElementById("wrapper_canvas");
        wrapper_canvas.width = canvas_dimensions.width;
        wrapper_canvas.height = canvas_dimensions.height;
        wrapper_canvas.style.width = canvas_dimensions.width + "px";
        wrapper_canvas.style.height = canvas_dimensions.height + "px";
        return wrapper_canvas;
      }

      /**
       * Clean the wrapper
       * @param {iframe DOM} wrapper
       */
      clean(wrapper) {
        wrapper.contentWindow.document.documentElement.innerHTML = '';
      }

      //check for errors in the template
      checkErrors(element) {
        if (!element || !element.outerHTML || !element.innerHTML || element == "undefined" || element.outerHTML == "undefined" || element.innerHTML == "undefined")
          return { "bool": false, "message": "Error with the generation of the template, pdf cannot be generated" };
        else
          return { "bool": true, "message": "Correct" };
      }

      /*
       * PRIVATE
       */ 

      //Crop the image if too big to insert it to the document
      _crop(canvas, offsetX, offsetY, width, height) {
        var buffer = document.createElement('canvas');
        var b_ctx = buffer.getContext('2d');
        buffer.width = width;
        buffer.height = height;
        b_ctx.drawImage(canvas, offsetX, offsetY, width, height, 0, 0, buffer.width, buffer.height);
        return buffer.toDataURL("image/png", 1);
      };

      //Render and add the page to the pdf
      async _addPage(result, doc, wrapper_canvas) {
        await new Promise(function (resolve, reject) {
          var pdf = wrapper_canvas.getContext("2d");
          var image = new Image(doc.getPageWidth(), doc.getPageHeight());
          image.src = result.image.src;
          image.onload = function () {
            pdf.drawImage(image, 0, 0);
            var image_data = wrapper_canvas.toDataURL("image/png");
            doc.addImage(image_data, 'png', 0, 0, image.width, image.height);
            pdf.clearRect(0, 0, wrapper_canvas.width, wrapper_canvas.height);
            return resolve();
          }
        });
      }

      //Add all the attachments to the pdf
      async _addAttachments(attachments, doc, wrapper_canvas, html, heights, pages_info) {
        var offset = 0, self = this;
        await self._addHeader(doc, wrapper_canvas, html, heights);
        offset += heights.header;
        for (const attach of attachments) {
          await new Promise(function (resolve, reject) {
            var image = new Image();
            image.src = attach;
            image.onload = async function () {
              offset = await self._addAttachment(image, wrapper_canvas, doc, heights, html, pages_info, offset);
              return resolve();
            }
            image.onerror = function (e) {
              return reject(e);
            }
          });
        }
        await self._addFooter(doc, wrapper_canvas, html, heights, pages_info);
      }

      //Add attachment and all logic of one attachment
      async _addAttachment(image, wrapper_canvas, doc, heights, html, pages_info, offset) {
        var self = this;
        var paddings = self._getPaddings(html, doc);
        self._prepareCanvasAttachment(wrapper_canvas, image, paddings, doc);
        var pageHeight = doc.getPageHeight();
        var imgHeight = wrapper_canvas.height;
        var heightLeft = wrapper_canvas.height;
        //Image too big for actual page
        if (imgHeight + offset > pageHeight - heights.footer) {
          offset = 0;
          await self._addFooter(doc, wrapper_canvas, html, heights, pages_info);
          self._prepareCanvasAttachment(wrapper_canvas, image, paddings, doc);
          //Image fits into new page
          if (imgHeight + offset < pageHeight - heights.footer) {
            offset += heights.header;
            var image_data = self._crop(wrapper_canvas, 0, 0, image.width, image.height);
            doc.addPage();
            await self._addHeader(doc, wrapper_canvas, html, heights);
            doc.addImage(image_data, 'png', paddings.paddingLeftContent, offset, image.width, image.height);
            offset += imgHeight + (pageHeight * 1 / 100);
          } else {
            //Image too large for new page
            while (heightLeft > pageHeight - heights.footer - heights.header) {
              image_data = self._crop(wrapper_canvas, 0, offset, image.width, pageHeight - heights.footer - heights.header);
              doc.addPage();
              await self._addHeader(doc, wrapper_canvas, html, heights);
              doc.addImage(image_data, 'png', paddings.paddingLeftContent, heights.header, image.width, pageHeight - heights.footer - heights.header);
              await self._addFooter(doc, wrapper_canvas, html, heights, pages_info);
              self._prepareCanvasAttachment(wrapper_canvas, image, paddings, doc);
              heightLeft = (heightLeft - pageHeight) + heights.footer + heights.header;
              offset += pageHeight - heights.footer - heights.header;
            }
            if (heightLeft > 0) { //Rest of image fits into page always
              image_data = self._crop(wrapper_canvas, 0, offset, image.width, heightLeft);
              doc.addPage();
              await self._addHeader(doc, wrapper_canvas, html, heights);
              doc.addImage(image_data, 'png', paddings.paddingLeftContent, heights.header, image.width, heightLeft);
              offset = heights.header + heightLeft + (pageHeight * 1 / 100);
            }
          }
        } else { //Image fits into page
          var image_data = self._crop(wrapper_canvas, 0, 0, image.width, image.height);
          doc.addImage(image_data, 'png', paddings.paddingLeftContent, offset, image.width, image.height);
          offset += imgHeight + (pageHeight * 1 / 100);
        }
        return offset;
      }

      //Add the header to the pdf
      async _addHeader(doc, wrapper_canvas, html, heights) {
        self = this;
        await new Promise(function (resolve, reject) {
          wrapper_canvas.height = heights.header;
          wrapper_canvas.style.height = heights.header + "px";
          wrapper_canvas.width = doc.getPageWidth();
          wrapper_canvas.style.width = doc.getPageWidth() + "px";
          var header = html.getElementById("[[header]]").outerHTML;
          header = self.styleString + header;
          rasterizehtml.drawHTML(header, wrapper_canvas).then(async function (result) {
            await self._addHeaderImage(doc, result, wrapper_canvas, heights);
            return resolve();
          });
        });
      }

      //Add the image of the header after rasterizeHTML has rendered it
      async _addHeaderImage(doc, result, wrapper_canvas, heights) {
        await new Promise(function (resolve, reject) {
          var pdf = wrapper_canvas.getContext("2d");
          var image = new Image(doc.getPageWidth(), heights.header);
          image.src = result.image.src;
          image.onload = function () {
            pdf.drawImage(image, 0, 0);
            var image_data = wrapper_canvas.toDataURL("image/png");
            doc.addImage(image_data, 'png', 0, 0, image.width, image.height);
            pdf.clearRect(0, 0, wrapper_canvas.width, wrapper_canvas.height);
            wrapper_canvas.innerHTML = "";
            return resolve();
          }
        });
      }

      //Add the footer to the pdf
      async _addFooter(doc, wrapper_canvas, html, heights, pages_info) {
        self = this;
        await new Promise(function (resolve, reject) {
          var footer = html.getElementById("[[footer]]");
          footer.style.margin = "0px";
          footer = footer.outerHTML;
          wrapper_canvas.height = heights.footer;
          wrapper_canvas.style.height = heights.footer + "px";
          wrapper_canvas.width = doc.getPageWidth();
          wrapper_canvas.style.width = doc.getPageWidth() + "px";
          footer = footer.replace(/\[\[numberPage\]\]/g, doc.internal.getCurrentPageInfo().pageNumber);
          footer = footer.replace(/\[\[totalPages\]\]/g, pages_info.totalPages);
          footer = self.styleString + footer;
          rasterizehtml.drawHTML(footer, wrapper_canvas).then(async function (result) {
            await self._addFooterImage(doc, result, wrapper_canvas, heights);
            return resolve();
          });
        });
      }

      //Add the image of the footer after rasterizeHTML has rendered it
      async _addFooterImage(doc, result, wrapper_canvas, heights) {
        await new Promise(function (resolve, reject) {
          var pdf = wrapper_canvas.getContext("2d");
          var image = new Image(doc.getPageWidth(), result.image.height);
          wrapper_canvas.height = image.height;
          wrapper_canvas.style.height = image.height + "px";
          image.src = result.image.src;
          image.onload = function () {
            pdf.drawImage(image, 0, 0);
            var image_data = wrapper_canvas.toDataURL("image/png");
            doc.addImage(image_data, 'png', 0, doc.getPageHeight() - image.height, image.width, image.height);
            pdf.clearRect(0, 0, wrapper_canvas.width, wrapper_canvas.height);
            wrapper_canvas.innerHTML = "";
            return resolve();
          }
        });
      }

      //prepare canvas for attachments logic
      _prepareCanvasAttachment(wrapper_canvas, image, paddings, doc) {
        //scale image if too big of width
        var scale = self._scaleAttachment(image, doc, paddings);
        wrapper_canvas.width = image.width * scale;
        wrapper_canvas.height = image.height * scale;
        wrapper_canvas.style.width = image.width * scale + "px";
        wrapper_canvas.style.height = image.height * scale + "px";
        var pdf = wrapper_canvas.getContext("2d");
        pdf.scale(scale, scale);
        pdf.drawImage(image, 0, 0);
      }

      _scaleAttachment(image, doc, paddings) {
        var pageWidth = doc.getPageWidth() - paddings.paddingLeftContent - paddings.paddingRightContent;
        if (pageWidth < image.width)
          return pageWidth / image.width;
        return 1;
      }

      _getPaddings(html, doc) {
        var paddingLeftContent, paddingRightContent;
        var tmp_percentage_padding = html.getElementById("[[content]]").style.paddingLeft == false ? "0" : html.getElementById("[[content]]").style.paddingLeft;
        if (tmp_percentage_padding.includes("%"))
          paddingLeftContent = doc.getPageWidth() * parseInt(tmp_percentage_padding) / 100;
        else if (!tmp_percentage_padding)
          paddingLeftContent = 0;
        else
          paddingLeftContent = parseInt(tmp_percentage_padding);
        tmp_percentage_padding = html.getElementById("[[content]]").style.paddingRight == false ? "0" : html.getElementById("[[content]]").style.paddingRight;
        if (tmp_percentage_padding.includes("%"))
          paddingRightContent = doc.getPageWidth() * parseInt(tmp_percentage_padding) / 100;
        else if (!tmp_percentage_padding)
          paddingRightContent = 0;
        else
          paddingRightContent = parseInt(tmp_percentage_padding);
        return { "paddingLeftContent": paddingLeftContent, "paddingRightContent": paddingRightContent };
      }
    }

    if (null === instance) {
      instance = new printingTemplatesUtil();
    }

    return instance;

  }
);