define(
  ['tables', 'forms', 'margins', 'printingUtils', 'synchronization', 'utils',
    'jspdf', 'dompurify'],
  function (tableUtil, formsUtil, marginsUtil, printingTemplatesUtils, synchronization, utils,
    jspdf, dompurify) {
    "use strict";

    var instance = null;

    class printingTemplatesEngine {

      /**
       * Default Constructor
       *
       *
       * Created by: Roberto Uroz
       */
      constructor() {
      }

      /**
       * Generate a pdf, PTE main function
       * @param {Object} opts
       */
      doPrintingTemplate(opts) {
        const self = this;
        return new Promise(async function (resolve, reject) {
          self.creationDocumentStatusMessage = opts.creationDocumentStatusMessage;

          self.creationDocumentStatusMessage("Generating PDF...");

          var html = printingTemplatesUtils.stringToHTML(opts.html);
          html.body = printingTemplatesUtils.addMissingHeaderAndFooter(html.body);

          var element = html.body;
          var doc = new jspdf.jsPDF(opts.jsPDFOptions);
          //forms logic
          element = formsUtil.fillForms(element, opts.formFields);
          //tables logic
          tableUtil.fillTables(element, opts.tableRows, opts.checkColumn, opts.decimalsInTable, opts.eSignatures);
          //barcode logic
          element = printingTemplatesUtils.createBarCodes(element);
          //eSignature string
          element = printingTemplatesUtils.addESignature(element, opts.eSignatures);
          //maximum width logic
          element.outerHTML = printingTemplatesUtils.setMaximumWidthOfPage(element);
          element.innerHTML = dompurify.sanitize(element.innerHTML);

          var cssText = "overflow: scroll; clear: both; border: 0 none transparent; margin: 0; padding: 0;";
          var wrapper_canvas = printingTemplatesUtils.prepareWrapper(opts.iframe_wrapper, { "height": 5, "width": doc.getPageWidth() }, cssText, true, { "height": 5, "width": doc.getPageWidth() });

          //Styling process
          var styleString = printingTemplatesUtils.processStyling(opts.html, opts.styleSheet);

          //margins
          var pages_divided = await marginsUtil.dividePages(html, doc, wrapper_canvas, styleString);
          if (typeof pages_divided == "string")
            reject(pages_divided);
          element.innerHTML = pages_divided.element.innerHTML;
          //calculate height of attachments
          var pages_attachments = await printingTemplatesUtils.calculatePagesAttachments(opts.attachments, doc, pages_divided.heights);
          var pages_info = {};
          pages_info.totalPages = pages_divided.numberPage.numberPage + pages_attachments;
          element.innerHTML = printingTemplatesUtils.addTotalPages(element, pages_info.totalPages);
          element.innerHTML = dompurify.sanitize(element.innerHTML);

          //check better for errors
          var valid = printingTemplatesUtils.checkErrors(element);
          if (valid.boolean == false)
            return reject(valid.message);
          if (element == undefined || html == undefined || element.innerHTML == undefined)
            return reject("Error with the template, pdf cannot be generated");

          var final_html = dompurify.sanitize(element.innerHTML);

          //prepare wrapper canvas
          wrapper_canvas = printingTemplatesUtils.prepareWrapper(opts.iframe_canvas, { "height": doc.getPageHeight(), "width": doc.getPageWidth() }, cssText, true, { "height": doc.getPageHeight(), "width": doc.getPageWidth() });

          var final_html_DOM = printingTemplatesUtils.stringToHTML(final_html);

          //render pages and attachments
          await printingTemplatesUtils.drawPages(final_html_DOM, html, wrapper_canvas, doc, opts.attachments, pages_divided.heights, pages_info, styleString);

          self.creationDocumentStatusMessage("Saving PDF...");
          const pdf_base64 = await new Promise(function (resolve) {
            const reader = new FileReader();
            reader.onloadend = function () {
              let base64data = reader.result;
              base64data = base64data.replace("data:application/pdf;base64,", "data:application/pdf;filename=generated.pdf;base64,");
              window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function (directoryEntry) {
                directoryEntry.getDirectory("pendingDocuments", {create: true}, function (pendingDirectoryEntry) {
                  pendingDirectoryEntry.getFile(opts.fileName, {create: true}, function (fileEntry) {
                    fileEntry.createWriter(function (fileWriter) {
                      fileWriter.onwriteend = function (e) {
                        //synchronization.startOnlineCheckInterval();
                        return resolve(base64data);
                      };
                      fileWriter.onerror = function (e) {
                        return resolve(base64data);
                      };
                      const blob = utils.b64toBlob(base64data.replace("data:application/pdf;filename=generated.pdf;base64,", ""), "application/pdf");
                      fileWriter.write(blob);
                    });
                  });
                });
              });
            }
            reader.readAsDataURL(doc.output("blob"));
          });
          self.creationDocumentStatusMessage("PDF saved");

          //clean iframes
          printingTemplatesUtils.clean(opts.iframe_wrapper);
          printingTemplatesUtils.clean(opts.iframe_canvas);
          return resolve(pdf_base64);
        });
      }

    }

    if (null === instance) {
      instance = new printingTemplatesEngine();
    }

    return instance;

  }
);
