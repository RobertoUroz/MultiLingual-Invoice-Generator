define(
    ['jquery', 'utils', 'adapterSynchronization'],
    function ($, utils, adapterSynchronization) {
        "use strict";

        var instance = null;

        class synchronization {

            /**
             * Default Constructor
             *
             *
             * Created by: Roberto Uroz
             */
            constructor() {
                this.onlineCheckInterval = null;
                this.firstTimeOnline = true;
                this.online = false;
                this.accessToken = undefined;
            }

            startOnlineCheckInterval() {
                // Check onine status every 30 seconds
                cordova.plugins.backgroundMode.on("activate", setInterval(this._checkOnlineStatus.bind(this), 2_000));
            }

            stopOnlineCheckInterval() {
                clearInterval(this.onlineCheckInterval);
            }

            _checkOnlineStatus() {
                var self = this;
                self.online = utils.checkOnlineStatus();
                if (self.online) {
                    //TODO: Check if documents and send notification
                    if (self.firstTimeOnline) {
                        self.firstTimeOnline = false;
                        this.processPendingFiles();
                    }
                    // if (this.offline) {
                    //     this.offline = false;
                    //     console.log("Device coming from offline to online");
                    //     this._sendPushNotification();
                    // }
                } else {
                    console.log("Device is offline");
                    // this.offline = true;
                }
            }

            _sendPushNotification() {
                // cordova.plugins.notification.local.on('yes', function (notification, eopts) {
                //     this.processPendingFiles();
                // }.bind(this)).bind(this);
                cordova.plugins.notification.local.schedule({
                    title: "test",
                    text: "text",
                    foreground: true,
                    actions: [
                        {id: 'yes', title: 'Yes'}
                    ]
                });
            }

            processPendingFiles(synchronizationStatusMessage) {
                const self = this;
                self.synchronizationStatusMessage = synchronizationStatusMessage;
                self.synchronizationStatusMessage("Synchronizing pending documents...");
                self.itemsProcessed = 0;

                window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function (directoryEntry) {
                    directoryEntry.getDirectory("pendingDocuments", { create: false }, function(pendingDirectoryEntry) {
                        const directoryReader = pendingDirectoryEntry.createReader();
                        directoryReader.readEntries(function (entries) {
                            entries.forEach(function (entry) {
                                entry.file(function (file) {
                                   const reader = new FileReader();
                                   reader.onloadend = function (e) {
                                       const pdfBase64 = this.result.replace("data:application/pdf;base64,", "data:application/pdf;filename=generated.pdf;base64,");
                                       self._synchronizeToDocumentStorageServer(pdfBase64, entry.name)
                                           .then((result) => {
                                               if (result === "token") {
                                                   self.processPendingFiles(self.synchronizationStatusMessage);
                                               } else {
                                                   self.itemsProcessed++;
                                                   self.moveFile(entry).then(() => {
                                                       if (entries.length === self.itemsProcessed) {
                                                           self.synchronizationStatusMessage("Pending documents synchronized");
                                                       }
                                                   });
                                               }
                                           })
                                           .catch((error) => {
                                               self.synchronizationStatusMessage("Error synchronizing pending documents");
                                           });
                                   };
                                   reader.readAsDataURL(file);
                                });
                            })
                        })
                    })
                }, () => self.synchronizationStatusMessage("Error while synchronizing pending documents"));
            }



            moveFile(entry) {
                return new Promise((resolve, reject) => {
                    var self = this;
                    window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function (directoryEntry) {
                        directoryEntry.getDirectory("synchronizedDocuments", {create: true}, function (syncDirectoryEntry) {
                            entry.moveTo(syncDirectoryEntry, entry.name, function () {
                                console.log("File moved:", entry.name);
                                resolve();
                            }, self.errorCallback)
                        }, self.errorCallback)
                    }, self.errorCallback);
                });
            }

            errorCallback(error) {
                console.error("Error: ", error);
            }

            _synchronizeToDocumentStorageServer(objectData, fileName) {
                var self = this;
                const config = {
                    clientId: '7ek0b1ncqc7gsk0okjc1bk0jip',
                    clientSecret: '',
                    redirectUri: 'https://pte_callback_url',
                    baseUrl: 'https://printingtemplatesengine.auth.eu-north-1.amazoncognito.com',
                    apiGatewayUrl: 'https://9aeldzrcab.execute-api.eu-north-1.amazonaws.com/DEV/pte-roberto'
                }
                return new Promise((resolve, reject) => {
                    if (self._accessTokenIsExpired()) {
                        adapterSynchronization.getAccessToken('aws', config).then(accessToken => {
                            self.accessToken = accessToken;
                            resolve("token");
                        }).catch((e) => reject(e));
                    } else {
                        adapterSynchronization.uploadObject('aws', config, self.accessToken, objectData, fileName).then(() => {
                            resolve("object");
                        }).catch((e) => reject(e));
                    }
                });
            }

            _accessTokenIsExpired() {
                if (this.accessToken === undefined) {
                    return true;
                }
                const payload = this._parseJwt(this.accessToken);
                if (payload.exp * 1000 < Date.now() - 5 * 60 * 1000) {
                    return true;
                }
                return false;
            }

            _parseJwt (token) {
                var base64Url = token.split('.')[1];
                var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                return JSON.parse(jsonPayload);
            }

    }

        if (null === instance) {
            instance = new synchronization();
        }

        return instance;

    }
);