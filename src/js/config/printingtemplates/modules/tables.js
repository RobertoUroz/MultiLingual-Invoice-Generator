define(
  [],
  function () {
    "use strict";

    var instance = null;

    class tablePrintingTemplateUtil {

      /**
       * Default Constructor
       *
       *
       * Created by: Roberto Uroz
       */
      constructor() {
      }

      /*
       * PUBLIC
       */

      /**
       * @param {BODY DOM} element
       * @param {Object} rows
       * @param {Number} check_total check_total must be correct, otherwise sum will not work
       * @param {Number} TOTAL_DECIMALS
       * @param {Object} eSignatures
       */
      fillTables(element, rows, check_total, TOTAL_DECIMALS, eSignatures) {
        var tables = element.getElementsByTagName("TABLE"), result = {}, sum, id_table;
        for (var i = 0; i < tables.length; i++) {
          id_table = tables[i].id;
          if (id_table.includes("static") && Object.keys(rows).includes(id_table))
            sum = this.addRowsToTableStatic(tables[i], rows[id_table], check_total, TOTAL_DECIMALS);
          else if (id_table.includes("dynamic") && Object.keys(rows).includes(id_table))
            sum = this.addRowsToTable(tables[i], rows[id_table], check_total, TOTAL_DECIMALS);
          else if (eSignatures.type == "object") {
            id_table = id_table.replace(/[\[\]]/g, "");
            if (eSignatures[id_table])
              this.addRowsToeSignature(tables[i], eSignatures[id_table]);
          }
            result[tables[i].id] = sum;
        }
        return result;
      }

      /**
       *
       * @param {TABLE DOM} table
       * @param {Object} eSignatures_regions
       */
      addRowsToeSignature(table, eSignatures_regions) {
        var order = this.getColumnsOrder(table.tHead), blank_cell = 0;
        for (var i = 0; i < table.tHead.rows[0].cells.length; i++)
          if (table.tHead.rows[0].cells[i].innerHTML == "")
            ++blank_cell;
        if (blank_cell == table.tHead.rows[0].cells.length)
          table.deleteTHead();
        this._filleSignatureRow(table, order, eSignatures_regions);
      }

      /**
       * Static tables
       * @param {TABLE DOM} table
       * @param {Object} rows
       * @param {Number} check_total
       * @param {Number} TOTAL_DECIMALS
       */
      addRowsToTableStatic(table, rows, check_total, TOTAL_DECIMALS) {
        var order = this.getColumnsOrder(table.tHead), sum = 0;
        for (var tBody of table.tBodies) {
          if (tBody.rows[0].cells.length == order.length)
            sum = sum + this._fillStaticRow(tBody, rows, order, "static_list");
        }
        sum = Math.ceil(sum * Math.pow(10, TOTAL_DECIMALS)) / Math.pow(10, TOTAL_DECIMALS);
        return sum;
      }

      /**
       * Dynamic Tables
       * @param {TABLE DOM} table
       * @param {Object} rows
       * @param {Number} check_total
       * @param {Number} TOTAL_DECIMALS
       */
      addRowsToTable(table, rows, check_total, TOTAL_DECIMALS) {
        var order = this.getColumnsOrder(table.tHead), sum = 0;
        for (var i = 0; i < Object.keys(rows).length; i++) {
          sum = sum + this._fillRow(table.tBodies[0], Object.values(rows)[i], order, check_total, i);
        }
        sum = Math.ceil(sum * Math.pow(10, TOTAL_DECIMALS)) / Math.pow(10, TOTAL_DECIMALS);
        return sum;
      }

      /**
       * Get order of the columns in tHead
       * @param {tHead DOM} tHead
       */
      getColumnsOrder(tHead) {
        var order = [], end_word, replaceString, ocurrence, id;
        for (var cell of tHead.children[0].cells) {
          ocurrence = cell.innerHTML.indexOf("[[", 0);
          end_word = cell.innerHTML.indexOf("]]", ocurrence);
          replaceString = cell.innerHTML.substring(ocurrence, end_word + 2);
          id = replaceString.replace(/[\[\]]/g, "");
          order.push(id);
          cell.innerHTML = cell.innerHTML.replace(replaceString, "").trim();
        }
        return order;
      }

      /*
       * PRIVATE
       */

      //Fill one row for dynamic tables
      _fillRow(tBody, row, order, check_total, number) {
        var r = tBody.insertRow();
        if (number % 2 == 1)
          r.classList.add("odd");
        else
          r.classList.add("even");
        for (var i = 0; i < order.length; i++) {
          var c = r.insertCell(-1);
          if (row[order[i]] != undefined)
            if (this._isImage(row[order[i]]))
              c.appendChild(this._insertImage(row[order[i]]));
            else
              c.innerHTML = row[order[i]];
        }
        return row[check_total];
      }

      _isImage(image) {
        return (typeof image != undefined && typeof image == "string" && image.startsWith("data:image/"));
      }

      _insertImage(image) {
        var tag = document.createElement("IMG");
        tag.src = image;
        return tag;
      }

      //Fill one row for static tables
      _fillStaticRow(tBody, rows, order, static_list) {
        var index, cells = [], sum = 0;
        for (var i = 0; i < order.length; i++)
          if (order[i] == static_list)
            index = i;
          else if (order[i].includes("column_condition_"))
            cells.push(i);
        for (var row of tBody.rows) {
          for (var i = 0; i < row.cells.length; i++) {
            if (cells.includes(i)) {
              var id = order[i].replace("column_condition_", "");
              if (row.cells[index].innerHTML.trim() in rows[id]) {
                row.cells[i].innerHTML = "\u221a";
                ++sum;
              }
            }
          }
        }
        return sum;
      }

      //Fill the regions for eSignature
      _filleSignatureRow(table, order, eSignatures_regions) {
        var max_signatures = 0;
        for (var region in eSignatures_regions)
          if (max_signatures < eSignatures_regions[region].length)
            max_signatures = eSignatures_regions[region].length;
        for (var signature_line = 0; signature_line < max_signatures; signature_line++) {
          this._insertRoweSignature(table.tBodies[0], order, eSignatures_regions, signature_line);
        }
      }

      //Fill the row for eSignature tables
      _insertRoweSignature(tbody, order, signature_regions, signature_line) {
        var r = tbody.insertRow(-1);
        if (signature_line % 2 == 1)
          r.className = "eSignature_odd";
        else
          r.className = "eSignature_even";
        var region = order[0];
        var c = r.insertCell(-1);
        c.className = "eSignature_cell";
        if (signature_regions[region][signature_line] != undefined) {
          //insert by order
          var column_order = order.slice(1);
          for (var column of column_order){
            switch (column){
              case "firstName":
                if (signature_regions[region][signature_line].firstName)
                  c.innerHTML += '<p class="' + region + '_FName ' + region + ' ' + region + '_' + signature_line + '">' + signature_regions[region][signature_line].firstName + '</p>\n';
                break;
              case "lastName":
                if (signature_regions[region][signature_line].lastName)
                  c.innerHTML += '<p class="' + region + '_LName ' + region + ' ' + region + '_' + signature_line + '">' + signature_regions[region][signature_line].lastName + '</p>\n';
                break;
              case "signature":
                if (signature_regions[region][signature_line].signature)
                  c.innerHTML += '<img class="' + region + '_Signature ' + region + ' ' + region + '_' + signature_line + '" src="' + signature_regions[region][signature_line].signature + '"/>\n';
                break;
              case "signatureDate":
                if (signature_regions[region][signature_line].signatureDate)
                  c.innerHTML += '<p class="' + region + '_Date ' + region + ' ' + region + '_' + signature_line + '">' + signature_regions[region][signature_line].signatureDate + '</p>';
                break;
              default:
                console.log("Tables.js::_insertRoweSignature() " + "Case not understood: " + column);
            }
          }

        }
      }
    }
    if (null === instance) {
      instance = new tablePrintingTemplateUtil ();
    }

    return instance;

  }
);
