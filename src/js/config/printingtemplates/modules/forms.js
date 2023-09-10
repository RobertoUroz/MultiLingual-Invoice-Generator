define(
  [],
  function () {
    "use strict";

    var instance = null;

    class formsFillingPrintingTemplatesUtil {

      /**
       * Default Constructor
       * 
       * 
       * Created by: Roberto Uroz
       */
      constructor() {
      }

      /**
       * Forms logic
       * @param {body DOM} element
       * @param {Object} forms
       */
      fillForms(element, forms) {
        var ocurrence = element.innerHTML.indexOf("{{", 0);
        var end_word, id, replaceString;
        while (ocurrence != -1) {
          end_word = element.innerHTML.indexOf("}}", ocurrence);
          replaceString = element.innerHTML.substring(ocurrence, end_word + 2);
          id = replaceString.replace(/[{}]/g, "");
          var re = new RegExp(replaceString, "g");
          element.innerHTML = element.innerHTML.replace(re, forms[id]);
          ocurrence = element.innerHTML.indexOf("{{", ocurrence);
        }
        return element;
      }

    }
    if (null === instance) {
      instance = new formsFillingPrintingTemplatesUtil();
    }

    return instance;

  }
);