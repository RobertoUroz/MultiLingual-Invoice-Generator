/**
 * @license
 * Copyright (c) 2014, 2020, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 * @ignore
 */
/*
 * Your dashboard ViewModel code goes here
 */
define(['knockout', 'accUtils', 'printingtemplatesengine', 'synchronization', 'utils', 'signature_pad', 'ojs/ojbutton'],
    function (ko, accUtils, printingTemplatesEngine, synchronization, utils, SignaturePad) {

        function DashboardViewModel() {
            const self = this;
            // Below are a set of the ViewModel methods invoked by the oj-module component.
            // Please reference the oj-module jsDoc for additional information.

            self.html_file = "";
            self.json_file = "";
            self.online = false;
            self.creationDocumentStatusMessage = ko.observable("");
            self.synchronizationStatusMessage = ko.observable("");
            self.eSignatureUser = ko.observable("");
            self.isButtonProcessPendingDocumentsEnabled = ko.observable(true);

            setInterval(function () {
                self.online = utils.checkOnlineStatus();
                self.isButtonProcessPendingDocumentsEnabled(self.online);
            }.bind(this), 2_000);

            self.pickFile = function (event) {
                (async () => {
                    const file = await chooser.getFile();
                    console.log(file ? file.name : 'canceled');
                    self.file_content = new TextDecoder("utf-8").decode(file.data).split("PTE_SPLIT_HERE");
                    self.html_file = self.file_content[0];
                    self.json_file = JSON.parse(self.file_content[1]);
                    console.log(self.json_file)
                    await self._PoCSteps();
                })();
            }

            self.processPendingDocuments = function (event) {
                synchronization.processPendingFiles(self.synchronizationStatusMessage);
            }

            self.makeid = function (length) {
                var result = '';
                var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                var charactersLength = characters.length;
                for (var i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * charactersLength));
                }
                return result;
            }

            self._setupESignature = function () {
                self.eSignatureUser(self.parsedESignatures[self.eSignatureElement].name);
                self.clearSignature();
            }

            self.clearSignature = function () {
                self.signaturePad.clear();
            }

            self.saveSignature = function () {
                if (self.signaturePad.isEmpty()) {
                    alert("Please provide a signature first.");
                } else {
                    self.parsedESignatures[self.eSignatureElement]["data"] = self.signaturePad.toDataURL("image/jpeg");
                    self.eSignatureElement = self.eSignatureElement + 1;
                    if (self.eSignatureElement < self.parsedESignatures.length) {
                        self._setupESignature();
                    } else {
                        self._renderPDFDocument();
                    }
                }
            }

            self._renderPDFDocument = async function () {
                //Clear everything related to the e-signatures
                self.eSignatureUser("");
                self.clearSignature();
                self.signaturePad.off();

                //****** Specification of PTE *******//
                const opts = {
                    "html": self.html_file, //html file as string
                    "formFields": JSON.parse(self.json_file.formFields),//specification in this file
                    "tableRows": JSON.parse(self.json_file.tableRows), //specification in this file
                    "eSignatures": self.parsedESignatures, //eSignatures in an object with the key matching the one from the template
                    "checkColumn": self.json_file.checkColumn, //column that has the logic of sum in the table
                    "decimalsInTable": self.json_file.decimalsInTable, //how many decimals for a dynamic table
                    "margins": JSON.parse(self.json_file.margins), //margins of the page, legacy
                    "jsPDFOptions": JSON.parse(self.json_file.jsPDFOptions), //options for jsPDF
                    "iframe_wrapper": document.getElementById("html_to_pdf_measurements"), //wrapper for all calculations for pages, check dashboard.html to set up this iframe
                    "iframe_canvas": document.getElementById("canvas_for_rasterize_html"), //iframe that will wrap the canvas for rasterizeHTML, this prevents of getting the styling from the app.
                    "attachments": JSON.parse(self.json_file.attachments), //array of images in base64
                    "fileName": self.json_file.fileName.substring(self.json_file.fileName.length - 4) === ".pdf" ? self.json_file.fileName : self.json_file.fileName + ".pdf",
                    "creationDocumentStatusMessage": self.creationDocumentStatusMessage,
                    "styleSheet": undefined //cssFile as string for future implementations
                }
                await printingTemplatesEngine.doPrintingTemplate(opts).then(function (pdf_base64) {
                    self.savebase64AsPDF(cordova.file.externalRootDirectory, self.makeid(4) + "_pending" + ".pdf", pdf_base64.replace("data:application/pdf;filename=generated.pdf;base64,", ""), "application/pdf");
                });
                //*******//
            }

            self._PoCSteps = async function () {
                self.parsedESignatures = JSON.parse(self.json_file.eSignatures);
                self.eSignatureElement = 0;
                var eSignatureCanvas = document.getElementById("eSignatureCanvas");
                if (self.signaturePad === undefined) {
                    self.signaturePad = new SignaturePad(eSignatureCanvas, {
                        backgroundColor: 'rgb(255, 255, 255)'
                    });
                }
                else {
                    self.signaturePad.on();
                }
                self._setupESignature();
            }

            self.savebase64AsPDF = function (folderpath, filename, content, contentType) {
                // Convert the base64 string in a Blob
                const DataBlob = utils.b64toBlob(content, contentType);
                window.resolveLocalFileSystemURL(folderpath, function (dir) {
                    dir.getFile(filename, {create: true}, function (file) {
                        file.createWriter(function (fileWriter) {
                            fileWriter.onwrite = function (evt) {
                                self.creationDocumentStatusMessage("");
                                var finalPath = folderpath + filename;
                                cordova.plugins.fileOpener2.open(finalPath, 'application/pdf');
                            }
                            fileWriter.write(DataBlob);
                        }, function () {
                            console.log("Error while writing the pdf in a file");
                        });
                    });
                });
            }


            self.connected = function () {
                accUtils.announce('Dashboard page loaded.', 'assertive');
                document.title = "Dashboard";
                // Implement further logic if needed
            };

            /**
             * Optional ViewModel method invoked after the View is disconnected from the DOM.
             */
            self.disconnected = function () {
                // Implement if needed
            };

            /**
             * Optional ViewModel method invoked after transition to the new View is complete.
             * That includes any possible animation between the old and the new View.
             */
            self.transitionCompleted = function () {
                // Implement if needed
            };
        }

        /*
         * Returns an instance of the ViewModel providing one instance of the ViewModel. If needed,
         * return a constructor for the ViewModel so that the ViewModel is constructed
         * each time the view is displayed.
         */
        return DashboardViewModel;
    }
);
