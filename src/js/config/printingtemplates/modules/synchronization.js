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

            processPendingFiles() {
                var self = this;
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
                                               self.moveFile(entry);
                                           })
                                           .catch((error) => {

                                           });

                                   };
                                   reader.readAsDataURL(file);
                                });
                            })
                        })
                    })
                })
            }

            moveFile(entry) {
                var self = this;
                window.resolveLocalFileSystemURL(cordova.file.externalRootDirectory, function (directoryEntry) {
                    directoryEntry.getDirectory("synchronizedDocuments", { create: true }, function (syncDirectoryEntry) {
                        entry.moveTo(syncDirectoryEntry, entry.name, function () {
                            console.log("File moved:", entry.name);
                        }, self.errorCallback)
                    }, self.errorCallback)
                }, self.errorCallback)
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
                    if (self.accessToken === undefined) {
                        adapterSynchronization.getAccessToken('aws', config).then(accessToken => {
                            self.accessToken = accessToken;
                            adapterSynchronization.uploadObject('aws', config, self.accessToken, objectData, fileName).then(() => {
                                resolve(true)
                            }).catch((e) => reject(e));
                        }).catch((e) => reject(e));
                    } else {
                        adapterSynchronization.uploadObject('aws', config, self.accessToken, objectData, fileName).then(() => {
                            resolve(true)
                        }).catch((e) => reject(e));
                    }
                });
            }

    }

        if (null === instance) {
            instance = new synchronization();
        }

        return instance;

    }
);